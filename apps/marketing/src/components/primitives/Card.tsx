'use client';

import { cn } from '@/lib/cn';
import { forwardRef, type HTMLAttributes, useRef, useState, type MouseEvent } from 'react';

type Variant = 'default' | 'glass' | 'gradient' | 'bordered' | 'elevated' | 'inverse' | 'aurora' | 'flat';

interface Props extends HTMLAttributes<HTMLDivElement> {
  variant?: Variant;
  interactive?: boolean;
  tilt?: boolean;
  glow?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const variants: Record<Variant, string> = {
  default:  'bg-ink-0 dark:bg-ink-800 ring-1 ring-inset ring-ink-200/60 dark:ring-ink-700/60',
  glass:    'glass',
  gradient: 'bg-gradient-brand text-white',
  bordered: 'bg-transparent ring-2 ring-inset ring-ink-200 dark:ring-ink-700',
  elevated: 'bg-ink-0 dark:bg-ink-800 shadow-card ring-1 ring-inset ring-ink-100 dark:ring-ink-700/50',
  inverse:  'bg-ink-950 dark:bg-white text-white dark:text-ink-900',
  aurora:   'bg-gradient-aurora text-white shadow-aurora-glow',
  flat:     'bg-ink-50 dark:bg-ink-800/50',
};

const paddings = {
  none: '',
  sm:   'p-4',
  md:   'p-6',
  lg:   'p-8',
};

export const Card = forwardRef<HTMLDivElement, Props>(
  ({ className, variant = 'default', interactive, tilt, glow, padding = 'md', children, ...props }, ref) => {
    const innerRef = useRef<HTMLDivElement | null>(null);
    const [rot, setRot] = useState({ x: 0, y: 0 });

    const handleMove = (e: MouseEvent<HTMLDivElement>) => {
      if (!tilt || !innerRef.current) return;
      const r = innerRef.current.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      setRot({ x: py * -6, y: px * 6 });
    };

    const reset = () => setRot({ x: 0, y: 0 });

    return (
      <div
        ref={(el) => {
          innerRef.current = el;
          if (typeof ref === 'function') ref(el);
          else if (ref) (ref as any).current = el;
        }}
        onMouseMove={handleMove}
        onMouseLeave={reset}
        className={cn(
          'relative rounded-2xl transition-all duration-300 ease-out-expo',
          variants[variant],
          paddings[padding],
          interactive && 'cursor-pointer hover:-translate-y-1 hover:shadow-card-hover',
          glow && 'hover:shadow-brand-glow',
          className,
        )}
        style={
          tilt
            ? {
                transform: `perspective(1000px) rotateX(${rot.x}deg) rotateY(${rot.y}deg)`,
                transformStyle: 'preserve-3d',
              }
            : undefined
        }
        {...props}
      >
        {children}
      </div>
    );
  },
);
Card.displayName = 'Card';
