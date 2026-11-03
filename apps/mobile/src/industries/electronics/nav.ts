/** More-menu items for the electronics pack (gathered by ../nav-trade.ts); mirrors the web ElectronicsPack navGroups. */

import { Barcode, Layers, LayoutDashboard, Shield } from 'lucide-react-native';
import { msg } from '@/core/i18n';
import { PERMISSIONS as P } from '@/core/permissions';
import type { NavItem } from '@/modules/shell/navigation/nav-config';

const ids = ['electronics'];

export const NAV: NavItem[] = [
  { to: '/electronics/dashboard', href: '/electronics', label: msg('Electronics dashboard'), icon: LayoutDashboard, industries: ids, permission: P.DASHBOARD_VIEW, module: 'industry', keywords: 'electronics overview gadgets' },
  { to: '/electronics/serials', href: '/electronics/serials', label: msg('Serial / IMEI'), icon: Barcode, industries: ids, permission: P.ELECTRONICS_SERIALS_VIEW, module: 'industry', keywords: 'serial imei unit warranty check' },
  { to: '/electronics/warranty-claims', href: '/electronics/warranty-claims', label: msg('Warranty claims'), icon: Shield, industries: ids, permission: P.ELECTRONICS_WARRANTY_VIEW, module: 'industry', keywords: 'warranty claim repair brand' },
  { to: '/electronics/bundles', href: '/electronics/bundles', label: msg('Bundles'), icon: Layers, industries: ids, permission: P.PRODUCTS_VIEW, module: 'industry', keywords: 'bundle deal combo' },
];
