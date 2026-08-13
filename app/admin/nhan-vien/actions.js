'use server';
import bcrypt from 'bcryptjs';
import { supabaseAdmin } from '../../../lib/supabase';
import { requireAdmin } from '../../../lib/guard';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

function num(v){const t=String(v||'').trim();if(t==='')return 0;const n=Number(t);return Number.isFinite(n)?Math.round(n):0;}
const last9 = (v) => { const d = String(v || '').replace(/\D/g, ''); return d.length >= 9 ? d.slice(-9) : null; };
const norm = (v) => String(v || '').toLowerCase().replace(/\s+/g, ' ').trim();

export async function themNV(formData) {
  requireAdmin();
  const sb = supabaseAdmin();
  const ma_nv = String(formData.get('ma_nv') || '').trim();
  const ho_ten = String(formData.get('ho_ten') || '').trim();
  const sdtRaw = String(formData.get('sdt') || '').trim();
  const pin = String(formData.get('pin') || '').trim();

  const { data: all } = await sb.from('nhan_vien').select('ma_nv, ho_ten, sdt');
  const list = all || [];

  // Trùng mã NV -> chặn
  if (list.find((x) => String(x.ma_nv) === ma_nv)) {
    revalidatePath('/admin/nhan-vien');
    redirect('/admin/nhan-vien?loi=ma&info=' + encodeURIComponent(ma_nv));
  }
  // Trùng SĐT -> chặn
  const p9 = last9(sdtRaw);
  if (p9) {
    const hit = list.find((x) => last9(x.sdt) === p9);
    if (hit) {
      revalidatePath('/admin/nhan-vien');
      redirect('/admin/nhan-vien?loi=sdt&info=' + encodeURIComponent(sdtRaw + ' — mã ' + hit.ma_nv + ' · ' + hit.ho_ten));
    }
  }

  const row = {
    ma_nv, ho_ten,
    club_chinh_id: formData.get('club_chinh_id') || null,
    sdt: sdtRaw || null,
    email: String(formData.get('email') || '').trim() || null,
    vai_tro: formData.get('vai_tro') || 'nhan_vien',
    thu_lao: num(formData.get('thu_lao')),
  };
  if (pin) row.pin_hash = await bcrypt.hash(pin, 10);
  const { error } = await sb.from('nhan_vien').insert(row);
  revalidatePath('/admin/nhan-vien');
  if (error) redirect('/admin/nhan-vien?loi=khac');

  // Trùng tên -> vẫn thêm, chỉ cảnh báo
  const nameHit = list.find((x) => norm(x.ho_ten) === norm(ho_ten));
  if (nameHit) redirect('/admin/nhan-vien?canhbao=ten&info=' + encodeURIComponent('mã ' + nameHit.ma_nv + ' · ' + nameHit.ho_ten));
  redirect('/admin/nhan-vien?them=ok');
}

export async function suaNV(formData) {
  requireAdmin();
  const sb = supabaseAdmin();
  const id = formData.get('id');
  await sb.from('nhan_vien').update({
    ma_nv: String(formData.get('ma_nv') || '').trim(),
    ho_ten: String(formData.get('ho_ten') || '').trim(),
    club_chinh_id: formData.get('club_chinh_id') || null,
    sdt: String(formData.get('sdt') || '').trim() || null,
    email: String(formData.get('email') || '').trim() || null,
    vai_tro: formData.get('vai_tro') || 'nhan_vien',
    trang_thai: formData.get('trang_thai') || 'dang_lam',
    thu_lao: num(formData.get('thu_lao')),
  }).eq('id', id);
  revalidatePath('/admin/nhan-vien');
  redirect('/admin/nhan-vien');
}

export async function datPin(formData) {
  requireAdmin();
  const sb = supabaseAdmin();
  const id = formData.get('id');
  const pin = String(formData.get('pin') || '').trim();
  const hash = pin ? await bcrypt.hash(pin, 10) : null;
  await sb.from('nhan_vien').update({ pin_hash: hash }).eq('id', id);
  revalidatePath('/admin/nhan-vien');
  redirect('/admin/nhan-vien/' + id);
}

export async function xoaNV(formData) {
  requireAdmin();
  const sb = supabaseAdmin();
  await sb.from('nhan_vien').delete().eq('id', formData.get('id'));
  revalidatePath('/admin/nhan-vien');
}
