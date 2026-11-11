/**
 * Admin sidebar.
 *
 * Expanded (264px): brand row, a tile for every workspace, the current
 * workspace's menu with search and collapsible groups, and the signed-in
 * admin at the bottom. Collapsed (72px): an icon rail of the current
 * workspace's pages. The same component renders in the phone drawer.
 *
 * Row styles match the merchant sidebar (apps/web/src/app/shell/sidebar).
 */

import { memo, useEffect, useMemo, useRef, useState, type ComponentType, type CSSProperties } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { ChevronDown, LogOut, PanelLeftClose, PanelLeftOpen, Search, X } from 'lucide-react';
import { IconButton } from '@/design-system/components';
import { handleMenuKey } from '@/design-system/keyboard';
import { cn } from '@/lib/cn';
import { Logo } from '@/components/brand/Logo';
import { useAuthStore } from '@/store/auth.store';
import { isActivePath, type AdminNavGroup, type AdminNavItem, type AdminWorkspace } from '../navigation/nav-config';
import { useVisibleNav } from '../navigation/useVisibleNav';
import { WorkspaceMark } from './WorkspaceMark';

type IconType = ComponentType<{ className?: string; style?: CSSProperties }>;

const ROW = 'group/item relative flex h-9 items-center gap-2.5 rounded-lg ps-2.5 pe-2 text-[0.84375rem] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-brand-500';
const ROW_ACTIVE = 'bg-white font-semibold text-slate-900 shadow-sm ring-1 ring-slate-200/80 dark:bg-ink-white/[0.07] dark:text-ink-white dark:ring-ink-white/10';
const ROW_IDLE = 'font-medium text-slate-600 hover:bg-white/70 hover:text-slate-900 dark:text-ink-400 dark:hover:bg-ink-white/[0.05] dark:hover:text-ink-white';
const NAV_ITEMS = 'a[href],button[aria-expanded]';
const GROUPS_KEY = 'nafaa-admin-closed-groups';

export interface SidebarProps {
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  onItemClick?: () => void;
  onLogout: () => void;
  /** Present inside the phone drawer. */
  onClose?: () => void;
}

export const Sidebar = memo(function Sidebar(props: SidebarProps) {
  return props.collapsed ? <SidebarRail {...props} /> : <SidebarExpanded {...props} />;
});

function ActiveBar() {
  return <span className="absolute -start-2 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-e-full bg-brand-600 dark:bg-brand-400" aria-hidden />;
}

function NavRow({ item, onClick }: { item: AdminNavItem; onClick?: () => void }) {
  const Icon = item.icon as IconType;
  return (
    <NavLink to={item.to} end={item.exact} onClick={onClick} className={({ isActive }) => cn(ROW, isActive ? ROW_ACTIVE : ROW_IDLE)}>
      {({ isActive }) => (
        <>
          {isActive && <ActiveBar />}
          <Icon className={cn('h-4 w-4 shrink-0', isActive && 'text-brand-600 dark:text-brand-400')} />
          <span className="min-w-0 flex-1 truncate">{item.label}</span>
        </>
      )}
    </NavLink>
  );
}

function loadClosed(): Record<string, boolean> {
  try { return JSON.parse(localStorage.getItem(GROUPS_KEY) || '{}'); } catch { return {}; }
}

/** One tile per workspace; the current one is highlighted. */
function WorkspaceTiles({ workspaces, current, onPick }: { workspaces: AdminWorkspace[]; current: AdminWorkspace; onPick: (ws: AdminWorkspace) => void }) {
  if (workspaces.length < 2) return null;
  return (
    <div className="grid gap-0.5 px-3 pb-2" style={{ gridTemplateColumns: `repeat(${workspaces.length}, minmax(0, 1fr))` }} role="tablist" aria-label="Workspaces">
      {workspaces.map((ws) => {
        const active = ws.id === current.id;
        const Icon = ws.icon as IconType;
        return (
          <button
            key={ws.id}
            type="button"
            role="tab"
            aria-selected={active}
            title={ws.label}
            aria-label={ws.label}
            onClick={() => onPick(ws)}
            className={cn(
              'flex aspect-square items-center justify-center rounded-lg transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
              active ? cn(ws.tone, 'shadow-sm') : 'text-slate-500 hover:bg-white hover:text-slate-900 dark:text-ink-400 dark:hover:bg-ink-white/[0.07] dark:hover:text-ink-white',
            )}
          >
            <Icon className="h-4 w-4" />
          </button>
        );
      })}
    </div>
  );
}

function UserFooter({ compact, onLogout }: { compact?: boolean; onLogout: () => void }) {
  const user = useAuthStore((s) => s.user);
  const initial = user?.fullName?.charAt(0)?.toUpperCase() || 'A';
  if (compact) {
    return (
      <div className="flex shrink-0 flex-col items-center gap-1 border-t border-shell-line py-2">
        <span title={user?.fullName} className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-600 text-[0.8125rem] font-semibold text-brand-fg">{initial}</span>
        <IconButton label="Log out" onClick={onLogout}><LogOut className="h-4 w-4" /></IconButton>
      </div>
    );
  }
  return (
    <div className="flex shrink-0 items-center gap-2.5 border-t border-shell-line px-3 py-2.5">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-600 text-[0.8125rem] font-semibold text-brand-fg">{initial}</span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[0.8125rem] font-semibold text-slate-900 dark:text-ink-white">{user?.fullName || 'Admin'}</div>
        <div className="truncate text-[0.6875rem] text-slate-500 dark:text-ink-400">{user?.email}</div>
      </div>
      <IconButton label="Log out" onClick={onLogout}><LogOut className="h-4 w-4" /></IconButton>
    </div>
  );
}

function SidebarExpanded({ onToggleCollapse, onItemClick, onLogout, onClose }: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { workspaces, current: workspace } = useVisibleNav(location.pathname);
  const searchRef = useRef<HTMLInputElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const [search, setSearch] = useState('');
  const [closed, setClosed] = useState<Record<string, boolean>>(loadClosed);

  const query = search.trim().toLowerCase();
  const groups: AdminNavGroup[] = useMemo(() => {
    if (!query) return workspace.groups;
    // Menu search looks across every workspace, so a page is found from anywhere.
    const match = (i: AdminNavItem) => `${i.label} ${i.keywords ?? ''}`.toLowerCase().includes(query);
    return workspaces.flatMap((ws) => ws.groups.map((g) => ({ ...g, id: `${ws.id}:${g.id}`, label: ws.groups.length > 1 ? `${ws.shortLabel} · ${g.label}` : ws.label, items: g.items.filter(match) })))
      .filter((g) => g.items.length);
  }, [workspace, workspaces, query]);
  const total = groups.reduce((n, g) => n + g.items.length, 0);

  const toggleGroup = (id: string) => setClosed((prev) => {
    const next = { ...prev, [id]: !prev[id] };
    try { localStorage.setItem(GROUPS_KEY, JSON.stringify(next)); } catch { /* storage unavailable */ }
    return next;
  });

  // Keep the menu scroll position per workspace.
  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    const key = `nafaa-admin-sidebar-scroll-${workspace.id}`;
    const saved = sessionStorage.getItem(key);
    nav.scrollTop = saved ? Number(saved) : 0;
    const onScroll = () => sessionStorage.setItem(key, String(nav.scrollTop));
    nav.addEventListener('scroll', onScroll, { passive: true });
    return () => nav.removeEventListener('scroll', onScroll);
  }, [workspace.id]);

  const pick = (ws: AdminWorkspace) => { navigate(ws.root); onItemClick?.(); };

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Brand */}
      <div className="flex items-center gap-2 px-3 pb-2 pt-3">
        <div className="flex min-w-0 flex-1 items-center gap-2.5 p-1.5">
          <Logo size={34} className="shrink-0" />
          <div className="min-w-0">
            <div className="truncate text-[0.875rem] font-semibold leading-tight text-slate-900 dark:text-ink-white">Nafaa Admin</div>
            <div className="truncate text-[0.75rem] text-slate-500 dark:text-ink-400">Platform control</div>
          </div>
        </div>
        {onToggleCollapse && <IconButton label="Collapse sidebar (Ctrl+B)" onClick={onToggleCollapse}><PanelLeftClose className="h-4 w-4" /></IconButton>}
        {onClose && <IconButton label="Close menu" onClick={onClose} className="h-10 w-10"><X className="h-5 w-5" /></IconButton>}
      </div>

      {/* Workspaces */}
      <WorkspaceTiles workspaces={workspaces} current={workspace} onPick={pick} />
      <div className="mx-3 mb-2 flex items-center gap-2.5 rounded-xl border border-shell-line bg-white/60 p-2 dark:bg-ink-white/[0.03]">
        <WorkspaceMark workspace={workspace} />
        <div className="min-w-0">
          <div className="truncate text-[0.8125rem] font-semibold text-slate-900 dark:text-ink-white">{workspace.label}</div>
          <div className="truncate text-[0.6875rem] text-slate-500 dark:text-ink-400">{workspace.description}</div>
        </div>
      </div>

      {/* Menu search */}
      <div className="px-3 pb-2">
        <div className="relative">
          <Search className="pointer-events-none absolute start-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            ref={searchRef}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') { setSearch(''); searchRef.current?.blur(); }
              if (e.key === 'ArrowDown') { e.preventDefault(); navRef.current?.querySelector<HTMLElement>(NAV_ITEMS)?.focus(); }
              if (e.key === 'Enter') navRef.current?.querySelector<HTMLElement>('a[href]')?.click();
            }}
            placeholder="Search all menus"
            aria-label="Search all menus"
            className="h-9 w-full rounded-lg border border-slate-200 bg-white ps-8 pe-8 text-[0.8125rem] text-slate-900 transition placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-ink-white/10 dark:bg-ink-white/[0.04] dark:text-ink-white"
          />
          {search && (
            <button type="button" onClick={() => setSearch('')} aria-label="Clear search" className="absolute end-1.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-ink-white/10">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Menu */}
      <nav
        ref={navRef}
        aria-label="Main"
        onKeyDown={(e) => {
          if (e.key === 'ArrowUp' && document.activeElement === navRef.current?.querySelector(NAV_ITEMS)) { e.preventDefault(); searchRef.current?.focus(); return; }
          if (navRef.current && handleMenuKey(e, navRef.current, NAV_ITEMS, false)) e.preventDefault();
        }}
        className="min-h-0 flex-1 space-y-3 overflow-y-auto overflow-x-hidden px-2 pb-4 [scrollbar-width:thin]"
      >
        {query && <div className="px-2.5 text-[0.75rem] text-slate-500">{total === 0 ? `Nothing found for “${search}”` : `${total} result${total === 1 ? '' : 's'}`}</div>}
        {groups.map((g) => {
          const open = query ? true : !closed[g.id];
          const hasActive = g.items.some((i) => isActivePath(location.pathname, i));
          const GroupIcon = g.icon as IconType;
          return (
            <div key={g.id}>
              {(groups.length > 1 || query) && (
                <button
                  type="button"
                  onClick={() => toggleGroup(g.id)}
                  aria-expanded={open}
                  className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-start text-[0.75rem] font-semibold text-slate-500 transition hover:text-slate-900 dark:text-ink-400 dark:hover:text-ink-white"
                >
                  <GroupIcon className="h-3.5 w-3.5 shrink-0" />
                  <span className="flex-1 truncate">{g.label}</span>
                  {!open && hasActive && <span className="h-1.5 w-1.5 rounded-full bg-brand-500" aria-label="Current page is in this group" />}
                  <ChevronDown className={cn('h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform duration-200', !open && '-rotate-90')} />
                </button>
              )}
              {open && (
                <div className="mt-0.5 space-y-0.5">
                  {g.items.map((it) => <NavRow key={it.to} item={it} onClick={onItemClick} />)}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <UserFooter onLogout={onLogout} />
    </div>
  );
}

/** 72px icon rail: the current workspace's pages, grouped, with tooltips. */
function SidebarRail({ onToggleCollapse, onLogout }: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { workspaces, current: workspace } = useVisibleNav(location.pathname);
  const [picker, setPicker] = useState(false);

  return (
    <div className="flex h-full min-h-0 flex-col items-center">
      <div className="flex flex-col items-center gap-2 pb-2 pt-3">
        <Logo size={34} />
        {onToggleCollapse && <IconButton label="Expand sidebar (Ctrl+B)" onClick={onToggleCollapse}><PanelLeftOpen className="h-4 w-4" /></IconButton>}
      </div>
      <div className="relative pb-2">
        <button type="button" onClick={() => setPicker((v) => !v)} aria-expanded={picker} aria-label={`Workspace: ${workspace.label}. Switch workspace`} title={workspace.label} className="rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500">
          <WorkspaceMark workspace={workspace} />
        </button>
        {picker && (
          <div className="absolute start-full top-0 z-50 ms-2 w-60 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-2xl dark:border-ink-white/10" onMouseLeave={() => setPicker(false)}>
            {workspaces.map((ws) => (
              <button key={ws.id} type="button" onClick={() => { setPicker(false); navigate(ws.root); }} className={cn('flex w-full items-center gap-2.5 rounded-lg p-1.5 text-start text-[0.8125rem] transition hover:bg-slate-50', ws.id === workspace.id && 'bg-brand-50 font-semibold')}>
                <WorkspaceMark workspace={ws} size="sm" /> {ws.label}
              </button>
            ))}
          </div>
        )}
      </div>
      <nav aria-label="Main" className="min-h-0 w-full flex-1 space-y-2 overflow-y-auto overflow-x-hidden px-3 pb-3 [scrollbar-width:none]">
        {workspace.groups.map((g, gi) => (
          <div key={g.id} className={cn('space-y-1', gi > 0 && 'border-t border-shell-line pt-2')}>
            {g.items.map((it) => {
              const Icon = it.icon as IconType;
              return (
                <NavLink
                  key={it.to}
                  to={it.to}
                  end={it.exact}
                  title={it.label}
                  aria-label={it.label}
                  className={({ isActive }) => cn('flex h-10 w-full items-center justify-center rounded-xl transition', isActive ? 'bg-white text-brand-600 shadow-sm ring-1 ring-slate-200/80 dark:bg-ink-white/[0.07] dark:text-brand-400 dark:ring-ink-white/10' : 'text-slate-500 hover:bg-white/70 hover:text-slate-900 dark:text-ink-400 dark:hover:bg-ink-white/[0.05] dark:hover:text-ink-white')}
                >
                  <Icon className="h-[1.125rem] w-[1.125rem]" />
                </NavLink>
              );
            })}
          </div>
        ))}
      </nav>
      <UserFooter compact onLogout={onLogout} />
    </div>
  );
}
