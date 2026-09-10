// apps/web/src/industries/electronics/pages/ElectronicsTransfersPage.tsx
import { useState, useMemo, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeftRight, Store, Plus, Search, RefreshCw, FileSpreadsheet, Printer,
  Barcode, Cpu, Package, Truck, CheckCircle2, XCircle, Clock, X,
  GraduationCap, Keyboard, Sparkles, ChevronDown, ChevronRight, Trash2,
  ShieldCheck, ShieldAlert, AlertTriangle, ArrowRight, Hash, Loader2, Boxes,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@core/ui/Button';
import { formatPKR } from '@core/lib/format';
import { useAuthStore } from '@core/stores/auth.store';
import { PrintStyles } from '@core/components/print/PrintStyles';
import { transfersApi, type StockTransfer, type CreateTransferItemPayload } from '@modules/inventory/transfers/api/transfers.api';
import { shopsApi } from '@modules/organization/shops/api/shops.api';
import { serialTrackingApi, type SerialWithProduct } from '../api/serial-tracking.api';
import { electronicsAnalyticsApi } from '../api/analytics.api';
import { CATEGORY_META, type CategoryType } from '../constants';

/* ═════════════════════════════════════════════════════════════
   NAFAA ELECTRONICS — SHOP TO SHOP TRANSFER
   ─────────────────────────────────────────────────────────────
   🔖 Serial wale units bhi bheje ja sakte hain — laptop, camera,
      drone. Unit apni shop badalta hai, warranty sath jati hai.
   📦 Normal stock (cable, cover) ginti ke hisab se
   🚚 Bheja → Raste me → Mila — poora safar nazar aata hai
   ═════════════════════════════════════════════════════════════ */

type Tab = 'all' | 'transit' | 'received' | 'cancelled';

const STATUS_META: Record<string, { label: string; chip: string; icon: any }> = {
  PENDING:   { label: 'Intezaar',  chip: 'bg-slate-100 text-slate-700',    icon: Clock },
  IN_TRANSIT:{ label: 'Raste Me', chip: 'bg-amber-100 text-amber-700',    icon: Truck },
  RECEIVED:  { label: 'Mil Gaya', chip: 'bg-emerald-100 text-emerald-700',icon: CheckCircle2 },
  CANCELLED: { label: 'Cancel',   chip: 'bg-rose-100 text-rose-700',      icon: XCircle },
};

const warrantyLeft = (iso?: string | null) =>
  iso ? Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000) : null;

export default function ElectronicsTransfersPage() {
  const qc = useQueryClient();
  const currentShopId = useAuthStore((s) => s.currentShopId);
  const tenantName = useAuthStore((s: any) => s.tenant?.name);

  const [tab, setTab] = useState<Tab>('all');
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [showNew, setShowNew] = useState(false);
  const [showTeacher, setShowTeacher] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  const { data: transfers = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['transfers'],
    queryFn: () => transfersApi.list(),
  });

  const receiveMutation = useMutation({
    mutationFn: (id: string) => transfersApi.receive(id),
    onSuccess: () => {
      toast.success('Maal mil gaya — stock nayi shop me aa gaya');
      qc.invalidateQueries({ queryKey: ['transfers'] });
      qc.invalidateQueries({ queryKey: ['electronics-stock-report'] });
      qc.invalidateQueries({ queryKey: ['electronics-low-stock'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Receive fail hua'),
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => transfersApi.cancel(id),
    onSuccess: () => {
      toast.success('Transfer cancel — maal wapas apni shop me');
      qc.invalidateQueries({ queryKey: ['transfers'] });
      qc.invalidateQueries({ queryKey: ['electronics-stock-report'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Cancel fail hua'),
  });

  /* ─── Shortcuts ─── */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      const typing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
      if (e.key === 'Escape') {
        if (showShortcuts) return setShowShortcuts(false);
        if (showTeacher) return setShowTeacher(false);
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
  }, [showTeacher, showShortcuts, showNew]);

  const anyModal = showTeacher || showShortcuts || showNew;
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

  const counts = useMemo(() => ({
    all: transfers.length,
    transit: transfers.filter((t) => t.status === 'IN_TRANSIT' || t.status === 'PENDING').length,
    received: transfers.filter((t) => t.status === 'RECEIVED').length,
    cancelled: transfers.filter((t) => t.status === 'CANCELLED').length,
  }), [transfers]);

  const list = useMemo(() => {
    let l = transfers;
    if (tab === 'transit') l = l.filter((t) => t.status === 'IN_TRANSIT' || t.status === 'PENDING');
    if (tab === 'received') l = l.filter((t) => t.status === 'RECEIVED');
    if (tab === 'cancelled') l = l.filter((t) => t.status === 'CANCELLED');
    const q = search.toLowerCase().trim();
    if (q) {
      l = l.filter((t) =>
        t.transferNumber.toLowerCase().includes(q) ||
        t.fromShop.name.toLowerCase().includes(q) ||
        t.toShop.name.toLowerCase().includes(q) ||
        t.items.some((it) =>
          (it.product?.name ?? '').toLowerCase().includes(q) ||
          (it.serial?.serialNumber ?? '').toLowerCase().includes(q) ||
          (it.serial?.imei ?? '').includes(q),
        ),
      );
    }
    return l;
  }, [transfers, tab, search]);

  const stats = useMemo(() => {
    let serialUnits = 0, normalUnits = 0, inTransit = 0;
    for (const t of transfers) {
      for (const it of t.items) {
        if (it.serialId) serialUnits++;
        else normalUnits += it.quantity ?? 0;
      }
      if (t.status === 'IN_TRANSIT' || t.status === 'PENDING') inTransit++;
    }
    return { serialUnits, normalUnits, inTransit };
  }, [transfers]);

  const exportCsv = () => {
    const out: string[][] = [
      [`${tenantName ?? 'Nafaa'} — Electronics Transfers`],
      [new Date().toLocaleString('en-PK')],
      [],
      ['Transfer #', 'Status', 'Kahan se', 'Kahan', 'Tareekh', 'Item', 'Serial/IMEI', 'Ginti'],
      ...list.flatMap((t) =>
        t.items.map((it) => [
          t.transferNumber,
          STATUS_META[t.status]?.label ?? t.status,
          t.fromShop.name,
          t.toShop.name,
          new Date(t.transferredAt ?? t.createdAt).toLocaleString('en-PK'),
          it.product?.name ?? '—',
          it.serial ? `${it.serial.serialNumber}${it.serial.imei ? ` / ${it.serial.imei}` : ''}` : '',
          String(it.quantity),
        ]),
      ),
    ];
    const csv = out.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `electronics-transfers-${new Date().toISOString().slice(0, 10)}.csv`;
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
      <PrintStyles orientation="landscape" title="Electronics Transfers" subtitle="Shop se shop maal ka safar" />
      {showTeacher && <TransfersTeacher onClose={() => setShowTeacher(false)} />}
      {showShortcuts && <ShortcutsModal onClose={() => setShowShortcuts(false)} />}
      {showNew && <NewTransferModal onClose={() => setShowNew(false)} currentShopId={currentShopId} />}

      {/* ═══ HERO ═══ */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-violet-900 to-fuchsia-700 text-white p-6 shadow-2xl print:hidden">
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-fuchsia-400/25 blur-3xl animate-pulse" />
        <div className="relative">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="min-w-0">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
                <ArrowLeftRight className="h-3.5 w-3.5 text-amber-300" /> Transfers
              </div>
              <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">🚚 Ek Dukan Se Dusri</h1>
              <p className="mt-2 text-sm text-white/85 font-semibold">
                Serial wale units bhi bhejein — laptop, camera, drone. Warranty sath jati hai.
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
              <button onClick={() => setShowNew(true)} title="Naya transfer (N)"
                className="h-11 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-extrabold inline-flex items-center gap-1.5 shadow-lg transition">
                <Plus className="h-4 w-4" /> Naya Transfer
              </button>
            </div>
          </div>

          <div className="mt-5 grid sm:grid-cols-3 gap-3">
            <HeroStat label="Raste Me" value={String(stats.inTransit)} sub="abhi safar me" icon={Truck} highlight={stats.inTransit > 0} />
            <HeroStat label="Serial Units Bheje" value={String(stats.serialUnits)} sub="ab tak" icon={Barcode} />
            <HeroStat label="Normal Stock" value={String(stats.normalUnits)} sub="pieces" icon={Cpu} />
          </div>
        </div>
      </section>

      {/* ═══ FILTERS ═══ */}
      <div className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm p-4 flex items-center justify-between gap-3 flex-wrap print:hidden">
        <div className="flex gap-1.5 flex-wrap">
          {([
            { v: 'all', label: 'Sab', icon: Boxes, n: counts.all },
            { v: 'transit', label: 'Raste Me', icon: Truck, n: counts.transit },
            { v: 'received', label: 'Mil Gaye', icon: CheckCircle2, n: counts.received },
            { v: 'cancelled', label: 'Cancel', icon: XCircle, n: counts.cancelled },
          ] as { v: Tab; label: string; icon: any; n: number }[]).map((k) => (
            <button key={k.v} onClick={() => setTab(k.v)}
              className={`h-9 px-3 rounded-lg text-xs font-extrabold inline-flex items-center gap-1.5 transition border-2 ${
                tab === k.v ? 'bg-gradient-to-r from-violet-600 to-fuchsia-700 text-white border-transparent shadow'
                  : 'bg-white border-slate-200 text-slate-600 hover:border-violet-300'
              }`}>
              <k.icon className="h-3.5 w-3.5" /> {k.label}
              <span className={`px-1.5 rounded-full text-[10px] tabular-nums ${tab === k.v ? 'bg-black/20' : 'bg-slate-100'}`}>{k.n}</span>
            </button>
          ))}
        </div>
        <div className="relative">
          <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input ref={searchRef} value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Transfer #, shop, serial... (/)"
            className="h-10 w-full sm:w-72 rounded-xl border-2 border-slate-200 bg-white pl-9 pr-3 text-sm font-bold text-slate-900 focus:outline-none focus:border-violet-500 transition" />
        </div>
      </div>

      {/* ═══ LIST ═══ */}
      {list.length === 0 ? (
        <div className="rounded-3xl bg-white border-2 border-slate-200 p-12 text-center shadow-sm">
          <ArrowLeftRight className="h-12 w-12 text-slate-300 mx-auto mb-3" />
          <h3 className="font-extrabold text-slate-900 text-lg">
            {search || tab !== 'all' ? 'Kuch nahi mila' : 'Abhi tak koi transfer nahi hua'}
          </h3>
          <p className="text-sm font-semibold text-slate-500 mt-1.5 max-w-md mx-auto">
            Ek dukan se dusri dukan maal bhejne ke liye "Naya Transfer" par click karein.
            Serial wale units bhi bheje ja sakte hain.
          </p>
          <button onClick={() => setShowNew(true)}
            className="mt-4 inline-flex items-center gap-1.5 h-11 px-5 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-700 text-white text-sm font-extrabold shadow-lg hover:shadow-xl transition">
            <Plus className="h-4 w-4" /> Naya Transfer
          </button>
        </div>
      ) : (
        <div className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm overflow-hidden divide-y divide-slate-100">
          {list.map((t) => {
            const open = expanded.has(t.id);
            const sm = STATUS_META[t.status] ?? STATUS_META.PENDING;
            const serialCount = t.items.filter((it) => it.serialId).length;
            const normalQty = t.items.filter((it) => !it.serialId).reduce((a, it) => a + (it.quantity ?? 0), 0);
            const canAct = t.status === 'IN_TRANSIT' || t.status === 'PENDING';
            return (
              <div key={t.id}>
                <button onClick={() => toggle(t.id)} className="w-full px-4 py-3.5 flex items-center gap-3 text-left hover:bg-slate-50 transition">
                  <div className={`h-11 w-11 rounded-xl flex items-center justify-center shrink-0 text-white shadow ${
                    t.status === 'RECEIVED' ? 'bg-gradient-to-br from-emerald-500 to-teal-600'
                      : t.status === 'CANCELLED' ? 'bg-gradient-to-br from-slate-400 to-slate-500'
                      : 'bg-gradient-to-br from-amber-500 to-orange-600'
                  }`}>
                    <sm.icon className="h-5 w-5" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-extrabold text-slate-900 text-sm font-mono">{t.transferNumber}</span>
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold ${sm.chip}`}>{sm.label}</span>
                      {serialCount > 0 && (
                        <span className="px-1.5 py-0.5 rounded bg-violet-100 text-violet-700 text-[9px] font-extrabold inline-flex items-center gap-0.5">
                          <Barcode className="h-2.5 w-2.5" /> {serialCount} serial
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 flex items-center gap-1.5 flex-wrap text-[11px] font-bold text-slate-500">
                      <Store className="h-3 w-3" /> {t.fromShop.name}
                      <ArrowRight className="h-3 w-3 text-slate-400" />
                      <Store className="h-3 w-3" /> {t.toShop.name}
                      <span className="text-slate-400">·</span>
                      {new Date(t.transferredAt ?? t.createdAt).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' })}
                    </div>
                  </div>

                  <div className="text-right shrink-0 hidden sm:block">
                    <div className="text-sm font-extrabold text-slate-900 tabular-nums">{t.items.length}</div>
                    <div className="text-[10px] font-bold text-slate-400">
                      {serialCount > 0 && normalQty > 0 ? 'mixed' : serialCount > 0 ? 'serial' : `${normalQty} pcs`}
                    </div>
                  </div>
                  {open ? <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" /> : <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />}
                </button>

                {open && (
                  <div className="px-4 pb-4 pt-1 bg-slate-50 space-y-2.5">
                    <div className="rounded-xl border-2 border-slate-200 bg-white overflow-hidden divide-y divide-slate-100">
                      {t.items.map((it) => {
                        const left = warrantyLeft(it.serial?.warrantyEndDate);
                        return (
                          <div key={it.id} className="px-3 py-2.5">
                            <div className="flex items-center gap-2">
                              <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${
                                it.serialId ? 'bg-violet-100 text-violet-700' : 'bg-slate-100 text-slate-600'
                              }`}>
                                {it.serialId ? <Barcode className="h-4 w-4" /> : <Package className="h-4 w-4" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="font-extrabold text-slate-900 text-sm truncate">
                                  {it.product?.name ?? 'Item'}
                                </div>
                                {it.notes && <div className="text-[11px] font-semibold text-slate-500 italic truncate">{it.notes}</div>}
                              </div>
                              <div className="font-extrabold text-slate-900 tabular-nums text-sm shrink-0">
                                {it.serialId ? '1 unit' : `${it.quantity} ${it.product?.unit ?? 'pcs'}`}
                              </div>
                            </div>

                            {it.serial && (
                              <div className="mt-2 rounded-lg bg-violet-50 border border-violet-200 px-2.5 py-1.5 flex items-center gap-2 flex-wrap">
                                <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-violet-800 font-mono">
                                  <Hash className="h-3 w-3" /> {it.serial.serialNumber}
                                </span>
                                {it.serial.imei && (
                                  <span className="text-[10px] font-bold text-violet-700 font-mono">IMEI {it.serial.imei}</span>
                                )}
                                {left != null && (
                                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold inline-flex items-center gap-0.5 ${
                                    left < 0 ? 'bg-slate-200 text-slate-600'
                                      : left <= 30 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                                  }`}>
                                    {left < 0 ? <ShieldAlert className="h-2.5 w-2.5" /> : <ShieldCheck className="h-2.5 w-2.5" />}
                                    {left < 0 ? 'Warranty khatam' : `Warranty ${left} din`}
                                  </span>
                                )}
                                <span className="px-1.5 py-0.5 rounded bg-white text-slate-600 text-[9px] font-extrabold border border-slate-200">
                                  {it.serial.status}
                                </span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {t.notes && (
                      <div className="rounded-xl bg-white border-2 border-slate-200 p-3 text-xs font-semibold text-slate-600">
                        📝 {t.notes}
                      </div>
                    )}

                    {canAct && (
                      <div className="flex gap-2 flex-wrap print:hidden">
                        <button onClick={() => receiveMutation.mutate(t.id)} disabled={receiveMutation.isPending}
                          className="h-10 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 text-white text-xs font-extrabold inline-flex items-center gap-1.5 shadow hover:shadow-lg transition disabled:opacity-50">
                          {receiveMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                          Maal Mil Gaya
                        </button>
                        <button
                          onClick={() => { if (confirm('Transfer cancel karein? Maal wapas apni shop me chala jayega.')) cancelMutation.mutate(t.id); }}
                          disabled={cancelMutation.isPending}
                          className="h-10 px-4 rounded-xl bg-white border-2 border-rose-200 text-rose-700 text-xs font-extrabold inline-flex items-center gap-1.5 hover:bg-rose-50 transition disabled:opacity-50">
                          <XCircle className="h-3.5 w-3.5" /> Cancel
                        </button>
                      </div>
                    )}
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
   NAYA TRANSFER — serial units + normal stock
   ═════════════════════════════════════════════════════════════ */

interface Line extends CreateTransferItemPayload {
  key: string;
  label: string;
  serialNumber?: string;
}

function NewTransferModal({ onClose, currentShopId }: { onClose: () => void; currentShopId: string | null }) {
  const qc = useQueryClient();
  const [fromShopId, setFromShopId] = useState(currentShopId ?? '');
  const [toShopId, setToShopId] = useState('');
  const [notes, setNotes] = useState('');
  const [mode, setMode] = useState<'serial' | 'normal'>('serial');
  const [search, setSearch] = useState('');
  const [lines, setLines] = useState<Line[]>([]);

  const { data: shops = [] } = useQuery({
    queryKey: ['shops'],
    queryFn: () => shopsApi.list(),
  });

  const { data: serials = [], isLoading: serialsLoading } = useQuery({
    queryKey: ['electronics-serials-for-transfer', fromShopId],
    queryFn: () => serialTrackingApi.list({ shopId: fromShopId, status: 'IN_STOCK' }),
    enabled: !!fromShopId && mode === 'serial',
  });

  const { data: stockReport } = useQuery({
    queryKey: ['electronics-stock-report', fromShopId],
    queryFn: () => electronicsAnalyticsApi.stock(fromShopId),
    enabled: !!fromShopId && mode === 'normal',
  });

  const createMutation = useMutation({
    mutationFn: () => transfersApi.create({
      fromShopId, toShopId, notes: notes || undefined,
      items: lines.map(({ key, label, serialNumber, ...rest }) => rest),
    }),
    onSuccess: () => {
      toast.success('Transfer ban gaya — maal raste me hai');
      qc.invalidateQueries({ queryKey: ['transfers'] });
      qc.invalidateQueries({ queryKey: ['electronics-stock-report'] });
      qc.invalidateQueries({ queryKey: ['electronics-low-stock'] });
      onClose();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Transfer fail hua'),
  });

  const picked = new Set(lines.map((l) => l.key));

  const filteredSerials = useMemo(() => {
    const q = search.toLowerCase().trim();
    let l = (serials as SerialWithProduct[]).filter((s) => !picked.has(`s-${s.id}`));
    if (q) {
      l = l.filter((s) =>
        s.serialNumber.toLowerCase().includes(q) ||
        (s.imei ?? '').includes(q) ||
        (s.product?.name ?? '').toLowerCase().includes(q),
      );
    }
    return l.slice(0, 60);
  }, [serials, search, lines]);

  const filteredProducts = useMemo(() => {
    const q = search.toLowerCase().trim();
    let l = (stockReport?.products ?? []).filter((p) => !picked.has(`p-${p.productId}`) && p.stock > 0);
    if (q) {
      l = l.filter((p) =>
        p.name.toLowerCase().includes(q) || (p.sku ?? '').toLowerCase().includes(q) ||
        (p.brand ?? '').toLowerCase().includes(q),
      );
    }
    return l.slice(0, 60);
  }, [stockReport, search, lines]);

  const addSerial = (s: SerialWithProduct) => {
    setLines((prev) => [...prev, {
      key: `s-${s.id}`,
      label: s.product?.name ?? 'Serial unit',
      serialNumber: s.serialNumber,
      productId: s.productId,
      serialId: s.id,
      quantity: 1,
    }]);
  };

  const addProduct = (p: { productId: string; name: string; stock: number; unit: string }) => {
    setLines((prev) => [...prev, {
      key: `p-${p.productId}`,
      label: p.name,
      productId: p.productId,
      quantity: 1,
    }]);
  };

  const setQty = (key: string, q: number) =>
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, quantity: Math.max(1, q) } : l)));

  const remove = (key: string) => setLines((prev) => prev.filter((l) => l.key !== key));

  const sameShop = fromShopId && toShopId && fromShopId === toShopId;
  const canSubmit = !!fromShopId && !!toShopId && !sameShop && lines.length > 0 && !createMutation.isPending;

  const maxStock = (key: string) => {
    const pid = key.replace(/^p-/, '');
    return (stockReport?.products ?? []).find((p) => p.productId === pid)?.stock ?? 999;
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-4xl bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[94vh] flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-violet-600 to-fuchsia-700 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur">
              <ArrowLeftRight className="h-5 w-5" />
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider font-extrabold text-white/70">Naya Transfer</div>
              <h3 className="font-extrabold">Maal Dusri Dukan Bhejein</h3>
            </div>
          </div>
          <button onClick={onClose} className="h-9 w-9 rounded-xl hover:bg-white/20 flex items-center justify-center transition">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Shops */}
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 mb-1.5">Kahan Se</label>
              <select value={fromShopId} onChange={(e) => { setFromShopId(e.target.value); setLines([]); }}
                className="h-11 w-full rounded-xl border-2 border-slate-200 bg-white px-3 text-sm font-bold focus:outline-none focus:border-violet-500 transition">
                <option value="">Shop chunein</option>
                {(shops as any[]).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 mb-1.5">Kahan</label>
              <select value={toShopId} onChange={(e) => setToShopId(e.target.value)}
                className="h-11 w-full rounded-xl border-2 border-slate-200 bg-white px-3 text-sm font-bold focus:outline-none focus:border-violet-500 transition">
                <option value="">Shop chunein</option>
                {(shops as any[]).filter((s) => s.id !== fromShopId).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          </div>

          {sameShop && (
            <div className="rounded-xl bg-rose-50 border-2 border-rose-200 p-3 flex items-center gap-2 text-sm font-semibold text-rose-900">
              <AlertTriangle className="h-4 w-4 shrink-0" /> Dono shop ek hi hain — alag chunein
            </div>
          )}

          {!fromShopId ? (
            <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-10 text-center">
              <Store className="h-10 w-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-700">Pehle "Kahan Se" wali shop chunein</p>
              <p className="text-xs font-semibold text-slate-500 mt-1">Uske baad uska stock yahan aa jayega</p>
            </div>
          ) : (
            <>
              {/* Mode + search */}
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex gap-1.5">
                  <button onClick={() => { setMode('serial'); setSearch(''); }}
                    className={`h-9 px-3 rounded-lg text-xs font-extrabold inline-flex items-center gap-1.5 transition border-2 ${
                      mode === 'serial' ? 'bg-violet-600 text-white border-transparent shadow' : 'bg-white border-slate-200 text-slate-600 hover:border-violet-300'
                    }`}>
                    <Barcode className="h-3.5 w-3.5" /> Serial Wale
                  </button>
                  <button onClick={() => { setMode('normal'); setSearch(''); }}
                    className={`h-9 px-3 rounded-lg text-xs font-extrabold inline-flex items-center gap-1.5 transition border-2 ${
                      mode === 'normal' ? 'bg-emerald-600 text-white border-transparent shadow' : 'bg-white border-slate-200 text-slate-600 hover:border-emerald-300'
                    }`}>
                    <Cpu className="h-3.5 w-3.5" /> Normal Stock
                  </button>
                </div>
                <div className="relative flex-1 min-w-[180px]">
                  <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input value={search} onChange={(e) => setSearch(e.target.value)}
                    placeholder={mode === 'serial' ? 'Serial, IMEI ya product...' : 'Product, SKU, brand...'}
                    className="h-9 w-full rounded-lg border-2 border-slate-200 bg-white pl-9 pr-3 text-sm font-bold focus:outline-none focus:border-violet-500 transition" />
                </div>
              </div>

              {/* Picker */}
              <div className="rounded-2xl border-2 border-slate-200 overflow-hidden max-h-64 overflow-y-auto">
                {mode === 'serial' ? (
                  serialsLoading ? (
                    <div className="p-8 text-center text-sm font-bold text-slate-500">
                      <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" /> Serial units aa rahe hain…
                    </div>
                  ) : filteredSerials.length === 0 ? (
                    <div className="p-8 text-center">
                      <Barcode className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                      <p className="text-sm font-bold text-slate-700">
                        {search ? 'Is serial se kuch nahi mila' : 'Is shop me koi serial unit stock me nahi'}
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {filteredSerials.map((s) => (
                        <button key={s.id} onClick={() => addSerial(s)}
                          className="w-full px-3 py-2.5 flex items-center gap-3 text-left hover:bg-violet-50 transition">
                          <div className="h-8 w-8 rounded-lg bg-violet-100 text-violet-700 flex items-center justify-center shrink-0">
                            <Barcode className="h-4 w-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-extrabold text-slate-900 text-sm truncate">{s.product?.name ?? 'Serial unit'}</div>
                            <div className="text-[11px] font-bold text-slate-500 font-mono truncate">
                              {s.serialNumber}{s.imei ? ` · IMEI ${s.imei}` : ''}
                            </div>
                          </div>
                          <Plus className="h-4 w-4 text-violet-600 shrink-0" />
                        </button>
                      ))}
                    </div>
                  )
                ) : (
                  filteredProducts.length === 0 ? (
                    <div className="p-8 text-center">
                      <Package className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                      <p className="text-sm font-bold text-slate-700">
                        {search ? 'Kuch nahi mila' : 'Is shop me normal stock nahi'}
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {filteredProducts.map((p) => {
                        const meta = p.categoryType ? CATEGORY_META[p.categoryType as CategoryType] : null;
                        return (
                          <button key={p.productId} onClick={() => addProduct(p)}
                            className="w-full px-3 py-2.5 flex items-center gap-3 text-left hover:bg-emerald-50 transition">
                            <div className="h-8 w-8 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0 text-base">
                              {meta?.emoji ?? '📦'}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-extrabold text-slate-900 text-sm truncate">{p.name}</div>
                              <div className="text-[11px] font-bold text-slate-500 truncate">
                                {p.stock} {p.unit} maujood{p.brand ? ` · ${p.brand}` : ''}
                              </div>
                            </div>
                            <Plus className="h-4 w-4 text-emerald-600 shrink-0" />
                          </button>
                        );
                      })}
                    </div>
                  )
                )}
              </div>

              {/* Selected lines */}
              <div>
                <div className="text-xs font-extrabold uppercase tracking-wider text-slate-600 mb-2">
                  Bhejne Wali Cheezein ({lines.length})
                </div>
                {lines.length === 0 ? (
                  <div className="rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-6 text-center">
                    <p className="text-sm font-bold text-slate-600">Abhi kuch nahi chuna</p>
                    <p className="text-xs font-semibold text-slate-500 mt-0.5">Upar se click karke add karein</p>
                  </div>
                ) : (
                  <div className="rounded-xl border-2 border-slate-200 divide-y divide-slate-100 overflow-hidden">
                    {lines.map((l) => (
                      <div key={l.key} className="px-3 py-2.5 flex items-center gap-3">
                        <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${
                          l.serialId ? 'bg-violet-100 text-violet-700' : 'bg-emerald-100 text-emerald-700'
                        }`}>
                          {l.serialId ? <Barcode className="h-4 w-4" /> : <Package className="h-4 w-4" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-extrabold text-slate-900 text-sm truncate">{l.label}</div>
                          {l.serialNumber && (
                            <div className="text-[11px] font-bold text-slate-500 font-mono truncate">{l.serialNumber}</div>
                          )}
                        </div>
                        {l.serialId ? (
                          <span className="text-xs font-extrabold text-slate-500 shrink-0">1 unit</span>
                        ) : (
                          <input type="number" min={1} max={maxStock(l.key)} value={l.quantity}
                            onChange={(e) => setQty(l.key, Number(e.target.value || 1))}
                            className="h-9 w-20 rounded-lg border-2 border-slate-200 px-2 text-sm font-extrabold tabular-nums text-center focus:outline-none focus:border-emerald-500 shrink-0" />
                        )}
                        <button onClick={() => remove(l.key)}
                          className="h-9 w-9 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center shrink-0 transition">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 mb-1.5">
                  Note <span className="text-slate-400 normal-case font-bold">(optional)</span>
                </label>
                <input value={notes} onChange={(e) => setNotes(e.target.value)}
                  placeholder="jaise: Rider ke haath bheja"
                  className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-violet-500 transition" />
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t-2 border-slate-100 bg-slate-50 flex items-center justify-between gap-3 shrink-0 flex-wrap">
          <div className="text-xs font-bold text-slate-600">
            {lines.length > 0 && (
              <>
                <b className="text-slate-900">{lines.filter((l) => l.serialId).length}</b> serial unit
                {' · '}
                <b className="text-slate-900">{lines.filter((l) => !l.serialId).reduce((a, l) => a + l.quantity, 0)}</b> pcs
              </>
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={onClose} className="h-11 px-4 rounded-xl bg-white border-2 border-slate-200 text-slate-700 text-sm font-extrabold hover:bg-slate-100 transition">
              Cancel
            </button>
            <Button onClick={() => createMutation.mutate()} disabled={!canSubmit}
              className="bg-gradient-to-r from-violet-600 to-fuchsia-700 font-extrabold shadow-lg">
              {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Truck className="h-4 w-4" />}
              Transfer Bhejein
            </Button>
          </div>
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
      <div className="mt-1 text-2xl font-extrabold tabular-nums">{value}</div>
      {sub && <div className="mt-0.5 text-[11px] font-bold text-white/70">{sub}</div>}
    </div>
  );
}

function TransfersTeacher({ onClose }: { onClose: () => void }) {
  const steps = [
    {
      icon: Barcode, title: 'Serial wale units bhejna',
      body: 'Laptop, camera, drone jaisi cheezein ginti se nahi — unit se jati hain. "Naya Transfer" me Serial Wale tab se exact unit chunein. Us unit ki warranty aur history sath jati hai.',
      tips: ['Sirf usi shop ke units nazar aate hain jahan se bhej rahe hain', 'Ek unit ki quantity hamesha 1 hoti hai'],
    },
    {
      icon: Truck, title: 'Raste me — teen halat',
      body: 'Transfer banate hi maal "Raste Me" ho jata hai — na bhejne wali shop ka, na lene wali ka. Isi liye us waqt wo kahin bhi bech nahi sakta. Dusri shop "Maal Mil Gaya" dabaye to stock wahan aa jata hai.',
      tips: ['Cancel karne par maal wapas apni purani shop me', 'Serial ka shop bhi sath badalta hai'],
    },
    {
      icon: Cpu, title: 'Normal stock',
      body: 'Cable, cover, glass jaisi cheezein ginti ke hisab se jati hain. Normal Stock tab se product chunein aur ginti likh dein — utna hi stock kam ho jayega.',
      tips: ['Jitna maujood hai us se zyada nahi bheja ja sakta'],
    },
    {
      icon: ShieldCheck, title: 'Stock report sach bolti hai',
      body: 'Transfer ke baad Stock Report par har shop ka sahi stock nazar aata hai — serial units bhi apni nayi shop me ginay jate hain.',
      tips: ['CSV me har transfer ke serial numbers bhi aate hain', 'N dabao to naya transfer'],
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
              <h3 className="font-extrabold text-slate-900">Transfer Kaise Karein?</h3>
            </div>
          </div>
          <button onClick={onClose} className="h-9 w-9 rounded-xl hover:bg-white flex items-center justify-center transition">
            <X className="h-4 w-4 text-slate-600" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-3.5">
          {steps.map((st, i) => (
            <div key={i} className="rounded-xl border-2 border-slate-200 bg-slate-50 p-3.5 flex items-start gap-3">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-700 text-white flex items-center justify-center shrink-0 shadow-md">
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
    ['N', 'Naya transfer'], ['/', 'Search par jao'], ['G', 'Guide kholo'],
    ['R', 'Refresh'], ['P', 'Print'], ['?', 'Ye list'], ['Esc', 'Band karo'],
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
