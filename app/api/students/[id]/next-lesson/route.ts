import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { getLessonScheduleForStudent, getLessonSessionsForStudent, upsertLessonSession } from '@/lib/db';

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

    // lesson_date kommt vom postgres-Treiber als Date-Objekt (UTC-Midnight)
    const normDate = (v: any): string => {
      if (!v) return '';
      if (v instanceof Date) return v.toISOString().slice(0, 10);
      return String(v).slice(0, 10);
    };
    const pad = (n: number) => String(n).padStart(2, '0');
    const localDateStr = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    const now = new Date();
    const today = new Date(now); today.setHours(0, 0, 0, 0);
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const scheduleDow = schedule.day_of_week as number;
    const scheduleTime = schedule.start_time as string;

    // Suche in den nächsten 60 Tagen die erste anstehende Stunde:
    // - Reguläre Stunde am day_of_week (außer Session ist cancelled)
    // - Extra-Session an einem beliebigen Tag (nicht cancelled)
    // - Override-Session (Zeit/Dauer abweichend) zählt als reguläre Stunde
    let chosenDateStr: string | null = null;
    let chosenSession: any = null;
    let chosenIsExtra = false;

    for (let i = 0; i < 60; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const dateStr = localDateStr(d);
      const dow = d.getDay();
      const sess = sessions.find((s: any) => normDate(s.lesson_date) === dateStr);
      const isRegularDay = dow === scheduleDow;

      let candidate: { time: string; session: any; isExtra: boolean } | null = null;

      if (isRegularDay) {
        if (sess?.cancelled) {
          // reguläre Stunde gestrichen — überspringe
        } else {
          candidate = {
            time: sess?.start_time || scheduleTime,
            session: sess || null,
            isExtra: false,
          };
        }
      } else if (sess && !sess.cancelled) {
        // Extrastunde
        candidate = {
          time: sess.start_time || '00:00',
          session: sess,
          isExtra: true,
        };
      }

      if (!candidate) continue;

      // Wenn heute: prüfen ob Zeit schon vorbei
      if (i === 0) {
        const [hh, mm] = candidate.time.split(':').map(Number);
        if (hh * 60 + mm <= nowMinutes) continue;
      }

      chosenDateStr = dateStr;
      chosenSession = candidate.session;
      chosenIsExtra = candidate.isExtra;
      break;
    }

    if (!chosenDateStr) {
      return NextResponse.json({ schedule, next_lesson: null });
    }

    const effectiveTime = chosenSession?.start_time || scheduleTime;
    const effectiveDuration = chosenSession?.duration_minutes || schedule.duration_minutes;
    const isChanged = !chosenIsExtra && !!(chosenSession?.start_time && chosenSession.start_time !== scheduleTime);

    return NextResponse.json({
      schedule,
      next_lesson: {
        id: chosenSession?.id || null,
        date: chosenDateStr,
        start_time: effectiveTime,
        duration_minutes: effectiveDuration,
        standard_time: scheduleTime,
        notes: chosenSession?.notes || null,
        theme: chosenSession?.theme || null,
        completed_tasks: chosenSession?.completed_tasks || null,
        is_changed: isChanged,
        is_extra: chosenIsExtra,
      },
    });
  } catch (e) {
    console.error('next-lesson error:', e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

/**
 * PATCH: Upsertet `completed_tasks` für die nächste Stunde des Schülers.
 * Erstellt automatisch eine Session-Zeile falls für das Datum noch keine existiert.
 * Body: { lesson_date: 'YYYY-MM-DD', completed_tasks: { anki?: boolean, ... } }
 */
export async function PATCH(
  req: NextRequest,
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

    const { lesson_date, completed_tasks } = await req.json();
    if (!lesson_date || !completed_tasks) {
      return NextResponse.json({ error: 'lesson_date und completed_tasks erforderlich' }, { status: 400 });
    }

    // Existierende Session ggf. wiederverwenden, sonst neue mit nur Tasks anlegen.
    const sessions = await getLessonSessionsForStudent(studentId);
    const normDate = (v: any): string => {
      if (!v) return '';
      if (v instanceof Date) return v.toISOString().slice(0, 10);
      return String(v).slice(0, 10);
    };
    const existing = sessions.find((s: any) => normDate(s.lesson_date) === lesson_date);

    const record = await upsertLessonSession(
      studentId,
      lesson_date,
      existing?.start_time || null,
      existing?.duration_minutes || null,
      existing?.notes || null,
      existing?.theme || null,
      completed_tasks
    );

    return NextResponse.json(record);
  } catch (e) {
    console.error('next-lesson PATCH error:', e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
