'use client';

import { useState, useEffect } from 'react';

// ==========================================
// Pure CSS Animated Glassmorphic Hero Element
// Replaces the old Three.js 3D icosahedron canvas
// ==========================================
export default function HeroOrb({ isScanning = false }) {
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  if (!hasMounted) {
    return (
      <div className="w-full h-[320px] md:h-[380px] flex items-center justify-center glass-card">
        <div className="relative flex items-center justify-center">
          <div className="w-12 h-12 border-2 border-glass-accent/20 border-t-glass-accent rounded-full animate-spin" />
          <span className="absolute text-xs font-medium text-glass-accent/60 animate-pulse">CGL</span>
        </div>
      </div>
    );
  }

  const scanClass = isScanning ? 'scanning-active' : '';

  return (
    <div className={`w-full h-[320px] md:h-[380px] relative glass-card overflow-hidden ${scanClass}`}>
      
      {/* === AMBIENT GRADIENT ORBS === */}
      <div className="absolute inset-0 flex items-center justify-center">
        {/* Primary orb */}
        <div 
          className={`absolute w-40 h-40 md:w-52 md:h-52 rounded-full ${
            isScanning 
              ? 'bg-gradient-to-br from-emerald-400/30 to-teal-500/20 animate-float-fast' 
              : 'bg-gradient-to-br from-indigo-500/25 to-purple-500/15 animate-float-slow'
          }`}
          style={{ filter: 'blur(40px)' }}
        />
        
        {/* Secondary orb */}
        <div 
          className={`absolute w-32 h-32 md:w-44 md:h-44 rounded-full translate-x-8 -translate-y-6 ${
            isScanning 
              ? 'bg-gradient-to-tr from-teal-400/25 to-green-400/15 animate-float-mid' 
              : 'bg-gradient-to-tr from-violet-500/20 to-fuchsia-400/10 animate-float-mid'
          }`}
          style={{ filter: 'blur(35px)' }}
        />
        
        {/* Tertiary orb */}
        <div 
          className={`absolute w-24 h-24 md:w-36 md:h-36 rounded-full -translate-x-10 translate-y-8 ${
            isScanning 
              ? 'bg-gradient-to-bl from-green-400/20 to-emerald-500/10 animate-float-slow' 
              : 'bg-gradient-to-bl from-blue-500/15 to-indigo-400/10 animate-float-fast'
          }`}
          style={{ filter: 'blur(30px)' }}
        />
      </div>

      {/* === CONCENTRIC RADAR RINGS === */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className={`w-36 h-36 md:w-48 md:h-48 rounded-full border ${
          isScanning ? 'border-glass-success/20' : 'border-glass-accent/10'
        } animate-pulse-glow`} />
        <div className={`absolute w-52 h-52 md:w-64 md:h-64 rounded-full border ${
          isScanning ? 'border-glass-success/10' : 'border-glass-accent/5'
        } animate-pulse-glow`} style={{ animationDelay: '1s' }} />
        <div className={`absolute w-72 h-72 md:w-80 md:h-80 rounded-full border ${
          isScanning ? 'border-glass-success/5' : 'border-white/[0.03]'
        } animate-pulse-glow`} style={{ animationDelay: '2s' }} />
      </div>

      {/* === ROTATING SWEEP LINE === */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className={`w-40 h-40 md:w-48 md:h-48 ${isScanning ? 'animate-spin' : 'animate-spin-slow'}`}>
          <div 
            className={`w-1/2 h-[1px] origin-right ${
              isScanning 
                ? 'bg-gradient-to-l from-glass-success/50 to-transparent' 
                : 'bg-gradient-to-l from-glass-accent/30 to-transparent'
            }`}
            style={{ position: 'absolute', top: '50%', right: '50%' }}
          />
        </div>
      </div>

      {/* === CENTER GLASSMORPHIC STATUS BADGE === */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="glass-card px-5 py-3 !rounded-2xl text-center">
          <div className={`text-2xl font-bold tracking-wider ${
            isScanning ? 'text-glass-success' : 'text-gradient'
          }`}>
            CGL
          </div>
          <div className={`text-[10px] font-medium tracking-[0.2em] uppercase mt-1 ${
            isScanning ? 'text-glass-success/70' : 'text-glass-muted'
          }`}>
            Core Engine
          </div>
        </div>
      </div>

      {/* === CORNER DECORATIVE ACCENTS === */}
      <div className="absolute top-3 left-4 text-[10px] font-medium text-white/20 tracking-wider z-20 pointer-events-none select-none">
        SYS v2.0 — ONLINE
      </div>

      {/* === BOTTOM STATUS INDICATOR === */}
      <div className="absolute bottom-3 right-4 text-xs z-20 pointer-events-none select-none flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full ${
          isScanning 
            ? 'bg-glass-success animate-ping' 
            : 'bg-glass-accent'
        }`} />
        <span className={`font-medium ${
          isScanning ? 'text-glass-success' : 'text-white/40'
        }`}>
          {isScanning ? 'Processing...' : 'Ready'}
        </span>
      </div>
    </div>
  );
}
