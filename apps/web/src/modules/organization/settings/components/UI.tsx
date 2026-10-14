/**
 * Building blocks for the settings sections: field, switch row, inputs,
 * choice cards, section card, pills, notes and links to related pages. Styled to match the design
 * system (thin borders, brand colour, auto dark mode through the palette).
 */

import { useEffect, useState, type ComponentType, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@core/lib/cn';

type Icon = ComponentType<{ className?: string }>;

/* ─── Field ─── */
export function Field({ label, hint, required, badge, error, children }: {
  label: string;
  hint?: string;
  required?: boolean;
  badge?: ReactNode;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="flex items-center gap-1.5 text-[0.8125rem] font-semibold text-slate-800">
        <span>{label}</span>
        {required && <span className="text-rose-600">*</span>}
        {badge}
      </label>
      {children}
      {error ? <p className="text-xs font-medium text-rose-600">{error}</p>
        : hint ? <p className="text-xs leading-snug text-slate-500">{hint}</p> : null}
    </div>
  );
}

/* ─── Switch row ─── */
export function Toggle({ checked, onChange, label, desc, disabled, icon: I }: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  desc?: ReactNode;
  disabled?: boolean;
  icon?: Icon;
}) {
  return (
    <label className={cn('-mx-2 flex items-center justify-between gap-4 rounded-xl px-2 py-3 transition',
      disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:bg-slate-50')}>
      <span className="flex min-w-0 flex-1 items-start gap-3">
        {I && (
          <span className={cn('mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition',
            checked ? 'bg-brand-50 text-brand-700' : 'bg-slate-100 text-slate-500')}>
            <I className="h-4 w-4" />
          </span>
        )}
        <span className="min-w-0">
          <span className="block text-sm font-semibold text-slate-900">{label}</span>
          {desc && <span className="mt-0.5 block text-xs leading-snug text-slate-500">{desc}</span>}
        </span>
      </span>
      <button type="button" role="switch" aria-checked={checked} aria-label={label} disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn('relative h-6 w-11 shrink-0 rounded-full transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:ring-offset-2',
          checked ? 'bg-brand-600' : 'bg-slate-300')}>
        <span className={cn('absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform', checked && 'translate-x-5')} />
      </button>
    </label>
  );
}

const box = 'flex items-center rounded-xl border border-slate-200 bg-white transition focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/15';
const affix = 'select-none text-sm font-medium text-slate-500';

/* ─── Text input ─── */
export function TextInput({ value, onChange, placeholder, type = 'text', disabled, maxLength, prefix, suffix, error, autoFocus, onBlur }: {
  value: string | null | undefined;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  disabled?: boolean;
  maxLength?: number;
  prefix?: ReactNode;
  suffix?: ReactNode;
  error?: string;
  autoFocus?: boolean;
  onBlur?: () => void;
}) {
  return (
    <div className={cn(box, error && 'border-rose-400 focus-within:border-rose-500 focus-within:ring-rose-500/15', disabled && 'bg-slate-50 opacity-70')}>
      {prefix && <span className={cn(affix, 'pl-3')}>{prefix}</span>}
      <input type={type} value={value ?? ''} onChange={(e) => onChange(e.target.value)} onBlur={onBlur}
        placeholder={placeholder} disabled={disabled} maxLength={maxLength} autoFocus={autoFocus}
        className="h-10 w-full bg-transparent px-3 text-sm text-slate-900 outline-none placeholder:text-slate-400" />
      {suffix && <span className={cn(affix, 'pr-3')}>{suffix}</span>}
    </div>
  );
}

/* ─── Number input ─── */
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
    <div className={cn(box, disabled && 'bg-slate-50 opacity-60')}>
      {prefix && <span className={cn(affix, 'pl-3')}>{prefix}</span>}
      <input type="number" inputMode="decimal" value={text} min={min} max={max} step={step} disabled={disabled}
        onChange={(e) => {
          setText(e.target.value);
          if (e.target.value !== '' && Number.isFinite(Number(e.target.value))) onChange(clamp(Number(e.target.value)));
        }}
        onBlur={() => { if (text === '') { setText(String(min ?? 0)); onChange(min ?? 0); } }}
        className="h-10 w-full bg-transparent px-3 text-sm font-semibold tabular-nums text-slate-900 outline-none" />
      {suffix && <span className={cn(affix, 'pr-3')}>{suffix}</span>}
    </div>
  );
}

/* ─── Select ─── */
export function Select({ value, onChange, options, disabled, placeholder }: {
  value: string | null | undefined;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  disabled?: boolean;
  placeholder?: string;
}) {
  return (
    <div className="relative">
      <select value={value ?? ''} onChange={(e) => onChange(e.target.value)} disabled={disabled}
        className="h-10 w-full appearance-none rounded-xl border border-slate-200 bg-white pl-3 pr-9 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15 disabled:opacity-60">
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
    </div>
  );
}

/* ─── Text area ─── */
export function TextArea({ value, onChange, placeholder, rows = 3, maxLength, disabled }: {
  value: string | null | undefined;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  maxLength?: number;
  disabled?: boolean;
}) {
  return (
    <div>
      <textarea value={value ?? ''} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        rows={rows} maxLength={maxLength} disabled={disabled}
        className="w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15 disabled:opacity-60" />
      {maxLength && <p className="mt-1 text-right text-[0.6875rem] tabular-nums text-slate-400">{(value ?? '').length}/{maxLength}</p>}
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
            className={cn('rounded-xl border p-3 text-left transition active:scale-[0.99]',
              on ? 'border-brand-500 bg-brand-50/60 ring-1 ring-brand-500' : 'border-slate-200 bg-white hover:border-slate-300')}>
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

/* ─── Section card ─── */
type Tone = 'emerald' | 'blue' | 'amber' | 'violet' | 'rose' | 'pink' | 'cyan' | 'sky' | 'slate' | 'orange' | 'indigo';
const TONES: Record<Tone, string> = {
  emerald: 'bg-emerald-50 text-emerald-700', blue: 'bg-blue-50 text-blue-700', sky: 'bg-sky-50 text-sky-700',
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
    <section id={id} data-setting-card={title}
      className="scroll-mt-24 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-shadow">
      <header className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-4 py-3.5 sm:px-5">
        {I && <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', TONES[color])}><I className="h-[1.125rem] w-[1.125rem]" /></span>}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-[0.9375rem] font-semibold leading-tight text-slate-900">{title}</h3>
            {badge}
          </div>
          {desc && <p className="mt-0.5 text-xs leading-snug text-slate-500">{desc}</p>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </header>
      <div className="px-4 py-3 sm:px-5 sm:py-4">{children}</div>
    </section>
  );
}

/* ─── Pill ─── */
type PillTone = 'emerald' | 'blue' | 'amber' | 'rose' | 'slate';
const PILLS: Record<PillTone, string> = {
  emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-200', blue: 'bg-blue-50 text-blue-700 ring-blue-200',
  amber: 'bg-amber-50 text-amber-700 ring-amber-200', rose: 'bg-rose-50 text-rose-700 ring-rose-200', slate: 'bg-slate-100 text-slate-600 ring-slate-200',
};
export function StatPill({ label, value, tone = 'emerald', icon: I }: { label: string; value: string | number; tone?: PillTone; icon?: Icon }) {
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.6875rem] font-semibold ring-1', PILLS[tone])}>
      {I && <I className="h-3 w-3" />}
      <span className="opacity-70">{label}</span>
      <span className="tabular-nums">{value}</span>
    </span>
  );
}

/* ─── Divider ─── */
export function Divider({ label }: { label?: string }) {
  if (!label) return <div className="my-3 h-px bg-slate-100" />;
  return (
    <div className="my-4 flex items-center gap-3">
      <span className="text-[0.6875rem] font-semibold uppercase tracking-wider text-slate-400">{label}</span>
      <span className="h-px flex-1 bg-slate-100" />
    </div>
  );
}

/* ─── Note ─── */
type AlertTone = 'blue' | 'emerald' | 'amber' | 'rose' | 'violet';
const NOTES: Record<AlertTone, string> = {
  blue: 'bg-blue-50 text-blue-900 ring-blue-100', emerald: 'bg-emerald-50 text-emerald-900 ring-emerald-100',
  amber: 'bg-amber-50 text-amber-900 ring-amber-100', rose: 'bg-rose-50 text-rose-900 ring-rose-100', violet: 'bg-violet-50 text-violet-900 ring-violet-100',
};
export function Alert({ tone = 'blue', title, children, icon: I }: { tone?: AlertTone; title?: string; children: ReactNode; icon?: Icon }) {
  return (
    <div className={cn('mt-3 flex items-start gap-2.5 rounded-xl p-3 ring-1', NOTES[tone])}>
      {I && <I className="mt-0.5 h-4 w-4 shrink-0 opacity-80" />}
      <div className="min-w-0 flex-1 text-xs leading-relaxed">
        {title && <p className="mb-0.5 font-semibold">{title}</p>}
        {children}
      </div>
    </div>
  );
}

/* ─── Link to a related page ─── */
export function PageLink({ to, icon: I, title, desc }: { to: string; icon: Icon; title: string; desc?: string }) {
  return (
    <Link to={to} className="group flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5 transition hover:border-brand-300 hover:bg-brand-50/40">
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
