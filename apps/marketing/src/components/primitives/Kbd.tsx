import { cn } from '@/lib/cn';
import type { ReactNode } from 'react';

export function Kbd({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <kbd className={cn(
      'inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md',
      'bg-ink-100 dark:bg-ink-800 border border-ink-200 dark:border-ink-700',
      'text-[10px] font-mono font-bold text-ink-700 dark:text-ink-200',
      'shadow-[inset_0_-1px_0_0_rgba(0,0,0,0.1)]',
      className,
    )}>
      {children}
    </kbd>
  );
}
