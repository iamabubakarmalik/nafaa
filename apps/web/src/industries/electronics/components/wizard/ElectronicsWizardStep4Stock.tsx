import { useState, useMemo, useRef, useEffect } from 'react';
import {
  Package, Plus, Trash2, AlertCircle, ToggleLeft, ToggleRight,
  Boxes, MapPin, Barcode, Sparkles, Upload, CheckCircle2,
  Copy, TrendingUp, Wallet, Lightbulb, ShieldCheck, ScanLine, Camera, X,
} from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '@core/ui/Input';
import BarcodeScanner from '@core/components/barcode/BarcodeScanner';
import { formatPKRFull } from '@core/lib/format';
import type {
  ElectronicsWizardBasic, ElectronicsWizardVariant,
  ElectronicsWizardSerial, ElectronicsWizardStock,
} from '../../hooks/useElectronicsWizard';

/* ═════════════════════════════════════════════════════════════
   ⚡ STEP 4 — STOCK & SERIALS (FULL BEST v2)
   ─────────────────────────────────────────────────────────────
   🔫 CONTINUOUS SCAN MODE — scanner khula rehta hai, har scan
      = ek nayi serial row (duplicate khud catch, toast confirm)
   📋 Bulk paste: "serial, imei" per line + dupe detection
   ⚠️  Live dupe/blank warnings — save se pehle ginti ghalat nahi
   🌙 Dark mode • 📱 mobile-first • 💰 live stock value summary
   ═════════════════════════════════════════════════════════════ */

interface Props {
  basic: ElectronicsWizardBasic;
  hasVariants: boolean;
  onToggleVariants: (v: boolean) => void;
  hasSerials: boolean;
  onToggleSerials: (v: boolean) => void;
  variants: ElectronicsWizardVariant[];
  serials: ElectronicsWizardSerial[];
  stock: ElectronicsWizardStock;
  onAddVariant: (v: Omit<ElectronicsWizardVariant, 'tempId' | 'sortOrder' | 'isActive'>) => void;
  onUpdateVariant: (tempId: string, patch: Partial<ElectronicsWizardVariant>) => void;
  onRemoveVariant: (tempId: string) => void;
  onAddSerial: (seed?: Partial<ElectronicsWizardSerial>) => void;
  onAddSerialsBulk: (lines: string[]) => void;
  onUpdateSerial: (tempId: string, patch: Partial<ElectronicsWizardSerial>) => void;
  onRemoveSerial: (tempId: string) => void;
  onUpdateStock: (patch: Partial<ElectronicsWizardStock>) => void;
  errors: string[];
}

const QUICK_STOCK = [1, 5, 10, 25, 50, 100];

const VARIANT_PRESETS = [
  { group: 'Storage', items: ['64GB', '128GB', '256GB', '512GB', '1TB'] },
  { group: 'RAM', items: ['4GB', '6GB', '8GB', '12GB', '16GB'] },
  { group: 'Color', items: ['Black', 'White', 'Silver', 'Gold', 'Blue', 'Red'] },
];

const IN = 'h-12 sm:h-10 w-full rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm font-bold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none transition';

export function ElectronicsWizardStep4Stock({
  basic, hasVariants, onToggleVariants, hasSerials, onToggleSerials,
  variants, serials, stock,
  onAddVariant, onUpdateVariant, onRemoveVariant,
  onAddSerial, onAddSerialsBulk, onUpdateSerial, onRemoveSerial,
  onUpdateStock, errors,
}: Props) {
  const [vName, setVName] = useState('');
  const [bulkText, setBulkText] = useState('');
  const [showBulk, setShowBulk] = useState(false);
  const [scanMode, setScanMode] = useState(false);
  const sale = Number(basic.retailPrice || 0);
  const listEndRef = useRef<HTMLDivElement>(null);

  const addVariant = (name: string) => {
    const n = name.trim();
    if (!n) return;
    if (variants.some((v) => v.name.toLowerCase() === n.toLowerCase())) {
      return toast.error(`"${n}" pehle se hai`);
    }
    onAddVariant({ name: n, stock: 0, lowStockAlert: 5 });
    setVName('');
  };

  /* 🔫 CONTINUOUS SCAN — scanner band nahi hota, har beep = nayi row.
     15-digit number ko IMEI samjha jata hai, baqi serial. */
  const serialSet = useMemo(
    () => new Set(serials.map((s) => s.serialNumber.trim().toLowerCase()).filter(Boolean)),
    [serials],
  );

  const handleScan = (code: string) => {
    const v = code.trim();
    if (!v) return;
    const isImei = /^\d{15}$/.test(v);
    const key = v.toLowerCase();
    if (serialSet.has(key)) {
      toast.warning(`"${v}" pehle se list me hai`, { duration: 1500 });
      return;
    }
    if (isImei) {
      onAddSerial({ serialNumber: v, imei: v } as any);
      toast.success(`📱 IMEI add: ${v}`, { duration: 1200 });
    } else {
      onAddSerial({ serialNumber: v } as any);
      toast.success(`🔖 Serial add: ${v}`, { duration: 1200 });
    }
    /* Nayi row nazar aaye — list neeche scroll */
    setTimeout(() => listEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }), 100);
  };

  /* Bulk paste — "serial, imei, imei2, mac" per line */
  const parseBulk = (text: string) =>
    text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean)
      .map((line) => {
        const parts = line.split(/[,\t;]+/).map((x) => x.trim()).filter(Boolean);
        return { serialNumber: parts[0] ?? '', imei: parts[1], imei2: parts[2], macAddress: parts[3] };
      })
      .filter((x) => x.serialNumber);

  const bulkParsed = useMemo(() => parseBulk(bulkText), [bulkText]);

  const bulkDupes = useMemo(() => {
    const seen = new Set<string>();
    const dupes: string[] = [];
    for (const e of bulkParsed) {
      const k = e.serialNumber.toLowerCase();
      if (serialSet.has(k) || seen.has(k)) dupes.push(e.serialNumber);
      seen.add(k);
    }
    return dupes;
  }, [bulkParsed, serialSet]);

  const bulkFresh = useMemo(() => {
    const seen = new Set<string>();
    return bulkParsed.filter((e) => {
      const k = e.serialNumber.toLowerCase();
      if (serialSet.has(k) || seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  }, [bulkParsed, serialSet]);

  const bulkImport = () => {
    if (bulkFresh.length === 0) return;
    onAddSerialsBulk(bulkFresh.map((e) => e.serialNumber));
    toast.success(`${bulkFresh.length} serials add ho gaye`);
    setBulkText('');
    setShowBulk(false);
    setTimeout(() => listEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }), 100);
  };

  /* Ek hi serial do bar? — warna backend chupchap skip karega */
  const dupeSerials = useMemo(() => {
    const count = new Map<string, number>();
    for (const s of serials) {
      const k = s.serialNumber.trim().toLowerCase();
      if (!k) continue;
      count.set(k, (count.get(k) ?? 0) + 1);
    }
    return new Set([...count.entries()].filter(([, n]) => n > 1).map(([k]) => k));
  }, [serials]);

  const blankSerials = serials.filter((s) => !s.serialNumber.trim()).length;

  const totalVariantStock = variants.reduce((a, v) => a + Number(v.stock || 0), 0);
  const totalSerialStock = serials.filter((s) => s.serialNumber.trim()).length;
  const displayStock = hasVariants ? totalVariantStock : hasSerials ? totalSerialStock : Number(stock.currentStock || 0);
  const cost = Number(basic.costPrice || 0);
  const stockCost = displayStock * cost;
  const stockRetail = displayStock * sale;
  const potentialProfit = stockRetail - stockCost;

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* 🔫 Scanner — continuous mode me band NAHI hota */}
      {scanMode && (
        <BarcodeScanner
          onDetected={handleScan}
          onClose={() => setScanMode(false)}
        />
      )}

      {errors.length > 0 && (
        <div className="rounded-2xl bg-rose-50 dark:bg-rose-500/10 border-2 border-rose-300 dark:border-rose-500/40 p-4 flex items-start gap-2.5">
          <AlertCircle className="h-5 w-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
          <div className="text-sm text-rose-900 dark:text-rose-200">
            <div className="font-extrabold mb-1">Save se pehle theek karein:</div>
            <ul className="list-disc pl-4 space-y-0.5 font-semibold">
              {errors.slice(0, 6).map((e, i) => <li key={i}>{e}</li>)}
              {errors.length > 6 && <li>...aur {errors.length - 6} aur</li>}
            </ul>
          </div>
        </div>
      )}

      {/* Header info */}
      <div className="rounded-2xl bg-gradient-to-br from-blue-50 to-white dark:from-blue-500/10 dark:to-slate-900 border-2 border-blue-200 dark:border-blue-500/30 p-4 flex items-start gap-3">
        <div className="h-11 w-11 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shrink-0">
          <Package className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-extrabold text-blue-900 dark:text-blue-100">Stock Entry — 3 tareeqay</h3>
          <p className="text-xs text-blue-800 dark:text-blue-300 font-semibold mt-0.5 leading-relaxed">
            <strong>Simple:</strong> Ek ginti (chargers, cables). <strong>Variants:</strong> alag storage/RAM/color ka apna stock. <strong>Serials:</strong> IMEI/S/N tracked (phones, laptops).
          </p>
        </div>
      </div>

      {/* Toggles */}
      <section className="grid sm:grid-cols-2 gap-3">
        <button type="button" onClick={() => onToggleVariants(!hasVariants)}
          className={['rounded-2xl border-2 p-4 text-left transition active:scale-[0.98]',
            hasVariants
              ? 'border-violet-500 bg-violet-50 dark:bg-violet-500/15 shadow-md'
              : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/80 hover:border-violet-300 dark:hover:border-violet-500/50'].join(' ')}>
          <div className="flex items-center gap-3">
            <div className={['h-11 w-11 rounded-xl flex items-center justify-center shrink-0',
              hasVariants ? 'bg-violet-500 text-white' : 'bg-violet-100 dark:bg-violet-500/20 text-violet-700 dark:text-violet-300'].join(' ')}>
              <Boxes className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-extrabold text-slate-900 dark:text-white text-sm">Variants (storage/color)</div>
              <div className="text-[11px] text-slate-600 dark:text-slate-400 font-semibold">128/256GB, Black/White</div>
            </div>
            {hasVariants ? <ToggleRight className="h-6 w-6 text-violet-600 dark:text-violet-400 shrink-0" /> : <ToggleLeft className="h-6 w-6 text-slate-400 shrink-0" />}
          </div>
        </button>

        <button type="button" onClick={() => onToggleSerials(!hasSerials)}
          className={['rounded-2xl border-2 p-4 text-left transition active:scale-[0.98]',
            hasSerials
              ? 'border-amber-500 bg-amber-50 dark:bg-amber-500/15 shadow-md'
              : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/80 hover:border-amber-300 dark:hover:border-amber-500/50'].join(' ')}>
          <div className="flex items-center gap-3">
            <div className={['h-11 w-11 rounded-xl flex items-center justify-center shrink-0',
              hasSerials ? 'bg-amber-500 text-white' : 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300'].join(' ')}>
              <Barcode className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-extrabold text-slate-900 dark:text-white text-sm">Serial / IMEI Tracking</div>
              <div className="text-[11px] text-slate-600 dark:text-slate-400 font-semibold">Phones, laptops, high-value</div>
            </div>
            {hasSerials ? <ToggleRight className="h-6 w-6 text-amber-600 dark:text-amber-400 shrink-0" /> : <ToggleLeft className="h-6 w-6 text-slate-400 shrink-0" />}
          </div>
        </button>
      </section>

      {/* ══ SIMPLE STOCK ══ */}
      {!hasVariants && !hasSerials && (
        <section className="rounded-2xl border-2 border-emerald-300 dark:border-emerald-500/40 bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-500/10 dark:to-slate-900 p-4 sm:p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md shrink-0">
              <Package className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-emerald-900 dark:text-emerald-100 text-base">Simple Stock</h3>
              <p className="text-xs text-emerald-700 dark:text-emerald-300 font-semibold">Ek ginti kaafi hai</p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
              Abhi kitne pieces hain?
            </label>
            <input type="number" step="1" inputMode="numeric" value={stock.currentStock}
              onChange={(e) => onUpdateStock({ currentStock: Number(e.target.value || 0) })}
              className="h-16 w-full rounded-2xl border-2 border-emerald-400 dark:border-emerald-500/50 bg-white dark:bg-slate-800 px-4 text-center text-3xl font-extrabold tabular-nums text-emerald-900 dark:text-emerald-200 focus:outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-200 dark:focus:ring-emerald-500/20 transition" />
            <div className="mt-2 flex flex-wrap gap-1.5">
              {QUICK_STOCK.map((q) => (
                <button key={q} type="button" onClick={() => onUpdateStock({ currentStock: Number(stock.currentStock || 0) + q })}
                  className="px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border-2 border-emerald-200 dark:border-emerald-500/30 hover:border-emerald-400 text-emerald-800 dark:text-emerald-300 text-xs font-extrabold transition active:scale-95">
                  +{q}
                </button>
              ))}
              <button type="button" onClick={() => onUpdateStock({ currentStock: 0 })}
                className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-extrabold transition active:scale-95">
                Reset
              </button>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">Low stock alert</label>
              <input type="number" step="1" value={stock.lowStockAlert}
                onChange={(e) => onUpdateStock({ lowStockAlert: Number(e.target.value || 0) })}
                className={`${IN} font-extrabold tabular-nums focus:border-amber-500`} />
            </div>
            <div>
              <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                Rack / Location <span className="text-slate-400 dark:text-slate-500 normal-case font-bold">(optional)</span>
              </label>
              <div className="relative">
                <MapPin className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input value={stock.rackNumber} onChange={(e) => onUpdateStock({ rackNumber: e.target.value })}
                  placeholder="Rack-A, Shelf-3"
                  className={`${IN} pl-10 focus:border-blue-500`} />
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ══ VARIANTS ══ */}
      {hasVariants && (
        <section className="rounded-2xl border-2 border-violet-300 dark:border-violet-500/40 bg-gradient-to-br from-violet-50 to-white dark:from-violet-500/10 dark:to-slate-900 p-4 sm:p-5 space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="h-11 w-11 rounded-xl bg-violet-600 text-white flex items-center justify-center shadow-md shrink-0">
              <Boxes className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-extrabold text-violet-900 dark:text-violet-100 text-base">Variants</h3>
              <p className="text-xs text-violet-700 dark:text-violet-300 font-semibold">Storage / RAM / Color combos</p>
            </div>
            <span className="px-2.5 py-1 rounded-lg bg-violet-100 dark:bg-violet-500/20 text-violet-800 dark:text-violet-200 text-[10px] font-extrabold">
              {variants.length} variants • total {totalVariantStock} pcs
            </span>
          </div>

          <div className="rounded-xl bg-white dark:bg-slate-800 border-2 border-violet-200 dark:border-violet-500/30 p-3 space-y-2">
            <div className="text-[10px] uppercase tracking-wider font-extrabold text-violet-700 dark:text-violet-300 flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-amber-500" /> Common variants — click to add
            </div>
            {VARIANT_PRESETS.map((grp) => (
              <div key={grp.group} className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-extrabold uppercase text-slate-500 dark:text-slate-400 min-w-[55px]">{grp.group}:</span>
                {grp.items.map((it) => {
                  const ex = variants.some((v) => v.name.toLowerCase() === it.toLowerCase());
                  return (
                    <button key={it} type="button" disabled={ex} onClick={() => addVariant(it)}
                      className={['px-2.5 py-1.5 rounded-lg border-2 text-[11px] font-extrabold transition active:scale-95 disabled:cursor-not-allowed',
                        ex ? 'border-emerald-300 dark:border-emerald-500/40 bg-emerald-50 dark:bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 opacity-60'
                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:border-violet-400 dark:hover:border-violet-500/50'].join(' ')}>
                      {ex ? '✓ ' : '+ '}{it}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>

          <div className="grid sm:grid-cols-[1fr_auto] gap-2 items-end">
            <Input label="Ya custom variant likhein" value={vName}
              onChange={(e) => setVName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addVariant(vName)}
              placeholder="e.g. 512GB Blue" />
            <button type="button" onClick={() => addVariant(vName)} disabled={!vName.trim()}
              className="h-12 sm:h-11 px-5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-extrabold text-sm inline-flex items-center gap-1 disabled:opacity-50 shadow-md transition active:scale-95">
              <Plus className="h-4 w-4" /> Add
            </button>
          </div>

          {variants.length > 0 ? (
            <div className="space-y-2">
              {variants.map((v) => (
                <div key={v.tempId} className="rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-violet-100 dark:bg-violet-500/20 text-violet-700 dark:text-violet-300 flex items-center justify-center shrink-0">
                      <Boxes className="h-5 w-5" />
                    </div>
                    <input value={v.name} onChange={(e) => onUpdateVariant(v.tempId, { name: e.target.value })}
                      className="flex-1 min-w-0 text-sm font-extrabold text-slate-900 dark:text-white bg-transparent focus:outline-none focus:bg-slate-50 dark:focus:bg-slate-800 rounded px-1" />
                    <button type="button" onClick={() => onRemoveVariant(v.tempId)}
                      className="h-10 w-10 rounded-xl bg-rose-50 dark:bg-rose-500/15 hover:bg-rose-100 dark:hover:bg-rose-500/25 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 transition active:scale-95">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div>
                      <label className="block text-[10px] font-extrabold text-slate-600 dark:text-slate-400 uppercase mb-1">Stock (pcs)</label>
                      <input type="number" step="1" inputMode="numeric" value={v.stock}
                        onChange={(e) => onUpdateVariant(v.tempId, { stock: Number(e.target.value || 0) })}
                        className={`${IN} font-extrabold tabular-nums focus:border-blue-500`} />
                    </div>
                    <div>
                      <label className="block text-[10px] font-extrabold text-emerald-700 dark:text-emerald-400 uppercase mb-1">Price override</label>
                      <input type="number" step="0.01" value={v.priceOverride ?? ''}
                        onChange={(e) => onUpdateVariant(v.tempId, { priceOverride: e.target.value === '' ? undefined : Number(e.target.value) })}
                        placeholder={String(sale)}
                        className="h-12 sm:h-10 w-full rounded-xl border-2 border-emerald-200 dark:border-emerald-500/30 bg-white dark:bg-slate-800 px-2 text-sm font-bold tabular-nums text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 transition" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-extrabold text-slate-600 dark:text-slate-400 uppercase mb-1">SKU</label>
                      <input value={v.sku ?? ''} onChange={(e) => onUpdateVariant(v.tempId, { sku: e.target.value })}
                        placeholder="Optional"
                        className={`${IN} font-mono text-xs focus:border-blue-500`} />
                    </div>
                    <div>
                      <label className="block text-[10px] font-extrabold text-slate-600 dark:text-slate-400 uppercase mb-1">Barcode</label>
                      <input value={v.barcode ?? ''} onChange={(e) => onUpdateVariant(v.tempId, { barcode: e.target.value })}
                        placeholder="Optional"
                        className={`${IN} font-mono text-xs focus:border-blue-500`} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border-2 border-dashed border-violet-300 dark:border-violet-500/40 bg-white dark:bg-slate-800/60 p-6 text-center">
              <Boxes className="h-10 w-10 text-violet-400 mx-auto mb-2" />
              <div className="text-sm font-extrabold text-slate-700 dark:text-slate-200">Koi variant nahi</div>
              <div className="text-xs text-slate-500 dark:text-slate-400 font-semibold mt-1">Upar se preset click karein</div>
            </div>
          )}
        </section>
      )}

      {/* ══ SERIALS — fast entry zone ══ */}
      {hasSerials && (
        <section className="rounded-2xl border-2 border-amber-300 dark:border-amber-500/40 bg-gradient-to-br from-amber-50 to-white dark:from-amber-500/10 dark:to-slate-900 p-4 sm:p-5 space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="h-11 w-11 rounded-xl bg-amber-600 text-white flex items-center justify-center shadow-md shrink-0">
              <Barcode className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-extrabold text-amber-900 dark:text-amber-100 text-base">Serial / IMEI Numbers</h3>
              <p className="text-xs text-amber-700 dark:text-amber-300 font-semibold">Har piece ki unique tracking</p>
            </div>
            <div className="flex gap-2 flex-wrap">
              {/* 🔫 SCAN MODE — yahi asli tez rasta hai */}
              <button type="button" onClick={() => setScanMode(true)}
                className="h-11 px-4 rounded-xl bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 text-white text-xs font-extrabold inline-flex items-center gap-1.5 shadow-md transition active:scale-95">
                <Camera className="h-4 w-4" /> Scan Karo
              </button>
              <button type="button" onClick={() => setShowBulk(!showBulk)}
                className={['h-11 px-3 rounded-xl border-2 text-xs font-extrabold inline-flex items-center gap-1.5 transition active:scale-95',
                  showBulk
                    ? 'bg-amber-600 border-amber-600 text-white'
                    : 'bg-white dark:bg-slate-800 border-amber-300 dark:border-amber-500/40 hover:bg-amber-50 dark:hover:bg-amber-500/10 text-amber-800 dark:text-amber-200'].join(' ')}>
                <Upload className="h-4 w-4" /> Bulk Paste
              </button>
              <button type="button" onClick={() => { onAddSerial(); setTimeout(() => listEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }), 100); }}
                className="h-11 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-extrabold inline-flex items-center gap-1 shadow-md transition active:scale-95">
                <Plus className="h-4 w-4" /> Add
              </button>
            </div>
          </div>

          {/* Scan hint strip */}
          <div className="rounded-xl bg-slate-900 dark:bg-slate-950 text-white p-3 flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-amber-500 flex items-center justify-center shrink-0">
              <ScanLine className="h-4 w-4" />
            </div>
            <div className="text-[11px] font-semibold text-white/85 leading-relaxed">
              <b className="text-amber-300">Scan mode me camera band nahi hoti</b> — box uthao, scan karo, agla uthao.
              15-digit number khud <b>IMEI</b> ban jata hai, baqi <b>Serial</b>. Duplicate pe warning beep.
            </div>
          </div>

          {showBulk && (
            <div className="rounded-xl bg-white dark:bg-slate-900 border-2 border-amber-300 dark:border-amber-500/40 p-3 space-y-2">
              <div className="text-xs font-extrabold text-amber-800 dark:text-amber-200">
                Har line par ek serial. IMEI ho to comma laga kar likhein
              </div>
              <textarea rows={6} value={bulkText} onChange={(e) => setBulkText(e.target.value)}
                placeholder={'SN123456789\nSN987654321, 356938035643809\nSN555000111'}
                className="w-full rounded-lg border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm font-mono text-slate-900 dark:text-white focus:outline-none focus:border-amber-500 transition" />

              {bulkParsed.length > 0 && (
                <div className="rounded-lg bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 p-2.5 space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap text-[11px] font-extrabold">
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300">
                      {bulkFresh.length} naye
                    </span>
                    {bulkDupes.length > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 inline-flex items-center gap-1">
                        <Copy className="h-3 w-3" /> {bulkDupes.length} pehle se maujood
                      </span>
                    )}
                    {bulkParsed.some((e) => e.imei) && (
                      <span className="px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300">
                        IMEI bhi mila
                      </span>
                    )}
                  </div>
                  {bulkDupes.length > 0 && (
                    <div className="text-[10px] font-semibold text-rose-700 dark:text-rose-300 font-mono truncate">
                      Chhode jayenge: {bulkDupes.slice(0, 5).join(', ')}
                      {bulkDupes.length > 5 && ` +${bulkDupes.length - 5}`}
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => { setShowBulk(false); setBulkText(''); }}
                  className="h-10 px-3 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-extrabold text-slate-700 dark:text-slate-200 transition active:scale-95">
                  Cancel
                </button>
                <button type="button" onClick={bulkImport} disabled={bulkFresh.length === 0}
                  className="h-10 px-4 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-extrabold disabled:opacity-50 transition active:scale-95">
                  {bulkFresh.length} serials daalein
                </button>
              </div>
            </div>
          )}

          {(dupeSerials.size > 0 || blankSerials > 0) && (
            <div className="rounded-xl bg-rose-50 dark:bg-rose-500/10 border-2 border-rose-300 dark:border-rose-500/40 p-3 flex items-start gap-2.5">
              <AlertCircle className="h-4 w-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              <div className="text-xs font-semibold text-rose-900 dark:text-rose-200">
                {dupeSerials.size > 0 && (
                  <div><b>{dupeSerials.size} serial do bar</b> aa gaya hai — ek hi serial dobara save nahi hota, ginti ghalat ho jayegi.</div>
                )}
                {blankSerials > 0 && (
                  <div><b>{blankSerials} khaali</b> serial row hai — bhar dein ya hata dein.</div>
                )}
              </div>
            </div>
          )}

          {serials.length > 0 ? (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {serials.map((s, i) => (
                <div key={s.tempId} className={[
                  'rounded-xl border-2 bg-white dark:bg-slate-900 p-3 transition',
                  s.serialNumber.trim() && dupeSerials.has(s.serialNumber.trim().toLowerCase())
                    ? 'border-rose-400 dark:border-rose-500/50 bg-rose-50/40 dark:bg-rose-500/5'
                    : 'border-slate-200 dark:border-slate-700',
                ].join(' ')}>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 items-end">
                    <div className="sm:col-span-1">
                      <div className="text-[9px] uppercase font-extrabold text-slate-500 dark:text-slate-400 mb-1">#{i + 1}</div>
                      <input value={s.serialNumber} onChange={(e) => onUpdateSerial(s.tempId, { serialNumber: e.target.value })}
                        placeholder="Serial Number" autoFocus={!s.serialNumber && i === serials.length - 1}
                        className="h-11 sm:h-10 w-full rounded-lg border-2 border-amber-300 dark:border-amber-500/40 bg-white dark:bg-slate-800 px-2 text-sm font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:border-amber-600 transition" />
                    </div>
                    <div>
                      <label className="block text-[9px] font-extrabold text-slate-600 dark:text-slate-400 uppercase mb-1">IMEI</label>
                      <input value={s.imei ?? ''} onChange={(e) => onUpdateSerial(s.tempId, { imei: e.target.value })}
                        placeholder="15 digits"
                        className="h-11 sm:h-10 w-full rounded-lg border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:border-amber-500 transition" />
                    </div>
                    <div>
                      <label className="block text-[9px] font-extrabold text-slate-600 dark:text-slate-400 uppercase mb-1">IMEI 2</label>
                      <input value={s.imei2 ?? ''} onChange={(e) => onUpdateSerial(s.tempId, { imei2: e.target.value })}
                        placeholder="Dual SIM"
                        className="h-11 sm:h-10 w-full rounded-lg border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:border-amber-500 transition" />
                    </div>
                    <div className="flex items-end gap-1">
                      <div className="flex-1">
                        <label className="block text-[9px] font-extrabold text-slate-600 dark:text-slate-400 uppercase mb-1">MAC</label>
                        <input value={s.macAddress ?? ''} onChange={(e) => onUpdateSerial(s.tempId, { macAddress: e.target.value })}
                          placeholder="AA:BB:CC"
                          className="h-11 sm:h-10 w-full rounded-lg border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:border-amber-500 transition" />
                      </div>
                      <button type="button" onClick={() => onRemoveSerial(s.tempId)}
                        className="h-11 sm:h-10 w-10 rounded-lg bg-rose-50 dark:bg-rose-500/15 hover:bg-rose-100 dark:hover:bg-rose-500/25 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 transition active:scale-95">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              <div ref={listEndRef} />
            </div>
          ) : (
            <div className="rounded-xl border-2 border-dashed border-amber-300 dark:border-amber-500/40 bg-white dark:bg-slate-800/60 p-6 text-center">
              <Barcode className="h-10 w-10 text-amber-400 mx-auto mb-2" />
              <div className="text-sm font-extrabold text-slate-700 dark:text-slate-200">Koi serial nahi</div>
              <div className="text-xs text-slate-500 dark:text-slate-400 font-semibold mt-1">"Scan Karo" ya "Bulk Paste" — seconds me saara stock</div>
            </div>
          )}
        </section>
      )}

      {/* ══ LIVE SUMMARY ══ */}
      {displayStock > 0 && (
        <section className="rounded-2xl bg-gradient-to-br from-slate-950 to-blue-900 text-white p-4 sm:p-5 shadow-xl">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className="h-4 w-4 text-emerald-300" />
            <span className="text-[10px] uppercase font-extrabold tracking-wider text-emerald-300">
              Save karne par aisa hoga
            </span>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <div className="text-[10px] uppercase font-extrabold text-white/60 inline-flex items-center gap-1">
                <Boxes className="h-3 w-3" /> Stock
              </div>
              <div className="text-2xl font-extrabold tabular-nums text-white leading-none mt-1">
                {displayStock} <span className="text-xs text-white/60">pcs</span>
              </div>
              <div className="text-[10px] font-bold text-white/50 mt-0.5">
                {hasSerials ? 'serials se' : hasVariants ? 'variants se' : 'seedhi ginti'}
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase font-extrabold text-white/60 inline-flex items-center gap-1">
                <Wallet className="h-3 w-3" /> Lagat
              </div>
              <div className="text-2xl font-extrabold tabular-nums text-white leading-none mt-1">
                {cost > 0 ? formatPKRFull(stockCost) : '—'}
              </div>
              <div className="text-[10px] font-bold text-white/50 mt-0.5">
                {cost > 0 ? 'itna paisa lagega' : 'khareed qeemat nahi di'}
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase font-extrabold text-white/60 inline-flex items-center gap-1">
                <TrendingUp className="h-3 w-3" /> Bechne Par
              </div>
              <div className="text-2xl font-extrabold tabular-nums text-cyan-300 leading-none mt-1">
                {sale > 0 ? formatPKRFull(stockRetail) : '—'}
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase font-extrabold text-white/60 inline-flex items-center gap-1">
                <Sparkles className="h-3 w-3" /> Mumkin Munafa
              </div>
              <div className="text-2xl font-extrabold tabular-nums text-emerald-300 leading-none mt-1">
                {cost > 0 && sale > 0 ? formatPKRFull(potentialProfit) : '—'}
              </div>
              {cost > 0 && sale > 0 && stockRetail > 0 && (
                <div className="text-[10px] font-bold text-white/50 mt-0.5">
                  {((potentialProfit / stockRetail) * 100).toFixed(1)}% margin
                </div>
              )}
            </div>
          </div>

          {hasSerials && (
            <div className="mt-4 pt-3 border-t border-white/15 flex items-start gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-300 shrink-0 mt-0.5" />
              <p className="text-xs font-semibold text-white/80">
                Har serial alag unit ban jayega. POS par serial scan karte hi wahi unit
                SOLD ho jayega aur uski warranty customer ke naam ho jayegi.
              </p>
            </div>
          )}
        </section>
      )}

      {/* Mashwara */}
      <div className="rounded-2xl bg-amber-50 dark:bg-amber-500/10 border-2 border-amber-200 dark:border-amber-500/30 p-4 flex items-start gap-3">
        <Lightbulb className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        <div className="text-sm font-semibold text-amber-900 dark:text-amber-200">
          <b>Kaunsa tareeqa chunein?</b> Cable, cover, glass jaisi sasti cheezon me <b>seedhi ginti</b> kaafi hai.
          Ek hi cheez alag storage/color me aati ho to <b>variants</b>. Aur laptop, camera, drone, monitor jaisi
          mehngi cheez me <b>serial</b> — tabhi warranty aur customer history track hoti hai.
        </div>
      </div>
    </div>
  );
}
