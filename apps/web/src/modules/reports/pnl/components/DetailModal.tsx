/**
 * The records behind one statement line: expenses of a category, salaries
 * and commission, stock written off, bookings whose advance was kept, other
 * income, or khata bills of the period still owed (amount = what is left).
 */

import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight, ExternalLink } from 'lucide-react';
import { Modal, Skeleton } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { pnlApi, type PnlDetailKind, type PnlQuery } from '../api';
import { downloadCsv } from '../print';
import type { Fmt } from './parts';

const PAGE: Record<PnlDetailKind, { to: string; label: string }> = {
  expense: { to: '/expenses', label: 'Kharchay page' },
  staff: { to: '/staff', label: 'Staff page' },
  writeoff: { to: '/stock-adjustments', label: 'Stock adjustments' },
  booking: { to: '/bookings', label: 'Bookings' },
  income: { to: '/income', label: 'Doosri aamdani' },
  credit: { to: '/khata', label: 'Khata' },
};

export function DetailModal({ query, kind, categoryId, title, period, fmt, onClose }: {
  query: PnlQuery;
  kind: PnlDetailKind;
  categoryId?: string;
  title: string;
  period: string;
  fmt: Fmt;
  onClose: () => void;
}) {
  const q = useQuery({ queryKey: ['pnl', 'detail', query, kind, categoryId], queryFn: () => pnlApi.detail({ ...query, kind, categoryId }) });
  const d = q.data;
  const money = kind === 'writeoff' ? fmt.cost : fmt.sales;
  const page = PAGE[kind];
  const day = (v: string) => new Date(v).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' });

  const csv = () => d && downloadCsv(`pnl-${kind}`, [title, period], [
    ['Date', 'Details', 'Type', 'Ref', 'Branch', 'Note', 'Amount'],
    ...d.rows.map((r) => [day(r.at), r.title, r.kind ?? '', r.ref ?? '', r.branch ?? '', r.note ?? '', r.amount.toFixed(2)]),
  ]);

  return (
    <Modal open onClose={onClose} size="xl" title={title} description={`${period}${d ? ` · ${d.count} record · ${money(d.total)}` : ''}`}
      footer={
        <div className="flex w-full flex-wrap items-center justify-between gap-2">
          <Link to={page.to} className="inline-flex items-center gap-1 text-[0.8125rem] font-semibold text-brand-700 hover:underline">{page.label} <ExternalLink className="h-3.5 w-3.5" /></Link>
          <button type="button" onClick={csv} disabled={!d?.rows.length} className="rounded-lg px-3 py-1.5 text-[0.8125rem] font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50 disabled:opacity-50">CSV</button>
        </div>
      }>
      {q.isLoading ? (
        <div className="space-y-2">{[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-12 rounded-xl" />)}</div>
      ) : q.isError ? (
        <p className="py-10 text-center text-[0.875rem] text-rose-600">Record nahi aa sake</p>
      ) : !d?.rows.length ? (
        <p className="py-10 text-center text-[0.875rem] text-slate-500">Is period me koi record nahi</p>
      ) : (
        <>
          <ul className="divide-y divide-slate-100">
            {d.rows.map((r) => {
              const body = (
                <>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-slate-900">{r.title}</p>
                    <p className="truncate text-[0.75rem] text-slate-500">
                      {day(r.at)}{r.kind && ` · ${r.kind}`}{r.ref && ` · ${r.ref}`}{r.branch && ` · ${r.branch}`}{r.by && ` · ${r.by}`}
                    </p>
                    {r.note && <p className="truncate text-[0.75rem] text-slate-400">{r.note}</p>}
                  </div>
                  <span className={cn('shrink-0 font-semibold tabular-nums', r.amount < 0 ? 'text-emerald-700' : 'text-slate-900')}>{money(r.amount)}</span>
                  {r.link && <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" />}
                </>
              );
              return (
                <li key={r.id}>
                  {r.link
                    ? <Link to={r.link} className="flex items-center gap-3 py-2.5 text-[0.8125rem] hover:bg-slate-50">{body}</Link>
                    : <div className="flex items-center gap-3 py-2.5 text-[0.8125rem]">{body}</div>}
                </li>
              );
            })}
          </ul>
          {d.truncated && <p className="mt-2 text-[0.75rem] text-slate-500">Sirf naye {d.count} record dikh rahe hain — baqi ke liye period chhoti karein</p>}
        </>
      )}
    </Modal>
  );
}
