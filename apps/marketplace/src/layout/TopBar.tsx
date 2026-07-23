import { Bell, Search, Menu } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useSocketEvent } from '@lib/realtime/useSocket';
import { toast } from 'sonner';
import { useCustomerAuthStore } from '@/stores/customerAuth.store';
import { Avatar } from '@shared/ui/Avatar';

export function TopBar() {
  const customer = useCustomerAuthStore((s) => s.customer);

  useSocketEvent('notification:new', (data: any) => {
    toast(data.title, { description: data.body, icon: '🔔' });
  });
  const isAuth = useCustomerAuthStore((s) => s.isAuthenticated);

  return (
    <header className="sticky top-0 z-30 bg-white/95 dark:bg-neutral-950/95 backdrop-blur-md border-b border-slate-100 dark:border-neutral-800 shadow-sm">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
        {/* Logo */}
        <NavLink to="/" className="flex items-center gap-2 shrink-0">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-brand-500 via-brand-600 to-emerald-700 flex items-center justify-center shadow-brand">
            <span className="text-white font-black text-lg">N</span>
          </div>
          <div className="hidden sm:block">
            <div className="font-extrabold text-slate-900 dark:text-white leading-none text-base">
              Nafaa Bazaar
            </div>
            <div className="text-[10px] font-bold text-brand-600 dark:text-brand-400 uppercase tracking-wider">
              🇵🇰 Pakistan
            </div>
          </div>
        </NavLink>

        {/* Search bar (fills space) */}
        <NavLink
          to="/search"
          className="flex-1 flex items-center gap-2 h-11 px-4 rounded-2xl bg-slate-100 dark:bg-neutral-800 hover:bg-slate-200 dark:hover:bg-neutral-700 transition-colors text-slate-500 dark:text-slate-400 text-sm font-medium"
        >
          <Search className="h-4 w-4 shrink-0" />
          <span className="truncate">Kya dhoond rahe hain?</span>
        </NavLink>

        {/* Notifications */}
        <NavLink
          to="/notifications"
          className="relative h-11 w-11 rounded-2xl bg-slate-100 dark:bg-neutral-800 hover:bg-slate-200 dark:hover:bg-neutral-700 transition flex items-center justify-center shrink-0"
        >
          <Bell className="h-5 w-5 text-slate-600 dark:text-slate-300" />
          <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white dark:ring-neutral-950" />
        </NavLink>

        {/* Profile */}
        {isAuth ? (
          <NavLink to="/profile" className="shrink-0">
            <Avatar src={customer?.avatarUrl} name={customer?.fullName} size="md" ring />
          </NavLink>
        ) : (
          <NavLink
            to="/login"
            className="h-11 px-4 rounded-2xl bg-gradient-to-r from-brand-600 to-emerald-700 text-white font-extrabold text-sm shadow-brand flex items-center gap-1.5 shrink-0"
          >
            Login
          </NavLink>
        )}
      </div>
    </header>
  );
}
