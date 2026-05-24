'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

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
    <div
      className="min-h-screen flex items-center justify-center px-6 py-12 relative overflow-hidden"
      style={{
        background:
          'radial-gradient(ellipse at top, #0a3b80 0%, #021d40 60%, #010d20 100%)',
      }}
    >
      <div
        aria-hidden
        className="absolute inset-0 opacity-30 pointer-events-none"
        style={{
          backgroundImage:
            'radial-gradient(rgba(255,255,255,0.25) 1px, transparent 1px)',
          backgroundSize: '22px 22px',
          maskImage:
            'radial-gradient(ellipse at center, black 30%, transparent 80%)',
          WebkitMaskImage:
            'radial-gradient(ellipse at center, black 30%, transparent 80%)',
        }}
      />

      <div className="relative z-10 w-full max-w-md">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-gray-300 hover:text-white mb-6 transition-colors"
        >
          ← Zurück
        </Link>

        <div className="text-center mb-10">
          <span className="text-5xl block mb-3">🏫</span>
          <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
            Lehrer-Login
          </h1>
          <p className="text-gray-300 mt-2 text-sm">Melden Sie sich mit Ihrer PIN an</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="PIN eingeben"
            autoComplete="current-password"
            className="auth-field w-full px-5 py-4 bg-white/5 border border-white/20 hover:border-white/30 focus:border-white/60 backdrop-blur-md text-white placeholder-gray-400 rounded-full focus:outline-none transition-all"
            required
          />

          {error && (
            <div className="px-4 py-3 bg-red-500/15 border border-red-400/30 text-red-200 rounded-2xl text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-white text-[#021d40] py-4 rounded-full font-semibold hover:bg-gray-100 transition-all disabled:opacity-50 shadow-xl hover:scale-[1.02]"
          >
            {loading ? 'Wird angemeldet…' : 'Anmelden'}
          </button>
        </form>
      </div>
    </div>
  );
}
