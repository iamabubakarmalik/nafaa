/**
 * Gaming shop numbers for the dashboard: live cafe sessions, stations,
 * rentals, top-up stock and revenue by stream. Every gaming widget calls
 * this; React Query shares the requests between them.
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { gamingDashboardApi } from '../api/dashboard.api';
import { gamingSessionsApi, type GamingCafeSession } from '../api/sessions.api';
import type { GamingTournament } from '../api/tournaments.api';

const MINUTE = 60_000;

interface StreamTotals { cafeRevenue: number; topupRevenue: number; topupProfit: number; rentalRevenue: number; totalRevenue: number }

/** Shape of GET /gaming/dashboard/overview (fields the dashboard reads). */
export interface GamingOverview {
  totals?: { totalProducts: number; totalStations: number; activeStations: number; activeSessions: number };
  inventory?: { availableTopups: number; upcomingTournaments: number };
  rentals?: { active: number; overdue: number };
  today?: StreamTotals & { sessionsCount: number; topupCount: number; rentalCount: number };
  monthly?: StreamTotals;
  tournaments?: GamingTournament[];
}

/** Top-up stock below this is flagged. */
export const TOPUP_LOW = 5;

const minutesPlayed = (s: GamingCafeSession) =>
  s.liveBilling?.actualMinutes
  ?? Math.max(0, Math.floor((Date.now() - new Date(s.startedAt).getTime()) / MINUTE) - Number(s.totalPauseMinutes || 0));

export function useGamingOps() {
  const overviewQ = useQuery({
    queryKey: ['gaming-dashboard-overview'],
    queryFn: () => (gamingDashboardApi.overview() as Promise<GamingOverview>).catch(() => ({}) as GamingOverview),
    refetchInterval: 45_000,
  });
  const liveQ = useQuery({
    queryKey: ['gaming-active-sessions'],
    queryFn: () => gamingSessionsApi.active().catch(() => [] as GamingCafeSession[]),
    refetchInterval: 20_000,
  });

  const o = overviewQ.data;

  const live = useMemo(() => (liveQ.data ?? []).map((s) => {
    const mins = minutesPlayed(s);
    return {
      ...s,
      mins,
      bill: s.liveBilling?.currentAmount ?? (mins / 60) * Number(s.ratePerHour || 0),
      paused: s.status === 'PAUSED',
    };
  }).sort((a, b) => b.mins - a.mins), [liveQ.data]);

  const stations = useMemo(() => ({
    total: Number(o?.totals?.totalStations ?? 0),
    active: Number(o?.totals?.activeStations ?? 0),
    inUse: live.length,
    runningBill: live.reduce((x, s) => x + s.bill, 0),
  }), [o, live]);

  const streams = useMemo(() => {
    const t = o?.today;
    const m = o?.monthly;
    const row = (label: string, today: number | undefined, month: number | undefined, hint: string) => ({ label, today: Number(today ?? 0), month: Number(month ?? 0), hint });
    return {
      todayTotal: Number(t?.totalRevenue ?? 0),
      monthTotal: Number(m?.totalRevenue ?? 0),
      sessionsToday: Number(t?.sessionsCount ?? 0),
      topupProfitMonth: Number(m?.topupProfit ?? 0),
      list: [
        row('Cafe sessions', t?.cafeRevenue, m?.cafeRevenue, `${t?.sessionsCount ?? 0} session aaj`),
        row('Digital top-ups', t?.topupRevenue, m?.topupRevenue, `${t?.topupCount ?? 0} card aaj`),
        row('Rentals', t?.rentalRevenue, m?.rentalRevenue, `${t?.rentalCount ?? 0} rental aaj`),
      ],
    };
  }, [o]);

  const tournaments = useMemo(() => {
    const list = o?.tournaments ?? [];
    const today = new Date().toDateString();
    return { list, today: list.filter((t) => new Date(t.scheduledDate).toDateString() === today).length };
  }, [o]);

  return {
    live, stations, streams, tournaments,
    rentals: { active: Number(o?.rentals?.active ?? 0), overdue: Number(o?.rentals?.overdue ?? 0) },
    topups: Number(o?.inventory?.availableTopups ?? 0),
    loading: overviewQ.isLoading,
    ready: !!o?.inventory,
  };
}
