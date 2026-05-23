import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { deleteLessonSession } from '@/lib/db';

async function requireTeacher() {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;
  const decoded = verifyToken(token || '');
  if (!decoded || decoded.role !== 'teacher') return null;
  return decoded;
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!await requireTeacher()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;
    await deleteLessonSession(parseInt(id));
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
