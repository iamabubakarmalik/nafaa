/** Hotel-only dashboard widgets. */

import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { AlertTriangle, BarChart3, Bed, Globe, LogIn, LogOut, Sparkle, Users, Wallet, Wrench } from 'lucide-react';
import { Badge } from '@/design-system/components';
import { EmptyHint, IconBubble, ListRow, RowList, useMasked, WidgetCard, type KpiDef } from '@modules/dashboard/engine';
import type { AttentionItem } from '@modules/dashboard/widgets';
import { cn } from '@core/lib/cn';
import type { RoomStatus } from '../api/rooms.api';
import { useHotelOps } from './useHotelOps';
import { t } from '@core/i18n';

const ROOM: Record<RoomStatus, { label: string; dot: string; tile: string }> = {
  AVAILABLE: { label: t('Khaali'), dot: 'bg-success-500', tile: 'border-success-200 bg-success-50/50' },
  OCCUPIED: { label: t('Guest hai'), dot: 'bg-brand-600', tile: 'border-brand-200 bg-brand-50/60' },
  RESERVED: { label: t('Reserved'), dot: 'bg-amber-500', tile: 'border-amber-200 bg-amber-50/60' },
  CLEANING: { label: t('Safai'), dot: 'bg-sky-500', tile: 'border-sky-200 bg-sky-50/60' },
  MAINTENANCE: { label: t('Marammat'), dot: 'bg-orange-500', tile: 'border-orange-200 bg-orange-50/60' },
  OUT_OF_ORDER: { label: t('Kharab'), dot: 'bg-rose-500', tile: 'border-rose-200 bg-rose-50/60' },
  BLOCKED: { label: t('Band'), dot: 'bg-slate-400', tile: 'border-slate-200 bg-slate-50' },
};

const SOURCE_LABEL: Record<string, string> = {
  DIRECT: t('Direct'), WALK_IN: t('Walk-in'), PHONE: t('Phone'), WEBSITE: t('Website'), BOOKING_COM: t('Booking.com'), AGODA: t('Agoda'),
  EXPEDIA: t('Expedia'), AIRBNB: t('Airbnb'), TRAVEL_AGENT: t('Travel agent'), CORPORATE: t('Corporate'), GOVT: t('Sarkari'), REFERRAL: t('Referral'), OTHER: t('Other'),
};

/** Hotel headline numbers, offered next to the common ones. */
export const hotelKpis: KpiDef[] = [
  {
    id: 'hotel-occupancy', label: t('Occupancy'), icon: Bed, tone: 'brand',
    useValue: () => {
      const { rooms, trend, loading } = useHotelOps();
      return {
        loading, to: '/hotel/rooms', value: rooms.total ? `${rooms.occupancy.toFixed(0)}%` : '—',
        hint: t('{{occupied}}/{{total}} kamre', { occupied: rooms.occupied, total: rooms.total }), trend: trend.length > 1 ? trend.map((d) => d.pct) : undefined,
      };
    },
  },
  {
    id: 'hotel-arrivals', label: t('Aaj aane wale'), icon: LogIn, tone: 'success',
    useValue: () => {
      const { guests, loading } = useHotelOps();
      return {
        loading, to: '/hotel/bookings', value: guests.arrivals.length, alert: guests.lateArrivals.length > 0,
        hint: guests.lateArrivals.length ? t('{{count}} pichle din se baqi', { count: guests.lateArrivals.length }) : t('{{upcoming}} aage booked', { upcoming: guests.upcoming }),
      };
    },
  },
  {
    id: 'hotel-departures', label: t('Aaj jaane wale'), icon: LogOut, tone: 'warning',
    useValue: () => {
      const { guests, loading } = useHotelOps();
      return {
        loading, to: '/hotel/bookings', value: guests.departures.length, alert: guests.lateDepartures.length > 0,
        hint: guests.unpaidDepartures.length ? t('{{count}} ka bill baqi', { count: guests.unpaidDepartures.length }) : t('Check-out'),
      };
    },
  },
  {
    id: 'hotel-in-house', label: t('Mehmaan andar'), icon: Users, tone: 'neutral',
    useValue: () => {
      const { guests, loading } = useHotelOps();
      return { loading, to: '/hotel/guests', value: guests.inHouse, hint: t('Checked-in') };
    },
  },
  {
    id: 'hotel-housekeeping', label: t('Safai baqi'), icon: Sparkle, tone: 'info',
    useValue: () => {
      const { rooms, pendingHK, loading } = useHotelOps();
      return { loading, to: '/hotel/housekeeping', value: rooms.dirty, hint: t('{{pendingHK}} kaam khule', { pendingHK }), alert: rooms.dirty > 0 && rooms.available === 0 };
    },
  },
  {
    id: 'hotel-balance', label: t('Mehmaanon se lena'), icon: Wallet, tone: 'danger', sensitive: true,
    useValue: () => {
      const { outstanding, loading } = useHotelOps();
      const { cost } = useMasked();
      return { loading, to: '/hotel/bookings', value: cost(outstanding), hint: t('Chaalu bookings ka baqi') };
    },
  },
];

export function useHotelAttention(): AttentionItem[] {
  const { guests, rooms, pendingHK } = useHotelOps();
  const items: AttentionItem[] = [];

  if (guests.lateDepartures.length) items.push({ icon: AlertTriangle, level: 'danger', text: t('{{count}} mehmaan ka check-out ka din guzar gaya — extend karein ya check-out', { count: guests.lateDepartures.length }), to: '/hotel/bookings', cta: t('Bookings dekhein') });
  if (guests.unpaidDepartures.length) items.push({ icon: Wallet, level: 'warning', text: t('{{count}} mehmaan aaj ja rahe hain aur bill baqi hai — jaane se pehle wasool karein', { count: guests.unpaidDepartures.length }), to: '/hotel/bookings', cta: t('Bill dekhein') });
  if (guests.lateArrivals.length) items.push({ icon: LogIn, level: 'warning', text: t('{{count}} booking ka check-in ka din guzar gaya — no-show ya cancel karein', { count: guests.lateArrivals.length }), to: '/hotel/bookings', cta: t('Bookings dekhein') });
  if (guests.arrivals.length && rooms.dirty) items.push({ icon: Sparkle, level: 'warning', text: t('{{count}} mehmaan aaj aa rahe hain aur {{dirty}} kamre gande hain — safai pehle', { count: guests.arrivals.length, dirty: rooms.dirty }), to: '/hotel/housekeeping', cta: t('Housekeeping') });
  if (guests.departures.length) items.push({ icon: LogOut, level: 'info', text: t('{{count}} check-out aaj hain', { count: guests.departures.length }), to: '/hotel/bookings', cta: t('Dekhein') });
  if (guests.arrivals.length) items.push({ icon: LogIn, level: 'info', text: t('{{count}} mehmaan aaj aayenge', { count: guests.arrivals.length }), to: '/hotel/bookings', cta: t('Dekhein') });
  if (rooms.maintenance + rooms.outOfOrder > 0) items.push({ icon: Wrench, level: 'neutral', text: t('{{value}} kamre marammat ya band hain — bikne wale kamre kam hain', { value: rooms.maintenance + rooms.outOfOrder }), to: '/hotel/rooms', cta: t('Kamre dekhein') });
  if (!guests.arrivals.length && pendingHK) items.push({ icon: Sparkle, level: 'neutral', text: t('{{pendingHK}} safai ke kaam khule hain', { pendingHK }), to: '/hotel/housekeeping', cta: t('Housekeeping') });
  return items;
}

export function HotelRooms() {
  const { rooms } = useHotelOps();
  const counts: Array<[RoomStatus, number]> = [
    ['AVAILABLE', rooms.available], ['OCCUPIED', rooms.occupied], ['CLEANING', rooms.cleaning], ['MAINTENANCE', rooms.maintenance],
  ];
  return (
    <WidgetCard
      title={t('Kamron ka haal')}
      icon={Bed}
      description={rooms.total ? t('{{value}}% bhare · {{dirty}} gande', { value: rooms.occupancy.toFixed(0), dirty: rooms.dirty }) : t('Abhi koi kamra nahi')}
      to="/hotel/rooms"
      linkLabel={t('Kamre')}
    >
      {rooms.total === 0 ? (
        <EmptyHint icon={Bed} text={t('Kamre bana lein — kaunsa khaali, kaunsa bhara, sab yahan nazar aayega.')} />
      ) : (
        <>
          <dl className="grid grid-cols-4 gap-2 text-center">
            {counts.map(([s, n]) => (
              <div key={s} className="rounded-lg bg-slate-50 py-2.5">
                <dd className="text-xl font-bold tabular-nums text-slate-900">{n}</dd>
                <dt className="inline-flex items-center gap-1 text-[0.75rem] text-slate-500"><span className={cn('h-1.5 w-1.5 rounded-full', ROOM[s].dot)} />{ROOM[s].label}</dt>
              </div>
            ))}
          </dl>
          {rooms.list.length > 0 && (
            <div className="mt-3 grid grid-cols-[repeat(auto-fill,minmax(3rem,1fr))] gap-1.5">
              {rooms.list.slice(0, 48).map((r) => {
                const s = ROOM[r.status] ?? ROOM.BLOCKED;
                return (
                  <Link
                    key={r.id}
                    to="/hotel/rooms"
                    title={t('Kamra {{roomNumber}} · {{label}}{{value}}', { roomNumber: r.roomNumber, label: s.label, value: r.housekeepingStatus === 'DIRTY' ? t(' · ganda') : '' })}
                    className={cn('relative rounded-md border px-1 py-1.5 text-center text-[0.8125rem] font-bold tabular-nums text-slate-900 transition hover:border-slate-400', s.tile)}
                  >
                    {r.housekeepingStatus === 'DIRTY' && <span className="absolute end-0.5 top-0.5 h-1.5 w-1.5 rounded-full bg-amber-500" />}
                    {r.roomNumber}
                  </Link>
                );
              })}
            </div>
          )}
        </>
      )}
    </WidgetCard>
  );
}

export function HotelMovements() {
  const { guests } = useHotelOps();
  const { cost } = useMasked();
  return (
    <WidgetCard
      title={t('Aaj aana jaana')}
      icon={LogIn}
      description={t('{{count}} check-in · {{count2}} check-out', { count: guests.arrivals.length, count2: guests.departures.length })}
      to="/hotel/bookings"
      flush
    >
      <RowList empty={t('Aaj koi check-in ya check-out nahi')} emptyIcon={LogIn}>
        {guests.movements.map(({ kind, booking: b, overdue }) => {
          const owes = Number(b.balanceAmount || 0);
          const roomNos = b.bookedRooms?.map((r) => r.roomNumber).filter(Boolean).join(', ');
          return (
            <ListRow
              key={`${kind}-${b.id}`}
              to={`/hotel/bookings/${b.id}`}
              leading={<IconBubble icon={kind === 'in' ? LogIn : LogOut} tone={overdue ? 'danger' : kind === 'in' ? 'success' : 'warning'} />}
              title={b.guestName || t('Mehmaan')}
              meta={<span>{t('{{value}} · {{nights}} raat{{value2}}', { value: roomNos ? t('Kamra {{roomNos}}', { roomNos }) : t('{{value}} kamre', { value: b.bookedRooms?.length ?? 0 }), nights: b.nights, value2: kind === 'out' && owes > 0 ? t(' · baqi {{owes}}', { owes: cost(owes) }) : '' })}</span>}
              value={<Badge variant={overdue ? 'danger' : kind === 'in' ? 'success' : 'warning'} size="xs">{overdue ? t('Late') : kind === 'in' ? t('Check-in') : t('Check-out')}</Badge>}
            />
          );
        })}
      </RowList>
    </WidgetCard>
  );
}

export function HotelOccupancyTrend() {
  const { trend } = useHotelOps();
  const avg = trend.length ? trend.reduce((x, d) => x + d.pct, 0) / trend.length : 0;
  return (
    <WidgetCard title={t('Occupancy — 7 din')} icon={BarChart3} description={trend.length ? t('Ausat {{value}}% kamre bhare', { value: avg.toFixed(0) }) : t('Abhi data nahi')}>
      {trend.length === 0 ? (
        <EmptyHint icon={BarChart3} text={t('Check-in shuru hon to rozana ki occupancy yahan aayegi')} />
      ) : (
        <div className="flex h-36 items-end gap-2">
          {trend.map((d) => (
            <div key={d.date} className="flex h-full flex-1 flex-col items-center justify-end gap-1" title={`${d.date}: ${d.occupied}/${d.total} (${d.pct.toFixed(0)}%)`}>
              <span className="text-[0.6875rem] font-semibold tabular-nums text-slate-600">{d.pct.toFixed(0)}%</span>
              <div className="w-full overflow-hidden rounded-md bg-slate-100" style={{ height: '100%' }}>
                <div className="h-full w-full origin-bottom rounded-md bg-brand-600" style={{ transform: `scaleY(${Math.min(d.pct, 100) / 100})` }} />
              </div>
              <span className="text-[0.6875rem] text-slate-500">{format(new Date(`${d.date}T00:00:00`), 'EEE')}</span>
            </div>
          ))}
        </div>
      )}
    </WidgetCard>
  );
}

export function HotelSources() {
  const { sources } = useHotelOps();
  const { sales } = useMasked();
  const total = sources.reduce((x, s) => x + s.count, 0);
  return (
    <WidgetCard title={t('Booking kahan se aayi')} icon={Globe} description={total ? t('30 din me {{total}} bookings', { total }) : t('30 din me koi booking nahi')}>
      {sources.length === 0 ? (
        <EmptyHint icon={Globe} text={t('Booking ka zariya (walk-in, phone, website) yahan nazar aayega')} />
      ) : (
        <ul className="space-y-3">
          {sources.slice(0, 6).map((s) => (
            <li key={s.source}>
              <div className="flex items-center justify-between gap-2 text-[0.8125rem]">
                <span className="font-medium text-slate-800">{SOURCE_LABEL[s.source] ?? s.source}</span>
                <span className="tabular-nums text-slate-600"><b className="text-slate-900">{s.count}</b> · {sales(s.value)}</span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-brand-600" style={{ width: `${total ? (s.count / total) * 100 : 0}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </WidgetCard>
  );
}
