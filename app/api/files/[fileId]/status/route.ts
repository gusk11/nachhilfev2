import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { getStudentFile, upsertFileStatus } from '@/lib/db';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    const decoded = verifyToken(token || '');
    if (!decoded || decoded.role !== 'student') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { fileId } = await params;
    const file = await getStudentFile(parseInt(fileId));
    if (!file) return NextResponse.json({ error: 'Datei nicht gefunden' }, { status: 404 });

    if (file.student_id !== decoded.studentId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { seen, completed } = await req.json();
    await upsertFileStatus(parseInt(fileId), decoded.studentId, Boolean(seen), Boolean(completed));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('File status error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
