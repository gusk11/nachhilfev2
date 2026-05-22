import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { getResultDetail } from '@/lib/db';
import { list } from '@vercel/blob';

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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    const decoded = verifyToken(token || '');

    if (!decoded) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const resultId = parseInt(id);
    if (isNaN(resultId)) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    }

    const detail = await getResultDetail(resultId);
    if (!detail) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    if (decoded.role === 'student' && detail.student_id !== decoded.studentId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const base = {
      id: detail.id,
      score: detail.score,
      completed_at: detail.completed_at,
      student_name: detail.student_name,
      quiz_title: detail.title,
    };

    if (!detail.answers) {
      return NextResponse.json({ ...base, questions: null, answers: null });
    }

    try {
      let fetchUrl = detail.file_key;
      if (!fetchUrl.startsWith('http')) {
        const { blobs } = await list({ prefix: fetchUrl, limit: 1 });
        if (blobs.length === 0) throw new Error('Blob not found');
        fetchUrl = blobs[0].url;
      }

      const res = await fetch(fetchUrl);
      if (!res.ok) throw new Error(`Blob fetch failed: ${res.status}`);
      const quizData = JSON.parse(await res.text());
      const questions = (quizData.questions as RawQuestion[]).map(transformQuestion);

      return NextResponse.json({ ...base, questions, answers: detail.answers });
    } catch {
      return NextResponse.json({ ...base, questions: null, answers: null });
    }
  } catch (error) {
    console.error('Get result detail error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
