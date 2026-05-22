'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';

interface Question {
  id: string;
  text: string;
  type: 'multiple' | 'text' | 'true-false';
  options?: string[];
  correctAnswer?: string | boolean;
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
  const [answers, setAnswers] = useState<Record<string, any>>({});
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

  const handleAnswerChange = (questionId: string, value: any) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: value,
    }));
  };

  const calculateScore = () => {
    let correct = 0;
    quiz?.questions.forEach((q) => {
      if (answers[q.id] === q.correctAnswer) {
        correct++;
      }
    });
    return Math.round((correct / quiz!.questions.length) * 100);
  };

  const handleSubmit = async () => {
    const finalScore = calculateScore();
    setScore(finalScore);
    setSubmitted(true);

    try {
      await fetch('/api/results', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quizId: parseInt(quizId), score: finalScore }),
      });
    } catch (err) {
      console.error('Submit error:', err);
    }
  };

  if (loading) return <div className="flex justify-center items-center h-screen">Lädt...</div>;
  if (!quiz) return <div className="flex justify-center items-center h-screen">Quiz nicht gefunden</div>;

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-500 to-blue-600 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full text-center">
          <h1 className="text-4xl font-bold text-green-600 mb-4">{score}%</h1>
          <p className="text-xl text-gray-800 mb-6">Quiz abgeschlossen!</p>
          <button
            onClick={() => router.push(`/student/${studentId}`)}
            className="w-full bg-blue-500 text-white py-2 rounded-lg font-medium hover:bg-blue-600"
          >
            Zurück zum Dashboard
          </button>
        </div>
      </div>
    );
  }

  const q = quiz.questions[currentQuestion];
  const progress = Math.round(((currentQuestion + 1) / quiz.questions.length) * 100);

  return (
    <div className="min-h-screen bg-gray-100 p-4">
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
                className="bg-blue-500 h-2 rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <h2 className="text-xl font-semibold mb-6 text-gray-800">{q.text}</h2>

          {q.type === 'multiple' && (
            <div className="space-y-3 mb-6">
              {q.options?.map((option) => (
                <label key={option} className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-blue-50">
                  <input
                    type="radio"
                    name="answer"
                    value={option}
                    checked={answers[q.id] === option}
                    onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                    className="mr-3"
                  />
                  <span>{option}</span>
                </label>
              ))}
            </div>
          )}

          {q.type === 'true-false' && (
            <div className="space-y-3 mb-6">
              {[true, false].map((value) => (
                <label key={String(value)} className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-blue-50">
                  <input
                    type="radio"
                    name="answer"
                    value={String(value)}
                    checked={answers[q.id] === value}
                    onChange={(e) => handleAnswerChange(q.id, e.target.value === 'true')}
                    className="mr-3"
                  />
                  <span>{value ? 'Wahr' : 'Falsch'}</span>
                </label>
              ))}
            </div>
          )}

          {q.type === 'text' && (
            <input
              type="text"
              value={answers[q.id] || ''}
              onChange={(e) => handleAnswerChange(q.id, e.target.value)}
              placeholder="Deine Antwort"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-6"
            />
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
                className="flex-1 bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600"
              >
                Weiter
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
