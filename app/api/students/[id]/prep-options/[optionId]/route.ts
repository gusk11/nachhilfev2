import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { updateStudentPrepOption, deleteStudentPrepOption } from '@/lib/db';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; optionId: string }> }
) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    const decoded = verifyToken(token || '');
    if (!decoded || decoded.role !== 'teacher') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, optionId } = await params;
    const studentId = parseInt(id);
    const { label } = await req.json();
    if (!label?.trim()) {
      return NextResponse.json({ error: 'label erforderlich' }, { status: 400 });
    }

    await updateStudentPrepOption(parseInt(optionId), studentId, label.trim());
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('PATCH prep-option error:', e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; optionId: string }> }
) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    const decoded = verifyToken(token || '');
    if (!decoded || decoded.role !== 'teacher') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, optionId } = await params;
    await deleteStudentPrepOption(parseInt(optionId), parseInt(id));
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('DELETE prep-option error:', e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
