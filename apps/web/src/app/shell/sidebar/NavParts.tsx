/**
 * Building blocks of the expanded sidebar: section titles, collapsible group
 * headers, navigation rows and the footer links.
 */

import type { ComponentType, CSSProperties, MouseEvent, ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { ChevronDown, Star } from 'lucide-react';
import { cn } from '@core/lib/cn';
import type { NavItem } from '../navigation/nav-config';
import { CountPill, ItemBadge, OnlineOrdersCount } from './NavBadges';
import { t } from '@core/i18n';

type IconType = ComponentType<{ className?: string; style?: CSSProperties }>;

/** Paths that count as active only on an exact match (they have child routes). */
export const EXACT_MATCH_PATHS = new Set(['/staff', '/products', '/fbr', '/sales', '/online-orders']);

const ROW = 'group/item relative flex h-9 items-center gap-2.5 rounded-lg ps-2.5 pe-1 text-[0.84375rem] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-brand-500';
const ROW_ACTIVE = 'bg-white font-semibold text-slate-900 shadow-sm ring-1 ring-slate-200/80 dark:bg-ink-white/[0.07] dark:text-ink-white dark:ring-ink-white/10';
const ROW_IDLE = 'font-medium text-slate-600 hover:bg-white/70 hover:text-slate-900 dark:text-ink-400 dark:hover:bg-ink-white/[0.05] dark:hover:text-ink-white';

/** Brand-colored bar on the left edge of the active row. */
function ActiveBar() {
  return <span className="absolute -start-2 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-e-full bg-brand-600 dark:bg-brand-400" aria-hidden />;
}

export function NavSection({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-2 px-2.5 py-1.5 text-[0.75rem] font-semibold text-slate-500 dark:text-ink-400">
        {icon}<span>{title}</span>
      </div>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

export function GroupHeader({ label, icon: Icon, color, open, dot, live, onClick }: {
  label: string; icon: IconType; color?: string; open: boolean; dot?: boolean; live?: boolean; onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={open}
      className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-start text-[0.75rem] font-semibold text-slate-500 transition hover:text-slate-900 dark:text-ink-400 dark:hover:text-ink-white"
    >
      <Icon className="h-3.5 w-3.5 shrink-0" style={color ? { color } : undefined} />
      <span className="flex-1 truncate">{label}</span>
      {live && <OnlineOrdersCount compact />}
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-brand-500" aria-label={t('Current page is in this group')} />}
      <ChevronDown className={cn('h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform duration-200', !open && '-rotate-90')} />
    </button>
  );
}

export function NavRow({ item, fav, muted, hideStar, onToggleFav, onItemClick }: {
  item: NavItem; fav: boolean; muted?: boolean; hideStar?: boolean;
  onToggleFav?: (e: MouseEvent) => void; onItemClick?: () => void;
}) {
  const Icon = item.icon as IconType;
  return (
    <NavLink
      to={item.to}
      end={EXACT_MATCH_PATHS.has(item.to)}
      onClick={onItemClick}
      className={({ isActive }) => cn(ROW, isActive ? ROW_ACTIVE : muted ? cn(ROW_IDLE, 'text-slate-500 dark:text-ink-500') : ROW_IDLE)}
    >
      {({ isActive }) => (
        <>
          {isActive && <ActiveBar />}
          <Icon className={cn('h-4 w-4 shrink-0', isActive && 'text-brand-600 dark:text-brand-400')} />
          <span className="min-w-0 flex-1 truncate">{item.label}</span>
          {item.hot && !isActive && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" aria-hidden />}
          {item.liveCount === 'online-orders' && <OnlineOrdersCount />}
          {!!item.count && <CountPill n={item.count} />}
          {item.dim && <span className="shrink-0 text-[0.6875rem] font-medium text-slate-400">{t('off')}</span>}
          {item.badge && <ItemBadge text={item.badge} />}
          {!hideStar && onToggleFav && (
            <button
              type="button"
              onClick={onToggleFav}
              aria-label={fav ? t('Unpin {{label}}', { label: item.label }) : t('Pin {{label}}', { label: item.label })}
              title={fav ? t('Unpin') : t('Pin to top')}
              className={cn(
                'flex h-6 w-6 shrink-0 items-center justify-center rounded-md transition',
                fav
                  ? 'text-amber-500 hover:bg-amber-500/10'
                  : 'text-slate-400 opacity-0 hover:bg-slate-900/5 hover:text-amber-500 focus-visible:opacity-100 group-hover/item:opacity-100 [@media(hover:none)]:opacity-40 dark:hover:bg-ink-white/10',
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

export function FooterLink({ to, icon: Icon, label, active, onClick }: { to: string; icon: IconType; label: string; active: boolean; onClick?: () => void }) {
  return (
    <NavLink to={to} onClick={onClick} className={cn(ROW, 'pe-2.5', active ? ROW_ACTIVE : ROW_IDLE)}>
      {active && <ActiveBar />}
      <Icon className={cn('h-4 w-4 shrink-0', active && 'text-brand-600 dark:text-brand-400')} /> {label}
    </NavLink>
  );
}
