import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabase';
import { verifyToken } from '../../../../lib/auth';
import { logCham, reqMeta } from '../../../../lib/chamlog';

export const dynamic = 'force-dynamic';

export async function POST(req) {
  const { sessionToken, so_hoc_vien, device_id } = await req.json();
  const p = verifyToken(sessionToken);
  const sb = supabaseAdmin();
  const meta = reqMeta(req);
  const base = () => ({ buoc: 'checkout', nv_id: p?.nv_id || null, club_id: p?.club_id || null, device_id: device_id || null, ...meta });
  const deny = async (error, st = 400) => { await logCham(sb, { ...base(), ket_qua: 'that_bai', ly_do: error }); return NextResponse.json({ ok: false, error }, { status: st }); };

  if (!p || !p.nv_id) return deny('Phiên đã hết hạn, vui lòng quét lại');

  const { data: open } = await sb.from('cham_cong')
    .select('id, lich_lop!lich_lop_id ( ten_lop )')
    .eq('nv_id', p.nv_id).eq('trang_thai', 'dang_lam')
    .order('gio_vao', { ascending: false }).limit(1).maybeSingle();
  if (!open) return deny('Không tìm thấy buổi đang mở');

  const hv = parseInt(so_hoc_vien, 10);
  if (!Number.isInteger(hv) || hv < 0) return deny('Bắt buộc nhập số học viên (≥ 0) để kết thúc buổi dạy.');

  const { data, error } = await sb.from('cham_cong')
    .update({ gio_ra: new Date().toISOString(), trang_thai: 'hoan_thanh', so_hoc_vien: hv })
    .eq('id', open.id).select('gio_ra, lich_lop!lich_lop_id ( ten_lop )').single();
  if (error) return deny('Không lưu được, thử lại', 500);

  await logCham(sb, { ...base(), ket_qua: 'thanh_cong', ly_do: `Chấm RA / kết thúc buổi · ${hv} HV` + (data.lich_lop?.ten_lop || open.lich_lop?.ten_lop ? ` · ${data.lich_lop?.ten_lop || open.lich_lop?.ten_lop}` : '') });
  return NextResponse.json({ ok: true, gio_ra: data.gio_ra, ten_lop: data.lich_lop?.ten_lop || open.lich_lop?.ten_lop || null });
}
