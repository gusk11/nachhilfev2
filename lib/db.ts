import postgres from 'postgres';

const sql = postgres(process.env.POSTGRES_URL!, { ssl: 'require' });

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
        file_key VARCHAR(255) NOT NULL,
        student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
        uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

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

export async function createQuiz(title: string, fileKey: string, studentId: number | null) {
  const rows = await sql`
    INSERT INTO quizzes (title, file_key, student_id)
    VALUES (${title}, ${fileKey}, ${studentId})
    RETURNING *
  `;
  return rows[0];
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
  const rows = await sql`
    SELECT r.id, r.student_id, r.quiz_id, r.score, r.answers, r.completed_at,
           q.title, q.file_key,
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

export async function createStudentFile(studentId: number, filename: string, fileKey: string) {
  const rows = await sql`
    INSERT INTO student_files (student_id, filename, file_key)
    VALUES (${studentId}, ${filename}, ${fileKey})
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

export async function getAllResults() {
  const rows = await sql`
    SELECT r.*, s.name, q.title FROM results r
    JOIN students s ON r.student_id = s.id
    JOIN quizzes q ON r.quiz_id = q.id
    ORDER BY r.completed_at DESC
  `;
  return rows;
}
