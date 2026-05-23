import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { deleteLessonSchedule } from '@/lib/db';

async function requireTeacher() {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;
  const decoded = verifyToken(token || '');
  if (!decoded || decoded.role !== 'teacher') return null;
  return decoded;
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ studentId: string }> }
) {
  try {
    if (!await requireTeacher()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { studentId } = await params;
    await deleteLessonSchedule(parseInt(studentId));
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
