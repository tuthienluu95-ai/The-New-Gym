import { NextResponse } from 'next/server';
import { ADMIN_COOKIE } from '../../../../lib/auth';

export async function POST(req) {
  const base = new URL(req.url).origin;
  const res = NextResponse.redirect(base + '/admin/login', { status: 303 });
  res.cookies.set(ADMIN_COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 });
  return res;
}
