/**
 * Settings-specific building blocks composed from design-system components:
 * section card with icon, switch row with icon, number box that can be
 * emptied while typing, choice cards, divider and links to related pages.
 * Plain inputs, selects, text areas, notes and pills come straight from
 * '@/design-system/components'.
 */

import { useEffect, useState, type ComponentType, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { Card, Field as DsField, Switch, controlClass } from '@/design-system/components';
import { cn } from '@core/lib/cn';

type Icon = ComponentType<{ className?: string }>;

/* ─── Field: label, hint and error around a custom control ─── */
export function Field({ label, hint, required, badge, error, children }: {
  label: string;
  hint?: string;
  required?: boolean;
  badge?: ReactNode;
  error?: string;
  children: ReactNode;
}) {
  return (
    <DsField
      label={badge ? <span className="inline-flex flex-wrap items-center gap-1.5">{label}{badge}</span> : label}
      hint={hint}
      error={error}
      required={required}
    >
      {() => children}
    </DsField>
  );
}

/* ─── Switch row with optional icon ─── */
export function Toggle({ checked, onChange, label, desc, disabled, icon: I }: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  desc?: ReactNode;
  disabled?: boolean;
  icon?: Icon;
}) {
  return (
    <div className="flex items-start gap-3 py-3">
      {I && (
        <span className={cn('mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition',
          checked ? 'bg-brand-50 text-brand-700' : 'bg-slate-100 text-slate-500', disabled && 'opacity-60')}>
          <I className="h-4 w-4" />
        </span>
      )}
      <Switch className="min-w-0 flex-1" label={label} description={desc} checked={checked} disabled={disabled}
        onChange={(e) => onChange(e.target.checked)} />
    </div>
  );
}

/* ─── Number box ─── */
// Keeps its own text while typing, so the box can be emptied and retyped.
export function NumberInput({ value, onChange, min, max, step = 1, disabled, prefix, suffix }: {
  value: number | null | undefined;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  prefix?: ReactNode;
  suffix?: ReactNode;
}) {
  const [text, setText] = useState(String(value ?? 0));
  useEffect(() => { if (Number(text) !== Number(value ?? 0)) setText(String(value ?? 0)); }, [value]); // eslint-disable-line react-hooks/exhaustive-deps
  const clamp = (n: number) => Math.min(max ?? Infinity, Math.max(min ?? -Infinity, n));
  return (
    <div className={cn(controlClass(), 'flex h-10 items-center focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/20',
      disabled && 'bg-slate-50 opacity-60')}>
      {prefix && <span className="select-none pl-3 text-sm font-medium text-slate-500">{prefix}</span>}
      <input type="number" inputMode="decimal" value={text} min={min} max={max} step={step} disabled={disabled}
        onChange={(e) => {
          setText(e.target.value);
          if (e.target.value !== '' && Number.isFinite(Number(e.target.value))) onChange(clamp(Number(e.target.value)));
        }}
        onBlur={() => { if (text === '') { setText(String(min ?? 0)); onChange(min ?? 0); } }}
        className="h-full w-full min-w-0 rounded-lg bg-transparent px-3 text-sm font-semibold tabular-nums text-slate-900 outline-none disabled:cursor-not-allowed" />
      {suffix && <span className="select-none pr-3 text-sm font-medium text-slate-500">{suffix}</span>}
    </div>
  );
}

/* ─── Choice cards ─── */
export function ChoiceGroup({ value, onChange, options, columns = 2 }: {
  value: string | number;
  onChange: (value: any) => void;
  options: Array<{ value: string | number; label: string; desc?: string; emoji?: string; icon?: Icon }>;
  columns?: 1 | 2 | 3 | 4;
}) {
  const grid = { 1: 'grid-cols-1', 2: 'grid-cols-1 sm:grid-cols-2', 3: 'grid-cols-2 md:grid-cols-3', 4: 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4' }[columns];
  return (
    <div role="radiogroup" className={cn('grid gap-2', grid)}>
      {options.map((o) => {
        const on = String(value) === String(o.value);
        const I = o.icon;
        return (
          <button key={String(o.value)} type="button" role="radio" aria-checked={on} onClick={() => onChange(o.value)}
            className={cn('rounded-lg border p-3 text-left shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 active:scale-[0.99]',
              on ? 'border-brand-500 bg-brand-50 ring-1 ring-brand-500' : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50')}>
            <span className={cn('flex items-center gap-1.5 text-sm font-semibold', on ? 'text-brand-800' : 'text-slate-900')}>
              {o.emoji && <span className="text-base leading-none">{o.emoji}</span>}
              {I && <I className="h-4 w-4" />}
              {o.label}
            </span>
            {o.desc && <span className="mt-0.5 block text-xs leading-snug text-slate-500">{o.desc}</span>}
          </button>
        );
      })}
    </div>
  );
}

/* ─── Section card: DS Card with an icon tile in the header ─── */
type Tone = 'emerald' | 'blue' | 'amber' | 'violet' | 'rose' | 'pink' | 'cyan' | 'sky' | 'slate' | 'orange' | 'indigo';
const TONES: Record<Tone, string> = {
  emerald: 'bg-brand-50 text-brand-700', blue: 'bg-blue-50 text-blue-700', sky: 'bg-sky-50 text-sky-700',
  amber: 'bg-amber-50 text-amber-700', orange: 'bg-orange-50 text-orange-700', violet: 'bg-violet-50 text-violet-700',
  indigo: 'bg-indigo-50 text-indigo-700', rose: 'bg-rose-50 text-rose-700', pink: 'bg-pink-50 text-pink-700',
  cyan: 'bg-cyan-50 text-cyan-700', slate: 'bg-slate-100 text-slate-700',
};

export function SectionCard({ title, desc, icon: I, color = 'emerald', action, badge, children, id }: {
  title: string;
  desc?: ReactNode;
  icon?: Icon;
  color?: Tone;
  action?: ReactNode;
  badge?: ReactNode;
  children: ReactNode;
  id?: string;
}) {
  return (
    <Card id={id} data-setting-card={title} className="scroll-mt-24"
      actions={action}
      title={
        <span className="flex items-start gap-3">
          {I && <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', TONES[color])}><I className="h-[1.125rem] w-[1.125rem]" /></span>}
          <span className="min-w-0">
            <span className="flex flex-wrap items-center gap-2 leading-tight">{title}{badge}</span>
            {desc && <span className="mt-0.5 block text-[0.8125rem] font-normal leading-snug text-slate-500">{desc}</span>}
          </span>
        </span>
      }>
      {children}
    </Card>
  );
}

/* ─── Divider ─── */
export function Divider({ label }: { label?: string }) {
  if (!label) return <div className="my-3 h-px bg-slate-200" />;
  return (
    <div className="my-4 flex items-center gap-3">
      <span className="text-[0.6875rem] font-semibold uppercase tracking-wider text-slate-500">{label}</span>
      <span className="h-px flex-1 bg-slate-200" />
    </div>
  );
}

/* ─── Link to a related page ─── */
export function PageLink({ to, icon: I, title, desc }: { to: string; icon: Icon; title: string; desc?: string }) {
  return (
    <Link to={to} className="group flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2.5 shadow-sm transition hover:border-brand-300 hover:bg-brand-50">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600 transition group-hover:bg-brand-100 group-hover:text-brand-700">
        <I className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-slate-900">{title}</span>
        {desc && <span className="block truncate text-xs text-slate-500">{desc}</span>}
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-brand-600" />
    </Link>
  );
}
