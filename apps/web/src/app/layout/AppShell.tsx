import { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { PanelLeft } from 'lucide-react';
import { useAuthStore } from '@core/stores/auth.store';
import { authApi } from '@modules/auth/api/auth.api';
import { Sidebar } from './parts/Sidebar';
import { MobileSidebar } from './parts/MobileSidebar';
import { Topbar } from './parts/Topbar';
import { DesktopUpdateBanner } from '@modules/desktop/components/DesktopUpdateBanner';
import { useRealtimeNotifications } from '@core/hooks/useRealtimeNotifications';
import { useFbrNotifications } from '@integrations/fbr/hooks/useFbrNotifications';

const SIDEBAR_COLLAPSED_KEY = 'nafaa-sidebar-collapsed';

export default function AppShell() {
  useFbrNotifications();
  useRealtimeNotifications();
  const navigate = useNavigate();
  const { user, tenant, refreshToken, logout } = useAuthStore();
  const [mobileOpen, setMobileOpen] = useState(false);

  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    try { return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === 'true'; } catch { return false; }
  });

  useEffect(() => {
    try { localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(sidebarCollapsed)); } catch {}
  }, [sidebarCollapsed]);

  // Cmd/Ctrl + B to toggle sidebar
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
        e.preventDefault();
        setSidebarCollapsed((v) => !v);
      }
    };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, []);

  const handleLogout = async () => {
    if (!confirm('Logout karna chahte hain?')) return;
    try {
      if (refreshToken) await authApi.logout(refreshToken);
    } catch {}
    finally {
      logout();
      toast.success('Logout ho gaya');
      navigate('/login');
    }
  };

  return (
    <div className="h-screen-dvh bg-slate-100 dark:bg-neutral-950 overflow-hidden">
      <div
        className={`h-full grid transition-[grid-template-columns] duration-300 ease-out ${
          sidebarCollapsed
            ? 'lg:grid-cols-[0px_minmax(0,1fr)]'
            : 'lg:grid-cols-[300px_minmax(0,1fr)]'
        }`}
      >
        {/* DESKTOP SIDEBAR */}
        <aside
          className={`hidden lg:flex h-screen-dvh flex-col bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900 text-white border-r border-slate-800/70 overflow-hidden transition-[width,opacity] duration-300 ${
            sidebarCollapsed ? 'w-0 opacity-0' : 'w-[300px] opacity-100'
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

        {/* Floating expand button */}
        {sidebarCollapsed && (
          <button
            onClick={() => setSidebarCollapsed(false)}
            className="hidden lg:flex fixed top-4 left-4 z-40 h-11 w-11 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 hover:from-slate-800 hover:to-slate-700 text-white shadow-2xl shadow-black/40 items-center justify-center transition-all hover:scale-105 border border-slate-700 group"
            title="Show sidebar (⌘B)"
          >
            <PanelLeft className="h-5 w-5 group-hover:scale-110 transition-transform" />
          </button>
        )}

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
        <div className="min-w-0 h-screen-dvh flex flex-col overflow-hidden">
          <Topbar
            user={user}
            tenant={tenant}
            onOpenMobileSidebar={() => setMobileOpen(true)}
            onLogout={handleLogout}
          />

          <main
            className={`flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 print:p-0 print:overflow-visible bg-slate-50 dark:bg-neutral-950 transition-[padding] ${
              sidebarCollapsed ? 'lg:pl-24' : ''
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
