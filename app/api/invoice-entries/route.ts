import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { getAllInvoiceEntries, upsertInvoiceEntry, deleteInvoiceEntry } from '@/lib/db';

async function requireTeacher() {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;
  const decoded = verifyToken(token || '');
  if (!decoded || decoded.role !== 'teacher') return null;
  return decoded;
}

export async function GET() {
  try {
    if (!await requireTeacher()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const entries = await getAllInvoiceEntries();
    return NextResponse.json(entries);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    if (!await requireTeacher()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { student_id, lesson_date } = await req.json();
    if (!student_id || !lesson_date) {
      return NextResponse.json({ error: 'student_id und lesson_date erforderlich' }, { status: 400 });
    }
    await deleteInvoiceEntry(student_id, lesson_date);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    if (!await requireTeacher()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { student_id, lesson_date, invoice_created, invoice_sent, invoice_paid } = await req.json();
    if (!student_id || !lesson_date) {
      return NextResponse.json({ error: 'student_id und lesson_date erforderlich' }, { status: 400 });
    }
    const entry = await upsertInvoiceEntry(
      student_id, lesson_date,
      !!invoice_created, !!invoice_sent, !!invoice_paid
    );
    return NextResponse.json(entry);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
