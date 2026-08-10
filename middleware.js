import { NextResponse } from 'next/server';

export function middleware(req) {
  const { pathname } = req.nextUrl;
  if (pathname.startsWith('/admin') && !pathname.startsWith('/admin/login')) {
    const c = req.cookies.get('tng_admin')?.value;
    if (!c) {
      const url = req.nextUrl.clone();
      url.pathname = '/admin/login';
      return NextResponse.redirect(url);
    }
  }
  return NextResponse.next();
}

export const config = { matcher: ['/admin/:path*'] };
