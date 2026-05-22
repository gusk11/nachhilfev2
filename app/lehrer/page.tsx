'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function TeacherLogin() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/teacher/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Login fehlgeschlagen');
        return;
      }

      router.push('/lehrer/dashboard');
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
          <div className="text-4xl mb-2">🏫</div>
          <h1 className="text-3xl font-bold text-[#032e65]">Lehrer-Bereich</h1>
          <p className="text-gray-500 mt-1 text-sm">Bitte melden Sie sich an</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Passwort</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Passwort eingeben"
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
          <a
            href="/"
            className="block w-full text-center bg-[#eef3fb] text-[#032e65] border border-[#032e65] py-2 rounded-lg font-medium hover:bg-[#032e65] hover:text-white transition"
          >
            📐 Zum Schüler-Login
          </a>
        </div>
      </div>
    </div>
  );
}
