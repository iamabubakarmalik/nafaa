/** More-menu items for the pharmacy pack (web PharmacyPack navGroups; gathered by ../nav.ts). */

import { Beaker, CalendarX, FilePlus, FileText, LayoutDashboard, ShieldAlert, Stethoscope, Thermometer } from 'lucide-react-native';
import { msg } from '@/core/i18n';
import { PERMISSIONS as P } from '@/core/permissions';
import type { NavItem } from '@/modules/shell/navigation/nav-config';

const pharmacy: Pick<NavItem, 'industries' | 'module'> = { industries: ['pharmacy'], module: 'industry' };

export const NAV: NavItem[] = [
  { to: '/pharmacy/dashboard', href: '/pharmacy', label: msg('Pharmacy dashboard'), icon: LayoutDashboard, permission: P.DASHBOARD_VIEW, keywords: 'pharmacy overview medical store', ...pharmacy },
  { to: '/pharmacy/prescriptions/new', href: '/pharmacy/prescriptions/new', label: msg('New prescription'), icon: FilePlus, permission: P.POS_USE, keywords: 'nuskha rx', ...pharmacy },
  { to: '/pharmacy/prescriptions', href: '/pharmacy/prescriptions', label: msg('Prescriptions'), icon: FileText, permission: P.POS_USE, keywords: 'nuskha rx dispense refill', ...pharmacy },
  { to: '/pharmacy/expiring', href: '/pharmacy/expiring', label: msg('Expiry & returns'), icon: CalendarX, permission: P.PRODUCTS_VIEW, keywords: 'expire batch distributor wapas', ...pharmacy },
  { to: '/pharmacy/salts', href: '/pharmacy/salts', label: msg('Salts / formula'), icon: Beaker, permission: P.PRODUCTS_VIEW, keywords: 'salt generic formula substitute interaction', ...pharmacy },
  { to: '/pharmacy/doctors', href: '/pharmacy/doctors', label: msg('Doctors'), icon: Stethoscope, keywords: 'doctor pmdc directory', ...pharmacy },
  { to: '/pharmacy/controlled-log', href: '/pharmacy/controlled-log', label: msg('Narcotic register'), icon: ShieldAlert, permission: P.PRODUCTS_VIEW, keywords: 'controlled narcotic register drap', ...pharmacy },
  { to: '/pharmacy/temperature-log', href: '/pharmacy/temperature-log', label: msg('Cold chain'), icon: Thermometer, keywords: 'fridge temperature cold chain', ...pharmacy },
];
