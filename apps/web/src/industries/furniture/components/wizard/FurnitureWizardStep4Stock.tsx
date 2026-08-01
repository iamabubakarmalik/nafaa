import { useState } from 'react';
import {
  Package, Plus, Trash2, AlertCircle, ToggleLeft, ToggleRight,
  Boxes, Sparkles, CheckCircle2,
} from 'lucide-react';
import { Input } from '@core/ui/Input';
import { formatPKRFull } from '@core/lib/format';
import type {
  FurnitureWizardBasic, FurnitureWizardVariant, FurnitureWizardStock,
} from '../../hooks/useFurnitureWizard';

interface Props {
  basic: FurnitureWizardBasic;
  hasVariants: boolean;
  onToggleVariants: (v: boolean) => void;
  variants: FurnitureWizardVariant[];
  stock: FurnitureWizardStock;
  onAddVariant: (v: Omit<FurnitureWizardVariant, 'tempId' | 'sortOrder' | 'isActive'>) => void;
  onUpdateVariant: (tempId: string, patch: Partial<FurnitureWizardVariant>) => void;
  onRemoveVariant: (tempId: string) => void;
  onUpdateStock: (patch: Partial<FurnitureWizardStock>) => void;
  errors: string[];
}

const QUICK_STOCK = [1, 2, 5, 10, 20, 50];

const VARIANT_PRESETS = [
  { group: 'Size', items: ['Small', 'Medium', 'Large', 'King Size', 'Queen Size'] },
  { group: 'Color', items: ['Natural Wood', 'Walnut', 'Honey', 'Ebony', 'White', 'Grey'] },
  { group: 'Fabric', items: ['Velvet', 'Linen', 'Cotton', 'Leather', 'Faux Leather'] },
  { group: 'Seater', items: ['3-Seater', '5-Seater', '7-Seater', 'L-Shape'] },
  { group: 'Wood', items: ['Sheesham', 'Teak', 'Rosewood', 'MDF', 'Plywood'] },
];

export function FurnitureWizardStep4Stock({
  basic, hasVariants, onToggleVariants, variants, stock,
  onAddVariant, onUpdateVariant, onRemoveVariant, onUpdateStock, errors,
}: Props) {
  const [vName, setVName] = useState('');
  const sale = Number(basic.retailPrice || 0);

  const addVariant = (name: string) => {
    const n = name.trim();
    if (!n) return;
    if (variants.some((v) => v.name.toLowerCase() === n.toLowerCase())) return;
    onAddVariant({ name: n, stock: 0, lowStockAlert: 2 });
    setVName('');
  };

  const totalVariantStock = variants.reduce((a, v) => a + Number(v.stock || 0), 0);
  const displayStock = hasVariants ? totalVariantStock : Number(stock.currentStock || 0);
  const stockValue = displayStock * sale;

  return (
    <div className="space-y-5">
      {errors.length > 0 && (
        <div className="rounded-2xl bg-rose-50 border-2 border-rose-300 p-4 flex items-start gap-2.5">
          <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="text-sm text-rose-900">
            <div className="font-extrabold mb-1">Fix before saving:</div>
            <ul className="list-disc pl-4 space-y-0.5 font-semibold">
              {errors.slice(0, 6).map((e, i) => <li key={i}>{e}</li>)}
              {errors.length > 6 && <li>...and {errors.length - 6} more</li>}
            </ul>
          </div>
        </div>
      )}

      <div className="rounded-2xl bg-gradient-to-br from-amber-50 to-white border-2 border-amber-200 p-4 flex items-start gap-3">
        <div className="h-11 w-11 rounded-xl bg-amber-700 text-white flex items-center justify-center shadow-md shrink-0">
          <Package className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <h3 className="font-extrabold text-amber-900">Stock entry — two ways</h3>
          <p className="text-xs text-amber-800 font-semibold mt-0.5 leading-relaxed">
            <strong>Simple:</strong> single quantity (accessories, single-model products).
            <strong> Variants:</strong> different sizes / colors / seaters each with own stock and price.
          </p>
        </div>
      </div>

      <button type="button" onClick={() => onToggleVariants(!hasVariants)}
        className={['w-full rounded-2xl border-2 p-4 text-left transition',
          hasVariants ? 'border-orange-500 bg-orange-50 shadow-md' : 'border-slate-200 bg-white hover:border-orange-300'].join(' ')}>
        <div className="flex items-center gap-3">
          <div className={['h-12 w-12 rounded-xl flex items-center justify-center shrink-0',
            hasVariants ? 'bg-orange-500 text-white' : 'bg-orange-100 text-orange-700'].join(' ')}>
            <Boxes className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <div className="font-extrabold text-slate-900">Variants / Options</div>
            <div className="text-xs text-slate-600 font-semibold">Different sizes, colors, fabrics or seater options</div>
          </div>
          {hasVariants ? <ToggleRight className="h-7 w-7 text-orange-600" /> : <ToggleLeft className="h-7 w-7 text-slate-400" />}
        </div>
      </button>

      {/* SIMPLE STOCK */}
      {!hasVariants && (
        <section className="rounded-2xl border-2 border-emerald-300 bg-gradient-to-br from-emerald-50 to-white p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md">
              <Package className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-emerald-900 text-base">Simple Stock</h3>
              <p className="text-xs text-emerald-700 font-semibold">One quantity is enough</p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 mb-1.5">
              How many pieces in stock?
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
                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-extrabold">Reset</button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 mb-1.5">Low stock alert</label>
            <input type="number" step="1" value={stock.lowStockAlert}
              onChange={(e) => onUpdateStock({ lowStockAlert: Number(e.target.value || 0) })}
              className="h-12 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-amber-500" />
          </div>
        </section>
      )}

      {/* VARIANTS */}
      {hasVariants && (
        <section className="rounded-2xl border-2 border-orange-300 bg-gradient-to-br from-orange-50 to-white p-5 space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="h-11 w-11 rounded-xl bg-orange-600 text-white flex items-center justify-center shadow-md shrink-0">
              <Boxes className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <h3 className="font-extrabold text-orange-900 text-base">Variants</h3>
              <p className="text-xs text-orange-700 font-semibold">Each variant keeps its own stock and price</p>
            </div>
            <span className="px-2.5 py-1 rounded-lg bg-orange-100 text-orange-800 text-[10px] font-extrabold">
              {variants.length} variants • {totalVariantStock} pieces
            </span>
          </div>

          <div className="rounded-xl bg-white border-2 border-orange-200 p-3 space-y-2">
            <div className="text-[10px] uppercase tracking-wider font-extrabold text-orange-700 flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-amber-500" /> Presets — click to add
            </div>
            {VARIANT_PRESETS.map((grp) => (
              <div key={grp.group} className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-extrabold uppercase text-slate-500 min-w-[52px]">{grp.group}:</span>
                {grp.items.map((it) => {
                  const ex = variants.some((v) => v.name.toLowerCase() === it.toLowerCase());
                  return (
                    <button key={it} type="button" disabled={ex} onClick={() => addVariant(it)}
                      className={['px-2.5 py-1 rounded-lg border-2 text-[11px] font-extrabold transition disabled:cursor-not-allowed',
                        ex ? 'border-emerald-300 bg-emerald-50 text-emerald-800' : 'border-slate-200 bg-white text-slate-700 hover:border-orange-400'].join(' ')}>
                      {ex ? '✓ ' : '+ '}{it}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>

          <div className="grid sm:grid-cols-[1fr_auto] gap-2 items-end">
            <Input label="Custom variant name" value={vName}
              onChange={(e) => setVName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addVariant(vName)}
              placeholder="e.g. 5-Seater Grey Velvet" />
            <button type="button" onClick={() => addVariant(vName)} disabled={!vName.trim()}
              className="h-11 px-5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-extrabold text-sm inline-flex items-center gap-1 disabled:opacity-50 shadow-md">
              <Plus className="h-4 w-4" /> Add
            </button>
          </div>

          {variants.length > 0 ? (
            <div className="space-y-2">
              {variants.map((v) => (
                <div key={v.tempId} className="rounded-xl border-2 border-slate-200 bg-white p-3 space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-orange-100 text-orange-700 flex items-center justify-center shrink-0">
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
                      <label className="block text-[10px] font-extrabold text-slate-600 uppercase mb-1">Stock</label>
                      <input type="number" step="1" value={v.stock}
                        onChange={(e) => onUpdateVariant(v.tempId, { stock: Number(e.target.value || 0) })}
                        className="h-10 w-full rounded-lg border-2 border-slate-200 px-2 text-sm font-extrabold tabular-nums focus:outline-none focus:border-amber-500" />
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
                        className="h-10 w-full rounded-lg border-2 border-slate-200 px-2 text-xs font-mono font-bold focus:outline-none focus:border-amber-500" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-extrabold text-slate-600 uppercase mb-1">Barcode</label>
                      <input value={v.barcode ?? ''} onChange={(e) => onUpdateVariant(v.tempId, { barcode: e.target.value })}
                        placeholder="Optional"
                        className="h-10 w-full rounded-lg border-2 border-slate-200 px-2 text-xs font-mono font-bold focus:outline-none focus:border-amber-500" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border-2 border-dashed border-orange-300 bg-white p-6 text-center">
              <Boxes className="h-10 w-10 text-orange-400 mx-auto mb-2" />
              <div className="text-sm font-extrabold text-slate-700">No variants yet</div>
              <div className="text-xs text-slate-500 font-semibold mt-1">Click a preset above to add one</div>
            </div>
          )}
        </section>
      )}

      {displayStock > 0 && sale > 0 && (
        <section className="rounded-2xl bg-gradient-to-br from-slate-950 via-amber-900 to-orange-800 text-white p-5 shadow-xl">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className="h-4 w-4 text-emerald-300" />
            <span className="text-[10px] uppercase font-extrabold tracking-wider text-emerald-300">Stock preview</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-[10px] uppercase font-extrabold text-white/60">Total stock</div>
              <div className="text-3xl font-extrabold tabular-nums leading-none mt-1">
                {displayStock} <span className="text-sm text-white/60">pieces</span>
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase font-extrabold text-white/60">Retail value</div>
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
