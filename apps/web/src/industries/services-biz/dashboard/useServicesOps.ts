/**
 * Service-business numbers for the dashboard: open jobs and today's visits,
 * urgent and late jobs, money still to collect on open jobs, technicians,
 * quotes and AMC renewals. Every services widget calls this; React Query
 * shares the requests between them.
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { servicesDashboardApi } from '../api/dashboard.api';
import { jobsApi, type ServiceJob } from '../api/jobs.api';
import { amcApi, type AmcContract } from '../api/amc.api';

const MINUTE = 60_000;
const DAY = 86_400_000;

const ACTIVE = ['SCHEDULED', 'ASSIGNED', 'DISPATCHED', 'EN_ROUTE', 'ARRIVED', 'IN_PROGRESS'];
const NOT_STARTED = ['SCHEDULED', 'ASSIGNED'];
const URGENT = ['EMERGENCY', 'URGENT'];

/** Shape of GET /services-biz/dashboard/overview (fields the dashboard reads). */
interface ServicesOverview {
  totals?: { totalServices: number; totalTechnicians: number; availableTechnicians: number; activeAmc: number; activeQuotes: number };
  quality?: { avgRating: number | null; ratedJobs: number };
  topTechnicians?: Array<{ technicianId: string; name?: { fullName?: string } | null; revenue: number; completedJobs: number }>;
}

const sameDay = (iso: string | undefined, ref: Date) => !!iso && new Date(iso).toDateString() === ref.toDateString();

export function useServicesOps() {
  const overview = useQuery({
    queryKey: ['services-dashboard'],
    queryFn: () => servicesDashboardApi.overview().catch(() => null) as Promise<ServicesOverview | null>,
    refetchInterval: MINUTE,
  });
  const jobs = useQuery({
    queryKey: ['jobs-dashboard'],
    queryFn: () => jobsApi.list({ statusIn: ACTIVE }).catch(() => [] as ServiceJob[]),
    refetchInterval: MINUTE,
  });
  const renewals = useQuery({
    queryKey: ['amc-renewal-due'],
    queryFn: () => amcApi.renewalDue(30).catch(() => [] as AmcContract[]),
    refetchInterval: 10 * MINUTE,
  });

  const work = useMemo(() => {
    const now = new Date();
    const list = (jobs.data ?? []).filter((j) => ACTIVE.includes(j.status));
    const urgent = list.filter((j) => URGENT.includes(j.priority));
    // Not started 30+ minutes after the booked time.
    const late = list.filter((j) => NOT_STARTED.includes(j.status) && j.scheduledStart && new Date(j.scheduledStart).getTime() < now.getTime() - 30 * MINUTE);
    const todays = list.filter((j) => sameDay(j.scheduledStart, now));
    const due = list.reduce((s, j) => s + Math.max(Number(j.totalCharge || 0) - Number(j.paidAmount || 0), 0), 0);
    const rank = (j: ServiceJob) => (URGENT.includes(j.priority) ? 0 : late.includes(j) ? 1 : 2);
    return {
      active: list.length,
      onSite: list.filter((j) => ['ARRIVED', 'IN_PROGRESS'].includes(j.status)).length,
      onTheWay: list.filter((j) => ['DISPATCHED', 'EN_ROUTE'].includes(j.status)).length,
      unassigned: list.filter((j) => j.status === 'SCHEDULED').length,
      today: todays.length,
      urgent,
      late,
      due,
      // Urgent first, then late, then by booked time.
      list: [...list].sort((a, b) => rank(a) - rank(b)
        || new Date(a.scheduledStart ?? 8.64e15).getTime() - new Date(b.scheduledStart ?? 8.64e15).getTime()).slice(0, 8),
    };
  }, [jobs.data]);

  const amc = useMemo(() => {
    const now = Date.now();
    const rows = (renewals.data ?? []).map((a) => ({ ...a, daysLeft: Math.ceil((new Date(a.endDate).getTime() - now) / DAY) }))
      .sort((a, b) => a.daysLeft - b.daysLeft);
    return {
      count: rows.length,
      week: rows.filter((r) => r.daysLeft <= 7).length,
      value: rows.reduce((s, r) => s + Number(r.contractValue || 0), 0),
      list: rows.slice(0, 6),
    };
  }, [renewals.data]);

  const o = overview.data;
  return {
    work,
    amc,
    techs: { total: o?.totals?.totalTechnicians ?? 0, free: o?.totals?.availableTechnicians ?? 0 },
    activeAmc: o?.totals?.activeAmc ?? 0,
    quotes: o?.totals?.activeQuotes ?? 0,
    services: o?.totals?.totalServices ?? 0,
    rating: o?.quality ?? { avgRating: null, ratedJobs: 0 },
    topTechnicians: o?.topTechnicians ?? [],
    loading: jobs.isLoading || overview.isLoading,
  };
}
