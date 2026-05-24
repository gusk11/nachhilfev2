import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { createQuiz } from '@/lib/db';
import { parseQuizHtml } from '@/lib/quiz-html-parser';

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    const decoded = verifyToken(token || '');

    if (!decoded || decoded.role !== 'teacher') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const title = formData.get('title') as string;
    const studentIdsRaw = formData.get('studentIds') as string | null;

    if (!file || !title) {
      return NextResponse.json({ error: 'File and title required' }, { status: 400 });
    }

    const text = await file.text();
    const parsed = parseQuizHtml(text);

    const studentIds =
      studentIdsRaw && studentIdsRaw.length > 0
        ? studentIdsRaw.split(',').map((id) => parseInt(id)).filter((id) => !isNaN(id))
        : [];

    if (studentIds.length === 0) {
      // Für alle Schüler
      const quiz = await createQuiz(title, null, null, parsed.questions);
      return NextResponse.json({ success: true, quiz });
    }

    const quizzes = await Promise.all(
      studentIds.map((id) => createQuiz(title, null, id, parsed.questions))
    );

    return NextResponse.json({ success: true, quizzes });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('Upload error:', error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
