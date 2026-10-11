/**
 * Pet-shop numbers for the dashboard: grooming appointments and pickups,
 * live animals and their health, and medicines near expiry. Every petshop
 * widget calls this; React Query shares the request.
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { petshopDashboardApi } from '../api/dashboard.api';
import type { PetGroomingAppointment } from '../api/grooming.api';
import type { PetLiveAnimal } from '../api/live-animals.api';

const MINUTE = 60_000;
const DAY = 86_400_000;
const n = (v: unknown) => Number(v || 0);

interface ExpiringItem { id: string; productId?: string; brand?: string; batchNumber?: string; expiryDate?: string; product?: { name?: string } }

/** Shape of GET /petshop/dashboard/overview. Prisma decimals may arrive as strings. */
interface PetshopOverview {
  totals?: { animalsAvailable?: number; animalsReserved?: number; animalInventoryValue?: number | string; activeGroomers?: number };
  pending?: {
    todayAppointments?: number; pendingAppointments?: number; readyForPickup?: number;
    expiringMedicines?: number; expiredMedicines?: number; healthAlerts?: number;
  };
  today?: { groomingCount?: number; groomingRevenue?: number | string; animalSalesCount?: number; animalRevenue?: number | string };
  monthly?: {
    grooming?: { count?: number; billed?: number | string; collected?: number | string };
    liveAnimals?: { count?: number; revenue?: number | string; cost?: number | string; profit?: number | string };
  };
  todaySchedule?: PetGroomingAppointment[];
  pickupList?: PetGroomingAppointment[];
  healthAlerts?: PetLiveAnimal[];
  expiringList?: ExpiringItem[];
}

export function usePetshopOps() {
  const overview = useQuery({
    queryKey: ['petshop-dashboard-overview'],
    queryFn: () => petshopDashboardApi.overview().catch(() => ({})) as Promise<PetshopOverview>,
    refetchInterval: MINUTE,
  });
  const o = overview.data ?? {};

  const grooming = useMemo(() => {
    const schedule = o.todaySchedule ?? [];
    const pickup = (o.pickupList ?? []).map((a) => ({ ...a, balance: Math.max(n(a.totalFee) - n(a.paidAmount), 0) }));
    return {
      schedule,
      today: n(o.pending?.todayAppointments) || schedule.length,
      waiting: schedule.filter((a) => a.status === 'SCHEDULED' || a.status === 'CONFIRMED').length,
      inProgress: schedule.filter((a) => a.status === 'IN_PROGRESS').length,
      pending: n(o.pending?.pendingAppointments),
      pickup,
      pickupCount: n(o.pending?.readyForPickup) || pickup.length,
      pickupDue: pickup.reduce((s, a) => s + a.balance, 0),
      revenueToday: n(o.today?.groomingRevenue),
      doneToday: n(o.today?.groomingCount),
    };
  }, [o.todaySchedule, o.pickupList, o.pending, o.today]);

  const animals = useMemo(() => ({
    available: n(o.totals?.animalsAvailable),
    reserved: n(o.totals?.animalsReserved),
    value: n(o.totals?.animalInventoryValue),
    health: o.healthAlerts ?? [],
    soldToday: n(o.today?.animalSalesCount),
    revenueToday: n(o.today?.animalRevenue),
    monthSold: n(o.monthly?.liveAnimals?.count),
    monthProfit: n(o.monthly?.liveAnimals?.profit),
  }), [o.totals, o.healthAlerts, o.today, o.monthly?.liveAnimals]);

  const medicines = useMemo(() => {
    const list = (o.expiringList ?? []).map((p) => ({
      ...p, days: p.expiryDate ? Math.ceil((new Date(p.expiryDate).getTime() - Date.now()) / DAY) : null,
    }));
    return {
      list,
      expired: n(o.pending?.expiredMedicines),
      expiring: n(o.pending?.expiringMedicines),
      within30: list.filter((p) => p.days !== null && p.days <= 30).length,
    };
  }, [o.expiringList, o.pending]);

  return { grooming, animals, medicines, groomers: n(o.totals?.activeGroomers), loading: overview.isLoading };
}
