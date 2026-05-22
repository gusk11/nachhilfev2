import { NextRequest, NextResponse } from 'next/server';
import { getQuiz } from '@/lib/db';
import { get } from '@vercel/blob';

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
      const token = process.env.BLOB_READ_WRITE_TOKEN!;
      const blob = await get(token, quiz.file_key);
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
