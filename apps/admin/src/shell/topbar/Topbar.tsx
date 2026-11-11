/**
 * Top bar above every admin page.
 *
 * Left: menu button (below 1024px), workspace switcher and the current page.
 * Centre: global search (768px and up; an icon below that).
 * Right: theme, notifications and the account menu.
 */

import { useCallback, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Check, ChevronRight, LogOut, Menu, Monitor, Moon, Search, ShieldCheck, Sun } from 'lucide-react';
import { IconButton } from '@/design-system/components';
import { useAppearanceStore, type ThemeMode } from '@/design-system';
import { Panel, useDismiss } from '@web-shell/ui';
import NotificationBell from '@/components/notifications/NotificationBell';
import { useAuthStore } from '@/store/auth.store';
import { cn } from '@/lib/cn';
import { itemForPath, workspaceForPath } from '../navigation/nav-config';
import { SearchTrigger, useCommandPalette } from '../search/CommandPalette';
import { WorkspaceSwitcher } from './WorkspaceSwitcher';

const MODES: Array<{ id: ThemeMode; label: string; icon: typeof Sun }> = [
  { id: 'light', label: 'Light', icon: Sun },
  { id: 'dark', label: 'Dark', icon: Moon },
  { id: 'system', label: 'Same as device', icon: Monitor },
];

function AccountMenu({ onLogout }: { onLogout: () => void }) {
  const user = useAuthStore((s) => s.user);
  const mode = useAppearanceStore((s) => s.resolved.mode);
  const setMode = useAppearanceStore((s) => s.setMode);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useDismiss(ref, open, close);
  const initial = user?.fullName?.charAt(0)?.toUpperCase() || 'A';

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label="Account menu"
        className="flex h-9 items-center gap-2 rounded-lg ps-1 pe-1 transition hover:bg-slate-900/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 xl:pe-2"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-600 text-[0.8125rem] font-semibold text-brand-fg">{initial}</span>
        <span className="hidden text-start xl:block">
          <span className="block max-w-[9rem] truncate text-[0.8125rem] font-semibold leading-tight text-slate-900">{user?.fullName}</span>
          <span className="block text-[0.6875rem] leading-tight text-slate-500">{user?.role === 'SUPER_ADMIN' ? 'Super admin' : user?.adminRole ?? 'Admin staff'}</span>
        </span>
      </button>
      <Panel open={open} onClose={close} widthClass="sm:w-[18rem]" label="Account">
        <div className="border-b border-slate-200 px-4 py-3">
          <div className="truncate text-[0.875rem] font-semibold text-slate-900">{user?.fullName}</div>
          <div className="truncate text-[0.75rem] text-slate-500">{user?.email}</div>
        </div>
        <div className="border-b border-slate-200 p-2">
          <Link to="/account/security" onClick={close} className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-start text-[0.8125rem] transition hover:bg-slate-50">
            <ShieldCheck className="h-4 w-4 text-slate-500" />
            <span className="flex-1">My security</span>
            <span className={cn('text-[0.6875rem] font-semibold', user?.totpEnabled ? 'text-emerald-600' : 'text-amber-600')}>{user?.totpEnabled ? '2-step on' : '2-step off'}</span>
          </Link>
        </div>
        <div className="p-2">
          <div className="px-2 pb-1 text-[0.6875rem] font-semibold uppercase tracking-wide text-slate-400">Theme</div>
          {MODES.map((m) => (
            <button key={m.id} type="button" onClick={() => setMode(m.id)} className={cn('flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-start text-[0.8125rem] transition hover:bg-slate-50', mode === m.id && 'font-semibold text-slate-900')}>
              <m.icon className="h-4 w-4 text-slate-500" />
              <span className="flex-1">{m.label}</span>
              {mode === m.id && <Check className="h-4 w-4 text-brand-600" />}
            </button>
          ))}
        </div>
        <div className="border-t border-slate-200 p-2">
          <button type="button" onClick={() => { close(); onLogout(); }} className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-start text-[0.8125rem] font-medium text-rose-600 transition hover:bg-rose-50">
            <LogOut className="h-4 w-4" /> Log out
          </button>
        </div>
      </Panel>
    </div>
  );
}

export function Topbar({ onOpenMobileSidebar, onLogout }: { onOpenMobileSidebar: () => void; onLogout: () => void }) {
  const location = useLocation();
  const workspace = workspaceForPath(location.pathname);
  const page = itemForPath(location.pathname);
  const openSearch = useCommandPalette((s) => s.setOpen);
  const dark = useAppearanceStore((s) => s.resolved.mode === 'dark' || (s.resolved.mode === 'system' && s.systemPrefersDark));
  const setMode = useAppearanceStore((s) => s.setMode);

  return (
    <header className="sticky top-0 z-30 shrink-0 border-b border-shell-line bg-shell-bar print:hidden">
      <div className="flex h-14 items-center gap-2 px-3 sm:h-16 sm:gap-3 sm:px-4 xl:px-5">
        <div className="flex min-w-0 shrink-0 items-center gap-2">
          <IconButton label="Open menu" onClick={onOpenMobileSidebar} className="h-9 w-9 border border-slate-200 lg:hidden dark:border-ink-white/10">
            <Menu className="h-5 w-5" />
          </IconButton>
          <WorkspaceSwitcher />
          {page && page.workspace.id === workspace.id && (
            <div className="hidden min-w-0 items-center gap-1.5 text-[0.8125rem] 2xl:flex">
              <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
              <span className="truncate font-semibold text-slate-900 dark:text-ink-white">{page.label}</span>
            </div>
          )}
        </div>

        <div className="hidden min-w-0 flex-1 justify-center px-1 md:flex xl:px-2">
          <div className="w-full max-w-[35rem]"><SearchTrigger /></div>
        </div>

        <div className="ms-auto flex shrink-0 items-center gap-1 sm:gap-1.5">
          <IconButton label="Search (Ctrl+K)" onClick={() => openSearch(true)} className="h-9 w-9 md:hidden">
            <Search className="h-[1.125rem] w-[1.125rem]" />
          </IconButton>
          <IconButton label={dark ? 'Switch to light theme' : 'Switch to dark theme'} onClick={() => setMode(dark ? 'light' : 'dark')} className="h-9 w-9">
            {dark ? <Sun className="h-[1.125rem] w-[1.125rem]" /> : <Moon className="h-[1.125rem] w-[1.125rem]" />}
          </IconButton>
          <NotificationBell />
          <div className="mx-0.5 hidden h-6 w-px bg-shell-line sm:block" aria-hidden />
          <AccountMenu onLogout={onLogout} />
        </div>
      </div>
    </header>
  );
}
