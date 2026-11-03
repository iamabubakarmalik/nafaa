/**
 * Salon dashboard (web salon/dashboard): today's chairs, who is waiting, late
 * bookings, memberships about to end and the month's money, with quick actions.
 * The last loaded numbers show offline.
 */

import { useQuery } from '@tanstack/react-query';
import { Award, Calendar, Clock, Gift, Heart, Plus, Receipt, Scissors, Timer, UserCheck, UserX } from 'lucide-react-native';
import { View } from 'react-native';
import { daysLeft } from '@nafaa/core/industries/salon';
import { formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { Card, ListRow, Text } from '@/design';
import { PackDashboard, type DashAction, type DashAttention } from '../../_shared/packDashboard';
import { todayKey } from '../../_shared/deskKit';
import { salonApi } from '../api';
import { SALON_KEYS, staffName } from '../meta';

export function SalonDashboardScreen() {
  const can = usePermission();
  const sum = useQuery({ queryKey: [SALON_KEYS.dash, 'summary'], queryFn: () => salonApi.appointments.summary(), refetchInterval: 30_000 });
  const mem = useQuery({ queryKey: [SALON_KEYS.dash, 'memberships'], queryFn: () => salonApi.memberships.list({ status: 'ACTIVE' }), refetchInterval: 300_000 });
  const staff = useQuery({ queryKey: [SALON_KEYS.dash, 'staff'], queryFn: () => salonApi.staff.list({ bookable: true }), refetchInterval: 300_000 });
  const d = sum.data;
  const expiring = (mem.data ?? []).map((m) => ({ m, left: daysLeft(m.expiryDate, todayKey()) ?? 99 })).filter((x) => x.left >= 0 && x.left <= 15).sort((a, b) => a.left - b.left);
  const attention: DashAttention[] = [];
  if (d?.today.late) attention.push({ icon: UserX, tone: 'danger', text: t('{{count}} booking late hai', { count: d.today.late }), href: '/salon/appointments' });
  if (d?.today.waiting) attention.push({ icon: Clock, tone: 'warning', text: t('{{count}} customer intezar me hain', { count: d.today.waiting }), href: '/salon/appointments' });
  if (expiring.length) attention.push({ icon: Award, tone: 'info', text: t('{{count}} membership 15 din me khatam', { count: expiring.length }), href: '/salon/memberships' });
  const actions: DashAction[] = [
    { href: '/pos', icon: Receipt, label: t('Counter'), hint: t('Bill banayein'), show: can(P.POS_USE) },
    { href: '/salon/appointments/new', icon: Plus, label: t('New booking'), hint: t('Appointment'), show: can(P.SERVICE_BOOKINGS_MANAGE) },
    { href: '/salon/appointments', icon: Calendar, label: t('Appointments'), hint: t('Aaj aur aage') },
    { href: '/salon/calendar', icon: Timer, label: t('Calendar'), hint: t('Stylist ke hisaab se') },
    { href: '/salon/services', icon: Scissors, label: t('Services'), hint: t('Rate list') },
    { href: '/salon/staff', icon: UserCheck, label: t('Stylists'), hint: t('Commission') },
    { href: '/salon/memberships', icon: Award, label: t('Memberships'), hint: t('Plans') },
    { href: '/salon/gift-vouchers', icon: Gift, label: t('Vouchers'), hint: t('Gift') },
    { href: '/salon/customers', icon: Heart, label: t('Customers'), hint: t('Profile') },
  ];
  return (
    <PackDashboard
      title={t('Salon dashboard')}
      stats={[
        { label: t('Aaj bookings'), value: String(d?.today.total ?? 0) },
        { label: t('Chair par'), value: String(d?.today.inChair ?? 0) },
        { label: t('Is mahine Sale'), value: formatMoney(d?.period.revenue ?? 0) },
      ]}
      attention={attention} actions={actions}
      refreshing={sum.isRefetching} onRefresh={() => { void sum.refetch(); void mem.refetch(); void staff.refetch(); }}>
      {(d?.staff?.length ?? 0) > 0 && (
        <Card flush title={t('Stylists — is mahine')}>
          {d!.staff.slice(0, 6).map((s, i) => (
            <ListRow key={s.staffProfileId} divider={i < Math.min(d!.staff.length, 6) - 1} icon={UserCheck} title={s.name} subtitle={t('{{count}} services', { count: s.services })}
              trailing={<View style={{ alignItems: 'flex-end' }}><Text weight="bold" ltr>{formatMoney(s.revenue)}</Text><Text size="2xs" tone="muted" ltr>{t('Commission')} {formatMoney(s.commission)}</Text></View>} />
          ))}
        </Card>
      )}
      {(staff.data?.length ?? 0) > 0 && !d?.staff?.length && <Text size="xs" tone="muted">{(staff.data ?? []).map(staffName).join(', ')}</Text>}
    </PackDashboard>
  );
}
