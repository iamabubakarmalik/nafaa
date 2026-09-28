import { useEffect, useState } from 'react';
import { Menu, Search } from 'lucide-react';
import { DesktopReloadButton } from '@modules/desktop/components/DesktopReloadButton';
import GlobalSearch from '@core/components/search/GlobalSearch';
import NotificationBell from '@core/components/notifications/NotificationBell';
import ShopSelector from '@core/components/shops/ShopSelector';
import { SyncStatusIndicator } from '@core/components/offline/SyncStatusIndicator';
import { useWorkspaceStore } from '@core/stores/workspace.store';
import { ProfileDropdown } from './ProfileDropdown';
import { QuickActionsDropdown } from './QuickActionsDropdown';
import { WorkspaceSwitcher } from './WorkspaceSwitcher';
import { IconButton } from './shell-ui';

interface Props {
  user: any;
  tenant: any;
  onOpenMobileSidebar: () => void;
  onLogout: () => void;
}

const greetingFor = (h: number) =>
  h >= 5 && h < 12 ? 'Good morning' : h >= 12 && h < 17 ? 'Good afternoon' : h >= 17 && h < 21 ? 'Good evening' : 'Working late';

export function Topbar({ user, tenant, onOpenMobileSidebar, onLogout }: Props) {
  const [now, setNow] = useState(() => new Date());
  const { activeWorkspace } = useWorkspaceStore();
  const isMarketplace = activeWorkspace === 'marketplace';

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  const firstName = user?.fullName?.split(' ')[0] || 'there';

  // Opens GlobalSearch, which listens for ⌘K
  const openSearch = () => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true, ctrlKey: true }));

  return (
    <header className="sticky top-0 z-30 shrink-0 border-b border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-900 print:hidden">
      <div className="flex h-14 items-center gap-2 px-3 sm:h-16 sm:gap-3 sm:px-4 lg:px-5">
        {/* Left */}
        <div className="flex shrink-0 items-center gap-2">
          <IconButton label="Open menu" onClick={onOpenMobileSidebar}
            className="h-10 w-10 rounded-xl border border-slate-200 lg:hidden dark:border-slate-700">
            <Menu className="h-5 w-5" />
          </IconButton>
          <WorkspaceSwitcher />
          <div className="hidden pl-1 2xl:block">
            <div className="text-[11px] font-medium text-slate-500">
              {greetingFor(now.getHours())} · {now.toLocaleTimeString('en-PK', { hour: 'numeric', minute: '2-digit', hour12: true })}
            </div>
            <div className="whitespace-nowrap text-[14px] font-semibold leading-tight text-slate-900 dark:text-white">Hi, {firstName}</div>
          </div>
        </div>

        {/* Center */}
        <div className="hidden min-w-0 flex-1 justify-center px-2 md:flex">
          <div className="w-full max-w-[560px]"><GlobalSearch /></div>
        </div>

        {/* Right */}
        <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-1.5">
          <IconButton label="Search (⌘K)" onClick={openSearch} className="h-10 w-10 rounded-xl md:hidden">
            <Search className="h-[18px] w-[18px]" />
          </IconButton>
          {!isMarketplace && <div className="hidden sm:block"><ShopSelector /></div>}
          <QuickActionsDropdown role={user?.role} permissions={user?.permissions} businessType={(tenant as any)?.businessType} />
          <DesktopReloadButton />
          <SyncStatusIndicator />
          <NotificationBell />
          <div className="mx-0.5 hidden h-6 w-px bg-slate-200 sm:block dark:bg-slate-700" />
          <ProfileDropdown user={user} tenant={tenant} onLogout={onLogout} />
        </div>
      </div>

      {/* Branch picker gets its own row on phones */}
      {!isMarketplace && (
        <div className="border-t border-slate-100 bg-slate-50/80 px-3 py-1.5 sm:hidden dark:border-slate-800 dark:bg-slate-900/60">
          <ShopSelector />
        </div>
      )}
    </header>
  );
}