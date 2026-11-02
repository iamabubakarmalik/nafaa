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
import { t } from '@core/i18n';

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
  shortName: t('Gym'),
  emoji: '💪',
  priority: 54,
  description:
    t('Members, check-in, memberships aur renewal, PT packages aur trainer commission, classes, lockers, machines.'),

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
      label: t('Gym'),
      icon: Dumbbell,
      emoji: '💪',
      color: '#dc2626',
      order: 20,
      items: [
        { to: '/gym/dashboard', label: t('Gym dashboard'), icon: LayoutDashboard },
        { to: '/gym/attendance', label: t('Check-in'), icon: LogIn, badge: t('FAST') },
        { to: '/gym/members/new', label: t('New member'), icon: UserPlus },
        { to: '/gym/members', label: t('Members'), icon: Users },
        { to: '/gym/memberships', label: t('Memberships'), icon: Award },
        { to: '/gym/plans', label: t('Plans'), icon: Target },
        { to: '/gym/personal-training', label: t('Personal training'), icon: Flame },
        { to: '/gym/trainers', label: t('Trainers'), icon: Dumbbell },
        { to: '/gym/classes', label: t('Group classes'), icon: Calendar },
        { to: '/gym/lockers', label: t('Lockers'), icon: KeyRound },
        { to: '/gym/equipment', label: t('Machines'), icon: Activity },
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
      { value: 'pcs', label: t('Piece (supplement, bottle)'), hint: '🔢', group: t('Saman') },
      { value: 'bottle', label: t('Bottle'), hint: '🍶', group: t('Saman') },
      { value: 'kg', label: t('Kilogram'), hint: '⚖️', group: t('Saman') },
      { value: 'day-pass', label: t('Day pass'), hint: '🎟️', group: t('Service') },
      { value: 'visit', label: t('Ek visit'), hint: '🚪', group: t('Service') },
      { value: 'month', label: t('Mahina (locker rent)'), hint: '🔐', group: t('Service') },
      { value: 'session', label: t('Session'), hint: '💪', group: t('Service') },
      { value: 'class', label: t('Class'), hint: '🏋️', group: t('Service') },
      { value: 'hour', label: t('Ghanta'), hint: '⏰', group: t('Service') },
    ],
  },

  featureFlags: [
    { key: 'gymMembers', label: t('Members'), defaultEnabled: true },
    { key: 'gymAttendance', label: t('Check-in'), defaultEnabled: true },
    { key: 'gymPT', label: t('Personal training'), defaultEnabled: true },
    { key: 'gymClasses', label: t('Group classes'), defaultEnabled: true },
    { key: 'gymEquipment', label: t('Machines'), defaultEnabled: false },
    { key: 'gymDietPlans', label: t('Diet Plans'), defaultEnabled: false },
  ],
};
