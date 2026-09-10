// apps/web/src/industries/electronics/pages/ElectronicsPurchasesPage.tsx
import { useState, useMemo, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Truck, Search, RefreshCw, FileSpreadsheet, Printer, X, Plus, Barcode,
  GraduationCap, Keyboard, CheckCircle2, Sparkles, Wallet, HandCoins,
  Package, ChevronDown, ChevronRight, Loader2, AlertTriangle, Copy,
  Building2, CalendarClock, TrendingUp, Layers, ArrowRight, Cpu,
  Trash2, Banknote, CreditCard, Smartphone,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@core/ui/Button';
import { formatPKR } from '@core/lib/format';
import { useAuthStore } from '@core/stores/auth.store';
import { useCostHidden, PrivacyToggle } from '@core/ui/HiddenValue';
import { PrintStyles } from '@core/components/print/PrintStyles';
import { purchasesApi, type Purchase } from '@modules/purchasing/purchases/api/purchases.api';
import { suppliersApi } from '@modules/purchasing/suppliers/api/suppliers.api';
import { electronicsAnalyticsApi } from '../api/analytics.api';
import { CATEGORY_META, type CategoryType } from '../constants';
import { serialTrackingApi } from '../api/serial-tracking.api';
import { electronicsPosApi } from '../api/electronics-pos.api';

/* ═════════════════════════════════════════════════════════════
   NAFAA ELECTRONICS — KHARIDARI (PURCHASES)
   ─────────────────────────────────────────────────────────────
   🚚 Supplier se kya aaya, kitne ka aaya, kitna baqi hai
   🔖 Jo cheez serial wali hai — usi jagah se serials daal dein
      (warna maal aa to jata hai lekin unit track nahi hote)
   💰 Supplier ka udhaar alag nazar aata hai
   ═════════════════════════════════════════════════════════════ */

type Tab = 'all' | 'serial' | 'due';

export default function ElectronicsPurchasesPage() {
  const hideCost = useCostHidden();
  const currentShopId = useAuthStore((s) => s.currentShopId);
  const tenantName = useAuthStore((s: any) => s.tenant?.name);

  const [tab, setTab] = useState<Tab>('all');
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [showNew, setShowNew] = useState(false);
  const [serialFor, setSerialFor] = useState<{
    productId: string; productName: string; expected: number;
    costPrice: number; supplierRef: string;
  } | null>(null);
  const [showTeacher, setShowTeacher] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  const { data: purchases = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['purchases'],
    queryFn: () => purchasesApi.list(),
  });

  const { data: summary } = useQuery({
    queryKey: ['purchases-summary'],
    queryFn: () => purchasesApi.summary(),
  });

  /* Kaunse products serial wale hain — POS catalog se pata chalta hai */
  const { data: catalog } = useQuery({
    queryKey: ['electronics-pos-catalog', currentShopId, '', 'purchases'],
    queryFn: () => electronicsPosApi.catalog({ shopId: currentShopId || undefined }),
  });

  const serialProductIds = useMemo(() => {
    const s = new Set<string>();
    for (const p of catalog?.items ?? []) if (p.requiresSerial) s.add(p.id);
    return s;
  }, [catalog]);

  /* Har serial-wale product ke kitne units abhi darj hain */
  const { data: allSerials = [] } = useQuery({
    queryKey: ['electronics-serials-all'],
    queryFn: () => serialTrackingApi.list({}),
  });

  const serialCountByProduct = useMemo(() => {
    const m = new Map<string, number>();
    for (const s of allSerials as any[]) m.set(s.productId, (m.get(s.productId) ?? 0) + 1);
    return m;
  }, [allSerials]);

  /* ─── Shortcuts ─── */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      const typing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
      if (e.key === 'Escape') {
        if (showShortcuts) return setShowShortcuts(false);
        if (showTeacher) return setShowTeacher(false);
        if (serialFor) return setSerialFor(null);
        if (showNew) return setShowNew(false);
        return;
      }
      if (typing || e.ctrlKey || e.metaKey) return;
      if (e.key === '/') { e.preventDefault(); searchRef.current?.focus(); }
      if (e.key === 'n') setShowNew(true);
      if (e.key === 'g') setShowTeacher(true);
      if (e.key === 'r') refetch();
      if (e.key === 'p') window.print();
      if (e.key === '?') setShowShortcuts((v) => !v);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showTeacher, showShortcuts, serialFor, showNew]);

  const anyModal = showTeacher || showShortcuts || !!serialFor || showNew;
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

  const hasSerialItems = (p: Purchase) =>
    p.items.some((it) => serialProductIds.has(it.product.id));

  const dueOf = (p: Purchase) => Math.max(0, (p.total ?? 0) - (p.paidAmount ?? 0));

  const counts = useMemo(() => ({
    all: purchases.length,
    serial: purchases.filter(hasSerialItems).length,
    due: purchases.filter((p) => dueOf(p) > 0).length,
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [purchases, serialProductIds]);

  const list = useMemo(() => {
    let l = purchases;
    if (tab === 'serial') l = l.filter(hasSerialItems);
    if (tab === 'due') l = l.filter((p) => dueOf(p) > 0);
    const q = search.toLowerCase().trim();
    if (q) {
      l = l.filter((p) =>
        p.purchaseNumber.toLowerCase().includes(q) ||
        p.supplier.name.toLowerCase().includes(q) ||
        p.items.some((it) => it.product.name.toLowerCase().includes(q)),
      );
    }
    return l;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [purchases, tab, search, serialProductIds]);

  const stats = useMemo(() => {
    let total = 0, paid = 0, serialUnitsBought = 0;
    for (const p of purchases) {
      total += p.total ?? 0;
      paid += p.paidAmount ?? 0;
      for (const it of p.items) {
        if (serialProductIds.has(it.product.id)) serialUnitsBought += it.quantity ?? 0;
      }
    }
    return { total, paid, due: Math.max(0, total - paid), serialUnitsBought };
  }, [purchases, serialProductIds]);

  const exportCsv = () => {
    const out: string[][] = [
      [`${tenantName ?? 'Nafaa'} — Electronics Kharidari`],
      [new Date().toLocaleString('en-PK')],
      [],
      ['KHULASA'],
      ['Kul kharidari', String(Math.round(stats.total))],
      ['Ada kiya', String(Math.round(stats.paid))],
      ['Baqi', String(Math.round(stats.due))],
      ['Serial wale units khareede', String(stats.serialUnitsBought)],
      [],
      ['Purchase #', 'Tareekh', 'Supplier', 'Item', 'Ginti', 'Per unit', 'Kul', 'Serial wala', 'Baqi'],
      ...list.flatMap((p) =>
        p.items.map((it) => [
          p.purchaseNumber,
          new Date(p.purchasedAt).toLocaleDateString('en-PK'),
          p.supplier.name,
          it.product.name,
          String(it.quantity),
          String(Math.round(it.costPrice)),
          String(Math.round(it.total)),
          serialProductIds.has(it.product.id) ? 'HAAN' : '',
          String(Math.round(dueOf(p))),
        ]),
      ),
    ];
    const csv = out.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `electronics-purchases-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV download ho gaya');
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-44 rounded-3xl bg-slate-200 animate-pulse" />
        <div className="h-96 rounded-3xl bg-slate-200 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-10 print:space-y-3">
      <PrintStyles orientation="landscape" title="Electronics Kharidari" subtitle="Supplier se kya aaya" />
      {showTeacher && <PurchasesTeacher onClose={() => setShowTeacher(false)} />}
      {showShortcuts && <ShortcutsModal onClose={() => setShowShortcuts(false)} />}
      {showNew && <NewPurchaseModal onClose={() => setShowNew(false)} shopId={currentShopId} />}
      {serialFor && (
        <BulkSerialModal
          {...serialFor}
          shopId={currentShopId}
          alreadyHave={serialCountByProduct.get(serialFor.productId) ?? 0}
          onClose={() => setSerialFor(null)}
        />
      )}

      {/* ═══ HERO ═══ */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-teal-900 to-emerald-700 text-white p-6 shadow-2xl print:hidden">
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-emerald-400/25 blur-3xl animate-pulse" />
        <div className="relative">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="min-w-0">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
                <Truck className="h-3.5 w-3.5 text-amber-300" /> Kharidari
              </div>
              <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">🚚 Supplier Se Kya Aaya</h1>
              <p className="mt-2 text-sm text-white/85 font-semibold">
                Serial wali cheez aaye to yahin se uske serial numbers daal dein
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
              <button onClick={() => setShowNew(true)} title="Nayi kharidari (N)"
                className="h-11 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-extrabold inline-flex items-center gap-1.5 shadow-lg transition">
                <Plus className="h-4 w-4" /> Nayi Kharidari
              </button>
            </div>
          </div>

          <div className="mt-5 grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <HeroStat label="Kul Kharidari" value={hideCost ? '••••••' : formatPKR(stats.total)} icon={Wallet}
              sub={`${purchases.length} bills`} />
            <HeroStat label="Ada Kiya" value={hideCost ? '••••••' : formatPKR(stats.paid)} icon={CheckCircle2} />
            <HeroStat label="Supplier Ka Baqi" value={formatPKR(stats.due)} icon={HandCoins}
              highlight={stats.due > 0} sub={stats.due > 0 ? `${counts.due} bills` : 'sab clear ✅'} />
            <HeroStat label="Serial Wale Units" value={String(stats.serialUnitsBought)} icon={Barcode} sub="khareede" />
          </div>

          {summary && summary.monthPurchases > 0 && (
            <div className="mt-3 text-[11px] font-bold text-white/70">
              Is mahine: <b className="text-white">{hideCost ? '•••' : formatPKR(summary.monthPurchases)}</b>
              {' '}({summary.monthCount} bills)
            </div>
          )}
        </div>
      </section>

      {/* ═══ FILTERS ═══ */}
      <div className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm p-4 flex items-center justify-between gap-3 flex-wrap print:hidden">
        <div className="flex gap-1.5 flex-wrap">
          {([
            { v: 'all', label: 'Sab', icon: Layers, n: counts.all },
            { v: 'serial', label: 'Serial Wale', icon: Barcode, n: counts.serial },
            { v: 'due', label: 'Baqi Paisa', icon: HandCoins, n: counts.due },
          ] as { v: Tab; label: string; icon: any; n: number }[]).map((k) => (
            <button key={k.v} onClick={() => setTab(k.v)}
              className={`h-9 px-3 rounded-lg text-xs font-extrabold inline-flex items-center gap-1.5 transition border-2 ${
                tab === k.v ? 'bg-gradient-to-r from-teal-600 to-emerald-700 text-white border-transparent shadow'
                  : 'bg-white border-slate-200 text-slate-600 hover:border-teal-300'
              }`}>
              <k.icon className="h-3.5 w-3.5" /> {k.label}
              <span className={`px-1.5 rounded-full text-[10px] tabular-nums ${tab === k.v ? 'bg-black/20' : 'bg-slate-100'}`}>{k.n}</span>
            </button>
          ))}
        </div>
        <div className="relative">
          <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input ref={searchRef} value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Bill #, supplier, product... (/)"
            className="h-10 w-full sm:w-72 rounded-xl border-2 border-slate-200 bg-white pl-9 pr-3 text-sm font-bold text-slate-900 focus:outline-none focus:border-teal-500 transition" />
        </div>
      </div>

      {/* ═══ LIST ═══ */}
      {list.length === 0 ? (
        <div className="rounded-3xl bg-white border-2 border-slate-200 p-12 text-center shadow-sm">
          <Truck className="h-12 w-12 text-slate-300 mx-auto mb-3" />
          <h3 className="font-extrabold text-slate-900 text-lg">
            {search || tab !== 'all' ? 'Kuch nahi mila' : 'Abhi tak koi kharidari nahi'}
          </h3>
          <p className="text-sm font-semibold text-slate-500 mt-1.5 max-w-md mx-auto">
            Supplier se maal aaye to yahan bill banayein — stock khud barh jayega
            aur supplier ka hisab bhi chalta rahega.
          </p>
          <button onClick={() => setShowNew(true)}
            className="mt-4 inline-flex items-center gap-1.5 h-11 px-5 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-700 text-white text-sm font-extrabold shadow-lg transition">
            <Plus className="h-4 w-4" /> Nayi Kharidari
          </button>
        </div>
      ) : (
        <div className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm overflow-hidden divide-y divide-slate-100">
          {list.map((p) => {
            const open = expanded.has(p.id);
            const due = dueOf(p);
            const serialItems = p.items.filter((it) => serialProductIds.has(it.product.id));
            return (
              <div key={p.id}>
                <button onClick={() => toggle(p.id)} className="w-full px-4 py-3.5 flex items-center gap-3 text-left hover:bg-slate-50 transition">
                  <div className={`h-11 w-11 rounded-xl flex items-center justify-center shrink-0 text-white shadow ${
                    due > 0 ? 'bg-gradient-to-br from-amber-500 to-orange-600' : 'bg-gradient-to-br from-teal-500 to-emerald-600'
                  }`}>
                    <Truck className="h-5 w-5" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-extrabold text-slate-900 text-sm font-mono">{p.purchaseNumber}</span>
                      {serialItems.length > 0 && (
                        <span className="px-1.5 py-0.5 rounded bg-violet-100 text-violet-700 text-[9px] font-extrabold inline-flex items-center gap-0.5">
                          <Barcode className="h-2.5 w-2.5" /> {serialItems.length} serial wali
                        </span>
                      )}
                      {due > 0 && (
                        <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 text-[9px] font-extrabold">
                          Baqi {formatPKR(due)}
                        </span>
                      )}
                      {p.status !== 'RECEIVED' && (
                        <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-[9px] font-extrabold">{p.status}</span>
                      )}
                    </div>
                    <div className="mt-0.5 flex items-center gap-2 flex-wrap text-[11px] font-bold text-slate-500">
                      <span className="inline-flex items-center gap-1"><Building2 className="h-3 w-3" />{p.supplier.name}</span>
                      <span className="inline-flex items-center gap-1"><CalendarClock className="h-3 w-3" />
                        {new Date(p.purchasedAt).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                      <span>{p.items.length} items</span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-base font-extrabold text-slate-900 tabular-nums">
                      {hideCost ? '•••••' : formatPKR(p.total ?? 0)}
                    </div>
                    <div className={`text-[10px] font-extrabold ${due > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                      {due > 0 ? `${formatPKR(due)} baqi` : 'Poora ada ✅'}
                    </div>
                  </div>
                  {open ? <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" /> : <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />}
                </button>

                {open && (
                  <div className="px-4 pb-4 pt-1 bg-slate-50 space-y-2.5">
                    <div className="rounded-xl border-2 border-slate-200 bg-white overflow-hidden divide-y divide-slate-100">
                      {p.items.map((it) => {
                        const isSerial = serialProductIds.has(it.product.id);
                        const have = serialCountByProduct.get(it.product.id) ?? 0;
                        return (
                          <div key={it.id} className="px-3 py-2.5">
                            <div className="flex items-center gap-2">
                              <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${
                                isSerial ? 'bg-violet-100 text-violet-700' : 'bg-slate-100 text-slate-600'
                              }`}>
                                {isSerial ? <Barcode className="h-4 w-4" /> : <Package className="h-4 w-4" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="font-extrabold text-slate-900 text-sm truncate">{it.product.name}</div>
                                <div className="text-[11px] font-bold text-slate-500 tabular-nums">
                                  {it.quantity} {it.product.unit} × {hideCost ? '•••' : formatPKR(it.costPrice)}
                                </div>
                              </div>
                              <div className="font-extrabold text-slate-900 tabular-nums text-sm shrink-0">
                                {hideCost ? '•••' : formatPKR(it.total)}
                              </div>
                            </div>

                            {isSerial && (
                              <div className="mt-2 rounded-lg bg-violet-50 border border-violet-200 px-2.5 py-2 flex items-center gap-2 flex-wrap">
                                <span className="text-[11px] font-bold text-violet-800 flex-1 min-w-0">
                                  Serial wali cheez — abhi <b>{have}</b> units darj hain
                                </span>
                                <button
                                  onClick={() => setSerialFor({
                                    productId: it.product.id,
                                    productName: it.product.name,
                                    expected: it.quantity,
                                    costPrice: it.costPrice,
                                    supplierRef: p.purchaseNumber,
                                  })}
                                  className="h-8 px-2.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-[11px] font-extrabold inline-flex items-center gap-1 shrink-0 transition">
                                  <Plus className="h-3 w-3" /> Serial Daalein
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    <div className="rounded-xl border-2 border-slate-200 bg-white p-3 grid sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-1">
                      <Detail label="Subtotal" value={hideCost ? '•••' : formatPKR(p.subtotal ?? 0)} />
                      {(p.discount ?? 0) > 0 && <Detail label="Discount" value={`− ${formatPKR(p.discount)}`} tone="rose" />}
                      <Detail label="Kul" value={hideCost ? '•••' : formatPKR(p.total ?? 0)} strong />
                      <Detail label="Ada kiya" value={hideCost ? '•••' : formatPKR(p.paidAmount ?? 0)} tone="emerald" />
                      {due > 0 && <Detail label="Baqi" value={formatPKR(due)} tone="rose" strong />}
                      <Detail label="Payment" value={p.paymentMethod} />
                      {p.createdBy?.fullName && <Detail label="Kisne banaya" value={p.createdBy.fullName} />}
                      {p.supplier.phone && <Detail label="Supplier phone" value={p.supplier.phone} />}
                    </div>

                    {p.notes && (
                      <div className="rounded-xl bg-white border-2 border-slate-200 p-3 text-xs font-semibold text-slate-600">
                        📝 {p.notes}
                      </div>
                    )}

                    <Link to={`/purchases/${p.id}`}
                      className="inline-flex items-center gap-1.5 text-xs font-extrabold text-teal-700 hover:underline print:hidden">
                      Poora bill dekhein <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
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
   BULK SERIAL ENTRY
   ═════════════════════════════════════════════════════════════ */

function BulkSerialModal({
  productId, productName, expected, costPrice, supplierRef, shopId, alreadyHave, onClose,
}: {
  productId: string; productName: string; expected: number; costPrice: number;
  supplierRef: string; shopId: string | null; alreadyHave: number; onClose: () => void;
}) {
  const qc = useQueryClient();
  const [text, setText] = useState('');
  const [warrantyStart, setWarrantyStart] = useState(new Date().toISOString().slice(0, 10));

  const entries = useMemo(() => {
    const seen = new Set<string>();
    return text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean)
      .map((line) => {
        const parts = line.split(/[,\t;]+/).map((x) => x.trim()).filter(Boolean);
        return { serialNumber: parts[0] ?? '', imei: parts[1], imei2: parts[2], macAddress: parts[3] };
      })
      .filter((e) => {
        if (!e.serialNumber) return false;
        const k = e.serialNumber.toLowerCase();
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      });
  }, [text]);

  const dupesInPaste = useMemo(() => {
    const seen = new Set<string>();
    let n = 0;
    for (const line of text.split(/\r?\n/)) {
      const s = line.split(/[,\t;]+/)[0]?.trim().toLowerCase();
      if (!s) continue;
      if (seen.has(s)) n++;
      seen.add(s);
    }
    return n;
  }, [text]);

  const mutation = useMutation({
    mutationFn: () => serialTrackingApi.bulkCreate({
      productId,
      shopId: shopId || undefined,
      entries,
      purchasePrice: costPrice || undefined,
      supplierRef,
      warrantyStartDate: warrantyStart || undefined,
    }),
    onSuccess: (res) => {
      const parts = [`${res.created} units darj ho gaye`];
      if (res.skipped > 0) parts.push(`${res.skipped} pehle se maujood the`);
      toast.success(parts.join(' · '));
      qc.invalidateQueries({ queryKey: ['electronics-serials-all'] });
      qc.invalidateQueries({ queryKey: ['electronics-stock-report'] });
      qc.invalidateQueries({ queryKey: ['electronics-low-stock'] });
      qc.invalidateQueries({ queryKey: ['electronics-pos-catalog'] });
      onClose();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Serial darj nahi hue'),
  });

  const short = expected - entries.length;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[94vh] flex flex-col">
        <div className="px-5 py-4 bg-gradient-to-r from-violet-600 to-purple-700 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur shrink-0">
              <Barcode className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-wider font-extrabold text-white/70">Serial Numbers</div>
              <h3 className="font-extrabold truncate">{productName}</h3>
            </div>
          </div>
          <button onClick={onClose} className="h-9 w-9 rounded-xl hover:bg-white/20 flex items-center justify-center transition shrink-0">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl bg-slate-50 border-2 border-slate-200 p-3">
              <div className="text-[10px] uppercase font-extrabold text-slate-500 tracking-wider">Bill Me Aaye</div>
              <div className="text-2xl font-extrabold text-slate-900 tabular-nums">{expected}</div>
            </div>
            <div className="rounded-xl bg-violet-50 border-2 border-violet-200 p-3">
              <div className="text-[10px] uppercase font-extrabold text-violet-600 tracking-wider">Pehle Se Darj</div>
              <div className="text-2xl font-extrabold text-violet-900 tabular-nums">{alreadyHave}</div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 mb-1.5">
              Serial Numbers — har line par ek
            </label>
            <textarea rows={8} value={text} onChange={(e) => setText(e.target.value)} autoFocus
              placeholder={'SN123456789\nSN987654321, 356938035643809\nSN555000111'}
              className="w-full rounded-xl border-2 border-slate-200 px-3 py-2 text-sm font-mono focus:outline-none focus:border-violet-500 transition" />
            <p className="mt-1.5 text-[11px] font-semibold text-slate-500">
              IMEI bhi hai to comma laga kar sath likhein — <span className="font-mono">serial, imei</span>
            </p>
          </div>

          {entries.length > 0 && (
            <div className="rounded-xl bg-slate-50 border-2 border-slate-200 p-3 flex items-center gap-2 flex-wrap">
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[11px] font-extrabold">
                {entries.length} serial tayyar
              </span>
              {dupesInPaste > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[11px] font-extrabold inline-flex items-center gap-1">
                  <Copy className="h-3 w-3" /> {dupesInPaste} do bar likhe the
                </span>
              )}
              {short > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[11px] font-extrabold">
                  {short} abhi baqi hain
                </span>
              )}
              {short < 0 && (
                <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[11px] font-extrabold inline-flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" /> bill se {-short} zyada
                </span>
              )}
            </div>
          )}

          <div>
            <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 mb-1.5">
              Warranty Shuru
            </label>
            <input type="date" value={warrantyStart} onChange={(e) => setWarrantyStart(e.target.value)}
              className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-violet-500 transition" />
            <p className="mt-1.5 text-[11px] font-semibold text-slate-500">
              Product ki warranty ke mahine isi tareekh se ginay jayenge
            </p>
          </div>

          <div className="rounded-xl bg-blue-50 border-2 border-blue-200 p-3 flex items-start gap-2">
            <Sparkles className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
            <div className="text-xs font-semibold text-blue-900">
              Khareed qeemat <b>{costPrice > 0 ? formatPKR(costPrice) : '—'}</b> aur bill number{' '}
              <b className="font-mono">{supplierRef}</b> har unit par khud lag jayenge.
            </div>
          </div>
        </div>

        <div className="px-5 py-3.5 border-t-2 border-slate-100 bg-slate-50 flex gap-2 justify-end shrink-0">
          <button onClick={onClose} className="h-11 px-4 rounded-xl bg-white border-2 border-slate-200 text-slate-700 text-sm font-extrabold hover:bg-slate-100 transition">
            Cancel
          </button>
          <Button onClick={() => mutation.mutate()} disabled={entries.length === 0 || mutation.isPending}
            className="bg-gradient-to-r from-violet-600 to-purple-700 font-extrabold shadow-lg">
            {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            {entries.length} Serial Darj Karein
          </Button>
        </div>
      </div>
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
  slate: 'text-slate-900', emerald: 'text-emerald-700', rose: 'text-rose-600',
};

function Detail({ label, value, strong, tone = 'slate' }: any) {
  if (value === null || value === undefined || value === '') return null;
  return (
    <div className="flex items-baseline justify-between gap-3 py-1 border-b border-slate-100 last:border-0">
      <span className="text-[11px] font-bold text-slate-500 shrink-0">{label}</span>
      <span className={`text-[12px] tabular-nums truncate ${strong ? 'font-extrabold' : 'font-bold'} ${DETAIL_TONES[tone]}`}>
        {value}
      </span>
    </div>
  );
}

function PurchasesTeacher({ onClose }: { onClose: () => void }) {
  const steps = [
    {
      icon: Truck, title: 'Kharidari ka bill',
      body: 'Supplier se maal aaye to yahan bill banayein — stock khud barh jata hai aur supplier ka hisab bhi chalta rehta hai. Har bill kholne par uske andar ka poora maal nazar aata hai.',
      tips: ['Baqi Paisa tab me wo bills jin ka paisa reh gaya'],
    },
    {
      icon: Barcode, title: 'Serial daalna sab se ahem',
      body: 'Agar bill me laptop, camera ya koi serial wali cheez hai to us line par "Serial Daalein" ka button aata hai. Wahin se saare serial numbers ek sath paste kar dein.',
      tips: ['Har line par ek serial', 'IMEI bhi ho to comma laga kar sath likhein'],
    },
    {
      icon: AlertTriangle, title: 'Serial na daalne ka nuqsan',
      body: 'Serial na daalein to maal stock me to aa jata hai lekin har unit alag track nahi hota — na warranty chalti hai, na POS par unit scan hota hai, na stock report sach bolti hai.',
      tips: ['Modal batata hai kitne baqi hain', 'Ek hi serial do bar nahi ja sakta'],
    },
    {
      icon: HandCoins, title: 'Supplier ka baqi',
      body: 'Upar dikhta hai ke supplier ko kul kitna dena hai. Har bill par bhi likha hota hai ke us bill ka kitna paisa baqi hai.',
      tips: ['CSV me poora record Excel ke liye', 'P dabao to print'],
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
              <h3 className="font-extrabold text-slate-900">Kharidari Ka Tareeqa</h3>
            </div>
          </div>
          <button onClick={onClose} className="h-9 w-9 rounded-xl hover:bg-white flex items-center justify-center transition">
            <X className="h-4 w-4 text-slate-600" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-3.5">
          {steps.map((st, i) => (
            <div key={i} className="rounded-xl border-2 border-slate-200 bg-slate-50 p-3.5 flex items-start gap-3">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-teal-600 to-emerald-700 text-white flex items-center justify-center shrink-0 shadow-md">
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
    ['N', 'Nayi kharidari'], ['/', 'Search par jao'], ['G', 'Guide kholo'],
    ['R', 'Refresh'], ['P', 'Print'], ['?', 'Ye list'], ['Esc', 'Band karo'],
  ];
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border-2 border-slate-200">
        <div className="px-5 py-4 border-b-2 border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center">
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

/* ═════════════════════════════════════════════════════════════
   NAYI KHARIDARI
   ─────────────────────────────────────────────────────────────
   Pehle ye page sirf list dikhata tha aur "Nayi Kharidari" ka
   button ek aisi route par le jata tha jo maujood hi nahi thi
   (/purchases/new) — user dashboard par pahunch jata tha.
   ═════════════════════════════════════════════════════════════ */

const PAY_OPTIONS: { v: any; label: string; icon: any }[] = [
  { v: 'CASH', label: 'Cash', icon: Banknote },
  { v: 'BANK_TRANSFER', label: 'Bank', icon: Building2 },
  { v: 'CARD', label: 'Card', icon: CreditCard },
  { v: 'JAZZCASH', label: 'JazzCash', icon: Smartphone },
  { v: 'EASYPAISA', label: 'Easypaisa', icon: Smartphone },
];

interface DraftLine {
  productId: string;
  name: string;
  unit: string;
  quantity: number;
  costPrice: number;
}

function NewPurchaseModal({ onClose, shopId }: { onClose: () => void; shopId: string | null }) {
  const qc = useQueryClient();
  const [supplierId, setSupplierId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<any>('CASH');
  const [paidAmount, setPaidAmount] = useState<number | ''>('');
  const [discount, setDiscount] = useState<number | ''>('');
  const [notes, setNotes] = useState('');
  const [search, setSearch] = useState('');
  const [lines, setLines] = useState<DraftLine[]>([]);

  const { data: suppliersRes } = useQuery({
    queryKey: ['suppliers', 'for-purchase'],
    queryFn: () => suppliersApi.list({ limit: 200 }),
  });
  const suppliers = (suppliersRes as any)?.items ?? [];

  /* Stock report se product list — isi me category/lagat sab hai */
  const { data: stockReport } = useQuery({
    queryKey: ['electronics-stock-report', shopId],
    queryFn: () => electronicsAnalyticsApi.stock(shopId || undefined),
  });

  const picked = new Set(lines.map((l) => l.productId));
  const products = useMemo(() => {
    const q = search.toLowerCase().trim();
    let l = (stockReport?.products ?? []).filter((p) => !picked.has(p.productId));
    if (q) {
      l = l.filter((p) =>
        p.name.toLowerCase().includes(q) ||
        (p.sku ?? '').toLowerCase().includes(q) ||
        (p.brand ?? '').toLowerCase().includes(q));
    }
    return l.slice(0, 40);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stockReport, search, lines]);

  const subtotal = useMemo(
    () => lines.reduce((a, l) => a + l.quantity * l.costPrice, 0),
    [lines],
  );
  const total = Math.max(0, subtotal - Number(discount || 0));
  const paid = Number(paidAmount || 0);
  const due = Math.max(0, total - paid);

  const create = useMutation({
    mutationFn: () => purchasesApi.create({
      supplierId,
      paymentMethod,
      discount: Number(discount || 0) || undefined,
      paidAmount: paid,
      notes: notes || undefined,
      shopId: shopId || undefined,
      items: lines.map((l) => ({
        productId: l.productId,
        quantity: l.quantity,
        costPrice: l.costPrice,
      })),
    }),
    onSuccess: () => {
      toast.success('Kharidari darj ho gayi — stock barh gaya');
      qc.invalidateQueries({ queryKey: ['purchases'] });
      qc.invalidateQueries({ queryKey: ['purchases-summary'] });
      qc.invalidateQueries({ queryKey: ['electronics-stock-report'] });
      qc.invalidateQueries({ queryKey: ['electronics-low-stock'] });
      qc.invalidateQueries({ queryKey: ['electronics-pos-catalog'] });
      onClose();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Kharidari save nahi hui'),
  });

  const add = (p: { productId: string; name: string; unit: string; unitCost: number }) =>
    setLines((prev) => [...prev, {
      productId: p.productId, name: p.name, unit: p.unit,
      quantity: 1, costPrice: p.unitCost || 0,
    }]);

  const patch = (id: string, v: Partial<DraftLine>) =>
    setLines((prev) => prev.map((l) => (l.productId === id ? { ...l, ...v } : l)));

  const drop = (id: string) => setLines((prev) => prev.filter((l) => l.productId !== id));

  const noPrice = lines.some((l) => l.costPrice <= 0);
  const canSave = !!supplierId && lines.length > 0 && !noPrice && !create.isPending;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-3xl bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[94vh] flex flex-col">
        <div className="px-5 py-4 bg-gradient-to-r from-teal-600 to-emerald-700 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur">
              <Truck className="h-5 w-5" />
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider font-extrabold text-white/70">Nayi Kharidari</div>
              <h3 className="font-extrabold">Supplier Se Maal Aaya</h3>
            </div>
          </div>
          <button onClick={onClose} className="h-9 w-9 rounded-xl hover:bg-white/20 flex items-center justify-center transition">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Supplier */}
          <div>
            <Lbl>Supplier</Lbl>
            {suppliers.length === 0 ? (
              <div className="rounded-xl bg-amber-50 border-2 border-amber-200 p-3 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-xs font-semibold text-amber-900 flex-1">
                  Abhi koi supplier nahi hai. Pehle supplier add karein.
                </div>
                <Link to="/suppliers" className="text-xs font-extrabold text-amber-800 underline shrink-0">
                  Suppliers
                </Link>
              </div>
            ) : (
              <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)}
                className="h-11 w-full rounded-xl border-2 border-slate-200 bg-white px-3 text-sm font-bold focus:outline-none focus:border-teal-500 transition">
                <option value="">Supplier chunein</option>
                {suppliers.map((s: any) => (
                  <option key={s.id} value={s.id}>
                    {s.name}{s.outstandingDue > 0 ? ` — ${formatPKR(s.outstandingDue)} baqi` : ''}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Product picker */}
          <div>
            <Lbl>Kya Kya Aaya</Lbl>
            <div className="relative mb-2">
              <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Product ya SKU dhoondein..."
                className="h-11 w-full rounded-xl border-2 border-slate-200 pl-9 pr-3 text-sm font-bold focus:outline-none focus:border-teal-500 transition" />
            </div>
            <div className="rounded-xl border-2 border-slate-200 max-h-44 overflow-y-auto divide-y divide-slate-100">
              {products.length === 0 ? (
                <div className="p-6 text-center text-sm font-bold text-slate-500">
                  {search ? 'Kuch nahi mila' : 'Sab products daal diye'}
                </div>
              ) : products.map((p) => (
                <button key={p.productId} onClick={() => add(p)}
                  className="w-full px-3 py-2.5 flex items-center gap-3 text-left hover:bg-emerald-50 transition">
                  <div className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 text-base">
                    {p.categoryType ? (CATEGORY_META[p.categoryType as CategoryType]?.emoji ?? '📦') : '📦'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-extrabold text-slate-900 text-sm truncate">{p.name}</div>
                    <div className="text-[11px] font-bold text-slate-500">
                      Abhi {p.stock} {p.unit} · pichli lagat {formatPKR(p.unitCost)}
                    </div>
                  </div>
                  <Plus className="h-4 w-4 text-emerald-600 shrink-0" />
                </button>
              ))}
            </div>
          </div>

          {/* Lines */}
          {lines.length > 0 && (
            <div className="rounded-xl border-2 border-slate-200 divide-y divide-slate-100 overflow-hidden">
              {lines.map((l) => (
                <div key={l.productId} className="px-3 py-2.5 flex items-center gap-2 flex-wrap">
                  <div className="flex-1 min-w-[140px]">
                    <div className="font-extrabold text-slate-900 text-sm truncate">{l.name}</div>
                    <div className="text-[11px] font-bold text-slate-500 tabular-nums">
                      {formatPKR(l.quantity * l.costPrice)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[9px] uppercase font-extrabold text-slate-500 mb-0.5">Ginti</div>
                    <input type="number" min={1} value={l.quantity}
                      onChange={(e) => patch(l.productId, { quantity: Math.max(1, Number(e.target.value || 1)) })}
                      className="h-9 w-20 rounded-lg border-2 border-slate-200 px-2 text-sm font-extrabold tabular-nums text-center focus:outline-none focus:border-teal-500" />
                  </div>
                  <div>
                    <div className="text-[9px] uppercase font-extrabold text-slate-500 mb-0.5">Per unit rate</div>
                    <input type="number" min={0} value={l.costPrice || ''}
                      onChange={(e) => patch(l.productId, { costPrice: Number(e.target.value || 0) })}
                      placeholder="0"
                      className={`h-9 w-24 rounded-lg border-2 px-2 text-sm font-extrabold tabular-nums text-center focus:outline-none transition ${
                        l.costPrice <= 0 ? 'border-rose-300 focus:border-rose-500' : 'border-slate-200 focus:border-teal-500'
                      }`} />
                  </div>
                  <button onClick={() => drop(l.productId)}
                    className="h-9 w-9 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center shrink-0 transition">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {noPrice && (
            <div className="rounded-xl bg-rose-50 border-2 border-rose-200 p-3 flex items-center gap-2 text-sm font-semibold text-rose-900">
              <AlertTriangle className="h-4 w-4 shrink-0" /> Har cheez ka per-unit rate likhna zaroori hai
            </div>
          )}

          {/* Payment */}
          {lines.length > 0 && (
            <>
              <div>
                <Lbl>Paisa Kaise Diya</Lbl>
                <div className="flex gap-1.5 flex-wrap">
                  {PAY_OPTIONS.map((o) => (
                    <button key={o.v} onClick={() => setPaymentMethod(o.v)}
                      className={`h-9 px-3 rounded-lg text-xs font-extrabold inline-flex items-center gap-1.5 transition border-2 ${
                        paymentMethod === o.v ? 'bg-teal-600 text-white border-transparent shadow'
                          : 'bg-white border-slate-200 text-slate-600 hover:border-teal-300'
                      }`}>
                      <o.icon className="h-3.5 w-3.5" /> {o.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <Lbl>Discount <span className="text-slate-400 normal-case font-bold">(optional)</span></Lbl>
                  <input type="number" min={0} value={discount}
                    onChange={(e) => setDiscount(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="0"
                    className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-teal-500 transition" />
                </div>
                <div>
                  <Lbl>Kitna Ada Kiya</Lbl>
                  <input type="number" min={0} value={paidAmount}
                    onChange={(e) => setPaidAmount(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="0"
                    className="h-11 w-full rounded-xl border-2 border-emerald-300 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-emerald-600 transition" />
                  <button onClick={() => setPaidAmount(total)}
                    className="mt-1.5 text-[11px] font-extrabold text-emerald-700 hover:underline">
                    Poora ada kiya ({formatPKR(total)})
                  </button>
                </div>
              </div>

              <div className="rounded-2xl bg-slate-50 border-2 border-slate-200 p-3 space-y-1">
                <Row label="Subtotal" value={formatPKR(subtotal)} />
                {Number(discount || 0) > 0 && <Row label="Discount" value={`− ${formatPKR(Number(discount))}`} tone="rose" />}
                <Row label="Kul" value={formatPKR(total)} strong />
                <Row label="Ada kiya" value={formatPKR(paid)} tone="emerald" />
                <div className="pt-1.5 border-t-2 border-slate-200">
                  <Row label="Supplier ka baqi" value={due > 0 ? formatPKR(due) : 'Clear ✅'}
                    tone={due > 0 ? 'rose' : 'emerald'} strong />
                </div>
              </div>

              <div>
                <Lbl>Note <span className="text-slate-400 normal-case font-bold">(optional)</span></Lbl>
                <input value={notes} onChange={(e) => setNotes(e.target.value)}
                  placeholder="jaise: bill number 4471"
                  className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-teal-500 transition" />
              </div>

              <div className="rounded-xl bg-violet-50 border-2 border-violet-200 p-3 flex items-start gap-2">
                <Barcode className="h-4 w-4 text-violet-600 shrink-0 mt-0.5" />
                <div className="text-xs font-semibold text-violet-900">
                  Serial wali cheez khareedi hai to save karne ke baad us bill ko kholein —
                  wahin se saare serial numbers ek sath daal sakte hain.
                </div>
              </div>
            </>
          )}
        </div>

        <div className="px-5 py-3.5 border-t-2 border-slate-100 bg-slate-50 flex items-center justify-between gap-3 shrink-0 flex-wrap">
          <div className="text-xs font-bold text-slate-600">
            {lines.length > 0 && <>{lines.length} cheezein · <b className="text-slate-900">{formatPKR(total)}</b></>}
          </div>
          <div className="flex gap-2">
            <button onClick={onClose} className="h-11 px-4 rounded-xl bg-white border-2 border-slate-200 text-slate-700 text-sm font-extrabold hover:bg-slate-100 transition">
              Cancel
            </button>
            <Button onClick={() => create.mutate()} disabled={!canSave}
              className="bg-gradient-to-r from-teal-600 to-emerald-700 font-extrabold shadow-lg">
              {create.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Kharidari Darj Karein
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Lbl({ children }: any) {
  return <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 mb-1.5">{children}</label>;
}

function Row({ label, value, tone = 'slate', strong }: any) {
  const tones: Record<string, string> = {
    slate: 'text-slate-900', emerald: 'text-emerald-700', rose: 'text-rose-600',
  };
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs font-bold text-slate-600">{label}</span>
      <span className={`tabular-nums ${strong ? 'text-base font-extrabold' : 'text-sm font-bold'} ${tones[tone]}`}>
        {value}
      </span>
    </div>
  );
}
