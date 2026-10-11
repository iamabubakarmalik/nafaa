/**
 * Optical numbers for the dashboard: today's eye tests, lens orders at the
 * lab, overdue and ready-for-pickup orders, expiring prescriptions and
 * money still to collect. Every optical widget calls this; React Query
 * shares the request between them.
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { opticalDashboardApi } from '../api/dashboard.api';

const MINUTE = 60_000;
const DAY = 86_400_000;

export interface ScheduledTest {
  id: string;
  customerName: string;
  customerPhone?: string;
  optometristName?: string;
  status: string;
  scheduledSlot?: string;
  appointmentDate: string;
}

export interface LensOrderRow {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone?: string;
  frameName?: string;
  labName?: string;
  expectedDate?: string;
  remainingAmount?: number;
}

export interface ExpiringRx {
  id: string;
  prescriptionNumber: string;
  customerName: string;
  customerPhone?: string;
  expiryDate: string;
}

/** Shape of GET /optical/dashboard/overview (fields the dashboard reads). */
interface OpticalOverview {
  totals?: { activePrescriptions: number; activeOptometrists: number };
  pending?: {
    todayAppointments: number; pendingTests: number; lensOrdersAtLab: number;
    lensOrdersReady: number; overdueLensOrders: number; expiringPrescriptions: number;
  };
  today?: { testCount: number; testRevenue: number; lensOrderCount: number; lensRevenue: number; totalRevenue: number };
  monthly?: { totalReceivable: number };
  todaySchedule?: ScheduledTest[];
  readyForPickup?: LensOrderRow[];
  overdueList?: LensOrderRow[];
  expiringList?: ExpiringRx[];
}

const EMPTY_PENDING = { todayAppointments: 0, pendingTests: 0, lensOrdersAtLab: 0, lensOrdersReady: 0, overdueLensOrders: 0, expiringPrescriptions: 0 };

export function useOpticalOps() {
  const overview = useQuery({
    queryKey: ['optical-dashboard-overview'],
    queryFn: () => opticalDashboardApi.overview().catch(() => null) as Promise<OpticalOverview | null>,
    refetchInterval: MINUTE,
  });
  const o = overview.data;

  const lists = useMemo(() => {
    const now = Date.now();
    const ready = o?.readyForPickup ?? [];
    return {
      schedule: (o?.todaySchedule ?? []).filter((t) => t.status !== 'CANCELLED').slice(0, 8),
      testsLeft: (o?.todaySchedule ?? []).filter((t) => ['SCHEDULED', 'CONFIRMED', 'IN_PROGRESS'].includes(t.status)).length,
      ready: ready.slice(0, 6),
      readyDue: ready.reduce((s, r) => s + Number(r.remainingAmount || 0), 0),
      overdue: (o?.overdueList ?? []).map((r) => ({
        ...r, daysLate: r.expectedDate ? Math.max(Math.ceil((now - new Date(r.expectedDate).getTime()) / DAY), 1) : 0,
      })).slice(0, 6),
      expiring: (o?.expiringList ?? []).map((r) => ({
        ...r, daysLeft: Math.ceil((new Date(r.expiryDate).getTime() - now) / DAY),
      })).slice(0, 6),
    };
  }, [o]);

  return {
    ...lists,
    pending: o?.pending ?? EMPTY_PENDING,
    today: o?.today ?? { testCount: 0, testRevenue: 0, lensOrderCount: 0, lensRevenue: 0, totalRevenue: 0 },
    receivable: o?.monthly?.totalReceivable ?? 0,
    activeRx: o?.totals?.activePrescriptions ?? 0,
    loading: overview.isLoading,
  };
}
