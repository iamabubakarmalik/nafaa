import { HTMLAttributes, forwardRef } from 'react';
import { cn } from '@lib/cn';

interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded';
}

export const Skeleton = forwardRef<HTMLDivElement, SkeletonProps>(
  ({ className, variant = 'rectangular', ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'skeleton',
        variant === 'text' && 'h-4 w-full',
        variant === 'circular' && 'rounded-full',
        variant === 'rectangular' && 'rounded-lg',
        variant === 'rounded' && 'rounded-2xl',
        className,
      )}
      {...props}
    />
  ),
);
Skeleton.displayName = 'Skeleton';

export function SkeletonCard() {
  return (
    <div className="p-4 rounded-2xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 space-y-3">
      <div className="flex items-center gap-3">
        <Skeleton variant="circular" className="h-10 w-10" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3 w-1/2" />
          <Skeleton className="h-2.5 w-1/3" />
        </div>
      </div>
      <Skeleton className="h-24 w-full" />
      <div className="space-y-2">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-4/5" />
      </div>
    </div>
  );
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-neutral-800 overflow-hidden">
      <div className="p-4 bg-slate-50 dark:bg-neutral-900 border-b border-slate-200 dark:border-neutral-800">
        <Skeleton className="h-4 w-1/4" />
      </div>
      <div className="divide-y divide-slate-100 dark:divide-neutral-800">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="p-4 flex items-center gap-4">
            <Skeleton variant="circular" className="h-8 w-8" />
            <Skeleton className="h-3 flex-1" />
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
