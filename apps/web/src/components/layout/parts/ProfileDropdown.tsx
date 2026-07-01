import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ChevronDown, ChevronRight, Store, User, Settings as SettingsIcon,
  CreditCard, Building2, HelpCircle, ScrollText, LogOut, Sparkles,
  Bell, Shield, Palette, Crown, Sun, Moon, Monitor,
} from 'lucide-react';
import { useThemeStore } from '@/store/theme.store';

interface Props {
  user: any;
  tenant: any;
  onLogout: () => void;
}

export function ProfileDropdown({ user, tenant, onLogout }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const theme = useThemeStore((s) => s.theme);
  const setTheme = useThemeStore((s) => s.setTheme);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
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
  const roleConfig: Record<string, { label: string; color: string; icon: any }> = {
    OWNER:       { label: 'Owner',       color: 'bg-amber-100 text-amber-800 border-amber-300', icon: Crown },
    MANAGER:     { label: 'Manager',     color: 'bg-violet-100 text-violet-800 border-violet-300', icon: Shield },
    CASHIER:     { label: 'Cashier',     color: 'bg-blue-100 text-blue-800 border-blue-300', icon: User },
    STAFF:       { label: 'Staff',       color: 'bg-slate-100 text-slate-700 border-slate-300', icon: User },
    SUPER_ADMIN: { label: 'Super Admin', color: 'bg-rose-100 text-rose-800 border-rose-300', icon: Crown },
  };
  const roleInfo = roleConfig[user?.role] || roleConfig.STAFF;
  const RoleIcon = roleInfo.icon;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-2 p-1 pr-2.5 rounded-2xl transition-all ${
          open ? 'bg-slate-100 ring-2 ring-brand-500/40 shadow-md scale-[1.02]' : 'hover:bg-slate-100 hover:ring-2 hover:ring-slate-200'
        }`}
      >
        <div className="relative">
          {user?.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt={user.fullName}
              className="h-9 w-9 rounded-xl object-cover ring-2 ring-white shadow"
            />
          ) : (
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-brand-500 via-emerald-600 to-teal-700 text-white flex items-center justify-center font-extrabold shadow ring-2 ring-white">
              {initial}
            </div>
          )}
          <div className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 border-2 border-white" title="Online" />
        </div>
        <div className="hidden md:block text-left">
          <div className="text-xs font-extrabold text-slate-900 truncate max-w-[140px]">
            {user?.fullName || 'User'}
          </div>
          <div className="text-[9px] font-extrabold text-slate-500 truncate max-w-[140px] uppercase tracking-wider flex items-center gap-1">
            <RoleIcon className="h-2 w-2" />
            {roleInfo.label}
          </div>
        </div>
        <ChevronDown
          className={`h-3.5 w-3.5 text-slate-500 transition-transform hidden md:block ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 rounded-2xl bg-white border-2 border-slate-200 shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          {/* HEADER — profile card */}
          <div className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-brand-900 to-emerald-800 text-white p-4">
            <div className="absolute -top-8 -right-8 h-24 w-24 rounded-full bg-emerald-400/20 blur-2xl" />
            <div className="absolute -bottom-8 -left-8 h-24 w-24 rounded-full bg-amber-400/15 blur-2xl" />

            <div className="relative flex items-center gap-3">
              <div className="relative">
                {user?.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={user.fullName}
                    className="h-14 w-14 rounded-2xl object-cover ring-4 ring-white/20 shadow-lg"
                  />
                ) : (
                  <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-white/20 to-white/10 backdrop-blur text-white flex items-center justify-center text-xl font-extrabold shadow-lg ring-4 ring-white/20">
                    {initial}
                  </div>
                )}
                <div className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-emerald-500 border-2 border-slate-900" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-extrabold text-lg truncate leading-tight">{user?.fullName || 'User'}</div>
                <div className="text-xs text-white/80 truncate mt-0.5">{user?.email}</div>
                <div className={`mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold border ${roleInfo.color}`}>
                  <RoleIcon className="h-2.5 w-2.5" />
                  {roleInfo.label}
                </div>
              </div>
            </div>
          </div>

          {/* SHOP CARD */}
          {tenant && (
            <div className="px-4 py-3 border-b border-slate-100 bg-gradient-to-br from-emerald-50 to-white flex items-center gap-2">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 text-white flex items-center justify-center shrink-0 shadow">
                <Store className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[9px] uppercase tracking-widest text-emerald-700 font-extrabold flex items-center gap-1">
                  <Sparkles className="h-2 w-2" />
                  Current Shop
                </div>
                <div className="text-sm font-extrabold text-slate-900 truncate">{tenant.name}</div>
                {tenant.slug && (
                  <div className="text-[10px] text-slate-500 font-mono">@{tenant.slug}</div>
                )}
              </div>
            </div>
          )}

          {/* THEME SWITCHER */}
          <div className="px-4 py-3 border-b border-slate-100">
            <div className="text-[9px] uppercase tracking-widest text-slate-500 font-extrabold mb-2 flex items-center gap-1">
              <Palette className="h-2.5 w-2.5" />
              Theme
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              <ThemeButton icon={Sun} label="Light" active={theme === 'light'} onClick={() => setTheme('light')} />
              <ThemeButton icon={Moon} label="Dark" active={theme === 'dark'} onClick={() => setTheme('dark')} />
              <ThemeButton icon={Monitor} label="Auto" active={theme === 'auto'} onClick={() => setTheme('auto')} />
            </div>
          </div>

          {/* MENU ITEMS */}
          <div className="py-1">
            <MenuItem to="/profile" icon={User} label="My Profile" onClick={() => setOpen(false)} />
            <MenuItem to="/notifications" icon={Bell} label="Notifications" onClick={() => setOpen(false)} />
            <MenuItem to="/settings" icon={SettingsIcon} label="Settings" onClick={() => setOpen(false)} />
            <MenuItem to="/billing" icon={CreditCard} label="Billing & Plans" onClick={() => setOpen(false)} />
            <MenuItem to="/shops" icon={Building2} label="Shops / Branches" onClick={() => setOpen(false)} />
          </div>

          <div className="border-t border-slate-100 py-1">
            <MenuItem to="/help" icon={HelpCircle} label="Help Center" onClick={() => setOpen(false)} />
            <MenuItem to="/legal" icon={ScrollText} label="Terms & Privacy" onClick={() => setOpen(false)} />
          </div>

          {/* LOGOUT */}
          <div className="border-t-2 border-slate-100 py-1 bg-gradient-to-b from-slate-50/50 to-white">
            <button
              onClick={() => {
                setOpen(false);
                onLogout();
              }}
              className="w-full px-4 py-2.5 flex items-center gap-3 text-sm font-extrabold text-rose-600 hover:bg-rose-50 transition"
            >
              <div className="h-8 w-8 rounded-lg bg-rose-100 flex items-center justify-center">
                <LogOut className="h-4 w-4" />
              </div>
              <span className="flex-1 text-left">Logout</span>
              <ChevronRight className="h-3.5 w-3.5 text-rose-400" />
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
      className="w-full px-4 py-2 flex items-center gap-3 text-sm font-bold text-slate-700 hover:bg-slate-50 hover:text-brand-700 transition group"
    >
      <div className="h-8 w-8 rounded-lg bg-slate-100 group-hover:bg-brand-100 flex items-center justify-center transition">
        <Icon className="h-3.5 w-3.5 text-slate-500 group-hover:text-brand-700 transition" />
      </div>
      <span className="flex-1">{label}</span>
      <ChevronRight className="h-3.5 w-3.5 text-slate-300 group-hover:text-brand-500 group-hover:translate-x-0.5 transition" />
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
          ? 'bg-gradient-to-br from-brand-100 to-emerald-50 border-brand-400 text-brand-700 shadow-sm'
          : 'bg-white border-slate-200 hover:border-slate-300 text-slate-600 hover:text-slate-800'
      }`}
    >
      <Icon className="h-4 w-4" />
      <span className="text-[10px] font-extrabold">{label}</span>
    </button>
  );
}
