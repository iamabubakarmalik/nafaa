/** More-menu items for the furniture pack (gathered by ../nav-trade.ts); mirrors the web FurniturePack navGroups. */

import { ClipboardList, Hammer, LayoutDashboard, Truck } from 'lucide-react-native';
import { msg } from '@/core/i18n';
import { PERMISSIONS as P } from '@/core/permissions';
import type { NavItem } from '@/modules/shell/navigation/nav-config';

const ids = ['furniture'];

export const NAV: NavItem[] = [
  { to: '/furniture/dashboard', href: '/furniture', label: msg('Furniture dashboard'), icon: LayoutDashboard, industries: ids, permission: P.DASHBOARD_VIEW, module: 'industry', keywords: 'furniture showroom overview' },
  { to: '/furniture/custom-orders', href: '/furniture/custom-orders', label: msg('Custom orders'), icon: ClipboardList, industries: ids, permission: P.SERVICE_JOBS_VIEW, module: 'industry', keywords: 'order par banwana quotation advance karigar' },
  { to: '/furniture/deliveries', href: '/furniture/deliveries', label: msg('Deliveries'), icon: Truck, industries: ids, permission: P.SERVICE_JOBS_VIEW, module: 'industry', keywords: 'delivery gaari fitting' },
  { to: '/furniture/carpenters', href: '/furniture/carpenters', label: msg('Craftsmen'), icon: Hammer, industries: ids, permission: P.STAFF_VIEW, module: 'industry', keywords: 'karigar carpenter mistri' },
];
