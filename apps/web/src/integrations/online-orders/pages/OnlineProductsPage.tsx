/**
 * Online products: every Nafaa product and size against every connected
 * channel (Daraz, each WooCommerce site, Shopify). Each cell shows whether it
 * is linked, the Price Nafaa sets there, the Stock sent and the last sync.
 * Linking (with SKU and name suggestions), channel Price rules, per-product
 * Price, stock buffer and "Sync now" all start here.
 *
 * Keys: / search · R refresh.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  AlertTriangle, BadgeDollarSign, Boxes, CheckCircle2, Clock, Link2, Link2Off, Package, PackageCheck, PackageX, Plus, RefreshCw,
  Settings2, Store, type LucideIcon,
} from 'lucide-react';
import {
  Button, FilterBar, FilterChip, FilterMenu, PageHero, PageShell, SearchField, Skeleton, heroButton, heroIconButton, confirmDialog,
} from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { PERMISSIONS } from '@core/lib/permissions';
import { usePermission } from '@core/hooks/usePermission';
import { isDialogOpen, isTyping } from '@core/lib/shortcuts';
import { apiErrorMessage } from '../api/online-orders.api';
import {
  ONLINE_PRODUCTS_KEY, onlineProductsApi, type GridCell, type GridFilter, type GridItem, type GridRow, type LinkedCell, type OnlineChannel,
} from '../api/online-products.api';
import { timeAgo } from '../lib/labels';
import { ChannelMark, channelName, kindOf, refreshOnlineProducts, rs, ruleText } from '../components/online-products/meta';
import { LinkModal, type LinkFocus } from '../components/online-products/LinkModal';
import { ChannelSettingsModal } from '../components/online-products/ChannelSettingsModal';
import { CellModal } from '../components/online-products/CellModal';

const LIMIT = 25;

const TABS: Array<{ id: GridFilter; label: string; icon: LucideIcon; tone?: string }> = [
  { id: 'all', label: 'Sab', icon: Boxes },
  { id: 'unlinked', label: 'Jorna baqi', icon: Link2Off, tone: 'text-slate-500' },
  { id: 'errors', label: 'Masle', icon: AlertTriangle, tone: 'text-rose-600' },
  { id: 'price', label: 'Price farq', icon: BadgeDollarSign, tone: 'text-amber-600' },
  { id: 'out', label: 'Stock khatam', icon: PackageX, tone: 'text-rose-600' },
  { id: 'linked', label: 'Jure hue', icon: Link2, tone: 'text-success-600' },
];

type Open =
  | { kind: 'link'; channel: OnlineChannel; focus?: LinkFocus }
  | { kind: 'settings'; channel: OnlineChannel }
  | { kind: 'cell'; channel: OnlineChannel; cell: LinkedCell; title: string; productId: string; focus: LinkFocus };

export default function OnlineProductsPage() {
  const qc = useQueryClient();
  const canManage = usePermission(PERMISSIONS.ONLINE_PRODUCTS_MANAGE);
  const searchRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<GridFilter>('all');
  // `?channel=<id>` (from a channel's own page) opens the grid on that channel.
  const [params, setParams] = useSearchParams();
  const [channelId, setChannelIdState] = useState(() => params.get('channel') ?? '');
  const setChannelId = (id: string) => {
    setChannelIdState(id);
    setParams((p) => { if (id) p.set('channel', id); else p.delete('channel'); return p; }, { replace: true });
  };
  useEffect(() => { const id = params.get('channel') ?? ''; if (id !== channelId) setChannelIdState(id); }, [params]); // eslint-disable-line react-hooks/exhaustive-deps
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState<Open | null>(null);

  useEffect(() => { const t = setTimeout(() => setQuery(search.trim()), 250); return () => clearTimeout(t); }, [search]);
  useEffect(() => { setPage(1); }, [query, filter, channelId]);

  const channelsQ = useQuery({ queryKey: [ONLINE_PRODUCTS_KEY, 'channels'], queryFn: onlineProductsApi.channels, staleTime: 30_000 });
  const gridQ = useQuery({
    queryKey: [ONLINE_PRODUCTS_KEY, 'grid', { page, query, filter, channelId }],
    queryFn: () => onlineProductsApi.grid({ page, limit: LIMIT, search: query || undefined, filter, channelId: channelId || undefined }),
    placeholderData: (p) => p,
  });
  const summaryQ = useQuery({ queryKey: [ONLINE_PRODUCTS_KEY, 'summary', channelId], queryFn: () => onlineProductsApi.summary(channelId || undefined), staleTime: 30_000 });

  const channels = channelsQ.data?.channels ?? [];
  const sellable = channelsQ.data?.sellable ?? 0;
  const g = gridQ.data;
  const cols = g?.channels ?? [];
  const s = summaryQ.data;
  const refresh = () => refreshOnlineProducts(qc);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping() || isDialogOpen()) return;
      if (e.key === '/') { e.preventDefault(); searchRef.current?.focus(); }
      else if (e.key.toLowerCase() === 'r') refresh();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }); // eslint-disable-line react-hooks/exhaustive-deps

  const syncChannel = useMutation({
    mutationFn: (c: OnlineChannel) => onlineProductsApi.syncChannel(c.id),
    onSuccess: (r, c) => { refresh(); if (r.error) toast.error(`${channelName(c)}: ${r.error}`); else toast.success(`${channelName(c)} par Stock${r.prices ? ` aur ${r.prices} Price` : ''} bhej diye`); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  const syncProduct = useMutation({
    mutationFn: (productId: string) => onlineProductsApi.syncProduct(productId),
    onSuccess: (r) => {
      refresh();
      const bad = r.results.filter((x) => !x.ok);
      if (!r.results.length) toast.info('Ye product kisi channel se jura nahi');
      else if (bad.length) toast.error(`${bad[0].name}: ${bad[0].error}`);
      else toast.success(`${r.results.map((x) => x.name).join(', ')} par bhej diya`);
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  const unlinkSizeLess = useMutation({
    mutationFn: (mappingId: string) => onlineProductsApi.unlink(mappingId),
    onSuccess: () => { refresh(); toast.success('Bina size wala link hata diya — ab har size jorein'); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  const openCell = (c: OnlineChannel, cell: GridCell, item: GridItem, row: GridRow) => {
    const title = row.label ? `${item.name} — ${row.label}` : item.name;
    const focus: LinkFocus = { productId: item.productId, variantId: row.variantId, title };
    if (cell.linked) setOpen({ kind: 'cell', channel: c, cell, title, productId: item.productId, focus });
    else if (canManage) setOpen({ kind: 'link', channel: c, focus });
  };
  const askUnlinkSizeLess = async (mappingId: string, c: OnlineChannel) => {
    if (await confirmDialog({ title: 'Bina size wala link hatayein?', text: `Is product ke sizes hain, magar ${channelName(c)} par poora product ek saath jura hai — is se bill par "Available: 0" aata hai. Hata kar har size alag jorein.`, danger: true })) unlinkSizeLess.mutate(mappingId);
  };

  const linkedRows = channels.reduce((n, c) => n + (c.linked ?? 0), 0);
  const failedRows = channels.reduce((n, c) => n + (c.failed ?? 0), 0);
  const channelLabel = channels.find((c) => c.id === channelId);
  const filtered = !!query || !!channelId || filter !== 'all';

  return (
    <PageShell>
      <PageHero
        title="Online products"
        chip={<><PackageCheck />{channelsQ.data ? `${channels.length} channels` : '…'}</>}
        meta="Har product aur size — link, Price aur Stock, sab channels ek jagah"
        busy={(gridQ.isFetching && !gridQ.isLoading) || channelsQ.isFetching}
        loading={channelsQ.isLoading}
        actions={<>
          <Link to="/online-store/channels" className={heroButton}><Store className="h-4 w-4" /><span className="max-sm:hidden">Channels</span></Link>
          <button type="button" onClick={refresh} title="Taaza karein (R)" className={heroIconButton}><RefreshCw className={cn('h-4 w-4', gridQ.isFetching && 'animate-spin')} /></button>
        </>}
        stats={[
          { label: 'Jure hue', value: channelsQ.data ? linkedRows.toLocaleString('en-PK') : '', hint: channels.length ? `${sellable.toLocaleString('en-PK')} products/sizes × ${channels.length} channels` : undefined },
          { label: 'Jorna baqi', value: s ? s.unlinked.toLocaleString('en-PK') : '', hint: 'products' },
          { label: 'Masle', value: channelsQ.data ? failedRows.toLocaleString('en-PK') : '', hint: s?.errors ? `${s.errors} products` : 'sab theek' },
          { label: 'Price farq', value: s ? s.price.toLocaleString('en-PK') : '', hint: 'products' },
        ]}
      />

      {channelsQ.isLoading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 2xl:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-40 rounded-3xl" />)}</div>
      ) : channels.length === 0 ? (
        <div className="flex flex-col items-center rounded-3xl bg-white px-6 py-16 text-center ring-1 ring-slate-200/80">
          <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-brand-fg shadow-lg"><PackageCheck className="h-7 w-7" /></span>
          <h3 className="mt-4 text-lg font-semibold text-slate-900">Abhi koi online channel nahi jura</h3>
          <p className="mt-1 max-w-md text-[0.875rem] text-slate-500">Daraz, WooCommerce ya Shopify jorein — phir yahan products jorein, har channel ki Price rakhein aur Stock khud barabar rahega.</p>
          <Link to="/online-store/connect" className="mt-4 inline-flex h-10 items-center gap-2 rounded-lg bg-brand-600 px-4 text-sm font-semibold text-brand-fg hover:bg-brand-700"><Plus className="h-4 w-4" /> Channel jorein</Link>
        </div>
      ) : (<>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 2xl:grid-cols-3">
          {channels.map((c) => (
            <ChannelCard key={c.id} c={c} sellable={sellable} canManage={canManage}
              syncing={syncChannel.isPending && syncChannel.variables?.id === c.id}
              onLink={() => setOpen({ kind: 'link', channel: c })}
              onSettings={() => setOpen({ kind: 'settings', channel: c })}
              onSync={() => syncChannel.mutate(c)} />
          ))}
        </div>

        <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-0.5 [scrollbar-width:none]">
          {TABS.map((t) => {
            const on = filter === t.id;
            const n = s?.[t.id];
            return (
              <button key={t.id} type="button" onClick={() => setFilter(t.id)}
                className={cn('inline-flex h-10 shrink-0 items-center gap-2 rounded-2xl px-3.5 text-[0.8125rem] font-semibold transition',
                  on ? 'bg-slate-900 text-white shadow' : 'bg-white text-slate-700 ring-1 ring-slate-200/80 hover:bg-slate-50')}>
                <t.icon className={cn('h-4 w-4', !on && t.tone)} />{t.label}
                <span className={cn('min-w-[1.5rem] rounded-full px-1.5 text-center text-[0.6875rem] tabular-nums', on ? 'bg-white/20' : 'bg-slate-100 text-slate-600')}>{n ?? '·'}</span>
              </button>
            );
          })}
        </div>

        <FilterBar
          search={<SearchField ref={searchRef} value={search} onChange={setSearch} placeholder="Naam, SKU ya barcode…" label="Products search" />}
          chips={filtered ? <>
            {channelId && <FilterChip onRemove={() => setChannelId('')}>{channelLabel ? channelName(channelLabel) : 'Channel'}</FilterChip>}
            {filter !== 'all' && <FilterChip onRemove={() => setFilter('all')}>{TABS.find((t) => t.id === filter)?.label}</FilterChip>}
            {query && <FilterChip onRemove={() => setSearch('')}>"{query}"</FilterChip>}
          </> : undefined}
          onClear={() => { setSearch(''); setChannelId(''); setFilter('all'); }}>
          {channels.length > 1 && (
            <FilterMenu icon={Store} label="Channel" value={channelId} active={!!channelId} onChange={setChannelId} align="right" width="w-72"
              options={[{ value: '', label: 'Sab channels' }, ...channels.map((c) => ({ value: c.id, label: channelName(c), hint: kindOf(c.type).label, color: kindOf(c.type).color }))]} />
          )}
        </FilterBar>

        {gridQ.isLoading ? (
          <div className="space-y-2 rounded-3xl bg-white p-4 ring-1 ring-slate-200/80">{[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>
        ) : gridQ.isError && !g ? (
          <div className="rounded-3xl bg-white px-6 py-14 text-center ring-1 ring-slate-200/80">
            <p className="font-semibold text-slate-900">Products nahi aaye</p>
            <p className="mt-1 text-sm text-slate-500">{apiErrorMessage(gridQ.error)}</p>
            <Button className="mt-3" variant="secondary" onClick={() => gridQ.refetch()}>Dobara koshish</Button>
          </div>
        ) : !g?.items.length ? (
          <div className="rounded-3xl bg-white px-6 py-14 text-center ring-1 ring-slate-200/80">
            <Package className="mx-auto h-10 w-10 text-slate-300" />
            <p className="mt-3 font-semibold text-slate-900">{filtered ? 'Is filter me koi product nahi' : 'Nafaa me abhi koi product nahi'}</p>
            <p className="mt-1 text-sm text-slate-500">{filter === 'errors' ? 'Koi masla nahi — sab channels par Stock aur Price ja rahe hain.' : filter === 'price' ? 'Har channel par Price wohi hai jo Nafaa rakhta hai.' : 'Filter badal kar dekhein.'}</p>
            {filtered && <Button className="mt-4" variant="ghost" onClick={() => { setSearch(''); setChannelId(''); setFilter('all'); }}>Filter saaf karein</Button>}
          </div>
        ) : (<>
          {/* Desktop and tablet: one column per channel */}
          <div className="hidden overflow-x-auto rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80 md:block">
            <table className="w-full border-separate border-spacing-0" style={{ minWidth: `${18 + cols.length * 12}rem` }}>
              <thead>
                <tr className="text-left text-[0.6875rem] font-semibold uppercase tracking-wide text-slate-500">
                  {/* With one or two channels the product column would take all the spare width; cap it so the channel columns get it. */}
                  <th className="sticky left-0 z-10 border-b border-slate-100 bg-slate-50 py-2.5 pl-4 pr-3"
                    style={cols.length <= 2 ? { width: cols.length === 1 ? 'min(26rem, 42%)' : 'min(24rem, 34%)' } : undefined}>Product</th>
                  {cols.map((c) => (
                    <th key={c.id} className="min-w-[12rem] border-b border-l border-slate-100 bg-slate-50 px-3 py-2">
                      <span className="flex items-center gap-2 normal-case tracking-normal">
                        <ChannelMark type={c.type} size="sm" />
                        <span className="min-w-0">
                          <span className="block truncate text-[0.8125rem] font-semibold text-slate-800">{channelName(c)}</span>
                          <span className="block truncate text-[0.6875rem] font-medium text-slate-500">{c.pushPrice ? ruleText(c.priceRule) : 'Price haath se'}</span>
                        </span>
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {g.items.map((item) => (
                  <ProductRows key={item.productId} item={item} cols={cols} canManage={canManage}
                    syncing={syncProduct.isPending && syncProduct.variables === item.productId}
                    onSync={() => syncProduct.mutate(item.productId)}
                    onCell={(c, cell, row) => openCell(c, cell, item, row)}
                    onSizeLess={askUnlinkSizeLess} />
                ))}
              </tbody>
            </table>
          </div>

          {/* Phone: one card per product, channels listed under each size */}
          <ul className="space-y-3 md:hidden">
            {g.items.map((item) => (
              <ProductCard key={item.productId} item={item} cols={cols} canManage={canManage}
                syncing={syncProduct.isPending && syncProduct.variables === item.productId}
                onSync={() => syncProduct.mutate(item.productId)}
                onCell={(c, cell, row) => openCell(c, cell, item, row)}
                onSizeLess={askUnlinkSizeLess} />
            ))}
          </ul>

          {g.pages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((x) => x - 1)}>Pichla</Button>
              <span className="text-sm text-slate-600">Safha {page} / {g.pages} · {g.total.toLocaleString('en-PK')} products</span>
              <Button variant="secondary" size="sm" disabled={page >= g.pages} onClick={() => setPage((x) => x + 1)}>Agla</Button>
            </div>
          )}
        </>)}
      </>)}

      {open?.kind === 'link' && <LinkModal channel={open.channel} focus={open.focus} canManage={canManage} onClose={() => setOpen(null)} />}
      {open?.kind === 'settings' && <ChannelSettingsModal channel={open.channel} onClose={() => setOpen(null)} />}
      {open?.kind === 'cell' && (
        <CellModal channel={open.channel} cell={open.cell} title={open.title} productId={open.productId} canManage={canManage}
          onRelink={() => setOpen({ kind: 'link', channel: open.channel, focus: open.focus })} onClose={() => setOpen(null)} />
      )}
    </PageShell>
  );
}

/* ═════════════════════ Channel card ═════════════════════ */

function ChannelCard({ c, sellable, canManage, syncing, onLink, onSettings, onSync }: {
  c: OnlineChannel; sellable: number; canManage: boolean; syncing: boolean; onLink: () => void; onSettings: () => void; onSync: () => void;
}) {
  const pct = sellable ? Math.min(100, Math.round(((c.linked ?? 0) / sellable) * 100)) : 0;
  const k = kindOf(c.type);
  return (
    <div className="flex flex-col rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80">
      <div className="flex items-start gap-3">
        <ChannelMark type={c.type} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-slate-900">{channelName(c)}</p>
          <p className="truncate text-[0.75rem] text-slate-500">{k.label}{c.shopName ? ` · Stock ${c.shopName} se` : ''}</p>
        </div>
        <span className={cn('inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[0.6875rem] font-semibold',
          c.live ? 'bg-success-50 text-success-700' : c.paused ? 'bg-slate-100 text-slate-600' : 'bg-rose-50 text-rose-700')}>
          <span className={cn('h-1.5 w-1.5 rounded-full', c.live ? 'bg-success-500' : c.paused ? 'bg-slate-400' : 'bg-rose-500')} />
          {c.live ? 'Chal raha' : c.paused ? 'Ruka hua' : 'Jura nahi'}
        </span>
      </div>

      <div className="mt-3">
        <div className="flex items-baseline justify-between text-[0.75rem]">
          <span className="font-semibold text-slate-700">{(c.linked ?? 0).toLocaleString('en-PK')} / {sellable.toLocaleString('en-PK')} jure</span>
          {(c.failed ?? 0) > 0 ? <span className="font-semibold text-rose-600">{c.failed} masle</span> : <span className="text-slate-500">{c.lastSyncAt ? `Sync ${timeAgo(c.lastSyncAt)}` : ''}</span>}
        </div>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: k.color }} />
        </div>
      </div>

      <dl className="mb-3 mt-3 space-y-1 text-[0.75rem]">
        <div className="flex gap-1.5"><dt className="w-12 shrink-0 text-slate-500">Price</dt><dd className={cn('min-w-0 truncate font-medium', c.pushPrice ? 'text-slate-800' : 'text-amber-700')}>{c.pushPrice ? ruleText(c.priceRule) : 'Channel par haath se badlein'}</dd></div>
        <div className="flex gap-1.5"><dt className="w-12 shrink-0 text-slate-500">Stock</dt><dd className="min-w-0 truncate font-medium text-slate-800">{c.stockBuffer ? `Nafaa se, ${c.stockBuffer} rakh kar` : 'Nafaa se, poora'}</dd></div>
      </dl>

      {canManage && (
        <div className="mt-auto flex items-center gap-2 border-t border-slate-100 pt-3">
          <Button size="sm" onClick={onLink} leftIcon={<Link2 className="h-4 w-4" />}>Jorein</Button>
          <Button size="sm" variant="secondary" onClick={onSettings} leftIcon={<Settings2 className="h-4 w-4" />} className="min-w-0">
            <span className="truncate">Price aur Stock</span>
          </Button>
          <Button size="sm" variant="ghost" loading={syncing} disabled={!c.live} onClick={onSync} leftIcon={<RefreshCw className="h-4 w-4" />} title="Stock aur Price abhi bhejein" className="ml-auto shrink-0">
            Sync
          </Button>
        </div>
      )}
    </div>
  );
}

/* ═════════════════════ Grid rows (desktop) ═════════════════════ */

function Thumb({ src, small }: { src: string | null; small?: boolean }) {
  return (
    <span className={cn('flex shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-100 ring-1 ring-slate-200/80', small ? 'h-8 w-8' : 'h-10 w-10')}>
      {src ? <img src={src} alt="" className="h-full w-full object-cover" loading="lazy" /> : <Package className="h-4 w-4 text-slate-400" />}
    </span>
  );
}

interface RowProps {
  item: GridItem; cols: OnlineChannel[]; canManage: boolean; syncing: boolean;
  onSync: () => void; onCell: (c: OnlineChannel, cell: GridCell, row: GridRow) => void; onSizeLess: (mappingId: string, c: OnlineChannel) => void;
}

const anyLinked = (item: GridItem) => item.rows.some((r) => Object.values(r.cells).some((c) => c.linked));

function ProductRows({ item, cols, canManage, syncing, onSync, onCell, onSizeLess }: RowProps) {
  const sized = item.hasVariants && item.rows.some((r) => r.variantId);
  const head = (
    <div className="flex items-center gap-3">
      <Thumb src={item.image} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[0.875rem] font-semibold text-slate-900" title={item.name}>{item.name}</p>
        <p className="truncate text-[0.75rem] text-slate-500">
          {sized ? `${item.rows.length} sizes` : <>{item.sku ? <span className="font-mono">{item.sku}</span> : 'SKU nahi'} · Nafaa {rs(item.rows[0]?.price ?? item.price)}</>}
        </p>
      </div>
      {canManage && anyLinked(item) && (
        <button type="button" onClick={onSync} disabled={syncing} title="Is product ka Stock aur Price abhi bhejein" aria-label="Abhi bhejein"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50">
          <RefreshCw className={cn('h-4 w-4', syncing && 'animate-spin')} />
        </button>
      )}
    </div>
  );
  const firstCell = 'sticky left-0 z-[1] border-b border-slate-100 bg-white py-2 pl-4 pr-3';
  if (!sized) {
    const row = item.rows[0];
    return (
      <tr className="align-middle">
        <td className={firstCell}>{head}</td>
        {cols.map((c) => <td key={c.id} className="border-b border-l border-slate-100 p-1.5"><Cell cell={row.cells[c.id]} canManage={canManage} onOpen={() => onCell(c, row.cells[c.id], row)} /></td>)}
      </tr>
    );
  }
  return (
    <>
      <tr className="align-top">
        <td className={cn(firstCell, 'border-b-0 pb-1')}>{head}</td>
        {cols.map((c) => {
          const bad = item.sizeLess[c.id];
          const linked = item.rows.filter((r) => r.cells[c.id]?.linked).length;
          return (
            <td key={c.id} className="border-l border-slate-100 px-3 pb-1 pt-2.5 align-middle">
              {bad ? (
                <button type="button" disabled={!canManage} onClick={() => onSizeLess(bad, c)}
                  className="inline-flex items-center gap-1 rounded-lg bg-rose-50 px-2 py-1 text-left text-[0.71875rem] font-semibold text-rose-700 ring-1 ring-rose-200 hover:bg-rose-100">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" /> Size ke baghair jura — theek karein
                </button>
              ) : (
                <span className={cn('text-[0.71875rem] font-semibold', linked === item.rows.length ? 'text-success-700' : 'text-slate-500')}>{linked}/{item.rows.length} sizes jure</span>
              )}
            </td>
          );
        })}
      </tr>
      {item.rows.map((row, i) => (
        <tr key={row.variantId ?? i} className="align-middle">
          <td className={cn(firstCell, i < item.rows.length - 1 && 'border-b-slate-50')}>
            <div className="flex items-center gap-2 pl-[3.25rem]">
              <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[0.75rem] font-semibold text-slate-800">{row.label}</span>
              <span className="min-w-0 truncate text-[0.75rem] text-slate-500">{row.sku ? <span className="font-mono">{row.sku}</span> : null}{row.sku ? ' · ' : ''}{rs(row.price)}</span>
            </div>
          </td>
          {cols.map((c) => <td key={c.id} className={cn('border-l border-slate-100 p-1.5', i === item.rows.length - 1 ? 'border-b' : 'border-b border-b-slate-50')}><Cell cell={row.cells[c.id]} canManage={canManage} onOpen={() => onCell(c, row.cells[c.id], row)} /></td>)}
        </tr>
      ))}
    </>
  );
}

function StatusIcon({ cell }: { cell: LinkedCell }) {
  if (cell.status === 'FAILED') return <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-rose-600" aria-label="Masla" />;
  if (cell.status === 'SUCCESS') return <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-success-600" aria-label="Barabar" />;
  return <Clock className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-label="Abhi nahi bheja" />;
}

function Cell({ cell, canManage, onOpen }: { cell?: GridCell; canManage: boolean; onOpen: () => void }) {
  if (!cell) return null;
  if (!cell.linked) {
    return (
      <button type="button" onClick={onOpen} disabled={!canManage}
        className="flex w-full items-center justify-between gap-2 rounded-xl border border-dashed border-slate-200 px-2.5 py-2 text-left text-[0.75rem] text-slate-400 transition enabled:hover:border-brand-300 enabled:hover:bg-brand-50 enabled:hover:text-brand-700">
        <span className="inline-flex items-center gap-1 font-semibold">{canManage ? <><Plus className="h-3.5 w-3.5" /> Jorein</> : 'Jura nahi'}</span>
        <span className="tabular-nums">{cell.stock !== null ? `Stock ${cell.stock}` : ''}</span>
      </button>
    );
  }
  return (
    <button type="button" onClick={onOpen}
      className={cn('block w-full rounded-xl px-2.5 py-1.5 text-left ring-1 transition hover:bg-slate-50',
        cell.status === 'FAILED' ? 'bg-rose-50/60 ring-rose-200' : cell.priceDiffers ? 'ring-amber-200' : 'ring-transparent hover:ring-slate-200')}>
      <span className="flex items-center justify-between gap-2">
        <span className="text-[0.8125rem] font-semibold tabular-nums text-slate-900">
          {rs(cell.price)}{cell.override ? <span className="ml-1 rounded bg-brand-50 px-1 text-[0.625rem] font-semibold text-brand-700">apni</span> : null}
        </span>
        <StatusIcon cell={cell} />
      </span>
      <span className="block text-[0.71875rem] text-slate-500">
        Stock <b className={cn('tabular-nums', (cell.stock ?? 0) <= 0 ? 'text-rose-600' : 'text-slate-700')}>{cell.stock ?? '—'}</b>
        {cell.lastSyncedAt && cell.status === 'SUCCESS' ? ` · ${timeAgo(cell.lastSyncedAt)}` : ''}
      </span>
      {cell.status === 'FAILED' && cell.error ? (
        <span className="mt-0.5 line-clamp-2 block text-[0.6875rem] font-medium text-rose-700">{cell.error}</span>
      ) : cell.priceDiffers && cell.channelPrice !== null ? (
        <span className="mt-0.5 block text-[0.6875rem] font-semibold text-amber-700">Channel par {rs(cell.channelPrice)}</span>
      ) : null}
    </button>
  );
}

/* ═════════════════════ Phone card ═════════════════════ */

function ProductCard({ item, cols, canManage, syncing, onSync, onCell, onSizeLess }: RowProps) {
  const sized = item.hasVariants && item.rows.some((r) => r.variantId);
  return (
    <li className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
      <div className="flex items-center gap-3 px-3 py-2.5">
        <Thumb src={item.image} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[0.875rem] font-semibold text-slate-900">{item.name}</p>
          <p className="truncate text-[0.75rem] text-slate-500">{sized ? `${item.rows.length} sizes` : <>{item.sku ? `${item.sku} · ` : ''}Nafaa {rs(item.rows[0]?.price ?? item.price)}</>}</p>
        </div>
        {canManage && anyLinked(item) && (
          <button type="button" onClick={onSync} disabled={syncing} aria-label="Abhi bhejein" className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100">
            <RefreshCw className={cn('h-4 w-4', syncing && 'animate-spin')} />
          </button>
        )}
      </div>
      {cols.filter((c) => item.sizeLess[c.id]).map((c) => (
        <button key={c.id} type="button" disabled={!canManage} onClick={() => onSizeLess(item.sizeLess[c.id], c)}
          className="mx-3 mb-2 flex w-[calc(100%-1.5rem)] items-center gap-1.5 rounded-xl bg-rose-50 px-2.5 py-1.5 text-left text-[0.75rem] font-semibold text-rose-700 ring-1 ring-rose-200">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" /> {channelName(c)}: size ke baghair jura — theek karein
        </button>
      ))}
      <div className="divide-y divide-slate-100 border-t border-slate-100">
        {item.rows.map((row, i) => (
          <div key={row.variantId ?? i} className="px-3 py-2">
            {sized && (
              <p className="mb-1.5 flex items-center gap-2 text-[0.75rem]">
                <span className="rounded-md bg-slate-100 px-1.5 py-0.5 font-semibold text-slate-800">{row.label}</span>
                <span className="truncate text-slate-500">{row.sku ? `${row.sku} · ` : ''}{rs(row.price)}</span>
              </p>
            )}
            <ul className="space-y-1">
              {cols.map((c) => {
                const cell = row.cells[c.id];
                if (!cell) return null;
                return (
                  <li key={c.id}>
                    <button type="button" onClick={() => onCell(c, cell, row)} disabled={!cell.linked && !canManage}
                      className="flex w-full items-center gap-2 rounded-xl px-1.5 py-1 text-left hover:bg-slate-50">
                      <ChannelMark type={c.type} size="sm" />
                      <span className="min-w-0 flex-1 truncate text-[0.75rem] font-medium text-slate-700">{channelName(c)}</span>
                      {cell.linked ? (
                        <>
                          <span className="text-[0.75rem] tabular-nums text-slate-500">Stock {cell.stock ?? '—'}</span>
                          <span className={cn('text-[0.8125rem] font-semibold tabular-nums', cell.priceDiffers ? 'text-amber-700' : 'text-slate-900')}>{rs(cell.price)}</span>
                          <StatusIcon cell={cell} />
                        </>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-lg border border-dashed border-slate-300 px-2 py-0.5 text-[0.71875rem] font-semibold text-slate-500">
                          {canManage ? <><Plus className="h-3 w-3" /> Jorein</> : 'Jura nahi'}
                        </span>
                      )}
                    </button>
                    {cell.linked && cell.status === 'FAILED' && cell.error && (
                      <p className="line-clamp-2 pb-1 pl-9 pr-1.5 text-[0.6875rem] font-medium text-rose-700">{cell.error}</p>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </li>
  );
}
