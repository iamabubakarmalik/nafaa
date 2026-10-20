/**
 * New adjustment: one or many products, each with its own type (in, out,
 * damaged, lost) and quantity in any of the product's units. Variant
 * products need a variant, carpet products a roll and roll action, IMEI
 * products a device; electronics may tie a damaged or returned piece to its
 * serial. Expiry-tracked goods pick the batch going out, or name the batch
 * and expiry coming in. Every line shows branch stock before and after and
 * the value in rupees. Plain lines are saved together; roll and device lines one by one.
 */

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AlertTriangle, ArrowRight, Boxes, CalendarClock, ChevronDown, Cpu, Layers, PackageSearch, Ruler, Smartphone, Trash2 } from 'lucide-react';
import { Button, Kbd, Modal } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { useBusinessFeatures } from '@core/hooks/useBusinessFeatures';
import { useIsAllShops, useShopParam } from '@core/stores/auth.store';
import { useMasked } from '@modules/dashboard/engine/useMasked';
import { settingsApi } from '@modules/organization/settings/api/settings.api';
import { useIndustryStockPresets } from '@industries/_shared/presets';
import { useCurrentIndustry } from '@industries/_shared/registry/useCurrentIndustry';
import { imeiApi } from '@industries/mobile/api/imei.api';
import { serialTrackingApi } from '@industries/electronics/api/serial-tracking.api';
import { usePurchaseSources, type Source, type UnitChoice } from '@modules/purchasing/purchases/editor/sources';
import { productBatchesApi } from '@modules/inventory/products/api/product-batches.api';
import {
  stockAdjustmentsApi, type AdjustmentBatchFields, type AdjustmentOptions, type AdjustmentType, type CreateAdjustmentPayload, type RollAction,
} from '../api/stock-adjustments.api';
import { BranchPicker } from './BranchPicker';
import { ProductSearch } from './ProductSearch';
import { ADJ_KEY, QUICK_REASONS, STOCK_KEYS, TYPES, TYPE_ORDER, qtyText } from './meta';

type Mode = 'loading' | 'plain' | 'variant' | 'roll' | 'imei';

interface Line {
  key: string;
  source: Source;
  unit: UnitChoice;
  type: AdjustmentType;
  qty: string;
  variantId: string;
  rollId: string;
  rollAction: RollAction;
  ft: string;
  inch: string;
  imeiId: string;
  /** Electronics serial tied to this line (marked defective or returned after saving). */
  serialId: string;
  /** Stock out: batch taken first. */
  batchId: string;
  /** Stock in: batch number, expiry and manufacture date (YYYY-MM-DD). */
  batchNo: string;
  expiry: string;
  mfg: string;
}

const ROLL_ACTIONS: Array<{ value: RollAction; label: string; type?: AdjustmentType }> = [
  { value: 'ADJUST_LENGTH', label: 'Lambai badlein' },
  { value: 'MARK_DAMAGED', label: 'Poora roll kharab', type: 'DAMAGE' },
  { value: 'MARK_LOST', label: 'Roll gum', type: 'LOSS' },
  { value: 'RESTORE', label: 'Wapas chalu', type: 'ADJUSTMENT_IN' },
];

const IMEI_STATUS: Record<string, string> = { IN_STOCK: 'Stock me', DAMAGED: 'Kharab', LOST: 'Gum', RETURNED: 'Wapas aaya', RESERVED: 'Rakha hua' };

const optionsKey = (shop: string | undefined, productId: string) => [ADJ_KEY, 'options', shop ?? 'default', productId];

function modeOf(o: AdjustmentOptions | undefined): Mode {
  if (!o) return 'loading';
  if (o.carpetRolls.length) return 'roll';
  if (o.imeis.length) return 'imei';
  if (o.variants.length) return 'variant';
  return 'plain';
}

/** Batch details sent with a plain or variant line. */
function batchOf(l: Line): AdjustmentBatchFields {
  if (TYPES[l.type].sign < 0) return l.batchId ? { batchId: l.batchId } : {};
  const batchNumber = l.batchNo.trim();
  if (!batchNumber) return {};
  return { batchNumber, ...(l.expiry && { expiryDate: l.expiry }), ...(l.mfg && { manufactureDate: l.mfg }) };
}

const dayText = (iso: string) => new Date(iso).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: '2-digit' });
const expired = (iso?: string | null) => !!iso && new Date(iso).getTime() < Date.now();

/** Type actually saved: a whole-roll action fixes it. */
const lineType = (l: Line, mode: Mode): AdjustmentType =>
  (mode === 'roll' && ROLL_ACTIONS.find((a) => a.value === l.rollAction)?.type) || l.type;

/** Base quantity, branch stock before/after and value for plain and variant lines. */
function preview(l: Line, o: AdjustmentOptions | undefined) {
  if (!o) return null;
  const v = l.variantId ? o.variants.find((x) => x.id === l.variantId) : undefined;
  if (o.variants.length && !v) return null;
  const base = (Number(l.qty) || 0) * l.unit.rate;
  const before = Number((v ? v.branchStock ?? v.stock : o.product.branchStock ?? o.product.stock) ?? 0);
  const cost = Number(v?.costPrice) || Number(o.product.costPrice) || l.source.cost;
  return { base, before, after: before + TYPES[l.type].sign * base, value: base * cost, branch: (v ? v.branchStock : o.product.branchStock) !== null };
}

export function AdjustmentForm({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const shopId = useShopParam();
  const allShops = useIsAllShops();
  const industry = useCurrentIndustry();
  const presets = useIndustryStockPresets();
  const features = useBusinessFeatures();
  const tracksBatches = features.has('batches') || features.has('expiry');
  const { cost: money } = useMasked();
  const { sources, byCode, loading } = usePurchaseSources(false);
  const [lines, setLines] = useState<Line[]>([]);
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');

  const settingsQ = useQuery({ queryKey: ['settings'], queryFn: () => settingsApi.get(), staleTime: 5 * 60_000 });
  const allowNegative = !!settingsQ.data?.settings?.allowNegativeStock;
  const reasonsQ = useQuery({ queryKey: [ADJ_KEY, 'reasons'], queryFn: stockAdjustmentsApi.reasons, staleTime: 5 * 60_000 });
  const optionsQs = useQueries({
    queries: lines.map((l) => ({ queryKey: optionsKey(shopId, l.source.id), queryFn: () => stockAdjustmentsApi.getOptions(l.source.id), staleTime: 30_000 })),
  });
  const optionsOf = (i: number) => optionsQs[i]?.data;

  const add = (s: Source, unit: UnitChoice, extra: Partial<Line> = {}) => {
    // Scanning the same plain product again adds one to its line; rolls, devices and variants get a new line.
    const plain = !s.hasVariants && !extra.imeiId && !extra.serialId && modeOf(qc.getQueryData<AdjustmentOptions>(optionsKey(shopId, s.id))) !== 'roll'
      && modeOf(qc.getQueryData<AdjustmentOptions>(optionsKey(shopId, s.id))) !== 'imei';
    setLines((prev) => {
      const same = plain ? prev.findIndex((l) => l.source.id === s.id && l.unit.name === unit.name && !l.serialId) : -1;
      if (same >= 0) {
        return prev.map((l, i) => (i === same ? { ...l, qty: String((Number(l.qty) || 0) + 1) } : l));
      }
      const type = prev[prev.length - 1]?.type ?? 'ADJUSTMENT_OUT';
      return [...prev, {
        key: `${s.id}-${Date.now()}`, source: s, unit, type, qty: '1', variantId: '', rollId: '', rollAction: 'ADJUST_LENGTH',
        ft: '', inch: '', imeiId: '', serialId: '', batchId: '', batchNo: '', expiry: '', mfg: '', ...extra,
      }];
    });
  };
  const patch = (key: string, p: Partial<Line>) => setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...p } : l)));

  /** A scanned code that is not a product: try a phone IMEI or an electronics serial. */
  const onMiss = async (code: string) => {
    try {
      if (industry?.id === 'mobile') {
        const hit = (await imeiApi.listAll({ search: code, limit: 1 })).items[0];
        const s = hit && sources.find((x) => x.id === hit.productId);
        if (s) { add(s, s.units[0], { imeiId: hit.id, type: 'DAMAGE' }); toast.success(`${s.name} · IMEI ${hit.imei1}`); return; }
      }
      if (industry?.id === 'electronics') {
        const hit = await serialTrackingApi.lookup(code);
        const s = hit && sources.find((x) => x.id === hit.productId);
        if (hit && s) { add(s, s.units[0], { serialId: hit.id, type: 'DAMAGE', qty: '1' }); toast.success(`${s.name} · serial ${hit.serialNumber}`); return; }
      }
    } catch { /* fall through to the message below */ }
    toast.error(`"${code}" kisi product ya device se nahi mila`);
  };

  const mainType = lines.length ? lineType(lines[0], modeOf(optionsOf(0))) : 'ADJUSTMENT_OUT';
  const chips = useMemo(() => {
    const own = presets.damageReasons.filter((r) => r.category === mainType).map((r) => r.reason);
    return [...new Set([...QUICK_REASONS[mainType], ...own, ...(reasonsQ.data ?? []), ...presets.adjustmentReasons])].filter((r) => r && r !== 'Stock ginti').slice(0, 14);
  }, [mainType, presets, reasonsQ.data]);

  const problems: string[] = [];
  if (!lines.length) problems.push('Kam se kam ek product jorein');
  lines.forEach((l, i) => {
    const o = optionsOf(i);
    const mode = modeOf(o);
    const n = l.source.name;
    if (mode === 'loading') problems.push(`${n}: load ho raha hai`);
    if (mode === 'variant' && !l.variantId) problems.push(`${n}: type (variant) chunein`);
    if (mode === 'roll' && !l.rollId) problems.push(`${n}: roll chunein`);
    if (mode === 'roll' && l.rollAction === 'ADJUST_LENGTH' && !(Number(l.ft) > 0 || Number(l.inch) > 0)) problems.push(`${n}: lambai likhein`);
    if (mode === 'imei' && !l.imeiId) problems.push(`${n}: device (IMEI) chunein`);
    if ((mode === 'plain' || mode === 'variant') && !(Number(l.qty) > 0)) problems.push(`${n}: quantity likhein`);
    const p = (mode === 'plain' || mode === 'variant') ? preview(l, o) : null;
    if (p && p.after < 0 && !allowNegative) problems.push(`${n}: itna stock nahi (abhi ${qtyText(p.before)} ${l.source.baseUnit})`);
    if (TYPES[l.type].sign > 0 && (l.expiry || l.mfg) && !l.batchNo.trim()) problems.push(`${n}: expiry ke saath batch number bhi likhein`);
    if (l.expiry && l.mfg && l.mfg > l.expiry) problems.push(`${n}: banne ki date expiry ke baad nahi ho sakti`);
  });
  if (!reason.trim()) problems.push('Wajah likhein');
  const totalValue = lines.reduce((s, l, i) => {
    const o = optionsOf(i);
    const mode = modeOf(o);
    if (mode === 'imei') return s + (o!.imeis.find((d) => d.id === l.imeiId)?.costPrice ?? 0) * TYPES[l.type].sign;
    return mode === 'plain' || mode === 'variant' ? s + (preview(l, o)?.value ?? 0) * TYPES[l.type].sign : s;
  }, 0);

  const save = useMutation({
    mutationFn: async () => {
      if (problems.length) throw new Error(problems[0]);
      const r = reason.trim();
      const n = note.trim() || undefined;
      const modes = lines.map((_, i) => modeOf(optionsOf(i)));
      const plain = lines.filter((_, i) => modes[i] === 'plain' || modes[i] === 'variant');
      const special = lines.filter((_, i) => modes[i] === 'roll' || modes[i] === 'imei');
      const done: string[] = [];
      try {
        if (plain.length > 1 || plain.some((l) => l.unit.rate !== 1)) {
          await stockAdjustmentsApi.batch({
            shopId, reason: r, note: n,
            items: plain.map((l) => ({
              productId: l.source.id, variantId: l.variantId || undefined, type: l.type, quantity: Number(l.qty),
              ...(l.unit.rate !== 1 && { unitName: l.unit.name, conversionRate: l.unit.rate }),
              ...batchOf(l),
            })),
          });
        } else if (plain.length === 1) {
          const l = plain[0];
          await stockAdjustmentsApi.create({ productId: l.source.id, shopId, variantId: l.variantId || undefined, type: l.type, quantity: Number(l.qty), reason: r, note: n, ...batchOf(l) });
        }
        done.push(...plain.map((l) => l.key));
        for (const l of plain.filter((x) => x.serialId)) {
          await (l.type === 'DAMAGE' ? serialTrackingApi.markDefective(l.serialId, r) : serialTrackingApi.returnSerial(l.serialId, r));
        }
        for (const l of special) {
          const mode = modes[lines.indexOf(l)];
          const payload: CreateAdjustmentPayload = { productId: l.source.id, shopId, type: lineType(l, mode), quantity: 1, reason: r, note: n };
          if (mode === 'imei') payload.imeiId = l.imeiId;
          else {
            const roll = optionsOf(lines.indexOf(l))?.carpetRolls.find((x) => x.id === l.rollId);
            payload.carpetRollId = l.rollId;
            payload.rollAction = l.rollAction;
            if (l.rollAction === 'ADJUST_LENGTH') {
              payload.lengthFt = Number(l.ft) || 0;
              payload.lengthInch = Number(l.inch) || 0;
              payload.quantity = Math.max(payload.lengthFt + payload.lengthInch / 12, 0.01);
            } else payload.quantity = Math.max(roll?.remainingSqft ?? 0, 0.01);
          }
          await stockAdjustmentsApi.create(payload);
          done.push(l.key);
        }
      } catch (e) {
        // Keep only the lines that did not save, so a retry does not repeat them.
        if (done.length) setLines((prev) => prev.filter((l) => !done.includes(l.key)));
        throw e;
      }
      return lines.length;
    },
    onSuccess: (count) => {
      toast.success(count > 1 ? `${count} lines save — stock theek ho gaya` : 'Adjustment save — stock theek ho gaya');
      STOCK_KEYS.forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
      onClose();
    },
    onError: (e: { response?: { data?: { message?: string | string[] } }; message?: string }) => {
      const m = e?.response?.data?.message;
      toast.error((Array.isArray(m) ? m[0] : m) || e?.message || 'Save nahi hua');
      qc.invalidateQueries({ queryKey: [ADJ_KEY] });
    },
  });

  // Ctrl/Cmd + Enter saves.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && !save.isPending) { e.preventDefault(); save.mutate(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <Modal open onClose={onClose} size="xl" title="Naya adjustment" closeOnBackdrop={false}
      description="Stock haath se theek karein — barhayein, kam karein, kharab ya gum likhein"
      footer={allShops ? <Button variant="secondary" onClick={onClose}>Band karein</Button> : <>
        <span className="mr-auto hidden items-center gap-1.5 text-[0.75rem] text-slate-500 sm:inline-flex"><Kbd>Ctrl</Kbd>+<Kbd>Enter</Kbd> save</span>
        <Button variant="secondary" onClick={onClose}>Rehne dein</Button>
        <Button onClick={() => save.mutate()} loading={save.isPending} disabled={!lines.length}>
          Save karein{lines.length > 1 ? ` (${lines.length})` : ''}
        </Button>
      </>}>
      {allShops ? <BranchPicker what="Adjustment" /> : (
        <div className="space-y-4">
          <div>
            <ProductSearch sources={sources} byCode={byCode} loading={loading} onPick={(s, u) => add(s, u)}
              onMiss={industry?.id === 'mobile' || industry?.id === 'electronics' ? onMiss : undefined}
              placeholder={industry?.id === 'mobile' ? 'Product, barcode ya IMEI…' : 'Product ka naam, SKU ya barcode…'} />
            <p className="mt-1 text-[0.75rem] text-slate-500">Naam likh kar Enter dabayein ya barcode scan karein. Kai products ek sath jor sakte hain.</p>
          </div>

          {!lines.length ? (
            <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center">
              <PackageSearch className="mx-auto h-9 w-9 text-slate-300" />
              <p className="mt-2 text-sm font-semibold text-slate-800">Upar se product search</p>
              <p className="mt-0.5 text-[0.8125rem] text-slate-500">Har product ke liye chunein: barhayein, kam karein, kharab ya gum</p>
            </div>
          ) : (
            <ul className="space-y-2.5">
              {lines.map((l, i) => (
                <LineCard key={l.key} line={l} options={optionsOf(i)} failed={!!optionsQs[i]?.isError} shopId={shopId} money={money} allowNegative={allowNegative}
                  tracksBatches={tracksBatches} electronics={industry?.id === 'electronics'} onChange={(p) => patch(l.key, p)} onRemove={() => setLines((prev) => prev.filter((x) => x.key !== l.key))} />
              ))}
            </ul>
          )}

          <div className="grid gap-3 lg:grid-cols-2">
            <div>
              <label htmlFor="adj-reason" className="mb-1.5 block text-[0.8125rem] font-medium text-slate-700">Wajah <span className="text-rose-600">*</span></label>
              <input id="adj-reason" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={120} placeholder="Maslan: Toot gaya, Ginti me kam nikla"
                className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15" />
              <p className="mt-1 text-[0.75rem] text-slate-500">Yahan likhein kyun stock badla — baad me report me isi se pata chalta hai maal kahan gaya.</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {chips.map((c) => (
                  <button key={c} type="button" onClick={() => setReason(c)}
                    className={cn('rounded-full px-2.5 py-1 text-[0.75rem] font-medium ring-1 transition', reason === c ? 'bg-brand-600 text-white ring-brand-600' : 'bg-white text-slate-700 ring-slate-200 hover:bg-slate-50')}>
                    {c}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label htmlFor="adj-note" className="mb-1.5 block text-[0.8125rem] font-medium text-slate-700">Note</label>
              <textarea id="adj-note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} rows={3} placeholder="Zaroorat ho to details — kis ne dekha, kahan rakha tha…"
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15" />
              <p className="mt-1 text-[0.75rem] text-slate-500">Marzi hai. Har line ke sath save hota hai.</p>
            </div>
          </div>

          {lines.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-slate-50 px-4 py-3 ring-1 ring-slate-200">
              <span className="text-[0.8125rem] text-slate-600">{lines.length} line · kul asar</span>
              <span className={cn('text-lg font-bold tabular-nums', totalValue >= 0 ? 'text-emerald-700' : 'text-rose-700')}>
                {totalValue >= 0 ? '+' : '−'}{money(Math.abs(totalValue))}
              </span>
            </div>
          )}
          {lines.length > 0 && problems.length > 0 && (
            <p className="flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2 text-[0.8125rem] text-amber-900 ring-1 ring-amber-200">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {problems[0]}{problems.length > 1 ? ` (+${problems.length - 1} aur)` : ''}
            </p>
          )}
        </div>
      )}
    </Modal>
  );
}

/* ───────────────────────── one line ───────────────────────── */

function LineCard({ line: l, options: o, failed, shopId, money, allowNegative, tracksBatches, electronics, onChange, onRemove }: {
  line: Line;
  options?: AdjustmentOptions;
  failed: boolean;
  shopId?: string;
  money: (n: number) => string;
  allowNegative: boolean;
  /** The business tracks batches or expiry; batch details are offered on stock in. */
  tracksBatches: boolean;
  electronics: boolean;
  onChange: (p: Partial<Line>) => void;
  onRemove: () => void;
}) {
  const mode = modeOf(o);
  const type = lineType(l, mode);
  const [deviceQuery, setDeviceQuery] = useState('');
  const withSerial = electronics && (mode === 'plain' || mode === 'variant') && (l.type === 'DAMAGE' || l.type === 'ADJUSTMENT_OUT');
  const serialsQ = useQuery({
    queryKey: [ADJ_KEY, 'serials', shopId ?? 'default', l.source.id],
    queryFn: () => serialTrackingApi.list({ productId: l.source.id, status: 'IN_STOCK', shopId }),
    enabled: withSerial,
    staleTime: 30_000,
  });
  const p = mode === 'plain' || mode === 'variant' ? preview(l, o) : null;
  const plainLine = (mode === 'plain' || mode === 'variant') && (mode === 'plain' || !!l.variantId) && !l.serialId;
  const batchesQ = useQuery({
    queryKey: [ADJ_KEY, 'batches', shopId ?? 'default', l.source.id],
    queryFn: () => productBatchesApi.list(l.source.id),
    enabled: mode === 'plain' || mode === 'variant',
    staleTime: 30_000,
  });
  // A batch belongs to one variant (or to the plain item), the same as its stock.
  const ownBatches = (batchesQ.data ?? []).filter((b) => (b.variantId ?? '') === (l.variantId || ''));
  const outBatches = ownBatches.filter((b) => b.isActive && Number(b.quantity) > 0);
  const out = TYPES[l.type].sign < 0;
  const pickedBatch = outBatches.find((b) => b.id === l.batchId);
  const [batchOpen, setBatchOpen] = useState(!!(l.batchNo || l.expiry));
  const showIn = plainLine && !out && (tracksBatches || ownBatches.length > 0);
  const showOut = plainLine && out && outBatches.length > 0;
  const roll = o?.carpetRolls.find((r) => r.id === l.rollId);
  const devices = (o?.imeis ?? []).filter((d) => (l.type === 'ADJUSTMENT_IN' ? d.status !== 'IN_STOCK' : d.status === 'IN_STOCK' || (l.type === 'LOSS' && d.status === 'DAMAGED')))
    .filter((d) => !deviceQuery.trim() || `${d.imei1} ${d.imei2 ?? ''} ${d.color ?? ''} ${d.variant?.name ?? ''}`.toLowerCase().includes(deviceQuery.trim().toLowerCase()));
  const device = o?.imeis.find((d) => d.id === l.imeiId);

  return (
    <li className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
          {mode === 'roll' ? <Ruler className="h-4 w-4" /> : mode === 'imei' ? <Smartphone className="h-4 w-4" /> : mode === 'variant' ? <Layers className="h-4 w-4" /> : <Boxes className="h-4 w-4" />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-900">{l.source.name}</p>
          <p className="text-[0.75rem] text-slate-500">
            {l.source.sku ? `${l.source.sku} · ` : ''}
            {mode === 'loading' ? (failed ? 'Details load nahi hui' : 'Load ho raha hai…') : mode === 'roll' ? `${o!.carpetRolls.length} roll` : mode === 'imei' ? `${o!.imeis.length} device` : mode === 'variant' ? `${o!.variants.length} variants` : `Branch stock ${qtyText(o!.product.branchStock ?? o!.product.stock)} ${l.source.baseUnit}`}
          </p>
        </div>
        <button type="button" onClick={onRemove} aria-label="Hatayein" className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button>
      </div>

      {mode === 'roll' && (
        <div className="mt-3">
          <p className="mb-1 text-[0.75rem] font-medium text-slate-600">Roll ke sath kya karna hai</p>
          <div className="flex flex-wrap gap-1.5">
            {ROLL_ACTIONS.map((a) => (
              <button key={a.value} type="button" onClick={() => onChange({ rollAction: a.value })}
                className={cn('rounded-lg px-2.5 py-1.5 text-[0.75rem] font-semibold ring-1 transition', l.rollAction === a.value ? 'bg-slate-900 text-white ring-slate-900' : 'bg-white text-slate-700 ring-slate-200 hover:bg-slate-50')}>
                {a.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {(mode !== 'roll' || l.rollAction === 'ADJUST_LENGTH') && (
        <div className="mt-3">
          <TypePicker value={l.type} onChange={(t) => onChange({ type: t, imeiId: '', serialId: '', batchId: '' })}
            types={mode === 'imei' || mode === 'roll' ? TYPE_ORDER.filter((t) => t !== 'OPENING_BALANCE') : TYPE_ORDER} />
          <p className="mt-1 text-[0.6875rem] text-slate-500">
            {mode === 'imei' && l.type === 'ADJUSTMENT_IN' ? 'Kharab ya gum device theek ho kar wapas aaya — dobara bikne ke liye stock me.' : TYPE_HINT[l.type]}
          </p>
        </div>
      )}

      {mode === 'variant' && (
        <div className="mt-3">
          <p className="mb-1 text-[0.75rem] font-medium text-slate-600">Type (variant) <span className="text-rose-600">*</span></p>
          <div className="flex flex-wrap gap-1.5">
            {o!.variants.map((v) => (
              <button key={v.id} type="button" onClick={() => onChange({ variantId: v.id, batchId: '' })}
                className={cn('inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[0.75rem] font-medium ring-1 transition', l.variantId === v.id ? 'bg-brand-600 text-white ring-brand-600' : 'bg-white text-slate-700 ring-slate-200 hover:bg-slate-50')}>
                {v.colorHex && <span className="h-2.5 w-2.5 rounded-full ring-1 ring-black/10" style={{ background: v.colorHex }} />}
                {v.name}<span className="opacity-70">· {qtyText(v.branchStock ?? v.stock)}</span>
              </button>
            ))}
          </div>
          <p className="mt-1 text-[0.6875rem] text-slate-500">Is product ke variants hain — jis ka stock badalna hai woh chunein.</p>
        </div>
      )}

      {(mode === 'plain' || mode === 'variant') && (
        <div className="mt-3 grid gap-3 sm:grid-cols-[12rem_minmax(0,1fr)]">
          <div>
            <div className="flex">
              <input inputMode="decimal" value={l.qty} disabled={!!l.serialId} onChange={(e) => onChange({ qty: e.target.value.replace(/[^\d.]/g, '') })} aria-label="Quantity"
                className={cn('h-10 w-full min-w-0 border border-slate-200 bg-white px-3 text-right text-base font-semibold tabular-nums text-slate-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15 disabled:bg-slate-50', l.source.units.length > 1 ? 'rounded-l-xl' : 'rounded-xl')} />
              {l.source.units.length > 1 && (
                <select value={l.unit.name} onChange={(e) => onChange({ unit: l.source.units.find((u) => u.name === e.target.value) ?? l.unit })} aria-label="Unit"
                  className="h-10 rounded-r-xl border border-l-0 border-slate-200 bg-slate-50 px-2 text-[0.8125rem] font-medium text-slate-700 outline-none">
                  {l.source.units.map((u) => <option key={u.name} value={u.name}>{u.name}{u.rate !== 1 ? ` (${qtyText(u.rate)})` : ''}</option>)}
                </select>
              )}
            </div>
            <p className="mt-1 text-[0.6875rem] text-slate-500">
              {l.unit.rate !== 1 ? `1 ${l.unit.name} = ${qtyText(l.unit.rate)} ${l.source.baseUnit}` : `Kitne ${l.source.baseUnit}`}
            </p>
          </div>
          {p && (
            <div className={cn('flex flex-wrap items-center justify-between gap-2 rounded-xl px-3 py-2 ring-1', p.after < 0 ? 'bg-rose-50 ring-rose-200' : 'bg-slate-50 ring-slate-200')}>
              <span className="text-[0.8125rem] text-slate-600">
                {p.branch ? 'Abhi branch me' : 'Abhi'} <b className="tabular-nums text-slate-900">{qtyText(p.before)}</b>
                <ArrowRight className="mx-1 inline h-3.5 w-3.5 text-slate-400" />
                baad me <b className={cn('tabular-nums', p.after < 0 ? 'text-rose-700' : 'text-slate-900')}>{qtyText(p.after)}</b> {l.source.baseUnit}
              </span>
              <span className={cn('text-sm font-bold tabular-nums', TYPES[l.type].sign > 0 ? 'text-emerald-700' : 'text-rose-700')}>
                {TYPES[l.type].sign > 0 ? '+' : '−'}{money(p.value)}
              </span>
              {p.after < 0 && (
                <span className="w-full text-[0.6875rem] text-rose-700">
                  {allowNegative ? 'Stock minus me chala jayega — settings me permission hai, is liye save ho jayega.' : 'Itna stock nahi hai. Minus stock ki permission settings me band hai.'}
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {showOut && (
        <div className="mt-3">
          <p className="mb-1 text-[0.75rem] font-medium text-slate-600">Kis batch se?</p>
          <div className="flex flex-wrap gap-1.5">
            <button type="button" onClick={() => onChange({ batchId: '' })} aria-pressed={!l.batchId}
              className={cn('rounded-lg px-2.5 py-1.5 text-[0.75rem] font-medium ring-1 transition', !l.batchId ? 'bg-slate-900 text-white ring-slate-900' : 'bg-white text-slate-700 ring-slate-200 hover:bg-slate-50')}>
              Koi khaas nahi
            </button>
            {outBatches.map((b) => (
              <button key={b.id} type="button" onClick={() => onChange({ batchId: b.id })} aria-pressed={l.batchId === b.id}
                className={cn('inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[0.75rem] font-medium ring-1 transition', l.batchId === b.id ? 'bg-brand-600 text-white ring-brand-600' : 'bg-white text-slate-700 ring-slate-200 hover:bg-slate-50')}>
                {b.batchNumber}
                {b.expiryDate && <span className={cn(l.batchId === b.id ? 'opacity-80' : expired(b.expiryDate) ? 'text-rose-600' : 'text-slate-400')}>· {expired(b.expiryDate) ? 'expire ' : ''}{dayText(b.expiryDate)}</span>}
                <span className="opacity-70">· {qtyText(Number(b.quantity))}</span>
              </button>
            ))}
          </div>
          <p className="mt-1 text-[0.6875rem] text-slate-500">
            {pickedBatch && p && p.base > Number(pickedBatch.quantity)
              ? `Batch ${pickedBatch.batchNumber} me sirf ${qtyText(Number(pickedBatch.quantity))} ${l.source.baseUnit} hai — baqi pehle expire hone wale batch se kam hoga.`
              : 'Expire ya kharab maal ka batch chunein taake usi batch ki ginti kam ho. "Koi khaas nahi" par pehle expire hone wala batch pehle kam hota hai. Laal date = expire ho chuka.'}
          </p>
        </div>
      )}

      {showIn && (
        <div className="mt-3">
          <button type="button" onClick={() => setBatchOpen((v) => !v)} aria-expanded={batchOpen}
            className="inline-flex items-center gap-1 text-[0.75rem] font-semibold text-brand-700 hover:underline">
            <CalendarClock className="h-3.5 w-3.5" /> Batch aur expiry{l.batchNo ? ` · ${l.batchNo}` : ''} <ChevronDown className={cn('h-3.5 w-3.5 transition', batchOpen && 'rotate-180')} />
          </button>
          {batchOpen && (
            <div className="mt-2 grid gap-2 sm:grid-cols-3">
              <label className="text-[0.75rem] text-slate-600">Batch number
                <input value={l.batchNo} list={`batches-${l.key}`} maxLength={80} placeholder="Packet par likha"
                  onChange={(e) => {
                    const v = e.target.value;
                    const hit = ownBatches.find((b) => b.batchNumber === v.trim());
                    onChange({ batchNo: v, ...(hit && { expiry: hit.expiryDate?.slice(0, 10) ?? '', mfg: hit.manufactureDate?.slice(0, 10) ?? '' }) });
                  }}
                  className="mt-0.5 h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-sm text-slate-900 outline-none focus:border-brand-500" />
                <datalist id={`batches-${l.key}`}>
                  {ownBatches.map((b) => <option key={b.id} value={b.batchNumber}>{b.expiryDate ? `Expiry ${dayText(b.expiryDate)}` : ''}</option>)}
                </datalist>
                <span className="mt-0.5 block text-[0.6875rem] text-slate-500">Purana batch ho to wohi number — usi me jud jayega</span>
              </label>
              <label className="text-[0.75rem] text-slate-600">Expiry
                <input type="date" value={l.expiry} onChange={(e) => onChange({ expiry: e.target.value })}
                  className="mt-0.5 h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-sm text-slate-900 outline-none focus:border-brand-500" />
                <span className="mt-0.5 block text-[0.6875rem] text-slate-500">Expiry report aur POS isi se yaad dilate hain</span>
              </label>
              <label className="text-[0.75rem] text-slate-600">Banne ki date
                <input type="date" value={l.mfg} onChange={(e) => onChange({ mfg: e.target.value })}
                  className="mt-0.5 h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-sm text-slate-900 outline-none focus:border-brand-500" />
                <span className="mt-0.5 block text-[0.6875rem] text-slate-500">Marzi hai — naye batch ke liye</span>
              </label>
            </div>
          )}
          {!batchOpen && <p className="mt-0.5 text-[0.6875rem] text-slate-500">Marzi hai. Expiry wala maal ho to batch aur expiry likhein — warna stock bina batch ke barhega.</p>}
        </div>
      )}

      {withSerial && !!serialsQ.data?.length && (
        <div className="mt-3">
          <p className="mb-1 text-[0.75rem] font-medium text-slate-600 inline-flex items-center gap-1"><Cpu className="h-3.5 w-3.5" /> Kaun sa piece? (serial)</p>
          <select value={l.serialId} onChange={(e) => onChange({ serialId: e.target.value, ...(e.target.value && { qty: '1' }) })} aria-label="Serial"
            className="h-10 w-full rounded-xl border border-slate-200 bg-white px-2 text-sm text-slate-900 outline-none focus:border-brand-500">
            <option value="">Koi khaas piece nahi</option>
            {serialsQ.data.map((s) => <option key={s.id} value={s.id}>{s.serialNumber}{s.imei ? ` · ${s.imei}` : ''}</option>)}
          </select>
          <p className="mt-1 text-[0.6875rem] text-slate-500">Chunein to woh piece {l.type === 'DAMAGE' ? '"kharab"' : '"wapas"'} likha jayega aur bikne ki list se hat jayega.</p>
        </div>
      )}

      {mode === 'roll' && (
        <div className="mt-3 space-y-2">
          <p className="text-[0.75rem] font-medium text-slate-600">Roll <span className="text-rose-600">*</span></p>
          <div className="grid gap-1.5 sm:grid-cols-2">
            {o!.carpetRolls.map((r) => (
              <button key={r.id} type="button" onClick={() => onChange({ rollId: r.id })}
                className={cn('rounded-xl px-3 py-2 text-left ring-1 transition', l.rollId === r.id ? 'bg-brand-50 ring-brand-500' : 'bg-white ring-slate-200 hover:bg-slate-50')}>
                <span className="flex items-center justify-between gap-2 text-[0.8125rem] font-semibold text-slate-900">
                  <span>Roll {r.rollNumber}{r.designCode ? ` · ${r.designCode}` : ''}</span>
                  <span className={cn('rounded-full px-1.5 text-[0.625rem] font-semibold', r.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700')}>{r.status === 'ACTIVE' ? 'Chalu' : r.status === 'DAMAGED' ? 'Kharab' : 'Rakha hua'}</span>
                </span>
                <span className="block text-[0.6875rem] text-slate-500">
                  {r.widthFt}′{r.widthInch ? `${r.widthInch}″` : ''} chaura · {r.remainingLengthFt}′{r.remainingLengthInch ? `${r.remainingLengthInch}″` : ''} baqi · {qtyText(r.remainingSqft)} sqft{r.rackNumber ? ` · Rack ${r.rackNumber}` : ''}
                </span>
              </button>
            ))}
          </div>
          {l.rollAction === 'ADJUST_LENGTH' && (
            <div>
              <div className="grid max-w-xs grid-cols-2 gap-2">
                <input inputMode="decimal" value={l.ft} onChange={(e) => onChange({ ft: e.target.value.replace(/[^\d.]/g, '') })} placeholder="Feet" aria-label="Feet"
                  className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-right text-sm tabular-nums outline-none focus:border-brand-500" />
                <input inputMode="decimal" value={l.inch} onChange={(e) => onChange({ inch: e.target.value.replace(/[^\d.]/g, '') })} placeholder="Inch" aria-label="Inch"
                  className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-right text-sm tabular-nums outline-none focus:border-brand-500" />
              </div>
              <p className="mt-1 text-[0.6875rem] text-slate-500">Kitni lambai {TYPES[l.type].sign > 0 ? 'barhani' : 'nikalni'} hai — feet aur inch (0–11). Sqft khud nikal aata hai.</p>
            </div>
          )}
          {roll && l.rollAction !== 'ADJUST_LENGTH' && (
            <p className="text-[0.75rem] text-slate-600">Roll {roll.rollNumber} ka {qtyText(roll.remainingSqft)} sqft {type === 'ADJUSTMENT_IN' ? 'wapas stock me aayega' : 'stock se nikal jayega'}.</p>
          )}
        </div>
      )}

      {mode === 'imei' && (
        <div className="mt-3">
          <p className="mb-1 text-[0.75rem] font-medium text-slate-600">Device (IMEI) <span className="text-rose-600">*</span></p>
          {o!.imeis.length > 6 && (
            <input value={deviceQuery} onChange={(e) => setDeviceQuery(e.target.value)} placeholder="IMEI ke aakhri number, rang…" aria-label="Device search"
              className="mb-1.5 h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-brand-500" />
          )}
          <div className="grid max-h-48 gap-1.5 overflow-y-auto sm:grid-cols-2">
            {devices.slice(0, 60).map((d) => (
              <button key={d.id} type="button" onClick={() => onChange({ imeiId: d.id })}
                className={cn('rounded-xl px-3 py-2 text-left ring-1 transition', l.imeiId === d.id ? 'bg-brand-50 ring-brand-500' : 'bg-white ring-slate-200 hover:bg-slate-50')}>
                <span className="block font-mono text-[0.8125rem] font-semibold text-slate-900">{d.imei1}</span>
                <span className="block text-[0.6875rem] text-slate-500">{[d.variant?.name, d.color, IMEI_STATUS[d.status] ?? d.status].filter(Boolean).join(' · ')} · {money(d.costPrice)}</span>
              </button>
            ))}
            {!devices.length && <p className="text-[0.75rem] text-slate-500">{l.type === 'ADJUSTMENT_IN' ? 'Koi kharab ya gum device nahi' : 'Stock me koi device nahi'}</p>}
          </div>
          {device && <p className="mt-1 text-[0.6875rem] text-slate-500">{device.imei1}: {IMEI_STATUS[device.status] ?? device.status} → {l.type === 'ADJUSTMENT_IN' ? 'Stock me' : l.type === 'DAMAGE' ? 'Kharab' : 'Gum'}. Product ka stock khud theek hoga.</p>}
        </div>
      )}
    </li>
  );
}

const TYPE_HINT: Record<AdjustmentType, string> = {
  OPENING_BALANCE: 'Dukaan ka pehla stock ya dukaan me banaya maal — stock barhega, Profit me nahi gina jayega. Supplier se khareeda maal Purchase me darj karein.',
  ADJUSTMENT_IN: 'Shelf par zyada maal nikla, ya kahin se wapas aaya — stock barhega aur Profit me jud jayega. Pehla stock ho to "Opening" chunein.',
  ADJUSTMENT_OUT: 'Maal kam hai ya apne kaam me liya — stock kam hoga.',
  DAMAGE: 'Toota, expiry ya kharab maal — stock kam hoga aur nuqsan me likha jayega.',
  LOSS: 'Chori ya gum — stock kam hoga aur nuqsan me likha jayega.',
};

function TypePicker({ value, onChange, types = TYPE_ORDER }: { value: AdjustmentType; onChange: (t: AdjustmentType) => void; types?: AdjustmentType[] }) {
  return (
    <div role="radiogroup" aria-label="Kya hua" className={cn('grid grid-cols-2 gap-1.5', types.length > 4 ? 'sm:grid-cols-5' : 'sm:grid-cols-4')}>
      {types.map((t) => {
        const m = TYPES[t];
        const on = value === t;
        return (
          <button key={t} type="button" role="radio" aria-checked={on} onClick={() => onChange(t)}
            className={cn('inline-flex h-9 items-center justify-center gap-1.5 rounded-lg text-[0.8125rem] font-semibold ring-1 transition', on ? m.tone : 'bg-white text-slate-600 ring-slate-200 hover:bg-slate-50')}>
            <m.icon className="h-4 w-4" />{t === 'ADJUSTMENT_IN' ? 'Stock barhayein' : m.short}
          </button>
        );
      })}
    </div>
  );
}
