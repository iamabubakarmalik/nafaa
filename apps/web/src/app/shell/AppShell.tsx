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
 *
 * Keyboard: skip links lead to the content or the menu; app-wide keys live in
 * keyboard/useGlobalKeys, list keys (↑ ↓ Enter…) apply to the content area,
 * and "?" shows every shortcut.
 */

import { confirmDialog } from '@/design-system/components';
import { useEffect, useRef, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuthStore } from '@core/stores/auth.store';
import { authApi } from '@modules/auth/api/auth.api';
import { DesktopUpdateBanner } from '@modules/desktop/components/DesktopUpdateBanner';
import { DesktopStatusBar } from '@modules/desktop/components/DesktopStatusBar';
import { ErrorBoundary } from '@core/components/ErrorBoundary';
import { PageLockGate } from '@core/security/PageLockGate';
import { OnlineOrderAlert } from '@integrations/online-orders/components/OnlineOrderAlert';
import { clearShopifyShop, pendingShopifyShop } from '@integrations/online-orders/lib/pendingShopify';
import { cn } from '@core/lib/cn';
import { useAppearance } from '@/design-system';
import { Kbd } from '@/design-system/components';
import { useDialogFocusManager, useListKeys, useSuggestKeys } from '@/design-system/keyboard';
import { isSettingsPath, LAST_APP_PATH_KEY } from './navigation/nav-config';
import { Sidebar } from './sidebar/Sidebar';
import { MobileSidebar } from './sidebar/MobileSidebar';
import { Topbar } from './topbar/Topbar';
import { GlobalSearchDialog } from './topbar/GlobalSearch';
import { SettingsShell } from './settings/SettingsShell';
import { useShellBoot } from './useShellBoot';
import { ShortcutsHelp, useShortcutsHelp } from './keyboard/ShortcutsHelp';
import { GO_TO, useGlobalKeys } from './keyboard/useGlobalKeys';
import { useSidebarState } from './useSidebarState';
import { AiDrawer, AiLauncher } from '@modules/ai-assistant';
import { t } from '@core/i18n';

const SKIP_LINK = 'pointer-events-auto -translate-y-16 rounded-xl bg-brand-600 px-4 py-2 text-[0.875rem] font-semibold text-brand-fg shadow-lg transition focus:translate-y-0';

export default function AppShell() {
  useShellBoot();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, tenant, refreshToken, logout } = useAuthStore();
  const { collapsed, toggle } = useSidebarState();
  const { sidebarStyle } = useAppearance();
  // "Dark" and "Brand" sidebars scope dark mode to the sidebar alone.
  const sidebarDark = sidebarStyle !== 'light';
  const sidebarSurface = sidebarDark
    ? ({ '--shell-sidebar': 'var(--shell-sidebar-dark)', '--shell-line': 'var(--shell-sidebar-dark-line)' } as React.CSSProperties)
    : undefined;
  const [mobileOpen, setMobileOpen] = useState(false);
  const mainRef = useRef<HTMLElement>(null);
  const openHelp = useShortcutsHelp((s) => s.setOpen);
  const { chord } = useGlobalKeys(mainRef, () => openHelp(true));
  // The POS counter has its own keys.
  const onPos = location.pathname.startsWith('/pos');
  useListKeys(mainRef, { global: true, enabled: !onPos });
  useSuggestKeys({ enabled: !onPos });
  useDialogFocusManager();

  // Settings remember the page the user came from, so closing them returns there.
  const settingsMode = isSettingsPath(location.pathname);
  useEffect(() => {
    if (settingsMode) return;
    try { sessionStorage.setItem(LAST_APP_PATH_KEY, location.pathname + location.search); } catch { /* storage unavailable */ }
  }, [settingsMode, location.pathname, location.search]);

  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  // Install started in Shopify before login → finish connecting that store
  useEffect(() => {
    const shop = pendingShopifyShop();
    if (!shop) return;
    clearShopifyShop();
    if (location.pathname !== '/shopify') navigate(`/shopify?shop=${encodeURIComponent(shop)}`, { replace: true });
  }, [location.pathname, navigate]);

  const handleLogout = async () => {
    if (!(await confirmDialog({ title: t('Nafaa se logout karein?') }))) return;
    try {
      if (refreshToken) await authApi.logout(refreshToken);
    } catch {
      // Logging out locally is enough if the server call fails.
    } finally {
      logout();
      toast.success(t('Logged out'));
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
      <div className="pointer-events-none fixed start-2 top-2 z-[100] flex gap-2">
        <a href="#main-content" className={SKIP_LINK}>{t('Seedha content par jayein')}</a>
        {!settingsMode && <a href="#main-nav" onClick={(e) => { e.preventDefault(); document.querySelector<HTMLElement>('nav[aria-label="Main"] a[href]')?.focus(); }} className={SKIP_LINK}>{t('Menu par jayein')}</a>}
      </div>
      <div
        className={cn(
          'grid h-full transition-[grid-template-columns] duration-300 ease-out',
          settingsMode ? 'grid-cols-1' : collapsed ? 'lg:grid-cols-[72px_minmax(0,1fr)]' : 'lg:grid-cols-[264px_minmax(0,1fr)]',
        )}
      >
        {!settingsMode && (
          <aside
            className={cn('hidden h-screen-dvh flex-col overflow-hidden border-e border-shell-line bg-shell-sidebar text-[rgb(var(--fg))] lg:flex print:hidden', sidebarDark && 'dark')}
            style={sidebarSurface}
          >
            <Sidebar {...tenantProps} collapsed={collapsed} onToggleCollapse={toggle} />
          </aside>
        )}

        <MobileSidebar open={mobileOpen} onClose={() => setMobileOpen(false)} dark={sidebarDark} surface={sidebarSurface} {...tenantProps} />

        {/* Page column and the Nafaa AI panel, which pushes the page narrower on wide screens. */}
        <div className="flex h-screen-dvh min-w-0 overflow-hidden">
        <div className="flex h-screen-dvh min-w-0 flex-1 flex-col overflow-hidden">
          <Topbar user={user} tenant={tenant} onOpenMobileSidebar={() => setMobileOpen(true)} onLogout={handleLogout} />

          <main
            ref={mainRef}
            id="main-content"
            tabIndex={-1}
            className={cn(
              'outline-none',
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
        <AiDrawer />
        </div>
      </div>

      <GlobalSearchDialog />
      <ShortcutsHelp />
      {chord && (
        <div role="status" className="fixed bottom-4 left-1/2 z-[100] flex -translate-x-1/2 flex-wrap items-center justify-center gap-1.5 rounded-2xl bg-slate-900 px-3 py-2 text-[0.75rem] text-white shadow-xl print:hidden">
          <Kbd className="border-white/20 bg-white/10 text-white">G</Kbd> {' '}{t('phir:')}
          {GO_TO.map((g) => <span key={g.key} className="inline-flex items-center gap-1"><Kbd className="border-white/20 bg-white/10 text-white">{g.key.toUpperCase()}</Kbd>{g.label}</span>)}
        </div>
      )}
      <AiLauncher />
      {/* New online order: popup and sound on every page. */}
      <OnlineOrderAlert />
    </div>
  );
}
