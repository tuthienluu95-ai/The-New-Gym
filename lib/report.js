import { vnParts, vnNowMinutes, fmtTime } from './time';

function dateList(tu, den) {
  const out = []; let d = new Date(tu + 'T00:00:00Z'); const end = new Date(den + 'T00:00:00Z'); let g = 0;
  while (d <= end && g < 400) { out.push(d.toISOString().slice(0, 10)); d.setUTCDate(d.getUTCDate() + 1); g++; }
  return out;
}
const hhmm = (t) => (t || '').slice(0, 5);
function thuFromDate(s) { const w = new Date(s + 'T12:00:00Z').getUTCDay(); return w === 0 ? 8 : w + 1; }
function hm(t) { const [h, m] = String(t || '').split(':').map(Number); return h * 60 + m; }
function vnMinutes(ts) {
  if (!ts) return null;
  const p = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(new Date(ts));
  return Number(p.find((x) => x.type === 'hour').value) * 60 + Number(p.find((x) => x.type === 'minute').value);
}

export async function buildReport(sb, tu, den) {
  const dates = dateList(tu, den);
  const { data: rows } = await sb.from('cham_cong')
    .select('nv_id, ngay, gio_vao, gio_ra, trang_thai, lich_lop_id, so_hoc_vien, thu_cong, nhan_vien!nv_id ( ma_nv, ho_ten, thu_lao ), clubs!club_id ( ten_club ), lich_lop!lich_lop_id ( ten_lop, gio_bat_dau, gio_ket_thuc )')
    .gte('ngay', tu).lte('ngay', den);

  const GRACE = 0;
  const byNv = new Map();
  const dayMap = new Map(dates.map((d) => [d, 0]));
  const attended = new Set();

  for (const r of (rows || [])) {
    if (r.lich_lop_id) attended.add(r.lich_lop_id + '|' + r.ngay);
    if (!byNv.has(r.nv_id)) byNv.set(r.nv_id, {
      ma_nv: r.nhan_vien?.ma_nv || '', ho_ten: r.nhan_vien?.ho_ten || '',
      thu_lao: r.nhan_vien?.thu_lao || 0, so_ca: 0, so_tre: 0, ngay_tre: new Set(), so_som: 0, ngay_som: new Set(), tien: 0, tong_hv: 0,
    });
    const agg = byNv.get(r.nv_id);
    agg.so_ca += 1;
    const factor = (r.so_hoc_vien === 0) ? 0.5 : 1;
    agg.tien += Math.round((r.nhan_vien?.thu_lao || 0) * factor);
    if (typeof r.so_hoc_vien === 'number') agg.tong_hv += r.so_hoc_vien;
    if (dayMap.has(r.ngay)) dayMap.set(r.ngay, dayMap.get(r.ngay) + 1);
    const sched = hm(r.lich_lop?.gio_bat_dau);
    const act = vnMinutes(r.gio_vao);
    if (sched != null && act != null && act > sched + GRACE) { agg.so_tre += 1; agg.ngay_tre.add(r.ngay); }
    const end = hm(r.lich_lop?.gio_ket_thuc); const out = vnMinutes(r.gio_ra);
    if (end != null && out != null && out < end) { agg.so_som += 1; agg.ngay_som.add(r.ngay); }
  }

  const list = Array.from(byNv.values()).map((a) => ({
    ma_nv: a.ma_nv, ho_ten: a.ho_ten, thu_lao: a.thu_lao, so_ca: a.so_ca, so_tre: a.so_tre,
    ngay_tre: Array.from(a.ngay_tre).sort(), so_som: a.so_som, ngay_som: Array.from(a.ngay_som).sort(), tong_hv: a.tong_hv, tong_tien: a.tien,
  })).sort((x, y) => y.tong_tien - x.tong_tien);

  const totals = {
    so_ca: list.reduce((s, x) => s + x.so_ca, 0),
    tong_tien: list.reduce((s, x) => s + x.tong_tien, 0),
    tong_hv: list.reduce((s, x) => s + (x.tong_hv || 0), 0),
    so_gv: list.length,
    so_tre: list.reduce((s, x) => s + x.so_tre, 0),
    so_som: list.reduce((s, x) => s + x.so_som, 0),
  };
  const daily = dates.map((d) => ({ label: d.slice(8, 10) + '/' + d.slice(5, 7), so: dayMap.get(d) || 0 }));

  // Lớp trống (GV không đến): lớp đã qua giờ mà không có ai chấm công
  const { data: lich } = await sb.from('lich_lop')
    .select('id, thu, gio_bat_dau, gio_ket_thuc, ten_lop, clubs!club_id ( ten_club ), nhan_vien!nv_id ( ma_nv, ho_ten )')
    .eq('dang_ap_dung', true);
  const byThu = {};
  for (const l of (lich || [])) (byThu[l.thu] ||= []).push(l);
  const today = vnParts().dateStr;
  const nowMin = vnNowMinutes();
  const missedList = [];
  for (const d of dates) {
    const thu = thuFromDate(d);
    for (const l of (byThu[thu] || [])) {
      if (attended.has(l.id + '|' + d)) continue;
      const past = d < today || (d === today && nowMin > hm(l.gio_bat_dau) + 15);
      if (!past) continue;
      missedList.push({
        ngay: d, club: l.clubs?.ten_club || '', lop: l.ten_lop,
        gio: hhmm(l.gio_bat_dau) + '–' + hhmm(l.gio_ket_thuc),
        hlv: l.nhan_vien ? `${l.nhan_vien.ma_nv} · ${l.nhan_vien.ho_ten}` : 'Chưa xếp HLV',
      });
    }
  }
  missedList.sort((a, b) => (a.ngay === b.ngay ? a.gio.localeCompare(b.gio) : b.ngay.localeCompare(a.ngay)));

  const hvList = (rows || [])
    .filter((r) => typeof r.so_hoc_vien === 'number' && r.so_hoc_vien <= 5)
    .map((r) => ({ ngay: r.ngay, club: r.clubs?.ten_club || '', lop: r.lich_lop?.ten_lop || 'Lớp khác', hlv: r.nhan_vien ? `${r.nhan_vien.ma_nv} · ${r.nhan_vien.ho_ten}` : '—', so_hoc_vien: r.so_hoc_vien }))
    .sort((a, b) => (a.so_hoc_vien === b.so_hoc_vien ? b.ngay.localeCompare(a.ngay) : a.so_hoc_vien - b.so_hoc_vien));

  const manualList = (rows || [])
    .filter((r) => r.thu_cong)
    .map((r) => ({ ngay: r.ngay, club: r.clubs?.ten_club || '', lop: r.lich_lop?.ten_lop || 'Lớp khác', hlv: r.nhan_vien ? `${r.nhan_vien.ma_nv} · ${r.nhan_vien.ho_ten}` : '—', vao: fmtTime(r.gio_vao), ra: r.gio_ra ? fmtTime(r.gio_ra) : '', hv: (typeof r.so_hoc_vien === 'number' ? r.so_hoc_vien : ''), ghi_chu: r.ghi_chu || '' }))
    .sort((a, b) => b.ngay.localeCompare(a.ngay));

  return { list, totals, daily, tu, den, missed: missedList.length, missedList, hvList, manualList };
}
