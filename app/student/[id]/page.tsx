'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useParams } from 'next/navigation';

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
  date: string;
  start_time: string;
  duration_minutes: number;
  standard_time: string;
  notes: string | null;
  is_changed: boolean;
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
  if (type === 'true-false') return answer ? 'Wahr' : 'Falsch';
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

  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadName, setUploadName] = useState('');
  const [uploadNote, setUploadNote] = useState('');
  const [uploading, setUploading] = useState(false);

  // Accordion sections
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    quizzes: false,
    results: false,
    documents: false,
    availableDocuments: false,
    uploadDocuments: false,
  });

  const toggleSection = (section: string) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  useEffect(() => {
    fetchData();
  }, [studentId]);

  const fetchData = async () => {
    try {
      const [quizzesRes, resultsRes, filesRes, nextLessonRes] = await Promise.all([
        fetch(`/api/quizzes/student/${studentId}`),
        fetch('/api/results'),
        fetch(`/api/students/${studentId}/files`),
        fetch(`/api/students/${studentId}/next-lesson`),
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
        if (nlData.next_lesson) setNextLesson(nlData.next_lesson);
      }
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
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
    <div className="min-h-screen bg-[#eef3fb]">
      <nav className="bg-[#032e65] shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-3 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white">📊 Mein Dashboard</h1>
          </div>
          <button
            onClick={handleLogout}
            className="bg-white text-red-600 px-4 py-2 rounded-lg hover:bg-red-50 font-medium"
          >
            Abmelden
          </button>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-8">

        {/* Nächste Stunde */}
        {nextLesson && (
          <div className={`rounded-lg shadow-lg p-5 border-l-4 mb-8 ${nextLesson.is_changed ? 'bg-red-50 border-red-500' : 'bg-white border-[#032e65]'}`}>
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">📅 Nächste Stunde</p>
                <p className={`text-xl font-bold ${nextLesson.is_changed ? 'text-red-700' : 'text-[#032e65]'}`}>
                  {new Date(nextLesson.date + 'T12:00:00').toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })}
                </p>
                <p className={`text-lg font-semibold mt-0.5 ${nextLesson.is_changed ? 'text-red-600' : 'text-gray-700'}`}>
                  {nextLesson.start_time} Uhr &middot; {nextLesson.duration_minutes} Min.
                  {nextLesson.is_changed && (
                    <span className="ml-2 text-sm font-normal text-red-500">(geändert von {nextLesson.standard_time} Uhr)</span>
                  )}
                </p>
              </div>
              {nextLesson.is_changed && (
                <span className="text-xs bg-red-500 text-white px-2 py-1 rounded-full font-semibold self-start">⚠ Geänderter Termin</span>
              )}
            </div>
            {nextLesson.notes && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <p className="text-sm font-semibold text-gray-600 mb-1">📝 Bis dahin erledigen:</p>
                <p className="text-sm text-gray-800 whitespace-pre-wrap">{nextLesson.notes}</p>
              </div>
            )}
          </div>
        )}

        {/* Accordion Navigation */}
        <div className="bg-white rounded-lg shadow-lg mb-8 overflow-hidden">
          <div className="divide-y divide-gray-200">
            <button
              onClick={() => toggleSection('quizzes')}
              className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition text-left font-semibold text-gray-800"
            >
              <span>📝 Verfügbare Quizzes</span>
              <span className={`transform transition ${openSections.quizzes ? 'rotate-180' : ''}`}>▼</span>
            </button>
            <button
              onClick={() => toggleSection('results')}
              className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition text-left font-semibold text-gray-800"
            >
              <span>📈 Ergebnisse</span>
              <span className={`transform transition ${openSections.results ? 'rotate-180' : ''}`}>▼</span>
            </button>
            <button
              onClick={() => toggleSection('availableDocuments')}
              className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition text-left font-semibold text-gray-800"
            >
              <span>📚 Verfügbare Dokumente (Probetests, Übersichten)</span>
              <span className={`transform transition ${openSections.availableDocuments ? 'rotate-180' : ''}`}>▼</span>
            </button>
            <button
              onClick={() => toggleSection('uploadDocuments')}
              className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition text-left font-semibold text-gray-800"
            >
              <span>📤 Dokumente hochladen (Tests, ...)</span>
              <span className={`transform transition ${openSections.uploadDocuments ? 'rotate-180' : ''}`}>▼</span>
            </button>
          </div>
        </div>

        {/* Content Sections */}
        <div className="space-y-8">
          {openSections.quizzes && (
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-2xl font-bold mb-4 text-[#032e65]">📝 Verfügbare Quizzes</h2>
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
            </div>
          )}

          {openSections.results && (
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-2xl font-bold mb-4 text-[#032e65]">📈 Ergebnisse</h2>
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
            </div>
          )}

          {openSections.availableDocuments && (
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-2xl font-bold mb-4 text-[#032e65]">📚 Verfügbare Dokumente (Probetests, Übersichten)</h2>
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
            </div>
          )}

          {openSections.uploadDocuments && (
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-2xl font-bold mb-6 text-[#032e65]">📤 Dokumente hochladen (Tests, ...)</h2>
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
            </div>
          )}
        </div>
      </div>

      {/* Detail-Modal */}
      {(detailLoading || detailResult) && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
          onClick={() => setDetailResult(null)}
        >
          <div
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
                      const isCorrect = studentAnswer === q.correctAnswer;
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
          </div>
        </div>
      )}
    </div>
  );
}
