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

export async function getAllResults() {
  const rows = await sql`
    SELECT r.*, s.name, q.title FROM results r
    JOIN students s ON r.student_id = s.id
    JOIN quizzes q ON r.quiz_id = q.id
    ORDER BY r.completed_at DESC
  `;
  return rows;
}
