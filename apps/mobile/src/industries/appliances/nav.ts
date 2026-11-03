/** More-menu items for the appliances pack (gathered by ../nav-trade.ts); mirrors the web AppliancesPack navGroups. */

import { Barcode, FileSignature, HardHat, Home, Recycle, Shield, Truck, Wrench, Zap } from 'lucide-react-native';
import { msg } from '@/core/i18n';
import { PERMISSIONS as P } from '@/core/permissions';
import type { NavItem } from '@/modules/shell/navigation/nav-config';

const ids = ['appliances'];

export const NAV: NavItem[] = [
  { to: '/appliances/dashboard', href: '/appliances', label: msg('Appliances dashboard'), icon: Home, industries: ids, permission: P.DASHBOARD_VIEW, module: 'industry', keywords: 'appliances overview ac fridge' },
  { to: '/appliances/installations', href: '/appliances/installations', label: msg('Installations'), icon: HardHat, industries: ids, permission: P.SERVICE_JOBS_VIEW, module: 'industry', keywords: 'fitting lagana ac geyser booking' },
  { to: '/appliances/service-requests', href: '/appliances/service-requests', label: msg('Repairs'), icon: Wrench, industries: ids, permission: P.SERVICE_JOBS_VIEW, module: 'industry', keywords: 'marammat shikayat repair complaint' },
  { to: '/appliances/deliveries', href: '/appliances/deliveries', label: msg('Deliveries'), icon: Truck, industries: ids, permission: P.SERVICE_JOBS_VIEW, module: 'industry', keywords: 'delivery gaari driver helper' },
  { to: '/appliances/technicians', href: '/appliances/technicians', label: msg('Technicians'), icon: Zap, industries: ids, permission: P.SERVICE_JOBS_VIEW, module: 'industry', keywords: 'technician mistri' },
  { to: '/appliances/amc-contracts', href: '/appliances/amc-contracts', label: msg('AMC contracts'), icon: FileSignature, industries: ids, permission: P.SERVICE_JOBS_VIEW, module: 'industry', keywords: 'amc yearly service contract' },
  { to: '/appliances/serials', href: '/appliances/serials', label: msg('Serial register'), icon: Barcode, industries: ids, permission: P.ELECTRONICS_SERIALS_VIEW, module: 'industry', keywords: 'serial warranty unit' },
  { to: '/appliances/trade-ins', href: '/appliances/trade-ins', label: msg('Old items'), icon: Recycle, industries: ids, permission: P.RETURNS_VIEW, module: 'industry', keywords: 'purana saman trade in exchange' },
  { to: '/appliances/warranty-claims', href: '/appliances/warranty-claims', label: msg('Warranty claims'), icon: Shield, industries: ids, permission: P.ELECTRONICS_WARRANTY_VIEW, module: 'industry', keywords: 'warranty claim brand company' },
];
