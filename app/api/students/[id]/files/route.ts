import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { getStudentFiles, getStudentFilesForTeacher, createStudentFile, getStudent } from '@/lib/db';
import { uploadStudentFile } from '@/lib/blob';

async function getAuth() {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;
  return verifyToken(token || '');
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const decoded = await getAuth();
    if (!decoded) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const studentId = parseInt(id);

    if (decoded.role === 'teacher') {
      const files = await getStudentFilesForTeacher(studentId);
      return NextResponse.json(files);
    }

    if (decoded.role === 'student' && decoded.studentId === studentId) {
      const files = await getStudentFiles(studentId);
      return NextResponse.json(files);
    }

    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  } catch (error) {
    console.error('Get files error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const decoded = await getAuth();
    if (!decoded || decoded.role !== 'teacher') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const studentId = parseInt(id);

    const student = await getStudent(studentId);
    if (!student) return NextResponse.json({ error: 'Schüler nicht gefunden' }, { status: 404 });

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    if (!file) return NextResponse.json({ error: 'Keine Datei' }, { status: 400 });
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      return NextResponse.json({ error: 'Nur PDF-Dateien erlaubt' }, { status: 400 });
    }

    const fileKey = await uploadStudentFile(file, studentId, file.name);
    const record = await createStudentFile(studentId, file.name, fileKey);
    return NextResponse.json(record, { status: 201 });
  } catch (error) {
    console.error('Upload file error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
