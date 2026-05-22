import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { createQuiz } from '@/lib/db';
import { put } from '@vercel/blob';

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
    const studentId = formData.get('studentId');

    if (!file || !title) {
      return NextResponse.json({ error: 'File and title required' }, { status: 400 });
    }

    const buffer = await file.arrayBuffer();
    const fileKey = `quizzes/${Date.now()}-${file.name}`;

    await put(fileKey, buffer, { access: 'public' });

    const quiz = await createQuiz(title, fileKey, studentId ? parseInt(studentId as string) : null);

    return NextResponse.json({ success: true, quiz });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('Upload error:', error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
