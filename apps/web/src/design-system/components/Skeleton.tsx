/** Loading placeholders. */

import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from '@core/lib/cn';

interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded';
}

export const Skeleton = forwardRef<HTMLDivElement, SkeletonProps>(function Skeleton({ className, variant = 'rectangular', ...props }, ref) {
  return (
    <div
      ref={ref}
      aria-hidden
      className={cn(
        'animate-pulse bg-slate-200',
        variant === 'text' && 'h-4 w-full rounded',
        variant === 'circular' && 'rounded-full',
        variant === 'rectangular' && 'rounded-lg',
        variant === 'rounded' && 'rounded-2xl',
        className,
      )}
      {...props}
    />
  );
});

export function SkeletonCard() {
  return (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex items-center gap-3">
        <Skeleton variant="circular" className="h-10 w-10" />
        <div className="flex-1 space-y-2">
          <Skeleton variant="text" className="w-1/2" />
          <Skeleton variant="text" className="w-1/3" />
        </div>
      </div>
      <Skeleton className="h-20" />
    </div>
  );
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-4">
          <Skeleton variant="circular" className="h-8 w-8" />
          <div className="flex-1 space-y-2">
            <Skeleton variant="text" className="w-2/5" />
            <Skeleton variant="text" className="w-1/4" />
          </div>
          <Skeleton className="h-6 w-16" />
        </div>
      ))}
    </div>
  );
}
