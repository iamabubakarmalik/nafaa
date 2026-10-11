/**
 * Main navigation sidebar.
 *
 * Expanded: store header, menu search, pinned pages, recent pages, the
 * navigation groups, and Settings / Help pinned to the bottom.
 * Collapsed: a 72px icon rail (see SidebarRail) where hovering or tapping a
 * group opens a flyout, so every page stays one click away.
 *
 * The same component renders inside the mobile drawer (with `onClose`).
 */

import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { ChevronsDownUp, ChevronsUpDown, Clock, HelpCircle, PanelLeftClose, Search, Settings, Star, X } from 'lucide-react';
import { industryIdentity } from '@/design-system';
import { isActivePath, isSettingsPath, loadGroupState, MAX_RECENT, saveGroupState, type NavGroup, type NavItem } from '../navigation/nav-config';
import { useVisibleNav } from '../navigation/useVisibleNav';
import { useFavorites, useRecentPaths } from '../navigation/useNavMemory';
import { IconButton, Kbd } from '@/design-system/components';
import { BrandMark } from './BrandMark';
import { FooterLink, GroupHeader, NavRow, NavSection } from './NavParts';
import { SidebarRail } from './SidebarRail';

export interface SidebarProps {
  tenantName?: string;
  tenantSlug?: string;
  businessType?: string;
  role?: unknown;
  permissions?: string[];
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  onItemClick?: () => void;
  /** Present when rendered inside the mobile drawer. */
  onClose?: () => void;
}

export const Sidebar = memo(function Sidebar(props: SidebarProps) {
  return props.collapsed ? <SidebarRail {...props} /> : <SidebarExpanded {...props} />;
});

function SidebarExpanded({ tenantName, tenantSlug, businessType, role, permissions, onItemClick, onToggleCollapse, onClose }: SidebarProps) {
  const location = useLocation();
  const searchRef = useRef<HTMLInputElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const { groups, settingsItems, settingsHome, industry, isMarketplace, workspace, activeWorkspace } = useVisibleNav(role, permissions);
  const recentPaths = useRecentPaths();
  const { favs, toggle } = useFavorites();
  const [search, setSearch] = useState('');
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => loadGroupState());
  const [showRecent, setShowRecent] = useState(true);

  const byPath = useMemo(() => {
    const map = new Map<string, NavItem>();
    groups.forEach((g) => g.items.forEach((i) => map.set(i.to, i)));
    return map;
  }, [groups]);

  const pinned = useMemo(() => favs.map((p) => byPath.get(p)).filter(Boolean) as NavItem[], [favs, byPath]);
  const recent = useMemo(
    () => recentPaths.filter((p) => !favs.includes(p)).map((p) => byPath.get(p)).filter(Boolean).slice(0, MAX_RECENT) as NavItem[],
    [recentPaths, favs, byPath],
  );

  const query = search.trim().toLowerCase();
  const shownGroups = useMemo(() => {
    if (!query) return groups;
    const matches = (i: NavItem) => `${i.label} ${i.keywords ?? ''}`.toLowerCase().includes(query);
    return groups.map((g) => ({ ...g, items: g.items.filter(matches) })).filter((g) => g.items.length);
  }, [groups, query]);
  const shownSettings = useMemo(
    () => (query ? settingsItems.filter((i) => `${i.label} ${i.keywords ?? ''}`.toLowerCase().includes(query)) : []),
    [settingsItems, query],
  );
  const total = shownGroups.reduce((sum, g) => sum + g.items.length, 0) + shownSettings.length;

  const isOpen = (g: NavGroup) => (query ? true : openGroups[g.id] ?? g.defaultOpen ?? false);
  const setGroup = (id: string, open: boolean) =>
    setOpenGroups((prev) => { const next = { ...prev, [id]: open }; saveGroupState(next); return next; });
  const allOpen = groups.every((g) => isOpen(g));
  const setAll = (open: boolean) => {
    const next: Record<string, boolean> = {};
    groups.forEach((g) => { next[g.id] = open; });
    setOpenGroups(next);
    saveGroupState(next);
  };

  // The group containing the current page opens by itself.
  useEffect(() => {
    const g = groups.find((x) => x.items.some((i) => isActivePath(location.pathname, i.to)));
    if (g && !isOpen(g)) setGroup(g.id, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  // Keep the scroll position per workspace across navigations.
  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    const key = `nafaa-sidebar-scroll-${activeWorkspace}`;
    const saved = sessionStorage.getItem(key);
    if (saved) nav.scrollTop = Number(saved);
    const onScroll = () => sessionStorage.setItem(key, String(nav.scrollTop));
    nav.addEventListener('scroll', onScroll, { passive: true });
    return () => nav.removeEventListener('scroll', onScroll);
  }, [activeWorkspace]);

  const subtitle = isMarketplace
    ? workspace.label
    : industry
      ? (industry.shortName ?? industryIdentity(industry.id).label)
      : businessType?.replace(/_/g, ' ').toLowerCase() ?? workspace.label;

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Store header */}
      <div className="flex items-center gap-2 px-3 pb-2 pt-3">
        <div className="flex min-w-0 flex-1 items-center gap-2.5 p-1.5">
          <BrandMark industryId={industry?.id} marketplace={isMarketplace} />
          <div className="min-w-0">
            <div className="truncate text-[0.875rem] font-semibold leading-tight text-slate-900 dark:text-ink-white">{tenantName || 'My store'}</div>
            <div className="truncate text-[0.75rem] capitalize text-slate-500 dark:text-ink-400">
              {subtitle}{tenantSlug ? <span className="normal-case"> · @{tenantSlug}</span> : null}
            </div>
          </div>
        </div>
        {onToggleCollapse && (
          <IconButton label="Collapse sidebar (Ctrl+B)" onClick={onToggleCollapse}><PanelLeftClose className="h-4 w-4" /></IconButton>
        )}
        {onClose && (
          <IconButton label="Close menu" onClick={onClose} className="h-10 w-10"><X className="h-5 w-5" /></IconButton>
        )}
      </div>

      {/* Menu search */}
      <div className="flex items-center gap-1 px-3 pb-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            ref={searchRef}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Escape') { setSearch(''); searchRef.current?.blur(); } }}
            placeholder="Search menu"
            aria-label="Search menu"
            className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-8 pr-8 text-[0.8125rem] text-slate-900 transition placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-ink-white/10 dark:bg-ink-white/[0.04] dark:text-ink-white"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              aria-label="Clear search"
              className="absolute right-1.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-ink-white/10"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        {!query && (
          <IconButton label={allOpen ? 'Collapse all groups' : 'Expand all groups'} onClick={() => setAll(!allOpen)}>
            {allOpen ? <ChevronsDownUp className="h-4 w-4" /> : <ChevronsUpDown className="h-4 w-4" />}
          </IconButton>
        )}
      </div>

      {/* Navigation */}
      <nav ref={navRef} aria-label="Main" className="min-h-0 flex-1 space-y-4 overflow-y-auto overflow-x-hidden px-2 pb-4 [scrollbar-width:thin]">
        {query && (
          <div className="px-2.5 text-[0.75rem] text-slate-500">{total === 0 ? 'No matches' : `${total} result${total > 1 ? 's' : ''}`}</div>
        )}

        {!query && pinned.length > 0 && (
          <NavSection title="Pinned" icon={<Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />}>
            {pinned.map((it) => (
              <NavRow key={`pin-${it.to}`} item={it} fav onToggleFav={(e) => toggle(it.to, e)} onItemClick={onItemClick} />
            ))}
          </NavSection>
        )}

        {!query && recent.length > 0 && (
          <div>
            <GroupHeader label="Recently visited" icon={Clock} open={showRecent} onClick={() => setShowRecent((v) => !v)} />
            {showRecent && (
              <div className="mt-0.5 space-y-0.5">
                {recent.map((it) => (
                  <NavRow key={`rec-${it.to}`} item={it} fav={false} muted onToggleFav={(e) => toggle(it.to, e)} onItemClick={onItemClick} />
                ))}
              </div>
            )}
          </div>
        )}

        {shownGroups.map((g) => {
          const open = isOpen(g);
          const hasActive = g.items.some((i) => isActivePath(location.pathname, i.to));
          return (
            <div key={g.id}>
              <GroupHeader
                label={g.label}
                icon={g.icon}
                color={g.color}
                open={open}
                dot={!open && hasActive}
                live={!open && g.items.some((i) => i.liveCount)}
                onClick={() => setGroup(g.id, !open)}
              />
              {open && (
                <div className="mt-0.5 space-y-0.5">
                  {g.items.map((it) => (
                    <NavRow key={it.to} item={it} fav={favs.includes(it.to)} onToggleFav={(e) => toggle(it.to, e)} onItemClick={onItemClick} />
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {shownSettings.length > 0 && (
          <NavSection title="Settings" icon={<Settings className="h-3.5 w-3.5 text-slate-400" />}>
            {shownSettings.map((it) => (
              <NavRow key={`set-${it.to}`} item={it} fav={false} hideStar onItemClick={onItemClick} />
            ))}
          </NavSection>
        )}

        {query && total === 0 && (
          <div className="px-4 py-10 text-center">
            <Search className="mx-auto h-8 w-8 text-slate-300 dark:text-ink-700" />
            <div className="mt-2 text-sm font-semibold text-slate-700 dark:text-ink-200">Nothing found for “{search}”</div>
            <button type="button" onClick={() => setSearch('')} className="mt-2 text-[0.8125rem] font-medium text-brand-700 hover:underline dark:text-brand-400">
              Clear search
            </button>
          </div>
        )}
      </nav>

      {/* Footer */}
      <div className="shrink-0 space-y-0.5 border-t border-shell-line px-2 py-2">
        <FooterLink to={settingsHome} icon={Settings} label="Settings" active={isSettingsPath(location.pathname)} onClick={onItemClick} />
        <FooterLink to="/help" icon={HelpCircle} label="Help center" active={isActivePath(location.pathname, '/help')} onClick={onItemClick} />
        <div className="flex items-center justify-between px-2.5 pt-1.5 text-[0.6875rem] text-slate-400">
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-500" /> {workspace.shortLabel} workspace
          </span>
          {onToggleCollapse && <Kbd>Ctrl B</Kbd>}
        </div>
      </div>
    </div>
  );
}
