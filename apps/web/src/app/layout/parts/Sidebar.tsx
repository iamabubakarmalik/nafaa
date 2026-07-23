import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Package, Sparkles, Users, ShoppingCart, Receipt, PackagePlus, Tag, Wallet, Activity, BarChart3, Settings as SettingsIcon,
  ScanLine, BookOpen, ClipboardCheck, AlertTriangle,
  ArrowRightLeft, Download, Database, RotateCcw, Award, Percent, TrendingUp, Gift, Gauge, Hash, UserCircle, LifeBuoy, ScrollText, Eye,
  UserCog, CheckCircle2, Wallet2,
  BookmarkPlus, ChevronDown, ChevronRight, ShieldCheck, CreditCard, Bell, Building2, Truck,
  Search, X, Star, StarOff, PanelLeftClose,
  Store, Megaphone, MessageCircle, Brain, GraduationCap, Bike, Globe, Lock,
} from 'lucide-react';
import { Logo } from '@core/components/brand/Logo';
import { hasPermission, PERMISSIONS, type PermissionKey } from '@core/lib/permissions';
import { useCurrentIndustry } from '@industries/_shared/registry/useCurrentIndustry';
import type { IndustryNavGroup, IndustryNavItem } from '@industries/_shared/types/industry-pack';

const SIDEBAR_SCROLL_KEY = 'nafaa-sidebar-scroll';
const SIDEBAR_GROUPS_KEY = 'nafaa-sidebar-groups-v5';
const SIDEBAR_FAVORITES_KEY = 'nafaa-sidebar-favorites-v3';

type NavItem = {
  to: string;
  label: string;
  icon: any;
  permission?: PermissionKey;
  comingSoon?: boolean;
};

type NavGroup = {
  label: string;
  icon: any;
  emoji?: string;
  color?: string;
  items: NavItem[];
  defaultOpen?: boolean;
  order?: number;
};

const DEFAULT_FAVORITES = ['/dashboard', '/pos', '/sales', '/customers', '/products', '/khata'];

// ═══════════════════════════════════════════════════════════════
// CORE nav groups — only pages that actually exist as routes
// Coming Soon items are visually disabled (no route, no click)
// ═══════════════════════════════════════════════════════════════
const coreNavGroups: NavGroup[] = [
  {
    label: 'Overview',
    icon: LayoutDashboard,
    defaultOpen: true,
    order: 0,
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
    order: 5,
    items: [
      { to: '/pos', label: 'POS Counter', icon: ShoppingCart, permission: PERMISSIONS.POS_USE },
      { to: '/sales', label: 'Sales History', icon: Receipt, permission: PERMISSIONS.SALES_VIEW },
      { to: '/bookings', label: 'Bookings / Advance', icon: BookmarkPlus, permission: PERMISSIONS.SALES_VIEW },
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
    order: 10,
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
  // ── Industry groups get injected here (order 20-89) ────────

  // ═══════════════════════════════════════════════════════════
  // COMING SOON MODULES — disabled, elegant grey style
  // ═══════════════════════════════════════════════════════════
  {
    label: 'Marketplace',
    icon: Store,
    emoji: '🛍️',
    color: '#8b5cf6',
    order: 88,
    items: [
      { to: '/marketplace/settings', label: 'Publish Settings', icon: Globe, permission: PERMISSIONS.SETTINGS_VIEW },
      { to: '/marketplace/dashboard', label: 'Marketplace Dashboard', icon: Store, comingSoon: true },
      { to: '/marketplace/orders', label: 'Customer Orders', icon: ShoppingCart, comingSoon: true },
      { to: '/marketplace/storefront', label: 'My Storefront', icon: Globe, comingSoon: true },
    ],
  },
  {
    label: 'Delivery',
    icon: Bike,
    emoji: '🚚',
    color: '#f97316',
    order: 89,
    items: [
      { to: '/delivery/active', label: 'Active Deliveries', icon: Bike, comingSoon: true },
      { to: '/delivery/riders', label: 'Riders', icon: Users, comingSoon: true },
      { to: '/delivery/zones', label: 'Delivery Zones', icon: Globe, comingSoon: true },
    ],
  },
  {
    label: 'Marketing',
    icon: Megaphone,
    emoji: '📣',
    color: '#ec4899',
    order: 91,
    items: [
      { to: '/messaging/hub', label: 'Messaging Hub', icon: MessageCircle, comingSoon: true },
      { to: '/messaging/campaigns', label: 'Campaigns', icon: Megaphone, comingSoon: true },
      { to: '/promotions/coupons', label: 'Coupons', icon: Percent, comingSoon: true },
      { to: '/promotions/flash-sales', label: 'Flash Sales', icon: Sparkles, comingSoon: true },
    ],
  },
  {
    label: 'AI & Insights',
    icon: Brain,
    emoji: '🧠',
    color: '#06b6d4',
    order: 92,
    items: [
      { to: '/analytics/ai-insights', label: 'AI Insights', icon: Brain, comingSoon: true },
      { to: '/analytics/forecast', label: 'Sales Forecast', icon: TrendingUp, comingSoon: true },
      { to: '/analytics/segments', label: 'Customer Segments', icon: Users, comingSoon: true },
      { to: '/ai-assistant', label: 'AI Assistant', icon: Sparkles, comingSoon: true },
    ],
  },

  // ═══════════════════════════════════════════════════════════
  // ACTIVE — Staff, Finance, System
  // ═══════════════════════════════════════════════════════════
  {
    label: 'Staff & Team',
    icon: UserCog,
    order: 93,
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
    order: 95,
    items: [
      { to: '/expenses', label: 'Expenses', icon: Wallet, permission: PERMISSIONS.EXPENSES_VIEW },
      { to: '/billing', label: 'Billing', icon: CreditCard, permission: PERMISSIONS.BILLING_VIEW },
      { to: '/plans', label: 'Plans', icon: Sparkles, permission: PERMISSIONS.PLANS_VIEW },
      { to: '/plan-usage', label: 'Plan Usage', icon: Gauge, permission: PERMISSIONS.PLAN_USAGE_VIEW },
      { to: '/referrals', label: 'Referrals', icon: Gift, permission: PERMISSIONS.REFERRALS_VIEW },
    ],
  },
  {
    label: 'Learn & Grow',
    icon: GraduationCap,
    emoji: '🎓',
    color: '#84cc16',
    order: 98,
    items: [
      { to: '/learn/tutorials', label: 'Tutorials', icon: GraduationCap, comingSoon: true },
      { to: '/learn/best-practices', label: 'Best Practices', icon: Sparkles, comingSoon: true },
    ],
  },
  {
    label: 'System',
    icon: SettingsIcon,
    order: 100,
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

function fromIndustryGroup(g: IndustryNavGroup): NavGroup {
  return {
    label: g.label,
    icon: g.icon ?? LayoutDashboard,
    emoji: g.emoji,
    color: g.color,
    order: g.order ?? 50,
    defaultOpen: true,
    items: g.items.map((it: IndustryNavItem) => ({
      to: it.to,
      label: it.label,
      icon: it.icon ?? LayoutDashboard,
      permission: it.permission as PermissionKey | undefined,
    })),
  };
}

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

  const industry = useCurrentIndustry();

  const allGroups = useMemo<NavGroup[]>(() => {
    const industryGroups = industry?.navGroups?.map(fromIndustryGroup) ?? [];
    return [...coreNavGroups, ...industryGroups].sort(
      (a, b) => (a.order ?? 100) - (b.order ?? 100),
    );
  }, [industry]);

  const allItemsByPath = useMemo(() => {
    const map = new Map<string, NavItem>();
    for (const group of allGroups) for (const item of group.items) map.set(item.to, item);
    return map;
  }, [allGroups]);

  const filteredGroups = useMemo(() => {
    return allGroups
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => {
          // Coming soon items always show (they're informational)
          if (item.comingSoon) return true;
          return item.permission ? hasPermission(role, permissions, item.permission) : true;
        }),
      }))
      .filter((group) => group.items.length > 0);
  }, [allGroups, role, permissions]);

  const visiblePathSet = useMemo(() => {
    const set = new Set<string>();
    for (const g of filteredGroups) for (const item of g.items) if (!item.comingSoon) set.add(item.to);
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
        <div
          className="relative rounded-2xl p-3 shadow-xl overflow-hidden"
          style={{
            background: industry?.themeColor
              ? `linear-gradient(135deg, ${industry.themeColor} 0%, ${industry.themeColor}cc 50%, ${industry.themeColor}99 100%)`
              : 'linear-gradient(135deg, #16a34a 0%, #059669 50%, #047857 100%)',
          }}
        >
          <div className="absolute -top-8 -right-8 h-24 w-24 rounded-full bg-white/10 blur-2xl" />
          <div className="absolute -bottom-8 -left-8 h-20 w-20 rounded-full bg-amber-400/20 blur-2xl" />
          <div className="relative flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center shadow-inner ring-1 ring-white/25 shrink-0">
              {industry?.emoji ? (
                <span className="text-2xl leading-none">{industry.emoji}</span>
              ) : (
                <Logo size={26} />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-extrabold text-white truncate text-[15px] leading-tight">
                {tenantName || 'My Store'}
              </div>
              <div className="flex items-center gap-1.5 mt-1">
                {industry ? (
                  <span className="px-1.5 py-0.5 rounded-md bg-white/20 backdrop-blur text-[9px] font-extrabold text-white uppercase tracking-wider">
                    {industry.emoji} {industry.shortName ?? industry.name}
                  </span>
                ) : businessType ? (
                  <span className="px-1.5 py-0.5 rounded-md bg-white/20 backdrop-blur text-[9px] font-extrabold text-white uppercase tracking-wider">
                    {businessType.replace(/_/g, ' ')}
                  </span>
                ) : null}
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
            placeholder="Search menu..."
            className="h-10 w-full rounded-xl bg-slate-800/70 border border-slate-700/70 pl-10 pr-9 text-sm font-semibold text-white placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/25 transition"
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
        className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-3 pb-3 space-y-4 scrollbar-thin"
      >
        {/* FAVORITES */}
        {searchedFavorites.length > 0 && (
          <div>
            <div className="px-2 mb-2 flex items-center gap-1.5">
              <Star className="h-3 w-3 text-amber-400 fill-amber-400" />
              <span className="text-[10px] uppercase tracking-widest text-amber-400 font-extrabold">
                Favorites
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
          const accent = group.color;
          const allComingSoon = group.items.every((it) => it.comingSoon);

          return (
            <div key={group.label}>
              <button
                onClick={() => toggleGroup(group.label, isOpen)}
                className="w-full px-2 py-1 mb-1.5 flex items-center gap-2 rounded-lg hover:bg-slate-800/50 transition group/header text-left"
              >
                {group.emoji ? (
                  <span className="text-sm leading-none shrink-0">{group.emoji}</span>
                ) : (
                  <GroupIcon
                    className="h-3.5 w-3.5 shrink-0 transition"
                    style={accent ? { color: accent } : undefined}
                  />
                )}
                <span
                  className="text-[10px] uppercase tracking-widest font-extrabold flex-1 group-hover/header:text-slate-300 transition"
                  style={accent ? { color: accent } : { color: '#94a3b8' }}
                >
                  {group.label}
                </span>
                {allComingSoon && (
                  <span className="text-[8px] font-extrabold px-1.5 py-0.5 rounded-md bg-slate-800 text-slate-500 uppercase tracking-wider">
                    Soon
                  </span>
                )}
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
              className="mt-3 text-xs font-extrabold text-emerald-400 hover:text-emerald-300 underline"
            >
              Clear search
            </button>
          </div>
        )}
      </nav>

      {/* ─── FOOTER ─── */}
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

// ═══════════════════════════════════════════════════════════════
// NavItemLink — handles both active links AND coming-soon items
// ═══════════════════════════════════════════════════════════════
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

  // ─── COMING SOON ITEM — Elegant disabled style ───
  if (item.comingSoon) {
    return (
      <div
        className="group/item relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-bold text-slate-500 cursor-not-allowed select-none opacity-75 hover:opacity-100 transition"
        title="Coming soon — is feature pe kaam ho raha hai"
      >
        <div className="relative shrink-0">
          <Icon className="h-4 w-4 text-slate-600" />
        </div>
        <span className="truncate flex-1 text-slate-500">{item.label}</span>
        <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 uppercase tracking-wider shrink-0 border border-slate-700/50">
          Soon
        </span>
        <Lock className="h-3 w-3 text-slate-600 shrink-0" />
      </div>
    );
  }

  // ─── ACTIVE LINK ───
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
              ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-900/50 ring-1 ring-emerald-400/50'
              : 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-900/50'
            : isFavorite
              ? 'text-slate-200 hover:bg-slate-800 hover:text-white hover:translate-x-0.5'
              : 'text-slate-400 hover:bg-slate-800/70 hover:text-white hover:translate-x-0.5',
        ].join(' ')
      }
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="truncate flex-1">{item.label}</span>
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
