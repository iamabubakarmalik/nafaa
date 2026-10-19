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

const productPath = (id: string) => `/products/${id}`;

function useGymActions(): QuickAction[] {
  const { data } = useOverview();
  const { inside, activeMembers, memberships, classes, trainers, equipment } = useGymOps();
  const { cost } = useMasked();
  const s = data?.stats;
  return [
    { to: '/gym/attendance', icon: LogIn, label: 'Check-in', hint: `${inside.count} andar` },
    { to: '/gym/members/new', icon: UserPlus, label: 'Naya member', hint: 'Admission' },
    { to: '/gym/members', icon: Users, label: 'Members', hint: `${activeMembers} active` },
    { to: '/gym/memberships', icon: RefreshCw, label: 'Memberships', hint: memberships.expiring ? `${memberships.expiring} renewal` : `${activeMembers} chal rahi` },
    { to: '/gym/plans', icon: Target, label: 'Plans', hint: 'Mahana, saalana' },
    { to: '/gym/classes', icon: Calendar, label: 'Classes', hint: `${classes.list.length} aaj` },
    { to: '/gym/trainers', icon: Dumbbell, label: 'Trainers', hint: `${trainers} trainers` },
    { to: '/gym/personal-training', icon: Flame, label: 'Personal training', hint: 'PT sessions' },
    { to: '/gym/equipment', icon: Wrench, label: 'Machines', hint: equipment.service ? `${equipment.service} service` : `${equipment.total} machines` },
    { to: '/pos', icon: ShoppingCart, label: 'POS', hint: 'Supplements, day pass' },
    { to: '/khata', icon: BookOpen, label: 'Khata', hint: cost(s?.totalUdhaar) },
    { to: '/sales', icon: Receipt, label: 'Sale record', hint: 'Purane bill' },
    { to: '/reports', icon: BarChart3, label: 'Reports', hint: 'Poora hisaab' },
  ];
}

export const gymDashboard = createDashboard({
  label: 'Gym',
  productPath,
  openFrom: 5,
  primaryAction: { to: '/gym/attendance', label: 'Check-in', icon: LogIn },
  kpis: gymKpis,
  defaultKpis: ['gym-inside', 'gym-members', 'gym-expiring', 'gym-dues', 'month', 'cash'],
  useAttention: useGymAttention,
  widgets: [
    { id: 'gym-renewals', title: 'Renewal aur fees', description: 'Khatam hone wali memberships aur baqi fees', size: 'half', sizes: ANY_SIZE, Component: GymRenewals },
    { id: 'gym-inside', title: 'Abhi gym me', description: 'Jo is waqt andar hain, kab se', size: 'half', sizes: ANY_SIZE, Component: GymInside },
    { id: 'gym-classes', title: 'Aaj ki classes', description: 'Waqt, trainer aur kitni seats bhari', size: 'half', sizes: ANY_SIZE, Component: GymClasses },
  ],
  lateWidgets: [
    { id: 'gym-streaks', title: 'Sab se regular', description: 'Lagataar aane wale members', size: 'third', sizes: ANY_SIZE, Component: GymStreaks },
  ],
  useQuickActions: useGymActions,
  moneyMap: { productsPath: '/products' },
  omit: ['slow-movers', 'purchases'],
  guide: [
    { icon: RefreshCw, title: 'Renewal', text: 'Jo membership 7 din me khatam ho rahi hai wo upar hai. Khatam hone se pehle call karna, baad me wapas bulane se kahin asaan hai.' },
    { icon: LogIn, title: 'Abhi gym me', text: 'Check-in se ginti chalti hai: kaun andar hai aur kab se. Rush ka waqt dekh kar trainers ki duty lagayein.' },
  ],
});
