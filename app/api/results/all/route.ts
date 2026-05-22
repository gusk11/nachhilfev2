import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { getAllResults } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    const decoded = verifyToken(token || '');

    if (!decoded || decoded.role !== 'teacher') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const results = await getAllResults();
    return NextResponse.json(results);
  } catch (error) {
    console.error('Get results error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
