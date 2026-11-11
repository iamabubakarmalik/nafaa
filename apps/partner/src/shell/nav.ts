/** Navigation items for the sidebar (desktop) and the More sheet (mobile). */

import { BookOpen, LayoutDashboard, Link2, MapPinPlus, Store, UserRound, Users, Wallet, type LucideIcon } from 'lucide-react';

export interface NavItem { to: string; label: string; icon: LucideIcon; managerOnly?: boolean }

export const NAV: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/visit/new', label: 'Naya Visit', icon: MapPinPlus },
  { to: '/leads', label: 'Leads', icon: Store },
  { to: '/earnings', label: 'Kamai', icon: Wallet },
  { to: '/share', label: 'Mera link', icon: Link2 },
  { to: '/kit', label: 'Marketing kit', icon: BookOpen },
  { to: '/team', label: 'Meri team', icon: Users, managerOnly: true },
  { to: '/profile', label: 'Profile', icon: UserRound },
];

/** Items in the mobile More sheet (the rest are in the tab bar). */
export const MORE = ['/share', '/kit', '/team', '/profile'];

export const isActive = (to: string, path: string) => (to === '/' ? path === '/' : path === to || path.startsWith(`${to}/`));
