import { NextRequest, NextResponse } from 'next/server';
import { getQuiz, deleteQuiz } from '@/lib/db';

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

    // New format: questions are stored directly in DB
    if (quiz.questions) {
      return NextResponse.json({
        title: quiz.title,
        questions: typeof quiz.questions === 'string' ? JSON.parse(quiz.questions) : quiz.questions,
      });
    }

    // Fallback for legacy blob-based quizzes (if any)
    if (quiz.file_key) {
      try {
        const res = await fetch(quiz.file_key);
        if (res.ok) {
          const quizData = await res.json();
          return NextResponse.json({ title: quiz.title, questions: quizData.questions });
        }
      } catch (e) {
        console.warn('Legacy quiz blob fetch failed:', e);
      }
    }

    return NextResponse.json({ error: 'Quiz-Daten nicht verfügbar' }, { status: 502 });
  } catch (error) {
    console.error('Get quiz error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ quizId: string }> }
) {
  try {
    const { quizId: quizIdStr } = await params;
    const quizId = parseInt(quizIdStr);
    await deleteQuiz(quizId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete quiz error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
