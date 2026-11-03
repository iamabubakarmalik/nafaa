/** More-menu items for the gym pack (web GymPack navGroups; gathered by ../nav-services.ts). */

import { Activity, Award, Calendar, Dumbbell, Flame, KeyRound, LayoutDashboard, LogIn, Target, UserPlus, Users } from 'lucide-react-native';
import { msg } from '@/core/i18n';
import { PERMISSIONS as P } from '@/core/permissions';
import type { NavItem } from '@/modules/shell/navigation/nav-config';

const item = (to: string, label: string, icon: NavItem['icon'], permission: NavItem['permission'], keywords: string): NavItem => ({ to, href: to, label, icon, industries: ['gym'], permission, module: 'industry', keywords });

export const NAV: NavItem[] = [
  { ...item('/gym/dashboard', msg('Gym dashboard'), LayoutDashboard, P.DASHBOARD_VIEW, 'gym overview'), href: '/gym' },
  item('/gym/attendance', msg('Check-in'), LogIn, P.CUSTOMERS_VIEW, 'gym check in attendance entry'),
  item('/gym/members/new', msg('New member'), UserPlus, P.CUSTOMERS_EDIT, 'register member join'),
  item('/gym/members', msg('Members'), Users, P.CUSTOMERS_VIEW, 'member fees renew'),
  item('/gym/memberships', msg('Memberships'), Award, P.CUSTOMERS_VIEW, 'renewal expiring freeze fee'),
  item('/gym/plans', msg('Plans'), Target, P.PRODUCTS_VIEW, 'plan fee monthly'),
  item('/gym/personal-training', msg('Personal training'), Flame, P.SERVICE_BOOKINGS_VIEW, 'pt session package'),
  item('/gym/trainers', msg('Trainers'), Dumbbell, P.SERVICE_BOOKINGS_VIEW, 'trainer commission'),
  item('/gym/classes', msg('Group classes'), Calendar, P.SERVICE_BOOKINGS_VIEW, 'yoga zumba class booking'),
  item('/gym/lockers', msg('Lockers'), KeyRound, P.CUSTOMERS_VIEW, 'locker rent'),
  item('/gym/equipment', msg('Machines'), Activity, P.PRODUCTS_VIEW, 'equipment machine service'),
];
