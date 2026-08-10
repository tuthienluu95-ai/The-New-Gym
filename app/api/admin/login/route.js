import { NextResponse } from 'next/server';
import { adminToken, ADMIN_COOKIE } from '../../../../lib/auth';

export async function POST(req) {
  const form = await req.formData();
  const password = form.get('password');
  const base = new URL(req.url).origin;
  if (!process.env.ADMIN_PASSWORD || password !== process.env.ADMIN_PASSWORD) {
    return NextResponse.redirect(base + '/admin/login?error=1', { status: 303 });
  }
  const res = NextResponse.redirect(base + '/admin', { status: 303 });
  res.cookies.set(ADMIN_COOKIE, adminToken(), {
    httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 12,
  });
  return res;
}
