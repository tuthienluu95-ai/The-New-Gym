import { cookies } from 'next/headers';
import { isAdminToken, ADMIN_COOKIE } from '../../../../lib/auth';
import { supabaseAdmin } from '../../../../lib/supabase';
export const dynamic = 'force-dynamic';
export async function GET(req) {
  if (!isAdminToken(cookies().get(ADMIN_COOKIE)?.value)) return new Response('Unauthorized', { status: 401 });
  const q = (new URL(req.url).searchParams.get('q') || '').trim();
  if (!q) return Response.json({ nhanVien: [], clubs: [], lop: [] });
  const sb = supabaseAdmin();
  const like = `%${q}%`;
  const [{ data: nv }, { data: cl }, { data: ll }] = await Promise.all([
    sb.from('nhan_vien').select('id, ma_nv, ho_ten').or(`ma_nv.ilike.${like},ho_ten.ilike.${like}`).limit(6),
    sb.from('clubs').select('id, ten_club').ilike('ten_club', like).limit(5),
    sb.from('lich_lop').select('ten_lop').ilike('ten_lop', like).limit(30),
  ]);
  const seen = new Set(); const lop = [];
  for (const r of ll || []) { const t = (r.ten_lop || '').trim(); if (t && !seen.has(t.toLowerCase())) { seen.add(t.toLowerCase()); lop.push(t); } if (lop.length >= 5) break; }
  return Response.json({ nhanVien: nv || [], clubs: cl || [], lop });
}
