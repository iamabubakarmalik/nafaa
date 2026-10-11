/**
 * Auto parts and workshop numbers for the dashboard: job board, promised
 * dates, service reminders, vehicle paperwork and mechanic output. Every
 * auto parts widget calls this; React Query shares the requests.
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { autoPartsDashboardApi } from '../api/dashboard.api';
import { serviceRemindersApi, type ServiceReminder } from '../api/service-reminders.api';
import type { WorkshopJob } from '../api/workshop-jobs.api';

const MINUTE = 60_000;
const DAY = 86_400_000;

interface AutoPartsOverview {
  totals?: { totalVehicles: number; totalMechanics: number; activeJobs: number; waitingParts: number; readyDelivery: number };
  today?: { revenue: number; collected: number; deliveredCount: number };
  monthly?: { revenue: number; collected: number; jobCount: number };
  expiring?: { insurance: number; tokenTax: number; fitness: number };
  upcomingJobs?: WorkshopJob[];
  overdueJobs?: WorkshopJob[];
  topMechanics?: Array<{ mechanicId: string; name: string; revenue: number; jobs: number }>;
}

/** Hours from now until `iso`; negative when already past. */
const hoursTo = (iso?: string | null) => (iso ? (new Date(iso).getTime() - Date.now()) / 3_600_000 : null);
/** Whole days from today to `iso`; negative when already past. */
const daysTo = (iso?: string | null) => {
  if (!iso) return null;
  const start = new Date(); start.setHours(0, 0, 0, 0);
  return Math.floor((new Date(iso).getTime() - start.getTime()) / DAY);
};

export function useAutoPartsOps() {
  const overview = useQuery({
    queryKey: ['autoparts-dashboard'],
    queryFn: () => autoPartsDashboardApi.overview().catch(() => null) as Promise<AutoPartsOverview | null>,
    refetchInterval: MINUTE,
  });
  const upcomingQ = useQuery({
    queryKey: ['service-reminders-dash'],
    queryFn: () => serviceRemindersApi.list({ upcoming: true }).catch(() => [] as ServiceReminder[]),
    staleTime: 5 * MINUTE,
  });
  const overdueQ = useQuery({
    queryKey: ['service-reminders-overdue'],
    queryFn: () => serviceRemindersApi.list({ overdue: true }).catch(() => [] as ServiceReminder[]),
    staleTime: 5 * MINUTE,
  });

  const o = overview.data ?? {};

  const board = useMemo(() => {
    const t = o.totals ?? { totalVehicles: 0, totalMechanics: 0, activeJobs: 0, waitingParts: 0, readyDelivery: 0 };
    return { ...t, today: o.today ?? { revenue: 0, collected: 0, deliveredCount: 0 }, monthly: o.monthly ?? { revenue: 0, collected: 0, jobCount: 0 } };
  }, [o.totals, o.today, o.monthly]);

  const jobs = useMemo(() => {
    const map = (j: WorkshopJob) => ({ ...j, left: hoursTo(j.promisedAt), due: Math.max(Number(j.total || 0) - Number(j.paidAmount || 0), 0) });
    const overdue = (o.overdueJobs ?? []).map(map);
    const upcoming = (o.upcomingJobs ?? []).map(map);
    return {
      overdue,
      today: upcoming.filter((j) => j.left !== null && j.left <= 24),
      urgent: [...overdue, ...upcoming].filter((j) => j.priority === 'URGENT' || j.priority === 'EMERGENCY').length,
      list: [...overdue, ...upcoming].slice(0, 6),
    };
  }, [o.overdueJobs, o.upcomingJobs]);

  const reminders = useMemo(() => {
    const overdue = (overdueQ.data ?? []).filter((r) => r.status !== 'DONE');
    const upcoming = (upcomingQ.data ?? []).filter((r) => r.status !== 'DONE' && !overdue.some((x) => x.id === r.id));
    const e = o.expiring ?? { insurance: 0, tokenTax: 0, fitness: 0 };
    return {
      overdue,
      upcoming,
      papers: e,
      papersTotal: Number(e.insurance || 0) + Number(e.tokenTax || 0) + Number(e.fitness || 0),
      list: [...overdue, ...upcoming].map((r) => ({ ...r, left: daysTo(r.dueDate) })).slice(0, 6),
    };
  }, [overdueQ.data, upcomingQ.data, o.expiring]);

  const mechanics = useMemo(() => (o.topMechanics ?? []).filter((m) => m.mechanicId), [o.topMechanics]);

  return { board, jobs, reminders, mechanics, loading: overview.isLoading };
}
