import { useEffect, useState } from 'react';
import { Menu, Search, Sparkles, Clock, Sun, Moon, CloudSun } from 'lucide-react';
import GlobalSearch from '@/components/search/GlobalSearch';
import NotificationBell from '@/components/notifications/NotificationBell';
import ShopSelector from '@/components/shops/ShopSelector';
import { ProfileDropdown } from './ProfileDropdown';
import { QuickActionsDropdown } from './QuickActionsDropdown';
import { SyncStatusIndicator } from '@/components/offline/SyncStatusIndicator';

interface Props {
  user: any;
  tenant: any;
  onOpenMobileSidebar: () => void;
  onLogout: () => void;
}

function getGreeting(hour: number): { text: string; icon: any; color: string } {
  if (hour >= 5 && hour < 12) {
    return { text: 'Assalam-o-Alaikum, Subah Bakhair', icon: Sun, color: 'text-amber-500' };
  }
  if (hour >= 12 && hour < 17) {
    return { text: 'Assalam-o-Alaikum', icon: CloudSun, color: 'text-orange-500' };
  }
  if (hour >= 17 && hour < 20) {
    return { text: 'Assalam-o-Alaikum, Shab Bakhair', icon: Sun, color: 'text-rose-500' };
  }
  return { text: 'Assalam-o-Alaikum, Shab Bakhair', icon: Moon, color: 'text-indigo-500' };
}

function formatTime(d: Date): string {
  return d.toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function formatDay(d: Date): string {
  return d.toLocaleDateString('en-PK', { weekday: 'long', day: 'numeric', month: 'short' });
}

export function Topbar({ user, tenant, onOpenMobileSidebar, onLogout }: Props) {
  const [now, setNow] = useState(new Date());

  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);

  const greeting = getGreeting(now.getHours());
  const GreetIcon = greeting.icon;
  const firstName = user?.fullName?.split(' ')[0] || 'User';

  return (
    <header className="sticky top-0 z-30 shrink-0 border-b border-slate-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/85 print:hidden">
      <div className="px-4 sm:px-6 py-2.5 flex items-center justify-between gap-3">
        {/* ─── LEFT ─── */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {/* Mobile menu button */}
          <button
            onClick={onOpenMobileSidebar}
            className="lg:hidden h-10 w-10 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center shrink-0 transition active:scale-95"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          {/* Desktop greeting */}
          <div className="min-w-0 hidden sm:block">
            <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-extrabold uppercase tracking-widest">
              <GreetIcon className={`h-3 w-3 ${greeting.color}`} />
              <span>{greeting.text}</span>
              <span className="text-slate-300">•</span>
              <span className="inline-flex items-center gap-1">
                <Clock className="h-2.5 w-2.5" />
                {formatTime(now)}
              </span>
            </div>
            <h1 className="text-base sm:text-lg font-extrabold text-slate-900 truncate leading-tight mt-0.5 flex items-center gap-2">
              <span className="bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                {firstName} 👋
              </span>
              <span className="text-xs font-bold text-slate-400 hidden xl:inline">
                • {formatDay(now)}
              </span>
            </h1>
          </div>

          {/* Mobile greeting */}
          <div className="sm:hidden min-w-0">
            <div className="text-[9px] font-extrabold text-slate-500 uppercase tracking-wider flex items-center gap-1">
              <GreetIcon className={`h-2.5 w-2.5 ${greeting.color}`} />
              {formatTime(now)}
            </div>
            <h1 className="text-sm font-extrabold text-slate-900 truncate mt-0.5">
              {firstName} 👋
            </h1>
          </div>
        </div>

        {/* ─── RIGHT ─── */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Global Search (desktop) */}
          <div className="hidden md:block">
            <GlobalSearch />
          </div>

          {/* Search button (mobile) */}
          <button
            className="md:hidden h-10 w-10 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition active:scale-95"
            onClick={() => {
              const evt = new KeyboardEvent('keydown', { key: 'k', metaKey: true });
              document.dispatchEvent(evt);
            }}
            title="Search (⌘K)"
            aria-label="Search"
          >
            <Search className="h-4 w-4 text-slate-600" />
          </button>

          {/* Shop selector */}
          <div className="hidden sm:block">
            <ShopSelector />
          </div>

          {/* Quick actions */}
          <QuickActionsDropdown
            role={user?.role}
            permissions={user?.permissions}
            businessType={(tenant as any)?.businessType}
          />

          {/* Sync status */}
          <SyncStatusIndicator />

          {/* Notification bell */}
          <NotificationBell />

          {/* Divider */}
          <div className="hidden sm:block h-8 w-px bg-slate-200 mx-1" />

          {/* Profile */}
          <ProfileDropdown user={user} tenant={tenant} onLogout={onLogout} />
        </div>
      </div>

      {/* Mobile shop selector strip */}
      <div className="sm:hidden border-t border-slate-100 px-4 py-2 bg-gradient-to-r from-slate-50 to-white">
        <ShopSelector />
      </div>
    </header>
  );
}
