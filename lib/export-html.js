import * as XLSX from 'xlsx';

const XLSX_TYPE = 'spreadsheetml';
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
body{margin:0;background:#F3F6FB;color:#14202B;font:13px/1.45 'Segoe UI',Roboto,Arial,sans-serif}
.bar{position:sticky;top:0;display:flex;gap:8px;padding:12px 20px;background:#0F1B33}
.bar button,.bar a{border:0;border-radius:8px;padding:9px 14px;background:#fff;color:#14202B;font:600 13px inherit;text-decoration:none;cursor:pointer}
.bar button{background:#0284C7;color:#fff}
section{background:#fff;margin:16px 20px;padding:16px;border-radius:10px;overflow:auto}
h2{margin:0 0 10px;font-size:16px}
table{border-collapse:collapse;width:100%}
td{border:1px solid #DCE6EE;padding:5px 8px;vertical-align:middle;white-space:pre-line}
tr:first-child td{font-weight:600}
@media print{@page{size:A4 landscape;margin:10mm}body{background:#fff}.bar{display:none}section{margin:0;padding:0;overflow:visible;page-break-after:always}section:last-child{page-break-after:auto}tr{page-break-inside:avoid}}
`;

// Dựng trang HTML từ chính file Excel, để số liệu luôn giống hệt bản Excel
export function workbookToHtml(buf, title, downloadHref) {
  const wb = XLSX.read(buf, { type: 'buffer', cellNF: true });
  const sections = wb.SheetNames.map((name) => {
    const table = XLSX.utils.sheet_to_html(wb.Sheets[name], { header: '', footer: '' });
    return `<section><h2>${esc(name)}</h2>${table}</section>`;
  }).join('');
  return `<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title><style>${CSS}</style></head><body>`
    + `<div class="bar"><button onclick="window.print()">In / Lưu PDF</button><a href="${esc(downloadHref)}">Tải file HTML</a></div>${sections}</body></html>`;
}

// format=html: đổi file Excel route vừa tạo thành trang xem/in; thiếu tham số thì trả nguyên file Excel
export async function withHtmlExport(req, res) {
  const url = new URL(req.url);
  if (url.searchParams.get('format') !== 'html') return res;
  if (!(res.headers.get('Content-Type') || '').includes(XLSX_TYPE)) return res;
  const name = (/filename="([^"]+)"/.exec(res.headers.get('Content-Disposition') || '')?.[1] || 'bao-cao.xlsx').replace(/\.xlsx$/, '');
  const taiVe = url.searchParams.get('download') === '1';
  const html = workbookToHtml(Buffer.from(await res.arrayBuffer()), name, url.pathname + url.search + '&download=1');
  return new Response(html, { headers: {
    'Content-Type': 'text/html; charset=utf-8',
    ...(taiVe ? { 'Content-Disposition': `attachment; filename="${name}.html"` } : {}),
  } });
}
