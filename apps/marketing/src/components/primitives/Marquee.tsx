'use client';

import { cn } from '@/lib/cn';
import type { ReactNode } from 'react';

interface Props {
  children: ReactNode;
  direction?: 'left' | 'right';
  speed?: 'slow' | 'base' | 'fast';
  pauseOnHover?: boolean;
  gradient?: boolean;
  className?: string;
}

const speeds = {
  slow: '60s',
  base: '40s',
  fast: '20s',
};

export function Marquee({
  children, direction = 'left', speed = 'base', pauseOnHover = true, gradient = true, className,
}: Props) {
  return (
    <div className={cn('group relative flex overflow-hidden', gradient && 'mask-fade-sides', className)}>
      <div
        className="flex shrink-0 gap-8 pr-8 items-center"
        style={{
          animation: `scrollX ${speeds[speed]} linear infinite`,
          animationDirection: direction === 'right' ? 'reverse' : 'normal',
          animationPlayState: pauseOnHover ? undefined : 'running',
        }}
      >
        {children}
        {children}
      </div>
      {pauseOnHover && (
        <style jsx>{`
          .group:hover > div {
            animation-play-state: paused;
          }
        `}</style>
      )}
    </div>
  );
}
