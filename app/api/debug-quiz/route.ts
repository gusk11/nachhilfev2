import { NextRequest, NextResponse } from 'next/server';
import { getQuiz } from '@/lib/db';

// TEMPORÄR – nach Debug-Session löschen
export async function GET(req: NextRequest) {
  const quizId = req.nextUrl.searchParams.get('id');
  if (!quizId) return NextResponse.json({ error: 'id param missing' }, { status: 400 });

  const quiz = await getQuiz(parseInt(quizId));
  if (!quiz) return NextResponse.json({ error: 'quiz not found' }, { status: 404 });

  let blobStatus: number | null = null;
  let blobError: string | null = null;
  let contentType: string | null = null;
  let bodyPreview: string | null = null;

  try {
    const res = await fetch(quiz.file_key);
    blobStatus = res.status;
    contentType = res.headers.get('content-type');
    const text = await res.text();
    bodyPreview = text.slice(0, 200);
  } catch (e) {
    blobError = String(e);
  }

  return NextResponse.json({
    quizId: quiz.id,
    title: quiz.title,
    file_key: quiz.file_key,
    blobStatus,
    contentType,
    bodyPreview,
    blobError,
  });
}
