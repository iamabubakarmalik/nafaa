/** More-menu items for the dairy pack (gathered by ../nav-trade.ts); mirrors the web DairyPack navGroups. */

import { Beaker, FileText, Factory, LayoutDashboard, Milk, Route as RouteIcon, Truck, Users, Warehouse } from 'lucide-react-native';
import { msg } from '@/core/i18n';
import { PERMISSIONS as P } from '@/core/permissions';
import type { NavItem } from '@/modules/shell/navigation/nav-config';

const ids = ['dairy'];

export const NAV: NavItem[] = [
  { to: '/dairy/dashboard', href: '/dairy', label: msg('Dairy dashboard'), icon: LayoutDashboard, industries: ids, permission: P.DASHBOARD_VIEW, module: 'industry', keywords: 'dairy doodh overview' },
  { to: '/dairy/deliveries', href: '/dairy/deliveries', label: msg('Home delivery'), icon: Truck, industries: ids, permission: P.POS_USE, module: 'industry', keywords: 'delivery doodh ghar rider route' },
  { to: '/dairy/customers', href: '/dairy/customers', label: msg('Delivery customers'), icon: Users, industries: ids, permission: P.CUSTOMERS_VIEW, module: 'industry', keywords: 'customer subscriber doodh wale' },
  { to: '/dairy/bills', href: '/dairy/bills', label: msg('Monthly bills'), icon: FileText, industries: ids, permission: P.KHATA_VIEW, module: 'industry', keywords: 'mahina bill statement doodh' },
  { to: '/dairy/supplies', href: '/dairy/supplies', label: msg('Milk intake'), icon: Warehouse, industries: ids, permission: P.PURCHASES_VIEW, module: 'industry', keywords: 'doodh aaya collection gawala entry fat' },
  { to: '/dairy/farmers', href: '/dairy/farmers', label: msg('Milk suppliers'), icon: Milk, industries: ids, permission: P.SUPPLIERS_VIEW, module: 'industry', keywords: 'gawala farmer supplier doodh dene wale' },
  { to: '/dairy/production', href: '/dairy/production', label: msg('Yogurt / butter, damaged stock'), icon: Factory, industries: ids, permission: P.STOCK_MOVEMENTS_VIEW, module: 'industry', keywords: 'dahi makhan production kharab' },
  { to: '/dairy/routes', href: '/dairy/routes', label: msg('Delivery routes'), icon: RouteIcon, industries: ids, permission: P.CUSTOMERS_VIEW, module: 'industry', keywords: 'route rider mohalla' },
  { to: '/dairy/quality-tests', href: '/dairy/quality-tests', label: msg('Quality tests'), icon: Beaker, industries: ids, permission: P.PURCHASES_VIEW, module: 'industry', keywords: 'quality fat snf milawat test' },
];
