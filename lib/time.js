export function vnParts(d = new Date()) {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short',
  });
  const parts = fmt.formatToParts(d);
  const get = (t) => parts.find((p) => p.type === t)?.value;
  const dateStr = get('year') + '-' + get('month') + '-' + get('day');
  const wdMap = { Sun: 8, Mon: 2, Tue: 3, Wed: 4, Thu: 5, Fri: 6, Sat: 7 };
  return { dateStr, thu: wdMap[get('weekday')] };
}

export function thuLabel(thu) {
  return { 2: 'Thứ 2', 3: 'Thứ 3', 4: 'Thứ 4', 5: 'Thứ 5', 6: 'Thứ 6', 7: 'Thứ 7', 8: 'CN' }[thu] || '';
}

export function fmtTime(v) {
  if (!v) return '';
  return new Date(v).toLocaleTimeString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit' });
}

export function fmtDateTime(v) {
  if (!v) return '';
  return new Date(v).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}
