import { useCallback, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Bell, Building2, ChevronDown, ChevronRight, CreditCard, Crown, HelpCircle, LogOut, Monitor, Moon,
  ScrollText, Settings, Shield, Store, Sun, User,
} from 'lucide-react';
import { useThemeStore } from '@core/stores/theme.store';
import { cn } from '@core/lib/cn';
import { Avatar, Panel, useDismiss } from './shell-ui';

interface Props {
  user: any;
  tenant: any;
  onLogout: () => void;
}

const ROLES: Record<string, { label: string; icon: any; tone: string }> = {
  OWNER: { label: 'Owner', icon: Crown, tone: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300' },
  MANAGER: { label: 'Manager', icon: Shield, tone: 'bg-violet-100 text-violet-800 dark:bg-violet-500/15 dark:text-violet-300' },
  CASHIER: { label: 'Cashier', icon: User, tone: 'bg-blue-100 text-blue-800 dark:bg-blue-500/15 dark:text-blue-300' },
  STAFF: { label: 'Staff', icon: User, tone: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
  SUPER_ADMIN: { label: 'Super admin', icon: Crown, tone: 'bg-rose-100 text-rose-800 dark:bg-rose-500/15 dark:text-rose-300' },
};

export function ProfileDropdown({ user, tenant, onLogout }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const mode = useThemeStore((s) => s.mode);
  const setMode = useThemeStore((s) => s.setMode);
  const close = useCallback(() => setOpen(false), []);
  useDismiss(ref, open, close);

  const role = ROLES[user?.role] ?? ROLES.STAFF;
  const RoleIcon = role.icon;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label="Account menu"
        className={cn('flex items-center gap-2 rounded-xl p-1 transition md:pr-2',
          open ? 'bg-slate-100 dark:bg-slate-800' : 'hover:bg-slate-100 dark:hover:bg-slate-800')}
      >
        <span className="relative">
          <Avatar name={user?.fullName} url={user?.avatarUrl} size={32} />
          <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-500 dark:border-slate-900" />
        </span>
        <span className="hidden min-w-0 text-left md:block">
          <span className="block max-w-[140px] truncate text-[13px] font-semibold leading-tight text-slate-900 dark:text-white">{user?.fullName || 'User'}</span>
          <span className="block text-[11px] leading-tight text-slate-500">{role.label}</span>
        </span>
        <ChevronDown className={cn('hidden h-3.5 w-3.5 text-slate-400 transition-transform md:block', open && 'rotate-180')} />
      </button>

      <Panel open={open} onClose={close} widthClass="sm:w-[320px]" label="Account menu">
        <div className="overflow-y-auto">
          {/* User */}
          <div className="flex items-center gap-3 px-4 pb-3 pt-3 sm:pt-4">
            <Avatar name={user?.fullName} url={user?.avatarUrl} size={44} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-[15px] font-semibold">{user?.fullName || 'User'}</div>
              <div className="truncate text-[12.5px] text-slate-500">{user?.email}</div>
              <span className={cn('mt-1 inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-semibold', role.tone)}>
                <RoleIcon className="h-3 w-3" /> {role.label}
              </span>
            </div>
          </div>

          {/* Store */}
          {tenant && (
            <Link to="/settings" onClick={close}
              className="mx-3 mb-3 flex items-center gap-3 rounded-xl border border-slate-200 p-2.5 transition hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/60">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                <Store className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13.5px] font-semibold">{tenant.name}</span>
                <span className="block truncate text-[12px] text-slate-500">{tenant.slug ? `@${tenant.slug} · ` : ''}Store settings</span>
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
            </Link>
          )}

          {/* Theme */}
          <div className="border-y border-slate-100 px-4 py-3 dark:border-slate-800">
            <div className="mb-2 text-[12px] font-semibold text-slate-500">Appearance</div>
            <div role="radiogroup" aria-label="Theme" className="grid grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
              {([['light', 'Light', Sun], ['dark', 'Dark', Moon], ['system', 'System', Monitor]] as const).map(([m, label, Icon]) => (
                <button key={m} role="radio" aria-checked={mode === m} onClick={() => setMode(m)}
                  className={cn('flex h-8 items-center justify-center gap-1.5 rounded-lg text-[12px] font-semibold transition',
                    mode === m ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-white' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200')}>
                  <Icon className="h-3.5 w-3.5" /> {label}
                </button>
              ))}
            </div>
          </div>

          <div className="py-1.5">
            <Row to="/profile" icon={User} label="My profile" onClick={close} />
            <Row to="/notifications" icon={Bell} label="Notifications" onClick={close} />
            <Row to="/settings" icon={Settings} label="Settings" onClick={close} />
            <Row to="/billing" icon={CreditCard} label="Billing & plan" onClick={close} />
            <Row to="/shops" icon={Building2} label="Branches" onClick={close} />
          </div>
          <div className="border-t border-slate-100 py-1.5 dark:border-slate-800">
            <Row to="/help" icon={HelpCircle} label="Help center" onClick={close} />
            <Row to="/legal" icon={ScrollText} label="Terms & privacy" onClick={close} />
          </div>
          <div className="border-t border-slate-100 p-2 dark:border-slate-800">
            <button onClick={() => { close(); onLogout(); }}
              className="flex w-full items-center gap-3 rounded-xl px-2.5 py-2.5 text-[13.5px] font-semibold text-rose-600 transition hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10">
              <LogOut className="h-4 w-4" /> Log out
            </button>
          </div>
        </div>
      </Panel>
    </div>
  );
}

function Row({ to, icon: Icon, label, onClick }: { to: string; icon: any; label: string; onClick: () => void }) {
  return (
    <Link to={to} onClick={onClick}
      className="mx-2 flex items-center gap-3 rounded-xl px-2.5 py-2 text-[13.5px] font-medium text-slate-700 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:text-white">
      <Icon className="h-4 w-4 text-slate-500" />
      <span className="flex-1">{label}</span>
    </Link>
  );
}