'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { accordionContentVariants, rotateArrowVariants } from '@/app/lib/motionVariants';
import { GlassIconButton } from '@/app/components/GlassEffect';

interface Quiz {
  id: number;
  title: string;
  file_key: string;
  uploaded_at: string;
}

interface Result {
  id: number;
  title: string;
  score: number;
  completed_at: string;
}

interface NextLesson {
  id?: number;
  date: string;
  start_time: string;
  duration_minutes: number;
  standard_time: string;
  theme?: string | null;
  notes: string | null;
  is_changed: boolean;
  completed_tasks?: Record<string, boolean> | null;
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

interface AnkiCreds {
  anki_username: string | null;
  anki_password: string | null;
}

interface DetailQuestion {
  id: string;
  text: string;
  type: 'multiple' | 'true-false' | 'text';
  options?: string[];
  correctAnswer?: string | boolean;
}

interface DetailResult {
  id: number;
  score: number;
  completed_at: string;
  quiz_title: string;
  questions: DetailQuestion[] | null;
  answers: Record<string, unknown> | null;
}

function formatAnswer(answer: unknown, type: string): string {
  if (answer === undefined || answer === null) return 'Keine Antwort';
  if (type === 'true-false') {
    // Handle both boolean and string values
    const bool = answer === true || answer === 'true';
    return bool ? 'Wahr' : 'Falsch';
  }
  return String(answer);
}

export default function StudentDashboard() {
  const params = useParams();
  const studentId = params.id as string;
  const router = useRouter();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [results, setResults] = useState<Result[]>([]);
  const [files, setFiles] = useState<StudentFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailResult, setDetailResult] = useState<DetailResult | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [nextLesson, setNextLesson] = useState<NextLesson | null>(null);
  const [completedTasks, setCompletedTasks] = useState<Record<string, boolean>>({
    anki: false,
    worksheets: false,
    prepare: false,
  });
  const [savingTasks, setSavingTasks] = useState(false);

  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadName, setUploadName] = useState('');
  const [uploadNote, setUploadNote] = useState('');
  const [uploading, setUploading] = useState(false);

  // Todos
  const [todos, setTodos] = useState<Todo[]>([]);

  // Anki-Modal
  const [ankiOpen, setAnkiOpen] = useState(false);
  const [ankiCreds, setAnkiCreds] = useState<AnkiCreds>({ anki_username: null, anki_password: null });
  const [showAnkiPassword, setShowAnkiPassword] = useState(false);

  const [studentClass, setStudentClass] = useState('');
  const [studentSubject, setStudentSubject] = useState('');
  const [savingInfo, setSavingInfo] = useState(false);

  // Accordion sections (Single-Expand)
  const [openSection, setOpenSection] = useState<string | null>(null);

  const toggleSection = (section: string) => {
    setOpenSection(openSection === section ? null : section);
  };

  useEffect(() => {
    fetchData();
  }, [studentId]);

  const fetchData = async () => {
    try {
      const [quizzesRes, resultsRes, filesRes, nextLessonRes, todosRes, ankiRes] = await Promise.all([
        fetch(`/api/quizzes/student/${studentId}`),
        fetch('/api/results'),
        fetch(`/api/students/${studentId}/files`),
        fetch(`/api/students/${studentId}/next-lesson`),
        fetch(`/api/students/${studentId}/todos`),
        fetch(`/api/students/${studentId}/anki`),
      ]);

      if (!quizzesRes.ok || !resultsRes.ok) {
        router.push('/');
        return;
      }

      setQuizzes(await quizzesRes.json());
      const { results } = await resultsRes.json();
      setResults(results);
      if (filesRes.ok) setFiles(await filesRes.json());
      if (nextLessonRes.ok) {
        const nlData = await nextLessonRes.json();
        if (nlData.next_lesson) {
          setNextLesson(nlData.next_lesson);
          if (nlData.next_lesson.completed_tasks) {
            setCompletedTasks(nlData.next_lesson.completed_tasks);
          }
        }
      }
      if (todosRes.ok) setTodos(await todosRes.json());
      if (ankiRes.ok) setAnkiCreds(await ankiRes.json());
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTodoComplete = async (todoId: number) => {
    // Optimistic Update: sofort entfernen
    setTodos((prev) => prev.filter((t) => t.id !== todoId));
    try {
      await fetch(`/api/students/${studentId}/todos/${todoId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
    } catch {
      // Bei Fehler neu laden
      fetchData();
    }
  };

  const fetchResultDetail = async (resultId: number) => {
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/results/${resultId}`);
      if (res.ok) setDetailResult(await res.json());
    } catch (err) {
      console.error('Detail fetch error:', err);
    } finally {
      setDetailLoading(false);
    }
  };

  const updateFileStatus = async (fileId: number, seen: boolean, completed: boolean) => {
    setFiles((prev) =>
      prev.map((f) => (f.id === fileId ? { ...f, seen, completed } : f))
    );
    try {
      await fetch(`/api/files/${fileId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seen, completed }),
      });
    } catch {
      // revert on error
      fetchData();
    }
  };

  const handleTaskToggle = async (taskKey: string) => {
    const newTasks = { ...completedTasks, [taskKey]: !completedTasks[taskKey] };
    setCompletedTasks(newTasks);

    if (!nextLesson) return;

    setSavingTasks(true);
    try {
      // Über next-lesson PATCH: legt Session automatisch an falls noch keine existiert.
      const res = await fetch(`/api/students/${studentId}/next-lesson`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lesson_date: nextLesson.date, completed_tasks: newTasks }),
      });
      if (!res.ok) {
        setCompletedTasks(completedTasks);
      } else {
        const saved = await res.json();
        // Stelle sicher, dass nextLesson.id gesetzt ist nach Auto-Create
        if (saved?.id && !nextLesson.id) {
          setNextLesson({ ...nextLesson, id: saved.id });
        }
      }
    } catch {
      setCompletedTasks(completedTasks);
    } finally {
      setSavingTasks(false);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile || !uploadName.trim()) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', uploadFile);
      formData.append('display_name', uploadName.trim());
      if (uploadNote.trim()) formData.append('note', uploadNote.trim());
      const res = await fetch(`/api/students/${studentId}/files`, {
        method: 'POST',
        body: formData,
      });
      if (res.ok) {
        setUploadFile(null);
        setUploadName('');
        setUploadNote('');
        fetchData();
      } else {
        const data = await res.json();
        alert('Fehler: ' + (data.error || res.status));
      }
    } catch {
      alert('Netzwerkfehler');
    } finally {
      setUploading(false);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/');
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
      {/* Dot-Pattern Overlay wie im Login */}
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
        <div className="max-w-7xl mx-auto px-6 py-3 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white drop-shadow">📊 Mein Dashboard</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleLogout}
              className="bg-white text-red-600 px-4 py-2 rounded-lg hover:bg-red-50 font-medium"
            >
              Abmelden
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-8 relative z-10">

        {/* Nächste Stunde */}
        {nextLesson && (
          <div
            className={`rounded-2xl shadow-2xl p-6 border-l-4 mb-6 ${nextLesson.is_changed ? 'border-red-400' : 'border-white/40'}`}
            style={{
              background: '#708DC7',
              boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
            }}
          >
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-white/80 mb-1">📅 Nächste Stunde</p>
                <p className={`text-2xl font-bold ${nextLesson.is_changed ? 'text-red-100' : 'text-white'}`}>
                  {new Date(nextLesson.date + 'T12:00:00').toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })}
                </p>
                <p className={`text-lg font-semibold mt-0.5 ${nextLesson.is_changed ? 'text-red-100' : 'text-white/95'}`}>
                  {nextLesson.start_time} Uhr &middot; {nextLesson.duration_minutes} Min.
                  {nextLesson.is_changed && (
                    <span className="ml-2 text-sm font-normal text-red-100">(geändert von {nextLesson.standard_time} Uhr)</span>
                  )}
                </p>
              </div>
              {nextLesson.is_changed && (
                <span className="text-xs bg-red-500 text-white px-2 py-1 rounded-full font-semibold self-start">⚠ Geänderter Termin</span>
              )}
            </div>
            {nextLesson.theme && (
              <div className="mt-3 pt-3 border-t border-white/30">
                <p className="text-sm font-semibold text-white/80 mb-1">🎓 Thema:</p>
                <p className="text-sm text-white">{nextLesson.theme}</p>
              </div>
            )}
            {nextLesson.notes && (
              <div className="mt-3 pt-3 border-t border-white/30">
                <p className="text-sm font-semibold text-white/80 mb-1">📝 Bis dahin erledigen:</p>
                <p className="text-sm text-white whitespace-pre-wrap">{nextLesson.notes}</p>
              </div>
            )}
            <div className="mt-4 pt-4 border-t border-white/30">
              <p className="text-sm font-semibold text-white/80 mb-3">✓ Vorbereitung für diese Stunde:</p>
              <div className="space-y-2">
                {[
                  { key: 'anki', label: 'Anki-Karten bearbeitet' },
                  { key: 'worksheets', label: 'Arbeitsblätter & Tests bearbeitet' },
                  { key: 'prepare', label: 'Materialien vorbereitet' },
                ].map((t) => {
                  const done = !!completedTasks[t.key];
                  return (
                    <label
                      key={t.key}
                      className={`flex items-center gap-3 cursor-pointer rounded-lg px-3 py-2 transition ${
                        done
                          ? 'bg-green-500/70 border border-green-300'
                          : 'bg-white/10 hover:bg-white/20 border border-transparent'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={done}
                        onChange={() => handleTaskToggle(t.key)}
                        disabled={savingTasks}
                        className="w-4 h-4 rounded accent-white"
                      />
                      <span className="text-sm text-white">{t.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* To-Do Liste */}
        {todos.length > 0 && (
          <div
            className="rounded-2xl shadow-2xl p-6 mb-8 border-l-4 border-red-400"
            style={{
              background: '#708DC7',
              boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
            }}
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-white/80 mb-3">
              📋 Meine Aufgaben ({todos.length})
            </p>
            <div className="space-y-2">
              {todos.map((todo) => (
                <label
                  key={todo.id}
                  className="flex items-start gap-3 p-3 rounded-lg bg-white/15 hover:bg-white/25 cursor-pointer transition group"
                >
                  <input
                    type="checkbox"
                    checked={false}
                    onChange={() => handleTodoComplete(todo.id)}
                    className="w-5 h-5 mt-0.5 rounded accent-white cursor-pointer"
                  />
                  <span className="text-sm text-white flex-1 break-words">{todo.text}</span>
                </label>
              ))}
            </div>
            <p className="text-xs text-white/70 mt-3">
              Hake eine Aufgabe ab — sie wird komplett entfernt.
            </p>
          </div>
        )}

        {/* Icon-Tab-Leiste */}
        <div className="mb-8 flex flex-wrap items-center justify-center gap-3 sm:gap-4">
            <GlassIconButton
              emoji="📝"
              label="Verfügbare Quizzes"
              isActive={openSection === 'quizzes'}
              onClick={() => toggleSection('quizzes')}
            />
            <GlassIconButton
              emoji="📈"
              label="Meine Ergebnisse"
              isActive={openSection === 'results'}
              onClick={() => toggleSection('results')}
            />
            <GlassIconButton
              emoji="📚"
              label="Verfügbare Dokumente"
              isActive={openSection === 'availableDocuments'}
              onClick={() => toggleSection('availableDocuments')}
            />
            <GlassIconButton
              emoji="📤"
              label="Dateien hochladen"
              isActive={openSection === 'uploadDocuments'}
              onClick={() => toggleSection('uploadDocuments')}
            />
            <GlassIconButton
              emoji="🃏"
              label="Anki-Zugang"
              isActive={ankiOpen}
              onClick={() => setAnkiOpen(true)}
            />
        </div>

        {/* Content Sections */}
        <div className="space-y-8">
          <AnimatePresence>
            {openSection === 'quizzes' && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                style={{ overflow: "hidden", background: '#708DC7' }}
                className="rounded-2xl shadow-2xl p-6"
              >
              <h2 className="text-2xl font-bold mb-4 text-white">📝 Verfügbare Quizzes</h2>
            <div className="space-y-3">
              {quizzes.length > 0 ? (
                quizzes.map((quiz) => (
                  <Link
                    key={quiz.id}
                    href={`/student/${studentId}/quiz/${quiz.id}`}
                    className="block p-4 bg-white rounded-lg shadow hover:shadow-md transition border-l-4 border-[#032e65]"
                  >
                    <h3 className="font-semibold text-gray-800">{quiz.title}</h3>
                    <p className="text-sm text-gray-500">
                      Hochgeladen: {new Date(quiz.uploaded_at).toLocaleDateString('de-DE')}
                    </p>
                  </Link>
                ))
              ) : (
                <p className="text-gray-500">Noch keine Quizzes verfügbar</p>
              )}
              </div>
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
              <h2 className="text-2xl font-bold mb-4 text-white">📈 Ergebnisse</h2>
            <p className="text-sm text-gray-500 mb-3">Karte anklicken für Einzelauswertung</p>
            <div className="space-y-3">
              {results.length > 0 ? (
                results.map((result) => (
                  <div
                    key={result.id}
                    className="p-4 bg-white rounded-lg shadow border-l-4 border-green-500 cursor-pointer hover:shadow-md transition"
                    onClick={() => fetchResultDetail(result.id)}
                  >
                    <h3 className="font-semibold text-gray-800">{result.title}</h3>
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-2xl font-bold text-green-600">
                        {Number(result.score).toFixed(1)}%
                      </span>
                      <span className="text-sm text-gray-500">
                        {new Date(result.completed_at).toLocaleDateString('de-DE')}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500">Noch keine Ergebnisse</p>
              )}
              </div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {openSection === 'availableDocuments' && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                style={{ overflow: "hidden", background: '#708DC7' }}
                className="rounded-2xl shadow-2xl p-6"
              >
              <h2 className="text-2xl font-bold mb-4 text-white">📚 Verfügbare Dokumente (Probetests, Übersichten)</h2>
            <div className="space-y-3">
              {files.length === 0 ? (
                <p className="text-gray-500 text-sm">Noch keine Dokumente vorhanden</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {files.map((f) => (
                    <div
                      key={f.id}
                      className="bg-white rounded-lg shadow p-4 border-l-4 border-blue-500"
                    >
                      <div className="flex items-start gap-3 mb-2">
                        <span className="text-2xl flex-shrink-0">📄</span>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 text-sm leading-tight break-words">
                            {f.display_name || f.filename}
                          </p>
                          {f.note && (
                            <p className="text-xs text-gray-500 mt-0.5 break-words">{f.note}</p>
                          )}
                          <div className="flex items-center gap-2 mt-1">
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
                          </div>
                        </div>
                      </div>

                      <a
                        href={`/api/files/${f.id}/download`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block text-center text-xs bg-[#032e65] text-white py-1.5 rounded-lg hover:bg-[#021d40] transition mb-3"
                      >
                        PDF öffnen
                      </a>

                      <div className="flex gap-2">
                        <button
                          onClick={() => updateFileStatus(f.id, !f.seen, f.completed)}
                          className={`flex-1 text-xs py-1.5 rounded-lg border transition font-medium ${
                            f.seen
                              ? 'bg-blue-100 border-blue-300 text-blue-700'
                              : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-blue-50'
                          }`}
                        >
                          {f.seen ? '👁 Gesehen ✓' : '👁 Gesehen'}
                        </button>
                        <button
                          onClick={() => updateFileStatus(f.id, f.seen || true, !f.completed)}
                          className={`flex-1 text-xs py-1.5 rounded-lg border transition font-medium ${
                            f.completed
                              ? 'bg-green-100 border-green-300 text-green-700'
                              : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-green-50'
                          }`}
                        >
                          {f.completed ? '✓ Erledigt ✓' : '✓ Erledigt'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              </div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {openSection === 'uploadDocuments' && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                style={{ overflow: "hidden", background: '#708DC7' }}
                className="rounded-2xl shadow-2xl p-6"
              >
              <h2 className="text-2xl font-bold mb-6 text-white">📤 Dokumente hochladen (Tests, ...)</h2>
              <form onSubmit={handleUpload} className="space-y-4">
                <div>
                  <input
                    type="text"
                    value={uploadName}
                    onChange={(e) => setUploadName(e.target.value)}
                    placeholder="Name des Dokuments *"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#032e65] text-gray-900"
                    required
                  />
                </div>
                <div>
                  <input
                    type="text"
                    value={uploadNote}
                    onChange={(e) => setUploadNote(e.target.value)}
                    placeholder="Notiz (optional)"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#032e65] text-gray-900"
                  />
                </div>
                <div className="flex gap-2">
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                    className="flex-1 text-xs px-3 py-2 border border-gray-300 rounded-lg"
                    required
                  />
                  <button
                    type="submit"
                    disabled={uploading || !uploadFile || !uploadName.trim()}
                    className="bg-[#032e65] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#021d40] disabled:opacity-50 whitespace-nowrap"
                  >
                    {uploading ? '...' : 'Hochladen'}
                  </button>
                </div>
              </form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Anki-Modal */}
      <AnimatePresence>
        {ankiOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
            onClick={() => { setAnkiOpen(false); setShowAnkiPassword(false); }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 400, damping: 40 }}
              className="rounded-2xl shadow-2xl w-full max-w-sm p-6"
              style={{ background: '#708DC7' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <span className="text-2xl">🃏</span> Anki-Zugang
                </h2>
                <button
                  onClick={() => { setAnkiOpen(false); setShowAnkiPassword(false); }}
                  className="text-white/70 hover:text-white text-2xl leading-none"
                >
                  ×
                </button>
              </div>

              {!ankiCreds.anki_username && !ankiCreds.anki_password ? (
                <p className="text-sm text-white/90 bg-white/10 p-4 rounded-lg mb-4">
                  Es sind noch keine Anki-Zugangsdaten hinterlegt. Bitte sprich deinen Lehrer an.
                </p>
              ) : (
                <div className="space-y-3 mb-5">
                  <div>
                    <label className="block text-xs font-semibold text-white/80 mb-1 uppercase tracking-wide">
                      Benutzername / E-Mail
                    </label>
                    <div className="bg-white/15 border border-white/30 rounded-lg px-3 py-2 text-white text-sm break-all">
                      {ankiCreds.anki_username || '—'}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-white/80 mb-1 uppercase tracking-wide">
                      Passwort
                    </label>
                    <div className="flex gap-2 items-center">
                      <div className="flex-1 bg-white/15 border border-white/30 rounded-lg px-3 py-2 text-white text-sm font-mono break-all">
                        {ankiCreds.anki_password
                          ? showAnkiPassword
                            ? ankiCreds.anki_password
                            : '•'.repeat(Math.min(ankiCreds.anki_password.length, 12))
                          : '—'}
                      </div>
                      {ankiCreds.anki_password && (
                        <button
                          onClick={() => setShowAnkiPassword((v) => !v)}
                          className="px-3 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg text-lg transition"
                          title={showAnkiPassword ? 'Verbergen' : 'Anzeigen'}
                        >
                          {showAnkiPassword ? '🙈' : '👁'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <a
                href="https://ankiweb.net/"
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full text-center bg-white text-[#032e65] font-semibold py-2.5 rounded-lg hover:bg-gray-100 transition shadow"
              >
                🔗 Zu AnkiWeb
              </a>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Detail-Modal */}
      <AnimatePresence>
        {(detailLoading || detailResult) && (
          <motion.div
            variants={{ hidden: { opacity: 0 }, visible: { opacity: 1 }, exit: { opacity: 0 } }}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
            onClick={() => setDetailResult(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 400, damping: 40 }}
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
                  <h2 className="text-xl font-bold text-gray-800">{detailResult.quiz_title}</h2>
                  <button
                    onClick={() => setDetailResult(null)}
                    className="text-gray-400 hover:text-gray-700 text-2xl leading-none"
                  >
                    ×
                  </button>
                </div>

                <div className="flex items-center gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
                  <span className="text-4xl font-bold text-green-600">
                    {Number(detailResult.score).toFixed(1)}%
                  </span>
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
                      // Normalize boolean comparison (handle both string and boolean values)
                      let isCorrect = false;
                      if (q.type === 'true-false') {
                        const answerBool = studentAnswer === true || studentAnswer === 'true';
                        const correctBool = q.correctAnswer === true || q.correctAnswer === 'true';
                        isCorrect = answerBool === correctBool && studentAnswer !== undefined;
                      } else {
                        isCorrect = studentAnswer === q.correctAnswer;
                      }
                      return (
                        <div
                          key={q.id}
                          className={`p-4 rounded-lg border-l-4 ${isCorrect ? 'border-green-500 bg-green-50' : 'border-red-400 bg-red-50'}`}
                        >
                          <p className="font-medium text-gray-800 mb-2">
                            {i + 1}. {q.text}
                          </p>
                          <p className={`text-sm ${isCorrect ? 'text-green-700' : 'text-red-700'}`}>
                            Deine Antwort: {formatAnswer(studentAnswer, q.type)}
                            {isCorrect ? ' ✓' : ''}
                          </p>
                          {!isCorrect && (
                            <p className="text-sm text-green-700 mt-1">
                              Richtige Antwort: {formatAnswer(q.correctAnswer, q.type)}
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
    </div>
  );
}
