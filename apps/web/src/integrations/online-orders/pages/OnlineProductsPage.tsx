/**
 * Online products: every Nafaa product and size against every connected
 * channel (Daraz, each WooCommerce site, Shopify). Each cell shows whether it
 * is linked, the Price Nafaa sets there, the Stock sent and the last sync.
 * Nafaa is the master list: import or link a whole channel in one click
 * (background job with progress), split Stock per channel, switch a product
 * Listed/off per channel, own Price and Sale price, and bulk actions on the
 * picked products or on every product matching the filter.
 *
 * Keys: / search · R refresh · G guide.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  AlertTriangle, BadgeDollarSign, Boxes, CheckCircle2, ChevronDown, Clock, Download, EyeOff, GraduationCap, Link2, Link2Off, Package, PackageCheck, PackageX, Plus, RefreshCw,
  Settings2, Store, type LucideIcon,
} from 'lucide-react';
import {
  Button, FilterBar, FilterChip, FilterMenu, PageHero, PageShell, SearchField, Skeleton, Switch, heroButton, heroIconButton, confirmDialog,
} from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { PERMISSIONS } from '@core/lib/permissions';
import { usePermission } from '@core/hooks/usePermission';
import { isDialogOpen, isTyping } from '@core/lib/shortcuts';
import { apiErrorMessage } from '../api/online-orders.api';
import {
  ONLINE_PRODUCTS_KEY, onlineProductsApi, type GridCell, type GridFilter, type GridItem, type GridRow, type LinkedCell, type OnlineChannel, type Selection,
} from '../api/online-products.api';
import { timeAgo } from '../lib/labels';
import { ChannelMark, channelName, kindOf, lastPushText, priceText, refreshOnlineProducts, rs, stockText, WEBSITE_LINKS_NOTE } from '../components/online-products/meta';
import { JOBS_KEY, JobsPanel } from '../components/online-products/JobsPanel';
import { MasterBulkBar } from '../components/online-products/MasterBulkBar';
import { ProductsGuide } from '../components/online-products/ProductsGuide';
import { usePageGuide } from '@core/components/PageGuide';
import { LinkModal, type LinkFocus } from '../components/online-products/LinkModal';
import { ChannelSettingsModal } from '../components/online-products/ChannelSettingsModal';
import { CellModal } from '../components/online-products/CellModal';
import { IssuesPanel } from '../components/online-products/IssuesPanel';
import { t as tr } from '@core/i18n';

const PAGE_SIZES = [25, 50, 100];

const TABS: Array<{ id: GridFilter; label: string; icon: LucideIcon; tone?: string }> = [
  { id: 'all', label: tr('Sab'), icon: Boxes },
  { id: 'unlinked', label: tr('Jorna baqi'), icon: Link2Off, tone: 'text-slate-500' },
  { id: 'errors', label: tr('Masle'), icon: AlertTriangle, tone: 'text-rose-600' },
  { id: 'price', label: tr('Price farq'), icon: BadgeDollarSign, tone: 'text-amber-600' },
  { id: 'out', label: tr('Stock khatam'), icon: PackageX, tone: 'text-rose-600' },
  { id: 'linked', label: tr('Jure hue'), icon: Link2, tone: 'text-success-600' },
  { id: 'unlisted', label: tr('Band (unlisted)'), icon: EyeOff, tone: 'text-slate-500' },
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
  // `?channel=<id>&filter=<f>` (a channel's own page, an alert) opens the grid there.
  const [params, setParams] = useSearchParams();
  const [filter, setFilterState] = useState<GridFilter>(() => {
    const f = params.get('filter') as GridFilter | null;
    return f && TABS.some((t) => t.id === f) ? f : 'all';
  });
  const setFilter = (f: GridFilter) => {
    setFilterState(f);
    setParams((p) => { if (f !== 'all') p.set('filter', f); else p.delete('filter'); return p; }, { replace: true });
  };
  const [channelId, setChannelIdState] = useState(() => params.get('channel') ?? '');
  const setChannelId = (id: string) => {
    setChannelIdState(id);
    setParams((p) => { if (id) p.set('channel', id); else p.delete('channel'); return p; }, { replace: true });
  };
  useEffect(() => {
    const id = params.get('channel') ?? '';
    if (id !== channelId) setChannelIdState(id);
    const f = (params.get('filter') ?? 'all') as GridFilter;
    if (f !== filter && TABS.some((t) => t.id === f)) setFilterState(f);
  }, [params]); // eslint-disable-line react-hooks/exhaustive-deps
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [open, setOpen] = useState<Open | null>(null);
  const guide = usePageGuide();
  // Picked products on this page, or every product matching the filter.
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [allMatching, setAllMatching] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const clearPick = () => { setPicked(new Set()); setAllMatching(false); };

  useEffect(() => { const t = setTimeout(() => setQuery(search.trim()), 250); return () => clearTimeout(t); }, [search]);
  useEffect(() => { setPage(1); clearPick(); }, [query, filter, channelId, limit]);

  const channelsQ = useQuery({ queryKey: [ONLINE_PRODUCTS_KEY, 'channels'], queryFn: onlineProductsApi.channels, staleTime: 30_000 });
  const gridQ = useQuery({
    queryKey: [ONLINE_PRODUCTS_KEY, 'grid', { page, query, filter, channelId, limit }],
    queryFn: () => onlineProductsApi.grid({ page, limit, search: query || undefined, filter, channelId: channelId || undefined }),
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
    onSuccess: (r, c) => { refresh(); if (r.error) toast.error(`${channelName(c)}: ${r.error}`); else toast.success(tr('{{channelName}} par Stock{{value}} bhej diye', { channelName: channelName(c), value: r.prices ? tr(' aur {{prices}} Price', { prices: r.prices }) : '' })); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  const syncProduct = useMutation({
    mutationFn: (productId: string) => onlineProductsApi.syncProduct(productId),
    onSuccess: (r) => {
      refresh();
      const bad = r.results.filter((x) => !x.ok);
      if (!r.results.length) toast.info(tr('Ye product kisi channel se jura nahi'));
      else if (bad.length) toast.error(`${bad[0].name}: ${bad[0].error}`);
      else toast.success(tr('{{value}} par bhej diya', { value: r.results.map((x) => x.name).join(', ') }));
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  const startJob = useMutation({
    mutationFn: ({ c, kind }: { c: OnlineChannel; kind: 'import' | 'link' }) => (kind === 'import' ? onlineProductsApi.importAll(c.id) : onlineProductsApi.linkAll(c.id)),
    onSuccess: (r, { c, kind }) => {
      qc.invalidateQueries({ queryKey: JOBS_KEY });
      if (r.existing) toast.info(tr('Ye kaam pehle se chal raha hai'));
      else if (!r.job.total) toast.info(kind === 'import' ? tr('{{channelName}}: Nafaa me lane ko kuch nahi — sab jure ya milte hain', { channelName: channelName(c) }) : tr('{{channelName}}: koi pakka match baqi nahi', { channelName: channelName(c) }));
      else toast.success(kind === 'import' ? tr('{{count}} products Nafaa me aa rahe hain', { count: r.job.total }) : tr('{{count}} pakke match jur rahe hain', { count: r.job.total }));
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  const setListed = useMutation({
    mutationFn: ({ mappingId, listed }: { mappingId: string; listed: boolean }) => onlineProductsApi.updateLink(mappingId, { listed }),
    onSuccess: (_r, v) => { refresh(); toast.success(v.listed ? tr('Listed — channel par dikhega') : tr('Band — channel par chhup jayega')); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  const unlinkSizeLess = useMutation({
    mutationFn: (mappingId: string) => onlineProductsApi.unlink(mappingId),
    onSuccess: () => { refresh(); toast.success(tr('Bina size wala link hata diya — ab har size jorein')); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  const openCell = (c: OnlineChannel, cell: GridCell, item: GridItem, row: GridRow) => {
    const title = row.label ? `${item.name} — ${row.label}` : item.name;
    const focus: LinkFocus = { productId: item.productId, variantId: row.variantId, title };
    if (cell.linked) setOpen({ kind: 'cell', channel: c, cell, title, productId: item.productId, focus });
    else if (canManage && c.canFetch) setOpen({ kind: 'link', channel: c, focus });
  };
  const askUnlinkSizeLess = async (mappingId: string, c: OnlineChannel) => {
    if (await confirmDialog({ title: tr('Bina size wala link hatayein?'), text: tr('Is product ke sizes hain, magar {{channelName}} par poora product ek saath jura hai — is se bill par "Available: 0" aata hai. Hata kar har size alag jorein.', { channelName: channelName(c) }), danger: true })) unlinkSizeLess.mutate(mappingId);
  };

  const linkedRows = channels.reduce((n, c) => n + (c.linked ?? 0), 0);
  const failedRows = channels.reduce((n, c) => n + (c.failed ?? 0), 0);
  const channelLabel = channels.find((c) => c.id === channelId);
  const filtered = !!query || !!channelId || filter !== 'all';
  const pageIds = g?.items.map((i) => i.productId) ?? [];
  const pagePicked = pageIds.length > 0 && pageIds.every((id) => picked.has(id));
  const pickCount = allMatching ? g?.total ?? 0 : picked.size;
  const selection: Selection = allMatching
    ? { all: true, search: query || undefined, filter, channelId: channelId || undefined }
    : { productIds: [...picked] };
  const togglePick = (id: string) => { setAllMatching(false); setPicked((p) => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n; }); };
  const togglePage = () => { setAllMatching(false); setPicked((p) => { const n = new Set(p); if (pagePicked) pageIds.forEach((id) => n.delete(id)); else pageIds.forEach((id) => n.add(id)); return n; }); };
  const toggleOpen = (id: string) => setExpanded((e) => { const n = new Set(e); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  return (
    <PageShell>
      <PageHero
        title={tr('Online products')}
        chip={<><PackageCheck />{channelsQ.data ? tr('{{count}} channels', { count: channels.length }) : '…'}</>}
        meta={tr('Har product aur size — link, Price aur Stock, sab channels ek jagah')}
        busy={(gridQ.isFetching && !gridQ.isLoading) || channelsQ.isFetching}
        loading={channelsQ.isLoading}
        actions={<>
          <Link to="/online-store/channels" className={heroButton}><Store className="h-4 w-4" /><span className="max-sm:hidden">{tr('Channels')}</span></Link>
          <button type="button" onClick={refresh} title={tr('Taaza karein (R)')} className={heroIconButton}><RefreshCw className={cn('h-4 w-4', gridQ.isFetching && 'animate-spin')} /></button>
          <button type="button" onClick={guide.open} title={tr('Guide (G)')} className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
        </>}
        stats={[
          { label: tr('Jure hue'), value: channelsQ.data ? linkedRows.toLocaleString('en-PK') : '', hint: channels.length ? tr('{{sellable}} products/sizes × {{count}} channels', { sellable: sellable.toLocaleString('en-PK'), count: channels.length }) : undefined },
          { label: tr('Jorna baqi'), value: s ? s.unlinked.toLocaleString('en-PK') : '', hint: tr('products') },
          { label: tr('Masle'), value: channelsQ.data ? failedRows.toLocaleString('en-PK') : '', hint: s?.errors ? tr('{{errors}} products', { errors: s.errors }) : tr('sab theek') },
          { label: tr('Price farq'), value: s ? s.price.toLocaleString('en-PK') : '', hint: tr('products') },
        ]}
      />

      {channelsQ.isLoading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 2xl:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-40 rounded-3xl" />)}</div>
      ) : channels.length === 0 ? (
        <div className="flex flex-col items-center rounded-3xl bg-white px-6 py-16 text-center ring-1 ring-slate-200/80">
          <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-brand-fg shadow-lg"><PackageCheck className="h-7 w-7" /></span>
          <h3 className="mt-4 text-lg font-semibold text-slate-900">{tr('Abhi koi online channel nahi jura')}</h3>
          <p className="mt-1 max-w-md text-[0.875rem] text-slate-500">{tr('Daraz, WooCommerce ya Shopify jorein — phir yahan products jorein, har channel ki Price rakhein aur Stock khud barabar rahega.')}</p>
          <Link to="/online-store/connect" className="mt-4 inline-flex h-10 items-center gap-2 rounded-lg bg-brand-600 px-4 text-sm font-semibold text-brand-fg hover:bg-brand-700"><Plus className="h-4 w-4" /> {' '}{tr('Channel jorein')}</Link>
        </div>
      ) : (<>
        <JobsPanel channels={channels} />

        <IssuesPanel channels={channels} canManage={canManage}
          onLink={(c) => setOpen({ kind: 'link', channel: c })}
          onFilter={(c, f) => { setChannelId(c.id); setFilter(f); }} />

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 2xl:grid-cols-3">
          {channels.map((c) => (
            <ChannelCard key={c.id} c={c} sellable={sellable} canManage={canManage}
              syncing={syncChannel.isPending && syncChannel.variables?.id === c.id}
              starting={startJob.isPending && startJob.variables?.c.id === c.id ? startJob.variables.kind : null}
              onImportAll={() => startJob.mutate({ c, kind: 'import' })}
              onLinkAll={() => startJob.mutate({ c, kind: 'link' })}
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
          search={<SearchField ref={searchRef} value={search} onChange={setSearch} placeholder={tr('Naam, SKU ya barcode…')} label={tr('Products search')} />}
          chips={filtered ? <>
            {channelId && <FilterChip onRemove={() => setChannelId('')}>{channelLabel ? channelName(channelLabel) : tr('Channel')}</FilterChip>}
            {filter !== 'all' && <FilterChip onRemove={() => setFilter('all')}>{TABS.find((t) => t.id === filter)?.label}</FilterChip>}
            {query && <FilterChip onRemove={() => setSearch('')}>"{query}"</FilterChip>}
          </> : undefined}
          onClear={() => { setSearch(''); setChannelId(''); setFilter('all'); }}>
          <FilterMenu icon={Boxes} label={tr('{{limit}} / safha', { limit })} value={String(limit)} active={false} onChange={(v) => setLimit(Number(v) || 25)} align="right" width="w-40"
            options={PAGE_SIZES.map((n) => ({ value: String(n), label: tr('{{n}} products', { n }) }))} />
          {channels.length > 1 && (
            <FilterMenu icon={Store} label={tr('Channel')} value={channelId} active={!!channelId} onChange={setChannelId} align="right" width="w-72"
              options={[{ value: '', label: tr('Sab channels') }, ...channels.map((c) => ({ value: c.id, label: channelName(c), hint: kindOf(c).label, color: kindOf(c).color }))]} />
          )}
        </FilterBar>

        {gridQ.isLoading ? (
          <div className="space-y-2 rounded-3xl bg-white p-4 ring-1 ring-slate-200/80">{[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>
        ) : gridQ.isError && !g ? (
          <div className="rounded-3xl bg-white px-6 py-14 text-center ring-1 ring-slate-200/80">
            <p className="font-semibold text-slate-900">{tr('Products nahi aaye')}</p>
            <p className="mt-1 text-sm text-slate-500">{apiErrorMessage(gridQ.error)}</p>
            <Button className="mt-3" variant="secondary" onClick={() => gridQ.refetch()}>{tr('Dobara koshish')}</Button>
          </div>
        ) : !g?.items.length ? (
          <div className="rounded-3xl bg-white px-6 py-14 text-center ring-1 ring-slate-200/80">
            <Package className="mx-auto h-10 w-10 text-slate-300" />
            <p className="mt-3 font-semibold text-slate-900">{filtered ? tr('Is filter me koi product nahi') : tr('Nafaa me abhi koi product nahi')}</p>
            <p className="mt-1 text-sm text-slate-500">{filter === 'errors' ? tr('Koi masla nahi — sab channels par Stock aur Price ja rahe hain.') : filter === 'price' ? tr('Har channel par Price wohi hai jo Nafaa rakhta hai.') : tr('Filter badal kar dekhein.')}</p>
            {filtered && <Button className="mt-4" variant="ghost" onClick={() => { setSearch(''); setChannelId(''); setFilter('all'); }}>{tr('Filter saaf karein')}</Button>}
          </div>
        ) : (<>
          {canManage && pagePicked && g.total > pageIds.length && (
            <div className="flex flex-wrap items-center justify-center gap-2 rounded-2xl bg-brand-50 px-3 py-2 text-[0.8125rem] text-brand-900 ring-1 ring-brand-100">
              {allMatching
                ? <>{tr('Is filter ke sab {{total}} products chune hain.', { total: g.total.toLocaleString('en-PK') })}<button type="button" className="font-semibold underline" onClick={clearPick}>{tr('Chunna khatam')}</button></>
                : <>{tr('Is safhe ke {{count}} chune.', { count: pageIds.length })}<button type="button" className="font-semibold underline" onClick={() => setAllMatching(true)}>{tr('Sab {{total}} chunein', { total: g.total.toLocaleString('en-PK') })}</button></>}
            </div>
          )}
          {/* Desktop and tablet: one column per channel */}
          <div className="hidden overflow-x-auto rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80 md:block">
            <table className="w-full border-separate border-spacing-0" style={{ minWidth: `${18 + cols.length * 12}rem` }}>
              <thead>
                <tr className="text-start text-[0.6875rem] font-semibold uppercase tracking-wide text-slate-500">
                  {canManage && (
                    <th className="sticky start-0 z-10 w-10 border-b border-slate-100 bg-slate-50 ps-3">
                      <input type="checkbox" aria-label={tr('Is safhe ke sab chunein')} checked={pagePicked} onChange={togglePage} className="h-4 w-4 rounded border-slate-300" />
                    </th>
                  )}
                  {/* With one or two channels the product column would take all the spare width; cap it so the channel columns get it. */}
                  <th className="sticky start-0 z-10 border-b border-slate-100 bg-slate-50 py-2.5 ps-4 pe-3"
                    style={cols.length <= 2 ? { width: cols.length === 1 ? tr('min(26rem, 42%)') : tr('min(24rem, 34%)') } : undefined}>{tr('Product')}</th>
                  {cols.map((c) => (
                    <th key={c.id} className="min-w-[12rem] border-b border-s border-slate-100 bg-slate-50 px-3 py-2">
                      <span className="flex items-center gap-2 normal-case tracking-normal">
                        <ChannelMark channel={c} size="sm" />
                        <span className="min-w-0">
                          <span className="block truncate text-[0.8125rem] font-semibold text-slate-800">{channelName(c)}</span>
                          <span className="block truncate text-[0.6875rem] font-medium text-slate-500">{priceText(c)}</span>
                        </span>
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {g.items.map((item) => (
                  <ProductRows key={item.productId} item={item} cols={cols} canManage={canManage}
                    picked={allMatching || picked.has(item.productId)} onPick={() => togglePick(item.productId)}
                    open={expanded.has(item.productId)} onToggle={() => toggleOpen(item.productId)}
                    onListed={(mappingId, listed) => setListed.mutate({ mappingId, listed })}
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
                picked={allMatching || picked.has(item.productId)} onPick={() => togglePick(item.productId)}
                open onToggle={() => undefined} onListed={(mappingId, listed) => setListed.mutate({ mappingId, listed })}
                syncing={syncProduct.isPending && syncProduct.variables === item.productId}
                onSync={() => syncProduct.mutate(item.productId)}
                onCell={(c, cell, row) => openCell(c, cell, item, row)}
                onSizeLess={askUnlinkSizeLess} />
            ))}
          </ul>

          {g.pages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((x) => x - 1)}>{tr('Pichla')}</Button>
              <span className="text-sm text-slate-600">{tr('Safha {{page}} / {{pages}} · {{total}} products', { page, pages: g.pages, total: g.total.toLocaleString('en-PK') })}</span>
              <Button variant="secondary" size="sm" disabled={page >= g.pages} onClick={() => setPage((x) => x + 1)}>{tr('Agla')}</Button>
            </div>
          )}
        </>)}
      </>)}

      {canManage && pickCount > 0 && <MasterBulkBar count={pickCount} selection={selection} channels={channels} onClear={clearPick} />}
      {guide.isOpen && <ProductsGuide onClose={guide.close} />}
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

function ChannelCard({ c, sellable, canManage, syncing, starting, onImportAll, onLinkAll, onLink, onSettings, onSync }: {
  c: OnlineChannel; sellable: number; canManage: boolean; syncing: boolean; starting: 'import' | 'link' | null;
  onImportAll: () => void; onLinkAll: () => void; onLink: () => void; onSettings: () => void; onSync: () => void;
}) {
  const pct = sellable ? Math.min(100, Math.round(((c.linked ?? 0) / sellable) * 100)) : 0;
  const k = kindOf(c);
  return (
    <div className="flex flex-col rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80">
      <div className="flex items-start gap-3">
        <ChannelMark channel={c} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-slate-900">{channelName(c)}</p>
          <p className="truncate text-[0.75rem] text-slate-500">{k.label}{c.shopName && c.tracksStock ? tr(' · Stock {{shopName}} se', { shopName: c.shopName }) : ''}</p>
        </div>
        <span className={cn('inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[0.6875rem] font-semibold',
          c.live ? 'bg-success-50 text-success-700' : c.paused ? 'bg-slate-100 text-slate-600' : 'bg-rose-50 text-rose-700')}>
          <span className={cn('h-1.5 w-1.5 rounded-full', c.live ? 'bg-success-500' : c.paused ? 'bg-slate-400' : 'bg-rose-500')} />
          {c.live ? tr('Chal raha') : c.paused ? tr('Ruka hua') : tr('Jura nahi')}
        </span>
      </div>

      <div className="mt-3">
        <div className="flex items-baseline justify-between text-[0.75rem]">
          <span className="font-semibold text-slate-700">{tr('{{value}} / {{sellable}} jure', { value: (c.linked ?? 0).toLocaleString('en-PK'), sellable: sellable.toLocaleString('en-PK') })}</span>
          {!c.canPush ? null : (c.failed ?? 0) > 0 ? <span className="font-semibold text-rose-600">{tr('{{failed}} masle', { failed: c.failed })}</span> : <span className="text-slate-500">{c.lastSyncAt ? tr('Sync {{lastSyncAt}}', { lastSyncAt: timeAgo(c.lastSyncAt) }) : ''}</span>}
        </div>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: k.color }} />
        </div>
      </div>

      <dl className="mb-3 mt-3 space-y-1 text-[0.75rem]">
        <div className="flex gap-1.5"><dt className="w-12 shrink-0 text-slate-500">{tr('Price')}</dt><dd className={cn('min-w-0 truncate font-medium', c.canPush && !c.pushPrice ? 'text-amber-700' : 'text-slate-800')}>{priceText(c)}</dd></div>
        <div className="flex gap-1.5"><dt className="w-12 shrink-0 text-slate-500">{tr('Stock')}</dt><dd className={cn('min-w-0 truncate font-medium', c.tracksStock ? 'text-slate-800' : 'text-slate-500')}>{stockText(c)}</dd></div>
      </dl>
      {!c.canFetch && <p className="mb-3 rounded-xl bg-slate-50 px-3 py-2 text-[0.75rem] text-slate-600 ring-1 ring-slate-200/80">{WEBSITE_LINKS_NOTE}</p>}

      {canManage && c.canFetch && (
        <div className="mb-2 grid grid-cols-2 gap-2">
          <Button size="sm" variant="secondary" loading={starting === 'import'} disabled={!c.live && c.canPush} onClick={onImportAll} leftIcon={<Download className="h-4 w-4" />} title={tr('Channel ke jo products Nafaa me nahi, sab ban jayein')}>
            <span className="truncate">{tr('Sab le aayein')}</span>
          </Button>
          <Button size="sm" variant="secondary" loading={starting === 'link'} disabled={!c.live && c.canPush} onClick={onLinkAll} leftIcon={<Link2 className="h-4 w-4" />} title={tr('SKU/barcode wale sab match jor dein')}>
            <span className="truncate">{tr('Sab pakke jorein')}</span>
          </Button>
        </div>
      )}
      {canManage && (
        <div className="mt-auto flex items-center gap-2 border-t border-slate-100 pt-3">
          {c.canFetch && <Button size="sm" onClick={onLink} leftIcon={<Link2 className="h-4 w-4" />}>{tr('Jorein')}</Button>}
          {/* Indolj keeps no stock and sets its own prices; a custom website only takes the stock buffer. */}
          {c.mode !== 'indolj' && (
            <Button size="sm" variant="secondary" onClick={onSettings} leftIcon={<Settings2 className="h-4 w-4" />} className="min-w-0">
              <span className="truncate">{c.canPush ? tr('Price aur Stock') : tr('Stock buffer')}</span>
            </Button>
          )}
          {c.canPush && (
            <Button size="sm" variant="ghost" loading={syncing} disabled={!c.live} onClick={onSync} leftIcon={<RefreshCw className="h-4 w-4" />} title={tr('Stock aur Price abhi bhejein')} className="ms-auto shrink-0">
              {tr('Sync')}
            </Button>
          )}
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
  picked: boolean; onPick: () => void; open: boolean; onToggle: () => void;
  onSync: () => void; onCell: (c: OnlineChannel, cell: GridCell, row: GridRow) => void; onSizeLess: (mappingId: string, c: OnlineChannel) => void;
  onListed: (mappingId: string, listed: boolean) => void;
}

/** Linked on a channel Nafaa pushes to (only those have "Sync now"). */
const anyLinked = (item: GridItem, cols: OnlineChannel[]) => item.rows.some((r) => cols.some((c) => c.canPush && r.cells[c.id]?.linked));

/** "Nafaa 100 → Daraz 30 · Shopify 20" for one product/size. */
function Split({ row, cols }: { row: GridRow; cols: OnlineChannel[] }) {
  const parts = cols.filter((c) => c.canPush && c.tracksStock && row.cells[c.id]?.linked);
  if (row.nafaaStock === null || !parts.length) return null;
  return (
    <span className="flex flex-wrap items-center gap-x-1 text-[0.71875rem] text-slate-500">
      <span className="font-semibold text-slate-700">{tr('Nafaa {{count}}', { count: row.nafaaStock })}</span>
      <span aria-hidden>→</span>
      {parts.map((c, i) => {
        const cell = row.cells[c.id] as LinkedCell;
        return (
          <span key={c.id} className={cn(!cell.listed && 'text-slate-400 line-through')}>
            {channelName(c)} <b className="tabular-nums text-slate-700">{cell.stock ?? 0}</b>{i < parts.length - 1 ? ' ·' : ''}
          </span>
        );
      })}
      {row.scaled && <span className="ms-1 rounded bg-amber-50 px-1 font-semibold text-amber-700" title={tr('Fixed hisse Stock se zyada the — sab barabar kam kiye')}>{tr('kam kiya')}</span>}
    </span>
  );
}

function PickBox({ picked, onPick, label }: { picked: boolean; onPick: () => void; label: string }) {
  return <input type="checkbox" checked={picked} onChange={onPick} aria-label={label} className="h-4 w-4 rounded border-slate-300" />;
}

function ProductRows({ item, cols, canManage, syncing, picked, onPick, open, onToggle, onSync, onCell, onSizeLess, onListed }: RowProps) {
  const sized = item.hasVariants && item.rows.some((r) => r.variantId);
  const head = (
    <div className="flex items-center gap-3">
      {sized ? (
        <button type="button" onClick={onToggle} aria-expanded={open} aria-label={open ? tr('Sizes chhupayein') : tr('Sizes dikhayein')}
          className="-ms-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700">
          <ChevronDown className={cn('h-4 w-4 transition', !open && '-rotate-90')} />
        </button>
      ) : null}
      <Thumb src={item.image} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[0.875rem] font-semibold text-slate-900" title={item.name}>{item.name}</p>
        <p className="truncate text-[0.75rem] text-slate-500">
          {sized ? tr('{{count}} sizes', { count: item.rows.length }) : <>{item.sku ? <span className="font-mono">{item.sku}</span> : tr('SKU nahi')} {' '}{tr('· Nafaa {{rs}}', { rs: rs(item.rows[0]?.price ?? item.price) })}</>}
        </p>
        {!sized && item.rows[0] && <Split row={item.rows[0]} cols={cols} />}
      </div>
      {canManage && anyLinked(item, cols) && (
        <button type="button" onClick={onSync} disabled={syncing} title={tr('Is product ka Stock aur Price abhi bhejein')} aria-label={tr('Abhi bhejein')}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50">
          <RefreshCw className={cn('h-4 w-4', syncing && 'animate-spin')} />
        </button>
      )}
    </div>
  );
  const pickCell = 'sticky start-0 z-[1] w-10 border-b border-slate-100 bg-white ps-3';
  const firstCell = cn('sticky z-[1] border-b border-slate-100 bg-white py-2 ps-4 pe-3', canManage ? 'start-10' : 'start-0');
  const pickTd = canManage ? <td className={cn(pickCell, sized && open && 'border-b-0')}><PickBox picked={picked} onPick={onPick} label={tr('{{name}} chunein', { name: item.name })} /></td> : null;
  if (!sized) {
    const row = item.rows[0];
    return (
      <tr className={cn('align-middle', picked && '[&>td]:bg-brand-50/40')}>
        {pickTd}
        <td className={firstCell}>{head}</td>
        {cols.map((c) => <td key={c.id} className="border-b border-s border-slate-100 p-1.5"><Cell c={c} cell={row.cells[c.id]} canManage={canManage} onOpen={() => onCell(c, row.cells[c.id], row)} onListed={onListed} /></td>)}
      </tr>
    );
  }
  return (
    <>
      <tr className={cn('align-top', picked && '[&>td]:bg-brand-50/40')}>
        {pickTd}
        <td className={cn(firstCell, open && 'border-b-0 pb-1')}>{head}</td>
        {cols.map((c) => {
          const bad = item.sizeLess[c.id];
          const linkedRows = item.rows.filter((r) => r.cells[c.id]?.linked);
          const off = linkedRows.filter((r) => (r.cells[c.id] as LinkedCell).listed === false).length;
          const sent = linkedRows.reduce((n, r) => n + Number((r.cells[c.id] as LinkedCell).stock ?? 0), 0);
          return (
            <td key={c.id} className={cn('border-s border-slate-100 px-3 pb-1 pt-2.5 align-middle', !open && 'border-b')}>
              {bad ? (
                <button type="button" disabled={!canManage} onClick={() => onSizeLess(bad, c)}
                  className="inline-flex items-center gap-1 rounded-lg bg-rose-50 px-2 py-1 text-start text-[0.71875rem] font-semibold text-rose-700 ring-1 ring-rose-200 hover:bg-rose-100">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" /> {' '}{tr('Size ke baghair jura — theek karein')}
                </button>
              ) : (
                <span className="block text-[0.71875rem]">
                  <span className={cn('font-semibold', linkedRows.length === item.rows.length ? 'text-success-700' : 'text-slate-500')}>{tr('{{linked}}/{{count}} sizes jure', { linked: linkedRows.length, count: item.rows.length })}</span>
                  {linkedRows.length > 0 && c.tracksStock && <span className="block text-slate-500">{tr('Stock {{sent}}', { sent })}{off ? tr(' · {{off}} band', { off }) : ''}</span>}
                </span>
              )}
            </td>
          );
        })}
      </tr>
      {open && item.rows.map((row, i) => (
        <tr key={row.variantId ?? i} className="align-middle">
          {canManage && <td className={cn(pickCell, i < item.rows.length - 1 ? 'border-b-slate-50' : '')} />}
          <td className={cn(firstCell, i < item.rows.length - 1 && 'border-b-slate-50')}>
            <div className="ps-[5rem]">
              <div className="flex items-center gap-2">
                <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[0.75rem] font-semibold text-slate-800">{row.label}</span>
                <span className="min-w-0 truncate text-[0.75rem] text-slate-500">{row.sku ? <span className="font-mono">{row.sku}</span> : null}{row.sku ? ' · ' : ''}{rs(row.price)}</span>
              </div>
              <Split row={row} cols={cols} />
            </div>
          </td>
          {cols.map((c) => <td key={c.id} className={cn('border-s border-slate-100 p-1.5', i === item.rows.length - 1 ? 'border-b' : 'border-b border-b-slate-50')}><Cell c={c} cell={row.cells[c.id]} canManage={canManage} onOpen={() => onCell(c, row.cells[c.id], row)} onListed={onListed} /></td>)}
        </tr>
      ))}
    </>
  );
}

function StatusIcon({ cell }: { cell: LinkedCell }) {
  if (cell.status === null) return null;
  if (cell.status === 'FAILED') return <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-rose-600" aria-label={tr('Masla')} />;
  if (cell.status === 'SUCCESS') return <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-success-600" aria-label={tr('Barabar')} />;
  return <Clock className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-label={tr('Abhi nahi bheja')} />;
}

function Cell({ c, cell, canManage, onOpen, onListed }: { c: OnlineChannel; cell?: GridCell; canManage: boolean; onOpen: () => void; onListed: (mappingId: string, listed: boolean) => void }) {
  if (!cell) return null;
  if (!cell.linked) {
    // A developer-built site links through its orders or CSV, so there is nothing to pick here.
    const canLink = canManage && c.canFetch;
    return (
      <button type="button" onClick={onOpen} disabled={!canLink} title={c.canFetch ? undefined : WEBSITE_LINKS_NOTE}
        className="flex w-full items-center justify-between gap-2 rounded-xl border border-dashed border-slate-200 px-2.5 py-2 text-start text-[0.75rem] text-slate-400 transition enabled:hover:border-brand-300 enabled:hover:bg-brand-50 enabled:hover:text-brand-700">
        <span className="inline-flex items-center gap-1 font-semibold">{canLink ? <><Plus className="h-3.5 w-3.5" /> {' '}{tr('Jorein')}</> : tr('Jura nahi')}</span>
        <span className="tabular-nums">{cell.stock !== null ? tr('Stock {{stock}}', { stock: cell.stock }) : ''}</span>
      </button>
    );
  }
  const off = cell.listed === false;
  const push = lastPushText(cell.lastPush);
  return (
    <div className={cn('relative rounded-xl ring-1 transition hover:bg-slate-50',
      cell.status === 'FAILED' ? 'bg-rose-50/60 ring-rose-200' : off ? 'bg-slate-50 ring-slate-200' : cell.priceDiffers ? 'ring-amber-200' : 'ring-transparent hover:ring-slate-200')}>
      <button type="button" onClick={onOpen} title={push ?? undefined} className="block w-full px-2.5 py-1.5 text-start">
        <span className={cn('flex items-center gap-1.5', c.canPush && 'pe-10')}>
          <span className={cn('text-[0.8125rem] font-semibold tabular-nums', off ? 'text-slate-400' : 'text-slate-900')}>{rs(cell.price)}</span>
          {cell.override ? <span className="rounded bg-brand-50 px-1 text-[0.625rem] font-semibold text-brand-700">{tr('apni')}</span> : null}
          {cell.compareAtPrice ? <span className="text-[0.6875rem] tabular-nums text-slate-400 line-through">{rs(cell.compareAtPrice)}</span> : null}
          <StatusIcon cell={cell} />
        </span>
        <span className="block text-[0.71875rem] text-slate-500">
          {off ? <span className="font-semibold text-slate-500">{tr('Band')}</span>
            : !c.tracksStock ? tr('Stock track nahi')
              : <>{tr('Stock')}{' '} <b className={cn('tabular-nums', (cell.stock ?? 0) <= 0 ? 'text-rose-600' : 'text-slate-700')}>{cell.stock ?? '—'}</b>
                {cell.allocQty !== null && cell.allocQty !== undefined ? <span className="ms-1 rounded bg-brand-50 px-1 text-[0.625rem] font-semibold text-brand-700">{tr('fixed')}</span> : null}</>}
          {cell.lastSyncedAt && cell.status === 'SUCCESS' ? ` · ${timeAgo(cell.lastSyncedAt)}` : ''}
        </span>
        {cell.status === 'FAILED' && cell.error ? (
          <span className="mt-0.5 line-clamp-2 block text-[0.6875rem] font-medium text-rose-700">{cell.error}</span>
        ) : cell.priceDiffers && cell.channelPrice !== null ? (
          <span className="mt-0.5 block text-[0.6875rem] font-semibold text-amber-700">{tr('Channel par {{channelPrice}}', { channelPrice: rs(cell.channelPrice) })}</span>
        ) : null}
      </button>
      {c.canPush && (
        <span className="absolute end-2 top-1.5">
          <Switch size="sm" checked={!off} disabled={!canManage} onChange={(e) => onListed(cell.mappingId, e.target.checked)}
            aria-label={off ? tr('{{channelName}} par Listed karein', { channelName: channelName(c) }) : tr('{{channelName}} par band karein', { channelName: channelName(c) })} />
        </span>
      )}
    </div>
  );
}

/* ═════════════════════ Phone card ═════════════════════ */

function ProductCard({ item, cols, canManage, syncing, picked, onPick, onSync, onCell, onSizeLess, onListed }: RowProps) {
  const sized = item.hasVariants && item.rows.some((r) => r.variantId);
  return (
    <li className={cn('overflow-hidden rounded-3xl bg-white shadow-sm ring-1', picked ? 'ring-brand-300' : 'ring-slate-200/80')}>
      <div className="flex items-center gap-3 px-3 py-2.5">
        {canManage && <PickBox picked={picked} onPick={onPick} label={tr('{{name}} chunein', { name: item.name })} />}
        <Thumb src={item.image} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[0.875rem] font-semibold text-slate-900">{item.name}</p>
          <p className="truncate text-[0.75rem] text-slate-500">{sized ? tr('{{count}} sizes', { count: item.rows.length }) : <>{tr('{{value}}Nafaa {{rs}}', { value: item.sku ? `${item.sku} · ` : '', rs: rs(item.rows[0]?.price ?? item.price) })}</>}</p>
          {!sized && item.rows[0] && <Split row={item.rows[0]} cols={cols} />}
        </div>
        {canManage && anyLinked(item, cols) && (
          <button type="button" onClick={onSync} disabled={syncing} aria-label={tr('Abhi bhejein')} className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100">
            <RefreshCw className={cn('h-4 w-4', syncing && 'animate-spin')} />
          </button>
        )}
      </div>
      {cols.filter((c) => item.sizeLess[c.id]).map((c) => (
        <button key={c.id} type="button" disabled={!canManage} onClick={() => onSizeLess(item.sizeLess[c.id], c)}
          className="mx-3 mb-2 flex w-[calc(100%-1.5rem)] items-center gap-1.5 rounded-xl bg-rose-50 px-2.5 py-1.5 text-start text-[0.75rem] font-semibold text-rose-700 ring-1 ring-rose-200">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" /> {' '}{tr('{{channelName}}: size ke baghair jura — theek karein', { channelName: channelName(c) })}
        </button>
      ))}
      <div className="divide-y divide-slate-100 border-t border-slate-100">
        {item.rows.map((row, i) => (
          <div key={row.variantId ?? i} className="px-3 py-2">
            {sized && (
              <div className="mb-1.5">
                <p className="flex items-center gap-2 text-[0.75rem]">
                  <span className="rounded-md bg-slate-100 px-1.5 py-0.5 font-semibold text-slate-800">{row.label}</span>
                  <span className="truncate text-slate-500">{row.sku ? `${row.sku} · ` : ''}{rs(row.price)}</span>
                </p>
                <Split row={row} cols={cols} />
              </div>
            )}
            <ul className="space-y-1">
              {cols.map((c) => {
                const cell = row.cells[c.id];
                if (!cell) return null;
                const off = cell.linked && cell.listed === false;
                return (
                  <li key={c.id} className="flex items-center gap-1">
                    <button type="button" onClick={() => onCell(c, cell, row)} disabled={!cell.linked && !(canManage && c.canFetch)}
                      className="flex min-w-0 flex-1 items-center gap-2 rounded-xl px-1.5 py-1 text-start hover:bg-slate-50">
                      <ChannelMark channel={c} size="sm" />
                      <span className="min-w-0 flex-1 truncate text-[0.75rem] font-medium text-slate-700">{channelName(c)}</span>
                      {cell.linked ? (
                        <>
                          <span className="text-[0.75rem] tabular-nums text-slate-500">{off ? tr('Band') : c.tracksStock ? tr('Stock {{value}}', { value: cell.stock ?? '—' }) : tr('Stock track nahi')}</span>
                          <span className={cn('text-[0.8125rem] font-semibold tabular-nums', cell.priceDiffers ? 'text-amber-700' : 'text-slate-900')}>{rs(cell.price)}</span>
                          <StatusIcon cell={cell} />
                        </>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-lg border border-dashed border-slate-300 px-2 py-0.5 text-[0.71875rem] font-semibold text-slate-500">
                          {canManage && c.canFetch ? <><Plus className="h-3 w-3" /> {' '}{tr('Jorein')}</> : tr('Jura nahi')}
                        </span>
                      )}
                    </button>
                    {cell.linked && c.canPush && (
                      <Switch size="sm" checked={!off} disabled={!canManage} onChange={(e) => onListed(cell.mappingId, e.target.checked)}
                        aria-label={off ? tr('{{channelName}} par Listed karein', { channelName: channelName(c) }) : tr('{{channelName}} par band karein', { channelName: channelName(c) })} />
                    )}
                  </li>
                );
              })}
            </ul>
            {row.cells && cols.map((c) => {
              const cell = row.cells[c.id];
              return cell?.linked && cell.status === 'FAILED' && cell.error
                ? <p key={c.id} className="line-clamp-2 pb-1 ps-9 pe-1.5 text-[0.6875rem] font-medium text-rose-700">{channelName(c)}: {cell.error}</p>
                : null;
            })}
          </div>
        ))}
      </div>
    </li>
  );
}
