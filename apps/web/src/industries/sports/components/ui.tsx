/** Small building blocks shared by the team-order and repair pages, on the design-system components. */

import { useEffect, useState, type ReactNode, type RefObject } from 'react';
import type { LucideIcon } from 'lucide-react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button, EmptyState } from '@/design-system/components';
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
        <Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => onPage(page - 1)} leftIcon={<ChevronLeft className="h-4 w-4" />}>Pichla</Button>
        <Button size="sm" variant="secondary" disabled={page >= pages} onClick={() => onPage(page + 1)} rightIcon={<ChevronRight className="h-4 w-4" />}>Agla</Button>
      </div>
    </footer>
  );
}

export function EmptyBlock({ icon: Icon, title, text, action }: { icon: LucideIcon; title: string; text: string; action?: ReactNode }) {
  return <EmptyState className="py-16" icon={<Icon className="h-6 w-6" />} title={title} description={text} action={action} />;
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
