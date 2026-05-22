'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

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
  const [loading, setLoading] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [quizTitle, setQuizTitle] = useState('');
  const [selectedStudent, setSelectedStudent] = useState('');
  const [uploading, setUploading] = useState(false);
  const [detailResult, setDetailResult] = useState<DetailResult | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [pinModal, setPinModal] = useState<{ id: number; name: string } | null>(null);
  const [newPin, setNewPin] = useState('');
  const [pinSaving, setPinSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const studentsRes = await fetch('/api/students', { credentials: 'include' });
      const resultsRes = await fetch('/api/results/all', { credentials: 'include' });

      if (studentsRes.status === 401) {
        router.push('/lehrer');
        return;
      }

      if (studentsRes.ok) setStudents(await studentsRes.json());
      if (resultsRes.ok) setResults(await resultsRes.json());
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

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

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !quizTitle) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', quizTitle);
      if (selectedStudent) {
        formData.append('studentId', selectedStudent);
      }

      const res = await fetch('/api/quizzes/upload', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        setFile(null);
        setQuizTitle('');
        setSelectedStudent('');
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

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/lehrer');
  };

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Lädt...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-800">Lehrer-Dashboard</h1>
          <button
            onClick={handleLogout}
            className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600"
          >
            Abmelden
          </button>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
              <h2 className="text-2xl font-bold mb-6 text-gray-800">Quiz hochladen</h2>
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
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    JSON-Datei auswählen
                  </label>
                  <input
                    type="file"
                    accept=".json"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Für Schüler (optional)
                  </label>
                  <select
                    value={selectedStudent}
                    onChange={(e) => setSelectedStudent(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="">Für alle Schüler</option>
                    {students.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={uploading || !file || !quizTitle}
                  className="w-full bg-purple-500 text-white py-2 rounded-lg font-medium hover:bg-purple-600 transition disabled:opacity-50"
                >
                  {uploading ? 'Wird hochgeladen...' : 'Quiz hochladen'}
                </button>
              </form>
            </div>

            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-2xl font-bold mb-6 text-gray-800">Ergebnisse</h2>
              <p className="text-sm text-gray-500 mb-3">Zeile anklicken für Einzelauswertung</p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100 border-b">
                    <tr>
                      <th className="px-4 py-2 text-left font-semibold text-gray-700">Schüler</th>
                      <th className="px-4 py-2 text-left font-semibold text-gray-700">Quiz</th>
                      <th className="px-4 py-2 text-left font-semibold text-gray-700">Punktzahl</th>
                      <th className="px-4 py-2 text-left font-semibold text-gray-700">Datum</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((r) => (
                      <tr
                        key={r.id}
                        className="border-b hover:bg-purple-50 cursor-pointer transition"
                        onClick={() => fetchResultDetail(r.id)}
                      >
                        <td className="px-4 py-2 text-gray-800">{r.name}</td>
                        <td className="px-4 py-2 text-gray-800">{r.title}</td>
                        <td className="px-4 py-2 text-green-600 font-semibold">
                          {Number(r.score).toFixed(1)}%
                        </td>
                        <td className="px-4 py-2 text-gray-600">
                          {new Date(r.completed_at).toLocaleDateString('de-DE')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {results.length === 0 && (
                  <p className="text-center py-8 text-gray-500">Noch keine Ergebnisse</p>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold mb-6 text-gray-800">Registrierte Schüler</h2>
            <div className="space-y-2">
              {students.map((s) => (
                <div key={s.id} className="p-3 bg-gray-50 rounded-lg">
                  <p className="font-semibold text-gray-800">{s.name}</p>
                  <p className="text-sm text-gray-500 mb-2">
                    Seit {new Date(s.created_at).toLocaleDateString('de-DE')}
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setPinModal({ id: s.id, name: s.name }); setNewPin(''); }}
                      className="flex-1 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200 transition"
                    >
                      PIN ändern
                    </button>
                    <button
                      onClick={() => handleDeleteStudent(s.id, s.name)}
                      className="flex-1 text-xs bg-red-100 text-red-700 px-2 py-1 rounded hover:bg-red-200 transition"
                    >
                      Löschen
                    </button>
                  </div>
                </div>
              ))}
              {students.length === 0 && (
                <p className="text-gray-500">Noch keine Schüler registriert</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* PIN-Modal */}
      {pinModal && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
          onClick={() => setPinModal(null)}
        >
          <div
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
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 mb-4"
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
                className="flex-1 bg-purple-500 text-white py-2 rounded-lg hover:bg-purple-600 disabled:opacity-50"
              >
                {pinSaving ? 'Speichert...' : 'Speichern'}
              </button>
            </div>
          </div>
        </div>
      )}

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
                  <div>
                    <h2 className="text-xl font-bold text-gray-800">{detailResult.quiz_title}</h2>
                    <p className="text-gray-500 text-sm">{detailResult.student_name}</p>
                  </div>
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
          </div>
        </div>
      )}
    </div>
  );
}
