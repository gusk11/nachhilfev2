import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from './lib/auth';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('auth_token')?.value;
  const pathname = request.nextUrl.pathname;

  // Public routes
  if (pathname === '/' || pathname === '/lehrer' || pathname.startsWith('/api/auth/')) {
    return NextResponse.next();
  }

  // Protected student routes
  if (pathname.startsWith('/student/')) {
    if (!token) {
      return NextResponse.redirect(new URL('/', request.url));
    }
    const decoded = verifyToken(token);
    if (!decoded || decoded.role !== 'student') {
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  // Protected teacher routes
  if (pathname.startsWith('/lehrer/dashboard')) {
    if (!token) {
      return NextResponse.redirect(new URL('/lehrer', request.url));
    }
    const decoded = verifyToken(token);
    if (!decoded || decoded.role !== 'teacher') {
      return NextResponse.redirect(new URL('/lehrer', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|example-quiz.json).*)',
  ],
};
