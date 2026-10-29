import {
  Activity, AlertTriangle, ArrowRightLeft, Award, BarChart3, Bell, Bike, BookOpen, BookmarkPlus, Brain,
  Building2, CheckCircle2, ClipboardCheck, Cloud, CreditCard, Database, Download, Eye, FileText, Gauge, Gift,
  Globe, Hash, Layers, LayoutDashboard, Megaphone, MessageCircle, Navigation, Package, PackagePlus, Percent,
  Plug, Receipt, RotateCcw, ScanLine, ScrollText, Settings, Shield, ShieldCheck, ShoppingBag, ShoppingCart,
  Sparkles, Star, Store, Tag, TrendingUp, Trophy, Truck, UserCircle, UserCog, Users, Wallet, Wallet2, Zap, PackageX,
  Landmark, Send, Printer, QrCode, Search, HandCoins, Palette, Scale, ShieldAlert, UserCheck,
  Briefcase, Code2, FileSpreadsheet, MapPin, Factory, PackageCheck, Calculator, BadgePercent,
} from 'lucide-react';
import { hasPermission, isOwner, isOwnerOnlyPath, PERMISSIONS as P, type PermissionKey } from '@core/lib/permissions';
import type { IndustryNavGroup, IndustryNavItem } from '@industries/_shared/types/industry-pack';

/* ═════════════════════════════════════════════════════════════
   NAVIGATION — one source of truth for the sidebar, the mobile
   drawer, the collapsed rail, quick actions search and the
   Settings frame.
   Store-level setup (plan, billing, users, branches, apps, tax,
   data) lives in Settings, not in the everyday sidebar.
   ═════════════════════════════════════════════════════════════ */

export type NavItem = {
  to: string;
  label: string;
  icon: any;
  permission?: PermissionKey;
  /** A second permission the item also needs (both must be held). */
  alsoNeeds?: PermissionKey;
  badge?: string;
  hot?: boolean;
  /** Live count instead of a static badge */
  liveCount?: 'online-orders';
  /** Counter-only screen — hidden on the consolidated "All shops" view */
  needsShop?: boolean;
  /** Extra words that should find this item in search */
  keywords?: string;
  /** Shown only while this business feature is switched on in Settings. */
  feature?: 'manufacturing';
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
  /** An everyday app page: Settings links to it, but it keeps the app sidebar. */
  external?: boolean;
};

/* ─── POS workspace ─── */
export const posNavGroups: NavGroup[] = [
  {
    id: 'overview', label: 'Overview', icon: LayoutDashboard, color: '#10b981', defaultOpen: true, order: 0,
    items: [
      { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, keywords: 'home' },
      { to: '/ai', label: 'Nafaa AI', icon: Sparkles, permission: P.AI_USE, keywords: 'ai assistant sawal poochein question chat bot' },
      { to: '/day-report', label: 'Day report', icon: FileText, permission: P.DASHBOARD_VIEW, keywords: 'din ka hisaab daily report closing opening z report' },
      { to: '/reports', label: 'Reports', icon: BarChart3, permission: P.REPORTS_VIEW },
      { to: '/profit-loss', label: 'Profit-loss (P&L)', icon: Scale, permission: P.PROFIT_REPORT_VIEW, keywords: 'p&l profit loss profit-loss profit statement break even cash flow' },
      { to: '/profit-report', label: 'Profit by product', icon: TrendingUp, permission: P.PROFIT_REPORT_VIEW },
      { to: '/stock-report', label: 'Stock report', icon: Package, permission: P.REPORTS_VIEW },
      { to: '/reports/staff', label: 'Staff & counter', icon: UserCheck, permission: P.REPORTS_VIEW, alsoNeeds: P.STAFF_VIEW, keywords: 'cashier counter galla shift performance' },
      { to: '/reports/customers', label: 'Customers report', icon: Users, permission: P.REPORTS_VIEW, alsoNeeds: P.CUSTOMERS_VIEW, keywords: 'rfm cohort udhaar loyalty repeat' },
      { to: '/audit', label: 'Audit', icon: ShieldAlert, permission: P.ACTIVITY_VIEW, keywords: 'nigrani audit chori loss void refund drawer' },
    ],
  },
  {
    id: 'sales', label: 'Sales', icon: ShoppingCart, color: '#059669', defaultOpen: true, order: 5,
    items: [
      { to: '/pos', label: 'POS counter', icon: ShoppingCart, permission: P.POS_USE, hot: true, needsShop: true, keywords: 'sale checkout till bill' },
      { to: '/sales', label: 'Sales history', icon: Receipt, permission: P.SALES_VIEW, keywords: 'bills invoices' },
      { to: '/bookings', label: 'Bookings', icon: BookmarkPlus, permission: P.SERVICE_BOOKINGS_VIEW, keywords: 'advance reserve' },
      { to: '/returns', label: 'Returns', icon: RotateCcw, permission: P.RETURNS_VIEW, keywords: 'refund return' },
      { to: '/quick-keys', label: 'Quick keys', icon: Zap, permission: P.PRODUCTS_VIEW, keywords: 'pos shortcut buttons fast' },
      { to: '/cash-register', label: 'Cash register', icon: Wallet, permission: P.CASH_REGISTER_VIEW, needsShop: true, keywords: 'till drawer' },
    ],
  },
  {
    id: 'online', label: 'Online store', icon: Globe, color: '#0ea5e9', defaultOpen: true, order: 6,
    items: [
      { to: '/online-orders', label: 'Online orders', icon: ShoppingBag, permission: P.SALES_VIEW, liveCount: 'online-orders', keywords: 'website cod delivery foodpanda daraz' },
      { to: '/online-store/products', label: 'Online products', icon: PackageCheck, permission: P.ONLINE_PRODUCTS_VIEW, keywords: 'daraz shopify woocommerce products link jorna sku price stock sync channel' },
      { to: '/online-store/price-calculator', label: 'Price calculator', icon: BadgePercent, permission: P.COST_VIEW, keywords: 'price nikalein calculator margin break even daraz commission shopify fee cod rto ads profit qeemat' },
      { to: '/online-store/ads', label: 'Ads & ROAS', icon: Megaphone, permission: P.ADS_VIEW, keywords: 'ads kharcha facebook instagram meta tiktok google roas marketing campaign csv' },
      { to: '/online-orders/pack', label: 'Packing', icon: ScanLine, permission: P.SALES_VIEW, keywords: 'pack scan barcode packing slip label ready parcel' },
      { to: '/online-orders/returns-scan', label: 'RTO returns', icon: PackageX, permission: P.SALES_VIEW, keywords: 'rto return wapas parcel scan damaged kharab restock' },
      { to: '/online-orders/cod', label: 'COD & courier', icon: Wallet, permission: P.SALES_VIEW, keywords: 'cod courier tcs leopards postex rto settlement paisa' },
      { to: '/online-store/couriers', label: 'Couriers', icon: Truck, permission: P.SALES_VIEW, keywords: 'courier postex leopards tcs trax booking label cn tracking connect' },
      { to: '/online-store/costs', label: 'Selling costs', icon: Calculator, permission: P.SALES_VIEW, keywords: 'courier charge rate card cod fee packaging gateway fee profit expense rto' },
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
      { to: '/khata', label: 'Customer credit', icon: BookOpen, permission: P.KHATA_VIEW, keywords: 'udhaar credit ledger' },
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
      { to: '/combos', label: 'Combos', icon: Gift, permission: P.PRODUCTS_VIEW, keywords: 'bundle deal offer package' },
      { to: '/product-units', label: 'Multi-units', icon: Layers, permission: P.PRODUCTS_VIEW, keywords: 'pack box carton dozen unit' },
      { to: '/damage', label: 'Damaged stock', icon: PackageX, permission: P.PRODUCTS_VIEW, keywords: 'kharab maal damage wastage expiry toota report approve' },
      { to: '/stock-adjustments', label: 'Adjustments', icon: ClipboardCheck, permission: P.STOCK_ADJUSTMENTS_MANAGE, needsShop: true, keywords: 'count correction' },
      { to: '/manufacturing', label: 'Manufacturing', icon: Factory, permission: P.MANUFACTURING_VIEW, feature: 'manufacturing', keywords: 'banayein manufacturing production recipe bom mix pack raw maal banana' },
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
      { to: '/income', label: 'Other income', icon: HandCoins, permission: P.INCOME_VIEW, keywords: 'doosri aamdani income incentive scheme claim commission kiraya rent' },
    ],
  },
  {
    id: 'staff', label: 'Staff', icon: UserCog, color: '#8b5cf6', order: 93,
    items: [
      { to: '/staff', label: 'All staff', icon: UserCog, permission: P.STAFF_VIEW, keywords: 'employees' },
      { to: '/staff/attendance', label: 'Attendance', icon: CheckCircle2, permission: P.STAFF_VIEW },
      { to: '/staff/salary/new', label: 'Payroll', icon: Wallet2, permission: P.STAFF_MANAGE, keywords: 'salary' },
      { to: '/staff/commission', label: 'Commission', icon: HandCoins, permission: P.COMMISSION_OWN, keywords: 'commission hissa sale incentive bonus target' },
    ],
  },
  {
    id: 'tax', label: 'Tax', icon: Landmark, color: '#64748b', order: 96,
    items: [
      { to: '/tax', label: 'Overview', icon: BarChart3, permission: P.SETTINGS_VIEW, keywords: 'tax fbr pra srb kpra analytics' },
      { to: '/tax/invoices', label: 'Tax invoices', icon: FileText, permission: P.SETTINGS_VIEW, keywords: 'fbr pra srb kpra fiscal invoice' },
      { to: '/tax/reports', label: 'Monthly reports', icon: TrendingUp, permission: P.SETTINGS_VIEW, keywords: 'tax return filing report' },
      { to: '/tax/settings', label: 'Tax settings', icon: Settings, permission: P.SETTINGS_VIEW, keywords: 'fbr pra srb kpra pos id token' },
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
      { to: '/day-report', label: 'Day report', icon: FileText, permission: P.DASHBOARD_VIEW, keywords: 'din ka hisaab daily report closing opening z report' },
      { to: '/reports', label: 'Reports', icon: BarChart3, permission: P.REPORTS_VIEW },
      { to: '/profit-loss', label: 'Profit-loss (P&L)', icon: Scale, permission: P.PROFIT_REPORT_VIEW, keywords: 'p&l profit loss profit-loss profit statement break even cash flow' },
      { to: '/profit-report', label: 'Profit by product', icon: TrendingUp, permission: P.PROFIT_REPORT_VIEW },
      { to: '/stock-report', label: 'Stock report', icon: Package, permission: P.REPORTS_VIEW },
      { to: '/reports/staff', label: 'Staff & counter', icon: UserCheck, permission: P.REPORTS_VIEW, alsoNeeds: P.STAFF_VIEW, keywords: 'cashier counter galla shift performance' },
      { to: '/reports/customers', label: 'Customers report', icon: Users, permission: P.REPORTS_VIEW, alsoNeeds: P.CUSTOMERS_VIEW, keywords: 'rfm cohort udhaar loyalty repeat' },
      { to: '/audit', label: 'Audit', icon: ShieldAlert, permission: P.ACTIVITY_VIEW, keywords: 'nigrani audit chori loss void refund drawer' },
      { to: '/sales', label: 'Sales history', icon: Receipt, permission: P.SALES_VIEW },
      { to: '/returns', label: 'Returns', icon: RotateCcw, permission: P.RETURNS_VIEW },
      { to: '/stock-movements', label: 'Stock movements', icon: Activity, permission: P.STOCK_MOVEMENTS_VIEW },
    ],
  },
  {
    id: 'money', label: 'Money', icon: Wallet, color: '#f59e0b', defaultOpen: true, order: 30,
    items: [
      { to: '/khata', label: 'Customer credit', icon: BookOpen, permission: P.KHATA_VIEW, keywords: 'khata udhaar credit ledger' },
      { to: '/customers', label: 'Customers', icon: Users, permission: P.CUSTOMERS_VIEW },
      { to: '/money', label: 'Shop accounts', icon: Landmark, permission: P.REPORTS_VIEW },
      { to: '/expenses', label: 'Expenses', icon: Wallet, permission: P.EXPENSES_VIEW },
      { to: '/income', label: 'Other income', icon: HandCoins, permission: P.INCOME_VIEW },
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

/* ─── SETTINGS (Meta Business Suite style) ───
   One sidebar of folders. Each folder holds its pages; a page either opens
   inside the Settings frame or, when `external`, is an everyday app page
   that Settings only links to. */

export type SettingsGroup = {
  id: string;
  title: string;
  icon: any;
  desc: string;
  items: SettingsItem[];
  /** One page shown as a plain link instead of a folder. */
  flat?: boolean;
  danger?: boolean;
};

const VIEW = P.SETTINGS_VIEW;

export const SETTINGS_HOME: SettingsItem = {
  to: '/settings', label: 'Overview', icon: LayoutDashboard, permission: VIEW,
  desc: 'Setup ki halat, sab settings ek nazar me', keywords: 'settings home all setup health',
};

export const SETTINGS_SECTIONS: SettingsGroup[] = [
  {
    id: 'business', title: 'Business info', icon: Store, desc: 'Store ki pehchaan, business type, zubaan aur branches',
    items: [
      { to: '/settings/store', label: 'Store details', icon: Store, permission: VIEW, desc: 'Naam, logo, pata, phone — har bill par chhapte hain', keywords: 'shop name logo address phone email website legal banner' },
      { to: '/settings/business-type', label: 'Business type', icon: Briefcase, permission: VIEW, desc: 'Industry aur us ke features on/off', keywords: 'industry features retail pharmacy bakery grocery type' },
      { to: '/settings/language', label: 'Language & time', icon: Globe, permission: VIEW, desc: 'Zubaan, currency, time zone, din ka aaghaz, store ke ghante', keywords: 'urdu english currency pkr timezone hours working days business day' },
      { to: '/shops', label: 'Branches', icon: MapPin, permission: P.SHOPS_VIEW, desc: 'Locations, counters aur stock points', keywords: 'locations shops branch' },
    ],
  },
  {
    id: 'users', title: 'Users', icon: Users, desc: 'Staff, roles, PIN aur aap ka apna account',
    items: [
      { to: '/staff', label: 'People', icon: UserCog, permission: P.STAFF_VIEW, external: true, desc: 'Staff, login aur haazri', keywords: 'staff employees team people' },
      { to: '/staff?tab=roles', label: 'Roles & permissions', icon: ShieldCheck, permission: P.TEAM_VIEW, external: true, desc: 'Kaun kya dekh aur kar sakta hai', keywords: 'roles access staff login permission' },
      { to: '/settings/security', label: 'Security & PIN', icon: Shield, permission: VIEW, desc: 'Malik ka PIN, locked pages, password, devices', keywords: 'pin password session lock device security' },
      { to: '/profile', label: 'My profile', icon: UserCircle, desc: 'Aap ka naam, password aur PIN', keywords: 'password pin account' },
    ],
  },
  {
    id: 'counter', title: 'Counter & POS', icon: ShoppingCart, desc: 'Counter ke usool, receipt, printer aur payment QR',
    items: [
      { to: '/settings/counter', label: 'Counter rules', icon: ShoppingBag, permission: VIEW, desc: 'Payment, Discount ki had, PIN kab maangein', keywords: 'pos discount pin void refund payment customer counter' },
      { to: '/settings/receipt', label: 'Receipt', icon: Receipt, permission: VIEW, desc: 'Bill ka design, kaghaz, apni likhai, live preview', keywords: 'bill receipt invoice paper 58 80 a4 footer raseed' },
      { to: '/settings/printing', label: 'Printing', icon: FileText, permission: P.POS_USE, desc: 'A4, PDF, thermal 80/58mm, colour ya black & white, header/footer', keywords: 'print printer pdf a4 thermal receipt colour black white header footer logo' },
      { to: '/settings/hardware', label: 'POS hardware', icon: Printer, permission: P.POS_USE, desc: 'Printer direct, cash drawer, tarazu, customer screen', keywords: 'printer thermal escpos drawer scale tarazu weighing customer display hardware usb bluetooth' },
      { to: '/settings/payment-qr', label: 'Payment QR', icon: QrCode, permission: VIEW, desc: 'Raast, JazzCash, Easypaisa QR — bill ki Amount ke saath', keywords: 'raast qr jazzcash easypaisa bank qr code scan pay till' },
    ],
  },
  {
    id: 'stock-customers', title: 'Stock & customers', icon: Package, desc: 'Stock ke usool, udhaar aur loyalty',
    items: [
      { to: '/settings/stock', label: 'Stock rules', icon: Package, permission: VIEW, desc: 'Kam stock ki had, minus stock, Banayein (Manufacturing)', keywords: 'low stock negative minus inventory manufacturing production recipe' },
      { to: '/settings/credit-loyalty', label: 'Credit & loyalty', icon: Award, permission: VIEW, desc: 'Udhaar ki limit, loyalty points', keywords: 'udhaar credit khata limit loyalty points rewards' },
    ],
  },
  {
    id: 'messages', title: 'Messages & reports', icon: MessageCircle, desc: 'Notifications, WhatsApp messages aur rozana report',
    items: [
      { to: '/settings/notifications', label: 'Notifications', icon: Bell, permission: VIEW, desc: 'Email, kam stock, rozana sale', keywords: 'email alert low stock notification' },
      { to: '/settings/whatsapp', label: 'WhatsApp messages', icon: MessageCircle, permission: VIEW, desc: 'Bill, udhaar aur shukriya ke tayyar message', keywords: 'whatsapp message template bill udhaar shukriya' },
      { to: '/settings/reports', label: 'Reports & daily summary', icon: BarChart3, permission: VIEW, desc: 'Rozana closing report, hafta, report ka period', keywords: 'daily summary closing report week fiscal year period' },
    ],
  },
  {
    id: 'tax', title: 'Tax & compliance', icon: Landmark, desc: 'Tax rate aur FBR / PRA / SRB / KPRA',
    items: [
      { to: '/settings/tax', label: 'Tax rates', icon: Percent, permission: VIEW, desc: 'GST rate, tax number, inclusive ya exclusive', keywords: 'gst sales tax rate ntn inclusive exclusive' },
      { to: '/tax/settings', label: 'FBR / PRA / SRB / KPRA', icon: Landmark, permission: VIEW, desc: 'Har bill authority ko, fiscal number bill par, mahine ki report', match: ['/tax/settings', '/fbr'], keywords: 'tax fbr pra srb kpra pos invoice fiscal' },
    ],
  },
  {
    id: 'integrations', title: 'Integrations', icon: Plug, desc: 'Jore hue apps, sales channels, payments aur couriers',
    items: [
      { to: '/integrations', label: 'Connected apps', icon: Plug, permission: VIEW, desc: 'Foodpanda, Daraz, couriers, payments — sab ek jagah', keywords: 'apps integrations foodpanda daraz tcs jazzcash connect' },
      { to: '/online-store/channels', label: 'Sales channels', icon: Globe, permission: VIEW, desc: 'WooCommerce, Shopify, apni website', match: ['/online-store/channels', '/online-store/website'], keywords: 'woocommerce shopify online store website' },
      { to: '/online-store/foodpanda', label: 'Foodpanda', icon: Bike, permission: VIEW, desc: 'Foodpanda orders seedha Nafaa me — accept, reject, ready', keywords: 'foodpanda delivery hero food order restaurant rider' },
      { to: '/online-store/payments', label: 'Online payments', icon: Wallet, permission: VIEW, desc: 'Safepay, JazzCash, Easypaisa — advance ya poori Amount ka link', keywords: 'payment safepay jazzcash easypaisa card link advance' },
      { to: '/online-store/couriers', label: 'Couriers', icon: Truck, permission: VIEW, desc: 'PostEx, Leopards — booking, label, tracking', keywords: 'courier postex leopards booking' },
      { to: '/settings/google', label: 'Google', icon: Search, permission: VIEW, desc: 'Google Shopping, Maps par stock, reviews', keywords: 'google merchant center shopping maps business profile review local inventory feed' },
      { to: '/settings/accounting', label: 'Accounting', icon: Wallet2, permission: VIEW, desc: 'Zoho Books, QuickBooks, Xero, Tally — roz ka hisaab', keywords: 'accounting zoho books quickbooks xero tally tallyprime journal accountant' },
      { to: '/settings/developer', label: 'API & webhooks', icon: Code2, permission: VIEW, desc: 'Zapier, Make, Google Sheets, apna software', keywords: 'api key webhook zapier make n8n google sheets developer erp integration' },
      { to: '/marketplace/settings', label: 'Marketplace publishing', icon: Send, permission: VIEW, desc: 'Nafaa marketplace par kya dikhe', keywords: 'marketplace publish online' },
    ],
  },
  {
    id: 'billing', title: 'Plan & billing', icon: CreditCard, desc: 'Plan, invoices, limits aur referrals',
    items: [
      { to: '/plans', label: 'Plan', icon: Sparkles, permission: P.PLANS_VIEW, desc: 'Aap ki subscription aur upgrade', keywords: 'subscription upgrade' },
      { to: '/billing', label: 'Billing', icon: CreditCard, permission: P.BILLING_VIEW, desc: 'Invoices aur Payment ka tareeqa', keywords: 'invoice pay' },
      { to: '/plan-usage', label: 'Usage', icon: Gauge, permission: P.PLAN_USAGE_VIEW, desc: 'Limits aur kitna istemal hua', keywords: 'limits quota usage' },
      { to: '/referrals', label: 'Referrals', icon: Gift, permission: P.REFERRALS_VIEW, desc: 'Doosre stores ko bulayein, inaam paayein', keywords: 'invite refer reward' },
    ],
  },
  {
    id: 'data', title: 'Data', icon: Database, desc: 'Sync, backup, export aur activity log',
    items: [
      { to: '/sync', label: 'Sync & offline', icon: Cloud, desc: 'Offline Sales aur sync ki halat', keywords: 'offline internet sync' },
      { to: '/backup', label: 'Backup', icon: Database, permission: P.BACKUP_MANAGE, desc: 'Poore data ki ek file — mehfooz rakhein', keywords: 'backup restore json' },
      { to: '/settings/data-export', label: 'Data download', icon: Download, permission: VIEW, alsoNeeds: P.BACKUP_MANAGE, desc: 'Products, customers, Sales — JSON, CSV ya Excel', keywords: 'export download csv excel json backup' },
      { to: '/exports', label: 'Exports', icon: FileSpreadsheet, permission: P.EXPORTS_VIEW, desc: 'Kisi bhi period ki Excel files aur un ki history', keywords: 'csv excel export history' },
      { to: '/activity-log', label: 'Activity log', icon: Activity, permission: P.ACTIVITY_VIEW, desc: 'Kis ne kya aur kab badla', keywords: 'audit history log' },
    ],
  },
  {
    id: 'account', title: 'Appearance & account', icon: Palette, desc: 'Rang, font, dark mode aur policies',
    items: [
      { to: '/settings/appearance', label: 'Appearance', icon: Palette, desc: 'Rang, font, dark mode, text size, layout', keywords: 'theme dark light mode color colour brand font urdu text size compact density corners sidebar background page width' },
      { to: '/legal', label: 'Terms & privacy', icon: ScrollText, desc: 'Policies aur legal', keywords: 'terms privacy policy legal' },
    ],
  },
  {
    id: 'danger', title: 'Danger zone', icon: AlertTriangle, desc: 'Ownership transfer aur store delete', flat: true, danger: true,
    items: [
      { to: '/settings/danger', label: 'Danger zone', icon: AlertTriangle, permission: VIEW, alsoNeeds: P.SETTINGS_MANAGE, desc: 'Ownership transfer, store delete', keywords: 'delete transfer owner close account' },
    ],
  },
];

export const SETTINGS_ITEMS: SettingsItem[] = [SETTINGS_HOME, ...SETTINGS_SECTIONS.flatMap((g) => g.items)];

/** Single settings the search can find; `find` is text inside the card that holds the control. */
const SETTINGS_FIELDS: Array<{ to: string; find: string; words?: string }> = [
  { to: '/settings/store', find: 'Store logo', words: 'logo tasveer image' },
  { to: '/settings/store', find: 'Banner', words: 'banner header image' },
  { to: '/settings/store', find: 'Store ka naam', words: 'shop name dukaan' },
  { to: '/settings/store', find: 'Legal naam', words: 'legal company fbr registered' },
  { to: '/settings/store', find: 'Phone', words: 'number mobile contact' },
  { to: '/settings/store', find: 'WhatsApp number', words: 'whatsapp' },
  { to: '/settings/store', find: 'Email', words: 'email mail' },
  { to: '/settings/store', find: 'Website', words: 'website facebook instagram' },
  { to: '/settings/store', find: 'Pata', words: 'address street bazaar city province postal' },
  { to: '/settings/business-type', find: 'Aap ka business type', words: 'industry type change badlein' },
  { to: '/settings/business-type', find: 'Features', words: 'features imei expiry warranty variants batches' },
  { to: '/settings/language', find: 'Zubaan', words: 'language urdu english roman' },
  { to: '/settings/language', find: 'Currency', words: 'rupay pkr dollar symbol' },
  { to: '/settings/language', find: 'Time zone', words: 'waqt timezone karachi' },
  { to: '/settings/language', find: 'Din kab shuru hota hai', words: 'business day raat day start' },
  { to: '/settings/language', find: 'Store ke ghante', words: 'open close time hours' },
  { to: '/settings/language', find: 'Kis din khulta hai', words: 'working days chutti off' },
  { to: '/settings/tax', find: 'Sale par tax', words: 'gst sales tax enable chalu' },
  { to: '/settings/tax', find: 'Tax rate', words: 'gst percent' },
  { to: '/settings/tax', find: 'Tax number (NTN)', words: 'ntn strn' },
  { to: '/settings/tax', find: 'Tax ka hisaab', words: 'inclusive exclusive' },
  { to: '/settings/reports', find: 'Hafta kis din shuru hota hai', words: 'week start monday hafta' },
  { to: '/settings/reports', find: 'Maali saal', words: 'fiscal year july' },
  { to: '/settings/reports', find: 'Report kis period se khule', words: 'default period' },
  { to: '/settings/reports', find: 'Staff ko kaun se figures dikhein', words: 'profit cost galla staff hide' },
  { to: '/settings/reports', find: 'Rozana closing report', words: 'daily summary din ka hisaab notification' },
  { to: '/settings/reports', find: 'Kis ko milti hai', words: 'manager report recipients' },
  { to: '/settings/reports', find: 'Preview aur abhi bhejein', words: 'whatsapp send now report bhejo' },
  { to: '/settings/counter', find: 'Pehle se chuna payment', words: 'cash card default payment' },
  { to: '/settings/counter', find: 'Har bill par customer zaroori', words: 'walk in customer' },
  { to: '/settings/counter', find: 'Haath se Discount', words: 'discount' },
  { to: '/settings/counter', find: 'Zyada se zyada Discount', words: 'discount max limit had' },
  { to: '/settings/counter', find: 'Bill cancel par PIN', words: 'void pin' },
  { to: '/settings/counter', find: 'Return par PIN', words: 'refund return pin' },
  { to: '/settings/counter', find: 'Har Discount par PIN', words: 'discount pin' },
  { to: '/settings/receipt', find: 'Kaghaz', words: 'receipt printer 58 80 a4 size paper' },
  { to: '/settings/receipt', find: 'Andaaz', words: 'style design modern' },
  { to: '/settings/receipt', find: 'Naam ke neeche chhoti line', words: 'header tagline' },
  { to: '/settings/receipt', find: 'Neeche apna message', words: 'footer message' },
  { to: '/settings/receipt', find: 'Return ke usool', words: 'terms return policy' },
  { to: '/settings/receipt', find: 'Background par naam', words: 'watermark rang colour' },
  { to: '/settings/receipt', find: 'Bill khulte hi print', words: 'auto print copies' },
  { to: '/settings/receipt', find: 'Paise kaise bhejein', words: 'jazzcash easypaisa bank account iban raast payment' },
  { to: '/settings/receipt', find: 'A4 invoice', words: 'invoice pdf tax invoice due date' },
  { to: '/settings/receipt', find: 'Peeche ka hissa', words: 'back terms conditions shartein' },
  { to: '/settings/stock', find: 'Kam stock ki had', words: 'low stock alert' },
  { to: '/settings/stock', find: 'Stock khatam hone par bhi bechein', words: 'negative minus stock' },
  { to: '/settings/stock', find: 'Recipe aur Production chalu karein', words: 'manufacturing production recipe banayein' },
  { to: '/settings/credit-loyalty', find: 'Udhaar par bechna', words: 'credit khata' },
  { to: '/settings/credit-loyalty', find: 'Naye customer ki credit limit', words: 'credit limit had' },
  { to: '/settings/credit-loyalty', find: 'Loyalty points', words: 'points inaam rewards' },
  { to: '/settings/credit-loyalty', find: 'Points kab khatam hon', words: 'expiry points' },
  { to: '/settings/notifications', find: 'Email notifications', words: 'email' },
  { to: '/settings/notifications', find: 'Kam stock ki email', words: 'low stock alert' },
  { to: '/settings/notifications', find: 'Rozana Sale ki email', words: 'daily summary report' },
  { to: '/settings/notifications', find: 'Test notification', words: 'test bell ghanti' },
  { to: '/settings/whatsapp', find: 'WhatsApp messages', words: 'message template bill udhaar shukriya' },
  { to: '/settings/security', find: 'Security score', words: 'score' },
  { to: '/settings/security', find: 'Malik ka PIN', words: 'pin owner' },
  { to: '/settings/security', find: 'Locked pages', words: 'lock page pin' },
  { to: '/settings/security', find: 'Account password', words: 'password' },
  { to: '/settings/security', find: 'Active devices', words: 'login device session' },
  { to: '/settings/data-export', find: 'Data download', words: 'export backup csv excel json' },
  { to: '/settings/danger', find: 'Ownership transfer', words: 'malik tabdeel transfer owner' },
  { to: '/settings/danger', find: 'Store delete', words: 'delete band account close' },
];

/** Paths under a settings prefix that are everyday screens, not setup */
const SETTINGS_EXCLUDE = ['/shops/overview', '/integrations/orders', '/integrations/shipments'];

const norm = (p: string) => (p.toLowerCase().replace(/\/+$/, '') || '/');

/** Whether this user may see a settings page: owner-only paths, its permission and any second permission. */
export function canSeeSettingsItem(item: SettingsItem, role?: unknown, permissions?: string[]) {
  if (!isOwner(role as never) && isOwnerOnlyPath(item.to)) return false;
  if (item.permission && !hasPermission(role as never, permissions, item.permission)) return false;
  return !item.alsoNeeds || hasPermission(role as never, permissions, item.alsoNeeds);
}

/** The settings folders with only the pages this user may open; empty folders are dropped. */
export function visibleSettingsGroups(role?: unknown, permissions?: string[]): SettingsGroup[] {
  return SETTINGS_SECTIONS
    .map((g) => ({ ...g, items: g.items.filter((i) => canSeeSettingsItem(i, role, permissions)) }))
    .filter((g) => g.items.length > 0);
}

export type SettingsHit = { to: string; label: string; sub: string; icon: any; find?: string; external?: boolean };

/** Search over the visible pages and single settings. Pages come first. */
export function searchSettings(query: string, groups: SettingsGroup[]): SettingsHit[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const pages: SettingsHit[] = [];
  const byPath = new Map<string, { item: SettingsItem; group: SettingsGroup }>();
  for (const group of groups) {
    for (const item of group.items) {
      byPath.set(item.to, { item, group });
      if (`${item.label} ${item.desc} ${item.keywords ?? ''} ${group.title}`.toLowerCase().includes(q)) {
        pages.push({ to: item.to, label: item.label, sub: group.title, icon: item.icon, external: item.external });
      }
    }
  }
  const fields: SettingsHit[] = SETTINGS_FIELDS
    .filter((f) => byPath.has(f.to) && `${f.find} ${f.words ?? ''}`.toLowerCase().includes(q))
    .map((f) => {
      const { item, group } = byPath.get(f.to)!;
      return { to: f.to, label: f.find, sub: `${group.title} › ${item.label}`, icon: item.icon, find: f.find };
    });
  return [...pages, ...fields].slice(0, 12);
}

export function settingsItemFor(path: string): SettingsItem | undefined {
  const p = norm(path);
  if (SETTINGS_EXCLUDE.some((x) => p === x || p.startsWith(`${x}/`))) return undefined;
  const hit = SETTINGS_ITEMS.find((i) => i !== SETTINGS_HOME && !i.external
    && (i.match ? i.match.includes(p) : p === i.to || p.startsWith(`${i.to}/`)));
  // Any other /settings path (old links, redirects) still opens in the Settings frame.
  return hit ?? (p === '/settings' || p.startsWith('/settings/') ? SETTINGS_HOME : undefined);
}

/** The folder a settings page belongs to. */
export const settingsGroupFor = (item?: SettingsItem) => (item ? SETTINGS_SECTIONS.find((g) => g.items.includes(item)) : undefined);

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