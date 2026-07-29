'use client';

import { cn } from '@/lib/cn';

interface Props {
  variant?: 'brand' | 'aurora' | 'sunset' | 'pk';
  intensity?: 'subtle' | 'base' | 'intense';
  className?: string;
}

const configs = {
  brand: {
    subtle:  ['rgba(18,183,106,0.18)', 'rgba(6,182,212,0.14)', 'rgba(18,183,106,0.10)'],
    base:    ['rgba(18,183,106,0.35)', 'rgba(6,182,212,0.28)', 'rgba(18,183,106,0.20)'],
    intense: ['rgba(18,183,106,0.55)', 'rgba(6,182,212,0.42)', 'rgba(18,183,106,0.32)'],
  },
  aurora: {
    subtle:  ['rgba(139,92,246,0.18)', 'rgba(236,72,153,0.14)', 'rgba(6,182,212,0.14)'],
    base:    ['rgba(139,92,246,0.35)', 'rgba(236,72,153,0.28)', 'rgba(6,182,212,0.24)'],
    intense: ['rgba(139,92,246,0.55)', 'rgba(236,72,153,0.42)', 'rgba(6,182,212,0.36)'],
  },
  sunset: {
    subtle:  ['rgba(249,115,22,0.20)', 'rgba(245,158,11,0.16)', 'rgba(236,72,153,0.12)'],
    base:    ['rgba(249,115,22,0.38)', 'rgba(245,158,11,0.30)', 'rgba(236,72,153,0.22)'],
    intense: ['rgba(249,115,22,0.58)', 'rgba(245,158,11,0.44)', 'rgba(236,72,153,0.34)'],
  },
  pk: {
    subtle:  ['rgba(1,65,28,0.20)', 'rgba(18,183,106,0.16)', 'rgba(244,197,49,0.10)'],
    base:    ['rgba(1,65,28,0.38)', 'rgba(18,183,106,0.30)', 'rgba(244,197,49,0.16)'],
    intense: ['rgba(1,65,28,0.55)', 'rgba(18,183,106,0.42)', 'rgba(244,197,49,0.22)'],
  },
};

export function AuroraBackground({ variant = 'brand', intensity = 'base', className }: Props) {
  const [c1, c2, c3] = configs[variant][intensity];

  return (
    <div className={cn('absolute inset-0 overflow-hidden pointer-events-none', className)}>
      {/* Three floating blobs */}
      <div
        className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] rounded-full blur-3xl animate-aurora-drift"
        style={{ background: c1 }}
      />
      <div
        className="absolute top-[10%] right-[-15%] w-[60%] h-[60%] rounded-full blur-3xl animate-aurora-float"
        style={{ background: c2, animationDelay: '2s' }}
      />
      <div
        className="absolute bottom-[-20%] left-[20%] w-[65%] h-[65%] rounded-full blur-3xl animate-aurora-drift"
        style={{ background: c3, animationDelay: '4s' }}
      />
      {/* Subtle grain */}
      <div className="absolute inset-0 bg-noise opacity-[0.02] mix-blend-overlay" />
    </div>
  );
}
