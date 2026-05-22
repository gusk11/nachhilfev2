import { NextRequest, NextResponse } from 'next/server';
import { getQuiz } from '@/lib/db';

interface RawQuestion {
  id: number;
  type: 'mc' | 'tf';
  q: string;
  opts?: string[];
  ans: number | boolean;
}

function transformQuestion(raw: RawQuestion) {
  if (raw.type === 'mc') {
    const opts = raw.opts ?? [];
    return {
      id: String(raw.id),
      type: 'multiple' as const,
      text: raw.q,
      options: opts,
      correctAnswer: typeof raw.ans === 'number' ? opts[raw.ans] : undefined,
    };
  }
  return {
    id: String(raw.id),
    type: 'true-false' as const,
    text: raw.q,
    correctAnswer: raw.ans as boolean,
  };
}

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
      if (!res.ok) throw new Error(`Blob fetch failed: ${res.status}`);
      const text = await res.text();
      const quizData = JSON.parse(text);
      const questions = (quizData.questions as RawQuestion[]).map(transformQuestion);
      return NextResponse.json({ title: quiz.title, questions });
    } catch (e) {
      console.error('Quiz file fetch error:', e);
      return NextResponse.json({ error: 'Quiz-Datei konnte nicht geladen werden' }, { status: 502 });
    }
  } catch (error) {
    console.error('Get quiz error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
