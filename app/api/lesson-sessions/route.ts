import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { getAllUpcomingLessonSessions, upsertLessonSession } from '@/lib/db';

async function requireTeacher() {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;
  const decoded = verifyToken(token || '');
  if (!decoded || decoded.role !== 'teacher') return null;
  return decoded;
}

export async function GET() {
  try {
    if (!await requireTeacher()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const sessions = await getAllUpcomingLessonSessions();
    return NextResponse.json(sessions);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!await requireTeacher()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { student_id, lesson_date, start_time, duration_minutes, notes } = await req.json();
    if (!student_id || !lesson_date) {
      return NextResponse.json({ error: 'student_id und lesson_date erforderlich' }, { status: 400 });
    }
    const record = await upsertLessonSession(
      student_id, lesson_date,
      start_time || null,
      duration_minutes ? parseInt(duration_minutes) : null,
      notes || null
    );
    return NextResponse.json(record);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
