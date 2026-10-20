import {
  Dumbbell, LayoutDashboard, Users, LogIn, Award, Target, Calendar,
  Flame, Activity, UserPlus, KeyRound,
} from 'lucide-react';
import { PERMISSIONS } from '@core/lib/permissions';
import type { IndustryPack } from '@industries/_shared/types/industry-pack';

import GymDashboard from './dashboard/GymDashboard';
import MembersPage from './pages/MembersPage';
import MemberDetailPage from './pages/MemberDetailPage';
import AttendancePage from './pages/AttendancePage';
import MembershipsPage from './pages/MembershipsPage';
import PlansPage from './pages/PlansPage';
import TrainersPage from './pages/TrainersPage';
import ClassesPage from './pages/ClassesPage';
import PTSessionsPage from './pages/PTSessionsPage';
import EquipmentPage from './pages/EquipmentPage';
import MemberFormPage from './pages/MemberFormPage';
import LockersPage from './pages/LockersPage';

/**
 * Gym / fitness industry pack: members and joining, check-in at the desk,
 * memberships (renew, freeze, dues), plans, personal training (single,
 * plan and PT packages) with trainer commission, group classes, lockers
 * with monthly rent and machines. Supplements, shakes and day passes sell
 * on the shared POS.
 */
export const GymPack: IndustryPack = {
  id: 'gym',
  name: 'Gym / Fitness',
  shortName: 'Gym',
  emoji: '💪',
  priority: 54,
  description:
    'Members, check-in, memberships aur renewal, PT packages aur trainer commission, classes, lockers, machines.',

  matches: (tenant) => {
    if (!tenant) return false;
    const type = (tenant.businessType ?? '').toUpperCase();
    return (
      type.includes('GYM') ||
      type.includes('FITNESS') ||
      type.includes('YOGA') ||
      type.includes('CROSSFIT') ||
      type.includes('MARTIAL') ||
      type.includes('PILATES') ||
      type.includes('AEROBICS')
    );
  },

  navGroups: [
    {
      label: 'Gym',
      icon: Dumbbell,
      emoji: '💪',
      color: '#dc2626',
      order: 20,
      items: [
        { to: '/gym/dashboard', label: 'Gym dashboard', icon: LayoutDashboard },
        { to: '/gym/attendance', label: 'Check-in', icon: LogIn, badge: 'FAST' },
        { to: '/gym/members/new', label: 'Naya member', icon: UserPlus },
        { to: '/gym/members', label: 'Members', icon: Users },
        { to: '/gym/memberships', label: 'Memberships', icon: Award },
        { to: '/gym/plans', label: 'Plans', icon: Target },
        { to: '/gym/personal-training', label: 'Personal training', icon: Flame },
        { to: '/gym/trainers', label: 'Trainers', icon: Dumbbell },
        { to: '/gym/classes', label: 'Group classes', icon: Calendar },
        { to: '/gym/lockers', label: 'Lockers', icon: KeyRound },
        { to: '/gym/equipment', label: 'Machines', icon: Activity },
      ],
    },
  ],

  routes: [
    { path: '/gym', element: GymDashboard },
    { path: '/gym/dashboard', element: GymDashboard },
    { path: '/gym/members/new', element: MemberFormPage, permission: PERMISSIONS.CUSTOMERS_EDIT },
    { path: '/gym/members/:id/edit', element: MemberFormPage, permission: PERMISSIONS.CUSTOMERS_EDIT },
    { path: '/gym/members/:id', element: MemberDetailPage, permission: PERMISSIONS.CUSTOMERS_VIEW },
    { path: '/gym/members', element: MembersPage, permission: PERMISSIONS.CUSTOMERS_VIEW },
    { path: '/gym/attendance', element: AttendancePage, permission: PERMISSIONS.CUSTOMERS_VIEW },
    { path: '/gym/memberships', element: MembershipsPage, permission: PERMISSIONS.CUSTOMERS_VIEW },
    { path: '/gym/plans', element: PlansPage },
    { path: '/gym/trainers', element: TrainersPage },
    { path: '/gym/classes', element: ClassesPage },
    { path: '/gym/personal-training', element: PTSessionsPage },
    { path: '/gym/equipment', element: EquipmentPage, permission: PERMISSIONS.PRODUCTS_VIEW },
    { path: '/gym/lockers', element: LockersPage },
  ],

  dashboardComponent: GymDashboard,

  // Memberships are sold from Plans; products are what the counter sells.
  productForm: {
    defaultUnit: 'pcs',
    unitOptions: [
      { value: 'pcs', label: 'Piece (supplement, bottle)', hint: '🔢', group: 'Saman' },
      { value: 'bottle', label: 'Bottle', hint: '🍶', group: 'Saman' },
      { value: 'kg', label: 'Kilogram', hint: '⚖️', group: 'Saman' },
      { value: 'day-pass', label: 'Day pass', hint: '🎟️', group: 'Service' },
      { value: 'visit', label: 'Ek visit', hint: '🚪', group: 'Service' },
      { value: 'month', label: 'Mahina (locker rent)', hint: '🔐', group: 'Service' },
      { value: 'session', label: 'Session', hint: '💪', group: 'Service' },
      { value: 'class', label: 'Class', hint: '🏋️', group: 'Service' },
      { value: 'hour', label: 'Ghanta', hint: '⏰', group: 'Service' },
    ],
  },

  featureFlags: [
    { key: 'gymMembers', label: 'Members', defaultEnabled: true },
    { key: 'gymAttendance', label: 'Check-in', defaultEnabled: true },
    { key: 'gymPT', label: 'Personal training', defaultEnabled: true },
    { key: 'gymClasses', label: 'Group classes', defaultEnabled: true },
    { key: 'gymEquipment', label: 'Machines', defaultEnabled: false },
    { key: 'gymDietPlans', label: 'Diet Plans', defaultEnabled: false },
  ],
};
