/**
 * Frame around every signed-in page.
 *  - Phones: top bar (brand, pending-sync badge, profile) and a bottom tab
 *    bar with a large centre "Naya Visit" button. Other pages are in More.
 *  - 1024px and up: a fixed sidebar with every page.
 */

import { Suspense, useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, LogOut, Menu, Plus, Store, Wallet, WifiOff } from 'lucide-react';
import { Avatar, ConfirmHost, Modal } from '@/design-system/components';
import { cn } from '@/lib/cn';
import { useAuthStore } from '@/store/auth.store';
import { LogoMark, Wordmark } from '@/ui/Logo';
import { PageSkeleton } from '@/ui/QueryState';
import { useOutbox } from '@/offline/outbox';
import { useLogout } from '@/modules/auth/useLogout';
import { NAV, MORE, isActive } from './nav';
import { SyncBadge } from './SyncBadge';

function OfflineStrip() {
  const online = useOutbox((s) => s.online);
  if (online) return null;
  return (
    <div className="flex items-center justify-center gap-2 bg-amber-100 px-4 py-1.5 text-[0.8125rem] font-medium text-amber-900">
      <WifiOff className="h-4 w-4 shrink-0" /> Internet nahi hai. Visits phone me save honge aur baad me khud chale jayenge.
    </div>
  );
}

function Sidebar() {
  const me = useAuthStore((s) => s.me);
  const { pathname } = useLocation();
  const logout = useLogout();
  return (
    <aside className="fixed inset-y-0 start-0 z-30 hidden w-64 flex-col border-e border-slate-200 bg-white lg:flex">
      <div className="flex items-center justify-between gap-2 px-5 py-5">
        <Link to="/" aria-label="Dashboard"><Wordmark /></Link>
        <SyncBadge />
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto px-3">
        {NAV.filter((n) => !n.managerOnly || me?.isManager).map((n) => {
          const on = isActive(n.to, pathname);
          return (
            <NavLink key={n.to} to={n.to}
              className={cn('flex h-11 items-center gap-3 rounded-xl px-3 text-[0.9375rem] font-semibold transition',
                on ? 'bg-brand-50 text-brand-800' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900')}>
              <n.icon className={cn('h-5 w-5', on ? 'text-brand-600' : 'text-slate-400')} />{n.label}
            </NavLink>
          );
        })}
      </nav>
      <div className="border-t border-slate-200 p-3">
        <div className="flex items-center gap-3 rounded-2xl p-2">
          <Avatar name={me?.fullName ?? ''} size={34} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-slate-900">{me?.fullName}</p>
            <p className="truncate text-[0.75rem] text-slate-500">{me?.code}</p>
          </div>
          <button type="button" onClick={logout} title="Log out" aria-label="Log out" className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}

function TopBar() {
  const me = useAuthStore((s) => s.me);
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur lg:hidden">
      <div className="flex h-14 items-center gap-3 px-4">
        <Link to="/" className="flex items-center gap-2" aria-label="Dashboard">
          <LogoMark className="h-8 w-8" />
          <span className="text-[0.9375rem] font-extrabold tracking-tight text-slate-900">Nafaa <span className="text-brand-700">Partner</span></span>
        </Link>
        <div className="ms-auto flex items-center gap-2">
          <SyncBadge />
          <Link to="/profile" aria-label="Profile"><Avatar name={me?.fullName ?? ''} size={34} /></Link>
        </div>
      </div>
    </header>
  );
}

function TabBar({ onMore }: { onMore: () => void }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const moreOn = MORE.some((p) => isActive(p, pathname));
  const tab = (to: string, label: string, Icon: typeof Store) => {
    const on = isActive(to, pathname);
    return (
      <NavLink to={to} className="flex flex-1 flex-col items-center justify-center gap-0.5 py-1.5">
        <Icon className={cn('h-6 w-6', on ? 'text-brand-600' : 'text-slate-400')} strokeWidth={on ? 2.4 : 2} />
        <span className={cn('text-[0.6875rem] font-semibold', on ? 'text-brand-700' : 'text-slate-500')}>{label}</span>
      </NavLink>
    );
  };
  return (
    <nav className="no-print safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur lg:hidden" aria-label="Main">
      <div className="mx-auto flex h-16 max-w-lg items-stretch px-1">
        {tab('/', 'Dashboard', LayoutDashboard)}
        {tab('/leads', 'Leads', Store)}
        <div className="flex flex-1 items-start justify-center">
          <button type="button" onClick={() => navigate('/visit/new')} aria-label="Naya Visit"
            className="-mt-5 flex h-16 w-16 flex-col items-center justify-center rounded-full bg-brand-600 text-white shadow-lg shadow-brand-600/30 ring-4 ring-white transition active:scale-95">
            <Plus className="h-7 w-7" strokeWidth={2.6} />
            <span className="-mt-0.5 text-[0.625rem] font-bold">Visit</span>
          </button>
        </div>
        {tab('/earnings', 'Kamai', Wallet)}
        <button type="button" onClick={onMore} className="flex flex-1 flex-col items-center justify-center gap-0.5 py-1.5">
          <Menu className={cn('h-6 w-6', moreOn ? 'text-brand-600' : 'text-slate-400')} />
          <span className={cn('text-[0.6875rem] font-semibold', moreOn ? 'text-brand-700' : 'text-slate-500')}>More</span>
        </button>
      </div>
    </nav>
  );
}

function MoreSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const me = useAuthStore((s) => s.me);
  const logout = useLogout();
  return (
    <Modal open={open} onClose={onClose} title="Aur">
      <div className="grid grid-cols-2 gap-2">
        {NAV.filter((n) => MORE.includes(n.to) && (!n.managerOnly || me?.isManager)).map((n) => (
          <Link key={n.to} to={n.to} onClick={onClose}
            className="flex h-20 flex-col items-start justify-between rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200 active:scale-[0.98]">
            <n.icon className="h-5 w-5 text-brand-600" />
            <span className="text-[0.9375rem] font-semibold text-slate-800">{n.label}</span>
          </Link>
        ))}
        <button type="button" onClick={() => { onClose(); logout(); }}
          className="flex h-20 flex-col items-start justify-between rounded-2xl bg-rose-50 p-3 text-start ring-1 ring-rose-200 active:scale-[0.98]">
          <LogOut className="h-5 w-5 text-rose-600" />
          <span className="text-[0.9375rem] font-semibold text-rose-700">Log out</span>
        </button>
      </div>
    </Modal>
  );
}

export default function AppShell() {
  const { pathname } = useLocation();
  const [more, setMore] = useState(false);
  useEffect(() => { setMore(false); window.scrollTo(0, 0); }, [pathname]);
  // Send anything left from an earlier session as soon as the app opens.
  useEffect(() => { if (navigator.onLine) void useOutbox.getState().sync(); }, []);

  return (
    <div className="min-h-full">
      <Sidebar />
      <div className="lg:ps-64">
        <TopBar />
        <OfflineStrip />
        <main className="pb-tabbar px-3 pt-3 sm:px-4 lg:px-8 lg:pb-10 lg:pt-6">
          <Suspense fallback={<PageSkeleton />}><Outlet /></Suspense>
        </main>
      </div>
      <TabBar onMore={() => setMore(true)} />
      <MoreSheet open={more} onClose={() => setMore(false)} />
      <ConfirmHost />
    </div>
  );
}
