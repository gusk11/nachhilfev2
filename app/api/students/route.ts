import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getStudents } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get('auth_token')?.value;
    const decoded = verifyToken(token || '');

    if (!decoded || decoded.role !== 'teacher') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const students = await getStudents();
    return NextResponse.json(students);
  } catch (error) {
    console.error('Get students error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
