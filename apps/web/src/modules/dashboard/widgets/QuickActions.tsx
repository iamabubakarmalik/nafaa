/** Shortcuts to the screens this industry uses most. */

import { Link } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import { WidgetCard } from '../engine/parts';

export interface QuickAction {
  to: string;
  icon: LucideIcon;
  label: string;
  hint?: string;
}

export function QuickActions({ useActions }: { useActions: () => QuickAction[] }) {
  const actions = useActions();
  return (
    <WidgetCard title="Jaldi kaam">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
        {actions.map((a) => (
          <Link
            key={a.to}
            to={a.to}
            className="group flex items-center gap-3 rounded-lg border border-slate-200 p-3 transition hover:border-brand-300 hover:bg-brand-50/40"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600 transition group-hover:bg-brand-600 group-hover:text-brand-fg">
              <a.icon className="h-4 w-4" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[0.8125rem] font-semibold text-slate-900">{a.label}</span>
              {a.hint && <span className="block truncate text-[0.75rem] text-slate-500">{a.hint}</span>}
            </span>
          </Link>
        ))}
      </div>
    </WidgetCard>
  );
}
