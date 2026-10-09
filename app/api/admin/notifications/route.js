import { cookies } from 'next/headers';
import { isAdminToken, ADMIN_COOKIE } from '../../../../lib/auth';
import { supabaseAdmin } from '../../../../lib/supabase';
import { vnParts } from '../../../../lib/time';
export const dynamic = 'force-dynamic';
export async function GET() {
  if (!isAdminToken(cookies().get(ADMIN_COOKIE)?.value)) return new Response('Unauthorized', { status: 401 });
  const sb = supabaseAdmin();
  const { dateStr } = vnParts();
  const { data } = await sb.from('cham_cong')
    .select('id, gio_vao, nhan_vien!nv_id ( ho_ten ), lich_lop!lich_lop_id ( ten_lop )')
    .eq('ngay', dateStr).is('gio_ra', null)
    .order('gio_vao', { ascending: true });
  const items = (data || []).map((r) => ({ id: r.id, ho_ten: r.nhan_vien?.ho_ten || 'NV', lop: r.lich_lop?.ten_lop || 'Lớp khác' }));
  return Response.json({ count: items.length, items });
}
