import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  ChevronDown, ChevronsDownUp, ChevronsUpDown, Clock, HelpCircle, PanelLeftClose, PanelLeftOpen,
  Plus, Search, Settings, Star, X,
} from 'lucide-react';
import { Logo } from '@core/components/brand/Logo';
import { hasPermission, isOwner, isOwnerOnlyPath } from '@core/lib/permissions';
import { useCurrentIndustry } from '@industries/_shared/registry/useCurrentIndustry';
import { useWorkspaceStore, WORKSPACES } from '@core/stores/workspace.store';
import { useIsAllShops } from '@core/stores/auth.store';
import { useLiveOnlineOrders } from '@integrations/online-orders/hooks/useLiveOnlineOrders';
import { channelMeta, channelPath, useSalesChannels } from '@integrations/online-orders/hooks/useSalesChannels';
import { PERMISSIONS } from '@core/lib/permissions';
import { cn } from '@core/lib/cn';
import {
  allShopsNavGroups, fromIndustryGroup, isActivePath, isSettingsPath, loadFavorites, loadGroupState, loadRecent,
  marketplaceNavGroups, MAX_RECENT, posNavGroups, pushRecent, saveFavorites, saveGroupState, SETTINGS_ITEMS,
  type NavGroup, type NavItem,
} from './navConfig';
import { IconButton, Kbd } from './shell-ui';

/* ═════════════════════════════════════════════════════════════
   SIDEBAR
   Expanded: store header · search · pinned · recent · groups ·
             Settings + Help at the bottom (Shopify style)
   Collapsed: 72px icon rail — hover (or tap) a group to open a
             flyout, so every page stays one click away without
             opening the sidebar again.
   ═════════════════════════════════════════════════════════════ */

type Props = {
  tenantName?: string;
  tenantSlug?: string;
  businessType?: string;
  role?: any;
  permissions?: string[];
  onItemClick?: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  /** Mobile drawer close */
  onClose?: () => void;
};

/** Paths that should only be "active" on an exact match */
const END_PATHS = new Set(['/staff', '/products', '/fbr', '/sales', '/online-orders']);

/** Everything the current user can see, in the current workspace */
export function useVisibleNav(role?: any, permissions?: string[]) {
  const industry = useCurrentIndustry();
  const { activeWorkspace } = useWorkspaceStore();
  const isMarketplace = activeWorkspace === 'marketplace';
  const isAllShops = useIsAllShops();
  const { data: channels } = useSalesChannels();

  const groups = useMemo<NavGroup[]>(() => {
    const pos = posNavGroups.map((g) => (g.id === 'online' ? { ...g, items: [...g.items, ...channelItems(channels)] } : g));
    const base = isMarketplace
      ? marketplaceNavGroups
      : isAllShops
        ? allShopsNavGroups
        : [...pos, ...(industry?.navGroups?.map(fromIndustryGroup) ?? [])];
    const owner = isOwner(role);
    return [...base]
      .sort((a, b) => (a.order ?? 100) - (b.order ?? 100))
      .map((g) => ({
        ...g,
        items: g.items.filter((it) => {
          if (isAllShops && !isMarketplace && it.needsShop) return false;
          if (!owner && isOwnerOnlyPath(it.to)) return false;
          // Setup screens live in Settings, not the everyday menu
          if (!isMarketplace && isSettingsPath(it.to)) return false;
          return it.permission ? hasPermission(role, permissions, it.permission) : true;
        }),
      }))
      .filter((g) => g.items.length > 0);
  }, [industry, isMarketplace, isAllShops, role, permissions, channels]);

  const settingsItems = useMemo(() => {
    const owner = isOwner(role);
    return SETTINGS_ITEMS.filter((i) => (owner || !isOwnerOnlyPath(i.to)) && (!i.permission || hasPermission(role, permissions, i.permission)));
  }, [role, permissions]);

  const settingsHome = isMarketplace ? '/marketplace/settings-hub' : settingsItems[0]?.to ?? '/profile';

  return { groups, settingsItems, settingsHome, industry, isMarketplace, isAllShops, workspace: WORKSPACES[activeWorkspace], activeWorkspace };
}

/** Har jora hua channel ek nav item — naam, emoji, naye orders ki ginti */
function channelItems(channels?: { id: string; type: string; displayName: string; isWebsite: boolean; live: boolean; pendingOrders: number }[]): NavItem[] {
  const list: NavItem[] = (channels ?? []).map((c) => ({
    to: channelPath(c),
    label: c.displayName,
    icon: emojiIcon(channelMeta(c.type).emoji),
    count: c.pendingOrders,
    dim: !c.live,
    keywords: `${channelMeta(c.type).label} channel`,
  }));
  list.push({ to: '/online-store/connect', label: list.length ? 'Add channel' : 'Connect your website', icon: Plus, permission: PERMISSIONS.SETTINGS_VIEW, keywords: 'woocommerce shopify website connect add' });
  return list;
}

const emojiCache = new Map<string, any>();
/** Emoji ko icon jaisa component — NavRow `<Icon className>` hi render karta hai */
function emojiIcon(emoji: string) {
  const hit = emojiCache.get(emoji);
  if (hit) return hit;
  const C = ({ className }: { className?: string }) => (
    <span className={cn('inline-flex items-center justify-center text-[13px] leading-none', className)} aria-hidden>{emoji}</span>
  );
  emojiCache.set(emoji, C);
  return C;
}

function useRecentPaths() {
  const location = useLocation();
  const [recent, setRecent] = useState<string[]>(() => loadRecent());
  useEffect(() => {
    if (location.pathname && location.pathname !== '/') setRecent(pushRecent(location.pathname));
  }, [location.pathname]);
  return recent;
}

function useFavorites() {
  const [favs, setFavs] = useState<string[]>(() => loadFavorites());
  const toggle = useCallback((path: string, e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    setFavs((prev) => {
      const next = prev.includes(path) ? prev.filter((p) => p !== path) : [...prev, path];
      saveFavorites(next);
      return next;
    });
  }, []);
  return { favs, toggle };
}

export const Sidebar = memo(function Sidebar(props: Props) {
  return props.collapsed ? <SidebarRail {...props} /> : <SidebarFull {...props} />;
});

/* ═════════════════════════════ EXPANDED ═════════════════════════════ */
function SidebarFull({ tenantName, tenantSlug, businessType, role, permissions, onItemClick, onToggleCollapse, onClose }: Props) {
  const location = useLocation();
  const searchRef = useRef<HTMLInputElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const { groups, settingsItems, settingsHome, industry, isMarketplace, workspace, activeWorkspace } = useVisibleNav(role, permissions);
  const recentPaths = useRecentPaths();
  const { favs, toggle } = useFavorites();
  const [search, setSearch] = useState('');
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => loadGroupState());
  const [showRecent, setShowRecent] = useState(true);

  const accent = isMarketplace ? '#a855f7' : industry?.themeColor || '#059669';

  const byPath = useMemo(() => {
    const m = new Map<string, NavItem>();
    groups.forEach((g) => g.items.forEach((i) => m.set(i.to, i)));
    return m;
  }, [groups]);

  const pinned = useMemo(() => favs.map((p) => byPath.get(p)).filter(Boolean) as NavItem[], [favs, byPath]);
  const recent = useMemo(
    () => recentPaths.filter((p) => !favs.includes(p)).map((p) => byPath.get(p)).filter(Boolean).slice(0, MAX_RECENT) as NavItem[],
    [recentPaths, favs, byPath],
  );

  const q = search.trim().toLowerCase();
  const matches = (i: NavItem) => `${i.label} ${i.keywords ?? ''}`.toLowerCase().includes(q);
  const shownGroups = useMemo(
    () => (q ? groups.map((g) => ({ ...g, items: g.items.filter(matches) })).filter((g) => g.items.length) : groups),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [groups, q],
  );
  const shownSettings = useMemo(() => (q ? settingsItems.filter(matches) : []), // eslint-disable-line react-hooks/exhaustive-deps
    [settingsItems, q]);
  const total = shownGroups.reduce((a, g) => a + g.items.length, 0) + shownSettings.length;

  const isOpen = (g: NavGroup) => (q ? true : openGroups[g.id] ?? g.defaultOpen ?? false);
  const setGroup = (id: string, v: boolean) => setOpenGroups((prev) => { const n = { ...prev, [id]: v }; saveGroupState(n); return n; });
  const allOpen = groups.every((g) => isOpen(g));
  const setAll = (v: boolean) => {
    const n: Record<string, boolean> = {};
    groups.forEach((g) => { n[g.id] = v; });
    setOpenGroups(n); saveGroupState(n);
  };

  // The group that holds the current page opens by itself
  useEffect(() => {
    const g = groups.find((x) => x.items.some((i) => isActivePath(location.pathname, i.to)));
    if (g && !isOpen(g)) setGroup(g.id, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  // Keep scroll position per workspace
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

  const subtitle = !isMarketplace && industry ? (industry.shortName ?? industry.name)
    : !isMarketplace && businessType ? businessType.replace(/_/g, ' ').toLowerCase()
      : workspace.label;

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* ─── Store header ─── */}
      <div className="flex items-center gap-2 px-3 pb-2 pt-3">
        <div className="flex min-w-0 flex-1 items-center gap-2.5 rounded-xl p-1.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-lg text-white shadow-sm"
            style={{ background: `linear-gradient(135deg, ${accent}, ${accent}cc)` }}>
            {industry?.emoji && !isMarketplace ? <span className="leading-none">{industry.emoji}</span> : <Logo size={20} />}
          </span>
          <div className="min-w-0">
            <div className="truncate text-[14px] font-semibold leading-tight text-slate-900 dark:text-white">{tenantName || 'My store'}</div>
            <div className="truncate text-[12px] capitalize text-slate-500 dark:text-slate-400">
              {subtitle}{tenantSlug ? <span className="normal-case"> · @{tenantSlug}</span> : null}
            </div>
          </div>
        </div>
        {onToggleCollapse && (
          <IconButton label="Collapse sidebar (⌘B)" onClick={onToggleCollapse}><PanelLeftClose className="h-4 w-4" /></IconButton>
        )}
        {onClose && (
          <IconButton label="Close menu" onClick={onClose} className="h-10 w-10"><X className="h-5 w-5" /></IconButton>
        )}
      </div>

      {/* ─── Search ─── */}
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
            className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-8 pr-8 text-[13px] text-slate-900 placeholder:text-slate-400 transition focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
          />
          {search && (
            <button onClick={() => setSearch('')} aria-label="Clear search"
              className="absolute right-1.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        {!q && (
          <IconButton label={allOpen ? 'Collapse all groups' : 'Expand all groups'} onClick={() => setAll(!allOpen)}>
            {allOpen ? <ChevronsDownUp className="h-4 w-4" /> : <ChevronsUpDown className="h-4 w-4" />}
          </IconButton>
        )}
      </div>

      {/* ─── Nav ─── */}
      <nav ref={navRef} aria-label="Main" className="min-h-0 flex-1 space-y-4 overflow-y-auto overflow-x-hidden px-2 pb-4 [scrollbar-width:thin]">
        {q && (
          <div className="px-2.5 text-[12px] text-slate-500">{total === 0 ? 'No matches' : `${total} result${total > 1 ? 's' : ''}`}</div>
        )}

        {!q && pinned.length > 0 && (
          <Section title="Pinned" icon={<Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />}>
            {pinned.map((it) => (
              <NavRow key={`pin-${it.to}`} item={it} accent={accent} fav onToggleFav={(e) => toggle(it.to, e)} onItemClick={onItemClick} />
            ))}
          </Section>
        )}

        {!q && recent.length > 0 && (
          <div>
            <GroupHeader label="Recently visited" icon={Clock} open={showRecent} onClick={() => setShowRecent((v) => !v)} />
            {showRecent && (
              <div className="mt-0.5 space-y-0.5">
                {recent.map((it) => (
                  <NavRow key={`rec-${it.to}`} item={it} accent={accent} fav={false} muted onToggleFav={(e) => toggle(it.to, e)} onItemClick={onItemClick} />
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
              <GroupHeader label={g.label} icon={g.icon} color={g.color} open={open} dot={!open && hasActive}
                live={!open && g.items.some((i) => i.liveCount)} onClick={() => setGroup(g.id, !open)} />
              {open && (
                <div className="mt-0.5 space-y-0.5">
                  {g.items.map((it) => (
                    <NavRow key={it.to} item={it} accent={accent} fav={favs.includes(it.to)} onToggleFav={(e) => toggle(it.to, e)} onItemClick={onItemClick} />
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {shownSettings.length > 0 && (
          <Section title="Settings" icon={<Settings className="h-3.5 w-3.5 text-slate-400" />}>
            {shownSettings.map((it) => (
              <NavRow key={`set-${it.to}`} item={it} accent={accent} fav={false} hideStar onItemClick={onItemClick} />
            ))}
          </Section>
        )}

        {q && total === 0 && (
          <div className="px-4 py-10 text-center">
            <Search className="mx-auto h-8 w-8 text-slate-300 dark:text-slate-700" />
            <div className="mt-2 text-sm font-semibold text-slate-700 dark:text-slate-200">Nothing found for “{search}”</div>
            <button onClick={() => setSearch('')} className="mt-2 text-[13px] font-medium text-emerald-700 hover:underline dark:text-emerald-400">Clear search</button>
          </div>
        )}
      </nav>

      {/* ─── Footer: Settings like Shopify ─── */}
      <div className="shrink-0 space-y-0.5 border-t border-slate-200/80 px-2 py-2 dark:border-slate-800">
        <FooterLink to={settingsHome} icon={Settings} label="Settings" active={isSettingsPath(location.pathname)} onClick={onItemClick} />
        <FooterLink to="/help" icon={HelpCircle} label="Help center" active={isActivePath(location.pathname, '/help')} onClick={onItemClick} />
        <div className="flex items-center justify-between px-2.5 pt-1.5 text-[11px] text-slate-400">
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> {workspace.shortLabel} workspace
          </span>
          {onToggleCollapse && <Kbd>⌘B</Kbd>}
        </div>
      </div>
    </div>
  );
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-2 px-2.5 py-1.5 text-[12px] font-semibold text-slate-500 dark:text-slate-400">
        {icon}<span>{title}</span>
      </div>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

function GroupHeader({ label, icon: Icon, color, open, dot, live, onClick }: {
  label: string; icon: any; color?: string; open: boolean; dot?: boolean; live?: boolean; onClick: () => void;
}) {
  return (
    <button onClick={onClick} aria-expanded={open}
      className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-[12px] font-semibold text-slate-500 transition hover:text-slate-900 dark:text-slate-400 dark:hover:text-white">
      <Icon className="h-3.5 w-3.5 shrink-0" style={color ? { color } : undefined} />
      <span className="flex-1 truncate">{label}</span>
      {live && <OnlineOrdersCount compact />}
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-label="Current page is in this group" />}
      <ChevronDown className={cn('h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform duration-200', !open && '-rotate-90')} />
    </button>
  );
}

function NavRow({ item, accent, fav, muted, hideStar, onToggleFav, onItemClick }: {
  item: NavItem; accent: string; fav: boolean; muted?: boolean; hideStar?: boolean;
  onToggleFav?: (e: React.MouseEvent) => void; onItemClick?: () => void;
}) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      end={END_PATHS.has(item.to)}
      onClick={onItemClick}
      className={({ isActive }) => cn(
        'group/item relative flex h-9 items-center gap-2.5 rounded-lg pl-2.5 pr-1 text-[13.5px] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-emerald-500',
        isActive
          ? 'bg-white font-semibold text-slate-900 shadow-sm ring-1 ring-slate-200/80 dark:bg-slate-800 dark:text-white dark:ring-slate-700'
          : muted
            ? 'font-medium text-slate-500 hover:bg-white/70 hover:text-slate-900 dark:text-slate-500 dark:hover:bg-slate-800/60 dark:hover:text-white'
            : 'font-medium text-slate-600 hover:bg-white/70 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-white',
      )}
    >
      {({ isActive }) => (
        <>
          <Icon className="h-4 w-4 shrink-0" style={isActive ? { color: accent } : undefined} />
          <span className="min-w-0 flex-1 truncate">{item.label}</span>
          {item.hot && !isActive && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" aria-hidden />}
          {item.liveCount === 'online-orders' && <OnlineOrdersCount />}
          {!!item.count && <CountPill n={item.count} />}
          {item.dim && <span className="shrink-0 text-[10px] font-medium text-slate-400">off</span>}
          {item.badge && <ItemBadge text={item.badge} />}
          {!hideStar && onToggleFav && (
            <button
              type="button"
              onClick={onToggleFav}
              aria-label={fav ? `Unpin ${item.label}` : `Pin ${item.label}`}
              title={fav ? 'Unpin' : 'Pin to top'}
              className={cn(
                'flex h-6 w-6 shrink-0 items-center justify-center rounded-md transition',
                fav
                  ? 'text-amber-500 hover:bg-amber-500/10'
                  : 'text-slate-400 opacity-0 hover:bg-slate-900/5 hover:text-amber-500 focus-visible:opacity-100 group-hover/item:opacity-100 [@media(hover:none)]:opacity-40 dark:hover:bg-white/10',
              )}
            >
              <Star className={cn('h-3.5 w-3.5', fav && 'fill-current')} />
            </button>
          )}
        </>
      )}
    </NavLink>
  );
}

function FooterLink({ to, icon: Icon, label, active, onClick }: { to: string; icon: any; label: string; active: boolean; onClick?: () => void }) {
  return (
    <NavLink to={to} onClick={onClick}
      className={cn(
        'flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-[13.5px] transition-colors',
        active
          ? 'bg-white font-semibold text-slate-900 shadow-sm ring-1 ring-slate-200/80 dark:bg-slate-800 dark:text-white dark:ring-slate-700'
          : 'font-medium text-slate-600 hover:bg-white/70 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-white',
      )}>
      <Icon className="h-4 w-4" /> {label}
    </NavLink>
  );
}

function ItemBadge({ text }: { text: string }) {
  const tone = text === 'LIVE' ? 'bg-rose-500 text-white' : text === 'NEW' ? 'bg-emerald-500 text-white'
    : text === 'AI' ? 'bg-violet-500 text-white' : 'bg-amber-500 text-white';
  return <span className={cn('shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold tracking-wide', tone)}>{text}</span>;
}

function CountPill({ n }: { n: number }) {
  return (
    <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-md bg-amber-500/15 px-1.5 text-[10px] font-bold tabular-nums text-amber-700 dark:text-amber-300">
      {n > 99 ? '99+' : n}
    </span>
  );
}

/** Pending online orders — same query that powers the new-order popup */
export function OnlineOrdersCount({ compact, dot }: { compact?: boolean; dot?: boolean }) {
  const { data } = useLiveOnlineOrders();
  const n = data?.pendingCount ?? 0;
  if (!n) return null;
  if (dot) return <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-amber-500 ring-2 ring-[#eef0f3] dark:ring-slate-950" aria-label={`${n} new online orders`} />;
  return (
    <span className={cn('flex shrink-0 items-center justify-center rounded-md bg-amber-500 font-bold text-white tabular-nums',
      compact ? 'h-4 min-w-4 px-1 text-[9px]' : 'h-5 min-w-5 px-1.5 text-[10px]')}>
      {n > 99 ? '99+' : n}
    </span>
  );
}

/* ═════════════════════════════ COLLAPSED RAIL ═════════════════════════════ */
type Fly = { key: string; top: number; label: string; group?: NavGroup };

function SidebarRail({ role, permissions, onToggleCollapse }: Props) {
  const location = useLocation();
  const navigate = useNavigate();
  const { groups, settingsHome, industry, isMarketplace } = useVisibleNav(role, permissions);
  useRecentPaths();
  const { favs } = useFavorites();
  const [fly, setFly] = useState<Fly | null>(null);
  const [pinnedOpen, setPinnedOpen] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  const railRef = useRef<HTMLDivElement>(null);
  const flyRef = useRef<HTMLDivElement>(null);

  const accent = isMarketplace ? '#a855f7' : industry?.themeColor || '#059669';
  const byPath = useMemo(() => {
    const m = new Map<string, NavItem>();
    groups.forEach((g) => g.items.forEach((i) => m.set(i.to, i)));
    return m;
  }, [groups]);
  const pinned = favs.map((p) => byPath.get(p)).filter(Boolean) as NavItem[];

  const show = (key: string, el: HTMLElement, label: string, group?: NavGroup) => {
    window.clearTimeout(timer.current);
    const r = el.getBoundingClientRect();
    const est = group ? group.items.length * 38 + 52 : 36;
    setFly({ key, label, group, top: Math.max(8, Math.min(r.top - (group ? 6 : -2), window.innerHeight - est - 8)) });
  };
  const hideSoon = () => { window.clearTimeout(timer.current); timer.current = window.setTimeout(() => setFly(null), 160); };
  const keep = () => window.clearTimeout(timer.current);

  useEffect(() => { setFly(null); }, [location.pathname]);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  // Tap outside closes a flyout opened by touch
  useEffect(() => {
    if (!fly?.group) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      const t = e.target as Node;
      if (!railRef.current?.contains(t) && !flyRef.current?.contains(t)) setFly(null);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('touchstart', onDown, { passive: true });
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('touchstart', onDown); };
  }, [fly?.group]);

  const railBtn = (active: boolean) => cn(
    'relative flex h-10 w-10 items-center justify-center rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500',
    active ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200 dark:bg-slate-800 dark:text-white dark:ring-slate-700'
      : 'text-slate-500 hover:bg-white/80 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/70 dark:hover:text-white',
  );

  const visiblePinned = pinnedOpen ? pinned : pinned.slice(0, 5);

  return (
    <div ref={railRef} className="flex h-full min-h-0 flex-col items-center gap-1 py-3">
      <button onClick={onToggleCollapse} aria-label="Expand sidebar (⌘B)"
        onMouseEnter={(e) => show('logo', e.currentTarget, 'Expand sidebar  ⌘B')} onMouseLeave={hideSoon}
        className="group relative mb-1 flex h-10 w-10 items-center justify-center rounded-xl text-white shadow-sm"
        style={{ background: `linear-gradient(135deg, ${accent}, ${accent}cc)` }}>
        <span className="transition-opacity group-hover:opacity-0">
          {industry?.emoji && !isMarketplace ? <span className="text-lg leading-none">{industry.emoji}</span> : <Logo size={20} />}
        </span>
        <PanelLeftOpen className="absolute h-4 w-4 opacity-0 transition-opacity group-hover:opacity-100" />
      </button>

      <div className="flex min-h-0 w-full flex-1 flex-col items-center gap-1 overflow-y-auto overflow-x-hidden px-2 [scrollbar-width:none]">
        {visiblePinned.map((it) => {
          const Icon = it.icon;
          const active = isActivePath(location.pathname, it.to);
          return (
            <NavLink key={`p-${it.to}`} to={it.to} aria-label={it.label} className={railBtn(active)}
              onMouseEnter={(e) => show(`p-${it.to}`, e.currentTarget, it.label)} onMouseLeave={hideSoon}>
              <Icon className="h-[18px] w-[18px]" style={active ? { color: accent } : undefined} />
              {it.liveCount && <OnlineOrdersCount dot />}
            </NavLink>
          );
        })}
        {pinned.length > 5 && (
          <button onClick={() => setPinnedOpen((v) => !v)} className="h-5 text-[10px] font-semibold text-slate-400 hover:text-slate-700">
            {pinnedOpen ? 'less' : `+${pinned.length - 5}`}
          </button>
        )}
        {pinned.length > 0 && <div className="my-1.5 h-px w-8 shrink-0 bg-slate-300/70 dark:bg-slate-800" />}

        {groups.map((g) => {
          const Icon = g.icon;
          const active = g.items.some((i) => isActivePath(location.pathname, i.to));
          const openNow = fly?.key === g.id;
          return (
            <button key={g.id} aria-label={g.label} aria-expanded={openNow}
              className={cn(railBtn(active), openNow && !active && 'bg-white/80 text-slate-900 dark:bg-slate-800/70 dark:text-white')}
              onMouseEnter={(e) => show(g.id, e.currentTarget, g.label, g)} onMouseLeave={hideSoon}
              onClick={(e) => (openNow ? setFly(null) : show(g.id, e.currentTarget, g.label, g))}>
              <Icon className="h-[18px] w-[18px]" style={active ? { color: accent } : g.color ? { color: g.color } : undefined} />
              {g.items.some((i) => i.liveCount) && <OnlineOrdersCount dot />}
            </button>
          );
        })}
      </div>

      <div className="flex shrink-0 flex-col items-center gap-1 border-t border-slate-200/80 px-2 pt-2 dark:border-slate-800">
        <NavLink to={settingsHome} aria-label="Settings" className={railBtn(isSettingsPath(location.pathname))}
          onMouseEnter={(e) => show('settings', e.currentTarget, 'Settings')} onMouseLeave={hideSoon}>
          <Settings className="h-[18px] w-[18px]" />
        </NavLink>
        <NavLink to="/help" aria-label="Help center" className={railBtn(isActivePath(location.pathname, '/help'))}
          onMouseEnter={(e) => show('help', e.currentTarget, 'Help center')} onMouseLeave={hideSoon}>
          <HelpCircle className="h-[18px] w-[18px]" />
        </NavLink>
        <button onClick={onToggleCollapse} aria-label="Expand sidebar" className={railBtn(false)}
          onMouseEnter={(e) => show('expand', e.currentTarget, 'Expand sidebar  ⌘B')} onMouseLeave={hideSoon}>
          <PanelLeftOpen className="h-[18px] w-[18px]" />
        </button>
      </div>

      {fly && createPortal(
        <div ref={flyRef} onMouseEnter={keep} onMouseLeave={hideSoon} style={{ top: fly.top, left: 80 }}
          className={cn(
            'fixed z-[80] animate-in fade-in slide-in-from-left-1 duration-100',
            fly.group
              ? 'w-60 rounded-xl border border-slate-200 bg-white p-1.5 text-slate-900 shadow-xl dark:border-slate-800 dark:bg-slate-900 dark:text-white'
              : 'pointer-events-none whitespace-pre rounded-lg bg-slate-900 px-2.5 py-1.5 text-[12px] font-medium text-white shadow-lg dark:bg-white dark:text-slate-900',
          )}>
          {fly.group ? (
            <>
              <div className="flex items-center gap-2 px-2.5 pb-1.5 pt-1 text-[12px] font-semibold text-slate-500 dark:text-slate-400">
                <fly.group.icon className="h-3.5 w-3.5" style={fly.group.color ? { color: fly.group.color } : undefined} /> {fly.group.label}
              </div>
              <div className="space-y-0.5">
                {fly.group.items.map((it) => {
                  const Icon = it.icon;
                  const active = isActivePath(location.pathname, it.to);
                  return (
                    <button key={it.to} onClick={() => { navigate(it.to); setFly(null); }}
                      className={cn('flex h-9 w-full items-center gap-2.5 rounded-lg px-2.5 text-left text-[13.5px] transition-colors',
                        active ? 'bg-slate-100 font-semibold dark:bg-slate-800' : 'font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800/60 dark:hover:text-white')}>
                      <Icon className="h-4 w-4 shrink-0" style={active ? { color: accent } : undefined} />
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