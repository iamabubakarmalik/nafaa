import { useState, useMemo } from 'react';
import {
  Package, Plus, Trash2, AlertCircle, MapPin, Ruler,
  Sparkles, CheckCircle2, Copy, ArrowUpDown, Wand2, X,
  Boxes, DollarSign,
} from 'lucide-react';
import { formatPKRFull } from '@core/lib/format';
import type {
  ShoeWizardSizeVariant, ShoeWizardSizing, ShoeWizardBasic,
} from '../../hooks/useShoeWizard';

interface Props {
  basic: ShoeWizardBasic;
  sizing: ShoeWizardSizing;
  retailPrice: number;
  variants: ShoeWizardSizeVariant[];
  onAdd: (v: Omit<ShoeWizardSizeVariant, 'tempId' | 'isActive'>) => void;
  onAddBulk: (sizes: string[]) => void;
  onUpdate: (tempId: string, patch: Partial<ShoeWizardSizeVariant>) => void;
  onRemove: (tempId: string) => void;
  errors: string[];
}

const SIZE_PRESETS: Record<string, string[]> = {
  UK: ['5', '5.5', '6', '6.5', '7', '7.5', '8', '8.5', '9', '9.5', '10', '10.5', '11', '11.5', '12'],
  US: ['6', '6.5', '7', '7.5', '8', '8.5', '9', '9.5', '10', '10.5', '11', '11.5', '12', '12.5', '13'],
  EU: ['36', '37', '38', '39', '40', '41', '42', '43', '44', '45', '46'],
  CM: ['22', '23', '24', '25', '26', '27', '28', '29', '30'],
  KIDS: ['3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '1', '2', '3'],
};

const COMMON_MEN = ['7', '8', '9', '10', '11'];
const COMMON_WOMEN = ['5', '6', '7', '8'];

export function ShoeWizardStep5SizeGrid({
  basic, sizing, retailPrice, variants, onAdd, onAddBulk, onUpdate, onRemove, errors,
}: Props) {
  const [customSize, setCustomSize] = useState('');
  const [defaultStock, setDefaultStock] = useState(1);
  const [defaultBox, setDefaultBox] = useState('');

  const totalStock = useMemo(() => variants.reduce((a, v) => a + Number(v.stock || 0), 0), [variants]);
  const totalValue = totalStock * retailPrice;
  const existingSizes = useMemo(() => new Set(variants.map((v) => v.size)), [variants]);

  const presets = SIZE_PRESETS[sizing.sizeSystem] || SIZE_PRESETS.UK;

  const addOne = (size: string) => {
    if (!size.trim() || existingSizes.has(size.trim())) return;
    onAdd({
      size: size.trim(),
      stock: defaultStock,
      lowStockAlert: 1,
      boxNumber: defaultBox || undefined,
    });
  };

  const addRange = () => {
    const newSizes = presets.filter((s) => !existingSizes.has(s));
    if (newSizes.length === 0) return;
    onAddBulk(newSizes);
  };

  const addCommon = () => {
    const common = basic.gender === 'WOMEN' || basic.gender === 'GIRLS' ? COMMON_WOMEN : COMMON_MEN;
    const newSizes = common.filter((s) => !existingSizes.has(s));
    if (newSizes.length === 0) return;
    onAddBulk(newSizes);
  };

  const setAllStock = (val: number) => {
    variants.forEach((v) => onUpdate(v.tempId, { stock: val }));
  };

  const autoBoxNumbers = () => {
    variants.forEach((v, i) => {
      if (!v.boxNumber) {
        onUpdate(v.tempId, { boxNumber: `BOX-${(i + 1).toString().padStart(3, '0')}` });
      }
    });
  };

  const autoSku = () => {
    const base = (basic.sku || 'SHOE').toUpperCase();
    variants.forEach((v) => {
      if (!v.sku) {
        onUpdate(v.tempId, { sku: `${base}-${v.size.replace('.', '')}` });
      }
    });
  };

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

      <div className="rounded-2xl bg-gradient-to-br from-orange-50 to-white border-2 border-orange-200 p-4 flex items-start gap-3">
        <div className="h-11 w-11 rounded-xl bg-orange-600 text-white flex items-center justify-center shadow-md shrink-0">
          <Package className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <h3 className="font-extrabold text-orange-900">Size Grid & Stock</h3>
          <p className="text-xs text-orange-800 font-semibold mt-0.5 leading-relaxed">
            Har size ka apna SKU, stock, box number, aur shelf location hota hai.
            Ye <strong>Shoe Store ka sabse important step</strong> — POS pe customer ke size demand pe box location fatafat mile.
          </p>
        </div>
      </div>

      {/* QUICK ADD */}
      <section className="rounded-2xl border-2 border-orange-300 bg-gradient-to-br from-orange-50 to-white p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-orange-600 text-white flex items-center justify-center shadow-md">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-orange-900 text-base">Quick Add Sizes</h3>
            <p className="text-xs text-orange-700 font-semibold">Tap presets or add one by one</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={addRange}
            className="h-12 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-extrabold text-sm inline-flex items-center justify-center gap-2 transition">
            <Boxes className="h-4 w-4" /> Add All {sizing.sizeSystem} Sizes
          </button>
          <button type="button" onClick={addCommon}
            className="h-12 rounded-xl bg-white border-2 border-orange-300 hover:bg-orange-50 text-orange-800 font-extrabold text-sm inline-flex items-center justify-center gap-2 transition">
            <Sparkles className="h-4 w-4" /> Common Sizes Only
          </button>
        </div>

        <div>
          <div className="text-[10px] uppercase tracking-wider font-extrabold text-slate-600 mb-1.5">
            Pick sizes ({presets.length} available)
          </div>
          <div className="flex flex-wrap gap-1.5">
            {presets.map((s) => {
              const added = existingSizes.has(s);
              return (
                <button key={s} type="button" disabled={added} onClick={() => addOne(s)}
                  className={['px-3 py-1.5 rounded-lg border-2 text-xs font-extrabold transition min-w-[52px] disabled:cursor-not-allowed',
                    added ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-200 bg-white text-slate-700 hover:border-orange-400'].join(' ')}>
                  {added ? '✓ ' : ''}{s}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid sm:grid-cols-[1fr_auto_auto] gap-2 items-end">
          <div>
            <label className="block text-[10px] font-extrabold uppercase text-slate-600 mb-1">Custom size</label>
            <input value={customSize} onChange={(e) => setCustomSize(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addOne(customSize) && setCustomSize('')}
              placeholder={sizing.sizeSystem === 'UK' ? '9.5' : sizing.sizeSystem === 'EU' ? '43' : '27'}
              className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-orange-500" />
          </div>
          <div>
            <label className="block text-[10px] font-extrabold uppercase text-slate-600 mb-1">Default stock</label>
            <input type="number" value={defaultStock} onChange={(e) => setDefaultStock(Math.max(0, Number(e.target.value)))}
              className="h-11 w-20 rounded-xl border-2 border-slate-200 px-3 text-sm font-extrabold text-center tabular-nums focus:outline-none focus:border-orange-500" />
          </div>
          <button type="button" onClick={() => { addOne(customSize); setCustomSize(''); }}
            disabled={!customSize.trim() || existingSizes.has(customSize.trim())}
            className="h-11 px-4 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-extrabold text-sm inline-flex items-center gap-1 disabled:opacity-50">
            <Plus className="h-4 w-4" /> Add
          </button>
        </div>

        <div>
          <label className="block text-[10px] font-extrabold uppercase text-slate-600 mb-1">Default box prefix (optional)</label>
          <input value={defaultBox} onChange={(e) => setDefaultBox(e.target.value)}
            placeholder="Applied to new sizes: SHELF-A"
            className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-orange-500" />
        </div>
      </section>

      {/* BULK ACTIONS */}
      {variants.length > 0 && (
        <section className="rounded-2xl border-2 border-violet-200 bg-gradient-to-br from-violet-50 to-white p-4 space-y-2">
          <div className="text-[10px] uppercase tracking-wider font-extrabold text-violet-700 flex items-center gap-1">
            <Wand2 className="h-3 w-3" /> Bulk Actions ({variants.length} sizes)
          </div>
          <div className="flex gap-2 flex-wrap">
            <button type="button" onClick={() => setAllStock(1)}
              className="px-3 py-2 rounded-lg bg-white border-2 border-violet-200 hover:bg-violet-100 text-violet-800 text-xs font-extrabold">
              Stock = 1 all
            </button>
            <button type="button" onClick={() => setAllStock(2)}
              className="px-3 py-2 rounded-lg bg-white border-2 border-violet-200 hover:bg-violet-100 text-violet-800 text-xs font-extrabold">
              Stock = 2 all
            </button>
            <button type="button" onClick={() => setAllStock(3)}
              className="px-3 py-2 rounded-lg bg-white border-2 border-violet-200 hover:bg-violet-100 text-violet-800 text-xs font-extrabold">
              Stock = 3 all
            </button>
            <button type="button" onClick={autoBoxNumbers}
              className="px-3 py-2 rounded-lg bg-white border-2 border-violet-200 hover:bg-violet-100 text-violet-800 text-xs font-extrabold inline-flex items-center gap-1">
              <Wand2 className="h-3 w-3" /> Auto box numbers
            </button>
            <button type="button" onClick={autoSku}
              className="px-3 py-2 rounded-lg bg-white border-2 border-violet-200 hover:bg-violet-100 text-violet-800 text-xs font-extrabold inline-flex items-center gap-1">
              <Wand2 className="h-3 w-3" /> Auto SKUs
            </button>
          </div>
        </section>
      )}

      {/* SIZE GRID */}
      {variants.length === 0 ? (
        <section className="rounded-2xl border-2 border-dashed border-orange-300 bg-orange-50/40 p-10 text-center">
          <Ruler className="h-14 w-14 text-orange-400 mx-auto mb-3" />
          <h3 className="font-extrabold text-orange-900 text-lg">No sizes added yet</h3>
          <p className="text-sm text-orange-800 font-semibold mt-1">Tap "Add All Sizes" or pick individual sizes above</p>
        </section>
      ) : (
        <section className="rounded-2xl border-2 border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b-2 border-slate-100 bg-slate-50 flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <Boxes className="h-4 w-4 text-orange-600" />
              <h3 className="font-extrabold text-slate-900 text-sm">
                {variants.length} sizes • {totalStock} pairs total
              </h3>
            </div>
            <div className="text-sm font-extrabold text-emerald-700">
              Value: {formatPKRFull(totalValue)}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b-2 border-slate-200">
                <tr>
                  <Th>Size</Th>
                  <Th className="text-center">Stock</Th>
                  <Th className="text-center">Alert @</Th>
                  <Th>Box #</Th>
                  <Th>Shelf</Th>
                  <Th>SKU</Th>
                  <Th>Barcode</Th>
                  <Th className="text-right">Price Override</Th>
                  <Th />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {variants
                  .sort((a, b) => parseFloat(a.size) - parseFloat(b.size))
                  .map((v) => (
                  <tr key={v.tempId} className="hover:bg-orange-50/30">
                    <td className="px-3 py-2">
                      <div className="inline-flex items-center gap-2">
                        <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-orange-500 to-amber-700 text-white flex items-center justify-center font-extrabold text-sm shadow">
                          {v.size}
                        </div>
                        <span className="text-[10px] font-extrabold text-slate-500">{sizing.sizeSystem}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <input type="number" min="0" value={v.stock}
                        onChange={(e) => onUpdate(v.tempId, { stock: Math.max(0, Number(e.target.value)) })}
                        className="h-10 w-16 text-center rounded-lg border-2 border-slate-200 px-1 text-sm font-extrabold tabular-nums focus:outline-none focus:border-orange-500" />
                    </td>
                    <td className="px-3 py-2 text-center">
                      <input type="number" min="0" value={v.lowStockAlert}
                        onChange={(e) => onUpdate(v.tempId, { lowStockAlert: Math.max(0, Number(e.target.value)) })}
                        className="h-10 w-14 text-center rounded-lg border-2 border-slate-200 px-1 text-xs font-extrabold tabular-nums focus:outline-none focus:border-amber-500" />
                    </td>
                    <td className="px-3 py-2">
                      <input value={v.boxNumber || ''} onChange={(e) => onUpdate(v.tempId, { boxNumber: e.target.value })}
                        placeholder="BOX-001"
                        className="h-10 w-24 rounded-lg border-2 border-slate-200 px-2 text-xs font-mono font-bold focus:outline-none focus:border-orange-500" />
                    </td>
                    <td className="px-3 py-2">
                      <div className="relative">
                        <MapPin className="h-3 w-3 text-slate-400 absolute left-2 top-1/2 -translate-y-1/2" />
                        <input value={v.shelfLocation || ''} onChange={(e) => onUpdate(v.tempId, { shelfLocation: e.target.value })}
                          placeholder="A-2"
                          className="h-10 w-20 rounded-lg border-2 border-slate-200 pl-6 pr-1 text-xs font-mono font-bold focus:outline-none focus:border-orange-500" />
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <input value={v.sku || ''} onChange={(e) => onUpdate(v.tempId, { sku: e.target.value })}
                        placeholder="Auto"
                        className="h-10 w-28 rounded-lg border-2 border-slate-200 px-2 text-xs font-mono font-bold focus:outline-none focus:border-orange-500" />
                    </td>
                    <td className="px-3 py-2">
                      <input value={v.barcode || ''} onChange={(e) => onUpdate(v.tempId, { barcode: e.target.value })}
                        placeholder="Optional"
                        className="h-10 w-28 rounded-lg border-2 border-slate-200 px-2 text-xs font-mono font-bold focus:outline-none focus:border-orange-500" />
                    </td>
                    <td className="px-3 py-2 text-right">
                      <input type="number" step="0.01" value={v.priceOverride ?? ''}
                        onChange={(e) => onUpdate(v.tempId, { priceOverride: e.target.value === '' ? undefined : Number(e.target.value) })}
                        placeholder={String(retailPrice)}
                        className="h-10 w-24 text-right rounded-lg border-2 border-emerald-200 px-2 text-xs font-extrabold tabular-nums focus:outline-none focus:border-emerald-500" />
                    </td>
                    <td className="px-3 py-2 text-right">
                      <button type="button" onClick={() => onRemove(v.tempId)}
                        className="h-9 w-9 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* SUMMARY */}
      {variants.length > 0 && retailPrice > 0 && (
        <section className="rounded-2xl bg-gradient-to-br from-slate-950 to-orange-900 text-white p-5 shadow-xl">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className="h-4 w-4 text-emerald-300" />
            <span className="text-[10px] uppercase font-extrabold tracking-wider text-emerald-300">Stock preview</span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <div className="text-[10px] uppercase font-extrabold text-white/60">Sizes</div>
              <div className="text-3xl font-extrabold tabular-nums leading-none mt-1">{variants.length}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase font-extrabold text-white/60">Total Pairs</div>
              <div className="text-3xl font-extrabold tabular-nums leading-none mt-1">{totalStock}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase font-extrabold text-white/60">Retail Value</div>
              <div className="text-3xl font-extrabold tabular-nums text-emerald-300 leading-none mt-1">
                {formatPKRFull(totalValue)}
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

function Th({ children, className = '' }: any) {
  return <th className={`px-3 py-3 text-left text-[10px] font-extrabold uppercase tracking-wider text-slate-700 ${className}`}>{children}</th>;
}
