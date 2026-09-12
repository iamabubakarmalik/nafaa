// apps/web/src/industries/electronics/pages/ElectronicsSalesPage.tsx
import { useState, useMemo, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Receipt, Search, RefreshCw, FileSpreadsheet, Printer, Calendar,
  Barcode, Cpu, Layers, Wallet, Coins, TrendingUp, Package,
  GraduationCap, Keyboard, X, CheckCircle2, Sparkles, ChevronDown,
  ChevronRight, ShieldCheck, ShieldAlert, CreditCard, Banknote,
  Smartphone, Building2, HandCoins, ArrowRight, User, Clock, Hash,
  AlertTriangle, Eye, Settings2, Check, Minimize2, Maximize2,
  Trophy, Zap, BarChart3, ShoppingCart, BookOpen, CalendarRange,
} from 'lucide-react';
import {
  ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, Legend, AreaChart, Area,
} from 'recharts';
import { toast } from 'sonner';
import { Button } from '@core/ui/Button';
import { formatPKR } from '@core/lib/format';
import { useAuthStore, useShopParam } from '@core/stores/auth.store';
import { useCostHidden, PrivacyToggle } from '@core/ui/HiddenValue';
import { PrintStyles } from '@core/components/print/PrintStyles';
import { salesApi, type Sale } from '@modules/sales/sales/api/sales.api';

/* ═════════════════════════════════════════════════════════════
   🔌 NAFAA ELECTRONICS SALES — FULL BEST v2 (Retail-beater)
   ─────────────────────────────────────────────────────────────
   🔖 Serial/IMEI/MAC tabs — kaun sa unit kis ko gaya
   🛡️  Warranty countdown badge har serial pe (hara/peela/grey)
   ⚙️  Receipt Quick-Settings popover (58/80mm, short/full, autoprint)
   🖨️  Har row pe direct Print — prefs ke saath
   📊 7-day trend + payment split charts (PIN-aware)
   🏆 Best-sale trophy strip • 🔒 PrivacyToggle
   🎓 Guide (G) • ⌨️ Shortcuts (?) • 📄 CSV with serial columns
   🌙 Dark mode COMPLETE • 📱 Mobile → 4K responsive
   ═════════════════════════════════════════════════════════════ */

type Tab = 'all' | 'serial' | 'normal' | 'credit';

const PAY_META: Record<string, { label: string; icon: any; chip: string; hex: string }> = {
  CASH:          { label: 'Cash',      icon: Banknote,   chip: 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300', hex: '#10b981' },
  CARD:          { label: 'Card',      icon: CreditCard, chip: 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300',             hex: '#3b82f6' },
  BANK_TRANSFER: { label: 'Bank',      icon: Building2,  chip: 'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300',     hex: '#8b5cf6' },
  JAZZCASH:      { label: 'JazzCash',  icon: Smartphone, chip: 'bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-300',     hex: '#f97316' },
  EASYPAISA:     { label: 'EasyPaisa', icon: Zap,        chip: 'bg-lime-100 dark:bg-lime-500/20 text-lime-700 dark:text-lime-300',             hex: '#22c55e' },
};

const PRESETS = [
  { key: '1', label: 'Aaj' },
  { key: '7', label: '7 Din' },
  { key: '30', label: '30 Din' },
  { key: '90', label: '3 Mahine' },
  { key: 'all', label: 'Sab' },
] as const;

const daysAgo = (d: number) => {
  const x = new Date();
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - d + 1);
  return x;
};

const hasSerial = (s: Sale) => s.items?.some((it: any) => (it.serials?.length ?? 0) > 0);
const serialsOf = (s: Sale) => s.items?.flatMap((it: any) => it.serials ?? []) ?? [];

const warrantyLeft = (endDate?: string | null): number | null => {
  if (!endDate) return null;
  return Math.ceil((new Date(endDate).getTime() - Date.now()) / 86_400_000);
};

/* ════════════════════════════════════════════════════════════
   RECEIPT PREFS — electronics apni key, POS keys se default
   ════════════════════════════════════════════════════════════ */
const ELEC_RECEIPT_PREFS_KEY = 'nafaa.electronics.receipt.prefs';

interface ReceiptPrefs {
  paperWidth: '58' | '80';
  mode: 'short' | 'full';
  autoPrint: boolean;
}

function getElecReceiptPrefs(): ReceiptPrefs {
  const posWidth = localStorage.getItem('nafaa.electronics-pos.printer-width') === '58' ? '58' : '80';
  const posAuto = localStorage.getItem('nafaa.electronics-pos.auto-print') !== 'false';
  const fallback: ReceiptPrefs = { paperWidth: posWidth, mode: 'short', autoPrint: posAuto };
  try {
    const raw = localStorage.getItem(ELEC_RECEIPT_PREFS_KEY);
    if (!raw) return fallback;
    return { ...fallback, ...JSON.parse(raw) };
  } catch {
    return fallback;
  }
}

function saveElecReceiptPrefs(p: ReceiptPrefs) {
  try {
    localStorage.setItem(ELEC_RECEIPT_PREFS_KEY, JSON.stringify(p));
    /* POS settings bhi sync — ek jaga badlo, sab jaga apply */
    localStorage.setItem('nafaa.electronics-pos.printer-width', p.paperWidth);
    localStorage.setItem('nafaa.electronics-pos.auto-print', String(p.autoPrint));
  } catch { /* storage full — ignore */ }
}

/* ══════════════════════════════════════════════════════════ */
export default function ElectronicsSalesPage() {
  const hideCost = useCostHidden();
  const currentShopId = useShopParam();
  const shopName = useAuthStore((s: any) => s.user?.assignedShop?.name);
  const tenantName = useAuthStore((s: any) => s.tenant?.name);

  const [tab, setTab] = useState<Tab>('all');
  const [search, setSearch] = useState('');
  const [preset, setPreset] = useState<string>('30');
  const [custom, setCustom] = useState(false);
  const [from, setFrom] = useState(daysAgo(30).toISOString().slice(0, 10));
  const [to, setTo] = useState(new Date().toISOString().slice(0, 10));
  const [pay, setPay] = useState<string>('all');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [showTeacher, setShowTeacher] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showReceiptSettings, setShowReceiptSettings] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  /* Receipt prefs */
  const [receiptPrefs, setReceiptPrefs] = useState<ReceiptPrefs>(getElecReceiptPrefs);
  const [prefsSaved, setPrefsSaved] = useState(false);
  const updateReceiptPrefs = (patch: Partial<ReceiptPrefs>) => {
    const next = { ...receiptPrefs, ...patch };
    setReceiptPrefs(next);
    saveElecReceiptPrefs(next);
    setPrefsSaved(true);
    setTimeout(() => setPrefsSaved(false), 1200);
  };

  /* Sale row ka receipt link — prefs ke saath */
  const receiptLink = (saleId: string, autoprint = false) =>
    `/sales/${saleId}/receipt?paper=${receiptPrefs.paperWidth}&mode=${receiptPrefs.mode}${autoprint ? '&autoprint=1' : ''}`;

  const { data: sales = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['sales', currentShopId],
    queryFn: () => salesApi.list(currentShopId || undefined),
  });

  /* ─── Shortcuts ─── */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      const typing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
      if (e.key === 'Escape') {
        if (showShortcuts) return setShowShortcuts(false);
        if (showTeacher) return setShowTeacher(false);
        if (showReceiptSettings) return setShowReceiptSettings(false);
        return;
      }
      if (typing || e.ctrlKey || e.metaKey) return;
      if (e.key === '/') { e.preventDefault(); searchRef.current?.focus(); }
      if (e.key === 'g') setShowTeacher(true);
      if (e.key === 'r') refetch();
      if (e.key === 'p') window.print();
      if (e.key === '?') setShowShortcuts((v) => !v);
      if (['1', '2', '3', '4'].includes(e.key)) {
        const t: Tab[] = ['all', 'serial', 'normal', 'credit'];
        setTab(t[Number(e.key) - 1]);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showTeacher, showShortcuts, showReceiptSettings]);

  const anyModal = showTeacher || showShortcuts;
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = anyModal ? 'hidden' : prev;
    return () => { document.body.style.overflow = prev; };
  }, [anyModal]);

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  /* ─── Date filter ─── */
  const dateFiltered = useMemo(() => {
    if (custom) {
      const f = new Date(from); f.setHours(0, 0, 0, 0);
      const t = new Date(to); t.setHours(23, 59, 59, 999);
      return sales.filter((s) => {
        const d = new Date(s.soldAt);
        return d >= f && d <= t;
      });
    }
    if (preset === 'all') return sales;
    const f = daysAgo(Number(preset));
    return sales.filter((s) => new Date(s.soldAt) >= f);
  }, [sales, custom, from, to, preset]);

  /* ─── Tab counts ─── */
  const counts = useMemo(() => ({
    all: dateFiltered.length,
    serial: dateFiltered.filter(hasSerial).length,
    normal: dateFiltered.filter((s) => !hasSerial(s)).length,
    credit: dateFiltered.filter((s) => (s.creditAmount ?? 0) > 0).length,
  }), [dateFiltered]);

  /* ─── Final list ─── */
  const list = useMemo(() => {
    let l = dateFiltered;
    if (tab === 'serial') l = l.filter(hasSerial);
    if (tab === 'normal') l = l.filter((s) => !hasSerial(s));
    if (tab === 'credit') l = l.filter((s) => (s.creditAmount ?? 0) > 0);
    if (pay !== 'all') l = l.filter((s) => s.paymentMethod === pay);

    const q = search.toLowerCase().trim();
    if (q) {
      l = l.filter((s) =>
        s.saleNumber.toLowerCase().includes(q) ||
        (s.customer?.name ?? '').toLowerCase().includes(q) ||
        (s.customer?.phone ?? '').includes(q) ||
        s.items?.some((it: any) =>
          (it.product?.name ?? '').toLowerCase().includes(q) ||
          (it.serials ?? []).some((sn: any) =>
            (sn.serialNumber ?? '').toLowerCase().includes(q) ||
            (sn.imei ?? '').includes(q) ||
            (sn.macAddress ?? '').toLowerCase().includes(q),
          ),
        ),
      );
    }
    return l;
  }, [dateFiltered, tab, pay, search]);

  /* ─── Stats ─── */
  const stats = useMemo(() => {
    let revenue = 0, cost = 0, credit = 0, units = 0, serialUnits = 0;
    for (const s of list) {
      revenue += s.total ?? 0;
      cost += s.costOfGoods ?? 0;
      credit += s.creditAmount ?? 0;
      for (const it of (s.items ?? []) as any[]) {
        units += it.quantity ?? 0;
        serialUnits += it.serials?.length ?? 0;
      }
    }
    const profit = revenue - cost;
    return {
      revenue, cost, credit, units, serialUnits, profit,
      margin: revenue > 0 ? (profit / revenue) * 100 : 0,
      avg: list.length > 0 ? revenue / list.length : 0,
    };
  }, [list]);

  /* 🏆 Best sale */
  const bestSale = useMemo(
    () => list.reduce<any>((b, s) => ((s.total ?? 0) > (b?.total ?? 0) ? s : b), null),
    [list],
  );

  /* ─── 7-day trend chart ─── */
  const trendData = useMemo(() => {
    const buckets: Record<string, { label: string; sales: number; orders: number }> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i); d.setHours(0, 0, 0, 0);
      const key = d.toISOString().slice(0, 10);
      buckets[key] = { label: d.toLocaleDateString('en-PK', { weekday: 'short' }), sales: 0, orders: 0 };
    }
    sales.forEach((s) => {
      const key = new Date(s.soldAt).toISOString().slice(0, 10);
      if (buckets[key]) { buckets[key].sales += s.total ?? 0; buckets[key].orders += 1; }
    });
    return Object.values(buckets);
  }, [sales]);

  /* ─── Payment split (filtered list se) ─── */
  const paymentData = useMemo(() => {
    const map = new Map<string, number>();
    list.forEach((s) => map.set(s.paymentMethod, (map.get(s.paymentMethod) ?? 0) + (s.total ?? 0)));
    return Array.from(map.entries())
      .map(([k, v]) => ({ name: PAY_META[k]?.label || k, value: v, color: PAY_META[k]?.hex || '#64748b' }))
      .filter((p) => p.value > 0);
  }, [list]);

  /* ─── CSV ─── */
  const exportCsv = () => {
    if (list.length === 0) return toast.error('Koi data nahi');
    const out: string[][] = [
      [`${tenantName ?? 'Nafaa'} — Electronics Sales`],
      [`Shop: ${shopName ?? 'All'}`, custom ? `${from} se ${to}` : `Pichle ${preset === 'all' ? 'sab' : preset} din`, new Date().toLocaleString('en-PK')],
      [],
      ['KHULASA'],
      ['Sales', String(list.length)],
      ['Bikri', String(Math.round(stats.revenue))],
      ['Lagat', String(Math.round(stats.cost))],
      ['Munafa', String(Math.round(stats.profit))],
      ['Margin %', stats.margin.toFixed(1)],
      ['Udhaar', String(Math.round(stats.credit))],
      ['Units bikay', String(stats.units)],
      ['Serial wale units', String(stats.serialUnits)],
      [],
      ['Invoice', 'Tareekh', 'Customer', 'Phone', 'Payment', 'Items', 'Serial/IMEI',
        'Bikri', 'Lagat', 'Munafa', 'Udhaar'],
      ...list.map((s) => {
        const sn = serialsOf(s);
        return [
          s.saleNumber,
          new Date(s.soldAt).toLocaleString('en-PK'),
          s.customer?.name ?? 'Walk-in',
          s.customer?.phone ?? '',
          PAY_META[s.paymentMethod]?.label ?? s.paymentMethod,
          (s.items ?? []).map((it: any) => `${it.product?.name ?? 'Item'} x${it.quantity}`).join(' | '),
          sn.map((x: any) => x.serialNumber + (x.imei ? `/${x.imei}` : '')).join(' | '),
          String(Math.round(s.total ?? 0)),
          String(Math.round(s.costOfGoods ?? 0)),
          String(Math.round((s.total ?? 0) - (s.costOfGoods ?? 0))),
          String(Math.round(s.creditAmount ?? 0)),
        ];
      }),
    ];
    const csv = out.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `electronics-sales-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${list.length} sales export ho gaye`);
  };

  const hasFilters = !!search || pay !== 'all' || tab !== 'all' || custom || preset !== '30';
  const clearFilters = () => {
    setSearch(''); setPay('all'); setTab('all');
    setCustom(false); setPreset('30');
  };
  const showValue = (v: string) => hideCost ? '••••••' : v;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-48 rounded-3xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-24 rounded-2xl bg-slate-200 dark:bg-slate-800 animate-pulse" />)}
        </div>
        <div className="h-96 rounded-3xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-5 pb-10 print:space-y-3">
      <PrintStyles orientation="landscape" title="Electronics Sales"
        subtitle={custom ? `${from} se ${to}` : `Pichle ${preset === 'all' ? 'sab' : preset} din`} />
      {showTeacher && <SalesTeacher onClose={() => setShowTeacher(false)} />}
      {showShortcuts && <ShortcutsModal onClose={() => setShowShortcuts(false)} />}

      {/* ═══ HERO ═══ */}
      <section className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-slate-950 via-indigo-900 to-blue-700 dark:from-slate-950 dark:via-indigo-950 dark:to-blue-900 text-white p-4 sm:p-6 shadow-2xl print:hidden">
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-blue-400/25 blur-3xl animate-pulse pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-violet-400/15 blur-3xl pointer-events-none" />
        <div className="relative">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="min-w-0 flex-1">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-[11px] font-extrabold border border-white/20 uppercase tracking-widest shadow-lg">
                <Cpu className="h-3.5 w-3.5 text-amber-300" /> Electronics Sales
                {shopName && <><span className="opacity-40">•</span><span className="text-emerald-200">🏪 {shopName}</span></>}
              </div>
              <h1 className="mt-3 text-2xl sm:text-3xl lg:text-4xl font-extrabold leading-tight">🧾 Sari Bikri Ka Record</h1>
              <p className="mt-1.5 text-xs sm:text-sm text-white/85 font-semibold">
                {list.length > 0 ? (
                  <>
                    <strong className="text-emerald-300">{list.length}</strong> sales
                    <span className="opacity-50 mx-1.5">•</span>
                    Total <strong className="text-emerald-300">{showValue(formatPKR(stats.revenue))}</strong>
                    {stats.serialUnits > 0 && (
                      <>
                        <span className="opacity-50 mx-1.5">•</span>
                        <strong className="text-violet-300">{stats.serialUnits}</strong> serial units
                      </>
                    )}
                    {stats.credit > 0 && (
                      <>
                        <span className="opacity-50 mx-1.5">•</span>
                        Udhaar <strong className="text-amber-300">{showValue(formatPKR(stats.credit))}</strong>
                      </>
                    )}
                  </>
                ) : (
                  <>Har sale me kaun sa serial unit gaya, kis ko gaya, warranty kab tak — sab yahin</>
                )}
              </p>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap print:hidden shrink-0">
              <button onClick={() => setShowTeacher(true)}
                className="h-11 px-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-900 text-xs font-extrabold inline-flex items-center gap-1.5 shadow-lg transition" title="Guide (G)">
                <GraduationCap className="h-4 w-4" /> <span className="hidden sm:inline">Guide</span>
              </button>
              <button onClick={() => setShowShortcuts(true)}
                className="h-11 w-11 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 inline-flex items-center justify-center backdrop-blur transition" title="Shortcuts (?)">
                <Keyboard className="h-4 w-4" />
              </button>
              <PrivacyToggle compact />

              {/* ⚙️ Receipt Quick-Settings */}
              <div className="relative">
                <button
                  onClick={() => setShowReceiptSettings(!showReceiptSettings)}
                  className={[
                    'h-11 px-3 rounded-xl text-xs font-extrabold inline-flex items-center gap-1.5 backdrop-blur-md transition border',
                    showReceiptSettings
                      ? 'bg-white text-slate-900 border-white shadow-lg'
                      : 'bg-white/15 hover:bg-white/25 border-white/25 text-white',
                  ].join(' ')}
                  title="Receipt Settings"
                >
                  <Settings2 className={`h-4 w-4 transition-transform ${showReceiptSettings ? 'rotate-90' : ''}`} />
                  <span className="hidden sm:inline">Receipt</span>
                </button>

                {showReceiptSettings && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowReceiptSettings(false)} />
                    <div
                      className="fixed right-4 top-16 w-72 rounded-2xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 shadow-2xl z-50 overflow-hidden"
                      style={{ maxHeight: 'calc(100vh - 80px)', overflowY: 'auto' }}
                    >
                      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-500/10 dark:to-indigo-500/10 border-b-2 border-slate-100 dark:border-slate-800">
                        <div className="flex items-center gap-2 font-extrabold text-sm text-slate-900 dark:text-white">
                          <Printer className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                          Receipt Settings
                        </div>
                        <div className="flex items-center gap-1">
                          {prefsSaved && (
                            <span className="text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400 inline-flex items-center gap-0.5">
                              <Check className="h-3 w-3" /> Saved
                            </span>
                          )}
                          <button onClick={() => setShowReceiptSettings(false)}
                            className="h-7 w-7 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center">
                            <X className="h-3.5 w-3.5 text-slate-500" />
                          </button>
                        </div>
                      </div>

                      <div className="p-4 space-y-4">
                        {/* Paper Size */}
                        <div>
                          <div className="mb-1.5">
                            <div className="text-xs font-extrabold text-slate-900 dark:text-white">Paper Size</div>
                            <div className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">Thermal printer ki width</div>
                          </div>
                          <div className="flex rounded-xl border-2 border-slate-200 dark:border-slate-700 overflow-hidden">
                            {(['58', '80'] as const).map((w) => (
                              <button key={w} onClick={() => updateReceiptPrefs({ paperWidth: w })}
                                className={[
                                  'flex-1 py-2 text-xs font-extrabold tabular-nums transition',
                                  receiptPrefs.paperWidth === w
                                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700',
                                ].join(' ')}>
                                {w}mm
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Mode */}
                        <div>
                          <div className="mb-1.5">
                            <div className="text-xs font-extrabold text-slate-900 dark:text-white">Receipt Mode</div>
                            <div className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">Full = IMEI 2, MAC, warranty terms sab</div>
                          </div>
                          <div className="flex rounded-xl border-2 border-slate-200 dark:border-slate-700 overflow-hidden">
                            <button onClick={() => updateReceiptPrefs({ mode: 'short' })}
                              className={[
                                'flex-1 py-2 text-xs font-extrabold inline-flex items-center justify-center gap-1 transition',
                                receiptPrefs.mode === 'short'
                                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700',
                              ].join(' ')}>
                              <Minimize2 className="h-3 w-3" /> Short
                            </button>
                            <button onClick={() => updateReceiptPrefs({ mode: 'full' })}
                              className={[
                                'flex-1 py-2 text-xs font-extrabold inline-flex items-center justify-center gap-1 transition',
                                receiptPrefs.mode === 'full'
                                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700',
                              ].join(' ')}>
                              <Maximize2 className="h-3 w-3" /> Full
                            </button>
                          </div>
                        </div>

                        {/* Auto Print */}
                        <button onClick={() => updateReceiptPrefs({ autoPrint: !receiptPrefs.autoPrint })}
                          className="w-full flex items-center gap-3 rounded-xl border-2 border-slate-200 dark:border-slate-700 p-2.5 hover:border-blue-300 dark:hover:border-blue-500/40 transition text-left">
                          <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${
                            receiptPrefs.autoPrint ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                          }`}>
                            <Zap className="h-4 w-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-extrabold text-slate-900 dark:text-white">Auto-Print</div>
                            <div className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">Sale hote hi receipt print</div>
                          </div>
                          <div className={`relative h-5 w-9 rounded-full transition-colors shrink-0 ${
                            receiptPrefs.autoPrint ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'
                          }`}>
                            <div className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${
                              receiptPrefs.autoPrint ? 'right-0.5' : 'left-0.5'
                            }`} />
                          </div>
                        </button>
                      </div>

                      <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-100 dark:border-slate-800">
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold text-center">
                          ⚡ Turant save — POS settings se synced
                        </p>
                      </div>
                    </div>
                  </>
                )}
              </div>

              <button onClick={() => refetch()} disabled={isRefetching}
                className="h-11 w-11 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 flex items-center justify-center transition disabled:opacity-50" title="Refresh (R)">
                <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
              </button>
              <button onClick={exportCsv} disabled={list.length === 0}
                className="h-11 px-3 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 text-xs font-extrabold inline-flex items-center gap-1.5 backdrop-blur transition disabled:opacity-40">
                <FileSpreadsheet className="h-4 w-4" /> <span className="hidden sm:inline">CSV</span>
              </button>
              <button onClick={() => window.print()}
                className="h-11 px-3 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 text-xs font-extrabold inline-flex items-center gap-1.5 backdrop-blur transition">
                <Printer className="h-4 w-4" /> <span className="hidden sm:inline">Print</span>
              </button>
              <Link to="/pos"
                className="h-11 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-extrabold inline-flex items-center gap-1.5 shadow-lg transition">
                <ShoppingCart className="h-4 w-4" /> Nayi Sale
              </Link>
            </div>
          </div>

          {/* Date presets */}
          <div className="mt-5 flex items-center gap-1.5 flex-wrap">
            {PRESETS.map((p) => (
              <button key={p.key} onClick={() => { setPreset(p.key); setCustom(false); }}
                className={`h-9 px-3.5 rounded-xl text-xs font-extrabold transition border ${
                  !custom && preset === p.key
                    ? 'bg-white text-indigo-900 border-white shadow-lg'
                    : 'bg-white/10 border-white/25 hover:bg-white/20'
                }`}>
                {p.label}
              </button>
            ))}
            <button onClick={() => setCustom((v) => !v)}
              className={`h-9 px-3.5 rounded-xl text-xs font-extrabold inline-flex items-center gap-1.5 transition border ${
                custom ? 'bg-white text-indigo-900 border-white shadow-lg' : 'bg-white/10 border-white/25 hover:bg-white/20'
              }`}>
              <Calendar className="h-3.5 w-3.5" /> Apni Tareekh
            </button>
            {custom && (
              <div className="flex items-center gap-1.5">
                <input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)}
                  className="h-9 rounded-xl bg-white/15 border border-white/25 px-2.5 text-xs font-bold text-white [color-scheme:dark] focus:outline-none focus:border-white" />
                <span className="text-xs font-extrabold text-white/60">se</span>
                <input type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)}
                  className="h-9 rounded-xl bg-white/15 border border-white/25 px-2.5 text-xs font-bold text-white [color-scheme:dark] focus:outline-none focus:border-white" />
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="mt-5 grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
            <HeroStat label="Bikri" value={showValue(formatPKR(stats.revenue))} icon={Receipt} sub={`${list.length} sales`} />
            <HeroStat label="Munafa" value={hideCost ? '••••••' : formatPKR(stats.profit)} icon={Coins} highlight
              sub={`${stats.margin.toFixed(1)}% margin`} />
            <HeroStat label="Units" value={String(stats.units)} icon={Package} sub={`${stats.serialUnits} serial wale`} />
            <HeroStat label="Udhaar" value={showValue(formatPKR(stats.credit))} icon={HandCoins}
              sub={stats.credit > 0 ? 'wasool karna hai' : 'sab clear ✅'}
              onClick={() => setTab(tab === 'credit' ? 'all' : 'credit')}
              active={tab === 'credit'} />
          </div>

          {/* 🏆 Best sale strip */}
          {bestSale && !hideCost && list.length > 1 && (
            <div className="relative mt-4 inline-flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 backdrop-blur-md px-3 py-2 text-xs font-extrabold transition">
              <Trophy className="h-4 w-4 text-amber-300" />
              <span className="text-white/70">Sab se badi sale:</span>
              <Link to={receiptLink(bestSale.id)} className="text-emerald-300 hover:underline font-mono">
                {bestSale.saleNumber}
              </Link>
              <span className="text-emerald-300 tabular-nums">{formatPKR(bestSale.total)}</span>
            </div>
          )}
        </div>
      </section>

      {/* ═══ CHARTS (PIN-aware) ═══ */}
      {!hideCost && (
        <section className="grid lg:grid-cols-[1.5fr_1fr] gap-4 print:hidden">
          <div className="rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-black/20 p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">Last 7 Days</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-bold">Daily sales trend</p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-700 text-white flex items-center justify-center shadow-md">
                <BarChart3 className="h-5 w-5" />
              </div>
            </div>
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient id="elSalesGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6366f1" stopOpacity={0.5} />
                      <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:opacity-20" />
                  <XAxis dataKey="label" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#64748b" fontSize={10} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} tickLine={false} axisLine={false} />
                  <Tooltip
                    formatter={(v: any) => formatPKR(Number(v))}
                    contentStyle={{ borderRadius: 12, border: '1px solid rgba(148,163,184,0.2)', backgroundColor: 'rgba(15,23,42,0.95)', color: '#f8fafc' }}
                    labelStyle={{ color: '#94a3b8', fontWeight: 700 }}
                  />
                  <Area type="monotone" dataKey="sales" name="Sales" stroke="#6366f1" strokeWidth={2.5} fill="url(#elSalesGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-black/20 p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">Payment Split</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-bold">Is filter ke andar</p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-700 text-white flex items-center justify-center shadow-md">
                <CreditCard className="h-5 w-5" />
              </div>
            </div>
            {paymentData.length ? (
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={paymentData}
                      cx="50%" cy="45%" outerRadius={75} innerRadius={42}
                      dataKey="value" labelLine={false} paddingAngle={3}
                      label={(entry: any) => {
                        const total = paymentData.reduce((s, p) => s + p.value, 0);
                        return total > 0 ? `${((entry.value / total) * 100).toFixed(0)}%` : '';
                      }}
                    >
                      {paymentData.map((p) => <Cell key={p.name} fill={p.color} stroke="none" />)}
                    </Pie>
                    <Tooltip
                      formatter={(v: any) => formatPKR(Number(v))}
                      contentStyle={{ borderRadius: 12, backgroundColor: 'rgba(15,23,42,0.95)', color: '#f8fafc' }}
                    />
                    <Legend wrapperStyle={{ fontSize: 10, paddingTop: 8 }} iconType="circle" />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[220px] flex flex-col items-center justify-center gap-2">
                <CreditCard className="h-10 w-10 text-slate-300 dark:text-slate-600" />
                <p className="text-sm font-extrabold text-slate-500 dark:text-slate-400">No payment data</p>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ═══ FILTERS ═══ */}
      <div className="rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-black/20 p-4 space-y-3 print:hidden">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex gap-1.5 flex-wrap">
            {([
              { v: 'all', label: 'Sab', icon: Layers, n: counts.all },
              { v: 'serial', label: 'Serial Wale', icon: Barcode, n: counts.serial },
              { v: 'normal', label: 'Normal', icon: Cpu, n: counts.normal },
              { v: 'credit', label: 'Udhaar', icon: HandCoins, n: counts.credit },
            ] as { v: Tab; label: string; icon: any; n: number }[]).map((k, i) => (
              <button key={k.v} onClick={() => setTab(k.v)} title={`Shortcut: ${i + 1}`}
                className={`h-9 px-3 rounded-lg text-xs font-extrabold inline-flex items-center gap-1.5 transition border-2 ${
                  tab === k.v ? 'bg-gradient-to-r from-indigo-600 to-blue-700 text-white border-transparent shadow'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-indigo-300 dark:hover:border-indigo-500/50'
                }`}>
                <k.icon className="h-3.5 w-3.5" /> {k.label}
                <span className={`px-1.5 rounded-full text-[10px] tabular-nums ${tab === k.v ? 'bg-black/20' : 'bg-slate-100 dark:bg-slate-700'}`}>{k.n}</span>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <select value={pay} onChange={(e) => setPay(e.target.value)}
              className="h-10 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 transition">
              <option value="all">Har payment</option>
              {Object.entries(PAY_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
            <div className="relative">
              <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input ref={searchRef} value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Invoice, customer, serial, IMEI... (/)"
                className="h-10 w-full sm:w-72 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 pl-9 pr-8 text-sm font-bold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 transition" />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center">
                  <X className="h-3.5 w-3.5 text-slate-400" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Active filter summary */}
        {hasFilters && (
          <div className="rounded-xl bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-500/10 dark:to-blue-500/10 border-2 border-indigo-200 dark:border-indigo-500/30 p-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <SummaryCell label="Showing" value={`${list.length} sales`} tone="indigo" />
            <SummaryCell label="Total" value={showValue(formatPKR(stats.revenue))} tone="slate" />
            <SummaryCell label="Avg Order" value={showValue(formatPKR(stats.avg))} tone="blue" />
            <SummaryCell label="Udhaar" value={showValue(formatPKR(stats.credit))} tone="amber" />
            <button onClick={clearFilters}
              className="col-span-2 sm:col-span-4 mt-1 text-xs font-extrabold text-rose-600 dark:text-rose-400 hover:text-rose-700 inline-flex items-center gap-1 self-start transition">
              <X className="h-3 w-3" /> Filters clear karo
            </button>
          </div>
        )}
      </div>

      {/* ═══ LIST ═══ */}
      {list.length === 0 ? (
        <div className="rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900/80 border-2 border-slate-200 dark:border-slate-800 p-12 text-center shadow-sm">
          <div className="h-20 w-20 rounded-3xl bg-gradient-to-br from-indigo-500 to-blue-700 mx-auto flex items-center justify-center shadow-lg shadow-indigo-500/40">
            <Receipt className="h-10 w-10 text-white" />
          </div>
          <h3 className="mt-4 font-extrabold text-slate-900 dark:text-white text-lg">
            {hasFilters ? 'In filters se koi sale nahi mili' : 'Is duration me koi sale nahi hui'}
          </h3>
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 mt-1.5">
            {hasFilters ? 'Filter hata kar dobara dekhein' : 'POS se pehli sale karein — phir sab yahan aa jayega'}
          </p>
          <div className="mt-4 flex gap-2 justify-center flex-wrap">
            {hasFilters ? (
              <Button variant="secondary" className="font-extrabold" onClick={clearFilters}>
                <X className="h-4 w-4" /> Filters clear karo
              </Button>
            ) : (
              <Link to="/pos"
                className="inline-flex items-center gap-1.5 h-11 px-5 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-700 text-white text-sm font-extrabold shadow-lg hover:shadow-xl transition">
                POS kholo <ArrowRight className="h-4 w-4" />
              </Link>
            )}
          </div>
        </div>
      ) : (
        <div className="rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-black/20 overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
          {list.map((s) => {
            const open = expanded.has(s.id);
            const sn = serialsOf(s);
            const pm = PAY_META[s.paymentMethod];
            const profit = (s.total ?? 0) - (s.costOfGoods ?? 0);
            return (
              <div key={s.id}>
                <button onClick={() => toggle(s.id)} className="w-full px-4 py-3.5 flex items-center gap-3 text-left hover:bg-indigo-50/40 dark:hover:bg-indigo-500/5 transition">
                  <div className={`h-11 w-11 rounded-xl flex items-center justify-center shrink-0 ${
                    sn.length > 0 ? 'bg-gradient-to-br from-violet-500 to-purple-600' : 'bg-gradient-to-br from-slate-400 to-slate-500'
                  } text-white shadow`}>
                    {sn.length > 0 ? <Barcode className="h-5 w-5" /> : <Receipt className="h-5 w-5" />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-extrabold text-slate-900 dark:text-white text-sm font-mono">{s.saleNumber}</span>
                      {pm && (
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold inline-flex items-center gap-0.5 ${pm.chip}`}>
                          <pm.icon className="h-2.5 w-2.5" /> {pm.label}
                        </span>
                      )}
                      {sn.length > 0 && (
                        <span className="px-1.5 py-0.5 rounded bg-violet-100 dark:bg-violet-500/20 text-violet-700 dark:text-violet-300 text-[9px] font-extrabold">
                          {sn.length} serial
                        </span>
                      )}
                      {(s.creditAmount ?? 0) > 0 && (
                        <span className="px-1.5 py-0.5 rounded bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 text-[9px] font-extrabold inline-flex items-center gap-0.5">
                          <BookOpen className="h-2.5 w-2.5" /> Udhaar {showValue(formatPKR(s.creditAmount))}
                        </span>
                      )}
                      {s.status && s.status !== 'COMPLETED' && (
                        <span className="px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 text-[9px] font-extrabold">
                          {s.status === 'FULLY_RETURNED' ? 'Wapas' : s.status === 'PARTIALLY_RETURNED' ? 'Kuch wapas' : s.status === 'VOIDED' ? 'VOIDED' : s.status}
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 flex items-center gap-2 flex-wrap text-[11px] font-bold text-slate-500 dark:text-slate-400">
                      <span className="inline-flex items-center gap-1"><User className="h-3 w-3" />{s.customer?.name ?? 'Walk-in'}</span>
                      <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />
                        {new Date(s.soldAt).toLocaleString('en-PK', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}
                      </span>
                      <span className="truncate">{(s.items ?? []).length} items</span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white tabular-nums">{showValue(formatPKR(s.total ?? 0))}</div>
                    <div className={`text-[10px] font-extrabold tabular-nums ${profit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                      {hideCost ? '•••' : `${profit >= 0 ? '+' : ''}${formatPKR(profit)}`}
                    </div>
                    {/* 🖨️ Direct print — prefs ke saath */}
                    <Link
                      to={receiptLink(s.id, true)}
                      onClick={(e) => e.stopPropagation()}
                      className="print:hidden mt-1.5 inline-flex items-center gap-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 px-2 py-1 text-[10px] font-extrabold text-slate-600 dark:text-slate-300 hover:text-indigo-700 dark:hover:text-indigo-300 transition"
                      title="Seedha print"
                    >
                      <Printer className="h-3 w-3" /> Print
                    </Link>
                  </div>
                  {open ? <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" /> : <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />}
                </button>

                {open && (
                  <div className="px-4 pb-4 pt-1 bg-slate-50 dark:bg-slate-950/40 space-y-2.5">
                    {/* Items */}
                    <div className="rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden">
                      {(s.items ?? []).map((it: any) => (
                        <div key={it.id} className="px-3 py-2.5 border-b border-slate-100 dark:border-slate-800 last:border-0">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="font-extrabold text-slate-900 dark:text-white text-sm truncate">
                                {it.product?.name ?? it.note ?? 'Item'}
                                {it.variantLink?.variant?.name && (
                                  <span className="text-slate-500 dark:text-slate-400 font-bold"> — {it.variantLink.variant.name}</span>
                                )}
                              </div>
                              <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 tabular-nums">
                                {it.quantity} {it.product?.unit ?? 'pcs'} × {formatPKR(it.price)}
                                {it.note && <span className="ml-2 italic">“{it.note}”</span>}
                              </div>
                            </div>
                            <div className="font-extrabold text-slate-900 dark:text-white tabular-nums text-sm shrink-0">
                              {showValue(formatPKR(it.total))}
                            </div>
                          </div>

                          {/* Serial units on this line */}
                          {(it.serials ?? []).length > 0 && (
                            <div className="mt-2 space-y-1.5">
                              {(it.serials as any[]).map((x) => {
                                const left = warrantyLeft(x.warrantyEndDate);
                                return (
                                  <div key={x.id} className="rounded-lg bg-violet-50 dark:bg-violet-500/10 border border-violet-200 dark:border-violet-500/30 px-2.5 py-1.5 flex items-center gap-2 flex-wrap">
                                    <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-violet-800 dark:text-violet-300 font-mono">
                                      <Hash className="h-3 w-3" /> {x.serialNumber}
                                    </span>
                                    {x.imei && (
                                      <span className="text-[10px] font-bold text-violet-700 dark:text-violet-300 font-mono">IMEI {x.imei}</span>
                                    )}
                                    {x.macAddress && (
                                      <span className="text-[10px] font-bold text-violet-700 dark:text-violet-300 font-mono">MAC {x.macAddress}</span>
                                    )}
                                    {left != null ? (
                                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold inline-flex items-center gap-0.5 ${
                                        left < 0 ? 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                                          : left <= 30 ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300'
                                          : 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                                      }`}>
                                        {left < 0 ? <ShieldAlert className="h-2.5 w-2.5" /> : <ShieldCheck className="h-2.5 w-2.5" />}
                                        {left < 0 ? 'Warranty khatam' : `Warranty ${left} din baqi`}
                                      </span>
                                    ) : (
                                      <span className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[9px] font-extrabold">
                                        Warranty nahi
                                      </span>
                                    )}
                                    {x.physicalCondition && (
                                      <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">{x.physicalCondition}</span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Totals */}
                    <div className="rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 grid sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-1">
                      <Detail label="Subtotal" value={showValue(formatPKR(s.subtotal ?? 0))} icon={Receipt} />
                      {(s.discount ?? 0) > 0 && <Detail label="Discount" value={`− ${showValue(formatPKR(s.discount))}`} icon={Coins} tone="rose" />}
                      <Detail label="Kul" value={showValue(formatPKR(s.total ?? 0))} icon={Wallet} strong />
                      <Detail label="Wasool" value={showValue(formatPKR(s.paidAmount ?? 0))} icon={Banknote} tone="emerald" />
                      {(s.creditAmount ?? 0) > 0 && <Detail label="Udhaar" value={showValue(formatPKR(s.creditAmount))} icon={HandCoins} tone="rose" strong />}
                      {(s.changeAmount ?? 0) > 0 && <Detail label="Wapasi" value={showValue(formatPKR(s.changeAmount))} icon={Coins} />}
                      <Detail label="Lagat" value={hideCost ? '•••' : formatPKR(s.costOfGoods ?? 0)} icon={Wallet} />
                      <Detail label="Munafa" value={hideCost ? '•••' : formatPKR(profit)} icon={TrendingUp} tone="emerald" strong />
                      {s.createdBy?.fullName && <Detail label="Kisne bechi" value={s.createdBy.fullName} icon={User} />}
                      {s.customer?.phone && <Detail label="Phone" value={s.customer.phone} icon={Smartphone} />}
                    </div>

                    <div className="flex gap-2 flex-wrap print:hidden">
                      <Link to={receiptLink(s.id)}
                        className="h-10 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-700 text-white text-xs font-extrabold inline-flex items-center gap-1.5 shadow hover:shadow-lg transition">
                        <Eye className="h-3.5 w-3.5" /> Receipt kholo
                      </Link>
                      <Link to={receiptLink(s.id, true)}
                        className="h-10 px-4 rounded-xl bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-extrabold inline-flex items-center gap-1.5 hover:border-indigo-300 dark:hover:border-indigo-500/50 transition">
                        <Printer className="h-3.5 w-3.5" /> Direct Print
                      </Link>
                      {s.customer?.id && (
                        <Link to={`/customers/${s.customer.id}`}
                          className="h-10 px-4 rounded-xl bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-extrabold inline-flex items-center gap-1.5 hover:border-indigo-300 dark:hover:border-indigo-500/50 transition">
                          <User className="h-3.5 w-3.5" /> Customer ka khata
                        </Link>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════
   HELPERS
   ═════════════════════════════════════════════════════════════ */

function HeroStat({ label, value, sub, icon: Icon, highlight, onClick, active }: any) {
  const Comp: any = onClick ? 'button' : 'div';
  return (
    <Comp
      onClick={onClick}
      className={`rounded-2xl backdrop-blur border p-3 sm:p-4 text-left w-full transition-all ${
        onClick ? 'hover:scale-[1.02] cursor-pointer' : ''
      } ${
        active ? 'bg-amber-400/30 border-amber-300/60 shadow-lg ring-2 ring-amber-300/50'
        : highlight ? 'bg-white/25 border-white/40 shadow-lg'
        : 'bg-white/10 border-white/20'
      }`}
    >
      <div className="flex items-center gap-1.5 text-[10px] uppercase font-extrabold text-white/70 tracking-wider">
        <Icon className="h-3.5 w-3.5" /> {label}
      </div>
      <div className="mt-1 text-xl sm:text-2xl font-extrabold tabular-nums truncate text-white">{value}</div>
      {sub && <div className="mt-0.5 text-[11px] font-bold text-white/70 truncate">{sub}</div>}
    </Comp>
  );
}

const DETAIL_TONES: Record<string, string> = {
  slate: 'text-slate-900 dark:text-white',
  emerald: 'text-emerald-700 dark:text-emerald-400',
  rose: 'text-rose-600 dark:text-rose-400',
  amber: 'text-amber-700 dark:text-amber-400',
};

function Detail({ label, value, icon: Icon, strong, tone = 'slate' }: any) {
  if (value === null || value === undefined || value === '') return null;
  return (
    <div className="flex items-baseline justify-between gap-3 py-1 border-b border-slate-100 dark:border-slate-800 last:border-0">
      <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 inline-flex items-center gap-1.5 shrink-0">
        {Icon && <Icon className="h-3 w-3" />} {label}
      </span>
      <span className={`text-[12px] tabular-nums truncate ${strong ? 'font-extrabold' : 'font-bold'} ${DETAIL_TONES[tone]}`}>
        {value}
      </span>
    </div>
  );
}

function SummaryCell({ label, value, tone }: any) {
  const tones: Record<string, string> = {
    indigo: 'text-indigo-700 dark:text-indigo-400',
    slate: 'text-slate-900 dark:text-white',
    blue: 'text-blue-700 dark:text-blue-400',
    amber: 'text-amber-700 dark:text-amber-400',
  };
  return (
    <div>
      <div className="text-[10px] uppercase font-extrabold text-slate-600 dark:text-slate-400">{label}</div>
      <div className={`font-extrabold tabular-nums ${tones[tone]}`}>{value}</div>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════
   SALES TEACHER
   ═════════════════════════════════════════════════════════════ */
function SalesTeacher({ onClose }: { onClose: () => void }) {
  const steps = [
    {
      icon: Barcode, title: 'Serial Wale tab — sab se ahem',
      body: 'Jin sales me laptop, camera, drone ya koi bhi serial-tracked unit gaya, wo yahan alag milti hain. Row kholte hi nazar aata hai ke exact kaun sa serial number kis customer ko gaya.',
      tips: ['Search me serial ya IMEI daal kar seedha sale dhoondein', 'Customer wapas aaye to yahin se history milti hai'],
    },
    {
      icon: ShieldCheck, title: 'Warranty ka badge',
      body: 'Har serial ke saath likha hota hai warranty kitne din baqi hai. Customer claim le kar aaye to foran pata chal jata hai ke warranty chal rahi hai ya khatam ho chuki.',
      tips: ['Hara = warranty chal rahi', 'Peela = 30 din se kam', 'Grey = khatam'],
    },
    {
      icon: HandCoins, title: 'Udhaar wala tab',
      body: 'Jin sales ka poora paisa nahi mila unko yahan dekh sakte hain. Customer ke naam par click karke uska poora khata khul jata hai.',
      tips: ['Upar Udhaar card pe click karo — seedha udhaar tab khulta hai', 'Khata page se wasooli record karein'],
    },
    {
      icon: Settings2, title: 'Receipt settings + direct print',
      body: 'Upar "Receipt" button se paper size (58/80mm), short/full mode aur auto-print set karo. Har sale ke paas chhota Print button — prefs ke saath seedha thermal pe niklo, receipt page kholne ki zaroorat nahi.',
      tips: ['Settings POS se synced rehti hain', 'Row expand karke "Direct Print" bhi hai'],
    },
    {
      icon: Calendar, title: 'Duration aur download',
      body: 'Aaj / 7 din / 30 din / 3 mahine ya apni tareekh chunein. CSV me har sale ke saath uske serial numbers bhi aate hain — audit ya tax ke liye perfect.',
      tips: ['1 2 3 4 dabakar tab badlein', 'P dabao to print, / dabao to search'],
    },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-2xl bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        <div className="px-5 py-4 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-500/10 dark:to-orange-500/10 border-b-2 border-amber-200 dark:border-amber-500/30 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-lg">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-amber-700 dark:text-amber-300 font-extrabold">Guide</div>
              <h3 className="font-extrabold text-slate-900 dark:text-white">Sales Page Kaise Chalayein?</h3>
            </div>
          </div>
          <button onClick={onClose} className="h-9 w-9 rounded-xl hover:bg-white dark:hover:bg-slate-800 flex items-center justify-center transition">
            <X className="h-4 w-4 text-slate-600 dark:text-slate-300" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-3.5">
          {steps.map((st, i) => (
            <div key={i} className="rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 p-3.5 flex items-start gap-3">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-indigo-600 to-blue-700 text-white flex items-center justify-center shrink-0 shadow-md">
                <st.icon className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div className="font-extrabold text-slate-900 dark:text-white">{st.title}</div>
                <div className="text-xs font-semibold text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">{st.body}</div>
                <ul className="mt-2 space-y-1">
                  {st.tips.map((tp, j) => (
                    <li key={j} className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-start gap-1.5">
                      <Sparkles className="h-2.5 w-2.5 text-amber-500 shrink-0 mt-0.5" /> {tp}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
        <div className="px-5 py-3.5 border-t-2 border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-right shrink-0">
          <Button onClick={onClose} className="bg-gradient-to-r from-amber-500 to-orange-600 font-extrabold shadow-lg">
            <CheckCircle2 className="h-4 w-4" /> Samajh Gaya
          </Button>
        </div>
      </div>
    </div>
  );
}

function ShortcutsModal({ onClose }: { onClose: () => void }) {
  const sc = [
    ['/', 'Search par jao'], ['1 – 4', 'Sab / Serial / Normal / Udhaar'],
    ['G', 'Guide kholo'], ['R', 'Refresh'], ['P', 'Print'], ['?', 'Ye list'], ['Esc', 'Band karo'],
  ];
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden border-2 border-slate-200 dark:border-slate-700">
        <div className="px-5 py-4 border-b-2 border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 flex items-center justify-center">
              <Keyboard className="h-4 w-4" />
            </div>
            <h3 className="font-extrabold text-slate-900 dark:text-white">Keyboard Shortcuts</h3>
          </div>
          <button onClick={onClose} className="h-9 w-9 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition">
            <X className="h-4 w-4 text-slate-600 dark:text-slate-300" />
          </button>
        </div>
        <div className="p-5 space-y-2">
          {sc.map(([key, desc]) => (
            <div key={key} className="flex items-center justify-between text-sm">
              <span className="font-semibold text-slate-700 dark:text-slate-200">{desc}</span>
              <kbd className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 font-mono text-xs font-extrabold text-slate-700 dark:text-slate-200">{key}</kbd>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
