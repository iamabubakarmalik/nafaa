// apps/web/src/industries/mobile/pages/MobileTransfersPage.tsx
import { useState, useMemo, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeftRight, Store, Smartphone, Search, X, Plus, Minus, Truck, PackageCheck,
  Ban, RefreshCw, Camera, ArrowRight, CheckCircle2, Clock, AlertTriangle,
  PackageSearch, Trash2, Hash, GraduationCap, Printer, FileSpreadsheet,
  Keyboard, Cable, RotateCcw, Sparkles, Wrench,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@core/ui/Button';
import { formatPKR } from '@core/lib/format';
import { useAuthStore } from '@core/stores/auth.store';
import BarcodeScanner from '@core/components/barcode/BarcodeScanner';
import { shopsApi } from '@modules/organization/shops/api/shops.api';
import {
  transfersApi,
  type StockTransfer,
  type CreateTransferItemPayload,
} from '@modules/inventory/transfers/api/transfers.api';
import { mobilePosApi } from '../api/mobile-pos.api';
import { PTA_STATUS_LABELS, PTA_STATUS_COLORS, type PtaStatus } from '../api/imei.api';
import { CONDITION_LABELS, type UsedPhoneCondition } from '../api/used-phones.api';
import { PrintStyles } from '@core/components/print/PrintStyles';

/* ═════════════════════════════════════════════════════════════
   NAFAA MOBILE — SHOP TRANSFERS
   ─────────────────────────────────────────────────────────────
   📱 Naye phone (IMEI) • 🔄 Used phone • 🎧 Accessories & parts
   🚚 Rah me wala maal kahin nahi bikta — dono taraf safe
   🎓 Guide modal • ⌨️ Shortcuts • 🖨️ Print + CSV
   🌗 Dark/light perfect • 📱 Mobile → 4K
   ═════════════════════════════════════════════════════════════ */

type PickTab = 'phones' | 'used' | 'accessories';
type StatusFilter = 'all' | 'IN_TRANSIT' | 'RECEIVED' | 'CANCELLED';

type DraftItem = {
  key: string;
  kind: 'NEW' | 'USED' | 'ACCESSORY';
  productId?: string;
  imeiId?: string;
  usedPhoneId?: string;
  ref: string;
  name: string;
  detail?: string | null;
  ptaStatus?: PtaStatus;
  unit?: string;
  quantity: number;
  maxQty: number;
  value: number;
};

const STATUS_META: Record<string, { label: string; tone: string; icon: any }> = {
  IN_TRANSIT: { label: 'Raste Mein', tone: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300', icon: Truck },
  RECEIVED: { label: 'Mil Gaya', tone: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300', icon: CheckCircle2 },
  CANCELLED: { label: 'Cancel', tone: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300', icon: Ban },
  PENDING: { label: 'Pending', tone: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300', icon: Clock },
};

const KIND_META = {
  NEW: { label: 'Naya Phone', icon: Smartphone, chip: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300', grad: 'from-blue-600 to-indigo-700' },
  USED: { label: 'Used Phone', icon: RotateCcw, chip: 'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300', grad: 'from-violet-600 to-fuchsia-700' },
  ACCESSORY: { label: 'Accessory', icon: Cable, chip: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300', grad: 'from-emerald-600 to-teal-700' },
} as const;

const formatDate = (iso: string) =>
  new Intl.DateTimeFormat('en-PK', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso));

export default function MobileTransfersPage() {
  const queryClient = useQueryClient();
  const currentShopId = useAuthStore((s) => s.currentShopId);
  const shopName = useAuthStore((s: any) => s.user?.assignedShop?.name);
  const tenantName = useAuthStore((s: any) => s.tenant?.name);

  const [fromShopId, setFromShopId] = useState('');
  const [toShopId, setToShopId] = useState('');
  const [pickTab, setPickTab] = useState<PickTab>('phones');
  const [pickSearch, setPickSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [scannerOpen, setScannerOpen] = useState(false);
  const [draft, setDraft] = useState<DraftItem[]>([]);
  const [notes, setNotes] = useState('');

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [showTeacher, setShowTeacher] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);

  const pickRef = useRef<HTMLInputElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(pickSearch.trim()), 250);
    return () => clearTimeout(t);
  }, [pickSearch]);

  useEffect(() => {
    if (!fromShopId && currentShopId) setFromShopId(currentShopId);
  }, [currentShopId, fromShopId]);

  /* ─── Keyboard ─── */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      const typing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
      if (e.key === 'Escape') {
        if (showShortcuts) return setShowShortcuts(false);
        if (showTeacher) return setShowTeacher(false);
        if (scannerOpen) return setScannerOpen(false);
        return;
      }
      if (typing || e.ctrlKey || e.metaKey) return;
      if (e.key === '/') { e.preventDefault(); (pickRef.current ?? searchRef.current)?.focus(); }
      if (e.key === 'g') setShowTeacher(true);
      if (e.key === 's') { e.preventDefault(); setScannerOpen(true); }
      if (e.key === '?') setShowShortcuts((v) => !v);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showTeacher, showShortcuts, scannerOpen]);

  const anyModal = showTeacher || showShortcuts || scannerOpen;
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = anyModal ? 'hidden' : prev;
    return () => { document.body.style.overflow = prev; };
  }, [anyModal]);

  /* ─── Data ─── */
  const { data: shops = [] } = useQuery({ queryKey: ['shops'], queryFn: () => shopsApi.list() });

  const activeShops = useMemo(
    () => (shops as any[]).filter((s) => s.isActive !== false),
    [shops],
  );

  /* Source shop ka poora maal — POS catalog hi teeno list deta hai */
  const { data: catalog, isFetching: loadingPick } = useQuery({
    queryKey: ['mobile-pos-catalog', fromShopId, debounced],
    queryFn: () => mobilePosApi.catalog({ shopId: fromShopId, search: debounced || undefined }),
    enabled: Boolean(fromShopId),
  });

  const { data: transfers = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['transfers'],
    queryFn: transfersApi.list,
  });

  const draftKeys = useMemo(() => new Set(draft.map((d) => d.key)), [draft]);

  const pickPhones = useMemo(
    () => (catalog?.phones ?? []).filter((p) => !draftKeys.has(`imei:${p.id}`)),
    [catalog, draftKeys],
  );
  const pickUsed = useMemo(
    () => (catalog?.usedPhones ?? []).filter((p) => !draftKeys.has(`used:${p.id}`)),
    [catalog, draftKeys],
  );
  const pickAccessories = useMemo(
    () => (catalog?.accessories ?? []).filter((a) => a.stock > 0 && !a.notInShop),
    [catalog],
  );

  const draftValue = draft.reduce((s, d) => s + d.value * d.quantity, 0);

  /* ─── Stats ─── */
  const stats = useMemo(() => ({
    total: transfers.length,
    inTransit: transfers.filter((t) => t.status === 'IN_TRANSIT').length,
    received: transfers.filter((t) => t.status === 'RECEIVED').length,
    cancelled: transfers.filter((t) => t.status === 'CANCELLED').length,
  }), [transfers]);

  const visibleTransfers = useMemo(() => {
    let rows = transfers;
    if (statusFilter !== 'all') rows = rows.filter((t) => t.status === statusFilter);
    const q = search.toLowerCase().trim();
    if (q) {
      rows = rows.filter(
        (t) =>
          t.transferNumber.toLowerCase().includes(q) ||
          t.fromShop.name.toLowerCase().includes(q) ||
          t.toShop.name.toLowerCase().includes(q) ||
          t.items.some(
            (i) =>
              (i.product?.name ?? '').toLowerCase().includes(q) ||
              (i.imei?.imei1 ?? '').includes(q) ||
              (i.usedPhone?.usedPhoneCode ?? '').toLowerCase().includes(q),
          ),
      );
    }
    return rows;
  }, [transfers, statusFilter, search]);

  /* ─── Draft ops ─── */
  const addPhone = (p: any) => {
    setDraft((prev) => [...prev, {
      key: `imei:${p.id}`, kind: 'NEW', productId: p.productId, imeiId: p.id,
      ref: p.imei1, name: p.productName ?? 'Mobile',
      detail: p.variant?.name ?? p.color ?? null,
      ptaStatus: p.ptaStatus, quantity: 1, maxQty: 1,
      value: Number(p.resolvedCostPrice) || 0,
    }]);
    setPickSearch('');
    toast.success(`${p.imei1} list me`, { duration: 800 });
  };

  const addUsed = (p: any) => {
    setDraft((prev) => [...prev, {
      key: `used:${p.id}`, kind: 'USED', usedPhoneId: p.id,
      ref: p.usedPhoneCode, name: `${p.brand} ${p.model}${p.storage ? ` ${p.storage}` : ''}`,
      detail: CONDITION_LABELS[p.condition as UsedPhoneCondition] ?? null,
      ptaStatus: p.ptaStatus, quantity: 1, maxQty: 1,
      value: Number(p.totalCost) || 0,
    }]);
    setPickSearch('');
    toast.success(`${p.usedPhoneCode} list me`, { duration: 800 });
  };

  const addAccessory = (a: any) => {
    const key = `acc:${a.id}`;
    const existing = draft.find((d) => d.key === key);
    if (existing) {
      if (existing.quantity >= existing.maxQty) return toast.error(`Stock sirf ${existing.maxQty}`);
      return setDraft((prev) => prev.map((d) => d.key === key ? { ...d, quantity: d.quantity + 1 } : d));
    }
    setDraft((prev) => [...prev, {
      key, kind: 'ACCESSORY', productId: a.id,
      ref: a.sku ?? '', name: a.name, detail: a.brand,
      unit: a.unit, quantity: 1, maxQty: a.stock,
      value: Number(a.costPrice) || 0,
    }]);
    toast.success(`${a.name} list me`, { duration: 800 });
  };

  const changeQty = (key: string, delta: number) =>
    setDraft((prev) => prev.flatMap((d) => {
      if (d.key !== key) return [d];
      const q = d.quantity + delta;
      if (q <= 0) return [];
      if (q > d.maxQty) { toast.error(`Stock sirf ${d.maxQty}`); return [d]; }
      return [{ ...d, quantity: q }];
    }));

  const removeItem = (key: string) => setDraft((prev) => prev.filter((d) => d.key !== key));
  const resetDraft = () => { setDraft([]); setNotes(''); setPickSearch(''); };

  const refreshAll = () => {
    queryClient.invalidateQueries({
      predicate: (q) => {
        const k = String(q.queryKey?.[0] ?? '');
        return [
          'transfers', 'mobile-pos-catalog', 'imei-list', 'imei-stats',
          'imei-global-list', 'imei-global-stats', 'used-phones', 'used-phones-stats',
          'mobile-low-stock', 'mobile-stock-aging', 'products',
        ].includes(k) || k.startsWith('mobile-reports');
      },
    });
  };

  /* ─── Mutations ─── */
  const createMutation = useMutation({
    mutationFn: () => {
      const items: CreateTransferItemPayload[] = draft.map((d) => ({
        ...(d.productId ? { productId: d.productId } : {}),
        ...(d.imeiId ? { imeiId: d.imeiId } : {}),
        ...(d.usedPhoneId ? { usedPhoneId: d.usedPhoneId } : {}),
        quantity: d.quantity,
      }));
      return transfersApi.create({ fromShopId, toShopId, notes: notes.trim() || undefined, items });
    },
    onSuccess: (t) => {
      toast.success(`✓ ${t.transferNumber} rawana ho gaya`);
      resetDraft();
      refreshAll();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Transfer fail hua'),
  });

  const receiveMutation = useMutation({
    mutationFn: (id: string) => transfersApi.receive(id),
    onSuccess: () => { toast.success('✓ Maal wasool ho gaya'); refreshAll(); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Receive fail hua'),
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => transfersApi.cancel(id),
    onSuccess: () => { toast.success('Cancel — maal wapas apni shop me'); refreshAll(); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Cancel fail hua'),
  });

  const handleBarcode = (code: string) => {
    setScannerOpen(false);
    const t = code.trim();
    if (t) { setPickSearch(t); toast.success(`"${t}" dhoond rahe hain...`); }
  };

  const exportCSV = () => {
    const rows: string[][] = [
      [`${tenantName ?? 'Nafaa'} — Mobile Transfers`],
      [`Shop: ${shopName ?? 'All'}`, new Date().toLocaleString('en-PK')],
      [],
      ['Transfer #', 'Status', 'Kahan se', 'Kahan', 'Items', 'Banaya', 'Wasool'],
      ...visibleTransfers.map((t) => [
        t.transferNumber,
        STATUS_META[t.status]?.label ?? t.status,
        t.fromShop.name, t.toShop.name, String(t.items.length),
        formatDate(t.createdAt),
        t.receivedAt ? formatDate(t.receivedAt) : '',
      ]),
      [],
      ['Transfer #', 'Kism', 'Ref', 'Naam', 'Qty'],
      ...visibleTransfers.flatMap((t) =>
        t.items.map((i) => [
          t.transferNumber,
          i.imei ? 'Naya Phone' : i.usedPhone ? 'Used Phone' : 'Accessory',
          i.imei?.imei1 ?? i.usedPhone?.usedPhoneCode ?? '',
          i.product?.name ?? (i.usedPhone ? `${i.usedPhone.brand} ${i.usedPhone.model}` : ''),
          String(i.quantity),
        ]),
      ),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `mobile-transfers-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV download ho gaya');
  };

  const sameShop = Boolean(fromShopId && toShopId && fromShopId === toShopId);
  const canSend = draft.length > 0 && fromShopId && toShopId && !sameShop;

  const pickCount = { phones: pickPhones.length, used: pickUsed.length, accessories: pickAccessories.length };

  return (
    <div className="space-y-4 sm:space-y-5 pb-10 print:space-y-3">
      <PrintStyles orientation="landscape" title="Shop Transfers" subtitle="Maal ek shop se dusri shop" />

      {scannerOpen && <BarcodeScanner onDetected={handleBarcode} onClose={() => setScannerOpen(false)} />}
      {showTeacher && <TransferTeacher onClose={() => setShowTeacher(false)} />}
      {showShortcuts && <ShortcutsModal onClose={() => setShowShortcuts(false)} />}

      {/* ═══ HERO ═══ */}
      <section className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-slate-950 via-cyan-900 to-teal-700 dark:from-slate-950 dark:via-cyan-950 dark:to-teal-900 text-white p-4 sm:p-6 shadow-2xl print:hidden">
        <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-cyan-400/25 blur-3xl pointer-events-none animate-pulse" />
        <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-teal-400/20 blur-3xl pointer-events-none" />

        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0 flex-1">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur-md px-3 py-1 text-[11px] font-extrabold border border-white/25 uppercase tracking-widest shadow-lg">
              <ArrowLeftRight className="h-3.5 w-3.5 text-amber-300" /> Multi-Shop
              {shopName && (
                <>
                  <span className="opacity-40">•</span>
                  <span className="text-emerald-200">🏪 {shopName}</span>
                </>
              )}
            </div>
            <h1 className="mt-3 text-2xl sm:text-3xl lg:text-4xl font-extrabold leading-tight">🚚 Shop Transfers</h1>
            <p className="mt-1.5 text-xs sm:text-sm text-white/90 font-semibold">
              Phone, used phone aur accessories — dusri dukan bhejo poore record ke sath
              {stats.inTransit > 0 && (
                <>
                  <span className="opacity-50 mx-1.5">•</span>
                  <strong className="text-amber-300">{stats.inTransit}</strong> raste mein
                </>
              )}
            </p>
          </div>

          <div className="flex gap-2 flex-wrap items-center shrink-0">
            <button onClick={() => setShowTeacher(true)}
              className="h-11 px-3 rounded-xl bg-amber-400/90 hover:bg-amber-400 text-slate-900 text-xs font-extrabold inline-flex items-center gap-1.5 shadow-lg transition">
              <GraduationCap className="h-4 w-4" /> <span className="hidden sm:inline">Guide</span>
            </button>
            <button onClick={() => setShowShortcuts(true)}
              className="h-11 w-11 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 inline-flex items-center justify-center backdrop-blur-md transition"
              title="Shortcuts (?)">
              <Keyboard className="h-4 w-4" />
            </button>
            <button onClick={() => refetch()} disabled={isRefetching}
              className="h-11 px-3 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 text-xs font-extrabold inline-flex items-center gap-1.5 backdrop-blur-md disabled:opacity-50 transition">
              <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <button onClick={() => window.print()}
              className="h-11 px-3 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 text-xs font-extrabold inline-flex items-center gap-1.5 backdrop-blur-md transition">
              <Printer className="h-4 w-4" /> <span className="hidden sm:inline">Print</span>
            </button>
            <button onClick={exportCSV}
              className="h-11 px-3 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 text-xs font-extrabold inline-flex items-center gap-1.5 backdrop-blur-md transition">
              <FileSpreadsheet className="h-4 w-4" /> <span className="hidden sm:inline">CSV</span>
            </button>
          </div>
        </div>
      </section>

      {/* ═══ KPIs ═══ */}
      <section className="grid grid-cols-2 xl:grid-cols-4 gap-2 sm:gap-3 print:hidden">
        <Kpi icon={ArrowLeftRight} tone="cyan" label="Kul" value={stats.total} sub="Sab transfers" />
        <Kpi icon={Truck} tone="amber" label="Raste Mein" value={stats.inTransit} sub="Abhi safar me" />
        <Kpi icon={CheckCircle2} tone="emerald" label="Mil Gaya" value={stats.received} sub="Wasool ho chuke" />
        <Kpi icon={PackageCheck} tone="blue" label="List Me" value={draft.length} sub={formatPKR(draftValue)} />
      </section>

      {/* ═══ NEW TRANSFER ═══ */}
      <section className="rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-slate-200 dark:border-slate-800 shadow-sm p-4 sm:p-5 space-y-4 print:hidden">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-cyan-600 to-teal-700 text-white flex items-center justify-center shadow-lg">
            <Plus className="h-5 w-5" />
          </div>
          <h2 className="font-extrabold text-slate-900 dark:text-white text-lg">Naya Transfer</h2>
        </div>

        {/* Shops */}
        <div className="grid sm:grid-cols-[1fr_auto_1fr] gap-3 items-end">
          <div>
            <label className="block text-[10px] uppercase tracking-wider font-extrabold text-slate-500 dark:text-slate-400 mb-1.5">
              🏪 Kahan se
            </label>
            <select value={fromShopId} onChange={(e) => { setFromShopId(e.target.value); setDraft([]); }}
              className="h-12 w-full rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500 transition">
              <option value="">Shop chuno...</option>
              {activeShops.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div className="hidden sm:flex h-12 w-10 items-center justify-center">
            <ArrowRight className="h-5 w-5 text-cyan-500" />
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-wider font-extrabold text-slate-500 dark:text-slate-400 mb-1.5">
              🏬 Kahan bhejna hai
            </label>
            <select value={toShopId} onChange={(e) => setToShopId(e.target.value)}
              className={`h-12 w-full rounded-xl border-2 bg-white dark:bg-slate-800 px-3 text-sm font-bold text-slate-900 dark:text-white focus:outline-none transition ${
                sameShop ? 'border-rose-400' : 'border-slate-200 dark:border-slate-700 focus:border-cyan-500'
              }`}>
              <option value="">Shop chuno...</option>
              {activeShops.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        </div>

        {sameShop && (
          <div className="rounded-xl bg-rose-50 dark:bg-rose-500/10 border-2 border-rose-200 dark:border-rose-500/30 p-3 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-rose-600 dark:text-rose-400 shrink-0" />
            <p className="text-xs font-bold text-rose-800 dark:text-rose-300">Dono shop ek hi hain — alag chuno</p>
          </div>
        )}

        {/* Picker */}
        {fromShopId && !sameShop && (
          <div>
            {/* Tabs */}
            <div className="flex gap-1.5 bg-slate-100 dark:bg-slate-800 rounded-xl p-1 mb-2.5">
              {([
                { v: 'phones', label: 'Naye Phone', icon: Smartphone, n: pickCount.phones },
                { v: 'used', label: 'Used', icon: RotateCcw, n: pickCount.used },
                { v: 'accessories', label: 'Accessories', icon: Cable, n: pickCount.accessories },
              ] as const).map((t) => (
                <button key={t.v} onClick={() => setPickTab(t.v)}
                  className={`flex-1 h-10 rounded-lg text-xs font-extrabold inline-flex items-center justify-center gap-1.5 transition ${
                    pickTab === t.v
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}>
                  <t.icon className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{t.label}</span>
                  {t.n > 0 && <span className="px-1.5 rounded-full bg-slate-200 dark:bg-slate-700 text-[10px] tabular-nums">{t.n}</span>}
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="h-5 w-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input ref={pickRef} value={pickSearch} onChange={(e) => setPickSearch(e.target.value)}
                  placeholder={pickTab === 'accessories' ? 'Charger, cover, part...' : 'IMEI, code ya model... (/)'}
                  className="h-12 w-full rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 pl-11 pr-3 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500 transition" />
              </div>
              {pickTab !== 'accessories' && (
                <button onClick={() => setScannerOpen(true)}
                  className="h-12 w-14 rounded-xl bg-gradient-to-br from-slate-900 to-slate-800 dark:from-slate-700 dark:to-slate-800 text-white flex flex-col items-center justify-center gap-0.5 shadow-lg transition shrink-0">
                  <Camera className="h-4 w-4" />
                  <span className="text-[8px] font-extrabold uppercase">Scan</span>
                </button>
              )}
            </div>

            {/* Results */}
            <div className="mt-2 rounded-xl border-2 border-slate-200 dark:border-slate-700 max-h-60 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
              {loadingPick && !catalog ? (
                <div className="p-4 space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-11 rounded-lg bg-slate-100 dark:bg-slate-800 animate-pulse" />)}
                </div>
              ) : pickTab === 'phones' ? (
                pickPhones.length === 0 ? <PickEmpty q={debounced} what="naya phone" /> : pickPhones.map((p: any) => (
                  <PickRow key={p.id} onClick={() => addPhone(p)} kind="NEW"
                    title={p.productName} subtitle={p.imei1}
                    badge={p.ptaStatus ? PTA_STATUS_LABELS[p.ptaStatus as PtaStatus] : undefined}
                    badgeCfg={PTA_STATUS_COLORS[p.ptaStatus as PtaStatus]}
                    extra={p.variant?.name ?? p.color} />
                ))
              ) : pickTab === 'used' ? (
                pickUsed.length === 0 ? <PickEmpty q={debounced} what="used phone" /> : pickUsed.map((p: any) => (
                  <PickRow key={p.id} onClick={() => addUsed(p)} kind="USED"
                    title={`${p.brand} ${p.model}${p.storage ? ` ${p.storage}` : ''}`}
                    subtitle={p.usedPhoneCode}
                    badge={CONDITION_LABELS[p.condition as UsedPhoneCondition]}
                    extra={p.imei1} />
                ))
              ) : (
                pickAccessories.length === 0 ? <PickEmpty q={debounced} what="accessory" /> : pickAccessories.map((a: any) => (
                  <PickRow key={a.id} onClick={() => addAccessory(a)} kind="ACCESSORY"
                    title={a.name} subtitle={`${a.stock} ${a.unit} stock me`}
                    extra={a.brand} />
                ))
              )}
            </div>
          </div>
        )}

        {/* Draft */}
        {draft.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] uppercase tracking-wider font-extrabold text-slate-500 dark:text-slate-400">
                Bhejne wala maal ({draft.length})
              </span>
              <button onClick={resetDraft} className="text-[11px] font-extrabold text-rose-600 dark:text-rose-400 hover:underline">
                Sab hatao
              </button>
            </div>

            <div className="rounded-xl border-2 border-cyan-200 dark:border-cyan-500/30 bg-cyan-50/40 dark:bg-cyan-500/5 divide-y divide-cyan-100 dark:divide-cyan-500/20 max-h-72 overflow-y-auto">
              {draft.map((d) => {
                const meta = KIND_META[d.kind];
                const Icon = meta.icon;
                return (
                  <div key={d.key} className="p-2.5 flex items-center gap-2.5">
                    <div className={`h-9 w-9 rounded-lg bg-gradient-to-br ${meta.grad} text-white flex items-center justify-center shrink-0`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-extrabold text-slate-900 dark:text-white text-xs truncate">{d.name}</div>
                      <div className="mt-0.5 flex items-center gap-1.5 flex-wrap">
                        <span className={`px-1 py-0.5 rounded text-[9px] font-extrabold ${meta.chip}`}>{meta.label}</span>
                        {d.ref && <span className="text-[10px] font-mono font-bold text-slate-500 dark:text-slate-400">{d.ref}</span>}
                        {d.detail && <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">{d.detail}</span>}
                      </div>
                    </div>

                    {d.kind === 'ACCESSORY' ? (
                      <div className="flex items-center gap-1 shrink-0">
                        <button onClick={() => changeQty(d.key, -1)}
                          className="h-7 w-7 rounded-lg bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-700 transition">
                          <Minus className="h-3 w-3 text-slate-600 dark:text-slate-300" />
                        </button>
                        <span className="w-8 text-center font-extrabold text-sm text-slate-900 dark:text-white tabular-nums">{d.quantity}</span>
                        <button onClick={() => changeQty(d.key, 1)}
                          className="h-7 w-7 rounded-lg bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-700 transition">
                          <Plus className="h-3 w-3 text-slate-600 dark:text-slate-300" />
                        </button>
                      </div>
                    ) : (
                      <span className="text-[10px] font-extrabold text-slate-400 shrink-0">1 device</span>
                    )}

                    <button onClick={() => removeItem(d.key)}
                      className="h-8 w-8 rounded-lg bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 flex items-center justify-center hover:bg-rose-50 hover:border-rose-300 dark:hover:bg-rose-500/10 transition shrink-0">
                      <Trash2 className="h-3.5 w-3.5 text-rose-500" />
                    </button>
                  </div>
                );
              })}
            </div>

            <input value={notes} onChange={(e) => setNotes(e.target.value)}
              placeholder="Note — kis ke haath bheja, kab pahunchega... (optional)"
              className="mt-2 h-11 w-full rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500 transition" />

            <div className="mt-3 rounded-xl bg-blue-50 dark:bg-blue-500/10 border-2 border-blue-200 dark:border-blue-500/30 p-3 flex items-start gap-2">
              <Truck className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
              <p className="text-xs font-semibold text-blue-900 dark:text-blue-200 leading-relaxed">
                Bhejte hi ye maal <strong>raste mein</strong> chala jayega — na purani shop par bikega,
                na nayi par. Jab dusri shop <strong>"Wasool Karo"</strong> dabaye gi, tab wahan bikne
                ke liye khulega.
              </p>
            </div>

            <Button size="lg" fullWidth className="mt-3 bg-gradient-to-r from-cyan-600 to-teal-700 font-extrabold shadow-lg shadow-cyan-500/30"
              disabled={!canSend} loading={createMutation.isPending}
              onClick={() => createMutation.mutate()} leftIcon={<Truck className="h-4 w-4" />}>
              {draft.length} Item Rawana Karo · {formatPKR(draftValue)}
            </Button>
          </div>
        )}
      </section>

      {/* ═══ FILTER BAR ═══ */}
      <div className="rounded-2xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-slate-200 dark:border-slate-800 shadow-sm p-3 sm:p-4 space-y-3 print:hidden">
        <div className="relative">
          <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input ref={searchRef} value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Transfer #, shop, IMEI ya item dhoondo..."
            className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 pl-10 pr-10 text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500 transition" />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 h-6 w-6 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center">
              <X className="h-4 w-4 text-slate-400" />
            </button>
          )}
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {([
            { v: 'all', label: `Sab (${stats.total})` },
            { v: 'IN_TRANSIT', label: `Raste Mein (${stats.inTransit})` },
            { v: 'RECEIVED', label: `Mil Gaya (${stats.received})` },
            { v: 'CANCELLED', label: `Cancel (${stats.cancelled})` },
          ] as const).map((f) => (
            <button key={f.v} onClick={() => setStatusFilter(f.v)}
              className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition border-2 ${
                statusFilter === f.v
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-transparent shadow-sm'
                  : 'border-transparent bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* ═══ HISTORY ═══ */}
      <div className="rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-4 sm:p-5 border-b-2 border-slate-100 dark:border-slate-800 flex items-center gap-2">
          <div className="h-9 w-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center">
            <Store className="h-5 w-5" />
          </div>
          <h3 className="font-extrabold text-slate-900 dark:text-white">
            Transfers <span className="text-slate-500 dark:text-slate-400 font-bold tabular-nums">({visibleTransfers.length})</span>
          </h3>
        </div>

        {isLoading ? (
          <div className="p-4 space-y-2">
            {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-24 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />)}
          </div>
        ) : visibleTransfers.length === 0 ? (
          <div className="p-12 text-center">
            <ArrowLeftRight className="h-10 w-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
              {search || statusFilter !== 'all' ? 'In filters se kuch nahi mila' : 'Ab tak koi transfer nahi'}
            </p>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
              Upar se maal chun kar dusri shop bhejo
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {visibleTransfers.map((t: StockTransfer) => {
              const meta = STATUS_META[t.status] ?? STATUS_META.PENDING;
              const Icon = meta.icon;
              const phones = t.items.filter((i) => i.imei);
              const used = t.items.filter((i) => i.usedPhone);
              const accessories = t.items.filter((i) => !i.imei && !i.usedPhone);
              return (
                <div key={t.id} className="p-3 sm:p-4">
                  <div className="flex items-start gap-3 flex-wrap">
                    <div className={`h-11 w-11 rounded-xl flex items-center justify-center shrink-0 ${
                      t.status === 'IN_TRANSIT' ? 'bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-lg shadow-amber-500/30'
                      : t.status === 'RECEIVED' ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/30'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                    }`}>
                      <Icon className="h-5 w-5" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-extrabold text-sm text-slate-900 dark:text-white">{t.transferNumber}</span>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-extrabold uppercase ${meta.tone}`}>{meta.label}</span>
                      </div>

                      <div className="mt-1 flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 flex-wrap">
                        <span>🏪 {t.fromShop.name}</span>
                        <ArrowRight className="h-3 w-3 text-cyan-500" />
                        <span>🏬 {t.toShop.name}</span>
                      </div>

                      <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                        {phones.length > 0 && <CountChip kind="NEW" n={phones.length} />}
                        {used.length > 0 && <CountChip kind="USED" n={used.length} />}
                        {accessories.length > 0 && (
                          <CountChip kind="ACCESSORY" n={accessories.reduce((s, i) => s + i.quantity, 0)} />
                        )}
                      </div>

                      <div className="mt-1 text-[11px] font-semibold text-slate-400 dark:text-slate-500">
                        {formatDate(t.createdAt)}
                        {t.createdBy && ` · ${t.createdBy.fullName}`}
                        {t.receivedAt && ` · wasool ${formatDate(t.receivedAt)}`}
                      </div>

                      {t.notes && (
                        <div className="mt-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400 italic">{t.notes}</div>
                      )}

                      {(phones.length > 0 || used.length > 0) && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {[...phones, ...used].slice(0, 8).map((i) => (
                            <span key={i.id}
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[10px] font-mono font-bold text-slate-600 dark:text-slate-300"
                              title={i.product?.name ?? `${i.usedPhone?.brand} ${i.usedPhone?.model}`}>
                              <Hash className="h-2.5 w-2.5" />
                              {i.imei?.imei1 ?? i.usedPhone?.usedPhoneCode}
                            </span>
                          ))}
                          {phones.length + used.length > 8 && (
                            <span className="px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[10px] font-extrabold text-slate-500">
                              +{phones.length + used.length - 8} aur
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {t.status === 'IN_TRANSIT' && (
                      <div className="flex gap-1.5 shrink-0 print:hidden">
                        <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 font-extrabold"
                          loading={receiveMutation.isPending}
                          onClick={() => { if (confirm(`${t.transferNumber} ka maal wasool ho gaya?`)) receiveMutation.mutate(t.id); }}
                          leftIcon={<PackageCheck className="h-3.5 w-3.5" />}>
                          Wasool Karo
                        </Button>
                        <Button size="sm" variant="outline" loading={cancelMutation.isPending}
                          onClick={() => { if (confirm(`Cancel karna hai? Maal wapas ${t.fromShop.name} me chala jayega.`)) cancelMutation.mutate(t.id); }}>
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════
   HELPERS
   ═════════════════════════════════════════════════════════════ */

function PickRow({ onClick, kind, title, subtitle, badge, badgeCfg, extra }: any) {
  const meta = KIND_META[kind as keyof typeof KIND_META];
  const Icon = meta.icon;
  return (
    <button onClick={onClick} className="w-full p-2.5 flex items-center gap-2.5 text-left hover:bg-cyan-50 dark:hover:bg-cyan-500/10 transition">
      <div className={`h-9 w-9 rounded-lg bg-gradient-to-br ${meta.grad} text-white flex items-center justify-center shrink-0`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-extrabold text-slate-900 dark:text-white text-xs truncate">{title}</div>
        <div className="mt-0.5 flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] font-mono font-bold text-slate-500 dark:text-slate-400">{subtitle}</span>
          {badge && (
            <span className={`px-1 py-0.5 rounded text-[9px] font-extrabold uppercase ${
              badgeCfg ? `border ${badgeCfg.bg} ${badgeCfg.text} ${badgeCfg.border}` : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
            }`}>{badge}</span>
          )}
          {extra && <span className="text-[10px] font-bold text-slate-400">{extra}</span>}
        </div>
      </div>
      <Plus className="h-4 w-4 text-cyan-600 dark:text-cyan-400 shrink-0" />
    </button>
  );
}

function PickEmpty({ q, what }: { q: string; what: string }) {
  return (
    <div className="p-6 text-center">
      <PackageSearch className="h-7 w-7 text-slate-300 dark:text-slate-600 mx-auto mb-1.5" />
      <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
        {q ? `"${q}" se koi ${what} nahi mila` : `Is shop me koi ${what} stock me nahi`}
      </p>
    </div>
  );
}

function CountChip({ kind, n }: { kind: keyof typeof KIND_META; n: number }) {
  const meta = KIND_META[kind];
  const Icon = meta.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-extrabold ${meta.chip}`}>
      <Icon className="h-2.5 w-2.5" /> {n} {meta.label}
    </span>
  );
}

const KPI_TONES: Record<string, string> = {
  cyan: 'from-cyan-500 to-blue-600 shadow-cyan-500/30',
  amber: 'from-amber-500 to-orange-600 shadow-amber-500/30',
  emerald: 'from-emerald-500 to-teal-600 shadow-emerald-500/30',
  blue: 'from-blue-500 to-indigo-600 shadow-blue-500/30',
};

function Kpi({ icon: Icon, tone, label, value, sub }: any) {
  return (
    <div className="rounded-2xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-slate-200 dark:border-slate-800 shadow-sm p-3 sm:p-4 flex items-center gap-3">
      <div className={`h-11 w-11 rounded-xl bg-gradient-to-br ${KPI_TONES[tone]} text-white flex items-center justify-center shadow-lg shrink-0`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <div className="text-[10px] uppercase font-extrabold text-slate-500 dark:text-slate-400 tracking-wider truncate">{label}</div>
        <div className="font-extrabold text-slate-900 dark:text-white text-xl tabular-nums">{value}</div>
        {sub && <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 truncate">{sub}</div>}
      </div>
    </div>
  );
}

function TransferTeacher({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-2xl bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col border-2 border-transparent dark:border-slate-800">
        <div className="px-5 py-4 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-500/15 dark:to-orange-500/15 border-b-2 border-amber-200 dark:border-amber-500/30 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-lg">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-amber-700 dark:text-amber-300 font-extrabold">Guide</div>
              <h3 className="font-extrabold text-slate-900 dark:text-white">Shop Transfer Kaise Karein?</h3>
            </div>
          </div>
          <button onClick={onClose} className="h-9 w-9 rounded-xl hover:bg-white dark:hover:bg-slate-800 flex items-center justify-center transition">
            <X className="h-4 w-4 text-slate-600 dark:text-slate-300" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/50 border-2 border-slate-200 dark:border-slate-700 p-4">
            <div className="text-xs uppercase font-extrabold text-slate-500 dark:text-slate-400 tracking-wider mb-2.5">Poora Safar</div>
            <div className="flex items-center gap-2 flex-wrap">
              <FlowStep emoji="📦" label="Maal chuno" />
              <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
              <FlowStep emoji="🚚" label="Rawana karo" />
              <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
              <FlowStep emoji="🛣️" label="Raste mein" />
              <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
              <FlowStep emoji="✅" label="Wasool karo" />
            </div>
          </div>

          <Step n={1} title="Kya kya bhej sakte ho"
            body="Teen cheezein: naya phone (IMEI ke saath), used phone (trade-in stock), aur accessories — charger, cover, glass, aur repair ke parts bhi."
            tips={['Phone hamesha 1-1 karke jata hai — apne IMEI ke saath', 'Accessory ki ginti barha ghata sakte ho', 'Repair ke parts accessories mein aate hain']} />

          <Step n={2} title="Rawana karne ke baad"
            body="Maal 'raste mein' chala jata hai. Is waqt wo na purani shop par bikta hai, na nayi par — is liye do jagah ek hi phone bikne ka khatra nahi rehta."
            tips={['IMEI ka status RESERVED ho jata hai', 'Used phone IN_TRANSIT ho jata hai', 'Purani shop ka stock foran kam ho jata hai']} />

          <Step n={3} title="Dusri shop wasool kare"
            body="Jab maal pahunch jaye to 'Wasool Karo' dabao. Device nayi shop ka ho jata hai aur wahan POS par bikne ke liye khul jata hai."
            tips={['Wasool karne se pehle ginti mila lo', 'Galti se bheja to Cancel dabao — maal wapas apni shop mein']} />

          <div className="rounded-xl bg-blue-50 dark:bg-blue-500/10 border-2 border-blue-200 dark:border-blue-500/30 p-3.5">
            <div className="flex items-start gap-2">
              <Sparkles className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
              <p className="text-xs font-semibold text-blue-900 dark:text-blue-200 leading-relaxed">
                <strong>Kaam ki baat:</strong> har phone ab apni shop se juda hota hai. Is liye POS,
                low stock aur stock report — sab jagah sirf usi shop ka maal dikhta hai jo aap ne
                upar select ki hai.
              </p>
            </div>
          </div>
        </div>

        <div className="px-5 py-3.5 border-t-2 border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-right shrink-0">
          <Button onClick={onClose} className="bg-gradient-to-r from-amber-500 to-orange-600 font-extrabold shadow-lg shadow-amber-500/30">
            <CheckCircle2 className="h-4 w-4" /> Samajh Gaya
          </Button>
        </div>
      </div>
    </div>
  );
}

function FlowStep({ emoji, label }: { emoji: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 text-xs font-extrabold text-slate-700 dark:text-slate-200">
      <span>{emoji}</span> {label}
    </span>
  );
}

function Step({ n, title, body, tips }: any) {
  return (
    <div className="rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-3.5">
      <div className="flex items-start gap-3">
        <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-cyan-500 to-teal-600 text-white flex items-center justify-center font-extrabold text-sm shrink-0 shadow-md">
          {n}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-extrabold text-slate-900 dark:text-white">{title}</div>
          <div className="text-xs font-semibold text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">{body}</div>
          {tips && (
            <ul className="mt-2 space-y-1">
              {tips.map((t: string, i: number) => (
                <li key={i} className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-start gap-1.5">
                  <Sparkles className="h-2.5 w-2.5 text-amber-500 shrink-0 mt-0.5" /> {t}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function ShortcutsModal({ onClose }: { onClose: () => void }) {
  const sc = [
    ['/', 'Search par jao'],
    ['S', 'Scanner kholo'],
    ['G', 'Guide kholo'],
    ['?', 'Ye list'],
    ['Esc', 'Band karo'],
  ];
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden border-2 border-slate-200 dark:border-slate-700">
        <div className="px-5 py-4 border-b-2 border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-cyan-100 dark:bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 flex items-center justify-center">
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
              <span className="font-semibold text-slate-700 dark:text-slate-300">{desc}</span>
              <kbd className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 font-mono text-xs font-extrabold text-slate-700 dark:text-slate-200">
                {key}
              </kbd>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
