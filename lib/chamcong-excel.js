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
    // GV tạm thời = dạy thay; buổi được tính cho GV chính thức phụ trách lớp trong lịch
    const laTamThoi = r.nhan_vien?.loai_gv === 'tam_thoi';
    const phuTrach = r.lich_lop?.nhan_vien || null;
    const coChuLop = laTamThoi && phuTrach && phuTrach.loai_gv !== 'tam_thoi' && phuTrach.ma_nv !== r.nhan_vien?.ma_nv;
    const nguoiTinh = coChuLop ? phuTrach : r.nhan_vien;
    return {
      day_thay: laTamThoi, chua_ro: laTamThoi && !coChuLop, cho_ma: coChuLop ? phuTrach.ma_nv : '', cho_ten: coChuLop ? phuTrach.ho_ten : '',
      gv_ma: r.nhan_vien?.ma_nv || '', gv_ten: r.nhan_vien?.ho_ten || '', gv_thu_lao: r.nhan_vien?.thu_lao || 0,
      ngay: r.ngay, ma_nv: nguoiTinh?.ma_nv || '', ho_ten: nguoiTinh?.ho_ten || '',
      loai: nguoiTinh?.loai_gv === 'tam_thoi' ? 'Tạm thời' : 'Chính thức',
      club: r.clubs?.ten_club || '—', lop: r.lich_lop?.ten_lop || 'Lớp khác',
      ca: r.lich_lop ? `${hhmm(r.lich_lop.gio_bat_dau)}-${hhmm(r.lich_lop.gio_ket_thuc)}` : '',
      so_hv: (typeof r.so_hoc_vien === 'number' ? r.so_hoc_vien : null),
      pct: factor === 0.5 ? '50%' : '100%', tien: Math.round((nguoiTinh?.thu_lao || 0) * factor),
      thu_lao: nguoiTinh?.thu_lao || 0, ghi_chu: r.ghi_chu || '',
      vao: r.gio_vao, ra: r.gio_ra,
      trang_thai: quen ? 'Quên chấm ra' : (r.trang_thai === 'hoan_thanh' ? 'Hoàn thành' : 'Đang trong ca'),
    };
  });

  // ===== Sheet 1: Chi tiết =====
  const s1 = wb.addWorksheet('Chi tiết', { views: [{ state: 'frozen', ySplit: 3 }] });
  s1.columns = [
    { width: 11 }, { width: 7 }, { width: 22 }, { width: 11 }, { width: 20 }, { width: 16 },
    { width: 13 }, { width: 7 }, { width: 10 }, { width: 14 }, { width: 24 }, { width: 7 }, { width: 7 }, { width: 14 }, { width: 24 }, { width: 24 },
  ];
  s1.mergeCells('A1:P1');
  s1.getCell('A1').value = `CHI TIẾT CHẤM CÔNG · ${ky}`;
  s1.getCell('A1').font = { bold: true, size: 14, color: { argb: 'FF14202B' } };
  const h1 = s1.addRow(['Ngày', 'Mã NV', 'Họ tên', 'Loại GV', 'Club', 'Lớp', 'Ca lớp', 'Số HV', '% thù lao', 'Thành tiền buổi', 'Ghi chú', 'Vào', 'Ra', 'Trạng thái', 'GV dạy thay', 'Dạy thay cho (tính công cho)']);
  headerStyle(h1);
  const fmtT = (ts) => ts ? new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(ts)) : '';
  for (const r of recs) {
    const row = s1.addRow([r.ngay, r.ma_nv, r.ho_ten, r.loai, r.club, r.lop, r.ca, r.so_hv ?? '', r.pct, r.tien, r.ghi_chu, fmtT(r.vao), r.ra ? fmtT(r.ra) : '', r.trang_thai,
      r.day_thay ? `${r.gv_ma} · ${r.gv_ten}` : '', r.day_thay ? (r.chua_ro ? 'Trường hợp riêng - cần chấm thủ công' : `${r.cho_ma} · ${r.cho_ten}`) : '']);
    dataBorders(row); center(row.getCell(8)); center(row.getCell(9)); money(row.getCell(10));
    if (r.day_thay) row.eachCell({ includeEmpty: true }, (c) => { c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: r.chua_ro ? TOTAL : WEAK } }; });
  }

  // ===== Sheet 2: Lương theo nhân viên =====
  const byNv = new Map();
  for (const r of recs) {
    if (!byNv.has(r.ma_nv)) byNv.set(r.ma_nv, { ma_nv: r.ma_nv, ho_ten: r.ho_ten, loai: r.loai, thu_lao: r.thu_lao, so_ca: 0, so100: 0, so50: 0, hv: 0, tien: 0, cong: [] });
    const a = byNv.get(r.ma_nv);
    a.so_ca += 1; if (r.pct === '50%') a.so50 += 1; else a.so100 += 1;
    if (typeof r.so_hv === 'number') a.hv += r.so_hv; a.tien += r.tien;
    if (r.cho_ma) a.cong.push(`${r.gv_ten} - lớp ${r.ca || r.lop} - ngày ${r.ngay.slice(8, 10)}/${r.ngay.slice(5, 7)}`);
  }
  // bảng dạy thay: gom theo GV dạy thay, GV được thay, club, lớp, ca
  const byThay = new Map();
  for (const r of recs.filter((x) => x.day_thay)) {
    const k = [r.gv_ma, r.cho_ma, r.club, r.lop, r.ca].join('|');
    if (!byThay.has(k)) byThay.set(k, { ...r, so: 0, ngays: [] });
    const t = byThay.get(k); t.so += 1; t.ngays.push(r.ngay.slice(8, 10) + '/' + r.ngay.slice(5, 7));
  }
  const thayArr = Array.from(byThay.values()).sort((a, b) => a.chua_ro - b.chua_ro || a.gv_ten.localeCompare(b.gv_ten, 'vi'));

  const s2 = wb.addWorksheet('Lương theo nhân viên', { views: [{ state: 'frozen', ySplit: 2 }] });
  s2.columns = [{ width: 7 }, { width: 28 }, { width: 11 }, { width: 26 }, { width: 10 }, { width: 10 }, { width: 10 }, { width: 10 }, { width: 13 }, { width: 15 }, { width: 13 }, { width: 62 }];
  s2.mergeCells('A1:L1');
  s2.getCell('A1').value = `BẢNG LƯƠNG THEO NHÂN VIÊN · ${ky}`;
  s2.getCell('A1').font = { bold: true, size: 14, color: { argb: 'FF14202B' } };
  const h2 = s2.addRow(['Mã', 'Họ tên', 'Loại GV', 'Club chính', 'Tổng buổi', 'Buổi 100%', 'Buổi 50%', 'Tổng HV', 'Thù lao/ca', 'Thành tiền', 'Cộng thêm buổi dạy thay', 'Chi tiết buổi được cộng']);
  headerStyle(h2);
  h2.height = 44;
  const nvArr = Array.from(byNv.values()).sort((a, b) => (a.loai === b.loai ? 0 : a.loai === 'Chính thức' ? -1 : 1) || String(a.ma_nv).localeCompare(String(b.ma_nv), 'vi', { numeric: true }));
  // vị trí bảng dạy thay ở dưới, để cột "Cộng thêm" lấy số trực tiếp từ bảng đó
  const dongDau = 3 + nvArr.length + 1 + 3, dongCuoi = dongDau + Math.max(thayArr.length, 1) - 1;
  let tCa = 0, tTien = 0, tCong = 0;
  for (const a of nvArr) {
    const n = s2.rowCount + 1;
    const row = s2.addRow([a.ma_nv, a.ho_ten, a.loai, nvClubChinh[a.ma_nv] || '', a.so_ca, a.so100, a.so50, a.hv, a.thu_lao, a.tien,
      { formula: `SUMIF($C$${dongDau}:$C$${dongCuoi},A${n},$E$${dongDau}:$E$${dongCuoi})`, result: a.cong.length }, a.cong.join('\n')]);
    dataBorders(row); [5, 6, 7, 8, 11].forEach((i) => center(row.getCell(i))); money(row.getCell(9)); money(row.getCell(10));
    // căn giữa theo chiều dọc để dòng nhiều buổi dạy thay vẫn thẳng hàng
    row.eachCell({ includeEmpty: true }, (c) => { c.alignment = { ...(c.alignment || {}), vertical: 'middle' }; });
    row.getCell(12).alignment = { wrapText: true, vertical: 'middle' };
    row.height = Math.max(18, 17 * a.cong.length + 2);
    tCa += a.so_ca; tTien += a.tien; tCong += a.cong.length;
  }
  const tot2 = s2.addRow(['', 'TỔNG CỘNG', '', '', tCa, '', '', '', '', tTien, tCong, '']);
  fillRow(tot2, TOTAL); center(tot2.getCell(5)); money(tot2.getCell(10)); center(tot2.getCell(11));

  s2.addRow([]);
  const tt = s2.addRow(['CHI TIẾT DẠY THAY']);
  tt.getCell(1).font = { bold: true, size: 13, color: { argb: 'FF14202B' } };
  const hThay = s2.addRow(['Mã', 'GV dạy thay', 'Mã GV được thay', 'GV được thay', 'Số buổi', 'Club', '', '', 'Lớp · Ca', '', 'Các ngày', '']);
  const gop = (n) => { s2.mergeCells(`F${n}:H${n}`); s2.mergeCells(`I${n}:J${n}`); s2.mergeCells(`K${n}:L${n}`); };
  gop(hThay.number); headerStyle(hThay); hThay.height = 32;
  for (const t of thayArr) {
    const row = s2.addRow([t.gv_ma, t.gv_ten, t.chua_ro ? '' : t.cho_ma, t.chua_ro ? 'Trường hợp riêng - cần chấm thủ công' : t.cho_ten, t.so, t.club, '', '', `${t.lop}${t.ca ? ' · ' + t.ca : ''}`, '', t.ngays.join(', '), '']);
    gop(row.number); dataBorders(row); center(row.getCell(5));
    row.eachCell({ includeEmpty: true }, (c) => { c.alignment = { ...(c.alignment || {}), vertical: 'middle' }; });
    row.getCell(11).alignment = { wrapText: true, vertical: 'middle' };
    row.height = Math.max(18, 17 * Math.ceil(t.ngays.join(', ').length / 70));
    if (t.chua_ro) row.eachCell({ includeEmpty: true }, (c) => { c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: TOTAL } }; });
  }
  if (thayArr.length === 0) { const row = s2.addRow(['', 'Không có buổi dạy thay trong kỳ']); gop(row.number); }
  const tongThay = thayArr.reduce((s, t) => s + t.so, 0);
  const totThay = s2.addRow(['', 'TỔNG CỘNG', '', '', tongThay, '', '', '', '', '', '', '']);
  fillRow(totThay, TOTAL); center(totThay.getCell(5));

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

  // ===== Sheet 4: Lớp ít học viên (≤ 5 HV) theo club, khung giờ =====
  const it = recs.filter((r) => typeof r.so_hv === 'number' && r.so_hv <= 5);
  const s4 = wb.addWorksheet('Lớp ít học viên', { views: [{ state: 'frozen', ySplit: 2 }] });
  s4.columns = [{ width: 14 }, { width: 20 }, { width: 11 }, { width: 26 }, { width: 8 }, { width: 10 }, { width: 24 }];
  s4.mergeCells('A1:G1');
  s4.getCell('A1').value = `LỚP ÍT HỌC VIÊN (≤ 5 HV) THEO CLUB, KHUNG GIỜ · ${ky}`;
  s4.getCell('A1').font = { bold: true, size: 14, color: { argb: 'FF14202B' } };
  headerStyle(s4.addRow(['Khung giờ', 'Lớp', 'Ngày', 'HLV dạy', 'Số HV', '% thù lao', 'Ghi chú']));
  const itClub = new Map();
  for (const r of it) { if (!itClub.has(r.club)) itClub.set(r.club, []); itClub.get(r.club).push(r); }
  let gIt = 0, g0 = 0;
  for (const club of Array.from(itClub.keys()).sort((a, b) => a.localeCompare(b, 'vi'))) {
    const cr = s4.addRow([club, '', '', '', '', '', '']);
    s4.mergeCells(`A${cr.number}:G${cr.number}`);
    cr.getCell(1).font = { bold: true, size: 12, color: { argb: 'FF0E5E86' } };
    cr.eachCell({ includeEmpty: true }, (c) => { c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: GRAY } }; c.border = BORDER(); });
    const arr = itClub.get(club).sort((a, b) => (a.ca || '').localeCompare(b.ca || '') || a.lop.localeCompare(b.lop, 'vi') || a.ngay.localeCompare(b.ngay));
    for (const r of arr) {
      const row = s4.addRow([r.ca || '—', r.lop, r.ngay, `${r.gv_ma} · ${r.gv_ten}`, r.so_hv, r.pct, r.so_hv === 0 ? '0 HV - tính 50% thù lao' : '']);
      dataBorders(row); center(row.getCell(1)); center(row.getCell(5)); center(row.getCell(6));
    }
    const khong = arr.filter((r) => r.so_hv === 0).length;
    const sub = s4.addRow([`Tổng ${club}`, '', '', '', arr.length, '', `${khong} buổi 0 HV`]);
    s4.mergeCells(`A${sub.number}:D${sub.number}`);
    fillRow(sub, WEAK); center(sub.getCell(5));
    s4.addRow([]);
    gIt += arr.length; g0 += khong;
  }
  if (it.length === 0) s4.addRow(['Không có lớp ≤ 5 học viên trong kỳ']);
  const gr = s4.addRow(['TỔNG TOÀN HỆ THỐNG', '', '', '', gIt, '', `${g0} buổi 0 HV`]);
  s4.mergeCells(`A${gr.number}:D${gr.number}`);
  fillRow(gr, TOTAL); center(gr.getCell(5));

  return Buffer.from(await wb.xlsx.writeBuffer());
}
