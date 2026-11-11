/**
 * Frame around every signed-in admin page: sidebar, top bar and the scrolling
 * content area. Same layout rules as the merchant app shell:
 *  - below 1024px  the sidebar is a slide-in drawer;
 *  - 1024–1279px   the sidebar defaults to the 72px icon rail;
 *  - 1280px and up the full 264px sidebar.
 * Ctrl/⌘+B overrides the last two (stored in the appearance preferences).
 */

import { Suspense, useEffect, useRef, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useSidebarState } from '@web-shell/useSidebarState';
import { ConfirmHost, Skeleton } from '@/design-system/components';
import { useDialogFocusManager, useListKeys } from '@/design-system/keyboard';
import { cn } from '@/lib/cn';
import { useAuthStore } from '@/store/auth.store';
import { adminAuthApi } from '@/api/admin-auth.api';
import { Sidebar } from './sidebar/Sidebar';
import { MobileSidebar } from './sidebar/MobileSidebar';
import { Topbar } from './topbar/Topbar';
import { CommandPalette, useCommandPaletteKeys } from './search/CommandPalette';
import { areaForPath, itemForPath } from './navigation/nav-config';
import { useCan } from '@/lib/access';
import { EmptyState } from '@/design-system/components';
import { Lock } from 'lucide-react';

/** Shown while a page's code downloads (pages are loaded on first visit). */
function PageLoading() {
  return (
    <div className="mx-auto w-full max-w-[var(--page-max,96rem)] space-y-4" aria-busy="true" aria-label="Loading page">
      <Skeleton className="h-36 rounded-3xl" />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}</div>
      <Skeleton className="h-72 rounded-2xl" />
    </div>
  );
}

export default function AdminShell() {
  const navigate = useNavigate();
  const location = useLocation();
  const { refreshToken, logout } = useAuthStore();
  const { collapsed, toggle } = useSidebarState();
  const [mobileOpen, setMobileOpen] = useState(false);
  const mainRef = useRef<HTMLElement>(null);
  const can = useCan();
  const area = areaForPath(location.pathname);
  const allowed = !area || can(`${area}.view`) || (area === 'staff' && location.pathname.startsWith('/staff/audit') && can('audit.view'));
  useCommandPaletteKeys();
  useListKeys(mainRef, { global: true });
  useDialogFocusManager();

  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  // Tab title follows the page.
  useEffect(() => {
    const page = itemForPath(location.pathname);
    document.title = page ? `${page.label} · Nafaa Admin` : 'Nafaa Admin';
  }, [location.pathname]);

  const handleLogout = async () => {
    try { if (refreshToken) await adminAuthApi.logout(refreshToken); } catch { /* local logout is enough */ }
    logout();
    toast.success('Logged out');
    navigate('/login');
  };

  return (
    <div className="h-screen-dvh overflow-hidden bg-shell-canvas">
      <a href="#main-content" className="pointer-events-auto fixed start-2 top-2 z-[100] -translate-y-16 rounded-xl bg-brand-600 px-4 py-2 text-[0.875rem] font-semibold text-brand-fg shadow-lg transition focus:translate-y-0">
        Skip to content
      </a>
      <div className={cn('grid h-full transition-[grid-template-columns] duration-300 ease-out', collapsed ? 'lg:grid-cols-[72px_minmax(0,1fr)]' : 'lg:grid-cols-[264px_minmax(0,1fr)]')}>
        <aside className="hidden h-screen-dvh flex-col overflow-hidden border-e border-shell-line bg-shell-sidebar text-[rgb(var(--fg))] lg:flex print:hidden">
          <Sidebar collapsed={collapsed} onToggleCollapse={toggle} onLogout={handleLogout} />
        </aside>

        <MobileSidebar open={mobileOpen} onClose={() => setMobileOpen(false)} onLogout={handleLogout} />

        <div className="flex h-screen-dvh min-w-0 flex-col overflow-hidden">
          <Topbar onOpenMobileSidebar={() => setMobileOpen(true)} onLogout={handleLogout} />
          <main
            ref={mainRef}
            id="main-content"
            tabIndex={-1}
            className="min-h-0 flex-1 overflow-y-auto bg-shell-canvas p-3 outline-none [scrollbar-gutter:stable] sm:p-5 xl:p-6 print:overflow-visible print:p-0"
          >
            {allowed ? (
              <Suspense fallback={<PageLoading />}>
                <Outlet />
              </Suspense>
            ) : (
              <EmptyState
                icon={<Lock className="h-6 w-6" />}
                title="You don’t have access to this page"
                description="Your admin role does not include it. Ask the owner if you need it."
              />
            )}
          </main>
        </div>
      </div>
      <CommandPalette />
      <ConfirmHost />
    </div>
  );
}
