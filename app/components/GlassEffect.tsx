'use client';

import React from 'react';

interface GlassEffectProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export const GlassEffect: React.FC<GlassEffectProps> = ({
  children,
  className = '',
  style = {},
}) => {
  const glassStyle = {
    boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37), inset 0 2px 2px 0 rgba(255,255,255,0.5)',
    transitionTimingFunction: 'cubic-bezier(0.175, 0.885, 0.32, 2.2)',
    ...style,
  };

  return (
    <div
      className={`relative flex font-semibold overflow-hidden text-white cursor-pointer transition-all duration-700 ${className}`}
      style={glassStyle}
    >
      {/* Glass Layers */}
      <div
        className="absolute inset-0 z-0 overflow-hidden rounded-2xl"
        style={{
          backdropFilter: 'blur(4px)',
          background: 'rgba(255, 255, 255, 0.1)',
          isolation: 'isolate',
        }}
      />
      <div
        className="absolute inset-0 z-10 rounded-2xl"
        style={{
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.2) 0%, rgba(255, 255, 255, 0.05) 100%)',
        }}
      />
      <div
        className="absolute inset-0 z-20 rounded-2xl overflow-hidden"
        style={{
          boxShadow:
            'inset 2px 2px 4px 0 rgba(255, 255, 255, 0.3), inset -1px -1px 2px 1px rgba(255, 255, 255, 0.1)',
        }}
      />

      {/* Content */}
      <div className="relative z-30 w-full">{children}</div>
    </div>
  );
};

export const GlassButton: React.FC<{
  children: React.ReactNode;
  onClick?: () => void;
  emoji?: string;
  label?: string;
  isOpen?: boolean;
}> = ({ children, onClick, emoji, label, isOpen }) => (
  <div
    onClick={onClick}
    className="group relative w-full"
  >
    <GlassEffect
      className={`rounded-2xl px-6 py-4 hover:px-7 hover:py-5 hover:rounded-3xl overflow-hidden transition-all duration-500 ${
        isOpen ? 'bg-white/20' : 'hover:bg-white/15'
      }`}
    >
      <div className="flex items-center justify-between transition-all duration-700">
        <div className="flex items-center gap-4">
          <span className="text-2xl transition-transform duration-500 group-hover:scale-110">
            {emoji}
          </span>
          <span className="text-lg font-semibold text-[#032e65]">{children}</span>
        </div>
        <span
          className={`text-xl text-[#032e65] transition-transform duration-500 ${
            isOpen ? 'rotate-180' : ''
          }`}
        >
          ▼
        </span>
      </div>
    </GlassEffect>

    {/* Hover Tooltip */}
    <div className="absolute left-0 right-0 -top-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
      <div className="text-center text-xs font-semibold text-white bg-[#032e65] px-3 py-1 rounded-full mx-auto w-fit">
        {label}
      </div>
    </div>
  </div>
);
