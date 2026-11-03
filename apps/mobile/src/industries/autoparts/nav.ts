/** More-menu items for the auto parts pack (gathered by ../nav-trade.ts); mirrors the web AutoPartsPack navGroups. */

import { Bell, Car, LayoutDashboard, Package, Plus, Recycle, Truck, UserCog, Wrench } from 'lucide-react-native';
import { msg } from '@/core/i18n';
import { PERMISSIONS as P } from '@/core/permissions';
import type { NavItem } from '@/modules/shell/navigation/nav-config';

const ids = ['autoparts'];

export const NAV: NavItem[] = [
  { to: '/autoparts/dashboard', href: '/autoparts', label: msg('Auto parts dashboard'), icon: LayoutDashboard, industries: ids, permission: P.DASHBOARD_VIEW, module: 'industry', keywords: 'workshop garage overview' },
  { to: '/autoparts/jobs/new', href: '/autoparts/jobs/new', label: msg('New job'), icon: Plus, industries: ids, permission: P.SERVICE_JOBS_MANAGE, module: 'industry', keywords: 'job card gaari receive workshop' },
  { to: '/autoparts/jobs', href: '/autoparts/jobs', label: msg('Workshop jobs'), icon: Wrench, industries: ids, permission: P.SERVICE_JOBS_VIEW, module: 'industry', keywords: 'workshop job card mechanic' },
  { to: '/autoparts/parts', href: '/products', label: msg('Parts'), icon: Package, industries: ids, permission: P.PRODUCTS_VIEW, module: 'industry', keywords: 'part number oem fitment' },
  { to: '/autoparts/vehicles', href: '/autoparts/vehicles', label: msg('Vehicles'), icon: Car, industries: ids, permission: P.CUSTOMERS_VIEW, module: 'industry', keywords: 'gaari registration history' },
  { to: '/autoparts/reminders', href: '/autoparts/reminders', label: msg('Service reminders'), icon: Bell, industries: ids, permission: P.CUSTOMERS_VIEW, module: 'industry', keywords: 'oil change token insurance reminder' },
  { to: '/autoparts/core-returns', href: '/autoparts/core-returns', label: msg('Old parts'), icon: Recycle, industries: ids, permission: P.RETURNS_VIEW, module: 'industry', keywords: 'core purana part trade-in' },
  { to: '/autoparts/mechanics', href: '/autoparts/mechanics', label: msg('Mechanics'), icon: UserCog, industries: ids, permission: P.SERVICE_JOBS_VIEW, module: 'industry', keywords: 'mechanic commission' },
  { to: '/autoparts/makes', href: '/autoparts/makes', label: msg('Make / model'), icon: Truck, industries: ids, permission: P.PRODUCTS_VIEW, module: 'industry', keywords: 'company model toyota honda suzuki' },
];
