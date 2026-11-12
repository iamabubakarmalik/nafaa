/**
 * One product across every channel, in a side drawer. On top: the Nafaa
 * price and stock, and how the stock is split between channels (a bar).
 * Then one section per channel with all of its controls: link, unlink or
 * link to another item, Listed, own price and sale price against the rule,
 * stock share, the content Nafaa sends, publish when the product is not on
 * the channel yet, the last push with retry, and a link to it on the channel.
 * A held link (Nafaa and channel stock differ) shows both numbers and the
 * two ways to settle it; a held price (changed on the channel) the same.
 * A Nafaa website section shows its price and stock (from Nafaa, read-only)
 * and the "show on website" switch.
 * Below: the product's sync history, and "make it on the website too" where
 * a channel makes only marked products.
 */

import { useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AlertTriangle, ExternalLink, Link2, Link2Off, MoreHorizontal, RefreshCw, Upload } from 'lucide-react';
import { Badge, Button, Drawer, Menu, MenuItem, MenuSeparator, Switch, confirmDialog } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { t } from '@core/i18n';
import { apiErrorMessage } from '../../api/online-orders.api';
import { ONLINE_PRODUCTS_KEY, isStoreCell, isStoreChannel, onlineProductsApi, type GridItem, type GridRow, type LinkedCell, type OnlineChannel, type PushContent } from '../../api/online-products.api';
import { timeAgo } from '../../lib/labels';
import { JOBS_KEY } from './ActivityDrawer';
import { InlineEdit } from './InlineEdit';
import { ChannelMark, channelName, channelProductUrl, kindOf, lastPushText, priceText, refreshOnlineProducts, rs, stockSplit, stockText, WEBSITE_LINKS_NOTE } from './meta';
import { Dot, Thumb, UntrackedTag, dotOf, notCounted, storeDot } from './ProductsGrid';
import { causeInfo, isNafaaText, syncCause } from './syncErrors';
import { BackorderSettings } from './BackorderSettings';
import { HoldActions, holdNumbers, holdReasonText } from './StockHold';
import { isJumpHold, PriceHoldActions, priceHoldNumbers } from './PriceHold';
import { SyncHistory } from './SyncHistory';

const CONTENT_KEYS: Array<{ key: keyof PushContent; label: () => string }> = [
  { key: 'title', label: () => t('Naam') },
  { key: 'description', label: () => t('Description') },
  { key: 'images', label: () => t('Tasveerein') },
  { key: 'sku', label: () => t('SKU') },
  { key: 'weight', label: () => t('Weight') },
];

export function ProductPanel({ item: seed, cols: seedCols, focusChannel, canManage, onClose, onLink }: {
  item: GridItem;
  /** Channels the grid showed; the panel loads every channel itself. */
  cols: OnlineChannel[];
  focusChannel?: string;
  canManage: boolean;
  onClose: () => void;
  onLink: (c: OnlineChannel, item: GridItem, row: GridRow) => void;
}) {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: [ONLINE_PRODUCTS_KEY, 'item', seed.productId], queryFn: () => onlineProductsApi.item(seed.productId), staleTime: 10_000 });
  const item = q.data?.item ?? seed;
  const cols = q.data?.item ? q.data.channels : seedCols;
  const sized = item.hasVariants && item.rows.some((r) => r.variantId);
  const done = (msg: string) => { refreshOnlineProducts(qc); qc.invalidateQueries({ queryKey: JOBS_KEY }); toast.success(msg); };

  const pushAll = useMutation({
    mutationFn: () => onlineProductsApi.syncProduct(item.productId, true),
    onSuccess: (r) => {
      refreshOnlineProducts(qc);
      const bad = r.results.filter((x) => !x.ok);
      if (!r.results.length) toast.info(t('Ye product kisi channel se jura nahi'));
      else if (bad.length) toast.error(t('{{name}}: nahi gaya — {{why}}', { name: bad[0].name, why: causeInfo(syncCause(bad[0].error)).title }));
      else toast.success(t('{{value}} par bhej diya', { value: r.results.map((x) => x.name).join(', ') }));
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  const ordered = [...cols].sort((a, b) => (a.id === focusChannel ? -1 : b.id === focusChannel ? 1 : 0));
  const anyPushLinked = cols.some((c) => c.canPush && item.rows.some((r) => r.cells[c.id]?.linked));
  // Channels that make only marked products, where this product is not yet.
  const markable = cols.filter((c) => c.canPublish && c.autoPublish === 'MARKED' && !item.rows.some((r) => r.cells[c.id]?.linked) && !item.sizeLess[c.id]);
  const mark = useMutation({
    mutationFn: () => onlineProductsApi.publishMarks({ productIds: [item.productId], on: true }),
    onSuccess: (r) => {
      refreshOnlineProducts(qc);
      toast.success(r.changed ? t('Nishan lag gaya — website par thori der me ban jayega') : t('Is par pehle se nishan laga hai'));
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  return (
    <Drawer open onClose={onClose} size="lg"
      icon={<Thumb src={item.image} size="lg" />}
      title={item.name}
      description={<span className="flex flex-wrap items-center gap-x-2">
        {item.sku ? <span className="font-mono">{item.sku}</span> : <span>{t('SKU nahi')}</span>}
        <span>· {t('Nafaa {{price}}', { price: rs(item.rows[0]?.price ?? item.price) })}</span>
        {sized && <span>· {t('{{count}} sizes', { count: item.rows.length })}</span>}
      </span>}
      actions={<>
        <Link to={`/products/${item.productId}`} className="hidden h-8 items-center rounded-lg px-2.5 text-[0.75rem] font-semibold text-slate-600 hover:bg-slate-100 sm:inline-flex">{t('Nafaa me kholein')}</Link>
        {canManage && markable.length > 0 && (
          <Button size="sm" variant="secondary" loading={mark.isPending} onClick={() => mark.mutate()} leftIcon={<Upload className="h-3.5 w-3.5" />}
            title={markable.map(channelName).join(', ')}>{t('Website par bhi banayein')}</Button>
        )}
        {canManage && anyPushLinked && <Button size="sm" variant="secondary" loading={pushAll.isPending} onClick={() => pushAll.mutate()} leftIcon={<RefreshCw className="h-3.5 w-3.5" />}>{t('Sab par bhejein')}</Button>}
      </>}>
      <div className="space-y-4 p-4 sm:p-5">
        <StockSplit item={item} cols={cols} sized={sized} />
        <section>
          <p className="mb-2 text-[0.75rem] font-semibold uppercase tracking-wide text-slate-500">{t('Stock khatam hone par')}</p>
          <BackorderSettings productId={item.productId} canManage={canManage} compact />
        </section>
        {ordered.map((c) => (isStoreChannel(c)
          ? <StoreSection key={c.id} c={c} item={item} sized={sized} canManage={canManage} focused={c.id === focusChannel} />
          : <ChannelSection key={c.id} c={c} item={item} sized={sized} canManage={canManage} focused={c.id === focusChannel} onLink={onLink} onDone={done} />
        ))}
        <SyncHistory productId={item.productId} channels={cols} />
      </div>
    </Drawer>
  );
}

/* ─── Stock split ─── */

function StockSplit({ item, cols, sized }: { item: GridItem; cols: OnlineChannel[]; sized: boolean }) {
  // Only rows whose stock goes somewhere; with nothing linked there is no split to show.
  const rows = item.rows.filter((r) => r.nafaaStock !== null && stockSplit(r, cols).parts.length > 0);
  if (!rows.length) return null;
  return (
    <section className="rounded-2xl bg-slate-50 p-3.5 ring-1 ring-slate-200/80">
      <p className="text-[0.75rem] font-semibold uppercase tracking-wide text-slate-500">{t('Stock kahan ja raha hai')}</p>
      <div className="mt-2 space-y-3">
        {rows.slice(0, 12).map((row) => <SplitRow key={row.variantId ?? 'base'} row={row} cols={cols} label={sized ? row.label : null} />)}
      </div>
    </section>
  );
}

function SplitRow({ row, cols, label }: { row: GridRow; cols: OnlineChannel[]; label: string | null }) {
  const { total, parts } = stockSplit(row, cols);
  const sum = parts.reduce((n, p) => n + p.qty, 0);
  // Shares can each be the full stock (every channel sells from it); then each gets its own bar.
  const exclusive = sum <= total;
  return (
    <div>
      <p className="flex flex-wrap items-baseline gap-x-1.5 text-[0.8125rem] text-slate-600">
        {label && <span className="rounded-md bg-white px-1.5 py-px text-[0.75rem] font-semibold text-slate-800 ring-1 ring-slate-200">{label}</span>}
        <span className="font-semibold text-slate-900">{t('Nafaa {{count}}', { count: total })}</span>
        {parts.length > 0 && <span aria-hidden>→</span>}
        {parts.map((p, i) => (
          <span key={p.channel.id} className={cn(p.off && 'text-slate-400 line-through')}>
            {channelName(p.channel)} <b className="tabular-nums text-slate-800">{p.qty}</b>{p.fixed ? <span className="text-[0.6875rem] text-brand-700"> {t('fixed')}</span> : null}{i < parts.length - 1 ? ' ·' : ''}
          </span>
        ))}
        {row.scaled && <Badge size="xs" variant="warning" title={t('Fixed hisse Stock se zyada the — sab barabar kam kiye')}>{t('kam kiya')}</Badge>}
      </p>
      {parts.length > 0 && total > 0 && (exclusive ? (
        <div className="mt-1.5 flex h-2 overflow-hidden rounded-full bg-slate-200" aria-hidden>
          {parts.map((p) => <span key={p.channel.id} className="h-full" style={{ width: `${(p.qty / total) * 100}%`, backgroundColor: kindOf(p.channel).color }} />)}
        </div>
      ) : (
        <div className="mt-1.5 space-y-1" aria-hidden>
          {parts.map((p) => (
            <div key={p.channel.id} className="h-1.5 overflow-hidden rounded-full bg-slate-200">
              <span className="block h-full rounded-full" style={{ width: `${Math.min(100, (p.qty / total) * 100)}%`, backgroundColor: kindOf(p.channel).color }} />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

/* ─── The Nafaa website ─── */

function StoreSection({ c, item, sized, canManage, focused }: { c: OnlineChannel; item: GridItem; sized: boolean; canManage: boolean; focused: boolean }) {
  const qc = useQueryClient();
  const rows = item.rows.map((r) => ({ row: r, cell: r.cells[c.id] })).filter((x) => isStoreCell(x.cell));
  const visible = rows.length ? (rows[0].cell as { visible: boolean }).visible : false;
  const dot = storeDot(c, visible);
  const toggle = useMutation({
    mutationFn: (v: boolean) => onlineProductsApi.websiteVisibility(c.id, { selection: { productIds: [item.productId] }, visible: v }),
    onSuccess: (_r, v) => { refreshOnlineProducts(qc); toast.success(v ? t('{{name}} par dikhega', { name: channelName(c) }) : t('{{name}} se chhup gaya', { name: channelName(c) })); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  if (!rows.length) return null;
  return (
    <section className={cn('rounded-2xl bg-white ring-1', focused ? 'ring-2 ring-brand-400' : 'ring-slate-200/80')} aria-label={channelName(c)}>
      <header className="flex items-center gap-2.5 border-b border-slate-100 px-3.5 py-2.5">
        <ChannelMark channel={c} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[0.875rem] font-semibold text-slate-900">{channelName(c)}</p>
          <p className="truncate text-[0.71875rem] text-slate-500">{priceText(c)} · {stockText(c)}</p>
        </div>
        <Badge size="xs" variant={visible ? (c.live ? 'success' : 'warning') : 'default'} dot>{dot.label}</Badge>
        {c.storeId && <Link to={`/online-store/site/products?store=${c.storeId}`} title={t('Website ke products')} aria-label={t('Website ke products')} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"><ExternalLink className="h-4 w-4" /></Link>}
      </header>
      <div className="space-y-3 px-3.5 py-3">
        <ul className={cn('divide-y divide-slate-100', sized && 'rounded-xl ring-1 ring-slate-100')}>
          {rows.map(({ row, cell }) => {
            if (!isStoreCell(cell)) return null;
            return (
              <li key={row.variantId ?? 'base'} className={cn('flex flex-wrap items-center gap-x-4 gap-y-2', sized ? 'px-2.5 py-2' : 'py-1')}>
                {sized && <span className="w-20 shrink-0 truncate text-[0.75rem] font-semibold text-slate-800">{row.label}</span>}
                <span className="flex min-w-[5.5rem] flex-col">
                  <span className="text-[0.6875rem] text-slate-500">{t('Price')}</span>
                  <span className="text-[0.8125rem] font-semibold tabular-nums text-slate-900">
                    {rs(cell.price)}{cell.compareAtPrice ? <s className="ms-1.5 font-normal text-slate-400">{rs(cell.compareAtPrice)}</s> : null}
                  </span>
                </span>
                <span className="flex min-w-[5.5rem] flex-col">
                  <span className="text-[0.6875rem] text-slate-500">{t('Stock')}</span>
                  <span className={cn('text-[0.8125rem] font-semibold tabular-nums', cell.stock <= 0 && !cell.backorderOn ? 'text-rose-600' : 'text-slate-900')}>{cell.stock}</span>
                </span>
              </li>
            );
          })}
        </ul>
        <div className="flex flex-wrap items-center gap-2">
          <p className="me-auto text-[0.75rem] text-slate-500">{t('Price aur Stock Nafaa se aate hain — product me badlein.')}</p>
          <Switch size="sm" checked={visible} disabled={!canManage || toggle.isPending} onChange={(e) => toggle.mutate(e.target.checked)}
            aria-label={t('Website par dikhayein')} label={<span className="text-[0.75rem] text-slate-600">{t('Website par dikhayein')}</span>} className="gap-2" />
        </div>
      </div>
    </section>
  );
}

/* ─── One channel ─── */

function ChannelSection({ c, item, sized, canManage, focused, onLink, onDone }: {
  c: OnlineChannel; item: GridItem; sized: boolean; canManage: boolean; focused: boolean;
  onLink: (c: OnlineChannel, item: GridItem, row: GridRow) => void; onDone: (msg: string) => void;
}) {
  const qc = useQueryClient();
  const linkedRows = item.rows.filter((r) => r.cells[c.id]?.linked);
  const sizeLess = item.sizeLess[c.id];
  const linked = linkedRows.length > 0;
  const firstCell = linkedRows[0]?.cells[c.id] as LinkedCell | undefined;
  const url = channelProductUrl(c, firstCell?.externalProductId);

  const push = useMutation({
    mutationFn: () => onlineProductsApi.bulk({ selection: { productIds: [item.productId] }, action: 'push', channelId: c.id }),
    onSuccess: (r) => onDone(r.existing ? t('Ye kaam pehle se chal raha hai') : t('{{channel}} par bhej rahe hain', { channel: channelName(c) })),
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  const publish = useMutation({
    mutationFn: () => onlineProductsApi.bulk({ selection: { productIds: [item.productId] }, action: 'publish', channelId: c.id, value: true }),
    onSuccess: () => onDone(t('{{channel}} par ban raha hai — progress Activity me', { channel: channelName(c) })),
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  const content = useMutation({
    mutationFn: (patch: Partial<PushContent>) => onlineProductsApi.settings(c.id, { pushContent: patch }),
    onSuccess: () => { refreshOnlineProducts(qc); toast.success(t('Save ho gaya')); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  const fixSize = useMutation({
    mutationFn: () => onlineProductsApi.unlink(sizeLess),
    onSuccess: () => onDone(t('Bina size wala link hata diya — ab har size jorein')),
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  const failedCell = linkedRows.map((r) => r.cells[c.id] as LinkedCell).find((x) => x.status === 'FAILED');
  const heldCount = linkedRows.filter((r) => (r.cells[c.id] as LinkedCell).hold).length;
  const priceHeld = linkedRows.some((r) => (r.cells[c.id] as LinkedCell).priceHold);
  const last = linkedRows.map((r) => (r.cells[c.id] as LinkedCell).lastPush).filter(Boolean).sort((a, b) => String(b!.at).localeCompare(String(a!.at)))[0] ?? null;

  return (
    <section className={cn('rounded-2xl bg-white ring-1', focused ? 'ring-2 ring-brand-400' : 'ring-slate-200/80')} aria-label={channelName(c)}>
      <header className="flex items-center gap-2.5 border-b border-slate-100 px-3.5 py-2.5">
        <ChannelMark channel={c} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[0.875rem] font-semibold text-slate-900">{channelName(c)}</p>
          <p className="truncate text-[0.71875rem] text-slate-500">{priceText(c)} · {stockText(c)}</p>
        </div>
        {linked && <Badge size="xs" variant={failedCell ? 'danger' : heldCount || priceHeld ? 'warning' : 'success'} dot>{failedCell ? t('Masla') : heldCount ? t('Stock milana baqi') : priceHeld ? t('Qeemat ka faisla baqi') : sized ? t('{{linked}}/{{count}} jure', { linked: linkedRows.length, count: item.rows.length }) : t('Jura hua')}</Badge>}
        {!linked && !sizeLess && <Badge size="xs" variant="default">{t('Jura nahi')}</Badge>}
        {url && <a href={url} target="_blank" rel="noreferrer" title={t('Channel par kholein')} aria-label={t('Channel par kholein')} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"><ExternalLink className="h-4 w-4" /></a>}
      </header>

      <div className="space-y-3 px-3.5 py-3">
        {sizeLess && (
          <div className="flex flex-wrap items-center gap-2 rounded-xl bg-rose-50 px-3 py-2 text-[0.8125rem] text-rose-900 ring-1 ring-rose-200">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span className="min-w-0 flex-1">{causeInfo('size').text}</span>
            {canManage && <Button size="xs" variant="critical" loading={fixSize.isPending} onClick={async () => { if (await confirmDialog({ title: t('Bina size wala link hatayein?'), text: causeInfo('size').text, danger: true })) fixSize.mutate(); }}>{t('Theek karein')}</Button>}
          </div>
        )}

        {failedCell && (
          <div className="rounded-xl bg-rose-50 px-3 py-2 text-[0.8125rem] text-rose-900 ring-1 ring-rose-200">
            <p className="font-semibold">{causeInfo(syncCause(failedCell.error)).title}</p>
            <p className="mt-0.5 opacity-90">{causeInfo(syncCause(failedCell.error)).text}</p>
            {failedCell.error && !isNafaaText(failedCell.error) && <p className="mt-1 break-words text-[0.75rem] opacity-80">{t('Channel ka jawab: {{detail}}', { detail: failedCell.error })}</p>}
          </div>
        )}

        {!c.canFetch && !linked && <p className="text-[0.8125rem] text-slate-500">{WEBSITE_LINKS_NOTE}</p>}

        {(linked || item.rows.length > 0) && (
          <ul className={cn('divide-y divide-slate-100', sized && 'rounded-xl ring-1 ring-slate-100')}>
            {item.rows.map((row) => {
              const cell = row.cells[c.id];
              if (!cell) return null;
              return (
                <li key={row.variantId ?? 'base'} className={cn('flex flex-wrap items-center gap-x-3 gap-y-2', sized ? 'px-2.5 py-2' : 'py-1')}>
                  {sized && <span className="w-20 shrink-0 truncate text-[0.75rem] font-semibold text-slate-800">{row.label}</span>}
                  {cell.linked && !isStoreCell(cell) ? <LinkedRow c={c} cell={cell} canManage={canManage} item={item} row={row} onLink={onLink} onDone={onDone} sized={sized} />
                    : (
                      <span className="flex flex-1 items-center justify-between gap-2 text-[0.8125rem] text-slate-500">
                        <span>{t('Jura nahi')}{cell.stock !== null ? ` · ${t('Stock {{qty}}', { qty: cell.stock })}` : ''}</span>
                        {canManage && c.canFetch && <Button size="xs" variant="secondary" leftIcon={<Link2 className="h-3.5 w-3.5" />} onClick={() => onLink(c, item, row)}>{t('Jorein')}</Button>}
                      </span>
                    )}
                </li>
              );
            })}
          </ul>
        )}

        {c.canPush && c.canContent && linked && (
          <div className="rounded-xl bg-slate-50 px-3 py-2.5 ring-1 ring-slate-200/80">
            <p className="text-[0.75rem] font-semibold text-slate-700">{t('"Bhejein" par ye bhi jaye')}</p>
            <p className="text-[0.6875rem] text-slate-500">{t('Ye setting is channel ke sab products par lagti hai.')}</p>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2">
              {CONTENT_KEYS.map(({ key, label }) => (
                <Switch key={key} size="sm" label={<span className="text-[0.75rem]">{label()}</span>} checked={!!c.pushContent?.[key]} disabled={!canManage || content.isPending}
                  onChange={(e) => content.mutate({ [key]: e.target.checked })} className="justify-start gap-2" />
              ))}
            </div>
          </div>
        )}

        {(last || (canManage && c.canPush && linked) || (canManage && !linked && !sizeLess && c.canPublish)) && <div className="flex flex-wrap items-center gap-2 pt-0.5">
          {last && <p className={cn('me-auto text-[0.75rem]', last.ok ? 'text-slate-500' : 'font-medium text-rose-700')}>{lastPushText(last)}</p>}
          {canManage && c.canPush && linked && (
            <Button size="xs" variant={failedCell ? 'primary' : 'secondary'} loading={push.isPending} disabled={!c.live} onClick={() => push.mutate()} leftIcon={<RefreshCw className="h-3.5 w-3.5" />}>
              {failedCell ? t('Dobara bhejein') : t('Abhi bhejein')}
            </Button>
          )}
          {canManage && !linked && !sizeLess && c.canPublish && (
            <Button size="xs" loading={publish.isPending} disabled={!c.live} onClick={() => publish.mutate()} leftIcon={<Upload className="h-3.5 w-3.5" />}>{t('{{channel}} par banayein', { channel: channelName(c) })}</Button>
          )}
          {!c.live && c.canPush && <span className="text-[0.75rem] text-slate-500">{c.paused ? t('Channel ruka hua hai') : t('Channel jura nahi')}</span>}
        </div>}
      </div>
    </section>
  );
}

function LinkedRow({ c, cell, canManage, item, row, onLink, onDone, sized }: {
  c: OnlineChannel; cell: LinkedCell; canManage: boolean; item: GridItem; row: GridRow; sized: boolean;
  onLink: (c: OnlineChannel, item: GridItem, row: GridRow) => void; onDone: (msg: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLButtonElement>(null);
  const qc = useQueryClient();
  const listed = useMutation({
    mutationFn: (v: boolean) => onlineProductsApi.updateLink(cell.mappingId, { listed: v }),
    onSuccess: (_r, v) => { refreshOnlineProducts(qc); toast.success(v ? t('Listed — channel par dikhega') : t('Band — channel par chhup jayega')); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  const unlink = useMutation({
    mutationFn: () => onlineProductsApi.unlink(cell.mappingId),
    onSuccess: () => onDone(t('Link hata diya')),
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  const counting = useMutation({
    mutationFn: (on: boolean) => onlineProductsApi.setCounting([cell.mappingId], on),
    onSuccess: (_r, on) => onDone(on ? t('Ginti shuru — Nafaa ka Stock channel par ja raha hai') : t('Channel par ginti band kar di')),
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  const startCounting = async () => {
    if (await confirmDialog({
      title: t('Nafaa se ginti shuru karein?'),
      text: t('{{channel}} is item ka Stock ginna shuru karega aur Nafaa ka Stock (aaj {{n}}) wahan chala jayega. Nafaa me Stock 0 ho to channel par ye item "Out of stock" dikh sakta hai.', { channel: channelName(c), n: cell.nafaaStock }),
      yes: t('Ginti shuru karein'),
    })) counting.mutate(true);
  };
  const stopCounting = async () => {
    if (await confirmDialog({ title: t('Channel par ginti band karein?'), text: t('Channel is item ka Stock ginna band kar dega aur Nafaa Stock nahi bhejega. Item bina ginti ke bikta rahega.') })) counting.mutate(false);
  };
  const untracked = notCounted(cell);
  const push = c.canPush;
  const off = cell.listed === false;
  const dot = dotOf(c, cell);
  const field = (label: string, body: ReactNode) => (
    <span className="flex min-w-[5.5rem] flex-col">
      <span className="text-[0.6875rem] text-slate-500">{label}</span>
      <span className="text-[0.8125rem] font-semibold tabular-nums text-slate-900">{body}</span>
    </span>
  );
  return (
    <span className="flex min-w-0 flex-1 flex-wrap items-center gap-x-4 gap-y-2">
      <span className="flex min-w-0 basis-full items-center gap-2 sm:basis-auto sm:flex-1">
        <Dot {...dot} />
        <span className="min-w-0 truncate text-[0.75rem] text-slate-600" title={cell.externalTitle ?? undefined}>
          {cell.externalTitle || t('Channel ka item')}{cell.externalSku ? <span className="font-mono text-slate-400"> · {cell.externalSku}</span> : null}
        </span>
      </span>
      {field(push && c.pushPrice ? (cell.override ? t('Apni Price') : t('Rule Price')) : t('Price'), (
        <InlineEdit mappingId={cell.mappingId} field="priceOverride" value={cell.override} disabled={!(canManage && push && c.pushPrice)}
          label={t('{{channel}} par Price', { channel: channelName(c) })} ruleHint={t('Rule: {{price}}', { price: rs(cell.price) })}
          className={cn(cell.priceDiffers && 'text-amber-700')}>{rs(cell.price)}</InlineEdit>
      ))}
      {push && c.type !== 'DARAZ' && field(t('Sale se pehle'), (
        <InlineEdit mappingId={cell.mappingId} field="compareAtPrice" value={cell.compareAtPrice} disabled={!canManage}
          label={t('Sale se pehle ki Price')} ruleHint={t('Koi nahi')} className="text-slate-500">
          {cell.compareAtPrice ? <s>{rs(cell.compareAtPrice)}</s> : <span className="font-normal text-slate-400">{t('Koi nahi')}</span>}
        </InlineEdit>
      ))}
      {c.tracksStock && untracked && field(t('Stock'), <span className="text-sky-800">{t('Ginti nahi')}</span>)}
      {c.tracksStock && !untracked && field(cell.allocQty !== null && cell.allocQty !== undefined ? t('Stock (fixed)') : t('Stock'), (
        <InlineEdit mappingId={cell.mappingId} field="allocQty" value={cell.allocQty} disabled={!(canManage && push)}
          label={t('{{channel}} ko kitna Stock', { channel: channelName(c) })} ruleHint={t('Rule: {{qty}}', { qty: cell.stock ?? 0 })}
          className={cn((cell.stock ?? 0) <= 0 && 'text-rose-600')}>{cell.stock ?? '—'}</InlineEdit>
      ))}
      {cell.priceDiffers && cell.channelPrice !== null && <span className="text-[0.6875rem] font-medium text-amber-700">{t('Channel par abhi {{price}}', { price: rs(cell.channelPrice) })}</span>}
      {c.tracksStock && untracked && (
        <span className="order-last flex basis-full flex-wrap items-center gap-2 rounded-xl bg-sky-50 px-3 py-2 text-[0.8125rem] text-sky-900 ring-1 ring-sky-200">
          <span className="min-w-0 flex-1">
            <UntrackedTag long />
            <span className="mt-0.5 block text-[0.75rem] opacity-90">{t('Ye item channel par bina ginti ke bikta hai — ye Out of stock nahi. Nafaa yahan Stock nahi bhejta.')}</span>
          </span>
          {canManage && push && (
            <Button size="xs" variant="secondary" loading={counting.isPending} onClick={() => void startCounting()}>{t('Nafaa se ginti shuru karein')}</Button>
          )}
        </span>
      )}
      {c.tracksStock && cell.countOptIn && canManage && push && (
        <button type="button" disabled={counting.isPending} onClick={() => void stopCounting()}
          className="order-last basis-full text-start text-[0.71875rem] font-semibold text-slate-500 underline-offset-2 hover:text-slate-800 hover:underline">
          {t('Nafaa ne ginti shuru ki thi — band karein')}
        </button>
      )}
      {cell.hold && (
        <span className="order-last flex basis-full flex-wrap items-center gap-2 rounded-xl bg-amber-50 px-3 py-2 text-[0.8125rem] text-amber-900 ring-1 ring-amber-200">
          <span className="min-w-0 flex-1">
            <span className="block font-semibold">{t('Stock milana baqi')} · <span className="tabular-nums">{holdNumbers(cell.hold)}</span></span>
            <span className="block text-[0.75rem] opacity-90">{t('Nafaa aur channel ka Stock alag hai, is liye Nafaa kuch nahi bhej raha. Ek chunein.')} {holdReasonText(cell.hold.reason)} {timeAgo(cell.hold.since)}</span>
          </span>
          {canManage && (
            <span className="flex flex-wrap items-center gap-1.5">
              <HoldActions channelId={c.id} mappingIds={[cell.mappingId]} takeIds={cell.hold.channelStock === null ? [] : [cell.mappingId]} />
            </span>
          )}
        </span>
      )}
      {cell.priceHold && (
        <span className="order-last flex basis-full flex-wrap items-center gap-2 rounded-xl bg-amber-50 px-3 py-2 text-[0.8125rem] text-amber-900 ring-1 ring-amber-200">
          <span className="min-w-0 flex-1">
            <span className="block font-semibold">{isJumpHold(cell.priceHold) ? t('Qeemat bahut badal rahi hai — check karein') : t('Website par qeemat badli — kaunsi rakhein?')} · <span className="tabular-nums">{priceHoldNumbers(cell.priceHold)}</span></span>
            <span className="block text-[0.75rem] opacity-90">{isJumpHold(cell.priceHold)
              ? t('Nafaa ki qeemat website wali se bahut alag hai. Pehle dekhein ke ye link sahi product se jura hai.')
              : <>{t('Jab tak aap na chunein, Nafaa is ki qeemat nahi bhejta.')} {timeAgo(cell.priceHold.channelPriceAt ?? cell.priceHold.since)}</>}</span>
          </span>
          {canManage && (
            <span className="flex flex-wrap items-center gap-1.5">
              <PriceHoldActions channelId={c.id} mappingIds={[cell.mappingId]} jump={isJumpHold(cell.priceHold)} />
            </span>
          )}
        </span>
      )}
      <span className="ms-auto flex items-center gap-1.5">
        {push && <Switch size="sm" checked={!off} disabled={!canManage || listed.isPending} onChange={(e) => listed.mutate(e.target.checked)} aria-label={t('Listed')} label={<span className="text-[0.75rem] text-slate-600">{t('Listed')}</span>} className="gap-2" />}
        {canManage && (
          <>
            <button ref={ref} type="button" onClick={() => setOpen((v) => !v)} aria-haspopup="menu" aria-expanded={open} aria-label={t('Aur kaam')}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"><MoreHorizontal className="h-4 w-4" /></button>
            <Menu open={open} onClose={() => setOpen(false)} anchorRef={ref} width="w-60" label={t('Aur kaam')}>
              {c.canFetch && <MenuItem icon={<Link2 />} onClick={() => { setOpen(false); onLink(c, item, row); }}>{t('Doosre item se jorein')}</MenuItem>}
              {cell.lastSyncedAt && <p className="px-2.5 py-1 text-[0.6875rem] text-slate-500">{t('Aakhri dafa {{when}}', { when: timeAgo(cell.lastSyncedAt) })}</p>}
              <MenuSeparator />
              <MenuItem icon={<Link2Off />} tone="danger" onClick={async () => {
                setOpen(false);
                if (await confirmDialog({ title: t('Link hatayein?'), text: push ? t('Is product ka Stock aur Price is channel par jana band ho jayega. Channel par product waise hi rahega.') : t('Is channel ke orders me ye product khud nahi milega — agle order par dobara jorna hoga.'), danger: true })) unlink.mutate();
              }}>{sized ? t('Is size ka link hatayein') : t('Link hatayein')}</MenuItem>
            </Menu>
          </>
        )}
      </span>
    </span>
  );
}

