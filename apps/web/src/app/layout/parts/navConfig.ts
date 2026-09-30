import {
  Activity, AlertTriangle, ArrowRightLeft, Award, BarChart3, Bell, Bike, BookOpen, BookmarkPlus, Brain,
  Building2, CheckCircle2, ClipboardCheck, Cloud, CreditCard, Database, Download, Eye, FileText, Gauge, Gift,
  Globe, Hash, Layers, LayoutDashboard, Megaphone, MessageCircle, Navigation, Package, PackagePlus, Percent,
  Plug, Receipt, RotateCcw, ScanLine, ScrollText, Settings, Shield, ShieldCheck, ShoppingBag, ShoppingCart,
  Sparkles, Star, Store, Tag, TrendingUp, Trophy, Truck, UserCircle, UserCog, Users, Wallet, Wallet2, Zap,
  Landmark, Send,
} from 'lucide-react';
import { PERMISSIONS as P, type PermissionKey } from '@core/lib/permissions';
import type { IndustryNavGroup, IndustryNavItem } from '@industries/_shared/types/industry-pack';

/* ═════════════════════════════════════════════════════════════
   NAVIGATION — one source of truth for the sidebar, the mobile
   drawer, the collapsed rail, quick actions search and the
   Shopify-style settings screen.
   Store-level setup (plan, billing, users, branches, apps, tax,
   data) lives in Settings, not in the everyday sidebar.
   ═════════════════════════════════════════════════════════════ */

export type NavItem = {
  to: string;
  label: string;
  icon: any;
  permission?: PermissionKey;
  badge?: string;
  hot?: boolean;
  /** Live count instead of a static badge */
  liveCount?: 'online-orders';
  /** Counter-only screen — hidden on the consolidated "All shops" view */
  needsShop?: boolean;
  /** Extra words that should find this item in search */
  keywords?: string;
  /** Jora hua sales channel — apni ginti (naye orders) ke saath */
  count?: number;
  /** Channel ki halat: band ho to halka dikhe */
  dim?: boolean;
};

export type NavGroup = {
  id: string;
  label: string;
  icon: any;
  color?: string;
  items: NavItem[];
  defaultOpen?: boolean;
  order?: number;
};

export type SettingsItem = NavItem & {
  desc: string;
  /** Exact paths that belong to this item (instead of prefix matching) */
  match?: string[];
};

/* ─── POS workspace ─── */
export const posNavGroups: NavGroup[] = [
  {
    id: 'overview', label: 'Overview', icon: LayoutDashboard, color: '#10b981', defaultOpen: true, order: 0,
    items: [
      { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, keywords: 'home' },
      { to: '/reports', label: 'Reports', icon: BarChart3, permission: P.REPORTS_VIEW },
      { to: '/profit-report', label: 'Profit by product', icon: TrendingUp, permission: P.PROFIT_REPORT_VIEW },
      { to: '/stock-report', label: 'Stock report', icon: Package, permission: P.REPORTS_VIEW },
    ],
  },
  {
    id: 'sales', label: 'Sales', icon: ShoppingCart, color: '#059669', defaultOpen: true, order: 5,
    items: [
      { to: '/pos', label: 'POS counter', icon: ShoppingCart, permission: P.POS_USE, hot: true, needsShop: true, keywords: 'sale checkout till bill' },
      { to: '/sales', label: 'Sales history', icon: Receipt, permission: P.SALES_VIEW, keywords: 'bills invoices' },
      { to: '/bookings', label: 'Bookings', icon: BookmarkPlus, permission: P.SALES_VIEW, keywords: 'advance reserve' },
      { to: '/returns', label: 'Returns', icon: RotateCcw, permission: P.RETURNS_VIEW, keywords: 'refund wapsi' },
      { to: '/cash-register', label: 'Cash register', icon: Wallet, permission: P.CASH_REGISTER_VIEW, needsShop: true, keywords: 'till drawer' },
    ],
  },
  {
    id: 'online', label: 'Online store', icon: Globe, color: '#0ea5e9', defaultOpen: true, order: 6,
    items: [
      { to: '/online-orders', label: 'Online orders', icon: ShoppingBag, permission: P.SALES_VIEW, liveCount: 'online-orders', keywords: 'website cod delivery foodpanda daraz' },
      { to: '/online-orders/cod', label: 'COD & courier', icon: Wallet, permission: P.SALES_VIEW, keywords: 'cod courier tcs leopards postex rto settlement paisa' },
      { to: '/online-store/couriers', label: 'Couriers', icon: Truck, permission: P.SALES_VIEW, keywords: 'courier postex leopards tcs trax booking label cn tracking connect' },
      { to: '/online-orders/customers', label: 'Online customers', icon: Users, permission: P.SALES_VIEW, keywords: 'customer repeat vip inactive gayab whatsapp broadcast remarketing' },
      { to: '/online-orders/reports', label: 'Online reports', icon: TrendingUp, permission: P.SALES_VIEW, keywords: 'online report rto city channel courier csv export excel block' },
      // Jore hue channels (WooCommerce, Shopify, apni website, Daraz…) yahan
      // useVisibleNav khud daalta hai — Shopify ke "Sales channels" jaisa.
    ],
  },
  {
    id: 'customers', label: 'Customers', icon: Users, color: '#ec4899', defaultOpen: true, order: 7,
    items: [
      { to: '/customers', label: 'Customers', icon: Users, permission: P.CUSTOMERS_VIEW },
      { to: '/khata', label: 'Khata (credit)', icon: BookOpen, permission: P.KHATA_VIEW, keywords: 'udhaar credit ledger' },
      { to: '/loyalty', label: 'Loyalty', icon: Award, permission: P.LOYALTY_VIEW, keywords: 'points rewards' },
      { to: '/discounts', label: 'Discounts', icon: Percent, permission: P.DISCOUNTS_VIEW, keywords: 'offers coupons' },
    ],
  },
  {
    id: 'inventory', label: 'Inventory', icon: Package, color: '#0891b2', defaultOpen: true, order: 10,
    items: [
      { to: '/products', label: 'Products', icon: Package, permission: P.PRODUCTS_VIEW, keywords: 'items stock' },
      { to: '/catalog', label: 'Catalog', icon: Eye, permission: P.PRODUCTS_VIEW },
      { to: '/low-stock', label: 'Low stock', icon: AlertTriangle, permission: P.LOW_STOCK_VIEW, keywords: 'reorder khatam' },
      { to: '/stock-adjustments', label: 'Adjustments', icon: ClipboardCheck, permission: P.STOCK_ADJUSTMENTS_MANAGE, needsShop: true, keywords: 'count correction' },
      { to: '/transfers', label: 'Transfers', icon: ArrowRightLeft, permission: P.STOCK_TRANSFERS_MANAGE, keywords: 'branch move' },
      { to: '/stock-movements', label: 'Stock movements', icon: Activity, permission: P.STOCK_MOVEMENTS_VIEW },
      { to: '/barcode-labels', label: 'Barcode labels', icon: ScanLine, permission: P.BARCODE_LABELS_VIEW, keywords: 'print sticker' },
    ],
  },
  {
    id: 'catalog-setup', label: 'Catalog setup', icon: Tag, color: '#6366f1', order: 12,
    items: [
      { to: '/categories', label: 'Categories', icon: Tag, permission: P.CATEGORIES_VIEW },
      { to: '/brands', label: 'Brands', icon: Building2, permission: P.BRANDS_VIEW },
      { to: '/tags', label: 'Tags', icon: Hash, permission: P.TAGS_VIEW },
    ],
  },
  {
    id: 'purchasing', label: 'Purchasing', icon: Truck, color: '#f97316', order: 14,
    items: [
      { to: '/purchases', label: 'Purchases', icon: PackagePlus, permission: P.PURCHASES_VIEW, keywords: 'buy stock in' },
      { to: '/suppliers', label: 'Suppliers', icon: Truck, permission: P.SUPPLIERS_VIEW, keywords: 'vendors' },
    ],
  },
  {
    id: 'finance', label: 'Finance', icon: Landmark, color: '#f59e0b', order: 90,
    items: [
      { to: '/money', label: 'Shop accounts', icon: Landmark, permission: P.REPORTS_VIEW, keywords: 'hisab cash money' },
      { to: '/expenses', label: 'Expenses', icon: Wallet, permission: P.EXPENSES_VIEW, keywords: 'kharcha' },
    ],
  },
  {
    id: 'staff', label: 'Staff', icon: UserCog, color: '#8b5cf6', order: 93,
    items: [
      { to: '/staff', label: 'All staff', icon: UserCog, permission: P.STAFF_VIEW, keywords: 'employees' },
      { to: '/staff/attendance', label: 'Attendance', icon: CheckCircle2, permission: P.STAFF_VIEW },
      { to: '/staff/salary/new', label: 'Payroll', icon: Wallet2, permission: P.STAFF_MANAGE, keywords: 'salary' },
    ],
  },
  {
    id: 'fbr', label: 'Tax (FBR)', icon: Shield, color: '#64748b', order: 96,
    items: [
      { to: '/fbr/invoices', label: 'FBR invoices', icon: FileText, keywords: 'tax' },
      { to: '/fbr/reports', label: 'Monthly reports', icon: TrendingUp, keywords: 'tax' },
      { to: '/fbr/analytics', label: 'Tax analytics', icon: BarChart3, keywords: 'fbr' },
    ],
  },
];

/* ─── All shops (owner, every branch at once) ─── */
export const allShopsNavGroups: NavGroup[] = [
  {
    id: 'all-shops', label: 'All shops', icon: Layers, color: '#7c3aed', defaultOpen: true, order: 10,
    items: [
      { to: '/dashboard', label: 'Overview', icon: LayoutDashboard },
      { to: '/shops/overview', label: 'Branch analytics', icon: BarChart3, permission: P.SHOPS_VIEW },
      { to: '/online-orders', label: 'Online orders', icon: ShoppingBag, permission: P.SALES_VIEW, liveCount: 'online-orders' },
    ],
  },
  {
    id: 'reports', label: 'Reports', icon: BarChart3, color: '#10b981', defaultOpen: true, order: 20,
    items: [
      { to: '/reports', label: 'Reports', icon: BarChart3, permission: P.REPORTS_VIEW },
      { to: '/profit-report', label: 'Profit by product', icon: TrendingUp, permission: P.PROFIT_REPORT_VIEW },
      { to: '/stock-report', label: 'Stock report', icon: Package, permission: P.REPORTS_VIEW },
      { to: '/sales', label: 'Sales history', icon: Receipt, permission: P.SALES_VIEW },
      { to: '/returns', label: 'Returns', icon: RotateCcw, permission: P.RETURNS_VIEW },
      { to: '/stock-movements', label: 'Stock movements', icon: Activity, permission: P.STOCK_MOVEMENTS_VIEW },
    ],
  },
  {
    id: 'money', label: 'Money', icon: Wallet, color: '#f59e0b', defaultOpen: true, order: 30,
    items: [
      { to: '/khata', label: 'Khata (credit)', icon: BookOpen, permission: P.KHATA_VIEW },
      { to: '/customers', label: 'Customers', icon: Users, permission: P.CUSTOMERS_VIEW },
      { to: '/money', label: 'Shop accounts', icon: Landmark, permission: P.REPORTS_VIEW },
      { to: '/expenses', label: 'Expenses', icon: Wallet, permission: P.EXPENSES_VIEW },
    ],
  },
  {
    id: 'stock', label: 'Stock & supply', icon: Package, color: '#0891b2', order: 40,
    items: [
      { to: '/products', label: 'Products', icon: Package, permission: P.PRODUCTS_VIEW },
      { to: '/low-stock', label: 'Low stock', icon: AlertTriangle, permission: P.LOW_STOCK_VIEW },
      { to: '/transfers', label: 'Transfers', icon: ArrowRightLeft, permission: P.STOCK_TRANSFERS_MANAGE },
      { to: '/purchases', label: 'Purchases', icon: PackagePlus, permission: P.PURCHASES_VIEW },
      { to: '/suppliers', label: 'Suppliers', icon: Truck, permission: P.SUPPLIERS_VIEW },
    ],
  },
  {
    id: 'team', label: 'Team', icon: UserCog, color: '#64748b', order: 50,
    items: [
      { to: '/staff', label: 'All staff', icon: UserCog, permission: P.STAFF_VIEW },
    ],
  },
];

/* ─── Marketplace workspace ─── */
export const marketplaceNavGroups: NavGroup[] = [
  {
    id: 'mp-overview', label: 'Overview', icon: LayoutDashboard, color: '#a855f7', defaultOpen: true, order: 0,
    items: [
      { to: '/marketplace/dashboard', label: 'Dashboard', icon: LayoutDashboard, permission: P.SETTINGS_VIEW, hot: true },
      { to: '/marketplace/analytics', label: 'Analytics', icon: BarChart3, permission: P.REPORTS_VIEW },
      { to: '/marketplace/sales-funnel', label: 'Sales funnel', icon: TrendingUp, permission: P.REPORTS_VIEW },
      { to: '/marketplace/ai-insights', label: 'AI insights', icon: Brain, permission: P.SETTINGS_VIEW, badge: 'AI' },
    ],
  },
  {
    id: 'mp-storefront', label: 'Storefront', icon: Store, color: '#ec4899', defaultOpen: true, order: 5,
    items: [
      { to: '/marketplace/shop-profile', label: 'Shop profile', icon: Store, permission: P.SETTINGS_VIEW },
      { to: '/marketplace/products', label: 'Products', icon: Package, permission: P.PRODUCTS_VIEW },
      { to: '/marketplace/settings', label: 'Publish settings', icon: Globe, permission: P.SETTINGS_VIEW },
    ],
  },
  {
    id: 'mp-orders', label: 'Orders & fulfillment', icon: ShoppingCart, color: '#f97316', defaultOpen: true, order: 10,
    items: [
      { to: '/marketplace/orders', label: 'Orders', icon: ShoppingCart, permission: P.SALES_VIEW, hot: true },
      { to: '/marketplace/delivery', label: 'Delivery', icon: Bike, permission: P.SETTINGS_VIEW },
      { to: '/marketplace/rider-tracking', label: 'Rider tracking', icon: Navigation, permission: P.SETTINGS_VIEW, badge: 'LIVE' },
    ],
  },
  {
    id: 'mp-engage', label: 'Customer engagement', icon: MessageCircle, color: '#3b82f6', order: 15,
    items: [
      { to: '/marketplace/reviews', label: 'Reviews', icon: Star, permission: P.SETTINGS_VIEW },
      { to: '/marketplace/messages', label: 'Messages', icon: MessageCircle, permission: P.SETTINGS_VIEW },
      { to: '/marketplace/bargains', label: 'Bargains', icon: MessageCircle, permission: P.SETTINGS_VIEW },
      { to: '/marketplace/segments', label: 'Customer segments', icon: Users, permission: P.SETTINGS_VIEW },
    ],
  },
  {
    id: 'mp-boost', label: 'Sales boosters', icon: Zap, color: '#eab308', order: 20,
    items: [
      { to: '/marketplace/group-buys', label: 'Group buys', icon: Users, permission: P.SETTINGS_VIEW },
      { to: '/marketplace/auctions', label: 'Auctions', icon: Sparkles, permission: P.SETTINGS_VIEW },
      { to: '/marketplace/live-shop', label: 'Live shop', icon: Sparkles, permission: P.SETTINGS_VIEW, badge: 'NEW' },
    ],
  },
  {
    id: 'mp-marketing', label: 'Marketing', icon: Megaphone, color: '#dc2626', order: 25,
    items: [
      { to: '/marketplace/promotions', label: 'Promotions', icon: Megaphone, permission: P.SETTINGS_VIEW },
      { to: '/marketplace/coupons-advanced', label: 'Coupons', icon: Tag, permission: P.SETTINGS_VIEW },
      { to: '/marketplace/loyalty', label: 'Loyalty & rewards', icon: Trophy, permission: P.SETTINGS_VIEW },
    ],
  },
  {
    id: 'mp-system', label: 'Manage', icon: Settings, color: '#64748b', order: 100,
    items: [
      { to: '/marketplace/multi-shop', label: 'Multi-shop manager', icon: Building2, permission: P.SETTINGS_VIEW },
      { to: '/marketplace/notifications', label: 'Notifications', icon: Bell, permission: P.SETTINGS_VIEW },
      { to: '/marketplace/settings-hub', label: 'Marketplace settings', icon: Settings, permission: P.SETTINGS_VIEW },
    ],
  },
];

/* ─── SETTINGS (Shopify style) ─── */
export const SETTINGS_SECTIONS: { title: string; items: SettingsItem[] }[] = [
  {
    title: 'Store',
    items: [
      { to: '/settings', label: 'General', icon: Store, permission: P.SETTINGS_VIEW, desc: 'Store details, receipts and preferences', keywords: 'shop name receipt currency' },
      { to: '/shops', label: 'Branches', icon: Building2, permission: P.SHOPS_VIEW, desc: 'Locations, counters and stock points', keywords: 'locations shops' },
      { to: '/team', label: 'Users & permissions', icon: ShieldCheck, permission: P.TEAM_VIEW, desc: 'Who can log in and what they can do', keywords: 'roles access staff login' },
    ],
  },
  {
    title: 'Plan & billing',
    items: [
      { to: '/plans', label: 'Plan', icon: Sparkles, permission: P.PLANS_VIEW, desc: 'Your subscription and upgrades', keywords: 'subscription upgrade' },
      { to: '/billing', label: 'Billing', icon: CreditCard, permission: P.BILLING_VIEW, desc: 'Invoices and payment method', keywords: 'invoice pay' },
      { to: '/plan-usage', label: 'Plan usage', icon: Gauge, permission: P.PLAN_USAGE_VIEW, desc: 'Limits and what you have used', keywords: 'limits quota' },
      { to: '/referrals', label: 'Referrals', icon: Gift, permission: P.REFERRALS_VIEW, desc: 'Invite shops and earn rewards' },
    ],
  },
  {
    title: 'Sales channels & apps',
    items: [
      { to: '/settings/accounting', label: 'Accounting', icon: Wallet2, permission: P.SETTINGS_VIEW, desc: 'Zoho Books, QuickBooks, Xero — roz ka journal', keywords: 'accounting zoho books quickbooks xero journal accountant' },
      { to: '/online-store/payments', label: 'Online payments', icon: Wallet, permission: P.SETTINGS_VIEW, desc: 'Safepay, JazzCash, Easypaisa — advance / poori raqam ka link', keywords: 'payment safepay jazzcash easypaisa card link advance' },
      { to: '/online-store/couriers', label: 'Couriers', icon: Truck, permission: P.SETTINGS_VIEW, desc: 'PostEx, Leopards — booking, label, tracking', keywords: 'courier postex leopards booking' },
      { to: '/online-store/channels', label: 'Sales channels', icon: Globe, permission: P.SETTINGS_VIEW, desc: 'WooCommerce, Shopify, your own website', match: ['/online-store/channels', '/online-store/website'], keywords: 'woocommerce shopify online store website' },
      { to: '/integrations', label: 'Apps & integrations', icon: Plug, desc: 'Foodpanda, Daraz, couriers, payments', keywords: 'foodpanda daraz tcs jazzcash' },
      { to: '/marketplace/settings', label: 'Marketplace publishing', icon: Send, permission: P.SETTINGS_VIEW, desc: 'What shows on the Nafaa marketplace' },
    ],
  },
  {
    title: 'Tax & compliance',
    items: [
      { to: '/fbr', label: 'FBR tax', icon: Shield, desc: 'POS integration with FBR', match: ['/fbr', '/fbr/setup', '/fbr/wizard'], keywords: 'tax pos invoice' },
    ],
  },
  {
    title: 'Data',
    items: [
      { to: '/sync', label: 'Sync & offline', icon: Cloud, desc: 'Offline sales and sync status', keywords: 'offline internet' },
      { to: '/backup', label: 'Backup', icon: Database, permission: P.BACKUP_MANAGE, desc: 'Back up and restore your data' },
      { to: '/exports', label: 'Exports', icon: Download, permission: P.EXPORTS_VIEW, desc: 'Download data as files', keywords: 'csv excel' },
      { to: '/activity-log', label: 'Activity log', icon: Activity, permission: P.ACTIVITY_VIEW, desc: 'Who changed what and when', keywords: 'audit history' },
    ],
  },
  {
    title: 'Account',
    items: [
      { to: '/profile', label: 'My profile', icon: UserCircle, desc: 'Your name, password and PIN', keywords: 'password pin account' },
      { to: '/legal', label: 'Terms & privacy', icon: ScrollText, desc: 'Policies and legal' },
    ],
  },
];

export const SETTINGS_ITEMS: SettingsItem[] = SETTINGS_SECTIONS.flatMap((s) => s.items);

/** Paths under a settings prefix that are everyday screens, not setup */
const SETTINGS_EXCLUDE = ['/shops/overview', '/integrations/orders', '/integrations/shipments'];

const norm = (p: string) => (p.toLowerCase().replace(/\/+$/, '') || '/');

export function settingsItemFor(path: string): SettingsItem | undefined {
  const p = norm(path);
  if (SETTINGS_EXCLUDE.some((x) => p === x || p.startsWith(`${x}/`))) return undefined;
  return SETTINGS_ITEMS.find((i) => (i.match ? i.match.includes(p) : p === i.to || p.startsWith(`${i.to}/`)));
}

export const isSettingsPath = (path: string) => !!settingsItemFor(path);

export const isActivePath = (pathname: string, to: string) => {
  const p = norm(pathname);
  return p === to || p.startsWith(`${to}/`);
};

export function fromIndustryGroup(g: IndustryNavGroup): NavGroup {
  return {
    id: `ind-${g.label}`,
    label: g.label,
    icon: g.icon ?? LayoutDashboard,
    color: g.color,
    order: g.order ?? 50,
    defaultOpen: true,
    items: g.items.map((it: IndustryNavItem) => ({
      to: it.to,
      label: it.label,
      icon: it.icon ?? LayoutDashboard,
      permission: it.permission as PermissionKey | undefined,
      badge: (it as any).badge,
    })),
  };
}

/* ─── Small persistence helpers ─── */
export const LAST_APP_PATH_KEY = 'nafaa-last-app-path';
const GROUPS_KEY = 'nafaa-sidebar-groups-v8';
const FAVORITES_KEY = 'nafaa-sidebar-favorites-v6';
const RECENT_KEY = 'nafaa-sidebar-recent-v2';
export const MAX_RECENT = 5;

const read = <T,>(k: string, fallback: T): T => {
  try { const raw = localStorage.getItem(k); return raw ? (JSON.parse(raw) as T) : fallback; } catch { return fallback; }
};
const write = (k: string, v: unknown) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* ignore */ } };

export const loadGroupState = () => read<Record<string, boolean>>(GROUPS_KEY, {});
export const saveGroupState = (s: Record<string, boolean>) => write(GROUPS_KEY, s);
export const loadFavorites = () => read<string[]>(FAVORITES_KEY, ['/dashboard', '/pos', '/sales', '/products', '/online-orders']);
export const saveFavorites = (f: string[]) => write(FAVORITES_KEY, f);
export const loadRecent = () => read<string[]>(RECENT_KEY, []);
export const pushRecent = (path: string) => {
  const next = [path, ...loadRecent().filter((p) => p !== path)].slice(0, 8);
  write(RECENT_KEY, next);
  return next;
};