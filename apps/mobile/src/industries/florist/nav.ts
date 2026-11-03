/** More-menu items for the florist pack (gathered by ../nav.ts). */

import { Heart, LayoutDashboard, Repeat, ShoppingBag, Sparkles, Truck } from 'lucide-react-native';
import { msg } from '@/core/i18n';
import { PERMISSIONS as P } from '@/core/permissions';
import type { NavItem } from '@/modules/shell/navigation/nav-config';

// Web FloristPack navGroups; screens in src/industries/florist.
export const NAV: NavItem[] = [
  { to: '/florist/dashboard', href: '/florist', label: msg('Florist dashboard'), icon: LayoutDashboard, industries: ['florist'], permission: P.DASHBOARD_VIEW, module: 'industry', keywords: 'florist overview phool' },
  { to: '/florist/orders', href: '/florist/orders', label: msg('Orders'), icon: ShoppingBag, industries: ['florist'], permission: P.POS_USE, module: 'industry', keywords: 'order bouquet delivery' },
  { to: '/florist/deliveries', href: '/florist/orders?tab=today', label: msg("Today's deliveries"), icon: Truck, industries: ['florist'], permission: P.POS_USE, module: 'industry', keywords: 'delivery rider aaj' },
  { to: '/florist/weddings', href: '/florist/weddings', label: msg('Wedding contracts'), icon: Heart, industries: ['florist'], permission: P.POS_USE, module: 'industry', keywords: 'shaadi mehndi event dulhan contract' },
  { to: '/florist/subscriptions', href: '/florist/subscriptions', label: msg('Subscriptions'), icon: Repeat, industries: ['florist'], permission: P.POS_USE, module: 'industry', keywords: 'weekly bouquet office' },
  { to: '/florist/freshness', href: '/florist/freshness', label: msg('Freshness'), icon: Sparkles, industries: ['florist'], permission: P.PRODUCTS_VIEW, module: 'industry', keywords: 'wilt murjha taazgi wastage' },
];
