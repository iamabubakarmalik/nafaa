/**
 * Occupancy, ADR and RevPAR for a date range: headline tiles, nightly
 * occupancy bars (sold, plus booked-ahead nights in a lighter step) and the
 * room-type table. Room revenue counts nights stayed, at the agreed rate.
 */

import { useQuery } from '@tanstack/react-query';
import { BedDouble, CalendarRange, Percent, TrendingUp } from 'lucide-react';
import { Button, KpiCard, KpiRow, Skeleton, Table, TBody, Td, Th, THead, Tr } from '@/design-system/components';
import { formatPKR } from '@core/lib/format';
import { useMasked } from '@modules/dashboard/engine/useMasked';
import { hotelDashboardApi } from '../api/dashboard.api';
import { HOTEL_KEYS, apiError, stayDay } from './meta';

export function OccupancyPanel({ from, to }: { from: string; to: string }) {
  const { sales } = useMasked();
  const q = useQuery({ queryKey: [HOTEL_KEYS.reports, 'occupancy', from, to], queryFn: () => hotelDashboardApi.occupancy({ from, to }) });
  if (q.isLoading) return <Skeleton className="h-72 rounded-3xl" />;
  if (!q.data) {
    return (
      <div className="rounded-3xl bg-white px-6 py-10 text-center ring-1 ring-slate-200/80">
        <p className="font-semibold text-slate-900">Report load nahi hua</p>
        <p className="mt-1 text-sm text-slate-500">{apiError(q.error, 'Reports dekhne ki permission chahiye')}</p>
        <Button className="mt-3" variant="secondary" onClick={() => q.refetch()}>Dobara koshish</Button>
      </div>
    );
  }
  const d = q.data;
  const peak = Math.max(d.rooms, ...d.series.map((s) => s.sold + s.booked), 1);
  return (
    <div className="space-y-4">
      <KpiRow cols={4}>
        <KpiCard icon={Percent} color="#4f46e5" label="Occupancy" value={`${d.totals.occupancyPct.toFixed(0)}%`} hint={`${d.totals.roomNights} / ${d.totals.available} room-raatein`} />
        <KpiCard icon={TrendingUp} color="#16a34a" label="ADR (ausat rate)" value={sales(d.totals.adr)} hint="Room ki kamai ÷ biki raatein" />
        <KpiCard icon={BedDouble} color="#0891b2" label="RevPAR" value={sales(d.totals.revpar)} hint="Room ki kamai ÷ kul room-raatein" />
        <KpiCard icon={CalendarRange} color="#7c3aed" label="Room ki kamai" value={sales(d.totals.revenue)} hint={`${stayDay(d.from)} – ${stayDay(d.to)}`} />
      </KpiRow>

      <div className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-[0.9375rem] font-semibold text-slate-900">Har raat kitne room bhare</h3>
          <p className="text-[0.75rem] text-slate-500"><span className="mr-1 inline-block h-2.5 w-2.5 rounded-sm bg-brand-600 align-middle" />Guest thehra <span className="ml-3 mr-1 inline-block h-2.5 w-2.5 rounded-sm bg-brand-200 align-middle" />Aage ki booking · kul {d.rooms} room</p>
        </div>
        <div className="flex h-40 items-end gap-[2px]" role="img" aria-label="Rozana occupancy">
          {d.series.map((s) => (
            <div key={s.date} className="group relative flex h-full min-w-0 flex-1 flex-col justify-end" title={`${stayDay(s.date, { day: true })}: ${s.sold} bhare${s.booked ? `, ${s.booked} booked` : ''} · ${s.occupancyPct.toFixed(0)}% · ADR ${formatPKR(s.adr)}`}>
              {s.booked > 0 && <div className="rounded-t-[4px] bg-brand-200" style={{ height: `${(s.booked / peak) * 100}%` }} />}
              <div className={s.booked ? 'bg-brand-600' : 'rounded-t-[4px] bg-brand-600'} style={{ height: `${(s.sold / peak) * 100}%`, marginTop: s.booked && s.sold ? 2 : 0 }} />
              <span className="pointer-events-none absolute inset-x-0 bottom-0 top-0 rounded bg-slate-900/0 group-hover:bg-slate-900/5" />
            </div>
          ))}
        </div>
        <div className="mt-1 flex justify-between text-[0.6875rem] text-slate-400"><span>{stayDay(d.from)}</span><span>{stayDay(d.to)}</span></div>
      </div>

      <Table minWidth="34rem">
        <THead><Tr><Th>Room type</Th><Th align="right">Room</Th><Th align="right">Biki raatein</Th><Th align="right">Occupancy</Th><Th align="right">ADR</Th><Th align="right">Kamai</Th></Tr></THead>
        <TBody>
          {d.byType.map((t) => (
            <Tr key={t.roomTypeId}>
              <Td className="font-medium text-slate-900">{t.name}</Td>
              <Td align="right" className="tabular-nums">{t.rooms}</Td>
              <Td align="right" className="tabular-nums">{t.nights}</Td>
              <Td align="right" className="tabular-nums">{t.occupancyPct.toFixed(0)}%</Td>
              <Td align="right" className="tabular-nums">{sales(t.adr)}</Td>
              <Td align="right" className="font-semibold tabular-nums">{sales(t.revenue)}</Td>
            </Tr>
          ))}
          {!d.byType.length && <Tr><Td colSpan={6} className="py-6 text-center text-slate-500">Is waqt me koi stay nahi</Td></Tr>}
        </TBody>
      </Table>
    </div>
  );
}
