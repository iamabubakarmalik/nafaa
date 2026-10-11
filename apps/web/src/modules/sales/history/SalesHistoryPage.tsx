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
  ArrowDownWideNarrow, BarChart3, BookOpen, CalendarRange, CloudOff, Download, GraduationCap, ListChecks, Package, Receipt,
  ScanLine, Search, Settings2, ShoppingCart, Sparkles, Target, TrendingUp, Trophy, Wallet, X, type LucideIcon,
} from 'lucide-react';
import { Button, Modal, Skeleton } from '@/design-system/components';
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
import { salesHistoryApi, type HistorySale, type HistoryStatus } from './api';
import { DATE_PRESETS, rangeLabel } from './dates';
import { fetchAllSales, salesCsv, salesDoc } from './exportSales';
import { useSalesAnalytics, useSalesHistory } from './useSalesHistory';
import { ReceiptPrefsModal } from './components/ReceiptPrefsModal';
import { SaleDrawer } from './components/SaleDrawer';
import { SaleRow } from './components/SaleRow';
import { SalesAnalytics } from './components/SalesAnalytics';
import { VoidSaleModal } from './components/VoidSaleModal';

export interface SalesHistoryConfig {
  label: string;
  /** Industry block under a bill's items (serials, warranty…), given the loaded bills. */
  useBillExtras?: (sales: HistorySale[]) => (sale: HistorySale) => ReactNode;
}

const STATUSES: Array<{ id: HistoryStatus; label: string }> = [
  { id: 'all', label: 'Sab' }, { id: 'credit', label: 'Udhaar wale' }, { id: 'returned', label: 'Wapsi wale' }, { id: 'voided', label: 'Void' },
];
const SORTS = [{ id: 'new', label: 'Naye pehle' }, { id: 'old', label: 'Purane pehle' }, { id: 'high', label: 'Bari raqam' }, { id: 'low', label: 'Chhoti raqam' }] as const;

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

const chip = (on: boolean) => cn('inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-[0.8125rem] font-medium transition',
  on ? 'bg-slate-900 text-white shadow-sm' : 'bg-slate-100 text-slate-700 hover:bg-slate-200');

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
  const [customOpen, setCustomOpen] = useState(false);
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
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900 p-5 text-white shadow-lg sm:p-6">
        <span className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-white/10 blur-3xl" aria-hidden />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[0.8125rem] font-medium text-white/75">{config.label} · {shopName ?? tenantName}</p>
            <h1 className="mt-0.5 text-2xl font-bold tracking-tight sm:text-[1.75rem]">Bikri ka record</h1>
            <p className="mt-1 inline-flex items-center gap-1.5 text-[0.875rem] text-white/85"><CalendarRange className="h-4 w-4" />{label}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <PrivacyToggle compact />
            <button type="button" onClick={() => setScanner(true)} title="Bill ka barcode scan (B)"
              className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-white/15 px-3 text-[0.8125rem] font-semibold ring-1 ring-white/25 backdrop-blur transition hover:bg-white/25">
              <ScanLine className="h-4 w-4" /> Bill scan
            </button>
            <button type="button" onClick={() => void exportAll('csv')} disabled={exporting}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-white/15 px-3 text-[0.8125rem] font-semibold ring-1 ring-white/25 backdrop-blur transition hover:bg-white/25 disabled:opacity-60">
              <Download className="h-4 w-4" /> {exporting ? 'Ban raha…' : 'CSV'}
            </button>
            <span className="[&_button]:border-white/25 [&_button]:bg-white [&_button]:text-slate-800"><PrintButton doc={printDoc} label="Print" /></span>
            <button type="button" onClick={() => setPrefs(true)} title="Receipt settings" className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/25 hover:bg-white/25"><Settings2 className="h-4 w-4" /></button>
            <button type="button" onClick={() => setGuide(true)} title="Guide (G)" className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/25 hover:bg-white/25"><GraduationCap className="h-4 w-4" /></button>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
        {h.loading || !st ? Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="h-[6.5rem] rounded-2xl" />) : (
          <>
            <Kpi icon={TrendingUp} color="#2563eb" label="Kul bikri" value={money(st.total)} hint={`${st.bills} bill`} />
            <Kpi icon={Receipt} color="#7c3aed" label="Ausat bill" value={money(st.average)} hint={`${st.lines} lines`} />
            <Kpi icon={Wallet} color="#16a34a" label="Mila" value={money(st.paid)} hint={st.change ? `wapsi ${money(st.change)}` : 'cash + online'} />
            <Kpi icon={BookOpen} color="#d97706" label="Udhaar" value={money(st.credit)} hint={`${st.creditCount} bill`}
              onClick={() => h.setStatus(h.status === 'credit' ? 'all' : 'credit')} active={h.status === 'credit'} />
            <Kpi icon={Target} color="#059669" label="Munafa" value={cost(st.profit)} hint={costHidden ? 'Cost lock' : `${st.margin.toFixed(1)}% margin`} />
            <Kpi icon={Sparkles} color="#db2777" label="Discount" value={money(st.discount)} hint={st.refunded ? `wapsi ${money(st.refunded)}` : undefined} />
            <Kpi icon={Package} color="#0891b2" label="Items" value={String(Number(st.qty.toFixed(2)))} hint="qty biki" />
            <Kpi icon={Trophy} color="#ea580c" label="Sab se bara" value={st.best ? money(st.best.total) : '—'} hint={st.best?.saleNumber}
              onClick={st.best ? () => void openBill(st.best!.saleNumber) : undefined} />
          </>
        )}
      </div>

      {/* Filters */}
      <div className="space-y-3 rounded-3xl bg-white p-3 shadow-sm ring-1 ring-slate-200/80 sm:p-4">
        <div className="flex flex-col gap-2 lg:flex-row">
          <label className="group relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-600" />
            <input ref={searchRef} value={h.search} onChange={(e) => h.setSearch(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && /^[A-Z]{2}-\d+$/i.test(h.search.trim())) void openBill(h.search); }}
              placeholder="Bill number, customer, phone, product ya barcode…" aria-label="Bikri dhoondein"
              className="h-11 w-full rounded-2xl border-0 bg-slate-100/80 pl-12 pr-10 text-[0.9375rem] outline-none ring-1 ring-transparent transition focus:bg-white focus:ring-2 focus:ring-brand-500" />
            {h.search && <button type="button" onClick={() => h.setSearch('')} aria-label="Saaf" className="absolute right-2.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-200"><X className="h-4 w-4" /></button>}
          </label>
          <div className="flex flex-wrap gap-2">
            {team.length > 1 && (
              <select value={h.staffId ?? ''} onChange={(e) => h.setStaffId(e.target.value || undefined)} aria-label="Staff"
                className="h-11 rounded-2xl border-0 bg-slate-100/80 px-3 text-[0.8125rem] font-medium text-slate-700 outline-none focus:ring-2 focus:ring-brand-500">
                <option value="">Sab staff</option>
                {team.map((m) => <option key={m.id} value={m.id}>{m.fullName}</option>)}
              </select>
            )}
            <label className="relative inline-flex">
              <ArrowDownWideNarrow className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <select value={h.sort} onChange={(e) => h.setSort(e.target.value as typeof h.sort)} aria-label="Tarteeb"
                className="h-11 appearance-none rounded-2xl border-0 bg-slate-100/80 pl-9 pr-4 text-[0.8125rem] font-medium text-slate-700 outline-none focus:ring-2 focus:ring-brand-500">
                {SORTS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </label>
          </div>
        </div>

        <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 [scrollbar-width:none]">
          {DATE_PRESETS.map((p) => (
            <button key={p.id} type="button" onClick={() => { h.setPreset(p.id); setCustomOpen(false); }} className={chip(h.preset === p.id)}>{p.label}</button>
          ))}
          <button type="button" onClick={() => setCustomOpen((v) => !v)} className={chip(h.preset === 'custom')}><CalendarRange className="h-3.5 w-3.5" /> Apni tareekh</button>
        </div>
        {customOpen && (
          <div className="flex flex-wrap items-end gap-2 rounded-2xl bg-slate-50 p-3">
            {(['from', 'to'] as const).map((k) => (
              <label key={k} className="text-[0.75rem] font-medium text-slate-500">
                {k === 'from' ? 'Se' : 'Tak'}
                <input type="date" value={h.custom[k]} max={businessDayKey(new Date(), h.startHour)}
                  onChange={(e) => { h.setCustom({ ...h.custom, [k]: e.target.value }); h.setPreset('custom'); }}
                  className="mt-1 block h-10 rounded-xl border border-slate-200 bg-white px-3 text-[0.875rem] text-slate-900" />
              </label>
            ))}
          </div>
        )}

        <div className="-mx-1 flex flex-wrap gap-1.5 px-1">
          <button type="button" onClick={() => h.setMethod(undefined)} className={chip(!h.method)}>Har payment</button>
          {POS_PAYMENT_METHODS.map((m) => {
            const on = h.method === m.id;
            return (
              <button key={m.id} type="button" onClick={() => h.setMethod(on ? undefined : (m.id as PaymentMethod))}
                className={cn('inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[0.8125rem] font-medium transition', on ? 'text-white shadow-sm' : 'text-slate-700 hover:bg-slate-200')}
                style={on ? { backgroundColor: PAYMENT_COLORS[m.id] } : { backgroundColor: `${PAYMENT_COLORS[m.id]}12` }}>
                <m.icon className="h-3.5 w-3.5" style={on ? undefined : { color: PAYMENT_COLORS[m.id] }} />{m.label}
              </button>
            );
          })}
          <span className="mx-1 w-px bg-slate-200" aria-hidden />
          {STATUSES.map((s) => <button key={s.id} type="button" onClick={() => h.setStatus(s.id)} className={chip(h.status === s.id)}>{s.label}</button>)}
          {h.hasFilters && <button type="button" onClick={h.clear} className="inline-flex h-8 items-center gap-1 rounded-full px-3 text-[0.8125rem] font-medium text-rose-700 hover:bg-rose-50"><X className="h-3.5 w-3.5" />Filter hatayein</button>}
        </div>
      </div>

      {/* Tabs */}
      <div role="tablist" className="inline-flex gap-1 rounded-2xl bg-white p-1 shadow-sm ring-1 ring-slate-200/80">
        {([['bills', ListChecks, `Bill · ${h.count}`], ['analytics', BarChart3, 'Analytics']] as const).map(([id, Icon, text]) => (
          <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)}
            className={cn('inline-flex h-9 items-center gap-2 rounded-xl px-4 text-[0.875rem] font-semibold transition', tab === id ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100')}>
            <Icon className="h-4 w-4" />{text}
          </button>
        ))}
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
  const tips: Array<[string, string]> = [
    ['Har muddat ka sahi total', 'Aaj se le kar "Sab" tak — upar ke number poore filter ke hain, sirf nazar aane wale bill ke nahi.'],
    ['Dhoondna', 'Bill number, customer ka naam ya phone, product ka naam ya barcode — sab se milta hai.'],
    ['Bill scan (B)', 'Customer purana bill laye to uska barcode scan karein — wohi bill khul jata hai.'],
    ['Bill kholein', 'Kisi bhi bill par click karein: poori cheezein, hisaab, munafa, aur print, WhatsApp, maal wapas, void.'],
    ['Udhaar wale', 'Udhaar ke card par click karein — sirf udhaar wale bill.'],
    ['Analytics (A)', 'Rujhan, masroof ghanta, behtar din, payment, top products, customers aur staff — isi filter ka.'],
    ['CSV, Print, PDF', 'Is filter ke saare bill — accountant ko bhejein ya file mein rakhein.'],
  ];
  return (
    <Modal open onClose={onClose} size="lg" title="Bikri ka record kaise dekhein" description="/ search · B bill scan · A analytics">
      <ul className="space-y-3">
        {tips.map(([t, d]) => (
          <li key={t} className="flex gap-3 text-[0.875rem]">
            <span className="w-40 shrink-0 font-semibold text-slate-900">{t}</span>
            <span className="text-slate-600">{d}</span>
          </li>
        ))}
      </ul>
      <div className="mt-4 flex justify-end"><Link to="/day-report" className="text-[0.8125rem] font-semibold text-brand-700 hover:underline">Din ka hisaab (item war) →</Link></div>
    </Modal>
  );
}
