import { cn } from '@/lib/cn';
import type { ReactNode } from 'react';

interface Props {
  children?: ReactNode;
  variant?: 'default' | 'gradient' | 'dashed';
  className?: string;
}

export function Divider({ children, variant = 'default', className }: Props) {
  const line = variant === 'gradient'
    ? 'bg-gradient-to-r from-transparent via-ink-200 dark:via-ink-700 to-transparent'
    : variant === 'dashed'
      ? 'border-t border-dashed border-ink-200 dark:border-ink-700 bg-transparent'
      : 'bg-ink-100 dark:bg-ink-800';

  if (!children) {
    return <div className={cn('h-px my-8', line, className)} />;
  }

  return (
    <div className={cn('relative flex items-center my-8', className)}>
      <div className={cn('flex-1 h-px', line)} />
      <div className="px-4 text-xs font-mono uppercase tracking-widest font-bold text-ink-500">{children}</div>
      <div className={cn('flex-1 h-px', line)} />
    </div>
  );
}
