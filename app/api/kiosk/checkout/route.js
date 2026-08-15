import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabase';
import { verifyToken } from '../../../../lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(req) {
  const { sessionToken, so_hoc_vien } = await req.json();
  const p = verifyToken(sessionToken);
  if (!p || !p.nv_id) return NextResponse.json({ ok: false, error: 'Phiên đã hết hạn, vui lòng quét lại' }, { status: 400 });

  const sb = supabaseAdmin();
  const { data: open } = await sb.from('cham_cong')
    .select('id, lich_lop!lich_lop_id ( ten_lop )')
    .eq('nv_id', p.nv_id).eq('trang_thai', 'dang_lam')
    .order('gio_vao', { ascending: false }).limit(1).maybeSingle();
  if (!open) return NextResponse.json({ ok: false, error: 'Không tìm thấy buổi đang mở' }, { status: 400 });

  const hv = parseInt(so_hoc_vien, 10);
  if (!Number.isInteger(hv) || hv < 0) {
    return NextResponse.json({ ok: false, error: 'Bắt buộc nhập số học viên (≥ 0) để kết thúc buổi dạy.' }, { status: 400 });
  }
  const { data, error } = await sb.from('cham_cong')
    .update({ gio_ra: new Date().toISOString(), trang_thai: 'hoan_thanh', so_hoc_vien: hv })
    .eq('id', open.id).select('gio_ra, lich_lop!lich_lop_id ( ten_lop )').single();
  if (error) return NextResponse.json({ ok: false, error: 'Không lưu được, thử lại' }, { status: 500 });

  return NextResponse.json({ ok: true, gio_ra: data.gio_ra, ten_lop: data.lich_lop?.ten_lop || open.lich_lop?.ten_lop || null });
}
