/**
 * Month calendar of pickups: each day shows how many open bookings are due
 * and the balance to collect; picking a day lists them. Days are business
 * days, the same as the rest of the page.
 */

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button, Skeleton } from '@/design-system/components';
import { businessDayKey } from '@core/lib/business-day';
import { cn } from '@core/lib/cn';
import { bookingsApi, type BookingQuery } from '../api/bookings.api';
import { BOOKINGS_KEY, STATUS, itemsSummary } from './meta';

const WEEK = ['Pir', 'Mangal', 'Budh', 'Jumeraat', 'Juma', 'Hafta', 'Itwaar'];
const pad = (n: number) => String(n).padStart(2, '0');

export function BookingCalendar({ filters, startHour, money }: {
  filters: Pick<BookingQuery, 'staffId' | 'search'>; startHour: number; money: (n: number) => string;
}) {
  const today = businessDayKey(new Date(), startHour);
  const [month, setMonth] = useState(today.slice(0, 7));
  const [picked, setPicked] = useState<string | null>(today);
  const [y, m] = month.split('-').map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const q: BookingQuery = { ...filters, status: 'ACTIVE', pickupFrom: `${month}-01`, pickupTo: `${month}-${pad(last)}`, sort: 'pickup', limit: 300 };
  const res = useQuery({ queryKey: [BOOKINGS_KEY, 'calendar', q], queryFn: () => bookingsApi.records(q), placeholderData: (p) => p });

  const byDay = useMemo(() => {
    const map = new Map<string, NonNullable<typeof res.data>['items']>();
    for (const b of res.data?.items ?? []) {
      if (!b.expectedPickupAt) continue;
      const k = businessDayKey(new Date(b.expectedPickupAt), startHour);
      map.set(k, [...(map.get(k) ?? []), b]);
    }
    return map;
  }, [res.data, startHour]);

  const lead = (new Date(Date.UTC(y, m - 1, 1)).getUTCDay() + 6) % 7;
  const cells = [...Array(lead).fill(null), ...Array.from({ length: last }, (_, i) => `${month}-${pad(i + 1)}`)];
  const go = (step: number) => {
    const d = new Date(Date.UTC(y, m - 1 + step, 1));
    setMonth(`${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}`);
    setPicked(null);
  };
  const dayRows = picked ? byDay.get(picked) ?? [] : [];
  const title = new Date(Date.UTC(y, m - 1, 15)).toLocaleDateString('en-PK', { month: 'long', year: 'numeric' });

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="rounded-3xl bg-white p-3 shadow-sm ring-1 ring-slate-200/80 sm:p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <Button variant="secondary" size="sm" onClick={() => go(-1)} aria-label="Pichhla mahina"><ChevronLeft className="h-4 w-4" /></Button>
          <div className="text-center">
            <p className="font-semibold text-slate-900">{title}</p>
            <p className="text-[0.75rem] text-slate-500">{res.data ? `${res.data.total} khuli bookings ka pickup` : 'Load ho raha hai'}</p>
          </div>
          <Button variant="secondary" size="sm" onClick={() => go(1)} aria-label="Agla mahina"><ChevronRight className="h-4 w-4" /></Button>
        </div>
        {res.isLoading ? <Skeleton className="h-80 rounded-2xl" /> : (
          <div className="grid grid-cols-7 gap-1 text-center">
            {WEEK.map((w) => <div key={w} className="truncate pb-1 text-[0.6875rem] font-medium text-slate-500">{w}</div>)}
            {cells.map((k, i) => {
              if (!k) return <div key={`x${i}`} />;
              const rows = byDay.get(k) ?? [];
              const due = rows.reduce((s, b) => s + b.balanceDue, 0);
              const late = k < today && rows.length > 0;
              return (
                <button key={k} type="button" onClick={() => setPicked(k)} aria-pressed={picked === k}
                  className={cn('flex min-h-[3.75rem] flex-col items-center rounded-xl p-1 text-[0.8125rem] ring-1 transition sm:min-h-[4.5rem]',
                    picked === k ? 'bg-brand-600 text-white ring-brand-600' : k === today ? 'bg-brand-50 ring-brand-200' : 'ring-slate-100 hover:bg-slate-50')}>
                  <span className="font-semibold tabular-nums">{Number(k.slice(8))}</span>
                  {rows.length > 0 && (
                    <span className={cn('mt-0.5 rounded-full px-1.5 text-[0.6875rem] font-semibold tabular-nums',
                      picked === k ? 'bg-white/25' : late ? 'bg-rose-600 text-white' : 'bg-amber-100 text-amber-900')}>{rows.length}</span>
                  )}
                  {due > 0 && <span className={cn('mt-auto hidden truncate text-[0.625rem] tabular-nums sm:block', picked === k ? 'text-white/80' : 'text-slate-500')}>{money(due)}</span>}
                </button>
              );
            })}
          </div>
        )}
        <p className="mt-3 text-[0.6875rem] text-slate-500">Laal ginti: pickup ka din guzar gaya. Sirf khuli bookings dikhti hain.</p>
      </div>

      <div className="rounded-3xl bg-white p-3 shadow-sm ring-1 ring-slate-200/80 sm:p-4">
        <p className="font-semibold text-slate-900">{picked ? new Date(`${picked}T12:00:00`).toLocaleDateString('en-PK', { weekday: 'long', day: 'numeric', month: 'short' }) : 'Din chunein'}</p>
        <p className="text-[0.75rem] text-slate-500">{dayRows.length ? `${dayRows.length} pickup · ${money(dayRows.reduce((s, b) => s + b.balanceDue, 0))} baqi` : 'Is din koi pickup nahi'}</p>
        <ul className="mt-3 space-y-2">
          {dayRows.map((b) => {
            const s = STATUS[b.status];
            return (
              <li key={b.id}>
                <Link to={`/bookings/${b.id}`} className="block rounded-2xl px-3 py-2 ring-1 ring-slate-200 transition hover:bg-slate-50">
                  <span className="flex items-center justify-between gap-2">
                    <span className="truncate font-medium text-slate-900">{b.customer?.name ?? 'Customer'}</span>
                    <span className={cn('inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[0.6875rem] font-medium ring-1', s.tone)}><s.icon className="h-3 w-3" />{s.label}</span>
                  </span>
                  <span className="mt-0.5 block truncate text-[0.75rem] text-slate-500">{b.bookingNumber} · {itemsSummary(b)}</span>
                  {b.balanceDue > 0 && <span className="mt-0.5 block text-[0.75rem] font-semibold tabular-nums text-amber-700">Baqi {money(b.balanceDue)}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
