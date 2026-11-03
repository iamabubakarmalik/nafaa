/** More-menu items for the salon pack (web SalonPack navGroups; gathered by ../nav-services.ts). */

import { Award, BookmarkPlus, Calendar, CalendarPlus, Gift, Heart, LayoutDashboard, Receipt, Scissors, Timer, UserCheck } from 'lucide-react-native';
import { msg } from '@/core/i18n';
import { PERMISSIONS as P } from '@/core/permissions';
import type { NavItem } from '@/modules/shell/navigation/nav-config';

const item = (to: string, label: string, icon: NavItem['icon'], permission: NavItem['permission'], keywords: string): NavItem => ({ to, href: to, label, icon, industries: ['salon'], permission, module: 'industry', keywords });

export const NAV: NavItem[] = [
  { ...item('/salon/dashboard', msg('Salon dashboard'), LayoutDashboard, P.DASHBOARD_VIEW, 'salon overview parlour'), href: '/salon' },
  item('/salon/counter', msg('Salon counter'), Receipt, P.POS_USE, 'salon bill counter pos stylist'),
  item('/salon/appointments/new', msg('New booking'), CalendarPlus, P.SERVICE_BOOKINGS_MANAGE, 'appointment booking walk-in'),
  item('/salon/appointments', msg('Appointments'), Calendar, P.SERVICE_BOOKINGS_VIEW, 'appointment booking time queue'),
  item('/salon/calendar', msg('Calendar'), Timer, P.SERVICE_BOOKINGS_VIEW, 'calendar day stylist'),
  item('/salon/services', msg('Services'), Scissors, P.PRODUCTS_VIEW, 'service rate list hair facial'),
  item('/salon/staff', msg('Stylists & commission'), UserCheck, P.STAFF_VIEW, 'stylist staff commission payout'),
  item('/salon/memberships', msg('Memberships'), Award, P.POS_USE, 'membership plan discount tier'),
  item('/salon/packages', msg('Packages'), BookmarkPlus, P.POS_USE, 'package prepaid sessions'),
  item('/salon/gift-vouchers', msg('Gift vouchers'), Gift, P.POS_USE, 'voucher gift code'),
  item('/salon/customers', msg('Salon customers'), Heart, P.CUSTOMERS_VIEW, 'customer profile hair skin'),
];
