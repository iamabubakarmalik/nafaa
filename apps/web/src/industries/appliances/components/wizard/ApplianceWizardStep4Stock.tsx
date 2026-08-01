import { useState } from 'react';
import {
  Package, Plus, Trash2, AlertCircle, ToggleLeft, ToggleRight,
  Boxes, MapPin, Barcode, Sparkles, Upload, CheckCircle2, Calendar,
} from 'lucide-react';
import { Input } from '@core/ui/Input';
import { formatPKRFull } from '@core/lib/format';
import type {
  ApplianceWizardBasic, ApplianceWizardVariant,
  ApplianceWizardSerial, ApplianceWizardStock,
} from '../../hooks/useApplianceWizard';

interface Props {
  basic: ApplianceWizardBasic;
  hasVariants: boolean;
  onToggleVariants: (v: boolean) => void;
  hasSerials: boolean;
  onToggleSerials: (v: boolean) => void;
  variants: ApplianceWizardVariant[];
  serials: ApplianceWizardSerial[];
  stock: ApplianceWizardStock;
  onAddVariant: (v: Omit<ApplianceWizardVariant, 'tempId' | 'sortOrder' | 'isActive'>) => void;
  onUpdateVariant: (tempId: string, patch: Partial<ApplianceWizardVariant>) => void;
  onRemoveVariant: (tempId: string) => void;
  onAddSerial: (seed?: Partial<ApplianceWizardSerial>) => void;
  onAddSerialsBulk: (lines: string[]) => void;
  onUpdateSerial: (tempId: string, patch: Partial<ApplianceWizardSerial>) => void;
  onRemoveSerial: (tempId: string) => void;
  onUpdateStock: (patch: Partial<ApplianceWizardStock>) => void;
  errors: string[];
}

const QUICK_STOCK = [1, 2, 5, 10, 20];

const VARIANT_PRESETS = [
  { group: 'Capacity', items: ['1.0 Ton', '1.5 Ton', '2.0 Ton', '8kg', '9kg', '10kg', '300L', '400L', '500L'] },
  { group: 'Color', items: ['White', 'Black', 'Silver', 'Stainless Steel', 'Grey'] },
  { group: 'Type', items: ['Inverter', 'Non-Inverter', 'Smart', 'Basic'] },
];

export function ApplianceWizardStep4Stock({
  basic, hasVariants, onToggleVariants, hasSerials, onToggleSerials,
  variants, serials, stock,
  onAddVariant, onUpdateVariant, onRemoveVariant,
  onAddSerial, onAddSerialsBulk, onUpdateSerial, onRemoveSerial,
  onUpdateStock, errors,
}: Props) {
  const [vName, setVName] = useState('');
  const [bulkText, setBulkText] = useState('');
  const [showBulk, setShowBulk] = useState(false);
  const sale = Number(basic.retailPrice || 0);

  const addVariant = (name: string) => {
    const n = name.trim();
    if (!n) return;
    if (variants.some((v) => v.name.toLowerCase() === n.toLowerCase())) return;
    onAddVariant({ name: n, stock: 0, lowStockAlert: 3 });
    setVName('');
  };

  const bulkImport = () => {
    const lines = bulkText.split(/[\n,]/).map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) return;
    onAddSerialsBulk(lines);
    setBulkText('');
    setShowBulk(false);
  };

  const totalVariantStock = variants.reduce((a, v) => a + Number(v.stock || 0), 0);
  const totalSerialStock = serials.length;
  const displayStock = hasVariants ? totalVariantStock : hasSerials ? totalSerialStock : Number(stock.currentStock || 0);
  const stockValue = displayStock * sale;

  return (
    <div className="space-y-5">
      {errors.length > 0 && (
        <div className="rounded-2xl bg-rose-50 border-2 border-rose-300 p-4 flex items-start gap-2.5">
          <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="text-sm text-rose-900">
            <div className="font-extrabold mb-1">Save se pehle theek karein:</div>
            <ul className="list-disc pl-4 space-y-0.5 font-semibold">
              {errors.slice(0, 6).map((e, i) => <li key={i}>{e}</li>)}
              {errors.length > 6 && <li>...aur {errors.length - 6} aur</li>}
            </ul>
          </div>
        </div>
      )}

      <div className="rounded-2xl bg-gradient-to-br from-cyan-50 to-white border-2 border-cyan-200 p-4 flex items-start gap-3">
        <div className="h-11 w-11 rounded-xl bg-cyan-600 text-white flex items-center justify-center shadow-md shrink-0">
          <Package className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-extrabold text-cyan-900">Stock Entry — 3 tareeqay</h3>
          <p className="text-xs text-cyan-800 font-semibold mt-0.5 leading-relaxed">
            <strong>Simple:</strong> Ek ginti (small appliances). <strong>Variants:</strong> capacity/color combos.
            <strong>Serials:</strong> Har piece unique (fridges, ACs, TVs).
          </p>
        </div>
      </div>

      {/* Toggles */}
      <section className="grid sm:grid-cols-2 gap-3">
        <button type="button" onClick={() => onToggleVariants(!hasVariants)}
          className={['rounded-2xl border-2 p-4 text-left transition', hasVariants ? 'border-violet-500 bg-violet-50 shadow-md' : 'border-slate-200 bg-white hover:border-violet-300'].join(' ')}>
          <div className="flex items-center gap-3">
            <div className={['h-11 w-11 rounded-xl flex items-center justify-center shrink-0', hasVariants ? 'bg-violet-500 text-white' : 'bg-violet-100 text-violet-700'].join(' ')}>
              <Boxes className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <div className="font-extrabold text-slate-900 text-sm">Variants (capacity/color)</div>
              <div className="text-[11px] text-slate-600 font-semibold">1.5T / 2T, White / Black</div>
            </div>
            {hasVariants ? <ToggleRight className="h-6 w-6 text-violet-600" /> : <ToggleLeft className="h-6 w-6 text-slate-400" />}
          </div>
        </button>

        <button type="button" onClick={() => onToggleSerials(!hasSerials)}
          className={['rounded-2xl border-2 p-4 text-left transition', hasSerials ? 'border-amber-500 bg-amber-50 shadow-md' : 'border-slate-200 bg-white hover:border-amber-300'].join(' ')}>
          <div className="flex items-center gap-3">
            <div className={['h-11 w-11 rounded-xl flex items-center justify-center shrink-0', hasSerials ? 'bg-amber-500 text-white' : 'bg-amber-100 text-amber-700'].join(' ')}>
              <Barcode className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <div className="font-extrabold text-slate-900 text-sm">Serial Tracking</div>
              <div className="text-[11px] text-slate-600 font-semibold">Fridge, AC, TV — recommended</div>
            </div>
            {hasSerials ? <ToggleRight className="h-6 w-6 text-amber-600" /> : <ToggleLeft className="h-6 w-6 text-slate-400" />}
          </div>
        </button>
      </section>

      {/* SIMPLE STOCK */}
      {!hasVariants && !hasSerials && (
        <section className="rounded-2xl border-2 border-emerald-300 bg-gradient-to-br from-emerald-50 to-white p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md">
              <Package className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-emerald-900 text-base">Simple Stock</h3>
              <p className="text-xs text-emerald-700 font-semibold">Ek ginti kaafi hai</p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 mb-1.5">
              Abhi kitne pieces hain?
            </label>
            <input type="number" step="1" inputMode="decimal" value={stock.currentStock}
              onChange={(e) => onUpdateStock({ currentStock: Number(e.target.value || 0) })}
              className="h-16 w-full rounded-2xl border-2 border-emerald-400 bg-white px-4 text-center text-3xl font-extrabold tabular-nums text-emerald-900 focus:outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-200" />
            <div className="mt-2 flex flex-wrap gap-1.5">
              {QUICK_STOCK.map((q) => (
                <button key={q} type="button" onClick={() => onUpdateStock({ currentStock: Number(stock.currentStock || 0) + q })}
                  className="px-3 py-1.5 rounded-xl bg-white border-2 border-emerald-200 hover:border-emerald-400 text-emerald-800 text-xs font-extrabold">
                  +{q}
                </button>
              ))}
              <button type="button" onClick={() => onUpdateStock({ currentStock: 0 })}
                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-extrabold">
                Reset
              </button>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 mb-1.5">Low stock alert</label>
              <input type="number" step="1" value={stock.lowStockAlert}
                onChange={(e) => onUpdateStock({ lowStockAlert: Number(e.target.value || 0) })}
                className="h-12 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-amber-500" />
            </div>
            <div>
              <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 mb-1.5">
                Warehouse Rack <span className="text-slate-400 normal-case font-bold">(optional)</span>
              </label>
              <div className="relative">
                <MapPin className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input value={stock.rackNumber} onChange={(e) => onUpdateStock({ rackNumber: e.target.value })}
                  placeholder="Warehouse-A, Row-3"
                  className="h-12 w-full rounded-xl border-2 border-slate-200 pl-10 pr-3 text-sm font-bold focus:outline-none focus:border-cyan-500" />
              </div>
            </div>
          </div>
        </section>
      )}

      {/* VARIANTS */}
      {hasVariants && (
        <section className="rounded-2xl border-2 border-violet-300 bg-gradient-to-br from-violet-50 to-white p-5 space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="h-11 w-11 rounded-xl bg-violet-600 text-white flex items-center justify-center shadow-md shrink-0">
              <Boxes className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <h3 className="font-extrabold text-violet-900 text-base">Variants</h3>
              <p className="text-xs text-violet-700 font-semibold">Capacity / Color / Type combos</p>
            </div>
            <span className="px-2.5 py-1 rounded-lg bg-violet-100 text-violet-800 text-[10px] font-extrabold">
              {variants.length} variants • total {totalVariantStock} pcs
            </span>
          </div>

          <div className="rounded-xl bg-white border-2 border-violet-200 p-3 space-y-2">
            <div className="text-[10px] uppercase tracking-wider font-extrabold text-violet-700 flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-amber-500" /> Common variants — click to add
            </div>
            {VARIANT_PRESETS.map((grp) => (
              <div key={grp.group} className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-extrabold uppercase text-slate-500 min-w-[65px]">{grp.group}:</span>
                {grp.items.map((it) => {
                  const ex = variants.some((v) => v.name.toLowerCase() === it.toLowerCase());
                  return (
                    <button key={it} type="button" disabled={ex} onClick={() => addVariant(it)}
                      className={['px-2.5 py-1 rounded-lg border-2 text-[11px] font-extrabold transition disabled:opacity-40 disabled:cursor-not-allowed',
                        ex ? 'border-emerald-300 bg-emerald-50 text-emerald-800' : 'border-slate-200 bg-white text-slate-700 hover:border-violet-400'].join(' ')}>
                      {ex ? '✓ ' : '+ '}{it}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>

          <div className="grid sm:grid-cols-[1fr_auto] gap-2 items-end">
            <Input label="Ya custom variant" value={vName}
              onChange={(e) => setVName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addVariant(vName)}
              placeholder="e.g. 500L Stainless Steel" />
            <button type="button" onClick={() => addVariant(vName)} disabled={!vName.trim()}
              className="h-11 px-5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-extrabold text-sm inline-flex items-center gap-1 disabled:opacity-50 shadow-md">
              <Plus className="h-4 w-4" /> Add
            </button>
          </div>

          {variants.length > 0 ? (
            <div className="space-y-2">
              {variants.map((v) => (
                <div key={v.tempId} className="rounded-xl border-2 border-slate-200 bg-white p-3 space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-violet-100 text-violet-700 flex items-center justify-center shrink-0">
                      <Boxes className="h-5 w-5" />
                    </div>
                    <input value={v.name} onChange={(e) => onUpdateVariant(v.tempId, { name: e.target.value })}
                      className="flex-1 min-w-0 text-sm font-extrabold text-slate-900 bg-transparent focus:outline-none focus:bg-slate-50 rounded px-1" />
                    <button type="button" onClick={() => onRemoveVariant(v.tempId)}
                      className="h-9 w-9 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div>
                      <label className="block text-[10px] font-extrabold text-slate-600 uppercase mb-1">Stock (pcs)</label>
                      <input type="number" step="1" value={v.stock}
                        onChange={(e) => onUpdateVariant(v.tempId, { stock: Number(e.target.value || 0) })}
                        className="h-10 w-full rounded-lg border-2 border-slate-200 px-2 text-sm font-extrabold tabular-nums focus:outline-none focus:border-cyan-500" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-extrabold text-emerald-700 uppercase mb-1">Price override</label>
                      <input type="number" step="0.01" value={v.priceOverride ?? ''}
                        onChange={(e) => onUpdateVariant(v.tempId, { priceOverride: e.target.value === '' ? undefined : Number(e.target.value) })}
                        placeholder={String(sale)}
                        className="h-10 w-full rounded-lg border-2 border-emerald-200 px-2 text-sm font-bold tabular-nums focus:outline-none focus:border-emerald-500" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-extrabold text-slate-600 uppercase mb-1">SKU</label>
                      <input value={v.sku ?? ''} onChange={(e) => onUpdateVariant(v.tempId, { sku: e.target.value })}
                        placeholder="Optional"
                        className="h-10 w-full rounded-lg border-2 border-slate-200 px-2 text-xs font-mono font-bold focus:outline-none focus:border-cyan-500" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-extrabold text-slate-600 uppercase mb-1">Barcode</label>
                      <input value={v.barcode ?? ''} onChange={(e) => onUpdateVariant(v.tempId, { barcode: e.target.value })}
                        placeholder="Optional"
                        className="h-10 w-full rounded-lg border-2 border-slate-200 px-2 text-xs font-mono font-bold focus:outline-none focus:border-cyan-500" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border-2 border-dashed border-violet-300 bg-white p-6 text-center">
              <Boxes className="h-10 w-10 text-violet-400 mx-auto mb-2" />
              <div className="text-sm font-extrabold text-slate-700">Koi variant nahi</div>
              <div className="text-xs text-slate-500 font-semibold mt-1">Upar se preset click karein</div>
            </div>
          )}
        </section>
      )}

      {/* SERIALS */}
      {hasSerials && (
        <section className="rounded-2xl border-2 border-amber-300 bg-gradient-to-br from-amber-50 to-white p-5 space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="h-11 w-11 rounded-xl bg-amber-600 text-white flex items-center justify-center shadow-md">
              <Barcode className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <h3 className="font-extrabold text-amber-900 text-base">Serial Numbers</h3>
              <p className="text-xs text-amber-700 font-semibold">Har appliance ki unique tracking</p>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => setShowBulk(!showBulk)}
                className="px-3 py-2 rounded-xl bg-white border-2 border-amber-300 hover:bg-amber-50 text-amber-800 text-xs font-extrabold inline-flex items-center gap-1">
                <Upload className="h-4 w-4" /> Bulk Paste
              </button>
              <button type="button" onClick={() => onAddSerial()}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-extrabold inline-flex items-center gap-1 shadow-md">
                <Plus className="h-4 w-4" /> Add Serial
              </button>
            </div>
          </div>

          {showBulk && (
            <div className="rounded-xl bg-white border-2 border-amber-300 p-3 space-y-2">
              <div className="text-xs font-extrabold text-amber-800">Har line pe ek serial number (ya comma-separated)</div>
              <textarea rows={5} value={bulkText} onChange={(e) => setBulkText(e.target.value)}
                placeholder="SN-HRF-001&#10;SN-HRF-002&#10;SN-HRF-003"
                className="w-full rounded-lg border-2 border-slate-200 px-3 py-2 text-sm font-mono focus:outline-none focus:border-amber-500" />
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => { setShowBulk(false); setBulkText(''); }} className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-extrabold">Cancel</button>
                <button type="button" onClick={bulkImport} className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-extrabold">
                  Import {bulkText.split(/[\n,]/).filter((l) => l.trim()).length} serials
                </button>
              </div>
            </div>
          )}

          {serials.length > 0 ? (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {serials.map((s, i) => (
                <div key={s.tempId} className="rounded-xl border-2 border-slate-200 bg-white p-3">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 items-end">
                    <div className="sm:col-span-1">
                      <div className="text-[9px] uppercase font-extrabold text-slate-500 mb-1">#{i + 1}</div>
                      <input value={s.serialNumber} onChange={(e) => onUpdateSerial(s.tempId, { serialNumber: e.target.value })}
                        placeholder="Serial Number"
                        className="h-10 w-full rounded-lg border-2 border-amber-300 px-2 text-sm font-mono font-bold focus:outline-none focus:border-amber-600" />
                    </div>
                    <div>
                      <label className="block text-[9px] font-extrabold text-slate-600 uppercase mb-1">Model #</label>
                      <input value={s.modelNumber ?? ''} onChange={(e) => onUpdateSerial(s.tempId, { modelNumber: e.target.value })}
                        placeholder="Optional"
                        className="h-10 w-full rounded-lg border-2 border-slate-200 px-2 text-xs font-mono focus:outline-none focus:border-amber-500" />
                    </div>
                    <div>
                      <label className="block text-[9px] font-extrabold text-slate-600 uppercase mb-1">Batch</label>
                      <input value={s.batchNumber ?? ''} onChange={(e) => onUpdateSerial(s.tempId, { batchNumber: e.target.value })}
                        placeholder="Batch #"
                        className="h-10 w-full rounded-lg border-2 border-slate-200 px-2 text-xs font-mono focus:outline-none focus:border-amber-500" />
                    </div>
                    <div className="flex items-end gap-1">
                      <div className="flex-1">
                        <label className="block text-[9px] font-extrabold text-slate-600 uppercase mb-1">Mfg Date</label>
                        <input type="date" value={s.manufactureDate ?? ''} onChange={(e) => onUpdateSerial(s.tempId, { manufactureDate: e.target.value })}
                          className="h-10 w-full rounded-lg border-2 border-slate-200 px-2 text-xs focus:outline-none focus:border-amber-500" />
                      </div>
                      <button type="button" onClick={() => onRemoveSerial(s.tempId)}
                        className="h-10 w-10 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border-2 border-dashed border-amber-300 bg-white p-6 text-center">
              <Barcode className="h-10 w-10 text-amber-400 mx-auto mb-2" />
              <div className="text-sm font-extrabold text-slate-700">Koi serial nahi</div>
              <div className="text-xs text-slate-500 font-semibold mt-1">"Add Serial" ya "Bulk Paste" karein</div>
            </div>
          )}
        </section>
      )}

      {/* Live summary */}
      {displayStock > 0 && sale > 0 && (
        <section className="rounded-2xl bg-gradient-to-br from-slate-950 to-cyan-900 text-white p-5 shadow-xl">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className="h-4 w-4 text-emerald-300" />
            <span className="text-[10px] uppercase font-extrabold tracking-wider text-emerald-300">Stock preview</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-[10px] uppercase font-extrabold text-white/60">Total stock</div>
              <div className="text-3xl font-extrabold tabular-nums text-white leading-none mt-1">
                {displayStock} <span className="text-sm text-white/60">pcs</span>
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase font-extrabold text-white/60">Stock value</div>
              <div className="text-3xl font-extrabold tabular-nums text-emerald-300 leading-none mt-1">
                {formatPKRFull(stockValue)}
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
