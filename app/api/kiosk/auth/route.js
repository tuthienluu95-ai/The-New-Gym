import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { supabaseAdmin } from '../../../../lib/supabase';
import { signToken } from '../../../../lib/auth';
import { vnParts } from '../../../../lib/time';

export const dynamic = 'force-dynamic';

export async function POST(req) {
  const { token, ma_nv, pin } = await req.json();
  if (!token || !ma_nv || !pin) return NextResponse.json({ ok: false, error: 'Vui lòng nhập đủ mã và PIN' }, { status: 400 });

  const sb = supabaseAdmin();
  const { data: club } = await sb.from('clubs').select('id').eq('qr_token', token).maybeSingle();
  if (!club) return NextResponse.json({ ok: false, error: 'Mã QR không hợp lệ' }, { status: 400 });

  const { data: nv } = await sb.from('nhan_vien')
    .select('id, ho_ten, pin_hash, trang_thai').eq('ma_nv', String(ma_nv).trim()).maybeSingle();
  if (!nv) return NextResponse.json({ ok: false, error: 'Mã nhân viên không tồn tại' }, { status: 400 });
  if (nv.trang_thai === 'da_nghi') return NextResponse.json({ ok: false, error: 'Tài khoản đã nghỉ việc' }, { status: 400 });

  let firstTime = false;
  if (!nv.pin_hash) {
    const hash = await bcrypt.hash(String(pin), 10);
    await sb.from('nhan_vien').update({ pin_hash: hash }).eq('id', nv.id);
    firstTime = true;
  } else {
    const okPin = await bcrypt.compare(String(pin), nv.pin_hash);
    if (!okPin) return NextResponse.json({ ok: false, error: 'Sai mã PIN' }, { status: 400 });
  }

  const sessionToken = signToken({ nv_id: nv.id, club_id: club.id }, 300);

  const { data: open } = await sb.from('cham_cong')
    .select('id, gio_vao, lich_lop ( ten_lop )')
    .eq('nv_id', nv.id).is('gio_ra', null)
    .order('gio_vao', { ascending: false }).limit(1).maybeSingle();

  if (open) {
    return NextResponse.json({
      ok: true, sessionToken, ho_ten: nv.ho_ten, firstTime, mode: 'checkout',
      openSession: { gio_vao: open.gio_vao, ten_lop: open.lich_lop?.ten_lop || 'Lớp khác' },
    });
  }

  const { thu } = vnParts();
  const { data: classes } = await sb.from('lich_lop')
    .select('id, ten_lop, gio_bat_dau, gio_ket_thuc')
    .eq('club_id', club.id).eq('nv_id', nv.id).eq('thu', thu).eq('dang_ap_dung', true)
    .order('gio_bat_dau', { ascending: true });

  return NextResponse.json({ ok: true, sessionToken, ho_ten: nv.ho_ten, firstTime, mode: 'checkin', classes: classes || [] });
}
