/** More-menu items for the garments pack (gathered by ../nav.ts); mirrors the web GarmentsPack navGroups. */

import { Bookmark, CreditCard, LayoutDashboard, Palette, Ruler, Scissors, Table2, ArrowLeftRight } from 'lucide-react-native';
import { msg } from '@/core/i18n';
import { PERMISSIONS as P } from '@/core/permissions';
import type { NavItem } from '@/modules/shell/navigation/nav-config';

const ids = ['garments'];

export const NAV: NavItem[] = [
  { to: '/garments/dashboard', href: '/garments', label: msg('Garments dashboard'), icon: LayoutDashboard, industries: ids, permission: P.DASHBOARD_VIEW, module: 'industry', keywords: 'garments boutique overview' },
  { to: '/garments/tailoring', href: '/garments/tailoring', label: msg('Tailoring orders'), icon: Scissors, industries: ids, permission: P.POS_USE, module: 'industry', keywords: 'silai stitching suit order karigar' },
  { to: '/garments/alterations', href: '/garments/alterations', label: msg('Alterations'), icon: Ruler, industries: ids, permission: P.POS_USE, module: 'industry', keywords: 'alteration lambai fitting' },
  { to: '/garments/measurements', href: '/garments/measurements', label: msg('Measurements'), icon: Ruler, industries: ids, permission: P.POS_USE, module: 'industry', keywords: 'naap measurement' },
  { to: '/garments/reservations', href: '/garments/reservations', label: msg('Holds'), icon: Bookmark, industries: ids, permission: P.POS_USE, module: 'industry', keywords: 'hold reserve' },
  { to: '/garments/layaway', href: '/garments/layaway', label: msg('Instalment plan'), icon: CreditCard, industries: ids, permission: P.POS_USE, module: 'industry', keywords: 'qist layaway installment' },
  { to: '/garments/exchange', href: '/garments/exchange', label: msg('Exchange'), icon: ArrowLeftRight, industries: ids, permission: P.RETURNS_CREATE, module: 'industry', keywords: 'badalna exchange size' },
  { to: '/garments/collections', href: '/garments/collections', label: msg('Collections'), icon: Palette, industries: ids, permission: P.PRODUCTS_VIEW, module: 'industry', keywords: 'season eid sale collection' },
  { to: '/garments/size-charts', href: '/garments/size-charts', label: msg('Size charts'), icon: Table2, industries: ids, permission: P.PRODUCTS_VIEW, module: 'industry', keywords: 'size chart' },
];
