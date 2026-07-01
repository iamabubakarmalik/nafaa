import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Package, Sparkles, Store, Users, ShoppingCart, Receipt,
  Truck, PackagePlus, Tag, Wallet, Activity, BarChart3, Settings as SettingsIcon,
  ScanLine, ShieldCheck, BookOpen, ClipboardCheck, AlertTriangle, Building2,
  ArrowRightLeft, Download, Database, RotateCcw, Award, Percent, TrendingUp,
  CreditCard, Gift, Gauge, Hash, UserCircle, LifeBuoy, ScrollText, Eye,
  UserCog, CheckCircle2, Wallet2, Bell, Scissors, Layers,
  RefreshCw, Wrench, Smartphone, BookmarkPlus, ChevronDown, ChevronRight,
  Search, X, Star, StarOff, PanelLeftClose,
} from 'lucide-react';
import { Logo } from '@/components/brand/Logo';
import { hasPermission, PERMISSIONS, type PermissionKey } from '@/lib/permissions';

const SIDEBAR_SCROLL_KEY = 'nafaa-sidebar-scroll';
const SIDEBAR_GROUPS_KEY = 'nafaa-sidebar-groups-v2';
const SIDEBAR_FAVORITES_KEY = 'nafaa-sidebar-favorites-v1';

type NavItem = {
  to: string;
  label: string;
  icon: any;
  permission?: PermissionKey;
  badge?: string;
};

type NavGroup = {
  label: string;
  items: NavItem[];
  defaultOpen?: boolean;
};

// ─── DEFAULT FAVORITES (fallback for first-time users) ────────────────
const DEFAULT_FAVORITES = ['/dashboard', '/pos', '/sales', '/customers', '/products', '/khata'];

// ─── ALL NAV ITEMS (single source of truth) ──────────────────────────
const navGroups: NavGroup[] = [
  {
    label: 'Overview',
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
    defaultOpen: true,
    items: [
      { to: '/pos', label: 'POS', icon: ShoppingCart, permission: PERMISSIONS.POS_USE },
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
    items: [
      { to: '/carpet-rolls', label: 'Carpet Rolls', icon: Layers, badge: 'NEW' },
      { to: '/carpet-cut-pieces', label: 'Cut Pieces', icon: Scissors },
      { to: '/carpet-reports', label: 'Carpet Reports', icon: BarChart3 },
    ],
  },
  {
    label: 'Mobile Industry',
    items: [
      { to: '/imei-inventory', label: 'IMEI Inventory', icon: Smartphone },
      { to: '/used-phones', label: 'Used Phones', icon: RefreshCw },
      { to: '/repair-tickets', label: 'Repairs', icon: Wrench },
      { to: '/emi-plans', label: 'EMI Plans', icon: CreditCard },
      { to: '/mobile-reports', label: 'Mobile Reports', icon: BarChart3 },
    ],
  },
  {
    label: 'Staff & Team',
    items: [
      { to: '/staff', label: 'All Staff', icon: UserCog, permission: PERMISSIONS.STAFF_VIEW },
      { to: '/staff/attendance', label: 'Attendance', icon: CheckCircle2, permission: PERMISSIONS.STAFF_VIEW },
      { to: '/staff/salary/new', label: 'Process Salary', icon: Wallet2, permission: PERMISSIONS.STAFF_MANAGE },
      { to: '/team', label: 'App Users', icon: ShieldCheck, permission: PERMISSIONS.TEAM_VIEW },
    ],
  },
  {
    label: 'Finance',
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
    items: [
      { to: '/notifications', label: 'Notifications', icon: Bell },
      { to: '/shops', label: 'Shops / Branches', icon: Building2, permission: PERMISSIONS.SHOPS_VIEW },
      { to: '/exports', label: 'Exports', icon: Download, permission: PERMISSIONS.EXPORTS_VIEW },
      { to: '/backup', label: 'Backup', icon: Database, permission: PERMISSIONS.BACKUP_MANAGE },
      { to: '/activity-log', label: 'Activity Log', icon: Activity, permission: PERMISSIONS.ACTIVITY_VIEW },
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

// ─── localStorage helpers ────────────────────────────
const loadGroupState = (): Record<string, boolean> => {
  try {
    const raw = localStorage.getItem(SIDEBAR_GROUPS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {};
};

const saveGroupState = (state: Record<string, boolean>) => {
  try {
    localStorage.setItem(SIDEBAR_GROUPS_KEY, JSON.stringify(state));
  } catch {}
};

const loadFavorites = (): string[] => {
  try {
    const raw = localStorage.getItem(SIDEBAR_FAVORITES_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return DEFAULT_FAVORITES;
};

const saveFavorites = (favs: string[]) => {
  try {
    localStorage.setItem(SIDEBAR_FAVORITES_KEY, JSON.stringify(favs));
  } catch {}
};

export const Sidebar = memo(function Sidebar({
  tenantName,
  tenantSlug,
  businessType,
  role,
  permissions,
  onItemClick,
  onCollapse,
}: Props) {
  const navRef = useRef<HTMLElement | null>(null);
  const [search, setSearch] = useState('');
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => loadGroupState());
  const [favoritePaths, setFavoritePaths] = useState<string[]>(() => loadFavorites());

  // Build a flat map: path -> NavItem (used by favorites lookup)
  const allItemsByPath = useMemo(() => {
    const map = new Map<string, NavItem>();
    for (const group of navGroups) {
      for (const item of group.items) {
        map.set(item.to, item);
      }
    }
    return map;
  }, []);

  // Filter groups by permission + industry
  const filteredGroups = useMemo(() => {
    const type = (businessType ?? '').toUpperCase();
    const isCarpet = type.includes('CARPET') || type.includes('FLOORING');
    const isMobile = type.includes('MOBILE') || type.includes('PHONE') || type.includes('ELECTRONICS');

    return navGroups
      .filter((group) => {
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

  // Build set of visible paths (for filtering favorites to only accessible)
  const visiblePathSet = useMemo(() => {
    const set = new Set<string>();
    for (const g of filteredGroups) {
      for (const item of g.items) set.add(item.to);
    }
    return set;
  }, [filteredGroups]);

  // Get favorite items (in user's saved order, only accessible ones)
  const favoriteItems = useMemo(() => {
    return favoritePaths
      .map((path) => allItemsByPath.get(path))
      .filter((item): item is NavItem => !!item && visiblePathSet.has(item.to));
  }, [favoritePaths, allItemsByPath, visiblePathSet]);

  const isFavorite = (path: string) => favoritePaths.includes(path);

  const toggleFavorite = (path: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const next = isFavorite(path)
      ? favoritePaths.filter((p) => p !== path)
      : [...favoritePaths, path];
    setFavoritePaths(next);
    saveFavorites(next);
  };

  // Apply search filter
  const searchQuery = search.toLowerCase().trim();
  const searchedGroups = useMemo(() => {
    if (!searchQuery) return filteredGroups;
    return filteredGroups
      .map((g) => ({
        ...g,
        items: g.items.filter((it) => it.label.toLowerCase().includes(searchQuery)),
      }))
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

  // Preserve scroll
  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    const saved = sessionStorage.getItem(SIDEBAR_SCROLL_KEY);
    if (saved) nav.scrollTop = Number(saved);
    const handleScroll = () => {
      sessionStorage.setItem(SIDEBAR_SCROLL_KEY, String(nav.scrollTop));
    };
    nav.addEventListener('scroll', handleScroll, { passive: true });
    return () => nav.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <>
      {/* ─── TOP: Compact card + collapse button ─── */}
      <div className="px-3 pt-3 pb-2 border-b border-slate-800/60 shrink-0">
        <div className="relative rounded-xl bg-gradient-to-br from-brand-600 via-brand-700 to-emerald-800 p-2.5 shadow-lg overflow-hidden">
          <div className="absolute -top-6 -right-6 h-16 w-16 rounded-full bg-emerald-400/20 blur-2xl" />
          <div className="relative flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg bg-white/15 backdrop-blur flex items-center justify-center shadow ring-1 ring-white/20 shrink-0">
              <Logo size={22} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-extrabold text-white truncate text-sm leading-tight">
                {tenantName || 'My Store'}
              </div>
              <div className="flex items-center gap-1 mt-0.5">
                {businessType && (
                  <span className="px-1 py-0 rounded bg-white/20 backdrop-blur text-[8px] font-bold text-white">
                    {businessType.replace('_', ' ')}
                  </span>
                )}
                {tenantSlug && (
                  <span className="text-[9px] text-white/70 font-mono truncate">@{tenantSlug}</span>
                )}
              </div>
            </div>
            {/* Collapse button — hide sidebar for full-screen mode */}
            {onCollapse && (
              <button
                onClick={onCollapse}
                className="h-8 w-8 rounded-lg bg-white/15 hover:bg-white/25 backdrop-blur text-white flex items-center justify-center transition shrink-0"
                title="Hide sidebar (full screen)"
              >
                <PanelLeftClose className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ─── SEARCH + controls ─── */}
      <div className="px-3 py-2 border-b border-slate-800/60 shrink-0 space-y-2">
        <div className="relative">
          <Search className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search menu..."
            className="h-8 w-full rounded-lg bg-slate-800/60 border border-slate-700 pl-8 pr-8 text-xs font-semibold text-white placeholder:text-slate-400 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/30"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 h-5 w-5 rounded hover:bg-slate-700 flex items-center justify-center text-slate-400"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
        {searchQuery ? (
          <div className="text-[10px] text-slate-400 font-bold text-center">
            {totalSearchMatches === 0 ? 'No matches' : `${totalSearchMatches} result${totalSearchMatches > 1 ? 's' : ''}`}
          </div>
        ) : (
          <div className="flex items-center justify-between gap-2">
            <button
              onClick={expandAll}
              className="flex-1 h-6 rounded-md bg-slate-800/60 hover:bg-slate-700 text-[9px] font-extrabold text-slate-300 hover:text-white transition"
            >
              Expand All
            </button>
            <button
              onClick={collapseAll}
              className="flex-1 h-6 rounded-md bg-slate-800/60 hover:bg-slate-700 text-[9px] font-extrabold text-slate-300 hover:text-white transition"
            >
              Collapse
            </button>
          </div>
        )}
      </div>

      {/* ─── NAV ─── */}
      <nav
        ref={navRef}
        className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-2 py-3 space-y-3 sidebar-scroll"
      >
        {/* FAVORITES */}
        {searchedFavorites.length > 0 && (
          <div>
            <div className="px-2 mb-1.5 flex items-center gap-1.5">
              <Star className="h-2.5 w-2.5 text-amber-400 fill-amber-400" />
              <span className="text-[9px] uppercase tracking-widest text-amber-400 font-extrabold">
                My Favorites
              </span>
              <span className="text-[9px] font-bold text-slate-600 ml-auto">
                {searchedFavorites.length}
              </span>
            </div>
            <div className="space-y-0.5">
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
          return (
            <div key={group.label}>
              <button
                onClick={() => toggleGroup(group.label, isOpen)}
                className="w-full px-2 mb-1 flex items-center justify-between text-left group/header"
              >
                <span className="text-[9px] uppercase tracking-widest text-slate-500 group-hover/header:text-slate-300 font-bold transition">
                  {group.label}
                </span>
                <div className="flex items-center gap-1">
                  <span className="text-[9px] font-bold text-slate-600 group-hover/header:text-slate-400">
                    {group.items.length}
                  </span>
                  {isOpen ? (
                    <ChevronDown className="h-3 w-3 text-slate-500 group-hover/header:text-slate-300" />
                  ) : (
                    <ChevronRight className="h-3 w-3 text-slate-500 group-hover/header:text-slate-300" />
                  )}
                </div>
              </button>
              {isOpen && (
                <div className="space-y-0.5 animate-in slide-in-from-top-1 duration-150">
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
          <div className="px-4 py-8 text-center">
            <Search className="h-8 w-8 text-slate-600 mx-auto mb-2" />
            <div className="text-xs font-bold text-slate-400">No menu items match</div>
            <button
              onClick={() => setSearch('')}
              className="mt-2 text-[10px] font-extrabold text-brand-400 hover:text-brand-300"
            >
              Clear search
            </button>
          </div>
        )}
      </nav>

      {/* BOTTOM tip */}
      <div className="px-3 py-2 border-t border-slate-800/60 shrink-0">
        <div className="rounded-lg bg-gradient-to-br from-amber-500/10 to-amber-600/5 border border-amber-500/20 p-2">
          <div className="flex items-center gap-1.5">
            <Sparkles className="h-3 w-3 text-amber-400 shrink-0" />
            <p className="text-[10px] text-slate-300 leading-snug">
              <span className="font-extrabold text-amber-300">Tip:</span> ⭐ click karke apna favorite banao
            </p>
          </div>
        </div>
      </div>
    </>
  );
});

// ─── Individual Nav Item with star toggle ────────────
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
          'group/item flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all duration-150',
          isActive
            ? isFavorite
              ? 'bg-gradient-to-r from-brand-600 to-emerald-600 text-white shadow-md shadow-brand-900/40'
              : 'bg-brand-600 text-white shadow-md shadow-brand-900/40'
            : isFavorite
              ? 'text-slate-200 hover:bg-slate-800/80 hover:text-white'
              : 'text-slate-400 hover:bg-slate-800/60 hover:text-white',
        ].join(' ')
      }
    >
      <Icon className="h-3.5 w-3.5 shrink-0" />
      <span className="truncate flex-1">{item.label}</span>
      {item.badge && (
        <span className="text-[8px] font-extrabold px-1 py-0 rounded-full bg-amber-500 text-white shrink-0 shadow">
          {item.badge}
        </span>
      )}
      {/* Star toggle — appears on hover, always visible when favorited */}
      <button
        onClick={onToggleFav}
        className={`h-4 w-4 rounded flex items-center justify-center transition ${
          isFav
            ? 'opacity-100 text-amber-400 hover:text-amber-300'
            : 'opacity-0 group-hover/item:opacity-100 text-slate-500 hover:text-amber-400'
        }`}
        title={isFav ? 'Remove from favorites' : 'Add to favorites'}
      >
        {isFav ? <Star className="h-3 w-3 fill-current" /> : <StarOff className="h-3 w-3" />}
      </button>
    </NavLink>
  );
}
