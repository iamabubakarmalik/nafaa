import { memo, useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Package, Sparkles, Users, ShoppingCart, Receipt, PackagePlus, Tag, Wallet, Activity, BarChart3, Settings as SettingsIcon,
  ScanLine, BookOpen, ClipboardCheck, AlertTriangle,
  ArrowRightLeft, Download, Database, RotateCcw, Award, Percent, TrendingUp, Gift, Gauge, Hash, UserCircle, LifeBuoy, ScrollText, Eye,
  UserCog, CheckCircle2, Wallet2,
  BookmarkPlus, ChevronDown, ChevronRight, ShieldCheck, CreditCard, Bell, Building2, Truck,
  Search, X, Star, StarOff, PanelLeftClose, Settings,
  Store, Megaphone, MessageCircle, Brain, Bike, Globe, Trophy, Navigation, Zap,FileText, Shield,
  Command, Clock,
} from 'lucide-react';
import { Logo } from '@core/components/brand/Logo';
import { hasPermission, PERMISSIONS, type PermissionKey } from '@core/lib/permissions';
import { useCurrentIndustry } from '@industries/_shared/registry/useCurrentIndustry';
import type { IndustryNavGroup, IndustryNavItem } from '@industries/_shared/types/industry-pack';
import { useWorkspaceStore, WORKSPACES } from '@core/stores/workspace.store';

const SIDEBAR_SCROLL_KEY = 'nafaa-sidebar-scroll';
const SIDEBAR_GROUPS_KEY = 'nafaa-sidebar-groups-v7';
const SIDEBAR_FAVORITES_KEY = 'nafaa-sidebar-favorites-v5';
const SIDEBAR_RECENT_KEY = 'nafaa-sidebar-recent-v1';
const MAX_RECENT = 5;

type NavItem = {
  to: string;
  label: string;
  icon: any;
  permission?: PermissionKey;
  badge?: string;
  hot?: boolean;
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

// ═══════════════════════════════════════════════════════════════
// POS WORKSPACE
// ═══════════════════════════════════════════════════════════════
const posNavGroups: NavGroup[] = [
  {
    label: 'Overview', icon: LayoutDashboard, emoji: '📊', color: '#10b981',
    defaultOpen: true, order: 0,
    items: [
      { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { to: '/reports', label: 'All Reports', icon: BarChart3, permission: PERMISSIONS.REPORTS_VIEW },
      { to: '/stock-report', label: 'Stock Report', icon: Package, permission: PERMISSIONS.REPORTS_VIEW },
      { to: '/profit-report', label: 'Profit by Product', icon: TrendingUp, permission: PERMISSIONS.PROFIT_REPORT_VIEW },
    ],
  },
  {
    label: 'Sales & Orders', icon: ShoppingCart, emoji: '🛒', color: '#059669',
    defaultOpen: true, order: 5,
    items: [
      { to: '/pos', label: 'POS Counter', icon: ShoppingCart, permission: PERMISSIONS.POS_USE, hot: true },
      { to: '/sales', label: 'Sales History', icon: Receipt, permission: PERMISSIONS.SALES_VIEW },
      { to: '/bookings', label: 'Bookings', icon: BookmarkPlus, permission: PERMISSIONS.SALES_VIEW },
      { to: '/returns', label: 'Returns', icon: RotateCcw, permission: PERMISSIONS.RETURNS_VIEW },
      { to: '/customers', label: 'Customers', icon: Users, permission: PERMISSIONS.CUSTOMERS_VIEW },
      { to: '/khata', label: 'Khata (Udhaar)', icon: BookOpen, permission: PERMISSIONS.KHATA_VIEW },
      { to: '/loyalty', label: 'Loyalty', icon: Award, permission: PERMISSIONS.LOYALTY_VIEW },
      { to: '/discounts', label: 'Discounts', icon: Percent, permission: PERMISSIONS.DISCOUNTS_VIEW },
      { to: '/cash-register', label: 'Cash Register', icon: Wallet, permission: PERMISSIONS.CASH_REGISTER_VIEW },
    ],
  },
  {
    label: 'Inventory', icon: Package, emoji: '📦', color: '#0891b2',
    defaultOpen: true, order: 10,
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
    label: 'Staff & Team', icon: UserCog, emoji: '👥', color: '#8b5cf6', order: 93,
    items: [
      { to: '/staff', label: 'All Staff', icon: UserCog, permission: PERMISSIONS.STAFF_VIEW },
      { to: '/staff/attendance', label: 'Attendance', icon: CheckCircle2, permission: PERMISSIONS.STAFF_VIEW },
      { to: '/staff/salary/new', label: 'Process Salary', icon: Wallet2, permission: PERMISSIONS.STAFF_MANAGE },
      { to: '/team', label: 'App Users', icon: ShieldCheck, permission: PERMISSIONS.TEAM_VIEW },
    ],
  },
  {
    label: 'Finance', icon: Wallet, emoji: '💰', color: '#f59e0b', order: 95,
    items: [
      { to: '/expenses', label: 'Expenses', icon: Wallet, permission: PERMISSIONS.EXPENSES_VIEW },
      { to: '/billing', label: 'Billing', icon: CreditCard, permission: PERMISSIONS.BILLING_VIEW },
      { to: '/plans', label: 'Plans', icon: Sparkles, permission: PERMISSIONS.PLANS_VIEW },
      { to: '/plan-usage', label: 'Plan Usage', icon: Gauge, permission: PERMISSIONS.PLAN_USAGE_VIEW },
      { to: '/referrals', label: 'Referrals', icon: Gift, permission: PERMISSIONS.REFERRALS_VIEW },
    ],
  },
  {
    label: 'System', icon: SettingsIcon, emoji: '⚙️', color: '#64748b', order: 100,
    items: [
      { to: '/notifications', label: 'Notifications', icon: Bell },
      { to: '/integrations', label: 'Integrations', icon: Zap },
      { to: '/fbr', label: 'FBR Setup', icon: Shield, badge: 'NEW' },
      { to: '/fbr/invoices', label: 'FBR Invoices', icon: FileText },
      { to: '/fbr/reports', label: 'Monthly Reports', icon: TrendingUp },
      { to: '/fbr/analytics', label: 'Analytics', icon: BarChart3 },
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

// ═══════════════════════════════════════════════════════════════
// MARKETPLACE WORKSPACE
// ═══════════════════════════════════════════════════════════════
const marketplaceNavGroups: NavGroup[] = [
  {
    label: 'Overview', icon: LayoutDashboard, emoji: '🎯', color: '#a855f7',
    defaultOpen: true, order: 0,
    items: [
      { to: '/marketplace/dashboard', label: 'Dashboard', icon: LayoutDashboard, permission: PERMISSIONS.SETTINGS_VIEW, hot: true },
      { to: '/marketplace/analytics', label: 'Analytics', icon: BarChart3, permission: PERMISSIONS.REPORTS_VIEW },
      { to: '/marketplace/sales-funnel', label: 'Sales Funnel', icon: TrendingUp, permission: PERMISSIONS.REPORTS_VIEW },
      { to: '/marketplace/ai-insights', label: 'AI Insights', icon: Brain, permission: PERMISSIONS.SETTINGS_VIEW, badge: 'AI' },
    ],
  },
  {
    label: 'Storefront', icon: Store, emoji: '🏪', color: '#ec4899',
    defaultOpen: true, order: 5,
    items: [
      { to: '/marketplace/shop-profile', label: 'Shop Profile', icon: Store, permission: PERMISSIONS.SETTINGS_VIEW },
      { to: '/marketplace/products', label: 'Products', icon: Package, permission: PERMISSIONS.PRODUCTS_VIEW },
      { to: '/marketplace/settings', label: 'Publish Settings', icon: Globe, permission: PERMISSIONS.SETTINGS_VIEW },
    ],
  },
  {
    label: 'Orders & Fulfillment', icon: ShoppingCart, emoji: '📦', color: '#f97316',
    defaultOpen: true, order: 10,
    items: [
      { to: '/marketplace/orders', label: 'Orders', icon: ShoppingCart, permission: PERMISSIONS.SALES_VIEW, hot: true },
      { to: '/marketplace/delivery', label: 'Delivery', icon: Bike, permission: PERMISSIONS.SETTINGS_VIEW },
      { to: '/marketplace/rider-tracking', label: 'Rider Tracking', icon: Navigation, permission: PERMISSIONS.SETTINGS_VIEW, badge: 'LIVE' },
    ],
  },
  {
    label: 'Customer Engagement', icon: MessageCircle, emoji: '💬', color: '#3b82f6', order: 15,
    items: [
      { to: '/marketplace/reviews', label: 'Reviews', icon: Star, permission: PERMISSIONS.SETTINGS_VIEW },
      { to: '/marketplace/messages', label: 'Messages', icon: MessageCircle, permission: PERMISSIONS.SETTINGS_VIEW },
      { to: '/marketplace/bargains', label: 'Bargains', icon: MessageCircle, permission: PERMISSIONS.SETTINGS_VIEW },
      { to: '/marketplace/segments', label: 'Customer Segments', icon: Users, permission: PERMISSIONS.SETTINGS_VIEW },
    ],
  },
  {
    label: 'Sales Boosters', icon: Zap, emoji: '⚡', color: '#eab308', order: 20,
    items: [
      { to: '/marketplace/group-buys', label: 'Group Buys', icon: Users, permission: PERMISSIONS.SETTINGS_VIEW },
      { to: '/marketplace/auctions', label: 'Auctions', icon: Sparkles, permission: PERMISSIONS.SETTINGS_VIEW },
      { to: '/marketplace/live-shop', label: 'Live Shop', icon: Sparkles, permission: PERMISSIONS.SETTINGS_VIEW, badge: 'NEW' },
    ],
  },
  {
    label: 'Marketing', icon: Megaphone, emoji: '📣', color: '#dc2626', order: 25,
    items: [
      { to: '/marketplace/promotions', label: 'Promotions', icon: Megaphone, permission: PERMISSIONS.SETTINGS_VIEW },
      { to: '/marketplace/coupons-advanced', label: 'Coupons Advanced', icon: Tag, permission: PERMISSIONS.SETTINGS_VIEW },
      { to: '/marketplace/loyalty', label: 'Loyalty & Rewards', icon: Trophy, permission: PERMISSIONS.SETTINGS_VIEW },
    ],
  },
  {
    label: 'Multi-Shop', icon: Building2, emoji: '🏢', color: '#06b6d4', order: 90,
    items: [
      { to: '/marketplace/multi-shop', label: 'Multi-Shop Manager', icon: Building2, permission: PERMISSIONS.SETTINGS_VIEW },
    ],
  },
  {
    label: 'System', icon: SettingsIcon, emoji: '⚙️', color: '#64748b', order: 100,
    items: [
      { to: '/marketplace/notifications', label: 'Notifications', icon: Bell, permission: PERMISSIONS.SETTINGS_VIEW },
      { to: '/marketplace/settings-hub', label: 'Settings Hub', icon: Settings, permission: PERMISSIONS.SETTINGS_VIEW },
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
      badge: (it as any).badge,
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
  try { const raw = localStorage.getItem(SIDEBAR_GROUPS_KEY); if (raw) return JSON.parse(raw); } catch {}
  return {};
};
const saveGroupState = (state: Record<string, boolean>) => {
  try { localStorage.setItem(SIDEBAR_GROUPS_KEY, JSON.stringify(state)); } catch {}
};
const loadFavorites = (): string[] => {
  try { const raw = localStorage.getItem(SIDEBAR_FAVORITES_KEY); if (raw) return JSON.parse(raw); } catch {}
  return ['/dashboard', '/pos', '/sales', '/customers', '/products', '/khata'];
};
const saveFavorites = (favs: string[]) => {
  try { localStorage.setItem(SIDEBAR_FAVORITES_KEY, JSON.stringify(favs)); } catch {}
};
const loadRecent = (): string[] => {
  try { const raw = localStorage.getItem(SIDEBAR_RECENT_KEY); if (raw) return JSON.parse(raw); } catch {}
  return [];
};
const pushRecent = (path: string) => {
  try {
    const current = loadRecent().filter((p) => p !== path);
    const next = [path, ...current].slice(0, MAX_RECENT);
    localStorage.setItem(SIDEBAR_RECENT_KEY, JSON.stringify(next));
    return next;
  } catch { return []; }
};

export const Sidebar = memo(function Sidebar({
  tenantName, tenantSlug, businessType, role, permissions, onItemClick, onCollapse,
}: Props) {
  const navRef = useRef<HTMLElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const location = useLocation();
  const [search, setSearch] = useState('');
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => loadGroupState());
  const [favoritePaths, setFavoritePaths] = useState<string[]>(() => loadFavorites());
  const [recentPaths, setRecentPaths] = useState<string[]>(() => loadRecent());

  const industry = useCurrentIndustry();
  const { activeWorkspace } = useWorkspaceStore();
  const workspace = WORKSPACES[activeWorkspace];
  const isMarketplace = activeWorkspace === 'marketplace';

  // Track recent visits
  useEffect(() => {
    if (location.pathname && location.pathname !== '/') {
      setRecentPaths(pushRecent(location.pathname));
    }
  }, [location.pathname]);

  // Keyboard: Cmd+K to focus search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      }
      if (e.key === 'Escape' && search) {
        setSearch('');
        searchInputRef.current?.blur();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [search]);

  const allGroups = useMemo<NavGroup[]>(() => {
    if (isMarketplace) {
      return [...marketplaceNavGroups].sort((a, b) => (a.order ?? 100) - (b.order ?? 100));
    }
    const industryGroups = industry?.navGroups?.map(fromIndustryGroup) ?? [];
    return [...posNavGroups, ...industryGroups].sort(
      (a, b) => (a.order ?? 100) - (b.order ?? 100),
    );
  }, [industry, isMarketplace]);

  const allItemsByPath = useMemo(() => {
    const map = new Map<string, NavItem>();
    for (const group of allGroups) for (const item of group.items) map.set(item.to, item);
    return map;
  }, [allGroups]);

  const filteredGroups = useMemo(() => {
    return allGroups
      .map((group) => ({
        ...group,
        items: group.items.filter((item) =>
          item.permission ? hasPermission(role, permissions, item.permission) : true
        ),
      }))
      .filter((group) => group.items.length > 0);
  }, [allGroups, role, permissions]);

  const visiblePathSet = useMemo(() => {
    const set = new Set<string>();
    for (const g of filteredGroups) for (const item of g.items) set.add(item.to);
    return set;
  }, [filteredGroups]);

  const favoriteItems = useMemo(() => {
    return favoritePaths
      .map((p) => allItemsByPath.get(p))
      .filter((item): item is NavItem => !!item && visiblePathSet.has(item.to));
  }, [favoritePaths, allItemsByPath, visiblePathSet]);

  const recentItems = useMemo(() => {
    return recentPaths
      .map((p) => allItemsByPath.get(p))
      .filter((item): item is NavItem => !!item && visiblePathSet.has(item.to))
      .filter((item) => !favoritePaths.includes(item.to))
      .slice(0, 5);
  }, [recentPaths, allItemsByPath, visiblePathSet, favoritePaths]);

  const isFavorite = useCallback((path: string) => favoritePaths.includes(path), [favoritePaths]);

  const toggleFavorite = useCallback((path: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setFavoritePaths((prev) => {
      const next = prev.includes(path) ? prev.filter((p) => p !== path) : [...prev, path];
      saveFavorites(next);
      return next;
    });
  }, []);

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

  const isGroupOpen = useCallback((group: NavGroup) => {
    if (searchQuery) return true;
    const userState = openGroups[group.label];
    if (userState !== undefined) return userState;
    return group.defaultOpen ?? false;
  }, [searchQuery, openGroups]);

  const toggleGroup = useCallback((label: string, currentlyOpen: boolean) => {
    setOpenGroups((prev) => {
      const next = { ...prev, [label]: !currentlyOpen };
      saveGroupState(next);
      return next;
    });
  }, []);

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
    const saved = sessionStorage.getItem(`${SIDEBAR_SCROLL_KEY}-${activeWorkspace}`);
    if (saved) nav.scrollTop = Number(saved);
    const handleScroll = () => sessionStorage.setItem(`${SIDEBAR_SCROLL_KEY}-${activeWorkspace}`, String(nav.scrollTop));
    nav.addEventListener('scroll', handleScroll, { passive: true });
    return () => nav.removeEventListener('scroll', handleScroll);
  }, [activeWorkspace]);

  // Dynamic header gradient per workspace / industry
  const headerGradient = isMarketplace
    ? 'linear-gradient(135deg, #a855f7 0%, #ec4899 50%, #f43f5e 100%)'
    : industry?.themeColor
      ? `linear-gradient(135deg, ${industry.themeColor} 0%, ${industry.themeColor}dd 50%, ${industry.themeColor}aa 100%)`
      : 'linear-gradient(135deg, #16a34a 0%, #059669 50%, #047857 100%)';

  const accentColor = isMarketplace ? '#a855f7' : (industry?.themeColor || '#10b981');

  return (
    <>
      {/* ═══ HEADER — Premium brand card ═══ */}
      <div className="px-3 pt-3 pb-2 shrink-0">
        <div
          className="relative rounded-2xl p-3.5 shadow-xl overflow-hidden transition-all duration-500 ring-1 ring-white/10"
          style={{ background: headerGradient }}
        >
          {/* Ambient blobs */}
          <div className="absolute -top-10 -right-10 h-28 w-28 rounded-full bg-white/15 blur-3xl" />
          <div className="absolute -bottom-10 -left-10 h-24 w-24 rounded-full bg-amber-400/25 blur-3xl" />
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent" />

          {/* Workspace pill */}
          <div className="relative flex items-center gap-1.5 mb-2.5">
            <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-white/20 backdrop-blur-sm ring-1 ring-white/25">
              <Sparkles className="h-2.5 w-2.5 text-amber-300" />
              <span className="text-[9px] uppercase tracking-widest font-black text-white leading-none">
                {workspace.shortLabel}
              </span>
            </div>
            <span className="text-base leading-none ml-auto opacity-80">{workspace.emoji}</span>
          </div>

          <div className="relative flex items-center gap-2.5">
            <div className="h-11 w-11 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-inner ring-1 ring-white/30 shrink-0 transition-transform hover:scale-105">
              {isMarketplace ? (
                <Store className="h-5 w-5 text-white" />
              ) : industry?.emoji ? (
                <span className="text-2xl leading-none">{industry.emoji}</span>
              ) : (
                <Logo size={24} />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-black text-white truncate text-[14px] leading-tight tracking-tight">
                {tenantName || 'My Store'}
              </div>
              <div className="flex items-center gap-1 mt-0.5">
                {!isMarketplace && industry ? (
                  <span className="px-1.5 py-0.5 rounded-md bg-black/20 backdrop-blur-sm text-[9px] font-black text-white uppercase tracking-wider">
                    {industry.emoji} {industry.shortName ?? industry.name}
                  </span>
                ) : !isMarketplace && businessType ? (
                  <span className="px-1.5 py-0.5 rounded-md bg-black/20 backdrop-blur-sm text-[9px] font-black text-white uppercase tracking-wider">
                    {businessType.replace(/_/g, ' ')}
                  </span>
                ) : null}
                {tenantSlug && (
                  <span className="text-[10px] text-white/70 font-mono truncate">@{tenantSlug}</span>
                )}
              </div>
            </div>
            {onCollapse && (
              <button
                onClick={onCollapse}
                className="h-9 w-9 rounded-xl bg-white/15 hover:bg-white/30 backdrop-blur-sm text-white flex items-center justify-center transition shrink-0 active:scale-90 ring-1 ring-white/20"
                title="Hide sidebar (⌘B)"
              >
                <PanelLeftClose className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ═══ SEARCH + CONTROLS ═══ */}
      <div className="px-3 pb-2 shrink-0 space-y-1.5">
        <div className="relative group">
          <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none group-focus-within:text-white transition" />
          <input
            ref={searchInputRef}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search menu..."
            className={`h-10 w-full rounded-xl bg-slate-800/70 border border-slate-700/70 pl-9 pr-16 text-[13px] font-semibold text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:bg-slate-800 transition ${
              isMarketplace
                ? 'focus:border-purple-500 focus:ring-purple-500/25'
                : 'focus:border-emerald-500 focus:ring-emerald-500/25'
            }`}
          />
          {search ? (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 rounded-md hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : (
            <kbd className="absolute right-2 top-1/2 -translate-y-1/2 hidden lg:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-slate-700/70 border border-slate-600/70 font-mono text-[9px] font-bold text-slate-300 pointer-events-none">
              <Command className="h-2.5 w-2.5" />K
            </kbd>
          )}
        </div>

        {searchQuery ? (
          <div className={`text-[10px] font-bold text-center py-0.5 rounded-md ${
            totalSearchMatches === 0 ? 'text-slate-500' : isMarketplace ? 'text-purple-300' : 'text-emerald-300'
          }`}>
            {totalSearchMatches === 0 ? 'No matches' : `${totalSearchMatches} result${totalSearchMatches > 1 ? 's' : ''}`}
          </div>
        ) : (
          <div className="flex items-center gap-1">
            <button
              onClick={expandAll}
              className="flex-1 h-6 rounded-md bg-slate-800/50 hover:bg-slate-700/70 text-[9px] font-black text-slate-400 hover:text-white transition uppercase tracking-wider"
            >
              Expand
            </button>
            <button
              onClick={collapseAll}
              className="flex-1 h-6 rounded-md bg-slate-800/50 hover:bg-slate-700/70 text-[9px] font-black text-slate-400 hover:text-white transition uppercase tracking-wider"
            >
              Collapse
            </button>
          </div>
        )}
      </div>

      {/* ═══ NAV ═══ */}
      <nav
        ref={navRef}
        className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-2.5 pb-3 space-y-3 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-slate-700/50"
      >
        {/* FAVORITES */}
        {searchedFavorites.length > 0 && (
          <SectionBlock
            icon={Star}
            iconClass="text-amber-400 fill-amber-400"
            label="Favorites"
            count={searchedFavorites.length}
            labelColor="text-amber-400"
          >
            {searchedFavorites.map((item) => (
              <NavItemLink
                key={item.to}
                item={item}
                onItemClick={onItemClick}
                isFavorite
                isFav={isFavorite(item.to)}
                onToggleFav={(e) => toggleFavorite(item.to, e)}
                isMarketplace={isMarketplace}
                accentColor={accentColor}
              />
            ))}
          </SectionBlock>
        )}

        {/* RECENT */}
        {!searchQuery && recentItems.length > 0 && (
          <SectionBlock
            icon={Clock}
            iconClass="text-slate-400"
            label="Recent"
            count={recentItems.length}
            labelColor="text-slate-400"
          >
            {recentItems.map((item) => (
              <NavItemLink
                key={`recent-${item.to}`}
                item={item}
                onItemClick={onItemClick}
                isFav={isFavorite(item.to)}
                onToggleFav={(e) => toggleFavorite(item.to, e)}
                isMarketplace={isMarketplace}
                accentColor={accentColor}
                muted
              />
            ))}
          </SectionBlock>
        )}

        {/* GROUPS */}
        {searchedGroups.map((group) => {
          const isOpen = isGroupOpen(group);
          const GroupIcon = group.icon;
          const accent = group.color;

          return (
            <div key={group.label} className="space-y-1">
              <button
                onClick={() => toggleGroup(group.label, isOpen)}
                className="w-full px-2 py-1.5 flex items-center gap-2 rounded-lg hover:bg-slate-800/60 transition group/header text-left"
              >
                {group.emoji ? (
                  <span className="text-[13px] leading-none shrink-0">{group.emoji}</span>
                ) : (
                  <GroupIcon className="h-3 w-3 shrink-0" style={accent ? { color: accent } : undefined} />
                )}
                <span
                  className="text-[10px] uppercase tracking-widest font-black flex-1 group-hover/header:brightness-125 transition"
                  style={{ color: accent || '#94a3b8' }}
                >
                  {group.label}
                </span>
                <span className="text-[9px] font-black text-slate-600 group-hover/header:text-slate-400 px-1 py-0.5 rounded bg-slate-800/50">
                  {group.items.length}
                </span>
                <ChevronRight
                  className={`h-3 w-3 text-slate-500 group-hover/header:text-slate-300 transition-transform ${
                    isOpen ? 'rotate-90' : ''
                  }`}
                />
              </button>
              {isOpen && (
                <div className="space-y-0.5 animate-in slide-in-from-top-1 fade-in duration-150">
                  {group.items.map((item) => (
                    <NavItemLink
                      key={item.to}
                      item={item}
                      onItemClick={onItemClick}
                      isFav={isFavorite(item.to)}
                      onToggleFav={(e) => toggleFavorite(item.to, e)}
                      isMarketplace={isMarketplace}
                      accentColor={accentColor}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {/* EMPTY STATE */}
        {searchedFavorites.length === 0 && searchedGroups.length === 0 && (
          <div className="px-4 py-12 text-center">
            <div className="h-16 w-16 rounded-2xl bg-slate-800/60 mx-auto flex items-center justify-center mb-3 ring-1 ring-slate-700">
              <Search className="h-7 w-7 text-slate-600" />
            </div>
            <div className="text-sm font-black text-slate-300">No matches</div>
            <div className="text-xs text-slate-500 mt-1 font-semibold">Try different keywords</div>
            <button
              onClick={() => setSearch('')}
              className={`mt-3 text-xs font-black underline transition ${
                isMarketplace ? 'text-purple-400 hover:text-purple-300' : 'text-emerald-400 hover:text-emerald-300'
              }`}
            >
              Clear search
            </button>
          </div>
        )}
      </nav>

      {/* ═══ FOOTER ═══ */}
      <div className="px-3 py-2.5 border-t border-slate-800/70 shrink-0 space-y-2 bg-gradient-to-b from-transparent to-slate-900/50">
        <div
          className={`rounded-xl p-2.5 border ring-1 ring-inset transition ${
            isMarketplace
              ? 'bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/25 ring-purple-500/10'
              : 'bg-gradient-to-br from-amber-500/10 to-orange-500/10 border-amber-500/25 ring-amber-500/10'
          }`}
        >
          <div className="flex items-start gap-2">
            <Sparkles className={`h-3 w-3 shrink-0 mt-0.5 ${isMarketplace ? 'text-purple-400' : 'text-amber-400'}`} />
            <p className="text-[10px] text-slate-300 leading-snug font-medium">
              <span className={`font-black ${isMarketplace ? 'text-purple-300' : 'text-amber-300'}`}>Tip:</span>{' '}
              {isMarketplace ? 'Switch to POS anytime ⌘⇧W' : 'Click ⭐ next to menu items to pin them'}
            </p>
          </div>
        </div>
        <div className="flex items-center justify-between px-1 text-[9px] font-black text-slate-500">
          <span className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Nafaa · {workspace.shortLabel}
          </span>
          <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-[9px] text-slate-400">
            ⌘B
          </kbd>
        </div>
      </div>
    </>
  );
});

// ═══════════════════════════════════════════════════════════════
// SectionBlock — Reusable section header + items
// ═══════════════════════════════════════════════════════════════
function SectionBlock({
  icon: Icon, iconClass, label, count, labelColor, children,
}: {
  icon: any;
  iconClass?: string;
  label: string;
  count: number;
  labelColor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <div className="px-2 flex items-center gap-1.5">
        <Icon className={`h-3 w-3 ${iconClass || ''}`} />
        <span className={`text-[10px] uppercase tracking-widest font-black ${labelColor}`}>
          {label}
        </span>
        <span className="text-[9px] font-black text-slate-600 ml-auto px-1 py-0.5 rounded bg-slate-800/50">
          {count}
        </span>
      </div>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// NavItemLink — Premium item with active bar indicator
// ═══════════════════════════════════════════════════════════════
function NavItemLink({
  item, onItemClick, isFavorite, isFav, onToggleFav, isMarketplace, accentColor, muted,
}: {
  item: NavItem;
  onItemClick?: () => void;
  isFavorite?: boolean;
  isFav: boolean;
  onToggleFav: (e: React.MouseEvent) => void;
  isMarketplace?: boolean;
  accentColor?: string;
  muted?: boolean;
}) {
  const Icon = item.icon;

  const activeGradient = isMarketplace
    ? 'bg-gradient-to-r from-purple-600/95 to-pink-600/95 shadow-purple-900/40'
    : 'bg-gradient-to-r from-emerald-600/95 to-teal-600/95 shadow-emerald-900/40';

  return (
    <NavLink
      to={item.to}
      end={item.to === '/staff' || item.to === '/products'}
      onClick={onItemClick}
      className={({ isActive }) =>
        [
          'group/item relative flex items-center gap-2.5 rounded-xl pl-3 pr-2 py-2 text-[12.5px] font-bold transition-all duration-150',
          isActive
            ? `${activeGradient} text-white shadow-lg ring-1 ring-white/10`
            : muted
              ? 'text-slate-500 hover:bg-slate-800/60 hover:text-slate-200 hover:translate-x-0.5'
              : isFavorite
                ? 'text-slate-200 hover:bg-slate-800/70 hover:text-white hover:translate-x-0.5'
                : 'text-slate-400 hover:bg-slate-800/60 hover:text-white hover:translate-x-0.5',
        ].join(' ')
      }
    >
      {({ isActive }) => (
        <>
          {/* Active left indicator bar */}
          {isActive && (
            <span
              className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 rounded-r-full bg-white shadow-lg"
              style={{ boxShadow: `0 0 8px ${accentColor}` }}
            />
          )}

          <div className="relative shrink-0">
            <Icon className="h-3.5 w-3.5" />
            {item.hot && (
              <span className="absolute -top-1 -right-1 h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse ring-2 ring-slate-900" />
            )}
          </div>
          <span className="truncate flex-1">{item.label}</span>

          {item.badge && (
            <span
              className={`text-[8px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-wider shrink-0 shadow-sm ${
                item.badge === 'LIVE'
                  ? 'bg-rose-500 text-white animate-pulse'
                  : item.badge === 'NEW'
                    ? 'bg-emerald-500 text-white'
                    : item.badge === 'AI'
                      ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                      : item.badge === 'FAST'
                        ? 'bg-orange-500 text-white'
                        : 'bg-amber-500 text-white'
              }`}
            >
              {item.badge}
            </span>
          )}

          <button
            onClick={onToggleFav}
            className={`h-5 w-5 rounded-md flex items-center justify-center transition shrink-0 ${
              isFav
                ? 'opacity-100 text-amber-400 hover:text-amber-300 hover:bg-amber-500/15'
                : 'opacity-0 group-hover/item:opacity-100 text-slate-500 hover:text-amber-400 hover:bg-slate-700/60'
            }`}
            title={isFav ? 'Remove from favorites' : 'Add to favorites'}
          >
            {isFav ? <Star className="h-3 w-3 fill-current" /> : <StarOff className="h-3 w-3" />}
          </button>
        </>
      )}
    </NavLink>
  );
}
