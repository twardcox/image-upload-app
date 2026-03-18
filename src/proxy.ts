import { NextRequest, NextResponse } from 'next/server';

export default function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isPublicRoute = pathname === '/login' || pathname === '/signup';

  // NextAuth v5 session cookie names for http and https deployments.
  const sessionToken =
    req.cookies.get('authjs.session-token')?.value ??
    req.cookies.get('__Secure-authjs.session-token')?.value;

  const isLoggedIn = Boolean(sessionToken);

  if (isLoggedIn && isPublicRoute) {
    return NextResponse.redirect(new URL('/gallery', req.url));
  }

  if (!isLoggedIn && !isPublicRoute && pathname !== '/') {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|uploads).*)'],
};