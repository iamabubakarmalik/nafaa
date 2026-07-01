import { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { PanelLeft } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { authApi } from '@/api/auth.api';
import { Sidebar } from './parts/Sidebar';
import { MobileSidebar } from './parts/MobileSidebar';
import { Topbar } from './parts/Topbar';
import { DesktopUpdateBanner } from '@/features/desktop/components/DesktopUpdateBanner';

const SIDEBAR_COLLAPSED_KEY = 'nafaa-sidebar-collapsed';

export default function AppShell() {
  const navigate = useNavigate();
  const { user, tenant, refreshToken, logout } = useAuthStore();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Sidebar collapse state (persisted)
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(sidebarCollapsed));
    } catch {}
  }, [sidebarCollapsed]);

  const handleLogout = async () => {
    if (!confirm('Logout karna chahte hain?')) return;
    try {
      if (refreshToken) await authApi.logout(refreshToken);
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
      <div
        className={`h-full grid transition-all duration-300 ${
          sidebarCollapsed
            ? 'lg:grid-cols-[0px_minmax(0,1fr)]'
            : 'lg:grid-cols-[280px_minmax(0,1fr)]'
        }`}
      >
        {/* DESKTOP SIDEBAR — collapsible */}
        <aside
          className={`hidden lg:flex h-screen flex-col bg-gradient-to-b from-slate-950 to-slate-900 text-white border-r border-slate-800/50 overflow-hidden transition-all duration-300 ${
            sidebarCollapsed ? 'w-0 opacity-0' : 'w-[280px] opacity-100'
          }`}
        >
          {!sidebarCollapsed && (
            <Sidebar
              tenantName={tenant?.name}
              tenantSlug={tenant?.slug}
              businessType={(tenant as any)?.businessType}
              role={user?.role}
              permissions={user?.permissions}
              onCollapse={() => setSidebarCollapsed(true)}
            />
          )}
        </aside>

        {/* Floating expand button — visible only when collapsed on desktop */}
        {sidebarCollapsed && (
          <button
            onClick={() => setSidebarCollapsed(false)}
            className="hidden lg:flex fixed top-4 left-4 z-40 h-10 w-10 rounded-xl bg-slate-900 hover:bg-slate-800 text-white shadow-lg shadow-black/30 items-center justify-center transition border border-slate-700"
            title="Show sidebar"
          >
            <PanelLeft className="h-5 w-5" />
          </button>
        )}

        {/* MOBILE SIDEBAR */}
        <MobileSidebar
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          tenantName={tenant?.name}
          tenantSlug={tenant?.slug}
          businessType={(tenant as any)?.businessType}
          role={user?.role}
          permissions={user?.permissions}
        />

        {/* MAIN */}
        <div className="min-w-0 h-screen flex flex-col overflow-hidden">
          <Topbar
            user={user}
            tenant={tenant}
            onOpenMobileSidebar={() => setMobileOpen(true)}
            onLogout={handleLogout}
          />

          <main
            className={`flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 print:p-0 print:overflow-visible ${
              sidebarCollapsed ? 'lg:pl-20' : ''
            }`}
          >
            <DesktopUpdateBanner />
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
