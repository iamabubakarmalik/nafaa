/** More-menu items for the gaming pack (web GamingPack navGroups; gathered by ../nav-services.ts). */

import { CreditCard, Gamepad2, LayoutDashboard, Monitor, PackageOpen, Timer, Trophy } from 'lucide-react-native';
import { msg } from '@/core/i18n';
import { PERMISSIONS as P } from '@/core/permissions';
import type { NavItem } from '@/modules/shell/navigation/nav-config';

const item = (to: string, label: string, icon: NavItem['icon'], permission: NavItem['permission'], keywords: string): NavItem => ({ to, href: to, label, icon, industries: ['gaming'], permission, module: 'industry', keywords });

export const NAV: NavItem[] = [
  { ...item('/gaming/dashboard', msg('Gaming dashboard'), LayoutDashboard, P.DASHBOARD_VIEW, 'gaming overview'), href: '/gaming' },
  item('/gaming/cafe', msg('Cafe live'), Timer, P.POS_USE, 'timer session station live'),
  item('/gaming/products', msg('Game profiles'), Gamepad2, P.PRODUCTS_VIEW, 'game console platform used condition profile'),
  item('/gaming/stations', msg('Stations'), Monitor, P.PRODUCTS_VIEW, 'station console pc rate'),
  item('/gaming/rentals', msg('Rentals'), PackageOpen, P.POS_USE, 'rental console kiraya'),
  item('/gaming/topups', msg('Digital top-ups'), CreditCard, P.PRODUCTS_VIEW, 'card topup pubg psn'),
  item('/gaming/tournaments', msg('Tournaments'), Trophy, P.POS_USE, 'tournament muqabla'),
];
