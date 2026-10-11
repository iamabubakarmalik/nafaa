/**
 * Hotel's own numbers for the dashboard: rooms, today's arrivals and
 * departures, guests in house, housekeeping and booking sources. Every hotel
 * widget calls this; React Query shares the requests between them.
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { hotelDashboardApi } from '../api/dashboard.api';
import { bookingsApi, type BookingSource, type HotelBooking } from '../api/bookings.api';
import { roomsApi, type HotelRoom, type RoomStatus } from '../api/rooms.api';

const SECOND = 1_000;
const MINUTE = 60 * SECOND;

interface HotelOverview {
  rooms?: { total?: number; occupied?: number; available?: number; cleaning?: number; maintenance?: number; occupancyPct?: number; dirty?: number };
  operations?: { arrivalsToday?: number; departuresToday?: number; inHouse?: number; todayBookings?: number; pendingHK?: number };
  revenue?: { today?: number; monthly?: number; collected?: number; outstanding?: number };
  occupancyTrend?: Array<{ date: string; occupied: number; total: number; pct: number }>;
  bySource?: Array<{ source: BookingSource; _count?: { _all?: number }; _sum?: { grandTotal?: number | string | null } }>;
}

/** Calendar date of a booking field; check-in and check-out are calendar dates, not business days. */
const dayOf = (iso?: string | null) => (iso ? iso.slice(0, 10) : '');

export interface Movement {
  kind: 'in' | 'out';
  booking: HotelBooking;
  /** Was due on an earlier day and still not done. */
  overdue: boolean;
}

export function useHotelOps() {
  const overviewQ = useQuery({
    queryKey: ['hotel-dashboard'],
    queryFn: () => hotelDashboardApi.overview().catch(() => null) as Promise<HotelOverview | null>,
    refetchInterval: MINUTE,
  });
  const bookingsQ = useQuery({ queryKey: ['hotel-bookings-dash'], queryFn: () => bookingsApi.list().catch(() => [] as HotelBooking[]), refetchInterval: 30 * SECOND });
  const roomsQ = useQuery({ queryKey: ['hotel-rooms-dash'], queryFn: () => roomsApi.list({}).catch(() => [] as HotelRoom[]), refetchInterval: 30 * SECOND });

  const o = overviewQ.data;

  const rooms = useMemo(() => {
    const list = (roomsQ.data ?? []).filter((r) => r.isActive !== false);
    const count = (s: RoomStatus) => list.filter((r) => r.status === s).length;
    const total = o?.rooms?.total ?? list.length;
    const occupied = o?.rooms?.occupied ?? count('OCCUPIED');
    return {
      list,
      total,
      occupied,
      available: o?.rooms?.available ?? count('AVAILABLE'),
      cleaning: o?.rooms?.cleaning ?? count('CLEANING'),
      maintenance: o?.rooms?.maintenance ?? count('MAINTENANCE'),
      outOfOrder: count('OUT_OF_ORDER') + count('BLOCKED'),
      reserved: count('RESERVED'),
      dirty: o?.rooms?.dirty ?? list.filter((r) => r.housekeepingStatus === 'DIRTY').length,
      occupancy: o?.rooms?.occupancyPct ?? (total > 0 ? (occupied / total) * 100 : 0),
    };
  }, [roomsQ.data, o]);

  const guests = useMemo(() => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const all = bookingsQ.data ?? [];
    const staying = all.filter((b) => b.status === 'CHECKED_IN' || b.status === 'EXTENDED');
    const arrivals = all.filter((b) => b.status === 'CONFIRMED' && dayOf(b.checkInDate) && dayOf(b.checkInDate) <= today);
    const departures = staying.filter((b) => dayOf(b.checkOutDate) && dayOf(b.checkOutDate) <= today);
    const movements: Movement[] = [
      ...departures.map((b) => ({ kind: 'out' as const, booking: b, overdue: dayOf(b.checkOutDate) < today })),
      ...arrivals.map((b) => ({ kind: 'in' as const, booking: b, overdue: dayOf(b.checkInDate) < today })),
    ].sort((a, b) => Number(b.overdue) - Number(a.overdue));
    return {
      inHouse: staying.length,
      upcoming: all.filter((b) => b.status === 'CONFIRMED' && dayOf(b.checkInDate) > today).length,
      arrivals,
      departures,
      lateArrivals: arrivals.filter((b) => dayOf(b.checkInDate) < today),
      lateDepartures: departures.filter((b) => dayOf(b.checkOutDate) < today),
      // Guests leaving today who still owe money: collect before the key comes back.
      unpaidDepartures: departures.filter((b) => Number(b.balanceAmount || 0) > 0),
      movements: movements.slice(0, 8),
    };
  }, [bookingsQ.data]);

  const sources = useMemo(() => {
    const rows = (o?.bySource ?? []).map((s) => ({
      source: s.source,
      count: Number(s._count?._all ?? 0),
      value: Number(s._sum?.grandTotal ?? 0),
    }));
    return rows.sort((a, b) => b.count - a.count);
  }, [o]);

  return {
    rooms,
    guests,
    sources,
    trend: o?.occupancyTrend ?? [],
    pendingHK: Number(o?.operations?.pendingHK ?? 0),
    outstanding: Number(o?.revenue?.outstanding ?? 0),
    loading: overviewQ.isLoading || bookingsQ.isLoading,
  };
}
