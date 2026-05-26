import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { getAllInvoiceEntries, upsertInvoiceEntry, updateInvoiceNumber, dismissInvoiceEntry, cleanupOldInvoiceEntries } from '@/lib/db';

async function requireTeacher() {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;
  const decoded = verifyToken(token || '');
  if (!decoded || decoded.role !== 'teacher') return null;
  return decoded;
}

const INVOICE_START_DATE = '2026-05-24';

export async function GET() {
  try {
    if (!await requireTeacher()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await cleanupOldInvoiceEntries(INVOICE_START_DATE);
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
    await dismissInvoiceEntry(student_id, lesson_date);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    if (!await requireTeacher()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json();
    const { student_id, lesson_date } = body;
    if (!student_id || !lesson_date) {
      return NextResponse.json({ error: 'student_id und lesson_date erforderlich' }, { status: 400 });
    }
    if ('invoice_number' in body && Object.keys(body).length === 3) {
      await updateInvoiceNumber(student_id, lesson_date, body.invoice_number ?? null);
      return NextResponse.json({ ok: true });
    }
    const entry = await upsertInvoiceEntry(
      student_id, lesson_date,
      !!body.invoice_created, !!body.invoice_sent, !!body.invoice_paid
    );
    return NextResponse.json(entry);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
