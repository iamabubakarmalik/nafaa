/** Every bill sent to a tax authority: its number or the reason it failed, with retry. */

import type { UseQueryResult } from '@tanstack/react-query';
import { AlertTriangle, ChevronRight, FileText, RefreshCw, RotateCcw } from 'lucide-react';
import { Button, Skeleton } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import type { InvoicePage, TaxInvoiceRow } from '../api';
import { AUTH, STATUS, dayTime } from '../meta';

type Money = (n: number | null | undefined) => string;

export function InvoicesView({ q, money, showShop, branchOf, filtered, onClear, page, setPage, onOpen, onRetry, retrying, failedCount, onRetryAll, retryingAll }: {
  q: UseQueryResult<InvoicePage>;
  money: Money;
  showShop: boolean;
  branchOf: (id: string | null) => string;
  filtered: boolean;
  onClear: () => void;
  page: number;
  setPage: (fn: (p: number) => number) => void;
  onOpen: (id: string) => void;
  onRetry: (id: string) => void;
  retrying: string | undefined;
  failedCount: number;
  onRetryAll: () => void;
  retryingAll: boolean;
}) {
  const data = q.data;
  if (q.isLoading) return <div className="space-y-2 rounded-3xl bg-white p-4 ring-1 ring-slate-200/80">{[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>;
  if (q.isError && !data) {
    return (
      <div className="rounded-3xl bg-white px-6 py-14 text-center ring-1 ring-slate-200/80">
        <p className="font-semibold text-slate-900">Invoices load nahi huin</p>
        <Button className="mt-3" variant="secondary" onClick={() => q.refetch()}>Dobara koshish</Button>
      </div>
    );
  }
  if (data?.migrationPending) {
    return <p className="rounded-2xl bg-amber-50 px-4 py-3 text-[0.8125rem] text-amber-900 ring-1 ring-amber-200">Server par tax ka database update abhi baqi hai. Update ke baad yahan bill nazar aayenge.</p>;
  }
  const rows = data?.rows ?? [];

  return (
    <div className="space-y-3">
      {failedCount > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-rose-50 px-4 py-2.5 text-[0.8125rem] text-rose-900 ring-1 ring-rose-200">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span className="min-w-0 flex-1">{failedCount} bill authority ne nahi liye. Settings theek karne ke baad sab ek saath dobara bhej dein.</span>
          <Button size="sm" variant="secondary" loading={retryingAll} onClick={onRetryAll} leftIcon={<RotateCcw className="h-4 w-4" />}>Sab fail dobara bhejein</Button>
        </div>
      )}

      {!rows.length ? (
        <div className="rounded-3xl bg-white px-6 py-14 text-center ring-1 ring-slate-200/80">
          <FileText className="mx-auto h-10 w-10 text-slate-300" />
          <p className="mt-3 font-semibold text-slate-900">{filtered ? 'Is filter me koi bill nahi' : 'Is muddat me koi bill authority ko nahi gaya'}</p>
          <p className="mt-1 text-sm text-slate-500">Tax chalu hone ke baad ka har bill yahan aata hai, us ke number ke saath.</p>
          {filtered && <Button className="mt-4" variant="ghost" onClick={onClear}>Filter saaf karein</Button>}
        </div>
      ) : (
        <ul className="divide-y divide-slate-100 overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
          {rows.map((r) => <Row key={r.id} r={r} money={money} showShop={showShop} branchOf={branchOf} onOpen={onOpen} onRetry={onRetry} busy={retrying === r.id} />)}
        </ul>
      )}

      {data && data.pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((x) => x - 1)}>Pichla</Button>
          <span className="text-sm text-slate-600">Safha {page} / {data.pages} · {data.total} bill</span>
          <Button variant="secondary" size="sm" disabled={page >= data.pages} onClick={() => setPage((x) => x + 1)}>Agla</Button>
        </div>
      )}
    </div>
  );
}

function Row({ r, money, showShop, branchOf, onOpen, onRetry, busy }: {
  r: TaxInvoiceRow; money: Money; showShop: boolean; branchOf: (id: string | null) => string;
  onOpen: (id: string) => void; onRetry: (id: string) => void; busy: boolean;
}) {
  const st = STATUS[r.status];
  const auth = AUTH[r.authority];
  const meta = [dayTime(r.createdAt), showShop && branchOf(r.shopId), `POS ${r.posId}`].filter(Boolean).join(' · ');
  return (
    <li className="flex items-center gap-3 px-3 py-2.5 sm:px-4">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: `${st.color}17`, color: st.color }}><st.icon className="h-5 w-5" /></span>
      <button type="button" onClick={() => onOpen(r.id)} className="min-w-0 flex-1 text-left">
        <span className="flex flex-wrap items-center gap-1.5">
          <span className="font-mono font-semibold text-slate-900">{r.usin}</span>
          <span className="rounded-md px-1.5 py-0.5 text-[0.6875rem] font-bold" style={{ backgroundColor: `${auth?.color ?? '#64748b'}17`, color: auth?.color }}>{r.authority}</span>
          {r.kind === 'RETURN' && <span className="rounded-full bg-orange-50 px-2 py-0.5 text-[0.6875rem] font-medium text-orange-700 ring-1 ring-orange-200">Wapsi</span>}
        </span>
        <span className="mt-0.5 block truncate text-[0.75rem] text-slate-400">{meta}</span>
        {r.status === 'SUCCESS' ? (
          <span className="mt-0.5 block truncate font-mono text-[0.75rem] text-emerald-700">{r.fiscalNumber}</span>
        ) : r.status === 'FAILED' ? (
          <span className="mt-0.5 block truncate text-[0.75rem] text-rose-700">{r.attempts} koshish · {r.error ?? 'Wajah nahi mili'}</span>
        ) : (
          <span className="mt-0.5 block truncate text-[0.75rem] text-amber-700">{st.label}{r.nextAttemptAt ? ` · agli koshish ${dayTime(r.nextAttemptAt)}` : ''}</span>
        )}
      </button>
      <div className="text-right">
        <p className={cn('font-bold tabular-nums', r.kind === 'RETURN' ? 'text-orange-700' : 'text-slate-900')}>{money(r.kind === 'RETURN' ? -r.totalAmount : r.totalAmount)}</p>
        <p className="text-[0.75rem] tabular-nums text-slate-500">Tax {money(r.taxAmount)} · {r.taxRate}%</p>
      </div>
      {r.status !== 'SUCCESS' && r.status !== 'SKIPPED' ? (
        <Button size="sm" variant="secondary" loading={busy} onClick={() => onRetry(r.id)} leftIcon={<RefreshCw className="h-4 w-4" />} className="hidden sm:inline-flex">Dobara</Button>
      ) : null}
      <button type="button" onClick={() => onOpen(r.id)} aria-label="Tafseel" className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"><ChevronRight className="h-4 w-4" /></button>
    </li>
  );
}
