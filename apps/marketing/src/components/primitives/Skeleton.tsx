import { cn } from '@/lib/cn';

interface Props { className?: string; }

export function Skeleton({ className }: Props) {
  return (
    <div className={cn(
      'animate-pulse rounded-lg bg-gradient-to-r from-ink-100 via-ink-200 to-ink-100',
      'dark:from-ink-800 dark:via-ink-700 dark:to-ink-800',
      'bg-[length:200%_100%]',
      className,
    )} />
  );
}

export function SkeletonText({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-2.5">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className={cn('h-4', i === lines - 1 && 'w-2/3')} />
      ))}
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="rounded-2xl bg-white dark:bg-ink-800 p-6 ring-1 ring-inset ring-ink-100 dark:ring-ink-700/60 space-y-3">
      <Skeleton className="h-12 w-12 rounded-xl" />
      <Skeleton className="h-5 w-3/4" />
      <SkeletonText lines={2} />
    </div>
  );
}
