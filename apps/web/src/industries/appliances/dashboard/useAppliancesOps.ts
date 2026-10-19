/**
 * Appliance shop numbers for the dashboard: repairs, installations,
 * technicians, AMC, deliveries, serials, warranty claims and revenue by
 * stream. Every appliance widget calls this; React Query shares the
 * requests between them.
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { appliancesAnalyticsApi, type AppliancesProfit } from '../api/analytics.api';
import { serviceRequestsApi, type ServiceRequest, type ServiceRequestSummary } from '../api/service-requests.api';
import { installationsApi, type Installation, type InstallationSummary } from '../api/installations.api';
import { techniciansApi, type TechnicianSummary } from '../api/technicians.api';
import { amcContractsApi, type AmcSummary } from '../api/amc-contracts.api';
import { deliveriesApi, type DeliverySummary } from '../api/deliveries.api';
import { applianceSerialApi, type SerialSummary } from '../api/serial-tracking.api';
import { warrantyClaimsApi, type ClaimSummary } from '../api/warranty-claims.api';
import { AMC_KEY, CLAIM_KEY, DELIVERY_KEY, INSTALL_KEY, SERIAL_KEY, SERVICE_KEY, TECH_KEY, dateInput, installStatusOf, serviceStatusOf, type Meta } from '../components/meta';

const MINUTE = 60_000;

export interface FieldJob {
  id: string;
  kind: 'repair' | 'install';
  customer: string;
  detail: string;
  number: string;
  status: Meta;
  technician?: string;
  slot?: string;
  late: boolean;
  urgent: boolean;
  to: string;
}

export function useAppliancesOps() {
  const range = useMemo(() => {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - 30);
    return { from: dateInput(from), to: dateInput(to) };
  }, []);

  const profitQ = useQuery({ queryKey: ['appliance-profit', range], queryFn: () => appliancesAnalyticsApi.profit(range).catch(() => null as AppliancesProfit | null), staleTime: 5 * MINUTE });
  const svcQ = useQuery({ queryKey: [SERVICE_KEY, 'summary'], queryFn: () => serviceRequestsApi.summary().catch(() => null as ServiceRequestSummary | null), refetchInterval: MINUTE });
  const instQ = useQuery({ queryKey: [INSTALL_KEY, 'summary'], queryFn: () => installationsApi.summary().catch(() => null as InstallationSummary | null), refetchInterval: MINUTE });
  const techQ = useQuery({ queryKey: [TECH_KEY, 'summary'], queryFn: () => techniciansApi.summary().catch(() => null as TechnicianSummary | null), refetchInterval: 5 * MINUTE });
  const amcQ = useQuery({ queryKey: [AMC_KEY, 'summary'], queryFn: () => amcContractsApi.summary().catch(() => null as AmcSummary | null), refetchInterval: 5 * MINUTE });
  const delQ = useQuery({ queryKey: [DELIVERY_KEY, 'summary'], queryFn: () => deliveriesApi.summary().catch(() => null as DeliverySummary | null), refetchInterval: MINUTE });
  const serialQ = useQuery({ queryKey: [SERIAL_KEY, 'summary'], queryFn: () => applianceSerialApi.summary().catch(() => null as SerialSummary | null), refetchInterval: 5 * MINUTE });
  const claimQ = useQuery({ queryKey: [CLAIM_KEY, 'summary'], queryFn: () => warrantyClaimsApi.summary().catch(() => null as ClaimSummary | null), refetchInterval: 5 * MINUTE });
  const queueQ = useQuery({ queryKey: [SERVICE_KEY, 'queue'], queryFn: () => serviceRequestsApi.queue().catch(() => [] as ServiceRequest[]), refetchInterval: MINUTE });
  const todayQ = useQuery({ queryKey: [INSTALL_KEY, 'today'], queryFn: () => installationsApi.today().catch(() => [] as Installation[]), refetchInterval: MINUTE });

  const svc = svcQ.data;
  const inst = instQ.data;

  /** Today's installations and the repair queue together, late and urgent first. */
  const jobs = useMemo(() => {
    const repairs: FieldJob[] = (queueQ.data ?? []).map((s) => ({
      id: s.id, kind: 'repair', customer: s.customerName, detail: `${s.productName} — ${s.reportedIssue}`,
      number: s.requestNumber, status: serviceStatusOf(s.status), technician: s.technicianName,
      slot: s.scheduledTimeSlot, late: !!s.isOverdue, urgent: s.priority === 'URGENT' || s.priority === 'EMERGENCY',
      to: '/appliances/service-requests',
    }));
    const installs: FieldJob[] = (todayQ.data ?? []).map((i) => ({
      id: i.id, kind: 'install', customer: i.customerName, detail: i.productName,
      number: i.installationNumber, status: installStatusOf(i.status), technician: i.technicianName,
      slot: i.scheduledTimeSlot, late: false, urgent: false, to: '/appliances/installations',
    }));
    const rank = (j: FieldJob) => (j.late ? 0 : j.urgent ? 1 : 2);
    return [...installs, ...repairs].sort((a, b) => rank(a) - rank(b)).slice(0, 8);
  }, [queueQ.data, todayQ.data]);

  const work = useMemo(() => ({
    repairsOpen: svc?.open ?? 0,
    repairsLate: svc?.overdue ?? 0,
    repairsDoneToday: svc?.completedToday ?? 0,
    installsOpen: inst?.open ?? 0,
    installsLate: inst?.overdue ?? 0,
    installsToday: inst?.todayJobs ?? 0,
    unassigned: (svc?.unassigned ?? 0) + (inst?.unassigned ?? 0),
    outstanding: Number(svc?.month?.outstanding ?? 0) + Number(inst?.month?.outstanding ?? 0),
    avgHours: svc?.month?.avgResolutionHours ?? 0,
  }), [svc, inst]);

  const streams = useMemo(() => {
    const p = profitQ.data;
    const total = Number(p?.totals?.revenue ?? 0);
    const services = (p?.streams ?? []).filter((s) => s.key !== 'GOODS').reduce((x, s) => x + Number(s.revenue || 0), 0);
    return {
      total,
      profit: Number(p?.totals?.profit ?? 0),
      margin: Number(p?.totals?.margin ?? 0),
      services,
      servicesShare: total > 0 ? (services / total) * 100 : 0,
      list: (p?.streams ?? []).filter((s) => s.revenue > 0).sort((a, b) => b.revenue - a.revenue),
    };
  }, [profitQ.data]);

  return {
    jobs, work, streams,
    tech: techQ.data ?? null,
    amc: amcQ.data ?? null,
    delivery: delQ.data ?? null,
    serial: serialQ.data ?? null,
    claims: claimQ.data ?? null,
    loading: svcQ.isLoading || instQ.isLoading,
  };
}
