import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('auth_token')?.value;
  const pathname = request.nextUrl.pathname;

  // Public routes
  if (
    pathname === '/' ||
    pathname === '/lehrer' ||
    pathname === '/schueler' ||
    pathname.startsWith('/api/auth/')
  ) {
    return NextResponse.next();
  }

  // Protected routes - einfach nur checken ob Token existiert
  if (pathname.startsWith('/student/') || pathname.startsWith('/lehrer/dashboard')) {
    if (!token) {
      const loginUrl = pathname.startsWith('/student') ? '/schueler' : '/lehrer';
      return NextResponse.redirect(new URL(loginUrl, request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|example-quiz.json).*)',
  ],
};