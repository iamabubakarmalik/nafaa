import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { ChevronDown, Search, Settings, X } from 'lucide-react';
import { hasPermission, isOwner, isOwnerOnlyPath } from '@core/lib/permissions';
import { cn } from '@core/lib/cn';
import { LAST_APP_PATH_KEY, SETTINGS_SECTIONS, settingsItemFor } from '../navigation/nav-config';
import { Avatar, IconButton } from '@/design-system/components';

/* ═════════════════════════════════════════════════════════════
   SETTINGS — opens without the app sidebar, like Shopify.
   Left: store card, search, every settings section.
   Right: the page. The X goes back to where you were.
   ═════════════════════════════════════════════════════════════ */

type Props = {
  role?: any;
  permissions?: string[];
  tenantName?: string;
  tenantSlug?: string;
  userName?: string;
  userEmail?: string;
  avatarUrl?: string;
  children: ReactNode;
};

export function SettingsShell({ role, permissions, tenantName, tenantSlug, userName, userEmail, avatarUrl, children }: Props) {
  const location = useLocation();
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [mobileNav, setMobileNav] = useState(false);

  const sections = useMemo(() => {
    const owner = isOwner(role);
    return SETTINGS_SECTIONS
      .map((s) => ({
        ...s,
        items: s.items.filter((i) => (owner || !isOwnerOnlyPath(i.to)) && (!i.permission || hasPermission(role, permissions, i.permission))),
      }))
      .filter((s) => s.items.length > 0);
  }, [role, permissions]);

  const query = q.trim().toLowerCase();
  const shown = useMemo(
    () => (query
      ? sections.map((s) => ({ ...s, items: s.items.filter((i) => `${i.label} ${i.desc} ${i.keywords ?? ''}`.toLowerCase().includes(query)) })).filter((s) => s.items.length)
      : sections),
    [sections, query],
  );

  const current = settingsItemFor(location.pathname);
  const CurrentIcon = current?.icon ?? Settings;

  useEffect(() => { setMobileNav(false); }, [location.pathname]);

  const close = () => {
    let back = '/dashboard';
    try { back = sessionStorage.getItem(LAST_APP_PATH_KEY) || back; } catch { /* ignore */ }
    navigate(back);
  };

  const nav = (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-ink-800 dark:bg-ink-900">
      <div className="flex items-center gap-3 border-b border-slate-100 p-4 dark:border-ink-800">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-sm font-bold text-brand-fg">
          {(tenantName || 'N').charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0">
          <div className="truncate text-[0.9375rem] font-semibold text-slate-900 dark:text-ink-white">{tenantName || 'My store'}</div>
          {tenantSlug && <div className="truncate text-[0.8125rem] text-slate-500">@{tenantSlug}</div>}
        </div>
      </div>

      <div className="p-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search settings" aria-label="Search settings"
            className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-[0.875rem] text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-ink-700 dark:bg-ink-800 dark:text-ink-white" />
        </div>
      </div>

      <nav aria-label="Settings" className="max-h-[calc(100dvh-330px)] overflow-y-auto px-2 pb-2 lg:max-h-[calc(100dvh-300px)]">
        {shown.map((s) => (
          <div key={s.title} className="pb-2">
            <div className="px-3 pb-1 pt-2 text-[0.75rem] font-semibold text-slate-400">{s.title}</div>
            {s.items.map((i) => {
              const Icon = i.icon;
              const active = current?.to === i.to;
              return (
                <NavLink key={i.to} to={i.to}
                  className={cn('flex items-center gap-3 rounded-xl px-3 py-2 transition-colors',
                    active ? 'bg-slate-100 text-slate-900 dark:bg-ink-800 dark:text-ink-white' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-ink-300 dark:hover:bg-ink-800/60 dark:hover:text-ink-white')}>
                  <Icon className={cn('h-[18px] w-[18px] shrink-0', active ? 'text-brand-600 dark:text-brand-400' : 'text-slate-500')} />
                  <span className="min-w-0 flex-1">
                    <span className={cn('block truncate text-[0.875rem]', active ? 'font-semibold' : 'font-medium')}>{i.label}</span>
                    {query && <span className="block truncate text-[0.75rem] text-slate-500">{i.desc}</span>}
                  </span>
                </NavLink>
              );
            })}
          </div>
        ))}
        {shown.length === 0 && <div className="px-3 py-6 text-center text-[0.8125rem] text-slate-500">No settings match “{q}”</div>}
      </nav>

      {(userName || userEmail) && (
        <div className="flex items-center gap-3 border-t border-slate-100 p-4 dark:border-ink-800">
          <Avatar name={userName} url={avatarUrl} size={34} />
          <div className="min-w-0">
            <div className="truncate text-[0.8125rem] font-semibold text-slate-900 dark:text-ink-white">{userName}</div>
            <div className="truncate text-[0.75rem] text-slate-500">{userEmail}</div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="mx-auto w-full max-w-[1500px] px-3 py-3 sm:px-6 sm:py-6">
      {/* Phone / tablet header */}
      <div className="mb-3 flex items-center gap-2 lg:hidden">
        <button onClick={() => setMobileNav((v) => !v)} aria-expanded={mobileNav}
          className="flex h-12 min-w-0 flex-1 items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 text-left shadow-sm dark:border-ink-800 dark:bg-ink-900">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 dark:bg-ink-800">
            <CurrentIcon className="h-4 w-4 text-brand-600 dark:text-brand-400" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[0.6875rem] font-medium text-slate-500">Settings</span>
            <span className="block truncate text-[0.875rem] font-semibold text-slate-900 dark:text-ink-white">{current?.label ?? 'All settings'}</span>
          </span>
          <ChevronDown className={cn('h-4 w-4 shrink-0 text-slate-400 transition-transform', mobileNav && 'rotate-180')} />
        </button>
        <IconButton label="Close settings" onClick={close}
          className="h-12 w-12 rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-ink-800 dark:bg-ink-900">
          <X className="h-5 w-5" />
        </IconButton>
      </div>
      {mobileNav && <div className="mb-4 lg:hidden">{nav}</div>}

      <div className="grid items-start gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="sticky top-6 hidden lg:block">{nav}</aside>

        <section className="min-w-0">
          <div className="mb-4 hidden items-center gap-3 lg:flex">
            <CurrentIcon className="h-5 w-5 text-slate-500" />
            <div className="min-w-0">
              <h1 className="text-[1.25rem] font-semibold leading-tight text-slate-900 dark:text-ink-white">{current?.label ?? 'Settings'}</h1>
              {current?.desc && <p className="truncate text-[0.8125rem] text-slate-500">{current.desc}</p>}
            </div>
            <IconButton label="Close settings" onClick={close}
              className="ml-auto h-10 w-10 rounded-xl border border-slate-200 bg-white shadow-sm dark:border-ink-800 dark:bg-ink-900">
              <X className="h-5 w-5" />
            </IconButton>
          </div>
          {children}
        </section>
      </div>
    </div>
  );
}