/**
 * Sales history: every bill for any period with totals that cover the whole
 * filter, grouped by day; search by bill, customer, phone, product or
 * barcode; open a bill in a side panel to print, share, return or void it;
 * analytics for the same filter; CSV, print and PDF of all matching bills.
 *
 * Keys: / search · B scan a bill · A analytics · G guide.
 */

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  ArrowDownWideNarrow, Ban, BarChart3, BookOpen, CalendarRange, CheckCircle2, CloudOff, Download, FileDown, GraduationCap,
  ListChecks, ListFilter, MousePointerClick, Package, RotateCcw, ScanLine, Search, Settings2, ShoppingCart, Sparkles,
  Tag, Trophy, UserRound, Wallet, type LucideIcon,
} from 'lucide-react';
import {
  Badge, Button, FilterBar, FilterChip, FilterMenu, Kbd, KpiCard, KpiRow, Modal, MoreFilters, PageHero, PageShell, SearchField, Skeleton, ViewTabs,
  heroButton, heroIconButton, type FilterOption,
} from '@/design-system/components';
import BarcodeScanner from '@core/components/barcode/BarcodeScanner';
import { PrintButton } from '@core/print';
import { PrivacyToggle } from '@core/security/HiddenValue';
import { useAuthStore } from '@core/stores/auth.store';
import { businessDayKey } from '@core/lib/business-day';
import { fillTemplate, resolveTemplates, waLink } from '@core/lib/whatsapp/templates';
import { formatPKR } from '@core/lib/format';
import { cn } from '@core/lib/cn';
import { settingsApi } from '@modules/organization/settings/api/settings.api';
import { teamApi } from '@modules/organization/team/api/team.api';
import { salesApi, type PaymentMethod } from '@modules/sales/sales/api/sales.api';
import { ReturnModal } from '@modules/sales/returns/components/ReturnModal';
import { useMasked } from '@modules/dashboard/engine/useMasked';
import { PAYMENT_COLORS } from '@modules/dashboard/engine/useChartTheme';
import { POS_PAYMENT_METHODS } from '@modules/pos/lib/posCart';
import { salesHistoryApi, type BillTier, type HistorySale, type HistorySort, type HistoryStatus, type HistoryTierTotals } from './api';
import { PRICE_TIERS } from '@core/lib/priceTiers';
import { usePriceTierSettings } from '@modules/pos/lib/usePriceTierSettings';
import { BILL_TIER_LABEL, billTierVariant } from './components/PriceTierBadge';
import { DATE_PRESETS, rangeLabel } from '@core/lib/dateRange';
import { fetchAllSales, salesCsv, salesDoc } from './exportSales';
import { useSalesAnalytics, useSalesHistory } from './useSalesHistory';
import { SaleDrawer } from './components/SaleDrawer';
import { ROW_GRID, SaleRow } from './components/SaleRow';
import { SalesAnalytics } from './components/SalesAnalytics';
import { VoidSaleModal } from './components/VoidSaleModal';
import { isDialogOpen, isTyping } from '@core/lib/shortcuts';
import { t as tr } from '@core/i18n';

export interface SalesHistoryConfig {
  label: string;
  /** Industry block under a bill's items (serials, warranty…), given the loaded bills. */
  useBillExtras?: (sales: HistorySale[]) => (sale: HistorySale) => ReactNode;
}

const STATUSES: Array<FilterOption<HistoryStatus>> = [
  { value: 'all', label: tr('Sab'), icon: ListChecks, color: '#475569' },
  { value: 'active', label: tr('Chalu bill'), hint: tr('Void ke bagair'), icon: CheckCircle2, color: '#16a34a' },
  { value: 'credit', label: tr('Udhaar wale'), hint: tr('Jin par paise baqi hain'), icon: BookOpen, color: '#d97706' },
  { value: 'returned', label: tr('Return wale'), hint: tr('Jin ka maal wapas aaya'), icon: RotateCcw, color: '#ea580c' },
  { value: 'voided', label: tr('Void'), hint: tr('Cancel kiye gaye bill'), icon: Ban, color: '#e11d48' },
];
const SORTS: Array<FilterOption<HistorySort>> = [
  { value: 'new', label: tr('Naye pehle') }, { value: 'old', label: tr('Purane pehle') },
  { value: 'high', label: tr('Bari amount pehle') }, { value: 'low', label: tr('Chhoti amount pehle') },
];

const TIER_FILTERS: Array<FilterOption<BillTier | 'all'>> = [
  { value: 'all', label: tr('Sab') },
  { value: 'RETAIL', label: tr('Retail'), hint: tr('Sab cheezein retail price par') },
  { value: 'WHOLESALE', label: tr('Wholesale'), hint: tr('Sab cheezein wholesale price par') },
  { value: 'CREDIT', label: tr('Credit'), hint: tr('Sab cheezein udhaar (credit) price par') },
  { value: 'MIXED', label: tr('Mixed'), hint: tr('Ek bill me alag alag price') },
];

const noExtras = () => () => null;

export function SalesHistoryPage({ config }: { config: SalesHistoryConfig }) {
  const h = useSalesHistory();
  const tierSettings = usePriceTierSettings();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { sales: money, cost, costHidden, salesHidden } = useMasked();
  const tenantName = useAuthStore((s) => s.tenant?.name);
  const shopName = useAuthStore((s) => s.user?.assignedShop?.name);
  const searchRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<'bills' | 'analytics'>('bills');
  const [open, setOpen] = useState<HistorySale | null>(null);
  const [voidTarget, setVoidTarget] = useState<HistorySale | null>(null);
  const [returnTarget, setReturnTarget] = useState<HistorySale | null>(null);
  const [scanner, setScanner] = useState(false);
  const [guide, setGuide] = useState(false);
  const [exporting, setExporting] = useState(false);

  const analytics = useSalesAnalytics(h.filters, tab === 'analytics');
  const { data: team = [] } = useQuery({ queryKey: ['team'], queryFn: () => teamApi.list().catch(() => []), staleTime: 5 * 60_000 });
  const { data: settings } = useQuery({ queryKey: ['settings'], queryFn: () => settingsApi.get(), staleTime: 5 * 60_000 });
  const templates = useMemo(() => resolveTemplates((settings as { whatsappTemplates?: Record<string, string> } | undefined)?.whatsappTemplates), [settings]);
  const useExtras = config.useBillExtras ?? noExtras;
  const extraFor = useExtras(h.sales);
  const label = rangeLabel(h.range.from, h.range.to);

  const billWa = useCallback((s: HistorySale) => {
    if (!s.customer?.phone) return null;
    const items = s.items.slice(0, 6).map((it) => `• ${it.name} × ${Number(it.quantity)}`).join('\n');
    return waLink(s.customer.phone, fillTemplate(templates.receipt, {
      customer: s.customer.name, shop: tenantName || tr('Hamari dukaan'), phone: (settings as { shopPhone?: string } | undefined)?.shopPhone ?? '',
      bill: s.saleNumber, total: formatPKR(s.total), paid: formatPKR(s.paidAmount), baqi: formatPKR(s.creditAmount),
      tareekh: new Intl.DateTimeFormat('en-PK', { dateStyle: 'medium' }).format(new Date(s.soldAt)),
      cheezein: items + (s.items.length > 6 ? `\n• +${s.items.length - 6} aur` : ''),
    }));
  }, [templates, tenantName, settings]);

  const refresh = () => ['sales-history', 'sales-list', 'sales-summary', 'products', 'products-for-pos', 'customers', 'customers-for-pos', 'dashboard-overview']
    .forEach((k) => qc.invalidateQueries({ queryKey: [k] }));

  const voidMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => salesApi.voidSale(id, reason),
    onSuccess: () => { toast.success(tr('Bill wapas le liya — stock wapas aa gaya')); setVoidTarget(null); setOpen(null); refresh(); },
    onError: (e: { response?: { data?: { message?: string } }; message?: string }) => toast.error(e?.response?.data?.message || e.message || tr('Wapas nahi hua')),
  });

  /** Scanned or typed bill number → open that bill. */
  const openBill = useCallback(async (code: string) => {
    const c = code.trim();
    if (!c) return;
    try {
      const res = await salesHistoryApi.list({ ...h.filters, from: 'all', method: undefined, status: 'all', staffId: undefined, source: undefined, search: c }, 1, 5);
      const hit = res.items.find((s) => s.saleNumber.toLowerCase() === c.toLowerCase()) ?? (res.items.length === 1 ? res.items[0] : null);
      if (hit) setOpen(hit);
      else toast.error(tr('Bill "{{c}}" nahi mila', { c }));
    } catch { toast.error(tr('Bill dhoonda nahi ja saka')); }
  }, [h.filters]);

  const exportAll = async (kind: 'csv') => {
    setExporting(true);
    try {
      const { sales, stats } = await fetchAllSales(h.filters);
      if (!sales.length) { toast.error(tr('Is filter mein koi bill nahi')); return; }
      if (kind === 'csv') salesCsv(sales, [
        tr('Sale ka record — {{value}}{{value2}}', { value: tenantName ?? '', value2: shopName ? ` · ${shopName}` : '' }), tr('Period: {{label}}', { label }),
        tr('Bill: {{value}} · Kul: {{value2}} · Mila: {{value3}} · Udhaar: {{value4}}', { value: stats?.bills ?? 0, value2: stats?.total.toFixed(2), value3: stats?.paid.toFixed(2), value4: stats?.credit.toFixed(2) }),
      ]);
      toast.success(tr('{{count}} bill CSV mein', { count: sales.length }));
    } catch { toast.error(tr('Export nahi hua')); } finally { setExporting(false); }
  };
  const printDoc = async () => {
    const { sales, stats } = await fetchAllSales(h.filters, 2000);
    return salesDoc(sales, stats, label, money, !costHidden);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping() || isDialogOpen()) return;
      const k = e.key.toLowerCase();
      if (e.key === '/') { e.preventDefault(); searchRef.current?.focus(); }
      if (k === 'b') { e.preventDefault(); setScanner(true); }
      if (k === 'a') setTab((v) => (v === 'bills' ? 'analytics' : 'bills'));
      if (k === 'g') setGuide(true);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Bills grouped by business day, each with its own total.
  const days = useMemo(() => {
    const map = new Map<string, { key: string; sales: HistorySale[]; total: number }>();
    for (const s of h.sales) {
      const key = businessDayKey(new Date(s.soldAt), h.startHour);
      const d = map.get(key) ?? { key, sales: [], total: 0 };
      d.sales.push(s);
      if (s.status !== 'VOIDED') d.total += s.total;
      map.set(key, d);
    }
    return [...map.values()];
  }, [h.sales, h.startHour]);
  const dayTitle = (key: string) => {
    const today = businessDayKey(new Date(), h.startHour);
    const y = new Date(); y.setDate(y.getDate() - 1);
    if (key === today) return tr('Aaj');
    if (key === businessDayKey(y, h.startHour)) return tr('Kal');
    return new Intl.DateTimeFormat('en-PK', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(`${key}T12:00:00`));
  };

  const st = h.stats;
  return (
    <PageShell>
      {scanner && <BarcodeScanner onDetected={(c: string) => { setScanner(false); void openBill(c); }} onClose={() => setScanner(false)} />}
      {open && (
        <SaleDrawer sale={open} money={money} cost={cost} costHidden={costHidden} waLink={billWa(open)} extra={extraFor(open)}
          onReturn={() => setReturnTarget(open)} onVoid={() => setVoidTarget(open)} onClose={() => setOpen(null)} />
      )}
      {voidTarget && <VoidSaleModal sale={voidTarget} loading={voidMutation.isPending} onConfirm={(reason) => voidMutation.mutate({ id: voidTarget.id, reason })} onClose={() => setVoidTarget(null)} />}
      {returnTarget && (
        <ReturnModal sale={returnTarget} onClose={() => setReturnTarget(null)} onDone={() => { setReturnTarget(null); setOpen(null); refresh(); }} />
      )}
      {guide && <SalesGuide onClose={() => setGuide(false)} />}

      {/* Header */}
      <PageHero
        title={tr('Sale ka record')}
        chip={<><CalendarRange />{label}</>}
        busy={h.fetching && !h.loading}
        meta={`${config.label} · ${shopName ?? tenantName ?? ''}`}
        loading={h.loading || !st}
        actions={<>
          <PrivacyToggle compact />
          <button type="button" onClick={() => setScanner(true)} title={tr('Bill ka barcode scan (B)')} className={heroButton}>
            <ScanLine className="h-4 w-4" /> <span className="hidden sm:inline">{tr('Bill scan')}</span>
          </button>
          <button type="button" onClick={() => void exportAll('csv')} disabled={exporting} className={heroButton}>
            <Download className="h-4 w-4" /> {exporting ? tr('Ban raha…') : tr('CSV')}
          </button>
          <span className="[&_button]:border-white/25 [&_button]:bg-white [&_button]:text-slate-800"><PrintButton doc={printDoc} label={tr('Print')} /></span>
          <Link to="/settings/receipt" title={tr('Bill ka design')} aria-label={tr('Bill ka design')} className={heroIconButton}><Settings2 className="h-4 w-4" /></Link>
          <button type="button" onClick={() => setGuide(true)} title={tr('Guide (G)')} className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
        </>}
        stats={st ? [
          { label: tr('Total sale · {{bills}} bill', { bills: st.bills }), value: money(st.total) },
          { label: tr('Haath mein aaya'), value: money(st.paid), hint: st.change ? tr('return {{change}}', { change: money(st.change) }) : tr('cash + online') },
          { label: tr('Profit'), value: cost(st.profit), hint: costHidden ? tr('Cost lock') : tr('{{value}}% margin', { value: st.margin.toFixed(1) }) },
          { label: tr('Ausat bill'), value: money(st.average), hint: tr('{{value}} cheezein', { value: Number(st.qty.toFixed(2)) }) },
        ] : [{ label: tr('Total sale'), value: '' }, { label: tr('Haath mein aaya'), value: '' }, { label: tr('Profit'), value: '' }, { label: tr('Ausat bill'), value: '' }]}
      />

      {/* Secondary numbers */}
      <KpiRow>
        {h.loading || !st ? Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-[5.25rem] rounded-2xl" />) : (
          <>
            <KpiCard icon={BookOpen} color="#d97706" label={tr('Udhaar')} value={money(st.credit)} hint={tr('{{creditCount}} bill · dabayein', { creditCount: st.creditCount })}
              onClick={() => h.setStatus(h.status === 'credit' ? 'all' : 'credit')} active={h.status === 'credit'} />
            <KpiCard icon={Sparkles} color="#db2777" label={tr('Discount')} value={money(st.discount)} hint={st.total ? tr('{{value}}% sale ka', { value: ((st.discount / (st.total + st.discount)) * 100).toFixed(1) }) : undefined} />
            <KpiCard icon={RotateCcw} color="#ea580c" label={tr('Maal wapas')} value={money(st.refunded)} hint={tr('{{voided}} void bill', { voided: st.voided })}
              onClick={() => h.setStatus(h.status === 'returned' ? 'all' : 'returned')} active={h.status === 'returned'} />
            <KpiCard icon={Package} color="#0891b2" label={tr('Cheezein biki')} value={String(Number(st.qty.toFixed(2)))} hint={tr('{{lines}} lines', { lines: st.lines })} />
            <KpiCard icon={Trophy} color="#16a34a" label={tr('Sab se bara bill')} value={st.best ? money(st.best.total) : '—'} hint={st.best ? tr('{{saleNumber}} · kholein', { saleNumber: st.best.saleNumber }) : undefined}
              onClick={st.best ? () => void openBill(st.best!.saleNumber) : undefined} />
          </>
        )}
      </KpiRow>

      {h.tiers && <TierStrip tiers={h.tiers} money={money} active={h.tier} onPick={(t) => h.setTier(h.tier === t ? undefined : t)} />}

      {/* Filters */}
      <FilterBar
        search={<SearchField ref={searchRef} value={h.search} onChange={h.setSearch}
          onEnter={() => { if (/^[A-Z]{2}-\d+$/i.test(h.search.trim())) void openBill(h.search); }}
          placeholder={tr('Bill number, customer, phone, product ya barcode…')} label={tr('Sale search')} />}
        chips={h.hasFilters ? <>
          {h.method && <FilterChip onRemove={() => h.setMethod(undefined)}>{POS_PAYMENT_METHODS.find((m) => m.id === h.method)?.label ?? h.method}</FilterChip>}
          {h.status !== 'all' && <FilterChip onRemove={() => h.setStatus('all')}>{STATUSES.find((x) => x.value === h.status)?.label}</FilterChip>}
          {h.tier && <FilterChip onRemove={() => h.setTier(undefined)}>{tr('{{value}} bill', { value: BILL_TIER_LABEL[h.tier] })}</FilterChip>}
          {h.staffId && <FilterChip onRemove={() => h.setStaffId(undefined)}>{team.find((m) => m.id === h.staffId)?.fullName ?? tr('Staff')}</FilterChip>}
          {h.search.trim() && <FilterChip onRemove={() => h.setSearch('')}>"{h.search.trim()}"</FilterChip>}
        </> : undefined}
        onClear={h.clear}>
          <FilterMenu icon={CalendarRange} label={tr('Date')} value={h.preset} active={h.preset !== 'today'} width="w-72"
            options={[...DATE_PRESETS.map((p) => ({ value: p.id, label: p.label })), { value: 'custom' as const, label: tr('Apni date'), hint: tr('Neeche se chunein') }]}
            onChange={(v) => h.setPreset(v)}
            footer={() => (
              <div className="mt-1 grid grid-cols-2 gap-2 border-t border-slate-100 p-2 pt-3">
                {(['from', 'to'] as const).map((k) => (
                  <label key={k} className="text-[0.6875rem] font-semibold uppercase tracking-wide text-slate-500">
                    {k === 'from' ? tr('Se') : tr('Tak')}
                    <input type="date" value={h.custom[k] || (h.range[k] === 'all' ? '' : h.range[k])} max={businessDayKey(new Date(), h.startHour)}
                      onChange={(e) => { h.setCustom({ ...h.custom, [k]: e.target.value }); h.setPreset('custom'); }}
                      className="mt-1 block h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-[0.8125rem] font-normal normal-case tracking-normal text-slate-900" />
                  </label>
                ))}
              </div>
            )} />
          <FilterMenu icon={Wallet} label={tr('Payment')} value={h.method ?? 'all'} active={!!h.method}
            options={[{ value: 'all', label: tr('Sab') }, ...POS_PAYMENT_METHODS.map((m) => ({ value: m.id, label: m.label, icon: m.icon, color: PAYMENT_COLORS[m.id] }))]}
            onChange={(v) => h.setMethod(v === 'all' ? undefined : (v as PaymentMethod))} />
          <FilterMenu icon={ListFilter} label={tr('Bill')} value={h.status} active={h.status !== 'all'} options={STATUSES} onChange={h.setStatus} />
          <MoreFilters groups={[
            ...((tierSettings.on || !!h.tiers || !!h.tier) ? [{ id: 'tier', label: tr('Price'), icon: Tag, value: h.tier ?? 'all', empty: 'all', options: TIER_FILTERS,
              onChange: (v: string) => h.setTier(v === 'all' ? undefined : (v as BillTier)) }] : []),
            ...(team.length > 1 ? [{ id: 'staff', label: tr('Staff'), icon: UserRound, value: h.staffId ?? 'all', empty: 'all',
              options: [{ value: 'all', label: tr('Sab') }, ...team.map((m) => ({ value: m.id, label: m.fullName }))],
              onChange: (v: string) => h.setStaffId(v === 'all' ? undefined : v) }] : []),
          ]} />
          <FilterMenu icon={ArrowDownWideNarrow} label={tr('Sort')} value={h.sort} options={SORTS} onChange={h.setSort} align="right" width="w-56" />
      </FilterBar>

      {/* Tabs */}
      <ViewTabs value={tab} onChange={setTab} hint={<><Kbd>A</Kbd> {' '}{tr('se badlein')}</>}
        tabs={[{ id: 'bills', label: tr('Bill'), icon: ListChecks, count: h.count }, { id: 'analytics', label: tr('Analytics'), icon: BarChart3 }]} />

      {tab === 'analytics' ? (
        <SalesAnalytics data={analytics.data} stats={st} loading={analytics.isLoading} money={money} cost={cost} costHidden={costHidden} salesHidden={salesHidden} />
      ) : (
        <div className="space-y-4">
          {h.pendingCount > 0 && (
            <p className="flex items-center gap-2 rounded-2xl bg-sky-50 px-4 py-3 text-[0.8125rem] font-medium text-sky-800 ring-1 ring-sky-100">
              <CloudOff className="h-4 w-4" /> {' '}{tr('{{pendingCount}} bill is computer par save hain — internet aate hi server par chale jayenge', { pendingCount: h.pendingCount })}
            </p>
          )}
          {h.loading ? (
            <div className="space-y-2 rounded-3xl bg-white p-4 ring-1 ring-slate-200/80">{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
          ) : h.sales.length === 0 ? (
            <div className="flex flex-col items-center rounded-3xl bg-white px-6 py-16 text-center ring-1 ring-slate-200/80">
              <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-brand-fg shadow-lg"><ShoppingCart className="h-7 w-7" /></span>
              <h3 className="mt-4 text-lg font-semibold text-slate-900">{h.hasFilters ? tr('Is filter mein koi bill nahi') : tr('Is period mein koi sale nahi')}</h3>
              <p className="mt-1 text-[0.875rem] text-slate-500">{h.hasFilters ? tr('Filter badal kar dekhein') : tr('POS se pehli sale karein, ya period badlein')}</p>
              <div className="mt-4">{h.hasFilters ? <Button variant="secondary" onClick={h.clear}>{tr('Filter hatayein')}</Button> : <Button onClick={() => navigate('/pos')}>{tr('POS kholein')}</Button>}</div>
            </div>
          ) : (
            days.map((d) => (
              <section key={d.key} className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
                <header className="flex items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/70 px-4 py-2.5 sm:px-5">
                  <h2 className="text-[0.875rem] font-semibold text-slate-900">{dayTitle(d.key)} <span className="font-normal text-slate-500">{tr('· {{count}} bill', { count: d.sales.length })}</span></h2>
                  <span className="text-[0.9375rem] font-bold tabular-nums text-slate-900">{money(d.total)}</span>
                </header>
                <div className={cn('hidden border-b border-slate-100 px-5 py-2 text-[0.6875rem] font-semibold uppercase tracking-wide text-slate-400 lg:grid', ROW_GRID)}>
                  <span>{tr('Bill')}</span><span>{tr('Customer')}</span><span>{tr('Cheezein')}</span><span>{tr('Payment')}</span><span>{tr('Staff')}</span><span className="text-end">{tr('Amount')}</span><span />
                </div>
                <ul className="divide-y divide-slate-100">
                  {d.sales.map((s) => (
                    <SaleRow key={s.id} sale={s} money={money} waLink={s.pending ? null : billWa(s)} extra={extraFor(s)}
                      onOpen={() => setOpen(s)} onReturn={() => setReturnTarget(s)} />
                  ))}
                </ul>
              </section>
            ))
          )}
          {h.hasMore && (
            <button type="button" onClick={() => void h.loadMore()} disabled={h.loadingMore}
              className="w-full rounded-2xl bg-white py-3 text-[0.875rem] font-semibold text-brand-700 ring-1 ring-slate-200 hover:bg-brand-50 disabled:opacity-60">
              {h.loadingMore ? tr('Aa rahe hain…') : tr('Aur bill dikhayein ({{value}} / {{count}})', { value: h.sales.length - h.pendingCount, count: h.count })}
            </button>
          )}
        </div>
      )}
    </PageShell>
  );
}

/**
 * Bills and money per price tier for the period. Bill counts match the tier
 * filter (a mixed bill counts once, as mixed); money is the sum of line totals
 * (net of line discount) at each tier, so a mixed bill's lines add to every
 * tier they used. Shown only when the period has a wholesale or credit line.
 */
function TierStrip({ tiers, money, active, onPick }: {
  tiers: HistoryTierTotals;
  money: (n: number) => string;
  active?: BillTier;
  onPick: (t: BillTier) => void;
}) {
  const cells: Array<{ tier: BillTier; bills: number; total?: number }> = [
    ...PRICE_TIERS.filter((t) => tiers[t].bills > 0).map((t) => ({ tier: t as BillTier, bills: tiers[t].bills, total: tiers[t].total })),
    ...(tiers.mixedBills > 0 ? [{ tier: 'MIXED' as BillTier, bills: tiers.mixedBills }] : []),
  ];
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label={tr('Price ke hisaab se sale')}>
      {cells.map((c) => (
        <button key={c.tier} type="button" onClick={() => onPick(c.tier)} aria-pressed={active === c.tier}
          title={c.tier === 'MIXED' ? tr('Jin bills me alag alag price lagi') : tr('Is price par biki cheezon ki raqam')}
          className={cn('flex min-w-0 flex-1 basis-[9.5rem] items-center justify-between gap-2 rounded-2xl bg-white px-3.5 py-2.5 text-start ring-1 transition hover:bg-slate-50',
            active === c.tier ? 'ring-2 ring-brand-500' : 'ring-slate-200/80')}>
          <span className="flex min-w-0 flex-col gap-1">
            <Badge size="xs" variant={billTierVariant(c.tier)} className="self-start">{BILL_TIER_LABEL[c.tier]}</Badge>
            <span className="text-[0.75rem] text-slate-500">{tr('{{bills}} bill', { bills: c.bills })}</span>
          </span>
          {c.total != null && <span className="truncate text-[0.9375rem] font-bold tabular-nums text-slate-900">{money(c.total)}</span>}
        </button>
      ))}
    </div>
  );
}

function SalesGuide({ onClose }: { onClose: () => void }) {
  const steps: Array<{ icon: LucideIcon; color: string; title: string; text: string }> = [
    { icon: CalendarRange, color: '#2563eb', title: tr('Din chunein'), text: tr('"Date" se Aaj, Kal, 7 din ya apni date. Upar ke saare number isi period ke hain.') },
    { icon: Search, color: '#7c3aed', title: tr('Bill search'), text: tr('Bill number, customer ka naam, phone ya product likhein. Purana bill ho to "Bill scan" se barcode scan karein.') },
    { icon: ListFilter, color: '#d97706', title: tr('Filter lagayein'), text: tr('Payment, udhaar wale, return wale ya staff. Lage filter neeche dikhte hain, X se hat jate hain.') },
    { icon: MousePointerClick, color: '#16a34a', title: tr('Bill kholein'), text: tr('Kisi bhi bill par click karein: poori cheezein, profit, print, WhatsApp, maal wapas aur void.') },
    { icon: BarChart3, color: '#db2777', title: tr('Analytics dekhein'), text: tr('Kab rush hota hai, kya zyada bikta hai, kaun se customer aate hain, aur pichli dafa se muqabla.') },
    { icon: FileDown, color: '#0891b2', title: tr('Report nikaalein'), text: tr('CSV ya Print/PDF. Is filter ke saare bill aa jate hain, accountant ko bhej dein.') },
  ];
  return (
    <Modal open onClose={onClose} size="lg" title={tr('Sale ka record — aasaan tareeqa')} description={tr('6 cheezein, bas itna yaad rakhein')}>
      <ol className="grid gap-3 sm:grid-cols-2">
        {steps.map((st, i) => (
          <li key={st.title} className="flex gap-3 rounded-2xl bg-slate-50 p-3.5 ring-1 ring-slate-100">
            <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: `${st.color}17`, color: st.color }}>
              <st.icon className="h-5 w-5" />
              <span className="absolute -end-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-[0.625rem] font-bold text-white">{i + 1}</span>
            </span>
            <div className="min-w-0">
              <p className="text-[0.875rem] font-semibold text-slate-900">{st.title}</p>
              <p className="mt-0.5 text-[0.8125rem] leading-relaxed text-slate-600">{st.text}</p>
            </div>
          </li>
        ))}
      </ol>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-3 ring-1 ring-slate-200">
        <div className="flex flex-wrap items-center gap-3 text-[0.75rem] text-slate-600">
          <span className="font-semibold text-slate-900">{tr('Jaldi ke liye:')}</span>
          <span className="inline-flex items-center gap-1"><Kbd>/</Kbd> {' '}{tr('search')}</span>
          <span className="inline-flex items-center gap-1"><Kbd>B</Kbd> {' '}{tr('scan')}</span>
          <span className="inline-flex items-center gap-1"><Kbd>A</Kbd> {' '}{tr('analytics')}</span>
          <span className="inline-flex items-center gap-1"><Kbd>G</Kbd> {' '}{tr('guide')}</span>
        </div>
        <Link to="/day-report" className="text-[0.8125rem] font-semibold text-brand-700 hover:underline">{tr('Din ka hisaab (item war) →')}</Link>
      </div>
    </Modal>
  );
}
