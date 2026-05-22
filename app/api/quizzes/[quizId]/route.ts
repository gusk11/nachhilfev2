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
      const result = await get(quiz.file_key, { token: process.env.BLOB_READ_WRITE_TOKEN!, access: 'private' });
      if (!result || result.statusCode !== 200 || !result.stream) throw new Error('Blob not found');
      const text = await new Response(result.stream).text();
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
