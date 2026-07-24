import { useEffect, useState } from 'react';
import { Menu, Search, Clock, Sun, Moon, CloudSun } from 'lucide-react';
import GlobalSearch from '@core/components/search/GlobalSearch';
import NotificationBell from '@core/components/notifications/NotificationBell';
import ShopSelector from '@core/components/shops/ShopSelector';
import { ProfileDropdown } from './ProfileDropdown';
import { QuickActionsDropdown } from './QuickActionsDropdown';
import { WorkspaceSwitcher } from './WorkspaceSwitcher';
import { SyncStatusIndicator } from '@core/components/offline/SyncStatusIndicator';
import { useWorkspaceStore } from '@core/stores/workspace.store';

interface Props {
  user: any;
  tenant: any;
  onOpenMobileSidebar: () => void;
  onLogout: () => void;
}

function getGreeting(hour: number): { text: string; icon: any; color: string; emoji: string } {
  if (hour >= 5 && hour < 12)  return { text: 'Subah Bakhair',   icon: Sun,     color: 'text-amber-500',   emoji: '☀️' };
  if (hour >= 12 && hour < 17) return { text: 'Dopahar Bakhair', icon: CloudSun, color: 'text-orange-500',  emoji: '🌤️' };
  if (hour >= 17 && hour < 20) return { text: 'Shaam Bakhair',   icon: Sun,     color: 'text-rose-500',    emoji: '🌇' };
  return { text: 'Shab Bakhair', icon: Moon, color: 'text-indigo-400', emoji: '🌙' };
}

const formatTime = (d: Date) => d.toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit', hour12: true });
const formatDay  = (d: Date) => d.toLocaleDateString('en-PK', { weekday: 'long', day: 'numeric', month: 'short' });

export function Topbar({ user, tenant, onOpenMobileSidebar, onLogout }: Props) {
  const [now, setNow] = useState(new Date());
  const { activeWorkspace } = useWorkspaceStore();
  const isMarketplace = activeWorkspace === 'marketplace';

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(timer);
  }, []);

  const greeting = getGreeting(now.getHours());
  const GreetIcon = greeting.icon;
  const firstName = user?.fullName?.split(' ')[0] || 'User';

  return (
    <header className="sticky top-0 z-30 shrink-0 print:hidden">
      <div className="relative border-b border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm">
        {/* Animated wave — workspace themed */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-60 dark:opacity-30 transition-opacity duration-500">
          <svg
            className="absolute inset-0 w-full h-full"
            preserveAspectRatio="none"
            viewBox="0 0 1440 80"
            fill="none"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id="topbarWave1" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor={isMarketplace ? '#a855f7' : '#10b981'} stopOpacity="0" />
                <stop offset="50%" stopColor={isMarketplace ? '#a855f7' : '#10b981'} stopOpacity="0.08" />
                <stop offset="100%" stopColor={isMarketplace ? '#ec4899' : '#059669'} stopOpacity="0" />
              </linearGradient>
              <linearGradient id="topbarWave2" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor={isMarketplace ? '#ec4899' : '#f59e0b'} stopOpacity="0" />
                <stop offset="50%" stopColor={isMarketplace ? '#ec4899' : '#f59e0b'} stopOpacity="0.06" />
                <stop offset="100%" stopColor={isMarketplace ? '#f43f5e' : '#d97706'} stopOpacity="0" />
              </linearGradient>
            </defs>
            <path
              d="M0,40 C240,10 480,70 720,40 C960,10 1200,70 1440,40 L1440,80 L0,80 Z"
              fill="url(#topbarWave1)"
            />
            <path
              d="M0,50 C360,20 720,80 1080,50 C1260,35 1440,60 1440,50 L1440,80 L0,80 Z"
              fill="url(#topbarWave2)"
            />
          </svg>
        </div>

        {/* Decorative blur orbs */}
        <div
          className="absolute -top-8 left-1/4 h-24 w-24 rounded-full blur-3xl pointer-events-none transition-colors duration-500"
          style={{ background: isMarketplace ? 'rgba(168,85,247,0.1)' : 'rgba(52,211,153,0.1)' }}
        />
        <div
          className="absolute -bottom-8 right-1/3 h-20 w-20 rounded-full blur-3xl pointer-events-none transition-colors duration-500"
          style={{ background: isMarketplace ? 'rgba(236,72,153,0.1)' : 'rgba(245,158,11,0.1)' }}
        />

        {/* ─── CONTENT ─── */}
        <div className="relative px-4 sm:px-6 h-[72px] flex items-center gap-3">
          {/* LEFT — Mobile menu + Workspace switcher */}
          <div className="flex items-center gap-2.5 min-w-0 flex-shrink-0">
            <button
              onClick={onOpenMobileSidebar}
              className="lg:hidden h-11 w-11 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 flex items-center justify-center shrink-0 transition active:scale-95"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5 text-slate-700 dark:text-slate-300" />
            </button>

            {/* WORKSPACE SWITCHER — the star of the show */}
            <WorkspaceSwitcher />

            {/* Divider */}
            <div className="hidden lg:block h-8 w-px bg-slate-300 dark:bg-neutral-700 mx-1" />

            {/* Desktop greeting */}
            <div className="hidden xl:block min-w-0">
              <div className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                <GreetIcon className={`h-3 w-3 ${greeting.color}`} />
                <span>{greeting.text}</span>
                <span className="text-slate-300 dark:text-slate-600">•</span>
                <span className="inline-flex items-center gap-1 tabular-nums">
                  <Clock className="h-3 w-3" />
                  {formatTime(now)}
                </span>
              </div>
              <h1 className="text-[15px] font-extrabold leading-tight mt-0.5 flex items-center gap-1.5 whitespace-nowrap">
                <span
                  className={`bg-clip-text text-transparent transition-all duration-500 ${
                    isMarketplace
                      ? 'bg-gradient-to-r from-slate-900 via-purple-700 to-slate-900 dark:from-white dark:via-purple-300 dark:to-white'
                      : 'bg-gradient-to-r from-slate-900 via-emerald-700 to-slate-900 dark:from-white dark:via-emerald-300 dark:to-white'
                  }`}
                >
                  Hi, {firstName}
                </span>
                <span className="text-base">{greeting.emoji}</span>
              </h1>
            </div>
          </div>

          {/* CENTER — Search */}
          <div className="hidden md:flex flex-1 items-center justify-center min-w-0 px-2">
            <div className="w-full max-w-[520px]">
              <GlobalSearch />
            </div>
          </div>

          {/* RIGHT — Actions */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 ml-auto">
            {/* Mobile search */}
            <button
              className="md:hidden h-11 w-11 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 flex items-center justify-center transition active:scale-95"
              onClick={() => {
                const evt = new KeyboardEvent('keydown', { key: 'k', metaKey: true });
                document.dispatchEvent(evt);
              }}
              title="Search (⌘K)"
              aria-label="Search"
            >
              <Search className="h-4 w-4 text-slate-600 dark:text-slate-300" />
            </button>

            {/* Shop selector (only in POS mode) */}
            {!isMarketplace && (
              <div className="hidden sm:block">
                <ShopSelector />
              </div>
            )}

            {/* Quick actions */}
            <QuickActionsDropdown
              role={user?.role}
              permissions={user?.permissions}
              businessType={(tenant as any)?.businessType}
            />

            <SyncStatusIndicator />
            <NotificationBell />

            <div className="hidden sm:block h-9 w-px bg-gradient-to-b from-transparent via-slate-300 dark:via-neutral-700 to-transparent mx-1" />

            <ProfileDropdown user={user} tenant={tenant} onLogout={onLogout} />
          </div>
        </div>

        {/* Mobile shop selector strip — only in POS */}
        {!isMarketplace && (
          <div className="sm:hidden relative border-t border-slate-100 dark:border-neutral-800 px-4 py-2 bg-gradient-to-r from-slate-50 via-white to-emerald-50/50 dark:from-neutral-900 dark:via-neutral-900 dark:to-emerald-950/20">
            <ShopSelector />
          </div>
        )}
      </div>
    </header>
  );
}
