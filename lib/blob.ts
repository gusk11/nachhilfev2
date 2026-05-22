import { put, del } from '@vercel/blob';

export async function uploadQuizFile(file: File, fileName: string): Promise<string> {
  const fileKey = `quizzes/${Date.now()}-${fileName}`;
  const blob = await put(fileKey, file, { access: 'public' });
  return blob.url;
}

export async function uploadStudentFile(file: File, studentId: number, fileName: string): Promise<string> {
  const fileKey = `student-files/${studentId}/${Date.now()}-${fileName}`;
  const blob = await put(fileKey, file, { access: 'public' });
  return blob.url;
}

export async function deleteBlob(fileKey: string): Promise<void> {
  try {
    await del(fileKey);
  } catch {
    // ignore
  }
}

export async function parseQuizJSON(fileKey: string): Promise<any> {
  try {
    const res = await fetch(fileKey);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}
