/**
 * Small counters and labels shown next to navigation items.
 */

import { useLiveOnlineOrders } from '@integrations/online-orders/hooks/useLiveOnlineOrders';
import { cn } from '@core/lib/cn';
import { t } from '@core/i18n';

const BADGE_TONES: Record<string, string> = {
  LIVE: 'bg-rose-500 text-white',
  NEW: 'bg-brand-600 text-brand-fg',
  AI: 'bg-violet-500 text-white',
};

/** Short uppercase tag such as NEW, LIVE or AI. */
export function ItemBadge({ text }: { text: string }) {
  return (
    <span className={cn('shrink-0 rounded px-1.5 py-0.5 text-[0.625rem] font-bold tracking-wide', BADGE_TONES[text] ?? 'bg-amber-500 text-white')}>
      {text}
    </span>
  );
}

/** Neutral count, e.g. pending orders on a sales channel. */
export function CountPill({ n }: { n: number }) {
  return (
    <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-md bg-amber-500/15 px-1.5 text-[0.6875rem] font-bold tabular-nums text-amber-700 dark:text-amber-300">
      {n > 99 ? '99+' : n}
    </span>
  );
}

/**
 * Pending online orders, from the same query that drives the new-order popup.
 * `dot` renders a corner dot for icon-only places such as the collapsed rail.
 */
export function OnlineOrdersCount({ compact, dot }: { compact?: boolean; dot?: boolean }) {
  const { data } = useLiveOnlineOrders();
  const n = data?.pendingCount ?? 0;
  if (!n) return null;
  if (dot) {
    return <span className="absolute end-1.5 top-1.5 h-2 w-2 rounded-full bg-amber-500 ring-2 ring-shell-sidebar" aria-label={t('{{n}} new online orders', { n })} />;
  }
  return (
    <span className={cn(
      'flex shrink-0 items-center justify-center rounded-md bg-amber-500 font-bold tabular-nums text-white',
      compact ? 'h-4 min-w-4 px-1 text-[0.625rem]' : 'h-5 min-w-5 px-1.5 text-[0.6875rem]',
    )}>
      {n > 99 ? '99+' : n}
    </span>
  );
}
