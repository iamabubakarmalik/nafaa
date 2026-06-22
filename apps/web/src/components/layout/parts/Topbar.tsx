import { Menu, Search, Sparkles } from 'lucide-react';
import GlobalSearch from '@/components/search/GlobalSearch';
import NotificationBell from '@/components/notifications/NotificationBell';
import ShopSelector from '@/components/shops/ShopSelector';
import { ProfileDropdown } from './ProfileDropdown';
import { QuickActionsDropdown } from './QuickActionsDropdown';

interface Props {
  user: any;
  tenant: any;
  onOpenMobileSidebar: () => void;
  onLogout: () => void;
}

export function Topbar({ user, tenant, onOpenMobileSidebar, onLogout }: Props) {
  return (
    <header className="sticky top-0 z-30 shrink-0 border-b border-slate-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80 print:hidden">
      <div className="px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
        {/* Left */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <button
            onClick={onOpenMobileSidebar}
            className="lg:hidden h-10 w-10 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center shrink-0 transition"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="min-w-0 hidden sm:block">
            <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-semibold">
              <Sparkles className="h-3 w-3 text-amber-500" />
              <span>Welcome back</span>
            </div>
            <h1 className="text-base sm:text-lg font-extrabold text-slate-900 truncate leading-tight">
              Assalam-o-Alaikum, {user?.fullName?.split(' ')[0] || 'User'} 👋
            </h1>
          </div>

          <div className="sm:hidden min-w-0">
            <h1 className="text-sm font-extrabold text-slate-900 truncate">
              {user?.fullName?.split(' ')[0] || 'User'} 👋
            </h1>
          </div>
        </div>

        {/* Right */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="hidden md:block">
            <GlobalSearch />
          </div>

          <button
            className="md:hidden h-10 w-10 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition"
            onClick={() => {
              const evt = new KeyboardEvent('keydown', { key: 'k', metaKey: true });
              document.dispatchEvent(evt);
            }}
            title="Search"
          >
            <Search className="h-4 w-4 text-slate-600" />
          </button>

          <ShopSelector />
          <QuickActionsDropdown role={user?.role} permissions={user?.permissions} />

          <div className="relative">
            <NotificationBell />
          </div>

          <ProfileDropdown user={user} tenant={tenant} onLogout={onLogout} />
        </div>
      </div>
    </header>
  );
}
