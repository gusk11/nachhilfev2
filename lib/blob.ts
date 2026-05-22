import { put, get, del } from '@vercel/blob';

export async function uploadQuizFile(file: File, fileName: string): Promise<string> {
  const fileKey = `quizzes/${Date.now()}-${fileName}`;
  const blob = await put(fileKey, file, {
    access: 'private',
  });
  return blob.url;
}

export async function getQuizFileUrl(fileKey: string): Promise<string | null> {
  try {
    const result = await get(fileKey, { token: process.env.BLOB_READ_WRITE_TOKEN!, access: 'private' });
    if (!result || result.statusCode !== 200) return null;
    return result.blob.url;
  } catch {
    return null;
  }
}

export async function uploadStudentFile(file: File, studentId: number, fileName: string): Promise<string> {
  const fileKey = `student-files/${studentId}/${Date.now()}-${fileName}`;
  const blob = await put(fileKey, file, { access: 'private' });
  return blob.url;
}

export async function getStudentFileStream(fileKey: string): Promise<{ stream: ReadableStream; contentType: string } | null> {
  try {
    const result = await get(fileKey, { token: process.env.BLOB_READ_WRITE_TOKEN!, access: 'private' });
    if (!result || result.statusCode !== 200 || !result.stream) return null;
    return { stream: result.stream, contentType: result.blob.contentType || 'application/pdf' };
  } catch {
    return null;
  }
}

export async function deleteBlob(fileKey: string): Promise<void> {
  try {
    await del(fileKey, { token: process.env.BLOB_READ_WRITE_TOKEN! });
  } catch {
    // ignore
  }
}

export async function parseQuizJSON(fileKey: string): Promise<any> {
  try {
    const result = await get(fileKey, { token: process.env.BLOB_READ_WRITE_TOKEN!, access: 'private' });
    if (!result || result.statusCode !== 200 || !result.stream) return null;
    const text = await new Response(result.stream).text();
    return JSON.parse(text);
  } catch {
    return null;
  }
}
