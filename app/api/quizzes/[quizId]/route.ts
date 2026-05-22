import { NextRequest, NextResponse } from 'next/server';
import { getQuiz } from '@/lib/db';
import { get } from '@vercel/blob';

export async function GET(
  req: NextRequest,
  { params }: { params: { quizId: string } }
) {
  try {
    const quizId = parseInt(params.quizId);
    const quiz = await getQuiz(quizId);

    if (!quiz) {
      return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
    }

    try {
      const blob = await get(quiz.file_key);
      const text = await blob.text();
      const quizData = JSON.parse(text);

      return NextResponse.json({
        title: quiz.title,
        questions: quizData.questions,
      });
    } catch {
      return NextResponse.json({
        title: quiz.title,
        questions: [],
      });
    }
  } catch (error) {
    console.error('Get quiz error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
