import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ChevronDown, ChevronRight, Store, User, Settings as SettingsIcon,
  CreditCard, Building2, HelpCircle, ScrollText, LogOut, Sparkles,
  Bell, Shield, Palette, Crown, Sun, Moon, Monitor,
} from 'lucide-react';
import { useThemeStore } from '@core/stores/theme.store';

interface Props {
  user: any;
  tenant: any;
  onLogout: () => void;
}

export function ProfileDropdown({ user, tenant, onLogout }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const mode = useThemeStore((s) => s.mode);
  const setMode = useThemeStore((s) => s.setMode);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) setOpen(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open]);

  const initial = user?.fullName?.charAt(0)?.toUpperCase() || 'N';

  const roleConfig: Record<string, { label: string; light: string; dark: string; icon: any }> = {
    OWNER: {
      label: 'Owner',
      light: 'bg-amber-100 text-amber-900 border-amber-300',
      dark: 'bg-amber-500/20 text-amber-200 border-amber-500/40',
      icon: Crown,
    },
    MANAGER: {
      label: 'Manager',
      light: 'bg-violet-100 text-violet-900 border-violet-300',
      dark: 'bg-violet-500/20 text-violet-200 border-violet-500/40',
      icon: Shield,
    },
    CASHIER: {
      label: 'Cashier',
      light: 'bg-blue-100 text-blue-900 border-blue-300',
      dark: 'bg-blue-500/20 text-blue-200 border-blue-500/40',
      icon: User,
    },
    STAFF: {
      label: 'Staff',
      light: 'bg-slate-100 text-slate-800 border-slate-300',
      dark: 'bg-slate-700/60 text-slate-200 border-slate-600',
      icon: User,
    },
    SUPER_ADMIN: {
      label: 'Super Admin',
      light: 'bg-rose-100 text-rose-900 border-rose-300',
      dark: 'bg-rose-500/20 text-rose-200 border-rose-500/40',
      icon: Crown,
    },
  };
  const roleInfo = roleConfig[user?.role] || roleConfig.STAFF;
  const RoleIcon = roleInfo.icon;

  return (
    <div ref={ref} className="relative">
      {/* TRIGGER */}
      <button
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-2 p-1 pr-2.5 rounded-2xl transition-all ${
          open
            ? 'bg-slate-100 dark:bg-slate-800 ring-2 ring-emerald-500/40 shadow-md scale-[1.02]'
            : 'hover:bg-slate-100 dark:hover:bg-slate-800 hover:ring-2 hover:ring-slate-200 dark:hover:ring-slate-700'
        }`}
        aria-label="Open profile menu"
      >
        <div className="relative">
          {user?.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt={user.fullName}
              className="h-9 w-9 rounded-xl object-cover ring-2 ring-white dark:ring-slate-900 shadow"
            />
          ) : (
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-700 text-white flex items-center justify-center font-extrabold shadow ring-2 ring-white dark:ring-slate-900">
              {initial}
            </div>
          )}
          <div className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900" title="Online" />
        </div>
        <div className="hidden md:block text-left min-w-0">
          <div className="text-xs font-extrabold text-slate-900 dark:text-white truncate max-w-[140px]">
            {user?.fullName || 'User'}
          </div>
          <div className="text-[9px] font-extrabold text-slate-500 dark:text-slate-400 truncate max-w-[140px] uppercase tracking-wider flex items-center gap-1">
            <RoleIcon className="h-2 w-2" />
            {roleInfo.label}
          </div>
        </div>
        <ChevronDown
          className={`h-3.5 w-3.5 text-slate-500 dark:text-slate-400 transition-transform hidden md:block ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* DROPDOWN */}
      {open && (
        <div
          className="absolute right-0 top-full mt-2 w-[320px] max-w-[calc(100vw-1.5rem)] rounded-2xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200"
        >
          {/* Header — profile card (always dark bg) */}
          <div className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-emerald-900 to-emerald-800 text-white p-4">
            <div className="absolute -top-8 -right-8 h-24 w-24 rounded-full bg-emerald-400/20 blur-2xl" />
            <div className="absolute -bottom-8 -left-8 h-24 w-24 rounded-full bg-amber-400/15 blur-2xl" />

            <div className="relative flex items-center gap-3">
              <div className="relative shrink-0">
                {user?.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={user.fullName}
                    className="h-14 w-14 rounded-2xl object-cover ring-4 ring-white/20 shadow-lg"
                  />
                ) : (
                  <div className="h-14 w-14 rounded-2xl bg-white/15 backdrop-blur text-white flex items-center justify-center text-xl font-extrabold shadow-lg ring-4 ring-white/20">
                    {initial}
                  </div>
                )}
                <div className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-emerald-500 border-2 border-slate-900" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-extrabold text-lg truncate leading-tight text-white">
                  {user?.fullName || 'User'}
                </div>
                <div className="text-xs text-white/80 truncate mt-0.5">{user?.email}</div>
                <div className={`mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold border ${roleInfo.light}`}>
                  <RoleIcon className="h-2.5 w-2.5" />
                  {roleInfo.label}
                </div>
              </div>
            </div>
          </div>

          {/* Shop card */}
          {tenant && (
            <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 bg-emerald-50 dark:bg-emerald-900/20 flex items-center gap-2">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 text-white flex items-center justify-center shrink-0 shadow">
                <Store className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[9px] uppercase tracking-widest text-emerald-700 dark:text-emerald-300 font-extrabold flex items-center gap-1">
                  <Sparkles className="h-2 w-2" />
                  Current Shop
                </div>
                <div className="text-sm font-extrabold text-slate-900 dark:text-white truncate">
                  {tenant.name}
                </div>
                {tenant.slug && (
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                    @{tenant.slug}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Theme switcher */}
          <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700">
            <div className="text-[9px] uppercase tracking-widest text-slate-500 dark:text-slate-400 font-extrabold mb-2 flex items-center gap-1">
              <Palette className="h-2.5 w-2.5" />
              Theme
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              <ThemeButton icon={Sun}     label="Light"  active={mode === 'light'}  onClick={() => setMode('light')} />
              <ThemeButton icon={Moon}    label="Dark"   active={mode === 'dark'}   onClick={() => setMode('dark')} />
              <ThemeButton icon={Monitor} label="System" active={mode === 'system'} onClick={() => setMode('system')} />
            </div>
          </div>

          {/* Menu items */}
          <div className="py-1">
            <MenuItem to="/profile"       icon={User}          label="My Profile"      onClick={() => setOpen(false)} />
            <MenuItem to="/notifications" icon={Bell}          label="Notifications"   onClick={() => setOpen(false)} />
            <MenuItem to="/settings"      icon={SettingsIcon}  label="Settings"        onClick={() => setOpen(false)} />
            <MenuItem to="/billing"       icon={CreditCard}    label="Billing & Plans" onClick={() => setOpen(false)} />
            <MenuItem to="/shops"         icon={Building2}     label="Shops / Branches" onClick={() => setOpen(false)} />
          </div>

          <div className="border-t border-slate-200 dark:border-slate-700 py-1">
            <MenuItem to="/help"  icon={HelpCircle} label="Help Center"      onClick={() => setOpen(false)} />
            <MenuItem to="/legal" icon={ScrollText} label="Terms & Privacy"  onClick={() => setOpen(false)} />
          </div>

          {/* Logout */}
          <div className="border-t-2 border-slate-200 dark:border-slate-700 py-1 bg-slate-50 dark:bg-slate-800/50">
            <button
              onClick={() => {
                setOpen(false);
                onLogout();
              }}
              className="w-full px-4 py-2.5 flex items-center gap-3 text-sm font-extrabold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition"
            >
              <div className="h-8 w-8 rounded-lg bg-rose-100 dark:bg-rose-500/20 flex items-center justify-center shrink-0">
                <LogOut className="h-4 w-4 text-rose-600 dark:text-rose-400" />
              </div>
              <span className="flex-1 text-left">Logout</span>
              <ChevronRight className="h-3.5 w-3.5 text-rose-400 dark:text-rose-500 shrink-0" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function MenuItem({
  to, icon: Icon, label, onClick,
}: { to: string; icon: any; label: string; onClick: () => void }) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className="w-full px-4 py-2 flex items-center gap-3 text-sm font-bold text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-emerald-700 dark:hover:text-emerald-400 transition group"
    >
      <div className="h-8 w-8 rounded-lg bg-slate-100 dark:bg-slate-800 group-hover:bg-emerald-100 dark:group-hover:bg-emerald-500/20 flex items-center justify-center transition shrink-0">
        <Icon className="h-3.5 w-3.5 text-slate-600 dark:text-slate-400 group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition" />
      </div>
      <span className="flex-1 min-w-0 truncate">{label}</span>
      <ChevronRight className="h-3.5 w-3.5 text-slate-300 dark:text-slate-600 group-hover:text-emerald-500 group-hover:translate-x-0.5 transition shrink-0" />
    </Link>
  );
}

function ThemeButton({
  icon: Icon, label, active, onClick,
}: { icon: any; label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-1 py-2 rounded-lg border-2 transition ${
        active
          ? 'bg-emerald-100 dark:bg-emerald-500/20 border-emerald-400 dark:border-emerald-500 text-emerald-700 dark:text-emerald-300 shadow-sm'
          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
      }`}
    >
      <Icon className="h-4 w-4" />
      <span className="text-[10px] font-extrabold">{label}</span>
    </button>
  );
}
