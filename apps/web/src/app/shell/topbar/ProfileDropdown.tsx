import { useCallback, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Bell, Building2, ChevronDown, ChevronRight, CreditCard, Crown, HelpCircle, LogOut, Monitor, Moon,
  Palette, ScrollText, Settings, Shield, Store, Sun, User,
} from 'lucide-react';
import { useAppearanceStore } from '@/design-system';
import { cn } from '@core/lib/cn';
import { Avatar, Badge, Segmented, type BadgeVariant } from '@/design-system/components';
import { Panel, useDismiss } from '../ui';
import { LanguageSwitch } from '@core/i18n/components/LanguagePicker';
import { t } from '@core/i18n';

interface Props {
  user: any;
  tenant: any;
  onLogout: () => void;
}

const ROLES: Record<string, { label: string; icon: any; tone: BadgeVariant }> = {
  OWNER: { label: t('Owner'), icon: Crown, tone: 'accent' },
  MANAGER: { label: t('Manager'), icon: Shield, tone: 'brand' },
  CASHIER: { label: t('Cashier'), icon: User, tone: 'info' },
  STAFF: { label: t('Staff'), icon: User, tone: 'default' },
  SUPER_ADMIN: { label: t('Super admin'), icon: Crown, tone: 'danger' },
};

export function ProfileDropdown({ user, tenant, onLogout }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const mode = useAppearanceStore((s) => s.resolved.mode);
  const setMode = useAppearanceStore((s) => s.setMode);
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
        aria-label={t('Account menu')}
        className={cn('flex items-center gap-2 rounded-xl p-1 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 xl:pe-2',
          open ? 'bg-slate-100 dark:bg-ink-white/[0.07]' : 'hover:bg-slate-100 dark:hover:bg-ink-white/[0.05]')}
      >
        <span className="relative">
          <Avatar name={user?.fullName} url={user?.avatarUrl} size={32} />
          <span className="absolute -bottom-0.5 -end-0.5 h-2.5 w-2.5 rounded-full border-2 border-shell-bar bg-success-500" aria-label={t('Online')} />
        </span>
        <span className="hidden min-w-0 text-start xl:block">
          <span className="block max-w-[8.75rem] truncate text-[0.8125rem] font-semibold leading-tight text-slate-900 dark:text-ink-white">{user?.fullName || t('User')}</span>
          <span className="block text-[0.6875rem] leading-tight text-slate-500">{role.label}</span>
        </span>
        <ChevronDown className={cn('hidden h-3.5 w-3.5 text-slate-400 transition-transform xl:block', open && 'rotate-180')} />
      </button>

      <Panel open={open} onClose={close} widthClass="sm:w-[20rem]" label={t('Account menu')}>
        <div className="overflow-y-auto">
          {/* User */}
          <div className="flex items-center gap-3 px-4 pb-3 pt-3 sm:pt-4">
            <Avatar name={user?.fullName} url={user?.avatarUrl} size={44} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-[0.9375rem] font-semibold">{user?.fullName || t('User')}</div>
              <div className="truncate text-[0.78125rem] text-slate-500">{user?.email}</div>
              <Badge variant={role.tone} size="xs" className="mt-1 gap-1"><RoleIcon className="h-3 w-3" /> {role.label}</Badge>
            </div>
          </div>

          {/* Store */}
          {tenant && (
            <Link to="/settings" onClick={close}
              className="mx-3 mb-3 flex items-center gap-3 rounded-xl border border-slate-200 p-2.5 transition hover:bg-slate-50">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
                <Store className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[0.84375rem] font-semibold">{tenant.name}</span>
                <span className="block truncate text-[0.75rem] text-slate-500">{t('{{value}}Store settings', { value: tenant.slug ? `@${tenant.slug} · ` : '' })}</span>
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-slate-400 rtl-flip" />
            </Link>
          )}

          {/* Theme */}
          <div className="border-y border-slate-100 px-4 py-3">
            <div className="mb-2 text-[0.75rem] font-semibold text-slate-500">{t('Appearance')}</div>
            <Segmented label={t('Theme')} value={mode} onChange={setMode} className="grid w-full grid-cols-3 rounded-xl p-1 [&>button]:justify-center [&>button]:rounded-lg [&>button]:px-0 [&>button]:text-[0.75rem] [&_svg]:h-3.5 [&_svg]:w-3.5"
              items={([['light', t('Light'), Sun], ['dark', t('Dark'), Moon], ['system', t('System'), Monitor]] as const).map(([m, label, Icon]) => ({ value: m, label: <><Icon /> {label}</> }))} />
          </div>

          {/* Language */}
          <div className="border-b border-slate-100 px-4 py-3">
            {/* i18n-ignore: shown the same in every language so anyone can find it. */}
            <div className="mb-2 text-[0.75rem] font-semibold text-slate-500">Language / Zaban / زبان</div>
            <LanguageSwitch />
          </div>

          <div className="py-1.5">
            <Row to="/profile" icon={User} label={t('My profile')} onClick={close} />
            <Row to="/settings/appearance" icon={Palette} label={t('Appearance')} onClick={close} />
            <Row to="/notifications" icon={Bell} label={t('Notifications')} onClick={close} />
            <Row to="/settings" icon={Settings} label={t('Settings')} onClick={close} />
            <Row to="/billing" icon={CreditCard} label={t('Billing & plan')} onClick={close} />
            <Row to="/shops" icon={Building2} label={t('Branches')} onClick={close} />
          </div>
          <div className="border-t border-slate-100 py-1.5">
            <Row to="/help" icon={HelpCircle} label={t('Help center')} onClick={close} />
            <Row to="/legal" icon={ScrollText} label={t('Terms & privacy')} onClick={close} />
          </div>
          <div className="border-t border-slate-100 p-2">
            <button onClick={() => { close(); onLogout(); }}
              className="flex w-full items-center gap-3 rounded-xl px-2.5 py-2.5 text-[0.84375rem] font-semibold text-rose-600 transition hover:bg-rose-50">
              <LogOut className="h-4 w-4 rtl-flip" /> {' '}{t('Log out')}
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
      className="mx-2 flex items-center gap-3 rounded-xl px-2.5 py-2 text-[0.84375rem] font-medium text-slate-700 transition hover:bg-slate-100 hover:text-slate-900">
      <Icon className="h-4 w-4 text-slate-500" />
      <span className="flex-1">{label}</span>
    </Link>
  );
}