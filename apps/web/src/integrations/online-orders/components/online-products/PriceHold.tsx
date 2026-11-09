/**
 * Held prices ("Website par qeemat badli — kaunsi rakhein?"): the price
 * changed on the channel and differs from Nafaa, and the channel's settings
 * ask before either side wins, so Nafaa sends nothing until the user picks.
 * "Nafaa ki bhejein" sends the Nafaa price to the channel; "Website ki Nafaa
 * me lein" saves the channel price in Nafaa (where depends on the channel's
 * settings). Holds the tag for a held link, the two actions, and the
 * per-channel list used by the Masle drawer.
 */

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ChevronDown, ChevronLeft, ChevronRight, CloudDownload, CloudUpload } from 'lucide-react';
import { Button, EmptyState, Skeleton, confirmDialog } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { t } from '@core/i18n';
import { apiErrorMessage } from '../../api/online-orders.api';
import { ONLINE_PRODUCTS_KEY, onlineProductsApi, type OnlineChannel, type PriceHoldAction, type PriceHoldInfo, type PriceTarget } from '../../api/online-products.api';
import { timeAgo } from '../../lib/labels';
import { ChannelMark, channelName, refreshOnlineProducts, rs } from './meta';

const price = (n: number | null | undefined) => (n === null || n === undefined ? '—' : rs(n));

/** Where a price taken from the channel is saved, in words. */
export const priceTargetText = (target: PriceTarget | null | undefined) => (target ? {
  PRODUCT: t('Product ki Price'),
  VARIANT: t('Size ki Price'),
  SHOP: t('Branch ki Price'),
  CHANNEL: t('Sirf is channel ki Price'),
}[target] ?? target : null);

/** "Nafaa Rs 1,200 · Website Rs 1,150" */
export const priceHoldNumbers = (h: Pick<PriceHoldInfo, 'nafaaPrice' | 'channelPrice'>) =>
  t('Nafaa {{n}} · Website {{c}}', { n: price(h.nafaaPrice), c: price(h.channelPrice) });

type ResolveVars = { channelId: string; action: PriceHoldAction; mappingIds?: string[] };

/** Settle held prices (some or every one on a channel), with the result in a toast. */
export function useResolvePriceHolds(onDone?: () => void) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ channelId, action, mappingIds }: ResolveVars) =>
      onlineProductsApi.resolvePriceHolds(channelId, mappingIds ? { action, mappingIds } : { action, all: true }),
    onSuccess: (r) => {
      refreshOnlineProducts(qc);
      const parts = [t('{{resolved}} links ka faisla ho gaya', { resolved: r.resolved })];
      if (r.sent) parts.push(t('{{sent}} par Nafaa ki qeemat bheji', { sent: r.sent }));
      if (r.taken) parts.push(t('{{taken}} ki website wali qeemat Nafaa me', { taken: r.taken }));
      if (r.skipped) parts.push(t('{{skipped}} chhor diye', { skipped: r.skipped }));
      if (r.resolved) toast.success(parts.join(' · ')); else toast.info(parts.join(' · '));
      if (r.errors?.[0]) toast.error(r.errors[0]);
      onDone?.();
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
}

/** Asks before either action; `count` null means every held price on the channel. */
export async function confirmPriceResolve(action: PriceHoldAction, count: number | null, channel?: string) {
  const many = count === null ? t('{{channel}} ki sab ruki hui qeematein', { channel: channel ?? t('Is channel') }) : t('{{count}} links', { count });
  return action === 'website'
    ? confirmDialog({
      title: t('Website ki qeemat Nafaa me lein?'),
      text: t('{{many}}: website wali qeemat Nafaa me lag jayegi (channel ki settings ke hisaab se product ki ya sirf is channel ki Price). Website par kuch nahi badlega.', { many }),
      yes: t('Website ki lein'),
    })
    : confirmDialog({
      title: t('Nafaa ki qeemat website par bhejein?'),
      text: t('{{many}}: website par wohi qeemat lag jayegi jo Nafaa rakhta hai. Website par badli hui qeemat hat jayegi.', { many }),
      yes: t('Nafaa ki bhejein'),
      danger: true,
    });
}

/** The two actions for a fixed set of links (one product cell, or rows picked in a list). */
export function PriceHoldActions({ channelId, mappingIds, size = 'xs', iconOnly, onDone }: {
  channelId: string; mappingIds: string[]; size?: 'xs' | 'sm';
  /** Icons only, with the words as a tooltip (one row of a list). */
  iconOnly?: boolean;
  onDone?: () => void;
}) {
  const m = useResolvePriceHolds(onDone);
  const run = async (action: PriceHoldAction) => {
    if (!mappingIds.length || !(await confirmPriceResolve(action, mappingIds.length))) return;
    m.mutate({ channelId, action, mappingIds });
  };
  const busy = (a: PriceHoldAction) => m.isPending && m.variables?.action === a;
  return (
    <>
      <Button size={size} variant="secondary" disabled={!mappingIds.length || m.isPending} loading={busy('nafaa')}
        title={iconOnly ? t('Nafaa ki bhejein') : undefined} aria-label={iconOnly ? t('Nafaa ki bhejein') : undefined}
        onClick={() => void run('nafaa')} leftIcon={<CloudUpload className="h-3.5 w-3.5" />}>
        {iconOnly ? null : t('Nafaa ki bhejein')}
      </Button>
      <Button size={size} variant="secondary" disabled={!mappingIds.length || m.isPending} loading={busy('website')}
        title={iconOnly ? t('Website ki Nafaa me lein') : undefined} aria-label={iconOnly ? t('Website ki Nafaa me lein') : undefined}
        onClick={() => void run('website')} leftIcon={<CloudDownload className="h-3.5 w-3.5" />}>
        {iconOnly ? null : t('Website ki Nafaa me lein')}
      </Button>
    </>
  );
}

/** One channel in the price-hold group: count, bulk actions, and the list of held links. */
export function PriceHoldChannelRow({ channel, count, canManage, onSee }: { channel: OnlineChannel; count: number; canManage: boolean; onSee: () => void }) {
  const [open, setOpen] = useState(false);
  const all = useResolvePriceHolds();
  const runAll = async (action: PriceHoldAction) => {
    if (await confirmPriceResolve(action, null, channelName(channel))) all.mutate({ channelId: channel.id, action });
  };
  return (
    <li className="px-4 py-2">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <ChannelMark channel={channel} size="sm" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[0.8125rem] font-medium text-slate-800">{channelName(channel)}</span>
          <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open}
            className="inline-flex items-center gap-1 text-[0.75rem] font-semibold text-brand-700 hover:underline">
            {t('Har ek dekhein')}<ChevronDown className={cn('h-3.5 w-3.5 transition', open && 'rotate-180')} />
          </button>
        </span>
        <span className="text-[0.75rem] font-semibold tabular-nums text-slate-600">{count.toLocaleString('en-PK')}</span>
        <span className="flex shrink-0 flex-wrap items-center gap-1.5">
          <Button size="xs" variant="ghost" onClick={onSee}>{t('Dekhein')}</Button>
          {canManage && (
            <>
              <Button size="xs" variant="secondary" loading={all.isPending && all.variables?.action === 'nafaa'} disabled={all.isPending}
                onClick={() => void runAll('nafaa')}>{t('Nafaa ki bhejein')}</Button>
              <Button size="xs" variant="secondary" loading={all.isPending && all.variables?.action === 'website'} disabled={all.isPending}
                onClick={() => void runAll('website')}>{t('Website ki Nafaa me lein')}</Button>
            </>
          )}
        </span>
      </div>
      {open && <PriceHoldList channelId={channel.id} canManage={canManage} />}
    </li>
  );
}

const LIST_LIMIT = 50;

/** Held prices of one channel, page by page, with checkboxes and the two actions for the picked rows. */
function PriceHoldList({ channelId, canManage }: { channelId: string; canManage: boolean }) {
  const [page, setPage] = useState(1);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const q = useQuery({
    queryKey: [ONLINE_PRODUCTS_KEY, 'price-holds', channelId, page],
    queryFn: () => onlineProductsApi.priceHolds(channelId, page, LIST_LIMIT),
    placeholderData: (p) => p,
  });
  const items = q.data?.items ?? [];
  const pickedIds = items.filter((r) => picked.has(r.mappingId)).map((r) => r.mappingId);
  const allPicked = items.length > 0 && items.every((r) => picked.has(r.mappingId));
  const toggle = (id: string) => setPicked((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  if (q.isLoading) return <div className="mt-2 space-y-1.5">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-10 rounded-lg" />)}</div>;
  if (q.isError) return <p className="mt-2 rounded-lg bg-rose-50 px-3 py-2 text-[0.75rem] text-rose-800">{apiErrorMessage(q.error)}</p>;
  if (!items.length) return <div className="mt-2"><EmptyState title={t('Koi qeemat ruki hui nahi')} description={t('Nafaa aur website ki qeemat barabar hai.')} /></div>;

  return (
    <div className="mt-2 overflow-hidden rounded-xl ring-1 ring-slate-200/80">
      <div className="grid grid-cols-[1.5rem_minmax(0,1fr)_4.5rem_4.5rem_auto] items-center gap-2 bg-slate-50 px-2.5 py-1.5 text-[0.6875rem] font-semibold uppercase tracking-wide text-slate-500">
        {canManage
          ? <input type="checkbox" checked={allPicked} onChange={() => setPicked(allPicked ? new Set() : new Set(items.map((r) => r.mappingId)))} aria-label={t('Is safhe ke sab chunein')} className="h-4 w-4 rounded border-slate-300" />
          : <span />}
        <span>{t('Product')}</span>
        <span className="text-end">{t('Nafaa')}</span>
        <span className="text-end">{t('Website')}</span>
        <span />
      </div>
      <ul className="max-h-80 divide-y divide-slate-100 overflow-y-auto">
        {items.map((r) => (
          <li key={r.mappingId} className="grid grid-cols-[1.5rem_minmax(0,1fr)_4.5rem_4.5rem_auto] items-center gap-2 px-2.5 py-1.5">
            {canManage
              ? <input type="checkbox" checked={picked.has(r.mappingId)} onChange={() => toggle(r.mappingId)} aria-label={t('{{name}} chunein', { name: r.name })} className="h-4 w-4 rounded border-slate-300" />
              : <span />}
            <span className="min-w-0 leading-tight">
              <span className="block truncate text-[0.78125rem] font-medium text-slate-900" title={r.name}>
                {r.name}{r.variantName ? <span className="text-slate-500"> — {r.variantName}</span> : null}
              </span>
              <span className="block truncate text-[0.6875rem] text-slate-500" title={r.externalTitle ?? undefined}>
                {r.externalTitle || t('Channel ka item')}{r.externalSku ? <span className="font-mono"> · {r.externalSku}</span> : null} · {t('Website par badli {{when}}', { when: timeAgo(r.channelPriceAt ?? r.since) })}
              </span>
            </span>
            <span className="text-end text-[0.8125rem] font-semibold tabular-nums text-slate-800">{price(r.nafaaPrice)}</span>
            <span className="text-end text-[0.8125rem] font-semibold tabular-nums text-amber-800">{price(r.channelPrice)}</span>
            <span className="flex items-center gap-1">
              {canManage && <PriceHoldActions channelId={channelId} mappingIds={[r.mappingId]} iconOnly />}
            </span>
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 bg-slate-50/70 px-2.5 py-2">
        {q.data && q.data.pages > 1 && (
          <span className="flex items-center gap-1 text-[0.75rem] tabular-nums text-slate-600">
            <Button size="xs" variant="ghost" disabled={page <= 1 || q.isFetching} onClick={() => { setPage((p) => p - 1); setPicked(new Set()); }} aria-label={t('Pichla')} leftIcon={<ChevronLeft className="h-3.5 w-3.5 rtl:rotate-180" />} />
            {page} / {q.data.pages}
            <Button size="xs" variant="ghost" disabled={page >= q.data.pages || q.isFetching} onClick={() => { setPage((p) => p + 1); setPicked(new Set()); }} aria-label={t('Agla')} leftIcon={<ChevronRight className="h-3.5 w-3.5 rtl:rotate-180" />} />
          </span>
        )}
        <span className="me-auto text-[0.75rem] text-slate-500">{picked.size ? t('{{count}} chune', { count: pickedIds.length }) : t('Kuch chunein, phir faisla karein')}</span>
        {canManage && <PriceHoldActions channelId={channelId} mappingIds={pickedIds} onDone={() => setPicked(new Set())} />}
      </div>
    </div>
  );
}
