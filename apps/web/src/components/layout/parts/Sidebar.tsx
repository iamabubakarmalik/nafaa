import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Package, Sparkles, Users, ShoppingCart, Receipt, PackagePlus, Tag, Wallet, Activity, BarChart3, Settings as SettingsIcon,
  ScanLine, BookOpen, ClipboardCheck, AlertTriangle,
  ArrowRightLeft, Download, Database, RotateCcw, Award, Percent, TrendingUp, Gift, Gauge, Hash, UserCircle, LifeBuoy, ScrollText, Eye,
  UserCog, CheckCircle2, Wallet2, Layers, Calendar,
  RefreshCw, Smartphone, BookmarkPlus, ChevronDown, ChevronRight, ShoppingBag, ChefHat, Utensils, Timer, Bike, Pill, Beaker, Stethoscope, ShieldAlert, Thermometer, Shirt, Scissors, Ruler, Palette, CreditCard, UserCheck, Heart, Building, FileText, Beef, ShieldCheck, Truck, Building2, Car, Wrench, Cog, Bell, Flame, MapPin, Sparkle, Bed, Home,  Search, X, Star, StarOff, PanelLeftClose, Zap,PenTool, Newspaper , BookMarked, School, DollarSign, Wheat, Landmark, Leaf, RouteIcon, Milk, User, Coins, Gem, Repeat, Scale
} from 'lucide-react';
import { Logo } from '@/components/brand/Logo';
import { hasPermission, PERMISSIONS, type PermissionKey } from '@/lib/permissions';

const SIDEBAR_SCROLL_KEY = 'nafaa-sidebar-scroll';
const SIDEBAR_GROUPS_KEY = 'nafaa-sidebar-groups-v3';
const SIDEBAR_FAVORITES_KEY = 'nafaa-sidebar-favorites-v2';

type NavItem = {
  to: string;
  label: string;
  icon: any;
  permission?: PermissionKey;
  badge?: string;
};

type NavGroup = {
  label: string;
  icon: any;
  items: NavItem[];
  defaultOpen?: boolean;
};

const DEFAULT_FAVORITES = ['/dashboard', '/pos', '/sales', '/customers', '/products', '/khata'];

const navGroups: NavGroup[] = [
  {
    label: 'Overview',
    icon: LayoutDashboard,
    defaultOpen: true,
    items: [
      { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { to: '/reports', label: 'All Reports', icon: BarChart3, permission: PERMISSIONS.REPORTS_VIEW },
      { to: '/stock-report', label: 'Stock Report', icon: Package, permission: PERMISSIONS.REPORTS_VIEW },
      { to: '/profit-report', label: 'Profit by Product', icon: TrendingUp, permission: PERMISSIONS.PROFIT_REPORT_VIEW },
    ],
  },
  {
    label: 'Sales & Orders',
    icon: ShoppingCart,
    defaultOpen: true,
    items: [
      { to: '/pos', label: 'POS Counter', icon: ShoppingCart, permission: PERMISSIONS.POS_USE },
      { to: '/sales', label: 'Sales History', icon: Receipt, permission: PERMISSIONS.SALES_VIEW },
      { to: '/bookings', label: 'Bookings / Advance', icon: BookmarkPlus, permission: PERMISSIONS.SALES_VIEW, badge: 'NEW' },
      { to: '/returns', label: 'Returns', icon: RotateCcw, permission: PERMISSIONS.RETURNS_VIEW },
      { to: '/customers', label: 'Customers', icon: Users, permission: PERMISSIONS.CUSTOMERS_VIEW },
      { to: '/khata', label: 'Khata (Udhaar)', icon: BookOpen, permission: PERMISSIONS.KHATA_VIEW },
      { to: '/loyalty', label: 'Loyalty', icon: Award, permission: PERMISSIONS.LOYALTY_VIEW },
      { to: '/discounts', label: 'Discounts', icon: Percent, permission: PERMISSIONS.DISCOUNTS_VIEW },
      { to: '/cash-register', label: 'Cash Register', icon: Wallet, permission: PERMISSIONS.CASH_REGISTER_VIEW },
    ],
  },
  {
    label: 'Inventory',
    icon: Package,
    defaultOpen: true,
    items: [
      { to: '/products', label: 'Products', icon: Package, permission: PERMISSIONS.PRODUCTS_VIEW },
      { to: '/catalog', label: 'Catalog', icon: Eye, permission: PERMISSIONS.PRODUCTS_VIEW },
      { to: '/low-stock', label: 'Low Stock', icon: AlertTriangle, permission: PERMISSIONS.LOW_STOCK_VIEW },
      { to: '/brands', label: 'Brands', icon: Building2, permission: PERMISSIONS.BRANDS_VIEW },
      { to: '/categories', label: 'Categories', icon: Tag, permission: PERMISSIONS.CATEGORIES_VIEW },
      { to: '/tags', label: 'Tags', icon: Hash, permission: PERMISSIONS.TAGS_VIEW },
      { to: '/suppliers', label: 'Suppliers', icon: Truck, permission: PERMISSIONS.SUPPLIERS_VIEW },
      { to: '/purchases', label: 'Purchases', icon: PackagePlus, permission: PERMISSIONS.PURCHASES_VIEW },
      { to: '/stock-movements', label: 'Movements', icon: Activity, permission: PERMISSIONS.STOCK_MOVEMENTS_VIEW },
      { to: '/stock-adjustments', label: 'Adjustments', icon: ClipboardCheck, permission: PERMISSIONS.STOCK_ADJUSTMENTS_MANAGE },
      { to: '/transfers', label: 'Transfers', icon: ArrowRightLeft, permission: PERMISSIONS.STOCK_TRANSFERS_MANAGE },
      { to: '/barcode-labels', label: 'Barcode Labels', icon: ScanLine, permission: PERMISSIONS.BARCODE_LABELS_VIEW },
    ],
  },
  {
    label: 'Carpet Industry',
    icon: Layers,
    items: [
      { to: '/carpet-rolls', label: 'Carpet Rolls', icon: Layers, badge: 'NEW' },
      { to: '/carpet-cut-pieces', label: 'Cut Pieces', icon: Scissors },
      { to: '/carpet-reports', label: 'Carpet Reports', icon: BarChart3 },
    ],
  },
  {
    label: 'Retail Industry',
    icon: ShoppingBag,
    items: [
      { to: '/retail/dashboard', label: 'Retail Dashboard', icon: LayoutDashboard, badge: 'NEW' },
      { to: '/retail/combos', label: 'Combos', icon: Sparkles },
      { to: '/retail/product-units', label: 'Multi-Units', icon: Layers },
      { to: '/retail/damage', label: 'Damage & Wastage', icon: AlertTriangle },
      { to: '/retail/quick-keys', label: 'Quick Keys', icon: Zap },
      { to: '/retail/bulk-import', label: 'Bulk Import', icon: Download, badge: 'NEW' },
      { to: '/retail/reorders', label: 'Smart Reorder', icon: RefreshCw, badge: 'AI' },
      { to: '/retail/barcode-labels', label: 'Print Labels', icon: ScanLine },
    ],
  },
    {
    label: 'Mobile Industry',
    icon: Smartphone,
    items: [
      { to: '/imei-inventory', label: 'IMEI Inventory', icon: Smartphone },
      { to: '/used-phones', label: 'Used Phones', icon: RefreshCw },
      { to: '/repair-tickets', label: 'Repairs', icon: Wrench },
      { to: '/emi-plans', label: 'EMI Plans', icon: CreditCard },
      { to: '/mobile-reports', label: 'Mobile Reports', icon: BarChart3 },
    ],
  },
  {
    label: 'Restaurant Industry',
    icon: ChefHat,
    items: [
      { to: '/restaurant/dashboard', label: 'Restaurant Dashboard', icon: LayoutDashboard, badge: 'NEW' },
      { to: '/restaurant/orders', label: 'Orders', icon: ShoppingBag },
      { to: '/restaurant/tables', label: 'Tables', icon: Utensils },
      { to: '/restaurant/menu', label: 'Menu Items', icon: ChefHat },
      { to: '/restaurant/modifiers', label: 'Modifiers', icon: Sparkles },
      { to: '/restaurant/kot', label: 'Kitchen (KOT)', icon: Timer },
      { to: '/restaurant/riders', label: 'Riders', icon: Bike },
      { to: '/restaurant/happy-hours', label: 'Happy Hours', icon: Zap },
      { to: '/restaurant/recipes', label: 'Recipes / BOM', icon: BookOpen, badge: 'NEW' },
      { to: '/restaurant/stations', label: 'Kitchen Stations', icon: Flame },
      { to: '/restaurant/delivery', label: 'Delivery Tracking', icon: MapPin },
    ],
  },
    {
    label: 'Pharmacy Industry',
    icon: Pill,
    items: [
      { to: '/pharmacy/dashboard', label: 'Pharmacy Dashboard', icon: LayoutDashboard, badge: 'NEW' },
      { to: '/pharmacy/prescriptions', label: 'Prescriptions', icon: AlertTriangle },
      { to: '/pharmacy/medicines', label: 'Medicines', icon: Pill },
      { to: '/pharmacy/salts', label: 'Salts / Drugs', icon: Beaker },
      { to: '/pharmacy/doctors', label: 'Doctors', icon: Stethoscope },
      { to: '/pharmacy/expiring', label: 'Expiring Stock', icon: AlertTriangle },
      { to: '/pharmacy/controlled-log', label: 'Narcotic Register', icon: ShieldAlert },
      { to: '/pharmacy/temperature-log', label: 'Cold Chain', icon: Thermometer },
    ],
  },
    {
    label: 'Garments Industry',
    icon: Shirt,
    items: [
      { to: '/garments/dashboard', label: 'Garments Dashboard', icon: LayoutDashboard, badge: 'NEW' },
      { to: '/garments/collections', label: 'Collections', icon: Palette },
      { to: '/garments/products', label: 'Garment Products', icon: Shirt },
      { to: '/garments/measurements', label: 'Measurements', icon: Ruler },
      { to: '/garments/tailoring', label: 'Tailoring Orders', icon: Scissors },
      { to: '/garments/alterations', label: 'Alterations', icon: Ruler },
      { to: '/garments/reservations', label: 'Reservations', icon: BookmarkPlus },
      { to: '/garments/layaway', label: 'Layaway Plans', icon: CreditCard },
      { to: '/garments/size-charts', label: 'Size Charts', icon: Package },
    ],
  },
    {
    label: 'Salon Industry',
    icon: Scissors,
    items: [
      { to: '/salon/dashboard', label: 'Salon Dashboard', icon: LayoutDashboard, badge: 'NEW' },
      { to: '/salon/appointments', label: 'Appointments', icon: Calendar },
      { to: '/salon/calendar', label: 'Calendar View', icon: Timer },
      { to: '/salon/services', label: 'Services', icon: Scissors },
      { to: '/salon/staff', label: 'Staff', icon: UserCheck },
      { to: '/salon/memberships', label: 'Memberships', icon: Award },
      { to: '/salon/packages', label: 'Packages', icon: BookmarkPlus },
      { to: '/salon/customers', label: 'Customer Profiles', icon: Heart },
    ],
  },
    {
    label: 'Auto Parts / Workshop',
    icon: Car,
    items: [
      { to: '/autoparts/dashboard', label: 'Workshop Dashboard', icon: LayoutDashboard, badge: 'NEW' },
      { to: '/autoparts/jobs', label: 'Workshop Jobs', icon: Wrench },
      { to: '/autoparts/vehicles', label: 'Customer Vehicles', icon: Car },
      { to: '/autoparts/parts', label: 'Parts Catalog', icon: Package },
      { to: '/autoparts/makes', label: 'Vehicle Makes', icon: Truck },
      { to: '/autoparts/models', label: 'Vehicle Models', icon: Cog },
      { to: '/autoparts/mechanics', label: 'Mechanics', icon: Users },
      { to: '/autoparts/reminders', label: 'Service Reminders', icon: Bell },
    ],
  },
    {
    label: 'Bookstore / Stationery',
    icon: BookOpen,
    items: [
      { to: '/bookstore/dashboard', label: 'Bookstore Dashboard', icon: LayoutDashboard, badge: 'NEW' },
      { to: '/bookstore/books', label: 'Books', icon: BookOpen },
      { to: '/bookstore/publishers', label: 'Publishers', icon: Building2 },
      { to: '/bookstore/authors', label: 'Authors', icon: Users },
      { to: '/bookstore/stationery', label: 'Stationery', icon: PenTool },
      { to: '/bookstore/art-supplies', label: 'Art Supplies', icon: Palette },
      { to: '/bookstore/schools', label: 'Schools', icon: School },
      { to: '/bookstore/school-lists', label: 'School Lists', icon: Newspaper },
      { to: '/bookstore/rentals', label: 'Book Rentals', icon: BookMarked },
    ],
  },
    {
    label: 'Meat Industry',
    icon: Beef,
    items: [
      { to: '/meat/dashboard', label: 'Meat Dashboard', icon: LayoutDashboard, badge: 'NEW' },
      { to: '/meat/products', label: 'Products / Cuts', icon: Beef },
      { to: '/meat/live-animals', label: 'Live Animals', icon: Heart },
      { to: '/meat/slaughter', label: 'Slaughter Log', icon: ShieldCheck },
      { to: '/meat/cutting-jobs', label: 'Cutting Jobs', icon: Scissors },
      { to: '/meat/weight-orders', label: 'Weight Orders', icon: Package },
      { to: '/meat/subscriptions', label: 'Subscriptions', icon: Truck },
      { to: '/meat/qurbani', label: 'Qurbani / Aqeeqa', icon: Heart },
      { to: '/meat/wholesale', label: 'Wholesale Accounts', icon: Building2 },
    ],
  },
    {
    label: 'Hardware Industry',
    icon: Building,
    items: [
      { to: '/hardware/dashboard', label: 'Hardware Dashboard', icon: LayoutDashboard, badge: 'NEW' },
      { to: '/hardware/brands', label: 'Brands', icon: Award },
      { to: '/hardware/products', label: 'Products', icon: Package },
      { to: '/hardware/projects', label: 'Projects', icon: Building },
      { to: '/hardware/quotations', label: 'Quotations', icon: FileText },
      { to: '/hardware/deliveries', label: 'Deliveries', icon: Truck },
      { to: '/hardware/credit-accounts', label: 'Credit Accounts', icon: CreditCard },
      { to: '/hardware/credit-transactions', label: 'Ledger', icon: DollarSign },
      { to: '/hardware/reorder-rules', label: 'Reorder Alerts', icon: AlertTriangle },
    ],
  },
    {
    label: 'Agri / Feed Industry',
    icon: Wheat,
    items: [
      { to: '/agri/dashboard', label: 'Agri Dashboard', icon: LayoutDashboard, badge: 'NEW' },
      { to: '/agri/products', label: 'Seeds / Fertilizer / Feed', icon: Wheat },
      { to: '/agri/farmers', label: 'Farmers', icon: Users },
      { to: '/agri/bulk-orders', label: 'Bulk Orders', icon: Package },
      { to: '/agri/ledger', label: 'Farmer Ledger', icon: FileText },
      { to: '/agri/advisory', label: 'Crop Advisory', icon: Leaf },
      { to: '/agri/seasonal-plans', label: 'Seasonal Plans', icon: Calendar },
      { to: '/agri/subsidy', label: 'Govt Subsidies', icon: Landmark },
    ],
  },
    {
    label: 'Dairy Industry',
    icon: Milk,
    items: [
      { to: '/dairy/dashboard', label: 'Dairy Dashboard', icon: LayoutDashboard, badge: 'NEW' },
      { to: '/dairy/customers', label: 'Customers', icon: Users },
      { to: '/dairy/farmers', label: 'Farmers', icon: User },
      { to: '/dairy/routes', label: 'Routes', icon: RouteIcon },
      { to: '/dairy/deliveries', label: 'Deliveries', icon: Truck },
      { to: '/dairy/farmer-supplies', label: 'Farmer Supplies', icon: Package },
      { to: '/dairy/monthly-bills', label: 'Monthly Bills', icon: FileText },
      { to: '/dairy/quality-tests', label: 'Quality Tests', icon: Beaker },
      { to: '/dairy/products', label: 'Dairy Products', icon: Milk },
    ],
  },
    {
    label: 'Jewelry Industry',
    icon: Gem,
    items: [
      { to: '/jewelry/dashboard', label: 'Jewelry Dashboard', icon: LayoutDashboard, badge: 'NEW' },
      { to: '/jewelry/metal-rates', label: 'Metal Rates', icon: Coins },
      { to: '/jewelry/products', label: 'Products', icon: Gem },
      { to: '/jewelry/sales', label: 'Sales', icon: CreditCard },
      { to: '/jewelry/custom-orders', label: 'Custom Orders', icon: Palette },
      { to: '/jewelry/exchanges', label: 'Exchanges', icon: Repeat },
      { to: '/jewelry/karigars', label: 'Karigars', icon: Users },
      { to: '/jewelry/metal-stock', label: 'Metal Stock', icon: Scale },
    ],
  },
    {
    label: 'Hotel Industry',
    icon: Building2,
    items: [
      { to: '/hotel/dashboard', label: 'Hotel Dashboard', icon: LayoutDashboard, badge: 'NEW' },
      { to: '/hotel/room-types', label: 'Room Types', icon: Bed },
      { to: '/hotel/rooms', label: 'Rooms', icon: Home },
      { to: '/hotel/bookings', label: 'Bookings', icon: Calendar },
      { to: '/hotel/bookings/new', label: 'New Booking', icon: Sparkles },
      { to: '/hotel/guests', label: 'Guests', icon: Users },
      { to: '/hotel/housekeeping', label: 'Housekeeping', icon: Sparkle },
      { to: '/hotel/rate-plans', label: 'Rate Plans', icon: Award },
    ],
  },
    {
    label: 'Staff & Team',
    icon: UserCog,
    items: [
      { to: '/staff', label: 'All Staff', icon: UserCog, permission: PERMISSIONS.STAFF_VIEW },
      { to: '/staff/attendance', label: 'Attendance', icon: CheckCircle2, permission: PERMISSIONS.STAFF_VIEW },
      { to: '/staff/salary/new', label: 'Process Salary', icon: Wallet2, permission: PERMISSIONS.STAFF_MANAGE },
      { to: '/team', label: 'App Users', icon: ShieldCheck, permission: PERMISSIONS.TEAM_VIEW },
    ],
  },
  {
    label: 'Finance',
    icon: Wallet,
    items: [
      { to: '/expenses', label: 'Expenses', icon: Wallet, permission: PERMISSIONS.EXPENSES_VIEW },
      { to: '/billing', label: 'Billing', icon: CreditCard, permission: PERMISSIONS.BILLING_VIEW },
      { to: '/plans', label: 'Plans', icon: Sparkles, permission: PERMISSIONS.PLANS_VIEW },
      { to: '/plan-usage', label: 'Plan Usage', icon: Gauge, permission: PERMISSIONS.PLAN_USAGE_VIEW },
      { to: '/referrals', label: 'Referrals', icon: Gift, permission: PERMISSIONS.REFERRALS_VIEW },
    ],
  },
  {
    label: 'System',
    icon: SettingsIcon,
    items: [
      { to: '/notifications', label: 'Notifications', icon: Bell },
      { to: '/shops', label: 'Shops / Branches', icon: Building2, permission: PERMISSIONS.SHOPS_VIEW },
      { to: '/exports', label: 'Exports', icon: Download, permission: PERMISSIONS.EXPORTS_VIEW },
      { to: '/backup', label: 'Backup', icon: Database, permission: PERMISSIONS.BACKUP_MANAGE },
      { to: '/activity-log', label: 'Activity Log', icon: Activity, permission: PERMISSIONS.ACTIVITY_VIEW },
      { to: '/receipt-settings', label: 'Receipt Settings', icon: ScanLine, permission: PERMISSIONS.SETTINGS_VIEW, badge: 'NEW' },
      { to: '/settings', label: 'Settings', icon: SettingsIcon, permission: PERMISSIONS.SETTINGS_VIEW },
      { to: '/profile', label: 'My Profile', icon: UserCircle },
      { to: '/help', label: 'Help', icon: LifeBuoy },
      { to: '/legal', label: 'Terms & Privacy', icon: ScrollText },
    ],
  },
];

type Props = {
  tenantName?: string;
  tenantSlug?: string;
  businessType?: string;
  role?: any;
  permissions?: string[];
  onItemClick?: () => void;
  onCollapse?: () => void;
};

const loadGroupState = (): Record<string, boolean> => {
  try {
    const raw = localStorage.getItem(SIDEBAR_GROUPS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {};
};
const saveGroupState = (state: Record<string, boolean>) => {
  try { localStorage.setItem(SIDEBAR_GROUPS_KEY, JSON.stringify(state)); } catch {}
};
const loadFavorites = (): string[] => {
  try {
    const raw = localStorage.getItem(SIDEBAR_FAVORITES_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return DEFAULT_FAVORITES;
};
const saveFavorites = (favs: string[]) => {
  try { localStorage.setItem(SIDEBAR_FAVORITES_KEY, JSON.stringify(favs)); } catch {}
};

export const Sidebar = memo(function Sidebar({
  tenantName, tenantSlug, businessType, role, permissions, onItemClick, onCollapse,
}: Props) {
  const navRef = useRef<HTMLElement | null>(null);
  const [search, setSearch] = useState('');
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => loadGroupState());
  const [favoritePaths, setFavoritePaths] = useState<string[]>(() => loadFavorites());

  const allItemsByPath = useMemo(() => {
    const map = new Map<string, NavItem>();
    for (const group of navGroups) for (const item of group.items) map.set(item.to, item);
    return map;
  }, []);

  const filteredGroups = useMemo(() => {
    const type = (businessType ?? '').toUpperCase();
    const isCarpet = type.includes('CARPET') || type.includes('FLOORING');
    const isMobile = type.includes('MOBILE') || type.includes('PHONE') || type.includes('ELECTRONICS');
    return navGroups
      .filter((group) => {
        const isRetail = type.includes('RETAIL') || type.includes('KIRYANA') || type.includes('GENERAL') || type.includes('SUPERMARKET');
        const isRestaurant = type.includes('RESTAURANT') || type.includes('CAFE') || type.includes('BAKERY') || type.includes('FOOD') || type.includes('FAST_FOOD') || type.includes('DINE');
        const isPharmacy = type.includes('PHARMACY') || type.includes('MEDICAL') || type.includes('CHEMIST') || type.includes('DRUG');
        const isGarments = type.includes('GARMENT') || type.includes('CLOTHING') || type.includes('BOUTIQUE') || type.includes('APPAREL') || type.includes('TAILOR') || type.includes('FASHION');
        if (group.label === 'Retail Industry' && !isRetail) return false;
        if (group.label === 'Restaurant Industry' && !isRestaurant) return false;
        if (group.label === 'Pharmacy Industry' && !isPharmacy) return false;
        if (group.label === 'Garments Industry' && !isGarments) return false;
        const isSalon = type.includes('SALON') || type.includes('PARLOUR') || type.includes('PARLOR') || type.includes('BEAUTY') || type.includes('SPA') || type.includes('BARBER');
        if (group.label === 'Salon Industry' && !isSalon) return false;
        const isHardware = type.includes('HARDWARE') || type.includes('BUILDING') || type.includes('CONSTRUCTION') || type.includes('CEMENT') || type.includes('STEEL') || type.includes('SANITARY') || type.includes('PLUMBING') || type.includes('TILES') || type.includes('PAINT');
        if (group.label === 'Hardware Industry' && !isHardware) return false;
        const isDairy = type.includes('DAIRY') || type.includes('MILK') || type.includes('DODHI') || type.includes('GAWALA');
        if (group.label === 'Dairy Industry' && !isDairy) return false;
        const isMeat = type.includes('MEAT') || type.includes('BUTCHER') || type.includes('HALAL') || type.includes('POULTRY') || type.includes('SLAUGHTERHOUSE');
        if (group.label === 'Meat Industry' && !isMeat) return false;
        const isAgri = type.includes('AGRI') || type.includes('FARM') || type.includes('SEED') || type.includes('FERTILIZER') || type.includes('FEED') || type.includes('PESTICIDE') || type.includes('CROP');
        if (group.label === 'Agri / Feed Industry' && !isAgri) return false;
        const isHotel = type.includes('HOTEL') || type.includes('GUEST_HOUSE') || type.includes('GUESTHOUSE') || type.includes('MOTEL') || type.includes('RESORT') || type.includes('LODGE') || type.includes('INN') || type.includes('HOSTEL');
        if (group.label === 'Hotel Industry' && !isHotel) return false;
        const isJewelry = type.includes('JEWELRY') || type.includes('JEWELLERY') || type.includes('ZARGAR') || type.includes('SUNAR') || type.includes('GOLD') || type.includes('BULLION');
        if (group.label === 'Jewelry Industry' && !isJewelry) return false;
        const isAutoParts = type.includes('AUTO') || type.includes('WORKSHOP') || type.includes('GARAGE') || type.includes('MECHANIC') || type.includes('SPARE') || type.includes('MOTOR') || type.includes('VEHICLE') || type.includes('CAR');
        if (group.label === 'Auto Parts / Workshop' && !isAutoParts) return false;
        const isBookstore = type.includes('BOOK') || type.includes('STATIONERY') || type.includes('STATIONARY') || type.includes('LIBRARY') || type.includes('ART') || type.includes('SCHOOL') || type.includes('EDUCATION');
        if (group.label === 'Bookstore / Stationery' && !isBookstore) return false;
        if (group.label === 'Carpet Industry' && !isCarpet) return false;
        if (group.label === 'Mobile Industry' && !isMobile) return false;
        return true;
      })
      .map((group) => ({
        ...group,
        items: group.items.filter((item) =>
          item.permission ? hasPermission(role, permissions, item.permission) : true,
        ),
      }))
      .filter((group) => group.items.length > 0);
  }, [role, permissions, businessType]);

  const visiblePathSet = useMemo(() => {
    const set = new Set<string>();
    for (const g of filteredGroups) for (const item of g.items) set.add(item.to);
    return set;
  }, [filteredGroups]);

  const favoriteItems = useMemo(() => {
    return favoritePaths
      .map((path) => allItemsByPath.get(path))
      .filter((item): item is NavItem => !!item && visiblePathSet.has(item.to));
  }, [favoritePaths, allItemsByPath, visiblePathSet]);

  const isFavorite = (path: string) => favoritePaths.includes(path);

  const toggleFavorite = (path: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const next = isFavorite(path) ? favoritePaths.filter((p) => p !== path) : [...favoritePaths, path];
    setFavoritePaths(next);
    saveFavorites(next);
  };

  const searchQuery = search.toLowerCase().trim();
  const searchedGroups = useMemo(() => {
    if (!searchQuery) return filteredGroups;
    return filteredGroups
      .map((g) => ({ ...g, items: g.items.filter((it) => it.label.toLowerCase().includes(searchQuery)) }))
      .filter((g) => g.items.length > 0);
  }, [filteredGroups, searchQuery]);

  const searchedFavorites = useMemo(() => {
    if (!searchQuery) return favoriteItems;
    return favoriteItems.filter((it) => it.label.toLowerCase().includes(searchQuery));
  }, [favoriteItems, searchQuery]);

  const totalSearchMatches = searchedFavorites.length + searchedGroups.reduce((s, g) => s + g.items.length, 0);

  const isGroupOpen = (group: NavGroup) => {
    if (searchQuery) return true;
    const userState = openGroups[group.label];
    if (userState !== undefined) return userState;
    return group.defaultOpen ?? false;
  };

  const toggleGroup = (label: string, currentlyOpen: boolean) => {
    const next = { ...openGroups, [label]: !currentlyOpen };
    setOpenGroups(next);
    saveGroupState(next);
  };

  const expandAll = () => {
    const next: Record<string, boolean> = {};
    filteredGroups.forEach((g) => { next[g.label] = true; });
    setOpenGroups(next);
    saveGroupState(next);
  };
  const collapseAll = () => {
    const next: Record<string, boolean> = {};
    filteredGroups.forEach((g) => { next[g.label] = false; });
    setOpenGroups(next);
    saveGroupState(next);
  };

  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    const saved = sessionStorage.getItem(SIDEBAR_SCROLL_KEY);
    if (saved) nav.scrollTop = Number(saved);
    const handleScroll = () => sessionStorage.setItem(SIDEBAR_SCROLL_KEY, String(nav.scrollTop));
    nav.addEventListener('scroll', handleScroll, { passive: true });
    return () => nav.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <>
      {/* ─── HEADER — Brand card ─── */}
      <div className="px-4 pt-4 pb-3 shrink-0">
        <div className="relative rounded-2xl bg-gradient-to-br from-brand-600 via-emerald-600 to-emerald-700 p-3 shadow-xl shadow-emerald-900/40 overflow-hidden">
          <div className="absolute -top-8 -right-8 h-24 w-24 rounded-full bg-emerald-400/20 blur-2xl" />
          <div className="absolute -bottom-8 -left-8 h-20 w-20 rounded-full bg-amber-400/20 blur-2xl" />
          <div className="relative flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center shadow-inner ring-1 ring-white/25 shrink-0">
              <Logo size={26} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-extrabold text-white truncate text-[15px] leading-tight">
                {tenantName || 'My Store'}
              </div>
              <div className="flex items-center gap-1.5 mt-1">
                {businessType && (
                  <span className="px-1.5 py-0.5 rounded-md bg-white/20 backdrop-blur text-[9px] font-extrabold text-white uppercase tracking-wider">
                    {businessType.replace('_', ' ')}
                  </span>
                )}
                {tenantSlug && (
                  <span className="text-[10px] text-white/80 font-mono truncate">@{tenantSlug}</span>
                )}
              </div>
            </div>
            {onCollapse && (
              <button
                onClick={onCollapse}
                className="h-9 w-9 rounded-xl bg-white/15 hover:bg-white/30 backdrop-blur text-white flex items-center justify-center transition shrink-0 active:scale-95"
                title="Hide sidebar (⌘B)"
              >
                <PanelLeftClose className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ─── SEARCH + CONTROLS ─── */}
      <div className="px-4 pb-3 shrink-0 space-y-2">
        <div className="relative">
          <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search menu... (Ctrl+K)"
            className="h-10 w-full rounded-xl bg-slate-800/70 border border-slate-700/70 pl-10 pr-9 text-sm font-semibold text-white placeholder:text-slate-400 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/25 transition"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 rounded-md hover:bg-slate-700 flex items-center justify-center text-slate-400 transition"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        {searchQuery ? (
          <div className="text-[11px] text-slate-400 font-bold text-center py-0.5">
            {totalSearchMatches === 0 ? 'No matches' : `${totalSearchMatches} result${totalSearchMatches > 1 ? 's' : ''}`}
          </div>
        ) : (
          <div className="flex items-center gap-1.5">
            <button
              onClick={expandAll}
              className="flex-1 h-7 rounded-lg bg-slate-800/70 hover:bg-slate-700 text-[10px] font-extrabold text-slate-300 hover:text-white transition"
            >
              Expand All
            </button>
            <button
              onClick={collapseAll}
              className="flex-1 h-7 rounded-lg bg-slate-800/70 hover:bg-slate-700 text-[10px] font-extrabold text-slate-300 hover:text-white transition"
            >
              Collapse
            </button>
          </div>
        )}
      </div>

      {/* ─── NAV ─── */}
      <nav
        ref={navRef}
        className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-3 pb-3 space-y-4"
      >
        {/* FAVORITES */}
        {searchedFavorites.length > 0 && (
          <div>
            <div className="px-2 mb-2 flex items-center gap-1.5">
              <Star className="h-3 w-3 text-amber-400 fill-amber-400" />
              <span className="text-[10px] uppercase tracking-widest text-amber-400 font-extrabold">
                My Favorites
              </span>
              <span className="text-[10px] font-extrabold text-slate-600 ml-auto">
                {searchedFavorites.length}
              </span>
            </div>
            <div className="space-y-1">
              {searchedFavorites.map((item) => (
                <NavItemLink
                  key={item.to}
                  item={item}
                  onItemClick={onItemClick}
                  isFavorite={true}
                  isFav={isFavorite(item.to)}
                  onToggleFav={(e) => toggleFavorite(item.to, e)}
                />
              ))}
            </div>
          </div>
        )}

        {/* GROUPS */}
        {searchedGroups.map((group) => {
          const isOpen = isGroupOpen(group);
          const GroupIcon = group.icon;
          return (
            <div key={group.label}>
              <button
                onClick={() => toggleGroup(group.label, isOpen)}
                className="w-full px-2 py-1 mb-1.5 flex items-center gap-2 rounded-lg hover:bg-slate-800/50 transition group/header text-left"
              >
                <GroupIcon className="h-3.5 w-3.5 text-slate-500 group-hover/header:text-slate-300 transition shrink-0" />
                <span className="text-[10px] uppercase tracking-widest text-slate-500 group-hover/header:text-slate-300 font-extrabold flex-1">
                  {group.label}
                </span>
                <span className="text-[10px] font-extrabold text-slate-600 group-hover/header:text-slate-400">
                  {group.items.length}
                </span>
                {isOpen ? (
                  <ChevronDown className="h-3.5 w-3.5 text-slate-500 group-hover/header:text-slate-300 transition" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5 text-slate-500 group-hover/header:text-slate-300 transition" />
                )}
              </button>
              {isOpen && (
                <div className="space-y-1 animate-in slide-in-from-top-1 duration-150">
                  {group.items.map((item) => (
                    <NavItemLink
                      key={item.to}
                      item={item}
                      onItemClick={onItemClick}
                      isFav={isFavorite(item.to)}
                      onToggleFav={(e) => toggleFavorite(item.to, e)}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {searchedFavorites.length === 0 && searchedGroups.length === 0 && (
          <div className="px-4 py-10 text-center">
            <div className="h-16 w-16 rounded-2xl bg-slate-800/60 mx-auto flex items-center justify-center mb-3">
              <Search className="h-8 w-8 text-slate-600" />
            </div>
            <div className="text-sm font-extrabold text-slate-300">No matches</div>
            <div className="text-xs text-slate-500 mt-1 font-semibold">Try different keywords</div>
            <button
              onClick={() => setSearch('')}
              className="mt-3 text-xs font-extrabold text-brand-400 hover:text-brand-300 underline"
            >
              Clear search
            </button>
          </div>
        )}
      </nav>

      {/* ─── FOOTER — Tips + shortcut ─── */}
      <div className="px-4 py-3 border-t border-slate-800/70 shrink-0 space-y-2">
        <div className="rounded-xl bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/25 p-2.5">
          <div className="flex items-start gap-2">
            <Sparkles className="h-3.5 w-3.5 text-amber-400 shrink-0 mt-0.5" />
            <p className="text-[11px] text-slate-300 leading-snug">
              <span className="font-extrabold text-amber-300">Tip:</span> Click ⭐ to add favorites
            </p>
          </div>
        </div>
        <div className="flex items-center justify-between px-1 text-[10px] font-bold text-slate-500">
          <span>Nafaa POS</span>
          <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-[9px] text-slate-400">
            ⌘B toggle
          </kbd>
        </div>
      </div>
    </>
  );
});

function NavItemLink({
  item, onItemClick, isFavorite, isFav, onToggleFav,
}: {
  item: NavItem;
  onItemClick?: () => void;
  isFavorite?: boolean;
  isFav: boolean;
  onToggleFav: (e: React.MouseEvent) => void;
}) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      end={item.to === '/staff' || item.to === '/products'}
      onClick={onItemClick}
      className={({ isActive }) =>
        [
          'group/item relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-bold transition-all duration-150',
          isActive
            ? isFavorite
              ? 'bg-gradient-to-r from-brand-600 to-emerald-600 text-white shadow-lg shadow-brand-900/50 ring-1 ring-brand-400/50'
              : 'bg-gradient-to-r from-brand-600 to-emerald-600 text-white shadow-lg shadow-brand-900/50'
            : isFavorite
              ? 'text-slate-200 hover:bg-slate-800 hover:text-white hover:translate-x-0.5'
              : 'text-slate-400 hover:bg-slate-800/70 hover:text-white hover:translate-x-0.5',
        ].join(' ')
      }
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="truncate flex-1">{item.label}</span>
      {item.badge && (
        <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-full bg-amber-500 text-white shrink-0 shadow ring-1 ring-amber-300/40">
          {item.badge}
        </span>
      )}
      <button
        onClick={onToggleFav}
        className={`h-5 w-5 rounded-md flex items-center justify-center transition ${
          isFav
            ? 'opacity-100 text-amber-400 hover:text-amber-300 hover:bg-amber-500/10'
            : 'opacity-0 group-hover/item:opacity-100 text-slate-500 hover:text-amber-400 hover:bg-slate-700/50'
        }`}
        title={isFav ? 'Remove from favorites' : 'Add to favorites'}
      >
        {isFav ? <Star className="h-3.5 w-3.5 fill-current" /> : <StarOff className="h-3.5 w-3.5" />}
      </button>
    </NavLink>
  );
}
