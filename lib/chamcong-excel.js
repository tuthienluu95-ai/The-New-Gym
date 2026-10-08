import ExcelJS from 'exceljs';

const BRAND = 'FF1591D6', WEAK = 'FFE6F3FB', GRAY = 'FFEFF2F5', TOTAL = 'FFFFF4D6';
const hhmm = (t) => (t || '').slice(0, 5);
const thin = () => ({ style: 'thin', color: { argb: 'FFD0D5DD' } });
const BORDER = () => ({ top: thin(), left: thin(), bottom: thin(), right: thin() });

function headerStyle(row) {
  row.height = 22;
  row.eachCell((c) => {
    c.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND } };
    c.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    c.border = BORDER();
  });
}
function dataBorders(row) { row.eachCell({ includeEmpty: true }, (c) => { c.border = BORDER(); }); }
function fillRow(row, argb) { row.eachCell({ includeEmpty: true }, (c) => { c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb } }; c.font = { ...(c.font || {}), bold: true }; c.border = BORDER(); }); }
function money(cell) { cell.numFmt = '#,##0'; cell.alignment = { horizontal: 'right' }; }
function center(cell) { cell.alignment = { horizontal: 'center' }; }

export async function buildChamCongExcel({ rows, nvClubChinh, tu, den, today }) {
  const wb = new ExcelJS.Workbook();
  const ky = (tu && den) ? `${tu} → ${den}` : (today || '');

  // chuẩn hoá dữ liệu + tính tiền
  const recs = rows.map((r) => {
    const factor = (r.so_hoc_vien === 0) ? 0.5 : 1;
    const thu_lao = r.nhan_vien?.thu_lao || 0;
    const quen = r.trang_thai === 'quen_ra' || (!r.gio_ra && r.ngay < today);
    return {
      ngay: r.ngay, ma_nv: r.nhan_vien?.ma_nv || '', ho_ten: r.nhan_vien?.ho_ten || '',
      loai: r.nhan_vien?.loai_gv === 'tam_thoi' ? 'Tạm thời' : 'Chính thức',
      club: r.clubs?.ten_club || '—', lop: r.lich_lop?.ten_lop || 'Lớp khác',
      ca: r.lich_lop ? `${hhmm(r.lich_lop.gio_bat_dau)}-${hhmm(r.lich_lop.gio_ket_thuc)}` : '',
      so_hv: (typeof r.so_hoc_vien === 'number' ? r.so_hoc_vien : null),
      pct: factor === 0.5 ? '50%' : '100%', tien: Math.round(thu_lao * factor),
      thu_lao, ghi_chu: r.ghi_chu || '',
      vao: r.gio_vao, ra: r.gio_ra,
      trang_thai: quen ? 'Quên chấm ra' : (r.trang_thai === 'hoan_thanh' ? 'Hoàn thành' : 'Đang trong ca'),
    };
  });

  // ===== Sheet 1: Chi tiết =====
  const s1 = wb.addWorksheet('Chi tiết', { views: [{ state: 'frozen', ySplit: 3 }] });
  s1.columns = [
    { width: 11 }, { width: 7 }, { width: 22 }, { width: 11 }, { width: 20 }, { width: 16 },
    { width: 13 }, { width: 7 }, { width: 10 }, { width: 14 }, { width: 24 }, { width: 7 }, { width: 7 }, { width: 14 },
  ];
  s1.mergeCells('A1:N1');
  s1.getCell('A1').value = `CHI TIẾT CHẤM CÔNG · ${ky}`;
  s1.getCell('A1').font = { bold: true, size: 14, color: { argb: 'FF14202B' } };
  const h1 = s1.addRow(['Ngày', 'Mã NV', 'Họ tên', 'Loại GV', 'Club', 'Lớp', 'Ca lớp', 'Số HV', '% thù lao', 'Thành tiền buổi', 'Ghi chú', 'Vào', 'Ra', 'Trạng thái']);
  headerStyle(h1);
  const fmtT = (ts) => ts ? new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(ts)) : '';
  for (const r of recs) {
    const row = s1.addRow([r.ngay, r.ma_nv, r.ho_ten, r.loai, r.club, r.lop, r.ca, r.so_hv ?? '', r.pct, r.tien, r.ghi_chu, fmtT(r.vao), r.ra ? fmtT(r.ra) : '', r.trang_thai]);
    dataBorders(row); center(row.getCell(8)); center(row.getCell(9)); money(row.getCell(10));
  }

  // ===== Sheet 2: Lương theo nhân viên =====
  const byNv = new Map();
  for (const r of recs) {
    if (!byNv.has(r.ma_nv)) byNv.set(r.ma_nv, { ma_nv: r.ma_nv, ho_ten: r.ho_ten, loai: r.loai, thu_lao: r.thu_lao, so_ca: 0, so100: 0, so50: 0, hv: 0, tien: 0 });
    const a = byNv.get(r.ma_nv);
    a.so_ca += 1; if (r.pct === '50%') a.so50 += 1; else a.so100 += 1;
    if (typeof r.so_hv === 'number') a.hv += r.so_hv; a.tien += r.tien;
  }
  const s2 = wb.addWorksheet('Lương theo nhân viên', { views: [{ state: 'frozen', ySplit: 3 }] });
  s2.columns = [{ width: 7 }, { width: 22 }, { width: 11 }, { width: 20 }, { width: 10 }, { width: 10 }, { width: 11 }, { width: 10 }, { width: 13 }, { width: 15 }];
  s2.mergeCells('A1:J1');
  s2.getCell('A1').value = `BẢNG LƯƠNG THEO NHÂN VIÊN · ${ky}`;
  s2.getCell('A1').font = { bold: true, size: 14, color: { argb: 'FF14202B' } };
  const h2 = s2.addRow(['Mã', 'Họ tên', 'Loại GV', 'Club chính', 'Tổng buổi', 'Buổi 100%', 'Buổi 50%', 'Tổng HV', 'Thù lao/ca', 'Thành tiền']);
  headerStyle(h2);
  const nvArr = Array.from(byNv.values()).sort((a, b) => String(a.ma_nv).localeCompare(String(b.ma_nv), 'vi', { numeric: true }));
  let tCa = 0, tTien = 0;
  for (const a of nvArr) {
    const row = s2.addRow([a.ma_nv, a.ho_ten, a.loai, nvClubChinh[a.ma_nv] || '', a.so_ca, a.so100, a.so50, a.hv, a.thu_lao, a.tien]);
    dataBorders(row); [5, 6, 7, 8].forEach((i) => center(row.getCell(i))); money(row.getCell(9)); money(row.getCell(10));
    tCa += a.so_ca; tTien += a.tien;
  }
  const tot2 = s2.addRow(['', 'TỔNG CỘNG', '', '', tCa, '', '', '', '', tTien]);
  fillRow(tot2, TOTAL); center(tot2.getCell(5)); money(tot2.getCell(10));

  // ===== Sheet 3: Theo cửa hàng =====
  const byClub = new Map();
  for (const r of recs) {
    if (!byClub.has(r.club)) byClub.set(r.club, new Map());
    const m = byClub.get(r.club);
    if (!m.has(r.ma_nv)) m.set(r.ma_nv, { ma_nv: r.ma_nv, ho_ten: r.ho_ten, loai: r.loai, so_ca: 0, tien: 0 });
    const a = m.get(r.ma_nv); a.so_ca += 1; a.tien += r.tien;
  }
  const s3 = wb.addWorksheet('Theo cửa hàng', { views: [{ state: 'frozen', ySplit: 3 }] });
  s3.columns = [{ width: 26 }, { width: 8 }, { width: 11 }, { width: 10 }, { width: 15 }];
  s3.mergeCells('A1:E1');
  s3.getCell('A1').value = `LƯƠNG THEO CỬA HÀNG · ${ky}`;
  s3.getCell('A1').font = { bold: true, size: 14, color: { argb: 'FF14202B' } };
  const h3 = s3.addRow(['Cửa hàng / HLV', 'Mã', 'Loại GV', 'Số buổi', 'Thành tiền']);
  headerStyle(h3);
  let gCa = 0, gTien = 0;
  const clubNames = Array.from(byClub.keys()).sort((a, b) => a.localeCompare(b, 'vi'));
  for (const club of clubNames) {
    const cr = s3.addRow([club, '', '', '', '']);
    s3.mergeCells(`A${cr.number}:E${cr.number}`);
    cr.getCell(1).font = { bold: true, size: 12, color: { argb: 'FF0E5E86' } };
    cr.eachCell({ includeEmpty: true }, (c) => { c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: GRAY } }; c.border = BORDER(); });
    let sumCa = 0, sumTien = 0;
    const arr = Array.from(byClub.get(club).values()).sort((a, b) => b.tien - a.tien);
    for (const a of arr) {
      const row = s3.addRow([a.ho_ten, a.ma_nv, a.loai, a.so_ca, a.tien]);
      dataBorders(row); center(row.getCell(2)); center(row.getCell(3)); center(row.getCell(4)); money(row.getCell(5));
      sumCa += a.so_ca; sumTien += a.tien;
    }
    const sub = s3.addRow([`Tổng ${club}`, '', '', sumCa, sumTien]);
    fillRow(sub, WEAK); center(sub.getCell(4)); money(sub.getCell(5));
    s3.addRow([]);
    gCa += sumCa; gTien += sumTien;
  }
  const g = s3.addRow(['TỔNG TOÀN HỆ THỐNG', '', '', gCa, gTien]);
  fillRow(g, TOTAL); center(g.getCell(4)); money(g.getCell(5));

  return Buffer.from(await wb.xlsx.writeBuffer());
}
