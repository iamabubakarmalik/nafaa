/**
 * Clinic numbers for the dashboard: today's appointments and queue, doctor
 * load, pending lab orders, due vaccinations and unpaid fees. Every clinic
 * widget calls this; React Query shares the requests between them.
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { setToDayEnd, setToDayStart, useBusinessDayStart } from '@core/lib/business-day';
import { appointmentsApi, type Appointment } from '../api/appointments.api';
import { clinicDashboardApi } from '../api/dashboard.api';

const MINUTE = 60_000;

/** Shape of GET /clinic/dashboard/overview (fields the dashboard reads). */
interface ClinicOverview {
  totals?: { totalDoctors: number; totalPatients: number; activePatients: number; pendingLabOrders: number; dueVaccinations: number };
  today?: { appointments: number; completed: number; inQueue: number; revenue: number; collected: number };
  monthly?: { revenue: number; collected: number };
  topDoctors?: Array<{
    doctorId: string;
    revenue: number;
    consultations: number;
    doctor?: { fullName?: string; title?: string; photoUrl?: string; specialties?: string[] };
  }>;
}

export interface DoctorLoad {
  id: string;
  name: string;
  photoUrl?: string;
  total: number;
  waiting: number;
  done: number;
  inRoom: boolean;
}

const BOOKED = ['SCHEDULED', 'CONFIRMED'];
const OPEN = ['SCHEDULED', 'CONFIRMED', 'ARRIVED', 'IN_CONSULTATION'];

export function useClinicOps() {
  const bdStart = useBusinessDayStart();

  const overview = useQuery({
    queryKey: ['clinic-dashboard'],
    queryFn: () => clinicDashboardApi.overview().catch(() => null) as Promise<ClinicOverview | null>,
    refetchInterval: MINUTE,
  });

  const apts = useQuery({
    queryKey: ['clinic-today-apts'],
    queryFn: () => {
      const now = new Date();
      const start = new Date(now); setToDayStart(start, bdStart);
      const end = new Date(now); setToDayEnd(end, bdStart);
      return appointmentsApi.list({ from: start.toISOString(), to: end.toISOString() }).catch(() => [] as Appointment[]);
    },
    refetchInterval: MINUTE,
  });

  const today = useMemo(() => {
    const now = Date.now();
    const list = (apts.data ?? []).filter((a) => a.status !== 'CANCELLED');
    const open = list.filter((a) => OPEN.includes(a.status));
    const done = list.filter((a) => a.status === 'COMPLETED');
    const unpaid = done.filter((a) => Number(a.total || 0) > Number(a.paidAmount || 0));
    return {
      total: list.length,
      booked: list.filter((a) => BOOKED.includes(a.status)).length,
      waiting: list.filter((a) => a.status === 'ARRIVED').length,
      inRoom: list.filter((a) => a.status === 'IN_CONSULTATION').length,
      done: done.length,
      noShow: list.filter((a) => a.status === 'NO_SHOW').length,
      emergency: open.filter((a) => a.isEmergency).length,
      // Booked patients 15+ minutes past their slot who have not arrived.
      late: list.filter((a) => BOOKED.includes(a.status) && new Date(a.scheduledStart).getTime() < now - 15 * MINUTE).length,
      unpaidCount: unpaid.length,
      unpaidAmount: unpaid.reduce((s, a) => s + Number(a.total || 0) - Number(a.paidAmount || 0), 0),
      // Emergencies first, then whoever is waiting, then by slot time.
      queue: [...open].sort((a, b) => {
        if (a.isEmergency !== b.isEmergency) return a.isEmergency ? -1 : 1;
        return new Date(a.scheduledStart).getTime() - new Date(b.scheduledStart).getTime();
      }).slice(0, 8),
    };
  }, [apts.data]);

  const doctors = useMemo(() => {
    const map = new Map<string, DoctorLoad>();
    (apts.data ?? []).filter((a) => a.status !== 'CANCELLED').forEach((a) => {
      const d = map.get(a.doctorId) ?? {
        id: a.doctorId, name: a.doctor?.fullName ?? 'Doctor', photoUrl: a.doctor?.photoUrl,
        total: 0, waiting: 0, done: 0, inRoom: false,
      };
      d.total += 1;
      if (OPEN.includes(a.status)) d.waiting += 1;
      if (a.status === 'COMPLETED') d.done += 1;
      if (a.status === 'IN_CONSULTATION') d.inRoom = true;
      map.set(a.doctorId, d);
    });
    return [...map.values()].sort((a, b) => b.waiting - a.waiting || b.total - a.total);
  }, [apts.data]);

  const o = overview.data;
  const monthly = o?.monthly ?? { revenue: 0, collected: 0 };
  return {
    today,
    doctors,
    topDoctors: o?.topDoctors ?? [],
    pendingLabs: o?.totals?.pendingLabOrders ?? 0,
    dueVaccines: o?.totals?.dueVaccinations ?? 0,
    totalDoctors: o?.totals?.totalDoctors ?? 0,
    activePatients: o?.totals?.activePatients ?? 0,
    monthDue: Math.max(monthly.revenue - monthly.collected, 0),
    loading: apts.isLoading || overview.isLoading,
  };
}
