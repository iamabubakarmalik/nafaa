/**
 * Mobile shop numbers for the dashboard: IMEI stock, repairs, EMI plans,
 * used phones and profit by source. Every mobile widget calls this; React
 * Query shares the requests between them.
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useOverview } from '@modules/dashboard/data/queries';
import { imeiApi, type ImeiStats } from '../api/imei.api';
import { repairsApi, type RepairStats, type RepairStatus, type RepairTicket } from '../api/repairs.api';
import { usedPhonesApi, type UsedPhoneStats } from '../api/used-phones.api';
import { emiApi, type EmiPlan, type EmiStats } from '../api/emi.api';
import { mobileReportsApi, type ProfitBySource } from '../api/mobile-reports.api';

const MINUTE = 60_000;

const statusCount = (rows: { status: RepairStatus; count: number }[] | undefined, ...keys: RepairStatus[]) =>
  (rows ?? []).filter((r) => keys.includes(r.status)).reduce((x, r) => x + Number(r.count || 0), 0);

export function useMobileOps() {
  const { data: overview } = useOverview();
  const imeiQ = useQuery({ queryKey: ['imei-stats'], queryFn: () => imeiApi.stats().catch(() => null as ImeiStats | null), refetchInterval: MINUTE });
  const repairQ = useQuery({ queryKey: ['repair-stats'], queryFn: () => repairsApi.stats().catch(() => null as RepairStats | null), refetchInterval: MINUTE });
  const usedQ = useQuery({ queryKey: ['used-phones-stats'], queryFn: () => usedPhonesApi.stats().catch(() => null as UsedPhoneStats | null), refetchInterval: MINUTE });
  const emiQ = useQuery({ queryKey: ['emi-stats'], queryFn: () => emiApi.stats().catch(() => null as EmiStats | null), refetchInterval: MINUTE });

  // Prefixes match the list pages, so their invalidations refresh these too.
  const readyQ = useQuery({
    queryKey: ['repair-tickets', 'dashboard-ready'],
    queryFn: () => repairsApi.list({ status: 'READY', limit: 6 }).then((r) => r.items).catch(() => [] as RepairTicket[]),
    refetchInterval: MINUTE,
  });
  const overdueQ = useQuery({
    queryKey: ['emi-plans', 'dashboard-overdue'],
    queryFn: () => emiApi.list({ status: 'ACTIVE', filter: 'ONLY_OVERDUE', limit: 6 }).then((r) => r.items).catch(() => [] as EmiPlan[]),
    refetchInterval: 5 * MINUTE,
  });

  const range = useMemo(() => {
    const to = new Date();
    const from = new Date(to.getTime() - 30 * 24 * 3_600_000);
    return { from: from.toISOString(), to: to.toISOString() };
  }, []);
  const sourceQ = useQuery({
    queryKey: ['mobile-profit-by-source', '30d', 'dashboard'],
    queryFn: () => mobileReportsApi.profitBySource(range).catch(() => null as ProfitBySource | null),
    staleTime: 5 * MINUTE,
  });

  const stock = useMemo(() => {
    const s = imeiQ.data;
    const ms = overview?.mobileStats;
    const pta = (s?.byPta ?? []).map((p) => ({ status: p.ptaStatus, count: Number(p.count || 0) })).filter((p) => p.count > 0);
    return {
      inStock: s?.inStock ?? ms?.inStock ?? 0,
      sold: s?.sold ?? ms?.sold ?? 0,
      soldToday: ms?.soldToday ?? 0,
      value: Number(s?.stockValue ?? 0),
      unsellable: Number(s?.returned ?? 0) + Number(s?.damaged ?? 0),
      nonPta: pta.filter((p) => p.status === 'NON_PTA' || p.status === 'PENDING').reduce((x, p) => x + p.count, 0),
      pta,
    };
  }, [imeiQ.data, overview?.mobileStats]);

  const repairs = useMemo(() => {
    const s = repairQ.data;
    const ready = readyQ.data ?? [];
    return {
      open: s?.openTickets ?? overview?.mobileStats?.repairTicketsOpen ?? 0,
      today: s?.todayCount ?? 0,
      monthRevenue: Number(s?.monthRevenue ?? 0),
      fresh: statusCount(s?.byStatus, 'RECEIVED', 'DIAGNOSED'),
      approval: statusCount(s?.byStatus, 'AWAITING_APPROVAL'),
      parts: statusCount(s?.byStatus, 'AWAITING_PARTS'),
      working: statusCount(s?.byStatus, 'IN_PROGRESS'),
      ready: statusCount(s?.byStatus, 'READY') || ready.length,
      readyDue: ready.reduce((x, t) => x + Number(t.balanceDue || 0), 0),
      readyList: ready,
    };
  }, [repairQ.data, readyQ.data, overview?.mobileStats]);

  const emi = useMemo(() => {
    const s = emiQ.data;
    return {
      active: s?.byStatus?.find((b) => b.status === 'ACTIVE')?.count ?? overview?.mobileStats?.emiActivePlans ?? 0,
      overdueCount: s?.overdueCount ?? 0,
      overdueAmount: Number(s?.overdueAmount ?? 0),
      upcomingCount: s?.upcomingCount ?? 0,
      upcomingAmount: Number(s?.upcomingAmount ?? 0),
      remaining: Number(s?.activeRemaining ?? 0),
      collected: Number(s?.collectedThisMonth ?? 0),
      overdueList: overdueQ.data ?? [],
    };
  }, [emiQ.data, overdueQ.data, overview?.mobileStats]);

  const used = useMemo(() => {
    const s = usedQ.data;
    const by = (k: string) => s?.byStatus?.find((b) => b.status === k)?.count ?? 0;
    return {
      inStock: by('IN_STOCK') || overview?.mobileStats?.usedPhonesInStock || 0,
      inspection: by('PENDING_INSPECTION'),
      repairing: by('REPAIRING'),
      cost: Number(s?.inStockCost ?? 0),
      resale: Number(s?.inStockResaleValue ?? 0),
    };
  }, [usedQ.data, overview?.mobileStats]);

  return {
    stock, repairs, emi, used,
    sources: sourceQ.data ?? null,
    loading: imeiQ.isLoading || repairQ.isLoading,
  };
}
