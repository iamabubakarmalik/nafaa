import { useState } from 'react';
import {
  ShoppingBag, Plus, Trash2, AlertCircle, ToggleLeft, ToggleRight,
  Boxes, Package, Calendar, MapPin, AlertTriangle, Sparkles,
  CheckCircle2, Info, Lightbulb,
} from 'lucide-react';
import { Input } from '@core/ui/Input';
import { formatPKRFull } from '@core/lib/format';
import type {
  RetailWizardBasic, RetailWizardVariant, RetailWizardBatch, RetailWizardStock,
} from '../../hooks/useRetailWizard';

interface Props {
  basic: RetailWizardBasic;
  hasVariants: boolean;
  onToggleVariants: (v: boolean) => void;
  trackBatches: boolean;
  onToggleBatches: (v: boolean) => void;
  variants: RetailWizardVariant[];
  batches: RetailWizardBatch[];
  stock: RetailWizardStock;
  onAddVariant: (v: Omit<RetailWizardVariant, 'tempId' | 'sortOrder' | 'isActive'>) => void;
  onUpdateVariant: (tempId: string, patch: Partial<RetailWizardVariant>) => void;
  onRemoveVariant: (tempId: string) => void;
  onAddBatch: (variantTempId: string | null) => void;
  onUpdateBatch: (tempId: string, patch: Partial<RetailWizardBatch>) => void;
  onRemoveBatch: (tempId: string) => void;
  onUpdateStock: (patch: Partial<RetailWizardStock>) => void;
  errors: string[];
}

/* ═════════════════════════════════════════════════════════════
   STEP 3 — STOCK ENTRY (FULL BEST v2)
   🌙 Dark mode perfect • 💡 3-tareeqay guide • ⚡ Quick +10/+50
   📦 Variants presets • 📅 Batch expiry live warnings
   💰 Live stock value preview
   ═════════════════════════════════════════════════════════════ */

const QUICK_STOCK = [10, 25, 50, 100, 200, 500];
const VARIANT_PRESETS = [
  { group: 'Flavor', items: ['Chocolate', 'Vanilla', 'Strawberry', 'Mango'] },
  { group: 'Size', items: ['Small', 'Medium', 'Large', 'Extra Large'] },
  { group: 'Pack', items: ['100g', '250g', '500g', '1kg'] },
  { group: 'Color', items: ['Red', 'Blue', 'Green', 'Black'] },
];

export function RetailWizardStep3Stock({
  basic, hasVariants, onToggleVariants, trackBatches, onToggleBatches,
  variants, batches, stock,
  onAddVariant, onUpdateVariant, onRemoveVariant,
  onAddBatch, onUpdateBatch, onRemoveBatch,
  onUpdateStock, errors,
}: Props) {
  const [vName, setVName] = useState('');
  const U = basic.baseUnit || 'pcs';
  const sale = Number(basic.salePrice || 0);

  const addVariant = (name: string) => {
    const n = name.trim();
    if (!n) return;
    if (variants.some((v) => v.name.toLowerCase() === n.toLowerCase())) return;
    onAddVariant({ name: n, stock: 0, lowStockAlert: 5 });
    setVName('');
  };

  const totalVariantStock = variants.reduce((a, v) => a + Number(v.stock || 0), 0);
  const totalBatchQty = batches.reduce((a, b) => a + Number(b.quantity || 0), 0);
  const displayStock = hasVariants ? totalVariantStock : trackBatches ? totalBatchQty : Number(stock.currentStock || 0);
  const stockValue = displayStock * sale;

  return (
    <div className="space-y-5">
      {errors.length > 0 && (
        <div className="rounded-2xl bg-rose-50 dark:bg-rose-500/10 border-2 border-rose-300 dark:border-rose-500/40 p-4 flex items-start gap-2.5">
          <AlertCircle className="h-5 w-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
          <div className="text-sm text-rose-900 dark:text-rose-200">
            <div className="font-extrabold mb-1">Save se pehle ye theek karein:</div>
            <ul className="list-disc pl-4 space-y-0.5 font-semibold">
              {errors.slice(0, 6).map((e, i) => <li key={i}>{e}</li>)}
              {errors.length > 6 && <li>...aur {errors.length - 6} aur</li>}
            </ul>
          </div>
        </div>
      )}

      {/* Header guide */}
      <div className="rounded-2xl bg-gradient-to-br from-sky-50 to-white dark:from-sky-500/10 dark:to-slate-900 border-2 border-sky-200 dark:border-sky-500/40 p-4 flex items-start gap-3">
        <div className="h-11 w-11 rounded-xl bg-sky-600 text-white flex items-center justify-center shadow-md shadow-sky-500/40 shrink-0">
          <ShoppingBag className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-extrabold text-sky-900 dark:text-sky-200">Stock ki entry — 3 tareeqay</h3>
          <p className="text-xs text-sky-800 dark:text-sky-300 font-semibold mt-0.5 leading-relaxed">
            <strong>Simple:</strong> Ek ginti likho (zyadatar kirana).{' '}
            <strong>Variants:</strong> alag alag flavor/size ka apna stock.{' '}
            <strong>Batches:</strong> expiry wale (medicine, dairy).
          </p>
        </div>
      </div>

      {/* Toggles */}
      <section className="grid sm:grid-cols-2 gap-3">
        <button type="button" onClick={() => onToggleVariants(!hasVariants)}
          className={['rounded-2xl border-2 p-4 text-left transition', hasVariants ? 'border-violet-500 dark:border-violet-400 bg-violet-50 dark:bg-violet-500/10 shadow-md' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 hover:border-violet-300 dark:hover:border-violet-500/50'].join(' ')}>
          <div className="flex items-center gap-3">
            <div className={['h-11 w-11 rounded-xl flex items-center justify-center shrink-0 transition', hasVariants ? 'bg-violet-500 text-white' : 'bg-violet-100 dark:bg-violet-500/20 text-violet-700 dark:text-violet-300'].join(' ')}>
              <Boxes className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <div className="font-extrabold text-slate-900 dark:text-white text-sm">Variants (flavor/size)</div>
              <div className="text-[11px] text-slate-600 dark:text-slate-400 font-semibold">Chocolate/Vanilla, S/M/L</div>
            </div>
            {hasVariants ? <ToggleRight className="h-6 w-6 text-violet-600 dark:text-violet-400" /> : <ToggleLeft className="h-6 w-6 text-slate-400" />}
          </div>
        </button>

        <button type="button" onClick={() => onToggleBatches(!trackBatches)}
          className={['rounded-2xl border-2 p-4 text-left transition', trackBatches ? 'border-amber-500 dark:border-amber-400 bg-amber-50 dark:bg-amber-500/10 shadow-md' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 hover:border-amber-300 dark:hover:border-amber-500/50'].join(' ')}>
          <div className="flex items-center gap-3">
            <div className={['h-11 w-11 rounded-xl flex items-center justify-center shrink-0 transition', trackBatches ? 'bg-amber-500 text-white' : 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300'].join(' ')}>
              <Calendar className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <div className="font-extrabold text-slate-900 dark:text-white text-sm">Batches / Expiry</div>
              <div className="text-[11px] text-slate-600 dark:text-slate-400 font-semibold">Dawai, dairy, kharaab hone wale</div>
            </div>
            {trackBatches ? <ToggleRight className="h-6 w-6 text-amber-600 dark:text-amber-400" /> : <ToggleLeft className="h-6 w-6 text-slate-400" />}
          </div>
        </button>
      </section>

      {/* SIMPLE STOCK */}
      {!hasVariants && !trackBatches && (
        <section className="rounded-2xl border-2 border-emerald-300 dark:border-emerald-500/40 bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-500/10 dark:to-slate-900 p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-500/40">
              <Package className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-emerald-900 dark:text-emerald-200 text-base">Simple Stock</h3>
              <p className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold">Ek ginti kaafi hai</p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
              Abhi kitna maal hai? ({U})
            </label>
            <input
              type="number" step="0.01" inputMode="decimal"
              value={stock.currentStock}
              onChange={(e) => onUpdateStock({ currentStock: Number(e.target.value || 0) })}
              className="h-16 w-full rounded-2xl border-2 border-emerald-400 dark:border-emerald-500/50 bg-white dark:bg-slate-800 px-4 text-center text-3xl font-extrabold tabular-nums text-emerald-900 dark:text-emerald-200 focus:outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-200 dark:focus:ring-emerald-500/30 transition"
            />
            <div className="mt-2 flex flex-wrap gap-1.5">
              {QUICK_STOCK.map((q) => (
                <button key={q} type="button" onClick={() => onUpdateStock({ currentStock: Number(stock.currentStock || 0) + q })}
                  className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border-2 border-emerald-200 dark:border-emerald-500/30 hover:border-emerald-400 dark:hover:border-emerald-400 text-emerald-800 dark:text-emerald-300 text-xs font-extrabold transition">
                  +{q}
                </button>
              ))}
              <button type="button" onClick={() => onUpdateStock({ currentStock: 0 })}
                className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 text-xs font-extrabold transition">
                Reset
              </button>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
                Kam ka alert
              </label>
              <input type="number" step="1" value={stock.lowStockAlert}
                onChange={(e) => onUpdateStock({ lowStockAlert: Number(e.target.value || 0) })}
                className="h-12 w-full rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm font-extrabold tabular-nums text-slate-900 dark:text-white focus:outline-none focus:border-amber-500 transition" />
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-bold mt-1">Neeche is se → warning</p>
            </div>
            <div>
              <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
                Rack / Location <span className="text-slate-400 dark:text-slate-500 normal-case font-bold">(optional)</span>
              </label>
              <div className="relative">
                <MapPin className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input value={stock.rackNumber} onChange={(e) => onUpdateStock({ rackNumber: e.target.value })}
                  placeholder="Rack-A, Shelf-3"
                  className="h-12 w-full rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 pl-10 pr-3 text-sm font-bold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-sky-500 transition" />
              </div>
            </div>
          </div>
        </section>
      )}

      {/* VARIANTS */}
      {hasVariants && (
        <section className="rounded-2xl border-2 border-violet-300 dark:border-violet-500/40 bg-gradient-to-br from-violet-50 to-white dark:from-violet-500/10 dark:to-slate-900 p-5 space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="h-11 w-11 rounded-xl bg-violet-600 text-white flex items-center justify-center shadow-md shadow-violet-500/40">
              <Boxes className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <h3 className="font-extrabold text-violet-900 dark:text-violet-200 text-base">Variants</h3>
              <p className="text-xs text-violet-700 dark:text-violet-400 font-semibold">Alag naam, alag stock</p>
            </div>
            <span className="px-2.5 py-1 rounded-lg bg-violet-100 dark:bg-violet-500/20 text-violet-800 dark:text-violet-300 text-[10px] font-extrabold tabular-nums">
              {variants.length} variants • total {totalVariantStock} {U}
            </span>
          </div>

          {/* Presets */}
          <div className="rounded-xl bg-white dark:bg-slate-800/60 border-2 border-violet-200 dark:border-violet-500/30 p-3 space-y-2">
            <div className="text-[10px] uppercase tracking-wider font-extrabold text-violet-700 dark:text-violet-300 flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-amber-500" /> Aam variants — click karke add
            </div>
            {VARIANT_PRESETS.map((grp) => (
              <div key={grp.group} className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-extrabold uppercase text-slate-500 dark:text-slate-400 min-w-[45px]">{grp.group}:</span>
                {grp.items.map((it) => {
                  const ex = variants.some((v) => v.name.toLowerCase() === it.toLowerCase());
                  return (
                    <button key={it} type="button" disabled={ex} onClick={() => addVariant(it)}
                      className={['px-2.5 py-1 rounded-lg border-2 text-[11px] font-extrabold transition disabled:opacity-40 disabled:cursor-not-allowed',
                        ex ? 'border-emerald-300 dark:border-emerald-500/40 bg-emerald-50 dark:bg-emerald-500/15 text-emerald-800 dark:text-emerald-300' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:border-violet-400 dark:hover:border-violet-500/50'].join(' ')}>
                      {ex ? '✓ ' : '+ '}{it}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Custom */}
          <div className="grid sm:grid-cols-[1fr_auto] gap-2 items-end">
            <Input label="Ya apna variant likhein" value={vName}
              onChange={(e) => setVName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addVariant(vName)}
              placeholder="e.g. 250ml Pepsi" />
            <button type="button" onClick={() => addVariant(vName)} disabled={!vName.trim()}
              className="h-11 px-5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-extrabold text-sm inline-flex items-center gap-1 disabled:opacity-50 shadow-md shadow-violet-500/40 transition">
              <Plus className="h-4 w-4" /> Add
            </button>
          </div>

          {/* List */}
          {variants.length > 0 ? (
            <div className="space-y-2">
              {variants.map((v) => (
                <div key={v.tempId} className="rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 p-3 space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-violet-100 dark:bg-violet-500/20 text-violet-700 dark:text-violet-300 flex items-center justify-center shrink-0">
                      <Boxes className="h-5 w-5" />
                    </div>
                    <input value={v.name} onChange={(e) => onUpdateVariant(v.tempId, { name: e.target.value })}
                      className="flex-1 min-w-0 text-sm font-extrabold text-slate-900 dark:text-white bg-transparent focus:outline-none focus:bg-slate-50 dark:focus:bg-slate-700 rounded px-1" />
                    <button type="button" onClick={() => onRemoveVariant(v.tempId)}
                      className="h-9 w-9 rounded-xl bg-rose-50 dark:bg-rose-500/15 hover:bg-rose-100 dark:hover:bg-rose-500/25 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 transition">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div>
                      <label className="block text-[10px] font-extrabold text-slate-600 dark:text-slate-300 uppercase mb-1">Stock ({U})</label>
                      <input type="number" step="0.01" value={v.stock}
                        onChange={(e) => onUpdateVariant(v.tempId, { stock: Number(e.target.value || 0) })}
                        className="h-10 w-full rounded-lg border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 text-sm font-extrabold tabular-nums text-slate-900 dark:text-white focus:outline-none focus:border-sky-500 transition" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-extrabold text-emerald-700 dark:text-emerald-400 uppercase mb-1">Rate override</label>
                      <input type="number" step="0.01" value={v.priceOverride ?? ''}
                        onChange={(e) => onUpdateVariant(v.tempId, { priceOverride: e.target.value === '' ? undefined : Number(e.target.value) })}
                        placeholder={String(sale)}
                        className="h-10 w-full rounded-lg border-2 border-emerald-200 dark:border-emerald-500/40 bg-white dark:bg-slate-800 px-2 text-sm font-bold tabular-nums text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 transition" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-extrabold text-slate-600 dark:text-slate-300 uppercase mb-1">SKU</label>
                      <input value={v.sku ?? ''} onChange={(e) => onUpdateVariant(v.tempId, { sku: e.target.value })}
                        placeholder="Optional"
                        className="h-10 w-full rounded-lg border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 text-xs font-mono font-bold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-sky-500 transition" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-extrabold text-slate-600 dark:text-slate-300 uppercase mb-1">Barcode</label>
                      <input value={v.barcode ?? ''} onChange={(e) => onUpdateVariant(v.tempId, { barcode: e.target.value })}
                        placeholder="Optional"
                        className="h-10 w-full rounded-lg border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 text-xs font-mono font-bold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-sky-500 transition" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border-2 border-dashed border-violet-300 dark:border-violet-500/40 bg-white dark:bg-slate-800/40 p-6 text-center">
              <Boxes className="h-10 w-10 text-violet-400 mx-auto mb-2" />
              <div className="text-sm font-extrabold text-slate-700 dark:text-slate-200">Abhi koi variant nahi</div>
              <div className="text-xs text-slate-500 dark:text-slate-400 font-semibold mt-1">Upar se preset click karo ya custom likho</div>
            </div>
          )}
        </section>
      )}

      {/* BATCHES */}
      {trackBatches && (
        <section className="rounded-2xl border-2 border-amber-300 dark:border-amber-500/40 bg-gradient-to-br from-amber-50 to-white dark:from-amber-500/10 dark:to-slate-900 p-5 space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="h-11 w-11 rounded-xl bg-amber-600 text-white flex items-center justify-center shadow-md shadow-amber-500/40">
              <Calendar className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <h3 className="font-extrabold text-amber-900 dark:text-amber-200 text-base">Batches / Expiry</h3>
              <p className="text-xs text-amber-700 dark:text-amber-400 font-semibold">Har batch ki expiry track karo</p>
            </div>
            <button type="button" onClick={() => onAddBatch(null)}
              className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-extrabold inline-flex items-center gap-1 shadow-md shadow-amber-500/40 transition">
              <Plus className="h-4 w-4" /> Batch Add
            </button>
          </div>

          {batches.length > 0 ? (
            <div className="space-y-2">
              {batches.map((b) => {
                const days = b.expiryDate ? (new Date(b.expiryDate).getTime() - Date.now()) / 86400000 : null;
                const expired = days !== null && days < 0;
                const soon = days !== null && days >= 0 && days <= 30;
                return (
                  <div key={b.tempId} className={['rounded-xl border-2 p-3 space-y-2',
                    expired ? 'border-rose-300 dark:border-rose-500/40 bg-rose-50 dark:bg-rose-500/10'
                      : soon ? 'border-amber-300 dark:border-amber-500/40 bg-amber-50 dark:bg-amber-500/10'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60'].join(' ')}>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 items-end">
                      <div className="sm:col-span-2">
                        <label className="block text-[10px] font-extrabold text-slate-600 dark:text-slate-300 uppercase mb-1">Batch Number</label>
                        <input value={b.batchNumber} onChange={(e) => onUpdateBatch(b.tempId, { batchNumber: e.target.value })}
                          placeholder="BATCH-001"
                          className="h-10 w-full rounded-lg border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 text-sm font-mono font-bold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-amber-500 transition" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-extrabold text-slate-600 dark:text-slate-300 uppercase mb-1">Mfg Date</label>
                        <input type="date" value={b.manufactureDate ?? ''}
                          onChange={(e) => onUpdateBatch(b.tempId, { manufactureDate: e.target.value })}
                          className="h-10 w-full rounded-lg border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-amber-500 transition dark:[color-scheme:dark]" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-extrabold text-slate-600 dark:text-slate-300 uppercase mb-1 items-center gap-1">
                          Expiry {expired && <AlertTriangle className="h-3 w-3 text-rose-600 dark:text-rose-400 inline" />}
                        </label>
                        <input type="date" value={b.expiryDate ?? ''}
                          onChange={(e) => onUpdateBatch(b.tempId, { expiryDate: e.target.value })}
                          className={['h-10 w-full rounded-lg border-2 px-2 text-xs font-bold focus:outline-none transition dark:[color-scheme:dark]',
                            expired ? 'border-rose-400 dark:border-rose-500/50 bg-white dark:bg-slate-800 text-rose-800 dark:text-rose-300 focus:border-rose-600'
                              : soon ? 'border-amber-400 dark:border-amber-500/50 bg-white dark:bg-slate-800 text-amber-800 dark:text-amber-300 focus:border-amber-600'
                              : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:border-amber-500'].join(' ')} />
                      </div>
                      <div className="grid grid-cols-2 gap-1 sm:col-span-5 sm:grid-cols-3">
                        <div>
                          <label className="block text-[10px] font-extrabold text-slate-600 dark:text-slate-300 uppercase mb-1">Qty ({U})</label>
                          <input type="number" step="0.01" value={b.quantity}
                            onChange={(e) => onUpdateBatch(b.tempId, { quantity: Number(e.target.value || 0) })}
                            className="h-10 w-full rounded-lg border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 text-sm font-extrabold tabular-nums text-right text-slate-900 dark:text-white focus:outline-none focus:border-amber-500 transition" />
                        </div>
                        <div>
                          <label className="block text-[10px] font-extrabold text-slate-600 dark:text-slate-300 uppercase mb-1">Cost</label>
                          <input type="number" step="0.01" value={b.costPrice}
                            onChange={(e) => onUpdateBatch(b.tempId, { costPrice: Number(e.target.value || 0) })}
                            className="h-10 w-full rounded-lg border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 text-sm font-bold tabular-nums text-right text-slate-900 dark:text-white focus:outline-none focus:border-amber-500 transition" />
                        </div>
                        <div className="flex items-end">
                          <button type="button" onClick={() => onRemoveBatch(b.tempId)}
                            className="h-10 w-full rounded-lg bg-rose-50 dark:bg-rose-500/15 hover:bg-rose-100 dark:hover:bg-rose-500/25 text-rose-600 dark:text-rose-400 flex items-center justify-center gap-1 text-xs font-extrabold transition">
                            <Trash2 className="h-3.5 w-3.5" /> Hataao
                          </button>
                        </div>
                      </div>
                    </div>
                    {expired && (
                      <div className="text-xs font-extrabold text-rose-800 dark:text-rose-300 flex items-center gap-1">
                        <AlertTriangle className="h-3.5 w-3.5" /> Ye batch expire ho chuki hai
                      </div>
                    )}
                    {soon && !expired && (
                      <div className="text-xs font-extrabold text-amber-800 dark:text-amber-300 flex items-center gap-1">
                        <Info className="h-3.5 w-3.5" /> {Math.floor(days!)} din me expire hogi
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-xl border-2 border-dashed border-amber-300 dark:border-amber-500/40 bg-white dark:bg-slate-800/40 p-6 text-center">
              <Calendar className="h-10 w-10 text-amber-400 mx-auto mb-2" />
              <div className="text-sm font-extrabold text-slate-700 dark:text-slate-200">Koi batch nahi</div>
              <div className="text-xs text-slate-500 dark:text-slate-400 font-semibold mt-1">"Batch Add" button dabao</div>
            </div>
          )}
        </section>
      )}

      {/* Live stock summary */}
      {displayStock > 0 && sale > 0 && (
        <section className="rounded-2xl bg-gradient-to-br from-slate-950 to-emerald-900 text-white p-5 shadow-xl relative overflow-hidden">
          <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-emerald-400/20 blur-2xl pointer-events-none" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle2 className="h-4 w-4 text-emerald-300" />
              <span className="text-[10px] uppercase font-extrabold tracking-wider text-emerald-300">Total stock preview</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-[10px] uppercase font-extrabold text-white/60">Kul stock</div>
                <div className="text-3xl font-extrabold tabular-nums text-white leading-none mt-1">
                  {displayStock} <span className="text-sm text-white/60">{U}</span>
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase font-extrabold text-white/60">Stock value</div>
                <div className="text-3xl font-extrabold tabular-nums text-emerald-300 leading-none mt-1">
                  {formatPKRFull(stockValue)}
                </div>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
