/**
 * Gym's own numbers for the dashboard: who is inside now, today's classes,
 * memberships about to run out, unpaid dues and equipment due for service.
 * Every gym widget calls this; React Query shares the requests between them.
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useBusinessDayStart, setToDayEnd, setToDayStart } from '@core/lib/business-day';
import { gymDashboardApi } from '../api/dashboard.api';
import { gymMembersApi, type GymMember, type MemberSummary } from '../api/members.api';
import { attendanceApi, type Attendance } from '../api/attendance.api';
import { classesApi, type GymClass } from '../api/classes.api';
import { equipmentApi, type EquipmentStatus } from '../api/equipment.api';

const SECOND = 1_000;
const MINUTE = 60 * SECOND;
const DAY = 86_400_000;

/** Days from now until `iso`; negative when already past. */
const daysTo = (iso?: string | null) => (iso ? (new Date(iso).getTime() - Date.now()) / DAY : 999);

/** A member whose membership ends within 7 days. */
export interface RenewalRow { id: string; name: string; plan: string; left: number; due: number }

export function useGymOps() {
  // A 24-hour gym's 1 a.m. class still belongs to "today".
  const bdStart = useBusinessDayStart();

  const overviewQ = useQuery({ queryKey: ['gym-dashboard'], queryFn: () => gymDashboardApi.overview().catch(() => null), refetchInterval: MINUTE });
  const insideQ = useQuery({ queryKey: ['currently-inside'], queryFn: () => attendanceApi.currentlyInside().catch(() => [] as Attendance[]), refetchInterval: 15 * SECOND });
  const summaryQ = useQuery({ queryKey: ['gym-members', 'summary'], queryFn: () => gymMembersApi.summary().catch(() => null as MemberSummary | null) });
  const classesQ = useQuery({
    queryKey: ['classes-today'],
    queryFn: () => {
      const start = setToDayStart(new Date(), bdStart);
      const end = setToDayEnd(new Date(), bdStart);
      return classesApi.calendar(start.toISOString(), end.toISOString()).catch(() => [] as GymClass[]);
    },
    refetchInterval: MINUTE,
  });
  const membersQ = useQuery({ queryKey: ['gym-members', 'dash-running'], queryFn: () => gymMembersApi.list({ view: 'running' }).catch(() => [] as GymMember[]) });
  const expiringQ = useQuery({ queryKey: ['gym-members', 'dash-expiring'], queryFn: () => gymMembersApi.list({ view: 'expiring' }).catch(() => [] as GymMember[]) });
  const equipmentQ = useQuery({ queryKey: ['gym-equipment', 'summary'], queryFn: () => equipmentApi.summary().catch(() => null) });

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
    const sum = summaryQ.data;
    const renewals: RenewalRow[] = (expiringQ.data ?? [])
      .map((m) => ({ id: m.id, name: m.customer?.name ?? m.memberNumber, plan: m.current?.plan?.name ?? 'Plan', left: daysTo(m.current?.endDate), due: m.due ?? 0 }))
      .sort((a, b) => a.left - b.left)
      .slice(0, 8);
    return {
      expiring: sum?.expiring ?? renewals.length,
      expired: sum?.expired ?? 0,
      duesCount: sum?.duesCount ?? 0,
      dueTotal: sum?.duesAmount ?? 0,
      renewals,
    };
  }, [summaryQ.data, expiringQ.data]);

  const streaks = useMemo(
    () => [...(membersQ.data ?? [])].filter((m) => (m.currentStreak || 0) > 0).sort((a, b) => (b.currentStreak || 0) - (a.currentStreak || 0)).slice(0, 6),
    [membersQ.data],
  );

  const equipment = useMemo(() => {
    const e = equipmentQ.data;
    const status = (s: EquipmentStatus) => Number(e?.byStatus.find((x) => x.status === s)?._count._all ?? 0);
    return {
      total: (e?.byCategory ?? []).reduce((x, c) => x + Number(c._count._all ?? 0), 0),
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
    activeMembers: Number(summaryQ.data?.running ?? o?.totals?.activeMembers ?? membersQ.data?.length ?? 0),
    totalMembers: Number(summaryQ.data?.total ?? o?.totals?.totalMembers ?? 0),
    trainers: Number(o?.totals?.totalTrainers ?? 0),
    checkInsToday: Number(o?.today?.checkIns ?? 0),
    loading: insideQ.isLoading || summaryQ.isLoading,
  };
}
