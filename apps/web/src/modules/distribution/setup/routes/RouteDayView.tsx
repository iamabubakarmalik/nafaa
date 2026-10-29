/**
 * The routes due on one day (by weekday) and how far each got: shops
 * visited out of planned, orders booked and their value. Pick a date to see
 * another day.
 */

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { CalendarDays, ChevronLeft, ChevronRight, ClipboardCheck, MapPin, Truck, UserRound } from 'lucide-react';
import { Button, Input, Select, Skeleton } from '@/design-system/components';
import { DIST_KEY, distSetupApi } from '../../api/distribution.api';
import { rs } from '../../lib/meta';
import { WEEKDAYS } from '../shared';
import { useTeam } from './useTeam';

const key = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export function RouteDayView() {
  const [params] = useSearchParams();
  const [date, setDate] = useState(() => (/^\d{4}-\d{2}-\d{2}$/.test(params.get('date') ?? '') ? params.get('date')! : key(new Date())));
  const [bookerId, setBookerId] = useState('');
  const teamQ = useTeam();
  const q = useQuery({ queryKey: [DIST_KEY, 'route-day', date, bookerId], queryFn: () => distSetupApi.routeDay({ date, bookerId: bookerId || undefined }) });
  const shift = (n: number) => { const [y, m, d] = date.split('-').map(Number); setDate(key(new Date(y, m - 1, d + n))); };
  const bookers = useMemo(() => (teamQ.data ?? []).filter((m) => m.isActive && m.permissions?.includes('distribution.orders.book')), [teamQ.data]);
  const data = q.data;
  const totals = useMemo(() => (data?.routes ?? []).reduce((t, r) => ({ c: t.c + r.customers, v: t.v + r.visited, o: t.o + r.orders, val: t.val + r.orderValue }), { c: 0, v: 0, o: 0, val: 0 }), [data]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-2 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-200/80">
        <div className="flex items-end gap-1">
          <Button size="sm" variant="ghost" aria-label="Pichla din" onClick={() => shift(-1)}><ChevronLeft className="h-4 w-4" /></Button>
          <Input size="sm" type="date" aria-label="Date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} wrapperClassName="w-40" />
          <Button size="sm" variant="ghost" aria-label="Agla din" onClick={() => shift(1)}><ChevronRight className="h-4 w-4" /></Button>
        </div>
        <Select size="sm" aria-label="Booker" value={bookerId} onChange={(e) => setBookerId(e.target.value)} wrapperClassName="w-48"
          options={[{ value: '', label: 'Sab bookers' }, ...bookers.map((b) => ({ value: b.id, label: b.fullName }))]} />
        <p className="ml-auto text-[0.8125rem] text-slate-600">
          <CalendarDays className="mr-1 inline h-4 w-4 text-slate-400" />
          {data ? <><b className="text-slate-900">{WEEKDAYS[data.weekday]}</b> · {data.routes.length} route · {totals.v}/{totals.c} visit · {totals.o} orders · {rs(totals.val)}</> : '…'}
        </p>
      </div>

      {q.isLoading ? <Skeleton className="h-60 rounded-2xl" /> : !data?.routes.length ? (
        <div className="rounded-2xl bg-white px-5 py-12 text-center text-sm text-slate-500 shadow-sm ring-1 ring-slate-200/80">Is din koi route nahi — route ke din "Routes" me set karein.</div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {data.routes.map((r) => {
            const pct = r.customers ? Math.round((r.visited / r.customers) * 100) : 0;
            return (
              <div key={r.id} className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80">
                <div className="flex items-start gap-2">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700"><MapPin className="h-4 w-4" /></span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-slate-900">{r.name}</p>
                    <p className="truncate text-[0.75rem] text-slate-500">{r.area || r.code || '—'}</p>
                  </div>
                  <span className="text-[0.8125rem] font-bold tabular-nums text-slate-900">{pct}%</span>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Visit">
                  <div className="h-full rounded-full bg-brand-500" style={{ width: `${pct}%` }} />
                </div>
                <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
                  <div><dt className="text-[0.6875rem] text-slate-500">Visit</dt><dd className="font-semibold tabular-nums text-slate-900">{r.visited}/{r.customers}</dd></div>
                  <div><dt className="text-[0.6875rem] text-slate-500">Orders</dt><dd className="font-semibold tabular-nums text-slate-900">{r.orders}</dd></div>
                  <div><dt className="text-[0.6875rem] text-slate-500">Value</dt><dd className="truncate font-semibold tabular-nums text-slate-900">{rs(r.orderValue)}</dd></div>
                </dl>
                <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 border-t border-slate-100 pt-2 text-[0.75rem] text-slate-600">
                  <span className="inline-flex items-center gap-1"><UserRound className="h-3.5 w-3.5 text-slate-400" />{r.bookerName ?? 'Booker nahi'}</span>
                  <span className="inline-flex items-center gap-1"><Truck className="h-3.5 w-3.5 text-slate-400" />{r.deliveryUserName ?? 'Delivery nahi'}</span>
                  {r.orders > 0 && <span className="inline-flex items-center gap-1 text-brand-700"><ClipboardCheck className="h-3.5 w-3.5" />{r.orders} order</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
