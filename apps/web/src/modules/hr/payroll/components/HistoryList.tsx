/**
 * Salaries and advances for the filter, newest month first, with what was
 * earned, cut, paid and left. A line opens its record; the printer icon its
 * payslip.
 */

import { HandCoins, Printer, Wallet } from 'lucide-react';
import { Avatar, Button, Skeleton } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { formatPKR } from '@core/lib/format';
import type { HistoryPage } from '../api/payroll.api';
import { METHOD_LABEL, STATUS, day } from './meta';
import { t as tr } from '@core/i18n';

export function HistoryList({ data, loading, failed, filtered, onOpen, onPrint, onRetry, onClear, onPage, page, showShop }: {
  data?: HistoryPage; loading: boolean; failed: boolean; filtered: boolean; page: number; showShop: boolean;
  onOpen: (id: string) => void; onPrint: (id: string) => void; onRetry: () => void; onClear: () => void; onPage: (p: number) => void;
}) {
  if (loading) return <div className="space-y-2 rounded-3xl bg-white p-4 ring-1 ring-slate-200/80">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>;
  if (failed && !data) {
    return (
      <div className="rounded-3xl bg-white px-6 py-14 text-center ring-1 ring-slate-200/80">
        <p className="font-semibold text-slate-900">{tr('Record load nahi hua')}</p>
        <Button className="mt-3" variant="secondary" onClick={onRetry}>{tr('Dobara koshish')}</Button>
      </div>
    );
  }
  const items = data?.items ?? [];
  if (!items.length) {
    return (
      <div className="rounded-3xl bg-white px-6 py-14 text-center ring-1 ring-slate-200/80">
        <Wallet className="mx-auto h-10 w-10 text-slate-300" />
        <p className="mt-3 font-semibold text-slate-900">{filtered ? tr('Is filter me kuch nahi') : tr('Abhi koi tankhwah nahi bani')}</p>
        <p className="mt-1 text-sm text-slate-500">{tr('"Is mahine" tab se tankhwah banayein — har record yahan aata hai.')}</p>
        {filtered && <Button className="mt-4" variant="ghost" onClick={onClear}>{tr('Filter saaf karein')}</Button>}
      </div>
    );
  }
  const t = data!.totals;
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-2xl bg-white px-4 py-2.5 text-[0.8125rem] shadow-sm ring-1 ring-slate-200/80">
        <span className="text-slate-500">{tr('{{count}} record', { count: t.count })}</span>
        <span className="font-semibold text-slate-900">{tr('Ada {{paid}}', { paid: formatPKR(t.paid) })}</span>
        <span className="text-slate-600">{tr('Banti {{net}}', { net: formatPKR(t.net) })}</span>
        {t.due > 0 && <span className="text-amber-700">{tr('Baqi {{due}}', { due: formatPKR(t.due) })}</span>}
        {t.cancelled > 0 && <span className="text-slate-400">{tr('Cancel {{cancelled}} — kul me nahi', { cancelled: t.cancelled })}</span>}
      </div>
      <ul className="divide-y divide-slate-100 overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
        {items.map((r) => {
          const st = STATUS[r.status];
          const cancelled = r.status === 'CANCELLED';
          const advance = r.kind === 'advance';
          return (
            <li key={r.id} className={cn(cancelled && 'bg-slate-50/60')}>
              <div className="flex items-center gap-3 px-3 py-2.5 sm:px-4">
                <Avatar name={r.staff.fullName} url={r.staff.avatarUrl} size={38} />
                <button type="button" onClick={() => onOpen(r.id)} className="min-w-0 flex-1 text-start">
                  <span className="flex flex-wrap items-center gap-1.5">
                    <span className={cn('truncate font-semibold text-slate-900', cancelled && 'text-slate-400 line-through')}>{r.staff.fullName}</span>
                    <span className={cn('rounded-full px-2 py-0.5 text-[0.6875rem] font-medium', advance ? 'bg-violet-50 text-violet-700' : 'bg-slate-100 text-slate-600')}>
                      {advance ? <><HandCoins className="me-0.5 inline h-3 w-3" />{tr('Advance')}</> : r.monthLabel}
                    </span>
                    {r.status !== 'PAID' && <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.6875rem] font-medium ring-1', st.tone)}><st.icon className="h-3 w-3" />{st.label}</span>}
                  </span>
                  <span className="mt-0.5 block truncate text-[0.75rem] text-slate-400">
                    <span className="font-mono">{r.paymentNumber}</span>
                    {advance ? tr(' · {{monthLabel}} se katega', { monthLabel: r.monthLabel }) : ''} · {day(r.paidAt ?? r.createdAt)} · {METHOD_LABEL[r.paymentMethod] ?? r.paymentMethod}{showShop && r.staff.shop?.name ? ` · ${r.staff.shop.name}` : ''}
                  </span>
                </button>
                <div className="text-end">
                  <p className={cn('text-base font-bold tabular-nums', cancelled ? 'text-slate-400 line-through' : 'text-slate-900')}>{formatPKR(advance ? r.paidAmount : r.netAmount)}</p>
                  <p className="text-[0.6875rem] text-slate-500">{advance ? 'diya' : r.balanceAmount > 0.5 ? tr('baqi {{balanceAmount}}', { balanceAmount: formatPKR(r.balanceAmount) }) : tr('ada {{paidAmount}}', { paidAmount: formatPKR(r.paidAmount) })}</p>
                </div>
                <button type="button" onClick={() => onPrint(r.id)} aria-label={tr('Print')} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><Printer className="h-4 w-4" /></button>
              </div>
            </li>
          );
        })}
      </ul>
      {data!.pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>{tr('Pichla')}</Button>
          <span className="text-sm text-slate-600">{tr('Safha {{page}} / {{pages}}', { page, pages: data!.pages })}</span>
          <Button variant="secondary" size="sm" disabled={page >= data!.pages} onClick={() => onPage(page + 1)}>{tr('Agla')}</Button>
        </div>
      )}
    </div>
  );
}
