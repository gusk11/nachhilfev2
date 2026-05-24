import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { getStudentAnki, updateStudentAnki } from '@/lib/db';

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

    const anki = await getStudentAnki(studentId);
    return NextResponse.json(anki);
  } catch (e) {
    console.error('GET anki error:', e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

/** PATCH: Nur Lehrer dürfen Anki-Credentials setzen. */
export async function PATCH(
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
    const body = await req.json();
    const username = typeof body.anki_username === 'string' ? body.anki_username.trim() || null : null;
    const password = typeof body.anki_password === 'string' ? body.anki_password : null;

    await updateStudentAnki(studentId, username, password);
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('PATCH anki error:', e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
