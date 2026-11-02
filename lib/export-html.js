import * as XLSX from 'xlsx';

const XLSX_TYPE = 'spreadsheetml';
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// Màu giống trang admin: menu xanh đen, nền xám xanh, xanh logo
const CSS = `
*{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}
body{margin:0;background:#F3F6FB;color:#14202B;font:14px/1.5 'Segoe UI',Roboto,Arial,sans-serif}
.top{background:#0F1B33;color:#fff;padding:20px 32px;display:flex;align-items:center;gap:20px;flex-wrap:wrap}
.logo{background:#fff;border-radius:10px;padding:8px 12px;height:60px}
.top h1{margin:0;font-size:22px;font-weight:700}
.top p{margin:2px 0 0;color:#B8C4DA;font-size:13px}
.tools{margin-left:auto;display:flex;gap:8px}
.tools button,.tools a{border:0;border-radius:8px;padding:10px 16px;font:600 14px 'Segoe UI',Arial,sans-serif;text-decoration:none;cursor:pointer;background:#fff;color:#14202B}
.tools button{background:#0284C7;color:#fff}
main{max-width:1500px;margin:0 auto;padding:20px 32px 40px}
.sheet{background:#fff;border:1px solid #DCE6EE;border-top:4px solid #00AEEF;border-radius:12px;padding:20px;margin-bottom:20px}
.wrap{overflow-x:auto}
table{border-collapse:collapse;width:100%;margin-bottom:6px}
h2{margin:0 0 12px;font-size:18px;color:#0F1B33}
h3{margin:18px 0 8px;font-size:15px;color:#0284C7}
th{background:#0284C7;color:#fff;font-weight:600;padding:9px 10px;text-align:center;border:1px solid #0284C7;font-size:13px}
td{padding:8px 10px;border:1px solid #E4EAF3;vertical-align:middle;white-space:pre-line}
tbody tr:nth-child(even) td{background:#F7FAFD}
td.num{text-align:right;white-space:nowrap}
tr.group td{background:#E0F5FD;color:#0F1B33;font-weight:700}
tr.total td{background:#FFF4D6;font-weight:700}
.kpis{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:10px;margin-bottom:12px}
.kpi{border:1px solid #DCE6EE;border-top:3px solid #00AEEF;border-radius:10px;padding:10px 12px;background:#fff}
.kpi b{display:block;font-size:20px;line-height:1.2;white-space:nowrap}.kpi span{color:#5B6B78;font-size:12px}
.attn{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-bottom:12px}
.attn div{display:flex;justify-content:space-between;align-items:center;border-radius:10px;padding:10px 14px;font-weight:600}
.attn b{font-size:20px}.red{background:#FCEBEB;color:#9B1C1C}.amber{background:#FBF0DA;color:#7A4F0F}.blue{background:#E0F5FD;color:#0F6FA8}
.charts{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}
.chart.full{grid-column:1/-1}
.chart svg{width:100%;height:auto;display:block}
.chart svg.donut{width:190px;margin:0 auto 8px}
.chart p{margin:-6px 0 6px;color:#5B6B78;font-size:11.5px}
.chart .t{font-size:9.5px;fill:#5B6B78}.chart .v{font-size:8px;fill:#14202B}
.legend{list-style:none;margin:0;padding:0;display:flex;flex-wrap:wrap;gap:4px 12px;justify-content:center;font-size:11.5px}
.legend i{display:inline-block;width:10px;height:10px;border-radius:2px;margin-right:5px}
.chart{border:1px solid #E4EAF3;border-radius:10px;padding:10px 12px;break-inside:avoid}
.chart h4{margin:0 0 8px;font-size:14px;color:#0F1B33}
.bar{display:grid;grid-template-columns:150px 1fr 90px;gap:8px;align-items:center;font-size:11.5px;margin-bottom:3px}
.bar i{display:block;height:9px;border-radius:5px;background:var(--c,#00AEEF)}.bar u{display:block;background:#EEF2F8;border-radius:5px;text-decoration:none}
.bar em{font-style:normal;text-align:right;color:#5B6B78}
footer{text-align:center;color:#5B6B78;font-size:12px;padding-bottom:20px}
@media print{@page{size:A4 landscape;margin:8mm}body{background:#fff;font-size:11px}.tools{display:none}main{padding:10px 0;max-width:none}.top{padding:12px 16px}.sheet{border-left:0;border-right:0;border-bottom:0;border-radius:0;padding:10px 0;break-after:page}.sheet:last-child{break-after:auto}.wrap{overflow:visible}tr{break-inside:avoid}thead{display:table-header-group}th,td{padding:5px 6px}}
`;

const fmt = (v) => {
  if (typeof v !== 'number') return esc(v);
  return esc(v.toLocaleString('vi-VN'));
};

// Đọc một sheet thành các khối: tiêu đề hoặc bảng (dòng đầu là hàng tiêu đề cột)
function sheetBlocks(ws) {
  if (!ws['!ref']) return [];
  const range = XLSX.utils.decode_range(ws['!ref']);
  const span = new Map(), skip = new Set();
  for (const m of ws['!merges'] || []) {
    span.set(`${m.s.r}:${m.s.c}`, m.e.c - m.s.c + 1);
    for (let r = m.s.r; r <= m.e.r; r++) for (let c = m.s.c; c <= m.e.c; c++) if (r !== m.s.r || c !== m.s.c) skip.add(`${r}:${c}`);
  }
  const blocks = [];
  let table = null, lastTable = null;
  for (let r = range.s.r; r <= range.e.r; r++) {
    const cells = [];
    for (let c = range.s.c; c <= range.e.c; c++) {
      if (skip.has(`${r}:${c}`)) continue;
      const v = ws[XLSX.utils.encode_cell({ r, c })]?.v;
      cells.push({ v: v ?? '', span: span.get(`${r}:${c}`) || 1 });
    }
    const filled = cells.filter((x) => x.v !== '');
    const dongTong = /^TỔNG/.test(String(filled[0]?.v ?? ''));
    if (filled.length === 0) { lastTable = table || lastTable; table = null; continue; }
    if (dongTong && !table && lastTable) { lastTable.rows.push({ kind: 'total', cells }); continue; }
    if (filled.length === 1 && !table) { blocks.push({ title: String(filled[0].v) }); continue; }
    if (!table) { table = { head: cells, rows: [] }; blocks.push(table); continue; }
    const text = String(filled[0].v);
    const kind = /^(TỔNG|Tổng )/.test(text) ? 'total' : filled.length === 1 ? 'group' : '';
    table.rows.push({ kind, cells });
  }
  return blocks;
}

function renderBlock(b) {
  if (b.title) return `<h3>${esc(b.title)}</h3>`;
  const head = b.head.map((c) => `<th colspan="${c.span}">${esc(c.v)}</th>`).join('');
  const body = b.rows.map((row) => {
    const tds = row.cells.map((c) => `<td colspan="${c.span}"${typeof c.v === 'number' ? ' class="num"' : ''}>${fmt(c.v)}</td>`).join('');
    return `<tr class="${row.kind}">${tds}</tr>`;
  }).join('');
  return `<div class="wrap"><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`;
}

// Biểu đồ SVG vẽ sẵn trong file: giống trang Bảng điều khiển, in PDF và mở offline đều giữ nguyên
const PIE = ['#00AEEF', '#F5A623', '#4C8C2B', '#E0567A', '#8E63C8', '#12B5B0', '#E07B39', '#5A6B7B'];
const STATUS = ['#4C8C2B', '#F5A623', '#00AEEF', '#E0567A'];
const W = 440, H = 280, L = 38, R = 10, T = 12;
const chart = (title, sub, inner, cls = '') => `<div class="chart ${cls}"><h4>${esc(title)}</h4>${sub ? `<p>${esc(sub)}</p>` : ''}${inner}</div>`;
const niceMax = (m) => { const e = 10 ** Math.floor(Math.log10(Math.max(m, 1))); const n = [1, 2, 4, 5, 6, 8, 10].find((x) => x * e >= m); return (n || 10) * e; };
const svgOpen = (title) => `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(title)}">`;
function axes(max, bottom) {
  let g = '';
  for (let i = 0; i <= 4; i++) {
    const y = T + ((bottom - T) * i) / 4, v = (max * (4 - i)) / 4;
    g += `<line x1="${L}" x2="${W - R}" y1="${y}" y2="${y}" stroke="#E9EEF3" stroke-dasharray="3 3"/><text x="${L - 5}" y="${y + 3}" text-anchor="end" class="t">${Number.isInteger(v) ? v : v.toFixed(1)}</text>`;
  }
  return g + `<line x1="${L}" x2="${L}" y1="${T}" y2="${bottom}" stroke="#14202B"/><line x1="${L}" x2="${W - R}" y1="${bottom}" y2="${bottom}" stroke="#14202B"/>`;
}
function lineChart(title, daily) {
  const bottom = H - 26, max = niceMax(Math.max(1, ...daily.map((d) => d.so))), n = Math.max(1, daily.length - 1);
  const X = (i) => L + (i / n) * (W - L - R), Y = (v) => bottom - (v / max) * (bottom - T);
  let path = '', labels = '';
  daily.forEach((d, i) => {
    if (i === 0) path = `M${X(0)},${Y(d.so)}`;
    else { const mx = (X(i - 1) + X(i)) / 2; path += ` C${mx},${Y(daily[i - 1].so)} ${mx},${Y(d.so)} ${X(i)},${Y(d.so)}`; }
    if (i % 5 === 0 || i === n) labels += `<text x="${X(i)}" y="${bottom + 15}" text-anchor="middle" class="t">${esc(d.label)}</text>`;
  });
  return chart(title, '', `${svgOpen(title)}${axes(max, bottom)}<path d="${path}" fill="none" stroke="#00AEEF" stroke-width="2"/>${labels}</svg>`);
}
function colChart(title, sub, items, color) {
  const bottom = H - 76, max = niceMax(Math.max(1, ...items.map((x) => x.value))), step = (W - L - R) / Math.max(1, items.length), bw = step * 0.72;
  const cols = items.map((x, i) => {
    const h = (x.value / max) * (bottom - T), cx = L + step * i + step / 2;
    return `<rect x="${cx - bw / 2}" y="${bottom - h}" width="${bw}" height="${h}" rx="3" fill="${color}"/><text x="${cx}" y="${bottom - h - 3}" text-anchor="middle" class="v">${fmt(x.value)}</text>`
      + `<text transform="translate(${cx + 3},${bottom + 11}) rotate(-35)" text-anchor="end" class="t">${esc(x.label)}</text>`;
  }).join('');
  return chart(title, sub, `${svgOpen(title)}${axes(max, bottom)}${cols}</svg>`);
}
function donutChart(title, items, colors) {
  const total = items.reduce((t, x) => t + x.value, 0) || 1;
  let off = 25;
  const arcs = items.map((x, i) => {
    const p = (x.value / total) * 100, seg = `<circle cx="21" cy="21" r="15.9" fill="none" stroke="${colors[i % colors.length]}" stroke-width="6.5" pathLength="100" stroke-dasharray="${Math.max(p - 0.5, 0.2)} ${100 - Math.max(p - 0.5, 0.2)}" stroke-dashoffset="${off}"/>`;
    off -= p; return seg;
  }).join('');
  const legend = items.map((x, i) => `<li><i style="background:${colors[i % colors.length]}"></i>${esc(x.label)} <b>${fmt(x.value)}</b> (${((x.value / total) * 100).toFixed(1)}%)</li>`).join('');
  return chart(title, '', `<svg class="donut" viewBox="0 0 42 42" role="img" aria-label="${esc(title)}">${arcs}</svg><ul class="legend">${legend}</ul>`);
}
function barChart(title, sub, items, color, cls) {
  const max = Math.max(1, ...items.map((x) => x.value));
  const rows = items.map((x) => `<div class="bar"><span>${esc(x.label)}</span><u><i style="width:${Math.round((x.value / max) * 100)}%;--c:${color}"></i></u><em>${fmt(x.value)}</em></div>`).join('');
  return chart(title, sub, rows, cls);
}

// Trang tổng quan của Bảng điều khiển, đặt trước các bảng chi tiết
export function overviewHtml(rep, { tenClub, tu, den, homNay, dangDay }) {
  const t = rep.totals;
  const dungGio = t.so_ca ? Math.round(((t.so_ca - t.so_tre) / t.so_ca) * 100) : 0;
  const kpis = [['Tổng buổi dạy', fmt(t.so_ca)], ['Tổng thù lao', fmt(t.tong_tien) + ' đ'], ['Tổng lượt học viên', fmt(t.tong_hv)], ['Tỉ lệ đúng giờ', dungGio + '%'], ['Chấm công hôm nay', fmt(homNay)], ['Đang trong ca', fmt(dangDay)]];
  return `<section class="sheet"><h2>Bảng điều khiển · ${esc(tenClub)} · ${esc(tu)} → ${esc(den)}</h2>`
    + `<div class="kpis">${kpis.map(([l, v]) => `<div class="kpi"><b>${v}</b><span>${l}</span></div>`).join('')}</div>`
    + `<div class="attn"><div class="red">Lớp trống (GV vắng)<b>${fmt(rep.missed)}</b></div><div class="amber">Buổi ≤ 5 học viên<b>${fmt(rep.hvList.length)}</b></div><div class="blue">Vào trễ / Ra sớm<b>${fmt(t.so_tre + t.so_som)}</b></div></div>`
    + '<div class="charts">'
    + lineChart('Xu hướng buổi dạy theo ngày', rep.daily)
    + colChart('Buổi dạy theo club', '', rep.byClub.map((x) => ({ label: x.club, value: x.buoi })), '#00AEEF')
    + donutChart('Cơ cấu loại lớp', rep.byType.map((x) => ({ label: x.name, value: x.value })), PIE)
    + donutChart('Trạng thái buổi dạy', rep.byStatus.map((x) => ({ label: x.name, value: x.value })), STATUS)
    + colChart('Buổi dạy theo khung giờ', 'Giờ cao điểm trong ngày', rep.byHour.map((x) => ({ label: x.gio, value: x.so })), '#8E63C8')
    + colChart('Học viên trung bình theo club', '', rep.hvByClub.map((x) => ({ label: x.club, value: x.hvAvg })), '#12B5B0')
    + barChart('Top 10 HLV theo thù lao', 'Đơn vị: đồng', rep.topHlv.map((x) => ({ label: x.ten, value: x.tien })), '#F5A623', 'full')
    + '</div></section>';
}

// Dựng trang HTML từ chính file Excel, để số liệu luôn giống hệt bản Excel
export function workbookToHtml(buf, title, downloadHref, logoUrl = '/logo.png', { intro = '', sheetTitles = {} } = {}) {
  const wb = XLSX.read(buf, { type: 'buffer' });
  const sections = wb.SheetNames.map((name) => {
    const blocks = sheetBlocks(wb.Sheets[name]);
    if (blocks[0]?.title) blocks.shift(); // tiêu đề sheet đã có ở h2
    return `<section class="sheet"><h2>${esc(sheetTitles[name] || name)}</h2>${blocks.map(renderBlock).join('')}</section>`;
  }).join('');
  const ngay = new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', dateStyle: 'short', timeStyle: 'short' }).format(new Date());
  return `<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title><style>${CSS}</style></head><body>`
    + `<header class="top"><img class="logo" src="${esc(logoUrl)}" alt="The New Gym"><div><h1>${esc(title)}</h1><p>Xuất lúc ${esc(ngay)}</p></div>`
    + `<div class="tools"><button onclick="window.print()">In / Lưu PDF</button><a href="${esc(downloadHref)}">Tải file HTML</a></div></header>`
    + `<main>${intro}${sections}</main><footer>The New Gym · Admin Console</footer></body></html>`;
}

// format=html: đổi file Excel route vừa tạo thành trang xem/in; thiếu tham số thì trả nguyên file Excel
export async function withHtmlExport(req, res, { title, ...opts } = {}) {
  const url = new URL(req.url);
  if (url.searchParams.get('format') !== 'html') return res;
  if (!(res.headers.get('Content-Type') || '').includes(XLSX_TYPE)) return res;
  const name = (/filename="([^"]+)"/.exec(res.headers.get('Content-Disposition') || '')?.[1] || 'bao-cao.xlsx').replace(/\.xlsx$/, '');
  const taiVe = url.searchParams.get('download') === '1';
  const html = workbookToHtml(Buffer.from(await res.arrayBuffer()), title || name, url.pathname + url.search + '&download=1', url.origin + '/logo.png', opts);
  return new Response(html, { headers: {
    'Content-Type': 'text/html; charset=utf-8',
    ...(taiVe ? { 'Content-Disposition': `attachment; filename="${name}.html"` } : {}),
  } });
}
