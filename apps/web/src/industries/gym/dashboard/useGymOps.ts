/**
 * Gym's own numbers for the dashboard: who is inside now, today's classes,
 * memberships about to run out, unpaid dues and equipment due for service.
 * Every gym widget calls this; React Query shares the requests between them.
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useBusinessDayStart, setToDayEnd, setToDayStart } from '@core/lib/business-day';
import { gymDashboardApi } from '../api/dashboard.api';
import { gymMembersApi, type GymMember } from '../api/members.api';
import { attendanceApi, type Attendance } from '../api/attendance.api';
import { classesApi, type GymClass } from '../api/classes.api';
import { equipmentApi, type EquipmentStatus } from '../api/equipment.api';
import { membershipsApi, type Membership } from '../api/memberships.api';

const SECOND = 1_000;
const MINUTE = 60 * SECOND;
const DAY = 86_400_000;

interface GymOverview {
  totals?: { totalMembers?: number; activeMembers?: number; totalTrainers?: number; activeMemberships?: number };
  today?: { checkIns?: number; currentlyInside?: number; classes?: number; classBookings?: number; revenue?: number };
}

interface EquipmentSummary {
  byCategory?: Array<{ _count?: { _all?: number } }>;
  byStatus?: Array<{ status: EquipmentStatus; _count?: { _all?: number } }>;
  needsMaintenance?: number;
}

/** Days from now until `iso`; negative when already past. */
const daysTo = (iso?: string | null) => (iso ? (new Date(iso).getTime() - Date.now()) / DAY : null);

export type RenewalRow = Membership & { left: number };

export function useGymOps() {
  // A 24-hour gym's 1 a.m. class still belongs to "today".
  const bdStart = useBusinessDayStart();

  const overviewQ = useQuery({ queryKey: ['gym-dashboard'], queryFn: () => gymDashboardApi.overview().catch(() => null) as Promise<GymOverview | null>, refetchInterval: MINUTE });
  const insideQ = useQuery({ queryKey: ['currently-inside'], queryFn: () => attendanceApi.currentlyInside().catch(() => [] as Attendance[]), refetchInterval: 15 * SECOND });
  const summaryQ = useQuery({ queryKey: ['gym-members-summary'], queryFn: () => gymMembersApi.summary().catch(() => null) as Promise<{ total?: number; active?: number } | null> });
  const classesQ = useQuery({
    queryKey: ['classes-today'],
    queryFn: () => {
      const start = setToDayStart(new Date(), bdStart);
      const end = setToDayEnd(new Date(), bdStart);
      return classesApi.calendar(start.toISOString(), end.toISOString()).catch(() => [] as GymClass[]);
    },
    refetchInterval: MINUTE,
  });
  const membersQ = useQuery({ queryKey: ['members-all-for-dash'], queryFn: () => gymMembersApi.list({ status: 'ACTIVE' }).catch(() => [] as GymMember[]) });
  const equipmentQ = useQuery({ queryKey: ['equipment-summary'], queryFn: () => equipmentApi.summary().catch(() => null) as Promise<EquipmentSummary | null> });
  const membershipsQ = useQuery({ queryKey: ['memberships-all'], queryFn: () => membershipsApi.list({}).catch(() => [] as Membership[]) });

  const inside = useMemo(() => {
    const list = [...(insideQ.data ?? [])].sort((a, b) => new Date(b.checkInAt).getTime() - new Date(a.checkInAt).getTime());
    return { count: list.length, list: list.slice(0, 8) };
  }, [insideQ.data]);

  const classes = useMemo(() => {
    const list = [...(classesQ.data ?? [])]
      .filter((c) => c.status !== 'CANCELLED')
      .sort((a, b) => new Date(a.scheduledStart).getTime() - new Date(b.scheduledStart).getTime());
    const now = Date.now();
    return {
      list,
      live: list.filter((c) => c.status === 'IN_PROGRESS').length,
      upcoming: list.filter((c) => c.status === 'SCHEDULED' && new Date(c.scheduledStart).getTime() > now).length,
      booked: list.reduce((x, c) => x + Number(c.currentEnrolled || 0), 0),
      seats: list.reduce((x, c) => x + Number(c.maxParticipants || 0), 0),
    };
  }, [classesQ.data]);

  const memberships = useMemo(() => {
    const all = membershipsQ.data ?? [];
    const active = all.filter((m) => m.status === 'ACTIVE');
    const withLeft = active.map((m) => ({ ...m, left: daysTo(m.endDate) ?? 999 }));
    // Still marked active but the end date has passed: the member walks in for free.
    const lapsed = withLeft.filter((m) => m.left < 0);
    const expiring = withLeft.filter((m) => m.left >= 0 && m.left <= 7);
    const dues = all.filter((m) => Number(m.balanceDue || 0) > 0 && m.status !== 'CANCELLED');
    return {
      active: active.length,
      lapsed,
      expiring,
      dues,
      dueTotal: dues.reduce((x, m) => x + Number(m.balanceDue || 0), 0),
      renewals: [...lapsed, ...expiring].sort((a, b) => a.left - b.left).slice(0, 8) as RenewalRow[],
    };
  }, [membershipsQ.data]);

  const streaks = useMemo(
    () => [...(membersQ.data ?? [])].filter((m) => (m.currentStreak || 0) > 0).sort((a, b) => (b.currentStreak || 0) - (a.currentStreak || 0)).slice(0, 6),
    [membersQ.data],
  );

  const equipment = useMemo(() => {
    const e = equipmentQ.data;
    const status = (s: EquipmentStatus) => Number(e?.byStatus?.find((x) => x.status === s)?._count?._all ?? 0);
    return {
      total: (e?.byCategory ?? []).reduce((x, c) => x + Number(c._count?._all ?? 0), 0),
      service: Number(e?.needsMaintenance ?? 0),
      broken: status('OUT_OF_ORDER') + status('MAINTENANCE'),
    };
  }, [equipmentQ.data]);

  const o = overviewQ.data;
  return {
    inside,
    classes,
    memberships,
    streaks,
    equipment,
    activeMembers: Number(summaryQ.data?.active ?? o?.totals?.activeMembers ?? membersQ.data?.length ?? 0),
    totalMembers: Number(summaryQ.data?.total ?? o?.totals?.totalMembers ?? 0),
    trainers: Number(o?.totals?.totalTrainers ?? 0),
    checkInsToday: Number(o?.today?.checkIns ?? 0),
    loading: insideQ.isLoading || membershipsQ.isLoading,
  };
}
