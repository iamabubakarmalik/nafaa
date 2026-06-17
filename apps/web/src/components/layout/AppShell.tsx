import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { NavLink, Outlet, useNavigate, Link } from 'react-router-dom';
import {
  LayoutDashboard, Package, LogOut, Sparkles, Store, ChevronRight,
  Users, ShoppingCart, Receipt, Truck, PackagePlus, Tag, Wallet,
  Activity, BarChart3, Settings as SettingsIcon, ScanLine, ShieldCheck,
  BookOpen, ClipboardCheck, AlertTriangle, Menu, X, Building2,
  ArrowRightLeft, Download, Database, RotateCcw, Award, Percent,
  TrendingUp, CreditCard, Gift, Gauge, Hash, UserCircle, LifeBuoy,
  ScrollText, Eye, UserCog, CheckCircle2, Wallet2, Plus, ChevronDown,
  User, KeyRound, HelpCircle, Search, Bell, Scissors, FileSpreadsheet,Layers,
} from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/store/auth.store';
import { authApi } from '@/api/auth.api';
import { toast } from 'sonner';
import GlobalSearch from '@/components/search/GlobalSearch';
import NotificationBell from '@/components/notifications/NotificationBell';
import ShopSelector from '@/components/shops/ShopSelector';
import { Logo } from '@/components/brand/Logo';
import { hasPermission, PERMISSIONS, type PermissionKey } from '@/lib/permissions';

const SIDEBAR_SCROLL_KEY = 'nafaa-sidebar-scroll';

type NavItem = {
  to: string;
  label: string;
  icon: any;
  permission?: PermissionKey;
  badge?: string;
};

const navGroups: { label: string; items: NavItem[] }[] = [
  {
    label: 'Overview',
    items: [
      { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { to: '/reports', label: 'Reports', icon: BarChart3, permission: PERMISSIONS.REPORTS_VIEW },
      { to: '/profit-report', label: 'Profit by Product', icon: TrendingUp, permission: PERMISSIONS.PROFIT_REPORT_VIEW },
    ],
  },
  {
    label: 'Sales',
    items: [
      { to: '/pos', label: 'POS', icon: ShoppingCart, permission: PERMISSIONS.POS_USE },
      { to: '/sales', label: 'Sales History', icon: Receipt, permission: PERMISSIONS.SALES_VIEW },
      { to: '/returns', label: 'Returns', icon: RotateCcw, permission: PERMISSIONS.RETURNS_VIEW },
      { to: '/customers', label: 'Customers', icon: Users, permission: PERMISSIONS.CUSTOMERS_VIEW },
      { to: '/khata', label: 'Khata (Udhaar)', icon: BookOpen, permission: PERMISSIONS.KHATA_VIEW },
      { to: '/loyalty', label: 'Loyalty Points', icon: Award, permission: PERMISSIONS.LOYALTY_VIEW },
      { to: '/discounts', label: 'Discount Codes', icon: Percent, permission: PERMISSIONS.DISCOUNTS_VIEW },
      { to: '/cash-register', label: 'Cash Register', icon: Wallet, permission: PERMISSIONS.CASH_REGISTER_VIEW },
    ],
  },
  {
    label: 'Inventory',
    items: [
      { to: '/products', label: 'Products', icon: Package, permission: PERMISSIONS.PRODUCTS_VIEW },
      { to: '/catalog', label: 'Catalog', icon: Eye, permission: PERMISSIONS.PRODUCTS_VIEW, badge: 'NEW' },
      { to: '/brands', label: 'Brands', icon: Building2, permission: PERMISSIONS.BRANDS_VIEW },
      { to: '/tags', label: 'Tags', icon: Hash, permission: PERMISSIONS.TAGS_VIEW },
      { to: '/categories', label: 'Categories', icon: Tag, permission: PERMISSIONS.CATEGORIES_VIEW },
      { to: '/low-stock', label: 'Low Stock Alerts', icon: AlertTriangle, permission: PERMISSIONS.LOW_STOCK_VIEW },
      { to: '/barcode-labels', label: 'Barcode Labels', icon: ScanLine, permission: PERMISSIONS.BARCODE_LABELS_VIEW },
      { to: '/stock-movements', label: 'Stock Movements', icon: Activity, permission: PERMISSIONS.STOCK_MOVEMENTS_VIEW },
      { to: '/stock-adjustments', label: 'Adjustments', icon: ClipboardCheck, permission: PERMISSIONS.STOCK_ADJUSTMENTS_MANAGE },
      { to: '/transfers', label: 'Stock Transfers', icon: ArrowRightLeft, permission: PERMISSIONS.STOCK_TRANSFERS_MANAGE },
      { to: '/suppliers', label: 'Suppliers', icon: Truck, permission: PERMISSIONS.SUPPLIERS_VIEW },
      { to: '/purchases', label: 'Purchases', icon: PackagePlus, permission: PERMISSIONS.PURCHASES_VIEW },
    ],
  },
  {
    label: 'Carpet Industry',
    items: [
      { to: '/carpet-rolls', label: 'Carpet Rolls', icon: Layers, badge: 'NEW' },
      { to: '/carpet-cut-pieces', label: 'Cut Pieces', icon: Scissors },
      { to: '/carpet-reports', label: 'Carpet Reports', icon: BarChart3 },
      { to: '/carpet-bulk-import', label: 'Bulk Import', icon: FileSpreadsheet },
    ],
  },
  {
    label: 'Staff Management',
    items: [
      { to: '/staff', label: 'All Staff', icon: UserCog, permission: PERMISSIONS.STAFF_VIEW },
      { to: '/staff/attendance', label: 'Attendance', icon: CheckCircle2, permission: PERMISSIONS.STAFF_VIEW },
      { to: '/staff/salary/new', label: 'Process Salary', icon: Wallet2, permission: PERMISSIONS.STAFF_MANAGE },
    ],
  },
  {
    label: 'Finance & Plan',
    items: [
      { to: '/expenses', label: 'Expenses', icon: Wallet, permission: PERMISSIONS.EXPENSES_VIEW },
      { to: '/billing', label: 'Billing', icon: CreditCard, permission: PERMISSIONS.BILLING_VIEW },
      { to: '/plans', label: 'Plans', icon: Sparkles, permission: PERMISSIONS.PLANS_VIEW },
      { to: '/plan-usage', label: 'Plan Usage', icon: Gauge, permission: PERMISSIONS.PLAN_USAGE_VIEW },
      { to: '/referrals', label: 'Referrals', icon: Gift, permission: PERMISSIONS.REFERRALS_VIEW },
    ],
  },
  {
    label: 'Data',
    items: [
      { to: '/exports', label: 'Exports', icon: Download, permission: PERMISSIONS.EXPORTS_VIEW },
      { to: '/backup', label: 'Backup', icon: Database, permission: PERMISSIONS.BACKUP_MANAGE },
    ],
  },
  {
    label: 'System',
    items: [
      { to: '/notifications', label: 'Notifications', icon: Bell },
      { to: '/team', label: 'Team (App Users)', icon: ShieldCheck, permission: PERMISSIONS.TEAM_VIEW },
      { to: '/shops', label: 'Shops / Branches', icon: Building2, permission: PERMISSIONS.SHOPS_VIEW },
      { to: '/activity-log', label: 'Activity Log', icon: Activity, permission: PERMISSIONS.ACTIVITY_VIEW },
      { to: '/profile', label: 'My Profile', icon: UserCircle },
      { to: '/help', label: 'Help Center', icon: LifeBuoy },
      { to: '/legal', label: 'Terms & Privacy', icon: ScrollText },
      { to: '/settings', label: 'Settings', icon: SettingsIcon, permission: PERMISSIONS.SETTINGS_VIEW },
    ],
  },
];

type SidebarContentProps = {
  tenantName?: string;
  tenantSlug?: string;
  businessType?: string;
  role?: any;
  permissions?: string[];
  onItemClick?: () => void;
};

const SidebarContent = memo(function SidebarContent({
  tenantName,
  tenantSlug,
  businessType,
  role,
  permissions,
  onItemClick,
}: SidebarContentProps) {
  const navRef = useRef<HTMLElement | null>(null);

  const filteredGroups = useMemo(() => {
    const isCarpet = (businessType ?? '').toUpperCase().includes('CARPET') ||
                     (businessType ?? '').toUpperCase().includes('FLOORING');

    return navGroups
      .filter((group) => {
        // Carpet Industry sirf carpet business type ko dikhe
        if (group.label === 'Carpet Industry' && !isCarpet) return false;
        return true;
      })
      .map((group) => ({
        ...group,
        items: group.items.filter((item) =>
          item.permission
            ? hasPermission(role, permissions, item.permission)
            : true,
        ),
      }))
      .filter((group) => group.items.length > 0);
  }, [role, permissions, businessType]);

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
      {/* ─── TOP: Branded Shop Card ─── */}
      <div className="px-4 pt-5 pb-4 border-b border-slate-800/60 shrink-0">
        <div className="relative rounded-2xl bg-gradient-to-br from-brand-600 via-brand-700 to-emerald-800 p-4 shadow-xl shadow-brand-900/30 overflow-hidden">
          {/* Decorative blur */}
          <div className="absolute -top-8 -right-8 h-24 w-24 rounded-full bg-emerald-400/20 blur-2xl" />
          <div className="absolute -bottom-8 -left-8 h-24 w-24 rounded-full bg-amber-400/10 blur-2xl" />

          <div className="relative">
            {/* Logo + Brand */}
            <div className="flex items-center gap-2.5 mb-3">
              <div className="h-10 w-10 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center shadow-md ring-1 ring-white/20">
                <Logo size={28} />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-bold uppercase tracking-wider text-white/70">
                  Nafaa
                </div>
                <div className="text-[10px] text-white/60 font-semibold">
                  Pakistan retail OS
                </div>
              </div>
            </div>

            {/* Shop info */}
            <div className="flex items-start gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center shrink-0">
                <Store className="h-4 w-4 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-extrabold text-white truncate text-sm leading-tight">
                  {tenantName || 'My Store'}
                </div>
                <div className="mt-1 flex items-center gap-1 flex-wrap">
                  {businessType && (
                    <span className="px-1.5 py-0.5 rounded-md bg-white/20 backdrop-blur text-[9px] font-bold text-white">
                      {businessType.replace('_', ' ')}
                    </span>
                  )}
                  {tenantSlug && (
                    <span className="text-[9px] text-white/70 font-mono truncate">
                      @{tenantSlug}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── NAV ─── */}
      <nav
        ref={navRef}
        className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-3 py-4 space-y-5 sidebar-scroll"
      >
        {filteredGroups.map((group) => (
          <div key={group.label}>
            <div className="px-3 mb-2 text-[10px] uppercase tracking-[0.18em] text-slate-500 font-bold">
              {group.label}
            </div>
            <div className="space-y-1">
              {group.items.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === '/staff' || item.to === '/products'}
                    onClick={onItemClick}
                    className={({ isActive }) =>
                      [
                        'group flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all duration-200',
                        isActive
                          ? 'bg-brand-600 text-white shadow-md shadow-brand-900/40'
                          : 'text-slate-300 hover:bg-slate-800/80 hover:text-white',
                      ].join(' ')
                    }
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="truncate flex-1">{item.label}</span>
                    {item.badge && (
                      <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-full bg-amber-500 text-white shrink-0 shadow">
                        {item.badge}
                      </span>
                    )}
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* ─── BOTTOM ─── */}
      <div className="px-4 py-3 border-t border-slate-800/60 shrink-0">
        <div className="rounded-xl bg-gradient-to-br from-amber-500/10 to-amber-600/5 border border-amber-500/20 p-3">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="h-3.5 w-3.5 text-amber-400" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300">Pro Tip</span>
          </div>
          <p className="text-[11px] text-slate-300 leading-snug">
            Settings → Business Type me apne shop ke features customize karein
          </p>
        </div>
      </div>
    </>
  );
});

// ════════════════════════════════════════════════════════════
// PROFILE DROPDOWN
// ════════════════════════════════════════════════════════════
function ProfileDropdown({
  user, tenant, onLogout,
}: { user: any; tenant: any; onLogout: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const initial = user?.fullName?.charAt(0)?.toUpperCase() || 'N';

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-2 p-1 pr-2.5 rounded-2xl transition ${
          open
            ? 'bg-slate-100 ring-2 ring-brand-500/30'
            : 'hover:bg-slate-100'
        }`}
      >
        {user?.avatarUrl ? (
          <img
            src={user.avatarUrl}
            alt={user.fullName}
            className="h-9 w-9 rounded-xl object-cover ring-2 ring-white shadow"
          />
        ) : (
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-brand-500 to-emerald-700 text-white flex items-center justify-center font-bold shadow ring-2 ring-white">
            {initial}
          </div>
        )}
        <div className="hidden md:block text-left">
          <div className="text-xs font-bold text-slate-900 truncate max-w-[140px]">
            {user?.fullName || 'User'}
          </div>
          <div className="text-[10px] text-slate-500 truncate max-w-[140px] font-semibold uppercase tracking-wider">
            {user?.role}
          </div>
        </div>
        <ChevronDown className={`h-3.5 w-3.5 text-slate-500 transition-transform hidden md:block ${open ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown menu */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-72 rounded-2xl bg-white border border-slate-200 shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-1 duration-150">
          {/* User card */}
          <div className="px-4 py-4 border-b border-slate-100 bg-gradient-to-br from-slate-50 to-white">
            <div className="flex items-center gap-3">
              {user?.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.fullName}
                  className="h-12 w-12 rounded-2xl object-cover ring-2 ring-white shadow"
                />
              ) : (
                <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-brand-500 to-emerald-700 text-white flex items-center justify-center text-lg font-extrabold shadow">
                  {initial}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="font-extrabold text-slate-900 truncate">{user?.fullName}</div>
                <div className="text-xs text-slate-500 truncate">{user?.email}</div>
                <div className="mt-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-700">
                  {user?.role}
                </div>
              </div>
            </div>
          </div>

          {/* Shop info */}
          {tenant && (
            <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
                <Store className="h-4 w-4 text-emerald-700" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Current Shop</div>
                <div className="text-sm font-bold text-slate-900 truncate">{tenant.name}</div>
              </div>
            </div>
          )}

          {/* Menu items */}
          <div className="py-1">
            <MenuItem to="/profile" icon={User} label="My Profile" onClick={() => setOpen(false)} />
            <MenuItem to="/settings" icon={SettingsIcon} label="Settings" onClick={() => setOpen(false)} />
            <MenuItem to="/billing" icon={CreditCard} label="Billing & Plans" onClick={() => setOpen(false)} />
            <MenuItem to="/shops" icon={Building2} label="Shops / Branches" onClick={() => setOpen(false)} />
          </div>

          <div className="border-t border-slate-100 py-1">
            <MenuItem to="/help" icon={HelpCircle} label="Help Center" onClick={() => setOpen(false)} />
            <MenuItem to="/legal" icon={ScrollText} label="Terms & Privacy" onClick={() => setOpen(false)} />
          </div>

          <div className="border-t border-slate-100 py-1">
            <button
              onClick={() => {
                setOpen(false);
                onLogout();
              }}
              className="w-full px-4 py-2.5 flex items-center gap-3 text-sm font-semibold text-rose-600 hover:bg-rose-50 transition"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function MenuItem({ to, icon: Icon, label, onClick }: { to: string; icon: any; label: string; onClick: () => void }) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className="w-full px-4 py-2.5 flex items-center gap-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
    >
      <Icon className="h-4 w-4 text-slate-400" />
      <span className="flex-1">{label}</span>
      <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
    </Link>
  );
}

// ════════════════════════════════════════════════════════════
// QUICK ACTIONS DROPDOWN
// ════════════════════════════════════════════════════════════
function QuickActionsDropdown({ role, permissions }: { role: any; permissions: string[] | undefined }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const actions = [
    { to: '/pos', label: 'New Sale', icon: ShoppingCart, color: 'emerald', permission: PERMISSIONS.POS_USE },
    { to: '/products/new', label: 'Add Product', icon: Package, color: 'blue', permission: PERMISSIONS.PRODUCTS_CREATE },
    { to: '/customers/new', label: 'Add Customer', icon: Users, color: 'violet', permission: PERMISSIONS.CUSTOMERS_EDIT },
    { to: '/expenses', label: 'Add Expense', icon: Wallet, color: 'amber', permission: PERMISSIONS.EXPENSES_VIEW },
    { to: '/purchases', label: 'New Purchase', icon: PackagePlus, color: 'pink', permission: PERMISSIONS.PURCHASES_VIEW },
    { to: '/staff/attendance', label: 'Mark Attendance', icon: CheckCircle2, color: 'cyan', permission: PERMISSIONS.STAFF_VIEW },
  ].filter((a) => !a.permission || hasPermission(role, permissions, a.permission));

  const colorMap: Record<string, string> = {
    emerald: 'bg-emerald-100 text-emerald-700',
    blue: 'bg-blue-100 text-blue-700',
    violet: 'bg-violet-100 text-violet-700',
    amber: 'bg-amber-100 text-amber-700',
    pink: 'bg-pink-100 text-pink-700',
    cyan: 'bg-cyan-100 text-cyan-700',
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={`h-10 inline-flex items-center gap-2 px-3.5 rounded-xl text-sm font-bold transition shadow-sm ${
          open
            ? 'bg-brand-700 text-white'
            : 'bg-brand-600 hover:bg-brand-700 text-white'
        }`}
      >
        <Plus className="h-4 w-4" />
        <span className="hidden sm:inline">Quick</span>
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-64 rounded-2xl bg-white border border-slate-200 shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="px-4 py-3 border-b border-slate-100 bg-gradient-to-br from-slate-50 to-white">
            <div className="text-[10px] uppercase tracking-wider font-bold text-slate-500">Quick Actions</div>
            <div className="text-sm font-bold text-slate-900 mt-0.5">Fast shortcuts</div>
          </div>
          <div className="p-2">
            {actions.map((a) => {
              const Icon = a.icon;
              return (
                <Link
                  key={a.to}
                  to={a.to}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 transition"
                >
                  <div className={`h-9 w-9 rounded-xl flex items-center justify-center ${colorMap[a.color]}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <span className="text-sm font-bold text-slate-900 flex-1">{a.label}</span>
                  <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// MAIN SHELL
// ════════════════════════════════════════════════════════════
export default function AppShell() {
  const navigate = useNavigate();
  const { user, tenant, refreshToken, logout } = useAuthStore();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    if (!confirm('Logout karna chahte hain?')) return;
    try {
      if (refreshToken) {
        await authApi.logout(refreshToken);
      }
    } catch {
      // silent
    } finally {
      logout();
      toast.success('Logout ho gaya');
      navigate('/login');
    }
  };

  return (
    <div className="h-screen bg-slate-100 overflow-hidden">
      <div className="h-full grid lg:grid-cols-[280px_minmax(0,1fr)]">
        {/* DESKTOP SIDEBAR */}
        <aside className="hidden lg:flex h-screen flex-col bg-gradient-to-b from-slate-950 to-slate-900 text-white border-r border-slate-800/50">
          <SidebarContent
            tenantName={tenant?.name}
            tenantSlug={tenant?.slug}
            businessType={(tenant as any)?.businessType}
            role={user?.role}
            permissions={user?.permissions}
          />
        </aside>

        {/* MOBILE SIDEBAR */}
        {mobileOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div
              className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
              onClick={() => setMobileOpen(false)}
            />
            <aside className="absolute left-0 top-0 bottom-0 w-72 max-w-[85vw] bg-gradient-to-b from-slate-950 to-slate-900 text-white flex flex-col shadow-2xl">
              <button
                onClick={() => setMobileOpen(false)}
                className="absolute top-4 right-4 z-10 h-9 w-9 rounded-lg bg-slate-800 flex items-center justify-center"
              >
                <X className="h-5 w-5" />
              </button>
              <SidebarContent
                tenantName={tenant?.name}
                tenantSlug={tenant?.slug}
                businessType={(tenant as any)?.businessType}
                role={user?.role}
                permissions={user?.permissions}
                onItemClick={() => setMobileOpen(false)}
              />
            </aside>
          </div>
        )}

        {/* MAIN */}
        <div className="min-w-0 h-screen flex flex-col overflow-hidden">
          {/* HEADER */}
          <header className="sticky top-0 z-30 shrink-0 border-b border-slate-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80 print:hidden">
            <div className="px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
              {/* Left side */}
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <button
                  onClick={() => setMobileOpen(true)}
                  className="lg:hidden h-10 w-10 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center shrink-0 transition"
                >
                  <Menu className="h-5 w-5" />
                </button>

                <div className="min-w-0 hidden sm:block">
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-semibold">
                    <Sparkles className="h-3 w-3 text-amber-500" />
                    <span>Welcome back</span>
                  </div>
                  <h1 className="text-base sm:text-lg font-extrabold text-slate-900 truncate leading-tight">
                    Assalam-o-Alaikum, {user?.fullName?.split(' ')[0] || 'User'} 👋
                  </h1>
                </div>

                {/* Mobile compact greeting */}
                <div className="sm:hidden min-w-0">
                  <h1 className="text-sm font-extrabold text-slate-900 truncate">
                    {user?.fullName?.split(' ')[0] || 'User'} 👋
                  </h1>
                </div>
              </div>

              {/* Right side */}
              <div className="flex items-center gap-2 shrink-0">
                {/* Search — bigger and visible */}
                <div className="hidden md:block">
                  <GlobalSearch />
                </div>

                {/* Mobile search button */}
                <button
                  className="md:hidden h-10 w-10 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition"
                  onClick={() => {
                    // trigger global search
                    const evt = new KeyboardEvent('keydown', { key: 'k', metaKey: true });
                    document.dispatchEvent(evt);
                  }}
                  title="Search"
                >
                  <Search className="h-4 w-4 text-slate-600" />
                </button>

                {/* Shop Selector — Multi-shop switcher */}
                <ShopSelector />

                {/* Quick Actions */}
                <QuickActionsDropdown role={user?.role} permissions={user?.permissions} />

                {/* Notifications */}
                <div className="relative">
                  <NotificationBell />
                </div>

                {/* Profile dropdown */}
                <ProfileDropdown user={user} tenant={tenant} onLogout={handleLogout} />
              </div>
            </div>
          </header>

          {/* MAIN CONTENT */}
          <main className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 print:p-0 print:overflow-visible">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
