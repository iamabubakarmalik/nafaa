'use client';

import { useEffect, useRef, useState } from 'react';
import { useInView, useMotionValue, useTransform, animate } from 'framer-motion';
import { cn } from '@/lib/cn';

interface Props {
  value: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  format?: (v: number) => string;
  className?: string;
  decimals?: number;
}

export function Counter({ value, duration = 2, prefix = '', suffix = '', format, className, decimals = 0 }: Props) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  const [display, setDisplay] = useState('0');

  useEffect(() => {
    if (!inView) return;
    const mv = { current: 0 };
    const controls = animate(0, value, {
      duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (latest) => {
        mv.current = latest;
        const formatted = format
          ? format(latest)
          : latest.toLocaleString('en-PK', {
              minimumFractionDigits: decimals,
              maximumFractionDigits: decimals,
            });
        setDisplay(formatted);
      },
    });
    return () => controls.stop();
  }, [inView, value, duration, format, decimals]);

  return (
    <span ref={ref} className={cn('font-display tabular-nums', className)}>
      {prefix}{display}{suffix}
    </span>
  );
}
