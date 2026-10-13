/**
 * The next seven business days as columns: every cake due that day by
 * time, so the kitchen sees the week's load at a glance.
 */

import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Cake } from 'lucide-react';
import { Skeleton } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { formatPKR } from '@core/lib/format';
import { businessDayKey } from '@core/lib/business-day';
import { cakeOrdersApi } from '../../api/cake-orders.api';
import { CAKE_KEY, sizeLabel, flavorLabel, statusOf, timeOnly } from '../meta';
import { LoadFailed } from '../charts';

export function CakeWeek({ startHour }: { startHour: number }) {
  const keys = useMemo(() => Array.from({ length: 7 }, (_, i) => businessDayKey(new Date(Date.now() + i * 86_400_000), startHour)), [startHour]);
  const q = useQuery({ queryKey: [CAKE_KEY, 'week', keys[0]], queryFn: () => cakeOrdersApi.calendar(keys[0], keys[6]), refetchInterval: 120_000 });
  if (q.isError && !q.data) return <LoadFailed what="Hafte ke orders" retry={() => q.refetch()} />;
  if (!q.data) return <div className="grid gap-3 md:grid-cols-7">{keys.map((k) => <Skeleton key={k} className="h-64 rounded-2xl" />)}</div>;

  const byDay = new Map<string, typeof q.data>();
  for (const o of q.data) {
    const k = businessDayKey(new Date(o.neededBy), startHour);
    byDay.set(k, [...(byDay.get(k) ?? []), o]);
  }

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-7">
      {keys.map((k, i) => {
        const list = (byDay.get(k) ?? []).filter((o) => o.status !== 'DELIVERED');
        const value = list.reduce((s, o) => s + Number(o.total || 0), 0);
        const d = new Date(`${k}T12:00:00`);
        return (
          <section key={k} className={cn('flex min-h-[10rem] flex-col rounded-2xl bg-white shadow-sm ring-1', i === 0 ? 'ring-brand-300' : 'ring-slate-200/80')}>
            <header className="border-b border-slate-100 px-3 py-2">
              <p className="text-[0.8125rem] font-semibold text-slate-900">{i === 0 ? 'Aaj' : i === 1 ? 'Kal' : d.toLocaleDateString('en-PK', { weekday: 'long' })}</p>
              <p className="text-[0.6875rem] text-slate-500">{d.toLocaleDateString('en-PK', { day: 'numeric', month: 'short' })} · {list.length} cake{list.length ? ` · ${formatPKR(value)}` : ''}</p>
            </header>
            <ul className="flex-1 space-y-1.5 p-2">
              {list.length === 0 && <li className="flex h-full items-center justify-center py-6 text-[0.75rem] text-slate-400"><Cake className="mr-1 h-3.5 w-3.5" />Koi order nahi</li>}
              {list.map((o) => {
                const st = statusOf(o.status);
                return (
                  <li key={o.id}>
                    <Link to={`/bakery/cake-orders/${o.id}`} className="block rounded-xl px-2.5 py-2 ring-1 ring-slate-100 hover:bg-slate-50 hover:ring-slate-200">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[0.75rem] font-semibold tabular-nums text-slate-900">{timeOnly(o.neededBy)}</span>
                        <span className="h-2 w-2 rounded-full" style={{ background: st.color }} title={st.label} />
                      </div>
                      <p className="truncate text-[0.8125rem] font-medium text-slate-800">{o.customerName}</p>
                      <p className="truncate text-[0.6875rem] text-slate-500">{sizeLabel(o.size)} · {flavorLabel(o.flavor)}</p>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
