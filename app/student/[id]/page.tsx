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
  const [loading, setLoading] = useState(true);
  const [detailResult, setDetailResult] = useState<DetailResult | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, [studentId]);

  const fetchData = async () => {
    try {
      const quizzesRes = await fetch(`/api/quizzes/student/${studentId}`);
      const resultsRes = await fetch('/api/results');

      if (quizzesRes.ok && resultsRes.ok) {
        setQuizzes(await quizzesRes.json());
        const { results } = await resultsRes.json();
        setResults(results);
      } else {
        router.push('/');
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
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-white">📊 Mein Dashboard</h1>
          <button
            onClick={handleLogout}
            className="bg-white text-red-600 px-4 py-2 rounded-lg hover:bg-red-50 font-medium"
          >
            Abmelden
          </button>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
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

          <div>
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
