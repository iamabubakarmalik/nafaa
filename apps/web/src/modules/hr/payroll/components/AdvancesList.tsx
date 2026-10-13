/**
 * Advances and loans: who took how much, the instalments by month (cut or
 * still due), and voucher / cancel actions.
 */

import { CheckCircle2, CircleSlash, Clock, HandCoins, Printer } from 'lucide-react';
import { Avatar, Button, Skeleton } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { formatPKR } from '@core/lib/format';
import type { AdvanceGroup, AdvanceList } from '../api/payroll.api';
import { METHOD_LABEL, day } from './meta';

export function AdvancesList({ data, loading, failed, showAll, canWrite, onGive, onPrint, onCancel, onRetry }: {
  data?: AdvanceList; loading: boolean; failed: boolean; showAll: boolean; canWrite: boolean;
  onGive: () => void; onPrint: (id: string) => void; onCancel: (g: AdvanceGroup) => void; onRetry: () => void;
}) {
  if (loading) return <div className="space-y-2 rounded-3xl bg-white p-4 ring-1 ring-slate-200/80">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>;
  if (failed && !data) {
    return (
      <div className="rounded-3xl bg-white px-6 py-14 text-center ring-1 ring-slate-200/80">
        <p className="font-semibold text-slate-900">Advance load nahi hue</p>
        <Button className="mt-3" variant="secondary" onClick={onRetry}>Dobara koshish</Button>
      </div>
    );
  }
  const groups = (data?.groups ?? []).filter((g) => showAll || g.remaining > 0);
  if (!groups.length) {
    return (
      <div className="rounded-3xl bg-white px-6 py-14 text-center ring-1 ring-slate-200/80">
        <HandCoins className="mx-auto h-10 w-10 text-slate-300" />
        <p className="mt-3 font-semibold text-slate-900">{showAll ? 'Abhi tak koi advance nahi diya' : 'Koi advance baqi nahi'}</p>
        <p className="mt-1 text-sm text-slate-500">Staff ko mahine ke beech paise dene hon to yahan se dein — tankhwah se khud kat jayenge.</p>
        {canWrite && <Button className="mt-4" onClick={onGive} leftIcon={<HandCoins className="h-4 w-4" />}>Advance dein</Button>}
      </div>
    );
  }
  return (
    <ul className="divide-y divide-slate-100 overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
      {groups.map((g) => {
        const cancelled = g.status === 'CANCELLED';
        return (
          <li key={g.number} className={cn('px-3 py-3 sm:px-4', cancelled && 'bg-slate-50/60')}>
            <div className="flex flex-wrap items-center gap-3 sm:flex-nowrap">
              <Avatar name={g.staff.fullName} url={g.staff.avatarUrl} size={40} />
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-1.5">
                  <span className={cn('truncate font-semibold text-slate-900', cancelled && 'text-slate-400 line-through')}>{g.staff.fullName}</span>
                  <span className="font-mono text-[0.75rem] text-slate-400">{g.number}</span>
                  {cancelled && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[0.6875rem] text-slate-500">Cancel</span>}
                </p>
                <p className="truncate text-[0.75rem] text-slate-500">{[g.reason, day(g.givenAt), METHOD_LABEL[g.method] ?? g.method, g.staff.shop?.name].filter(Boolean).join(' · ')}</p>
              </div>
              <div className="text-right">
                <p className="text-base font-bold tabular-nums text-slate-900">{formatPKR(g.total)}</p>
                <p className={cn('text-[0.6875rem]', g.remaining > 0 ? 'text-amber-700' : 'text-emerald-700')}>{cancelled ? '—' : g.remaining > 0 ? `${formatPKR(g.remaining)} katna baqi` : 'Poora kat gaya'}</p>
              </div>
              <div className="flex shrink-0 gap-1">
                <Button size="sm" variant="ghost" onClick={() => onPrint(g.id)} leftIcon={<Printer className="h-4 w-4" />}><span className="hidden lg:inline">Voucher</span></Button>
                {canWrite && g.canCancel && <Button size="sm" variant="ghost" className="text-rose-700" onClick={() => onCancel(g)} leftIcon={<CircleSlash className="h-4 w-4" />}><span className="hidden lg:inline">Cancel</span></Button>}
              </div>
            </div>
            {g.parts.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5 sm:pl-[3.25rem]">
                {g.parts.map((p) => (
                  <span key={p.id} className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.6875rem] ring-1',
                    p.cutIn ? 'bg-emerald-50 text-emerald-800 ring-emerald-200' : 'bg-amber-50 text-amber-800 ring-amber-200')}>
                    {p.cutIn ? <CheckCircle2 className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                    {p.label} · {formatPKR(p.amount)}{p.cutIn ? ` · ${p.cutIn}` : ''}
                  </span>
                ))}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
