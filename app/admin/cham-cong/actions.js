'use server';
import { supabaseAdmin } from '../../../lib/supabase';
import { requireAdmin } from '../../../lib/guard';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

// Ghép ngày (YYYY-MM-DD) + giờ (HH:MM) theo giờ VN -> timestamptz
function intOrNull(v){const t=String(v||'').trim();if(t==='')return null;const n=parseInt(t,10);return Number.isFinite(n)?Math.max(0,n):null;}
function iso(ngay, hhmm) {
  if (!hhmm) return null;
  return new Date(`${ngay}T${hhmm}:00+07:00`).toISOString();
}

export async function themChamCong(formData) {
  requireAdmin();
  const sb = supabaseAdmin();
  const nv_id = formData.get('nv_id') || null;
  let club_id = formData.get('club_id') || null;
  const ngay = String(formData.get('ngay') || '').trim();
  const lich_lop_id = formData.get('lich_lop_id') || null;
  const gv = String(formData.get('gio_vao') || '').trim();
  const gr = String(formData.get('gio_ra') || '').trim();
  const ghi_chu = String(formData.get('ghi_chu') || '').trim() || 'Chấm công thủ công';
  const back = (extra) => { revalidatePath('/admin/cham-cong'); redirect(`/admin/cham-cong?ngay=${ngay}${extra}`); };

  if (!nv_id || !ngay || !gv) back('&loi=thieu');

  if (lich_lop_id) {
    const { data: ll } = await sb.from('lich_lop').select('club_id').eq('id', lich_lop_id).maybeSingle();
    if (!ll) back('&loi=loplop');
    club_id = ll.club_id; // lấy club theo lớp
    const { data: dup } = await sb.from('cham_cong').select('id').eq('lich_lop_id', lich_lop_id).eq('ngay', ngay)
      .in('trang_thai', ['dang_lam', 'hoan_thanh', 'quen_ra']).limit(1).maybeSingle();
    if (dup) back('&loi=trung');
  }
  if (!club_id) back('&loi=thieu');

  await sb.from('cham_cong').insert({
    nv_id, club_id, lich_lop_id, ngay,
    gio_vao: iso(ngay, gv), gio_ra: iso(ngay, gr),
    trang_thai: gr ? 'hoan_thanh' : 'dang_lam', ghi_chu, so_hoc_vien: intOrNull(formData.get('so_hoc_vien')), thu_cong: true,
  });
  back('&them=ok');
}

export async function suaChamCong(formData) {
  requireAdmin();
  const sb = supabaseAdmin();
  const id = formData.get('id');
  const ngay = String(formData.get('ngay') || '').trim();
  const gv = String(formData.get('gio_vao') || '').trim();
  const gr = String(formData.get('gio_ra') || '').trim();
  const trang_thai = formData.get('trang_thai') || 'hoan_thanh';
  const ghi_chu = String(formData.get('ghi_chu') || '').trim() || null;
  await sb.from('cham_cong').update({
    gio_vao: iso(ngay, gv), gio_ra: iso(ngay, gr), trang_thai, ghi_chu, so_hoc_vien: intOrNull(formData.get('so_hoc_vien')), thu_cong: true,
  }).eq('id', id);
  revalidatePath('/admin/cham-cong');
  redirect(`/admin/cham-cong?ngay=${ngay}`);
}

export async function xoaChamCong(formData) {
  requireAdmin();
  const sb = supabaseAdmin();
  const id = formData.get('id');
  const ngay = formData.get('ngay') || '';
  await sb.from('cham_cong').delete().eq('id', id);
  revalidatePath('/admin/cham-cong');
  redirect(`/admin/cham-cong?ngay=${ngay}`);
}
