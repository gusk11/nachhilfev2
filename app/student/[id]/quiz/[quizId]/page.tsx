'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import RichContent from '@/app/components/RichContent';

interface QuizOption {
  letter: string;
  html: string;
}

interface Question {
  id: string;
  type: 'multiple' | 'true-false';
  text: string;
  options?: QuizOption[];
  correctAnswer?: string | boolean;
  explanation?: string;
}

interface QuizData {
  title: string;
  questions: Question[];
}

export default function QuizPage() {
  const params = useParams();
  const router = useRouter();
  const studentId = params.id as string;
  const quizId = params.quizId as string;

  const [quiz, setQuiz] = useState<QuizData | null>(null);
  const [answers, setAnswers] = useState<Record<string, string | boolean>>({});
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);

  useEffect(() => {
    fetchQuiz();
  }, [quizId]);

  const fetchQuiz = async () => {
    try {
      const res = await fetch(`/api/quizzes/${quizId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.questions?.length > 0) {
          setQuiz(data);
        }
      }
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerChange = (questionId: string, value: string | boolean) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const calculateScore = () => {
    if (!quiz) return 0;
    let correct = 0;
    quiz.questions.forEach((q) => {
      if (answers[q.id] === q.correctAnswer) correct++;
    });
    return Math.round((correct / quiz.questions.length) * 100);
  };

  const handleSubmit = async () => {
    const finalScore = calculateScore();
    setScore(finalScore);
    setSubmitted(true);
    try {
      await fetch('/api/results', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quizId: parseInt(quizId), score: finalScore, answers }),
      });
    } catch (err) {
      console.error('Submit error:', err);
    }
  };

  if (loading) return <div className="flex justify-center items-center h-screen">Lädt...</div>;
  if (!quiz) return <div className="flex justify-center items-center h-screen">Quiz nicht gefunden</div>;

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#032e65] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
          <div className="text-5xl mb-4">🎉</div>
          <h1 className="text-5xl font-bold text-[#032e65] mb-2">{score}%</h1>
          <p className="text-xl text-gray-600 mb-6">Quiz abgeschlossen!</p>
          <button
            onClick={() => router.push(`/student/${studentId}`)}
            className="w-full bg-[#032e65] text-white py-3 rounded-lg font-medium hover:bg-[#021d40] transition"
          >
            Zurück zum Dashboard
          </button>
        </div>
      </div>
    );
  }

  const q = quiz.questions[currentQuestion];
  if (!q) return <div className="flex justify-center items-center h-screen text-gray-600">Frage konnte nicht geladen werden.</div>;
  const progress = Math.round(((currentQuestion + 1) / quiz.questions.length) * 100);

  return (
    <div className="min-h-screen bg-[#eef3fb] p-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-2xl font-bold mb-4 text-gray-800">{quiz.title}</h1>
          <div className="mb-6">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>Frage {currentQuestion + 1} von {quiz.questions.length}</span>
              <span>{progress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-[#032e65] h-2 rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <div className="mb-6 text-xl font-semibold text-gray-800">
            <RichContent html={q.text} />
          </div>

          {q.type === 'multiple' && q.options && (
            <div className="space-y-3 mb-6">
              {q.options.map((opt) => (
                <label
                  key={opt.letter}
                  className="flex items-start p-3 border rounded-lg cursor-pointer hover:bg-[#eef3fb]"
                >
                  <input
                    type="radio"
                    name="answer"
                    value={opt.letter}
                    checked={answers[q.id] === opt.letter}
                    onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                    className="mr-3 mt-1"
                  />
                  <span className="text-gray-900 flex-1">
                    <span className="font-semibold mr-2">{opt.letter})</span>
                    <RichContent html={opt.html} className="inline-block align-middle" />
                  </span>
                </label>
              ))}
            </div>
          )}

          {q.type === 'true-false' && (
            <div className="space-y-3 mb-6">
              {[true, false].map((value) => (
                <label key={String(value)} className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-[#eef3fb]">
                  <input
                    type="radio"
                    name="answer"
                    value={String(value)}
                    checked={answers[q.id] === value}
                    onChange={(e) => handleAnswerChange(q.id, e.target.value === 'true')}
                    className="mr-3"
                  />
                  <span className="text-gray-900">{value ? 'Wahr' : 'Falsch'}</span>
                </label>
              ))}
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => setCurrentQuestion(Math.max(0, currentQuestion - 1))}
              disabled={currentQuestion === 0}
              className="flex-1 bg-gray-400 text-white py-2 rounded-lg hover:bg-gray-500 disabled:opacity-50"
            >
              Zurück
            </button>

            {currentQuestion === quiz.questions.length - 1 ? (
              <button
                onClick={handleSubmit}
                className="flex-1 bg-green-500 text-white py-2 rounded-lg hover:bg-green-600"
              >
                Abschließen
              </button>
            ) : (
              <button
                onClick={() => setCurrentQuestion(currentQuestion + 1)}
                className="flex-1 bg-[#1565c0] text-white py-2 rounded-lg hover:bg-[#0d47a1]"
              >
                Weiter
              </button>
            )}
          </div>

          <div className="mt-4 pt-4 border-t border-gray-100">
            <button
              onClick={() => {
                if (window.confirm('Test wirklich abbrechen? Dein Fortschritt wird nicht gespeichert.')) {
                  router.push(`/student/${studentId}`);
                }
              }}
              className="w-full text-sm text-gray-500 hover:text-red-600 py-2 transition-colors"
            >
              Test abbrechen
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
