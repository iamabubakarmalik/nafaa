/**
 * Collapsed sidebar: a 72px icon rail.
 *
 * Hovering (or tapping, on touch screens) a group icon opens a flyout with
 * that group's pages; plain icons show a tooltip. Flyouts render in a portal
 * so they are never clipped by the rail.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { HelpCircle, PanelLeftOpen, Settings } from 'lucide-react';
import { cn } from '@core/lib/cn';
import { isActivePath, isSettingsPath, type NavGroup, type NavItem } from '../navigation/nav-config';
import { useVisibleNav } from '../navigation/useVisibleNav';
import { useFavorites, useRecentPaths } from '../navigation/useNavMemory';
import { BrandMark } from './BrandMark';
import { CountPill, ItemBadge, OnlineOrdersCount } from './NavBadges';
import type { SidebarProps } from './Sidebar';

type Flyout = { key: string; top: number; label: string; group?: NavGroup };

const MAX_PINNED_VISIBLE = 5;

export function SidebarRail({ role, permissions, onToggleCollapse }: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { groups, settingsHome, industry, isMarketplace } = useVisibleNav(role, permissions);
  useRecentPaths();
  const { favs } = useFavorites();
  const [fly, setFly] = useState<Flyout | null>(null);
  const [pinnedOpen, setPinnedOpen] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  const railRef = useRef<HTMLDivElement>(null);
  const flyRef = useRef<HTMLDivElement>(null);

  const byPath = useMemo(() => {
    const map = new Map<string, NavItem>();
    groups.forEach((g) => g.items.forEach((i) => map.set(i.to, i)));
    return map;
  }, [groups]);
  const pinned = favs.map((p) => byPath.get(p)).filter(Boolean) as NavItem[];
  const visiblePinned = pinnedOpen ? pinned : pinned.slice(0, MAX_PINNED_VISIBLE);

  const show = (key: string, el: HTMLElement, label: string, group?: NavGroup) => {
    window.clearTimeout(timer.current);
    const rect = el.getBoundingClientRect();
    const estimatedHeight = group ? group.items.length * 38 + 52 : 36;
    const top = Math.max(8, Math.min(rect.top - (group ? 6 : -2), window.innerHeight - estimatedHeight - 8));
    setFly({ key, label, group, top });
  };
  const hideSoon = () => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setFly(null), 160);
  };
  const keepOpen = () => window.clearTimeout(timer.current);

  useEffect(() => { setFly(null); }, [location.pathname]);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  // A flyout opened by touch closes on a tap outside it.
  useEffect(() => {
    if (!fly?.group) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (!railRef.current?.contains(target) && !flyRef.current?.contains(target)) setFly(null);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('touchstart', onDown, { passive: true });
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('touchstart', onDown);
    };
  }, [fly?.group]);

  const railButton = (active: boolean) => cn(
    'relative flex h-10 w-10 items-center justify-center rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
    active
      ? 'bg-white text-brand-600 shadow-sm ring-1 ring-slate-200 dark:bg-ink-white/[0.08] dark:text-brand-400 dark:ring-ink-white/10'
      : 'text-slate-500 hover:bg-white/80 hover:text-slate-900 dark:text-ink-400 dark:hover:bg-ink-white/[0.06] dark:hover:text-ink-white',
  );

  return (
    <div ref={railRef} className="flex h-full min-h-0 flex-col items-center gap-1 py-3">
      <button
        type="button"
        onClick={onToggleCollapse}
        aria-label="Expand sidebar (Ctrl+B)"
        onMouseEnter={(e) => show('brand', e.currentTarget, 'Expand sidebar  Ctrl+B')}
        onMouseLeave={hideSoon}
        className="group relative mb-1 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
      >
        <BrandMark industryId={industry?.id} marketplace={isMarketplace} size="lg" className="transition-opacity group-hover:opacity-0" />
        <span className="absolute inset-0 flex items-center justify-center rounded-xl bg-brand-600 text-brand-fg opacity-0 transition-opacity group-hover:opacity-100">
          <PanelLeftOpen className="h-4 w-4" />
        </span>
      </button>

      <div className="flex min-h-0 w-full flex-1 flex-col items-center gap-1 overflow-y-auto overflow-x-hidden px-2 [scrollbar-width:none]">
        {visiblePinned.map((it) => {
          const Icon = it.icon;
          const active = isActivePath(location.pathname, it.to);
          return (
            <NavLink
              key={`pin-${it.to}`}
              to={it.to}
              aria-label={it.label}
              className={railButton(active)}
              onMouseEnter={(e) => show(`pin-${it.to}`, e.currentTarget, it.label)}
              onMouseLeave={hideSoon}
            >
              <Icon className="h-[1.125rem] w-[1.125rem]" />
              {it.liveCount && <OnlineOrdersCount dot />}
            </NavLink>
          );
        })}
        {pinned.length > MAX_PINNED_VISIBLE && (
          <button type="button" onClick={() => setPinnedOpen((v) => !v)} className="h-5 text-[0.6875rem] font-semibold text-slate-400 hover:text-slate-700 dark:hover:text-ink-200">
            {pinnedOpen ? 'less' : `+${pinned.length - MAX_PINNED_VISIBLE}`}
          </button>
        )}
        {pinned.length > 0 && <div className="my-1.5 h-px w-8 shrink-0 bg-shell-line" />}

        {groups.map((g) => {
          const Icon = g.icon;
          const active = g.items.some((i) => isActivePath(location.pathname, i.to));
          const openNow = fly?.key === g.id;
          return (
            <button
              type="button"
              key={g.id}
              aria-label={g.label}
              aria-expanded={openNow}
              className={cn(railButton(active), openNow && !active && 'bg-white/80 text-slate-900 dark:bg-ink-white/[0.06] dark:text-ink-white')}
              onMouseEnter={(e) => show(g.id, e.currentTarget, g.label, g)}
              onMouseLeave={hideSoon}
              onClick={(e) => (openNow ? setFly(null) : show(g.id, e.currentTarget, g.label, g))}
            >
              <Icon className="h-[1.125rem] w-[1.125rem]" style={!active && g.color ? { color: g.color } : undefined} />
              {g.items.some((i) => i.liveCount) && <OnlineOrdersCount dot />}
            </button>
          );
        })}
      </div>

      <div className="flex shrink-0 flex-col items-center gap-1 border-t border-shell-line px-2 pt-2">
        <NavLink to={settingsHome} aria-label="Settings" className={railButton(isSettingsPath(location.pathname))}
          onMouseEnter={(e) => show('settings', e.currentTarget, 'Settings')} onMouseLeave={hideSoon}>
          <Settings className="h-[1.125rem] w-[1.125rem]" />
        </NavLink>
        <NavLink to="/help" aria-label="Help center" className={railButton(isActivePath(location.pathname, '/help'))}
          onMouseEnter={(e) => show('help', e.currentTarget, 'Help center')} onMouseLeave={hideSoon}>
          <HelpCircle className="h-[1.125rem] w-[1.125rem]" />
        </NavLink>
      </div>

      {fly && createPortal(
        <div
          ref={flyRef}
          onMouseEnter={keepOpen}
          onMouseLeave={hideSoon}
          style={{ top: fly.top, left: 80 }}
          className={cn(
            'fixed z-[80] animate-in fade-in slide-in-from-left-1 duration-100',
            fly.group
              ? 'w-60 rounded-xl border border-slate-200 bg-white p-1.5 text-slate-900 shadow-xl dark:border-ink-800 dark:bg-ink-900 dark:text-ink-white'
              : 'pointer-events-none whitespace-pre rounded-lg bg-slate-900 px-2.5 py-1.5 text-[0.75rem] font-medium text-white shadow-lg dark:bg-ink-white dark:text-ink-900',
          )}
        >
          {fly.group ? (
            <>
              <div className="flex items-center gap-2 px-2.5 pb-1.5 pt-1 text-[0.75rem] font-semibold text-slate-500 dark:text-ink-400">
                <fly.group.icon className="h-3.5 w-3.5" style={fly.group.color ? { color: fly.group.color } : undefined} /> {fly.group.label}
              </div>
              <div className="space-y-0.5">
                {fly.group.items.map((it) => {
                  const Icon = it.icon;
                  const active = isActivePath(location.pathname, it.to);
                  return (
                    <button
                      type="button"
                      key={it.to}
                      onClick={() => { navigate(it.to); setFly(null); }}
                      className={cn(
                        'flex h-9 w-full items-center gap-2.5 rounded-lg px-2.5 text-left text-[0.84375rem] transition-colors',
                        active
                          ? 'bg-brand-50 font-semibold text-slate-900 dark:bg-brand-500/10 dark:text-ink-white'
                          : 'font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-ink-300 dark:hover:bg-ink-800/60 dark:hover:text-ink-white',
                      )}
                    >
                      <Icon className={cn('h-4 w-4 shrink-0', active && 'text-brand-600 dark:text-brand-400')} />
                      <span className="flex-1 truncate">{it.label}</span>
                      {it.liveCount === 'online-orders' && <OnlineOrdersCount />}
                      {!!it.count && <CountPill n={it.count} />}
                      {it.badge && <ItemBadge text={it.badge} />}
                    </button>
                  );
                })}
              </div>
            </>
          ) : fly.label}
        </div>,
        document.body,
      )}
    </div>
  );
}
