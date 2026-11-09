// Cheap first gate: anything under /staff needs a valid session cookie. Pages and actions still check the role.
import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

export async function middleware(req) {
  const { pathname } = req.nextUrl;
  if (pathname === '/staff/login') return NextResponse.next();
  const token = req.cookies.get('bx_session')?.value;
  const raw = process.env.SESSION_SECRET || (process.env.NODE_ENV === 'production' ? '' : 'dev-only-secret-not-for-production-use-0000');
  try {
    if (!token || !raw) throw new Error('no session');
    await jwtVerify(token, new TextEncoder().encode(raw));
    return NextResponse.next();
  } catch {
    const url = req.nextUrl.clone();
    url.pathname = '/staff/login';
    url.search = '';
    return NextResponse.redirect(url);
  }
}

export const config = { matcher: ['/staff/:path*'] };
