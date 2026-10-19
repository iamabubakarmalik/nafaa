/**
 * Small building blocks used across the gym pages: empty and error
 * states, the pager, analytics tiles, ranked bars and the column chart,
 * the hero print button and the list panel.
 */

import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { PrintButton, type PrintDoc } from '@core/print';
import { Button, Skeleton } from '@/design-system/components';
import { cn } from '@core/lib/cn';

export function CardTitle({ icon: I, children }: { icon: LucideIcon; children: ReactNode }) {
  return <span className="inline-flex items-center gap-2"><I className="h-4 w-4 text-brand-600" />{children}</span>;
}

const TONES = {
  brand: 'bg-brand-50 text-brand-700',
  rose: 'bg-rose-50 text-rose-700',
  green: 'bg-success-50 text-success-700',
  amber: 'bg-amber-50 text-amber-700',
  violet: 'bg-violet-50 text-violet-700',
  sky: 'bg-sky-50 text-sky-700',
};

export function StatTile({ icon: I, label, value, sub, tone = 'brand' }: { icon: LucideIcon; label: string; value: ReactNode; sub?: ReactNode; tone?: keyof typeof TONES }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2">
        <span className={cn('flex h-8 w-8 items-center justify-center rounded-lg', TONES[tone])}><I className="h-4 w-4" /></span>
        <span className="text-[0.8125rem] text-slate-500">{label}</span>
      </div>
      <p className="mt-2 truncate text-2xl font-bold tabular-nums text-slate-900">{value}</p>
      {sub && <p className="mt-0.5 truncate text-[0.75rem] text-slate-500">{sub}</p>}
    </div>
  );
}

export interface RankedRow { key: string; label: ReactNode; value: number; display: ReactNode; color?: string }

export function RankedBars({ rows, empty = 'Is period me kuch nahi', limit = 8, onPick }: { rows: RankedRow[]; empty?: string; limit?: number; onPick?: (key: string) => void }) {
  if (!rows.length) return <p className="py-10 text-center text-[0.875rem] text-slate-500">{empty}</p>;
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <ul className="space-y-2.5">
      {rows.slice(0, limit).map((r) => {
        const body = (
          <>
            <div className="flex justify-between gap-2 text-[0.8125rem]">
              <span className="min-w-0 truncate font-medium text-slate-800">{r.label}</span>
              <span className="shrink-0 tabular-nums text-slate-900">{r.display}</span>
            </div>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full" style={{ width: `${(r.value / max) * 100}%`, background: r.color ?? 'rgb(var(--brand-500))' }} />
            </div>
          </>
        );
        return <li key={r.key}>{onPick ? <button type="button" onClick={() => onPick(r.key)} className="w-full rounded-lg px-1 py-0.5 text-left hover:bg-slate-50">{body}</button> : body}</li>;
      })}
    </ul>
  );
}

/** Columns for a small series (bookings by hour or weekday). */
export function Columns({ items, empty = 'Abhi data nahi' }: { items: Array<{ key: string; label: string; value: number; title?: string }>; empty?: string }) {
  const max = Math.max(0, ...items.map((i) => i.value));
  if (!max) return <p className="py-10 text-center text-[0.875rem] text-slate-500">{empty}</p>;
  return (
    <div className="flex h-40 items-end gap-1">
      {items.map((i) => (
        <div key={i.key} className="flex min-w-0 flex-1 flex-col items-center gap-1" title={i.title ?? `${i.label}: ${i.value}`}>
          <div className="flex w-full flex-1 items-end">
            <div className={cn('w-full rounded-t-md', i.value ? 'bg-brand-500' : 'bg-slate-100')} style={{ height: `${Math.max((i.value / max) * 100, 4)}%` }} />
          </div>
          <span className="truncate text-[0.625rem] text-slate-500">{i.label}</span>
        </div>
      ))}
    </div>
  );
}

export function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return <div className="space-y-2 rounded-3xl bg-white p-4 ring-1 ring-slate-200/80">{Array.from({ length: rows }, (_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>;
}

export function LoadFailed({ what, retry }: { what: string; retry: () => void }) {
  return (
    <div className="rounded-3xl bg-white px-6 py-14 text-center ring-1 ring-slate-200/80">
      <p className="font-semibold text-slate-900">{what} load nahi hue</p>
      <p className="mt-1 text-sm text-slate-500">Internet check karein aur dobara koshish karein.</p>
      <Button className="mt-3" variant="secondary" onClick={retry}>Dobara koshish</Button>
    </div>
  );
}

/** Empty list with what to do next. */
export function EmptyList({ icon: I, title, text, children }: { icon: LucideIcon; title: string; text: string; children?: ReactNode }) {
  return (
    <div className="rounded-3xl bg-white px-6 py-14 text-center ring-1 ring-slate-200/80">
      <I className="mx-auto h-10 w-10 text-slate-300" />
      <p className="mt-3 font-semibold text-slate-900">{title}</p>
      <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">{text}</p>
      {children && <div className="mt-4 flex flex-wrap justify-center gap-2">{children}</div>}
    </div>
  );
}

/** Previous / next page under a list. */
export function Pager({ page, pages, onPage }: { page: number; pages: number; onPage: (p: number) => void }) {
  if (pages <= 1) return null;
  return (
    <div className="flex items-center justify-center gap-2">
      <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>Pichla</Button>
      <span className="text-sm text-slate-600">Safha {page} / {pages}</span>
      <Button variant="secondary" size="sm" disabled={page >= pages} onClick={() => onPage(page + 1)}>Agla</Button>
    </div>
  );
}

/** The print/PDF button styled for a PageHero. */
export function HeroPrint({ doc, disabled }: { doc: () => Promise<PrintDoc> | PrintDoc; disabled?: boolean }) {
  return <span className="[&_button]:border-white/25 [&_button]:bg-white [&_button]:text-slate-800"><PrintButton doc={doc} disabled={disabled} /></span>;
}

/** Totals strip above a list. */
export function TotalsStrip({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-2xl bg-white px-4 py-2.5 text-[0.8125rem] shadow-sm ring-1 ring-slate-200/80">{children}</div>;
}

/** White rounded box that holds a table or list. */
export function Panel({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80', className)}>{children}</div>;
}
