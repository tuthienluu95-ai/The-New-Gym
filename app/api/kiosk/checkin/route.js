import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabase';
import { verifyToken } from '../../../../lib/auth';
import { vnParts } from '../../../../lib/time';

export const dynamic = 'force-dynamic';

export async function POST(req) {
  const { sessionToken, lich_lop_id } = await req.json();
  const p = verifyToken(sessionToken);
  if (!p || !p.nv_id || !p.club_id) return NextResponse.json({ ok: false, error: 'Phiên đã hết hạn, vui lòng quét lại' }, { status: 400 });

  const sb = supabaseAdmin();
  const { data: open } = await sb.from('cham_cong').select('id').eq('nv_id', p.nv_id).is('gio_ra', null).maybeSingle();
  if (open) return NextResponse.json({ ok: false, error: 'Bạn đang có một buổi chưa kết thúc' }, { status: 400 });

  const { dateStr } = vnParts();
  const { data, error } = await sb.from('cham_cong')
    .insert({ nv_id: p.nv_id, club_id: p.club_id, lich_lop_id: lich_lop_id || null, ngay: dateStr, trang_thai: 'dang_lam' })
    .select('gio_vao, lich_lop!lich_lop_id ( ten_lop )').single();
  if (error) return NextResponse.json({ ok: false, error: 'Không lưu được, thử lại' }, { status: 500 });

  return NextResponse.json({ ok: true, gio_vao: data.gio_vao, ten_lop: data.lich_lop?.ten_lop || null });
}
