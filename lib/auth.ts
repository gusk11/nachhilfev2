import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import bcryptjs from 'bcryptjs';

const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-change-in-production';

export function generatePINHash(pin: string) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.createHash('sha256').update(pin + salt).digest('hex');
  return { hash, salt };
}

export function verifyPIN(pin: string, hash: string, salt: string): boolean {
  const computed = crypto.createHash('sha256').update(pin + salt).digest('hex');
  return computed === hash;
}

export function generateTeacherToken(): string {
  return jwt.sign({ role: 'teacher' }, JWT_SECRET, { expiresIn: '24h' });
}

export function generateStudentToken(studentId: number): string {
  return jwt.sign({ studentId, role: 'student' }, JWT_SECRET, { expiresIn: '24h' });
}

export function verifyToken(token: string): any {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

export function verifyTeacherPassword(password: string): boolean {
  return password === process.env.TEACHER_PASSWORD;
}
