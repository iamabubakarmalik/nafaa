/**
 * Profit by product for every industry: what each product, variant,
 * category, brand, supplier, staff member and day earned in a period, after
 * discounts and returns, at the cost saved on each bill line; loss-making
 * items, what discounts and returns took, top earners against top sellers,
 * and net profit after expenses and stock written off — all against the
 * previous period. Industries add their own tab through config.
 *
 * Keys: / search · A analytics · G guide.
 */

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  AlertTriangle, ArrowDownWideNarrow, BarChart3, Calculator, CalendarDays, CalendarRange, Download, Flame, GraduationCap, Layers, ListChecks, ListFilter,
  Package, Receipt, RefreshCw, RotateCcw, Scale, Search, Sparkles, Tag, Truck, UserRound, Wallet,
} from 'lucide-react';
import {
  Button, DateRangeMenu, FilterBar, FilterChip, FilterMenu, Kbd, KpiCard, KpiRow, PageHero, PageShell, SearchField, Skeleton, ViewTabs,
  heroButton, heroIconButton, resolveRange,
} from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { PrintButton } from '@core/print';
import { PrivacyToggle } from '@core/security/HiddenValue';
import { businessDayKey, useBusinessDayStart } from '@core/lib/business-day';
import { rangeLabel } from '@core/lib/dateRange';
import { isDialogOpen, isTyping } from '@core/lib/shortcuts';
import { cn } from '@core/lib/cn';
import { useAuthStore, useIsAllShops, useShopParam } from '@core/stores/auth.store';
import { useReportMasked, useReportRange } from '@modules/reports/prefs';
import { categoriesApi } from '@modules/inventory/categories/api/categories.api';
import { brandsApi } from '@modules/inventory/brands/api/brands.api';
import { teamApi } from '@modules/organization/team/api/team.api';
import { PROFIT_KEY, profitApi, type ProfitFilters, type ProfitSort, type ProfitView } from '../api';
import { useProfitConfig, type ProfitFmt } from '../config';
import { DayTable, DimTable } from '../components/DimTable';
import { ProductHeader, ProductRow, ProductTotals } from '../components/ProductRows';
import { NetCard, ProfitAnalytics } from '../components/ProfitAnalytics';
import { COST_SORTS, SORTS, VIEWS, change, changeText, pct } from '../components/meta';
import { profitCsv, profitDoc } from '../components/print';

export default function ProfitReportPage() {
  const config = useProfitConfig();
  const qc = useQueryClient();
  const shop = useShopParam();
  const isAll = useIsAllShops();
  const tenantName = useAuthStore((s) => s.tenant?.name ?? '');
  const shopName = useAuthStore((s) => s.user?.assignedShop?.name);
  const startHour = useBusinessDayStart();
  const { sales: money, cost, costHidden } = useReportMasked();
  const fmt: ProfitFmt = { money, cost, costHidden };
  const guide = usePageGuide();
  const searchRef = useRef<HTMLInputElement>(null);

  const [range, setRange] = useReportRange('month');
  const [categoryId, setCategoryId] = useState<string>();
  const [brandId, setBrandId] = useState<string>();
  const [staffId, setStaffId] = useState<string>();
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<ProfitSort>('profit');
  const [view, setView] = useState<ProfitView>('all');
  const [page, setPage] = useState(1);
  const [tab, setTab] = useState<string>('items');
  const [exporting, setExporting] = useState(false);

  // Cost-based sorts and views make no sense while cost is hidden.
  const sortNow: ProfitSort = costHidden && COST_SORTS.includes(sort) ? 'revenue' : sort;
  const viewNow: ProfitView = costHidden && VIEWS.find((v) => v.value === view)?.cost ? 'all' : view;

  useEffect(() => { const t = setTimeout(() => setQuery(search.trim()), 250); return () => clearTimeout(t); }, [search]);
  useEffect(() => { setPage(1); }, [range, categoryId, brandId, staffId, query, sortNow, viewNow, shop]);

  const period = resolveRange(range, startHour) ?? { from: businessDayKey(new Date(), startHour), to: businessDayKey(new Date(), startHour) };
  const filters: ProfitFilters = useMemo(
    () => ({ from: period.from, to: period.to, categoryId, brandId, staffId }),
    [period.from, period.to, categoryId, brandId, staffId],
  );
  const label = rangeLabel(period.from, period.to);

  const overviewQ = useQuery({
    queryKey: [PROFIT_KEY, 'overview', shop, filters],
    queryFn: () => profitApi.overview(filters),
    placeholderData: (prev) => prev,
  });
  const itemsQ = useQuery({
    queryKey: [PROFIT_KEY, 'items', shop, filters, query, sortNow, viewNow, page],
    queryFn: () => profitApi.items({ ...filters, search: query || undefined, sort: sortNow, view: viewNow, page, limit: 40 }),
    enabled: tab === 'items',
    placeholderData: (prev) => prev,
  });
  const { data: categories = [] } = useQuery({ queryKey: ['categories'], queryFn: categoriesApi.list, staleTime: 5 * 60_000 });
  const { data: brands = [] } = useQuery({ queryKey: ['brands'], queryFn: () => brandsApi.list(), staleTime: 5 * 60_000 });
  const { data: team = [] } = useQuery({ queryKey: ['team'], queryFn: () => teamApi.list().catch(() => []), staleTime: 5 * 60_000 });

  const o = overviewQ.data;
  const t = o?.totals;
  const cb = o?.costBasis;
  const scopeText = isAll ? `${tenantName} · sab branches` : shopName ?? tenantName;
  const filtered = !!categoryId || !!brandId || !!staffId || !!query || viewNow !== 'all';

  const clear = () => { setCategoryId(undefined); setBrandId(undefined); setStaffId(undefined); setSearch(''); setView('all'); };
  const showView = (v: ProfitView) => { setTab('items'); setView((x) => (x === v ? 'all' : v)); };
  const refresh = () => qc.invalidateQueries({ queryKey: [PROFIT_KEY] });

  const exportCsv = async () => {
    setExporting(true);
    try {
      const all = await profitApi.items({ ...filters, search: query || undefined, sort: sortNow, view: viewNow, limit: 5000 });
      if (!all.items.length) { toast.error('Is filter me kuch nahi'); return; }
      profitCsv(all.items, [`Profit report — ${scopeText}`, `Period: ${label}`], !costHidden);
      toast.success(`${all.items.length} cheezein CSV me`);
    } catch { toast.error('Export nahi hua'); } finally { setExporting(false); }
  };
  const printDoc = async () => {
    const [ov, list] = await Promise.all([
      o ?? profitApi.overview(filters),
      profitApi.items({ ...filters, search: query || undefined, sort: sortNow, view: viewNow, limit: 500 }),
    ]);
    return profitDoc(ov, list.items, label, scopeText, !costHidden);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping() || isDialogOpen()) return;
      if (e.key === '/') { e.preventDefault(); setTab('items'); window.setTimeout(() => searchRef.current?.focus(), 0); }
      else if (e.key.toLowerCase() === 'a') setTab((x) => (x === 'analytics' ? 'items' : 'analytics'));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const growth = (now?: number, before?: number) => changeText(change(now, before));
  const ExtraTab = config.extraTab?.Component;
  const itemWord = config.itemWord ?? 'Cheez';
  const savedShare = cb && cb.lines > 0 ? (cb.savedLines / cb.lines) * 100 : 100;

  return (
    <PageShell>
      <PageHero
        title="Profit — cheez war"
        chip={<><CalendarRange />{label}</>}
        busy={overviewQ.isFetching && !overviewQ.isLoading}
        meta={`${config.label} · ${scopeText}`}
        loading={overviewQ.isLoading}
        actions={<>
          <PrivacyToggle compact />
          <button type="button" onClick={() => void exportCsv()} disabled={exporting || !t?.products} className={heroButton}><Download className="h-4 w-4" />{exporting ? 'Ban raha…' : 'CSV'}</button>
          <span className="[&_button]:border-white/25 [&_button]:bg-white [&_button]:text-slate-800"><PrintButton doc={printDoc} disabled={!t?.products} /></span>
          <button type="button" onClick={() => void refresh()} title="Taaza karein" aria-label="Taaza karein" className={heroIconButton}><RefreshCw className={cn('h-4 w-4', overviewQ.isFetching && 'animate-spin')} /></button>
          <button type="button" onClick={guide.open} title="Guide (G)" aria-label="Guide" className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
        </>}
        stats={o && t ? [
          { label: `Asal sale · ${t.bills} bill`, value: money(t.revenue), hint: `${growth(t.revenue, o.prev.revenue)} pichhli period se` },
          { label: 'Gross profit', value: cost(t.profit), hint: costHidden ? 'Cost lock' : `${pct(t.margin)} margin · ${growth(t.profit, o.prev.profit)}` },
          { label: 'Net profit', value: cost(o.net.netProfit), hint: 'expenses, stock nuksan/faida aur doosri aamdani ke baad' },
          { label: 'Cheezein biki', value: String(t.products), hint: `pehle ${o.prev.products}` },
        ] : [{ label: 'Asal sale', value: '' }, { label: 'Gross profit', value: '' }, { label: 'Net profit', value: '' }, { label: 'Cheezein biki', value: '' }]}
      />

      <KpiRow>
        {!o || !t ? Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-[5.25rem] rounded-2xl" />) : (
          <>
            <KpiCard icon={Sparkles} color="#db2777" label="Discount" value={money(t.discount)} active={viewNow === 'discount'} onClick={() => showView('discount')}
              hint={t.gross > 0 ? `list rate ka ${((t.discount / t.gross) * 100).toFixed(1)}% · dabayein` : 'koi discount nahi'} />
            <KpiCard icon={RotateCcw} color="#ea580c" label="Return" value={money(t.refund)} active={viewNow === 'returns'} onClick={() => showView('returns')}
              hint={costHidden ? `${Number(t.returnedQty.toFixed(2))} cheezein wapas` : `profit ${cost(t.returnProfit)} kam hua`} />
            <KpiCard icon={Flame} color="#e11d48" label="Nuqsan wali cheezein" value={costHidden ? '••' : String(o.losses.count)} active={viewNow === 'loss'}
              onClick={costHidden ? undefined : () => showView('loss')} hint={costHidden ? 'Cost lock' : o.losses.count ? `kul ${cost(o.losses.amount)}` : 'koi nahi'} />
            <KpiCard icon={Receipt} color="#7c3aed" label="Expenses" value={money(o.net.expenses)} hint={`pehle ${money(o.prevNet.expenses)}`} />
            <KpiCard icon={Scale} color={savedShare >= 95 ? '#16a34a' : '#d97706'} label="Bill ki cost se" value={costHidden ? '••' : `${savedShare.toFixed(0)}%`} active={viewNow === 'fallback'}
              onClick={costHidden || !cb?.fallbackLines ? undefined : () => showView('fallback')}
              hint={costHidden ? 'Cost lock' : cb?.fallbackLines ? `${cb.fallbackLines} lines aaj ki cost se` : 'har line ki apni cost'} />
          </>
        )}
      </KpiRow>

      {!costHidden && cb && (cb.fallbackLines > 0 || cb.noCostLines > 0) && (
        <div className="flex flex-wrap items-start gap-2 rounded-2xl bg-amber-50 px-4 py-3 text-[0.8125rem] text-amber-900 ring-1 ring-amber-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p className="min-w-0 flex-1">
            Profit har bill line par us waqt ki saved cost se nikalta hai.
            {cb.fallbackLines > 0 && <> {cb.fallbackLines} purani lines par cost save nahi thi — wahan <b>aaj ki cost</b> lagayi ({money(cb.fallbackRevenue)} ki sale).</>}
            {cb.noCostLines > 0 && <> {cb.noCostLines} lines ({cb.noCostProducts} cheezein) ki cost hi nahi bhari — un ka profit poora dikh raha hai.</>}
          </p>
          <span className="flex gap-1.5">
            {cb.fallbackLines > 0 && <Button size="sm" variant="secondary" onClick={() => showView('fallback')}>Dekhein</Button>}
            {cb.noCostLines > 0 && <Button size="sm" variant="secondary" onClick={() => showView('nocost')}>Bina cost</Button>}
          </span>
        </div>
      )}

      <FilterBar
        search={<SearchField ref={searchRef} value={search} onChange={(v) => { setSearch(v); setTab('items'); }} placeholder="Naam, SKU, variant, brand ya supplier…" label="Cheez search" />}
        chips={filtered ? <>
          {viewNow !== 'all' && <FilterChip onRemove={() => setView('all')}>{VIEWS.find((v) => v.value === viewNow)?.label}</FilterChip>}
          {categoryId && <FilterChip onRemove={() => setCategoryId(undefined)}>{categories.find((c) => c.id === categoryId)?.name ?? 'Category'}</FilterChip>}
          {brandId && <FilterChip onRemove={() => setBrandId(undefined)}>{brands.find((b) => b.id === brandId)?.name ?? 'Brand'}</FilterChip>}
          {staffId && <FilterChip onRemove={() => setStaffId(undefined)}>{team.find((m) => m.id === staffId)?.fullName ?? 'Staff'}</FilterChip>}
          {query && <FilterChip onRemove={() => setSearch('')}>"{query}"</FilterChip>}
        </> : undefined}
        onClear={clear}>
        <DateRangeMenu value={range} onChange={setRange} startHour={startHour} allowAll={false} defaultPreset="month" />
        <FilterMenu icon={ListFilter} label="Dikhayein" value={viewNow} active={viewNow !== 'all'} width="w-72"
          options={VIEWS.filter((v) => !costHidden || !v.cost).map((v) => ({ value: v.value, label: v.label, hint: v.hint, color: v.color }))} onChange={(v) => { setTab('items'); setView(v); }} />
        {categories.length > 0 && (
          <FilterMenu icon={Layers} label="Category" value={categoryId ?? 'all'} active={!!categoryId} width="w-72"
            options={[{ value: 'all', label: 'Sab category' }, ...categories.map((c) => ({ value: c.id, label: c.name, color: c.color }))]}
            onChange={(v) => setCategoryId(v === 'all' ? undefined : v)} />
        )}
        {brands.length > 0 && (
          <FilterMenu icon={Tag} label="Brand" value={brandId ?? 'all'} active={!!brandId} width="w-64"
            options={[{ value: 'all', label: 'Sab brand' }, ...brands.map((b) => ({ value: b.id, label: b.name }))]}
            onChange={(v) => setBrandId(v === 'all' ? undefined : v)} />
        )}
        {team.length > 1 && (
          <FilterMenu icon={UserRound} label="Staff" value={staffId ?? 'all'} active={!!staffId}
            options={[{ value: 'all', label: 'Sab staff' }, ...team.map((m) => ({ value: m.id, label: m.fullName }))]}
            onChange={(v) => setStaffId(v === 'all' ? undefined : v)} />
        )}
        <FilterMenu icon={ArrowDownWideNarrow} label="Sort" value={sortNow} align="right" width="w-64"
          options={SORTS.filter((s) => !costHidden || !COST_SORTS.includes(s.value))} onChange={(v) => { setTab('items'); setSort(v); }} />
      </FilterBar>

      <ViewTabs value={tab} onChange={setTab} hint={<><Kbd>A</Kbd> analytics · <Kbd>/</Kbd> search</>}
        tabs={[
          { id: 'items', label: itemWord === 'Cheez' ? 'Cheezein' : `${itemWord}`, icon: Package, count: itemsQ.data?.total ?? t?.products ?? null },
          { id: 'category', label: 'Category', icon: Layers },
          { id: 'brand', label: 'Brand', icon: Tag },
          { id: 'supplier', label: 'Supplier', icon: Truck },
          { id: 'staff', label: 'Staff', icon: UserRound },
          { id: 'day', label: 'Din war', icon: CalendarDays },
          { id: 'analytics', label: 'Analytics', icon: BarChart3 },
          ...(config.extraTab ? [{ id: config.extraTab.id, label: config.extraTab.label, icon: config.extraTab.icon }] : []),
        ]} />

      {tab === 'analytics' ? (
        <ProfitAnalytics data={o} loading={overviewQ.isLoading} fmt={fmt} />
      ) : ExtraTab && tab === config.extraTab?.id ? (
        <Suspense fallback={<Skeleton className="h-64 rounded-3xl" />}><ExtraTab filters={filters} fmt={fmt} /></Suspense>
      ) : tab !== 'items' ? (
        !o ? <Skeleton className="h-64 rounded-3xl" />
          : tab === 'category' ? <DimTable rows={o.byCategory} title="Category" fmt={fmt} onPick={(r) => { setCategoryId(r.id); setTab('items'); }} />
          : tab === 'brand' ? <DimTable rows={o.byBrand} title="Brand" fmt={fmt} onPick={(r) => { setBrandId(r.id); setTab('items'); }} />
          : tab === 'supplier' ? <DimTable rows={o.bySupplier} title="Supplier" fmt={fmt} note="Har cheez us supplier ke naam jis se aakhri dafa khareedi." />
          : tab === 'staff' ? <DimTable rows={o.byStaff} title="Staff" fmt={fmt} note="Bill jis ke naam bana (counter par becha)." onPick={(r) => { setStaffId(r.id); setTab('items'); }} />
          : (
            <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
              <DayTable data={o} fmt={fmt} />
              <NetCard data={o} fmt={fmt} />
            </div>
          )
      ) : itemsQ.isLoading ? (
        <div className="space-y-2 rounded-3xl bg-white p-4 ring-1 ring-slate-200/80">{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
      ) : itemsQ.error && !itemsQ.data ? (
        <div className="rounded-3xl bg-white px-6 py-14 text-center ring-1 ring-slate-200/80">
          <p className="font-semibold text-slate-900">Report nahi aa saki</p>
          <p className="mt-1 text-[0.875rem] text-slate-500">{(itemsQ.error as Error).message}</p>
          <div className="mt-4"><Button onClick={() => void itemsQ.refetch()}>Dobara koshish</Button></div>
        </div>
      ) : !itemsQ.data?.items.length ? (
        <div className="flex flex-col items-center rounded-3xl bg-white px-6 py-16 text-center ring-1 ring-slate-200/80">
          <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-brand-fg shadow-lg"><Wallet className="h-7 w-7" /></span>
          <h3 className="mt-4 text-lg font-semibold text-slate-900">{filtered ? 'Is filter me kuch nahi' : 'Is period me koi sale nahi'}</h3>
          <p className="mt-1 max-w-md text-[0.875rem] text-slate-500">{filtered ? 'Filter badal kar dekhein ya hata dein.' : 'Period badlein — "Date" se 30 din, is mahine ya apni date chunein.'}</p>
          {filtered && <div className="mt-4"><Button variant="secondary" onClick={clear}>Filter hatayein</Button></div>}
        </div>
      ) : (
        <section className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
          <ProductHeader itemWord={itemWord} />
          <ul className="divide-y divide-slate-100">
            {itemsQ.data.items.map((r) => <ProductRow key={r.key} r={r} fmt={fmt} />)}
          </ul>
          {/* Totals only add up for the full list, not a filtered one. */}
          {t && !filtered && <ProductTotals totals={t} fmt={fmt} />}
        </section>
      )}

      {tab === 'items' && itemsQ.data && itemsQ.data.pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((x) => x - 1)}>Pichla</Button>
          <span className="text-sm text-slate-600">Safha {page} / {itemsQ.data.pages}</span>
          <Button variant="secondary" size="sm" disabled={page >= itemsQ.data.pages} onClick={() => setPage((x) => x + 1)}>Agla</Button>
        </div>
      )}

      {guide.isOpen && (
        <PageGuide title="Profit report — aasaan tareeqa" onClose={guide.close}
          steps={[
            { icon: CalendarRange, color: '#2563eb', title: 'Period chunein', text: '"Date" se aaj, 7 din, is mahine ya apni date. Har number ke saath pichhli utni hi period ka muqabla hai.' },
            { icon: Wallet, color: '#16a34a', title: 'Asal sale aur profit', text: 'Asal sale = list rate − discount − return. Profit = asal sale − maal ki cost. Cost wohi jo bill bante waqt us cheez ki thi.' },
            { icon: Scale, color: '#d97706', title: 'Net profit', text: 'Gross profit me se expenses aur kharab / gum maal (stock adjustment) nikaal kar asal bachat. "Din war" aur "Analytics" me poora hisaab.' },
            { icon: Calculator, color: '#0f766e', title: 'Hisaab kaise', text: 'Asal sale = bill − return (void bill nahi gine jate). Bill par lage service charges (delivery, fitting) bhi sale me judte hain — cheezon ki list ke neeche alag dikhte hain. Cost = bill bante waqt ki cost; cost na likhi ho to aaj ki cost. Expenses sirf jo ada ho chuke (pending nahi). Net profit = profit − expenses − kharab, gum ya ginti me kam maal. Return us bill ke din me ginta hai jis ka maal tha. Reports, Profit report, P&L aur Dashboard sab yahi hisaab lagate hain.' },
            { icon: Flame, color: '#e11d48', title: 'Nuqsan aur discount', text: 'Upar ke dabbe dabayein: Discount wali, Return wali, Nuqsan wali cheezein. Sirf wohi list me aa jati hain.' },
            { icon: Layers, color: '#7c3aed', title: 'Kis cheez se kamai', text: 'Tabs: Category, Brand, Supplier, Staff, Din war. Category, brand ya staff par click karein to us ka filter lag jata hai.' },
            { icon: ListChecks, color: '#0891b2', title: 'Variant aur export', text: 'Jis cheez ke variant hon us ke teer par click karein — har size / rang ka profit. CSV aur Print/PDF me poori list.' },
            ...(config.guide ?? []),
          ]}
          tips={[
            'Jin purane bills par cost save nahi thi, un par aaj ki cost lagti hai — peeli patti batati hai kitni lines aisi hain.',
            'Jis cheez ki cost bhari hi nahi us ka profit 100% dikhta hai. "Bina cost" list se cost bharein.',
            'Return usi bill ki period me ginti hai jis bill ka maal tha. Void bill shamil nahi.',
            ...(config.tips ?? []),
          ]}
          shortcuts={[['/', 'dhoondein'], ['A', 'analytics'], ['G', 'guide']]}
          footer={<span className="inline-flex items-center gap-1.5 text-[0.75rem] text-slate-500"><Search className="h-3.5 w-3.5" />Naam, SKU, variant, brand ya supplier se search</span>}
        />
      )}
    </PageShell>
  );
}
