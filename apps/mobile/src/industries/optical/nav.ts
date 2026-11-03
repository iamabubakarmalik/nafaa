/** More-menu items for the optical pack (web OpticalPack navGroups), gathered by ../nav.ts. */

import { Eye, FilePlus, FileText, FlaskConical, Glasses, LayoutDashboard, UserCog, Wrench } from 'lucide-react-native';
import { msg } from '@/core/i18n';
import { PERMISSIONS as P } from '@/core/permissions';
import type { NavItem } from '@/modules/shell/navigation/nav-config';

export const NAV: NavItem[] = [
  { to: '/optical/dashboard', href: '/optical', label: msg('Optical dashboard'), icon: LayoutDashboard, industries: ['optical'], permission: P.DASHBOARD_VIEW, module: 'industry', keywords: 'optical overview chashma' },
  { to: '/optical/lens-orders/new', href: '/optical/lens-orders/new', label: msg('New glasses order'), icon: FilePlus, industries: ['optical'], permission: P.POS_USE, module: 'industry', keywords: 'chashma order lens frame lab' },
  { to: '/optical/lens-orders', href: '/optical/lens-orders', label: msg('Glasses orders'), icon: FlaskConical, industries: ['optical'], module: 'industry', keywords: 'chashma order lab pickup' },
  { to: '/optical/lens-orders?view=repairs', href: '/optical/lens-orders?view=repairs', label: msg('Repair'), icon: Wrench, industries: ['optical'], module: 'industry', keywords: 'marammat frame repair' },
  { to: '/optical/eye-tests', href: '/optical/eye-tests', label: msg('Eye tests'), icon: Eye, industries: ['optical'], module: 'industry', keywords: 'aankh test appointment optometrist' },
  { to: '/optical/prescriptions', href: '/optical/prescriptions', label: msg('Prescriptions'), icon: FileText, industries: ['optical'], module: 'industry', keywords: 'nuskha number sph cyl axis' },
  { to: '/optical/optometrists', href: '/optical/optometrists', label: msg('Optometrists'), icon: UserCog, industries: ['optical'], module: 'industry', keywords: 'doctor optometrist' },
];
