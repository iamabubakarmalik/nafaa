/** More-menu items for the meat pack (gathered by ../nav-trade.ts); mirrors the web MeatPack navGroups. */

import { Beef, Building2, CalendarClock, Gauge, Heart, LayoutDashboard, Package, Plus, Scissors, ShieldCheck } from 'lucide-react-native';
import { msg } from '@/core/i18n';
import { PERMISSIONS as P } from '@/core/permissions';
import type { NavItem } from '@/modules/shell/navigation/nav-config';

const ids = ['meat'];

export const NAV: NavItem[] = [
  { to: '/meat/dashboard', href: '/meat', label: msg('Meat dashboard'), icon: LayoutDashboard, industries: ids, permission: P.DASHBOARD_VIEW, module: 'industry', keywords: 'meat gosht butcher overview' },
  { to: '/meat/rates', href: '/meat/rates', label: msg("Today's rates"), icon: Gauge, industries: ids, permission: P.STOCK_MOVEMENTS_VIEW, module: 'industry', keywords: 'rate bhao din ka hisaab day close' },
  { to: '/meat/weight-orders', href: '/meat/weight-orders', label: msg('Weight orders'), icon: Package, industries: ids, permission: P.SALES_VIEW, module: 'industry', keywords: 'order wazan kg eid' },
  { to: '/meat/weight-orders/new', href: '/meat/weight-orders/new', label: msg('New order'), icon: Plus, industries: ids, permission: P.POS_USE, module: 'industry', keywords: 'naya order wazan' },
  { to: '/meat/live-animals', href: '/meat/live-animals', label: msg('Livestock'), icon: Heart, industries: ids, permission: P.PRODUCTS_VIEW, module: 'industry', keywords: 'janwar bakra mandi baara' },
  { to: '/meat/slaughter', href: '/meat/slaughter', label: msg('Slaughter (halal)'), icon: ShieldCheck, industries: ids, permission: P.PRODUCTS_VIEW, module: 'industry', keywords: 'zibah halal dressing' },
  { to: '/meat/cutting', href: '/meat/cutting', label: msg('Cutting'), icon: Scissors, industries: ids, permission: P.PRODUCTS_VIEW, module: 'industry', keywords: 'cutting boneless qeema yield' },
  { to: '/meat/wholesale', href: '/meat/wholesale', label: msg('Restaurants / hotels'), icon: Building2, industries: ids, permission: P.CUSTOMERS_VIEW, module: 'industry', keywords: 'restaurant hotel wholesale account' },
  { to: '/meat/subscriptions', href: '/meat/subscriptions', label: msg('Supply plans'), icon: CalendarClock, industries: ids, permission: P.CUSTOMERS_VIEW, module: 'industry', keywords: 'plan subscription regular supply' },
  { to: '/meat/qurbani', href: '/meat/qurbani', label: msg('Qurbani / aqeeqa bookings'), icon: Beef, industries: ids, permission: P.SALES_VIEW, module: 'industry', keywords: 'qurbani aqeeqa hissa eid booking' },
];
