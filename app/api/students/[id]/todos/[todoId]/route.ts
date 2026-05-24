import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { deleteStudentTodo } from '@/lib/db';

/**
 * DELETE: Schüler oder Lehrer dürfen Todos löschen.
 * Schüler hakt ab → Todo wird komplett gelöscht.
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; todoId: string }> }
) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    const decoded = verifyToken(token || '');
    if (!decoded) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id, todoId } = await params;
    const studentId = parseInt(id);
    if (decoded.role === 'student' && decoded.studentId !== studentId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await deleteStudentTodo(parseInt(todoId));
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('DELETE todo error:', e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
