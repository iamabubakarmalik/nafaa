/** More-menu items for the cosmetics pack (web CosmeticsPack navGroups; gathered by ../nav.ts). Brands, deals and loyalty come from the shell menu.. */

import { CalendarClock, LayoutDashboard, TestTube2 } from 'lucide-react-native';
import { msg } from '@/core/i18n';
import { PERMISSIONS as P } from '@/core/permissions';
import type { NavItem } from '@/modules/shell/navigation/nav-config';

const cosmetics: Pick<NavItem, 'industries' | 'module'> = { industries: ['cosmetics'], module: 'industry' };

export const NAV: NavItem[] = [
  { to: '/cosmetics/dashboard', href: '/cosmetics', label: msg('Cosmetics dashboard'), icon: LayoutDashboard, permission: P.DASHBOARD_VIEW, keywords: 'cosmetics overview beauty', ...cosmetics },
  { to: '/cosmetics/expiry', href: '/cosmetics/expiry', label: msg('Cosmetics expiry'), icon: CalendarClock, permission: P.PRODUCTS_VIEW, keywords: 'expiry batch expire', ...cosmetics },
  { to: '/cosmetics/testers', href: '/cosmetics/testers', label: msg('Testers'), icon: TestTube2, permission: P.PRODUCTS_VIEW, keywords: 'tester try shade', ...cosmetics },
];
