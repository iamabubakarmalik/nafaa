/**
 * Top bar shown above every signed-in page.
 *
 * Left: menu button (below 1024px) and the workspace switcher.
 * Centre: global search (768px and up; a search button below that).
 * Right: branch, Create, desktop reload, sync status, notifications, account.
 *
 * Text labels on the right-hand controls appear only where there is room
 * (Create from 1024px; branch name from 1024px; sync label and account name
 * from 1280px), so the bar never overflows on 1366px Windows laptops with
 * display scaling. On phones the branch switcher gets its own row.
 */

import { useEffect, useState } from 'react';
import { Menu, Search } from 'lucide-react';
import { DesktopReloadButton } from '@modules/desktop/components/DesktopReloadButton';
import { useWorkspaceStore } from '@core/stores/workspace.store';
import { IconButton } from '../ui';
import GlobalSearch from './GlobalSearch';
import NotificationBell from './NotificationBell';
import ShopSelector from './ShopSelector';
import { SyncStatusIndicator } from './SyncStatusIndicator';
import { ProfileDropdown } from './ProfileDropdown';
import { QuickActionsDropdown } from './QuickActionsDropdown';
import { WorkspaceSwitcher } from './WorkspaceSwitcher';

interface TopbarProps {
  user: any;
  tenant: any;
  onOpenMobileSidebar: () => void;
  onLogout: () => void;
}

const greetingFor = (hour: number) =>
  hour >= 5 && hour < 12 ? 'Good morning'
    : hour >= 12 && hour < 17 ? 'Good afternoon'
      : hour >= 17 && hour < 21 ? 'Good evening'
        : 'Working late';

/** Opens GlobalSearch, which listens for Ctrl/⌘+K. */
const openSearch = () => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true, ctrlKey: true }));

export function Topbar({ user, tenant, onOpenMobileSidebar, onLogout }: TopbarProps) {
  const [now, setNow] = useState(() => new Date());
  const isMarketplace = useWorkspaceStore((s) => s.activeWorkspace) === 'marketplace';

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  const firstName = user?.fullName?.split(' ')[0] || 'there';

  return (
    <header className="sticky top-0 z-30 shrink-0 border-b border-shell-line bg-shell-bar/95 backdrop-blur supports-[backdrop-filter]:bg-shell-bar/85 print:hidden">
      <div className="flex h-14 items-center gap-2 px-3 sm:h-16 sm:gap-3 sm:px-4 xl:px-5">
        <div className="flex shrink-0 items-center gap-2">
          <IconButton label="Open menu" onClick={onOpenMobileSidebar} className="h-9 w-9 border border-slate-200 lg:hidden dark:border-white/10">
            <Menu className="h-5 w-5" />
          </IconButton>
          <WorkspaceSwitcher />
          <div className="hidden pl-1 2xl:block">
            <div className="text-[0.6875rem] font-medium text-slate-500">
              {greetingFor(now.getHours())} · {now.toLocaleTimeString('en-PK', { hour: 'numeric', minute: '2-digit', hour12: true })}
            </div>
            <div className="whitespace-nowrap text-[0.875rem] font-semibold leading-tight text-slate-900 dark:text-white">Hi, {firstName}</div>
          </div>
        </div>

        <div className="hidden min-w-0 flex-1 justify-center px-1 md:flex xl:px-2">
          <div className="w-full max-w-[35rem]"><GlobalSearch /></div>
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-1.5">
          <IconButton label="Search (Ctrl+K)" onClick={openSearch} className="h-9 w-9 md:hidden">
            <Search className="h-[1.125rem] w-[1.125rem]" />
          </IconButton>
          {!isMarketplace && <div className="hidden sm:block"><ShopSelector /></div>}
          <QuickActionsDropdown role={user?.role} permissions={user?.permissions} businessType={tenant?.businessType} />
          <DesktopReloadButton />
          <SyncStatusIndicator />
          <NotificationBell />
          <div className="mx-0.5 hidden h-6 w-px bg-shell-line sm:block" aria-hidden />
          <ProfileDropdown user={user} tenant={tenant} onLogout={onLogout} />
        </div>
      </div>

      {!isMarketplace && (
        <div className="border-t border-shell-line px-3 py-1.5 sm:hidden">
          <ShopSelector variant="row" />
        </div>
      )}
    </header>
  );
}
