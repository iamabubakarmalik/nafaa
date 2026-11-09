/**
 * The online store screens on mobile (routes under app/online) with the
 * permission each needs, in the same groups as the web commerce workspace
 * (apps/web/src/app/shell/navigation/nav-config.ts commerceNavGroups).
 * Desk pages that stay on the web (`web`) open in the browser.
 */

import type { LucideIcon } from 'lucide-react-native';
import {
  Activity, BadgePercent, BarChart3, Calculator, FileSpreadsheet, Globe, LayoutDashboard, Megaphone, MessageCircle, PackageCheck, PackagePlus, PackageX,
  Printer, ScanLine, Send, ShieldAlert, ShoppingBag, ShoppingCart, TrendingUp, Truck, Users, Wallet, Zap,
} from 'lucide-react-native';
import { msg } from '@/core/i18n';
import { PERMISSIONS as P } from '@/core/permissions';

export interface OnlineLink {
  href: string; label: string; icon: LucideIcon; permission: string; alsoNeeds?: string; hint?: string;
  /** Web path: the screen is not in the app, the link opens the web app. */
  web?: string;
}
export interface OnlineGroup { id: string; label: string; color: string; links: OnlineLink[] }

export const COMMERCE_GROUPS: OnlineGroup[] = [
  {
    id: 'c-overview', label: msg('Overview'), color: '#0ea5e9', links: [
      { href: '/online', label: msg('Dashboard'), icon: LayoutDashboard, permission: P.SALES_VIEW, hint: msg('Aaj ka kaam') },
      { href: '/online/reports', label: msg('Reports'), icon: TrendingUp, permission: P.SALES_VIEW },
    ],
  },
  {
    id: 'c-orders', label: msg('Orders'), color: '#2563eb', links: [
      { href: '/online/orders', label: msg('Orders'), icon: ShoppingBag, permission: P.SALES_VIEW },
      { href: '/online/orders/new', label: msg('Add order'), icon: PackagePlus, permission: P.ONLINE_ORDERS_MANAGE, hint: msg('WhatsApp, Instagram, phone') },
      { href: '/online/pack', label: msg('Packing scan'), icon: ScanLine, permission: P.SALES_VIEW, hint: msg('Scan karke pack') },
      { href: '/online/returns', label: msg('Return scan'), icon: PackageX, permission: P.SALES_VIEW, hint: msg('Wapas aaye parcel') },
      { href: '/online/abandoned', label: msg('Abandoned carts'), icon: ShoppingCart, permission: P.SALES_VIEW, hint: msg('Chhode hue checkout') },
    ],
  },
  {
    id: 'c-shipping', label: msg('Shipping'), color: '#ea580c', links: [
      { href: '/online/couriers', label: msg('Couriers'), icon: Truck, permission: P.SALES_VIEW },
      { href: '/online/couriers/rules', label: msg('Auto booking'), icon: Zap, permission: P.SALES_VIEW },
      { href: '/online/cod', label: msg('COD & payments'), icon: Wallet, permission: P.SALES_VIEW, hint: msg('Paisa kahan hai') },
      { href: '/online/cod-reconcile', label: msg('COD statement match'), icon: FileSpreadsheet, permission: P.SALES_VIEW },
      { href: '/online/dispatch-scan', label: msg('Dispatch scan'), icon: ScanLine, permission: P.SALES_VIEW, hint: msg('Rider ko dete waqt scan') },
      { href: '/online/dispatch', web: '/online-orders/dispatch', label: msg('Dispatch & airway bills'), icon: Printer, permission: P.SALES_VIEW, hint: msg('Loadsheet aur COD audit web par') },
      { href: '/online/dispatch-report', web: '/online-orders/dispatch-report', label: msg('Dispatch report'), icon: BarChart3, permission: P.SALES_VIEW, hint: msg('Web par khulega') },
      { href: '/online/post-office', web: '/online-orders/post-office', label: msg('Post office'), icon: Send, permission: P.SALES_VIEW, hint: msg('Web par khulega') },
    ],
  },
  {
    id: 'c-catalog', label: msg('Catalog'), color: '#7c3aed', links: [
      { href: '/online/products', label: msg('Products & stock'), icon: PackageCheck, permission: P.ONLINE_PRODUCTS_VIEW },
      { href: '/online/price-calculator', label: msg('Price calculator'), icon: BadgePercent, permission: P.COST_VIEW },
      { href: '/online/channels', label: msg('Channels'), icon: Globe, permission: P.SETTINGS_VIEW },
    ],
  },
  {
    id: 'c-customers', label: msg('Customers'), color: '#0d9488', links: [
      { href: '/online/customers', label: msg('Customers'), icon: Users, permission: P.SALES_VIEW },
      { href: '/online/blocklist', label: msg('Report scammer'), icon: ShieldAlert, permission: P.SALES_VIEW },
      { href: '/online/whatsapp-templates', label: msg('WhatsApp messages'), icon: MessageCircle, permission: P.SALES_VIEW },
    ],
  },
  {
    id: 'c-money', label: msg('Money & growth'), color: '#16a34a', links: [
      { href: '/online/costs', label: msg('Selling costs'), icon: Calculator, permission: P.SALES_VIEW },
      { href: '/online/profit', label: msg('Profit'), icon: TrendingUp, permission: P.PROFIT_REPORT_VIEW, alsoNeeds: P.COST_VIEW },
      { href: '/online/payment-health', label: msg('Payment health'), icon: Activity, permission: P.SALES_VIEW },
      { href: '/online/ads', label: msg('Ads & ROAS'), icon: Megaphone, permission: P.ADS_VIEW },
    ],
  },
];

/** Every link, flat (search, push links). */
export const ONLINE_LINKS: OnlineLink[] = COMMERCE_GROUPS.flatMap((g) => g.links);
