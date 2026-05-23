import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { getAllLessonSchedules, upsertLessonSchedule } from '@/lib/db';

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
    const schedules = await getAllLessonSchedules();
    return NextResponse.json(schedules);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!await requireTeacher()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { student_id, day_of_week, start_time, duration_minutes } = await req.json();
    if (!student_id || day_of_week === undefined || !start_time || !duration_minutes) {
      return NextResponse.json({ error: 'Fehlende Felder' }, { status: 400 });
    }
    const record = await upsertLessonSchedule(student_id, day_of_week, start_time, duration_minutes);
    return NextResponse.json(record);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
