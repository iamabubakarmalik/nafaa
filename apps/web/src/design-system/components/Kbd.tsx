/** Keyboard shortcut hint, e.g. <Kbd>Ctrl K</Kbd>. */

import type { ReactNode } from 'react';
import { cn } from '@core/lib/cn';

export function Kbd({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <kbd className={cn(
      'inline-flex h-5 min-w-5 items-center justify-center rounded-md border border-slate-200 bg-slate-50 px-1.5 font-sans text-[0.6875rem] font-semibold text-slate-500',
      className,
    )}>
      {children}
    </kbd>
  );
}
