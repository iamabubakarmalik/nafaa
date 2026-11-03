/** More-menu items for the hotel pack (web HotelPack navGroups; gathered by ../nav-services.ts). */

import { BarChart3, Bed, BedDouble, CalendarDays, CalendarPlus, Home, LayoutDashboard, Sparkle, Users } from 'lucide-react-native';
import { msg } from '@/core/i18n';
import { PERMISSIONS as P } from '@/core/permissions';
import type { NavItem } from '@/modules/shell/navigation/nav-config';

const item = (to: string, label: string, icon: NavItem['icon'], permission: NavItem['permission'], keywords: string): NavItem => ({ to, href: to, label, icon, industries: ['hotel'], permission, module: 'industry', keywords });

export const NAV: NavItem[] = [
  item('/hotel/bookings/new', msg('New booking'), CalendarPlus, P.SERVICE_BOOKINGS_MANAGE, 'hotel booking check in room'),
  { ...item('/hotel/dashboard', msg('Hotel dashboard'), LayoutDashboard, P.DASHBOARD_VIEW, 'hotel overview'), href: '/hotel' },
  item('/hotel/rooms', msg('Room board'), Home, P.SERVICE_BOOKINGS_VIEW, 'rooms board occupancy'),
  item('/hotel/bookings', msg('Bookings'), CalendarDays, P.SERVICE_BOOKINGS_VIEW, 'stays check out arrivals'),
  item('/hotel/guests', msg('Guests'), Users, P.SERVICE_BOOKINGS_VIEW, 'guest id vip'),
  item('/hotel/housekeeping', msg('Housekeeping'), Sparkle, P.SERVICE_BOOKINGS_VIEW, 'cleaning safai'),
  item('/hotel/room-types', msg('Room types'), Bed, P.PRODUCTS_VIEW, 'room type rate'),
  item('/hotel/rate-plans', msg('Season rates'), BedDouble, P.PRODUCTS_VIEW, 'season peak weekend rate'),
  item('/hotel/reports', msg('Night audit'), BarChart3, P.REPORTS_VIEW, 'night audit occupancy adr revpar'),
];
