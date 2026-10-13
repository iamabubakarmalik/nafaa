/**
 * Building blocks for the bakery analytics tabs: card titles, numbered
 * stat tiles, ranked bars and the empty state, styled like the other
 * analytics pages.
 */

import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Skeleton } from '@/design-system/components';
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

interface RankedRow { key: string; label: ReactNode; value: number; display: ReactNode; sub?: ReactNode; color?: string }

export function RankedBars({ rows, empty = 'Is period me kuch nahi', limit = 8, onPick }: { rows: RankedRow[]; empty?: string; limit?: number; onPick?: (key: string) => void }) {
  if (!rows.length) return <EmptyChart text={empty} />;
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
            {r.sub && <p className="mt-0.5 text-[0.6875rem] text-slate-500">{r.sub}</p>}
          </>
        );
        return (
          <li key={r.key}>
            {onPick ? <button type="button" onClick={() => onPick(r.key)} className="w-full rounded-lg px-1 py-0.5 text-left hover:bg-slate-50">{body}</button> : body}
          </li>
        );
      })}
    </ul>
  );
}

export function EmptyChart({ text = 'Is period me kuch nahi' }: { text?: string }) {
  return <p className="py-10 text-center text-[0.875rem] text-slate-500">{text}</p>;
}

export function AnalyticsSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}</div>
      <div className="grid gap-4 lg:grid-cols-2">{Array.from({ length: 2 }, (_, i) => <Skeleton key={i} className="h-72 rounded-2xl" />)}</div>
    </div>
  );
}

export function LoadFailed({ what, retry }: { what: string; retry: () => void }) {
  return (
    <div className="rounded-3xl bg-white px-6 py-14 text-center ring-1 ring-slate-200/80">
      <p className="font-semibold text-slate-900">{what} load nahi hue</p>
      <p className="mt-1 text-sm text-slate-500">Internet check karein aur dobara koshish karein.</p>
      <button type="button" onClick={retry} className="mt-3 inline-flex h-9 items-center rounded-lg px-3 text-sm font-semibold text-brand-700 ring-1 ring-brand-200 hover:bg-brand-50">Dobara koshish</button>
    </div>
  );
}
