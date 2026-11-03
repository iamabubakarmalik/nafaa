/** Gym dashboard (web gym/dashboard): who is inside, today's check-ins and classes, memberships to renew, dues and the month's money. */

import { useQuery } from '@tanstack/react-query';
import { Activity, Award, Calendar, Dumbbell, Flame, KeyRound, LogIn, RefreshCw, Target, UserPlus, Users, Wallet } from 'lucide-react-native';
import { formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { PackDashboard, type DashAction, type DashAttention } from '../../_shared/packDashboard';
import { gymApi } from '../api';
import { GYM_KEYS } from '../meta';

export function GymDashboardScreen() {
  const can = usePermission();
  const q = useQuery({ queryKey: [GYM_KEYS.dash], queryFn: () => gymApi.overview(), refetchInterval: 30_000 });
  const d = q.data;
  const attention: DashAttention[] = [];
  if (d?.alerts.expiringMemberships) attention.push({ icon: RefreshCw, tone: 'warning', text: t('{{n}} membership 7 din me khatam', { n: d.alerts.expiringMemberships }), href: '/gym/memberships' });
  if (d?.alerts.duesCount) attention.push({ icon: Wallet, tone: 'danger', text: t('{{n}} members ki fee baqi ({{a}})', { n: d.alerts.duesCount, a: formatMoney(d.alerts.duesAmount) }), href: '/gym/memberships' });
  const actions: DashAction[] = [
    { href: '/gym/attendance', icon: LogIn, label: t('Check-in'), hint: t('Fast') },
    { href: '/gym/members/new', icon: UserPlus, label: t('New member'), hint: t('Register'), show: can(P.CUSTOMERS_EDIT) },
    { href: '/gym/members', icon: Users, label: t('Members'), hint: t('Sab') },
    { href: '/gym/memberships', icon: Award, label: t('Memberships'), hint: t('Renew') },
    { href: '/gym/plans', icon: Target, label: t('Plans'), hint: t('Fee') },
    { href: '/gym/personal-training', icon: Flame, label: t('Training'), hint: t('PT') },
    { href: '/gym/trainers', icon: Dumbbell, label: t('Trainers'), hint: t('Commission') },
    { href: '/gym/classes', icon: Calendar, label: t('Classes'), hint: t('Group') },
    { href: '/gym/lockers', icon: KeyRound, label: t('Lockers'), hint: t('Rent') },
    { href: '/gym/equipment', icon: Activity, label: t('Machines'), hint: t('Service') },
  ];
  return (
    <PackDashboard title={t('Gym dashboard')} stats={[{ label: t('Abhi gym me'), value: String(d?.today.currentlyInside ?? 0) }, { label: t('Aaj check-in'), value: String(d?.today.checkIns ?? 0) }, { label: t('Is mahine Sale'), value: formatMoney(d?.monthly.revenue ?? 0) }]}
      attention={attention} actions={actions} refreshing={q.isRefetching} onRefresh={() => void q.refetch()} />
  );
}
