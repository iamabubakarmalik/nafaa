/** Small building blocks shared by the distribution screens. */

import type { ReactNode } from 'react';
import { cn } from '@core/lib/cn';
import { TONE_CLASS, type Tone } from '../lib/meta';

export function Pill({ tone, children, className }: { tone: Tone; children: ReactNode; className?: string }) {
  return <span className={cn('inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-[0.6875rem] font-semibold', TONE_CLASS[tone], className)}>{children}</span>;
}

export function Panel({ title, sub, right, children, className, flush }: {
  title?: ReactNode; sub?: ReactNode; right?: ReactNode; children: ReactNode; className?: string; flush?: boolean;
}) {
  return (
    <section className={cn('rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80', className)}>
      {(title || right) && (
        <header className="flex items-start justify-between gap-2 px-4 pt-4 sm:px-5">
          <div className="min-w-0 flex-1">
            {title && <h2 className="text-[0.9375rem] font-semibold text-slate-900">{title}</h2>}
            {sub && <p className="text-[0.75rem] text-slate-500">{sub}</p>}
          </div>
          {right && <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">{right}</div>}
        </header>
      )}
      <div className={cn(!flush && 'p-4 sm:p-5', flush && (title || right) && 'pt-3')}>{children}</div>
    </section>
  );
}

export function Empty({ icon, text, action }: { icon?: ReactNode; text: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      {icon && <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">{icon}</span>}
      <p className="max-w-sm text-[0.8125rem] text-slate-500">{text}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/** Label / value pair for detail cards. */
export function Fact({ label, children, className }: { label: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div className={cn('min-w-0', className)}>
      <div className="text-[0.6875rem] font-semibold uppercase tracking-wide text-slate-400">{label}</div>
      <div className="mt-0.5 break-words text-[0.875rem] text-slate-900">{children}</div>
    </div>
  );
}

/** Dark sticky bar for bulk actions on selected rows. */
export function BulkBar({ children }: { children: ReactNode }) {
  return (
    <div className="sticky bottom-2 z-10 m-3 mr-16 flex flex-wrap items-center gap-2 rounded-2xl bg-slate-900 px-3 py-2 text-white shadow-lg sm:m-4 sm:mr-20">
      {children}
    </div>
  );
}
