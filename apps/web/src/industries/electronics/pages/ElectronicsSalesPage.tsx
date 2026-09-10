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
  AlertTriangle, Eye,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@core/ui/Button';
import { formatPKR } from '@core/lib/format';
import { useAuthStore } from '@core/stores/auth.store';
import { useCostHidden, PrivacyToggle } from '@core/ui/HiddenValue';
import { PrintStyles } from '@core/components/print/PrintStyles';
import { salesApi, type Sale } from '@modules/sales/sales/api/sales.api';

/* ═════════════════════════════════════════════════════════════
   NAFAA ELECTRONICS — SALES
   ─────────────────────────────────────────────────────────────
   🧾 Har bikri ka poora record
   🔖 Serial/IMEI wale units alag se — kaun sa unit kis ko gaya
   🛡️ Warranty kab tak — receipt kholte hi customer ko bataao
   🎓 Guide • ⌨️ Shortcuts • 🖨️ Print + CSV • 📅 Custom date
   ═════════════════════════════════════════════════════════════ */

type Tab = 'all' | 'serial' | 'normal' | 'credit';

const PAY_META: Record<string, { label: string; icon: any; chip: string }> = {
  CASH:          { label: 'Cash',     icon: Banknote,   chip: 'bg-emerald-100 text-emerald-700' },
  CARD:          { label: 'Card',     icon: CreditCard, chip: 'bg-blue-100 text-blue-700' },
  BANK_TRANSFER: { label: 'Bank',     icon: Building2,  chip: 'bg-indigo-100 text-indigo-700' },
  JAZZCASH:      { label: 'JazzCash', icon: Smartphone, chip: 'bg-rose-100 text-rose-700' },
  EASYPAISA:     { label: 'Easypaisa',icon: Smartphone, chip: 'bg-lime-100 text-lime-700' },
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

export default function ElectronicsSalesPage() {
  const hideCost = useCostHidden();
  const currentShopId = useAuthStore((s) => s.currentShopId);
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
  const searchRef = useRef<HTMLInputElement>(null);

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
  }, [showTeacher, showShortcuts]);

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

  const exportCsv = () => {
    const out: string[][] = [
      [`${tenantName ?? 'Nafaa'} — Electronics Sales`],
      [`Shop: ${shopName ?? 'All'}`, custom ? `${from} se ${to}` : `Pichle ${preset} din`, new Date().toLocaleString('en-PK')],
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
    toast.success('CSV download ho gaya');
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-48 rounded-3xl bg-slate-200 animate-pulse" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-24 rounded-2xl bg-slate-200 animate-pulse" />)}
        </div>
        <div className="h-96 rounded-3xl bg-slate-200 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-10 print:space-y-3">
      <PrintStyles orientation="landscape" title="Electronics Sales"
        subtitle={custom ? `${from} se ${to}` : `Pichle ${preset === 'all' ? 'sab' : preset} din`} />
      {showTeacher && <SalesTeacher onClose={() => setShowTeacher(false)} />}
      {showShortcuts && <ShortcutsModal onClose={() => setShowShortcuts(false)} />}

      {/* ═══ HERO ═══ */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-indigo-900 to-blue-700 text-white p-6 shadow-2xl print:hidden">
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-blue-400/25 blur-3xl animate-pulse" />
        <div className="relative">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="min-w-0">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
                <Receipt className="h-3.5 w-3.5 text-amber-300" /> Sales
                {shopName && <><span className="opacity-40">•</span><span className="text-emerald-200">🏪 {shopName}</span></>}
              </div>
              <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">🧾 Sari Bikri Ka Record</h1>
              <p className="mt-2 text-sm text-white/85 font-semibold">
                Har sale me kaun sa serial unit gaya, kis ko gaya, warranty kab tak — sab yahin
              </p>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap print:hidden">
              <button onClick={() => setShowTeacher(true)}
                className="h-11 px-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-900 text-xs font-extrabold inline-flex items-center gap-1.5 shadow-lg transition" title="Guide (G)">
                <GraduationCap className="h-4 w-4" /> Guide
              </button>
              <button onClick={() => setShowShortcuts(true)}
                className="h-11 w-11 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 inline-flex items-center justify-center backdrop-blur transition" title="Shortcuts (?)">
                <Keyboard className="h-4 w-4" />
              </button>
              <PrivacyToggle compact />
              <button onClick={() => refetch()} disabled={isRefetching}
                className="h-11 w-11 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 flex items-center justify-center transition disabled:opacity-50" title="Refresh (R)">
                <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
              </button>
              <button onClick={exportCsv}
                className="h-11 px-3 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 text-xs font-extrabold inline-flex items-center gap-1.5 backdrop-blur transition">
                <FileSpreadsheet className="h-4 w-4" /> CSV
              </button>
              <button onClick={() => window.print()}
                className="h-11 px-3 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 text-xs font-extrabold inline-flex items-center gap-1.5 backdrop-blur transition">
                <Printer className="h-4 w-4" /> Print
              </button>
              <Link to="/pos"
                className="h-11 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-extrabold inline-flex items-center gap-1.5 shadow-lg transition">
                <Package className="h-4 w-4" /> Nayi Sale
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
          <div className="mt-5 grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <HeroStat label="Bikri" value={formatPKR(stats.revenue)} icon={Receipt} sub={`${list.length} sales`} />
            <HeroStat label="Munafa" value={hideCost ? '••••••' : formatPKR(stats.profit)} icon={Coins} highlight
              sub={`${stats.margin.toFixed(1)}% margin`} />
            <HeroStat label="Units" value={String(stats.units)} icon={Package} sub={`${stats.serialUnits} serial wale`} />
            <HeroStat label="Udhaar" value={formatPKR(stats.credit)} icon={HandCoins}
              sub={stats.credit > 0 ? 'wasool karna hai' : 'sab clear ✅'} />
          </div>
        </div>
      </section>

      {/* ═══ FILTERS ═══ */}
      <div className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm p-4 space-y-3 print:hidden">
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
                    : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-300'
                }`}>
                <k.icon className="h-3.5 w-3.5" /> {k.label}
                <span className={`px-1.5 rounded-full text-[10px] tabular-nums ${tab === k.v ? 'bg-black/20' : 'bg-slate-100'}`}>{k.n}</span>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <select value={pay} onChange={(e) => setPay(e.target.value)}
              className="h-10 rounded-xl border-2 border-slate-200 bg-white px-3 text-sm font-bold text-slate-900 focus:outline-none focus:border-indigo-500 transition">
              <option value="all">Har payment</option>
              {Object.entries(PAY_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
            <div className="relative">
              <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input ref={searchRef} value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Invoice, customer, serial, IMEI... (/)"
                className="h-10 w-full sm:w-72 rounded-xl border-2 border-slate-200 bg-white pl-9 pr-3 text-sm font-bold text-slate-900 focus:outline-none focus:border-indigo-500 transition" />
            </div>
          </div>
        </div>
      </div>

      {/* ═══ LIST ═══ */}
      {list.length === 0 ? (
        <div className="rounded-3xl bg-white border-2 border-slate-200 p-12 text-center shadow-sm">
          <Receipt className="h-12 w-12 text-slate-300 mx-auto mb-3" />
          <h3 className="font-extrabold text-slate-900 text-lg">
            {search || pay !== 'all' || tab !== 'all' ? 'In filters se koi sale nahi mili' : 'Is duration me koi sale nahi hui'}
          </h3>
          <p className="text-sm font-semibold text-slate-500 mt-1.5">
            {search || pay !== 'all' || tab !== 'all'
              ? 'Filter hata kar dobara dekhein'
              : 'POS se pehli sale karein — phir sab yahan aa jayega'}
          </p>
          <Link to="/pos" className="mt-4 inline-flex items-center gap-1.5 h-11 px-5 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-700 text-white text-sm font-extrabold shadow-lg hover:shadow-xl transition">
            POS kholo <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      ) : (
        <div className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm overflow-hidden divide-y divide-slate-100">
          {list.map((s) => {
            const open = expanded.has(s.id);
            const sn = serialsOf(s);
            const pm = PAY_META[s.paymentMethod];
            const profit = (s.total ?? 0) - (s.costOfGoods ?? 0);
            return (
              <div key={s.id}>
                <button onClick={() => toggle(s.id)} className="w-full px-4 py-3.5 flex items-center gap-3 text-left hover:bg-slate-50 transition">
                  <div className={`h-11 w-11 rounded-xl flex items-center justify-center shrink-0 ${
                    sn.length > 0 ? 'bg-gradient-to-br from-violet-500 to-purple-600' : 'bg-gradient-to-br from-slate-400 to-slate-500'
                  } text-white shadow`}>
                    {sn.length > 0 ? <Barcode className="h-5 w-5" /> : <Receipt className="h-5 w-5" />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-extrabold text-slate-900 text-sm font-mono">{s.saleNumber}</span>
                      {pm && (
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold inline-flex items-center gap-0.5 ${pm.chip}`}>
                          <pm.icon className="h-2.5 w-2.5" /> {pm.label}
                        </span>
                      )}
                      {sn.length > 0 && (
                        <span className="px-1.5 py-0.5 rounded bg-violet-100 text-violet-700 text-[9px] font-extrabold">
                          {sn.length} serial
                        </span>
                      )}
                      {(s.creditAmount ?? 0) > 0 && (
                        <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 text-[9px] font-extrabold">
                          Udhaar {formatPKR(s.creditAmount)}
                        </span>
                      )}
                      {s.status && s.status !== 'COMPLETED' && (
                        <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 text-[9px] font-extrabold">
                          {s.status === 'FULLY_RETURNED' ? 'Wapas' : s.status === 'PARTIALLY_RETURNED' ? 'Kuch wapas' : 'Void'}
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 flex items-center gap-2 flex-wrap text-[11px] font-bold text-slate-500">
                      <span className="inline-flex items-center gap-1"><User className="h-3 w-3" />{s.customer?.name ?? 'Walk-in'}</span>
                      <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />
                        {new Date(s.soldAt).toLocaleString('en-PK', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}
                      </span>
                      <span className="truncate">{(s.items ?? []).length} items</span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-base font-extrabold text-slate-900 tabular-nums">{formatPKR(s.total ?? 0)}</div>
                    <div className={`text-[10px] font-extrabold tabular-nums ${profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {hideCost ? '•••' : `${profit >= 0 ? '+' : ''}${formatPKR(profit)}`}
                    </div>
                  </div>
                  {open ? <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" /> : <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />}
                </button>

                {open && (
                  <div className="px-4 pb-4 pt-1 bg-slate-50 space-y-2.5">
                    {/* Items */}
                    <div className="rounded-xl border-2 border-slate-200 bg-white overflow-hidden">
                      {(s.items ?? []).map((it: any) => (
                        <div key={it.id} className="px-3 py-2.5 border-b border-slate-100 last:border-0">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="font-extrabold text-slate-900 text-sm truncate">
                                {it.product?.name ?? it.note ?? 'Item'}
                                {it.variantLink?.variant?.name && (
                                  <span className="text-slate-500 font-bold"> — {it.variantLink.variant.name}</span>
                                )}
                              </div>
                              <div className="text-[11px] font-bold text-slate-500 tabular-nums">
                                {it.quantity} {it.product?.unit ?? 'pcs'} × {formatPKR(it.price)}
                                {it.note && <span className="ml-2 italic">“{it.note}”</span>}
                              </div>
                            </div>
                            <div className="font-extrabold text-slate-900 tabular-nums text-sm shrink-0">
                              {formatPKR(it.total)}
                            </div>
                          </div>

                          {/* Serial units on this line */}
                          {(it.serials ?? []).length > 0 && (
                            <div className="mt-2 space-y-1.5">
                              {(it.serials as any[]).map((x) => {
                                const left = warrantyLeft(x.warrantyEndDate);
                                return (
                                  <div key={x.id} className="rounded-lg bg-violet-50 border border-violet-200 px-2.5 py-1.5 flex items-center gap-2 flex-wrap">
                                    <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-violet-800 font-mono">
                                      <Hash className="h-3 w-3" /> {x.serialNumber}
                                    </span>
                                    {x.imei && (
                                      <span className="text-[10px] font-bold text-violet-700 font-mono">IMEI {x.imei}</span>
                                    )}
                                    {x.macAddress && (
                                      <span className="text-[10px] font-bold text-violet-700 font-mono">MAC {x.macAddress}</span>
                                    )}
                                    {left != null ? (
                                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold inline-flex items-center gap-0.5 ${
                                        left < 0 ? 'bg-slate-200 text-slate-600'
                                          : left <= 30 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                                      }`}>
                                        {left < 0 ? <ShieldAlert className="h-2.5 w-2.5" /> : <ShieldCheck className="h-2.5 w-2.5" />}
                                        {left < 0 ? 'Warranty khatam' : `Warranty ${left} din baqi`}
                                      </span>
                                    ) : (
                                      <span className="px-1.5 py-0.5 rounded bg-slate-200 text-slate-600 text-[9px] font-extrabold">
                                        Warranty nahi
                                      </span>
                                    )}
                                    {x.physicalCondition && (
                                      <span className="text-[10px] font-bold text-slate-500">{x.physicalCondition}</span>
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
                    <div className="rounded-xl border-2 border-slate-200 bg-white p-3 grid sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-1">
                      <Detail label="Subtotal" value={formatPKR(s.subtotal ?? 0)} icon={Receipt} />
                      {(s.discount ?? 0) > 0 && <Detail label="Discount" value={`− ${formatPKR(s.discount)}`} icon={Coins} tone="rose" />}
                      <Detail label="Kul" value={formatPKR(s.total ?? 0)} icon={Wallet} strong />
                      <Detail label="Wasool" value={formatPKR(s.paidAmount ?? 0)} icon={Banknote} tone="emerald" />
                      {(s.creditAmount ?? 0) > 0 && <Detail label="Udhaar" value={formatPKR(s.creditAmount)} icon={HandCoins} tone="rose" strong />}
                      {(s.changeAmount ?? 0) > 0 && <Detail label="Wapasi" value={formatPKR(s.changeAmount)} icon={Coins} />}
                      <Detail label="Lagat" value={hideCost ? '•••' : formatPKR(s.costOfGoods ?? 0)} icon={Wallet} />
                      <Detail label="Munafa" value={hideCost ? '•••' : formatPKR(profit)} icon={TrendingUp} tone="emerald" strong />
                      {s.createdBy?.fullName && <Detail label="Kisne bechi" value={s.createdBy.fullName} icon={User} />}
                      {s.customer?.phone && <Detail label="Phone" value={s.customer.phone} icon={Smartphone} />}
                    </div>

                    <div className="flex gap-2 flex-wrap print:hidden">
                      <Link to={`/sales/${s.id}/receipt`}
                        className="h-10 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-700 text-white text-xs font-extrabold inline-flex items-center gap-1.5 shadow hover:shadow-lg transition">
                        <Eye className="h-3.5 w-3.5" /> Receipt kholo
                      </Link>
                      {s.customer?.id && (
                        <Link to={`/customers/${s.customer.id}`}
                          className="h-10 px-4 rounded-xl bg-white border-2 border-slate-200 text-slate-700 text-xs font-extrabold inline-flex items-center gap-1.5 hover:border-indigo-300 transition">
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

function HeroStat({ label, value, sub, icon: Icon, highlight }: any) {
  return (
    <div className={`rounded-2xl backdrop-blur border p-4 ${
      highlight ? 'bg-white/25 border-white/40 shadow-lg' : 'bg-white/10 border-white/20'
    }`}>
      <div className="flex items-center gap-1.5 text-[10px] uppercase font-extrabold text-white/70 tracking-wider">
        <Icon className="h-3.5 w-3.5" /> {label}
      </div>
      <div className="mt-1 text-2xl font-extrabold tabular-nums truncate">{value}</div>
      {sub && <div className="mt-0.5 text-[11px] font-bold text-white/70 truncate">{sub}</div>}
    </div>
  );
}

const DETAIL_TONES: Record<string, string> = {
  slate: 'text-slate-900', emerald: 'text-emerald-700', rose: 'text-rose-600', amber: 'text-amber-700',
};

function Detail({ label, value, icon: Icon, strong, tone = 'slate' }: any) {
  if (value === null || value === undefined || value === '') return null;
  return (
    <div className="flex items-baseline justify-between gap-3 py-1 border-b border-slate-100 last:border-0">
      <span className="text-[11px] font-bold text-slate-500 inline-flex items-center gap-1.5 shrink-0">
        {Icon && <Icon className="h-3 w-3" />} {label}
      </span>
      <span className={`text-[12px] tabular-nums truncate ${strong ? 'font-extrabold' : 'font-bold'} ${DETAIL_TONES[tone]}`}>
        {value}
      </span>
    </div>
  );
}

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
      tips: ['Upar Udhaar ka total bhi dikhta hai', 'Khata page se wasooli record karein'],
    },
    {
      icon: Calendar, title: 'Duration aur download',
      body: 'Aaj / 7 din / 30 din / 3 mahine ya apni tareekh chunein. CSV me har sale ke saath uske serial numbers bhi aate hain — audit ya tax ke liye.',
      tips: ['1 2 3 4 dabakar tab badlein', 'P dabao to print'],
    },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-2xl bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        <div className="px-5 py-4 bg-gradient-to-r from-amber-50 to-orange-50 border-b-2 border-amber-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-lg">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-amber-700 font-extrabold">Guide</div>
              <h3 className="font-extrabold text-slate-900">Sales Page Kaise Chalayein?</h3>
            </div>
          </div>
          <button onClick={onClose} className="h-9 w-9 rounded-xl hover:bg-white flex items-center justify-center transition">
            <X className="h-4 w-4 text-slate-600" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-3.5">
          {steps.map((st, i) => (
            <div key={i} className="rounded-xl border-2 border-slate-200 bg-slate-50 p-3.5 flex items-start gap-3">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-indigo-600 to-blue-700 text-white flex items-center justify-center shrink-0 shadow-md">
                <st.icon className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div className="font-extrabold text-slate-900">{st.title}</div>
                <div className="text-xs font-semibold text-slate-600 mt-1 leading-relaxed">{st.body}</div>
                <ul className="mt-2 space-y-1">
                  {st.tips.map((tp, j) => (
                    <li key={j} className="text-[11px] font-semibold text-slate-500 flex items-start gap-1.5">
                      <Sparkles className="h-2.5 w-2.5 text-amber-500 shrink-0 mt-0.5" /> {tp}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
        <div className="px-5 py-3.5 border-t-2 border-slate-100 bg-slate-50 text-right shrink-0">
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
        className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border-2 border-slate-200">
        <div className="px-5 py-4 border-b-2 border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
              <Keyboard className="h-4 w-4" />
            </div>
            <h3 className="font-extrabold text-slate-900">Keyboard Shortcuts</h3>
          </div>
          <button onClick={onClose} className="h-9 w-9 rounded-xl hover:bg-slate-100 flex items-center justify-center transition">
            <X className="h-4 w-4 text-slate-600" />
          </button>
        </div>
        <div className="p-5 space-y-2">
          {sc.map(([key, desc]) => (
            <div key={key} className="flex items-center justify-between text-sm">
              <span className="font-semibold text-slate-700">{desc}</span>
              <kbd className="px-2.5 py-1 rounded-lg bg-slate-100 border-2 border-slate-200 font-mono text-xs font-extrabold text-slate-700">{key}</kbd>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
