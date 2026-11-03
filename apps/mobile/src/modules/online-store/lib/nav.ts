/**
 * The online store screens on mobile (routes under app/online) with the
 * permission each needs; the same list as the web "Online store" group.
 */

import type { LucideIcon } from 'lucide-react-native';
import {
  BadgePercent, Calculator, Globe, Megaphone, PackageCheck, PackageX, ScanLine, ShieldBan, ShoppingBag, TrendingUp, Truck, Users, Wallet, Zap,
} from 'lucide-react-native';
import { msg } from '@/core/i18n';
import { PERMISSIONS as P } from '@/core/permissions';

export interface OnlineLink { href: string; label: string; icon: LucideIcon; permission: string; hint?: string }

export const ONLINE_LINKS: OnlineLink[] = [
  { href: '/online', label: msg('Online orders'), icon: ShoppingBag, permission: P.SALES_VIEW },
  { href: '/online/pack', label: msg('Packing'), icon: ScanLine, permission: P.SALES_VIEW, hint: msg('Scan karke pack') },
  { href: '/online/returns', label: msg('RTO returns'), icon: PackageX, permission: P.SALES_VIEW, hint: msg('Wapas aaye parcel') },
  { href: '/online/cod', label: msg('COD & courier'), icon: Wallet, permission: P.SALES_VIEW, hint: msg('Paisa kahan hai') },
  { href: '/online/couriers', label: msg('Couriers'), icon: Truck, permission: P.SALES_VIEW },
  { href: '/online/couriers/rules', label: msg('Auto booking'), icon: Zap, permission: P.SALES_VIEW },
  { href: '/online/costs', label: msg('Selling costs'), icon: Calculator, permission: P.SALES_VIEW },
  { href: '/online/products', label: msg('Online products'), icon: PackageCheck, permission: P.ONLINE_PRODUCTS_VIEW },
  { href: '/online/customers', label: msg('Online customers'), icon: Users, permission: P.SALES_VIEW },
  { href: '/online/blocklist', label: msg('Block list'), icon: ShieldBan, permission: P.SALES_VIEW },
  { href: '/online/reports', label: msg('Online reports'), icon: TrendingUp, permission: P.SALES_VIEW },
  { href: '/online/ads', label: msg('Ads & ROAS'), icon: Megaphone, permission: P.ADS_VIEW },
  { href: '/online/price-calculator', label: msg('Price calculator'), icon: BadgePercent, permission: P.COST_VIEW },
  { href: '/online/channels', label: msg('Channels'), icon: Globe, permission: P.SETTINGS_VIEW },
];
