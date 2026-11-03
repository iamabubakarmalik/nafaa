/** More-menu items for the shoe pack (gathered by ../nav.ts); mirrors the web ShoePack navGroups. */

import { ArrowLeftRight, Award, HandMetal, LayoutDashboard, Ruler } from 'lucide-react-native';
import { msg } from '@/core/i18n';
import { PERMISSIONS as P } from '@/core/permissions';
import type { NavItem } from '@/modules/shell/navigation/nav-config';

const ids = ['shoe'];

export const NAV: NavItem[] = [
  { to: '/shoe/dashboard', href: '/shoe', label: msg('Shoe dashboard'), icon: LayoutDashboard, industries: ids, permission: P.DASHBOARD_VIEW, module: 'industry', keywords: 'shoe footwear overview' },
  { to: '/shoe/exchanges', href: '/shoe/exchanges', label: msg('Exchange'), icon: ArrowLeftRight, industries: ids, permission: P.RETURNS_CREATE, module: 'industry', keywords: 'badalna exchange size' },
  { to: '/shoe/try-on', href: '/shoe/try-on', label: msg('Size requests'), icon: HandMetal, industries: ids, permission: P.POS_USE, module: 'industry', keywords: 'size farmaish try on' },
  { to: '/shoe/size-charts', href: '/shoe/size-charts', label: msg('Size charts'), icon: Ruler, industries: ids, permission: P.PRODUCTS_VIEW, module: 'industry', keywords: 'size chart pk eu us' },
  { to: '/shoe/brands', href: '/shoe/brands', label: msg('Brands'), icon: Award, industries: ids, permission: P.BRANDS_VIEW, module: 'industry', keywords: 'brand' },
];
