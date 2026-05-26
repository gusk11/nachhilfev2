import postgres from 'postgres';

const sql = postgres(process.env.POSTGRES_URL!, { ssl: 'require' });

async function columnExists(table: string, column: string): Promise<boolean> {
  try {
    const result = await sql`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = ${table} AND column_name = ${column}
      ) as exists
    `;
    return result[0]?.exists ?? false;
  } catch {
    return false;
  }
}

let schemaInitPromise: Promise<void> | null = null;

export function ensureSchema(): Promise<void> {
  if (!schemaInitPromise) {
    schemaInitPromise = initializeDB().catch((err) => {
      // Reset on failure so next call retries instead of caching the error
      schemaInitPromise = null;
      throw err;
    });
  }
  return schemaInitPromise;
}

export async function initializeDB() {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS students (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        pin_hash VARCHAR(255) NOT NULL,
        pin_salt VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS quizzes (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        file_key VARCHAR(255),
        student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
        uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    try {
      await sql`ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS questions JSONB`;
    } catch (e) {
      // Column might already exist
    }

    // file_key war früher NOT NULL — seit Umstellung auf direkte DB-Speicherung
    // werden Quizzes ohne Blob-Key angelegt. Constraint droppen falls vorhanden.
    try {
      await sql`ALTER TABLE quizzes ALTER COLUMN file_key DROP NOT NULL`;
    } catch (e) {
      // Already nullable or column missing
    }

    await sql`
      CREATE TABLE IF NOT EXISTS results (
        id SERIAL PRIMARY KEY,
        student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
        quiz_id INTEGER NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
        score DECIMAL(5,2),
        completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    await sql`ALTER TABLE results ADD COLUMN IF NOT EXISTS answers JSONB`;
    await sql`ALTER TABLE student_files ADD COLUMN IF NOT EXISTS display_name VARCHAR(255)`;
    await sql`ALTER TABLE student_files ADD COLUMN IF NOT EXISTS note TEXT`;
    await sql`ALTER TABLE student_files ADD COLUMN IF NOT EXISTS uploaded_by VARCHAR(10) DEFAULT 'teacher'`;

    await sql`
      CREATE TABLE IF NOT EXISTS lesson_schedules (
        id SERIAL PRIMARY KEY,
        student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
        day_of_week INTEGER NOT NULL,
        start_time VARCHAR(5) NOT NULL,
        duration_minutes INTEGER NOT NULL DEFAULT 60,
        UNIQUE(student_id)
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS lesson_sessions (
        id SERIAL PRIMARY KEY,
        student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
        lesson_date DATE NOT NULL,
        start_time VARCHAR(5),
        duration_minutes INTEGER,
        notes TEXT,
        theme VARCHAR(255),
        completed_tasks JSONB DEFAULT '{"anki": false, "worksheets": false, "prepare": false}',
        UNIQUE(student_id, lesson_date)
      )
    `;

    if (!(await columnExists('lesson_sessions', 'theme'))) {
      try {
        await sql`ALTER TABLE lesson_sessions ADD COLUMN theme VARCHAR(255)`;
        console.log('✓ Added theme column to lesson_sessions');
      } catch (e) {
        console.error('✗ Failed to add theme column:', e instanceof Error ? e.message : String(e));
      }
    }

    if (!(await columnExists('lesson_sessions', 'cancelled'))) {
      try {
        await sql`ALTER TABLE lesson_sessions ADD COLUMN cancelled BOOLEAN DEFAULT FALSE`;
        console.log('✓ Added cancelled column to lesson_sessions');
      } catch (e) {
        console.error('✗ Failed to add cancelled column:', e instanceof Error ? e.message : String(e));
      }
    }

    if (!(await columnExists('lesson_sessions', 'completed_tasks'))) {
      try {
        await sql`ALTER TABLE lesson_sessions ADD COLUMN completed_tasks JSONB DEFAULT '{"anki": false, "worksheets": false, "prepare": false}'`;
        console.log('✓ Added completed_tasks column to lesson_sessions');
      } catch (e) {
        console.error('✗ Failed to add completed_tasks column:', e instanceof Error ? e.message : String(e));
      }
    }

    await sql`
      CREATE TABLE IF NOT EXISTS student_files (
        id SERIAL PRIMARY KEY,
        student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
        filename VARCHAR(255) NOT NULL,
        file_key VARCHAR(255) NOT NULL,
        uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

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

    // ── Student To-Dos ────────────────────────────────────────────────────────
    await sql`
      CREATE TABLE IF NOT EXISTS student_todos (
        id SERIAL PRIMARY KEY,
        student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
        text TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // ── Anki-Zugangsdaten pro Schüler ─────────────────────────────────────────
    if (!(await columnExists('students', 'anki_username'))) {
      try {
        await sql`ALTER TABLE students ADD COLUMN anki_username VARCHAR(255)`;
        console.log('✓ Added anki_username column to students');
      } catch (e) {
        console.error('✗ Failed to add anki_username:', e instanceof Error ? e.message : String(e));
      }
    }
    if (!(await columnExists('students', 'anki_password'))) {
      try {
        await sql`ALTER TABLE students ADD COLUMN anki_password VARCHAR(255)`;
        console.log('✓ Added anki_password column to students');
      } catch (e) {
        console.error('✗ Failed to add anki_password:', e instanceof Error ? e.message : String(e));
      }
    }

    // ── Rechnungen ────────────────────────────────────────────────────────────
    await sql`
      CREATE TABLE IF NOT EXISTS invoice_entries (
        id SERIAL PRIMARY KEY,
        student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
        lesson_date DATE NOT NULL,
        invoice_created BOOLEAN DEFAULT FALSE,
        invoice_sent BOOLEAN DEFAULT FALSE,
        invoice_paid BOOLEAN DEFAULT FALSE,
        UNIQUE(student_id, lesson_date)
      )
    `;

    console.log('Database tables initialized');
  } catch (error) {
    console.error('Database initialization error:', error);
  }
}

export async function getStudents() {
  const rows = await sql`SELECT * FROM students ORDER BY name`;
  return rows;
}

export async function getStudent(id: number) {
  const rows = await sql`SELECT * FROM students WHERE id = ${id}`;
  return rows[0];
}

export async function getStudentByName(name: string) {
  const rows = await sql`SELECT * FROM students WHERE name = ${name}`;
  return rows[0];
}

export async function createStudent(name: string, pinHash: string, pinSalt: string) {
  const rows = await sql`
    INSERT INTO students (name, pin_hash, pin_salt)
    VALUES (${name}, ${pinHash}, ${pinSalt})
    RETURNING *
  `;
  return rows[0];
}

export async function getStudentQuizzes(studentId: number) {
  const rows = await sql`
    SELECT * FROM quizzes
    WHERE student_id = ${studentId} OR student_id IS NULL
    ORDER BY uploaded_at DESC
  `;
  return rows;
}

export async function getQuiz(quizId: number) {
  const rows = await sql`SELECT * FROM quizzes WHERE id = ${quizId}`;
  return rows[0];
}

export async function createQuiz(
  title: string,
  fileKey: string | null,
  studentId: number | null,
  questions?: any[]
) {
  await ensureSchema();
  const rows = await sql`
    INSERT INTO quizzes (title, file_key, student_id, questions)
    VALUES (${title}, ${fileKey || null}, ${studentId}, ${questions ? JSON.stringify(questions) : null})
    RETURNING *
  `;
  return rows[0];
}

export async function deleteQuiz(quizId: number) {
  await sql`DELETE FROM quizzes WHERE id = ${quizId}`;
}

export async function getAllQuizzes() {
  const rows = await sql`SELECT * FROM quizzes ORDER BY uploaded_at DESC`;
  return rows;
}

export async function saveResult(
  studentId: number,
  quizId: number,
  score: number,
  answers: Record<string, unknown> = {}
) {
  const rows = await sql`
    INSERT INTO results (student_id, quiz_id, score)
    VALUES (${studentId}, ${quizId}, ${score})
    RETURNING *
  `;
  const result = rows[0];
  // answers column may not exist yet if migration hasn't run
  try {
    await sql`UPDATE results SET answers = ${JSON.stringify(answers)} WHERE id = ${result.id}`;
  } catch {
    // column doesn't exist yet — answers skipped until /api/init is called
  }
  return result;
}

export async function getResultDetail(resultId: number) {
  await ensureSchema();
  const rows = await sql`
    SELECT r.id, r.student_id, r.quiz_id, r.score, r.answers, r.completed_at,
           q.title, q.file_key, q.questions,
           s.name AS student_name
    FROM results r
    JOIN quizzes q ON r.quiz_id = q.id
    JOIN students s ON r.student_id = s.id
    WHERE r.id = ${resultId}
  `;
  return rows[0];
}

export async function getStudentResults(studentId: number) {
  const rows = await sql`
    SELECT r.*, q.title FROM results r
    JOIN quizzes q ON r.quiz_id = q.id
    WHERE r.student_id = ${studentId}
    ORDER BY r.completed_at DESC
  `;
  return rows;
}

export async function deleteStudent(id: number) {
  await sql`DELETE FROM students WHERE id = ${id}`;
}

export async function updateStudentPin(id: number, pinHash: string, pinSalt: string) {
  await sql`UPDATE students SET pin_hash = ${pinHash}, pin_salt = ${pinSalt} WHERE id = ${id}`;
}

export async function updateStudentName(id: number, name: string) {
  await sql`UPDATE students SET name = ${name} WHERE id = ${id}`;
}

export async function getStudentFiles(studentId: number) {
  const rows = await sql`
    SELECT sf.*, fs.seen, fs.completed
    FROM student_files sf
    LEFT JOIN file_status fs ON fs.file_id = sf.id AND fs.student_id = ${studentId}
    WHERE sf.student_id = ${studentId}
    ORDER BY sf.uploaded_at DESC
  `;
  return rows;
}

export async function getStudentFilesForTeacher(studentId: number) {
  const rows = await sql`
    SELECT sf.*,
           COALESCE(fs.seen, false) AS seen,
           COALESCE(fs.completed, false) AS completed
    FROM student_files sf
    LEFT JOIN file_status fs ON fs.file_id = sf.id AND fs.student_id = sf.student_id
    WHERE sf.student_id = ${studentId}
    ORDER BY sf.uploaded_at DESC
  `;
  return rows;
}

export async function createStudentFile(
  studentId: number,
  filename: string,
  fileKey: string,
  displayName?: string,
  note?: string,
  uploadedBy: 'teacher' | 'student' = 'teacher'
) {
  const rows = await sql`
    INSERT INTO student_files (student_id, filename, file_key, display_name, note, uploaded_by)
    VALUES (${studentId}, ${filename}, ${fileKey}, ${displayName || null}, ${note || null}, ${uploadedBy})
    RETURNING *
  `;
  return rows[0];
}

export async function deleteStudentFile(fileId: number) {
  await sql`DELETE FROM student_files WHERE id = ${fileId}`;
}

export async function getStudentFile(fileId: number) {
  const rows = await sql`SELECT * FROM student_files WHERE id = ${fileId}`;
  return rows[0];
}

export async function upsertFileStatus(fileId: number, studentId: number, seen: boolean, completed: boolean) {
  await sql`
    INSERT INTO file_status (file_id, student_id, seen, completed, updated_at)
    VALUES (${fileId}, ${studentId}, ${seen}, ${completed}, CURRENT_TIMESTAMP)
    ON CONFLICT (file_id, student_id)
    DO UPDATE SET seen = ${seen}, completed = ${completed}, updated_at = CURRENT_TIMESTAMP
  `;
}

// ── Lesson Schedules ──────────────────────────────────────────────────────────

export async function upsertLessonSchedule(
  studentId: number, dayOfWeek: number, startTime: string, durationMinutes: number
) {
  const rows = await sql`
    INSERT INTO lesson_schedules (student_id, day_of_week, start_time, duration_minutes)
    VALUES (${studentId}, ${dayOfWeek}, ${startTime}, ${durationMinutes})
    ON CONFLICT (student_id) DO UPDATE SET
      day_of_week = ${dayOfWeek}, start_time = ${startTime}, duration_minutes = ${durationMinutes}
    RETURNING *
  `;
  return rows[0];
}

export async function getAllLessonSchedules() {
  const rows = await sql`
    SELECT ls.*, s.name AS student_name
    FROM lesson_schedules ls JOIN students s ON ls.student_id = s.id
    ORDER BY s.name
  `;
  return rows;
}

export async function getLessonScheduleForStudent(studentId: number) {
  const rows = await sql`SELECT * FROM lesson_schedules WHERE student_id = ${studentId}`;
  return rows[0] || null;
}

export async function deleteLessonSchedule(studentId: number) {
  await sql`DELETE FROM lesson_schedules WHERE student_id = ${studentId}`;
}

// ── Lesson Sessions ───────────────────────────────────────────────────────────

export async function upsertLessonSession(
  studentId: number, lessonDate: string,
  startTime: string | null, durationMinutes: number | null, notes: string | null,
  theme: string | null = null, completedTasks: Record<string, boolean> | null = null
) {
  await ensureSchema();
  const tasksJson = completedTasks ? JSON.stringify(completedTasks) : JSON.stringify({anki: false, worksheets: false, prepare: false});
  const rows = await sql`
    INSERT INTO lesson_sessions (student_id, lesson_date, start_time, duration_minutes, notes, theme, completed_tasks)
    VALUES (${studentId}, ${lessonDate}, ${startTime}, ${durationMinutes}, ${notes}, ${theme}, ${tasksJson})
    ON CONFLICT (student_id, lesson_date) DO UPDATE SET
      start_time = ${startTime}, duration_minutes = ${durationMinutes}, notes = ${notes}, theme = ${theme},
      completed_tasks = ${completedTasks ? tasksJson : sql`lesson_sessions.completed_tasks`}
    RETURNING *
  `;
  return rows[0];
}

export async function getAllUpcomingLessonSessions() {
  await ensureSchema();
  const rows = await sql`
    SELECT ls.*, s.name AS student_name
    FROM lesson_sessions ls JOIN students s ON ls.student_id = s.id
    WHERE ls.lesson_date >= CURRENT_DATE
    ORDER BY ls.lesson_date ASC
  `;
  return rows;
}

export async function getLessonSessionsForStudent(studentId: number) {
  await ensureSchema();
  const rows = await sql`
    SELECT * FROM lesson_sessions
    WHERE student_id = ${studentId} AND lesson_date >= CURRENT_DATE
    ORDER BY lesson_date ASC
  `;
  return rows;
}

export async function getLessonSessionById(id: number) {
  const rows = await sql`SELECT * FROM lesson_sessions WHERE id = ${id}`;
  return rows[0] || null;
}

export async function updateLessonSession(
  id: number,
  lessonDate: string,
  startTime: string | null,
  durationMinutes: number | null,
  notes: string | null,
  theme: string | null = null,
  completedTasks: Record<string, boolean> | null = null
) {
  await ensureSchema();
  try {
    // Direkt updaten — wenn Konflikt wegen UNIQUE(student_id, lesson_date), dann DELETE + INSERT
    const updated = completedTasks
      ? await sql`
          UPDATE lesson_sessions
          SET lesson_date = ${lessonDate}, start_time = ${startTime}, duration_minutes = ${durationMinutes},
              notes = ${notes}, theme = ${theme}, completed_tasks = ${JSON.stringify(completedTasks)}
          WHERE id = ${id}
          RETURNING *
        `
      : await sql`
          UPDATE lesson_sessions
          SET lesson_date = ${lessonDate}, start_time = ${startTime}, duration_minutes = ${durationMinutes},
              notes = ${notes}, theme = ${theme}
          WHERE id = ${id}
          RETURNING *
        `;

    if (updated.length > 0) {
      return updated[0];
    }

    throw new Error('Session nicht gefunden');
  } catch (err: any) {
    // Wenn UNIQUE Constraint Fehler, dann alte löschen + neue erstellen
    if (err.message?.includes('duplicate') || err.message?.includes('UNIQUE')) {
      const session = await sql`SELECT * FROM lesson_sessions WHERE id = ${id}`;
      if (!session.length) throw new Error('Session nicht gefunden');

      const studentId = session[0].student_id;
      const tasksJson = completedTasks
        ? JSON.stringify(completedTasks)
        : JSON.stringify(session[0].completed_tasks || {anki: false, worksheets: false, prepare: false});
      await sql`DELETE FROM lesson_sessions WHERE id = ${id}`;

      const rows = await sql`
        INSERT INTO lesson_sessions (student_id, lesson_date, start_time, duration_minutes, notes, theme, completed_tasks)
        VALUES (${studentId}, ${lessonDate}, ${startTime}, ${durationMinutes}, ${notes}, ${theme}, ${tasksJson})
        RETURNING *
      `;
      return rows[0];
    }
    throw err;
  }
}

export async function deleteLessonSession(id: number) {
  await sql`DELETE FROM lesson_sessions WHERE id = ${id}`;
}

export async function cancelLessonSession(studentId: number, lessonDate: string) {
  await ensureSchema();
  const rows = await sql`
    INSERT INTO lesson_sessions (student_id, lesson_date, cancelled)
    VALUES (${studentId}, ${lessonDate}, true)
    ON CONFLICT (student_id, lesson_date) DO UPDATE SET cancelled = true
    RETURNING *
  `;
  return rows[0];
}

export async function getAllResults() {
  const rows = await sql`
    SELECT r.*, s.name, q.title FROM results r
    JOIN students s ON r.student_id = s.id
    JOIN quizzes q ON r.quiz_id = q.id
    ORDER BY r.completed_at DESC
  `;
  return rows;
}

export async function deleteResult(resultId: number) {
  await sql`DELETE FROM results WHERE id = ${resultId}`;
}

// ── Student To-Dos ──────────────────────────────────────────────────────────
export async function getStudentTodos(studentId: number) {
  await ensureSchema();
  const rows = await sql`
    SELECT * FROM student_todos
    WHERE student_id = ${studentId}
    ORDER BY created_at DESC
  `;
  return rows;
}

export async function createStudentTodo(studentId: number, text: string) {
  await ensureSchema();
  const rows = await sql`
    INSERT INTO student_todos (student_id, text)
    VALUES (${studentId}, ${text})
    RETURNING *
  `;
  return rows[0];
}

export async function deleteStudentTodo(todoId: number) {
  await ensureSchema();
  await sql`DELETE FROM student_todos WHERE id = ${todoId}`;
}

// ── Anki Credentials ────────────────────────────────────────────────────────
export async function getStudentAnki(studentId: number) {
  await ensureSchema();
  const rows = await sql`
    SELECT anki_username, anki_password FROM students WHERE id = ${studentId}
  `;
  return rows[0] || { anki_username: null, anki_password: null };
}

export async function updateStudentAnki(
  studentId: number,
  username: string | null,
  password: string | null
) {
  await ensureSchema();
  await sql`
    UPDATE students
    SET anki_username = ${username}, anki_password = ${password}
    WHERE id = ${studentId}
  `;
}

// ── All Lesson Sessions (past + future) ──────────────────────────────────────
export async function getAllLessonSessionsAll() {
  await ensureSchema();
  const rows = await sql`
    SELECT ls.*, s.name AS student_name
    FROM lesson_sessions ls JOIN students s ON ls.student_id = s.id
    ORDER BY ls.lesson_date DESC
  `;
  return rows;
}

// ── Invoice Entries ───────────────────────────────────────────────────────────
export async function getAllInvoiceEntries() {
  await ensureSchema();
  const rows = await sql`SELECT * FROM invoice_entries`;
  return rows;
}

export async function upsertInvoiceEntry(
  studentId: number,
  lessonDate: string,
  created: boolean,
  sent: boolean,
  paid: boolean
) {
  await ensureSchema();
  const rows = await sql`
    INSERT INTO invoice_entries (student_id, lesson_date, invoice_created, invoice_sent, invoice_paid)
    VALUES (${studentId}, ${lessonDate}, ${created}, ${sent}, ${paid})
    ON CONFLICT (student_id, lesson_date) DO UPDATE SET
      invoice_created = ${created}, invoice_sent = ${sent}, invoice_paid = ${paid}
    RETURNING *
  `;
  return rows[0];
}

export async function deleteInvoiceEntry(studentId: number, lessonDate: string) {
  await ensureSchema();
  await sql`
    DELETE FROM invoice_entries
    WHERE student_id = ${studentId} AND lesson_date = ${lessonDate}
  `;
}

export async function cleanupOldInvoiceEntries(beforeDate: string) {
  await ensureSchema();
  await sql`DELETE FROM invoice_entries WHERE lesson_date < ${beforeDate}`;
}
