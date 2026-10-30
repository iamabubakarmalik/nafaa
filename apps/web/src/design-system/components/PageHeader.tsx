/**
 * Page header: optional back link, title, description, badges and actions.
 * Actions wrap below the title on narrow screens.
 */

import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@core/lib/cn';

interface PageHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  back?: { to: string; label: string };
  badge?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

export function PageHeader({ title, description, back, badge, actions, className }: PageHeaderProps) {
  return (
    <header className={cn('mb-5', className)}>
      {back && (
        <Link to={back.to} data-page-back aria-keyshortcuts="Escape" className="mb-2 inline-flex items-center gap-1.5 text-[0.8125rem] font-medium text-slate-500 transition hover:text-slate-900">
          <ArrowLeft className="h-4 w-4 rtl-flip" /> {back.label}
        </Link>
      )}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-[1.375rem]">{title}</h1>
            {badge}
          </div>
          {description && <p className="mt-1 max-w-2xl text-sm text-slate-500">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}
