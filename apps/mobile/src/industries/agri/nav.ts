/** More-menu items for the agri pack (gathered by ../nav-trade.ts); mirrors the web AgriPack navGroups. */

import { Boxes, Calendar, LayoutDashboard, Landmark, Leaf, Tractor } from 'lucide-react-native';
import { msg } from '@/core/i18n';
import { PERMISSIONS as P } from '@/core/permissions';
import type { NavItem } from '@/modules/shell/navigation/nav-config';

const ids = ['agri'];

export const NAV: NavItem[] = [
  { to: '/agri/dashboard', href: '/agri', label: msg('Agri dashboard'), icon: LayoutDashboard, industries: ids, permission: P.DASHBOARD_VIEW, module: 'industry', keywords: 'agri feed seeds overview kheti' },
  { to: '/agri/farmers', href: '/agri/farmers', label: msg('Farmers'), icon: Tractor, industries: ids, permission: P.AGRI_FARMERS_VIEW, module: 'industry', keywords: 'kisan zamindar farmer udhaar gaon' },
  { to: '/agri/bulk-orders', href: '/agri/bulk-orders', label: msg('Bulk orders'), icon: Boxes, industries: ids, permission: P.AGRI_ORDERS_VIEW, module: 'industry', keywords: 'bara order season booking' },
  { to: '/agri/advisory', href: '/agri/advisory', label: msg('Crop advisory'), icon: Leaf, industries: ids, permission: P.AGRI_ADVISORY_VIEW, module: 'industry', keywords: 'mashwara fasal salah' },
  { to: '/agri/seasonal-plans', href: '/agri/seasonal-plans', label: msg('Seasonal plans'), icon: Calendar, industries: ids, permission: P.AGRI_ORDERS_VIEW, module: 'industry', keywords: 'fasal calendar bijai rabi kharif' },
  { to: '/agri/subsidy', href: '/agri/subsidy', label: msg('Govt subsidies'), icon: Landmark, industries: ids, permission: P.AGRI_ORDERS_VIEW, module: 'industry', keywords: 'subsidy kissan card sarkar' },
];
