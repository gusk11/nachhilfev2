import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyTeacherPassword, generateTeacherToken } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { password } = await req.json();

    if (!password || !verifyTeacherPassword(password)) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
    }

    const token = generateTeacherToken();
    const cookieStore = await cookies();
    cookieStore.set('auth_token', token, { httpOnly: true, maxAge: 86400, path: '/' });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Teacher login error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
