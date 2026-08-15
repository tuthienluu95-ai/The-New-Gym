import { cookies } from 'next/headers';
import * as XLSX from 'xlsx';
import { isAdminToken, ADMIN_COOKIE } from '../../../../lib/auth';
import { supabaseAdmin } from '../../../../lib/supabase';
import { vnParts, fmtTime, thuLabel } from '../../../../lib/time';
import { matchQ } from '../../../../lib/search';

export const dynamic = 'force-dynamic';
const hhmm = (t) => (t || '').slice(0, 5);
const TT = { chua: 'Chưa dạy', dang_lam: 'Đang dạy', hoan_thanh: 'Đã hoàn thành', quen_ra: 'Quên chấm ra' };
function thuFromDate(s) { const w = new Date(s + 'T12:00:00Z').getUTCDay(); return w === 0 ? 8 : w + 1; }
function dateList(tu, den) { const o = []; let d = new Date(tu + 'T00:00:00Z'); const e = new Date(den + 'T00:00:00Z'); let g = 0; while (d <= e && g < 62) { o.push(d.toISOString().slice(0, 10)); d.setUTCDate(d.getUTCDate() + 1); g++; } return o; }
function xlsx(aoa, sheet, filename) {
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, sheet);
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  return new Response(buf, { headers: { 'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'Content-Disposition': `attachment; filename="${filename}"` } });
}

export async function GET(req) {
  const c = cookies().get(ADMIN_COOKIE)?.value;
  if (!isAdminToken(c)) return new Response('Unauthorized', { status: 401 });
  const sp = new URL(req.url).searchParams;
  const type = sp.get('type');
  const tk = sp.get('q') || '';
  const sb = supabaseAdmin();

  if (type === 'clubs') {
    let { data } = await sb.from('clubs').select('ma_club,ten_club,dia_chi,lat,lng,ban_kinh_m').order('ma_club');
    data = (data||[]).filter(r=>matchQ(`${r.ma_club} ${r.ten_club} ${r.dia_chi||''}`, tk));
    const aoa = [['Mã club', 'Tên club', 'Địa chỉ', 'Vĩ độ', 'Kinh độ', 'Bán kính (m)', 'GPS']];
    for (const r of data || []) aoa.push([r.ma_club, r.ten_club, r.dia_chi || '', r.lat ?? '', r.lng ?? '', r.ban_kinh_m ?? '', (r.lat != null && r.lng != null) ? 'Đã đặt' : 'Chưa đặt']);
    return xlsx(aoa, 'Club', 'club.xlsx');
  }

  if (type === 'nhan-vien') {
    let q = sb.from('nhan_vien').select('ma_nv,ho_ten,sdt,email,vai_tro,trang_thai,thu_lao,pin_hash,clubs!club_chinh_id(ten_club)').order('ma_nv');
    if (sp.get('club')) q = q.eq('club_chinh_id', sp.get('club'));
    let { data } = await q;
    data = (data||[]).filter(r=>matchQ(`${r.ma_nv} ${r.ho_ten} ${r.sdt||''} ${r.email||''} ${r.clubs?.ten_club||''}`, tk));
    const aoa = [['Mã NV', 'Họ tên', 'Club', 'SĐT', 'Email', 'Vai trò', 'Trạng thái', 'Thù lao/ca', 'PIN']];
    for (const r of data || []) aoa.push([r.ma_nv, r.ho_ten, r.clubs?.ten_club || '', r.sdt || '', r.email || '', r.vai_tro, r.trang_thai === 'dang_lam' ? 'Đang làm' : 'Đã nghỉ', r.thu_lao || 0, r.pin_hash ? 'Đã đặt' : 'Chưa đặt']);
    return xlsx(aoa, 'Nhan vien', 'nhan-vien.xlsx');
  }

  if (type === 'lich') {
    let q = sb.from('lich_lop').select('thu,gio_bat_dau,gio_ket_thuc,ten_lop,dang_ap_dung,clubs!club_id(ten_club),nhan_vien!nv_id(ma_nv,ho_ten)').order('thu').order('gio_bat_dau');
    if (sp.get('club')) q = q.eq('club_id', sp.get('club'));
    if (sp.get('lop')) q = q.eq('ten_lop', sp.get('lop'));
    if (sp.get('hlv')) q = q.eq('nv_id', sp.get('hlv'));
    if (sp.get('an') === '1') q = q.eq('dang_ap_dung', true);
    let { data } = await q;
    data = (data||[]).filter(r=>matchQ(`${r.clubs?.ten_club||''} ${thuLabel(r.thu)} ${r.ten_lop} ${r.nhan_vien?(r.nhan_vien.ma_nv+' '+r.nhan_vien.ho_ten):''}`, tk));
    const aoa = [['Club', 'Thứ', 'Bắt đầu', 'Kết thúc', 'Lớp', 'HLV', 'Trạng thái']];
    for (const r of data || []) aoa.push([r.clubs?.ten_club || '', thuLabel(r.thu), hhmm(r.gio_bat_dau), hhmm(r.gio_ket_thuc), r.ten_lop, r.nhan_vien ? `${r.nhan_vien.ma_nv} · ${r.nhan_vien.ho_ten}` : 'Chưa xếp HLV', r.dang_ap_dung ? 'Đang áp dụng' : 'Đã khoá']);
    return xlsx(aoa, 'Lich lop', 'lich-lop.xlsx');
  }

  if (type === 'cham-cong') {
    const ngay = sp.get('ngay') || vnParts().dateStr;
    const today = vnParts().dateStr;
    let { data } = await sb.from('cham_cong').select('ngay,gio_vao,gio_ra,trang_thai,ghi_chu,nhan_vien!nv_id(ma_nv,ho_ten),clubs!club_id(ten_club),lich_lop!lich_lop_id(ten_lop,gio_bat_dau,gio_ket_thuc)').eq('ngay', ngay).order('gio_vao');
    data = (data||[]).filter(r=>matchQ(`${r.nhan_vien?.ma_nv||''} ${r.nhan_vien?.ho_ten||''} ${r.clubs?.ten_club||''} ${r.lich_lop?.ten_lop||''} ${r.ghi_chu||''}`, tk));
    const aoa = [[`Chấm công ngày ${ngay}`], [], ['Mã NV', 'Họ tên', 'Club', 'Lớp', 'Ca lớp', 'Số HV', 'Ghi chú', 'Vào', 'Ra', 'Trạng thái']];
    for (const r of data || []) { const quen = r.trang_thai === 'quen_ra' || (!r.gio_ra && r.ngay < today); const ca = r.lich_lop ? `${hhmm(r.lich_lop.gio_bat_dau)}-${hhmm(r.lich_lop.gio_ket_thuc)}` : ''; aoa.push([r.nhan_vien?.ma_nv || '', r.nhan_vien?.ho_ten || '', r.clubs?.ten_club || '', r.lich_lop?.ten_lop || 'Lớp khác', ca, (typeof r.so_hoc_vien === 'number' ? r.so_hoc_vien : ''), r.ghi_chu || '', fmtTime(r.gio_vao), r.gio_ra ? fmtTime(r.gio_ra) : '', quen ? 'Quên chấm ra' : (r.trang_thai === 'hoan_thanh' ? 'Hoàn thành' : 'Đang trong ca')]); }
    return xlsx(aoa, 'Cham cong', `cham-cong-${ngay}.xlsx`);
  }

  if (type === 'tkb') {
    const che_do = ['ngay', 'khoang'].includes(sp.get('che_do')) ? sp.get('che_do') : 'tuan';
    const club = sp.get('club'), lop = sp.get('lop'), hlv = sp.get('hlv'), an = sp.get('an') === '1';
    if (che_do === 'tuan') {
      let q = sb.from('lich_lop').select('thu,gio_bat_dau,gio_ket_thuc,ten_lop,clubs!club_id(ten_club),nhan_vien!nv_id(ma_nv,ho_ten)').eq('dang_ap_dung', true).order('thu').order('gio_bat_dau');
      if (club) q = q.eq('club_id', club); if (lop) q = q.eq('ten_lop', lop); if (hlv) q = q.eq('nv_id', hlv);
      let { data } = await q;
      data = (data||[]).filter(r=>matchQ(`${r.clubs?.ten_club||''} ${r.ten_lop} ${r.nhan_vien?.ho_ten||''}`, tk));
      const aoa = [['Club', 'Thứ', 'Giờ', 'Lớp', 'HLV']];
      for (const r of data || []) aoa.push([r.clubs?.ten_club || '', thuLabel(r.thu), `${hhmm(r.gio_bat_dau)}-${hhmm(r.gio_ket_thuc)}`, r.ten_lop, r.nhan_vien ? `${r.nhan_vien.ma_nv} · ${r.nhan_vien.ho_ten}` : 'Chưa xếp HLV']);
      return xlsx(aoa, 'TKB tuan', 'thoi-khoa-bieu-tuan.xlsx');
    }
    const dvn = vnParts().dateStr;
    const dates = che_do === 'khoang' ? dateList(sp.get('tu') || dvn, sp.get('den') || dvn) : [sp.get('ngay') || dvn];
    let q = sb.from('lich_lop').select('id,thu,gio_bat_dau,gio_ket_thuc,ten_lop,clubs!club_id(ten_club),nhan_vien!nv_id(ma_nv,ho_ten)').eq('dang_ap_dung', true).order('gio_bat_dau');
    if (club) q = q.eq('club_id', club); if (lop) q = q.eq('ten_lop', lop); if (hlv) q = q.eq('nv_id', hlv);
    let { data: lich } = await q;
    lich = (lich||[]).filter(l=>matchQ(`${l.clubs?.ten_club||''} ${l.ten_lop} ${l.nhan_vien?.ho_ten||''}`, tk));
    const byThu = {}; for (const l of lich || []) (byThu[l.thu] ||= []).push(l);
    const { data: cc } = await sb.from('cham_cong').select('lich_lop_id,ngay,trang_thai,gio_vao,gio_ra').gte('ngay', dates[0]).lte('ngay', dates[dates.length - 1]);
    const map = new Map(); for (const r of cc || []) if (r.lich_lop_id) map.set(r.lich_lop_id + '|' + r.ngay, r);
    const aoa = [['Ngày', 'Club', 'Giờ', 'Lớp', 'HLV', 'Vào', 'Ra', 'Trạng thái']];
    for (const d of dates) { const thu = thuFromDate(d); for (const l of (byThu[thu] || [])) { const a = map.get(l.id + '|' + d); const tt = a ? a.trang_thai : 'chua'; if (an && tt === 'hoan_thanh') continue; aoa.push([d, l.clubs?.ten_club || '', `${hhmm(l.gio_bat_dau)}-${hhmm(l.gio_ket_thuc)}`, l.ten_lop, l.nhan_vien ? `${l.nhan_vien.ma_nv} · ${l.nhan_vien.ho_ten}` : 'Chưa xếp HLV', a?.gio_vao ? fmtTime(a.gio_vao) : '', a?.gio_ra ? fmtTime(a.gio_ra) : '', TT[tt]]); } }
    return xlsx(aoa, 'TKB', 'thoi-khoa-bieu.xlsx');
  }

  return new Response('Bad type', { status: 400 });
}
