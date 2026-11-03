/** More-menu items for the petshop pack (gathered by ../nav.ts). */

import { LayoutDashboard, PawPrint, Scissors, Users } from 'lucide-react-native';
import { msg } from '@/core/i18n';
import { PERMISSIONS as P } from '@/core/permissions';
import type { NavItem } from '@/modules/shell/navigation/nav-config';

// Web PetshopPack navGroups; screens in src/industries/petshop.
export const NAV: NavItem[] = [
  { to: '/petshop/dashboard', href: '/petshop', label: msg('Pet shop dashboard'), icon: LayoutDashboard, industries: ['petshop'], permission: P.DASHBOARD_VIEW, module: 'industry', keywords: 'petshop overview' },
  { to: '/petshop/live-animals', href: '/petshop/live-animals', label: msg('Live animals'), icon: PawPrint, industries: ['petshop'], permission: P.PRODUCTS_VIEW, module: 'industry', keywords: 'janwar kutta billi tota machhli puppy kitten animal' },
  { to: '/petshop/grooming', href: '/petshop/grooming', label: msg('Grooming'), icon: Scissors, industries: ['petshop'], permission: P.POS_USE, module: 'industry', keywords: 'bath nahlana haircut appointment pet' },
  { to: '/petshop/groomers', href: '/petshop/groomers', label: msg('Groomers'), icon: Users, industries: ['petshop'], permission: P.POS_USE, module: 'industry', keywords: 'groomer staff commission' },
];
