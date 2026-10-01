import { useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuthStore } from '@core/stores/auth.store';
import { authApi } from '@modules/auth/api/auth.api';
import { Sidebar } from './parts/Sidebar';
import { MobileSidebar } from './parts/MobileSidebar';
import { Topbar } from './parts/Topbar';
import { SettingsShell } from './parts/SettingsShell';
import { isSettingsPath, LAST_APP_PATH_KEY } from './parts/navConfig';
import { DesktopUpdateBanner } from '@modules/desktop/components/DesktopUpdateBanner';
import { DesktopStatusBar } from '@modules/desktop/components/DesktopStatusBar';
import { useRealtimeNotifications } from '@core/hooks/useRealtimeNotifications';
import { ErrorBoundary } from '@core/components/ErrorBoundary';
import { PageLockGate } from '@core/security/PageLockGate';
import { usePrivacyStore } from '@core/stores/privacy.store';
import { useDesktopNavigation, useDesktopShortcuts, useDesktopTheme } from '@core/lib/desktop/useDesktop';
import { useDesktopScanner } from '@core/hooks/useDesktopScanner';
import { useHardwareBoot } from '@core/hardware/HardwareBoot';
import { usePayQrs } from '@core/payments/payQr';
import { useGoogleReviewLink } from '@integrations/google/google.api';
import { useTaxAuthorityBoot } from '@integrations/tax-authority/taxAuthority.api';
import { useDesktopAutoBackup } from '@core/lib/desktop/useDesktopAutoBackup';
import { useDesktopMemory, useDesktopPower } from '@core/lib/desktop/useDesktopMemory';
import { useDesktopDeepLink } from '@core/lib/desktop/useDesktopDeepLink';
import { OnlineOrderAlert } from '@integrations/online-orders/components/OnlineOrderAlert';
import { cn } from '@core/lib/cn';

const SIDEBAR_COLLAPSED_KEY = 'nafaa-sidebar-collapsed';

export default function AppShell() {
  useRealtimeNotifications();
  useDesktopNavigation();
  useDesktopShortcuts();
  useDesktopTheme();
  useDesktopScanner();
  useHardwareBoot();
  usePayQrs(); // bill par QR chhapne ke liye pehle se tayyar
  useGoogleReviewLink();
  useTaxAuthorityBoot();
  useDesktopAutoBackup();
  useDesktopMemory();
  useDesktopPower();
  useDesktopDeepLink();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, tenant, refreshToken, logout } = useAuthStore();

  // PIN lives on the server — fetch its state right after login
  const refreshPinStatus = usePrivacyStore((s) => s.refresh);
  useEffect(() => {
    if (user?.id) refreshPinStatus();
  }, [user?.id, refreshPinStatus]);

  const [mobileOpen, setMobileOpen] = useState(false);
  /** Collapsed = slim icon rail, not hidden — every page stays reachable */
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try { return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === 'true'; } catch { return false; }
  });
  useEffect(() => {
    try { localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(collapsed)); } catch { /* ignore */ }
  }, [collapsed]);

  // ⌘/Ctrl + B toggles the sidebar
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        setCollapsed((v) => !v);
      }
    };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, []);

  // Settings open like Shopify — full screen, no app sidebar. Remember where
  // the user came from so the X goes back there.
  const settingsMode = isSettingsPath(location.pathname);
  useEffect(() => {
    if (settingsMode) return;
    try { sessionStorage.setItem(LAST_APP_PATH_KEY, location.pathname + location.search); } catch { /* ignore */ }
  }, [settingsMode, location.pathname, location.search]);

  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  const handleLogout = async () => {
    if (!confirm('Log out of Nafaa?')) return;
    try {
      if (refreshToken) await authApi.logout(refreshToken);
    } catch { /* ignore */ } finally {
      logout();
      toast.success('Logged out');
      navigate('/login');
    }
  };

  const page = (
    <ErrorBoundary resetKey={location.pathname}>
      <PageLockGate>
        <Outlet />
      </PageLockGate>
    </ErrorBoundary>
  );

  return (
    <div className="h-screen-dvh overflow-hidden bg-[#f6f7f9] dark:bg-neutral-950">
      <div
        className={cn(
          'grid h-full transition-[grid-template-columns] duration-300 ease-out',
          settingsMode ? 'grid-cols-1' : collapsed ? 'lg:grid-cols-[72px_minmax(0,1fr)]' : 'lg:grid-cols-[272px_minmax(0,1fr)]',
        )}
      >
        {/* DESKTOP SIDEBAR */}
        {!settingsMode && (
          <aside className="hidden h-screen-dvh flex-col overflow-hidden border-r border-slate-200/80 bg-[#eef0f3] lg:flex dark:border-slate-800 dark:bg-slate-950 print:hidden">
            <Sidebar
              tenantName={tenant?.name}
              tenantSlug={tenant?.slug}
              businessType={(tenant as any)?.businessType}
              role={user?.role}
              permissions={user?.permissions}
              collapsed={collapsed}
              onToggleCollapse={() => setCollapsed((v) => !v)}
            />
          </aside>
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
        <div className="flex h-screen-dvh min-w-0 flex-col overflow-hidden">
          <Topbar user={user} tenant={tenant} onOpenMobileSidebar={() => setMobileOpen(true)} onLogout={handleLogout} />

          <main className={cn(
            'min-h-0 flex-1 overflow-y-auto print:overflow-visible print:p-0',
            settingsMode ? 'bg-[#f1f2f4] dark:bg-neutral-950' : 'bg-[#f6f7f9] p-4 sm:p-6 dark:bg-neutral-950',
          )}>
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

      {/* New online order — popup + sound on every page */}
      <OnlineOrderAlert />
    </div>
  );
}