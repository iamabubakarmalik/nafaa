import React, { memo, useEffect, useMemo, useRef, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  LogOut,
  Sparkles,
  Store,
  ChevronRight,
  Users,
  ShoppingCart,
  Receipt,
  Truck,
  PackagePlus,
  Tag,
  Wallet,
  Activity,
  BarChart3,
  Settings as SettingsIcon,
  ScanLine,
  ShieldCheck,
  BookOpen,
  ClipboardCheck,
  AlertTriangle,
  Menu,
  X,
  Building2,
  ArrowRightLeft,
  Download,
  Database,
  RotateCcw,
  Award,
  Percent,
  TrendingUp,
  CreditCard,
  Gift,
  Gauge,
  Hash,
  UserCircle,
  LifeBuoy,
  ScrollText,
} from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/store/auth.store';
import { authApi } from '@/api/auth.api';
import { toast } from 'sonner';
import GlobalSearch from '@/components/search/GlobalSearch';
import NotificationBell from '@/components/notifications/NotificationBell';
import { Logo } from '@/components/brand/Logo';
import { hasPermission, PERMISSIONS, type PermissionKey } from '@/lib/permissions';

const SIDEBAR_SCROLL_KEY = 'nafaa-sidebar-scroll';

type NavItem = {
  to: string;
  label: string;
  icon: any;
  permission?: PermissionKey;
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
      { to: '/team', label: 'Team', icon: ShieldCheck, permission: PERMISSIONS.TEAM_VIEW },
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
  userEmail?: string;
  role?: any;
  permissions?: string[];
  onLogout: () => void;
  onItemClick?: () => void;
};

const SidebarContent = memo(function SidebarContent({
  tenantName,
  userEmail,
  role,
  permissions,
  onLogout,
  onItemClick,
}: SidebarContentProps) {
  const navRef = useRef<HTMLElement | null>(null);

  const filteredGroups = useMemo(() => {
    return navGroups
      .map((group) => ({
        ...group,
        items: group.items.filter((item) =>
          item.permission
            ? hasPermission(role, permissions, item.permission)
            : true,
        ),
      }))
      .filter((group) => group.items.length > 0);
  }, [role, permissions]);

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
      <div className="px-6 py-6 border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-3">
          <Logo size={44} />
          <div>
            <div className="text-lg font-bold text-white">Nafaa</div>
            <div className="text-xs text-slate-400">Pakistan-first retail OS</div>
          </div>
        </div>
      </div>

      <div className="px-4 py-4 border-b border-slate-800 shrink-0">
        <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-xl bg-brand-600/20 flex items-center justify-center shrink-0">
              <Store className="h-5 w-5 text-brand-400" />
            </div>
            <div className="min-w-0">
              <div className="font-semibold truncate text-white">
                {tenantName || 'My Store'}
              </div>
              <div className="text-xs text-slate-400 truncate">
                {userEmail || 'user@example.com'}
              </div>
            </div>
          </div>
        </div>
      </div>

      <nav
        ref={navRef}
        className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-3 py-4 space-y-5 sidebar-scroll"
      >
        {filteredGroups.map((group) => (
          <div key={group.label}>
            <div className="px-3 mb-2 text-[11px] uppercase tracking-[0.18em] text-slate-500 font-semibold">
              {group.label}
            </div>

            <div className="space-y-1">
              {group.items.map((item) => {
                const Icon = item.icon;

                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={onItemClick}
                    className={({ isActive }) =>
                      [
                        'group flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200',
                        isActive
                          ? 'bg-brand-600 text-white shadow-soft'
                          : 'text-slate-300 hover:bg-slate-900 hover:text-white',
                      ].join(' ')
                    }
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-800 shrink-0">
        <Button
          variant="secondary"
          className="w-full justify-center"
          onClick={onLogout}
        >
          <LogOut className="h-4 w-4" />
          Logout
        </Button>
      </div>
    </>
  );
});

export default function AppShell() {
  const navigate = useNavigate();
  const { user, tenant, refreshToken, logout } = useAuthStore();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    try {
      if (refreshToken) {
        await authApi.logout(refreshToken);
      }
    } catch (error) {
    } finally {
      logout();
      toast.success('Logout ho gaya');
      navigate('/login');
    }
  };

  return (
    <div className="h-screen bg-slate-100 overflow-hidden">
      <div className="h-full grid lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="hidden lg:flex h-screen flex-col bg-slate-950 text-white border-r border-slate-800">
          <SidebarContent
            tenantName={tenant?.name}
            userEmail={user?.email}
            role={user?.role}
            permissions={user?.permissions}
            onLogout={handleLogout}
          />
        </aside>

        {mobileOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div
              className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
              onClick={() => setMobileOpen(false)}
            />

            <aside className="absolute left-0 top-0 bottom-0 w-72 max-w-[85vw] bg-slate-950 text-white flex flex-col shadow-2xl">
              <button
                onClick={() => setMobileOpen(false)}
                className="absolute top-4 right-4 z-10 h-9 w-9 rounded-lg bg-slate-800 flex items-center justify-center"
              >
                <X className="h-5 w-5" />
              </button>

              <SidebarContent
                tenantName={tenant?.name}
                userEmail={user?.email}
                role={user?.role}
                permissions={user?.permissions}
                onLogout={handleLogout}
                onItemClick={() => setMobileOpen(false)}
              />
            </aside>
          </div>
        )}

        <div className="min-w-0 h-screen flex flex-col overflow-hidden">
          <header className="sticky top-0 z-20 shrink-0 border-b border-slate-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80 print:hidden">
            <div className="px-4 sm:px-6 py-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <button
                  onClick={() => setMobileOpen(true)}
                  className="lg:hidden h-10 w-10 rounded-lg bg-slate-100 flex items-center justify-center shrink-0"
                >
                  <Menu className="h-5 w-5" />
                </button>

                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span>Nafaa</span>
                    <ChevronRight className="h-3 w-3 shrink-0" />
                    <span className="truncate">{tenant?.name}</span>
                  </div>

                  <h1 className="text-base sm:text-xl font-bold text-slate-900 truncate">
                    Assalam-o-Alaikum, {user?.fullName?.split(' ')[0] || 'User'} 👋
                  </h1>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <GlobalSearch />
                <NotificationBell />

                <div className="hidden sm:block text-right">
                  <div className="text-sm font-medium text-slate-900 truncate max-w-[180px]">
                    {user?.fullName}
                  </div>
                  <div className="text-xs text-slate-500 truncate max-w-[180px]">
                    {user?.role}
                  </div>
                </div>

                <div className="h-10 w-10 rounded-full bg-brand-600 text-white flex items-center justify-center font-semibold shrink-0">
                  {user?.fullName?.charAt(0)?.toUpperCase() || 'N'}
                </div>
              </div>
            </div>
          </header>

          <main className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 print:p-0 print:overflow-visible">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
