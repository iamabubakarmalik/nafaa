import {
  Activity, AlertTriangle, ArrowRightLeft, Award, BarChart3, Bell, Bike, BookOpen, BookmarkPlus, Brain,
  Building2, CheckCircle2, ClipboardCheck, Cloud, CreditCard, Database, Download, Eye, FileText, Gauge, Gift,
  Globe, Hash, Layers, LayoutDashboard, Megaphone, MessageCircle, Navigation, Package, PackagePlus, Percent,
  Plug, Receipt, RotateCcw, ScanLine, ScrollText, Settings, Shield, ShieldCheck, ShoppingBag, ShoppingCart,
  Sparkles, Star, Store, Tag, TrendingUp, Trophy, Truck, UserCircle, UserCog, Users, Wallet, Wallet2, Zap, PackageX,
  Landmark, Send, Printer, QrCode, Search, HandCoins, Palette, Scale, ShieldAlert, UserCheck,
  Briefcase, Code2, FileSpreadsheet, MapPin, Factory, PackageCheck, Calculator, BadgePercent, Network, Target, Undo2,
} from 'lucide-react';
import { hasPermission, isOwner, isOwnerOnlyPath, PERMISSIONS as P, type PermissionKey } from '@core/lib/permissions';
import type { IndustryNavGroup, IndustryNavItem } from '@industries/_shared/types/industry-pack';
import { t } from '@core/i18n';

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
  /** Shown only while this business feature is switched on in Settings ('distribution-full': not in Wholesale mode). */
  feature?: 'manufacturing' | 'distribution' | 'distribution-full';
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
    id: 'overview', label: t('Overview'), icon: LayoutDashboard, color: '#10b981', defaultOpen: true, order: 0,
    items: [
      { to: '/dashboard', label: t('Dashboard'), icon: LayoutDashboard, keywords: 'home' },
      { to: '/ai', label: t('Nafaa AI'), icon: Sparkles, permission: P.AI_USE, keywords: 'ai assistant sawal poochein question chat bot' },
      { to: '/day-report', label: t('Day report'), icon: FileText, permission: P.DASHBOARD_VIEW, keywords: 'din ka hisaab daily report closing opening z report' },
      { to: '/reports', label: t('Reports'), icon: BarChart3, permission: P.REPORTS_VIEW },
      { to: '/profit-loss', label: t('Profit-loss (P&L)'), icon: Scale, permission: P.PROFIT_REPORT_VIEW, keywords: 'p&l profit loss profit-loss profit statement break even cash flow' },
      { to: '/profit-report', label: t('Profit by product'), icon: TrendingUp, permission: P.PROFIT_REPORT_VIEW },
      { to: '/stock-report', label: t('Stock report'), icon: Package, permission: P.REPORTS_VIEW },
      { to: '/reports/staff', label: t('Staff & counter'), icon: UserCheck, permission: P.REPORTS_VIEW, alsoNeeds: P.STAFF_VIEW, keywords: 'cashier counter galla shift performance' },
      { to: '/reports/customers', label: t('Customers report'), icon: Users, permission: P.REPORTS_VIEW, alsoNeeds: P.CUSTOMERS_VIEW, keywords: 'rfm cohort udhaar loyalty repeat' },
      { to: '/audit', label: t('Audit'), icon: ShieldAlert, permission: P.ACTIVITY_VIEW, keywords: 'nigrani audit chori loss void refund drawer' },
    ],
  },
  {
    id: 'sales', label: t('Sales'), icon: ShoppingCart, color: '#059669', defaultOpen: true, order: 5,
    items: [
      { to: '/pos', label: t('POS counter'), icon: ShoppingCart, permission: P.POS_USE, hot: true, needsShop: true, keywords: 'sale checkout till bill' },
      { to: '/sales', label: t('Sales history'), icon: Receipt, permission: P.SALES_VIEW, keywords: 'bills invoices' },
      { to: '/bookings', label: t('Bookings'), icon: BookmarkPlus, permission: P.SERVICE_BOOKINGS_VIEW, keywords: 'advance reserve' },
      { to: '/returns', label: t('Returns'), icon: RotateCcw, permission: P.RETURNS_VIEW, keywords: 'refund return' },
      { to: '/quick-keys', label: t('Quick keys'), icon: Zap, permission: P.PRODUCTS_VIEW, keywords: 'pos shortcut buttons fast' },
      { to: '/cash-register', label: t('Cash register'), icon: Wallet, permission: P.CASH_REGISTER_VIEW, needsShop: true, keywords: 'till drawer' },
    ],
  },
  {
    id: 'online', label: t('Online store'), icon: Globe, color: '#0ea5e9', defaultOpen: true, order: 6,
    items: [
      { to: '/online-orders', label: t('Online orders'), icon: ShoppingBag, permission: P.SALES_VIEW, liveCount: 'online-orders', keywords: 'website cod delivery foodpanda daraz' },
      { to: '/online-store/products', label: t('Online products'), icon: PackageCheck, permission: P.ONLINE_PRODUCTS_VIEW, keywords: 'daraz shopify woocommerce products link jorna sku price stock sync channel' },
      { to: '/online-store/price-calculator', label: t('Price calculator'), icon: BadgePercent, permission: P.COST_VIEW, keywords: 'price nikalein calculator margin break even daraz commission shopify fee cod rto ads profit qeemat' },
      { to: '/online-store/ads', label: t('Ads & ROAS'), icon: Megaphone, permission: P.ADS_VIEW, keywords: 'ads kharcha facebook instagram meta tiktok google roas marketing campaign csv' },
      { to: '/online-orders/pack', label: t('Packing'), icon: ScanLine, permission: P.SALES_VIEW, keywords: 'pack scan barcode packing slip label ready parcel' },
      { to: '/online-orders/returns-scan', label: t('RTO returns'), icon: PackageX, permission: P.SALES_VIEW, keywords: 'rto return wapas parcel scan damaged kharab restock' },
      { to: '/online-orders/cod', label: t('COD & courier'), icon: Wallet, permission: P.SALES_VIEW, keywords: 'cod courier tcs leopards postex rto settlement paisa' },
      { to: '/online-store/couriers', label: t('Couriers'), icon: Truck, permission: P.SALES_VIEW, keywords: 'courier postex leopards tcs trax booking label cn tracking connect' },
      { to: '/online-store/costs', label: t('Selling costs'), icon: Calculator, permission: P.SALES_VIEW, keywords: 'courier charge rate card cod fee packaging gateway fee profit expense rto' },
      { to: '/online-orders/customers', label: t('Online customers'), icon: Users, permission: P.SALES_VIEW, keywords: 'customer repeat vip inactive gayab whatsapp broadcast remarketing' },
      { to: '/online-orders/reports', label: t('Online reports'), icon: TrendingUp, permission: P.SALES_VIEW, keywords: 'online report rto city channel courier csv export excel block' },
      // Jore hue channels (WooCommerce, Shopify, apni website, Daraz…) yahan
      // useVisibleNav khud daalta hai — Shopify ke "Sales channels" jaisa.
    ],
  },
  {
    id: 'distribution', label: t('Distribution'), icon: Truck, color: '#ea580c', defaultOpen: true, order: 6.5,
    items: [
      { to: '/distribution', label: t('Distribution'), icon: Gauge, permission: P.DISTRIBUTION_ORDERS_VIEW, feature: 'distribution', keywords: 'wholesale distributor dashboard booker supply' },
      { to: '/distribution/orders', label: t('Orders'), icon: ClipboardCheck, permission: P.DISTRIBUTION_ORDERS_VIEW, feature: 'distribution', keywords: 'sales order booking approve invoice booker wholesale' },
      { to: '/distribution/load-sheets', label: t('Load sheets'), icon: Truck, permission: P.DISTRIBUTION_ORDERS_VIEW, feature: 'distribution-full', keywords: 'load sheet gaari van dispatch delivery settle settlement' },
      { to: '/distribution/recoveries', label: t('Recoveries'), icon: HandCoins, permission: P.KHATA_VIEW, feature: 'distribution', keywords: 'recovery wasooli udhaar collection verify ageing' },
      { to: '/distribution/price-lists', label: t('Price lists'), icon: Tag, permission: P.DISTRIBUTION_PRICELISTS_VIEW, feature: 'distribution', keywords: 'price list rate wholesale retailer key account excel import' },
      { to: '/distribution/routes', label: t('Routes'), icon: MapPin, permission: P.DISTRIBUTION_ROUTES_MANAGE, feature: 'distribution-full', keywords: 'route beat area booker delivery visit day sequence' },
      { to: '/distribution/schemes', label: t('Schemes'), icon: BadgePercent, permission: P.DISTRIBUTION_SCHEMES_MANAGE, feature: 'distribution', keywords: 'scheme trade offer 10+1 free slab percent principal company' },
      { to: '/distribution/vans', label: t('Vans'), icon: Truck, permission: P.DISTRIBUTION_VANS_MANAGE, feature: 'distribution-full', keywords: 'van stock spot sale salesman load unload count gaari' },
      { to: '/distribution/returns', label: t('Market returns'), icon: Undo2, permission: P.DISTRIBUTION_RETURNS_APPROVE, feature: 'distribution', keywords: 'market return expiry kharab damaged wapas retailer credit' },
      { to: '/distribution/claims', label: t('Claims'), icon: FileText, permission: P.DISTRIBUTION_CLAIMS_MANAGE, feature: 'distribution', keywords: 'claim principal company scheme free goods expiry reimbursement' },
      { to: '/distribution/targets', label: t('Targets'), icon: Target, permission: P.DISTRIBUTION_ORDERS_VIEW, feature: 'distribution', keywords: 'target achievement booker brand principal commission monthly' },
      { to: '/distribution/cheques', label: t('Cheques'), icon: Landmark, permission: P.DISTRIBUTION_CHEQUES_MANAGE, feature: 'distribution', keywords: 'cheque pdc post dated bounce deposit clear bank' },
      { to: '/network/customers', label: t('Network'), icon: Network, permission: P.TRADE_SELL, feature: 'distribution', keywords: 'network nafaa dukaan retailer link request invite code customer order online' },
    ],
  },
  {
    id: 'network', label: t('Suppliers'), icon: Network, color: '#0f766e', defaultOpen: true, order: 6.8,
    items: [
      { to: '/network', label: t('Order from suppliers'), icon: Network, permission: P.TRADE_BUY, keywords: 'supplier distributor wholesaler order mangwana nafaa network link invite code' },
      { to: '/network/orders', label: t('Supplier orders'), icon: ClipboardCheck, permission: P.TRADE_BUY, keywords: 'supplier order track invoice delivery raste' },
      { to: '/network/receiving', label: t('Receive goods'), icon: PackageCheck, permission: P.TRADE_BUY, keywords: 'maal mil gaya receive purchase stock delivery supplier' },
    ],
  },
  {
    id: 'customers', label: t('Customers'), icon: Users, color: '#ec4899', defaultOpen: true, order: 7,
    items: [
      { to: '/customers', label: t('Customers'), icon: Users, permission: P.CUSTOMERS_VIEW },
      { to: '/khata', label: t('Customer credit'), icon: BookOpen, permission: P.KHATA_VIEW, keywords: 'udhaar credit ledger' },
      { to: '/loyalty', label: t('Loyalty'), icon: Award, permission: P.LOYALTY_VIEW, keywords: 'points rewards' },
      { to: '/discounts', label: t('Discounts'), icon: Percent, permission: P.DISCOUNTS_VIEW, keywords: 'offers coupons' },
    ],
  },
  {
    id: 'inventory', label: t('Inventory'), icon: Package, color: '#0891b2', defaultOpen: true, order: 10,
    items: [
      { to: '/products', label: t('Products'), icon: Package, permission: P.PRODUCTS_VIEW, keywords: 'items stock' },
      { to: '/catalog', label: t('Catalog'), icon: Eye, permission: P.PRODUCTS_VIEW },
      { to: '/low-stock', label: t('Low stock'), icon: AlertTriangle, permission: P.LOW_STOCK_VIEW, keywords: 'reorder khatam' },
      { to: '/combos', label: t('Combos'), icon: Gift, permission: P.PRODUCTS_VIEW, keywords: 'bundle deal offer package' },
      { to: '/product-units', label: t('Multi-units'), icon: Layers, permission: P.PRODUCTS_VIEW, keywords: 'pack box carton dozen unit' },
      { to: '/damage', label: t('Damaged stock'), icon: PackageX, permission: P.PRODUCTS_VIEW, keywords: 'kharab maal damage wastage expiry toota report approve' },
      { to: '/stock-adjustments', label: t('Adjustments'), icon: ClipboardCheck, permission: P.STOCK_ADJUSTMENTS_MANAGE, needsShop: true, keywords: 'count correction' },
      { to: '/manufacturing', label: t('Manufacturing'), icon: Factory, permission: P.MANUFACTURING_VIEW, feature: 'manufacturing', keywords: 'banayein manufacturing production recipe bom mix pack raw maal banana' },
      { to: '/transfers', label: t('Transfers'), icon: ArrowRightLeft, permission: P.STOCK_TRANSFERS_MANAGE, keywords: 'branch move' },
      { to: '/stock-movements', label: t('Stock movements'), icon: Activity, permission: P.STOCK_MOVEMENTS_VIEW },
      { to: '/barcode-labels', label: t('Barcode labels'), icon: ScanLine, permission: P.BARCODE_LABELS_VIEW, keywords: 'print sticker' },
    ],
  },
  {
    id: 'catalog-setup', label: t('Catalog setup'), icon: Tag, color: '#6366f1', order: 12,
    items: [
      { to: '/categories', label: t('Categories'), icon: Tag, permission: P.CATEGORIES_VIEW },
      { to: '/brands', label: t('Brands'), icon: Building2, permission: P.BRANDS_VIEW },
      { to: '/tags', label: t('Tags'), icon: Hash, permission: P.TAGS_VIEW },
    ],
  },
  {
    id: 'purchasing', label: t('Purchasing'), icon: Truck, color: '#f97316', order: 14,
    items: [
      { to: '/purchases', label: t('Purchases'), icon: PackagePlus, permission: P.PURCHASES_VIEW, keywords: 'buy stock in' },
      { to: '/suppliers', label: t('Suppliers'), icon: Truck, permission: P.SUPPLIERS_VIEW, keywords: 'vendors' },
    ],
  },
  {
    id: 'finance', label: t('Finance'), icon: Landmark, color: '#f59e0b', order: 90,
    items: [
      { to: '/money', label: t('Shop accounts'), icon: Landmark, permission: P.REPORTS_VIEW, keywords: 'hisab cash money' },
      { to: '/expenses', label: t('Expenses'), icon: Wallet, permission: P.EXPENSES_VIEW, keywords: 'kharcha' },
      { to: '/income', label: t('Other income'), icon: HandCoins, permission: P.INCOME_VIEW, keywords: 'doosri aamdani income incentive scheme claim commission kiraya rent' },
    ],
  },
  {
    id: 'staff', label: t('Staff'), icon: UserCog, color: '#8b5cf6', order: 93,
    items: [
      { to: '/staff', label: t('All staff'), icon: UserCog, permission: P.STAFF_VIEW, keywords: 'employees' },
      { to: '/staff/attendance', label: t('Attendance'), icon: CheckCircle2, permission: P.STAFF_VIEW },
      { to: '/staff/salary/new', label: t('Payroll'), icon: Wallet2, permission: P.STAFF_MANAGE, keywords: 'salary' },
      { to: '/staff/commission', label: t('Commission'), icon: HandCoins, permission: P.COMMISSION_OWN, keywords: 'commission hissa sale incentive bonus target' },
    ],
  },
  {
    id: 'tax', label: t('Tax'), icon: Landmark, color: '#64748b', order: 96,
    items: [
      { to: '/tax', label: t('Overview'), icon: BarChart3, permission: P.SETTINGS_VIEW, keywords: 'tax fbr pra srb kpra analytics' },
      { to: '/tax/invoices', label: t('Tax invoices'), icon: FileText, permission: P.SETTINGS_VIEW, keywords: 'fbr pra srb kpra fiscal invoice' },
      { to: '/tax/reports', label: t('Monthly reports'), icon: TrendingUp, permission: P.SETTINGS_VIEW, keywords: 'tax return filing report' },
      { to: '/tax/settings', label: t('Tax settings'), icon: Settings, permission: P.SETTINGS_VIEW, keywords: 'fbr pra srb kpra pos id token' },
    ],
  },
];

/* ─── All shops (owner, every branch at once) ─── */
export const allShopsNavGroups: NavGroup[] = [
  {
    id: 'all-shops', label: t('All shops'), icon: Layers, color: '#7c3aed', defaultOpen: true, order: 10,
    items: [
      { to: '/dashboard', label: t('Overview'), icon: LayoutDashboard },
      { to: '/shops/overview', label: t('Branch analytics'), icon: BarChart3, permission: P.SHOPS_VIEW },
      { to: '/online-orders', label: t('Online orders'), icon: ShoppingBag, permission: P.SALES_VIEW, liveCount: 'online-orders' },
    ],
  },
  {
    id: 'reports', label: t('Reports'), icon: BarChart3, color: '#10b981', defaultOpen: true, order: 20,
    items: [
      { to: '/day-report', label: t('Day report'), icon: FileText, permission: P.DASHBOARD_VIEW, keywords: 'din ka hisaab daily report closing opening z report' },
      { to: '/reports', label: t('Reports'), icon: BarChart3, permission: P.REPORTS_VIEW },
      { to: '/profit-loss', label: t('Profit-loss (P&L)'), icon: Scale, permission: P.PROFIT_REPORT_VIEW, keywords: 'p&l profit loss profit-loss profit statement break even cash flow' },
      { to: '/profit-report', label: t('Profit by product'), icon: TrendingUp, permission: P.PROFIT_REPORT_VIEW },
      { to: '/stock-report', label: t('Stock report'), icon: Package, permission: P.REPORTS_VIEW },
      { to: '/reports/staff', label: t('Staff & counter'), icon: UserCheck, permission: P.REPORTS_VIEW, alsoNeeds: P.STAFF_VIEW, keywords: 'cashier counter galla shift performance' },
      { to: '/reports/customers', label: t('Customers report'), icon: Users, permission: P.REPORTS_VIEW, alsoNeeds: P.CUSTOMERS_VIEW, keywords: 'rfm cohort udhaar loyalty repeat' },
      { to: '/audit', label: t('Audit'), icon: ShieldAlert, permission: P.ACTIVITY_VIEW, keywords: 'nigrani audit chori loss void refund drawer' },
      { to: '/sales', label: t('Sales history'), icon: Receipt, permission: P.SALES_VIEW },
      { to: '/returns', label: t('Returns'), icon: RotateCcw, permission: P.RETURNS_VIEW },
      { to: '/stock-movements', label: t('Stock movements'), icon: Activity, permission: P.STOCK_MOVEMENTS_VIEW },
    ],
  },
  {
    id: 'money', label: t('Money'), icon: Wallet, color: '#f59e0b', defaultOpen: true, order: 30,
    items: [
      { to: '/khata', label: t('Customer credit'), icon: BookOpen, permission: P.KHATA_VIEW, keywords: 'khata udhaar credit ledger' },
      { to: '/customers', label: t('Customers'), icon: Users, permission: P.CUSTOMERS_VIEW },
      { to: '/money', label: t('Shop accounts'), icon: Landmark, permission: P.REPORTS_VIEW },
      { to: '/expenses', label: t('Expenses'), icon: Wallet, permission: P.EXPENSES_VIEW },
      { to: '/income', label: t('Other income'), icon: HandCoins, permission: P.INCOME_VIEW },
    ],
  },
  {
    id: 'stock', label: t('Stock & supply'), icon: Package, color: '#0891b2', order: 40,
    items: [
      { to: '/products', label: t('Products'), icon: Package, permission: P.PRODUCTS_VIEW },
      { to: '/low-stock', label: t('Low stock'), icon: AlertTriangle, permission: P.LOW_STOCK_VIEW },
      { to: '/transfers', label: t('Transfers'), icon: ArrowRightLeft, permission: P.STOCK_TRANSFERS_MANAGE },
      { to: '/purchases', label: t('Purchases'), icon: PackagePlus, permission: P.PURCHASES_VIEW },
      { to: '/suppliers', label: t('Suppliers'), icon: Truck, permission: P.SUPPLIERS_VIEW },
    ],
  },
  {
    id: 'team', label: t('Team'), icon: UserCog, color: '#64748b', order: 50,
    items: [
      { to: '/staff', label: t('All staff'), icon: UserCog, permission: P.STAFF_VIEW },
    ],
  },
];

/* ─── Marketplace workspace ─── */
export const marketplaceNavGroups: NavGroup[] = [
  {
    id: 'mp-overview', label: t('Overview'), icon: LayoutDashboard, color: '#a855f7', defaultOpen: true, order: 0,
    items: [
      { to: '/marketplace/dashboard', label: t('Dashboard'), icon: LayoutDashboard, permission: P.SETTINGS_VIEW, hot: true },
      { to: '/marketplace/analytics', label: t('Analytics'), icon: BarChart3, permission: P.REPORTS_VIEW },
      { to: '/marketplace/sales-funnel', label: t('Sales funnel'), icon: TrendingUp, permission: P.REPORTS_VIEW },
      { to: '/marketplace/ai-insights', label: t('AI insights'), icon: Brain, permission: P.SETTINGS_VIEW, badge: t('AI') },
    ],
  },
  {
    id: 'mp-storefront', label: t('Storefront'), icon: Store, color: '#ec4899', defaultOpen: true, order: 5,
    items: [
      { to: '/marketplace/shop-profile', label: t('Shop profile'), icon: Store, permission: P.SETTINGS_VIEW },
      { to: '/marketplace/products', label: t('Products'), icon: Package, permission: P.PRODUCTS_VIEW },
      { to: '/marketplace/settings', label: t('Publish settings'), icon: Globe, permission: P.SETTINGS_VIEW },
    ],
  },
  {
    id: 'mp-orders', label: t('Orders & fulfillment'), icon: ShoppingCart, color: '#f97316', defaultOpen: true, order: 10,
    items: [
      { to: '/marketplace/orders', label: t('Orders'), icon: ShoppingCart, permission: P.SALES_VIEW, hot: true },
      { to: '/marketplace/delivery', label: t('Delivery'), icon: Bike, permission: P.SETTINGS_VIEW },
      { to: '/marketplace/rider-tracking', label: t('Rider tracking'), icon: Navigation, permission: P.SETTINGS_VIEW, badge: t('LIVE') },
    ],
  },
  {
    id: 'mp-engage', label: t('Customer engagement'), icon: MessageCircle, color: '#3b82f6', order: 15,
    items: [
      { to: '/marketplace/reviews', label: t('Reviews'), icon: Star, permission: P.SETTINGS_VIEW },
      { to: '/marketplace/messages', label: t('Messages'), icon: MessageCircle, permission: P.SETTINGS_VIEW },
      { to: '/marketplace/bargains', label: t('Bargains'), icon: MessageCircle, permission: P.SETTINGS_VIEW },
      { to: '/marketplace/segments', label: t('Customer segments'), icon: Users, permission: P.SETTINGS_VIEW },
    ],
  },
  {
    id: 'mp-boost', label: t('Sales boosters'), icon: Zap, color: '#eab308', order: 20,
    items: [
      { to: '/marketplace/group-buys', label: t('Group buys'), icon: Users, permission: P.SETTINGS_VIEW },
      { to: '/marketplace/auctions', label: t('Auctions'), icon: Sparkles, permission: P.SETTINGS_VIEW },
      { to: '/marketplace/live-shop', label: t('Live shop'), icon: Sparkles, permission: P.SETTINGS_VIEW, badge: t('NEW') },
    ],
  },
  {
    id: 'mp-marketing', label: t('Marketing'), icon: Megaphone, color: '#dc2626', order: 25,
    items: [
      { to: '/marketplace/promotions', label: t('Promotions'), icon: Megaphone, permission: P.SETTINGS_VIEW },
      { to: '/marketplace/coupons-advanced', label: t('Coupons'), icon: Tag, permission: P.SETTINGS_VIEW },
      { to: '/marketplace/loyalty', label: t('Loyalty & rewards'), icon: Trophy, permission: P.SETTINGS_VIEW },
    ],
  },
  {
    id: 'mp-system', label: t('Manage'), icon: Settings, color: '#64748b', order: 100,
    items: [
      { to: '/marketplace/multi-shop', label: t('Multi-shop manager'), icon: Building2, permission: P.SETTINGS_VIEW },
      { to: '/marketplace/notifications', label: t('Notifications'), icon: Bell, permission: P.SETTINGS_VIEW },
      { to: '/marketplace/settings-hub', label: t('Marketplace settings'), icon: Settings, permission: P.SETTINGS_VIEW },
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
  to: '/settings', label: t('Overview'), icon: LayoutDashboard, permission: VIEW,
  desc: t('Setup ki halat, sab settings ek nazar me'), keywords: 'settings home all setup health',
};

export const SETTINGS_SECTIONS: SettingsGroup[] = [
  {
    id: 'business', title: t('Business info'), icon: Store, desc: t('Store ki pehchaan, business type, zubaan aur branches'),
    items: [
      { to: '/settings/store', label: t('Store details'), icon: Store, permission: VIEW, desc: t('Naam, logo, pata, phone — har bill par chhapte hain'), keywords: 'shop name logo address phone email website legal banner' },
      { to: '/settings/business-type', label: t('Business type'), icon: Briefcase, permission: VIEW, desc: t('Industry aur us ke features on/off'), keywords: 'industry features retail pharmacy bakery grocery type' },
      { to: '/settings/language', label: t('Language & time'), icon: Globe, permission: VIEW, desc: t('Zaban, currency, time zone, din ka aaghaz, store ke ghante'), keywords: 'urdu english currency pkr timezone hours working days business day' },
      { to: '/shops', label: t('Branches'), icon: MapPin, permission: P.SHOPS_VIEW, desc: t('Locations, counters aur stock points'), keywords: 'locations shops branch' },
    ],
  },
  {
    id: 'users', title: t('Users'), icon: Users, desc: t('Staff, roles, PIN aur aap ka apna account'),
    items: [
      { to: '/staff', label: t('People'), icon: UserCog, permission: P.STAFF_VIEW, external: true, desc: t('Staff, login aur haazri'), keywords: 'staff employees team people' },
      { to: '/staff?tab=roles', label: t('Roles & permissions'), icon: ShieldCheck, permission: P.TEAM_VIEW, external: true, desc: t('Kaun kya dekh aur kar sakta hai'), keywords: 'roles access staff login permission' },
      { to: '/settings/security', label: t('Security & PIN'), icon: Shield, permission: VIEW, desc: t('Malik ka PIN, locked pages, password, devices'), keywords: 'pin password session lock device security' },
      { to: '/profile', label: t('My profile'), icon: UserCircle, desc: t('Aap ka naam, password aur PIN'), keywords: 'password pin account' },
    ],
  },
  {
    id: 'counter', title: t('Counter & POS'), icon: ShoppingCart, desc: t('Counter ke usool, receipt, printer aur payment QR'),
    items: [
      { to: '/settings/counter', label: t('Counter rules'), icon: ShoppingBag, permission: VIEW, desc: t('Payment, Discount ki had, PIN kab maangein'), keywords: 'pos discount pin void refund payment customer counter' },
      { to: '/settings/receipt', label: t('Receipt'), icon: Receipt, permission: VIEW, desc: t('Bill ka design, kaghaz, apni likhai, live preview'), keywords: 'bill receipt invoice paper 58 80 a4 footer raseed' },
      { to: '/settings/printing', label: t('Printing'), icon: FileText, permission: P.POS_USE, desc: t('A4, PDF, thermal 80/58mm, colour ya black & white, header/footer'), keywords: 'print printer pdf a4 thermal receipt colour black white header footer logo' },
      { to: '/settings/hardware', label: t('POS hardware'), icon: Printer, permission: P.POS_USE, desc: t('Printer direct, cash drawer, tarazu, customer screen'), keywords: 'printer thermal escpos drawer scale tarazu weighing customer display hardware usb bluetooth' },
      { to: '/settings/payment-qr', label: t('Payment QR'), icon: QrCode, permission: VIEW, desc: t('Raast, JazzCash, Easypaisa QR — bill ki Amount ke saath'), keywords: 'raast qr jazzcash easypaisa bank qr code scan pay till' },
    ],
  },
  {
    id: 'stock-customers', title: t('Stock & customers'), icon: Package, desc: t('Stock ke usool, udhaar aur loyalty'),
    items: [
      { to: '/settings/stock', label: t('Stock rules'), icon: Package, permission: VIEW, desc: t('Kam stock ki had, minus stock, Banayein (Manufacturing)'), keywords: 'low stock negative minus inventory manufacturing production recipe' },
      { to: '/settings/credit-loyalty', label: t('Credit & loyalty'), icon: Award, permission: VIEW, desc: t('Udhaar ki limit, loyalty points'), keywords: 'udhaar credit khata limit loyalty points rewards' },
    ],
  },
  {
    id: 'messages', title: t('Messages & reports'), icon: MessageCircle, desc: t('Notifications, WhatsApp messages aur rozana report'),
    items: [
      { to: '/settings/notifications', label: t('Notifications'), icon: Bell, permission: VIEW, desc: t('Email, kam stock, rozana sale'), keywords: 'email alert low stock notification' },
      { to: '/settings/whatsapp', label: t('WhatsApp messages'), icon: MessageCircle, permission: VIEW, desc: t('Bill, udhaar aur shukriya ke tayyar message'), keywords: 'whatsapp message template bill udhaar shukriya' },
      { to: '/settings/reports', label: t('Reports & daily summary'), icon: BarChart3, permission: VIEW, desc: t('Rozana closing report, hafta, report ka period'), keywords: 'daily summary closing report week fiscal year period' },
    ],
  },
  {
    id: 'tax', title: t('Tax & compliance'), icon: Landmark, desc: t('Tax rate aur FBR / PRA / SRB / KPRA'),
    items: [
      { to: '/settings/tax', label: t('Tax rates'), icon: Percent, permission: VIEW, desc: t('GST rate, tax number, inclusive ya exclusive'), keywords: 'gst sales tax rate ntn inclusive exclusive' },
      { to: '/tax/settings', label: t('FBR / PRA / SRB / KPRA'), icon: Landmark, permission: VIEW, desc: t('Har bill authority ko, fiscal number bill par, mahine ki report'), match: ['/tax/settings', '/fbr'], keywords: 'tax fbr pra srb kpra pos invoice fiscal' },
    ],
  },
  {
    id: 'integrations', title: t('Integrations'), icon: Plug, desc: t('Jore hue apps, sales channels, payments aur couriers'),
    items: [
      { to: '/integrations', label: t('Connected apps'), icon: Plug, permission: VIEW, desc: t('Foodpanda, Daraz, couriers, payments — sab ek jagah'), keywords: 'apps integrations foodpanda daraz tcs jazzcash connect' },
      { to: '/online-store/channels', label: t('Sales channels'), icon: Globe, permission: VIEW, desc: t('WooCommerce, Shopify, apni website'), match: ['/online-store/channels', '/online-store/website'], keywords: 'woocommerce shopify online store website' },
      { to: '/online-store/foodpanda', label: t('Foodpanda'), icon: Bike, permission: VIEW, desc: t('Foodpanda orders seedha Nafaa me — accept, reject, ready'), keywords: 'foodpanda delivery hero food order restaurant rider' },
      { to: '/online-store/payments', label: t('Online payments'), icon: Wallet, permission: VIEW, desc: t('Safepay, JazzCash, Easypaisa — advance ya poori Amount ka link'), keywords: 'payment safepay jazzcash easypaisa card link advance' },
      { to: '/online-store/couriers', label: t('Couriers'), icon: Truck, permission: VIEW, desc: t('PostEx, Leopards — booking, label, tracking'), keywords: 'courier postex leopards booking' },
      { to: '/settings/google', label: t('Google'), icon: Search, permission: VIEW, desc: t('Google Shopping, Maps par stock, reviews'), keywords: 'google merchant center shopping maps business profile review local inventory feed' },
      { to: '/settings/accounting', label: t('Accounting'), icon: Wallet2, permission: VIEW, desc: t('Zoho Books, QuickBooks, Xero, Tally — roz ka hisaab'), keywords: 'accounting zoho books quickbooks xero tally tallyprime journal accountant' },
      { to: '/settings/developer', label: t('API & webhooks'), icon: Code2, permission: VIEW, desc: t('Zapier, Make, Google Sheets, apna software'), keywords: 'api key webhook zapier make n8n google sheets developer erp integration' },
      { to: '/marketplace/settings', label: t('Marketplace publishing'), icon: Send, permission: VIEW, desc: t('Nafaa marketplace par kya dikhe'), keywords: 'marketplace publish online' },
    ],
  },
  {
    id: 'distribution', title: t('Distribution'), icon: Truck, desc: t('Wholesale: booker, routes, price lists, schemes, recovery'), flat: true,
    items: [
      { to: '/settings/distribution', label: t('Distribution'), icon: Truck, permission: VIEW, desc: t('On/off, udhaar ka usool, visit, recovery, default list'), keywords: 'distribution wholesale distributor booker order route price list scheme recovery load sheet' },
    ],
  },
  {
    id: 'billing', title: t('Plan & billing'), icon: CreditCard, desc: t('Plan, invoices, limits aur referrals'),
    items: [
      { to: '/plans', label: t('Plan'), icon: Sparkles, permission: P.PLANS_VIEW, desc: t('Aap ki subscription aur upgrade'), keywords: 'subscription upgrade' },
      { to: '/billing', label: t('Billing'), icon: CreditCard, permission: P.BILLING_VIEW, desc: t('Invoices aur Payment ka tareeqa'), keywords: 'invoice pay' },
      { to: '/plan-usage', label: t('Usage'), icon: Gauge, permission: P.PLAN_USAGE_VIEW, desc: t('Limits aur kitna istemal hua'), keywords: 'limits quota usage' },
      { to: '/referrals', label: t('Referrals'), icon: Gift, permission: P.REFERRALS_VIEW, desc: t('Doosre stores ko bulayein, inaam paayein'), keywords: 'invite refer reward' },
    ],
  },
  {
    id: 'data', title: t('Data'), icon: Database, desc: t('Sync, backup, export aur activity log'),
    items: [
      { to: '/sync', label: t('Sync & offline'), icon: Cloud, desc: t('Offline Sales aur sync ki halat'), keywords: 'offline internet sync' },
      { to: '/backup', label: t('Backup'), icon: Database, permission: P.BACKUP_MANAGE, desc: t('Poore data ki ek file — mehfooz rakhein'), keywords: 'backup restore json' },
      { to: '/settings/data-export', label: t('Data download'), icon: Download, permission: VIEW, alsoNeeds: P.BACKUP_MANAGE, desc: t('Products, customers, Sales — JSON, CSV ya Excel'), keywords: 'export download csv excel json backup' },
      { to: '/exports', label: t('Exports'), icon: FileSpreadsheet, permission: P.EXPORTS_VIEW, desc: t('Kisi bhi period ki Excel files aur un ki history'), keywords: 'csv excel export history' },
      { to: '/activity-log', label: t('Activity log'), icon: Activity, permission: P.ACTIVITY_VIEW, desc: t('Kis ne kya aur kab badla'), keywords: 'audit history log' },
    ],
  },
  {
    id: 'account', title: t('Appearance & account'), icon: Palette, desc: t('Rang, font, dark mode aur policies'),
    items: [
      { to: '/settings/appearance', label: t('Appearance'), icon: Palette, desc: t('Rang, font, dark mode, text size, layout'), keywords: 'theme dark light mode color colour brand font urdu text size compact density corners sidebar background page width' },
      { to: '/legal', label: t('Terms & privacy'), icon: ScrollText, desc: t('Policies aur legal'), keywords: 'terms privacy policy legal' },
    ],
  },
  {
    id: 'danger', title: t('Danger zone'), icon: AlertTriangle, desc: t('Ownership transfer aur store delete'), flat: true, danger: true,
    items: [
      { to: '/settings/danger', label: t('Danger zone'), icon: AlertTriangle, permission: VIEW, alsoNeeds: P.SETTINGS_MANAGE, desc: t('Ownership transfer, store delete'), keywords: 'delete transfer owner close account' },
    ],
  },
];

export const SETTINGS_ITEMS: SettingsItem[] = [SETTINGS_HOME, ...SETTINGS_SECTIONS.flatMap((g) => g.items)];

/** Single settings the search can find; `find` is text inside the card that holds the control. */
const SETTINGS_FIELDS: Array<{ to: string; find: string; words?: string }> = [
  { to: '/settings/store', find: t('Store logo'), words: 'logo tasveer image' },
  { to: '/settings/store', find: t('Banner'), words: 'banner header image' },
  { to: '/settings/store', find: t('Store ka naam'), words: 'shop name dukaan' },
  { to: '/settings/store', find: t('Legal naam'), words: 'legal company fbr registered' },
  { to: '/settings/store', find: t('Phone'), words: 'number mobile contact' },
  { to: '/settings/store', find: t('WhatsApp number'), words: 'whatsapp' },
  { to: '/settings/store', find: t('Email'), words: 'email mail' },
  { to: '/settings/store', find: t('Website'), words: 'website facebook instagram' },
  { to: '/settings/store', find: t('Pata'), words: 'address street bazaar city province postal' },
  { to: '/settings/business-type', find: t('Aap ka business type'), words: 'industry type change badlein' },
  { to: '/settings/business-type', find: t('Features'), words: 'features imei expiry warranty variants batches' },
  // i18n-ignore: the language card title is the same in every language.
  { to: '/settings/language', find: 'Language / Zaban / زبان', words: 'language zaban zubaan urdu english roman' },
  { to: '/settings/language', find: t('Bill ki zaban'), words: 'receipt language bill zaban' },
  { to: '/settings/language', find: t('Currency'), words: 'rupay pkr dollar symbol' },
  { to: '/settings/language', find: t('Time zone'), words: 'waqt timezone karachi' },
  { to: '/settings/language', find: t('Din kab shuru hota hai'), words: 'business day raat day start' },
  { to: '/settings/language', find: t('Store ke ghante'), words: 'open close time hours' },
  { to: '/settings/language', find: t('Kis din khulta hai'), words: 'working days chutti off' },
  { to: '/settings/tax', find: t('Sale par tax'), words: 'gst sales tax enable chalu' },
  { to: '/settings/tax', find: t('Tax rate'), words: 'gst percent' },
  { to: '/settings/tax', find: t('Tax number (NTN)'), words: 'ntn strn' },
  { to: '/settings/tax', find: t('Tax ka hisaab'), words: 'inclusive exclusive' },
  { to: '/settings/reports', find: t('Hafta kis din shuru hota hai'), words: 'week start monday hafta' },
  { to: '/settings/reports', find: t('Maali saal'), words: 'fiscal year july' },
  { to: '/settings/reports', find: t('Report kis period se khule'), words: 'default period' },
  { to: '/settings/reports', find: t('Staff ko kaun se figures dikhein'), words: 'profit cost galla staff hide' },
  { to: '/settings/reports', find: t('Rozana closing report'), words: 'daily summary din ka hisaab notification' },
  { to: '/settings/reports', find: t('Kis ko milti hai'), words: 'manager report recipients' },
  { to: '/settings/reports', find: t('Preview aur abhi bhejein'), words: 'whatsapp send now report bhejo' },
  { to: '/settings/counter', find: t('Pehle se chuna payment'), words: 'cash card default payment' },
  { to: '/settings/counter', find: t('Har bill par customer zaroori'), words: 'walk in customer' },
  { to: '/settings/counter', find: t('Haath se Discount'), words: 'discount' },
  { to: '/settings/counter', find: t('Zyada se zyada Discount'), words: 'discount max limit had' },
  { to: '/settings/counter', find: t('Bill cancel par PIN'), words: 'void pin' },
  { to: '/settings/counter', find: t('Return par PIN'), words: 'refund return pin' },
  { to: '/settings/counter', find: t('Har Discount par PIN'), words: 'discount pin' },
  { to: '/settings/receipt', find: t('Kaghaz'), words: 'receipt printer 58 80 a4 size paper' },
  { to: '/settings/receipt', find: t('Andaaz'), words: 'style design modern' },
  { to: '/settings/receipt', find: t('Naam ke neeche chhoti line'), words: 'header tagline' },
  { to: '/settings/receipt', find: t('Neeche apna message'), words: 'footer message' },
  { to: '/settings/receipt', find: t('Return ke usool'), words: 'terms return policy' },
  { to: '/settings/receipt', find: t('Background par naam'), words: 'watermark rang colour' },
  { to: '/settings/receipt', find: t('Bill khulte hi print'), words: 'auto print copies' },
  { to: '/settings/receipt', find: t('Paise kaise bhejein'), words: 'jazzcash easypaisa bank account iban raast payment' },
  { to: '/settings/receipt', find: t('A4 invoice'), words: 'invoice pdf tax invoice due date' },
  { to: '/settings/receipt', find: t('Peeche ka hissa'), words: 'back terms conditions shartein' },
  { to: '/settings/stock', find: t('Kam stock ki had'), words: 'low stock alert' },
  { to: '/settings/stock', find: t('Stock khatam hone par bhi bechein'), words: 'negative minus stock' },
  { to: '/settings/stock', find: t('Recipe aur Production chalu karein'), words: 'manufacturing production recipe banayein' },
  { to: '/settings/credit-loyalty', find: t('Udhaar par bechna'), words: 'credit khata' },
  { to: '/settings/credit-loyalty', find: t('Naye customer ki credit limit'), words: 'credit limit had' },
  { to: '/settings/credit-loyalty', find: t('Loyalty points'), words: 'points inaam rewards' },
  { to: '/settings/credit-loyalty', find: t('Points kab khatam hon'), words: 'expiry points' },
  { to: '/settings/notifications', find: t('Email notifications'), words: 'email' },
  { to: '/settings/notifications', find: t('Kam stock ki email'), words: 'low stock alert' },
  { to: '/settings/notifications', find: t('Rozana Sale ki email'), words: 'daily summary report' },
  { to: '/settings/notifications', find: t('Test notification'), words: 'test bell ghanti' },
  { to: '/settings/whatsapp', find: t('WhatsApp messages'), words: 'message template bill udhaar shukriya' },
  { to: '/settings/security', find: t('Security score'), words: 'score' },
  { to: '/settings/security', find: t('Malik ka PIN'), words: 'pin owner' },
  { to: '/settings/security', find: t('Locked pages'), words: 'lock page pin' },
  { to: '/settings/security', find: t('Account password'), words: 'password' },
  { to: '/settings/security', find: t('Active devices'), words: 'login device session' },
  { to: '/settings/data-export', find: t('Data download'), words: 'export backup csv excel json' },
  { to: '/settings/danger', find: t('Ownership transfer'), words: 'malik tabdeel transfer owner' },
  { to: '/settings/danger', find: t('Store delete'), words: 'delete band account close' },
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