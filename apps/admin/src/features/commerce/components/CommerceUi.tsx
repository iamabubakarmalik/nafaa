/** Building blocks shared by the Online store pages. */

import type { ReactNode } from 'react';
import { Store } from 'lucide-react';
import { cn } from '@/lib/cn';
import { formatRelative } from '@/lib/format';

export { Card, Pill, Toggle, inputCls, labelCls, SERIES } from '@/features/mobile/components/MobileUi';

export const KIND_LABEL: Record<string, string> = {
  SHOPIFY: 'Shopify', DARAZ: 'Daraz', WOOCOMMERCE: 'WooCommerce', CUSTOM_WEBSITE: 'Custom website', FOODPANDA: 'Foodpanda',
  INDOLJ: 'Indolj', MANUAL: 'Manual orders',
};
export const KINDS = ['SHOPIFY', 'DARAZ', 'WOOCOMMERCE', 'CUSTOM_WEBSITE', 'INDOLJ', 'FOODPANDA', 'MANUAL'];
export const kindLabel = (k: string | null | undefined) => (k ? KIND_LABEL[k] ?? k : '—');

/** PENDING → Pending, OUT_FOR_DELIVERY → Out for delivery. */
export const enumLabel = (s: string | null | undefined) => (!s ? '—' : (s.charAt(0) + s.slice(1).toLowerCase()).replace(/_/g, ' '));

export const when = (d: string | null | undefined) => (d ? formatRelative(d) : '—');
export const dateTime = (d: string | null | undefined) =>
  d ? new Intl.DateTimeFormat('en-PK', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(d)) : '—';

export function CommerceHero({ title, subtitle, children }: { title: string; subtitle: string; children?: ReactNode }) {
  return (
    <section className="rounded-3xl bg-gradient-to-br from-violet-800 via-indigo-700 to-sky-600 p-6 text-white shadow-soft">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-medium">
            <Store className="h-3.5 w-3.5" /> Online store
          </div>
          <h2 className="mt-3 text-3xl font-bold">{title}</h2>
          <p className="mt-2 max-w-2xl text-sm text-white/85">{subtitle}</p>
        </div>
        {children && <div className="flex flex-wrap gap-2">{children}</div>}
      </div>
    </section>
  );
}

export function Stat({ label, value, hint, tone }: { label: string; value: number | string; hint?: string; tone?: 'brand' | 'amber' | 'rose' | 'emerald' }) {
  const toneCls = tone === 'brand'
    ? 'bg-gradient-to-br from-indigo-600 to-violet-700 text-white border-transparent'
    : tone === 'amber' ? 'bg-amber-50 border-amber-200' : tone === 'rose' ? 'bg-rose-50 border-rose-200' : tone === 'emerald' ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-200';
  return (
    <div className={cn('rounded-2xl border p-4 shadow-sm', toneCls)}>
      <div className={cn('text-xs', tone === 'brand' ? 'text-white/80' : 'text-slate-500')}>{label}</div>
      <div className="mt-1 text-2xl font-bold tabular-nums">{typeof value === 'number' ? value.toLocaleString() : value}</div>
      {hint && <div className={cn('mt-0.5 text-xs', tone === 'brand' ? 'text-white/75' : 'text-slate-500')}>{hint}</div>}
    </div>
  );
}

/** Channel health in one badge: paused, connected, error … */
export function ChannelStatus({ status, isActive }: { status: string; isActive: boolean }) {
  const [label, cls] = !isActive ? ['Paused', 'bg-slate-100 text-slate-600']
    : status === 'CONNECTED' ? ['Connected', 'bg-emerald-50 text-emerald-700']
      : status === 'ERROR' || status === 'SUSPENDED' ? [enumLabel(status), 'bg-rose-50 text-rose-700']
        : [enumLabel(status), 'bg-amber-50 text-amber-700'];
  return <span className={cn('inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold', cls)}>{label}</span>;
}

export function OrderStatus({ status }: { status: string }) {
  const cls = status === 'DELIVERED' ? 'bg-emerald-50 text-emerald-700'
    : ['CANCELLED', 'REJECTED', 'RETURNED'].includes(status) ? 'bg-rose-50 text-rose-700'
      : ['PENDING', 'ACCEPTING'].includes(status) ? 'bg-amber-50 text-amber-700' : 'bg-indigo-50 text-indigo-700';
  return <span className={cn('inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold', cls)}>{enumLabel(status)}</span>;
}

export function JobStatus({ status, stalled }: { status: string; stalled?: boolean }) {
  const cls = stalled ? 'bg-rose-50 text-rose-700'
    : status === 'RUNNING' || status === 'QUEUED' ? 'bg-indigo-50 text-indigo-700'
      : status === 'DONE' ? 'bg-emerald-50 text-emerald-700' : status === 'FAILED' ? 'bg-rose-50 text-rose-700' : 'bg-slate-100 text-slate-600';
  return <span className={cn('inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold', cls)}>{stalled ? 'Stalled' : enumLabel(status)}</span>;
}

export function Progress({ percent, failed }: { percent: number; failed?: number }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
      <div className={cn('h-full rounded-full', failed ? 'bg-amber-500' : 'bg-indigo-600')} style={{ width: `${Math.max(2, Math.min(100, percent))}%` }} />
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="p-10 text-center text-sm text-slate-500">{children}</div>;
}

/** Right-side panel for drill-downs. */
export function Drawer({ open, onClose, title, subtitle, children }: { open: boolean; onClose: () => void; title: string; subtitle?: string; children: ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/40" onClick={onClose}>
      <aside className="h-full w-full max-w-3xl overflow-y-auto bg-slate-50 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-slate-200 bg-white px-6 py-4">
          <div className="min-w-0">
            <h3 className="truncate text-lg font-bold text-slate-900">{title}</h3>
            {subtitle && <p className="truncate text-xs text-slate-500">{subtitle}</p>}
          </div>
          <button type="button" onClick={onClose} className="rounded-lg px-3 py-1.5 text-sm font-semibold text-slate-600 hover:bg-slate-100">Close</button>
        </div>
        <div className="space-y-4 p-6">{children}</div>
      </aside>
    </div>
  );
}

export const thCls = 'px-3 py-3 first:pl-5 last:pr-5';
export const tdCls = 'px-3 py-3 first:pl-5 last:pr-5 align-top';
export const tableHeadCls = 'bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500';
