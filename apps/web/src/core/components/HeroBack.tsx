/**
 * Back arrow and title for a PageHero on a sub-page (e.g. Settings →
 * Hardware). Pass it as the hero's `title`.
 */

import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { t } from '@core/i18n';

export function HeroBack({ to, label, children }: { to: string; label: string; children: ReactNode }) {
  return (
    <span className="flex items-center gap-2.5">
      <Link to={to} data-page-back aria-keyshortcuts="Escape" aria-label={t('{{label}} par wapas', { label })} title={t('{{label}} par wapas', { label })}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/15 text-white ring-1 ring-white/25 transition hover:bg-white/25">
        <ArrowLeft className="h-4 w-4 rtl-flip" />
      </Link>
      {children}
    </span>
  );
}
