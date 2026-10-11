/**
 * Card: the standard surface for grouped content, with optional header
 * (title, description, actions) and footer.
 */

import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@core/lib/cn';

interface CardProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  footer?: ReactNode;
  /** No inner padding — for tables and lists that run edge to edge. */
  flush?: boolean;
}

export function Card({ title, description, actions, footer, flush, className, children, ...props }: CardProps) {
  const hasHeader = title || description || actions;
  return (
    <section className={cn('rounded-xl border border-slate-200 bg-white shadow-sm', className)} {...props}>
      {hasHeader && (
        <header className={cn('flex flex-wrap items-start justify-between gap-3', flush ? 'px-4 pt-4 sm:px-5' : 'px-4 pt-4 sm:px-5 sm:pt-5')}>
          <div className="min-w-0">
            {title && <h2 className="text-[0.9375rem] font-semibold text-slate-900">{title}</h2>}
            {description && <p className="mt-0.5 text-[0.8125rem] text-slate-500">{description}</p>}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className={cn(!flush && 'p-4 sm:p-5', flush && hasHeader && 'mt-3')}>{children}</div>
      {footer && <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-200 px-4 py-3 sm:px-5">{footer}</footer>}
    </section>
  );
}
