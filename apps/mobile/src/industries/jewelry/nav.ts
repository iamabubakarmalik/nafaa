/** More-menu items for the jewelry pack (web JewelryPack navGroups; screens in src/industries/jewelry). */

import { Hammer, LayoutDashboard, Palette, Repeat, Scale, TrendingUp, Wrench } from 'lucide-react-native';
import { msg } from '@/core/i18n';
import { PERMISSIONS as P } from '@/core/permissions';
import type { NavItem } from '@/modules/shell/navigation/nav-config';

const only = ['jewelry'];

export const NAV: NavItem[] = [
  { to: '/jewelry/dashboard', href: '/jewelry', label: msg('Jewelry dashboard'), icon: LayoutDashboard, industries: only, permission: P.DASHBOARD_VIEW, module: 'industry', keywords: 'jewelry overview sona chandi' },
  { to: '/jewelry/metal-rates', href: '/jewelry/metal-rates', label: msg('Today\'s rates'), icon: TrendingUp, industries: only, module: 'industry', keywords: 'gold rate sona chandi tola rate' },
  { to: '/jewelry/custom-orders', href: '/jewelry/custom-orders', label: msg('Custom orders'), icon: Palette, industries: only, permission: P.POS_USE, module: 'industry', keywords: 'order design karigar advance' },
  { to: '/jewelry/exchanges', href: '/jewelry/exchanges', label: msg('Old gold'), icon: Repeat, industries: only, permission: P.PURCHASES_VIEW, module: 'industry', keywords: 'purana sona exchange buyback kaat' },
  { to: '/jewelry/repairs', href: '/jewelry/repairs', label: msg('Repair'), icon: Wrench, industries: only, permission: P.POS_USE, module: 'industry', keywords: 'marammat repair zewar' },
  { to: '/jewelry/karigars', href: '/jewelry/karigars', label: msg('Craftsmen'), icon: Hammer, industries: only, permission: P.SUPPLIERS_VIEW, module: 'industry', keywords: 'karigar craftsman mazdoori' },
  { to: '/jewelry/metal-stock', href: '/jewelry/metal-stock', label: msg('Metal stock'), icon: Scale, industries: only, permission: P.STOCK_MOVEMENTS_VIEW, module: 'industry', keywords: 'kachcha sona tijori gold stock' },
];
