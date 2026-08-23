import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { supabaseAdmin } from '../../../../lib/supabase';
import { signToken, verifyToken } from '../../../../lib/auth';
import { vnParts, vnNowMinutes, hmToMin } from '../../../../lib/time';
import { haversineMeters } from '../../../../lib/geo';
import { logCham, reqMeta } from '../../../../lib/chamlog';

export const dynamic = 'force-dynamic';
const LATE = 15;

async function resolveClub(sb, c) {
  const p = verifyToken(c);
  if (p && p.kind === 'qr' && p.club_id) {
    const { data } = await sb.from('clubs').select('id, lat, lng, ban_kinh_m').eq('id', p.club_id).maybeSingle();
    return data;
  }
  if (c && c.includes('.')) return null;
  const { data } = await sb.from('clubs').select('id, lat, lng, ban_kinh_m').eq('qr_token', c).maybeSingle();
  return data;
}

export async function POST(req) {
  const { token, ma_nv, pin, lat, lng, device_id } = await req.json();
  const sb = supabaseAdmin();
  const meta = reqMeta(req);
  const latN = lat != null ? Number(lat) : null;
  const lngN = lng != null ? Number(lng) : null;
  const rawToken = (token && !String(token).includes('.')) ? token : null;
  let clubId = null, dist = null;
  const base = () => ({ buoc: 'auth', ma_nv: ma_nv ? String(ma_nv).trim() : null, qr_token: rawToken, device_id: device_id || null, lat: latN, lng: lngN, club_id: clubId, khoang_cach_m: dist != null ? Math.round(dist) : null, ...meta });
  const deny = async (error, st = 400) => { await logCham(sb, { ...base(), ket_qua: 'that_bai', ly_do: error }); return NextResponse.json({ ok: false, error }, { status: st }); };

  if (!token || !ma_nv || !pin) return deny('Vui lòng nhập đủ mã và PIN');

  const club = await resolveClub(sb, token);
  if (!club) return deny('Mã QR không hợp lệ hoặc đã hết hạn, vui lòng quét lại');
  clubId = club.id;

  if (club.lat != null && club.lng != null) {
    if (latN == null || lngN == null) return deny('Vui lòng bật định vị (GPS) và cho phép truy cập vị trí để chấm công');
    dist = haversineMeters(latN, lngN, Number(club.lat), Number(club.lng));
    const radius = club.ban_kinh_m || 200;
    if (dist > radius) return deny(`Bạn đang cách club khoảng ${Math.round(dist)}m (ngoài phạm vi ${radius}m). Vui lòng chấm công tại club.`);
  }

  const { data: nv } = await sb.from('nhan_vien').select('id, ho_ten, pin_hash, trang_thai').eq('ma_nv', String(ma_nv).trim()).maybeSingle();
  if (!nv) return deny('Mã nhân viên không tồn tại');
  if (nv.trang_thai === 'da_nghi') return deny('Tài khoản đã nghỉ việc');

  let firstTime = false;
  if (!nv.pin_hash) {
    await sb.from('nhan_vien').update({ pin_hash: await bcrypt.hash(String(pin), 10) }).eq('id', nv.id);
    firstTime = true;
  } else {
    if (!(await bcrypt.compare(String(pin), nv.pin_hash))) return deny('Sai mã PIN');
  }

  const sessionToken = signToken({ nv_id: nv.id, club_id: club.id }, 300);
  const { dateStr, thu } = vnParts();

  const { data: open } = await sb.from('cham_cong')
    .select('id, ngay, gio_vao, lich_lop!lich_lop_id ( ten_lop )')
    .eq('nv_id', nv.id).eq('trang_thai', 'dang_lam').order('gio_vao', { ascending: false }).limit(1).maybeSingle();

  if (open) {
    if (open.ngay < dateStr) {
      await sb.from('cham_cong').update({ trang_thai: 'quen_ra' }).eq('id', open.id);
    } else {
      await logCham(sb, { ...base(), nv_id: nv.id, ket_qua: 'thanh_cong', ly_do: 'Đăng nhập kiosk OK (mở màn kết thúc buổi)' });
      return NextResponse.json({ ok: true, sessionToken, ho_ten: nv.ho_ten, firstTime, mode: 'checkout',
        openSession: { gio_vao: open.gio_vao, ten_lop: open.lich_lop?.ten_lop || 'Lớp khác' } });
    }
  }

  const nowMin = vnNowMinutes();
  const { data: takenRows } = await sb.from('cham_cong')
    .select('lich_lop_id')
    .eq('club_id', club.id).eq('ngay', dateStr)
    .not('lich_lop_id', 'is', null)
    .in('trang_thai', ['dang_lam', 'hoan_thanh', 'quen_ra']);
  const takenSet = new Set((takenRows || []).map((r) => r.lich_lop_id));
  const { data: myRaw } = await sb.from('lich_lop')
    .select('id, ten_lop, gio_bat_dau, gio_ket_thuc')
    .eq('club_id', club.id).eq('nv_id', nv.id).eq('thu', thu).eq('dang_ap_dung', true).order('gio_bat_dau');
  const classes = (myRaw || []).map((c) => ({ ...c, khoa: nowMin - hmToMin(c.gio_bat_dau) > LATE, taken: takenSet.has(c.id) }));

  const { data: clubRaw } = await sb.from('lich_lop')
    .select('id, ten_lop, gio_bat_dau, gio_ket_thuc, nhan_vien!nv_id ( ho_ten )')
    .eq('club_id', club.id).eq('thu', thu).eq('dang_ap_dung', true).order('gio_bat_dau');
  const clubClasses = (clubRaw || []).map((c) => ({
    id: c.id, ten_lop: c.ten_lop, gio_bat_dau: c.gio_bat_dau, gio_ket_thuc: c.gio_ket_thuc,
    hlv: c.nhan_vien?.ho_ten || '', khoa: nowMin - hmToMin(c.gio_bat_dau) > LATE, taken: takenSet.has(c.id),
  }));

  await logCham(sb, { ...base(), nv_id: nv.id, ket_qua: 'thanh_cong', ly_do: 'Đăng nhập kiosk OK (màn chọn lớp)' });
  return NextResponse.json({ ok: true, sessionToken, ho_ten: nv.ho_ten, firstTime, mode: 'checkin', classes, clubClasses });
}
