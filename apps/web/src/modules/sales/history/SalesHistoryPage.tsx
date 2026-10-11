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
  Trophy, UserRound, Wallet, X, type LucideIcon,
} from 'lucide-react';
import { Button, Kbd, Modal, Skeleton } from '@/design-system/components';
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
import { salesHistoryApi, type HistorySale, type HistorySort, type HistoryStatus } from './api';
import { DATE_PRESETS, rangeLabel } from './dates';
import { FilterMenu, type FilterOption } from './components/FilterMenu';
import { fetchAllSales, salesCsv, salesDoc } from './exportSales';
import { useSalesAnalytics, useSalesHistory } from './useSalesHistory';
import { ReceiptPrefsModal } from './components/ReceiptPrefsModal';
import { SaleDrawer } from './components/SaleDrawer';
import { ROW_GRID, SaleRow } from './components/SaleRow';
import { SalesAnalytics } from './components/SalesAnalytics';
import { VoidSaleModal } from './components/VoidSaleModal';

export interface SalesHistoryConfig {
  label: string;
  /** Industry block under a bill's items (serials, warranty…), given the loaded bills. */
  useBillExtras?: (sales: HistorySale[]) => (sale: HistorySale) => ReactNode;
}

const STATUSES: Array<FilterOption<HistoryStatus>> = [
  { value: 'all', label: 'Sab bill', icon: ListChecks, color: '#475569' },
  { value: 'active', label: 'Chalu bill', hint: 'Void ke bagair', icon: CheckCircle2, color: '#16a34a' },
  { value: 'credit', label: 'Udhaar wale', hint: 'Jin par paise baqi hain', icon: BookOpen, color: '#d97706' },
  { value: 'returned', label: 'Wapsi wale', hint: 'Jin ka maal wapas aaya', icon: RotateCcw, color: '#ea580c' },
  { value: 'voided', label: 'Void', hint: 'Cancel kiye gaye bill', icon: Ban, color: '#e11d48' },
];
const SORTS: Array<FilterOption<HistorySort>> = [
  { value: 'new', label: 'Naye pehle' }, { value: 'old', label: 'Purane pehle' },
  { value: 'high', label: 'Bari raqam pehle' }, { value: 'low', label: 'Chhoti raqam pehle' },
];
const heroBtn = 'inline-flex h-9 items-center gap-1.5 rounded-xl bg-white/15 px-3 text-[0.8125rem] font-semibold ring-1 ring-white/25 backdrop-blur transition hover:bg-white/25 disabled:opacity-60';
const heroIcon = 'flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/25 transition hover:bg-white/25';

function FilterChip({ children, onRemove }: { children: ReactNode; onRemove: () => void }) {
  return (
    <span className="inline-flex h-7 items-center gap-1 rounded-full bg-brand-50 pl-2.5 pr-1 text-[0.75rem] font-semibold text-brand-800 ring-1 ring-brand-100">
      {children}
      <button type="button" onClick={onRemove} aria-label="Hatayein" className="flex h-5 w-5 items-center justify-center rounded-full hover:bg-brand-100"><X className="h-3 w-3" /></button>
    </span>
  );
}

const noExtras = () => () => null;

function Kpi({ icon: Icon, color, label, value, hint, onClick, active }: {
  icon: LucideIcon; color: string; label: string; value: ReactNode; hint?: ReactNode; onClick?: () => void; active?: boolean;
}) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag type={onClick ? 'button' : undefined} onClick={onClick}
      className={cn('flex min-w-0 flex-col rounded-2xl bg-white p-4 text-left shadow-sm ring-1 transition',
        active ? 'ring-2 ring-brand-500' : 'ring-slate-200/80', onClick && 'hover:-translate-y-0.5 hover:shadow-md')}>
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-[0.8125rem] font-medium text-slate-500">{label}</span>
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: `${color}17`, color }}><Icon className="h-4 w-4" /></span>
      </div>
      <div className="mt-1 truncate text-[1.375rem] font-bold tabular-nums tracking-tight text-slate-900">{value}</div>
      {hint && <div className="mt-0.5 truncate text-[0.75rem] text-slate-500">{hint}</div>}
    </Tag>
  );
}


export function SalesHistoryPage({ config }: { config: SalesHistoryConfig }) {
  const h = useSalesHistory();
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
  const [prefs, setPrefs] = useState(false);
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
      customer: s.customer.name, shop: tenantName || 'Hamari dukaan', phone: (settings as { shopPhone?: string } | undefined)?.shopPhone ?? '',
      bill: s.saleNumber, total: formatPKR(s.total), paid: formatPKR(s.paidAmount), baqi: formatPKR(s.creditAmount),
      tareekh: new Intl.DateTimeFormat('en-PK', { dateStyle: 'medium' }).format(new Date(s.soldAt)),
      cheezein: items + (s.items.length > 6 ? `\n• +${s.items.length - 6} aur` : ''),
    }));
  }, [templates, tenantName, settings]);

  const refresh = () => ['sales-history', 'sales-list', 'sales-summary', 'products', 'products-for-pos', 'customers', 'customers-for-pos', 'dashboard-overview']
    .forEach((k) => qc.invalidateQueries({ queryKey: [k] }));

  const voidMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => salesApi.voidSale(id, reason),
    onSuccess: () => { toast.success('Bill wapas le liya — stock wapas aa gaya'); setVoidTarget(null); setOpen(null); refresh(); },
    onError: (e: { response?: { data?: { message?: string } }; message?: string }) => toast.error(e?.response?.data?.message || e.message || 'Wapas nahi hua'),
  });

  /** Scanned or typed bill number → open that bill. */
  const openBill = useCallback(async (code: string) => {
    const c = code.trim();
    if (!c) return;
    try {
      const res = await salesHistoryApi.list({ ...h.filters, from: 'all', method: undefined, status: 'all', staffId: undefined, source: undefined, search: c }, 1, 5);
      const hit = res.items.find((s) => s.saleNumber.toLowerCase() === c.toLowerCase()) ?? (res.items.length === 1 ? res.items[0] : null);
      if (hit) setOpen(hit);
      else toast.error(`Bill "${c}" nahi mila`);
    } catch { toast.error('Bill dhoonda nahi ja saka'); }
  }, [h.filters]);

  const exportAll = async (kind: 'csv') => {
    setExporting(true);
    try {
      const { sales, stats } = await fetchAllSales(h.filters);
      if (!sales.length) { toast.error('Is filter mein koi bill nahi'); return; }
      if (kind === 'csv') salesCsv(sales, [
        `Bikri ka record — ${tenantName ?? ''}${shopName ? ` · ${shopName}` : ''}`, `Muddat: ${label}`,
        `Bill: ${stats?.bills ?? 0} · Kul: ${stats?.total.toFixed(2)} · Mila: ${stats?.paid.toFixed(2)} · Udhaar: ${stats?.credit.toFixed(2)}`,
      ]);
      toast.success(`${sales.length} bill CSV mein`);
    } catch { toast.error('Export nahi hua'); } finally { setExporting(false); }
  };
  const printDoc = async () => {
    const { sales, stats } = await fetchAllSales(h.filters, 2000);
    return salesDoc(sales, stats, label, money, !costHidden);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (document.querySelector('[role="dialog"]') || e.metaKey || e.ctrlKey || e.altKey) return;
      const t = (document.activeElement as HTMLElement | null)?.tagName;
      if (t === 'INPUT' || t === 'TEXTAREA' || t === 'SELECT') return;
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
    if (key === today) return 'Aaj';
    if (key === businessDayKey(y, h.startHour)) return 'Kal';
    return new Intl.DateTimeFormat('en-PK', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(`${key}T12:00:00`));
  };

  const st = h.stats;
  return (
    <div className="mx-auto w-full max-w-[96rem] space-y-4 pb-12">
      {scanner && <BarcodeScanner onDetected={(c: string) => { setScanner(false); void openBill(c); }} onClose={() => setScanner(false)} />}
      {open && (
        <SaleDrawer sale={open} money={money} cost={cost} costHidden={costHidden} waLink={billWa(open)} extra={extraFor(open)}
          onReturn={() => setReturnTarget(open)} onVoid={() => setVoidTarget(open)} onClose={() => setOpen(null)} />
      )}
      {voidTarget && <VoidSaleModal sale={voidTarget} loading={voidMutation.isPending} onConfirm={(reason) => voidMutation.mutate({ id: voidTarget.id, reason })} onClose={() => setVoidTarget(null)} />}
      {returnTarget && (
        <ReturnModal sale={returnTarget} onClose={() => setReturnTarget(null)} onDone={() => { setReturnTarget(null); setOpen(null); refresh(); }} />
      )}
      {prefs && <ReceiptPrefsModal onClose={() => setPrefs(false)} />}
      {guide && <SalesGuide onClose={() => setGuide(false)} />}

      {/* Header */}
      {/* Hero: the glow sits in its own clipped layer so the print menu can drop below. */}
      <div className="relative z-20 rounded-[1.75rem] bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900 p-5 text-white shadow-xl shadow-brand-900/20 sm:p-7">
        <span className="pointer-events-none absolute inset-0 overflow-hidden rounded-[1.75rem]" aria-hidden>
          <span className="absolute -right-24 -top-28 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
          <span className="absolute -bottom-32 left-1/4 h-64 w-64 rounded-full bg-fuchsia-300/10 blur-3xl" />
          <svg className="absolute inset-0 h-full w-full opacity-[0.07]"><defs><pattern id="sh-dots" width="18" height="18" patternUnits="userSpaceOnUse"><circle cx="1.5" cy="1.5" r="1.5" fill="white" /></pattern></defs><rect width="100%" height="100%" fill="url(#sh-dots)" /></svg>
        </span>
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[0.8125rem] font-medium text-white/70">{config.label} · {shopName ?? tenantName}</p>
            <h1 className="mt-0.5 text-2xl font-bold tracking-tight sm:text-[1.875rem]">Bikri ka record</h1>
            <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[0.8125rem] font-medium text-white/90 ring-1 ring-white/20">
              <CalendarRange className="h-3.5 w-3.5" />{label}
              {h.fetching && !h.loading && <span className="ml-1 h-1.5 w-1.5 animate-pulse rounded-full bg-white" aria-label="Taaza ho raha hai" />}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <PrivacyToggle compact />
            <button type="button" onClick={() => setScanner(true)} title="Bill ka barcode scan (B)" className={heroBtn}>
              <ScanLine className="h-4 w-4" /> <span className="hidden sm:inline">Bill scan</span>
            </button>
            <button type="button" onClick={() => void exportAll('csv')} disabled={exporting} className={heroBtn}>
              <Download className="h-4 w-4" /> {exporting ? 'Ban raha…' : 'CSV'}
            </button>
            <span className="[&_button]:border-white/25 [&_button]:bg-white [&_button]:text-slate-800"><PrintButton doc={printDoc} label="Print" /></span>
            <button type="button" onClick={() => setPrefs(true)} title="Receipt settings" className={heroIcon}><Settings2 className="h-4 w-4" /></button>
            <button type="button" onClick={() => setGuide(true)} title="Guide (G)" className={heroIcon}><GraduationCap className="h-4 w-4" /></button>
          </div>
        </div>

        <div className="relative mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1fr] lg:items-end">
          <div className="sm:col-span-2 lg:col-span-1">
            <p className="text-[0.8125rem] font-medium text-white/70">Kul bikri</p>
            {h.loading || !st ? <span className="mt-1 block h-11 w-48 animate-pulse rounded-xl bg-white/15" /> : (
              <>
                <p className="mt-0.5 text-[2.25rem] font-bold leading-tight tracking-tight tabular-nums sm:text-[2.75rem]">{money(st.total)}</p>
                <p className="text-[0.8125rem] text-white/75">{st.bills} bill · {Number(st.qty.toFixed(2))} cheezein{st.voided ? ` · ${st.voided} void` : ''}</p>
              </>
            )}
          </div>
          {[
            { label: 'Haath mein aaya', value: st ? money(st.paid) : '', hint: st?.change ? `wapsi ${money(st.change)}` : 'cash + online' },
            { label: 'Munafa', value: st ? cost(st.profit) : '', hint: costHidden ? 'Cost lock hai' : st ? `${st.margin.toFixed(1)}% margin` : '' },
            { label: 'Ausat bill', value: st ? money(st.average) : '', hint: st ? `${st.lines} lines` : '' },
          ].map((x) => (
            <div key={x.label} className="rounded-2xl bg-white/10 p-3.5 ring-1 ring-white/15 backdrop-blur-sm">
              <p className="text-[0.75rem] font-medium text-white/70">{x.label}</p>
              {h.loading || !st ? <span className="mt-1 block h-7 w-24 animate-pulse rounded-lg bg-white/15" /> : (
                <>
                  <p className="mt-0.5 truncate text-[1.25rem] font-bold tabular-nums">{x.value}</p>
                  <p className="truncate text-[0.6875rem] text-white/65">{x.hint}</p>
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Secondary numbers */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        {h.loading || !st ? Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-[6.5rem] rounded-2xl" />) : (
          <>
            <Kpi icon={BookOpen} color="#d97706" label="Udhaar" value={money(st.credit)} hint={`${st.creditCount} bill · dabayein`}
              onClick={() => h.setStatus(h.status === 'credit' ? 'all' : 'credit')} active={h.status === 'credit'} />
            <Kpi icon={Sparkles} color="#db2777" label="Discount" value={money(st.discount)} hint={st.total ? `${((st.discount / (st.total + st.discount)) * 100).toFixed(1)}% bikri ka` : undefined} />
            <Kpi icon={RotateCcw} color="#ea580c" label="Maal wapas" value={money(st.refunded)} hint={`${st.voided} void bill`}
              onClick={() => h.setStatus(h.status === 'returned' ? 'all' : 'returned')} active={h.status === 'returned'} />
            <Kpi icon={Package} color="#0891b2" label="Cheezein biki" value={String(Number(st.qty.toFixed(2)))} hint={`${st.lines} lines`} />
            <Kpi icon={Trophy} color="#16a34a" label="Sab se bara bill" value={st.best ? money(st.best.total) : '—'} hint={st.best ? `${st.best.saleNumber} · kholein` : undefined}
              onClick={st.best ? () => void openBill(st.best!.saleNumber) : undefined} />
          </>
        )}
      </div>

      {/* Filters */}
      <div className="relative z-10 rounded-3xl bg-white p-3 shadow-sm ring-1 ring-slate-200/80 sm:p-4">
        <div className="flex flex-col gap-2 xl:flex-row">
          <label className="group relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-600" />
            <input ref={searchRef} value={h.search} onChange={(e) => h.setSearch(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && /^[A-Z]{2}-\d+$/i.test(h.search.trim())) void openBill(h.search); }}
              placeholder="Bill number, customer, phone, product ya barcode…" aria-label="Bikri dhoondein"
              className="h-11 w-full rounded-2xl border-0 bg-slate-100/80 pl-12 pr-16 text-[0.9375rem] outline-none ring-1 ring-transparent transition focus:bg-white focus:ring-2 focus:ring-brand-500" />
            {h.search
              ? <button type="button" onClick={() => h.setSearch('')} aria-label="Saaf" className="absolute right-2.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-200"><X className="h-4 w-4" /></button>
              : <Kbd className="absolute right-3 top-1/2 hidden -translate-y-1/2 sm:inline-flex">/</Kbd>}
          </label>
          <div className="flex flex-wrap gap-2">
            <FilterMenu icon={CalendarRange} label="Tareekh" value={h.preset} active={h.preset !== 'today'} width="w-72"
              options={[...DATE_PRESETS.map((p) => ({ value: p.id, label: p.label })), { value: 'custom' as const, label: 'Apni tareekh', hint: 'Neeche se chunein' }]}
              onChange={(v) => h.setPreset(v)}
              footer={() => (
                <div className="mt-1 grid grid-cols-2 gap-2 border-t border-slate-100 p-2 pt-3">
                  {(['from', 'to'] as const).map((k) => (
                    <label key={k} className="text-[0.6875rem] font-semibold uppercase tracking-wide text-slate-500">
                      {k === 'from' ? 'Se' : 'Tak'}
                      <input type="date" value={h.custom[k] || (h.range[k] === 'all' ? '' : h.range[k])} max={businessDayKey(new Date(), h.startHour)}
                        onChange={(e) => { h.setCustom({ ...h.custom, [k]: e.target.value }); h.setPreset('custom'); }}
                        className="mt-1 block h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-[0.8125rem] font-normal normal-case tracking-normal text-slate-900" />
                    </label>
                  ))}
                </div>
              )} />
            <FilterMenu icon={Wallet} label="Payment" value={h.method ?? 'all'} active={!!h.method}
              options={[{ value: 'all', label: 'Har payment' }, ...POS_PAYMENT_METHODS.map((m) => ({ value: m.id, label: m.label, icon: m.icon, color: PAYMENT_COLORS[m.id] }))]}
              onChange={(v) => h.setMethod(v === 'all' ? undefined : (v as PaymentMethod))} />
            <FilterMenu icon={ListFilter} label="Bill" value={h.status} active={h.status !== 'all'} options={STATUSES} onChange={h.setStatus} />
            {team.length > 1 && (
              <FilterMenu icon={UserRound} label="Staff" value={h.staffId ?? 'all'} active={!!h.staffId}
                options={[{ value: 'all', label: 'Sab staff' }, ...team.map((m) => ({ value: m.id, label: m.fullName }))]}
                onChange={(v) => h.setStaffId(v === 'all' ? undefined : v)} />
            )}
            <FilterMenu icon={ArrowDownWideNarrow} label="Tarteeb" value={h.sort} options={SORTS} onChange={h.setSort} align="right" width="w-56" />
          </div>
        </div>

        {h.hasFilters && (
          <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-slate-100 pt-3">
            <span className="mr-1 text-[0.75rem] font-medium text-slate-500">Lage filter:</span>
            {h.method && <FilterChip onRemove={() => h.setMethod(undefined)}>{POS_PAYMENT_METHODS.find((m) => m.id === h.method)?.label ?? h.method}</FilterChip>}
            {h.status !== 'all' && <FilterChip onRemove={() => h.setStatus('all')}>{STATUSES.find((x) => x.value === h.status)?.label}</FilterChip>}
            {h.staffId && <FilterChip onRemove={() => h.setStaffId(undefined)}>{team.find((m) => m.id === h.staffId)?.fullName ?? 'Staff'}</FilterChip>}
            {h.search.trim() && <FilterChip onRemove={() => h.setSearch('')}>"{h.search.trim()}"</FilterChip>}
            <button type="button" onClick={h.clear} className="ml-auto inline-flex h-7 items-center gap-1 rounded-full px-2.5 text-[0.75rem] font-semibold text-rose-700 hover:bg-rose-50"><X className="h-3.5 w-3.5" />Sab hatayein</button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="tablist" className="inline-flex gap-1 rounded-2xl bg-white p-1 shadow-sm ring-1 ring-slate-200/80">
          {([['bills', ListChecks, 'Bill', h.count], ['analytics', BarChart3, 'Analytics', null]] as const).map(([id, Icon, text, n]) => (
            <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)}
              className={cn('inline-flex h-9 items-center gap-2 rounded-xl px-4 text-[0.875rem] font-semibold transition', tab === id ? 'bg-slate-900 text-white shadow' : 'text-slate-600 hover:bg-slate-100')}>
              <Icon className="h-4 w-4" />{text}
              {n !== null && <span className={cn('rounded-full px-1.5 text-[0.6875rem] tabular-nums', tab === id ? 'bg-white/20' : 'bg-slate-100 text-slate-600')}>{n}</span>}
            </button>
          ))}
        </div>
        <p className="hidden items-center gap-1.5 text-[0.75rem] text-slate-500 sm:inline-flex"><Kbd>A</Kbd> se badlein</p>
      </div>

      {tab === 'analytics' ? (
        <SalesAnalytics data={analytics.data} stats={st} loading={analytics.isLoading} money={money} cost={cost} costHidden={costHidden} salesHidden={salesHidden} />
      ) : (
        <div className="space-y-4">
          {h.pendingCount > 0 && (
            <p className="flex items-center gap-2 rounded-2xl bg-sky-50 px-4 py-3 text-[0.8125rem] font-medium text-sky-800 ring-1 ring-sky-100">
              <CloudOff className="h-4 w-4" /> {h.pendingCount} bill is computer par save hain — internet aate hi server par chale jayenge
            </p>
          )}
          {h.loading ? (
            <div className="space-y-2 rounded-3xl bg-white p-4 ring-1 ring-slate-200/80">{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
          ) : h.sales.length === 0 ? (
            <div className="flex flex-col items-center rounded-3xl bg-white px-6 py-16 text-center ring-1 ring-slate-200/80">
              <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-brand-fg shadow-lg"><ShoppingCart className="h-7 w-7" /></span>
              <h3 className="mt-4 text-lg font-semibold text-slate-900">{h.hasFilters ? 'Is filter mein koi bill nahi' : 'Is muddat mein koi bikri nahi'}</h3>
              <p className="mt-1 text-[0.875rem] text-slate-500">{h.hasFilters ? 'Filter badal kar dekhein' : 'POS se pehli bikri karein, ya muddat badlein'}</p>
              <div className="mt-4">{h.hasFilters ? <Button variant="secondary" onClick={h.clear}>Filter hatayein</Button> : <Button onClick={() => navigate('/pos')}>POS kholein</Button>}</div>
            </div>
          ) : (
            days.map((d) => (
              <section key={d.key} className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
                <header className="flex items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/70 px-4 py-2.5 sm:px-5">
                  <h2 className="text-[0.875rem] font-semibold text-slate-900">{dayTitle(d.key)} <span className="font-normal text-slate-500">· {d.sales.length} bill</span></h2>
                  <span className="text-[0.9375rem] font-bold tabular-nums text-slate-900">{money(d.total)}</span>
                </header>
                <div className={cn('hidden border-b border-slate-100 px-5 py-2 text-[0.6875rem] font-semibold uppercase tracking-wide text-slate-400 lg:grid', ROW_GRID)}>
                  <span>Bill</span><span>Customer</span><span>Cheezein</span><span>Payment</span><span>Staff</span><span className="text-right">Raqam</span><span />
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
              {h.loadingMore ? 'Aa rahe hain…' : `Aur bill dikhayein (${h.sales.length - h.pendingCount} / ${h.count})`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function SalesGuide({ onClose }: { onClose: () => void }) {
  const steps: Array<{ icon: LucideIcon; color: string; title: string; text: string }> = [
    { icon: CalendarRange, color: '#2563eb', title: 'Din chunein', text: '"Tareekh" se Aaj, Kal, 7 din ya apni tareekh. Upar ke saare number isi muddat ke hain.' },
    { icon: Search, color: '#7c3aed', title: 'Bill dhoondein', text: 'Bill number, customer ka naam, phone ya product likhein. Purana bill ho to "Bill scan" se barcode scan karein.' },
    { icon: ListFilter, color: '#d97706', title: 'Filter lagayein', text: 'Payment, udhaar wale, wapsi wale ya staff. Lage filter neeche dikhte hain, X se hat jate hain.' },
    { icon: MousePointerClick, color: '#16a34a', title: 'Bill kholein', text: 'Kisi bhi bill par click karein: poori cheezein, munafa, print, WhatsApp, maal wapas aur void.' },
    { icon: BarChart3, color: '#db2777', title: 'Analytics dekhein', text: 'Kab rush hota hai, kya zyada bikta hai, kaun se customer aate hain, aur pichli dafa se muqabla.' },
    { icon: FileDown, color: '#0891b2', title: 'Report nikaalein', text: 'CSV ya Print/PDF. Is filter ke saare bill aa jate hain, accountant ko bhej dein.' },
  ];
  return (
    <Modal open onClose={onClose} size="lg" title="Bikri ka record — aasaan tareeqa" description="6 cheezein, bas itna yaad rakhein">
      <ol className="grid gap-3 sm:grid-cols-2">
        {steps.map((st, i) => (
          <li key={st.title} className="flex gap-3 rounded-2xl bg-slate-50 p-3.5 ring-1 ring-slate-100">
            <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: `${st.color}17`, color: st.color }}>
              <st.icon className="h-5 w-5" />
              <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-[0.625rem] font-bold text-white">{i + 1}</span>
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
          <span className="font-semibold text-slate-900">Jaldi ke liye:</span>
          <span className="inline-flex items-center gap-1"><Kbd>/</Kbd> dhoondein</span>
          <span className="inline-flex items-center gap-1"><Kbd>B</Kbd> scan</span>
          <span className="inline-flex items-center gap-1"><Kbd>A</Kbd> analytics</span>
          <span className="inline-flex items-center gap-1"><Kbd>G</Kbd> guide</span>
        </div>
        <Link to="/day-report" className="text-[0.8125rem] font-semibold text-brand-700 hover:underline">Din ka hisaab (item war) →</Link>
      </div>
    </Modal>
  );
}
