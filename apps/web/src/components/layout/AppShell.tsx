import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Package, LogOut, Sparkles, Store, ChevronRight,
  Users, ShoppingCart, Receipt, Truck, PackagePlus, Tag, Wallet,
  Activity, BarChart3, Settings as SettingsIcon, ScanLine, ShieldCheck,
  BookOpen, ClipboardCheck, AlertTriangle, Menu, X, Building2,
  ArrowRightLeft, Download, Database, RotateCcw, Award, Percent,
  TrendingUp, CreditCard, Gift, Gauge,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/store/auth.store';
import { authApi } from '@/api/auth.api';
import { toast } from 'sonner';
import GlobalSearch from '@/components/search/GlobalSearch';
import NotificationBell from '@/components/notifications/NotificationBell';

const navGroups = [
  {
    label: 'Overview',
    items: [
      { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { to: '/reports', label: 'Reports', icon: BarChart3 },
      { to: '/profit-report', label: 'Profit by Product', icon: TrendingUp },
    ],
  },
  {
    label: 'Sales',
    items: [
      { to: '/pos', label: 'POS', icon: ShoppingCart },
      { to: '/sales', label: 'Sales History', icon: Receipt },
      { to: '/returns', label: 'Returns', icon: RotateCcw },
      { to: '/customers', label: 'Customers', icon: Users },
      { to: '/khata', label: 'Khata (Udhaar)', icon: BookOpen },
      { to: '/loyalty', label: 'Loyalty Points', icon: Award },
      { to: '/discounts', label: 'Discount Codes', icon: Percent },
      { to: '/cash-register', label: 'Cash Register', icon: Wallet },
    ],
  },
  {
    label: 'Inventory',
    items: [
      { to: '/products', label: 'Products', icon: Package },
      { to: '/categories', label: 'Categories', icon: Tag },
      { to: '/low-stock', label: 'Low Stock Alerts', icon: AlertTriangle },
      { to: '/barcode-labels', label: 'Barcode Labels', icon: ScanLine },
      { to: '/stock-movements', label: 'Stock Movements', icon: Activity },
      { to: '/stock-adjustments', label: 'Adjustments', icon: ClipboardCheck },
      { to: '/transfers', label: 'Stock Transfers', icon: ArrowRightLeft },
      { to: '/suppliers', label: 'Suppliers', icon: Truck },
      { to: '/purchases', label: 'Purchases', icon: PackagePlus },
    ],
  },
  {
    label: 'Finance & Plan',
    items: [
      { to: '/expenses', label: 'Expenses', icon: Wallet },
      { to: '/billing', label: 'Billing', icon: CreditCard },
      { to: '/plans', label: 'Plans', icon: Sparkles },
      { to: '/plan-usage', label: 'Plan Usage', icon: Gauge },
      { to: '/referrals', label: 'Referrals', icon: Gift },
    ],
  },
  {
    label: 'Data',
    items: [
      { to: '/exports', label: 'Exports', icon: Download },
      { to: '/backup', label: 'Backup', icon: Database },
    ],
  },
  {
    label: 'System',
    items: [
      { to: '/team', label: 'Team', icon: ShieldCheck },
      { to: '/shops', label: 'Shops / Branches', icon: Building2 },
      { to: '/activity-log', label: 'Activity Log', icon: Activity },
      { to: '/settings', label: 'Settings', icon: SettingsIcon },
    ],
  },
];

export default function AppShell() {
  const navigate = useNavigate();
  const { user, tenant, refreshToken, logout } = useAuthStore();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    try {
      if (refreshToken) await authApi.logout(refreshToken);
    } catch {}
    logout();
    toast.success('Logout ho gaya');
    navigate('/login');
  };

  const SidebarContent = () => (
    <>
      <div className="px-6 py-6 border-b border-slate-800 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shadow-soft">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div>
            <div className="font-bold text-lg">Nafaa</div>
            <div className="text-xs text-slate-400">Pakistan-first retail OS</div>
          </div>
        </div>
      </div>

      <div className="px-4 py-4 border-b border-slate-800 flex-shrink-0">
        <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-xl bg-brand-600/20 flex items-center justify-center flex-shrink-0">
              <Store className="h-5 w-5 text-brand-400" />
            </div>
            <div className="min-w-0">
              <div className="font-semibold truncate">{tenant?.name}</div>
              <div className="text-xs text-slate-400 truncate">{user?.email}</div>
            </div>
          </div>
        </div>
      </div>

      <nav className="flex-1 min-h-0 px-3 py-4 space-y-5 overflow-y-auto sidebar-scroll">
        {navGroups.map((group) => (
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
                    onClick={() => setMobileOpen(false)}
                    className={({ isActive }) =>
                      [
                        'flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all',
                        isActive
                          ? 'bg-brand-600 text-white shadow-soft'
                          : 'text-slate-300 hover:bg-slate-900 hover:text-white',
                      ].join(' ')
                    }
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-800 flex-shrink-0">
        <Button variant="secondary" className="w-full justify-center" onClick={handleLogout}>
          <LogOut className="h-4 w-4" />
          Logout
        </Button>
      </div>
    </>
  );

  return (
    <div className="h-screen overflow-hidden bg-slate-100">
      <div className="grid lg:grid-cols-[280px_1fr] h-full">
        {/* Desktop Sidebar — FIXED, scrolls independently */}
        <aside className="hidden lg:flex flex-col bg-slate-950 text-white border-r border-slate-800 h-screen sticky top-0 print:hidden">
          <SidebarContent />
        </aside>

        {/* Mobile Sidebar Overlay */}
        {mobileOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div className="absolute inset-0 bg-slate-950/80" onClick={() => setMobileOpen(false)} />
            <aside className="absolute left-0 top-0 bottom-0 w-72 bg-slate-950 text-white flex flex-col shadow-2xl">
              <button
                onClick={() => setMobileOpen(false)}
                className="absolute top-4 right-4 h-9 w-9 rounded-lg bg-slate-800 flex items-center justify-center z-10"
              >
                <X className="h-5 w-5" />
              </button>
              <SidebarContent />
            </aside>
          </div>
        )}

        {/* Main Content Area — scrolls independently */}
        <div className="flex flex-col min-w-0 h-screen overflow-hidden">
          <header className="bg-white border-b border-slate-200 sticky top-0 z-20 flex-shrink-0 print:hidden">
            <div className="px-4 sm:px-6 py-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <button
                  onClick={() => setMobileOpen(true)}
                  className="lg:hidden h-10 w-10 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0"
                >
                  <Menu className="h-5 w-5" />
                </button>

                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span>Nafaa</span>
                    <ChevronRight className="h-3 w-3" />
                    <span className="truncate">{tenant?.name}</span>
                  </div>
                  <h1 className="text-base sm:text-xl font-bold text-slate-900 truncate">
                    Assalam-o-Alaikum, {user?.fullName?.split(' ')[0] || 'User'} 👋
                  </h1>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <GlobalSearch />
                <NotificationBell />

                <div className="hidden sm:block text-right">
                  <div className="text-sm font-medium text-slate-900">{user?.fullName}</div>
                  <div className="text-xs text-slate-500">{user?.role}</div>
                </div>
                <div className="h-10 w-10 rounded-full bg-brand-600 text-white flex items-center justify-center font-semibold flex-shrink-0">
                  {user?.fullName?.charAt(0)?.toUpperCase() || 'N'}
                </div>
              </div>
            </div>
          </header>

          {/* This is the ONLY scrollable area for page content */}
          <main className="flex-1 overflow-y-auto p-4 sm:p-6 print:p-0 print:overflow-visible">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}