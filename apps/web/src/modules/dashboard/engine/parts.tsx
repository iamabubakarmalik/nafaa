/**
 * Building blocks shared by dashboard widgets, so every widget has the same
 * header, list rows, tiles and empty states.
 */

import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ArrowDownRight, ArrowUpRight, type LucideIcon } from 'lucide-react';
import { Card } from '@/design-system/components';
import { cn } from '@core/lib/cn';

/** Widget surface: Card with title, short description and an optional "see all" link. */
export function WidgetCard({ title, icon: Icon, description, to, linkLabel = 'Sab dekhein', actions, flush, children, className }: {
  title: ReactNode;
  icon?: LucideIcon;
  description?: ReactNode;
  to?: string;
  linkLabel?: string;
  actions?: ReactNode;
  flush?: boolean;
  children: ReactNode;
  className?: string;
}) {
  const link = to && (
    <Link to={to} className="inline-flex items-center gap-1 text-[0.8125rem] font-semibold text-brand-700 hover:underline">
      {linkLabel} <ArrowRight className="h-3.5 w-3.5" />
    </Link>
  );
  return (
    <Card
      title={Icon ? (
        <span className="inline-flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-brand-50 text-brand-700"><Icon className="h-3.5 w-3.5" /></span>
          {title}
        </span>
      ) : title}
      description={description}
      actions={actions || link ? <>{actions}{link}</> : undefined}
      flush={flush}
      className={cn('h-full rounded-2xl', className)}
    >
      {children}
    </Card>
  );
}

const TONES = {
  brand: 'bg-brand-50 text-brand-700',
  success: 'bg-success-50 text-success-700',
  warning: 'bg-amber-50 text-amber-700',
  danger: 'bg-rose-50 text-rose-700',
  info: 'bg-sky-50 text-sky-700',
  neutral: 'bg-slate-100 text-slate-600',
} as const;
export type Tone = keyof typeof TONES;

export function IconBubble({ icon: Icon, tone = 'neutral', className }: { icon: LucideIcon; tone?: Tone; className?: string }) {
  return (
    <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', TONES[tone], className)}>
      <Icon className="h-4 w-4" />
    </span>
  );
}

/** One row in a widget list. Becomes a link when `to` is given. */
export function ListRow({ icon, leading, title, meta, value, valueHint, to }: {
  icon?: LucideIcon;
  leading?: ReactNode;
  title: ReactNode;
  meta?: ReactNode;
  value?: ReactNode;
  valueHint?: ReactNode;
  to?: string;
}) {
  const body = (
    <>
      {leading ?? (icon && <IconBubble icon={icon} />)}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[0.875rem] font-medium text-slate-900">{title}</span>
        {meta && <span className="mt-0.5 block truncate text-[0.75rem] text-slate-500">{meta}</span>}
      </span>
      {(value !== undefined || valueHint) && (
        <span className="shrink-0 text-right">
          {value !== undefined && <span className="block text-[0.875rem] font-semibold tabular-nums text-slate-900">{value}</span>}
          {valueHint && <span className="mt-0.5 block text-[0.75rem]">{valueHint}</span>}
        </span>
      )}
    </>
  );
  const cls = 'flex items-center gap-3 px-4 py-2.5 sm:px-5';
  return to
    ? <Link to={to} className={cn(cls, 'transition hover:bg-slate-50')}>{body}</Link>
    : <div className={cls}>{body}</div>;
}

export function RowList({ children, empty, emptyIcon: EmptyIcon }: { children: ReactNode[]; empty: string; emptyIcon: LucideIcon }) {
  if (children.length === 0) return <EmptyHint icon={EmptyIcon} text={empty} />;
  return <div className="divide-y divide-slate-100 pb-2">{children}</div>;
}

export function EmptyHint({ icon: Icon, text }: { icon: LucideIcon; text: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-10 text-center">
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-400">
        <Icon className="h-5 w-5" />
      </span>
      <p className="text-[0.8125rem] text-slate-500">{text}</p>
    </div>
  );
}

/** Change badge: +12.5% in green, −3.0% in red. */
export function Change({ value, suffix }: { value: number; suffix?: string }) {
  if (!Number.isFinite(value) || value === 0) return null;
  const up = value > 0;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={cn('inline-flex items-center gap-0.5 text-[0.75rem] font-semibold', up ? 'text-success-700' : 'text-rose-700')}>
      <Icon className="h-3.5 w-3.5" />
      {up ? '+' : ''}{value.toFixed(1)}%{suffix && <span className="ml-1 font-normal text-slate-500">{suffix}</span>}
    </span>
  );
}

/** Small metric tile used inside widgets (money map, P&L). */
export function MetricTile({ icon, tone = 'neutral', label, value, hint, to, alert }: {
  icon: LucideIcon; tone?: Tone; label: string; value: ReactNode; hint?: ReactNode; to?: string; alert?: boolean;
}) {
  const body = (
    <>
      <div className="flex items-center gap-2">
        <IconBubble icon={icon} tone={tone} className="h-7 w-7 rounded-md [&_svg]:h-3.5 [&_svg]:w-3.5" />
        <span className="truncate text-[0.75rem] font-medium text-slate-500">{label}</span>
      </div>
      <div className="mt-2 truncate text-lg font-bold tabular-nums tracking-tight text-slate-900">{value}</div>
      {hint && <div className="mt-0.5 line-clamp-2 text-[0.75rem] text-slate-500">{hint}</div>}
    </>
  );
  const cls = cn('block rounded-lg border p-3', alert ? 'border-rose-200 bg-rose-50/40' : 'border-slate-200');
  return to ? <Link to={to} className={cn(cls, 'transition hover:border-slate-300 hover:bg-slate-50')}>{body}</Link> : <div className={cls}>{body}</div>;
}

export function ChartLegend({ items }: { items: { color: string; label: string }[] }) {
  return (
    <div className="mt-3 flex flex-wrap items-center justify-center gap-4 text-[0.75rem] text-slate-500">
      {items.map((i) => (
        <span key={i.label} className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: i.color }} /> {i.label}
        </span>
      ))}
    </div>
  );
}

export const fmtQty = (q: number | string | null | undefined) => {
  const n = Number(q || 0);
  return n % 1 === 0 ? String(n) : n.toFixed(2);
};

export const fmtDateTime = (v: string) =>
  new Intl.DateTimeFormat('en-PK', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }).format(new Date(v));

export const hourLabel = (h: number) => (h === 0 ? '12 AM' : h < 12 ? `${h} AM` : h === 12 ? '12 PM' : `${h - 12} PM`);
export const hourTick = (h: number) => (h === 0 ? '12a' : h < 12 ? `${h}a` : h === 12 ? '12p' : `${h - 12}p`);

/** Short axis labels: 950, 12K, 1.5L, 2.1Cr. */
export const axisMoney = (v: number) => {
  const n = Math.abs(v);
  const trim = (x: number) => String(Number(x.toFixed(1)));
  if (n >= 1e7) return `${trim(v / 1e7)}Cr`;
  if (n >= 1e5) return `${trim(v / 1e5)}L`;
  if (n >= 1e3) return `${trim(v / 1e3)}K`;
  return String(v);
};
