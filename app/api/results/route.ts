import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { saveResult, getStudentResults } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    const decoded = verifyToken(token || '');

    if (!decoded || decoded.role !== 'student') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { quizId, score, answers } = await req.json();

    if (typeof quizId !== 'number' || typeof score !== 'number') {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }

    const result = await saveResult(decoded.studentId, quizId, score, answers ?? {});

    return NextResponse.json({ success: true, result });
  } catch (error) {
    console.error('Result save error:', error);
    return NextResponse.json({ error: 'Save failed' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    const decoded = verifyToken(token || '');

    if (!decoded || decoded.role !== 'student') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const results = await getStudentResults(decoded.studentId);

    return NextResponse.json({ results });
  } catch (error) {
    console.error('Get results error:', error);
    return NextResponse.json({ error: 'Fetch failed' }, { status: 500 });
  }
}
