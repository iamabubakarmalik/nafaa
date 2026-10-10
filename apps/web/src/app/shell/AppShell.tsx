/**
 * Layout for every signed-in page: sidebar, top bar and the scrolling content
 * area. Settings pages switch to a full-screen frame (SettingsShell) without
 * the app sidebar, like Shopify admin.
 *
 * Responsive behaviour:
 *  - below 1024px  the sidebar is a slide-in drawer (MobileSidebar);
 *  - 1024–1279px   the sidebar defaults to the 72px icon rail;
 *  - 1280px and up the full 264px sidebar.
 * Users can override the last two with Ctrl/⌘+B (see useSidebarState).
 */

import { useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuthStore } from '@core/stores/auth.store';
import { authApi } from '@modules/auth/api/auth.api';
import { DesktopUpdateBanner } from '@modules/desktop/components/DesktopUpdateBanner';
import { DesktopStatusBar } from '@modules/desktop/components/DesktopStatusBar';
import { ErrorBoundary } from '@core/components/ErrorBoundary';
import { PageLockGate } from '@core/security/PageLockGate';
import { OnlineOrderAlert } from '@integrations/online-orders/components/OnlineOrderAlert';
import { cn } from '@core/lib/cn';
import { isSettingsPath, LAST_APP_PATH_KEY } from './navigation/nav-config';
import { Sidebar } from './sidebar/Sidebar';
import { MobileSidebar } from './sidebar/MobileSidebar';
import { Topbar } from './topbar/Topbar';
import { SettingsShell } from './settings/SettingsShell';
import { useShellBoot } from './useShellBoot';
import { useSidebarState } from './useSidebarState';

export default function AppShell() {
  useShellBoot();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, tenant, refreshToken, logout } = useAuthStore();
  const { collapsed, toggle } = useSidebarState();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Settings remember the page the user came from, so closing them returns there.
  const settingsMode = isSettingsPath(location.pathname);
  useEffect(() => {
    if (settingsMode) return;
    try { sessionStorage.setItem(LAST_APP_PATH_KEY, location.pathname + location.search); } catch { /* storage unavailable */ }
  }, [settingsMode, location.pathname, location.search]);

  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  const handleLogout = async () => {
    if (!confirm('Log out of Nafaa?')) return;
    try {
      if (refreshToken) await authApi.logout(refreshToken);
    } catch {
      // Logging out locally is enough if the server call fails.
    } finally {
      logout();
      toast.success('Logged out');
      navigate('/login');
    }
  };

  const tenantProps = {
    tenantName: tenant?.name,
    tenantSlug: tenant?.slug,
    businessType: (tenant as { businessType?: string } | null)?.businessType,
    role: user?.role,
    permissions: user?.permissions,
  };

  const page = (
    <ErrorBoundary resetKey={location.pathname}>
      <PageLockGate>
        <Outlet />
      </PageLockGate>
    </ErrorBoundary>
  );

  return (
    <div className="h-screen-dvh overflow-hidden bg-shell-canvas">
      <div
        className={cn(
          'grid h-full transition-[grid-template-columns] duration-300 ease-out',
          settingsMode ? 'grid-cols-1' : collapsed ? 'lg:grid-cols-[72px_minmax(0,1fr)]' : 'lg:grid-cols-[264px_minmax(0,1fr)]',
        )}
      >
        {!settingsMode && (
          <aside className="hidden h-screen-dvh flex-col overflow-hidden border-r border-shell-line bg-shell-sidebar lg:flex print:hidden">
            <Sidebar {...tenantProps} collapsed={collapsed} onToggleCollapse={toggle} />
          </aside>
        )}

        <MobileSidebar open={mobileOpen} onClose={() => setMobileOpen(false)} {...tenantProps} />

        <div className="flex h-screen-dvh min-w-0 flex-col overflow-hidden">
          <Topbar user={user} tenant={tenant} onOpenMobileSidebar={() => setMobileOpen(true)} onLogout={handleLogout} />

          <main
            className={cn(
              'min-h-0 flex-1 overflow-y-auto [scrollbar-gutter:stable] print:overflow-visible print:p-0',
              settingsMode ? 'bg-shell-canvas' : 'bg-shell-canvas p-3 sm:p-5 xl:p-6',
            )}
          >
            <DesktopUpdateBanner />
            {settingsMode ? (
              <SettingsShell
                role={user?.role}
                permissions={user?.permissions}
                tenantName={tenant?.name}
                tenantSlug={tenant?.slug}
                userName={user?.fullName}
                userEmail={user?.email}
                avatarUrl={user?.avatarUrl}
              >
                {page}
              </SettingsShell>
            ) : page}
          </main>
          <DesktopStatusBar />
        </div>
      </div>

      {/* New online order: popup and sound on every page. */}
      <OnlineOrderAlert />
    </div>
  );
}
