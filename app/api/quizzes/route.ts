import { NextRequest, NextResponse } from 'next/server';
import { getQuiz } from '@/lib/db';
import { get } from '@vercel/blob';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const quizId = searchParams.get('id');

    if (!quizId) {
      return NextResponse.json({ error: 'Quiz ID required' }, { status: 400 });
    }

    const quiz = await getQuiz(parseInt(quizId));
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
