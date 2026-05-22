import { sql } from '@vercel/postgres';

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

    console.log('Database tables initialized');
  } catch (error) {
    console.error('Database initialization error:', error);
  }
}

export async function getStudents() {
  const result = await sql`SELECT * FROM students ORDER BY name`;
  return result.rows;
}

export async function getStudent(id: number) {
  const result = await sql`SELECT * FROM students WHERE id = ${id}`;
  return result.rows[0];
}

export async function getStudentByName(name: string) {
  const result = await sql`SELECT * FROM students WHERE name = ${name}`;
  return result.rows[0];
}

export async function createStudent(name: string, pinHash: string, pinSalt: string) {
  const result = await sql`
    INSERT INTO students (name, pin_hash, pin_salt)
    VALUES (${name}, ${pinHash}, ${pinSalt})
    RETURNING *
  `;
  return result.rows[0];
}

export async function getStudentQuizzes(studentId: number) {
  const result = await sql`
    SELECT * FROM quizzes WHERE student_id = ${studentId} ORDER BY uploaded_at DESC
  `;
  return result.rows;
}

export async function getQuiz(quizId: number) {
  const result = await sql`SELECT * FROM quizzes WHERE id = ${quizId}`;
  return result.rows[0];
}

export async function createQuiz(title: string, fileKey: string, studentId: number | null) {
  const result = await sql`
    INSERT INTO quizzes (title, file_key, student_id)
    VALUES (${title}, ${fileKey}, ${studentId})
    RETURNING *
  `;
  return result.rows[0];
}

export async function saveResult(studentId: number, quizId: number, score: number) {
  const result = await sql`
    INSERT INTO results (student_id, quiz_id, score)
    VALUES (${studentId}, ${quizId}, ${score})
    RETURNING *
  `;
  return result.rows[0];
}

export async function getStudentResults(studentId: number) {
  const result = await sql`
    SELECT r.*, q.title FROM results r
    JOIN quizzes q ON r.quiz_id = q.id
    WHERE r.student_id = ${studentId}
    ORDER BY r.completed_at DESC
  `;
  return result.rows;
}

export async function getAllResults() {
  const result = await sql`
    SELECT r.*, s.name, q.title FROM results r
    JOIN students s ON r.student_id = s.id
    JOIN quizzes q ON r.quiz_id = q.id
    ORDER BY r.completed_at DESC
  `;
  return result.rows;
}
