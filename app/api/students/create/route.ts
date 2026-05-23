import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken, generatePINHash } from '@/lib/auth';
import { createStudent } from '@/lib/db';

async function requireTeacher() {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;
  const decoded = verifyToken(token || '');
  if (!decoded || decoded.role !== 'teacher') return null;
  return decoded;
}

export async function POST(req: NextRequest) {
  try {
    if (!await requireTeacher()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { name, pin } = await req.json();

    if (!name?.trim() || !pin?.trim()) {
      return NextResponse.json({ error: 'Name und PIN erforderlich' }, { status: 400 });
    }

    const { hash, salt } = generatePINHash(pin);
    const student = await createStudent(name.trim(), hash, salt);
    return NextResponse.json(student);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
