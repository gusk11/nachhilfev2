import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { deleteStudentFile, getStudentFile } from '@/lib/db';
import { deleteBlob } from '@/lib/blob';

async function requireTeacher() {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;
  return verifyToken(token || '');
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; fileId: string }> }
) {
  try {
    const decoded = await requireTeacher();
    if (!decoded || decoded.role !== 'teacher') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { fileId } = await params;
    const file = await getStudentFile(parseInt(fileId));
    if (!file) return NextResponse.json({ error: 'Datei nicht gefunden' }, { status: 404 });

    await deleteBlob(file.file_key);
    await deleteStudentFile(parseInt(fileId));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete file error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
