/** Placeholder for empty lists and first-run screens. */

import type { ReactNode } from 'react';
import { cn } from '@core/lib/cn';

interface EmptyStateProps {
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center px-6 py-12 text-center', className)}>
      {icon && <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">{icon}</span>}
      <h3 className="text-[0.9375rem] font-semibold text-slate-900">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-[0.8125rem] text-slate-500">{description}</p>}
      {action && <div className="mt-4 flex flex-wrap justify-center gap-2">{action}</div>}
    </div>
  );
}
