export function reqMeta(req) {
  const h = req.headers;
  const xff = h.get('x-forwarded-for') || '';
  const ip = (xff.split(',')[0] || '').trim() || h.get('x-real-ip') || null;
  return { ip, user_agent: h.get('user-agent') || null };
}
export async function logCham(sb, row) {
  try { await sb.from('cham_cong_log').insert(row); } catch (e) { /* không để log làm hỏng luồng chính */ }
}
