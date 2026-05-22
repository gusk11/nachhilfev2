import { NextRequest, NextResponse } from 'next/server';
import { verifyTeacherPassword, generateTeacherToken } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { password } = await req.json();

    if (!password || !verifyTeacherPassword(password)) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
    }

    const token = generateTeacherToken();
    const response = NextResponse.json({ success: true });
    response.cookies.set('auth_token', token, { httpOnly: true, maxAge: 86400 });
    return response;
  } catch (error) {
    console.error('Teacher login error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
