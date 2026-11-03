/**
 * Navigation: one source for the More menu, the tablet side rail, search and
 * the Create sheet. Mirrors the web app/shell/navigation/nav-config.ts
 * (same groups, labels, permissions and keywords).
 *
 * `to` is the web path (the shared id). `href` is the mobile route; an item
 * without `href` has no mobile screen yet and is not shown. When a module
 * lands on mobile, set its `href` here — nothing else changes.
 * `module` is the key the admin panel can switch off (useModuleFlag).
 */

import type { LucideIcon } from 'lucide-react-native';
import {
  Activity, AlertTriangle, ArrowRightLeft, Award, BarChart3, Bell, BookOpen, BookmarkPlus, Building2, CalendarClock,
  CheckCircle2, ClipboardCheck, CreditCard, Database, Eye, FileSpreadsheet, FileText, Gauge, Gift, Globe, Hash,
  HandCoins, Landmark, Layers, LayoutDashboard, LifeBuoy, MapPin, Package, PackagePlus, Palette, Percent, Receipt,
  RotateCcw, ScanLine, ScrollText, Settings, Shield, ShieldCheck, ShoppingBag, ShoppingCart, Smartphone, Sparkles,
  Store, Tag, TrendingUp, Truck, UserCircle, UserCog, Users, UtensilsCrossed, Wallet, Wallet2, Wrench, Briefcase,
  Languages, MessageCircle, Scale, UserCheck, ShieldAlert, Scissors, Bike, PackageCheck, PackageX, BadgePercent, Megaphone, Calculator, Zap, ShieldBan,
  CakeSlice, ChefHat, Flame, Timer, Wheat, Network, Undo2, Target,
} from 'lucide-react-native';
import { msg } from '@/core/i18n';
import { PERMISSIONS as P, type PermissionKey } from '@/core/permissions';
import { RETAIL_TYPE_NAV } from '@/industries/_nav/nav';
import { TRADE_TYPE_NAV } from '@/industries/_nav/nav-trade';
import { SERVICE_TYPE_NAV } from '@/industries/_nav/nav-services';

export interface NavItem {
  /** Web path; shared id across apps. */
  to: string;
  /** Mobile route, when the screen exists in the app. */
  href?: string;
  label: string;
  icon: LucideIcon;
  permission?: PermissionKey;
  alsoNeeds?: PermissionKey;
  /** Admin feature-flag key (module.<key>). */
  module?: string;
  /** Counter-only screen: hidden on the "All shops" view. */
  needsShop?: boolean;
  keywords?: string;
  /** Owner-only page. */
  ownerOnly?: boolean;
  /** Only for these industry ids (identities). */
  industries?: string[];
  /** Only when the business sells this way. */
  feature?: 'distribution';
}

export interface NavGroup {
  id: string;
  label: string;
  icon: LucideIcon;
  color: string;
  order: number;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    id: 'overview', label: msg('Overview'), icon: LayoutDashboard, color: '#10b981', order: 0,
    items: [
      { to: '/dashboard', href: '/', label: msg('Dashboard'), icon: LayoutDashboard, module: 'dashboard', keywords: 'home' },
      { to: '/day-report', href: '/day-report', label: msg('Day report'), icon: FileText, permission: P.DASHBOARD_VIEW, module: 'reports', keywords: 'din ka hisaab daily report closing opening z report' },
      { to: '/reports', href: '/reports', label: msg('Reports'), icon: BarChart3, permission: P.REPORTS_VIEW, module: 'reports' },
      { to: '/profit-loss', href: '/profit-loss', label: msg('Profit-loss (P&L)'), icon: Scale, permission: P.PROFIT_REPORT_VIEW, module: 'reports', keywords: 'p&l profit loss statement break even cash flow' },
      { to: '/profit-report', href: '/profit-report', label: msg('Profit by product'), icon: TrendingUp, permission: P.PROFIT_REPORT_VIEW, module: 'reports' },
      { to: '/stock-report', href: '/stock-report', label: msg('Stock report'), icon: Package, permission: P.REPORTS_VIEW, module: 'reports' },
      { to: '/reports/staff', href: '/reports/staff', label: msg('Staff & counter'), icon: UserCheck, permission: P.REPORTS_VIEW, alsoNeeds: P.STAFF_VIEW, module: 'reports', keywords: 'cashier counter galla shift performance' },
      { to: '/reports/customers', href: '/reports/customers', label: msg('Customers report'), icon: Users, permission: P.REPORTS_VIEW, alsoNeeds: P.CUSTOMERS_VIEW, module: 'reports', keywords: 'rfm cohort udhaar loyalty repeat' },
      { to: '/audit', href: '/audit', label: msg('Audit'), icon: ShieldAlert, permission: P.ACTIVITY_VIEW, module: 'reports', keywords: 'nigrani audit chori loss void refund drawer' },
    ],
  },
  {
    id: 'sales', label: msg('Sales'), icon: ShoppingCart, color: '#059669', order: 5,
    items: [
      { to: '/pos', href: '/pos', label: msg('POS counter'), icon: ShoppingCart, permission: P.POS_USE, module: 'pos', needsShop: true, keywords: 'sale checkout till bill' },
      { to: '/sales', href: '/sales', label: msg('Sales history'), icon: Receipt, permission: P.SALES_VIEW, module: 'sales', keywords: 'bills invoices' },
      { to: '/bookings', href: '/bookings', label: msg('Bookings'), icon: BookmarkPlus, permission: P.SERVICE_BOOKINGS_VIEW, module: 'bookings', keywords: 'advance reserve' },
      { to: '/returns', href: '/returns', label: msg('Returns'), icon: RotateCcw, permission: P.RETURNS_VIEW, module: 'returns', keywords: 'refund return' },
      { to: '/cash-register', href: '/cash-register', label: msg('Cash register'), icon: Wallet, permission: P.CASH_REGISTER_VIEW, module: 'cash-register', needsShop: true, keywords: 'till drawer galla' },
    ],
  },
  {
    id: 'online', label: msg('Online store'), icon: Globe, color: '#0ea5e9', order: 6,
    items: [
      { to: '/online-orders', href: '/online', label: msg('Online orders'), icon: ShoppingBag, permission: P.SALES_VIEW, module: 'onlineOrders', keywords: 'website cod delivery foodpanda daraz shopify woocommerce' },
      { to: '/online-orders/pack', href: '/online/pack', label: msg('Packing'), icon: ScanLine, permission: P.SALES_VIEW, module: 'onlineOrders', keywords: 'pack scan barcode packing slip label ready parcel' },
      { to: '/online-orders/returns-scan', href: '/online/returns', label: msg('RTO returns'), icon: PackageX, permission: P.SALES_VIEW, module: 'onlineOrders', keywords: 'rto return wapas parcel scan damaged kharab restock' },
      { to: '/online-orders/cod', href: '/online/cod', label: msg('COD & courier'), icon: Wallet, permission: P.SALES_VIEW, module: 'onlineOrders', keywords: 'cod courier tcs leopards postex rto settlement paisa' },
      { to: '/online-store/couriers', href: '/online/couriers', label: msg('Couriers'), icon: Truck, permission: P.SALES_VIEW, module: 'onlineOrders', keywords: 'courier postex leopards tcs trax booking label cn tracking' },
      { to: '/online-store/couriers/rules', href: '/online/couriers/rules', label: msg('Auto booking'), icon: Zap, permission: P.SALES_VIEW, module: 'onlineOrders', keywords: 'courier rules auto book city cod risk' },
      { to: '/online-store/costs', href: '/online/costs', label: msg('Selling costs'), icon: Calculator, permission: P.SALES_VIEW, module: 'onlineOrders', keywords: 'courier charge rate card cod fee packaging gateway fee profit expense rto' },
      { to: '/online-store/products', href: '/online/products', label: msg('Online products'), icon: PackageCheck, permission: P.ONLINE_PRODUCTS_VIEW, module: 'onlineOrders', keywords: 'daraz shopify woocommerce products link jorna sku price stock sync channel' },
      { to: '/online-orders/customers', href: '/online/customers', label: msg('Online customers'), icon: Users, permission: P.SALES_VIEW, module: 'onlineOrders', keywords: 'customer repeat vip inactive gayab whatsapp broadcast remarketing' },
      { to: '/online-store/blocklist', href: '/online/blocklist', label: msg('Block list'), icon: ShieldBan, permission: P.SALES_VIEW, module: 'onlineOrders', keywords: 'fake rto block number risk advance' },
      { to: '/online-orders/reports', href: '/online/reports', label: msg('Online reports'), icon: TrendingUp, permission: P.SALES_VIEW, module: 'onlineOrders', keywords: 'online report rto city channel courier csv morning summary' },
      { to: '/online-store/ads', href: '/online/ads', label: msg('Ads & ROAS'), icon: Megaphone, permission: P.ADS_VIEW, module: 'onlineOrders', keywords: 'ads kharcha facebook instagram meta tiktok google roas marketing campaign' },
      { to: '/online-store/price-calculator', href: '/online/price-calculator', label: msg('Price calculator'), icon: BadgePercent, permission: P.COST_VIEW, module: 'onlineOrders', keywords: 'price nikalein calculator margin break even daraz commission shopify fee cod rto ads profit qeemat' },
      { to: '/online-store/channels', href: '/online/channels', label: msg('Channels'), icon: Globe, permission: P.SETTINGS_VIEW, module: 'onlineOrders', keywords: 'shopify woocommerce daraz website connect store channel' },
    ],
  },
  {
    id: 'distribution', label: msg('Distribution'), icon: Truck, color: '#ea580c', order: 6.5,
    items: [
      { to: '/booker', href: '/booker', label: msg('Order booking'), icon: ClipboardCheck, permission: P.DISTRIBUTION_ORDERS_BOOK, module: 'distribution', keywords: 'booker route visit order' },
      { to: '/delivery', href: '/delivery', label: msg('Delivery'), icon: Bike, permission: P.DISTRIBUTION_DELIVERY_REPORT, module: 'distribution', keywords: 'delivery load sheet invoice' },
      { to: '/van', href: '/van', label: msg('Van sales'), icon: Truck, permission: P.DISTRIBUTION_VANS_SELL, module: 'distribution', keywords: 'van spot sale' },
      { to: '/distribution', href: '/distribution', label: msg('Distribution'), icon: Gauge, permission: P.DISTRIBUTION_ORDERS_VIEW, feature: 'distribution', module: 'distribution', keywords: 'wholesale distributor dashboard booker supply' },
      { to: '/distribution/orders', href: '/distribution/orders', label: msg('Orders'), icon: ClipboardCheck, permission: P.DISTRIBUTION_ORDERS_VIEW, feature: 'distribution', module: 'distribution', keywords: 'sales order booking approve invoice booker wholesale' },
      { to: '/distribution/load-sheets', href: '/distribution/load-sheets', label: msg('Load sheets'), icon: Truck, permission: P.DISTRIBUTION_ORDERS_VIEW, feature: 'distribution', module: 'distribution', keywords: 'load sheet gaari van dispatch delivery settle settlement' },
      { to: '/distribution/recoveries', href: '/distribution/recoveries', label: msg('Recoveries'), icon: HandCoins, permission: P.KHATA_VIEW, feature: 'distribution', module: 'distribution', keywords: 'recovery wasooli udhaar collection verify ageing' },
      { to: '/distribution/price-lists', href: '/distribution/price-lists', label: msg('Price lists'), icon: Tag, permission: P.DISTRIBUTION_PRICELISTS_VIEW, feature: 'distribution', module: 'distribution', keywords: 'price list rate wholesale retailer key account' },
      { to: '/distribution/routes', href: '/distribution/routes', label: msg('Routes'), icon: MapPin, permission: P.DISTRIBUTION_ROUTES_MANAGE, feature: 'distribution', module: 'distribution', keywords: 'route beat area booker delivery visit day sequence' },
      { to: '/distribution/schemes', href: '/distribution/schemes', label: msg('Schemes'), icon: BadgePercent, permission: P.DISTRIBUTION_SCHEMES_MANAGE, feature: 'distribution', module: 'distribution', keywords: 'scheme trade offer 10+1 free slab percent principal company' },
      { to: '/distribution/vans', href: '/distribution/vans', label: msg('Vans'), icon: Truck, permission: P.DISTRIBUTION_VANS_MANAGE, feature: 'distribution', module: 'distribution', keywords: 'van stock spot sale salesman load unload count gaari' },
      { to: '/distribution/returns', href: '/distribution/returns', label: msg('Market returns'), icon: Undo2, permission: P.DISTRIBUTION_RETURNS_APPROVE, feature: 'distribution', module: 'distribution', keywords: 'market return expiry kharab damaged wapas retailer credit' },
      { to: '/distribution/claims', href: '/distribution/claims', label: msg('Claims'), icon: FileText, permission: P.DISTRIBUTION_CLAIMS_MANAGE, feature: 'distribution', module: 'distribution', keywords: 'claim principal company scheme free goods expiry reimbursement' },
      { to: '/distribution/targets', href: '/distribution/targets', label: msg('Targets'), icon: Target, permission: P.DISTRIBUTION_ORDERS_VIEW, feature: 'distribution', module: 'distribution', keywords: 'target achievement booker brand principal commission monthly' },
      { to: '/distribution/cheques', href: '/distribution/cheques', label: msg('Cheques'), icon: Landmark, permission: P.DISTRIBUTION_CHEQUES_MANAGE, feature: 'distribution', module: 'distribution', keywords: 'cheque pdc post dated bounce deposit clear bank' },
      { to: '/distribution/reports', href: '/distribution/reports', label: msg('Distribution reports'), icon: BarChart3, permission: P.DISTRIBUTION_ORDERS_VIEW, feature: 'distribution', module: 'distribution', keywords: 'dsr report visits summary booker route' },
      { to: '/network/customers', href: '/network/customers', label: msg('Network'), icon: Network, permission: P.TRADE_SELL, feature: 'distribution', module: 'distribution', keywords: 'network nafaa dukaan retailer link request invite code customer order online' },
    ],
  },
  {
    id: 'network', label: msg('Suppliers'), icon: Network, color: '#0f766e', order: 6.8,
    items: [
      { to: '/network', href: '/network', label: msg('Order from suppliers'), icon: Network, permission: P.TRADE_BUY, keywords: 'supplier distributor wholesaler order mangwana nafaa network link invite code' },
      { to: '/network/orders', href: '/network/orders', label: msg('Supplier orders'), icon: ClipboardCheck, permission: P.TRADE_BUY, keywords: 'supplier order track invoice delivery raste' },
      { to: '/network/receiving', href: '/network/receiving', label: msg('Receive goods'), icon: PackageCheck, permission: P.TRADE_BUY, keywords: 'maal mil gaya receive purchase stock delivery supplier' },
    ],
  },
  {
    id: 'customers', label: msg('Customers'), icon: Users, color: '#ec4899', order: 7,
    items: [
      { to: '/customers', href: '/customers', label: msg('Customers'), icon: Users, permission: P.CUSTOMERS_VIEW, module: 'customers' },
      { to: '/khata', href: '/khata', label: msg('Customer credit'), icon: BookOpen, permission: P.KHATA_VIEW, module: 'khata', keywords: 'khata udhaar credit ledger' },
      { to: '/loyalty', href: '/loyalty', label: msg('Loyalty'), icon: Award, permission: P.LOYALTY_VIEW, module: 'loyalty', keywords: 'points rewards' },
      { to: '/discounts', href: '/discounts', label: msg('Discounts'), icon: Percent, permission: P.DISCOUNTS_VIEW, module: 'discounts', keywords: 'offers coupons' },
    ],
  },
  {
    id: 'inventory', label: msg('Inventory'), icon: Package, color: '#0891b2', order: 10,
    items: [
      { to: '/products', href: '/products', label: msg('Products'), icon: Package, permission: P.PRODUCTS_VIEW, module: 'products', keywords: 'items stock maal' },
      { to: '/catalog', href: '/catalog', label: msg('Catalog'), icon: Eye, permission: P.PRODUCTS_VIEW, module: 'products' },
      { to: '/low-stock', href: '/low-stock', label: msg('Low stock'), icon: AlertTriangle, permission: P.LOW_STOCK_VIEW, module: 'products', keywords: 'reorder khatam' },
      { to: '/combos', href: '/combos', label: msg('Combos'), icon: Gift, permission: P.PRODUCTS_VIEW, module: 'products', keywords: 'bundle deal offer package gift set' },
      { to: '/product-units', href: '/product-units', label: msg('Multi-units'), icon: Layers, permission: P.PRODUCTS_VIEW, module: 'products', keywords: 'pack box carton dozen unit' },
      { to: '/damage', href: '/damage', label: msg('Damaged stock'), icon: PackageX, permission: P.PRODUCTS_VIEW, module: 'inventory', keywords: 'kharab maal damage wastage expiry toota report approve' },
      { to: '/expiry', href: '/expiry-dashboard', label: msg('Expiry'), icon: CalendarClock, permission: P.PRODUCTS_VIEW, module: 'products', industries: ['pharmacy', 'retail', 'dairy', 'cosmetics', 'agri'], keywords: 'expiry batch date' },
      { to: '/stock-adjustments', href: '/stock-adjustments', label: msg('Adjustments'), icon: ClipboardCheck, permission: P.STOCK_ADJUSTMENTS_MANAGE, module: 'inventory', needsShop: true, keywords: 'count correction ginti stock count scan' },
      { to: '/transfers', href: '/transfers', label: msg('Transfers'), icon: ArrowRightLeft, permission: P.STOCK_TRANSFERS_MANAGE, module: 'inventory', keywords: 'branch move' },
      { to: '/stock-movements', href: '/stock-movements', label: msg('Stock movements'), icon: Activity, permission: P.STOCK_MOVEMENTS_VIEW, module: 'inventory' },
      { to: '/barcode-labels', href: '/barcode-labels', label: msg('Barcode labels'), icon: ScanLine, permission: P.BARCODE_LABELS_VIEW, module: 'inventory', keywords: 'print sticker' },
    ],
  },
  {
    id: 'catalog-setup', label: msg('Catalog setup'), icon: Tag, color: '#6366f1', order: 12,
    items: [
      { to: '/categories', href: '/categories', label: msg('Categories'), icon: Tag, permission: P.CATEGORIES_VIEW, module: 'products' },
      { to: '/brands', href: '/brands', label: msg('Brands'), icon: Building2, permission: P.BRANDS_VIEW, module: 'products' },
      { to: '/tags', href: '/tags', label: msg('Tags'), icon: Hash, permission: P.TAGS_VIEW, module: 'products' },
    ],
  },
  {
    id: 'purchasing', label: msg('Purchasing'), icon: Truck, color: '#f97316', order: 14,
    items: [
      { to: '/purchases', href: '/purchases', label: msg('Purchases'), icon: PackagePlus, permission: P.PURCHASES_VIEW, module: 'purchases', keywords: 'buy stock in' },
      { to: '/suppliers', href: '/suppliers', label: msg('Suppliers'), icon: Truck, permission: P.SUPPLIERS_VIEW, module: 'suppliers', keywords: 'vendors' },
    ],
  },
  {
    id: 'industry', label: msg('Your shop'), icon: Store, color: '#7c3aed', order: 20,
    items: [
      // Restaurant (web RestaurantPack navGroups; screens in src/industries/restaurant).
      { to: '/restaurant/dashboard', href: '/restaurant', label: msg('Restaurant dashboard'), icon: LayoutDashboard, industries: ['restaurant'], permission: P.DASHBOARD_VIEW, module: 'industry', keywords: 'restaurant overview' },
      { to: '/restaurant/tables', href: '/tables', label: msg('Tables'), icon: UtensilsCrossed, industries: ['restaurant', 'hotel'], permission: P.RESTAURANT_ORDERS_VIEW, module: 'industry', keywords: 'table dine in floor waiter' },
      { to: '/restaurant/orders', href: '/restaurant/orders', label: msg('Orders'), icon: ShoppingBag, industries: ['restaurant'], permission: P.RESTAURANT_ORDERS_VIEW, module: 'industry', keywords: 'order takeaway delivery token' },
      { to: '/restaurant/kot', href: '/kitchen', label: msg('Kitchen (KOT)'), icon: ChefHat, industries: ['restaurant'], permission: P.RESTAURANT_KITCHEN_VIEW, module: 'industry', keywords: 'kot kitchen kds' },
      { to: '/restaurant/menu', href: '/restaurant/menu', label: msg('Menu'), icon: BookOpen, industries: ['restaurant'], permission: P.RESTAURANT_MENU_VIEW, module: 'industry', keywords: 'menu dish' },
      { to: '/restaurant/modifiers', href: '/restaurant/modifiers', label: msg('Add-ons'), icon: Sparkles, industries: ['restaurant'], permission: P.RESTAURANT_MENU_VIEW, module: 'industry', keywords: 'modifier addon size extra' },
      { to: '/restaurant/delivery', href: '/restaurant/delivery', label: msg('Delivery tracking'), icon: MapPin, industries: ['restaurant'], permission: P.RESTAURANT_ORDERS_VIEW, module: 'industry', keywords: 'delivery rider' },
      { to: '/restaurant/riders', href: '/restaurant/riders', label: msg('Riders'), icon: Bike, industries: ['restaurant'], permission: P.RESTAURANT_ORDERS_VIEW, module: 'industry', keywords: 'rider delivery boy' },
      { to: '/restaurant/happy-hours', href: '/restaurant/happy-hours', label: msg('Happy hours'), icon: Zap, industries: ['restaurant'], permission: P.RESTAURANT_MENU_VIEW, module: 'industry', keywords: 'happy hour deal offer' },
      { to: '/restaurant/recipes', href: '/restaurant/recipes', label: msg('Recipes'), icon: BookOpen, industries: ['restaurant'], permission: P.RESTAURANT_KITCHEN_VIEW, module: 'industry', keywords: 'recipe ingredient bom' },
      { to: '/restaurant/stations', href: '/restaurant/stations', label: msg('Kitchen stations'), icon: Flame, industries: ['restaurant'], permission: P.RESTAURANT_KITCHEN_VIEW, module: 'industry', keywords: 'station grill tandoor' },
      // Bakery (web BakeryPack navGroups; screens in src/industries/bakery).
      { to: '/bakery/dashboard', href: '/bakery', label: msg('Bakery dashboard'), icon: LayoutDashboard, industries: ['bakery'], permission: P.DASHBOARD_VIEW, module: 'industry', keywords: 'bakery overview' },
      { to: '/bakery/cake-orders', href: '/bakery/cake-orders', label: msg('Cake orders'), icon: CakeSlice, industries: ['bakery'], permission: P.BAKERY_ORDERS_VIEW, module: 'industry', keywords: 'cake order advance pickup' },
      { to: '/bakery/production', href: '/bakery/production', label: msg('Baking'), icon: ChefHat, industries: ['bakery'], permission: P.BAKERY_PRODUCTION_VIEW, module: 'industry', keywords: 'production batch plan baking' },
      { to: '/bakery/ingredients', href: '/bakery/ingredients', label: msg('Raw materials'), icon: Wheat, industries: ['bakery'], permission: P.BAKERY_INGREDIENTS_VIEW, module: 'industry', keywords: 'ingredient flour sugar raw material' },
      { to: '/bakery/freshness', href: '/bakery/freshness', label: msg('Freshness & waste'), icon: Timer, industries: ['bakery'], permission: P.BAKERY_PRODUCTION_VIEW, module: 'industry', keywords: 'expiry day old waste' },
      { to: '/bakery/bulk-orders', href: '/bakery/bulk-orders', label: msg('Bulk orders'), icon: ShoppingBag, industries: ['bakery'], permission: P.BAKERY_ORDERS_VIEW, module: 'industry', keywords: 'wedding event bulk' },
      // Retail-type industry packs (screens in src/industries/<pack>).
      ...RETAIL_TYPE_NAV,
      ...TRADE_TYPE_NAV,
      ...SERVICE_TYPE_NAV,
    ],
  },
  {
    id: 'finance', label: msg('Finance'), icon: Landmark, color: '#f59e0b', order: 90,
    items: [
      { to: '/money', href: '/money', label: msg('Shop accounts'), icon: Landmark, permission: P.REPORTS_VIEW, module: 'reports', keywords: 'hisab cash money bank wallet' },
      { to: '/expenses', href: '/expenses', label: msg('Expenses'), icon: Wallet, permission: P.EXPENSES_VIEW, module: 'expenses', keywords: 'kharcha' },
      { to: '/income', href: '/income', label: msg('Other income'), icon: HandCoins, permission: P.INCOME_VIEW, module: 'expenses', keywords: 'doosri aamdani income incentive scheme claim commission kiraya rent' },
    ],
  },
  {
    id: 'staff', label: msg('Staff'), icon: UserCog, color: '#8b5cf6', order: 93,
    items: [
      { to: '/staff', href: '/staff', label: msg('All staff'), icon: UserCog, permission: P.STAFF_VIEW, module: 'staff', keywords: 'employees' },
      { to: '/staff/attendance', href: '/staff/attendance', label: msg('Attendance'), icon: CheckCircle2, permission: P.STAFF_VIEW, module: 'staff', keywords: 'haazri' },
      { to: '/staff/salary/new', href: '/staff/salary', label: msg('Payroll'), icon: Wallet2, permission: P.STAFF_MANAGE, module: 'staff', ownerOnly: true, keywords: 'salary tankhwah' },
      { to: '/staff/commission', href: '/staff/commission', label: msg('Commission'), icon: HandCoins, permission: P.COMMISSION_OWN, module: 'staff', keywords: 'commission hissa sale incentive bonus target' },
    ],
  },
];

export interface SettingsItem extends NavItem {
  desc: string;
}

export interface SettingsGroup {
  id: string;
  title: string;
  icon: LucideIcon;
  desc: string;
  items: SettingsItem[];
}

const VIEW = P.SETTINGS_VIEW;

/** Settings folders (same as the web SETTINGS_SECTIONS). */
export const SETTINGS_GROUPS: SettingsGroup[] = [
  {
    id: 'business', title: msg('Business info'), icon: Store, desc: msg('Store ki pehchaan, business type, zubaan aur branches'),
    items: [
      { to: '/settings/store', href: '/settings/business', label: msg('Store details'), icon: Store, permission: VIEW, ownerOnly: true, desc: msg('Naam, logo, pata, phone — har bill par chhapte hain'), keywords: 'shop name logo address phone' },
      { to: '/settings/business-type', href: '/settings/business-config', label: msg('Business type'), icon: Briefcase, permission: VIEW, ownerOnly: true, desc: msg('Industry aur us ke features on/off'), keywords: 'industry features type' },
      { to: '/settings/language', href: '/settings/language', label: msg('Language & time'), icon: Languages, desc: msg('Zaban, currency, time zone, din ka aaghaz, store ke ghante'), keywords: 'urdu english roman zaban language' },
      { to: '/shops', href: '/shops', label: msg('Branches'), icon: MapPin, permission: P.SHOPS_VIEW, ownerOnly: true, desc: msg('Locations, counters aur stock points'), keywords: 'locations shops branch' },
    ],
  },
  {
    id: 'users', title: msg('Users'), icon: Users, desc: msg('Staff, roles, PIN aur aap ka apna account'),
    items: [
      { to: '/team', href: '/team', label: msg('Roles & permissions'), icon: ShieldCheck, permission: P.TEAM_VIEW, ownerOnly: true, desc: msg('Kaun kya dekh aur kar sakta hai'), keywords: 'roles access permission' },
      { to: '/settings/security', href: '/settings/security', label: msg('Security & PIN'), icon: Shield, permission: VIEW, ownerOnly: true, desc: msg('Malik ka PIN, locked pages, password, devices'), keywords: 'pin password session lock device' },
      { to: '/profile', href: '/profile', label: msg('My profile'), icon: UserCircle, desc: msg('Aap ka naam, password aur PIN'), keywords: 'password pin account' },
    ],
  },
  {
    id: 'counter', title: msg('Counter & POS'), icon: ShoppingCart, desc: msg('Counter ke usool, receipt, printer aur payment QR'),
    items: [
      { to: '/settings/counter', href: '/settings/pos', label: msg('Counter rules'), icon: ShoppingBag, permission: VIEW, ownerOnly: true, desc: msg('Payment, Discount ki had, PIN kab maangein'), keywords: 'pos discount pin void refund' },
      { to: '/settings/receipt', href: '/settings/receipt', label: msg('Receipt'), icon: Receipt, permission: VIEW, ownerOnly: true, desc: msg('Bill ka design, kaghaz, apni likhai, live preview'), keywords: 'bill receipt invoice paper' },
    ],
  },
  {
    id: 'stock-customers', title: msg('Stock & customers'), icon: Package, desc: msg('Stock ke usool, udhaar aur loyalty'),
    items: [
      { to: '/settings/stock', href: '/settings/inventory', label: msg('Stock rules'), icon: Package, permission: VIEW, ownerOnly: true, desc: msg('Kam stock ki had, minus stock, Banayein (Manufacturing)'), keywords: 'low stock negative minus' },
      { to: '/settings/credit-loyalty', href: '/settings/customer', label: msg('Credit & loyalty'), icon: Award, permission: VIEW, ownerOnly: true, desc: msg('Udhaar ki limit, loyalty points'), keywords: 'udhaar credit khata limit loyalty' },
    ],
  },
  {
    id: 'messages', title: msg('Messages & reports'), icon: Bell, desc: msg('Notifications, WhatsApp messages aur rozana report'),
    items: [
      { to: '/settings/notifications', href: '/settings/notifications', label: msg('Notifications'), icon: Bell, permission: VIEW, ownerOnly: true, desc: msg('Email, kam stock, rozana sale'), keywords: 'email alert notification' },
      { to: '/settings/whatsapp', href: '/settings/whatsapp', label: msg('WhatsApp messages'), icon: MessageCircle, permission: VIEW, ownerOnly: true, desc: msg('Bill, udhaar aur shukriya ke tayyar message'), keywords: 'whatsapp message template bill udhaar shukriya' },
      { to: '/settings/reports', href: '/settings/reports', label: msg('Reports & daily summary'), icon: BarChart3, permission: VIEW, ownerOnly: true, desc: msg('Rozana closing report, hafta, report ka period'), keywords: 'daily summary closing report week fiscal year period' },
    ],
  },
  {
    id: 'tax', title: msg('Tax & compliance'), icon: Landmark, desc: msg('Tax rate aur FBR / PRA / SRB / KPRA'),
    items: [
      { to: '/settings/tax', href: '/settings/tax', label: msg('Tax rates'), icon: Percent, permission: VIEW, ownerOnly: true, desc: msg('GST rate, tax number, inclusive ya exclusive'), keywords: 'gst sales tax rate ntn' },
    ],
  },
  {
    id: 'billing', title: msg('Plan & billing'), icon: CreditCard, desc: msg('Plan, invoices, limits aur referrals'),
    items: [
      { to: '/plans', href: '/plan', label: msg('Plan'), icon: Sparkles, permission: P.PLANS_VIEW, ownerOnly: true, desc: msg('Aap ki subscription aur upgrade'), keywords: 'subscription upgrade' },
      { to: '/billing', href: '/billing', label: msg('Billing'), icon: CreditCard, permission: P.BILLING_VIEW, ownerOnly: true, desc: msg('Invoices aur Payment ka tareeqa'), keywords: 'invoice pay' },
      { to: '/plan-usage', href: '/plan-usage', label: msg('Usage'), icon: Gauge, permission: P.PLAN_USAGE_VIEW, desc: msg('Limits aur kitna istemal hua'), keywords: 'limits quota usage' },
      { to: '/referrals', href: '/referrals', label: msg('Referrals'), icon: Gift, permission: P.REFERRALS_VIEW, ownerOnly: true, desc: msg('Doosre stores ko bulayein, inaam paayein'), keywords: 'invite refer reward' },
    ],
  },
  {
    id: 'data', title: msg('Data'), icon: Database, desc: msg('Sync, backup, export aur activity log'),
    items: [
      { to: '/backup', href: '/backup', label: msg('Backup'), icon: Database, permission: P.BACKUP_MANAGE, ownerOnly: true, desc: msg('Poore data ki ek file — mehfooz rakhein'), keywords: 'backup restore' },
      { to: '/exports', href: '/exports', label: msg('Exports'), icon: FileSpreadsheet, permission: P.EXPORTS_VIEW, desc: msg('Kisi bhi period ki Excel files aur un ki history'), keywords: 'csv excel export' },
      { to: '/activity-log', href: '/activity-log', label: msg('Activity log'), icon: Activity, permission: P.ACTIVITY_VIEW, ownerOnly: true, desc: msg('Kis ne kya aur kab badla'), keywords: 'audit history log' },
      { to: '/settings/danger', href: '/settings/danger', label: msg('Danger zone'), icon: AlertTriangle, permission: VIEW, ownerOnly: true, desc: msg('Ownership transfer, store delete'), keywords: 'delete transfer owner close account' },
    ],
  },
  {
    id: 'account', title: msg('Appearance & account'), icon: Palette, desc: msg('Rang, font, dark mode aur policies'),
    items: [
      { to: '/settings/appearance', href: '/settings/appearance', label: msg('Appearance'), icon: Palette, desc: msg('Rang, font, dark mode, text size, layout'), keywords: 'theme dark light mode color brand font urdu text size compact density corners tab bar haptics animation' },
      { to: '/help', href: '/help', label: msg('Help center'), icon: LifeBuoy, desc: msg('Sawal, video aur rabta'), keywords: 'help support madad' },
      { to: '/legal', href: '/legal', label: msg('Terms & privacy'), icon: ScrollText, desc: msg('Policies aur legal'), keywords: 'terms privacy policy legal' },
    ],
  },
];

/** Workspaces (same as the web workspace switcher). */
export const WORKSPACES = {
  pos: { id: 'pos', label: msg('Business POS'), description: msg('Inventory, Sales, Customers & Reports'), icon: Store },
  marketplace: { id: 'marketplace', label: msg('Nafaa Marketplace'), description: msg('Public storefront, orders & customer growth'), icon: Globe },
} as const;
export type WorkspaceId = keyof typeof WORKSPACES;

export { Settings as SettingsIcon, FileText };
