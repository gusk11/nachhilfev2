import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { getStudentPrepOptions, addStudentPrepOption } from '@/lib/db';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    const decoded = verifyToken(token || '');
    if (!decoded) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const studentId = parseInt(id);
    if (decoded.role === 'student' && decoded.studentId !== studentId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const options = await getStudentPrepOptions(studentId);
    return NextResponse.json(options);
  } catch (e) {
    console.error('GET prep-options error:', e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    const decoded = verifyToken(token || '');
    if (!decoded || decoded.role !== 'teacher') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const studentId = parseInt(id);
    const { label } = await req.json();
    if (!label?.trim()) {
      return NextResponse.json({ error: 'label erforderlich' }, { status: 400 });
    }

    const existing = await getStudentPrepOptions(studentId);
    const sortOrder = existing.length;
    const option = await addStudentPrepOption(studentId, label.trim(), sortOrder);
    return NextResponse.json(option);
  } catch (e) {
    console.error('POST prep-options error:', e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
