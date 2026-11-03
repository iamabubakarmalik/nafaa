/** More-menu items for the hardware pack (gathered by ../nav-trade.ts); mirrors the web HardwarePack navGroups. */

import { Building2, FilePlus, FileText, HardHat, LayoutDashboard, RefreshCw, Truck } from 'lucide-react-native';
import { msg } from '@/core/i18n';
import { PERMISSIONS as P } from '@/core/permissions';
import type { NavItem } from '@/modules/shell/navigation/nav-config';

const ids = ['hardware'];

export const NAV: NavItem[] = [
  { to: '/hardware/dashboard', href: '/hardware', label: msg('Hardware dashboard'), icon: LayoutDashboard, industries: ids, permission: P.DASHBOARD_VIEW, module: 'industry', keywords: 'hardware overview cement' },
  { to: '/hardware/quotations/new', href: '/hardware/quotations/new', label: msg('New quotation'), icon: FilePlus, industries: ids, permission: P.POS_USE, module: 'industry', keywords: 'quotation estimate rate order' },
  { to: '/hardware/quotations', href: '/hardware/quotations', label: msg('Quotations'), icon: FileText, industries: ids, permission: P.SALES_VIEW, module: 'industry', keywords: 'quotation estimate' },
  { to: '/hardware/deliveries', href: '/hardware/deliveries', label: msg('Delivery challan'), icon: Truck, industries: ids, permission: P.SALES_VIEW, module: 'industry', keywords: 'challan delivery gaari site' },
  { to: '/hardware/credit-accounts', href: '/hardware/credit-accounts', label: msg('Contractor credit'), icon: HardHat, industries: ids, permission: P.KHATA_VIEW, module: 'industry', keywords: 'thekedar contractor udhaar khata' },
  { to: '/hardware/projects', href: '/hardware/projects', label: msg('Sites / projects'), icon: Building2, industries: ids, permission: P.CUSTOMERS_VIEW, module: 'industry', keywords: 'site project construction' },
  { to: '/hardware/reorder-rules', href: '/hardware/reorder-rules', label: msg('Reorder'), icon: RefreshCw, industries: ids, permission: P.LOW_STOCK_VIEW, module: 'industry', keywords: 'reorder mangwana low stock' },
];
