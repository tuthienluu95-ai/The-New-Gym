import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { supabaseAdmin } from '../../../../lib/supabase';
import { fmtTime, vnMinutesOf, hmToMin } from '../../../../lib/time';

export const dynamic = 'force-dynamic';
const hhmm = (t) => (t || '').slice(0, 5);

export async function POST(req) {
  const { ma_nv, pin, tu, den } = await req.json();
  if (!ma_nv || !pin) return NextResponse.json({ ok: false, error: 'Vui lòng nhập mã nhân viên và PIN' }, { status: 400 });

  const sb = supabaseAdmin();
  const { data: nv } = await sb.from('nhan_vien').select('id, ho_ten, pin_hash, trang_thai').eq('ma_nv', String(ma_nv).trim()).maybeSingle();
  if (!nv) return NextResponse.json({ ok: false, error: 'Mã nhân viên không tồn tại' }, { status: 400 });
  if (!nv.pin_hash) return NextResponse.json({ ok: false, error: 'Bạn chưa có PIN. Hãy chấm công lần đầu tại club để tạo PIN.' }, { status: 400 });
  if (!(await bcrypt.compare(String(pin), nv.pin_hash))) return NextResponse.json({ ok: false, error: 'Sai mã PIN' }, { status: 400 });

  const { data: rows } = await sb.from('cham_cong')
    .select('id, ngay, gio_vao, gio_ra, trang_thai, ghi_chu, clubs!club_id ( ten_club ), lich_lop!lich_lop_id ( ten_lop, gio_bat_dau, gio_ket_thuc )')
    .eq('nv_id', nv.id).gte('ngay', tu).lte('ngay', den)
    .order('ngay', { ascending: false }).order('gio_vao', { ascending: false });

  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date());
  let so_tre = 0, so_som = 0;
  const out = (rows || []).map((r) => {
    const late = (r.lich_lop?.gio_bat_dau && r.gio_vao) ? (vnMinutesOf(r.gio_vao) - hmToMin(r.lich_lop.gio_bat_dau)) : 0;
    const early = (r.lich_lop?.gio_ket_thuc && r.gio_ra) ? (hmToMin(r.lich_lop.gio_ket_thuc) - vnMinutesOf(r.gio_ra)) : 0;
    if (late > 0) so_tre++;
    if (early > 0) so_som++;
    const quenRa = r.trang_thai === 'quen_ra' || (!r.gio_ra && r.ngay < today);
    return {
      ngay: r.ngay, club: r.clubs?.ten_club || '', lop: r.lich_lop?.ten_lop || 'Lớp khác',
      ca: r.lich_lop ? `${hhmm(r.lich_lop.gio_bat_dau)}–${hhmm(r.lich_lop.gio_ket_thuc)}` : '',
      vao: fmtTime(r.gio_vao), ra: r.gio_ra ? fmtTime(r.gio_ra) : '',
      late: late > 0 ? late : 0, early: early > 0 ? early : 0,
      tt: quenRa ? 'quen_ra' : r.trang_thai, ghi_chu: r.ghi_chu || '',
    };
  });
  return NextResponse.json({ ok: true, ho_ten: nv.ho_ten, rows: out, summary: { so_ca: out.length, so_tre, so_som } });
}
