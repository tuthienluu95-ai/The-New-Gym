import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabase';
import { verifyToken } from '../../../../lib/auth';
import { vnParts, vnNowMinutes, hmToMin } from '../../../../lib/time';

export const dynamic = 'force-dynamic';
const LATE = 15;

export async function POST(req) {
  const { sessionToken, lich_lop_id, ghi_chu } = await req.json();
  const p = verifyToken(sessionToken);
  if (!p || !p.nv_id || !p.club_id) return NextResponse.json({ ok: false, error: 'Phiên đã hết hạn, vui lòng quét lại' }, { status: 400 });

  const sb = supabaseAdmin();
  const { data: open } = await sb.from('cham_cong').select('id').eq('nv_id', p.nv_id).eq('trang_thai', 'dang_lam').maybeSingle();
  if (open) return NextResponse.json({ ok: false, error: 'Bạn đang có một buổi chưa kết thúc' }, { status: 400 });

  if (lich_lop_id) {
    const { data: ll } = await sb.from('lich_lop').select('gio_bat_dau').eq('id', lich_lop_id).maybeSingle();
    if (ll && vnNowMinutes() - hmToMin(ll.gio_bat_dau) > LATE) {
      return NextResponse.json({ ok: false, error: 'Ca này đã quá 15 phút, đã bị khoá — không thể vào ca.' }, { status: 400 });
    }
  }

  const { dateStr } = vnParts();
  const { data, error } = await sb.from('cham_cong')
    .insert({ nv_id: p.nv_id, club_id: p.club_id, lich_lop_id: lich_lop_id || null, ngay: dateStr, trang_thai: 'dang_lam', ghi_chu: ghi_chu || null })
    .select('gio_vao, lich_lop!lich_lop_id ( ten_lop )').single();
  if (error) return NextResponse.json({ ok: false, error: 'Không lưu được, thử lại' }, { status: 500 });

  return NextResponse.json({ ok: true, gio_vao: data.gio_vao, ten_lop: data.lich_lop?.ten_lop || null });
}
