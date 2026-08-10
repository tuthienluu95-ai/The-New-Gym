function monthRange(thang) {
  const [y, m] = thang.split('-').map(Number);
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return { first: `${thang}-01`, last: `${thang}-${String(lastDay).padStart(2, '0')}`, lastDay };
}

function vnMinutes(ts) {
  if (!ts) return null;
  const fmt = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit', hour12: false });
  const parts = fmt.formatToParts(new Date(ts));
  const h = Number(parts.find((p) => p.type === 'hour').value);
  const mi = Number(parts.find((p) => p.type === 'minute').value);
  return h * 60 + mi;
}
function schedMinutes(t) {
  if (!t) return null;
  const [h, m] = String(t).split(':').map(Number);
  return h * 60 + m;
}

export async function buildReport(sb, thang) {
  const { first, last, lastDay } = monthRange(thang);
  const { data: rows } = await sb.from('cham_cong')
    .select('nv_id, ngay, gio_vao, trang_thai, nhan_vien!nv_id ( ma_nv, ho_ten, thu_lao ), lich_lop!lich_lop_id ( gio_bat_dau )')
    .gte('ngay', first).lte('ngay', last);

  const GRACE = 5;
  const byNv = new Map();
  const daily = Array.from({ length: lastDay }, (_, i) => ({ day: i + 1, so: 0 }));

  for (const r of (rows || [])) {
    if (!byNv.has(r.nv_id)) byNv.set(r.nv_id, {
      ma_nv: r.nhan_vien?.ma_nv || '', ho_ten: r.nhan_vien?.ho_ten || '',
      thu_lao: r.nhan_vien?.thu_lao || 0, so_ca: 0, so_tre: 0, ngay_tre: new Set(),
    });
    const agg = byNv.get(r.nv_id);
    agg.so_ca += 1;
    const d = Number(String(r.ngay).slice(8, 10));
    if (daily[d - 1]) daily[d - 1].so += 1;
    const sched = schedMinutes(r.lich_lop?.gio_bat_dau);
    const act = vnMinutes(r.gio_vao);
    if (sched != null && act != null && act > sched + GRACE) {
      agg.so_tre += 1; agg.ngay_tre.add(r.ngay);
    }
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
  return { list, totals, daily, thang };
}
