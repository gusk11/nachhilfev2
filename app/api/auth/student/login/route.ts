import { NextRequest, NextResponse } from 'next/server';
import { generatePINHash, verifyPIN, generateStudentToken } from '@/lib/auth';
import { getStudentByName, createStudent } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const { name, pin, mode } = await req.json();

    if (!name || !pin) {
      return NextResponse.json({ error: 'Name and PIN required' }, { status: 400 });
    }

    let student = await getStudentByName(name);

    if (mode === 'register' && !student) {
      const { hash, salt } = generatePINHash(pin);
      student = await createStudent(name, hash, salt);
    } else if (mode === 'login' && student) {
      const validPin = verifyPIN(pin, student.pin_hash, student.pin_salt);
      if (!validPin) {
        return NextResponse.json({ error: 'Invalid PIN' }, { status: 401 });
      }
    } else {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const token = generateStudentToken(student.id);
    const response = NextResponse.json({ success: true, studentId: student.id });
    response.cookies.set('auth_token', token, { httpOnly: true, maxAge: 86400 });
    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
