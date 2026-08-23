import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabase';
import { verifyToken } from '../../../../lib/auth';
import { vnParts, vnNowMinutes, hmToMin } from '../../../../lib/time';
import { logCham, reqMeta } from '../../../../lib/chamlog';

export const dynamic = 'force-dynamic';
const LATE = 15;

export async function POST(req) {
  const { sessionToken, lich_lop_id, ghi_chu, device_id } = await req.json();
  const p = verifyToken(sessionToken);
  const sb = supabaseAdmin();
  const meta = reqMeta(req);
  const base = () => ({ buoc: 'checkin', nv_id: p?.nv_id || null, club_id: p?.club_id || null, device_id: device_id || null, ...meta });
  const deny = async (error, st = 400) => { await logCham(sb, { ...base(), ket_qua: 'that_bai', ly_do: error }); return NextResponse.json({ ok: false, error }, { status: st }); };

  if (!p || !p.nv_id || !p.club_id) return deny('Phiên đã hết hạn, vui lòng quét lại');
  const { dateStr } = vnParts();

  const { data: open } = await sb.from('cham_cong').select('id').eq('nv_id', p.nv_id).eq('trang_thai', 'dang_lam').maybeSingle();
  if (open) return deny('Bạn đang có một buổi chưa kết thúc');

  if (lich_lop_id) {
    const { data: ll } = await sb.from('lich_lop').select('gio_bat_dau').eq('id', lich_lop_id).maybeSingle();
    if (ll && vnNowMinutes() - hmToMin(ll.gio_bat_dau) > LATE) {
      return deny('Ca này đã quá 15 phút, đã bị khoá — không thể vào ca.');
    }
    const { data: taken } = await sb.from('cham_cong')
      .select('id, trang_thai, nhan_vien!nv_id ( ho_ten )')
      .eq('lich_lop_id', lich_lop_id).eq('ngay', dateStr)
      .in('trang_thai', ['dang_lam', 'hoan_thanh', 'quen_ra'])
      .order('gio_vao', { ascending: true }).limit(1).maybeSingle();
    if (taken) {
      const who = taken.nhan_vien?.ho_ten ? ` (${taken.nhan_vien.ho_ten})` : '';
      const st = taken.trang_thai === 'hoan_thanh' ? 'đã hoàn thành' : (taken.trang_thai === 'dang_lam' ? 'đang có người dạy' : 'đã có người dạy');
      return deny(`Ca này ${st}${who} — không thể chấm công thêm.`);
    }
  }

  const { data, error } = await sb.from('cham_cong')
    .insert({ nv_id: p.nv_id, club_id: p.club_id, lich_lop_id: lich_lop_id || null, ngay: dateStr, trang_thai: 'dang_lam', ghi_chu: ghi_chu || null })
    .select('gio_vao, lich_lop!lich_lop_id ( ten_lop )').single();
  if (error) return deny('Không lưu được, thử lại', 500);

  await logCham(sb, { ...base(), ket_qua: 'thanh_cong', ly_do: 'Chấm VÀO ca thành công' + (data.lich_lop?.ten_lop ? ` · ${data.lich_lop.ten_lop}` : '') });
  return NextResponse.json({ ok: true, gio_vao: data.gio_vao, ten_lop: data.lich_lop?.ten_lop || null });
}
