import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  ShieldCheck, LayoutDashboard, Building2, Users, LogOut,
  Menu, X, ChevronRight, Sparkles, CreditCard, Gift, Activity,
  TrendingUp, Package, ShoppingCart, Receipt, Megaphone, Tag,
  Mail, Settings as SettingsIcon, Heart, Layers, Download, Bell,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/store/auth.store';
import { adminAuthApi } from '@/api/admin-auth.api';
import { toast } from 'sonner';
import NotificationBell from '@/components/notifications/NotificationBell';
import { Logo } from '@/components/brand/Logo';

const navGroups = [
  {
    label: 'Overview',
    items: [
      { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { to: '/analytics', label: 'Analytics', icon: TrendingUp },
      { to: '/health', label: 'System Health', icon: Heart },
      { to: '/notifications', label: 'Notifications', icon: Bell },
    ],
  },
  {
    label: 'Customers',
    items: [
      { to: '/tenants', label: 'Tenants (Shops)', icon: Building2 },
      { to: '/users', label: 'Users', icon: Users },
      { to: '/customers', label: 'All Customers', icon: Users },
    ],
  },
  {
    label: 'Business Data',
    items: [
      { to: '/products', label: 'All Products', icon: Package },
      { to: '/sales', label: 'All Sales', icon: ShoppingCart },
    ],
  },
  {
    label: 'Billing',
    items: [
      { to: '/billing', label: 'Payment Approvals', icon: CreditCard },
      { to: '/subscriptions', label: 'Subscriptions', icon: Sparkles },
      { to: '/plans', label: 'Plans', icon: Sparkles },
      { to: '/invoices', label: 'Invoices', icon: Receipt },
      { to: '/referrals', label: 'Referrals', icon: Gift },
      { to: '/platform-discounts', label: 'Promo Codes', icon: Tag },
    ],
  },
  {
    label: 'Communications',
    items: [
      { to: '/broadcast', label: 'Broadcast', icon: Megaphone },
      { to: '/email-templates', label: 'Email Templates', icon: Mail },
    ],
  },
  {
    label: 'System',
    items: [
      { to: '/activity', label: 'Activity Log', icon: Activity },
      { to: '/bulk-actions', label: 'Bulk Actions', icon: Layers },
      { to: '/exports', label: 'Exports', icon: Download },
      { to: '/settings', label: 'Settings', icon: SettingsIcon },
    ],
  },
];

export default function AdminShell() {
  const navigate = useNavigate();
  const { user, refreshToken, logout } = useAuthStore();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    try { if (refreshToken) await adminAuthApi.logout(refreshToken); } catch {}
    logout();
    toast.success('Logged out');
    navigate('/login');
  };

  const SidebarContent = () => (
    <>
      <div className="px-6 py-6 border-b border-admin-800/50 flex-shrink-0">
        <div className="flex items-center gap-3">
          <Logo size={44} />

          <div>
            <div className="font-bold text-lg text-white">Nafaa Admin</div>
            <div className="text-xs text-admin-300">Super Admin</div>
          </div>
        </div>
      </div>

      <div className="px-4 py-4 border-b border-admin-800/50 flex-shrink-0">
        <div className="rounded-2xl bg-admin-900/50 border border-admin-800/50 p-4">
          <div className="flex items-center gap-2 text-xs text-admin-300 mb-2">
            <Sparkles className="h-3 w-3" /> Logged in as
          </div>
          <div className="font-semibold text-white truncate">{user?.fullName}</div>
          <div className="text-xs text-admin-300 truncate">{user?.email}</div>
        </div>
      </div>

      <nav className="flex-1 min-h-0 px-3 py-4 space-y-5 overflow-y-auto sidebar-scroll">
        {navGroups.map((group) => (
          <div key={group.label}>
            <div className="px-3 mb-2 text-[11px] uppercase tracking-[0.18em] text-admin-400 font-semibold">
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
                          ? 'bg-admin-600 text-white shadow-soft'
                          : 'text-admin-200 hover:bg-admin-900/50 hover:text-white',
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

      <div className="p-4 border-t border-admin-800/50 flex-shrink-0">
        <Button variant="secondary" className="w-full justify-center" onClick={handleLogout}>
          <LogOut className="h-4 w-4" /> Logout
        </Button>
      </div>
    </>
  );

  return (
    <div className="h-screen overflow-hidden bg-slate-100">
      <div className="grid lg:grid-cols-[280px_1fr] h-full">
        {/* Desktop Sidebar — FIXED, scrolls independently */}
        <aside className="hidden lg:flex flex-col bg-admin-950 text-white border-r border-admin-800/50 h-screen sticky top-0">
          <SidebarContent />
        </aside>

        {/* Mobile Sidebar Overlay */}
        {mobileOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div className="absolute inset-0 bg-slate-950/80" onClick={() => setMobileOpen(false)} />
            <aside className="absolute left-0 top-0 bottom-0 w-72 bg-admin-950 text-white flex flex-col shadow-2xl">
              <button
                onClick={() => setMobileOpen(false)}
                className="absolute top-4 right-4 h-9 w-9 rounded-lg bg-admin-800 flex items-center justify-center z-10"
              >
                <X className="h-5 w-5" />
              </button>
              <SidebarContent />
            </aside>
          </div>
        )}

        {/* Main Content Area — scrolls independently */}
        <div className="flex flex-col min-w-0 h-screen overflow-hidden">
          <header className="bg-white border-b border-slate-200 sticky top-0 z-20 flex-shrink-0">
            <div className="px-4 sm:px-6 py-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <button
                  onClick={() => setMobileOpen(true)}
                  className="lg:hidden h-10 w-10 rounded-lg bg-slate-100 flex items-center justify-center"
                >
                  <Menu className="h-5 w-5" />
                </button>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span>Nafaa</span>
                    <ChevronRight className="h-3 w-3" />
                    <span>Admin</span>
                  </div>
                  <h1 className="text-base sm:text-xl font-bold text-slate-900 truncate">
                    Welcome back, {user?.fullName?.split(' ')[0] || 'Admin'} 👋
                  </h1>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <NotificationBell />

                <div className="hidden sm:block text-right">
                  <div className="text-sm font-medium text-slate-900">{user?.fullName}</div>
                  <div className="text-xs text-slate-500">Super Admin</div>
                </div>
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-admin-500 to-admin-700 text-white flex items-center justify-center font-semibold flex-shrink-0">
                  {user?.fullName?.charAt(0)?.toUpperCase() || 'A'}
                </div>
              </div>
            </div>
          </header>

          {/* This is the ONLY scrollable area for page content */}
          <main className="flex-1 overflow-y-auto p-4 sm:p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
