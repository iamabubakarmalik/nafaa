// apps/web/src/industries/electronics/pages/SerialTrackingPage.tsx
import { useState, useMemo, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Barcode, Search, X, RefreshCw, Package, CheckCircle2, XCircle,
  ShieldCheck, ShieldAlert, ShieldOff, AlertTriangle, Trash2, Sparkles,
  Clock, RotateCcw, Wrench, Truck, ScanLine, GraduationCap, Keyboard,
  FileSpreadsheet, Printer, Hash, Wallet, User, Calendar, ArrowRight,
  Loader2, Store, TrendingUp, Layers,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@core/ui/Button';
import { formatPKR } from '@core/lib/format';
import { useAuthStore, useShopParam } from '@core/stores/auth.store';
import { useCostHidden, PrivacyToggle } from '@core/ui/HiddenValue';
import { PrintStyles } from '@core/components/print/PrintStyles';
import {
  serialTrackingApi, type SerialStatus, type SerialWithProduct,
} from '../api/serial-tracking.api';

/* ═════════════════════════════════════════════════════════════
   NAFAA ELECTRONICS — SERIAL / IMEI TRACKING
   ─────────────────────────────────────────────────────────────
   🔎 Serial daalo → poori kahani: kab aaya, kis ko bika,
      warranty kab tak, abhi kahan hai
   📦 Har mehngi cheez ka apna unit — stock, bika, kharab, gum
   🛡️ Warranty check — customer ke saamne foran jawab
   ═════════════════════════════════════════════════════════════ */

const STATUS_META: Record<SerialStatus, {
  label: string; urdu: string; chip: string; icon: any; grad: string;
}> = {
  IN_STOCK:   { label: 'Stock Me',   urdu: 'Bechne ke liye tayyar',      chip: 'bg-emerald-100 text-emerald-700', icon: Package,     grad: 'from-emerald-500 to-teal-600' },
  IN_TRANSIT: { label: 'Raste Me',   urdu: 'Dusri shop ja raha hai',     chip: 'bg-amber-100 text-amber-700',     icon: Truck,       grad: 'from-amber-500 to-orange-600' },
  SOLD:       { label: 'Bik Gaya',   urdu: 'Customer ke paas hai',        chip: 'bg-blue-100 text-blue-700',       icon: CheckCircle2,grad: 'from-blue-500 to-indigo-600' },
  RESERVED:   { label: 'Rakha Hua',  urdu: 'Kisi ke liye rakha hai',      chip: 'bg-violet-100 text-violet-700',   icon: Clock,       grad: 'from-violet-500 to-purple-600' },
  RETURNED:   { label: 'Wapas Aaya', urdu: 'Customer ne wapas kiya',      chip: 'bg-cyan-100 text-cyan-700',       icon: RotateCcw,   grad: 'from-cyan-500 to-blue-600' },
  IN_REPAIR:  { label: 'Repair Me',  urdu: 'Theek ho raha hai',           chip: 'bg-orange-100 text-orange-700',   icon: Wrench,      grad: 'from-orange-500 to-red-600' },
  DEFECTIVE:  { label: 'Kharab',     urdu: 'Chalta nahi',                 chip: 'bg-rose-100 text-rose-700',       icon: XCircle,     grad: 'from-rose-500 to-red-600' },
  LOST:       { label: 'Gum Gaya',   urdu: 'Mila hi nahi',                chip: 'bg-slate-200 text-slate-700',     icon: AlertTriangle,grad: 'from-slate-400 to-slate-600' },
};

const WARRANTY_CHIP: Record<string, string> = {
  ACTIVE: 'bg-emerald-100 text-emerald-700',
  EXPIRED: 'bg-slate-200 text-slate-600',
  VOID: 'bg-rose-100 text-rose-700',
  CLAIMED: 'bg-amber-100 text-amber-700',
  IN_REPAIR: 'bg-orange-100 text-orange-700',
  NO_WARRANTY: 'bg-slate-200 text-slate-600',
};

type Tab = 'all' | 'IN_STOCK' | 'SOLD' | 'problem';

const daysLeft = (iso?: string | null) =>
  iso ? Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000) : null;

export default function SerialTrackingPage() {
  const qc = useQueryClient();
  const hideCost = useCostHidden();
  const currentShopId = useShopParam();
  const shopName = useAuthStore((s: any) => s.user?.assignedShop?.name);
  const tenantName = useAuthStore((s: any) => s.tenant?.name);

  const [tab, setTab] = useState<Tab>('all');
  const [search, setSearch] = useState('');
  const [thisShopOnly, setThisShopOnly] = useState(false);
  const [lookupCode, setLookupCode] = useState('');
  const [lookupResult, setLookupResult] = useState<SerialWithProduct | null>(null);
  const [lookupBusy, setLookupBusy] = useState(false);
  const [showTeacher, setShowTeacher] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const lookupRef = useRef<HTMLInputElement>(null);

  const { data: serials = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['serial-tracking-list', thisShopOnly ? currentShopId : 'all'],
    queryFn: () => serialTrackingApi.list(
      thisShopOnly && currentShopId ? { shopId: currentShopId } : {},
    ),
  });

  const remove = useMutation({
    mutationFn: (id: string) => serialTrackingApi.remove(id),
    onSuccess: () => {
      toast.success('Unit delete ho gaya');
      qc.invalidateQueries({ queryKey: ['serial-tracking-list'] });
      qc.invalidateQueries({ queryKey: ['electronics-stock-report'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Delete fail hua'),
  });

  /* ─── Shortcuts ─── */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      const typing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
      if (e.key === 'Escape') {
        if (showShortcuts) return setShowShortcuts(false);
        if (showTeacher) return setShowTeacher(false);
        if (lookupResult) return setLookupResult(null);
        return;
      }
      if (typing || e.ctrlKey || e.metaKey) return;
      if (e.key === '/') { e.preventDefault(); searchRef.current?.focus(); }
      if (e.key === 's') { e.preventDefault(); lookupRef.current?.focus(); }
      if (e.key === 'g') setShowTeacher(true);
      if (e.key === 'r') refetch();
      if (e.key === 'p') window.print();
      if (e.key === '?') setShowShortcuts((v) => !v);
      if (['1', '2', '3', '4'].includes(e.key)) {
        const t: Tab[] = ['all', 'IN_STOCK', 'SOLD', 'problem'];
        setTab(t[Number(e.key) - 1]);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showTeacher, showShortcuts, lookupResult]);

  const anyModal = showTeacher || showShortcuts || !!lookupResult;
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = anyModal ? 'hidden' : prev;
    return () => { document.body.style.overflow = prev; };
  }, [anyModal]);

  const PROBLEM: SerialStatus[] = ['DEFECTIVE', 'LOST', 'IN_REPAIR', 'RETURNED'];

  const counts = useMemo(() => ({
    all: serials.length,
    IN_STOCK: serials.filter((s) => s.status === 'IN_STOCK').length,
    SOLD: serials.filter((s) => s.status === 'SOLD').length,
    problem: serials.filter((s) => PROBLEM.includes(s.status)).length,
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [serials]);

  const stats = useMemo(() => {
    let stockValue = 0, soldValue = 0, warrantyActive = 0, expiringSoon = 0;
    for (const s of serials) {
      if (s.status === 'IN_STOCK') stockValue += s.purchasePrice ?? 0;
      if (s.status === 'SOLD') soldValue += s.soldPrice ?? 0;
      const d = daysLeft(s.warrantyEndDate);
      if (d != null && d > 0) {
        warrantyActive++;
        if (d <= 30) expiringSoon++;
      }
    }
    return { stockValue, soldValue, warrantyActive, expiringSoon };
  }, [serials]);

  const list = useMemo(() => {
    let l = serials;
    if (tab === 'IN_STOCK') l = l.filter((s) => s.status === 'IN_STOCK');
    else if (tab === 'SOLD') l = l.filter((s) => s.status === 'SOLD');
    else if (tab === 'problem') l = l.filter((s) => PROBLEM.includes(s.status));

    const q = search.toLowerCase().trim();
    if (q) {
      l = l.filter((s) =>
        s.serialNumber.toLowerCase().includes(q) ||
        (s.imei ?? '').includes(q) ||
        (s.imei2 ?? '').includes(q) ||
        (s.macAddress ?? '').toLowerCase().includes(q) ||
        (s.product?.name ?? '').toLowerCase().includes(q),
      );
    }
    return l.slice(0, 300);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serials, tab, search]);

  const doLookup = async () => {
    const code = lookupCode.trim();
    if (!code) return toast.error('Serial ya IMEI daalein');
    setLookupBusy(true);
    try {
      const result = await serialTrackingApi.lookup(code);
      if (result) {
        setLookupResult(result as SerialWithProduct);
      } else {
        toast.error('Ye serial hamare record me nahi mila');
      }
    } catch {
      toast.error('Talash nahi ho saki');
    } finally {
      setLookupBusy(false);
    }
  };

  const exportCsv = () => {
    const out: string[][] = [
      [`${tenantName ?? 'Nafaa'} — Serial / IMEI Tracking`],
      [`Shop: ${thisShopOnly ? (shopName ?? 'current') : 'Sab'}`, new Date().toLocaleString('en-PK')],
      [],
      ['KHULASA'],
      ['Kul units', String(counts.all)],
      ['Stock me', String(counts.IN_STOCK)],
      ['Bik gaye', String(counts.SOLD)],
      ['Masla wale', String(counts.problem)],
      ['Stock ki lagat', String(Math.round(stats.stockValue))],
      ['Bikri', String(Math.round(stats.soldValue))],
      ['Warranty chal rahi', String(stats.warrantyActive)],
      ['30 din me khatam', String(stats.expiringSoon)],
      [],
      ['Product', 'Serial', 'IMEI', 'IMEI 2', 'MAC', 'Status', 'Warranty tak',
        'Din baqi', 'Khareed', 'Bika', 'Halat'],
      ...list.map((s) => {
        const d = daysLeft(s.warrantyEndDate);
        return [
          s.product?.name ?? '',
          s.serialNumber, s.imei ?? '', s.imei2 ?? '', s.macAddress ?? '',
          STATUS_META[s.status]?.label ?? s.status,
          s.warrantyEndDate ? new Date(s.warrantyEndDate).toLocaleDateString('en-PK') : '',
          d != null ? String(d) : '',
          String(Math.round(s.purchasePrice ?? 0)),
          String(Math.round(s.soldPrice ?? 0)),
          s.physicalCondition ?? '',
        ];
      }),
    ];
    const csv = out.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `serial-tracking-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV download ho gaya');
  };

  return (
    <div className="space-y-5 pb-10 print:space-y-3">
      <PrintStyles orientation="landscape" title="Serial / IMEI Tracking" subtitle="Har unit ka apna record" />
      {showTeacher && <SerialTeacher onClose={() => setShowTeacher(false)} />}
      {showShortcuts && <ShortcutsModal onClose={() => setShowShortcuts(false)} />}
      {lookupResult && <LookupModal serial={lookupResult} onClose={() => setLookupResult(null)} hideCost={hideCost} />}

      {/* ═══ HERO ═══ */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-violet-900 to-purple-700 text-white p-6 shadow-2xl print:hidden">
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-purple-400/25 blur-3xl animate-pulse" />
        <div className="relative">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="min-w-0">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
                <Barcode className="h-3.5 w-3.5 text-amber-300" /> Serial / IMEI
              </div>
              <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">🔖 Har Unit Ki Apni Kahani</h1>
              <p className="mt-2 text-sm text-white/85 font-semibold">
                Serial daalein — kab aaya, kis ko bika, warranty kab tak, abhi kahan hai
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
            </div>
          </div>

          {/* Lookup — customer counter par sab se kaam ki cheez */}
          <div className="mt-5 rounded-2xl bg-white/15 backdrop-blur border border-white/25 p-4">
            <div className="flex items-center gap-2 mb-2">
              <ScanLine className="h-4 w-4 text-amber-300" />
              <span className="text-[11px] uppercase font-extrabold tracking-wider text-white/80">
                Serial Ya IMEI Se Talash — customer ke saamne foran jawab
              </span>
            </div>
            <div className="flex gap-2 flex-wrap">
              <div className="relative flex-1 min-w-[200px]">
                <Barcode className="h-4 w-4 text-white/60 absolute left-3 top-1/2 -translate-y-1/2" />
                <input ref={lookupRef} value={lookupCode}
                  onChange={(e) => setLookupCode(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') doLookup(); }}
                  placeholder="Serial number ya IMEI scan/type karein... (S)"
                  className="h-12 w-full rounded-xl bg-white/15 border-2 border-white/25 pl-9 pr-3 text-sm font-bold text-white placeholder:text-white/50 focus:outline-none focus:border-white transition" />
              </div>
              <button onClick={doLookup} disabled={lookupBusy || !lookupCode.trim()}
                className="h-12 px-5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-900 text-sm font-extrabold inline-flex items-center gap-1.5 shadow-lg disabled:opacity-50 transition">
                {lookupBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                Talash
              </button>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-3">
            <HeroStat label="Stock Me" value={String(counts.IN_STOCK)} icon={Package} highlight
              sub={hideCost ? '•••' : formatPKR(stats.stockValue)} />
            <HeroStat label="Bik Gaye" value={String(counts.SOLD)} icon={CheckCircle2}
              sub={formatPKR(stats.soldValue)} />
            <HeroStat label="Warranty Chal Rahi" value={String(stats.warrantyActive)} icon={ShieldCheck}
              sub={stats.expiringSoon > 0 ? `${stats.expiringSoon} khatam ke qareeb` : 'sab theek'} />
            <HeroStat label="Masla Wale" value={String(counts.problem)} icon={AlertTriangle}
              highlight={counts.problem > 0} sub="kharab / gum / repair" />
          </div>
        </div>
      </section>

      {stats.expiringSoon > 0 && (
        <div className="rounded-2xl bg-amber-50 border-2 border-amber-300 p-4 flex items-center gap-3 print:hidden">
          <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center shadow-lg shrink-0">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <div className="flex-1 text-sm font-semibold text-amber-900">
            <b>{stats.expiringSoon} units ki warranty 30 din me khatam ho rahi hai.</b> Jo abhi stock
            me hain unhe pehle bech dein — warranty khatam hote hi unki qeemat gir jati hai.
          </div>
          <Link to="/stock-report"
            className="px-3 h-9 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-extrabold inline-flex items-center shrink-0 transition">
            Dekho
          </Link>
        </div>
      )}

      {/* ═══ FILTERS ═══ */}
      <div className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm p-4 flex items-center justify-between gap-3 flex-wrap print:hidden">
        <div className="flex gap-1.5 flex-wrap">
          {([
            { v: 'all', label: 'Sab', icon: Layers, n: counts.all },
            { v: 'IN_STOCK', label: 'Stock Me', icon: Package, n: counts.IN_STOCK },
            { v: 'SOLD', label: 'Bik Gaye', icon: CheckCircle2, n: counts.SOLD },
            { v: 'problem', label: 'Masla Wale', icon: AlertTriangle, n: counts.problem },
          ] as { v: Tab; label: string; icon: any; n: number }[]).map((k, i) => (
            <button key={k.v} onClick={() => setTab(k.v)} title={`Shortcut: ${i + 1}`}
              className={`h-9 px-3 rounded-lg text-xs font-extrabold inline-flex items-center gap-1.5 transition border-2 ${
                tab === k.v ? 'bg-gradient-to-r from-violet-600 to-purple-700 text-white border-transparent shadow'
                  : 'bg-white border-slate-200 text-slate-600 hover:border-violet-300'
              }`}>
              <k.icon className="h-3.5 w-3.5" /> {k.label}
              <span className={`px-1.5 rounded-full text-[10px] tabular-nums ${tab === k.v ? 'bg-black/20' : 'bg-slate-100'}`}>{k.n}</span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {currentShopId && (
            <button onClick={() => setThisShopOnly((v) => !v)}
              className={`h-10 px-3 rounded-xl text-xs font-extrabold inline-flex items-center gap-1.5 transition border-2 ${
                thisShopOnly ? 'bg-emerald-600 text-white border-transparent shadow' : 'bg-white border-slate-200 text-slate-600 hover:border-emerald-300'
              }`}>
              <Store className="h-3.5 w-3.5" /> Sirf {shopName ?? 'ye shop'}
            </button>
          )}
          <div className="relative">
            <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input ref={searchRef} value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Serial, IMEI, MAC, product... (/)"
              className="h-10 w-full sm:w-72 rounded-xl border-2 border-slate-200 bg-white pl-9 pr-3 text-sm font-bold text-slate-900 focus:outline-none focus:border-violet-500 transition" />
          </div>
        </div>
      </div>

      {/* ═══ LIST ═══ */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-20 rounded-2xl bg-slate-200 animate-pulse" />)}
        </div>
      ) : list.length === 0 ? (
        <div className="rounded-3xl bg-white border-2 border-slate-200 p-12 text-center shadow-sm">
          <Barcode className="h-12 w-12 text-slate-300 mx-auto mb-3" />
          <h3 className="font-extrabold text-slate-900 text-lg">
            {search || tab !== 'all' ? 'Kuch nahi mila' : 'Abhi koi serial unit darj nahi'}
          </h3>
          <p className="text-sm font-semibold text-slate-500 mt-1.5 max-w-md mx-auto">
            Mehngi cheez (laptop, camera, drone) ka har unit alag track hota hai. Product wizard ke
            aakhri step se ya purchase bill se serial daal dein.
          </p>
          <Link to="/electronics-products/new"
            className="mt-4 inline-flex items-center gap-1.5 h-11 px-5 rounded-xl bg-gradient-to-r from-violet-600 to-purple-700 text-white text-sm font-extrabold shadow-lg transition">
            Naya Product + Serial <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      ) : (
        <div className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm overflow-hidden divide-y divide-slate-100">
          {list.map((s) => {
            const meta = STATUS_META[s.status] ?? STATUS_META.IN_STOCK;
            const Icon = meta.icon;
            const d = daysLeft(s.warrantyEndDate);
            return (
              <div key={s.id} className="px-4 py-3 flex items-center gap-3 hover:bg-slate-50 transition">
                <div className={`h-11 w-11 rounded-xl bg-gradient-to-br ${meta.grad} text-white flex items-center justify-center shrink-0 shadow`}>
                  <Icon className="h-5 w-5" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-extrabold text-slate-900 text-sm truncate">
                      {s.product?.name ?? 'Serial unit'}
                    </span>
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold ${meta.chip}`}>
                      {meta.label}
                    </span>
                    {d != null && (
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold inline-flex items-center gap-0.5 ${
                        d < 0 ? 'bg-slate-200 text-slate-600'
                          : d <= 30 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                      }`}>
                        {d < 0 ? <ShieldOff className="h-2.5 w-2.5" /> : <ShieldCheck className="h-2.5 w-2.5" />}
                        {d < 0 ? 'Warranty khatam' : `${d} din baqi`}
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 flex items-center gap-2 flex-wrap text-[11px] font-bold text-slate-500">
                    <span className="font-mono inline-flex items-center gap-1">
                      <Hash className="h-3 w-3" />{s.serialNumber}
                    </span>
                    {s.imei && <span className="font-mono">IMEI {s.imei}</span>}
                    {s.macAddress && <span className="font-mono">MAC {s.macAddress}</span>}
                  </div>
                </div>

                <div className="text-right shrink-0 hidden sm:block">
                  {s.status === 'SOLD' && (s.soldPrice ?? 0) > 0 ? (
                    <>
                      <div className="text-sm font-extrabold text-emerald-700 tabular-nums">{formatPKR(s.soldPrice!)}</div>
                      <div className="text-[10px] font-bold text-slate-400">bika</div>
                    </>
                  ) : (s.purchasePrice ?? 0) > 0 ? (
                    <>
                      <div className="text-sm font-extrabold text-slate-900 tabular-nums">
                        {hideCost ? '•••' : formatPKR(s.purchasePrice!)}
                      </div>
                      <div className="text-[10px] font-bold text-slate-400">lagat</div>
                    </>
                  ) : null}
                </div>

                <div className="flex gap-1.5 shrink-0 print:hidden">
                  <button onClick={() => { setLookupCode(s.serialNumber); setLookupResult(s); }}
                    className="h-9 px-2.5 rounded-lg bg-violet-50 hover:bg-violet-100 text-violet-700 text-xs font-extrabold inline-flex items-center gap-1 transition">
                    <Search className="h-3.5 w-3.5" /> Poori Kahani
                  </button>
                  <button
                    onClick={() => { if (confirm(`Serial ${s.serialNumber} delete karein?`)) remove.mutate(s.id); }}
                    className="h-9 w-9 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center transition">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
          {serials.length > 300 && (
            <div className="p-3 text-center text-[11px] font-bold text-slate-500">
              Pehle 300 dikhaye — poori list CSV me download karein
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════
   POORI KAHANI — ek unit ka safar
   ═════════════════════════════════════════════════════════════ */

function LookupModal({ serial, onClose, hideCost }: {
  serial: SerialWithProduct; onClose: () => void; hideCost: boolean;
}) {
  const meta = STATUS_META[serial.status] ?? STATUS_META.IN_STOCK;
  const Icon = meta.icon;
  const d = daysLeft(serial.warrantyEndDate);
  const profit = (serial.soldPrice ?? 0) - (serial.purchasePrice ?? 0);

  const steps = [
    { label: 'Dukan me aaya', at: serial.purchaseDate ?? serial.createdAt, icon: Package, done: true },
    { label: 'Warranty shuru', at: serial.warrantyStartDate, icon: ShieldCheck, done: !!serial.warrantyStartDate },
    { label: 'Bik gaya', at: serial.soldAt, icon: CheckCircle2, done: !!serial.soldAt },
    { label: 'Warranty khatam', at: serial.warrantyEndDate, icon: ShieldOff, done: d != null && d < 0 },
  ];

  const copy = (v: string) => {
    navigator.clipboard.writeText(v).then(
      () => toast.success('Copy ho gaya'),
      () => toast.error('Copy nahi hua'),
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-2xl bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[94vh] flex flex-col">
        <div className={`shrink-0 px-5 py-4 bg-gradient-to-r ${meta.grad} text-white flex items-center justify-between gap-3`}>
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-11 w-11 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur shrink-0">
              <Icon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] uppercase font-extrabold text-white/70 tracking-wider">{meta.urdu}</div>
              <h3 className="text-lg font-extrabold truncate">{serial.product?.name ?? 'Serial unit'}</h3>
              <div className="text-[11px] font-mono font-bold text-white/80 truncate">{serial.serialNumber}</div>
            </div>
          </div>
          <button onClick={onClose} className="h-10 w-10 rounded-xl bg-white/15 hover:bg-white/25 flex items-center justify-center transition shrink-0">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Warranty — sab se ahem */}
          <div className={`rounded-2xl border-2 p-4 ${
            d == null ? 'bg-slate-50 border-slate-200'
              : d < 0 ? 'bg-slate-100 border-slate-300'
              : d <= 30 ? 'bg-amber-50 border-amber-300'
              : 'bg-emerald-50 border-emerald-300'
          }`}>
            <div className="flex items-center gap-3">
              <div className={`h-12 w-12 rounded-xl flex items-center justify-center text-white shadow shrink-0 ${
                d == null || d < 0 ? 'bg-gradient-to-br from-slate-400 to-slate-600'
                  : d <= 30 ? 'bg-gradient-to-br from-amber-500 to-orange-600'
                  : 'bg-gradient-to-br from-emerald-500 to-teal-600'
              }`}>
                {d != null && d >= 0 ? <ShieldCheck className="h-6 w-6" /> : <ShieldOff className="h-6 w-6" />}
              </div>
              <div className="min-w-0">
                <div className="text-[10px] uppercase font-extrabold text-slate-500 tracking-wider">Warranty</div>
                <div className="text-lg font-extrabold text-slate-900">
                  {d == null ? 'Is unit par warranty nahi'
                    : d < 0 ? 'Warranty khatam ho chuki'
                    : `${d} din baqi hain`}
                </div>
                {serial.warrantyEndDate && (
                  <div className="text-[11px] font-bold text-slate-600">
                    {new Date(serial.warrantyEndDate).toLocaleDateString('en-PK', { day: 'numeric', month: 'long', year: 'numeric' })} tak
                    {serial.warrantyStatus && (
                      <span className={`ml-2 px-1.5 py-0.5 rounded text-[9px] font-extrabold ${WARRANTY_CHIP[serial.warrantyStatus] ?? 'bg-slate-200 text-slate-600'}`}>
                        {serial.warrantyStatus}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Safar */}
          <div className="rounded-2xl bg-slate-50 border-2 border-slate-200 p-4">
            <div className="text-[10px] uppercase font-extrabold text-slate-500 tracking-wider mb-3">Is Unit Ka Safar</div>
            <div className="flex items-start gap-1 overflow-x-auto pb-1">
              {steps.map((st, i) => (
                <div key={i} className="flex items-start gap-1 shrink-0">
                  <div className="flex flex-col items-center gap-1 w-20">
                    <div className={`h-9 w-9 rounded-xl flex items-center justify-center shadow-sm ${
                      st.done ? 'bg-gradient-to-br from-violet-500 to-purple-600 text-white' : 'bg-white text-slate-300 border-2 border-slate-200'
                    }`}>
                      <st.icon className="h-4 w-4" />
                    </div>
                    <div className={`text-[9px] font-extrabold text-center leading-tight ${st.done ? 'text-slate-800' : 'text-slate-400'}`}>
                      {st.label}
                    </div>
                    {st.at && (
                      <div className="text-[8px] font-bold text-slate-400 tabular-nums">
                        {new Date(st.at).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: '2-digit' })}
                      </div>
                    )}
                  </div>
                  {i < steps.length - 1 && (
                    <div className={`h-0.5 w-4 mt-4 rounded-full ${steps[i + 1].done ? 'bg-violet-400' : 'bg-slate-200'}`} />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Pehchan */}
          <div>
            <Lbl>Pehchan</Lbl>
            <div className="grid sm:grid-cols-2 gap-2">
              <CopyBox label="Serial" value={serial.serialNumber} onCopy={copy} />
              {serial.imei && <CopyBox label="IMEI" value={serial.imei} onCopy={copy} />}
              {serial.imei2 && <CopyBox label="IMEI 2" value={serial.imei2} onCopy={copy} />}
              {serial.macAddress && <CopyBox label="MAC" value={serial.macAddress} onCopy={copy} />}
            </div>
          </div>

          {/* Paisa */}
          <div>
            <Lbl>Paisa</Lbl>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <Box label="Khareed" value={hideCost ? '•••' : formatPKR(serial.purchasePrice ?? 0)} icon={Wallet} />
              {serial.status === 'SOLD' && (
                <>
                  <Box label="Bika" value={formatPKR(serial.soldPrice ?? 0)} icon={TrendingUp} tone="emerald" />
                  <Box label="Munafa" value={hideCost ? '•••' : formatPKR(profit)}
                    icon={Sparkles} tone={profit >= 0 ? 'emerald' : 'rose'} />
                </>
              )}
              {serial.supplierRef && <Box label="Supplier ref" value={serial.supplierRef} icon={Hash} mono />}
              {serial.invoiceNumber && <Box label="Invoice" value={serial.invoiceNumber} icon={Hash} mono />}
            </div>
          </div>

          {/* Halat */}
          {(serial.physicalCondition || serial.screenCondition || serial.functionalStatus || serial.batteryHealthPct != null) && (
            <div>
              <Lbl>Halat</Lbl>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {serial.physicalCondition && <Box label="Jismani" value={serial.physicalCondition} icon={Package} />}
                {serial.screenCondition && <Box label="Screen" value={serial.screenCondition} icon={Package} />}
                {serial.functionalStatus && <Box label="Chalta hai" value={serial.functionalStatus} icon={CheckCircle2} />}
                {serial.batteryHealthPct != null && <Box label="Battery" value={`${serial.batteryHealthPct}%`} icon={Package} />}
              </div>
            </div>
          )}

          {serial.notes && (
            <div>
              <Lbl>Note</Lbl>
              <div className="rounded-xl bg-slate-50 border-2 border-slate-200 p-3 text-sm font-semibold text-slate-700">
                {serial.notes}
              </div>
            </div>
          )}

          {serial.status === 'SOLD' && (
            <div className="rounded-2xl bg-blue-50 border-2 border-blue-200 p-3 flex items-start gap-2.5">
              <User className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
              <div className="text-xs font-semibold text-blue-900">
                Ye unit bik chuka hai
                {serial.soldAt && ` — ${new Date(serial.soldAt).toLocaleDateString('en-PK', { day: 'numeric', month: 'long', year: 'numeric' })} ko`}.
                Customer warranty claim le kar aaye to Warranty Claims page se claim bana dein,
                serial se sari tafseel khud aa jayegi.
              </div>
            </div>
          )}
        </div>

        <div className="shrink-0 px-5 py-3.5 border-t-2 border-slate-100 bg-slate-50 flex gap-2 justify-end flex-wrap">
          {serial.productId && (
            <Link to={`/electronics-products/${serial.productId}`}
              className="h-11 px-4 rounded-xl bg-white border-2 border-slate-200 text-slate-700 text-sm font-extrabold inline-flex items-center gap-1.5 hover:border-violet-300 transition">
              <Package className="h-4 w-4" /> Product Page
            </Link>
          )}
          <Link to="/electronics/warranty-claims"
            className="h-11 px-4 rounded-xl bg-white border-2 border-slate-200 text-slate-700 text-sm font-extrabold inline-flex items-center gap-1.5 hover:border-rose-300 transition">
            <ShieldCheck className="h-4 w-4" /> Warranty Claim
          </Link>
          <Button onClick={onClose} className="bg-gradient-to-r from-violet-600 to-purple-700 font-extrabold shadow-lg">
            <CheckCircle2 className="h-4 w-4" /> Band Karein
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════
   HELPERS
   ═════════════════════════════════════════════════════════════ */

function Lbl({ children }: any) {
  return <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 mb-1.5">{children}</label>;
}

function HeroStat({ label, value, sub, icon: Icon, highlight }: any) {
  return (
    <div className={`rounded-2xl backdrop-blur border p-4 ${
      highlight ? 'bg-white/25 border-white/40 shadow-lg' : 'bg-white/10 border-white/20'
    }`}>
      <div className="flex items-center gap-1.5 text-[10px] uppercase font-extrabold text-white/70 tracking-wider">
        <Icon className="h-3.5 w-3.5" /> <span className="truncate">{label}</span>
      </div>
      <div className="mt-1 text-2xl font-extrabold tabular-nums">{value}</div>
      {sub && <div className="mt-0.5 text-[11px] font-bold text-white/70 truncate">{sub}</div>}
    </div>
  );
}

const BOX_TONES: Record<string, string> = {
  slate: 'text-slate-900', emerald: 'text-emerald-700', rose: 'text-rose-600',
};

function Box({ label, value, icon: Icon, tone = 'slate', mono }: any) {
  return (
    <div className="rounded-xl bg-slate-50 border-2 border-slate-200 p-2.5">
      <div className="text-[9px] uppercase font-extrabold text-slate-500 tracking-wider inline-flex items-center gap-1">
        {Icon && <Icon className="h-2.5 w-2.5" />} {label}
      </div>
      <div className={`text-sm font-extrabold mt-0.5 truncate tabular-nums ${mono ? 'font-mono' : ''} ${BOX_TONES[tone]}`}>
        {value}
      </div>
    </div>
  );
}

function CopyBox({ label, value, onCopy }: { label: string; value: string; onCopy: (v: string) => void }) {
  return (
    <button onClick={() => onCopy(value)}
      className="rounded-xl bg-violet-50 border-2 border-violet-200 p-2.5 text-left hover:border-violet-400 transition group">
      <div className="text-[9px] uppercase font-extrabold text-violet-600 tracking-wider">{label} — copy ke liye click</div>
      <div className="text-sm font-extrabold font-mono text-violet-950 mt-0.5 truncate">{value}</div>
    </button>
  );
}

function SerialTeacher({ onClose }: { onClose: () => void }) {
  const steps = [
    {
      icon: ScanLine, title: 'Serial se foran talash',
      body: 'Upar wale khaane me serial ya IMEI daal kar Enter dabayein. Customer counter par khara ho aur poochhe "meri warranty chal rahi hai?" — jawab 2 second me mil jata hai.',
      tips: ['S dabao to seedha talash wale khaane par', 'Barcode scanner bhi wahin scan karta hai'],
    },
    {
      icon: ShieldCheck, title: 'Warranty ka jawab',
      body: 'Talash ka nateeja sab se upar warranty dikhata hai: hara = chal rahi, peela = 30 din se kam baqi, grey = khatam. Sath me tareekh bhi likhi hoti hai.',
      tips: ['Peele wale units pehle bech dein'],
    },
    {
      icon: Barcode, title: 'Har unit ka safar',
      body: 'Unit kholne par uska poora safar nazar aata hai — dukan me kab aaya, warranty kab shuru hui, kis din bika, aur warranty kab khatam hogi. Khareed aur bikri ka farq (munafa) bhi.',
      tips: ['Serial ya IMEI par click karke copy kar sakte hain'],
    },
    {
      icon: AlertTriangle, title: 'Masla wale units',
      body: 'Kharab, gum shuda, repair me aur wapas aaye units "Masla Wale" tab me alag hote hain. Ye stock me nahi ginay jate — POS par bhi nazar nahi aate.',
      tips: ['Status Stock Durusti page se badalta hai', 'CSV me poora record Excel ke liye'],
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
              <h3 className="font-extrabold text-slate-900">Serial Tracking</h3>
            </div>
          </div>
          <button onClick={onClose} className="h-9 w-9 rounded-xl hover:bg-white flex items-center justify-center transition">
            <X className="h-4 w-4 text-slate-600" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-3.5">
          {steps.map((st, i) => (
            <div key={i} className="rounded-xl border-2 border-slate-200 bg-slate-50 p-3.5 flex items-start gap-3">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-violet-600 to-purple-700 text-white flex items-center justify-center shrink-0 shadow-md">
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
    ['S', 'Serial talash par jao'], ['/', 'List me search'], ['1 – 4', 'Tab badlein'],
    ['G', 'Guide kholo'], ['R', 'Refresh'], ['P', 'Print'], ['?', 'Ye list'], ['Esc', 'Band karo'],
  ];
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border-2 border-slate-200">
        <div className="px-5 py-4 border-b-2 border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-violet-100 text-violet-700 flex items-center justify-center">
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
