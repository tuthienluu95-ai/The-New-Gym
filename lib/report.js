function dateList(tu, den) {
  const out = [];
  let d = new Date(tu + 'T00:00:00Z');
  const end = new Date(den + 'T00:00:00Z');
  let guard = 0;
  while (d <= end && guard < 400) {
    out.push(d.toISOString().slice(0, 10));
    d.setUTCDate(d.getUTCDate() + 1);
    guard++;
  }
  return out;
}
function vnMinutes(ts) {
  if (!ts) return null;
  const fmt = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit', hour12: false });
  const p = fmt.formatToParts(new Date(ts));
  return Number(p.find((x) => x.type === 'hour').value) * 60 + Number(p.find((x) => x.type === 'minute').value);
}
function schedMinutes(t) {
  if (!t) return null;
  const [h, m] = String(t).split(':').map(Number);
  return h * 60 + m;
}

export async function buildReport(sb, tu, den) {
  const dates = dateList(tu, den);
  const { data: rows } = await sb.from('cham_cong')
    .select('nv_id, ngay, gio_vao, trang_thai, nhan_vien!nv_id ( ma_nv, ho_ten, thu_lao ), lich_lop!lich_lop_id ( gio_bat_dau )')
    .gte('ngay', tu).lte('ngay', den);

  const GRACE = 5;
  const byNv = new Map();
  const dayMap = new Map(dates.map((d) => [d, 0]));

  for (const r of (rows || [])) {
    if (!byNv.has(r.nv_id)) byNv.set(r.nv_id, {
      ma_nv: r.nhan_vien?.ma_nv || '', ho_ten: r.nhan_vien?.ho_ten || '',
      thu_lao: r.nhan_vien?.thu_lao || 0, so_ca: 0, so_tre: 0, ngay_tre: new Set(),
    });
    const agg = byNv.get(r.nv_id);
    agg.so_ca += 1;
    if (dayMap.has(r.ngay)) dayMap.set(r.ngay, dayMap.get(r.ngay) + 1);
    const sched = schedMinutes(r.lich_lop?.gio_bat_dau);
    const act = vnMinutes(r.gio_vao);
    if (sched != null && act != null && act > sched + GRACE) { agg.so_tre += 1; agg.ngay_tre.add(r.ngay); }
  }

  const list = Array.from(byNv.values()).map((a) => ({
    ma_nv: a.ma_nv, ho_ten: a.ho_ten, thu_lao: a.thu_lao, so_ca: a.so_ca, so_tre: a.so_tre,
    ngay_tre: Array.from(a.ngay_tre).sort(), tong_tien: (a.thu_lao || 0) * a.so_ca,
  })).sort((x, y) => y.tong_tien - x.tong_tien);

  const totals = {
    so_ca: list.reduce((s, x) => s + x.so_ca, 0),
    tong_tien: list.reduce((s, x) => s + x.tong_tien, 0),
    so_gv: list.length,
    so_tre: list.reduce((s, x) => s + x.so_tre, 0),
  };
  const daily = dates.map((d) => ({ label: d.slice(8, 10) + '/' + d.slice(5, 7), so: dayMap.get(d) || 0 }));
  return { list, totals, daily, tu, den };
}
