/** More-menu items for the mobile shop pack (gathered by ../nav-trade.ts); mirrors the web MobilePack navGroups. */

import { BarChart3, CreditCard, LayoutDashboard, RefreshCw, Smartphone, Wrench } from 'lucide-react-native';
import { msg } from '@/core/i18n';
import { PERMISSIONS as P } from '@/core/permissions';
import type { NavItem } from '@/modules/shell/navigation/nav-config';

const ids = ['mobile'];

export const NAV: NavItem[] = [
  { to: '/mobile/dashboard', href: '/mobile', label: msg('Mobile dashboard'), icon: LayoutDashboard, industries: ids, permission: P.DASHBOARD_VIEW, module: 'industry', keywords: 'mobile shop overview phone' },
  { to: '/imei-inventory', href: '/mobile/imei', label: msg('IMEI stock'), icon: Smartphone, industries: ids, permission: P.MOBILE_IMEI_VIEW, module: 'industry', keywords: 'imei pta phone stock' },
  { to: '/used-phones', href: '/mobile/used-phones', label: msg('Used phones'), icon: RefreshCw, industries: ids, permission: P.MOBILE_IMEI_VIEW, module: 'industry', keywords: 'purane phone trade-in exchange buyback' },
  { to: '/repair-tickets', href: '/mobile/repairs', label: msg('Repairs'), icon: Wrench, industries: ids, permission: P.MOBILE_REPAIRS_VIEW, module: 'industry', keywords: 'marammat repair job' },
  { to: '/emi-plans', href: '/mobile/emi', label: msg('Instalment plans'), icon: CreditCard, industries: ids, permission: P.KHATA_VIEW, module: 'industry', keywords: 'emi qist installment' },
  { to: '/mobile-reports', href: '/mobile/reports', label: msg('Mobile reports'), icon: BarChart3, industries: ids, permission: P.REPORTS_VIEW, module: 'industry', keywords: 'mobile report pta brands repairs' },
];
