import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { getStudentTodos, createStudentTodo } from '@/lib/db';

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

    const todos = await getStudentTodos(studentId);
    return NextResponse.json(todos);
  } catch (e) {
    console.error('GET todos error:', e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

/** POST: Nur Lehrer dürfen Todos hinzufügen. Body: { text: string } */
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
    const { text } = await req.json();
    if (!text || typeof text !== 'string' || !text.trim()) {
      return NextResponse.json({ error: 'text erforderlich' }, { status: 400 });
    }

    const todo = await createStudentTodo(studentId, text.trim());
    return NextResponse.json(todo);
  } catch (e) {
    console.error('POST todo error:', e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
