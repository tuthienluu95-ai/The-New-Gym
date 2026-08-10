import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { supabaseAdmin } from '../../../../lib/supabase';
import { signToken, verifyToken } from '../../../../lib/auth';
import { vnParts, vnNowMinutes, hmToMin } from '../../../../lib/time';
import { haversineMeters } from '../../../../lib/geo';

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
  const { token, ma_nv, pin, lat, lng } = await req.json();
  if (!token || !ma_nv || !pin) return NextResponse.json({ ok: false, error: 'Vui lòng nhập đủ mã và PIN' }, { status: 400 });

  const sb = supabaseAdmin();
  const club = await resolveClub(sb, token);
  if (!club) return NextResponse.json({ ok: false, error: 'Mã QR không hợp lệ hoặc đã hết hạn, vui lòng quét lại' }, { status: 400 });

  if (club.lat != null && club.lng != null) {
    if (lat == null || lng == null) return NextResponse.json({ ok: false, error: 'Vui lòng bật định vị (GPS) và cho phép truy cập vị trí để chấm công' }, { status: 400 });
    const d = haversineMeters(Number(lat), Number(lng), Number(club.lat), Number(club.lng));
    const radius = club.ban_kinh_m || 200;
    if (d > radius) return NextResponse.json({ ok: false, error: `Bạn đang cách club khoảng ${Math.round(d)}m (ngoài phạm vi ${radius}m). Vui lòng chấm công tại club.` }, { status: 400 });
  }

  const { data: nv } = await sb.from('nhan_vien').select('id, ho_ten, pin_hash, trang_thai').eq('ma_nv', String(ma_nv).trim()).maybeSingle();
  if (!nv) return NextResponse.json({ ok: false, error: 'Mã nhân viên không tồn tại' }, { status: 400 });
  if (nv.trang_thai === 'da_nghi') return NextResponse.json({ ok: false, error: 'Tài khoản đã nghỉ việc' }, { status: 400 });

  let firstTime = false;
  if (!nv.pin_hash) {
    await sb.from('nhan_vien').update({ pin_hash: await bcrypt.hash(String(pin), 10) }).eq('id', nv.id);
    firstTime = true;
  } else {
    if (!(await bcrypt.compare(String(pin), nv.pin_hash))) return NextResponse.json({ ok: false, error: 'Sai mã PIN' }, { status: 400 });
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
      return NextResponse.json({ ok: true, sessionToken, ho_ten: nv.ho_ten, firstTime, mode: 'checkout',
        openSession: { gio_vao: open.gio_vao, ten_lop: open.lich_lop?.ten_lop || 'Lớp khác' } });
    }
  }

  const nowMin = vnNowMinutes();
  const { data: myRaw } = await sb.from('lich_lop')
    .select('id, ten_lop, gio_bat_dau, gio_ket_thuc')
    .eq('club_id', club.id).eq('nv_id', nv.id).eq('thu', thu).eq('dang_ap_dung', true).order('gio_bat_dau');
  const classes = (myRaw || []).map((c) => ({ ...c, khoa: nowMin - hmToMin(c.gio_bat_dau) > LATE }));

  const { data: clubRaw } = await sb.from('lich_lop')
    .select('id, ten_lop, gio_bat_dau, gio_ket_thuc, nhan_vien!nv_id ( ho_ten )')
    .eq('club_id', club.id).eq('thu', thu).eq('dang_ap_dung', true).order('gio_bat_dau');
  const clubClasses = (clubRaw || []).map((c) => ({
    id: c.id, ten_lop: c.ten_lop, gio_bat_dau: c.gio_bat_dau, gio_ket_thuc: c.gio_ket_thuc,
    hlv: c.nhan_vien?.ho_ten || '', khoa: nowMin - hmToMin(c.gio_bat_dau) > LATE,
  }));

  return NextResponse.json({ ok: true, sessionToken, ho_ten: nv.ho_ten, firstTime, mode: 'checkin', classes, clubClasses });
}
