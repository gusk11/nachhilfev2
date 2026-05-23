import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { getLessonScheduleForStudent, getLessonSessionsForStudent } from '@/lib/db';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    const decoded = verifyToken(token || '');
    if (!decoded) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const studentId = parseInt(id);
    if (decoded.role === 'student' && decoded.studentId !== studentId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const schedule = await getLessonScheduleForStudent(studentId);
    if (!schedule) return NextResponse.json({ schedule: null, next_lesson: null });

    const sessions = await getLessonSessionsForStudent(studentId);

    // Compute next lesson date from day_of_week
    const now = new Date();
    const todayDay = now.getDay();
    const [sh, sm] = (schedule.start_time as string).split(':').map(Number);
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const scheduleMinutes = sh * 60 + sm;

    let daysUntil = ((schedule.day_of_week as number) - todayDay + 7) % 7;
    // If today is the lesson day but time has passed → next week
    if (daysUntil === 0 && nowMinutes >= scheduleMinutes) daysUntil = 7;

    const nextDate = new Date(now);
    nextDate.setHours(0, 0, 0, 0);
    nextDate.setDate(nextDate.getDate() + daysUntil);
    const dateStr = nextDate.toISOString().split('T')[0];

    const session = sessions.find((s: any) => s.lesson_date?.toISOString?.()?.split('T')[0] === dateStr
      || String(s.lesson_date) === dateStr);

    const effectiveTime = session?.start_time || schedule.start_time;
    const effectiveDuration = session?.duration_minutes || schedule.duration_minutes;
    const isChanged = !!(session?.start_time && session.start_time !== schedule.start_time);

    return NextResponse.json({
      schedule,
      next_lesson: {
        date: dateStr,
        start_time: effectiveTime,
        duration_minutes: effectiveDuration,
        standard_time: schedule.start_time,
        notes: session?.notes || null,
        is_changed: isChanged,
      },
    });
  } catch (e) {
    console.error('next-lesson error:', e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
