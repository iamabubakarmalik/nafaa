/** Previous / next for server-paged lists, with the row range shown. */

import { ChevronLeft, ChevronRight } from 'lucide-react';

export function Pager({ page, limit, total, onPage }: { page: number; limit: number; total: number; onPage: (p: number) => void }) {
  const pages = Math.max(Math.ceil(total / limit), 1);
  if (total <= limit) return null;
  const from = (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);
  const btn = 'flex h-9 items-center gap-1 rounded-xl px-3 text-[0.8125rem] font-semibold ring-1 ring-slate-200 hover:bg-slate-50 disabled:opacity-40';
  return (
    <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-4 py-3">
      <span className="text-[0.75rem] text-slate-500 tabular-nums">{from}–{to} / {total}</span>
      <div className="flex gap-1.5">
        <button type="button" className={btn} disabled={page <= 1} onClick={() => onPage(page - 1)}><ChevronLeft className="h-4 w-4" />Pichla</button>
        <button type="button" className={btn} disabled={page >= pages} onClick={() => onPage(page + 1)}>Agla<ChevronRight className="h-4 w-4" /></button>
      </div>
    </div>
  );
}
