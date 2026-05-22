import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { getStudentFile } from '@/lib/db';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    const decoded = verifyToken(token || '');
    if (!decoded) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { fileId } = await params;
    const file = await getStudentFile(parseInt(fileId));
    if (!file) return NextResponse.json({ error: 'Datei nicht gefunden' }, { status: 404 });

    if (decoded.role === 'student' && decoded.studentId !== file.student_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.redirect(file.file_key);
  } catch (error) {
    console.error('Download error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
