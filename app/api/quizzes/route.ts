import { NextRequest, NextResponse } from 'next/server';
import { getQuiz, getAllQuizzes } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const quizId = searchParams.get('id');
    const listAll = searchParams.get('all');

    if (listAll) {
      const quizzes = await getAllQuizzes();
      return NextResponse.json(quizzes);
    }

    if (!quizId) {
      return NextResponse.json({ error: 'Quiz ID required' }, { status: 400 });
    }

    const quiz = await getQuiz(parseInt(quizId));
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
