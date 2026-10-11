/**
 * "Aaj ka kaam": what needs doing now, most urgent first, each with a
 * button that goes straight to the right screen.
 */

import { Link } from 'react-router-dom';
import { CheckCircle2, type LucideIcon } from 'lucide-react';
import { cn } from '@core/lib/cn';
import { IconBubble, WidgetCard } from '../engine/parts';

export interface AttentionItem {
  icon: LucideIcon;
  level: 'danger' | 'warning' | 'info' | 'neutral';
  text: string;
  to: string;
  cta: string;
}

export function AttentionList({ items }: { items: AttentionItem[] }) {
  return (
    <WidgetCard
      title="Aaj ka kaam"
      description={items.length ? `${items.length} cheezein tawajjo maangti hain — sab se zaroori upar` : undefined}
      flush
    >
      {items.length === 0 ? (
        <div className="flex items-center gap-3 px-4 pb-4 sm:px-5">
          <IconBubble icon={CheckCircle2} tone="success" />
          <p className="text-[0.875rem] text-slate-600">Sab theek hai — koi kaam latka hua nahi.</p>
        </div>
      ) : (
        <ul className="divide-y divide-slate-100 pb-1">
          {items.map((t) => (
            <li key={t.text} className="flex items-center gap-3 px-4 py-2.5 sm:px-5">
              <IconBubble icon={t.icon} tone={t.level} />
              <p className="min-w-0 flex-1 text-[0.875rem] text-slate-800">{t.text}</p>
              <Link
                to={t.to}
                className={cn(
                  'shrink-0 rounded-md px-2.5 py-1.5 text-[0.75rem] font-semibold transition',
                  t.level === 'danger' ? 'bg-rose-600 text-white hover:bg-rose-700' : 'border border-slate-200 text-slate-700 hover:bg-slate-50',
                )}
              >
                {t.cta}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </WidgetCard>
  );
}
