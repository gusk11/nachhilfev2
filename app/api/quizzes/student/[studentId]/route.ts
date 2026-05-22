import { NextRequest, NextResponse } from 'next/server';
import { getStudentQuizzes } from '@/lib/db';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ studentId: string }> }
) {
  try {
    const { studentId: studentIdStr } = await params;
    const studentId = parseInt(studentIdStr);
    const quizzes = await getStudentQuizzes(studentId);
    return NextResponse.json(quizzes);
  } catch (error) {
    console.error('Get student quizzes error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
