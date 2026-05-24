'use client';

import Link from 'next/link';

export default function Landing() {
  return (
    <div
      className="min-h-screen flex items-center justify-center px-6 py-12 relative overflow-hidden"
      style={{
        background:
          'radial-gradient(ellipse at top, #0a3b80 0%, #021d40 60%, #010d20 100%)',
      }}
    >
      {/* Dot-Pattern Overlay */}
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

      <div className="relative z-10 w-full max-w-md text-center">
        {/* Logo + Titel */}
        <div className="mb-12">
          <img
            src="/logo.png"
            alt="Nachhilfe Next LVL"
            className="w-28 h-28 mx-auto mb-6 object-contain drop-shadow-2xl"
          />
          <h1 className="text-4xl sm:text-5xl font-bold text-white tracking-tight">
            Nachhilfe Next LVL
          </h1>
          <p className="text-gray-300 mt-3 text-base">
            Wähle deinen Bereich
          </p>
        </div>

        {/* Login-Buttons */}
        <div className="space-y-4">
          <Link
            href="/schueler"
            className="group flex items-center justify-center gap-3 w-full bg-white/5 hover:bg-white/10 border border-white/20 hover:border-white/40 backdrop-blur-md text-white py-4 px-6 rounded-full transition-all duration-300 hover:scale-[1.02] shadow-xl"
          >
            <span className="text-2xl">🎓</span>
            <span className="text-lg font-semibold">Login als Schüler</span>
          </Link>

          <Link
            href="/lehrer"
            className="group flex items-center justify-center gap-3 w-full bg-white/5 hover:bg-white/10 border border-white/20 hover:border-white/40 backdrop-blur-md text-white py-4 px-6 rounded-full transition-all duration-300 hover:scale-[1.02] shadow-xl"
          >
            <span className="text-2xl">🏫</span>
            <span className="text-lg font-semibold">Login als Lehrer</span>
          </Link>
        </div>

        <p className="text-xs text-gray-400 mt-10">
          © {new Date().getFullYear()} Nachhilfe Next LVL
        </p>
      </div>
    </div>
  );
}
