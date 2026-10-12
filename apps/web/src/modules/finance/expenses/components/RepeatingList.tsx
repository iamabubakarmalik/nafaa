/**
 * Bills that come back every month (rent, electricity, wages), found from the
 * last three months. Shows which are still to record this month, with a one
 * click "likhein" that opens the form filled in.
 */

import { CalendarClock, CheckCircle2, Plus, Repeat } from 'lucide-react';
import { Button, Skeleton } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { formatPKR } from '@core/lib/format';
import type { RepeatingExpense, RepeatingExpenses } from '../api/expenses.api';
import { day, methodOf } from './meta';

export function RepeatingList({ data, loading, failed, onRecord }: {
  data?: RepeatingExpenses;
  loading: boolean;
  failed: boolean;
  onRecord: (r: RepeatingExpense) => void;
}) {
  if (loading) return <div className="space-y-2 rounded-3xl bg-white p-4 ring-1 ring-slate-200/80">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>;
  if (failed || !data) return <p className="rounded-3xl bg-white px-6 py-14 text-center text-sm text-slate-500 ring-1 ring-slate-200/80">Yeh list load nahi hui — internet check karein.</p>;
  if (!data.items.length) {
    return (
      <div className="rounded-3xl bg-white px-6 py-14 text-center ring-1 ring-slate-200/80">
        <Repeat className="mx-auto h-10 w-10 text-slate-300" />
        <p className="mt-3 font-semibold text-slate-900">Abhi koi har mahine wala kharcha nahi mila</p>
        <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">Jo kharcha pichle 3 me se 2 mahine ek hi naam aur category se likha gaya ho (maslan "Dukaan ka kiraya"), woh yahan khud aa jata hai aur yaad dilata hai.</p>
      </div>
    );
  }
  const due = data.items.filter((i) => i.due);
  const done = data.items.filter((i) => !i.due);
  return (
    <div className="space-y-3">
      {due.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-amber-50 px-4 py-3 text-[0.8125rem] text-amber-900 ring-1 ring-amber-200">
          <CalendarClock className="h-4 w-4" />
          <span><b>{due.length}</b> kharche is mahine abhi nahi likhe — pichli dafa ke hisaab se takreeban <b>{formatPKR(data.dueAmount)}</b></span>
        </div>
      )}
      <ul className="divide-y divide-slate-100 overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
        {[...due, ...done].map((r) => <Item key={r.key} r={r} onRecord={() => onRecord(r)} />)}
      </ul>
    </div>
  );
}

function Item({ r, onRecord }: { r: RepeatingExpense; onRecord: () => void }) {
  const color = r.category?.color ?? '#64748b';
  return (
    <li className={cn('flex flex-wrap items-center gap-3 px-3 py-3 sm:flex-nowrap sm:px-4', !r.due && 'opacity-80')}>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-base" style={{ backgroundColor: `${color}1a`, color }}>
        {r.category?.icon || <Repeat className="h-4 w-4" />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-2">
          <span className="truncate font-semibold text-slate-900">{r.title}</span>
          {r.due
            ? <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[0.6875rem] font-medium text-amber-800 ring-1 ring-amber-200">Is mahine baqi</span>
            : <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[0.6875rem] font-medium text-emerald-700 ring-1 ring-emerald-200"><CheckCircle2 className="h-3 w-3" />Likh liya {formatPKR(r.thisMonth.amount)}</span>}
          {r.thisMonth.pending > 0 && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[0.6875rem] text-amber-800 ring-1 ring-amber-200">Bill ada karna hai</span>}
        </p>
        <p className="mt-0.5 truncate text-[0.75rem] text-slate-500">
          {r.category?.name ?? 'Bina category'} · {r.months} mahine · aam tor par {r.usualDay} tareekh · aakhri {day(r.lastDate)} ({methodOf(r.paymentMethod).label})
        </p>
      </div>
      <div className="ml-auto text-right">
        <p className="font-bold tabular-nums text-slate-900">{formatPKR(r.lastAmount)}</p>
        {Math.abs(r.average - r.lastAmount) >= 1 && <p className="text-[0.6875rem] tabular-nums text-slate-500">ausat {formatPKR(r.average)}</p>}
      </div>
      <Button size="sm" variant={r.due ? 'primary' : 'secondary'} onClick={onRecord} leftIcon={<Plus className="h-4 w-4" />}>{r.due ? 'Likhein' : 'Phir likhein'}</Button>
    </li>
  );
}
