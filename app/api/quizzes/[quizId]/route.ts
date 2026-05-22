import { NextRequest, NextResponse } from 'next/server';
import { getQuiz } from '@/lib/db';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ quizId: string }> }
) {
  try {
    const { quizId: quizIdStr } = await params;
    const quizId = parseInt(quizIdStr);
    const quiz = await getQuiz(quizId);

    if (!quiz) {
      return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
    }

    try {
      const res = await fetch(quiz.file_key);
      const text = await res.text();
      const quizData = JSON.parse(text);
      return NextResponse.json({ title: quiz.title, questions: quizData.questions });
    } catch {
      return NextResponse.json({ title: quiz.title, questions: [] });
    }
  } catch (error) {
    console.error('Get quiz error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
