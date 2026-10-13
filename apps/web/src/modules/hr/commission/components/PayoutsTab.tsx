/**
 * Payout record: every commission payment for the last twelve months up to
 * the chosen month, with who recorded it, a total per person and CSV.
 */

import { useQuery } from '@tanstack/react-query';
import { Download, Wallet } from 'lucide-react';
import { Button, Skeleton } from '@/design-system/components';
import { formatPKR } from '@core/lib/format';
import { commissionApi } from '../api/commission.api';
import { COMMISSION_KEY, dayTime, downloadCsv, periodLabel, shiftPeriod } from './meta';

export function PayoutsTab({ period, search }: { period: string; search: string }) {
  const from = shiftPeriod(period, -11);
  const q = useQuery({ queryKey: [COMMISSION_KEY, 'payouts', from, period], queryFn: () => commissionApi.payouts(from, period) });
  const needle = search.trim().toLowerCase();
  const rows = (q.data ?? []).filter((p) => !needle || p.name.toLowerCase().includes(needle));
  const total = rows.reduce((a, p) => a + p.amount, 0);

  if (q.isLoading) return <div className="space-y-2 rounded-3xl bg-white p-4 ring-1 ring-slate-200/80">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>;
  if (q.isError) {
    return (
      <div className="rounded-3xl bg-white px-6 py-14 text-center ring-1 ring-slate-200/80">
        <p className="font-semibold text-slate-900">Adaigi ka record load nahi hua</p>
        <Button className="mt-3" variant="secondary" onClick={() => q.refetch()}>Dobara koshish</Button>
      </div>
    );
  }
  if (!rows.length) {
    return (
      <div className="rounded-3xl bg-white px-6 py-14 text-center ring-1 ring-slate-200/80">
        <Wallet className="mx-auto h-10 w-10 text-slate-300" />
        <p className="mt-3 font-semibold text-slate-900">{needle ? 'Is naam ki koi adaigi nahi' : 'Pichle 12 mahine me koi adaigi nahi likhi'}</p>
        <p className="mt-1 text-sm text-slate-500">Hisab tab me kisi bande par "Ada karein" dabayein — yahan record ban jata hai.</p>
      </div>
    );
  }

  const csv = () => downloadCsv(`commission-adaigi-${from}-${period}.csv`, [
    ['Banda', 'Mahina', 'Raqam', 'Kab', 'Kis ne likha', 'Note'],
    ...rows.map((p) => [p.name, p.period, p.amount.toFixed(2), dayTime(p.paidAt), p.paidBy ?? '', p.note ?? '']),
  ]);

  return (<>
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-2xl bg-white px-4 py-2.5 text-[0.8125rem] shadow-sm ring-1 ring-slate-200/80">
      <span className="text-slate-500">{periodLabel(from)} se {periodLabel(period)} tak</span>
      <span className="font-semibold text-slate-900">Kul ada {formatPKR(total)} <span className="font-normal text-slate-500">({rows.length})</span></span>
      <span className="flex-1" />
      <Button size="sm" variant="ghost" leftIcon={<Download className="h-4 w-4" />} onClick={csv}>CSV</Button>
    </div>
    <ul className="divide-y divide-slate-100 overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
      {rows.map((p) => (
        <li key={p.id} className="flex items-center gap-3 px-4 py-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700"><Wallet className="h-4 w-4" /></span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium text-slate-900">{p.name} <span className="font-normal text-slate-500">· {periodLabel(p.period)}</span></p>
            <p className="truncate text-[0.75rem] text-slate-500">{dayTime(p.paidAt)}{p.paidBy ? ` · ${p.paidBy} ne likha` : ''}{p.note ? ` · ${p.note}` : ''}</p>
          </div>
          <p className="shrink-0 font-semibold tabular-nums text-slate-900">{formatPKR(p.amount)}</p>
        </li>
      ))}
    </ul>
  </>);
}
