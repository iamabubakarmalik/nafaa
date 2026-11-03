/** Clinic dashboard (web clinic/dashboard): today's token line, who waits and who is in the room, late and unpaid visits, labs and vaccines due, and doctor load. */

import { useQuery } from '@tanstack/react-query';
import { Building2, Calendar, CalendarPlus, Pill, Stethoscope, Syringe, TestTube, Timer, UserCog, Users, Wallet } from 'lucide-react-native';
import { feeDue, isLate } from '@nafaa/core/industries/clinic';
import { formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { Card, ListRow, Text } from '@/design';
import { PackDashboard, type DashAction, type DashAttention } from '../../_shared/packDashboard';
import { todayKey } from '../../_shared/deskKit';
import { clinicApi } from '../api';
import { CLINIC_KEYS } from '../meta';

const iso = (time: string) => new Date(`${todayKey()}T${time}:00+05:00`).toISOString();

export function ClinicDashboardScreen() {
  const can = usePermission();
  const apts = useQuery({ queryKey: [CLINIC_KEYS.today], queryFn: () => clinicApi.appointments.list({ from: iso('00:00'), to: iso('23:59') }), refetchInterval: 30_000 });
  const ov = useQuery({ queryKey: [CLINIC_KEYS.dash], queryFn: () => clinicApi.overview().catch(() => ({})), refetchInterval: 60_000 });
  const list = (apts.data ?? []).filter((a) => a.status !== 'CANCELLED');
  const now = Date.now();
  const waiting = list.filter((a) => a.status === 'ARRIVED').length;
  const inRoom = list.filter((a) => a.status === 'IN_CONSULTATION').length;
  const late = list.filter((a) => isLate(a, now)).length;
  const unpaid = list.filter((a) => a.status === 'COMPLETED' && feeDue(a) > 0);
  const o = ov.data as { totals?: { pendingLabOrders?: number; dueVaccinations?: number } } | undefined;
  const attention: DashAttention[] = [];
  if (late) attention.push({ icon: Timer, tone: 'warning', text: t('{{n}} booking late hai', { n: late }), href: '/clinic/queue' });
  if (unpaid.length) attention.push({ icon: Wallet, tone: 'danger', text: t('{{n}} visit ki fee baqi ({{a}})', { n: unpaid.length, a: formatMoney(unpaid.reduce((s, a) => s + feeDue(a), 0)) }), href: '/clinic/appointments' });
  if (o?.totals?.pendingLabOrders) attention.push({ icon: TestTube, tone: 'info', text: t('{{n}} lab order baqi', { n: o.totals.pendingLabOrders }), href: '/clinic/lab-orders' });
  if (o?.totals?.dueVaccinations) attention.push({ icon: Syringe, tone: 'info', text: t('{{n}} vaccine due', { n: o.totals.dueVaccinations }), href: '/clinic/vaccinations' });
  const actions: DashAction[] = [
    { href: '/clinic/appointments/new', icon: CalendarPlus, label: t('Reception'), hint: t('Token'), show: can(P.SERVICE_BOOKINGS_MANAGE) }, { href: '/clinic/queue', icon: Timer, label: t('Live queue'), hint: t('Line') },
    { href: '/clinic/appointments', icon: Calendar, label: t('Appointments'), hint: t('Visits') }, { href: '/clinic/patients', icon: Users, label: t('Patients'), hint: t('Record') },
    { href: '/clinic/doctors', icon: UserCog, label: t('Doctors'), hint: t('Fees') }, { href: '/clinic/prescriptions', icon: Pill, label: t('Prescriptions'), hint: t('Nuskhe'), show: can(P.CLINIC_RECORDS_VIEW) },
    { href: '/clinic/lab-orders', icon: TestTube, label: t('Lab'), hint: t('Tests'), show: can(P.CLINIC_RECORDS_VIEW) }, { href: '/clinic/vaccinations', icon: Syringe, label: t('Vaccinations'), hint: t('Doses'), show: can(P.CLINIC_RECORDS_VIEW) },
    { href: '/clinic/panels', icon: Building2, label: t('Panels'), hint: t('Companies') },
  ];
  const byDoc = new Map<string, { name: string; open: number; done: number }>();
  list.forEach((a) => { const d = byDoc.get(a.doctorId) ?? { name: a.doctor?.fullName ?? '—', open: 0, done: 0 }; if (a.status === 'COMPLETED') d.done += 1; else d.open += 1; byDoc.set(a.doctorId, d); });
  return (
    <PackDashboard title={t('Clinic dashboard')} stats={[{ label: t('Aaj visits'), value: String(list.length) }, { label: t('Intezar me'), value: String(waiting) }, { label: t('Doctor ke paas'), value: String(inRoom) }]}
      attention={attention} actions={actions} refreshing={apts.isRefetching} onRefresh={() => { void apts.refetch(); void ov.refetch(); }}>
      {byDoc.size > 0 && <Card flush title={t('Doctors aaj')}>{[...byDoc.values()].map((d, i, arr) => <ListRow key={d.name} divider={i < arr.length - 1} icon={Stethoscope} title={d.name} trailing={<Text size="sm" tone="muted">{t('{{o}} baqi · {{d}} ho gaye', { o: d.open, d: d.done })}</Text>} />)}</Card>}
    </PackDashboard>
  );
}
