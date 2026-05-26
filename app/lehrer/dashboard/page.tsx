'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { modalVariants, modalContentVariants, accordionContentVariants, rotateArrowVariants } from '@/app/lib/motionVariants';
import { GlassIconButton } from '@/app/components/GlassEffect';
import RichContent from '@/app/components/RichContent';

interface Student {
  id: number;
  name: string;
  created_at: string;
}

interface Result {
  id: number;
  name: string;
  title: string;
  score: number;
  completed_at: string;
}

interface StudentFile {
  id: number;
  filename: string;
  display_name: string | null;
  note: string | null;
  uploaded_by: 'teacher' | 'student';
  uploaded_at: string;
  seen: boolean;
  completed: boolean;
}

interface Todo {
  id: number;
  text: string;
  created_at: string;
}

interface DetailQuestion {
  id: string;
  text: string;
  type: 'multiple' | 'true-false' | 'text';
  options?: Array<string | { letter: string; html: string }>;
  correctAnswer?: string | boolean;
}

interface DetailResult {
  id: number;
  score: number;
  completed_at: string;
  student_name: string;
  quiz_title: string;
  questions: DetailQuestion[] | null;
  answers: Record<string, unknown> | null;
}

function formatAnswer(answer: unknown, type: string): string {
  if (answer === undefined || answer === null) return 'Keine Antwort';
  if (type === 'true-false') return answer ? 'Wahr' : 'Falsch';
  return String(answer);
}

export default function TeacherDashboard() {
  const router = useRouter();
  const [students, setStudents] = useState<Student[]>([]);
  const [results, setResults] = useState<Result[]>([]);
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [quizTitle, setQuizTitle] = useState('');
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [detailResult, setDetailResult] = useState<DetailResult | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [pinModal, setPinModal] = useState<{ id: number; name: string } | null>(null);
  const [newPin, setNewPin] = useState('');
  const [pinSaving, setPinSaving] = useState(false);

  const [renameModal, setRenameModal] = useState<{ id: number; name: string } | null>(null);
  const [newName, setNewName] = useState('');
  const [nameSaving, setNameSaving] = useState(false);

  // Accordion sections (Single-Expand: nur eine gleichzeitig offen)
  const [openSection, setOpenSection] = useState<string | null>(null);

  const toggleSection = (section: string) => {
    setOpenSection(openSection === section ? null : section);
  };

  const isPastLesson = (dateStr: string, timeStr: string) => {
    try {
      const now = new Date();
      const lessonDate = new Date(dateStr + 'T' + timeStr + ':00');
      return lessonDate < now;
    } catch {
      return false;
    }
  };

  // Stundenplan
  const [schedules, setSchedules] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [scheduleModal, setScheduleModal] = useState<{ student: Student } | null>(null);
  const [schedDay, setSchedDay] = useState(1);
  const [schedTime, setSchedTime] = useState('15:00');
  const [schedDuration, setSchedDuration] = useState(60);
  const [schedSaving, setSchedSaving] = useState(false);
  const [sessionModal, setSessionModal] = useState<{
    studentId: number; studentName: string; date: string; originalDate: string;
    standardTime: string; standardDuration: number; sessionId: number | null;
    existingTime: string; existingDuration: string; existingNotes: string;
    standardDayOfWeek: number;
  } | null>(null);
  const [sessTime, setSessTime] = useState('');
  const [sessDuration, setSessDuration] = useState('');
  const [sessNotes, setSessNotes] = useState('');
  const [sessTheme, setSessTheme] = useState('');
  const [sessSaving, setSessSaving] = useState(false);

  const [extraSessionModal, setExtraSessionModal] = useState<{
    studentIds: number[]; date: string;
  } | null>(null);
  const [extraTime, setExtraTime] = useState('15:00');
  const [extraDuration, setExtraDuration] = useState('60');
  const [extraNotes, setExtraNotes] = useState('');
  const [extraTheme, setExtraTheme] = useState('');
  const [extraSaving, setExtraSaving] = useState(false);

  // Neuer Schüler Modal
  const [newStudentModal, setNewStudentModal] = useState(false);
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentPin, setNewStudentPin] = useState('');
  const [newStudentDay, setNewStudentDay] = useState(1);
  const [newStudentTime, setNewStudentTime] = useState('15:00');
  const [newStudentDuration, setNewStudentDuration] = useState(60);
  const [newStudentSaving, setNewStudentSaving] = useState(false);

  // Dateien-Modal
  const [filesModal, setFilesModal] = useState<{ id: number; name: string } | null>(null);
  const [studentFiles, setStudentFiles] = useState<StudentFile[]>([]);
  const [filesLoading, setFilesLoading] = useState(false);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfUploading, setPdfUploading] = useState(false);

  // To-Dos + Anki Management Modal (pro Schüler)
  const [profileModal, setProfileModal] = useState<{ id: number; name: string } | null>(null);
  const [studentTodos, setStudentTodos] = useState<Todo[]>([]);
  const [newTodoText, setNewTodoText] = useState('');
  const [todoSaving, setTodoSaving] = useState(false);
  const [ankiUsername, setAnkiUsername] = useState('');
  const [ankiPassword, setAnkiPassword] = useState('');
  const [showAnkiPasswordEdit, setShowAnkiPasswordEdit] = useState(false);
  const [ankiSaving, setAnkiSaving] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileNextLesson, setProfileNextLesson] = useState<{
    date: string;
    start_time: string;
    duration_minutes: number;
    standard_time: string;
    theme: string | null;
    notes: string | null;
    is_changed: boolean;
    completed_tasks: Record<string, boolean> | null;
  } | null>(null);

  // Anzahl offene Todos pro Schüler (für Anzeige in der Liste)
  const [todoCounts, setTodoCounts] = useState<Record<number, number>>({});

  // Completion tracking
  const [completedSessions, setCompletedSessions] = useState<Map<string, Set<string>>>(new Map());
  const [activityModal, setActivityModal] = useState<{ lessonKey: string; studentName: string } | null>(null);
  const [selectedActivities, setSelectedActivities] = useState<Set<string>>(new Set());

  // Rechnungen
  const [invoiceEntries, setInvoiceEntries] = useState<Map<string, { created: boolean; sent: boolean; paid: boolean; dismissed: boolean }>>(new Map());

  const ACTIVITY_TYPES = [
    { id: 'homework', label: 'Rechnung', emoji: '📝' },
    { id: 'quiz', label: 'Quiz', emoji: '✏️' },
    { id: 'exercises-tests', label: 'Übungsblätter und Tests', emoji: '📋' },
    { id: 'rescheduled', label: 'Neue Stunde', emoji: '🔄' },
  ];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [studentsRes, resultsRes, schedulesRes, sessionsRes, quizzesRes, invoiceRes] = await Promise.all([
        fetch('/api/students', { credentials: 'include' }),
        fetch('/api/results/all', { credentials: 'include' }),
        fetch('/api/lesson-schedules', { credentials: 'include' }),
        fetch('/api/lesson-sessions?all=1', { credentials: 'include' }),
        fetch('/api/quizzes?all=1', { credentials: 'include' }),
        fetch('/api/invoice-entries', { credentials: 'include' }),
      ]);

      if (studentsRes.status === 401) {
        router.push('/lehrer');
        return;
      }

      if (studentsRes.ok) setStudents(await studentsRes.json());
      if (resultsRes.ok) setResults(await resultsRes.json());
      if (schedulesRes.ok) setSchedules(await schedulesRes.json());
      if (sessionsRes.ok) {
        const sessionData = await sessionsRes.json();
        setSessions(sessionData);
      }
      if (quizzesRes.ok) setQuizzes(await quizzesRes.json());
      if (invoiceRes.ok) {
        const entries: any[] = await invoiceRes.json();
        const map = new Map<string, { created: boolean; sent: boolean; paid: boolean; dismissed: boolean }>();
        entries.forEach((e) => {
          const dateStr = typeof e.lesson_date === 'string' ? e.lesson_date.slice(0, 10) : String(e.lesson_date).slice(0, 10);
          map.set(`${e.student_id}-${dateStr}`, {
            created: !!e.invoice_created,
            sent: !!e.invoice_sent,
            paid: !!e.invoice_paid,
            dismissed: !!e.dismissed,
          });
        });
        setInvoiceEntries(map);
      }
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Kalender: Alle Stunden mit Lessons pro Tag
  const getAllLessonsForDate = (dateStr: string) => {
    const pad = (n: number) => String(n).padStart(2, '0');
    const normSessionDate = (v: any) => typeof v === 'string' ? v.slice(0, 10) : String(v).slice(0, 10);
    const [year, month, day] = dateStr.split('-').map(Number);
    const d = new Date(year, month - 1, day);
    const dow = d.getDay();
    const lessons: any[] = [];

    // 1. Reguläre Stunden
    schedules
      .filter((sc: any) => sc.day_of_week === dow)
      .forEach((sc: any) => {
        const sess = sessions.find((s: any) =>
          s.student_id === sc.student_id &&
          normSessionDate(s.lesson_date) === dateStr
        );
        // Überspringe, wenn diese Grundstunde als "cancelled" markiert ist
        if (sess?.cancelled) return;
        lessons.push({
          studentId: sc.student_id,
          studentName: sc.student_name,
          startTime: sess?.start_time || sc.start_time,
          durationMinutes: sess?.duration_minutes || sc.duration_minutes,
          standardTime: sc.start_time,
          standardDuration: sc.duration_minutes,
          standardDayOfWeek: sc.day_of_week,
          notes: sess?.notes || null,
          isChanged: !!(sess?.start_time && sess.start_time !== sc.start_time),
          sessionId: sess?.id || null,
          isExtra: false,
          dateStr,
          theme: sess?.theme || null,
        });
      });

    // 2. Extrastunden (nur nicht-cancelled)
    sessions
      .filter((s: any) => normSessionDate(s.lesson_date) === dateStr && !s.cancelled)
      .forEach((s: any) => {
        const isRegular = schedules.some((sc: any) =>
          sc.student_id === s.student_id && sc.day_of_week === dow
        );
        if (!isRegular) {
          const student = students.find((st: any) => st.id === s.student_id);
          lessons.push({
            studentId: s.student_id,
            studentName: student?.name || 'Unbekannt',
            startTime: s.start_time || '??:??',
            durationMinutes: s.duration_minutes || 0,
            standardTime: undefined,
            standardDuration: undefined,
            standardDayOfWeek: undefined,
            notes: s.notes || null,
            isChanged: false,
            sessionId: s.id,
            isExtra: true,
            dateStr,
            theme: s.theme || null,
          });
        }
      });

    return lessons.sort((a, b) => a.startTime.localeCompare(b.startTime));
  };

  // Kalender: 2 Wochen + 2 Extratage vorher, vertikal angeordnet
  const calendarGrid = (() => {
    const pad = (n: number) => String(n).padStart(2, '0');
    const localDateStr = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    const today = new Date(); today.setHours(0, 0, 0, 0);
    const days: { dateStr: string; label: string; dayNum: number; lessons: any[]; isToday: boolean; dow: number }[] = [];

    // Starte 2 Tage vorher, dann die nächsten 14 Tage
    for (let i = -2; i < 14; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const dateStr = localDateStr(d);
      const isToday = d.getTime() === today.getTime();
      const label = d.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' });
      const lessons = getAllLessonsForDate(dateStr);
      const dow = d.getDay();

      days.push({
        dateStr,
        label,
        dayNum: d.getDate(),
        lessons,
        isToday,
        dow,
      });
    }

    return days;
  })();

  // Alte Struktur für Kompatibilität
  const calendarDays = (() => {
    const pad = (n: number) => String(n).padStart(2, '0');
    const localDateStr = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    const today = new Date(); today.setHours(0, 0, 0, 0);
    const result: { dateStr: string; label: string; lessons: any[] }[] = [];

    for (let i = -2; i < 14; i++) {
      const d = new Date(today); d.setDate(today.getDate() + i);
      const dateStr = localDateStr(d);
      const label = d.toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: '2-digit' });
      const lessons = getAllLessonsForDate(dateStr);
      result.push({ dateStr, label, lessons });
    }
    return result;
  })();

  const fetchResultDetail = async (resultId: number) => {
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/results/${resultId}`, { credentials: 'include' });
      if (res.ok) setDetailResult(await res.json());
    } catch (err) {
      console.error('Detail fetch error:', err);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleDeleteResult = async (resultId: number) => {
    if (!confirm('Quizergebnis wirklich löschen?')) return;
    try {
      const res = await fetch(`/api/results/${resultId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (res.ok) {
        setDetailResult(null);
        fetchData();
      } else {
        alert('Fehler beim Löschen');
      }
    } catch {
      alert('Netzwerkfehler');
    }
  };

  const openFilesModal = async (student: Student) => {
    setFilesModal({ id: student.id, name: student.name });
    setPdfFile(null);
    setFilesLoading(true);
    try {
      const res = await fetch(`/api/students/${student.id}/files`, { credentials: 'include' });
      if (res.ok) setStudentFiles(await res.json());
    } catch (err) {
      console.error('Files fetch error:', err);
    } finally {
      setFilesLoading(false);
    }
  };

  const handlePdfUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pdfFile || !filesModal) return;
    setPdfUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', pdfFile);
      const res = await fetch(`/api/students/${filesModal.id}/files`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      if (res.ok) {
        setPdfFile(null);
        const updated = await fetch(`/api/students/${filesModal.id}/files`, { credentials: 'include' });
        if (updated.ok) setStudentFiles(await updated.json());
      } else {
        const data = await res.json();
        alert('Fehler: ' + (data.error || res.status));
      }
    } catch {
      alert('Netzwerkfehler');
    } finally {
      setPdfUploading(false);
    }
  };

  const handleDeleteFile = async (fileId: number) => {
    if (!filesModal) return;
    if (!confirm('Datei wirklich löschen?')) return;
    try {
      const res = await fetch(`/api/students/${filesModal.id}/files/${fileId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (res.ok) {
        setStudentFiles((prev) => prev.filter((f) => f.id !== fileId));
      } else {
        alert('Fehler beim Löschen');
      }
    } catch {
      alert('Netzwerkfehler');
    }
  };

  // Profil-Modal (To-Dos + Anki) öffnen
  const openProfileModal = async (student: Student) => {
    setProfileModal({ id: student.id, name: student.name });
    setNewTodoText('');
    setShowAnkiPasswordEdit(false);
    setProfileNextLesson(null);
    setProfileLoading(true);
    try {
      const [todosRes, ankiRes, nlRes] = await Promise.all([
        fetch(`/api/students/${student.id}/todos`, { credentials: 'include' }),
        fetch(`/api/students/${student.id}/anki`, { credentials: 'include' }),
        fetch(`/api/students/${student.id}/next-lesson`, { credentials: 'include' }),
      ]);
      if (todosRes.ok) setStudentTodos(await todosRes.json());
      if (ankiRes.ok) {
        const data = await ankiRes.json();
        setAnkiUsername(data.anki_username || '');
        setAnkiPassword(data.anki_password || '');
      }
      if (nlRes.ok) {
        const nl = await nlRes.json();
        if (nl.next_lesson) setProfileNextLesson(nl.next_lesson);
      }
    } catch (err) {
      console.error('Profile fetch error:', err);
    } finally {
      setProfileLoading(false);
    }
  };

  const handleAddTodo = async () => {
    if (!profileModal || !newTodoText.trim()) return;
    setTodoSaving(true);
    try {
      const res = await fetch(`/api/students/${profileModal.id}/todos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ text: newTodoText.trim() }),
      });
      if (res.ok) {
        const todo = await res.json();
        setStudentTodos((prev) => [todo, ...prev]);
        setNewTodoText('');
        setTodoCounts((prev) => ({ ...prev, [profileModal.id]: (prev[profileModal.id] || 0) + 1 }));
      } else {
        alert('Fehler beim Hinzufügen');
      }
    } catch {
      alert('Netzwerkfehler');
    } finally {
      setTodoSaving(false);
    }
  };

  const handleDeleteTodo = async (todoId: number) => {
    if (!profileModal) return;
    try {
      const res = await fetch(`/api/students/${profileModal.id}/todos/${todoId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (res.ok) {
        setStudentTodos((prev) => prev.filter((t) => t.id !== todoId));
        setTodoCounts((prev) => ({ ...prev, [profileModal.id]: Math.max(0, (prev[profileModal.id] || 1) - 1) }));
      }
    } catch {
      alert('Netzwerkfehler');
    }
  };

  const handleSaveAnki = async () => {
    if (!profileModal) return;
    setAnkiSaving(true);
    try {
      const res = await fetch(`/api/students/${profileModal.id}/anki`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          anki_username: ankiUsername || null,
          anki_password: ankiPassword || null,
        }),
      });
      if (res.ok) {
        alert('Anki-Zugangsdaten gespeichert');
      } else {
        alert('Fehler beim Speichern');
      }
    } catch {
      alert('Netzwerkfehler');
    } finally {
      setAnkiSaving(false);
    }
  };

  // Lädt Todo-Counts für alle Schüler (für Badge in Schülerliste)
  const fetchTodoCounts = async () => {
    try {
      const counts: Record<number, number> = {};
      await Promise.all(
        students.map(async (s) => {
          const res = await fetch(`/api/students/${s.id}/todos`, { credentials: 'include' });
          if (res.ok) {
            const list: Todo[] = await res.json();
            counts[s.id] = list.length;
          }
        })
      );
      setTodoCounts(counts);
    } catch (err) {
      console.error('Todo counts fetch error:', err);
    }
  };

  useEffect(() => {
    if (students.length > 0) fetchTodoCounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [students.length]);

  const handleDeleteStudent = async (id: number, name: string) => {
    if (!confirm(`Schüler "${name}" wirklich löschen? Alle Ergebnisse werden ebenfalls gelöscht.`)) return;
    try {
      const res = await fetch(`/api/students/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (res.ok) fetchData();
      else alert('Fehler beim Löschen');
    } catch {
      alert('Netzwerkfehler');
    }
  };

  const handleSavePin = async () => {
    if (!pinModal || !newPin.trim()) return;
    setPinSaving(true);
    try {
      const res = await fetch(`/api/students/${pinModal.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ pin: newPin.trim() }),
      });
      if (res.ok) {
        setPinModal(null);
        setNewPin('');
        alert(`PIN für "${pinModal.name}" erfolgreich geändert`);
      } else {
        const data = await res.json();
        alert('Fehler: ' + (data.error || 'Unbekannt'));
      }
    } catch {
      alert('Netzwerkfehler');
    } finally {
      setPinSaving(false);
    }
  };

  const handleSaveSchedule = async () => {
    if (!scheduleModal) return;
    setSchedSaving(true);
    try {
      const res = await fetch('/api/lesson-schedules', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ student_id: scheduleModal.student.id, day_of_week: schedDay, start_time: schedTime, duration_minutes: schedDuration }),
      });
      if (res.ok) { setScheduleModal(null); fetchData(); }
      else { const d = await res.json(); alert('Fehler: ' + (d.error || res.status)); }
    } catch { alert('Netzwerkfehler'); }
    finally { setSchedSaving(false); }
  };

  const handleAddStudent = async () => {
    if (!newStudentName.trim() || !newStudentPin.trim()) {
      alert('Name und PIN erforderlich');
      return;
    }
    setNewStudentSaving(true);
    try {
      const res = await fetch('/api/students/create', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newStudentName, pin: newStudentPin }),
      });
      if (!res.ok) {
        const d = await res.json();
        alert('Fehler: ' + (d.error || res.status));
        setNewStudentSaving(false);
        return;
      }
      const student = await res.json();
      // Grundstunde anlegen, falls Tag > 0
      if (newStudentDay > 0) {
        await fetch('/api/lesson-schedules', {
          method: 'POST', credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ student_id: student.id, day_of_week: newStudentDay, start_time: newStudentTime, duration_minutes: newStudentDuration }),
        });
      }
      setNewStudentModal(false);
      setNewStudentName('');
      setNewStudentPin('');
      setNewStudentDay(1);
      setNewStudentTime('15:00');
      setNewStudentDuration(60);
      alert(`Schüler "${newStudentName}" hinzugefügt!`);
      fetchData();
    } catch { alert('Netzwerkfehler'); }
    finally { setNewStudentSaving(false); }
  };

  const handleDeleteSchedule = async (studentId: number) => {
    if (!confirm('Grundstunde für diesen Schüler löschen?')) return;
    await fetch(`/api/lesson-schedules/${studentId}`, { method: 'DELETE', credentials: 'include' });
    fetchData();
  };

  const openSessionModal = (lesson: any) => {
    console.log('📋 Modal öffnen für Lektion:', {
      studentName: lesson.studentName,
      dateStr: lesson.dateStr,
      sessionId: lesson.sessionId,
      startTime: lesson.startTime,
      standardTime: lesson.standardTime,
      durationMinutes: lesson.durationMinutes,
      standardDuration: lesson.standardDuration,
      notes: lesson.notes,
    });

    setSessionModal({
      studentId: lesson.studentId, studentName: lesson.studentName,
      date: lesson.dateStr, originalDate: lesson.dateStr, standardTime: lesson.standardTime,
      standardDuration: lesson.standardDuration, sessionId: lesson.sessionId,
      standardDayOfWeek: lesson.standardDayOfWeek,
      existingTime: lesson.startTime || '',
      existingDuration: lesson.durationMinutes ? String(lesson.durationMinutes) : '',
      existingNotes: lesson.notes || '',
    });
    setSessTime(lesson.startTime || lesson.standardTime);
    setSessDuration(lesson.durationMinutes ? String(lesson.durationMinutes) : String(lesson.standardDuration));
    setSessNotes(lesson.notes || '');
    setSessTheme(lesson.theme || '');

    console.log('✅ Modal State gesetzt mit Zeit:', lesson.startTime || lesson.standardTime);
  };

  const handleSaveSession = async () => {
    if (!sessionModal) return;
    setSessSaving(true);
    try {
      const payload = {
        lesson_date: sessionModal.date,
        start_time: sessTime || null,
        duration_minutes: sessDuration ? parseInt(sessDuration) : null,
        notes: sessNotes || null,
        theme: sessTheme || null,
      };

      console.log('📤 Session Update:', {
        id: sessionModal.sessionId,
        payload,
        dateChanged: sessionModal.date !== sessionModal.originalDate,
      });

      if (sessionModal.sessionId) {
        // Aktualisiere existierende Session mit PUT (atomare Datumsänderung)
        const res = await fetch(`/api/lesson-sessions/${sessionModal.sessionId}`, {
          method: 'PUT',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          const data = await res.json();
          console.log('✅ Session erfolgreich aktualisiert:', data);
          setSessionModal(null);
          fetchData();
        } else {
          const d = await res.json();
          console.error('❌ Fehler beim Aktualisieren:', d);
          alert('Fehler: ' + (d.error || res.status));
        }
      } else {
        // Neue Session einfügen
        const res = await fetch('/api/lesson-sessions', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ student_id: sessionModal.studentId, ...payload }),
        });

        if (res.ok) {
          const data = await res.json();
          console.log('✅ Neue Session erstellt:', data);
          setSessionModal(null);
          fetchData();
        } else {
          const d = await res.json();
          console.error('❌ Fehler beim Erstellen:', d);
          alert('Fehler: ' + (d.error || res.status));
        }
      }
    } catch (err) {
      console.error('Exception:', err);
      alert('Netzwerkfehler: ' + String(err));
    }
    finally { setSessSaving(false); }
  };

  const handleDeleteSession = async (id: number) => {
    if (!confirm('Diese Änderung wirklich löschen und zur Grundstunde zurücksetzen?')) return;
    await fetch(`/api/lesson-sessions/${id}`, { method: 'DELETE', credentials: 'include' });
    setSessionModal(null);
    fetchData();
  };

  const handleSaveExtraSession = async () => {
    if (!extraSessionModal || extraSessionModal.studentIds.length === 0) return;
    setExtraSaving(true);
    try {
      const errors: string[] = [];
      let successCount = 0;

      // Erstelle für jeden Schüler eine Extrastunde
      for (const studentId of extraSessionModal.studentIds) {
        const payload = {
          student_id: studentId,
          lesson_date: extraSessionModal.date,
          start_time: extraTime || null,
          duration_minutes: extraDuration ? parseInt(extraDuration) : null,
          notes: extraNotes || null,
          theme: extraTheme || null,
        };

        try {
          const res = await fetch('/api/lesson-sessions', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });

          if (!res.ok) {
            const errorData = await res.json();
            errors.push(`Schüler-ID ${studentId}: ${errorData.error || res.status}`);
          } else {
            successCount++;
          }
        } catch (err) {
          errors.push(`Schüler-ID ${studentId}: ${String(err)}`);
        }
      }

      if (successCount > 0) {
        alert(`✓ ${successCount} Extrastunde${successCount > 1 ? 'n' : ''} erstellt!`);
        setExtraSessionModal(null);
        setExtraTime('15:00');
        setExtraDuration('60');
        setExtraNotes('');
        setExtraTheme('');
        fetchData();
      }

      if (errors.length > 0) {
        alert(`⚠ Fehler:\n${errors.join('\n')}`);
      }
    } catch (err) {
      alert('Netzwerkfehler: ' + String(err));
    } finally {
      setExtraSaving(false);
    }
  };

  const handleSaveName = async () => {
    if (!renameModal || !newName.trim()) return;
    setNameSaving(true);
    try {
      const res = await fetch(`/api/students/${renameModal.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name: newName.trim() }),
      });
      if (res.ok) {
        setRenameModal(null);
        setNewName('');
        fetchData();
      } else {
        const data = await res.json();
        alert('Fehler: ' + (data.error || 'Unbekannt'));
      }
    } catch {
      alert('Netzwerkfehler');
    } finally {
      setNameSaving(false);
    }
  };

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !quizTitle) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', quizTitle);
      formData.append('studentIds', selectedStudents.join(','));

      const res = await fetch('/api/quizzes/upload', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        setFile(null);
        setQuizTitle('');
        setSelectedStudents([]);
        alert('Quiz erfolgreich hochgeladen!');
        fetchData();
      } else {
        const data = await res.json();
        alert('Fehler: ' + (data.error || res.status));
      }
    } catch (err) {
      console.error('Upload error:', err);
      alert('Fehler beim Upload');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteQuiz = async (quizId: number, quizTitle: string) => {
    if (!confirm(`Quiz "${quizTitle}" wirklich löschen?`)) return;
    try {
      const res = await fetch(`/api/quizzes/${quizId}`, { method: 'DELETE', credentials: 'include' });
      if (res.ok) {
        alert('Quiz gelöscht!');
        fetchData();
      } else {
        alert('Fehler beim Löschen');
      }
    } catch (err) {
      console.error('Delete error:', err);
      alert('Netzwerkfehler');
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/lehrer');
  };

  const handleInvoiceToggle = async (
    studentId: number, dateStr: string,
    field: 'created' | 'sent' | 'paid'
  ) => {
    const key = `${studentId}-${dateStr}`;
    const current = invoiceEntries.get(key) || { created: false, sent: false, paid: false, dismissed: false };
    const next = { ...current, [field]: !current[field] };
    setInvoiceEntries((prev) => new Map(prev).set(key, next));
    try {
      await fetch('/api/invoice-entries', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: studentId,
          lesson_date: dateStr,
          invoice_created: next.created,
          invoice_sent: next.sent,
          invoice_paid: next.paid,
        }),
      });
    } catch {
      setInvoiceEntries((prev) => new Map(prev).set(key, current));
    }
  };

  const handleInvoiceDelete = async (studentId: number, dateStr: string) => {
    const key = `${studentId}-${dateStr}`;
    const backup = invoiceEntries.get(key);
    // Optimistisch als dismissed markieren → Zeile verschwindet sofort
    setInvoiceEntries((prev) => new Map(prev).set(key, { created: true, sent: true, paid: true, dismissed: true }));
    try {
      await fetch('/api/invoice-entries', {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ student_id: studentId, lesson_date: dateStr }),
      });
    } catch {
      if (backup) setInvoiceEntries((prev) => new Map(prev).set(key, backup));
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Lädt...</div>;
  }

  return (
    <div
      className="min-h-screen relative overflow-hidden"
      style={{
        background:
          'radial-gradient(ellipse at top, #0a3b80 0%, #021d40 60%, #010d20 100%)',
      }}
    >
      <div
        aria-hidden
        className="fixed inset-0 opacity-20 pointer-events-none z-0"
        style={{
          backgroundImage:
            'radial-gradient(rgba(255,255,255,0.25) 1px, transparent 1px)',
          backgroundSize: '22px 22px',
        }}
      />

      <nav className="shadow-lg relative z-10" style={{ background: '#708DC7' }}>
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-white drop-shadow">🎓 Lehrer-Dashboard</h1>
          <button
            onClick={handleLogout}
            className="bg-white text-red-600 px-4 py-2 rounded-lg hover:bg-red-50 font-medium"
          >
            Abmelden
          </button>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-8 relative z-10">
        {/* Icon-Tab-Leiste */}
        <div className="mb-8 flex flex-wrap items-center justify-center gap-3 sm:gap-4">
            <GlassIconButton
              emoji="📤"
              label="Quiz hochladen"
              isActive={openSection === 'upload'}
              onClick={() => toggleSection('upload')}
            />
            <GlassIconButton
              emoji="📝"
              label="Quizzes verwalten"
              isActive={openSection === 'manage-quizzes'}
              onClick={() => toggleSection('manage-quizzes')}
            />
            <GlassIconButton
              emoji="📊"
              label="Ergebnisse anzeigen"
              isActive={openSection === 'results'}
              onClick={() => toggleSection('results')}
            />
            <GlassIconButton
              emoji="👥"
              label="Schüler verwalten"
              isActive={openSection === 'students'}
              onClick={() => toggleSection('students')}
            />
            <GlassIconButton
              emoji="📅"
              label="Stundenplan & Kalender"
              isActive={openSection === 'schedule'}
              onClick={() => toggleSection('schedule')}
            />
            <GlassIconButton
              emoji="🧾"
              label="Rechnungen"
              isActive={openSection === 'invoices'}
              onClick={() => toggleSection('invoices')}
            />
        </div>

        {/* Content Area */}
        <div className="space-y-8">
          <AnimatePresence>
            {openSection === 'upload' && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                style={{ overflow: "hidden", background: '#708DC7' }}
                className="rounded-2xl shadow-2xl p-6"
              >
              <h2 className="text-2xl font-bold mb-6 text-white">📤 Quiz hochladen</h2>
              <form onSubmit={handleFileUpload} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Quiz-Titel
                  </label>
                  <input
                    type="text"
                    value={quizTitle}
                    onChange={(e) => setQuizTitle(e.target.value)}
                    placeholder="z.B. Mathematik - Kapitel 3"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#032e65]"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    HTML-Datei auswählen
                  </label>
                  <input
                    type="file"
                    accept=".html,.htm"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    HTML-Datei mit eingebettetem &lt;script id="quiz-data" type="application/json"&gt; Block.
                    Unterstützt LaTeX (\( … \) und $$ … $$) für schöne Mathe-Formeln.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Für Schüler (optional, Mehrfachauswahl)
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {students.map((s) => {
                      const selected = selectedStudents.includes(String(s.id));
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() =>
                            setSelectedStudents((prev) =>
                              selected
                                ? prev.filter((id) => id !== String(s.id))
                                : [...prev, String(s.id)]
                            )
                          }
                          className={`px-3 py-1.5 rounded-full text-sm font-medium border transition ${
                            selected
                              ? 'bg-[#032e65] text-white border-[#032e65]'
                              : 'bg-white text-gray-700 border-gray-300 hover:border-[#032e65]'
                          }`}
                        >
                          {s.name}
                        </button>
                      );
                    })}
                  </div>
                  {selectedStudents.length === 0 && (
                    <p className="text-xs text-gray-500 mt-1">Kein Schüler ausgewählt → für alle sichtbar</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={uploading || !file || !quizTitle}
                  className="w-full bg-[#032e65] text-white py-2 rounded-lg font-medium hover:bg-[#021d40] transition disabled:opacity-50"
                >
                  {uploading ? 'Wird hochgeladen...' : 'Quiz hochladen'}
                </button>
              </form>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {openSection === 'manage-quizzes' && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                style={{ overflow: "hidden", background: '#708DC7' }}
                className="rounded-2xl shadow-2xl p-6"
              >
              <h2 className="text-2xl font-bold mb-6 text-white">📝 Quizzes verwalten</h2>
              {quizzes.length === 0 ? (
                <p className="text-center py-8 text-white/80">Noch keine Quizzes hochgeladen</p>
              ) : (
                <div className="space-y-2">
                  {quizzes.map((q) => (
                    <div key={q.id} className="flex items-center justify-between bg-white/15 backdrop-blur-sm border border-white/25 p-4 rounded-lg">
                      <div>
                        <p className="font-semibold text-white">{q.title}</p>
                        <p className="text-xs text-white/70">
                          {q.student_id ? 'Für Schüler' : 'Für alle Schüler'} • {new Date(q.uploaded_at).toLocaleDateString('de-DE')}
                        </p>
                      </div>
                      <button
                        onClick={() => handleDeleteQuiz(q.id, q.title)}
                        className="ml-4 px-3 py-1 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600 transition"
                      >
                        Löschen
                      </button>
                    </div>
                  ))}
                </div>
              )}
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {openSection === 'results' && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                style={{ overflow: "hidden", background: '#708DC7' }}
                className="rounded-2xl shadow-2xl p-6"
              >
              <h2 className="text-2xl font-bold mb-6 text-white">📊 Ergebnisse</h2>
              <p className="text-sm text-white/80 mb-3">Zeile anklicken für Einzelauswertung</p>
              <div className="overflow-x-auto rounded-lg bg-white/10 backdrop-blur-sm border border-white/20">
                <table className="w-full text-sm">
                  <thead className="bg-white/20 border-b border-white/30">
                    <tr>
                      <th className="px-4 py-2 text-left font-semibold text-white">Schüler</th>
                      <th className="px-4 py-2 text-left font-semibold text-white">Quiz</th>
                      <th className="px-4 py-2 text-left font-semibold text-white">Punktzahl</th>
                      <th className="px-4 py-2 text-left font-semibold text-white">Datum</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((r) => (
                      <tr
                        key={r.id}
                        className="border-b border-white/15 hover:bg-white/15 cursor-pointer transition"
                        onClick={() => fetchResultDetail(r.id)}
                      >
                        <td className="px-4 py-2 text-white">{r.name}</td>
                        <td className="px-4 py-2 text-white">{r.title}</td>
                        <td className="px-4 py-2 text-green-200 font-semibold">
                          {Number(r.score).toFixed(1)}%
                        </td>
                        <td className="px-4 py-2 text-white/80">
                          {new Date(r.completed_at).toLocaleDateString('de-DE')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {results.length === 0 && (
                  <p className="text-center py-8 text-white/80">Noch keine Ergebnisse</p>
                )}
              </div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {openSection === 'students' && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                style={{ overflow: "hidden", background: '#708DC7' }}
                className="rounded-2xl shadow-2xl p-6"
              >
              <h2 className="text-2xl font-bold mb-6 text-white">👥 Registrierte Schüler</h2>
              <button
                onClick={() => setNewStudentModal(true)}
                className="mb-6 w-full bg-green-600 text-white px-4 py-3 rounded-lg font-medium hover:bg-green-700 transition"
              >
                ➕ Neuer Schüler
              </button>
            <div className="space-y-2">
              {students.map((s) => {
                const sc = schedules.find((x: any) => x.student_id === s.id);
                const DAYS = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
                const openTodos = todoCounts[s.id] || 0;
                return (
                <div key={s.id} className="p-3 bg-white/15 backdrop-blur-sm rounded-lg border border-white/30">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold text-white">{s.name}</p>
                    {openTodos > 0 && (
                      <span
                        className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-500 text-white shadow"
                        title={`${openTodos} offene To-Do${openTodos === 1 ? '' : 's'}`}
                      >
                        📋 {openTodos}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-white/70">
                    Seit {new Date(s.created_at).toLocaleDateString('de-DE')}
                  </p>
                  {sc ? (
                    <p className="text-xs text-white font-medium mt-0.5 mb-2">
                      ⏰ {DAYS[sc.day_of_week]} · {sc.start_time} Uhr · {sc.duration_minutes} Min.
                    </p>
                  ) : (
                    <p className="text-xs text-white/60 mt-0.5 mb-2">Keine Grundstunde</p>
                  )}
                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={() => openProfileModal(s)}
                      className="flex-1 text-xs bg-rose-600 text-white px-2 py-1 rounded hover:bg-rose-700 transition"
                      title="To-Dos & Anki"
                    >
                      📋 Profil
                    </button>
                    <button
                      onClick={() => openFilesModal(s)}
                      className="flex-1 text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700 transition"
                    >
                      📎 Dateien
                    </button>
                    <button
                      onClick={() => {
                        setScheduleModal({ student: s });
                        const existing = schedules.find((x: any) => x.student_id === s.id);
                        setSchedDay(existing?.day_of_week ?? 1);
                        setSchedTime(existing?.start_time ?? '15:00');
                        setSchedDuration(existing?.duration_minutes ?? 60);
                      }}
                      className="flex-1 text-xs bg-purple-600 text-white px-2 py-1 rounded hover:bg-purple-700 transition"
                    >
                      ⏰ Stunde
                    </button>
                    <button
                      onClick={() => { setRenameModal({ id: s.id, name: s.name }); setNewName(s.name); }}
                      className="flex-1 text-xs bg-amber-500 text-white px-2 py-1 rounded hover:bg-amber-600 transition"
                    >
                      ✏️ Name
                    </button>
                    <button
                      onClick={() => { setPinModal({ id: s.id, name: s.name }); setNewPin(''); }}
                      className="flex-1 text-xs bg-[#032e65] text-white px-2 py-1 rounded hover:bg-[#021d40] transition"
                    >
                      PIN
                    </button>
                    <button
                      onClick={() => handleDeleteStudent(s.id, s.name)}
                      className="flex-1 text-xs bg-red-100 text-red-700 px-2 py-1 rounded hover:bg-red-200 transition"
                    >
                      Löschen
                    </button>
                  </div>
                </div>
                );
              })}
              {students.length === 0 && (
                <p className="text-gray-500">Noch keine Schüler registriert</p>
              )}
              </div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {openSection === 'schedule' && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                style={{ overflow: "hidden", background: '#708DC7' }}
                className="rounded-2xl shadow-2xl p-6"
              >
              <h2 className="text-2xl font-bold mb-6 text-white">📅 Stundenplan – Kalender-Übersicht</h2>

              {/* Kalender-Grid */}
              <div className="space-y-3">
                {calendarGrid.map((day, dayIdx) => {
                  const hasLessons = day.lessons.length > 0;

                  return (
                    <div
                      key={day.dateStr}
                      className={`rounded-lg border-2 p-4 ${
                        day.isToday
                          ? 'border-blue-500 bg-blue-50'
                          : hasLessons
                          ? 'border-indigo-300 bg-indigo-50'
                          : 'border-gray-200 bg-white'
                      }`}
                    >
                      {/* Datum-Header */}
                      <div className="pb-2 border-b border-gray-300 mb-3">
                        <p className={`text-sm font-bold ${
                          day.isToday ? 'text-blue-600' : 'text-gray-800'
                        }`}>
                          {day.label}
                        </p>
                      </div>

                      {/* Lektionen */}
                      <div className="space-y-2">
                        {hasLessons ? (
                          day.lessons.map((lesson: any, idx) => {
                            const lessonKey = `${day.dateStr}-${lesson.studentId}`;
                            const actCount = completedSessions.get(lessonKey)?.size || 0;
                            const isFull = actCount === ACTIVITY_TYPES.length;
                            const isPartial = actCount > 0 && actCount < ACTIVITY_TYPES.length;

                            return (
                              <div key={idx} className="flex gap-2 items-center text-sm group p-2 rounded hover:bg-white/50 transition">
                                <button
                                  onClick={() => openSessionModal(lesson)}
                                  className="flex-1 text-left p-2 rounded font-medium transition hover:shadow-md bg-blue-100 text-blue-700 border border-blue-300"
                                  title={`${lesson.studentName} ${lesson.startTime} (${lesson.durationMinutes}min) - Klick zum Bearbeiten`}
                                >
                                  <span className="font-semibold">{lesson.studentName}</span>
                                  <br />
                                  <span className="text-xs opacity-90">{lesson.startTime} · {lesson.durationMinutes}min</span>
                                  {lesson.theme && <br />}
                                  {lesson.theme && <span className="text-xs opacity-75">📚 {lesson.theme.slice(0, 30)}</span>}
                                </button>
                                <button
                                  onClick={() => {
                                    setActivityModal({ lessonKey, studentName: lesson.studentName });
                                    setSelectedActivities(new Set(completedSessions.get(lessonKey) || []));
                                  }}
                                  className={`px-3 py-2 rounded font-medium text-white transition whitespace-nowrap text-sm ${
                                    isFull
                                      ? 'bg-green-600 hover:bg-green-700'
                                      : isPartial
                                      ? 'bg-orange-500 hover:bg-orange-600'
                                      : 'bg-red-500 hover:bg-red-600'
                                  }`}
                                  title="Stunde abhaken/erledigt markieren"
                                >
                                  {isFull ? '✓' : `${actCount}/${ACTIVITY_TYPES.length}`}
                                </button>
                                <button
                                  onClick={async () => {
                                    if (!confirm(`Stunde von ${lesson.studentName} löschen?`)) return;
                                    try {
                                      if (lesson.sessionId) {
                                        // Existierende Session → löschen
                                        await fetch(`/api/lesson-sessions/${lesson.sessionId}`, { method: 'DELETE', credentials: 'include' });
                                      } else {
                                        // Grundstunde ohne Session → als "cancelled" markieren
                                        const res = await fetch('/api/lesson-sessions/cancel', {
                                          method: 'POST',
                                          credentials: 'include',
                                          headers: { 'Content-Type': 'application/json' },
                                          body: JSON.stringify({ student_id: lesson.studentId, lesson_date: lesson.dateStr }),
                                        });
                                        if (!res.ok) throw new Error('Fehler beim Löschen');
                                      }
                                      fetchData();
                                    } catch (err) {
                                      alert('Fehler beim Löschen der Stunde');
                                      console.error(err);
                                    }
                                  }}
                                  className="px-2 py-2 rounded bg-red-100 text-red-600 opacity-0 group-hover:opacity-100 transition font-medium"
                                  title="Stunde löschen"
                                >
                                  🗑
                                </button>
                              </div>
                            );
                          })
                        ) : (
                          <p className="text-gray-400 text-sm text-center py-2">Keine Termine</p>
                        )}
                      </div>

                      {/* Add Extra Button */}
                      <button
                        onClick={() => setExtraSessionModal({ studentIds: [], date: day.dateStr })}
                        className="mt-3 text-sm w-full text-indigo-600 hover:bg-indigo-100 px-2 py-2 rounded border border-indigo-300 transition font-medium"
                      >
                        ➕ Extrastunde
                      </button>
                    </div>
                  );
                })}
              </div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {openSection === 'invoices' && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                style={{ overflow: 'hidden', background: '#708DC7' }}
                className="rounded-2xl shadow-2xl p-6"
              >
                <h2 className="text-2xl font-bold mb-2 text-white">🧾 Rechnungen</h2>
                <p className="text-sm text-white/70 mb-6">Vergangene Stunden — Rechnungsstatus verfolgen</p>

                {(() => {
                  const pad = (n: number) => String(n).padStart(2, '0');
                  const localDateStr = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
                  const now = new Date();
                  const today = new Date(now); today.setHours(0, 0, 0, 0);
                  const cutoff = new Date('2026-05-24T00:00:00');

                  const pastLessons: any[] = [];
                  for (let i = 1; i <= 365; i++) {
                    const d = new Date(today);
                    d.setDate(today.getDate() - i);
                    if (d < cutoff) break;
                    const dateStr = localDateStr(d);
                    const lessons = getAllLessonsForDate(dateStr);
                    lessons.forEach((lesson: any) => {
                      const lessonEnd = new Date(dateStr + 'T' + (lesson.startTime || '00:00') + ':00');
                      lessonEnd.setMinutes(lessonEnd.getMinutes() + (lesson.durationMinutes || 60));
                      if (lessonEnd < now) {
                        pastLessons.push({
                          ...lesson,
                          dateStr,
                          dateLabel: d.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' }),
                        });
                      }
                    });
                  }

                  if (pastLessons.length === 0) {
                    return (
                      <p className="text-center text-white/70 py-8">Keine vergangenen Stunden gefunden</p>
                    );
                  }

                  return (
                    <div className="space-y-2">
                      {pastLessons.map((lesson: any, idx: number) => {
                        const key = `${lesson.studentId}-${lesson.dateStr}`;
                        const inv = invoiceEntries.get(key) || { created: false, sent: false, paid: false, dismissed: false };
                        if (inv.dismissed) return null;
                        const allDone = inv.created && inv.sent && inv.paid;

                        return (
                          <div
                            key={idx}
                            className={`rounded-xl p-4 border-2 transition-colors ${
                              allDone
                                ? 'bg-green-500/25 border-green-400/60'
                                : 'bg-red-500/20 border-red-400/50'
                            }`}
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                              {/* Löschen-Button — nur wenn alle 3 angehakt */}
                              {allDone && (
                                <button
                                  onClick={() => handleInvoiceDelete(lesson.studentId, lesson.dateStr)}
                                  className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg bg-white/20 hover:bg-red-500/60 text-white transition"
                                  title="Rechnung als erledigt abhaken und entfernen"
                                >
                                  🗑
                                </button>
                              )}
                              {/* Info */}
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-white">{lesson.studentName}</p>
                                <p className="text-sm text-white/80">
                                  {lesson.dateLabel} · {lesson.startTime} · {lesson.durationMinutes} Min.
                                </p>
                                {lesson.theme && (
                                  <p className="text-xs text-white/60 mt-0.5">📚 {lesson.theme}</p>
                                )}
                              </div>

                              {/* Checkboxen */}
                              <div className="flex gap-2 flex-wrap">
                                {([
                                  { field: 'created' as const, label: 'Erstellt' },
                                  { field: 'sent' as const, label: 'Geschickt' },
                                  { field: 'paid' as const, label: 'Bezahlt' },
                                ]).map(({ field, label }) => {
                                  const checked = inv[field];
                                  return (
                                    <button
                                      key={field}
                                      onClick={() => handleInvoiceToggle(lesson.studentId, lesson.dateStr, field)}
                                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition ${
                                        checked
                                          ? 'bg-green-500 border-green-400 text-white'
                                          : 'bg-white/15 border-white/30 text-white/80 hover:bg-white/25'
                                      }`}
                                    >
                                      <span className={`w-4 h-4 rounded border flex items-center justify-center text-xs flex-shrink-0 ${
                                        checked ? 'bg-white border-white text-green-700' : 'border-white/50'
                                      }`}>
                                        {checked ? '✓' : ''}
                                      </span>
                                      {label}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Alte Zeilen-View (optional für Referenz) */}
          <AnimatePresence>
            {openSection === 'schedule' && false && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                style={{ overflow: "hidden", background: '#708DC7' }}
                className="rounded-2xl shadow-2xl p-6"
              >
              <h2 className="text-2xl font-bold mb-6 text-[#032e65]">📅 Stundenplan – nächste 2 Wochen (Zeilen-Ansicht)</h2>
        {calendarDays.length === 0 ? (
          <p className="text-gray-500 text-sm">Noch keine Grundstunden eingetragen. Klicke bei einem Schüler auf <strong>⏰ Stunde</strong>.</p>
        ) : (
          <div className="space-y-4">
            {calendarDays.map(({ dateStr, label, lessons }) => (
              <div key={dateStr}>
                <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">{label}</p>
                {lessons.length === 0 ? (
                  <div className="p-3 rounded-lg border border-red-300 bg-red-50">
                    <p className="text-sm text-red-600 font-medium">Keine Termine</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {lessons.sort((a, b) => a.startTime.localeCompare(b.startTime)).map((lesson: any) => {
                      const lessonKey = `${dateStr}-${lesson.studentId}`;
                      const selectedActivity = completedSessions.get(lessonKey);
                      const activityCount = selectedActivity?.size || 0;
                      const isFullyCompleted = activityCount === ACTIVITY_TYPES.length;
                      const isPartiallyCompleted = activityCount > 0 && activityCount < ACTIVITY_TYPES.length;
                      const isPast = isPastLesson(dateStr, lesson.startTime);

                      return (
                        <div key={lessonKey} className="space-y-2">
                          <div
                            className={`flex items-center justify-between p-3 rounded-lg border ${
                              isFullyCompleted
                                ? 'bg-green-50 border-green-300'
                                : isPartiallyCompleted
                                ? 'bg-orange-50 border-orange-300'
                                : 'bg-red-50 border-red-300'
                            }`}
                          >
                            <div>
                              <p className={`font-semibold text-sm ${
                                isFullyCompleted ? 'text-green-700' : isPartiallyCompleted ? 'text-orange-700' : 'text-gray-800'
                              }`}>
                                {isFullyCompleted && '✓ '}{lesson.studentName}
                              </p>
                              <p className={`text-sm ${
                                isFullyCompleted ? 'text-green-600 font-medium' : isPartiallyCompleted ? 'text-orange-600 font-medium' : 'text-red-600 font-medium'
                              }`}>
                                {lesson.startTime} Uhr · {lesson.durationMinutes} Min.
                                {lesson.isChanged && <span className="ml-1 text-xs">(Standard: {lesson.standardTime})</span>}
                              </p>
                              {lesson.notes && (
                                <p className="text-xs text-gray-600 mt-0.5 italic">📝 {lesson.notes.slice(0, 60)}{lesson.notes.length > 60 ? '…' : ''}</p>
                              )}
                            </div>
                            <div className="flex gap-2 flex-shrink-0 ml-3">
                              <button
                                onClick={() => openSessionModal(lesson)}
                                className="text-xs bg-[#032e65] text-white px-3 py-1.5 rounded-lg hover:bg-[#021d40] transition"
                              >
                                ✏️ Bearbeiten
                              </button>
                              <button
                                onClick={() => {
                                  setActivityModal({ lessonKey, studentName: lesson.studentName });
                                  setSelectedActivities(new Set(completedSessions.get(lessonKey) || []));
                                }}
                                className={`text-xs px-3 py-1.5 rounded-lg transition font-medium ${
                                  isFullyCompleted
                                    ? 'bg-green-500 text-white hover:bg-green-600'
                                    : isPartiallyCompleted
                                    ? 'bg-orange-500 text-white hover:bg-orange-600'
                                    : 'bg-red-500 text-white hover:bg-red-600'
                                }`}
                              >
                                {isFullyCompleted ? '✓ Erledigt' : `${activityCount}/${ACTIVITY_TYPES.length}`}
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                <div className="mt-3">
                  <button
                    onClick={() => setExtraSessionModal({ studentIds: [], date: dateStr })}
                    className="w-full text-xs bg-indigo-100 text-indigo-700 px-3 py-2 rounded-lg border border-indigo-300 hover:bg-indigo-200 transition font-medium"
                  >
                    ➕ Extrastunde hinzufügen
                  </button>
                </div>
              </div>
            ))}
              </div>
            )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Profil-Modal (To-Dos + Anki) */}
      <AnimatePresence>
        {profileModal && (
          <motion.div
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
            onClick={() => setProfileModal(null)}
          >
            <motion.div
              variants={modalContentVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
              style={{ background: '#708DC7' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex justify-between items-center mb-5">
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <span className="text-2xl">📋</span> {profileModal.name}
                  </h2>
                  <button
                    onClick={() => setProfileModal(null)}
                    className="text-white/70 hover:text-white text-2xl leading-none"
                  >
                    ×
                  </button>
                </div>

                {profileLoading ? (
                  <p className="text-white text-sm text-center py-4">Lädt...</p>
                ) : (
                  <>
                    {/* Nächste Stunde + Vorbereitungs-Checkliste */}
                    {profileNextLesson && (
                      <div
                        className={`rounded-xl p-4 mb-6 border-l-4 ${profileNextLesson.is_changed ? 'border-red-300' : 'border-white/50'} bg-white/10`}
                      >
                        <p className="text-xs font-semibold uppercase tracking-wide text-white/80 mb-1">📅 Nächste Stunde</p>
                        <p className="text-lg font-bold text-white">
                          {new Date(profileNextLesson.date + 'T12:00:00').toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })}
                        </p>
                        <p className="text-sm text-white/95">
                          {profileNextLesson.start_time} Uhr · {profileNextLesson.duration_minutes} Min.
                          {profileNextLesson.is_changed && (
                            <span className="ml-2 text-xs text-red-100">(geändert von {profileNextLesson.standard_time})</span>
                          )}
                        </p>
                        {profileNextLesson.theme && (
                          <p className="text-sm text-white/90 mt-2"><span className="font-semibold">🎓 </span>{profileNextLesson.theme}</p>
                        )}
                        <div className="mt-3 pt-3 border-t border-white/30">
                          <p className="text-xs font-semibold text-white/80 mb-2">✓ Vorbereitung des Schülers:</p>
                          <ul className="space-y-1 text-sm text-white">
                            {[
                              { key: 'anki', label: 'Anki-Karten bearbeitet' },
                              { key: 'worksheets', label: 'Arbeitsblätter & Tests bearbeitet' },
                              { key: 'prepare', label: 'Materialien vorbereitet' },
                            ].map((t) => {
                              const done = !!profileNextLesson.completed_tasks?.[t.key];
                              return (
                                <li key={t.key} className="flex items-center gap-2">
                                  <span className={`inline-flex w-4 h-4 items-center justify-center rounded border ${done ? 'bg-white text-[#032e65] border-white' : 'border-white/60'}`}>
                                    {done ? '✓' : ''}
                                  </span>
                                  <span className={done ? '' : 'text-white/70'}>{t.label}</span>
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      </div>
                    )}

                    {/* To-Dos */}
                    <div className="mb-6">
                      <h3 className="text-sm font-semibold text-white uppercase tracking-wide mb-2">
                        Offene Aufgaben ({studentTodos.length})
                      </h3>
                      <div className="space-y-2 mb-3">
                        {studentTodos.length === 0 ? (
                          <p className="text-sm text-white/70 bg-white/10 rounded-lg p-3 text-center">
                            Keine offenen Aufgaben
                          </p>
                        ) : (
                          studentTodos.map((t) => (
                            <div
                              key={t.id}
                              className="flex items-start gap-2 p-3 rounded-lg bg-red-500/30 border border-red-300/50"
                            >
                              <span className="text-sm text-white flex-1 break-words">{t.text}</span>
                              <button
                                onClick={() => handleDeleteTodo(t.id)}
                                className="text-white/80 hover:text-white text-sm"
                                title="Löschen"
                              >
                                🗑
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newTodoText}
                          onChange={(e) => setNewTodoText(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleAddTodo()}
                          placeholder="Neue Aufgabe..."
                          className="dark-bg-input flex-1 px-3 py-2 bg-white/15 border border-white/30 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-white/60"
                        />
                        <button
                          onClick={handleAddTodo}
                          disabled={todoSaving || !newTodoText.trim()}
                          className="bg-white text-[#032e65] px-4 py-2 rounded-lg font-medium hover:bg-gray-100 disabled:opacity-50 transition"
                        >
                          {todoSaving ? '...' : '+ Hinzufügen'}
                        </button>
                      </div>
                    </div>

                    {/* Anki-Credentials */}
                    <div className="pt-5 border-t border-white/30">
                      <h3 className="text-sm font-semibold text-white uppercase tracking-wide mb-3 flex items-center gap-2">
                        <span className="text-lg">🃏</span> Anki-Zugangsdaten
                      </h3>
                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs text-white/80 mb-1">Benutzername / E-Mail</label>
                          <input
                            type="text"
                            value={ankiUsername}
                            onChange={(e) => setAnkiUsername(e.target.value)}
                            placeholder="anki@example.com"
                            className="dark-bg-input w-full px-3 py-2 bg-white/15 border border-white/30 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-white/60"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-white/80 mb-1">Passwort</label>
                          <div className="flex gap-2">
                            <input
                              type={showAnkiPasswordEdit ? 'text' : 'password'}
                              value={ankiPassword}
                              onChange={(e) => setAnkiPassword(e.target.value)}
                              placeholder="••••••••"
                              className="dark-bg-input flex-1 px-3 py-2 bg-white/15 border border-white/30 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-white/60 font-mono"
                            />
                            <button
                              type="button"
                              onClick={() => setShowAnkiPasswordEdit((v) => !v)}
                              className="px-3 bg-white/20 hover:bg-white/30 text-white rounded-lg text-lg transition"
                              title={showAnkiPasswordEdit ? 'Verbergen' : 'Anzeigen'}
                            >
                              {showAnkiPasswordEdit ? '🙈' : '👁'}
                            </button>
                          </div>
                        </div>
                        <button
                          onClick={handleSaveAnki}
                          disabled={ankiSaving}
                          className="w-full bg-white text-[#032e65] py-2 rounded-lg font-semibold hover:bg-gray-100 disabled:opacity-50 transition"
                        >
                          {ankiSaving ? 'Speichert...' : '💾 Anki-Daten speichern'}
                        </button>
                        <a
                          href="https://ankiweb.net/"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block text-center text-sm text-white/90 hover:text-white underline"
                        >
                          🔗 ankiweb.net
                        </a>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dateien-Modal */}
      <AnimatePresence>
        {filesModal && (
          <motion.div
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
            onClick={() => setFilesModal(null)}
          >
            <motion.div
              variants={modalContentVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
            <div className="p-6">
              <div className="flex justify-between items-center mb-5">
                <h2 className="text-xl font-bold text-[#032e65]">
                  📎 Dateien für {filesModal.name}
                </h2>
                <button onClick={() => setFilesModal(null)} className="text-gray-400 hover:text-gray-700 text-2xl leading-none">×</button>
              </div>

              {/* Upload-Formular */}
              <form onSubmit={handlePdfUpload} className="flex gap-2 mb-6">
                <input
                  type="file"
                  accept=".pdf"
                  onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
                  className="flex-1 text-sm px-3 py-2 border border-gray-300 rounded-lg"
                  required
                />
                <button
                  type="submit"
                  disabled={pdfUploading || !pdfFile}
                  className="bg-[#032e65] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#021d40] disabled:opacity-50 whitespace-nowrap"
                >
                  {pdfUploading ? '...' : 'PDF hochladen'}
                </button>
              </form>

              {/* Dateiliste */}
              {filesLoading ? (
                <p className="text-gray-500 text-sm text-center py-4">Lädt...</p>
              ) : studentFiles.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-4">Noch keine Dateien hinterlegt</p>
              ) : (
                <div className="space-y-2">
                  {studentFiles.map((f) => (
                    <div key={f.id} className="p-3 bg-[#eef3fb] rounded-lg border border-[#dce8f7]">
                      <div className="flex items-start gap-3">
                        <span className="text-red-500 text-lg flex-shrink-0 mt-0.5">📄</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 break-words">
                            {f.display_name || f.filename}
                          </p>
                          {f.note && (
                            <p className="text-xs text-gray-500 mt-0.5 break-words">{f.note}</p>
                          )}
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                              f.uploaded_by === 'teacher'
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-green-100 text-green-700'
                            }`}>
                              {f.uploaded_by === 'teacher' ? '🎓 Lehrer' : '👤 Schüler'}
                            </span>
                            <span className="text-xs text-gray-400">
                              {new Date(f.uploaded_at).toLocaleDateString('de-DE')}
                            </span>
                            <span
                              className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${f.seen ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-400'}`}
                            >
                              {f.seen ? '👁 Gesehen' : '👁 –'}
                            </span>
                            <span
                              className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${f.completed ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}
                            >
                              {f.completed ? '✓ Erledigt' : '✓ –'}
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={() => handleDeleteFile(f.id)}
                          className="text-red-400 hover:text-red-600 text-sm flex-shrink-0"
                          title="Löschen"
                        >
                          🗑
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Name-bearbeiten-Modal */}
      <AnimatePresence>
        {renameModal && (
          <motion.div
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
            onClick={() => setRenameModal(null)}
          >
            <motion.div
              variants={modalContentVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6"
              onClick={(e) => e.stopPropagation()}
            >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-gray-800">Name bearbeiten</h2>
              <button onClick={() => setRenameModal(null)} className="text-gray-400 hover:text-gray-700 text-2xl leading-none">×</button>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Neuer Name für <span className="font-semibold">{renameModal.name}</span>
            </p>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
              placeholder="Neuer Name"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 mb-4"
              autoFocus
            />
            <div className="flex gap-3">
              <button
                onClick={() => setRenameModal(null)}
                className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300"
              >
                Abbrechen
              </button>
              <button
                onClick={handleSaveName}
                disabled={!newName.trim() || nameSaving}
                className="flex-1 bg-amber-500 text-white py-2 rounded-lg hover:bg-amber-600 disabled:opacity-50"
              >
                {nameSaving ? 'Speichert...' : 'Speichern'}
              </button>
            </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Grundstunde-Modal */}
      <AnimatePresence>
        {scheduleModal && (
          <motion.div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" variants={modalVariants} initial="hidden" animate="visible" exit="exit" onClick={() => setScheduleModal(null)}>
            <motion.div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6" variants={modalContentVariants} initial="hidden" animate="visible" exit="exit" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-gray-800">⏰ Grundstunde – {scheduleModal.student.name}</h2>
              <button onClick={() => setScheduleModal(null)} className="text-gray-400 hover:text-gray-700 text-2xl leading-none">×</button>
            </div>
            <div className="space-y-3 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Wochentag</label>
                <select value={schedDay} onChange={(e) => setSchedDay(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500">
                  {['Sonntag','Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag'].map((d, i) => (
                    <option key={i} value={i}>{d}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Uhrzeit</label>
                <input type="time" value={schedTime} onChange={(e) => setSchedTime(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Dauer (Minuten)</label>
                <input type="number" min={15} max={240} step={5} value={schedDuration} onChange={(e) => setSchedDuration(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500" />
              </div>
            </div>
            <div className="flex gap-3">
              {schedules.find((x: any) => x.student_id === scheduleModal.student.id) && (
                <button onClick={() => { handleDeleteSchedule(scheduleModal.student.id); setScheduleModal(null); }}
                  className="flex-1 bg-red-100 text-red-700 py-2 rounded-lg hover:bg-red-200 text-sm">
                  Löschen
                </button>
              )}
              <button onClick={() => setScheduleModal(null)} className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300">Abbrechen</button>
              <button onClick={handleSaveSchedule} disabled={schedSaving}
                className="flex-1 bg-purple-600 text-white py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50">
                {schedSaving ? 'Speichert...' : 'Speichern'}
              </button>
            </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Session-bearbeiten-Modal */}
      <AnimatePresence>
        {sessionModal && (
          <motion.div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" variants={modalVariants} initial="hidden" animate="visible" exit="exit" onClick={() => setSessionModal(null)}>
            <motion.div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto" variants={modalContentVariants} initial="hidden" animate="visible" exit="exit" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6">
              <div className="flex justify-between items-center mb-1">
                <h2 className="text-lg font-bold text-gray-800">✏️ Stunde bearbeiten</h2>
                <button onClick={() => setSessionModal(null)} className="text-gray-400 hover:text-gray-700 text-2xl leading-none">×</button>
              </div>
              <p className="text-sm text-gray-500">
                {sessionModal.studentName}
              </p>
            </div>

            <div className="p-6 space-y-4">
              {/* Datums-Kalender – flexibles Fenster für vergangene & zukünftige Stunden */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">📅 Datum wählen</label>
                <div className="grid grid-cols-7 gap-1">
                  {(() => {
                    const pad = (n: number) => String(n).padStart(2, '0');
                    const localDateStr = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

                    // Parse current date
                    const [year, month, day] = sessionModal.date.split('-').map(Number);
                    const currentDate = new Date(year, month - 1, day);
                    currentDate.setHours(0, 0, 0, 0);

                    // Bestimme Start- und Enddatum für das Fenster
                    const now = new Date(); now.setHours(0, 0, 0, 0);
                    const isPast = currentDate < now;

                    let startDate = new Date(currentDate);
                    let endDate = new Date(currentDate);

                    if (isPast) {
                      // Für vergangene Stunden: letzte 2 Tage + nächste 2 Wochen (flexible Datumsänderung)
                      startDate.setDate(currentDate.getDate() - 2);
                      endDate.setDate(currentDate.getDate() + 14);
                    } else {
                      // Für zukünftige Stunden: diese Woche + nächste Woche (wie zuvor)
                      const daysToMondayBack = sessionModal.standardDayOfWeek - 1;
                      startDate.setDate(currentDate.getDate() - daysToMondayBack);
                      endDate.setDate(currentDate.getDate() + (12 - sessionModal.standardDayOfWeek));
                    }

                    const days = [];
                    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
                      const dateStr = localDateStr(d);
                      const dow = d.getDay();
                      const dayName = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'][dow];
                      const dayNum = d.getDate();
                      days.push({ dateStr, dayName, dayNum });
                    }
                    return days;
                  })().map(({ dateStr, dayName, dayNum }) => {
                    const isSelected = sessionModal.date === dateStr;
                    return (
                      <button
                        key={dateStr}
                        onClick={() => setSessionModal({ ...sessionModal, date: dateStr })}
                        className={`p-2 rounded-lg text-sm font-medium transition ${
                          isSelected
                            ? 'bg-[#032e65] text-white ring-2 ring-[#032e65]'
                            : 'bg-[#eef3fb] text-gray-700 border border-[#dce8f7] hover:bg-[#d7e5f6]'
                        }`}
                        title={dateStr}
                      >
                        <div className="text-xs opacity-75">{dayName}</div>
                        <div>{dayNum}</div>
                      </button>
                    );
                  })}
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Aktuell: <strong>{new Date(sessionModal.date + 'T12:00:00').toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })}</strong>
                </p>
              </div>

              {/* Uhrzeit */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Uhrzeit <span className="text-gray-400 font-normal">(Standard: {sessionModal.standardTime})</span>
                </label>
                <input type="time" value={sessTime} onChange={(e) => setSessTime(e.target.value)}
                  placeholder={sessionModal.standardTime}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#032e65]" />
                <p className="text-xs text-gray-400 mt-0.5">Leer lassen = Standardzeit verwenden</p>
              </div>

              {/* Dauer */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Dauer in Min. <span className="text-gray-400 font-normal">(Standard: {sessionModal.standardDuration})</span>
                </label>
                <input type="number" min={15} max={240} step={5} value={sessDuration} onChange={(e) => setSessDuration(e.target.value)}
                  placeholder={String(sessionModal.standardDuration)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#032e65]" />
              </div>

              {/* Thema */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">📚 Thema / Kapitel</label>
                <input type="text" value={sessTheme} onChange={(e) => setSessTheme(e.target.value)}
                  placeholder="z.B. Pythagoras, Quadratische Gleichungen"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#032e65]" />
              </div>

              {/* Notizen */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">📝 Notizen / Aufgaben für den Schüler</label>
                <textarea value={sessNotes} onChange={(e) => setSessNotes(e.target.value)} rows={3}
                  placeholder="Was soll bis zur nächsten Stunde erledigt werden?"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#032e65] text-sm resize-none" />
              </div>
            </div>

            {/* Buttons */}
            <div className="sticky bottom-0 bg-white border-t border-gray-200 p-6 flex gap-2 flex-wrap">
              {sessionModal.sessionId && (
                <button onClick={() => handleDeleteSession(sessionModal.sessionId!)}
                  className="flex-1 min-w-[120px] bg-orange-100 text-orange-700 py-2 rounded-lg hover:bg-orange-200 text-sm font-medium">
                  Session löschen
                </button>
              )}
              <button onClick={async () => {
                if (!confirm(`Stunde für ${sessionModal?.studentName} ganz löschen?`)) return;
                if (sessionModal?.sessionId) {
                  await fetch(`/api/lesson-sessions/${sessionModal.sessionId}`, { method: 'DELETE', credentials: 'include' });
                }
                await fetch(`/api/lesson-schedules/${sessionModal?.studentId}`, { method: 'DELETE', credentials: 'include' });
                setSessionModal(null);
                fetchData();
              }} className="flex-1 min-w-[120px] bg-red-100 text-red-700 py-2 rounded-lg hover:bg-red-200 text-sm font-medium">
                🗑 Grundstunde löschen
              </button>
              <button onClick={() => setSessionModal(null)} className="flex-1 min-w-[100px] bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300 font-medium">Abbrechen</button>
              <button onClick={handleSaveSession} disabled={sessSaving}
                className="flex-1 min-w-[100px] bg-[#032e65] text-white py-2 rounded-lg hover:bg-[#021d40] disabled:opacity-50 font-medium">
                {sessSaving ? 'Speichert...' : 'Speichern'}
              </button>
            </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Activity Modal */}
      <AnimatePresence>
        {activityModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
            onClick={() => setActivityModal(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 40 }}
              className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6"
              onClick={(e) => e.stopPropagation()}
            >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-gray-800">Stunde erledigt</h2>
              <button onClick={() => setActivityModal(null)} className="text-gray-400 hover:text-gray-700 text-2xl leading-none">×</button>
            </div>
            <p className="text-sm text-gray-600 mb-5">
              Was wurde in der Stunde mit <span className="font-semibold">{activityModal.studentName}</span> erledigt?
            </p>

            <div className="space-y-2 mb-6">
              {ACTIVITY_TYPES.map(activity => {
                const isSelected = selectedActivities.has(activity.id);
                return (
                  <button
                    key={activity.id}
                    onClick={() => {
                      const newSet = new Set(selectedActivities);
                      if (isSelected) {
                        newSet.delete(activity.id);
                      } else {
                        newSet.add(activity.id);
                      }
                      setSelectedActivities(newSet);
                    }}
                    className={`w-full p-3 rounded-lg border-2 transition text-left font-medium ${
                      isSelected
                        ? 'border-green-500 bg-green-50 text-green-800'
                        : 'border-gray-300 bg-white text-gray-800 hover:border-gray-400'
                    }`}
                  >
                    <span className="text-lg mr-2">{activity.emoji}</span>
                    {activity.label}
                    {isSelected && <span className="ml-2 float-right">✓</span>}
                  </button>
                );
              })}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setActivityModal(null)}
                className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300 font-medium"
              >
                Abbrechen
              </button>
              <button
                onClick={() => {
                  if (activityModal) {
                    const newMap = new Map(completedSessions);
                    if (selectedActivities.size > 0) {
                      newMap.set(activityModal.lessonKey, selectedActivities);
                    } else {
                      newMap.delete(activityModal.lessonKey);
                    }
                    setCompletedSessions(newMap);
                  }
                  setActivityModal(null);
                }}
                className="flex-1 bg-green-500 text-white py-2 rounded-lg hover:bg-green-600 font-medium"
              >
                Bestätigen
              </button>
            </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* PIN-Modal */}
      <AnimatePresence>
        {pinModal && (
          <motion.div
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
            onClick={() => setPinModal(null)}
          >
            <motion.div
              variants={modalContentVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold text-gray-800">PIN ändern</h2>
                <button onClick={() => setPinModal(null)} className="text-gray-400 hover:text-gray-700 text-2xl leading-none">×</button>
              </div>
              <p className="text-sm text-gray-600 mb-4">
                Neue PIN für <span className="font-semibold">{pinModal.name}</span>
              </p>
              <input
                type="text"
                value={newPin}
                onChange={(e) => setNewPin(e.target.value)}
                placeholder="Neue PIN eingeben"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#032e65] mb-4"
                autoFocus
              />
              <p className="text-xs text-gray-400 mb-4">
                PINs sind verschlüsselt gespeichert — die alte PIN kann nicht eingesehen werden.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setPinModal(null)}
                  className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300"
                >
                  Abbrechen
                </button>
                <button
                  onClick={handleSavePin}
                  disabled={!newPin.trim() || pinSaving}
                  className="flex-1 bg-[#032e65] text-white py-2 rounded-lg hover:bg-[#021d40] disabled:opacity-50"
                >
                  {pinSaving ? 'Speichert...' : 'Speichern'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Extrastunde hinzufügen Modal */}
      <AnimatePresence>
        {extraSessionModal && (
          <motion.div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" variants={modalVariants} initial="hidden" animate="visible" exit="exit" onClick={() => setExtraSessionModal(null)}>
            <motion.div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto" variants={modalContentVariants} initial="hidden" animate="visible" exit="exit" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6">
              <div className="flex justify-between items-center mb-1">
                <h2 className="text-lg font-bold text-gray-800">➕ Extrastunde hinzufügen</h2>
                <button onClick={() => setExtraSessionModal(null)} className="text-gray-400 hover:text-gray-700 text-2xl leading-none">×</button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {/* Schüler-Auswahl (Multi-Select) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">👤 Schüler (mehrfach wählbar)</label>
                <div className="space-y-2 border border-gray-300 rounded-lg p-3 max-h-40 overflow-y-auto">
                  {students.length === 0 ? (
                    <p className="text-sm text-gray-500">Keine Schüler vorhanden</p>
                  ) : (
                    students.map((s: any) => (
                      <label key={s.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
                        <input
                          type="checkbox"
                          checked={extraSessionModal?.studentIds.includes(s.id) || false}
                          onChange={(e) => {
                            if (!extraSessionModal) return;
                            const studentIds = e.target.checked
                              ? [...extraSessionModal.studentIds, s.id]
                              : extraSessionModal.studentIds.filter(id => id !== s.id);
                            setExtraSessionModal({ ...extraSessionModal, studentIds });
                          }}
                          className="w-4 h-4 rounded cursor-pointer"
                        />
                        <span className="text-sm text-gray-800">{s.name}</span>
                      </label>
                    ))
                  )}
                </div>
                {extraSessionModal?.studentIds.length > 0 && (
                  <p className="text-xs text-indigo-600 mt-2">✓ {extraSessionModal.studentIds.length} Schüler ausgewählt</p>
                )}
              </div>

              {/* Datum */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">📅 Datum</label>
                <p className="text-sm text-gray-600 font-medium">{new Date(extraSessionModal.date + 'T12:00:00').toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })}</p>
              </div>

              {/* Uhrzeit */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">🕐 Uhrzeit</label>
                <input type="time" value={extraTime} onChange={(e) => setExtraTime(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#032e65]" />
              </div>

              {/* Dauer */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">⏱️ Dauer in Min.</label>
                <input type="number" min={15} max={240} step={5} value={extraDuration} onChange={(e) => setExtraDuration(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#032e65]" />
              </div>

              {/* Thema */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">📚 Thema / Kapitel (optional)</label>
                <input type="text" value={extraTheme} onChange={(e) => setExtraTheme(e.target.value)}
                  placeholder="z.B. Quadratische Gleichungen"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#032e65]" />
              </div>

              {/* Notizen */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">📝 Notizen / Grund</label>
                <textarea value={extraNotes} onChange={(e) => setExtraNotes(e.target.value)} rows={2}
                  placeholder="z.B. Nachholstunde, Vertiefung, etc."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#032e65] text-sm resize-none" />
              </div>
            </div>

            {/* Buttons */}
            <div className="sticky bottom-0 bg-white border-t border-gray-200 p-6 flex gap-3">
              <button onClick={() => setExtraSessionModal(null)} className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300 font-medium">Abbrechen</button>
              <button onClick={handleSaveExtraSession} disabled={extraSaving || !extraSessionModal?.studentIds.length}
                className="flex-1 bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 font-medium">
                {extraSaving ? 'Erstellt...' : `Erstellen (${extraSessionModal?.studentIds.length || 0})`}
              </button>
            </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Detail-Modal */}
      <AnimatePresence>
        {(detailLoading || detailResult) && (
          <motion.div
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
            onClick={() => setDetailResult(null)}
          >
            <motion.div
              variants={modalContentVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {detailLoading ? (
                <div className="flex items-center justify-center py-16 text-gray-500">
                  Lädt Details...
                </div>
              ) : detailResult && (
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h2 className="text-xl font-bold text-gray-800">{detailResult.quiz_title}</h2>
                      <p className="text-gray-500 text-sm">{detailResult.student_name}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleDeleteResult(detailResult.id)}
                        className="text-red-500 hover:text-red-700 text-lg"
                        title="Ergebnis löschen"
                      >
                        🗑
                      </button>
                      <button
                        onClick={() => setDetailResult(null)}
                        className="text-gray-400 hover:text-gray-700 text-2xl leading-none"
                      >
                        ×
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
                    <span className="text-gray-500 text-sm">
                      {new Date(detailResult.completed_at).toLocaleDateString('de-DE')}
                    </span>
                  </div>

                  {!detailResult.questions || !detailResult.answers ? (
                    <p className="text-gray-400 text-sm text-center py-4">
                      Keine Einzelauswertung verfügbar (Test vor Update absolviert)
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {detailResult.questions.map((q, i) => {
                        const studentAnswer = detailResult.answers![q.id];
                        const isCorrect = studentAnswer === q.correctAnswer;
                        return (
                          <div
                            key={q.id}
                            className={`p-4 rounded-lg border-l-4 ${isCorrect ? 'border-green-500 bg-green-50' : 'border-red-400 bg-red-50'}`}
                          >
                            <div className="font-medium text-gray-800 mb-2 flex gap-2">
                              <span>{i + 1}.</span>
                              <RichContent html={q.text} className="flex-1" />
                            </div>
                            <p className={`text-sm ${isCorrect ? 'text-green-700' : 'text-red-700'}`}>
                              Antwort: {formatAnswer(studentAnswer, q.type)}
                              {isCorrect ? ' ✓' : ''}
                            </p>
                            {!isCorrect && (
                              <p className="text-sm text-green-700 mt-1">
                                Richtig: {formatAnswer(q.correctAnswer, q.type)}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Neuer Schüler Modal */}
      <AnimatePresence>
        {newStudentModal && (
          <motion.div
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
            onClick={() => setNewStudentModal(false)}
          >
            <motion.div
              variants={modalContentVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="bg-white rounded-xl shadow-2xl w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold text-[#032e65]">➕ Neuer Schüler</h2>
                  <button onClick={() => setNewStudentModal(false)} className="text-gray-400 hover:text-gray-700 text-2xl leading-none">×</button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                    <input
                      type="text"
                      value={newStudentName}
                      onChange={(e) => setNewStudentName(e.target.value)}
                      placeholder="z.B. Max Müller"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#032e65]"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">PIN</label>
                    <input
                      type="text"
                      value={newStudentPin}
                      onChange={(e) => setNewStudentPin(e.target.value)}
                      placeholder="z.B. 1234"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#032e65]"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Grundstunde - Wochentag</label>
                    <select
                      value={newStudentDay}
                      onChange={(e) => setNewStudentDay(parseInt(e.target.value))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#032e65]"
                    >
                      <option value={0}>Keine Grundstunde</option>
                      <option value={1}>Montag</option>
                      <option value={2}>Dienstag</option>
                      <option value={3}>Mittwoch</option>
                      <option value={4}>Donnerstag</option>
                      <option value={5}>Freitag</option>
                      <option value={6}>Samstag</option>
                      <option value={0}>Sonntag</option>
                    </select>
                  </div>

                  {newStudentDay > 0 && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Uhrzeit</label>
                        <input
                          type="time"
                          value={newStudentTime}
                          onChange={(e) => setNewStudentTime(e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#032e65]"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Dauer (Minuten)</label>
                        <input
                          type="number"
                          value={newStudentDuration}
                          onChange={(e) => setNewStudentDuration(parseInt(e.target.value) || 60)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#032e65]"
                        />
                      </div>
                    </>
                  )}

                  <button
                    onClick={handleAddStudent}
                    disabled={newStudentSaving || !newStudentName.trim() || !newStudentPin.trim()}
                    className="w-full bg-[#032e65] text-white py-2 rounded-lg font-medium hover:bg-[#021d40] transition disabled:opacity-50"
                  >
                    {newStudentSaving ? 'Speichert...' : 'Schüler hinzufügen'}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
