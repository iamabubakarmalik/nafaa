/**
 * Gym dashboard: the standard dashboard plus live attendance, today's
 * classes, renewals and member streaks.
 */

import {
  BarChart3, BookOpen, Calendar, Dumbbell, Flame, LogIn, Receipt, RefreshCw, ShoppingCart, Target, UserPlus, Users, Wrench,
} from 'lucide-react';
import { createDashboard } from '@modules/dashboard/createDashboard';
import { useMasked } from '@modules/dashboard/engine';
import { ANY_SIZE, type QuickAction } from '@modules/dashboard/widgets';
import { useOverview } from '@modules/dashboard/data/queries';
import { useGymOps } from './useGymOps';
import { GymClasses, GymInside, GymRenewals, GymStreaks, gymKpis, useGymAttention } from './widgets';
import { t } from '@core/i18n';

const productPath = (id: string) => `/products/${id}`;

function useGymActions(): QuickAction[] {
  const { data } = useOverview();
  const { inside, activeMembers, memberships, classes, trainers, equipment } = useGymOps();
  const { cost } = useMasked();
  const s = data?.stats;
  return [
    { to: '/gym/attendance', icon: LogIn, label: t('Check-in'), hint: t('{{count}} andar', { count: inside.count }) },
    { to: '/gym/members/new', icon: UserPlus, label: t('Naya member'), hint: t('Admission') },
    { to: '/gym/members', icon: Users, label: t('Members'), hint: t('{{activeMembers}} active', { activeMembers }) },
    { to: '/gym/memberships', icon: RefreshCw, label: t('Memberships'), hint: memberships.expiring ? t('{{expiring}} renewal', { expiring: memberships.expiring }) : t('{{activeMembers}} chal rahi', { activeMembers }) },
    { to: '/gym/plans', icon: Target, label: t('Plans'), hint: t('Mahana, saalana') },
    { to: '/gym/classes', icon: Calendar, label: t('Classes'), hint: t('{{count}} aaj', { count: classes.list.length }) },
    { to: '/gym/trainers', icon: Dumbbell, label: t('Trainers'), hint: t('{{trainers}} trainers', { trainers }) },
    { to: '/gym/personal-training', icon: Flame, label: t('Personal training'), hint: t('PT sessions') },
    { to: '/gym/equipment', icon: Wrench, label: t('Machines'), hint: equipment.service ? t('{{service}} service', { service: equipment.service }) : t('{{total}} machines', { total: equipment.total }) },
    { to: '/pos', icon: ShoppingCart, label: t('POS'), hint: t('Supplements, day pass') },
    { to: '/khata', icon: BookOpen, label: t('Khata'), hint: cost(s?.totalUdhaar) },
    { to: '/sales', icon: Receipt, label: t('Sale record'), hint: t('Purane bill') },
    { to: '/reports', icon: BarChart3, label: t('Reports'), hint: t('Poora hisaab') },
  ];
}

export const gymDashboard = createDashboard({
  label: t('Gym'),
  productPath,
  openFrom: 5,
  primaryAction: { to: '/gym/attendance', label: t('Check-in'), icon: LogIn },
  kpis: gymKpis,
  defaultKpis: ['gym-inside', 'gym-members', 'gym-expiring', 'gym-dues', 'month', 'cash'],
  useAttention: useGymAttention,
  widgets: [
    { id: 'gym-renewals', title: t('Renewal aur fees'), description: t('Khatam hone wali memberships aur baqi fees'), size: 'half', sizes: ANY_SIZE, Component: GymRenewals },
    { id: 'gym-inside', title: t('Abhi gym me'), description: t('Jo is waqt andar hain, kab se'), size: 'half', sizes: ANY_SIZE, Component: GymInside },
    { id: 'gym-classes', title: t('Aaj ki classes'), description: t('Waqt, trainer aur kitni seats bhari'), size: 'half', sizes: ANY_SIZE, Component: GymClasses },
  ],
  lateWidgets: [
    { id: 'gym-streaks', title: t('Sab se regular'), description: t('Lagataar aane wale members'), size: 'third', sizes: ANY_SIZE, Component: GymStreaks },
  ],
  useQuickActions: useGymActions,
  moneyMap: { productsPath: '/products' },
  omit: ['slow-movers', 'purchases'],
  guide: [
    { icon: RefreshCw, title: t('Renewal'), text: t('Jo membership 7 din me khatam ho rahi hai wo upar hai. Khatam hone se pehle call karna, baad me wapas bulane se kahin asaan hai.') },
    { icon: LogIn, title: t('Abhi gym me'), text: t('Check-in se ginti chalti hai: kaun andar hai aur kab se. Rush ka waqt dekh kar trainers ki duty lagayein.') },
  ],
});
