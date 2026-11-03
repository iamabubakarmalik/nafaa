/** More-menu items for the toy store pack (web ToystorePack navGroups), gathered by ../nav.ts. */

import { Cake, Gift, LayoutDashboard, ShieldAlert, Sparkles } from 'lucide-react-native';
import { msg } from '@/core/i18n';
import { PERMISSIONS as P } from '@/core/permissions';
import type { NavItem } from '@/modules/shell/navigation/nav-config';

export const NAV: NavItem[] = [
  { to: '/toystore/dashboard', href: '/toystore', label: msg('Toy store dashboard'), icon: LayoutDashboard, industries: ['toystore'], permission: P.DASHBOARD_VIEW, module: 'industry', keywords: 'toy store overview khilone' },
  { to: '/toystore/gift-finder', href: '/toystore/gift-finder', label: msg('Gift finder'), icon: Sparkles, industries: ['toystore'], module: 'industry', keywords: 'gift age budget umar khilona' },
  { to: '/toystore/gift-packs', href: '/toystore/gift-packs', label: msg('Gift packs'), icon: Gift, industries: ['toystore'], module: 'industry', keywords: 'gift pack eid box bundle' },
  { to: '/toystore/birthdays', href: '/toystore/birthdays', label: msg('Birthdays'), icon: Cake, industries: ['toystore'], permission: P.CUSTOMERS_VIEW, module: 'industry', keywords: 'saalgirah birthday bacha reminder' },
  { to: '/toystore/safety-review', href: '/toystore/safety-review', label: msg('Safety review'), icon: ShieldAlert, industries: ['toystore'], permission: P.PRODUCTS_VIEW, module: 'industry', keywords: 'safety choking certificate small parts' },
];
