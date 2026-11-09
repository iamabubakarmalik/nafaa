/**
 * Held links ("Stock milana baqi"): Nafaa and the channel had different stock
 * when the link was made, so Nafaa sends nothing until the user picks a side.
 * "Channel ka Stock lein" sets Nafaa stock to the channel number; "Nafaa ka
 * Stock bhejein" sends Nafaa stock to the channel. Holds a badge for grid
 * cells, the two actions, and the per-channel list used by the Masle drawer.
 */

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ChevronDown, ChevronLeft, ChevronRight, CloudDownload, CloudUpload } from 'lucide-react';
import { Button, EmptyState, Skeleton, confirmDialog } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { t } from '@core/i18n';
import { apiErrorMessage } from '../../api/online-orders.api';
import {
  ONLINE_PRODUCTS_KEY, onlineProductsApi, type HoldAction, type HoldReason, type OnlineChannel, type StockHoldInfo,
} from '../../api/online-products.api';
import { timeAgo } from '../../lib/labels';
import { ChannelMark, channelName, refreshOnlineProducts } from './meta';

export const holdReasonText = (r: HoldReason) =>
  r === 'import' ? t('Import ke waqt') : r === 'guard' ? t('Nafaa ne bhejne se roka') : t('Jorte waqt');

const stockNum = (n: number | null) => (n === null ? '—' : n.toLocaleString('en-PK'));

/** "Nafaa 0 · Channel 12" */
export const holdNumbers = (h: Pick<StockHoldInfo, 'nafaaStock' | 'channelStock'>) =>
  t('Nafaa {{n}} · Channel {{c}}', { n: stockNum(h.nafaaStock), c: stockNum(h.channelStock) });

/** Amber tag for a held link, with both stock numbers. */
export function HoldTag({ hold, compact, className }: { hold: StockHoldInfo; compact?: boolean; className?: string }) {
  const title = `${t('Stock milana baqi')} · ${holdNumbers(hold)} · ${holdReasonText(hold.reason)} ${timeAgo(hold.since)}`;
  return (
    <span title={title} className={cn('inline-flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5', className)}>
      <span className="inline-flex shrink-0 items-center rounded bg-amber-50 px-1 text-[0.65625rem] font-semibold leading-4 text-amber-800 ring-1 ring-amber-200">
        {t('Stock milana baqi')}
      </span>
      <span className={cn('truncate tabular-nums text-amber-800', compact ? 'text-[0.6875rem]' : 'text-[0.71875rem]')}>{holdNumbers(hold)}</span>
    </span>
  );
}

type ResolveVars = { channelId: string; action: HoldAction; mappingIds?: string[] };

/** Resolve held links (some or every one on a channel), with the result in a toast. */
export function useResolveHolds(onDone?: () => void) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ channelId, action, mappingIds }: ResolveVars) =>
      onlineProductsApi.resolveHolds(channelId, mappingIds ? { action, mappingIds } : { action, all: true }),
    onSuccess: (r) => {
      refreshOnlineProducts(qc);
      qc.invalidateQueries({ queryKey: [ONLINE_PRODUCTS_KEY, 'issues'] });
      const parts = [t('{{resolved}} links ka faisla ho gaya', { resolved: r.resolved })];
      if (r.adjusted) parts.push(t('{{adjusted}} ka Nafaa Stock badla', { adjusted: r.adjusted }));
      if (r.skipped) parts.push(t('{{skipped}} chhor diye', { skipped: r.skipped }));
      if (r.resolved || r.adjusted) toast.success(parts.join(' · ')); else toast.info(parts.join(' · '));
      if (r.errors?.[0]) toast.error(r.errors[0]);
      onDone?.();
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
}

/** Asks before either action; `count` null means every held link on the channel. */
export async function confirmResolve(action: HoldAction, count: number | null, channel?: string) {
  const many = count === null ? t('{{channel}} ke sab ruke hue links', { channel: channel ?? t('Is channel') }) : t('{{count}} links', { count });
  return action === 'take-channel'
    ? confirmDialog({
      title: t('Channel ka Stock Nafaa me lein?'),
      text: t('{{many}}: Nafaa ka Stock channel wale Stock ke barabar ho jayega. Channel par kuch nahi badlega. Jin ka channel Stock maloom nahi wo chhor diye jayenge.', { many }),
      yes: t('Channel ka Stock lein'),
    })
    : confirmDialog({
      title: t('Nafaa ka Stock channel par bhejein?'),
      text: t('{{many}}: channel par Stock wahi ho jayega jo Nafaa me hai. Nafaa me 0 ho to channel par bhi 0 ho jayega.', { many }),
      yes: t('Nafaa ka Stock bhejein'),
      danger: true,
    });
}

/** The two actions for a fixed set of links (one product cell, or rows picked in a list). */
export function HoldActions({ channelId, mappingIds, takeIds, size = 'xs', onDone }: {
  channelId: string;
  mappingIds: string[];
  /** Links whose channel stock is known; only these can take the channel number. Defaults to all. */
  takeIds?: string[];
  size?: 'xs' | 'sm';
  onDone?: () => void;
}) {
  const m = useResolveHolds(onDone);
  const take = takeIds ?? mappingIds;
  const run = async (action: HoldAction, ids: string[]) => {
    if (!ids.length || !(await confirmResolve(action, ids.length))) return;
    m.mutate({ channelId, action, mappingIds: ids });
  };
  const busy = (a: HoldAction) => m.isPending && m.variables?.action === a;
  return (
    <>
      <Button size={size} variant="secondary" disabled={!take.length || m.isPending} loading={busy('take-channel')}
        title={!take.length ? t('Channel ka Stock maloom nahi') : undefined}
        onClick={() => void run('take-channel', take)} leftIcon={<CloudDownload className="h-3.5 w-3.5" />}>
        {t('Channel ka Stock lein')}
      </Button>
      <Button size={size} variant="secondary" disabled={!mappingIds.length || m.isPending} loading={busy('send-nafaa')}
        onClick={() => void run('send-nafaa', mappingIds)} leftIcon={<CloudUpload className="h-3.5 w-3.5" />}>
        {t('Nafaa ka Stock bhejein')}
      </Button>
    </>
  );
}

/** One channel in the "Stock milana baqi" group: count, bulk actions, and the list of held links. */
export function HoldChannelRow({ channel, count, canManage, onSee }: { channel: OnlineChannel; count: number; canManage: boolean; onSee: () => void }) {
  const [open, setOpen] = useState(false);
  const all = useResolveHolds();
  const runAll = async (action: HoldAction) => {
    if (await confirmResolve(action, null, channelName(channel))) all.mutate({ channelId: channel.id, action });
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
              <Button size="xs" variant="secondary" loading={all.isPending && all.variables?.action === 'take-channel'} disabled={all.isPending}
                onClick={() => void runAll('take-channel')}>{t('Channel ka Stock lein')}</Button>
              <Button size="xs" variant="secondary" loading={all.isPending && all.variables?.action === 'send-nafaa'} disabled={all.isPending}
                onClick={() => void runAll('send-nafaa')}>{t('Nafaa ka Stock bhejein')}</Button>
            </>
          )}
        </span>
      </div>
      {open && <HoldList channelId={channel.id} canManage={canManage} />}
    </li>
  );
}

const LIST_LIMIT = 50;

/** Held links of one channel, page by page, with checkboxes and the two actions for the picked rows. */
function HoldList({ channelId, canManage }: { channelId: string; canManage: boolean }) {
  const [page, setPage] = useState(1);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const q = useQuery({
    queryKey: [ONLINE_PRODUCTS_KEY, 'stock-holds', channelId, page],
    queryFn: () => onlineProductsApi.stockHolds(channelId, page, LIST_LIMIT),
    placeholderData: (p) => p,
  });
  const items = q.data?.items ?? [];
  const pickedRows = items.filter((r) => picked.has(r.mappingId));
  const allPicked = items.length > 0 && items.every((r) => picked.has(r.mappingId));
  const toggle = (id: string) => setPicked((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  if (q.isLoading) return <div className="mt-2 space-y-1.5">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-10 rounded-lg" />)}</div>;
  if (q.isError) return <p className="mt-2 rounded-lg bg-rose-50 px-3 py-2 text-[0.75rem] text-rose-800">{apiErrorMessage(q.error)}</p>;
  if (!items.length) return <div className="mt-2"><EmptyState title={t('Koi link ruka hua nahi')} description={t('Nafaa aur channel ka Stock barabar hai.')} /></div>;

  return (
    <div className="mt-2 overflow-hidden rounded-xl ring-1 ring-slate-200/80">
      <div className="grid grid-cols-[1.5rem_minmax(0,1fr)_3.5rem_3.5rem] items-center gap-2 bg-slate-50 px-2.5 py-1.5 text-[0.6875rem] font-semibold uppercase tracking-wide text-slate-500">
        {canManage
          ? <input type="checkbox" checked={allPicked} onChange={() => setPicked(allPicked ? new Set() : new Set(items.map((r) => r.mappingId)))} aria-label={t('Is safhe ke sab chunein')} className="h-4 w-4 rounded border-slate-300" />
          : <span />}
        <span>{t('Product')}</span>
        <span className="text-end">{t('Nafaa')}</span>
        <span className="text-end">{t('Channel')}</span>
      </div>
      <ul className="max-h-80 divide-y divide-slate-100 overflow-y-auto">
        {items.map((r) => (
          <li key={r.mappingId} className="grid grid-cols-[1.5rem_minmax(0,1fr)_3.5rem_3.5rem] items-center gap-2 px-2.5 py-1.5">
            {canManage
              ? <input type="checkbox" checked={picked.has(r.mappingId)} onChange={() => toggle(r.mappingId)} aria-label={t('{{name}} chunein', { name: r.name })} className="h-4 w-4 rounded border-slate-300" />
              : <span />}
            <span className="min-w-0 leading-tight">
              <span className="block truncate text-[0.78125rem] font-medium text-slate-900" title={r.name}>
                {r.name}{r.variantName ? <span className="text-slate-500"> — {r.variantName}</span> : null}
              </span>
              <span className="block truncate text-[0.6875rem] text-slate-500" title={r.externalTitle ?? undefined}>
                {r.externalTitle || t('Channel ka item')}{r.externalSku ? <span className="font-mono"> · {r.externalSku}</span> : null} · {holdReasonText(r.reason)} {timeAgo(r.since)}
              </span>
            </span>
            <span className="text-end text-[0.8125rem] font-semibold tabular-nums text-slate-800">{stockNum(r.nafaaStock)}</span>
            <span className={cn('text-end text-[0.8125rem] font-semibold tabular-nums', r.channelStock === null ? 'text-slate-400' : 'text-amber-800')}
              title={r.channelStock === null ? t('Channel ka Stock maloom nahi') : undefined}>{stockNum(r.channelStock)}</span>
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
        <span className="me-auto text-[0.75rem] text-slate-500">{picked.size ? t('{{count}} chune', { count: pickedRows.length }) : t('Kuch chunein, phir faisla karein')}</span>
        {canManage && (
          <HoldActions channelId={channelId} mappingIds={pickedRows.map((r) => r.mappingId)}
            takeIds={pickedRows.filter((r) => r.channelStock !== null).map((r) => r.mappingId)} onDone={() => setPicked(new Set())} />
        )}
      </div>
    </div>
  );
}
