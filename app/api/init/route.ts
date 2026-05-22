import { NextResponse } from 'next/server';
import { initializeDB } from '@/lib/db';

export async function GET() {
  await initializeDB();
  return NextResponse.json({ ok: true });
}
