/**
 * Settings frame, laid out like Meta Business Suite settings.
 *
 * Left: one sidebar flush with the screen edge — store card, search, folders
 * that open and close (the folder of the current page opens by itself), the
 * signed-in user and a button that folds the sidebar to icons. On phones the
 * sidebar is a drawer.
 * Right: the page header (icon, title, description, a slot for the page's
 * save state and actions, close button) and the page itself.
 *
 * Search finds pages and single settings; picking a setting opens its page
 * and points at the card that holds it. Folder state and the folded sidebar
 * are remembered on this device.
 */

import { useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowUpRight, ChevronDown, ChevronRight, CornerDownLeft, Menu, PanelLeftClose, PanelLeftOpen, Search, SearchX, Settings, X,
} from 'lucide-react';
import { cn } from '@core/lib/cn';
import { Avatar, IconButton, PAGE_WIDTH_CLASS } from '@/design-system/components';
import { SETTING_FIND_KEY, SettingsHeaderSlot } from '@modules/organization/settings/components/SettingsFrame';
import {
  LAST_APP_PATH_KEY, SETTINGS_HOME, canSeeSettingsItem, searchSettings, settingsGroupFor, settingsItemFor,
  visibleSettingsGroups, type SettingsGroup, type SettingsHit, type SettingsItem,
} from '../navigation/nav-config';

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

const RAIL_KEY = 'nafaa-settings-rail';
const FOLDERS_KEY = 'nafaa-settings-folders';

const readStored = <T,>(key: string, fallback: T): T => {
  try { const raw = localStorage.getItem(key); return raw ? (JSON.parse(raw) as T) : fallback; } catch { return fallback; }
};
const writeStored = (key: string, value: unknown) => {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage unavailable */ }
};

export function SettingsShell({ role, permissions, tenantName, tenantSlug, userName, userEmail, avatarUrl, children }: Props) {
  const location = useLocation();
  const navigate = useNavigate();
  const rootRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [frameHeight, setFrameHeight] = useState<number>();
  const [rail, setRail] = useState(() => readStored(RAIL_KEY, false));
  const [folders, setFolders] = useState<Record<string, boolean>>(() => readStored(FOLDERS_KEY, {}));
  const [drawer, setDrawer] = useState(false);
  const [slot, setSlot] = useState<HTMLElement | null>(null);

  const groups = useMemo(() => visibleSettingsGroups(role, permissions), [role, permissions]);
  const showHome = canSeeSettingsItem(SETTINGS_HOME, role, permissions);
  const current = settingsItemFor(location.pathname);
  const currentGroup = settingsGroupFor(current);
  const isHome = current === SETTINGS_HOME;
  const PageIcon = current?.icon ?? Settings;

  // The sidebar is exactly as tall as the scrolling area it sits in.
  useEffect(() => {
    const host = rootRef.current?.parentElement;
    if (!host || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => setFrameHeight(host.clientHeight));
    observer.observe(host);
    return () => observer.disconnect();
  }, []);

  useEffect(() => { setDrawer(false); }, [location.pathname]);

  useEffect(() => {
    if (!drawer) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setDrawer(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [drawer]);

  const setFolder = (id: string, open: boolean) => setFolders((prev) => {
    if (!!prev[id] === open) return prev;
    const next = { ...prev, [id]: open };
    writeStored(FOLDERS_KEY, next);
    return next;
  });

  // The folder holding the current page opens by itself.
  useEffect(() => {
    if (currentGroup && !currentGroup.flat) setFolder(currentGroup.id, true);
  }, [currentGroup]);

  const setRailMode = (on: boolean) => { setRail(on); writeStored(RAIL_KEY, on); };

  // A setting picked in search: scroll to its card and mark it for a moment.
  useEffect(() => {
    const find = (location.state as Record<string, unknown> | null)?.[SETTING_FIND_KEY];
    if (typeof find !== 'string' || !find) return;
    const needle = find.toLowerCase();
    let tries = 0;
    let lookTimer = 0;
    let markTimer = 0;
    const look = () => {
      const cards = [...(contentRef.current?.querySelectorAll<HTMLElement>('[data-setting-card]') ?? [])];
      // A card titled with the text wins over a card that only mentions it.
      const target = cards.find((el) => el.dataset.settingCard?.toLowerCase().includes(needle))
        ?? cards.find((el) => el.textContent?.toLowerCase().includes(needle));
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        target.classList.add('ring-2', 'ring-brand-500');
        markTimer = window.setTimeout(() => target.classList.remove('ring-2', 'ring-brand-500'), 1800);
      } else if (++tries < 30) {
        // The page may still be loading its data.
        lookTimer = window.setTimeout(look, 100);
      }
    };
    lookTimer = window.setTimeout(look, 60);
    return () => { window.clearTimeout(lookTimer); window.clearTimeout(markTimer); };
  }, [location.key, location.state]);

  const pick = (hit: SettingsHit) => {
    if (hit.find) navigate(hit.to, { state: { [SETTING_FIND_KEY]: hit.find } });
    else navigate(hit.to);
  };

  const close = () => {
    let back = '/dashboard';
    try { back = sessionStorage.getItem(LAST_APP_PATH_KEY) || back; } catch { /* storage unavailable */ }
    navigate(back);
  };

  const sidebarProps = {
    groups, showHome, current, folders, onFolder: setFolder, onPick: pick,
    tenantName, tenantSlug, userName, userEmail, avatarUrl,
  };

  const title = isHome ? 'Settings' : current?.label ?? 'Settings';
  const desc = isHome ? 'Apne store ki har setting — folder kholein ya search karein' : current?.desc;
  const danger = !!currentGroup?.danger;

  return (
    <div ref={rootRef} className="flex min-h-full"
      style={{ '--settings-frame': frameHeight ? `${frameHeight}px` : '100dvh' } as React.CSSProperties}>
      <aside aria-label="Settings"
        className={cn(
          'sticky top-0 hidden h-[var(--settings-frame)] shrink-0 flex-col border-r border-shell-line bg-shell-bar transition-[width] duration-200 lg:flex print:hidden',
          rail ? 'w-[72px]' : 'w-[280px]',
        )}>
        {rail ? (
          <SettingsRail {...sidebarProps}
            onOpenFolder={(id) => { setFolder(id, true); setRailMode(false); }}
            onSearch={() => { setRailMode(false); window.setTimeout(() => searchRef.current?.focus(), 50); }}
            onExpand={() => setRailMode(false)} />
        ) : (
          <SettingsSidebar {...sidebarProps} searchRef={searchRef} onCollapse={() => setRailMode(true)} />
        )}
      </aside>

      {drawer && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Settings menu">
          <button type="button" aria-label="Menu band karein" onClick={() => setDrawer(false)} className="absolute inset-0 bg-slate-950/50" />
          <aside className="absolute inset-y-0 left-0 flex w-[300px] max-w-[86vw] flex-col bg-shell-bar shadow-2xl">
            <SettingsSidebar {...sidebarProps} onClose={() => setDrawer(false)} />
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 border-b border-shell-line bg-shell-canvas/95 backdrop-blur print:hidden">
          <div className={cn(PAGE_WIDTH_CLASS, 'flex min-h-16 items-center gap-3 px-4 py-2.5 sm:px-6 lg:px-8')}>
            <IconButton label="Settings menu" onClick={() => setDrawer(true)} variant="secondary" size="lg" className="lg:hidden">
              <Menu className="h-5 w-5" />
            </IconButton>
            <span className={cn('hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl sm:flex',
              danger ? 'bg-rose-50 text-rose-600' : 'bg-brand-50 text-brand-700')}>
              <PageIcon className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              {!isHome && (
                <nav aria-label="Breadcrumb" className="hidden items-center gap-1 text-[0.75rem] text-slate-500 sm:flex">
                  {showHome ? <Link to="/settings" className="hover:text-slate-900 hover:underline">Settings</Link> : <span>Settings</span>}
                  {currentGroup && !currentGroup.flat && <><ChevronRight className="h-3 w-3" /><span className="truncate">{currentGroup.title}</span></>}
                </nav>
              )}
              <h1 className="truncate text-[1.0625rem] font-semibold leading-tight text-slate-900 sm:text-[1.25rem]">{title}</h1>
              {desc && <p className="hidden truncate text-[0.8125rem] text-slate-500 md:block">{desc}</p>}
            </div>
            <div ref={setSlot} className="flex shrink-0 items-center gap-2" />
            <IconButton label="Settings band karein" onClick={close} variant="secondary" size="lg">
              <X className="h-5 w-5" />
            </IconButton>
          </div>
        </header>

        <div ref={contentRef} className={cn(PAGE_WIDTH_CLASS, 'flex-1 px-4 pb-16 pt-5 sm:px-6 lg:px-8')}>
          <SettingsHeaderSlot.Provider value={slot}>{children}</SettingsHeaderSlot.Provider>
        </div>
      </div>
    </div>
  );
}

/* ─── Sidebar ─── */

type SidebarProps = {
  groups: SettingsGroup[];
  showHome: boolean;
  current?: SettingsItem;
  folders: Record<string, boolean>;
  onFolder: (id: string, open: boolean) => void;
  onPick: (hit: SettingsHit) => void;
  tenantName?: string;
  tenantSlug?: string;
  userName?: string;
  userEmail?: string;
  avatarUrl?: string;
};

function StoreMark({ name, size = 'md' }: { name?: string; size?: 'md' | 'sm' }) {
  return (
    <span className={cn('flex shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 font-bold text-brand-fg',
      size === 'md' ? 'h-10 w-10 text-sm' : 'h-9 w-9 text-[0.8125rem]')}>
      {(name || 'N').charAt(0).toUpperCase()}
    </span>
  );
}

function SettingsSidebar({ groups, showHome, current, folders, onFolder, onPick, tenantName, tenantSlug, userName, userEmail, avatarUrl, searchRef, onCollapse, onClose }: SidebarProps & {
  searchRef?: RefObject<HTMLInputElement | null>;
  onCollapse?: () => void;
  onClose?: () => void;
}) {
  const [q, setQ] = useState('');
  const [active, setActive] = useState(0);
  const hits = useMemo(() => searchSettings(q, groups), [q, groups]);
  const searching = q.trim().length > 0;

  useEffect(() => { setActive(0); }, [q]);

  const choose = (hit: SettingsHit) => { setQ(''); onPick(hit); };

  const store = (
    <>
      <StoreMark name={tenantName} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[0.9375rem] font-semibold text-slate-900">{tenantName || 'My store'}</span>
        <span className="block truncate text-[0.75rem] text-slate-500">{tenantSlug ? `@${tenantSlug}` : 'Business settings'}</span>
      </span>
    </>
  );

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center gap-2 px-3 pb-2 pt-3">
        {showHome
          ? <Link to="/settings" className="flex min-w-0 flex-1 items-center gap-3 rounded-xl p-1.5 transition hover:bg-slate-100">{store}</Link>
          : <div className="flex min-w-0 flex-1 items-center gap-3 p-1.5">{store}</div>}
        {onClose && <IconButton label="Menu band karein" onClick={onClose}><X className="h-5 w-5" /></IconButton>}
      </div>

      <div className="px-3 pb-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input ref={searchRef} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Settings search karein" aria-label="Settings search karein"
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') { e.preventDefault(); setActive((i) => Math.min(i + 1, hits.length - 1)); }
              if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => Math.max(i - 1, 0)); }
              if (e.key === 'Enter' && hits[active]) choose(hits[active]);
              if (e.key === 'Escape') setQ('');
            }}
            className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-9 text-[0.875rem] text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20" />
          {q && (
            <button type="button" onClick={() => setQ('')} aria-label="Search saaf karein"
              className="absolute right-1.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      <nav aria-label="Settings" className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-3">
        {searching ? (
          hits.length === 0 ? (
            <div className="px-3 py-10 text-center">
              <SearchX className="mx-auto h-7 w-7 text-slate-300" />
              <p className="mt-2 text-[0.8125rem] font-semibold text-slate-700">“{q.trim()}” nahi mila</p>
              <p className="mt-0.5 text-[0.75rem] text-slate-500">Koi aur lafz likhein, jaise “PIN”, “logo” ya “Discount”</p>
            </div>
          ) : (
            <ul role="listbox" aria-label="Search results" className="space-y-0.5">
              {hits.map((h, i) => (
                <li key={`${h.to}|${h.find ?? ''}`} role="option" aria-selected={i === active}>
                  <button type="button" onMouseEnter={() => setActive(i)} onClick={() => choose(h)}
                    className={cn('flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition', i === active ? 'bg-slate-100' : 'hover:bg-slate-50')}>
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                      <h.icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[0.8125rem] font-semibold text-slate-900">{h.label}</span>
                      <span className="block truncate text-[0.6875rem] text-slate-500">{h.find ? h.sub : `Page · ${h.sub}`}</span>
                    </span>
                    {i === active ? <CornerDownLeft className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                      : h.external ? <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-slate-400" /> : null}
                  </button>
                </li>
              ))}
            </ul>
          )
        ) : (
          <div className="space-y-0.5">
            {showHome && <TopLink item={SETTINGS_HOME} active={current === SETTINGS_HOME} />}
            {groups.map((g) => (g.flat ? (
              <div key={g.id} className={cn(g.danger && 'mt-2 border-t border-slate-100 pt-2')}>
                <TopLink item={g.items[0]} active={current === g.items[0]} danger={g.danger} />
              </div>
            ) : (
              <Folder key={g.id} group={g} open={!!folders[g.id]} current={current} onToggle={(open) => onFolder(g.id, open)} />
            )))}
          </div>
        )}
      </nav>

      <div className="flex items-center gap-2 border-t border-shell-line p-3">
        <Link to="/profile" className="flex min-w-0 flex-1 items-center gap-2.5 rounded-xl p-1.5 transition hover:bg-slate-100">
          <Avatar name={userName} url={avatarUrl} size={32} />
          <span className="min-w-0">
            <span className="block truncate text-[0.8125rem] font-semibold text-slate-900">{userName || 'My profile'}</span>
            {userEmail && <span className="block truncate text-[0.6875rem] text-slate-500">{userEmail}</span>}
          </span>
        </Link>
        {onCollapse && (
          <IconButton label="Sidebar chhota karein" onClick={onCollapse}>
            <PanelLeftClose className="h-[18px] w-[18px]" />
          </IconButton>
        )}
      </div>
    </div>
  );
}

function TopLink({ item, active, danger }: { item: SettingsItem; active: boolean; danger?: boolean }) {
  const Icon = item.icon;
  return (
    <Link to={item.to} aria-current={active ? 'page' : undefined}
      className={cn('flex items-center gap-3 rounded-xl px-2 py-2 transition',
        active
          ? danger ? 'bg-rose-600 text-white shadow-sm' : 'bg-brand-600 text-brand-fg shadow-sm'
          : danger ? 'text-rose-700 hover:bg-rose-50' : 'text-slate-700 hover:bg-slate-100')}>
      <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
        active ? 'bg-white/15' : danger ? 'bg-rose-50 text-rose-600' : 'bg-slate-100 text-slate-600')}>
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1 truncate text-[0.875rem] font-semibold">{item.label}</span>
    </Link>
  );
}

function Folder({ group, open, current, onToggle }: { group: SettingsGroup; open: boolean; current?: SettingsItem; onToggle: (open: boolean) => void }) {
  const Icon = group.icon;
  const holdsCurrent = !!current && group.items.includes(current);
  return (
    <div>
      <button type="button" onClick={() => onToggle(!open)} aria-expanded={open}
        className={cn('flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition hover:bg-slate-100', holdsCurrent && !open && 'bg-slate-100/70')}>
        <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', holdsCurrent ? 'bg-brand-50 text-brand-700' : 'bg-slate-100 text-slate-600')}>
          <Icon className="h-4 w-4" />
        </span>
        <span className={cn('min-w-0 flex-1 truncate text-[0.875rem]', holdsCurrent ? 'font-semibold text-slate-900' : 'font-medium text-slate-700')}>{group.title}</span>
        <ChevronDown className={cn('h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200', !open && '-rotate-90')} />
      </button>
      {open && (
        <ul className="mb-1.5 mt-0.5 space-y-0.5 pl-[2.75rem]">
          {group.items.map((item) => {
            const on = item === current;
            return (
              <li key={item.to}>
                <Link to={item.to} aria-current={on ? 'page' : undefined} title={item.desc}
                  className={cn('flex items-center gap-2 rounded-lg px-3 py-[0.4375rem] text-[0.8125rem] transition',
                    on ? 'bg-brand-600 font-semibold text-brand-fg shadow-sm' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900')}>
                  <span className="min-w-0 flex-1 truncate">{item.label}</span>
                  {item.external && <ArrowUpRight className="h-3.5 w-3.5 shrink-0 opacity-60" aria-label="App ka page" />}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/* ─── Folded sidebar: icons only ─── */

function SettingsRail({ groups, showHome, current, tenantName, userName, avatarUrl, onOpenFolder, onSearch, onExpand }: SidebarProps & {
  onOpenFolder: (id: string) => void;
  onSearch: () => void;
  onExpand: () => void;
}) {
  const button = (on: boolean, danger?: boolean) => cn('flex h-10 w-10 items-center justify-center rounded-xl transition',
    on ? (danger ? 'bg-rose-600 text-white' : 'bg-brand-600 text-brand-fg') : danger ? 'text-rose-600 hover:bg-rose-50' : 'text-slate-600 hover:bg-slate-100');
  return (
    <div className="flex h-full min-h-0 flex-col items-center py-3">
      {showHome ? <Link to="/settings" title={tenantName || 'Settings'} aria-label="Settings overview"><StoreMark name={tenantName} size="sm" /></Link> : <StoreMark name={tenantName} size="sm" />}
      <IconButton label="Settings search karein" onClick={onSearch} size="lg" className="mt-2"><Search className="h-[18px] w-[18px]" /></IconButton>
      <div className="my-2 h-px w-8 bg-slate-200" />
      <nav aria-label="Settings" className="flex min-h-0 flex-1 flex-col items-center gap-1 overflow-y-auto">
        {showHome && (
          <Link to="/settings" title={SETTINGS_HOME.label} aria-label={SETTINGS_HOME.label} className={button(current === SETTINGS_HOME)}>
            <SETTINGS_HOME.icon className="h-[18px] w-[18px]" />
          </Link>
        )}
        {groups.map((g) => {
          const on = !!current && g.items.includes(current);
          return g.flat ? (
            <Link key={g.id} to={g.items[0].to} title={g.title} aria-label={g.title} className={cn(button(on, g.danger), g.danger && 'mt-auto')}>
              <g.icon className="h-[18px] w-[18px]" />
            </Link>
          ) : (
            <button key={g.id} type="button" title={g.title} aria-label={g.title} onClick={() => onOpenFolder(g.id)} className={button(on)}>
              <g.icon className="h-[18px] w-[18px]" />
            </button>
          );
        })}
      </nav>
      <div className="mt-2 flex flex-col items-center gap-2 border-t border-shell-line pt-3">
        <Link to="/profile" title={userName || 'My profile'} aria-label="My profile"><Avatar name={userName} url={avatarUrl} size={32} /></Link>
        <IconButton label="Sidebar bara karein" onClick={onExpand}><PanelLeftOpen className="h-[18px] w-[18px]" /></IconButton>
      </div>
    </div>
  );
}
