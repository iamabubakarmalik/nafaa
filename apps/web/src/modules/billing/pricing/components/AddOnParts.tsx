/**
 * Small pieces of the add-on store: the icon tile, the state pill, the
 * quantity stepper and the add-on card used in the /apps grid.
 */

import type { ReactNode } from 'react';
import { CheckCircle2, Clock, Minus, Plus, Sparkles, XCircle } from 'lucide-react';
import { BrandLogo } from '@/assets/brands/BrandLogo';
import { cn } from '@core/lib/cn';
import { t } from '@core/i18n';
import type { CatalogAddOn } from '../api/pricing.api';
import { addOnPriceText, fmtDate, lookOf, type AddOnState } from '../lib/catalog-meta';

export function AddOnIcon({ addOnKey, size = 'md' }: { addOnKey: string; size?: 'sm' | 'md' | 'lg' }) {
  const look = lookOf(addOnKey);
  const box = size === 'lg' ? 'h-14 w-14 rounded-2xl' : size === 'sm' ? 'h-9 w-9 rounded-xl' : 'h-11 w-11 rounded-xl';
  const px = size === 'lg' ? 30 : size === 'sm' ? 18 : 24;
  if (look.brand && look.brand !== 'website') {
    return (
      <span className={cn('flex shrink-0 items-center justify-center bg-white ring-1 ring-slate-200', box)}>
        <BrandLogo name={look.brand} size={px} />
      </span>
    );
  }
  const Icon = look.icon;
  return (
    <span className={cn('flex shrink-0 items-center justify-center', box)} style={{ backgroundColor: `${look.color}17`, color: look.color }}>
      <Icon className={size === 'lg' ? 'h-7 w-7' : size === 'sm' ? 'h-4 w-4' : 'h-5 w-5'} />
    </span>
  );
}

const PILL: Record<AddOnState['tone'], string> = {
  success: 'bg-success-50 text-success-700 ring-success-200',
  info: 'bg-sky-50 text-sky-700 ring-sky-200',
  warning: 'bg-amber-50 text-amber-800 ring-amber-200',
  danger: 'bg-rose-50 text-rose-700 ring-rose-200',
  default: 'bg-slate-100 text-slate-600 ring-slate-200',
};

/** "Chalu", "Trial me free · 19 Nov" and so on; nothing for an add-on that is off. */
export function StatePill({ state, className }: { state: AddOnState; className?: string }) {
  if (state.id === 'off') return null;
  const Icon = state.tone === 'success' ? CheckCircle2 : state.tone === 'danger' ? XCircle : state.tone === 'info' ? Sparkles : Clock;
  const date = state.date ? fmtDate(state.date) : null;
  const text = state.id === 'trial' && date ? t('{{label}} · {{date}} tak', { label: state.label, date })
    : state.id === 'due' && date ? t('{{label}} · {{date}}', { label: state.label, date })
      : state.id === 'ending' && date ? t('{{label}} · {{date}}', { label: state.label, date })
        : state.id === 'on' && date ? t('{{label}} · {{date}} tak', { label: state.label, date })
          : state.label;
  return (
    <span className={cn('inline-flex max-w-full items-center gap-1 truncate rounded-full px-2 py-0.5 text-[0.71875rem] font-semibold ring-1 ring-inset', PILL[state.tone], className)}>
      <Icon className="h-3 w-3 shrink-0" />
      <span className="truncate">{text}</span>
    </span>
  );
}

export function QuantityStepper({ value, onChange, min = 1, max = 500, label }: { value: number; onChange: (n: number) => void; min?: number; max?: number; label: string }) {
  const set = (n: number) => onChange(Math.min(max, Math.max(min, Math.floor(n) || min)));
  return (
    <div className="inline-flex items-center rounded-xl bg-white ring-1 ring-slate-200" role="group" aria-label={label}>
      <button type="button" onClick={() => set(value - 1)} disabled={value <= min} aria-label={t('Kam karein')}
        className="flex h-9 w-9 items-center justify-center rounded-s-xl text-slate-600 transition hover:bg-slate-100 disabled:opacity-40">
        <Minus className="h-4 w-4" />
      </button>
      <input type="number" inputMode="numeric" value={value} min={min} max={max} aria-label={label}
        onChange={(e) => set(Number(e.target.value))}
        className="h-9 w-12 border-x border-slate-200 bg-transparent text-center text-[0.9375rem] font-bold tabular-nums text-slate-900 outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none" />
      <button type="button" onClick={() => set(value + 1)} disabled={value >= max} aria-label={t('Barhayein')}
        className="flex h-9 w-9 items-center justify-center rounded-e-xl text-slate-600 transition hover:bg-slate-100 disabled:opacity-40">
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}

/** One app in the /apps grid. The whole card opens the details sheet. */
export function AddOnCard({ addOn, state, onOpen, action }: { addOn: CatalogAddOn; state: AddOnState; onOpen: () => void; action: ReactNode }) {
  const soon = state.id === 'soon';
  return (
    <article className={cn(
      'group relative flex min-w-0 flex-col rounded-2xl bg-white p-4 shadow-sm ring-1 transition',
      state.active ? 'ring-success-200' : state.id === 'lapsed' ? 'ring-rose-200' : 'ring-slate-200/80',
      !soon && 'hover:-translate-y-0.5 hover:shadow-md',
    )}>
      <button type="button" onClick={onOpen} className="absolute inset-0 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500" aria-label={t('{{name}} ki tafseel', { name: t(addOn.name) })} />
      <div className="flex items-start gap-3">
        <AddOnIcon addOnKey={addOn.key} />
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[0.9375rem] font-bold text-slate-900">{t(addOn.name)}</h3>
          <p className="mt-0.5 text-[0.8125rem] font-semibold tabular-nums text-slate-700">{addOnPriceText(addOn)}</p>
        </div>
      </div>
      <p className="mt-2.5 line-clamp-2 min-h-[2.5rem] text-[0.8125rem] leading-snug text-slate-500">{addOn.description ? t(addOn.description) : ''}</p>
      <div className="relative mt-3 flex min-h-9 items-center justify-between gap-2">
        <div className="min-w-0">{state.id !== 'off' ? <StatePill state={state} /> : null}</div>
        <div className="relative shrink-0">{action}</div>
      </div>
    </article>
  );
}
