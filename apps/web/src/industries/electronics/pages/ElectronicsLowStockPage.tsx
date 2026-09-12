// apps/web/src/industries/electronics/pages/ElectronicsLowStockPage.tsx
import { useState, useMemo, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle, Cpu, Search, RefreshCw, FileSpreadsheet, Printer,
  PackageX, PackageSearch, ShoppingCart, ChevronRight, XCircle,
  ShieldAlert, Boxes, Barcode, GraduationCap, Keyboard, X,
  CheckCircle2, Sparkles, Wallet, Layers,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@core/ui/Button';
import { formatPKR } from '@core/lib/format';
import { useAuthStore, useShopParam } from '@core/stores/auth.store';
import { PrintStyles } from '@core/components/print/PrintStyles';
import { electronicsAnalyticsApi, type LowStockRow } from '../api/analytics.api';
import { CATEGORY_META, CONDITION_META, type CategoryType, type ConditionType } from '../constants';

/* ═════════════════════════════════════════════════════════════
   NAFAA ELECTRONICS — LOW STOCK
   ─────────────────────────────────────────────────────────────
   Electronics me do tarah ka stock hota hai:
     • Serial-tracked (laptop, camera, SSD) — ginti serials se
     • Normal (cable, charger, cover) — shop ka stock
   Ye page dono ko sahi tareeqe se dikhata hai.
   🎓 Guide • ⌨️ Shortcuts • 🖨️ Print + CSV
   ═════════════════════════════════════════════════════════════ */

type Tab = 'all' | 'serial' | 'normal';

export default function ElectronicsLowStockPage() {
  const currentShopId = useShopParam();
  const shopName = useAuthStore((s: any) => s.user?.assignedShop?.name);
  const tenantName = useAuthStore((s: any) => s.tenant?.name);

  const [tab, setTab] = useState<Tab>('all');
  const [search, setSearch] = useState('');
  const [onlyOut, setOnlyOut] = useState(false);
  const [showTeacher, setShowTeacher] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['electronics-low-stock', currentShopId],
    queryFn: () => electronicsAnalyticsApi.lowStock(currentShopId || undefined),
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
      if (e.key === '?') setShowShortcuts((v) => !v);
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

  const summary = data?.summary;

  const rows = useMemo(() => {
    let list: LowStockRow[] = data?.items ?? [];
    if (tab === 'serial') list = list.filter((r) => r.requiresSerial);
    if (tab === 'normal') list = list.filter((r) => !r.requiresSerial);
    if (onlyOut) list = list.filter((r) => r.isOut);
    const q = search.toLowerCase().trim();
    if (q) {
      list = list.filter((r) =>
        r.name.toLowerCase().includes(q) ||
        (r.brand ?? '').toLowerCase().includes(q) ||
        (r.sku ?? '').toLowerCase().includes(q) ||
        (r.categoryType ? CATEGORY_META[r.categoryType]?.label.toLowerCase().includes(q) : false),
      );
    }
    return list;
  }, [data, tab, onlyOut, search]);

  const counts = useMemo(() => {
    const all = data?.items ?? [];
    return {
      all: all.length,
      serial: all.filter((r) => r.requiresSerial).length,
      normal: all.filter((r) => !r.requiresSerial).length,
    };
  }, [data]);

  const exportCsv = () => {
    if (rows.length === 0) return toast.error('Koi data nahi');
    const out: string[][] = [
      [`${tenantName ?? 'Nafaa'} — Electronics Low Stock`],
      [`Shop: ${shopName ?? 'All'}`, new Date().toLocaleString('en-PK')],
      [`${summary?.totalLow ?? 0} kam · ${summary?.totalOut ?? 0} khatam · risk ${(summary?.valueAtRisk ?? 0).toFixed(0)}`],
      [],
      ['Product', 'Brand', 'Category', 'Condition', 'SKU', 'Serial Tracked',
       'Stock', 'Alert', 'Unit', 'Cost', 'Sale', 'Stock Value', 'Warranty (m)'],
      ...rows.map((r) => [
        r.name,
        r.brand ?? '',
        r.categoryType ? (CATEGORY_META[r.categoryType]?.label ?? r.categoryType) : '',
        r.conditionType ? (CONDITION_META[r.conditionType]?.label ?? r.conditionType) : '',
        r.sku ?? '',
        r.requiresSerial ? 'Yes' : 'No',
        String(r.stock),
        String(r.lowStockAlert),
        r.unit,
        String(Math.round(r.costPrice)),
        String(Math.round(r.price)),
        String(Math.round(r.stockValue)),
        String(r.warrantyMonths),
      ]),
    ];
    const csv = out.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `electronics-low-stock-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV download ho gaya');
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-40 rounded-3xl bg-slate-200 animate-pulse" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-24 rounded-2xl bg-slate-200 animate-pulse" />)}
        </div>
        <div className="h-64 rounded-3xl bg-slate-200 animate-pulse" />
      </div>
    );
  }

  const nothingLow = (data?.items.length ?? 0) === 0;

  return (
    <div className="space-y-5 pb-10 print:space-y-3">
      <PrintStyles orientation="landscape" title="Electronics Low Stock" subtitle="Kya khatam ho raha hai" />
      {showTeacher && <LowStockTeacher onClose={() => setShowTeacher(false)} />}
      {showShortcuts && <ShortcutsModal onClose={() => setShowShortcuts(false)} />}

      {/* ═══ HERO ═══ */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-amber-900 to-orange-700 text-white p-6 shadow-2xl print:hidden">
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-amber-400/25 blur-3xl animate-pulse" />
        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <ShieldAlert className="h-3.5 w-3.5 text-amber-300" /> Low Stock
              {shopName && <><span className="opacity-40">•</span><span className="text-emerald-200">🏪 {shopName}</span></>}
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">⚡ Kya khatam ho raha hai?</h1>
            <p className="mt-2 text-sm text-white/85 font-semibold">
              Serial wale items ki ginti serials se · baqi ka shop stock se
            </p>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap print:hidden">
            <button onClick={() => setShowTeacher(true)}
              className="h-11 px-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-900 text-xs font-extrabold inline-flex items-center gap-1.5 shadow-lg transition"
              title="Guide (G)">
              <GraduationCap className="h-4 w-4" /> Guide
            </button>
            <button onClick={() => setShowShortcuts(true)}
              className="h-11 w-11 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 inline-flex items-center justify-center backdrop-blur transition"
              title="Shortcuts (?)">
              <Keyboard className="h-4 w-4" />
            </button>
            <button onClick={() => refetch()} disabled={isRefetching}
              className="h-11 w-11 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 flex items-center justify-center transition disabled:opacity-50"
              title="Refresh (R)">
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
      </section>

      {/* ═══ SUMMARY ═══ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi label="Khatam" value={summary?.totalOut ?? 0} icon={XCircle} tone="rose" hint="Stock zero" />
        <Kpi label="Kam Ho Rahe" value={summary?.totalLow ?? 0} icon={AlertTriangle} tone="amber" hint="Alert level se neeche" />
        <Kpi label="Serial Wale" value={summary?.serialTrackedLow ?? 0} icon={Barcode} tone="violet" hint="Mehngi cheezein" />
        <Kpi label="Phansa Paisa" value={formatPKR(summary?.valueAtRisk ?? 0)} icon={Wallet} tone="blue" hint="In items ki lagat" />
      </div>

      {nothingLow ? (
        <div className="rounded-3xl bg-white border-2 border-emerald-200 p-14 text-center">
          <div className="mx-auto h-16 w-16 rounded-3xl bg-emerald-100 flex items-center justify-center mb-3">
            <Boxes className="h-8 w-8 text-emerald-600" />
          </div>
          <h3 className="font-extrabold text-slate-900 text-lg">Sab kuch stock me hai 🎉</h3>
          <p className="text-xs text-slate-500 mt-1 font-semibold">Koi product alert level se neeche nahi</p>
        </div>
      ) : (
        <>
          {/* ═══ FILTERS ═══ */}
          <div className="flex items-center gap-2 flex-wrap print:hidden">
            <div className="flex gap-1.5 bg-white rounded-xl border-2 border-slate-200 p-1">
              {([
                { v: 'all', label: 'Sab', icon: Layers, n: counts.all },
                { v: 'serial', label: 'Serial Wale', icon: Barcode, n: counts.serial },
                { v: 'normal', label: 'Normal', icon: Cpu, n: counts.normal },
              ] as { v: Tab; label: string; icon: any; n: number }[]).map((t) => (
                <button key={t.v} onClick={() => setTab(t.v)}
                  className={`h-9 px-3 rounded-lg text-xs font-extrabold inline-flex items-center gap-1.5 transition ${
                    tab === t.v ? 'bg-gradient-to-r from-amber-600 to-orange-700 text-white shadow'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}>
                  <t.icon className="h-3.5 w-3.5" /> {t.label}
                  <span className={`px-1.5 rounded-full text-[10px] tabular-nums ${tab === t.v ? 'bg-black/20' : 'bg-slate-100'}`}>{t.n}</span>
                </button>
              ))}
            </div>

            <div className="relative flex-1 min-w-[12rem]">
              <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input ref={searchRef} value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Product, brand, SKU ya category... (/)"
                className="h-11 w-full rounded-xl border-2 border-slate-200 bg-white pl-9 pr-3 text-sm font-bold text-slate-900 focus:outline-none focus:border-amber-500 transition" />
            </div>

            <button onClick={() => setOnlyOut((v) => !v)}
              className={`h-11 px-3.5 rounded-xl text-xs font-extrabold border-2 inline-flex items-center gap-1.5 transition ${
                onlyOut ? 'bg-rose-600 text-white border-transparent shadow-lg' : 'bg-white border-slate-200 text-slate-600 hover:border-rose-300'
              }`}>
              <XCircle className="h-3.5 w-3.5" /> Sirf khatam
            </button>
          </div>

          {/* ═══ LIST ═══ */}
          <div className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b-2 border-slate-100 flex items-center gap-2">
              <div className="h-9 w-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                <PackageX className="h-5 w-5" />
              </div>
              <h3 className="font-extrabold text-slate-900">
                Dobara mangwane wale <span className="text-slate-500 font-bold tabular-nums">({rows.length})</span>
              </h3>
            </div>

            {rows.length === 0 ? (
              <div className="p-10 text-center">
                <PackageSearch className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-500">In filters se kuch nahi mila</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {rows.map((r) => {
                  const meta = r.categoryType ? CATEGORY_META[r.categoryType as CategoryType] : null;
                  return (
                    <div key={r.productId} className="p-4 flex items-center gap-3 hover:bg-slate-50 transition">
                      <div className={`h-11 w-11 rounded-xl flex items-center justify-center shrink-0 text-xl ${
                        r.isOut ? 'bg-rose-100' : 'bg-amber-100'
                      }`}>
                        {meta?.emoji ?? '📦'}
                      </div>

                      <div className="flex-1 min-w-0">
                        <Link to={`/electronics-products/${r.productId}`}
                          className="font-extrabold text-slate-900 text-sm truncate hover:text-blue-600 transition inline-flex items-center gap-1">
                          {r.name} <ChevronRight className="h-3 w-3 opacity-50" />
                        </Link>
                        <div className="mt-0.5 flex items-center gap-2 flex-wrap text-[11px] font-bold text-slate-500">
                          {meta && <span>{meta.label}</span>}
                          {r.brand && <span>{r.brand}</span>}
                          {r.sku && <span className="font-mono">{r.sku}</span>}
                          {r.conditionType && r.conditionType !== 'BRAND_NEW' && (
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold ${CONDITION_META[r.conditionType as ConditionType]?.chip}`}>
                              {CONDITION_META[r.conditionType as ConditionType]?.label}
                            </span>
                          )}
                          {r.requiresSerial && (
                            <span className="px-1.5 py-0.5 rounded bg-violet-100 text-violet-700 text-[9px] font-extrabold inline-flex items-center gap-0.5">
                              <Barcode className="h-2.5 w-2.5" /> Serial
                            </span>
                          )}
                          {r.notInShop && (
                            <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 text-[9px] font-extrabold">
                              Shop me assign nahi
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className={`text-lg font-extrabold tabular-nums ${r.isOut ? 'text-rose-600' : 'text-amber-700'}`}>
                          {r.stock}
                          <span className="text-[10px] font-bold text-slate-400 ml-0.5">{r.unit}</span>
                        </div>
                        <div className="text-[10px] font-bold text-slate-500">
                          {r.isOut ? 'khatam' : `alert: ${r.lowStockAlert}`}
                        </div>
                      </div>

                      <Link to={r.requiresSerial ? `/electronics-products/${r.productId}` : '/purchases'}
                        className="h-9 px-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-extrabold inline-flex items-center gap-1 shrink-0 transition print:hidden"
                        title={r.requiresSerial ? 'Serial add karo' : 'Purchase entry karo'}>
                        {r.requiresSerial ? <><Barcode className="h-3 w-3" /> Serial</> : <><ShoppingCart className="h-3 w-3" /> Mangwao</>}
                      </Link>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════
   HELPERS
   ═════════════════════════════════════════════════════════════ */

const KPI_TONES: Record<string, string> = {
  rose: 'from-rose-500 to-red-600 shadow-rose-500/30',
  amber: 'from-amber-500 to-orange-600 shadow-amber-500/30',
  violet: 'from-violet-500 to-fuchsia-600 shadow-violet-500/30',
  blue: 'from-blue-500 to-indigo-600 shadow-blue-500/30',
};

function Kpi({ label, value, icon: Icon, tone, hint }: any) {
  return (
    <div className="rounded-2xl bg-white border-2 border-slate-200 shadow-sm p-4 flex items-center gap-3">
      <div className={`h-11 w-11 rounded-xl bg-gradient-to-br ${KPI_TONES[tone]} text-white flex items-center justify-center shadow-lg shrink-0`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <div className="text-[10px] uppercase font-extrabold text-slate-500 tracking-wider truncate">{label}</div>
        <div className="font-extrabold text-slate-900 text-xl tabular-nums truncate">{value}</div>
        {hint && <div className="text-[10px] font-bold text-slate-400 truncate">{hint}</div>}
      </div>
    </div>
  );
}

function LowStockTeacher({ onClose }: { onClose: () => void }) {
  const steps = [
    {
      icon: Barcode, title: 'Do tarah ka stock',
      body: 'Electronics me kuch cheezein serial ke saath aati hain (laptop, camera, SSD) — unki ginti serials se banti hai. Baqi (cable, charger, cover) ka aam stock chalta hai.',
      tips: ['Serial wale par "Serial" ka badge lagta hai', '"Serial Wale" tab se sirf mehngi cheezein dekho'],
    },
    {
      icon: AlertTriangle, title: 'Kab alert aata hai',
      body: 'Jab stock alert level ke barabar ya us se neeche chala jaye. Har product ka apna alert level hota hai — wizard ya product page se badal sakte hain.',
      tips: ['Laal = bilkul khatam', 'Peela = kam ho raha hai'],
    },
    {
      icon: ShoppingCart, title: 'Kya karna hai',
      body: 'Normal item par "Mangwao" se purchase entry par jao. Serial wale par "Serial" se product page — wahan naye units ke serial add karo.',
      tips: ['"Shop me assign nahi" ka matlab: purchase to hua par is shop ko nahi mila'],
    },
    {
      icon: FileSpreadsheet, title: 'Supplier ko list bhejo',
      body: 'CSV se poori list Excel me — category, condition, warranty sab ke saath. Print se kaghaz par, dukaan me ghoom kar ginti milane ke liye.',
      tips: ['CSV wahi list deta hai jo filter lagi hui hai'],
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
              <h3 className="font-extrabold text-slate-900">Low Stock Kaise Parhein?</h3>
            </div>
          </div>
          <button onClick={onClose} className="h-9 w-9 rounded-xl hover:bg-white flex items-center justify-center transition">
            <X className="h-4 w-4 text-slate-600" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-3.5">
          {steps.map((st, i) => (
            <div key={i} className="rounded-xl border-2 border-slate-200 bg-slate-50 p-3.5 flex items-start gap-3">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center shrink-0 shadow-md">
                <st.icon className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div className="font-extrabold text-slate-900">{st.title}</div>
                <div className="text-xs font-semibold text-slate-600 mt-1 leading-relaxed">{st.body}</div>
                <ul className="mt-2 space-y-1">
                  {st.tips.map((t, j) => (
                    <li key={j} className="text-[11px] font-semibold text-slate-500 flex items-start gap-1.5">
                      <Sparkles className="h-2.5 w-2.5 text-amber-500 shrink-0 mt-0.5" /> {t}
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
  const sc = [['/', 'Search par jao'], ['G', 'Guide kholo'], ['R', 'Refresh'], ['?', 'Ye list'], ['Esc', 'Band karo']];
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border-2 border-slate-200">
        <div className="px-5 py-4 border-b-2 border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
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
