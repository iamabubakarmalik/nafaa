// apps/web/src/industries/mobile/pages/MobileStockAdjustmentsPage.tsx
import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  SlidersHorizontal, Smartphone, Search, X, Hammer, HelpCircle, Undo2,
  RefreshCw, AlertTriangle, ShieldCheck, History, FileSpreadsheet,
  PackageSearch, Wrench, Trash2, ArrowRight, Camera,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@core/ui/Button';
import { formatPKR } from '@core/lib/format';
import { useCostHidden } from '@/core/security/HiddenValue';
import BarcodeScanner from '@core/components/barcode/BarcodeScanner';
import {
  stockAdjustmentsApi,
  type AdjustmentType,
} from '@modules/inventory/stock-adjustments/api/stock-adjustments.api';
import {
  imeiApi, PTA_STATUS_LABELS, PTA_STATUS_COLORS, type PtaStatus,
} from '../api/imei.api';

/* ═════════════════════════════════════════════════════════════
   NAFAA MOBILE — STOCK ADJUSTMENT
   ─────────────────────────────────────────────────────────────
   Mobile me stock ginti se nahi, DEVICE se badalta hai. Yahan
   ek IMEI utha kar uska status badla jata hai — toot gaya, gum
   ho gaya, ya wapas stock me aa gaya. Product ka stock khud
   apne aap theek ho jata hai.
   ═════════════════════════════════════════════════════════════ */

type Action = 'DAMAGE' | 'LOSS' | 'RESTORE';

const ACTIONS: {
  key: Action;
  type: AdjustmentType;
  label: string;
  desc: string;
  icon: any;
  grad: string;
  ring: string;
  reasons: string[];
}[] = [
  {
    key: 'DAMAGE',
    type: 'DAMAGE',
    label: 'Toot Gaya',
    desc: 'Device damaged — stock se nikal jayega',
    icon: Hammer,
    grad: 'from-rose-600 to-red-700',
    ring: 'border-rose-300 dark:border-rose-500/40',
    reasons: ['Screen toot gaya', 'Paani laga', 'Board jal gaya', 'Girne se kharab', 'Shipping me damage'],
  },
  {
    key: 'LOSS',
    type: 'LOSS',
    label: 'Gum Ho Gaya',
    desc: 'Chori ya ginti me kami — stock se nikal jayega',
    icon: HelpCircle,
    grad: 'from-amber-600 to-orange-700',
    ring: 'border-amber-300 dark:border-amber-500/40',
    reasons: ['Chori ho gaya', 'Ginti me nahi mila', 'Staff se gum hua', 'Supplier ne kam bheja'],
  },
  {
    key: 'RESTORE',
    type: 'ADJUSTMENT_IN',
    label: 'Wapas Stock Me',
    desc: 'Theek ho gaya ya mil gaya — dobara bikne ke liye',
    icon: Undo2,
    grad: 'from-emerald-600 to-teal-700',
    ring: 'border-emerald-300 dark:border-emerald-500/40',
    reasons: ['Repair ho kar aa gaya', 'Mil gaya', 'Ginti ki galti theek ki', 'Customer ne wapas kiya'],
  },
];

const STATUS_TONE: Record<string, string> = {
  IN_STOCK: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
  SOLD: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
  DAMAGED: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300',
  LOST: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
  RETURNED: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300',
  RESERVED: 'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300',
};

const formatDate = (iso: string) =>
  new Intl.DateTimeFormat('en-PK', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso));

export default function MobileStockAdjustmentsPage() {
  const queryClient = useQueryClient();
  const hideCost = useCostHidden();

  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [scannerOpen, setScannerOpen] = useState(false);
  const [picked, setPicked] = useState<any>(null);
  const [action, setAction] = useState<Action | null>(null);
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 250);
    return () => clearTimeout(t);
  }, [search]);

  /* ── IMEI search (poori shop me) ── */
  const { data: results, isFetching: searching } = useQuery({
    queryKey: ['imei-adjust-search', debounced],
    queryFn: () => imeiApi.listAll({ search: debounced, limit: 40 }),
    enabled: debounced.length >= 2,
  });

  /* ── Adjustment history ── */
  const { data: history = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['stock-adjustments'],
    queryFn: stockAdjustmentsApi.list,
  });

  const imeiHistory = useMemo(
    () => history.filter((h) => h.imei),
    [history],
  );

  const stats = useMemo(() => {
    const damaged = imeiHistory.filter((h) => h.type === 'DAMAGE').length;
    const lost = imeiHistory.filter((h) => h.type === 'LOSS').length;
    const restored = imeiHistory.filter((h) => h.type === 'ADJUSTMENT_IN').length;
    return { damaged, lost, restored, total: imeiHistory.length };
  }, [imeiHistory]);

  const activeAction = ACTIONS.find((a) => a.key === action);

  const reset = () => {
    setPicked(null);
    setAction(null);
    setReason('');
    setNote('');
    setSearch('');
  };

  const adjustMutation = useMutation({
    mutationFn: () => {
      if (!picked || !activeAction) throw new Error('Pehle IMEI aur action chuno');
      return stockAdjustmentsApi.create({
        productId: picked.productId,
        imeiId: picked.id,
        type: activeAction.type,
        quantity: 1,
        reason: reason.trim(),
        note: note.trim() || undefined,
      });
    },
    onSuccess: () => {
      toast.success(`✓ ${picked?.imei1} — ${activeAction?.label}`);
      reset();
      queryClient.invalidateQueries({
        predicate: (q) => {
          const k = String(q.queryKey?.[0] ?? '');
          return [
            'stock-adjustments', 'imei-adjust-search', 'imei-list', 'imei-stats',
            'imei-global-list', 'imei-global-stats', 'mobile-pos-catalog',
            'mobile-low-stock', 'mobile-stock-aging', 'products', 'mobile-products',
          ].includes(k) || k.startsWith('mobile-reports');
        },
      });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Adjust fail hua'),
  });

  const handleBarcode = (code: string) => {
    setScannerOpen(false);
    const t = code.trim();
    if (t) { setSearch(t); toast.success(`"${t}" dhoond rahe hain...`); }
  };

  const canSubmit = picked && action && reason.trim().length > 0;

  return (
    <div className="space-y-4 sm:space-y-5 pb-10">
      {scannerOpen && <BarcodeScanner onDetected={handleBarcode} onClose={() => setScannerOpen(false)} />}

      {/* ═══ HERO ═══ */}
      <section className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-slate-950 via-violet-900 to-fuchsia-700 dark:from-slate-950 dark:via-violet-950 dark:to-fuchsia-900 text-white p-4 sm:p-6 shadow-2xl">
        <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-violet-400/25 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-fuchsia-400/20 blur-3xl pointer-events-none" />

        <div className="relative">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="min-w-0">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur-md px-3 py-1 text-[11px] font-extrabold border border-white/25 uppercase tracking-widest shadow-lg">
                <SlidersHorizontal className="h-3.5 w-3.5 text-fuchsia-300" /> Stock Adjustment
              </div>
              <h1 className="mt-3 text-2xl sm:text-3xl font-extrabold">Device ka status badlo</h1>
              <p className="mt-1 text-xs sm:text-sm font-semibold text-white/80">
                IMEI utha kar batao kya hua — stock khud theek ho jayega
              </p>
            </div>

            <button
              onClick={() => refetch()}
              disabled={isRefetching}
              className="h-10 w-10 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 flex items-center justify-center transition disabled:opacity-50 print:hidden"
              title="Refresh"
            >
              <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="mt-5 grid grid-cols-2 lg:grid-cols-4 gap-3">
            <HeroStat label="Kul Adjustments" value={String(stats.total)} icon={History} />
            <HeroStat label="Toote Hue" value={String(stats.damaged)} icon={Hammer} />
            <HeroStat label="Gum Shuda" value={String(stats.lost)} icon={HelpCircle} />
            <HeroStat label="Wapas Aaye" value={String(stats.restored)} icon={Undo2} accent />
          </div>
        </div>
      </section>

      {/* ═══ ADJUST FORM ═══ */}
      <div className="rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-slate-200 dark:border-slate-800 shadow-sm p-4 sm:p-5 space-y-4">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-xl bg-violet-100 dark:bg-violet-500/20 text-violet-700 dark:text-violet-300 flex items-center justify-center">
            <Wrench className="h-5 w-5" />
          </div>
          <h3 className="font-extrabold text-slate-900 dark:text-white">Naya Adjustment</h3>
        </div>

        {/* STEP 1 — IMEI */}
        <div>
          <StepLabel n={1} text="Device dhoondo" done={!!picked} />

          {picked ? (
            <div className="rounded-2xl border-2 border-violet-300 dark:border-violet-500/40 bg-violet-50 dark:bg-violet-500/10 p-3 flex items-center gap-3">
              <div className="h-11 w-11 rounded-xl bg-violet-600 text-white flex items-center justify-center shrink-0">
                <Smartphone className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-extrabold text-slate-900 dark:text-white text-sm truncate">
                  {picked.product?.name ?? 'Mobile'}
                  {picked.variant?.name && (
                    <span className="ml-1.5 text-violet-700 dark:text-violet-300">{picked.variant.name}</span>
                  )}
                </div>
                <div className="text-xs font-mono font-bold text-slate-600 dark:text-slate-400 mt-0.5">
                  {picked.imei1}
                </div>
                <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-extrabold uppercase ${STATUS_TONE[picked.status] ?? STATUS_TONE.IN_STOCK}`}>
                    {picked.status}
                  </span>
                  {picked.ptaStatus && (
                    <span className={`px-1.5 py-0.5 rounded border text-[10px] font-extrabold uppercase ${PTA_STATUS_COLORS[picked.ptaStatus as PtaStatus]?.bg} ${PTA_STATUS_COLORS[picked.ptaStatus as PtaStatus]?.text} ${PTA_STATUS_COLORS[picked.ptaStatus as PtaStatus]?.border}`}>
                      {PTA_STATUS_LABELS[picked.ptaStatus as PtaStatus]}
                    </span>
                  )}
                  {!hideCost && (
                    <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 tabular-nums">
                      Lagat {formatPKR(picked.costPrice ?? 0)}
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() => { setPicked(null); setAction(null); }}
                className="h-9 w-9 rounded-xl bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-700 transition shrink-0"
              >
                <X className="h-4 w-4 text-slate-500" />
              </button>
            </div>
          ) : (
            <>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="h-5 w-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    autoFocus
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="IMEI ya model likho (kam se kam 2 harf)..."
                    className="h-12 w-full rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 pl-11 pr-3 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-violet-500 transition"
                  />
                </div>
                <button
                  onClick={() => setScannerOpen(true)}
                  className="h-12 w-14 rounded-xl bg-gradient-to-br from-slate-900 to-slate-800 dark:from-slate-700 dark:to-slate-800 text-white flex flex-col items-center justify-center gap-0.5 shadow-lg transition shrink-0"
                >
                  <Camera className="h-4 w-4" />
                  <span className="text-[8px] font-extrabold uppercase">Scan</span>
                </button>
              </div>

              {debounced.length >= 2 && (
                <div className="mt-2 rounded-xl border-2 border-slate-200 dark:border-slate-700 max-h-64 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                  {searching ? (
                    <div className="p-4 space-y-2">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="h-12 rounded-lg bg-slate-100 dark:bg-slate-800 animate-pulse" />
                      ))}
                    </div>
                  ) : (results?.items ?? []).length === 0 ? (
                    <div className="p-6 text-center">
                      <PackageSearch className="h-7 w-7 text-slate-300 dark:text-slate-600 mx-auto mb-1.5" />
                      <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
                        "{debounced}" se koi device nahi mila
                      </p>
                    </div>
                  ) : (
                    (results?.items ?? []).map((im: any) => (
                      <button
                        key={im.id}
                        onClick={() => { setPicked(im); setSearch(''); }}
                        disabled={im.status === 'SOLD'}
                        className={`w-full p-2.5 flex items-center gap-2.5 text-left transition ${
                          im.status === 'SOLD'
                            ? 'opacity-40 cursor-not-allowed'
                            : 'hover:bg-violet-50 dark:hover:bg-violet-500/10'
                        }`}
                      >
                        <div className="h-9 w-9 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                          <Smartphone className="h-4 w-4 text-slate-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-extrabold text-slate-900 dark:text-white text-xs truncate">
                            {im.product?.name ?? 'Mobile'}
                            {im.variant?.name && (
                              <span className="ml-1 text-violet-700 dark:text-violet-400">{im.variant.name}</span>
                            )}
                          </div>
                          <div className="text-[11px] font-mono font-bold text-slate-500 dark:text-slate-400">
                            {im.imei1}
                          </div>
                        </div>
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase shrink-0 ${STATUS_TONE[im.status] ?? STATUS_TONE.IN_STOCK}`}>
                          {im.status === 'SOLD' ? 'bik chuka' : im.status}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* STEP 2 — ACTION */}
        {picked && (
          <div>
            <StepLabel n={2} text="Kya hua?" done={!!action} />
            <div className="grid sm:grid-cols-3 gap-2">
              {ACTIONS.map((a) => {
                const disabled = a.key === 'RESTORE' ? picked.status === 'IN_STOCK' : picked.status !== 'IN_STOCK';
                const selected = action === a.key;
                return (
                  <button
                    key={a.key}
                    onClick={() => { setAction(a.key); setReason(''); }}
                    disabled={disabled}
                    title={disabled
                      ? a.key === 'RESTORE'
                        ? 'Ye device pehle hi stock me hai'
                        : 'Sirf stock wale device par lagta hai'
                      : undefined}
                    className={`rounded-2xl border-2 p-3 text-left transition active:scale-[0.98] ${
                      disabled
                        ? 'opacity-40 cursor-not-allowed border-slate-200 dark:border-slate-700'
                        : selected
                          ? `${a.ring} bg-slate-50 dark:bg-slate-800/60 shadow-md`
                          : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                    }`}
                  >
                    <div className={`h-9 w-9 rounded-xl bg-gradient-to-br ${a.grad} text-white flex items-center justify-center shadow mb-2`}>
                      <a.icon className="h-4 w-4" />
                    </div>
                    <div className="font-extrabold text-slate-900 dark:text-white text-sm">{a.label}</div>
                    <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                      {a.desc}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* STEP 3 — REASON */}
        {picked && activeAction && (
          <div>
            <StepLabel n={3} text="Wajah likho" done={reason.trim().length > 0} />

            <div className="flex flex-wrap gap-1.5 mb-2">
              {activeAction.reasons.map((r) => (
                <button
                  key={r}
                  onClick={() => setReason(r)}
                  className={`px-2.5 h-8 rounded-lg text-[11px] font-extrabold border-2 transition ${
                    reason === r
                      ? 'bg-violet-600 text-white border-transparent shadow'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-violet-300'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>

            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ya apni wajah likho..."
              className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-violet-500 transition"
            />
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder="Tafseel (optional)..."
              className="mt-2 w-full rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-violet-500 transition resize-none"
            />

            <div className="mt-3 rounded-xl bg-amber-50 dark:bg-amber-500/10 border-2 border-amber-200 dark:border-amber-500/30 p-3 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <p className="text-xs font-semibold text-amber-900 dark:text-amber-200 leading-relaxed">
                <strong>{picked.imei1}</strong> ka status{' '}
                <span className="font-mono">{picked.status}</span> se{' '}
                <span className="font-mono">
                  {activeAction.key === 'DAMAGE' ? 'DAMAGED' : activeAction.key === 'LOSS' ? 'LOST' : 'IN_STOCK'}
                </span>{' '}
                ho jayega. Product ka stock khud apne aap theek ho jayega.
              </p>
            </div>

            <div className="mt-3 flex gap-2">
              <Button
                size="lg"
                className="flex-1 bg-gradient-to-r from-violet-600 to-fuchsia-700 font-extrabold shadow-lg shadow-violet-500/30"
                disabled={!canSubmit}
                loading={adjustMutation.isPending}
                onClick={() => adjustMutation.mutate()}
                leftIcon={<ArrowRight className="h-4 w-4" />}
              >
                Adjust Karo
              </Button>
              <Button size="lg" variant="outline" onClick={reset}>Cancel</Button>
            </div>
          </div>
        )}
      </div>

      {/* ═══ HISTORY ═══ */}
      <div className="rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-4 sm:p-5 border-b-2 border-slate-100 dark:border-slate-800 flex items-center gap-2">
          <div className="h-9 w-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center">
            <History className="h-5 w-5" />
          </div>
          <h3 className="font-extrabold text-slate-900 dark:text-white">
            Device History{' '}
            <span className="text-slate-500 dark:text-slate-400 font-bold tabular-nums">({imeiHistory.length})</span>
          </h3>
        </div>

        {isLoading ? (
          <div className="p-4 space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-16 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
            ))}
          </div>
        ) : imeiHistory.length === 0 ? (
          <div className="p-10 text-center">
            <ShieldCheck className="h-8 w-8 text-emerald-400 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Ab tak koi adjustment nahi</p>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
              Achhi baat hai — koi device toota ya gum nahi hua
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {imeiHistory.map((h) => {
              const meta = ACTIONS.find((a) => a.type === h.type);
              const Icon = meta?.icon ?? Trash2;
              return (
                <div key={h.id} className="p-3 sm:p-4 flex items-start gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                  <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${meta?.grad ?? 'from-slate-500 to-slate-600'} text-white flex items-center justify-center shadow shrink-0`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-extrabold text-slate-900 dark:text-white text-sm truncate">
                      {h.product.name}
                      {h.variant?.name && (
                        <span className="ml-1.5 text-violet-700 dark:text-violet-400">{h.variant.name}</span>
                      )}
                    </div>
                    <div className="text-[11px] font-mono font-bold text-slate-600 dark:text-slate-400 mt-0.5">
                      {h.imei?.imei1}
                    </div>
                    <div className="mt-1 text-xs font-semibold text-slate-600 dark:text-slate-300">{h.reason}</div>
                    <div className="mt-1 flex items-center gap-2 flex-wrap text-[10px] font-bold text-slate-400 dark:text-slate-500">
                      <span>{formatDate(h.createdAt)}</span>
                      {h.createdBy && <span>· {h.createdBy.fullName}</span>}
                    </div>
                  </div>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-extrabold uppercase shrink-0 ${STATUS_TONE[h.imei?.status ?? ''] ?? STATUS_TONE.IN_STOCK}`}>
                    {h.imei?.status}
                  </span>
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

function StepLabel({ n, text, done }: { n: number; text: string; done?: boolean }) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <span className={`h-6 w-6 rounded-lg flex items-center justify-center text-[11px] font-extrabold transition ${
        done
          ? 'bg-emerald-600 text-white'
          : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
      }`}>
        {n}
      </span>
      <span className="text-xs uppercase font-extrabold text-slate-600 dark:text-slate-400 tracking-wider">
        {text}
      </span>
    </div>
  );
}

function HeroStat({ label, value, icon: Icon, accent }: any) {
  return (
    <div className={`rounded-2xl backdrop-blur-md border p-3 ${
      accent ? 'bg-emerald-400/20 border-emerald-300/40' : 'bg-white/10 border-white/20'
    }`}>
      <div className="flex items-center gap-1.5 text-[10px] uppercase font-extrabold text-white/70 tracking-wider">
        <Icon className="h-3.5 w-3.5" /> {label}
      </div>
      <div className="mt-1 text-xl sm:text-2xl font-extrabold tabular-nums truncate">{value}</div>
    </div>
  );
}
