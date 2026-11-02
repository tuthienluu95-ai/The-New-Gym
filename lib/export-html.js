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
  let table = null;
  for (let r = range.s.r; r <= range.e.r; r++) {
    const cells = [];
    for (let c = range.s.c; c <= range.e.c; c++) {
      if (skip.has(`${r}:${c}`)) continue;
      const v = ws[XLSX.utils.encode_cell({ r, c })]?.v;
      cells.push({ v: v ?? '', span: span.get(`${r}:${c}`) || 1 });
    }
    const filled = cells.filter((x) => x.v !== '');
    if (filled.length === 0) { table = null; continue; }
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

// Dựng trang HTML từ chính file Excel, để số liệu luôn giống hệt bản Excel
export function workbookToHtml(buf, title, downloadHref, logoUrl = '/logo.png') {
  const wb = XLSX.read(buf, { type: 'buffer' });
  const sections = wb.SheetNames.map((name) => {
    const blocks = sheetBlocks(wb.Sheets[name]);
    if (blocks[0]?.title) blocks.shift(); // tiêu đề sheet đã có ở h2
    return `<section class="sheet"><h2>${esc(name)}</h2>${blocks.map(renderBlock).join('')}</section>`;
  }).join('');
  const ngay = new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', dateStyle: 'short', timeStyle: 'short' }).format(new Date());
  return `<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title><style>${CSS}</style></head><body>`
    + `<header class="top"><img class="logo" src="${esc(logoUrl)}" alt="The New Gym"><div><h1>${esc(title)}</h1><p>Xuất lúc ${esc(ngay)}</p></div>`
    + `<div class="tools"><button onclick="window.print()">In / Lưu PDF</button><a href="${esc(downloadHref)}">Tải file HTML</a></div></header>`
    + `<main>${sections}</main><footer>The New Gym · Admin Console</footer></body></html>`;
}

// format=html: đổi file Excel route vừa tạo thành trang xem/in; thiếu tham số thì trả nguyên file Excel
export async function withHtmlExport(req, res) {
  const url = new URL(req.url);
  if (url.searchParams.get('format') !== 'html') return res;
  if (!(res.headers.get('Content-Type') || '').includes(XLSX_TYPE)) return res;
  const name = (/filename="([^"]+)"/.exec(res.headers.get('Content-Disposition') || '')?.[1] || 'bao-cao.xlsx').replace(/\.xlsx$/, '');
  const taiVe = url.searchParams.get('download') === '1';
  const html = workbookToHtml(Buffer.from(await res.arrayBuffer()), name, url.pathname + url.search + '&download=1', url.origin + '/logo.png');
  return new Response(html, { headers: {
    'Content-Type': 'text/html; charset=utf-8',
    ...(taiVe ? { 'Content-Disposition': `attachment; filename="${name}.html"` } : {}),
  } });
}
