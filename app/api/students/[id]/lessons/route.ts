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
    const sessions = await getLessonSessionsForStudent(studentId);

    const pad = (n: number) => String(n).padStart(2, '0');
    const localDateStr = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const normDate = (v: unknown): string => {
      if (!v) return '';
      if (v instanceof Date) return v.toISOString().slice(0, 10);
      return String(v).slice(0, 10);
    };

    const today = new Date(); today.setHours(0, 0, 0, 0);
    const lessons: {
      date: string;
      start_time: string;
      duration_minutes: number;
      theme: string | null;
      notes: string | null;
      is_changed: boolean;
      is_extra: boolean;
    }[] = [];

    for (let i = 0; i < 28; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const dateStr = localDateStr(d);
      const dow = d.getDay();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sess = (sessions as any[]).find((s: any) => normDate(s.lesson_date) === dateStr) as {
        start_time?: string;
        duration_minutes?: number;
        theme?: string | null;
        notes?: string | null;
        cancelled?: boolean;
      } | undefined;

      if (schedule && dow === (schedule.day_of_week as number)) {
        if (!sess?.cancelled) {
          lessons.push({
            date: dateStr,
            start_time: sess?.start_time || (schedule.start_time as string),
            duration_minutes: sess?.duration_minutes || (schedule.duration_minutes as number),
            theme: sess?.theme ?? null,
            notes: sess?.notes ?? null,
            is_changed: !!(sess?.start_time && sess.start_time !== (schedule.start_time as string)),
            is_extra: false,
          });
        }
      } else if (sess && !sess.cancelled) {
        lessons.push({
          date: dateStr,
          start_time: sess.start_time || '??:??',
          duration_minutes: sess.duration_minutes || 60,
          theme: sess.theme ?? null,
          notes: sess.notes ?? null,
          is_changed: false,
          is_extra: true,
        });
      }
    }

    return NextResponse.json(lessons);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
