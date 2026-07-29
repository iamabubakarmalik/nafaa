import { cn } from '@/lib/cn';
import type { ReactNode } from 'react';

type BadgeVariant = 'brand' | 'aurora' | 'gold' | 'ink' | 'live' | 'pk';
type BadgeSize = 'xs' | 'sm' | 'md';

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  size?: BadgeSize;
  pulse?: boolean;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  brand: 'bg-brand-100 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300 ring-brand-200 dark:ring-brand-800/50',
  aurora: 'bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 ring-purple-200 dark:ring-purple-800/50',
  gold: 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 ring-amber-200 dark:ring-amber-800/50',
  ink: 'bg-ink-100 text-ink-700 dark:bg-ink-800 dark:text-ink-200 ring-ink-200 dark:ring-ink-700',
  live: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 ring-emerald-200 dark:ring-emerald-800/50',
  pk: 'bg-emerald-100 text-pk-green dark:bg-emerald-950/60 dark:text-emerald-300 ring-emerald-200 dark:ring-emerald-800/50',
};

const sizeClasses: Record<BadgeSize, string> = {
  xs: 'text-[10px] px-2 py-0.5 gap-1',
  sm: 'text-xs px-2.5 py-1 gap-1.5',
  md: 'text-sm px-3 py-1.5 gap-2',
};

export function Badge({ children, variant = 'brand', size = 'sm', pulse, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-bold ring-1 ring-inset whitespace-nowrap',
        variantClasses[variant],
        sizeClasses[size],
        pulse && 'relative',
        className,
      )}
    >
      {pulse && (
        <span className="absolute left-1.5 top-1/2 -translate-y-1/2 h-1.5 w-1.5 rounded-full bg-current animate-pulse" />
      )}
      {children}
    </span>
  );
}
