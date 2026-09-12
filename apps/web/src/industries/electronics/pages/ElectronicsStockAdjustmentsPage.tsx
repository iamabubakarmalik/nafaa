// apps/web/src/industries/electronics/pages/ElectronicsStockAdjustmentsPage.tsx
import { useState, useMemo, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ClipboardCheck, Search, RefreshCw, FileSpreadsheet, Printer, X, Plus,
  GraduationCap, Keyboard, CheckCircle2, Sparkles, Barcode, Cpu, Package,
  TrendingDown, TrendingUp, AlertTriangle, Loader2, Wrench, Trash2,
  History, Wallet, ShieldAlert, Layers,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@core/ui/Button';
import { formatPKR } from '@core/lib/format';
import { useAuthStore, useShopParam } from '@core/stores/auth.store';
import { useCostHidden, PrivacyToggle } from '@core/ui/HiddenValue';
import { PrintStyles } from '@core/components/print/PrintStyles';
import {
  stockAdjustmentsApi, type AdjustmentType,
} from '@modules/inventory/stock-adjustments/api/stock-adjustments.api';
import { serialTrackingApi, type SerialWithProduct } from '../api/serial-tracking.api';
import { electronicsAnalyticsApi } from '../api/analytics.api';
import { CATEGORY_META, type CategoryType } from '../constants';

/* ═════════════════════════════════════════════════════════════
   NAFAA ELECTRONICS — STOCK DURUSTI (ADJUSTMENTS)
   ─────────────────────────────────────────────────────────────
   📦 Normal stock ki ginti theek karo (ginti me farq, toot phoot)
   🔖 Serial unit ko KHARAB ya GUM mark karo — us ka apna record
   📜 Har durusti ka poora hisab, kis ne kab ki
   ═════════════════════════════════════════════════════════════ */

type Tab = 'log' | 'serial';

const TYPE_META: Record<AdjustmentType, { label: string; chip: string; icon: any; sign: number }> = {
  ADJUSTMENT_IN:  { label: 'Barhaya',   chip: 'bg-emerald-100 text-emerald-700', icon: TrendingUp,   sign: 1 },
  ADJUSTMENT_OUT: { label: 'Ghataya',   chip: 'bg-amber-100 text-amber-700',     icon: TrendingDown, sign: -1 },
  DAMAGE:         { label: 'Toot Phoot',chip: 'bg-rose-100 text-rose-700',       icon: Wrench,       sign: -1 },
  LOSS:           { label: 'Gum Gaya',  chip: 'bg-slate-200 text-slate-700',     icon: Trash2,       sign: -1 },
};

const REASONS = [
  'Ginti me farq nikla',
  'Toot phoot / kharab ho gaya',
  'Chori ya gum ho gaya',
  'Supplier ne kam bheja',
  'Supplier ne zyada bheja',
  'Wapas kiya gaya',
  'Demo / display piece',
  'Purani entry ghalat thi',
];

export default function ElectronicsStockAdjustmentsPage() {
  const qc = useQueryClient();
  const hideCost = useCostHidden();
  const currentShopId = useShopParam();
  const tenantName = useAuthStore((s: any) => s.tenant?.name);

  const [tab, setTab] = useState<Tab>('log');
  const [search, setSearch] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [serialAction, setSerialAction] = useState<{ serial: SerialWithProduct; kind: 'defective' | 'return' } | null>(null);
  const [showTeacher, setShowTeacher] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  const { data: log = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['stock-adjustments'],
    queryFn: () => stockAdjustmentsApi.list(),
  });

  const { data: serials = [] } = useQuery({
    queryKey: ['electronics-serials-adjust', currentShopId],
    queryFn: () => serialTrackingApi.list({ shopId: currentShopId || undefined, status: 'IN_STOCK' }),
  });

  /* ─── Shortcuts ─── */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      const typing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
      if (e.key === 'Escape') {
        if (showShortcuts) return setShowShortcuts(false);
        if (showTeacher) return setShowTeacher(false);
        if (serialAction) return setSerialAction(null);
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
  }, [showTeacher, showShortcuts, showNew, serialAction]);

  const anyModal = showTeacher || showShortcuts || showNew || !!serialAction;
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = anyModal ? 'hidden' : prev;
    return () => { document.body.style.overflow = prev; };
  }, [anyModal]);

  const filteredLog = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return log;
    return log.filter((a) =>
      a.product.name.toLowerCase().includes(q) ||
      (a.product.sku ?? '').toLowerCase().includes(q) ||
      a.reason.toLowerCase().includes(q),
    );
  }, [log, search]);

  const filteredSerials = useMemo(() => {
    const q = search.toLowerCase().trim();
    let l = serials as SerialWithProduct[];
    if (q) {
      l = l.filter((s) =>
        s.serialNumber.toLowerCase().includes(q) ||
        (s.imei ?? '').includes(q) ||
        (s.product?.name ?? '').toLowerCase().includes(q),
      );
    }
    return l.slice(0, 200);
  }, [serials, search]);

  const stats = useMemo(() => {
    let inQty = 0, outQty = 0, damage = 0, loss = 0;
    for (const a of log) {
      const m = TYPE_META[a.type];
      if (!m) continue;
      if (a.type === 'ADJUSTMENT_IN') inQty += a.quantity;
      else if (a.type === 'ADJUSTMENT_OUT') outQty += a.quantity;
      else if (a.type === 'DAMAGE') damage += a.quantity;
      else if (a.type === 'LOSS') loss += a.quantity;
    }
    return { inQty, outQty, damage, loss, total: log.length };
  }, [log]);

  const exportCsv = () => {
    const out: string[][] = [
      [`${tenantName ?? 'Nafaa'} — Electronics Stock Durusti`],
      [new Date().toLocaleString('en-PK')],
      [],
      ['KHULASA'],
      ['Kul durustiyan', String(stats.total)],
      ['Barhaya', String(stats.inQty)],
      ['Ghataya', String(stats.outQty)],
      ['Toot phoot', String(stats.damage)],
      ['Gum gaya', String(stats.loss)],
      [],
      ['Tareekh', 'Product', 'SKU', 'Kisam', 'Ginti', 'Wajah', 'Note'],
      ...filteredLog.map((a) => [
        new Date(a.createdAt).toLocaleString('en-PK'),
        a.product.name, a.product.sku ?? '',
        TYPE_META[a.type]?.label ?? a.type,
        `${TYPE_META[a.type]?.sign === 1 ? '+' : '−'}${a.quantity} ${a.product.unit}`,
        a.reason, (a as any).note ?? '',
      ]),
    ];
    const csv = out.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `electronics-adjustments-${new Date().toISOString().slice(0, 10)}.csv`;
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
      <PrintStyles orientation="landscape" title="Electronics Stock Durusti" subtitle="Ginti aur serial units ka record" />
      {showTeacher && <AdjustTeacher onClose={() => setShowTeacher(false)} />}
      {showShortcuts && <ShortcutsModal onClose={() => setShowShortcuts(false)} />}
      {showNew && <NewAdjustmentModal onClose={() => setShowNew(false)} shopId={currentShopId ?? null} />}
      {serialAction && (
        <SerialActionModal
          serial={serialAction.serial}
          kind={serialAction.kind}
          onClose={() => setSerialAction(null)}
          onDone={() => {
            qc.invalidateQueries({ queryKey: ['electronics-serials-adjust'] });
            qc.invalidateQueries({ queryKey: ['electronics-stock-report'] });
            setSerialAction(null);
          }}
        />
      )}

      {/* ═══ HERO ═══ */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-orange-900 to-amber-600 text-white p-6 shadow-2xl print:hidden">
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-amber-400/25 blur-3xl animate-pulse" />
        <div className="relative">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="min-w-0">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
                <ClipboardCheck className="h-3.5 w-3.5 text-amber-300" /> Stock Durusti
              </div>
              <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">📋 Ginti Theek Karein</h1>
              <p className="mt-2 text-sm text-white/85 font-semibold">
                Stock me farq, toot phoot ya gum shuda maal — sab ka record yahin
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
              <button onClick={() => setShowNew(true)} title="Nayi durusti (N)"
                className="h-11 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-extrabold inline-flex items-center gap-1.5 shadow-lg transition">
                <Plus className="h-4 w-4" /> Nayi Durusti
              </button>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 lg:grid-cols-4 gap-3">
            <HeroStat label="Barhaya" value={String(stats.inQty)} icon={TrendingUp} sub="pieces" />
            <HeroStat label="Ghataya" value={String(stats.outQty)} icon={TrendingDown} sub="pieces" />
            <HeroStat label="Toot Phoot" value={String(stats.damage)} icon={Wrench} sub="pieces" highlight={stats.damage > 0} />
            <HeroStat label="Gum Gaya" value={String(stats.loss)} icon={Trash2} sub="pieces" highlight={stats.loss > 0} />
          </div>
        </div>
      </section>

      {/* ═══ TABS ═══ */}
      <div className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm p-4 flex items-center justify-between gap-3 flex-wrap print:hidden">
        <div className="flex gap-1.5 flex-wrap">
          {([
            { v: 'log', label: 'Durusti Ka Record', icon: History, n: log.length },
            { v: 'serial', label: 'Serial Units', icon: Barcode, n: (serials as any[]).length },
          ] as { v: Tab; label: string; icon: any; n: number }[]).map((k) => (
            <button key={k.v} onClick={() => setTab(k.v)}
              className={`h-9 px-3 rounded-lg text-xs font-extrabold inline-flex items-center gap-1.5 transition border-2 ${
                tab === k.v ? 'bg-gradient-to-r from-orange-600 to-amber-700 text-white border-transparent shadow'
                  : 'bg-white border-slate-200 text-slate-600 hover:border-orange-300'
              }`}>
              <k.icon className="h-3.5 w-3.5" /> {k.label}
              <span className={`px-1.5 rounded-full text-[10px] tabular-nums ${tab === k.v ? 'bg-black/20' : 'bg-slate-100'}`}>{k.n}</span>
            </button>
          ))}
        </div>
        <div className="relative">
          <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input ref={searchRef} value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder={tab === 'log' ? 'Product ya wajah... (/)' : 'Serial, IMEI, product... (/)'}
            className="h-10 w-full sm:w-72 rounded-xl border-2 border-slate-200 bg-white pl-9 pr-3 text-sm font-bold text-slate-900 focus:outline-none focus:border-orange-500 transition" />
        </div>
      </div>

      {/* ═══ LOG ═══ */}
      {tab === 'log' && (
        filteredLog.length === 0 ? (
          <div className="rounded-3xl bg-white border-2 border-slate-200 p-12 text-center shadow-sm">
            <ClipboardCheck className="h-12 w-12 text-slate-300 mx-auto mb-3" />
            <h3 className="font-extrabold text-slate-900 text-lg">
              {search ? 'Kuch nahi mila' : 'Abhi tak koi durusti nahi hui'}
            </h3>
            <p className="text-sm font-semibold text-slate-500 mt-1.5 max-w-md mx-auto">
              Stock ki ginti asal se alag ho, ya kuch toot jaye — to yahan se theek karein.
              Har durusti ka record rehta hai.
            </p>
            <button onClick={() => setShowNew(true)}
              className="mt-4 inline-flex items-center gap-1.5 h-11 px-5 rounded-xl bg-gradient-to-r from-orange-600 to-amber-700 text-white text-sm font-extrabold shadow-lg transition">
              <Plus className="h-4 w-4" /> Nayi Durusti
            </button>
          </div>
        ) : (
          <div className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm overflow-hidden divide-y divide-slate-100">
            {filteredLog.map((a) => {
              const m = TYPE_META[a.type] ?? TYPE_META.ADJUSTMENT_OUT;
              return (
                <div key={a.id} className="px-4 py-3 flex items-center gap-3">
                  <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${m.chip}`}>
                    <m.icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-extrabold text-slate-900 text-sm truncate">{a.product.name}</span>
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold ${m.chip}`}>{m.label}</span>
                    </div>
                    <div className="mt-0.5 text-[11px] font-bold text-slate-500 truncate">
                      {a.reason}
                      {(a as any).note && <span className="italic"> · {(a as any).note}</span>}
                    </div>
                    <div className="text-[10px] font-bold text-slate-400 mt-0.5">
                      {new Date(a.createdAt).toLocaleString('en-PK')}
                      {(a as any).createdBy?.fullName && ` · ${(a as any).createdBy.fullName}`}
                    </div>
                  </div>
                  <div className={`text-base font-extrabold tabular-nums shrink-0 ${
                    m.sign === 1 ? 'text-emerald-600' : 'text-rose-600'
                  }`}>
                    {m.sign === 1 ? '+' : '−'}{a.quantity}
                    <span className="text-[10px] font-bold text-slate-400 ml-1">{a.product.unit}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {/* ═══ SERIALS ═══ */}
      {tab === 'serial' && (
        <>
          <div className="rounded-2xl bg-violet-50 border-2 border-violet-200 p-4 flex items-start gap-3 print:hidden">
            <Barcode className="h-5 w-5 text-violet-600 shrink-0 mt-0.5" />
            <div className="text-sm font-semibold text-violet-900">
              <b>Serial units ki durusti alag hoti hai.</b> Inki ginti nahi badalti — poora unit
              hi kharab ya gum hota hai. Neeche se unit chun kar uska sahi status laga dein;
              wo foran stock se nikal jayega aur stock report bhi theek ho jayegi.
            </div>
          </div>

          {filteredSerials.length === 0 ? (
            <div className="rounded-3xl bg-white border-2 border-slate-200 p-12 text-center shadow-sm">
              <Barcode className="h-12 w-12 text-slate-300 mx-auto mb-3" />
              <h3 className="font-extrabold text-slate-900 text-lg">
                {search ? 'Kuch nahi mila' : 'Is shop me koi serial unit stock me nahi'}
              </h3>
            </div>
          ) : (
            <div className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm overflow-hidden divide-y divide-slate-100">
              {filteredSerials.map((s) => (
                <div key={s.id} className="px-4 py-3 flex items-center gap-3 hover:bg-slate-50 transition">
                  <div className="h-10 w-10 rounded-xl bg-violet-100 text-violet-700 flex items-center justify-center shrink-0">
                    <Barcode className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-extrabold text-slate-900 text-sm truncate">
                      {s.product?.name ?? 'Serial unit'}
                    </div>
                    <div className="text-[11px] font-bold text-slate-500 font-mono truncate">
                      {s.serialNumber}{s.imei ? ` · IMEI ${s.imei}` : ''}
                    </div>
                  </div>
                  {s.purchasePrice != null && (
                    <div className="text-right shrink-0 hidden sm:block">
                      <div className="text-sm font-extrabold text-slate-900 tabular-nums">
                        {hideCost ? '•••' : formatPKR(s.purchasePrice)}
                      </div>
                      <div className="text-[10px] font-bold text-slate-400">lagat</div>
                    </div>
                  )}
                  <div className="flex gap-1.5 shrink-0 print:hidden">
                    <button onClick={() => setSerialAction({ serial: s, kind: 'defective' })}
                      className="h-9 px-2.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-extrabold inline-flex items-center gap-1 transition">
                      <Wrench className="h-3.5 w-3.5" /> Kharab
                    </button>
                    <button onClick={() => setSerialAction({ serial: s, kind: 'return' })}
                      className="h-9 px-2.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 text-xs font-extrabold inline-flex items-center gap-1 transition">
                      <TrendingDown className="h-3.5 w-3.5" /> Wapas
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════
   NAYI DURUSTI — normal stock
   ═════════════════════════════════════════════════════════════ */

function NewAdjustmentModal({ onClose, shopId }: { onClose: () => void; shopId: string | null }) {
  const qc = useQueryClient();
  const [productId, setProductId] = useState('');
  const [search, setSearch] = useState('');
  const [type, setType] = useState<AdjustmentType>('ADJUSTMENT_OUT');
  const [quantity, setQuantity] = useState<number | ''>('');
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');

  const { data: stockReport } = useQuery({
    queryKey: ['electronics-stock-report', shopId],
    queryFn: () => electronicsAnalyticsApi.stock(shopId || undefined),
  });

  const products = useMemo(() => {
    const q = search.toLowerCase().trim();
    let l = stockReport?.products ?? [];
    if (q) l = l.filter((p) => p.name.toLowerCase().includes(q) || (p.sku ?? '').toLowerCase().includes(q));
    return l.slice(0, 40);
  }, [stockReport, search]);

  const picked = (stockReport?.products ?? []).find((p) => p.productId === productId);

  const mutation = useMutation({
    mutationFn: () => stockAdjustmentsApi.create({
      productId, type, quantity: Number(quantity), reason,
      note: note || undefined,
      // Shop bheji na jaye to sirf global ginti badalti hai aur
      // electronics ki stock report (jo ShopStock parhti hai) purani reh jati hai
      shopId: shopId || undefined,
    }),
    onSuccess: () => {
      toast.success('Stock theek ho gaya');
      qc.invalidateQueries({ queryKey: ['stock-adjustments'] });
      qc.invalidateQueries({ queryKey: ['electronics-stock-report'] });
      qc.invalidateQueries({ queryKey: ['electronics-low-stock'] });
      onClose();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Durusti fail hui'),
  });

  const qty = Number(quantity || 0);
  const sign = TYPE_META[type].sign;
  const after = picked ? picked.stock + sign * qty : null;
  const tooMuch = after != null && after < 0;
  const valid = !!productId && qty > 0 && !!reason && !tooMuch && !mutation.isPending;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-2xl bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[94vh] flex flex-col">
        <div className="px-5 py-4 bg-gradient-to-r from-orange-600 to-amber-700 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur">
              <ClipboardCheck className="h-5 w-5" />
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider font-extrabold text-white/70">Nayi Durusti</div>
              <h3 className="font-extrabold">Stock Ki Ginti Theek Karein</h3>
            </div>
          </div>
          <button onClick={onClose} className="h-9 w-9 rounded-xl hover:bg-white/20 flex items-center justify-center transition">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Product */}
          <div>
            <Lbl>Kaunsi Cheez?</Lbl>
            {picked ? (
              <div className="rounded-xl border-2 border-orange-300 bg-orange-50 p-3 flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-white flex items-center justify-center shrink-0 text-xl">
                  {picked.categoryType ? (CATEGORY_META[picked.categoryType as CategoryType]?.emoji ?? '📦') : '📦'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-extrabold text-slate-900 text-sm truncate">{picked.name}</div>
                  <div className="text-[11px] font-bold text-slate-600">
                    Abhi {picked.stock} {picked.unit} maujood
                  </div>
                </div>
                <button onClick={() => setProductId('')}
                  className="h-9 w-9 rounded-lg bg-white hover:bg-slate-100 text-slate-500 flex items-center justify-center shrink-0 transition">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <>
                <div className="relative mb-2">
                  <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input value={search} onChange={(e) => setSearch(e.target.value)} autoFocus
                    placeholder="Product ya SKU dhoondein..."
                    className="h-11 w-full rounded-xl border-2 border-slate-200 pl-9 pr-3 text-sm font-bold focus:outline-none focus:border-orange-500 transition" />
                </div>
                <div className="rounded-xl border-2 border-slate-200 max-h-52 overflow-y-auto divide-y divide-slate-100">
                  {products.length === 0 ? (
                    <div className="p-6 text-center text-sm font-bold text-slate-500">Kuch nahi mila</div>
                  ) : products.map((p) => (
                    <button key={p.productId} onClick={() => setProductId(p.productId)}
                      className="w-full px-3 py-2.5 flex items-center gap-3 text-left hover:bg-orange-50 transition">
                      <div className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 text-base">
                        {p.categoryType ? (CATEGORY_META[p.categoryType as CategoryType]?.emoji ?? '📦') : '📦'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-extrabold text-slate-900 text-sm truncate">{p.name}</div>
                        <div className="text-[11px] font-bold text-slate-500">{p.stock} {p.unit} maujood</div>
                      </div>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Type */}
          <div>
            <Lbl>Kya Hua?</Lbl>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(TYPE_META) as AdjustmentType[]).map((t) => {
                const m = TYPE_META[t];
                const a = type === t;
                return (
                  <button key={t} onClick={() => setType(t)}
                    className={`px-3 py-2.5 rounded-xl border-2 text-left transition ${
                      a ? 'border-orange-500 bg-orange-50' : 'border-slate-200 bg-white hover:border-orange-300'
                    }`}>
                    <div className="flex items-center gap-1.5">
                      <m.icon className={`h-4 w-4 ${a ? 'text-orange-600' : 'text-slate-500'}`} />
                      <span className="font-extrabold text-sm text-slate-900">{m.label}</span>
                    </div>
                    <div className="text-[10px] font-bold text-slate-500 mt-0.5">
                      Stock {m.sign === 1 ? 'barhega' : 'kam hoga'}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Qty */}
          <div>
            <Lbl>Kitni Ginti?</Lbl>
            <input type="number" min={1} value={quantity}
              onChange={(e) => setQuantity(e.target.value === '' ? '' : Number(e.target.value))}
              placeholder="0"
              className="h-16 w-full rounded-2xl border-2 border-orange-400 bg-white px-4 text-center text-3xl font-extrabold tabular-nums text-orange-900 focus:outline-none focus:border-orange-600 focus:ring-4 focus:ring-orange-200 transition" />
            {picked && qty > 0 && (
              <div className={`mt-2 rounded-xl border-2 p-2.5 text-sm font-bold flex items-center justify-between ${
                tooMuch ? 'bg-rose-50 border-rose-300 text-rose-900' : 'bg-slate-50 border-slate-200 text-slate-700'
              }`}>
                <span>{tooMuch ? 'Itna stock hai hi nahi' : 'Durusti ke baad stock'}</span>
                <span className="font-extrabold tabular-nums">
                  {picked.stock} → {after} {picked.unit}
                </span>
              </div>
            )}
          </div>

          {/* Reason */}
          <div>
            <Lbl>Wajah</Lbl>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {REASONS.map((r) => (
                <button key={r} onClick={() => setReason(r)}
                  className={`px-2.5 py-1.5 rounded-lg border-2 text-[11px] font-extrabold transition ${
                    reason === r ? 'border-orange-500 bg-orange-500 text-white' : 'border-slate-200 bg-white text-slate-700 hover:border-orange-300'
                  }`}>
                  {r}
                </button>
              ))}
            </div>
            <input value={reason} onChange={(e) => setReason(e.target.value)}
              placeholder="Ya apni wajah likhein"
              className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-orange-500 transition" />
          </div>

          <div>
            <Lbl>Note <span className="text-slate-400 normal-case font-bold">(optional)</span></Lbl>
            <input value={note} onChange={(e) => setNote(e.target.value)}
              placeholder="koi aur tafseel"
              className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-orange-500 transition" />
          </div>
        </div>

        <div className="px-5 py-3.5 border-t-2 border-slate-100 bg-slate-50 flex gap-2 justify-end shrink-0">
          <button onClick={onClose} className="h-11 px-4 rounded-xl bg-white border-2 border-slate-200 text-slate-700 text-sm font-extrabold hover:bg-slate-100 transition">
            Cancel
          </button>
          <Button onClick={() => mutation.mutate()} disabled={!valid}
            className="bg-gradient-to-r from-orange-600 to-amber-700 font-extrabold shadow-lg">
            {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            Durusti Karein
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════
   SERIAL ACTION — kharab / wapas
   ═════════════════════════════════════════════════════════════ */

function SerialActionModal({ serial, kind, onClose, onDone }: {
  serial: SerialWithProduct; kind: 'defective' | 'return';
  onClose: () => void; onDone: () => void;
}) {
  const [reason, setReason] = useState('');

  const PRESETS = kind === 'defective'
    ? ['Chalu hi nahi hota', 'Screen kharab', 'Battery kharab', 'Pani laga hua', 'Toot gaya', 'Company ko wapas bhejna hai']
    : ['Customer ne wapas kiya', 'Supplier ko wapas', 'Ghalat unit nikal gaya tha', 'Demo se wapas'];

  const mutation = useMutation({
    mutationFn: () => (kind === 'defective'
      ? serialTrackingApi.markDefective(serial.id, reason)
      : serialTrackingApi.returnSerial(serial.id, reason)),
    onSuccess: () => {
      toast.success(kind === 'defective' ? 'Unit kharab mark ho gaya' : 'Unit wapas mark ho gaya');
      onDone();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Fail hua'),
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden">
        <div className={`px-5 py-4 text-white flex items-center justify-between ${
          kind === 'defective' ? 'bg-gradient-to-r from-rose-600 to-red-700' : 'bg-gradient-to-r from-amber-600 to-orange-700'
        }`}>
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur shrink-0">
              {kind === 'defective' ? <Wrench className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
            </div>
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-wider font-extrabold text-white/70">
                {kind === 'defective' ? 'Kharab Mark Karein' : 'Wapas Mark Karein'}
              </div>
              <h3 className="font-extrabold truncate">{serial.product?.name ?? 'Serial unit'}</h3>
            </div>
          </div>
          <button onClick={onClose} className="h-9 w-9 rounded-xl hover:bg-white/20 flex items-center justify-center transition shrink-0">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="rounded-xl bg-violet-50 border-2 border-violet-200 p-3">
            <div className="text-[10px] uppercase font-extrabold text-violet-700 tracking-wider">Serial</div>
            <div className="font-mono font-extrabold text-violet-900">{serial.serialNumber}</div>
            {serial.imei && <div className="text-[11px] font-bold text-violet-700 font-mono">IMEI {serial.imei}</div>}
          </div>

          <div className="rounded-xl bg-amber-50 border-2 border-amber-200 p-3 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs font-semibold text-amber-900">
              Ye unit stock se nikal jayega — POS par bikne ke liye nazar nahi aayega.
              Stock report bhi isi hisab se badal jayegi.
            </div>
          </div>

          <div>
            <Lbl>Wajah</Lbl>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {PRESETS.map((r) => (
                <button key={r} onClick={() => setReason(r)}
                  className={`px-2.5 py-1.5 rounded-lg border-2 text-[11px] font-extrabold transition ${
                    reason === r ? 'border-rose-500 bg-rose-500 text-white' : 'border-slate-200 bg-white text-slate-700 hover:border-rose-300'
                  }`}>
                  {r}
                </button>
              ))}
            </div>
            <input value={reason} onChange={(e) => setReason(e.target.value)} autoFocus
              placeholder="Ya apni wajah likhein"
              className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-rose-500 transition" />
          </div>
        </div>

        <div className="px-5 py-3.5 border-t-2 border-slate-100 bg-slate-50 flex gap-2 justify-end">
          <button onClick={onClose} className="h-11 px-4 rounded-xl bg-white border-2 border-slate-200 text-slate-700 text-sm font-extrabold hover:bg-slate-100 transition">
            Cancel
          </button>
          <Button onClick={() => mutation.mutate()} disabled={!reason.trim() || mutation.isPending}
            className={kind === 'defective'
              ? 'bg-gradient-to-r from-rose-600 to-red-700 font-extrabold shadow-lg'
              : 'bg-gradient-to-r from-amber-600 to-orange-700 font-extrabold shadow-lg'}>
            {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            Confirm
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
        <Icon className="h-3.5 w-3.5" /> {label}
      </div>
      <div className="mt-1 text-2xl font-extrabold tabular-nums">{value}</div>
      {sub && <div className="mt-0.5 text-[11px] font-bold text-white/70">{sub}</div>}
    </div>
  );
}

function AdjustTeacher({ onClose }: { onClose: () => void }) {
  const steps = [
    {
      icon: ClipboardCheck, title: 'Durusti kab karni hai',
      body: 'Jab computer ki ginti aur dukan ki asal ginti me farq ho. Jaise: system 10 cable dikha raha hai lekin dukan me 8 hain — to 2 ghata dein aur wajah likh dein.',
      tips: ['Har durusti ka record rehta hai — kisne kab ki'],
    },
    {
      icon: Wrench, title: 'Toot phoot aur gum shuda maal',
      body: 'Cheez toot jaye to "Toot Phoot", chori ho ya kahin kho jaye to "Gum Gaya" chunein. Ye alag isliye hain ke mahine ke akhir me pata chal sake ke kitna nuqsan kis wajah se hua.',
      tips: ['Reports me ye alag alag nazar aata hai'],
    },
    {
      icon: Barcode, title: 'Serial units ka tareeqa alag',
      body: 'Laptop, camera, drone ki ginti nahi badalti — poora unit hi kharab ya wapas hota hai. Serial Units tab se wo exact unit chun kar "Kharab" ya "Wapas" laga dein.',
      tips: ['Unit foran stock se nikal jata hai', 'POS par wo phir nazar nahi aata'],
    },
    {
      icon: Wallet, title: 'Record kyun zaroori hai',
      body: 'Bina record ke stock ki ginti badal dena sab se bara masla banta hai — baad me pata hi nahi chalta ke maal gaya kahan. Yahan har durusti wajah ke sath mehfooz rehti hai.',
      tips: ['CSV me poora record Excel ke liye', 'N dabao to nayi durusti'],
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
              <h3 className="font-extrabold text-slate-900">Stock Durusti</h3>
            </div>
          </div>
          <button onClick={onClose} className="h-9 w-9 rounded-xl hover:bg-white flex items-center justify-center transition">
            <X className="h-4 w-4 text-slate-600" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-3.5">
          {steps.map((st, i) => (
            <div key={i} className="rounded-xl border-2 border-slate-200 bg-slate-50 p-3.5 flex items-start gap-3">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-orange-600 to-amber-700 text-white flex items-center justify-center shrink-0 shadow-md">
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
    ['N', 'Nayi durusti'], ['/', 'Search par jao'], ['G', 'Guide kholo'],
    ['R', 'Refresh'], ['P', 'Print'], ['?', 'Ye list'], ['Esc', 'Band karo'],
  ];
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border-2 border-slate-200">
        <div className="px-5 py-4 border-b-2 border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-orange-100 text-orange-700 flex items-center justify-center">
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
