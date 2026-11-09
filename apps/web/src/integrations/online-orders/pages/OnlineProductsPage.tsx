/**
 * Products & stock: every Nafaa product and size against every connected
 * channel (Daraz, each WooCommerce site, Shopify, own website). Nafaa is the
 * master list; each channel cell shows the sync state, the channel price,
 * the stock sent and Listed, and changes in place.
 *
 * Layout, top to bottom: hero with the numbers and the import / sync menu;
 * one row of channel chips (click to focus, ⋯ for the channel's work); a
 * one-line problems banner; the toolbar (search, category, brand, columns,
 * page size, activity, filter tabs with counts); the grid; the bulk bar.
 * Jobs, problems and a product's full controls open in drawers.
 *
 * Keys: / search · R refresh · G guide · ↑ ↓ rows · Enter product panel.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Boxes, Check, ChevronLeft, ChevronRight, Columns3, Download, GraduationCap, Link2, Package, PackageCheck, Plus, RefreshCw, Settings2, Tag, Tags,
} from 'lucide-react';
import {
  Button, EmptyState, FilterChip, FilterMenu, Menu, MenuItem, MenuLabel, MenuSeparator, PageHero, PageShell, SearchField, Skeleton, Tabs,
  confirmDialog, heroButton, heroIconButton,
} from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { PERMISSIONS } from '@core/lib/permissions';
import { usePermission } from '@core/hooks/usePermission';
import { isDialogOpen, isTyping } from '@core/lib/shortcuts';
import { usePageGuide } from '@core/components/PageGuide';
import { categoriesApi } from '@modules/inventory/categories/api/categories.api';
import { brandsApi } from '@modules/inventory/brands/api/brands.api';
import { apiErrorMessage, onlineOrdersApi } from '../api/online-orders.api';
import {
  ONLINE_PRODUCTS_KEY, onlineProductsApi, type GridFilter, type GridItem, type GridRow, type LinkedCell, type OnlineChannel, type Selection,
} from '../api/online-products.api';
import { downloadCsv } from '../lib/orders';
import { channelName, kindOf, refreshOnlineProducts } from '../components/online-products/meta';
import { ActivityChip, ActivityDrawer, JOBS_KEY, ProgressLine, useJobsActivity } from '../components/online-products/ActivityDrawer';
import { ChannelsBar, type ChannelAction } from '../components/online-products/ChannelsBar';
import { ISSUES_KEY, ProblemsBanner, ProblemsDrawer, useIssues } from '../components/online-products/ProblemsDrawer';
import { ProductCards, ProductsTable, type GridHandlers } from '../components/online-products/ProductsGrid';
import { ProductPanel } from '../components/online-products/ProductPanel';
import { MasterBulkBar } from '../components/online-products/MasterBulkBar';
import { ProductsGuide } from '../components/online-products/ProductsGuide';
import { LinkModal, type LinkFocus } from '../components/online-products/LinkModal';
import { ChannelSettingsModal } from '../components/online-products/ChannelSettingsModal';
import { causeInfo, syncCause } from '../components/online-products/syncErrors';
import { BackorderWaitingCard } from '../components/online-products/BackorderSettings';
import { StockRecoveryDrawer } from '../components/online-products/StockRecoveryDrawer';
import { t as tr } from '@core/i18n';

const PAGE_SIZES = [25, 50, 100];
const FILTERS: Array<{ id: GridFilter; label: () => string; tone?: 'danger' | 'warning' }> = [
  { id: 'all', label: () => tr('Sab') },
  { id: 'unlinked', label: () => tr('Jorna baqi') },
  { id: 'errors', label: () => tr('Masle'), tone: 'danger' },
  { id: 'hold', label: () => tr('Stock milana baqi'), tone: 'warning' },
  { id: 'untracked', label: () => tr('Ginti nahi') },
  { id: 'price', label: () => tr('Price farq'), tone: 'warning' },
  { id: 'out', label: () => tr('Stock khatam'), tone: 'danger' },
  { id: 'linked', label: () => tr('Jure hue') },
  { id: 'unlisted', label: () => tr('Band (unlisted)') },
  { id: 'backorder', label: () => tr('Backorder') },
];
const HIDDEN_COLS_KEY = 'nafaa-op-hidden-channels';

type Open =
  | { kind: 'link'; channel: OnlineChannel; focus?: LinkFocus }
  | { kind: 'settings'; channel: OnlineChannel; section?: 'content' }
  | { kind: 'recover'; channel: OnlineChannel };

const readHidden = (): string[] => { try { return JSON.parse(localStorage.getItem(HIDDEN_COLS_KEY) ?? '[]'); } catch { return []; } };

export default function OnlineProductsPage() {
  const qc = useQueryClient();
  const canManage = usePermission(PERMISSIONS.ONLINE_PRODUCTS_MANAGE);
  const searchRef = useRef<HTMLInputElement>(null);
  const importRef = useRef<HTMLButtonElement>(null);
  const colsRef = useRef<HTMLButtonElement>(null);
  const guide = usePageGuide();

  // `?channel=<id>&filter=<f>` (a channel's own page, an alert) opens the grid there.
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [filter, setFilterState] = useState<GridFilter>(() => {
    const f = params.get('filter') as GridFilter | null;
    return f && FILTERS.some((x) => x.id === f) ? f : 'all';
  });
  const [channelId, setChannelIdState] = useState(() => params.get('channel') ?? '');
  const [categoryId, setCategoryId] = useState('');
  const [brandId, setBrandId] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [hidden, setHidden] = useState<string[]>(readHidden);
  const [open, setOpen] = useState<Open | null>(null);
  const [panel, setPanel] = useState<{ item: GridItem; channelId?: string } | null>(null);
  const [drawer, setDrawer] = useState<'activity' | 'problems' | null>(null);
  const [menu, setMenu] = useState<'import' | 'cols' | null>(null);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [allMatching, setAllMatching] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [exporting, setExporting] = useState(false);

  const setFilter = (f: GridFilter) => {
    setFilterState(f);
    setParams((p) => { if (f !== 'all') p.set('filter', f); else p.delete('filter'); return p; }, { replace: true });
  };
  const setChannelId = useCallback((id: string) => {
    setChannelIdState(id);
    setParams((p) => { if (id) p.set('channel', id); else p.delete('channel'); return p; }, { replace: true });
  }, [setParams]);
  useEffect(() => {
    const id = params.get('channel') ?? '';
    if (id !== channelId) setChannelIdState(id);
    const f = (params.get('filter') ?? 'all') as GridFilter;
    if (f !== filter && FILTERS.some((x) => x.id === f)) setFilterState(f);
  }, [params]); // eslint-disable-line react-hooks/exhaustive-deps

  const clearPick = () => { setPicked(new Set()); setAllMatching(false); };
  useEffect(() => { const id = setTimeout(() => setQuery(search.trim()), 250); return () => clearTimeout(id); }, [search]);
  useEffect(() => { setPage(1); clearPick(); }, [query, filter, channelId, limit, categoryId, brandId]);

  const scope = { categoryId: categoryId || undefined, brandId: brandId || undefined };
  const channelsQ = useQuery({ queryKey: [ONLINE_PRODUCTS_KEY, 'channels'], queryFn: onlineProductsApi.channels, staleTime: 30_000 });
  const gridQ = useQuery({
    queryKey: [ONLINE_PRODUCTS_KEY, 'grid', { page, query, filter, channelId, limit, ...scope }],
    queryFn: () => onlineProductsApi.grid({ page, limit, search: query || undefined, filter, channelId: channelId || undefined, ...scope }),
    placeholderData: (p) => p,
  });
  const summaryQ = useQuery({
    queryKey: [ONLINE_PRODUCTS_KEY, 'summary', channelId, scope],
    queryFn: () => onlineProductsApi.summary(channelId || undefined, scope),
    staleTime: 30_000,
  });
  const categoriesQ = useQuery({ queryKey: ['categories', 'list'], queryFn: categoriesApi.list, staleTime: 5 * 60_000 });
  const brandsQ = useQuery({ queryKey: ['brands', 'list'], queryFn: () => brandsApi.list(), staleTime: 5 * 60_000 });
  const issuesQ = useIssues();

  const channels = useMemo(() => channelsQ.data?.channels ?? [], [channelsQ.data]);
  const sellable = channelsQ.data?.sellable ?? 0;
  const jobs = useJobsActivity(channels);
  const g = gridQ.data;
  const cols = useMemo(() => (g?.channels ?? []).filter((c) => !hidden.includes(c.id) || c.id === channelId), [g, hidden, channelId]);
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

  /* ─── Mutations ─── */

  const [busyChannel, setBusyChannel] = useState<{ id: string; action: ChannelAction } | null>(null);
  const syncOne = async (c: OnlineChannel) => {
    const r = await onlineProductsApi.syncChannel(c.id);
    if (r.error) throw new Error(`${channelName(c)}: ${causeInfo(syncCause(r.error)).title}`);
    return r;
  };
  const channelAction = async (c: OnlineChannel, action: ChannelAction) => {
    if (action === 'link') { setOpen({ kind: 'link', channel: c }); return; }
    if (action === 'rules') { setOpen({ kind: 'settings', channel: c }); return; }
    if (action === 'content') { setOpen({ kind: 'settings', channel: c, section: 'content' }); return; }
    if (action === 'recover') { setOpen({ kind: 'recover', channel: c }); return; }
    if (action === 'pause' && !(await confirmDialog({ title: tr('{{name}} rok dein?', { name: channelName(c) }), text: tr('Naye orders aur Stock/Price ka aana-jana ruk jayega. Baad me "Dobara chalayein" se shuru karein.'), danger: true }))) return;
    setBusyChannel({ id: c.id, action });
    try {
      if (action === 'sync') {
        const r = await syncOne(c);
        toast.success(tr('{{channelName}} par Stock{{value}} bhej diye', { channelName: channelName(c), value: r.prices ? tr(' aur {{prices}} Price', { prices: r.prices }) : '' }));
      } else if (action === 'pause' || action === 'resume') {
        await (action === 'pause' ? onlineOrdersApi.pause(c.id) : onlineOrdersApi.resume(c.id));
        toast.success(action === 'pause' ? tr('{{name}} ruk gaya', { name: channelName(c) }) : tr('{{name}} dobara chal raha hai', { name: channelName(c) }));
      } else {
        const r = await (action === 'import' ? onlineProductsApi.importAll(c.id) : onlineProductsApi.linkAll(c.id));
        qc.invalidateQueries({ queryKey: JOBS_KEY });
        if (r.existing) toast.info(tr('Ye kaam pehle se chal raha hai'));
        else if (!r.job.total) toast.info(action === 'import' ? tr('{{channelName}}: Nafaa me lane ko kuch nahi — sab jure ya milte hain', { channelName: channelName(c) }) : tr('{{channelName}}: koi pakka match baqi nahi', { channelName: channelName(c) }));
        else toast.success(action === 'import' ? tr('{{count}} products Nafaa me aa rahe hain', { count: r.job.total }) : tr('{{count}} pakke match jur rahe hain', { count: r.job.total }));
      }
      refresh();
    } catch (e) {
      toast.error(e instanceof Error && !(e as any).response ? e.message : apiErrorMessage(e));
    } finally {
      setBusyChannel(null);
    }
  };

  const syncAll = useMutation({
    mutationFn: async () => {
      const list = channels.filter((c) => c.canPush && c.live);
      const bad: string[] = [];
      for (const c of list) { try { await syncOne(c); } catch (e) { bad.push(e instanceof Error ? e.message : channelName(c)); } }
      return { count: list.length, bad };
    },
    onSuccess: (r) => {
      refresh();
      if (!r.count) toast.info(tr('Koi chalta channel nahi jahan Nafaa bhejta hai'));
      else if (r.bad.length) toast.error(r.bad[0]);
      else toast.success(tr('{{count}} channels par Stock aur Price bhej diye', { count: r.count }));
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
    onSuccess: () => { refresh(); qc.invalidateQueries({ queryKey: ISSUES_KEY }); toast.success(tr('Bina size wala link hata diya — ab har size jorein')); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  /* ─── Grid handlers (stable, so rows only redraw when their data changes) ─── */

  const listedRef = useRef(setListed.mutate);
  listedRef.current = setListed.mutate;
  const sizeLessRef = useRef(unlinkSizeLess.mutate);
  sizeLessRef.current = unlinkSizeLess.mutate;
  const h: GridHandlers = useMemo(() => ({
    onPick: (id) => { setAllMatching(false); setPicked((p) => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n; }); },
    onOpen: (item, ch) => setPanel({ item, channelId: ch }),
    onToggle: (id) => setExpanded((e) => { const n = new Set(e); if (n.has(id)) n.delete(id); else n.add(id); return n; }),
    onLink: (c: OnlineChannel, item: GridItem, row: GridRow) => {
      const title = row?.label ? `${item.name} — ${row.label}` : item.name;
      setOpen({ kind: 'link', channel: c, focus: { productId: item.productId, variantId: row?.variantId ?? null, title } });
    },
    onListed: (mappingId, listed) => listedRef.current({ mappingId, listed }),
    onSizeLess: async (mappingId, c) => {
      if (await confirmDialog({ title: tr('Bina size wala link hatayein?'), text: tr('Is product ke sizes hain, magar {{channelName}} par poora product ek saath jura hai — is se bill par "Available: 0" aata hai. Hata kar har size alag jorein.', { channelName: channelName(c) }), danger: true })) sizeLessRef.current(mappingId);
    },
  }), []);

  /* ─── Selection, link sure matches, CSV ─── */

  const pageIds = useMemo(() => g?.items.map((i) => i.productId) ?? [], [g]);
  const pagePicked = pageIds.length > 0 && pageIds.every((id) => picked.has(id));
  const pickCount = allMatching ? g?.total ?? 0 : picked.size;
  const selection: Selection = allMatching
    ? { all: true, search: query || undefined, filter, channelId: channelId || undefined, ...scope }
    : { productIds: [...picked] };
  const togglePage = () => { setAllMatching(false); setPicked((p) => { const n = new Set(p); if (pagePicked) pageIds.forEach((id) => n.delete(id)); else pageIds.forEach((id) => n.add(id)); return n; }); };

  const linkSure = useMutation({
    mutationFn: async () => {
      const fetchable = channels.filter((c) => c.canFetch && (!channelId || c.id === channelId));
      let saved = 0;
      let held = 0;
      for (const c of fetchable) {
        if (allMatching) { saved += (await onlineProductsApi.linkSure(c.id)).saved; continue; }
        const sg = await onlineProductsApi.suggestions(c.id);
        const links = sg.sure.filter((r) => picked.has(r.match.productId)).map((r) => ({
          externalProductId: r.externalProductId, externalVariantId: r.externalVariantId, productId: r.match.productId, variantId: r.match.variantId,
          externalTitle: r.hasVariants && r.variantTitle ? `${r.title} — ${r.variantTitle}` : r.title, externalImage: r.image, externalSku: r.sku,
          externalStock: r.stock,
        }));
        if (links.length) { const r = await onlineProductsApi.link(c.id, links); saved += r.saved; held += r.held ?? 0; }
      }
      return { saved, held };
    },
    onSuccess: ({ saved, held }) => {
      refresh();
      toast.success(saved ? tr('{{saved}} pakke match jor diye', { saved }) : tr('Koi pakka match baqi nahi'));
      if (held) toast.warning(tr('{{held}} par Stock milana baqi — Masle me dekhein', { held }));
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  const exportCsv = async () => {
    setExporting(true);
    try {
      const all: GridItem[] = [];
      let chans: OnlineChannel[] = [];
      for (let p = 1; p <= 50; p += 1) {
        const r = await onlineProductsApi.grid({ page: p, limit: 100, search: query || undefined, filter, channelId: channelId || undefined, ...scope });
        chans = r.channels;
        all.push(...(allMatching ? r.items : r.items.filter((i) => picked.has(i.productId))));
        if (p >= r.pages) break;
      }
      const head = [tr('Product'), tr('Size'), 'SKU', tr('Nafaa price'), tr('Nafaa Stock'), ...chans.flatMap((c) => [`${channelName(c)} ${tr('Price')}`, `${channelName(c)} ${tr('Stock')}`, `${channelName(c)} ${tr('Halat')}`])];
      const rows = all.flatMap((i) => i.rows.map((r) => [
        i.name, r.label ?? '', r.sku ?? i.sku ?? '', r.price, r.nafaaStock ?? '',
        ...chans.flatMap((c) => {
          const cell = r.cells[c.id];
          if (!cell?.linked) return ['', '', tr('Jura nahi')];
          const lc = cell as LinkedCell;
          return [lc.price, lc.stock ?? '', lc.listed === false ? tr('Band') : lc.hold ? tr('Stock milana baqi') : lc.tracksStock === false && !lc.countOptIn ? tr('Ginti nahi') : lc.status === 'FAILED' ? causeInfo(syncCause(lc.error)).title : tr('Jura hua')];
        }),
      ]));
      downloadCsv(`nafaa-online-products-${new Date().toISOString().slice(0, 10)}.csv`, [head, ...rows]);
    } catch (e) {
      toast.error(apiErrorMessage(e));
    } finally {
      setExporting(false);
    }
  };

  /* ─── Derived ─── */

  const allCols = g?.channels ?? channels;
  const filtered = !!query || !!channelId || filter !== 'all' || !!categoryId || !!brandId;
  const clearFilters = () => { setSearch(''); setChannelId(''); setFilter('all'); setCategoryId(''); setBrandId(''); };
  const focusName = channels.find((c) => c.id === channelId);
  const categoryName = categoriesQ.data?.find((c) => c.id === categoryId)?.name;
  const brandName = brandsQ.data?.find((b) => b.id === brandId)?.name;
  const toggleCol = (id: string) => setHidden((h0) => {
    const next = h0.includes(id) ? h0.filter((x) => x !== id) : [...h0, id];
    try { localStorage.setItem(HIDDEN_COLS_KEY, JSON.stringify(next)); } catch { /* private mode */ }
    return next;
  });
  const fmt = (n: number | undefined) => (n === undefined ? '' : n.toLocaleString('en-PK'));
  const fetchable = channels.filter((c) => c.canFetch);
  const from = g ? (g.page - 1) * g.limit + 1 : 0;
  const to = g ? Math.min(g.total, g.page * g.limit) : 0;

  return (
    <PageShell>
      <PageHero
        title={tr('Products & stock')}
        chip={<><PackageCheck />{channelsQ.data ? tr('{{count}} channels', { count: channels.length }) : '…'}</>}
        meta={tr('Har product aur size — link, Price aur Stock, sab channels ek jagah')}
        busy={(gridQ.isFetching && !gridQ.isLoading) || channelsQ.isFetching}
        loading={channelsQ.isLoading}
        actions={<>
          {canManage && fetchable.length > 0 && (
            <>
              <button ref={importRef} type="button" onClick={() => setMenu(menu === 'import' ? null : 'import')} aria-haspopup="menu" aria-expanded={menu === 'import'} className={heroButton}>
                <Download className="h-4 w-4" /><span className="max-sm:hidden">{tr('Import / Link')}</span>
              </button>
              <Menu open={menu === 'import'} onClose={() => setMenu(null)} anchorRef={importRef} width="w-72" label={tr('Import / Link')}>
                {fetchable.map((c, i) => (
                  <div key={c.id}>
                    {i > 0 && <MenuSeparator />}
                    <MenuLabel>{channelName(c)}</MenuLabel>
                    <MenuItem icon={<Link2 />} onClick={() => { setMenu(null); void channelAction(c, 'link'); }}>{tr('Products jorein')}</MenuItem>
                    <MenuItem icon={<Download />} disabled={!c.live && c.canPush} onClick={() => { setMenu(null); void channelAction(c, 'import'); }}>{tr('Sab le aayein')}</MenuItem>
                    <MenuItem icon={<Check />} disabled={!c.live && c.canPush} onClick={() => { setMenu(null); void channelAction(c, 'link-all'); }}>{tr('Sab pakke match jorein')}</MenuItem>
                  </div>
                ))}
              </Menu>
            </>
          )}
          {canManage && channels.some((c) => c.canPush) && (
            <button type="button" disabled={syncAll.isPending} title={tr('Sab channels par Stock aur Price abhi bhejein')} className={heroButton}
              onClick={async () => { if (await confirmDialog({ title: tr('Sab channels par abhi bhejein?'), text: tr('Har chalte channel par sab jure products ka Stock aur Price abhi jayega.') })) syncAll.mutate(); }}>
              <RefreshCw className={cn('h-4 w-4', syncAll.isPending && 'animate-spin')} /><span className="max-sm:hidden">{tr('Sab sync')}</span>
            </button>
          )}
          <Link to="/online-store/settings" title={tr('Online store settings')} aria-label={tr('Online store settings')} className={heroIconButton}><Settings2 className="h-4 w-4" /></Link>
          <button type="button" onClick={guide.open} title={tr('Guide (G)')} aria-label={tr('Guide (G)')} className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
        </>}
        stats={[
          { label: tr('Products'), value: fmt(s?.all), hint: channelsQ.data ? tr('{{sellable}} products/sizes', { sellable: fmt(sellable) }) : undefined },
          { label: tr('Jure hue'), value: fmt(s?.linked), hint: s ? tr('{{all}} me se · {{pct}}%', { all: fmt(s.all), pct: s.all ? Math.round((s.linked / s.all) * 100) : 0 }) : undefined },
          { label: tr('Masle'), value: fmt(s?.errors), hint: s ? (s.errors ? tr('products') : tr('sab theek')) : undefined },
          { label: tr('Kisi channel par Stock khatam'), value: fmt(s?.out), hint: tr('products') },
          { label: tr('Backorder'), value: fmt(s?.backorder), hint: tr('khatam par bhi order chalu') },
        ]}
      />

      {channelsQ.isLoading ? (
        <div className="space-y-3"><Skeleton className="h-11 rounded-2xl" /><Skeleton className="h-28 rounded-2xl" /><Skeleton className="h-80 rounded-2xl" /></div>
      ) : channelsQ.isError ? (
        <div className="rounded-2xl bg-white py-10 ring-1 ring-slate-200/80">
          <EmptyState icon={<Package className="h-5 w-5" />} title={tr('Channels load nahi hue')} description={apiErrorMessage(channelsQ.error)}
            action={<Button size="sm" variant="secondary" onClick={() => channelsQ.refetch()}>{tr('Dobara koshish')}</Button>} />
        </div>
      ) : channels.length === 0 ? (
        <div className="rounded-2xl bg-white py-14 ring-1 ring-slate-200/80">
          <EmptyState icon={<PackageCheck className="h-5 w-5" />} title={tr('Abhi koi online channel nahi jura')}
            description={tr('Daraz, WooCommerce ya Shopify jorein — phir yahan products jorein, har channel ki Price rakhein aur Stock khud barabar rahega.')}
            action={<Link to="/online-store/connect"><Button leftIcon={<Plus className="h-4 w-4" />}>{tr('Channel jorein')}</Button></Link>} />
        </div>
      ) : (<>
        <ChannelsBar channels={channels} sellable={sellable} active={channelId} onFocus={setChannelId} canManage={canManage}
          busy={busyChannel} onAction={(c, a) => void channelAction(c, a)} />

        <ProblemsBanner issues={issuesQ.data?.issues ?? []} onOpen={() => setDrawer('problems')} />

        <div className="relative z-10 rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/80">
          <div className="flex flex-wrap items-center gap-2 p-3">
            <div className="flex min-w-0 flex-[1_1_18rem]">
              <SearchField ref={searchRef} value={search} onChange={setSearch} placeholder={tr('Naam, SKU ya barcode…')} label={tr('Products search')} />
            </div>
            <div className="flex max-w-full flex-wrap items-center gap-2">
              {!!categoriesQ.data?.length && (
                <FilterMenu icon={Tag} label={tr('Category')} value={categoryId} active={!!categoryId} onChange={setCategoryId} width="w-64"
                  options={[{ value: '', label: tr('Sab categories') }, ...categoriesQ.data.filter((c) => c.isActive).map((c) => ({ value: c.id, label: c.name, color: c.color }))]} />
              )}
              {!!brandsQ.data?.length && (
                <FilterMenu icon={Tags} label={tr('Brand')} value={brandId} active={!!brandId} onChange={setBrandId} width="w-64"
                  options={[{ value: '', label: tr('Sab brands') }, ...brandsQ.data.map((b) => ({ value: b.id, label: b.name }))]} />
              )}
              {allCols.length > 1 && (
                <>
                  <button ref={colsRef} type="button" onClick={() => setMenu(menu === 'cols' ? null : 'cols')} aria-haspopup="menu" aria-expanded={menu === 'cols'}
                    className={cn('inline-flex h-11 items-center gap-2 rounded-2xl px-3.5 text-[0.8125rem] font-semibold ring-1 transition',
                      hidden.length ? 'bg-brand-50 text-brand-800 ring-brand-200' : 'bg-white text-slate-700 ring-slate-200 hover:bg-slate-50')}>
                    <Columns3 className="h-4 w-4" />{tr('Columns')}{hidden.length ? <span className="tabular-nums">{allCols.length - allCols.filter((c) => hidden.includes(c.id)).length}/{allCols.length}</span> : null}
                  </button>
                  <Menu open={menu === 'cols'} onClose={() => setMenu(null)} anchorRef={colsRef} width="w-64" label={tr('Columns')}>
                    <MenuLabel>{tr('Kaun se channels dikhein')}</MenuLabel>
                    {allCols.map((c) => (
                      <MenuItem key={c.id} checked={!hidden.includes(c.id)} onClick={() => toggleCol(c.id)}
                        icon={<span className={cn('flex h-4 w-4 items-center justify-center rounded border', hidden.includes(c.id) ? 'border-slate-300' : 'border-brand-600 bg-brand-600 text-white')}>{!hidden.includes(c.id) && <Check className="h-3 w-3" />}</span>}>
                        <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: kindOf(c).color }} />{channelName(c)}</span>
                      </MenuItem>
                    ))}
                  </Menu>
                </>
              )}
              <FilterMenu icon={Boxes} label={tr('{{limit}} / safha', { limit })} value={String(limit)} active={false} onChange={(v) => setLimit(Number(v) || 25)} align="right" width="w-44"
                options={PAGE_SIZES.map((n) => ({ value: String(n), label: tr('{{n}} products', { n }) }))} />
              <ActivityChip running={jobs.running.length} problems={jobs.problems} onClick={() => setDrawer('activity')} />
            </div>
          </div>
          <div className="px-3">
            <Tabs value={filter} onChange={setFilter} label={tr('Filter')}
              items={FILTERS.map((f) => ({ value: f.id, label: f.label(), count: s?.[f.id], tone: f.tone && (s?.[f.id] ?? 0) > 0 ? f.tone : undefined }))} />
          </div>
          {filtered && (
            <div className="flex flex-wrap items-center gap-1.5 border-t border-slate-100 px-3 py-2">
              {channelId && <FilterChip onRemove={() => setChannelId('')}>{focusName ? channelName(focusName) : tr('Channel')}</FilterChip>}
              {categoryId && <FilterChip onRemove={() => setCategoryId('')}>{categoryName ?? tr('Category')}</FilterChip>}
              {brandId && <FilterChip onRemove={() => setBrandId('')}>{brandName ?? tr('Brand')}</FilterChip>}
              {query && <FilterChip onRemove={() => setSearch('')}>"{query}"</FilterChip>}
              <button type="button" onClick={clearFilters} className="ms-auto inline-flex h-7 items-center rounded-full px-2.5 text-[0.75rem] font-semibold text-rose-700 hover:bg-rose-50">{tr('Saaf karein')}</button>
            </div>
          )}
          <ProgressLine percent={jobs.percent} active={jobs.running.length > 0} />
        </div>

        {canManage && pagePicked && g && g.total > pageIds.length && (
          <div className="flex flex-wrap items-center justify-center gap-2 rounded-xl bg-brand-50 px-3 py-1.5 text-[0.8125rem] text-brand-900 ring-1 ring-brand-100">
            {allMatching
              ? <>{tr('Is filter ke sab {{total}} products chune hain.', { total: fmt(g.total) })}<button type="button" className="font-semibold underline" onClick={clearPick}>{tr('Chunna khatam')}</button></>
              : <>{tr('Is safhe ke {{count}} chune.', { count: pageIds.length })}<button type="button" className="font-semibold underline" onClick={() => setAllMatching(true)}>{tr('Sab {{total}} chunein', { total: fmt(g.total) })}</button></>}
          </div>
        )}

        {filter === 'backorder' && <BackorderWaitingCard />}

        {gridQ.isLoading ? (
          <div className="space-y-1.5 rounded-2xl bg-white p-3 ring-1 ring-slate-200/80">{Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="h-12 rounded-lg" />)}</div>
        ) : gridQ.isError && !g ? (
          <div className="rounded-2xl bg-white py-12 ring-1 ring-slate-200/80">
            <EmptyState icon={<Package className="h-5 w-5" />} title={tr('Products nahi aaye')} description={apiErrorMessage(gridQ.error)}
              action={<Button size="sm" variant="secondary" onClick={() => gridQ.refetch()}>{tr('Dobara koshish')}</Button>} />
          </div>
        ) : !g?.items.length ? (
          <div className="rounded-2xl bg-white py-12 ring-1 ring-slate-200/80">
            <EmptyState icon={<Package className="h-5 w-5" />}
              title={filtered ? tr('Is filter me koi product nahi') : tr('Nafaa me abhi koi product nahi')}
              description={filter === 'errors' ? tr('Koi masla nahi — sab channels par Stock aur Price ja rahe hain.') : filter === 'hold' ? tr('Koi link ruka hua nahi — Nafaa aur channel ka Stock barabar hai.') : filter === 'untracked' ? tr('Har jura hua item channel par gina ja raha hai.') : filter === 'price' ? tr('Har channel par Price wohi hai jo Nafaa rakhta hai.') : tr('Filter badal kar dekhein.')}
              action={filtered ? <Button size="sm" variant="ghost" onClick={clearFilters}>{tr('Filter saaf karein')}</Button> : undefined} />
          </div>
        ) : (<>
          <ProductsTable items={g.items} cols={cols} canManage={canManage} picked={picked} allMatching={allMatching} expanded={expanded}
            pagePicked={pagePicked} onPickPage={togglePage} h={h}
            footer={(
              <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-3 py-2 text-[0.8125rem] text-slate-600">
                <span className="tabular-nums">{tr('{{from}}–{{to}} / {{total}} products', { from: fmt(from), to: fmt(to), total: fmt(g.total) })}</span>
                <span className="flex items-center gap-1">
                  <Button size="xs" variant="ghost" disabled={page <= 1} onClick={() => setPage((x) => x - 1)} leftIcon={<ChevronLeft className="h-3.5 w-3.5 rtl:rotate-180" />}>{tr('Pichla')}</Button>
                  <span className="px-1 tabular-nums">{page} / {g.pages}</span>
                  <Button size="xs" variant="ghost" disabled={page >= g.pages} onClick={() => setPage((x) => x + 1)} rightIcon={<ChevronRight className="h-3.5 w-3.5 rtl:rotate-180" />}>{tr('Agla')}</Button>
                </span>
              </div>
            )} />
          <ProductCards items={g.items} cols={cols} canManage={canManage} picked={picked} allMatching={allMatching} h={h} />
          {g.pages > 1 && (
            <div className="flex items-center justify-center gap-2 md:hidden">
              <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((x) => x - 1)}>{tr('Pichla')}</Button>
              <span className="text-sm tabular-nums text-slate-600">{page} / {g.pages}</span>
              <Button variant="secondary" size="sm" disabled={page >= g.pages} onClick={() => setPage((x) => x + 1)}>{tr('Agla')}</Button>
            </div>
          )}
        </>)}
      </>)}

      {canManage && pickCount > 0 && (
        <MasterBulkBar count={pickCount} selection={selection} channels={channels} onClear={clearPick}
          onLinkSure={() => linkSure.mutate()} linking={linkSure.isPending} onExport={() => void exportCsv()} exporting={exporting} />
      )}
      {guide.isOpen && <ProductsGuide onClose={guide.close} />}
      <ActivityDrawer open={drawer === 'activity'} onClose={() => setDrawer(null)} jobs={jobs.jobs} channels={channels} />
      <ProblemsDrawer open={drawer === 'problems'} onClose={() => setDrawer(null)} channels={channels} priceCount={s?.price ?? 0} canManage={canManage}
        onFilter={(id, f) => { setChannelId(id); setFilter(f); }} onLink={(c) => setOpen({ kind: 'link', channel: c })} />
      {panel && (
        <ProductPanel item={g?.items.find((i) => i.productId === panel.item.productId) ?? panel.item} cols={allCols} focusChannel={panel.channelId}
          canManage={canManage} onClose={() => setPanel(null)} onLink={h.onLink} />
      )}
      {open?.kind === 'link' && <LinkModal channel={open.channel} focus={open.focus} canManage={canManage} onClose={() => setOpen(null)} />}
      {open?.kind === 'recover' && <StockRecoveryDrawer channel={open.channel} onClose={() => setOpen(null)} />}
      {open?.kind === 'settings' && <ChannelSettingsModal channel={open.channel} section={open.section} onClose={() => setOpen(null)} />}
    </PageShell>
  );
}
