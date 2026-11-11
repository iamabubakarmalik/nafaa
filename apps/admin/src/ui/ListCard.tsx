/**
 * The white card that holds a list: optional title row, the table (or
 * cards on phones), loading rows, an empty state and the page footer.
 *
 *   <ListCard loading={q.isLoading} empty={!rows.length} emptyTitle="No shops found"
 *     page={list.page} limit={list.limit} total={meta.total} onPage={list.setPage} onLimit={list.setLimit}>
 *     <Table minWidth="56rem">…</Table>
 *   </ListCard>
 */

import type { ReactNode } from 'react';
import { ChevronLeft, ChevronRight, Inbox } from 'lucide-react';
import { EmptyState, Skeleton } from '@/design-system/components';
import { cn } from '@/lib/cn';
import { PAGE_SIZES } from './useListParams';

export function Pagination({ page, limit, total, onPage, onLimit }: {
  page: number; limit: number; total: number; onPage: (p: number) => void; onLimit?: (l: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(total / limit));
  const from = total === 0 ? 0 : (page - 1) * limit + 1;
  const to = Math.min(total, page * limit);
  const btn = 'flex h-8 w-8 items-center justify-center rounded-lg ring-1 ring-slate-200 transition hover:bg-slate-50 disabled:pointer-events-none disabled:opacity-40';
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 px-4 py-2.5 text-[0.8125rem] text-slate-500">
      <span className="tabular-nums">{from.toLocaleString('en-PK')}–{to.toLocaleString('en-PK')} of <b className="text-slate-900">{total.toLocaleString('en-PK')}</b></span>
      <div className="flex items-center gap-2">
        {onLimit && (
          <select value={limit} onChange={(e) => onLimit(Number(e.target.value))} aria-label="Rows per page" className="h-8 rounded-lg border-0 bg-slate-100 px-2 text-[0.8125rem] text-slate-700 focus:ring-2 focus:ring-brand-500">
            {PAGE_SIZES.map((n) => <option key={n} value={n}>{n} / page</option>)}
          </select>
        )}
        <button type="button" className={btn} disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="Previous page"><ChevronLeft className="h-4 w-4" /></button>
        <span className="tabular-nums">Page {page} of {pages}</span>
        <button type="button" className={btn} disabled={page >= pages} onClick={() => onPage(page + 1)} aria-label="Next page"><ChevronRight className="h-4 w-4" /></button>
      </div>
    </div>
  );
}

export function ListCard({
  title, actions, loading, empty, emptyTitle = 'Nothing here yet', emptyText, emptyIcon, emptyAction,
  page, limit, total, onPage, onLimit, rows = 8, className, children,
}: {
  title?: ReactNode;
  actions?: ReactNode;
  loading?: boolean;
  empty?: boolean;
  emptyTitle?: string;
  emptyText?: string;
  emptyIcon?: ReactNode;
  emptyAction?: ReactNode;
  /** Pagination: shown when `total` is given. */
  page?: number; limit?: number; total?: number;
  onPage?: (p: number) => void; onLimit?: (l: number) => void;
  /** Skeleton rows while loading. */
  rows?: number;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={cn('overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80', className)}>
      {(title || actions) && (
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3 sm:px-5">
          {title && <h2 className="text-[0.9375rem] font-semibold text-slate-900">{title}</h2>}
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </header>
      )}
      {loading ? (
        <div className="space-y-2 p-4">{Array.from({ length: rows }, (_, i) => <Skeleton key={i} className="h-11 rounded-xl" />)}</div>
      ) : empty ? (
        <EmptyState icon={emptyIcon ?? <Inbox className="h-6 w-6" />} title={emptyTitle} description={emptyText} action={emptyAction} />
      ) : children}
      {!loading && !empty && total != null && page != null && limit != null && onPage && (
        <Pagination page={page} limit={limit} total={total} onPage={onPage} onLimit={onLimit} />
      )}
    </section>
  );
}
