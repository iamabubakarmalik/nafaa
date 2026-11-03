/** More-menu items for the sports pack (web SportsPack navGroups; screens in src/industries/sports). */

import { LayoutDashboard, Plus, Trophy, Users, Wrench } from 'lucide-react-native';
import { msg } from '@/core/i18n';
import { PERMISSIONS as P } from '@/core/permissions';
import type { NavItem } from '@/modules/shell/navigation/nav-config';

const only = ['sports'];

export const NAV: NavItem[] = [
  { to: '/sports/dashboard', href: '/sports', label: msg('Sports dashboard'), icon: LayoutDashboard, industries: only, permission: P.DASHBOARD_VIEW, module: 'industry', keywords: 'sports overview team repair' },
  { to: '/sports/team-orders/new', href: '/sports/team-orders/new', label: msg('New team order'), icon: Plus, industries: only, permission: P.POS_USE, module: 'industry', keywords: 'team school kit jersey order' },
  { to: '/sports/team-orders', href: '/sports/team-orders', label: msg('Team orders'), icon: Users, industries: only, permission: P.POS_USE, module: 'industry', keywords: 'team school kit jersey printing advance' },
  { to: '/sports/repair-services', href: '/sports/repair-services', label: msg('Repairs'), icon: Wrench, industries: only, permission: P.POS_USE, module: 'industry', keywords: 'bat racket repair grip stringing' },
  { to: '/sports/brands', href: '/brands', label: msg('Brands'), icon: Trophy, industries: only, permission: P.BRANDS_VIEW, module: 'industry', keywords: 'brand' },
];
