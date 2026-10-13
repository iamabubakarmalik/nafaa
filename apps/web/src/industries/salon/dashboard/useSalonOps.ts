/**
 * Salon's own numbers for the dashboard: today's appointments, who is in
 * the chair, staff load, memberships about to expire and active packages.
 * Every salon widget calls this; React Query shares the requests between them.
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { addDays, endOfDay, startOfDay } from 'date-fns';
import { appointmentsApi, type Appointment, type AppointmentStatus } from '../api/appointments.api';
import { staffProfilesApi, type StaffProfile } from '../api/staff-profiles.api';
import { membershipsApi, type Membership } from '../api/memberships.api';
import { packagesApi, type PackagePurchase } from '../api/packages.api';

const SECOND = 1_000;
const MINUTE = 60 * SECOND;
const DAY = 86_400_000;

/** A confirmed booking this many minutes past its start is likely a no-show. */
const NO_SHOW_AFTER_MIN = 15;
/** A customer who arrived this long ago and is not in the chair is waiting too long. */
const WAITING_AFTER_MIN = 10;

const minutesTo = (iso?: string | null) => (iso ? (new Date(iso).getTime() - Date.now()) / MINUTE : 0);

export type SalonAppointment = Appointment & { startsIn: number };

export const staffName = (s?: StaffProfile) => {
  const p = s?.staff as { fullName?: string; firstName?: string; lastName?: string; name?: string } | undefined;
  return `${(p?.fullName || p?.firstName) ?? ''} ${p?.lastName ?? ''}`.trim() || p?.name || 'Staff';
};

export function useSalonOps() {
  // Appointment times are calendar times, so the calendar day is right here (not the business day).
  const todayStart = startOfDay(new Date()).toISOString();
  const todayEnd = endOfDay(new Date()).toISOString();
  const weekEnd = endOfDay(addDays(new Date(), 7)).toISOString();

  const todayQ = useQuery({ queryKey: ['salon-appointments-today'], queryFn: () => appointmentsApi.calendar(todayStart, todayEnd).catch(() => [] as Appointment[]), refetchInterval: 30 * SECOND });
  const weekQ = useQuery({ queryKey: ['salon-appointments-upcoming'], queryFn: () => appointmentsApi.calendar(todayStart, weekEnd).catch(() => [] as Appointment[]), refetchInterval: MINUTE });
  const staffQ = useQuery({ queryKey: ['salon-staff-dash'], queryFn: () => staffProfilesApi.list({ bookable: true }).catch(() => [] as StaffProfile[]), refetchInterval: 5 * MINUTE });
  const membershipsQ = useQuery({ queryKey: ['salon-active-memberships'], queryFn: () => membershipsApi.list({ status: 'ACTIVE' }).catch(() => [] as Membership[]), refetchInterval: 5 * MINUTE });
  const packagesQ = useQuery({ queryKey: ['salon-active-packages'], queryFn: () => packagesApi.purchases({ status: 'ACTIVE' }).catch(() => [] as PackagePurchase[]), refetchInterval: 5 * MINUTE });

  const today = useMemo(() => {
    const all: SalonAppointment[] = (todayQ.data ?? []).map((a) => ({ ...a, startsIn: minutesTo(a.scheduledStart) }));
    const is = (...s: AppointmentStatus[]) => all.filter((a) => s.includes(a.status));
    const booked = is('CONFIRMED');
    const pending = is('CONFIRMED', 'ARRIVED', 'IN_PROGRESS');
    const counts = all.reduce<Partial<Record<AppointmentStatus, number>>>((m, a) => ({ ...m, [a.status]: (m[a.status] ?? 0) + 1 }), {});
    return {
      all,
      counts,
      total: all.filter((a) => a.status !== 'CANCELLED' && a.status !== 'DRAFT').length,
      pending,
      inChair: is('IN_PROGRESS'),
      completed: is('COMPLETED').length,
      done: is('COMPLETED').reduce((x, a) => x + Number(a.total || 0), 0),
      waiting: is('ARRIVED').filter((a) => -minutesTo(a.arrivedAt || a.scheduledStart) > WAITING_AFTER_MIN),
      missed: booked.filter((a) => a.startsIn < -NO_SHOW_AFTER_MIN),
      next: booked.filter((a) => a.startsIn >= -NO_SHOW_AFTER_MIN).sort((a, b) => a.startsIn - b.startsIn)[0],
      soon: booked.filter((a) => a.startsIn >= 0 && a.startsIn <= 30),
      // In the chair first, then arrived, then by start time.
      list: [...pending].sort((a, b) => {
        const rank = (x: SalonAppointment) => (x.status === 'IN_PROGRESS' ? 0 : x.status === 'ARRIVED' ? 1 : 2);
        return rank(a) - rank(b) || a.startsIn - b.startsIn;
      }).slice(0, 8),
    };
  }, [todayQ.data]);

  const week = useMemo(() => {
    const list = (weekQ.data ?? []).filter((a) => a.status !== 'CANCELLED' && minutesTo(a.scheduledStart) > 0);
    return { count: list.length, unconfirmed: list.filter((a) => a.status === 'DRAFT').length };
  }, [weekQ.data]);

  const staff = useMemo(() => {
    const list = staffQ.data ?? [];
    return list.map((s) => {
      const mine = today.all.filter((a) => a.status !== 'CANCELLED' && a.services?.some((x) => x.staffProfileId === s.id));
      const busy = mine.find((a) => a.status === 'IN_PROGRESS');
      const next = mine.filter((a) => a.status === 'CONFIRMED' || a.status === 'ARRIVED').sort((a, b) => a.startsIn - b.startsIn)[0];
      return { profile: s, name: staffName(s), today: mine.length, done: mine.filter((a) => a.status === 'COMPLETED').length, busy, next };
    }).sort((a, b) => Number(!!b.busy) - Number(!!a.busy) || b.today - a.today);
  }, [staffQ.data, today.all]);

  const memberships = useMemo(() => {
    const list = (membershipsQ.data ?? []).filter((m) => m.status === 'ACTIVE');
    const withLeft = list.map((m) => ({ ...m, left: (new Date(m.expiryDate).getTime() - Date.now()) / DAY }));
    const expiring = withLeft.filter((m) => m.left > 0 && m.left <= 15).sort((a, b) => a.left - b.left);
    const tiers = new Map<string, number>();
    list.forEach((m) => tiers.set(m.plan?.tier ?? 'CUSTOM', (tiers.get(m.plan?.tier ?? 'CUSTOM') ?? 0) + 1));
    return { active: list.length, expiring, tiers: [...tiers.entries()].map(([tier, count]) => ({ tier, count })) };
  }, [membershipsQ.data]);

  const packages = useMemo(() => {
    const list = packagesQ.data ?? [];
    return { active: list.length, sessionsLeft: list.reduce((x, p) => x + Number(p.sessionsRemaining || 0), 0) };
  }, [packagesQ.data]);

  return { today, week, staff, memberships, packages, loading: todayQ.isLoading };
}
