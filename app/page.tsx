'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function StudentLogin() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/student/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, pin, mode: 'login' }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Login fehlgeschlagen');
        return;
      }

      const data = await res.json();
      router.push(`/student/${data.studentId}`);
    } catch {
      setError('Netzwerkfehler');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#032e65] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
        <div className="text-center mb-6">
          <img src="/logo.png" alt="Nachhilfe Next LVL" className="w-44 h-44 mx-auto mb-3 object-contain" />
          <h1 className="text-3xl font-bold text-[#032e65]">Nachhilfe Next LVL</h1>
          <p className="text-gray-500 mt-1 text-sm">Schüler-Login</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Dein Name"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#032e65]"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">PIN</label>
            <input
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="Deine PIN"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#032e65]"
              required
            />
          </div>

          {error && <div className="p-3 bg-red-100 text-red-700 rounded-lg text-sm">{error}</div>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#032e65] text-white py-2 rounded-lg font-medium hover:bg-[#021d40] transition disabled:opacity-50"
          >
            {loading ? 'Wird angemeldet...' : 'Anmelden'}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t">
          <p className="text-center text-gray-500 text-sm mb-3">Lehrer-Bereich:</p>
          <a
            href="/lehrer"
            className="block w-full text-center bg-[#eef3fb] text-[#032e65] border border-[#032e65] py-2 rounded-lg font-medium hover:bg-[#032e65] hover:text-white transition"
          >
            🏫 Zum Lehrer-Login
          </a>
        </div>
      </div>
    </div>
  );
}
