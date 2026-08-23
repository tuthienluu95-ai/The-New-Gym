import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { isAdminToken, ADMIN_COOKIE } from '../../../../lib/auth';
import { supabaseAdmin } from '../../../../lib/supabase';
export const dynamic = 'force-dynamic';

export async function POST(req) {
  if (!isAdminToken(cookies().get(ADMIN_COOKIE)?.value)) return new Response('Unauthorized', { status: 401 });
  const form = await req.formData();
  const all = form.get('all');
  const truoc = form.get('truoc');
  const sb = supabaseAdmin();
  if (all) {
    await sb.from('cham_cong_log').delete().not('id', 'is', null);
  } else if (truoc) {
    await sb.from('cham_cong_log').delete().lt('created_at', truoc + 'T00:00:00+07:00');
  }
  return NextResponse.redirect(new URL('/admin/nhat-ky', new URL(req.url)), { status: 303 });
}
