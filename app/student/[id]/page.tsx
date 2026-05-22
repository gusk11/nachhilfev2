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

export default function StudentDashboard() {
  const params = useParams();
  const studentId = params.id as string;
  const router = useRouter();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(true);

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

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/');
  };

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Lädt...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-800">Mein Dashboard</h1>
          <button
            onClick={handleLogout}
            className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600"
          >
            Abmelden
          </button>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <h2 className="text-2xl font-bold mb-4 text-gray-800">Verfügbare Quizzes</h2>
            <div className="space-y-3">
              {quizzes.length > 0 ? (
                quizzes.map((quiz) => (
                  <Link
                    key={quiz.id}
                    href={`/student/${studentId}/quiz/${quiz.id}`}
                    className="block p-4 bg-white rounded-lg shadow hover:shadow-md transition border-l-4 border-blue-500"
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
            <h2 className="text-2xl font-bold mb-4 text-gray-800">Ergebnisse</h2>
            <div className="space-y-3">
              {results.length > 0 ? (
                results.map((result) => (
                  <div
                    key={result.id}
                    className="p-4 bg-white rounded-lg shadow border-l-4 border-green-500"
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
    </div>
  );
}
