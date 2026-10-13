/**
 * Stock report for every industry: what the stock in each branch is worth at
 * cost and at selling price, how long it has been sitting, what is dead,
 * slow or fast, near expiry, how branches compare, and the stock on any past
 * date (opening and closing for a period from the stock ledger). Industries
 * add their own filters, warnings and tabs through config.
 *
 * Keys: / search · A analytics · B branches · M period · G guide.
 */

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  AlertTriangle, ArrowDownWideNarrow, BarChart3, Boxes, Building2, CalendarClock, CalendarRange, Download, GraduationCap, Hourglass,
  Layers, ListChecks, ListFilter, MousePointerClick, Package, PackageX, RefreshCw, Search, ShoppingCart, Tag, TrendingUp, Truck,
} from 'lucide-react';
import {
  Button, DateRangeMenu, FilterBar, FilterChip, FilterMenu, Kbd, KpiCard, KpiRow, PageHero, PageShell, SearchField, Skeleton, ViewTabs,
  heroButton, heroIconButton, resolveRange, type FilterOption,
} from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { PrintButton } from '@core/print';
import { PrivacyToggle } from '@core/security/HiddenValue';
import { useBusinessDayStart } from '@core/lib/business-day';
import { rangeLabel } from '@core/lib/dateRange';
import { isDialogOpen, isTyping } from '@core/lib/shortcuts';
import { cn } from '@core/lib/cn';
import { useAuthStore, useIsAllShops, useShopParam } from '@core/stores/auth.store';
import { useReportMasked, useReportRange } from '@modules/reports/prefs';
import {
  STOCK_KEY, stockAnalysisApi, type LedgerSort, type StockLine, type StockQuery, type StockSort, type StockStatusFilter,
} from '../api/stock-report.api';
import { useStockReportConfig } from '../config';
import { BranchView } from '../components/BranchView';
import { ItemDrawer } from '../components/ItemDrawer';
import { LEDGER_SORTS, LedgerView } from '../components/LedgerView';
import { StockAnalytics } from '../components/StockAnalytics';
import { STOCK_GRID, StockRow } from '../components/StockRow';
import { BASE_STATUSES, DEAD_OPTIONS, STATUS_META, change } from '../components/meta';
import { branchesDoc, ledgerCsv, ledgerDoc, stockCsv, stockDoc } from '../components/print';

type Tab = 'stock' | 'analytics' | 'branches' | 'period' | string;

const DEAD_KEY = 'nafaa-stock-report-dead-days';
const SORTS: Array<FilterOption<StockSort>> = [
  { value: 'value', label: 'Zyada cost pehle' },
  { value: 'retail', label: 'Zyada qeemat pehle', hint: 'Bechne ki qeemat par' },
  { value: 'profit', label: 'Zyada profit pehle' },
  { value: 'margin', label: 'Zyada margin pehle' },
  { value: 'age', label: 'Purana maal pehle', hint: 'Aakhri sale ko zyada din' },
  { value: 'sold', label: 'Zyada bika pehle' },
  { value: 'revenue', label: 'Zyada sale amount pehle' },
  { value: 'cover', label: 'Zyada din ka maal pehle' },
  { value: 'stock', label: 'Zyada stock pehle' },
  { value: 'name', label: 'Naam (A–Z)' },
];
const COST_SORTS: StockSort[] = ['value', 'profit', 'margin'];

function loadDeadDays() {
  try { return Number(localStorage.getItem(DEAD_KEY)) || 90; } catch { return 90; }
}

export default function StockReportPage() {
  const config = useStockReportConfig();
  const qc = useQueryClient();
  const shopParam = useShopParam();
  const isAll = useIsAllShops();
  const startHour = useBusinessDayStart();
  const tenantName = useAuthStore((s) => s.tenant?.name ?? '');
  const shopName = useAuthStore((s) => s.user?.assignedShop?.name);
  const { sales: money, cost, costHidden } = useReportMasked();
  const guide = usePageGuide();
  const searchRef = useRef<HTMLInputElement>(null);

  const [range, setRange] = useReportRange('month');
  const [status, setStatus] = useState<StockStatusFilter>('all');
  const [categoryId, setCategoryId] = useState<string>();
  const [brandId, setBrandId] = useState<string>();
  const [supplierId, setSupplierId] = useState<string>();
  const [group, setGroup] = useState<string>();
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<StockSort>(() => (costHidden ? 'retail' : 'value'));
  const [deadDays, setDeadDays] = useState(loadDeadDays);
  const [page, setPage] = useState(1);
  const [tab, setTab] = useState<Tab>('stock');
  const [ledgerShow, setLedgerShow] = useState<'all' | 'moved'>('moved');
  const [ledgerSort, setLedgerSort] = useState<LedgerSort>('closing');
  const [openId, setOpenId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => { const t = setTimeout(() => setQuery(search.trim()), 250); return () => clearTimeout(t); }, [search]);
  useEffect(() => { setPage(1); }, [status, categoryId, brandId, supplierId, group, query, sort, deadDays, range, shopParam]);
  useEffect(() => { if (costHidden && COST_SORTS.includes(sort)) setSort('retail'); }, [costHidden, sort]);

  const period = resolveRange(range, startHour) ?? resolveRange({ preset: 'month', custom: range.custom }, startHour)!;
  const filters: StockQuery = { from: period.from, to: period.to, categoryId, brandId, supplierId, group, search: query || undefined, deadDays };
  const listQ = useQuery({
    queryKey: [STOCK_KEY, 'list', shopParam, filters, status, sort, page],
    queryFn: () => stockAnalysisApi.list({ ...filters, status, sort, page, limit: 40 }),
    placeholderData: (prev) => prev,
  });
  const analyticsQ = useQuery({
    queryKey: [STOCK_KEY, 'analytics', shopParam, filters],
    queryFn: () => stockAnalysisApi.analytics(filters),
    enabled: tab === 'analytics',
  });
  const branchesQ = useQuery({
    queryKey: [STOCK_KEY, 'branches', shopParam, filters],
    queryFn: () => stockAnalysisApi.branches(filters),
    enabled: tab === 'branches',
  });
  const data = listQ.data;
  const t = data?.totals;
  const counts = data?.counts;
  const multi = isAll && (data?.shops.length ?? 0) > 1;
  const shopLabel = `${tenantName}${shopName && !isAll ? ` · ${shopName}` : ''}`;
  const periodText = rangeLabel(period.from, period.to);
  const shopNameOf = useMemo(() => {
    const m = new Map((data?.shops ?? []).map((s) => [s.id, s.name]));
    return (id: string) => m.get(id) ?? '';
  }, [data?.shops]);

  const refresh = () => qc.invalidateQueries({ queryKey: [STOCK_KEY] });
  const setDead = (d: number) => { setDeadDays(d); try { localStorage.setItem(DEAD_KEY, String(d)); } catch { /* storage blocked */ } };
  const clear = () => { setStatus('all'); setCategoryId(undefined); setBrandId(undefined); setSupplierId(undefined); setGroup(undefined); setSearch(''); };
  const filtered = status !== 'all' || !!categoryId || !!brandId || !!supplierId || !!group || !!query;
  const statuses: StockStatusFilter[] = [...BASE_STATUSES.slice(0, 7), ...(config.statuses ?? []), ...BASE_STATUSES.slice(7)];
  const statusOptions: Array<FilterOption<StockStatusFilter>> = [
    { value: 'all', label: STATUS_META.all.label, icon: ListChecks, color: STATUS_META.all.color, hint: `${counts?.all ?? 0}` },
    ...statuses.map((k) => ({ value: k, label: STATUS_META[k].label, icon: STATUS_META[k].icon, color: STATUS_META[k].color, hint: `${counts?.[k] ?? 0}${STATUS_META[k].hint ? ` · ${STATUS_META[k].hint}` : ''}` })),
  ];
  const filterText = [status !== 'all' && STATUS_META[status].label, categoryId && data?.facets.categories.find((c) => c.id === categoryId)?.name, query && `"${query}"`].filter(Boolean).join(' · ');

  /** Every line of the filter, page by page. */
  const fetchAll = async () => {
    const first = await stockAnalysisApi.list({ ...filters, status, sort, limit: 1000, page: 1 });
    const items: StockLine[] = [...first.items];
    for (let p = 2; p <= first.pages; p++) items.push(...(await stockAnalysisApi.list({ ...filters, status, sort, limit: 1000, page: p })).items);
    return { ...first, items };
  };
  const exportCsv = async () => {
    setExporting(true);
    try {
      const header = [`Stock report — ${shopLabel}`, `Sale ki period: ${periodText}`];
      if (tab === 'period') {
        const l = await stockAnalysisApi.ledger({ ...filters, show: ledgerShow, sort: ledgerSort, limit: 1000 });
        if (!l.items.length) { toast.error('Is period me kuch nahi'); return; }
        ledgerCsv(l, header, !costHidden);
        toast.success(`${l.items.length} cheezein CSV me`);
        return;
      }
      const all = await fetchAll();
      if (!all.items.length) { toast.error('Is filter me kuch nahi'); return; }
      stockCsv(all.items, header, !costHidden, multi ? all.shops : []);
      toast.success(`${all.items.length} cheezein CSV me`);
    } catch { toast.error('Export nahi hua'); } finally { setExporting(false); }
  };
  const printDoc = async () => {
    if (tab === 'period') return ledgerDoc(await stockAnalysisApi.ledger({ ...filters, show: ledgerShow, sort: ledgerSort, limit: 1000 }), periodText, !costHidden);
    if (tab === 'branches') return branchesDoc(branchesQ.data ?? await stockAnalysisApi.branches(filters), !costHidden);
    return stockDoc(await fetchAll(), [shopLabel, filterText].filter(Boolean).join(' · '), !costHidden);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping() || isDialogOpen()) return;
      const k = e.key.toLowerCase();
      if (e.key === '/') { e.preventDefault(); setTab('stock'); window.setTimeout(() => searchRef.current?.focus(), 0); }
      else if (k === 'a') setTab((v) => (v === 'analytics' ? 'stock' : 'analytics'));
      else if (k === 'b' && multi) setTab((v) => (v === 'branches' ? 'stock' : 'branches'));
      else if (k === 'm') setTab((v) => (v === 'period' ? 'stock' : 'period'));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [multi]);

  const kpi = (k: StockStatusFilter, value: string, hint: string) => (
    <KpiCard key={k} icon={STATUS_META[k].icon} color={STATUS_META[k].color} label={STATUS_META[k].label} value={value}
      hint={status === k ? 'Filter laga · dobara dabayein' : hint} active={status === k}
      onClick={() => { setTab('stock'); setStatus((s) => (s === k ? 'all' : k)); }} />
  );
  const salesChange = t ? change(t.sold.revenue, t.prevSold.revenue) : null;
  const Banner = config.Banner;
  const ExtraTab = config.extraTab?.Component;
  const items = data?.items ?? [];

  return (
    <PageShell>
      <PageHero
        title="Stock report"
        chip={<><CalendarRange />{periodText}</>}
        busy={listQ.isFetching && !listQ.isLoading}
        meta={`${config.label} · ${isAll ? 'Sab branches' : shopName ?? tenantName}`}
        loading={listQ.isLoading}
        actions={<>
          <PrivacyToggle compact />
          <button type="button" onClick={() => void exportCsv()} disabled={exporting} className={heroButton}><Download className="h-4 w-4" />{exporting ? 'Ban raha…' : 'CSV'}</button>
          <span className="[&_button]:border-white/25 [&_button]:bg-white [&_button]:text-slate-800"><PrintButton doc={printDoc} disabled={!data?.total} /></span>
          <Link to="/low-stock" title="Kam aur khatam maal ka order" className={heroButton}><ShoppingCart className="h-4 w-4" /><span className="hidden sm:inline">Reorder</span></Link>
          <button type="button" onClick={() => void refresh()} title="Taaza karein" aria-label="Taaza karein" className={heroIconButton}><RefreshCw className={cn('h-4 w-4', listQ.isFetching && 'animate-spin')} /></button>
          <button type="button" onClick={guide.open} title="Guide (G)" aria-label="Guide" className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
        </>}
        stats={t ? [
          { label: costHidden ? 'Stock bechne par' : 'Stock ki cost', value: costHidden ? money(t.retail) : cost(t.cost), hint: `${t.stocked} cheezein` },
          { label: 'Bechne par', value: money(t.retail), hint: 'aaj ke rate' },
          { label: 'Mumkin profit', value: cost(t.profit), hint: costHidden ? 'Cost lock' : `${t.margin.toFixed(1)}% margin` },
          { label: 'Kitne din chalega', value: t.coverDays === null ? '—' : `${t.coverDays} din`, hint: 'is sale par' },
        ] : [{ label: 'Stock ki cost', value: '' }, { label: 'Bechne par', value: '' }, { label: 'Mumkin profit', value: '' }, { label: 'Kitne din chalega', value: '' }]}
      />

      <KpiRow>
        {!counts || !t ? Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-[5.25rem] rounded-2xl" />) : (
          <>
            <KpiCard icon={TrendingUp} color="#0f766e" label="Period ki sale" value={money(t.sold.revenue)}
              hint={salesChange === null ? `${t.sold.qty.toLocaleString('en-PK')} units biki` : `${salesChange >= 0 ? '+' : ''}${salesChange.toFixed(0)}% pichli period se`}
              onClick={() => setTab('analytics')} active={tab === 'analytics'} />
            {kpi('out', String(counts.out), 'khatam · dabayein')}
            {kpi('low', String(counts.low), 'alert se neeche')}
            {kpi('dead', costHidden ? money(t.dead.retail) : cost(t.dead.cost), `${counts.dead} cheezein · ${deadDays}+ din`)}
            {kpi('expiry', String(counts.expiry), `${data?.period.expiryDays ?? 30} din me ya expire`)}
          </>
        )}
      </KpiRow>

      {Banner && data && <Suspense fallback={null}><Banner list={data} setStatus={(s) => { setTab('stock'); setStatus(s); }} openTab={setTab} /></Suspense>}

      <FilterBar
        search={<SearchField ref={searchRef} value={search} onChange={setSearch} placeholder="Naam, SKU, barcode, brand ya category…" label="Stock search" />}
        chips={filtered ? <>
          {status !== 'all' && <FilterChip onRemove={() => setStatus('all')}>{STATUS_META[status].label}</FilterChip>}
          {categoryId && <FilterChip onRemove={() => setCategoryId(undefined)}>{data?.facets.categories.find((c) => c.id === categoryId)?.name ?? 'Category'}</FilterChip>}
          {brandId && <FilterChip onRemove={() => setBrandId(undefined)}>{data?.facets.brands.find((c) => c.id === brandId)?.name ?? 'Brand'}</FilterChip>}
          {supplierId && <FilterChip onRemove={() => setSupplierId(undefined)}>{data?.facets.suppliers.find((c) => c.id === supplierId)?.name ?? 'Supplier'}</FilterChip>}
          {group && <FilterChip onRemove={() => setGroup(undefined)}>{config.groups?.label(group) ?? group}</FilterChip>}
          {query && <FilterChip onRemove={() => setSearch('')}>"{query}"</FilterChip>}
        </> : undefined}
        onClear={clear}>
        <DateRangeMenu value={range} onChange={setRange} startHour={startHour} label="Sale ki period" allowAll={false} defaultPreset="month" />
        <FilterMenu icon={ListFilter} label="Halat" value={status} active={status !== 'all'} options={statusOptions} onChange={(v) => { setTab('stock'); setStatus(v); }} width="w-80" />
        {(data?.facets.categories.length ?? 0) > 1 && (
          <FilterMenu icon={Layers} label="Category" value={categoryId ?? 'all'} active={!!categoryId} width="w-72"
            options={[{ value: 'all', label: 'Sab category' }, ...data!.facets.categories.map((c) => ({ value: c.id, label: c.name ?? '', hint: `${c.count} cheezein`, color: c.color ?? undefined }))]}
            onChange={(v) => setCategoryId(v === 'all' ? undefined : v)} />
        )}
        {(data?.facets.brands.length ?? 0) > 1 && (
          <FilterMenu icon={Tag} label="Brand" value={brandId ?? 'all'} active={!!brandId} width="w-72"
            options={[{ value: 'all', label: 'Sab brand' }, ...data!.facets.brands.map((c) => ({ value: c.id, label: c.name ?? '', hint: `${c.count} cheezein` }))]}
            onChange={(v) => setBrandId(v === 'all' ? undefined : v)} />
        )}
        {(data?.facets.suppliers.length ?? 0) > 1 && (
          <FilterMenu icon={Truck} label="Supplier" value={supplierId ?? 'all'} active={!!supplierId} width="w-72"
            options={[{ value: 'all', label: 'Sab supplier' }, ...data!.facets.suppliers.map((c) => ({ value: c.id, label: c.name ?? '', hint: `${c.count} cheezein${costHidden ? '' : ` · ${cost(c.cost)}`}` }))]}
            onChange={(v) => setSupplierId(v === 'all' ? undefined : v)} />
        )}
        {config.groups && (data?.facets.groups.length ?? 0) > 0 && (
          <FilterMenu icon={Boxes} label={config.groups.title} value={group ?? 'all'} active={!!group} width="w-64"
            options={[{ value: 'all', label: 'Sab' }, ...data!.facets.groups.map((g) => ({ value: g.id, label: config.groups!.label(g.id), hint: `${g.count}` }))]}
            onChange={(v) => setGroup(v === 'all' ? undefined : v)} />
        )}
        <FilterMenu icon={Hourglass} label={`Dead: ${deadDays} din`} value={String(deadDays)} active={deadDays !== 90} width="w-64"
          options={DEAD_OPTIONS.map((d) => ({ value: String(d), label: `${d} din se nahi bika`, hint: d === 90 ? 'Aam tor par' : undefined }))}
          onChange={(v) => setDead(Number(v))} />
        {tab === 'period'
          ? <FilterMenu icon={ArrowDownWideNarrow} label="Sort" value={ledgerSort} options={LEDGER_SORTS} onChange={setLedgerSort} align="right" width="w-56" />
          : <FilterMenu icon={ArrowDownWideNarrow} label="Sort" value={sort} options={costHidden ? SORTS.filter((s) => !COST_SORTS.includes(s.value)) : SORTS} onChange={setSort} align="right" width="w-64" />}
      </FilterBar>

      <ViewTabs value={tab} onChange={setTab} hint={<><Kbd>A</Kbd> analytics · <Kbd>M</Kbd> period · <Kbd>/</Kbd> search</>}
        tabs={[
          { id: 'stock', label: 'Stock', icon: Package, count: data?.total ?? null },
          { id: 'analytics', label: 'Analytics', icon: BarChart3 },
          ...(multi ? [{ id: 'branches', label: 'Branches', icon: Building2 }] : []),
          { id: 'period', label: 'Period ka hisaab', icon: CalendarClock },
          ...(config.extraTab ? [{ id: config.extraTab.id, label: config.extraTab.label, icon: config.extraTab.icon }] : []),
        ]} />

      {tab === 'analytics' ? (
        <StockAnalytics data={analyticsQ.data} loading={analyticsQ.isLoading} money={money} cost={cost} costHidden={costHidden}
          groupLabel={config.groups?.label} groupTitle={config.groups?.title} seasonLabel={config.seasonLabel} onOpen={setOpenId} />
      ) : tab === 'branches' ? (
        <BranchView data={branchesQ.data} loading={branchesQ.isLoading} money={money} cost={cost} costHidden={costHidden} onOpen={setOpenId} />
      ) : tab === 'period' ? (
        <LedgerView q={filters} show={ledgerShow} setShow={setLedgerShow} sort={ledgerSort} money={money} cost={cost} costHidden={costHidden} onOpen={setOpenId} />
      ) : ExtraTab && tab === config.extraTab?.id ? (
        <Suspense fallback={<Skeleton className="h-64 rounded-3xl" />}><ExtraTab /></Suspense>
      ) : listQ.isLoading ? (
        <div className="space-y-2 rounded-3xl bg-white p-4 ring-1 ring-slate-200/80">{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
      ) : listQ.error && !data ? (
        <div className="rounded-3xl bg-white px-6 py-14 text-center ring-1 ring-slate-200/80">
          <p className="font-semibold text-slate-900">Report nahi aa saki</p>
          <p className="mt-1 text-[0.875rem] text-slate-500">{(listQ.error as Error).message}</p>
          <div className="mt-4"><Button onClick={() => void listQ.refetch()}>Dobara koshish</Button></div>
        </div>
      ) : !items.length ? (
        <div className="flex flex-col items-center rounded-3xl bg-white px-6 py-16 text-center ring-1 ring-slate-200/80">
          <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-lg"><PackageX className="h-7 w-7" /></span>
          <h3 className="mt-4 text-lg font-semibold text-slate-900">{filtered ? 'Is filter me kuch nahi' : 'Abhi koi maal nahi'}</h3>
          <p className="mt-1 max-w-md text-[0.875rem] text-slate-500">{filtered ? 'Filter badal kar dekhein ya hata dein.' : 'Product banayein aur purchase se stock daalein — report khud ban jayegi.'}</p>
          <div className="mt-4">{filtered ? <Button variant="secondary" onClick={clear}>Filter hatayein</Button> : <Link to="/products/new" className="inline-flex h-10 items-center rounded-xl bg-brand-600 px-4 text-[0.875rem] font-semibold text-white hover:bg-brand-700">Product banayein</Link>}</div>
        </div>
      ) : (
        <section className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
          <div className={cn('hidden items-center gap-x-3 border-b border-slate-100 bg-slate-50/70 px-4 py-2.5 text-[0.6875rem] font-semibold uppercase tracking-wide text-slate-500 lg:grid', STOCK_GRID)}>
            <span>Cheez</span><span>Stock</span><span>{costHidden ? 'Qeemat' : 'Cost · bechne par'}</span><span>Sale · kitne din</span><span>Aakhri sale</span><span />
          </div>
          <ul className="divide-y divide-slate-100">
            {items.map((l) => (
              <StockRow key={l.productId} l={l} money={money} cost={cost} groupLabel={config.groups?.label} shopName={multi ? shopNameOf : undefined} onOpen={() => setOpenId(l.productId)} />
            ))}
          </ul>
        </section>
      )}

      {tab === 'stock' && data && data.pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((x) => x - 1)}>Pichla</Button>
          <span className="text-sm text-slate-600">Safha {page} / {data.pages}</span>
          <Button variant="secondary" size="sm" disabled={page >= data.pages} onClick={() => setPage((x) => x + 1)}>Agla</Button>
        </div>
      )}

      {openId && (
        <ItemDrawer productId={openId} query={{ from: filters.from, to: filters.to, deadDays }} money={money} cost={cost}
          deviceLink={config.deviceLink} onClose={() => setOpenId(null)} />
      )}

      {guide.isOpen && (
        <PageGuide title="Stock report — aasaan tareeqa" onClose={guide.close}
          steps={[
            { icon: Boxes, color: '#0f766e', title: 'Kitna paisa maal me hai', text: 'Upar cost (jitne me khareeda), bechne ki qeemat aur mumkin profit. Branch upar se badlein — har branch ka apna stock.' },
            { icon: CalendarRange, color: '#2563eb', title: 'Sale ki period', text: '"Sale ki period" se din chunein. Har cheez ki sale, kitne din chalega aur tez/dheema isi period se. Pichli itni hi period se muqabla hota hai.' },
            { icon: Hourglass, color: '#7c3aed', title: 'Dead aur purana maal', text: 'Jo kaafi din se nahi bika woh "Dead stock". Kitne din — filter se 30, 60, 90 ya 180 chunein. Discount ya supplier ko return sochein.' },
            { icon: AlertTriangle, color: '#d97706', title: 'Kam, khatam, expiry', text: 'Upar ke dabbe dabayein to list wahi dikhati hai. Order banana ho to "Reorder" button — Low stock page khulta hai.' },
            { icon: CalendarClock, color: '#be185d', title: 'Purani date ka stock', text: '"Period ka hisaab" tab: period ke pehle din kitna tha, kya aaya, kya bika, aur aakhri din kitna bacha. Kisi ek din ka stock dekhna ho to wahi din chunein.' },
            { icon: MousePointerClick, color: '#16a34a', title: 'Cheez kholein', text: 'Kisi line par click: branch war stock, batch, IMEI/serial, mahine war sale aur aakhri harkat.' },
            ...(config.guide ?? []),
          ]}
          tips={[
            'Cost ausat cost par hai — har purchase par purane aur naye maal ka ausat.',
            'Sale me wapas aaya maal minus hai aur void bill shamil nahi.',
            'CSV aur Print isi tab aur filter ka poora data dete hain.',
            ...(config.tips ?? []),
          ]}
          shortcuts={[['/', 'dhoondein'], ['A', 'analytics'], ...(multi ? [['B', 'branches'] as [string, string]] : []), ['M', 'period ka hisaab'], ['G', 'guide']]}
          footer={<span className="inline-flex items-center gap-1.5 text-[0.75rem] text-slate-500"><Search className="h-3.5 w-3.5" />Naam, SKU, barcode, brand se search</span>}
        />
      )}
    </PageShell>
  );
}
