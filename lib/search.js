export function stripV(s) {
  return String(s || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd').replace(/Đ/g, 'D')
    .toLowerCase().trim();
}
export function matchQ(hay, q) {
  if (!q || !String(q).trim()) return true;
  return stripV(hay).includes(stripV(q));
}
