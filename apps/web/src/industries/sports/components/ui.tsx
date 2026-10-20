/** Small building blocks shared by the team-order and repair pages. */

import { useEffect, useState, type ReactNode, type RefObject } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@core/lib/cn';
import { isDialogOpen, isTyping } from '@core/lib/shortcuts';

export function StatusPill({ tone, children }: { tone: string; children: ReactNode }) {
  return <span className={cn('inline-flex w-fit items-center rounded-full px-2.5 py-0.5 text-[0.75rem] font-semibold', tone)}>{children}</span>;
}

/** One label / value line of a money or details block. */
export function Line({ label, value, strong, tone }: { label: ReactNode; value: ReactNode; strong?: boolean; tone?: string }) {
  return (
    <div className={cn('flex items-center justify-between gap-3 py-1.5 text-[0.875rem]', strong && 'border-t border-slate-100 pt-2.5 font-bold')}>
      <span className="text-slate-600">{label}</span>
      <span className={cn('tabular-nums text-slate-900', tone)}>{value}</span>
    </div>
  );
}

export function Pager({ page, limit, total, onPage }: { page: number; limit: number; total: number; onPage: (p: number) => void }) {
  if (total <= limit) return null;
  const pages = Math.max(1, Math.ceil(total / limit));
  return (
    <footer className="flex items-center justify-between gap-3 border-t border-slate-100 px-5 py-3 text-[0.8125rem] text-slate-600">
      <span>{(page - 1) * limit + 1}–{Math.min(page * limit, total)} / {total}</span>
      <div className="flex gap-2">
        <button type="button" disabled={page <= 1} onClick={() => onPage(page - 1)} className="h-8 rounded-lg px-3 font-semibold ring-1 ring-slate-200 disabled:opacity-40">Pichla</button>
        <button type="button" disabled={page >= pages} onClick={() => onPage(page + 1)} className="h-8 rounded-lg px-3 font-semibold ring-1 ring-slate-200 disabled:opacity-40">Agla</button>
      </div>
    </footer>
  );
}

export function EmptyBlock({ icon: Icon, title, text, action }: { icon: LucideIcon; title: string; text: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-16 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-700"><Icon className="h-7 w-7" /></span>
      <h3 className="mt-4 text-lg font-semibold text-slate-900">{title}</h3>
      <p className="mt-1 max-w-md text-[0.875rem] text-slate-500">{text}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function useDebounced<T>(value: T, ms = 300) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

/** List keys: "/" goes to search, N opens a new record. */
export function useListKeys(search: RefObject<HTMLInputElement | null>, onNew?: () => void) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping() || isDialogOpen()) return;
      if (e.key === '/') { e.preventDefault(); search.current?.focus(); }
      if ((e.key === 'n' || e.key === 'N') && onNew) { e.preventDefault(); onNew(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [search, onNew]);
}

/** Every row of a filter, page by page, for CSV and print. */
export async function fetchAll<T>(load: (page: number) => Promise<{ items: T[]; total: number }>) {
  const out: T[] = [];
  for (let page = 1; page <= 40; page++) {
    const res = await load(page);
    out.push(...res.items);
    if (out.length >= res.total || !res.items.length) break;
  }
  return out;
}

export const card = 'overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80';
