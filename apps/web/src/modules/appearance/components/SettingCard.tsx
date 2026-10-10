/**
 * One block on the Appearance page: title, short help text, where the
 * current value comes from, and a reset link when this layer overrides it.
 */

import type { ReactNode } from 'react';
import { RotateCcw } from 'lucide-react';
import type { ValueSource } from '../hooks/useAppearanceEditor';

const SOURCE_LABEL: Record<ValueSource, string> = {
  personal: 'Your choice',
  business: 'Business default',
  platform: 'Nafaa default',
  default: 'Nafaa default',
};

interface SettingCardProps {
  id?: string;
  title: string;
  description?: ReactNode;
  icon?: ReactNode;
  source?: ValueSource;
  /** Shown when the value is set in the layer being edited. */
  onReset?: () => void;
  children: ReactNode;
}

export function SettingCard({ id, title, description, icon, source, onReset, children }: SettingCardProps) {
  return (
    <section id={id} className="scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <header className="mb-4 flex items-start gap-3">
        {icon && <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">{icon}</span>}
        <div className="min-w-0 flex-1">
          <h2 className="text-[0.9375rem] font-semibold text-slate-900">{title}</h2>
          {description && <p className="mt-0.5 text-[0.8125rem] text-slate-500">{description}</p>}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {source && (
            <span className="hidden rounded-full bg-slate-100 px-2 py-0.5 text-[0.6875rem] font-medium text-slate-600 sm:inline">
              {SOURCE_LABEL[source]}
            </span>
          )}
          {onReset && (
            <button type="button" onClick={onReset}
              className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-[0.75rem] font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-900">
              <RotateCcw className="h-3.5 w-3.5" /> Reset
            </button>
          )}
        </div>
      </header>
      {children}
    </section>
  );
}
