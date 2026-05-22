import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;
  const decoded = token ? verifyToken(token) : null;

  return NextResponse.json({
    hasCookie: !!token,
    tokenPreview: token ? token.substring(0, 20) + '...' : null,
    decoded,
    reqCookies: req.cookies.getAll().map(c => c.name),
  });
}
