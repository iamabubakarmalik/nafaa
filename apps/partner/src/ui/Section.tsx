/** White rounded section with an optional title row, used on every page. */

import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export function Section({ title, action, children, className, flush }: { title?: ReactNode; action?: ReactNode; children: ReactNode; className?: string; flush?: boolean }) {
  return (
    <section className={cn('rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80', flush ? 'overflow-hidden' : 'p-4 sm:p-5', className)}>
      {(title || action) && (
        <div className={cn('flex items-center justify-between gap-3', flush ? 'px-4 pt-4 sm:px-5' : 'mb-3')}>
          {title && <h2 className="text-[0.9375rem] font-bold tracking-tight text-slate-900">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
