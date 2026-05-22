import { put, get } from '@vercel/blob';

export async function uploadQuizFile(file: File, fileName: string): Promise<string> {
  const fileKey = `quizzes/${Date.now()}-${fileName}`;
  const blob = await put(fileKey, file, {
    access: 'private',
  });
  return blob.url;
}

export async function getQuizFileUrl(fileKey: string): Promise<string | null> {
  try {
    const blob = await get(fileKey);
    return blob.url;
  } catch {
    return null;
  }
}

export async function parseQuizJSON(fileKey: string): Promise<any> {
  try {
    const blob = await get(fileKey);
    const text = await blob.text();
    return JSON.parse(text);
  } catch {
    return null;
  }
}
