import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken, generatePINHash } from '@/lib/auth';
import { deleteStudent, updateStudentPin } from '@/lib/db';

async function requireTeacher() {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;
  return verifyToken(token || '');
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const decoded = await requireTeacher();
    if (!decoded || decoded.role !== 'teacher') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    await deleteStudent(parseInt(id));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete student error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const decoded = await requireTeacher();
    if (!decoded || decoded.role !== 'teacher') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { pin } = await req.json();
    if (!pin || typeof pin !== 'string' || pin.trim().length === 0) {
      return NextResponse.json({ error: 'PIN erforderlich' }, { status: 400 });
    }

    const { hash, salt } = generatePINHash(pin.trim());
    const { id } = await params;
    await updateStudentPin(parseInt(id), hash, salt);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Update PIN error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
