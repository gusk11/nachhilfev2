import { NextResponse } from 'next/server';
import postgres from 'postgres';

const sql = postgres(process.env.POSTGRES_URL!, { ssl: 'require' });

export async function GET() {
  const result: Record<string, string> = {};

  try {
    await sql`
      CREATE TABLE IF NOT EXISTS student_files (
        id SERIAL PRIMARY KEY,
        student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
        filename VARCHAR(255) NOT NULL,
        file_key VARCHAR(255) NOT NULL,
        uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    result.student_files = 'ok';
  } catch (e) {
    result.student_files = String(e);
  }

  try {
    await sql`
      CREATE TABLE IF NOT EXISTS file_status (
        id SERIAL PRIMARY KEY,
        file_id INTEGER NOT NULL REFERENCES student_files(id) ON DELETE CASCADE,
        student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
        seen BOOLEAN DEFAULT FALSE,
        completed BOOLEAN DEFAULT FALSE,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(file_id, student_id)
      )
    `;
    result.file_status = 'ok';
  } catch (e) {
    result.file_status = String(e);
  }

  try {
    await sql`ALTER TABLE student_files ADD COLUMN IF NOT EXISTS display_name VARCHAR(255)`;
    await sql`ALTER TABLE student_files ADD COLUMN IF NOT EXISTS note TEXT`;
    await sql`ALTER TABLE student_files ADD COLUMN IF NOT EXISTS uploaded_by VARCHAR(10) DEFAULT 'teacher'`;
    result.student_files_columns = 'ok';
  } catch (e) {
    result.student_files_columns = String(e);
  }

  try {
    const check = await sql`SELECT COUNT(*) FROM student_files`;
    result.student_files_rows = String(check[0].count);
  } catch (e) {
    result.student_files_rows = 'Tabelle nicht erreichbar: ' + String(e);
  }

  return NextResponse.json(result);
}
