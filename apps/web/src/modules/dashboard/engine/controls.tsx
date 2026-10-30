/**
 * Compact controls for widget toolbars: a pill-style native select and a
 * hook that remembers each widget's choices on this device.
 */

import { useCallback, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { useAuthStore } from '@core/stores/auth.store';
import { cn } from '@core/lib/cn';
import { t } from '@core/i18n';

export interface MiniOption { value: string; label: string }

export function MiniSelect({ label, value, onChange, options, className }: {
  label: string; value: string; onChange: (v: string) => void; options: MiniOption[]; className?: string;
}) {
  return (
    <label className={cn('relative inline-flex', className)}>
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        title={label}
        className="h-8 max-w-[11rem] cursor-pointer appearance-none truncate rounded-lg border border-slate-200 bg-white py-0 ps-2.5 pe-7 text-[0.75rem] font-medium text-slate-700 outline-none transition hover:border-slate-300 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
      >
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <ChevronDown className="pointer-events-none absolute end-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
    </label>
  );
}

/** Widget control state kept per user on this device (a convenience, not shared). */
export function useWidgetState<T extends Record<string, string>>(widgetId: string, initial: T) {
  const userId = useAuthStore((s) => s.user?.id ?? 'anon');
  const key = `nafaa-widget:${userId}:${widgetId}`;
  const [state, setState] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? { ...initial, ...JSON.parse(raw) } : initial;
    } catch {
      return initial;
    }
  });
  const set = useCallback((patch: Partial<T>) => {
    setState((prev) => {
      const next = { ...prev, ...patch } as T;
      try { localStorage.setItem(key, JSON.stringify(next)); } catch { /* private window */ }
      return next;
    });
  }, [key]);
  return [state, set] as const;
}

export const LIMIT_OPTIONS: MiniOption[] = [
  { value: '5', label: t('Top 5') }, { value: '10', label: t('Top 10') }, { value: '20', label: t('Top 20') }, { value: '50', label: t('Top 50') },
];

export const PERIOD_OPTIONS: MiniOption[] = [
  { value: '1', label: t('Aaj') }, { value: '7', label: t('7 din') }, { value: '30', label: t('30 din') }, { value: '90', label: t('90 din') },
];

export const periodLabel = (days: string) => (days === '1' ? t('Aaj') : t('Pichhle {{days}} din', { days }));
