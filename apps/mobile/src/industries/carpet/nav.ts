/** More-menu items for the carpet pack (gathered by ../nav-trade.ts); mirrors the web CarpetPack navGroups. */

import { Download, LayoutDashboard, Layers, Scissors } from 'lucide-react-native';
import { msg } from '@/core/i18n';
import { PERMISSIONS as P } from '@/core/permissions';
import type { NavItem } from '@/modules/shell/navigation/nav-config';

const ids = ['carpet'];

export const NAV: NavItem[] = [
  { to: '/carpet/dashboard', href: '/carpet', label: msg('Carpet dashboard'), icon: LayoutDashboard, industries: ids, permission: P.DASHBOARD_VIEW, module: 'industry', keywords: 'carpet qaleen overview roll' },
  { to: '/carpet-rolls', href: '/carpet/rolls', label: msg('Carpet rolls'), icon: Layers, industries: ids, permission: P.PRODUCTS_VIEW, module: 'industry', keywords: 'roll sqft qaleen' },
  { to: '/carpet-cut-pieces', href: '/carpet/cut-pieces', label: msg('Cut pieces'), icon: Scissors, industries: ids, permission: P.PRODUCTS_VIEW, module: 'industry', keywords: 'tukre piece remnant' },
  { to: '/carpet-bulk-import', href: '/carpet/rolls/bulk-import', label: msg('Rolls import'), icon: Download, industries: ids, permission: P.PRODUCTS_CREATE, module: 'industry', keywords: 'excel csv import roll' },
];
