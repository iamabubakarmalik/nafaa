/**
 * The month's ranking: a podium for the top three and a ranked list by
 * commission, net sale or bills, with target progress for each person.
 */

import { useState } from 'react';
import { Medal, Target, Trophy } from 'lucide-react';
import { Avatar, Segmented } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { formatPKR } from '@core/lib/format';
import type { CommissionRow } from '../api/commission.api';
import { signed } from './meta';

type By = 'earned' | 'sale' | 'bills';
const LABEL: Record<By, string> = { earned: 'Commission', sale: 'Bikri', bills: 'Bill' };
const MEDAL = ['#f59e0b', '#94a3b8', '#b45309'];

export function Leaderboard({ rows, onOpen }: { rows: CommissionRow[]; onOpen: (r: CommissionRow) => void }) {
  const [by, setBy] = useState<By>('earned');
  const list = rows.filter((r) => r.enrolled).sort((a, b) => b[by] - a[by] || b.sale - a.sale);
  const show = (r: CommissionRow) => (by === 'bills' ? String(r.bills) : by === 'sale' ? formatPKR(r.sale) : signed(r.earned));
  const max = Math.max(1, ...list.map((r) => r[by]));

  if (!list.length) {
    return (
      <div className="rounded-3xl bg-white px-6 py-14 text-center ring-1 ring-slate-200/80">
        <Trophy className="mx-auto h-10 w-10 text-slate-300" />
        <p className="mt-3 font-semibold text-slate-900">Abhi koi muqabla nahi</p>
        <p className="mt-1 text-sm text-slate-500">Jin bandon par commission chaalu hai woh yahan bikri ke hisaab se aate hain.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[0.8125rem] text-slate-500">Sirf chaalu bande · wapsi nikaal kar</p>
        <Segmented label="Kis par" value={by} onChange={(v) => setBy(v as By)} items={(Object.keys(LABEL) as By[]).map((k) => ({ value: k, label: LABEL[k] }))} />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {list.slice(0, 3).map((r, i) => (
          <button key={r.userId} type="button" onClick={() => onOpen(r)}
            className={cn('flex flex-col items-center rounded-2xl bg-white p-4 text-center shadow-sm ring-1 ring-slate-200/80 transition hover:ring-brand-300', i === 0 && 'sm:order-2 sm:-mt-2 ring-2 ring-amber-300', i === 2 && 'sm:order-3')}>
            <span className="relative">
              <Avatar name={r.name} size={i === 0 ? 60 : 48} />
              <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full text-white shadow" style={{ background: MEDAL[i] }}>
                {i === 0 ? <Trophy className="h-3.5 w-3.5" /> : <Medal className="h-3.5 w-3.5" />}
              </span>
            </span>
            <p className="mt-2 max-w-full truncate font-semibold text-slate-900">{r.name}</p>
            <p className="text-xl font-bold tabular-nums text-brand-700">{show(r)}</p>
            <p className="text-[0.75rem] text-slate-500">{r.bills} bill · {formatPKR(r.sale)}</p>
          </button>
        ))}
      </div>

      <ol className="divide-y divide-slate-100 overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
        {list.map((r, i) => {
          const t = r.targets[0];
          return (
            <li key={r.userId}>
              <button type="button" onClick={() => onOpen(r)} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-slate-50">
                <span className="w-6 shrink-0 text-center text-sm font-bold tabular-nums text-slate-400">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate font-medium text-slate-900">{r.name}</p>
                    <p className="shrink-0 font-semibold tabular-nums text-slate-900">{show(r)}</p>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-brand-500" style={{ width: `${Math.max(0, (r[by] / max) * 100)}%` }} /></div>
                  {t && (
                    <p className={cn('mt-1 inline-flex items-center gap-1 text-[0.6875rem]', t.reached ? 'text-emerald-700' : 'text-slate-500')}>
                      <Target className="h-3 w-3" />Target {formatPKR(t.amount)}: {Math.round(t.pct)}%{t.reached ? ' — poora' : ''}
                    </p>
                  )}
                </div>
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
