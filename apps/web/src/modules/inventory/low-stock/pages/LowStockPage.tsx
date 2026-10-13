/**
 * Low stock and reorder for every industry: what is out, low, running out
 * soon or near expiry in each branch, how many days the rest lasts at the
 * recent selling rate, and what to order from whom. Lines turn into purchase
 * orders (grouped by supplier), WhatsApp messages or a printed reorder
 * sheet. Industries add their own warnings and tabs through config.
 *
 * Keys: / search · R reorder list · A analytics · G guide.
 */

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  AlertTriangle, ArrowDownWideNarrow, BarChart3, Check, Clock, Download, EyeOff, GraduationCap, Layers, ListChecks, ListFilter,
  MessageCircle, MousePointerClick, PackageCheck, PackagePlus, RefreshCw, Search, ShoppingCart, SlidersHorizontal, Truck, X,
} from 'lucide-react';
import {
  Button, FilterBar, FilterChip, FilterMenu, Kbd, KpiCard, KpiRow, PageHero, PageShell, SearchField, Skeleton, ViewTabs,
  heroButton, heroIconButton, heroPrimaryButton, type FilterOption,
} from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { PrintButton } from '@core/print';
import { PrivacyToggle } from '@core/security/HiddenValue';
import { useAnyPermission, usePermission } from '@core/hooks/usePermission';
import { PERMISSIONS } from '@core/lib/permissions';
import { isDialogOpen, isTyping } from '@core/lib/shortcuts';
import { waLink } from '@core/lib/whatsapp/templates';
import { cn } from '@core/lib/cn';
import { useAuthStore, useIsAllShops, useShopParam } from '@core/stores/auth.store';
import { useMasked } from '@modules/dashboard/engine/useMasked';
import { StockModal } from '@modules/inventory/products/list/components/StockModal';
import { LOW_KEY, lowStockApi, type LowRow, type LowSettings, type LowSort, type LowStatusFilter } from '../api';
import { useLowStockConfig } from '../config';
import { LINE_GRID, LineRow } from '../components/LineRow';
import { LowStockAnalytics } from '../components/LowStockAnalytics';
import { OrderModal } from '../components/OrderModal';
import { ReorderView } from '../components/ReorderView';
import { SettingsModal } from '../components/SettingsModal';
import { DEFAULT_SETTINGS, STATUS, groupBySupplier, itemMessage, openWhatsApp, qty, type OrderGroup } from '../components/meta';
import { alertsCsv, alertsDoc } from '../components/print';
import { useOrderHandoff } from '../components/useOrderHandoff';

const SETTINGS_KEY = 'nafaa-low-stock-settings';
const SORTS: Array<FilterOption<LowSort>> = [
  { value: 'urgency', label: 'Sab se zaroori pehle', hint: 'Khatam, phir kam, phir jaldi khatam' },
  { value: 'lost', label: 'Zyada ruki sale pehle', hint: 'Jo khatam hai aur bikta tha' },
  { value: 'daysLeft', label: 'Kam din ka maal pehle' },
  { value: 'value', label: 'Bara order pehle' },
  { value: 'stock', label: 'Kam stock pehle' },
  { value: 'name', label: 'Naam (A–Z)' },
];

function loadSettings(base: LowSettings): LowSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? { ...base, ...JSON.parse(raw) } : base;
  } catch { return base; }
}

export default function LowStockPage() {
  const config = useLowStockConfig();
  const qc = useQueryClient();
  const shopParam = useShopParam();
  const isAll = useIsAllShops();
  const tenantName = useAuthStore((s) => s.tenant?.name ?? '');
  const shopName = useAuthStore((s) => s.user?.assignedShop?.name);
  const { sales: money, cost, costHidden } = useMasked();
  const can = {
    order: usePermission(PERMISSIONS.PURCHASES_CREATE),
    alert: usePermission(PERMISSIONS.PRODUCTS_EDIT),
    stock: useAnyPermission(useMemo(() => [PERMISSIONS.STOCK_ADJUSTMENTS_MANAGE, PERMISSIONS.PRODUCTS_EDIT], [])),
  };
  const handoff = useOrderHandoff();
  const guide = usePageGuide();
  const searchRef = useRef<HTMLInputElement>(null);

  const defaults = useMemo(() => ({ ...DEFAULT_SETTINGS, ...config.defaults }), [config.defaults]);
  const [settings, setSettings] = useState<LowSettings>(() => loadSettings(defaults));
  const [status, setStatus] = useState<LowStatusFilter>('all');
  const [categoryId, setCategoryId] = useState<string>();
  const [supplierId, setSupplierId] = useState<string>();
  const [group, setGroup] = useState<string>();
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<LowSort>('urgency');
  const [page, setPage] = useState(1);
  const [tab, setTab] = useState<string>('alerts');
  const [selected, setSelected] = useState<Map<string, LowRow>>(new Map());
  const [stockRow, setStockRow] = useState<LowRow | null>(null);
  const [orderGroups, setOrderGroups] = useState<OrderGroup[] | null>(null);
  const [editSettings, setEditSettings] = useState(false);
  const [qtyEdits, setQtyEdits] = useState<Record<string, number>>({});
  const [removed, setRemoved] = useState<Set<string>>(new Set());
  const [exporting, setExporting] = useState(false);

  useEffect(() => { const t = setTimeout(() => setQuery(search.trim()), 250); return () => clearTimeout(t); }, [search]);
  useEffect(() => { setPage(1); }, [status, categoryId, supplierId, group, query, sort, settings, shopParam]);

  const filters = { ...settings, categoryId, supplierId, group, search: query || undefined };
  const listQ = useQuery({
    queryKey: [LOW_KEY, 'list', shopParam, filters, status, sort, page],
    queryFn: () => lowStockApi.list({ ...filters, status, sort, page, limit: 30 }),
    placeholderData: (prev) => prev,
  });
  const reorderQ = useQuery({
    queryKey: [LOW_KEY, 'reorder', shopParam, filters],
    queryFn: () => lowStockApi.list({ ...filters, view: 'reorder', limit: 500 }),
    enabled: tab === 'reorder',
  });
  const analyticsQ = useQuery({
    queryKey: [LOW_KEY, 'analytics', shopParam, filters],
    queryFn: () => lowStockApi.analytics(filters),
    enabled: tab === 'analytics',
  });
  const data = listQ.data;
  const counts = data?.counts;
  const totals = data?.totals;
  const showShop = isAll && (data?.facets.shops.length ?? 0) > 1;
  const shopLabel = `${tenantName}${shopName && !isAll ? ` · ${shopName}` : ''}`;

  const refresh = () => qc.invalidateQueries({ queryKey: [LOW_KEY] });
  const alertM = useMutation({
    mutationFn: ({ r, alert }: { r: LowRow; alert: number }) => lowStockApi.setAlert(r.productId, alert, r.shopId),
    onSuccess: () => { toast.success('Alert level badal gaya'); void refresh(); },
    onError: (e: { response?: { data?: { message?: string } } }) => toast.error(e?.response?.data?.message ?? 'Alert level nahi badla'),
  });
  const ignoreM = useMutation({
    mutationFn: ({ rows, ignore }: { rows: LowRow[]; ignore: boolean }) => Promise.all(rows.map((r) => lowStockApi.ignore(r.productId, ignore, r.shopId))),
    onSuccess: (_d, v) => {
      toast.success(v.ignore ? `${v.rows.length} line chhup gayi — stock theek hone par khud hat jayengi` : 'Line wapas aa gayi');
      setSelected(new Map());
      void refresh();
    },
    onError: () => toast.error('Nahi ho saka'),
  });

  const saveSettings = (v: LowSettings) => {
    setSettings(v);
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(v)); } catch { /* storage blocked */ }
    setEditSettings(false);
  };
  const clear = () => { setStatus('all'); setCategoryId(undefined); setSupplierId(undefined); setGroup(undefined); setSearch(''); };
  const filtered = status !== 'all' || !!categoryId || !!supplierId || !!group || !!query;

  const toggle = (r: LowRow) => setSelected((m) => { const n = new Map(m); if (n.has(r.key)) n.delete(r.key); else n.set(r.key, r); return n; });
  const visible = data?.items ?? [];
  const allVisible = visible.length > 0 && visible.every((r) => selected.has(r.key));
  const selectVisible = () => setSelected((m) => {
    const n = new Map(m);
    if (allVisible) visible.forEach((r) => n.delete(r.key)); else visible.forEach((r) => n.set(r.key, r));
    return n;
  });

  const orderSelected = () => {
    const rows = [...selected.values()].filter((r) => !r.made && r.suggestQty > 0);
    if (!rows.length) { toast.error('Chuni hui lines me mangwane ke liye kuch nahi'); return; }
    const groups = groupBySupplier(rows);
    if (groups.length === 1) handoff(groups[0]); else setOrderGroups(groups);
  };
  const whatsAppSelected = () => {
    const rows = [...selected.values()];
    const text = [`${shopLabel} — list:`, '', ...rows.map((r, i) => `${i + 1}. ${r.name} — ${r.made ? 'banana' : 'mangwana'} ${qty(r.suggestQty || Math.max(r.alert - r.stock, 1))} ${r.unit}`)].join('\n');
    const phones = new Set(rows.map((r) => r.supplier?.phone).filter(Boolean));
    openWhatsApp(phones.size === 1 ? waLink([...phones][0], text) : null, text);
  };

  const qtyOf = (r: LowRow) => qtyEdits[r.key] ?? r.suggestQty;
  const exportCsv = async () => {
    setExporting(true);
    try {
      const all = await lowStockApi.list({ ...filters, status, sort, limit: 500 });
      if (!all.items.length) { toast.error('Is filter me kuch nahi'); return; }
      alertsCsv(all.items, [`Low stock — ${shopLabel}`, `Sale ${settings.days} din · order ${settings.targetDays} din ka`], !costHidden);
      toast.success(`${all.items.length} lines CSV me`);
    } catch { toast.error('Export nahi hua'); } finally { setExporting(false); }
  };
  const filterText = [status !== 'all' && (status === 'ordered' ? 'Order me' : status === 'ignored' ? 'Chhupi hui' : STATUS[status].label), query && `"${query}"`].filter(Boolean).join(' · ');
  const printDoc = async () => alertsDoc(await lowStockApi.list({ ...filters, status, sort, limit: 500 }), filterText, !costHidden);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping() || isDialogOpen()) return;
      const k = e.key.toLowerCase();
      if (e.key === '/') { e.preventDefault(); setTab('alerts'); window.setTimeout(() => searchRef.current?.focus(), 0); }
      else if (k === 'r') setTab((t) => (t === 'reorder' ? 'alerts' : 'reorder'));
      else if (k === 'a') setTab((t) => (t === 'analytics' ? 'alerts' : 'analytics'));
      else if (e.key === 'Escape' && selected.size) setSelected(new Map());
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selected.size]);

  const statusOptions: Array<FilterOption<LowStatusFilter>> = [
    { value: 'all', label: 'Sab', icon: ListChecks, color: '#475569' },
    ...(['out', 'low', 'soon', 'expiry'] as const).map((k) => ({ value: k, label: STATUS[k].label, icon: STATUS[k].icon, color: STATUS[k].color, hint: `${counts?.[k] ?? 0}` })),
    ...(config.statuses ?? []).map((k) => ({ value: k, label: STATUS[k].label, icon: STATUS[k].icon, color: STATUS[k].color, hint: `${counts?.[k] ?? 0}` })),
    { value: 'ordered', label: 'Order me', icon: Truck, color: '#0284c7', hint: `${counts?.ordered ?? 0} — supplier se aana baqi` },
    { value: 'ignored', label: 'Chhupi hui', icon: EyeOff, color: '#94a3b8', hint: `${counts?.ignored ?? 0}` },
  ];
  const kpi = (k: 'out' | 'low' | 'soon' | 'expiry', hint: string) => (
    <KpiCard key={k} icon={STATUS[k].icon} color={STATUS[k].color} label={STATUS[k].label} value={String(counts?.[k] ?? 0)}
      hint={status === k ? 'Filter laga · dobara dabayein' : hint} active={status === k}
      onClick={() => { setTab('alerts'); setStatus((s) => (s === k ? 'all' : k)); }} />
  );
  const Banner = config.Banner;
  const ExtraTab = config.extraTab?.Component;

  return (
    <PageShell>
      <PageHero
        title="Low stock aur reorder"
        chip={<><AlertTriangle />{counts ? `${counts.all} cheezein` : '…'}</>}
        busy={listQ.isFetching && !listQ.isLoading}
        meta={`${config.label} · ${isAll ? 'Sab branches' : shopName ?? tenantName}`}
        loading={listQ.isLoading}
        actions={<>
          <PrivacyToggle compact />
          <button type="button" onClick={() => void exportCsv()} disabled={exporting} className={heroButton}><Download className="h-4 w-4" />{exporting ? 'Ban raha…' : 'CSV'}</button>
          <span className="[&_button]:border-white/25 [&_button]:bg-white [&_button]:text-slate-800"><PrintButton doc={printDoc} disabled={!data?.items.length} /></span>
          <button type="button" onClick={() => setEditSettings(true)} title="Hisaab ki settings" aria-label="Hisaab ki settings" className={heroIconButton}><SlidersHorizontal className="h-4 w-4" /></button>
          <button type="button" onClick={() => void refresh()} title="Taaza karein" aria-label="Taaza karein" className={heroIconButton}><RefreshCw className={cn('h-4 w-4', listQ.isFetching && 'animate-spin')} /></button>
          <button type="button" onClick={guide.open} title="Guide (G)" aria-label="Guide" className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
          <button type="button" onClick={() => setTab('reorder')} title="Reorder list (R)" className={heroPrimaryButton}><ShoppingCart className="h-4 w-4" />Order banayein</button>
        </>}
        stats={totals ? [
          { label: 'Order ka expense', value: cost(totals.orderValue), hint: `${totals.orderLines} cheezein · ${settings.targetDays} din ka maal` },
          { label: 'Ruki hui sale', value: money(totals.lostPerDay), hint: 'roz — khatam maal ki wajah se' },
          { label: 'Expiry ka maal', value: cost(totals.expiryValue), hint: `${settings.expiryDays} din me` },
          { label: 'Order me', value: String(counts?.ordered ?? 0), hint: 'cheezein supplier se aani hain' },
        ] : [{ label: 'Order ka expense', value: '' }, { label: 'Ruki hui sale', value: '' }, { label: 'Expiry ka maal', value: '' }, { label: 'Order me', value: '' }]}
      />

      <KpiRow>
        {!counts || !totals ? Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-[5.25rem] rounded-2xl" />) : (
          <>
            {kpi('out', totals.lostPerDay > 0 ? `roz ${money(totals.lostPerDay)} ki sale ruki` : 'dabayein')}
            {kpi('low', 'alert level se neeche')}
            {kpi('soon', `${settings.soonDays} din ya kam ka maal`)}
            {kpi('expiry', `${settings.expiryDays} din me expiry`)}
            <KpiCard icon={ShoppingCart} color="#2563eb" label="Reorder" value={cost(totals.orderValue)}
              hint={`${totals.orderLines} cheezein${totals.noSupplier ? ` · ${totals.noSupplier} baghair supplier` : ''}`} onClick={() => setTab('reorder')} active={tab === 'reorder'} />
          </>
        )}
      </KpiRow>

      {Banner && data && <Suspense fallback={null}><Banner data={data} setStatus={(s) => { setTab('alerts'); setStatus(s); }} openTab={setTab} /></Suspense>}

      <FilterBar
        search={<SearchField ref={searchRef} value={search} onChange={setSearch} placeholder="Naam, SKU, barcode ya supplier…" label="Low stock search" />}
        chips={filtered ? <>
          {status !== 'all' && <FilterChip onRemove={() => setStatus('all')}>{statusOptions.find((o) => o.value === status)?.label}</FilterChip>}
          {categoryId && <FilterChip onRemove={() => setCategoryId(undefined)}>{data?.facets.categories.find((c) => c.id === categoryId)?.name ?? 'Category'}</FilterChip>}
          {supplierId && <FilterChip onRemove={() => setSupplierId(undefined)}>{data?.facets.suppliers.find((c) => c.id === supplierId)?.name ?? 'Supplier'}</FilterChip>}
          {group && <FilterChip onRemove={() => setGroup(undefined)}>{config.groups?.label(group) ?? group}</FilterChip>}
          {query && <FilterChip onRemove={() => setSearch('')}>"{query}"</FilterChip>}
        </> : undefined}
        onClear={clear}>
        <FilterMenu icon={ListFilter} label="Halat" value={status} active={status !== 'all'} options={statusOptions} onChange={(v) => { setTab('alerts'); setStatus(v); }} width="w-72" />
        {(data?.facets.categories.length ?? 0) > 0 && (
          <FilterMenu icon={Layers} label="Category" value={categoryId ?? 'all'} active={!!categoryId} width="w-72"
            options={[{ value: 'all', label: 'Sab category' }, ...data!.facets.categories.map((c) => ({ value: c.id, label: c.name ?? '', hint: `${c.count} cheezein`, color: c.color ?? undefined }))]}
            onChange={(v) => setCategoryId(v === 'all' ? undefined : v)} />
        )}
        {(data?.facets.suppliers.length ?? 0) > 0 && (
          <FilterMenu icon={Truck} label="Supplier" value={supplierId ?? 'all'} active={!!supplierId} width="w-72"
            options={[{ value: 'all', label: 'Sab supplier' }, ...data!.facets.suppliers.map((c) => ({ value: c.id, label: c.name ?? '', hint: `${c.count} cheezein${costHidden ? '' : ` · ${cost(c.value)}`}` }))]}
            onChange={(v) => setSupplierId(v === 'all' ? undefined : v)} />
        )}
        {config.groups && (data?.facets.groups.length ?? 0) > 0 && (
          <FilterMenu icon={ListChecks} label={config.groups.title} value={group ?? 'all'} active={!!group} width="w-64"
            options={[{ value: 'all', label: 'Sab' }, ...data!.facets.groups.map((g) => ({ value: g.id, label: config.groups!.label(g.id), hint: `${g.count}` }))]}
            onChange={(v) => setGroup(v === 'all' ? undefined : v)} />
        )}
        <FilterMenu icon={ArrowDownWideNarrow} label="Sort" value={sort} options={SORTS} onChange={setSort} align="right" width="w-64" />
      </FilterBar>

      <ViewTabs value={tab} onChange={setTab} hint={<><Kbd>R</Kbd> reorder · <Kbd>A</Kbd> analytics · <Kbd>/</Kbd> search</>}
        tabs={[
          { id: 'alerts', label: 'Alerts', icon: AlertTriangle, count: data?.total ?? null },
          { id: 'reorder', label: 'Reorder list', icon: ShoppingCart, count: totals?.orderLines ?? null },
          { id: 'analytics', label: 'Analytics', icon: BarChart3 },
          ...(config.extraTab ? [{ id: config.extraTab.id, label: config.extraTab.label, icon: config.extraTab.icon }] : []),
        ]} />

      {tab === 'analytics' ? (
        <LowStockAnalytics data={analyticsQ.data} loading={analyticsQ.isLoading} money={money} cost={cost} costHidden={costHidden} />
      ) : tab === 'reorder' ? (
        <ReorderView rows={reorderQ.data?.items ?? []} loading={reorderQ.isLoading} qtyOf={qtyOf}
          setQty={(key, v) => setQtyEdits((m) => ({ ...m, [key]: v }))}
          removed={removed} toggleRemoved={(key) => setRemoved((s) => { const n = new Set(s); if (n.has(key)) n.delete(key); else n.add(key); return n; })}
          cost={cost} costHidden={costHidden} showShop={showShop} shop={shopLabel} canOrder={can.order} onOrder={(g) => handoff(g, qtyOf)} />
      ) : ExtraTab && tab === config.extraTab?.id ? (
        <Suspense fallback={<Skeleton className="h-64 rounded-3xl" />}><ExtraTab /></Suspense>
      ) : listQ.isLoading ? (
        <div className="space-y-2 rounded-3xl bg-white p-4 ring-1 ring-slate-200/80">{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
      ) : listQ.error && !data ? (
        <div className="rounded-3xl bg-white px-6 py-14 text-center ring-1 ring-slate-200/80">
          <p className="font-semibold text-slate-900">List nahi aa saki</p>
          <p className="mt-1 text-[0.875rem] text-slate-500">{(listQ.error as Error).message}</p>
          <div className="mt-4"><Button onClick={() => void listQ.refetch()}>Dobara koshish</Button></div>
        </div>
      ) : !visible.length ? (
        <div className="flex flex-col items-center rounded-3xl bg-white px-6 py-16 text-center ring-1 ring-slate-200/80">
          <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 text-white shadow-lg"><PackageCheck className="h-7 w-7" /></span>
          <h3 className="mt-4 text-lg font-semibold text-slate-900">{filtered ? 'Is filter me kuch nahi' : 'Sab stock theek hai'}</h3>
          <p className="mt-1 max-w-md text-[0.875rem] text-slate-500">{filtered ? 'Filter badal kar dekhein ya hata dein.' : 'Kuch khatam, kam ya expiry ke qareeb nahi. Alert level product par ya yahan line par badal sakte hain.'}</p>
          {filtered && <div className="mt-4"><Button variant="secondary" onClick={clear}>Filter hatayein</Button></div>}
        </div>
      ) : (
        <section className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
          <div className={cn('hidden items-center gap-x-3 border-b border-slate-100 bg-slate-50/70 px-4 py-2.5 text-[0.6875rem] font-semibold uppercase tracking-wide text-slate-500 lg:grid', LINE_GRID)}>
            <button type="button" onClick={selectVisible} aria-label="Sab chunein"
              className={cn('flex h-6 w-6 items-center justify-center rounded-md border-2', allVisible ? 'border-brand-600 bg-brand-600 text-white' : 'border-slate-300 text-transparent')}><Check className="h-3.5 w-3.5" strokeWidth={3} /></button>
            <span>Cheez</span><span>Stock</span><span>Sale · kitne din</span><span>Kya karna hai</span><span>Supplier</span><span />
          </div>
          <ul className="divide-y divide-slate-100">
            {visible.map((r) => (
              <LineRow key={r.key} r={r} selected={selected.has(r.key)} onToggle={() => toggle(r)} money={money} cost={cost} showShop={showShop}
                groupLabel={config.groups?.label} deviceLink={config.deviceLink}
                actions={{
                  onOrder: can.order ? () => handoff({ key: r.key, shopId: r.shopId, shopName: r.shopName, supplier: r.supplier, rows: [r] }) : undefined,
                  onStock: can.stock ? () => (isAll ? toast.error(`Stock ek branch me daalte hain — upar se ${r.shopName} chunein`) : setStockRow(r)) : undefined,
                  onWhatsApp: () => openWhatsApp(waLink(r.supplier?.phone, itemMessage(r, shopLabel)), itemMessage(r, shopLabel)),
                  onAlert: can.alert ? async (alert) => { await alertM.mutateAsync({ r, alert }); } : undefined,
                  onIgnore: (ignore) => ignoreM.mutate({ rows: [r], ignore }),
                }} />
            ))}
          </ul>
        </section>
      )}

      {tab === 'alerts' && data && data.pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((x) => x - 1)}>Pichla</Button>
          <span className="text-sm text-slate-600">Safha {page} / {data.pages}</span>
          <Button variant="secondary" size="sm" disabled={page >= data.pages} onClick={() => setPage((x) => x + 1)}>Agla</Button>
        </div>
      )}

      {selected.size > 0 && tab === 'alerts' && (
        <div className="sticky bottom-4 z-30 mx-auto flex w-fit max-w-full flex-wrap items-center gap-2 rounded-2xl bg-slate-900 px-3 py-2 text-white shadow-2xl">
          <span className="px-1 text-[0.8125rem] font-semibold">{selected.size} chuni</span>
          {can.order && <Button size="sm" leftIcon={<ShoppingCart className="h-3.5 w-3.5" />} onClick={orderSelected}>Purchase order banayein</Button>}
          <Button size="sm" variant="inverse" leftIcon={<MessageCircle className="h-3.5 w-3.5" />} onClick={whatsAppSelected}>WhatsApp list</Button>
          <Button size="sm" variant="inverse" leftIcon={<EyeOff className="h-3.5 w-3.5" />} onClick={() => ignoreM.mutate({ rows: [...selected.values()], ignore: status !== 'ignored' })}>
            {status === 'ignored' ? 'Wapas dikhayein' : 'Chhupayein'}
          </Button>
          <button type="button" onClick={() => setSelected(new Map())} aria-label="Chunna khatam" className="flex h-8 w-8 items-center justify-center rounded-lg text-white/70 hover:bg-white/10"><X className="h-4 w-4" /></button>
        </div>
      )}

      {stockRow && (
        <StockModal item={{ id: stockRow.productId, name: stockRow.name, unit: stockRow.unit, stock: stockRow.stock, price: stockRow.price }} money={money}
          onClose={() => setStockRow(null)} onSaved={() => void refresh()} />
      )}
      {orderGroups && <OrderModal groups={orderGroups} shop={shopLabel} showShop={showShop} cost={cost} onClose={() => setOrderGroups(null)} onOrder={(g) => { setOrderGroups(null); handoff(g); }} />}
      {editSettings && <SettingsModal value={settings} defaults={defaults} onSave={saveSettings} onClose={() => setEditSettings(false)} />}

      {guide.isOpen && (
        <PageGuide title="Low stock aur reorder — aasaan tareeqa" onClose={guide.close}
          steps={[
            { icon: AlertTriangle, color: '#e11d48', title: 'Kya khatam ho raha hai', text: 'Upar ke dabbe: Khatam, Kam, Jaldi khatam, Expiry. Dabayein to sirf wohi lines dikhti hain. Sab se zaroori line sab se upar hai.' },
            { icon: Clock, color: '#ea580c', title: 'Kitne din ka maal', text: `Har line par roz ki sale (pichhle ${settings.days} din ki ausat) aur bacha maal kitne din chalega. Khatam maal par andaza ke roz kitni sale ruk rahi hai.` },
            { icon: ShoppingCart, color: '#2563eb', title: 'Order banayein', text: '"Reorder list" me har supplier ka alag card hai — quantity badlein, phir "Order banayein". Purchase ka order khul jata hai, sab cheezein pehle se bhari hui.' },
            { icon: MousePointerClick, color: '#16a34a', title: 'Ek saath kaam', text: 'Lines chunein, phir neeche kaali patti: Purchase order (supplier war), WhatsApp list ya Chhupayein.' },
            { icon: MessageCircle, color: '#059669', title: 'Supplier ko WhatsApp', text: 'Har line par hara button supplier ko tayyar paighaam bhejta hai. Supplier ka number na ho to WhatsApp khud chunne deta hai.' },
            { icon: PackagePlus, color: '#7c3aed', title: 'Alert level aur stock', text: '"Alert" par click kar ke wahin had badlein (sirf is branch ki). "…" me stock daalein ya line chhupayein jab tak stock theek na ho.' },
            ...(config.guide ?? []),
          ]}
          tips={[
            `Order itna banta hai ke maal ${settings.targetDays} din chale; jo pehle se order me hai woh ghata diya jata hai. Settings (slider button) se din badlein.`,
            'Supplier aur rate pichhli purchase se aata hai. Jo kabhi nahi khareeda, us ke order me supplier khud chunein.',
            'Sab branches par har branch ki line alag hai — order usi branch ka banta hai.',
            ...(config.tips ?? []),
          ]}
          shortcuts={[['/', 'dhoondein'], ['R', 'reorder list'], ['A', 'analytics'], ['G', 'guide'], ['Esc', 'chunna khatam']]}
          footer={<span className="inline-flex items-center gap-1.5 text-[0.75rem] text-slate-500"><Search className="h-3.5 w-3.5" />Naam, SKU, barcode ya supplier se search</span>}
        />
      )}
    </PageShell>
  );
}
