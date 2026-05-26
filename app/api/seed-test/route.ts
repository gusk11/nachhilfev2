import { NextResponse } from 'next/server';
import { ensureSchema } from '@/lib/db';
import postgres from 'postgres';

const sql = postgres(process.env.POSTGRES_URL!, { ssl: 'require' });

export async function GET() {
  try {
    await ensureSchema();
    const students = await sql`SELECT id, name FROM students WHERE name = 'Test' LIMIT 1`;
    if (!students.length) return NextResponse.json({ error: 'Schüler "Test" nicht gefunden' }, { status: 404 });
    const studentId = students[0].id;

    await sql`
      INSERT INTO lesson_sessions (student_id, lesson_date, start_time, duration_minutes, notes, theme)
      VALUES (${studentId}, '2026-05-25', '16:00', 60, 'Teststunde', 'Testzweck')
      ON CONFLICT (student_id, lesson_date) DO UPDATE SET
        start_time = '16:00', duration_minutes = 60, notes = 'Teststunde', theme = 'Testzweck'
    `;

    return NextResponse.json({ ok: true, student: students[0].name, date: '2026-05-25', time: '16:00' });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
