import { useState } from 'react';
import {
  ShoppingBag, Plus, Trash2, AlertCircle, Info, ToggleLeft, ToggleRight,
  Boxes, Package, Calendar, MapPin, Hash, DollarSign,
  Copy, AlertTriangle,
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

export function RetailWizardStep3Stock({
  basic, hasVariants, onToggleVariants, trackBatches, onToggleBatches,
  variants, batches, stock,
  onAddVariant, onUpdateVariant, onRemoveVariant,
  onAddBatch, onUpdateBatch, onRemoveBatch,
  onUpdateStock, errors,
}: Props) {
  const [customVariantName, setCustomVariantName] = useState('');

  const addCustomVariant = () => {
    const name = customVariantName.trim();
    if (!name) return;
    onAddVariant({
      name,
      stock: 0,
      lowStockAlert: 5,
    });
    setCustomVariantName('');
  };

  return (
    <div className="space-y-5">
      {errors.length > 0 && (
        <div className="rounded-2xl bg-rose-50 border-2 border-rose-200 p-3 flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
          <div className="text-xs text-rose-900">
            <div className="font-extrabold mb-0.5">Fix before saving:</div>
            <ul className="list-disc pl-4 space-y-0.5">
              {errors.slice(0, 6).map((e, i) => <li key={i}>{e}</li>)}
              {errors.length > 6 && <li>...and {errors.length - 6} more</li>}
            </ul>
          </div>
        </div>
      )}

      <div className="rounded-2xl bg-gradient-to-br from-sky-50 to-white border-2 border-sky-200 p-4 flex items-start gap-3">
        <div className="h-10 w-10 rounded-xl bg-sky-600 text-white flex items-center justify-center shadow-md shrink-0">
          <ShoppingBag className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <h3 className="font-extrabold text-sky-900 text-sm">Stock Entry</h3>
          <p className="text-xs text-sky-800 font-semibold mt-0.5 leading-relaxed">
            Simple stock, variants (flavors/sizes), ya batches (expiry). Zyada kirana products ke liye sirf
            <strong> Simple Stock</strong> kaafi hai.
          </p>
        </div>
      </div>

      {/* Toggles */}
      <section className="grid sm:grid-cols-2 gap-3">
        <button type="button" onClick={() => onToggleVariants(!hasVariants)}
          className={[
            'rounded-2xl border-2 p-4 text-left transition',
            hasVariants ? 'border-violet-500 bg-violet-50' : 'border-slate-200 bg-white hover:border-violet-300',
          ].join(' ')}>
          <div className="flex items-center gap-3">
            <div className={[
              'h-10 w-10 rounded-xl flex items-center justify-center shrink-0',
              hasVariants ? 'bg-violet-500 text-white' : 'bg-violet-100 text-violet-700',
            ].join(' ')}>
              <Boxes className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <div className="font-extrabold text-slate-900 text-sm">Variants (Flavor/Size)</div>
              <div className="text-[11px] text-slate-600 font-semibold">Chocolate/Vanilla, Small/Large</div>
            </div>
            {hasVariants ? <ToggleRight className="h-5 w-5 text-violet-600" /> : <ToggleLeft className="h-5 w-5 text-slate-400" />}
          </div>
        </button>

        <button type="button" onClick={() => onToggleBatches(!trackBatches)}
          className={[
            'rounded-2xl border-2 p-4 text-left transition',
            trackBatches ? 'border-amber-500 bg-amber-50' : 'border-slate-200 bg-white hover:border-amber-300',
          ].join(' ')}>
          <div className="flex items-center gap-3">
            <div className={[
              'h-10 w-10 rounded-xl flex items-center justify-center shrink-0',
              trackBatches ? 'bg-amber-500 text-white' : 'bg-amber-100 text-amber-700',
            ].join(' ')}>
              <Calendar className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <div className="font-extrabold text-slate-900 text-sm">Batches / Expiry</div>
              <div className="text-[11px] text-slate-600 font-semibold">Perishable goods, medicine</div>
            </div>
            {trackBatches ? <ToggleRight className="h-5 w-5 text-amber-600" /> : <ToggleLeft className="h-5 w-5 text-slate-400" />}
          </div>
        </button>
      </section>

      {/* Simple stock (when no variants & no batches) */}
      {!hasVariants && !trackBatches && (
        <section className="rounded-2xl border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md">
              <Package className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-emerald-900 text-base">Simple Stock</h3>
              <p className="text-xs text-emerald-700 font-semibold">Ek entry — quick add</p>
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            <Input label={`Current Stock (${basic.baseUnit || 'units'})`} type="number" step="0.01"
              value={stock.currentStock}
              onChange={(e) => onUpdateStock({ currentStock: Number(e.target.value || 0) })}
              hint="Kitna abhi hai" />
            <Input label="Low Stock Alert" type="number" step="1"
              value={stock.lowStockAlert}
              onChange={(e) => onUpdateStock({ lowStockAlert: Number(e.target.value || 0) })}
              hint="Neeche is se → alert" />
            <Input label="Rack / Location" value={stock.rackNumber}
              onChange={(e) => onUpdateStock({ rackNumber: e.target.value })}
              placeholder="Rack-A, Shelf-3"
              leftIcon={<MapPin className="h-4 w-4 text-slate-400" />} />
          </div>

          {stock.currentStock > 0 && Number(basic.salePrice || 0) > 0 && (
            <div className="rounded-xl bg-white border-2 border-emerald-200 p-3 flex items-center justify-between">
              <div>
                <div className="text-[10px] uppercase tracking-wider font-extrabold text-emerald-700">Stock Value</div>
                <div className="text-lg font-extrabold text-emerald-900 tabular-nums">
                  {formatPKRFull(stock.currentStock * Number(basic.salePrice || 0))}
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] uppercase tracking-wider font-extrabold text-slate-500">Units</div>
                <div className="text-lg font-extrabold text-emerald-700 tabular-nums">
                  {stock.currentStock} {basic.baseUnit}
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      {/* Variants */}
      {hasVariants && (
        <section className="rounded-2xl border-2 border-violet-200 bg-gradient-to-br from-violet-50 to-white p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-violet-600 text-white flex items-center justify-center shadow-md">
              <Boxes className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <h3 className="font-extrabold text-violet-900 text-base">Variants</h3>
              <p className="text-xs text-violet-700 font-semibold">Alag names/sizes, alag stock</p>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 text-[10px] font-extrabold">
              {variants.length}
            </span>
          </div>

          <div className="grid sm:grid-cols-[1fr_auto] gap-2 items-end">
            <Input label="Variant Name" value={customVariantName}
              onChange={(e) => setCustomVariantName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addCustomVariant()}
              placeholder="e.g. Chocolate, 500ml, Large" />
            <button type="button" onClick={addCustomVariant}
              disabled={!customVariantName.trim()}
              className="h-11 px-5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-extrabold text-sm inline-flex items-center gap-1 disabled:opacity-50 shadow-md">
              <Plus className="h-4 w-4" /> Add Variant
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
                    <div className="flex-1 min-w-0">
                      <input value={v.name}
                        onChange={(e) => onUpdateVariant(v.tempId, { name: e.target.value })}
                        className="w-full text-sm font-extrabold text-slate-900 bg-transparent focus:outline-none focus:bg-slate-50 rounded px-1" />
                    </div>
                    <button type="button" onClick={() => onRemoveVariant(v.tempId)}
                      className="h-8 w-8 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    <div>
                      <label className="block text-[10px] font-extrabold text-slate-600 uppercase mb-1">SKU</label>
                      <input value={v.sku ?? ''}
                        onChange={(e) => onUpdateVariant(v.tempId, { sku: e.target.value })}
                        placeholder="Optional"
                        className="h-9 w-full rounded-lg border-2 border-slate-200 px-2 text-xs font-mono font-bold focus:outline-none focus:border-violet-500" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-extrabold text-slate-600 uppercase mb-1">Barcode</label>
                      <input value={v.barcode ?? ''}
                        onChange={(e) => onUpdateVariant(v.tempId, { barcode: e.target.value })}
                        placeholder="Optional"
                        className="h-9 w-full rounded-lg border-2 border-slate-200 px-2 text-xs font-mono font-bold focus:outline-none focus:border-violet-500" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-extrabold text-slate-600 uppercase mb-1">Price Override</label>
                      <input type="number" step="0.01" value={v.priceOverride ?? ''}
                        onChange={(e) => onUpdateVariant(v.tempId, { priceOverride: e.target.value === '' ? undefined : Number(e.target.value) })}
                        placeholder={String(basic.salePrice || 0)}
                        className="h-9 w-full rounded-lg border-2 border-emerald-200 px-2 text-xs font-bold tabular-nums focus:outline-none focus:border-emerald-500" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-extrabold text-slate-600 uppercase mb-1">Stock</label>
                      <input type="number" step="0.01" value={v.stock}
                        onChange={(e) => onUpdateVariant(v.tempId, { stock: Number(e.target.value || 0) })}
                        className="h-9 w-full rounded-lg border-2 border-slate-200 px-2 text-xs font-bold tabular-nums focus:outline-none focus:border-sky-500" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-extrabold text-slate-600 uppercase mb-1">Low Alert</label>
                      <input type="number" step="1" value={v.lowStockAlert}
                        onChange={(e) => onUpdateVariant(v.tempId, { lowStockAlert: Number(e.target.value || 0) })}
                        className="h-9 w-full rounded-lg border-2 border-slate-200 px-2 text-xs font-bold tabular-nums focus:outline-none focus:border-amber-500" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border-2 border-dashed border-violet-300 bg-white p-6 text-center">
              <Boxes className="h-8 w-8 text-violet-400 mx-auto mb-2" />
              <div className="text-sm font-extrabold text-slate-700">No variants added</div>
              <div className="text-xs text-slate-500 font-semibold mt-1">Add karo ya switch off</div>
            </div>
          )}
        </section>
      )}

      {/* Batches */}
      {trackBatches && (
        <section className="rounded-2xl border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-white p-5 space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="h-10 w-10 rounded-xl bg-amber-600 text-white flex items-center justify-center shadow-md">
              <Calendar className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <h3 className="font-extrabold text-amber-900 text-base">Batches / Expiry Tracking</h3>
              <p className="text-xs text-amber-700 font-semibold">Perishable goods manage karo</p>
            </div>
            <button type="button" onClick={() => onAddBatch(null)}
              className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-extrabold inline-flex items-center gap-1 shadow-sm">
              <Plus className="h-3.5 w-3.5" /> Add Batch
            </button>
          </div>

          {batches.length > 0 ? (
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
              <table className="w-full text-xs">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-2 py-2 text-left font-extrabold uppercase tracking-wider text-slate-700 text-[9px]">Batch #</th>
                    <th className="px-2 py-2 text-left font-extrabold uppercase tracking-wider text-slate-700 text-[9px]">Mfg Date</th>
                    <th className="px-2 py-2 text-left font-extrabold uppercase tracking-wider text-slate-700 text-[9px]">Expiry</th>
                    <th className="px-2 py-2 text-right font-extrabold uppercase tracking-wider text-slate-700 text-[9px]">Qty</th>
                    <th className="px-2 py-2 text-right font-extrabold uppercase tracking-wider text-slate-700 text-[9px]">Cost</th>
                    <th className="px-2 py-2"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {batches.map((b) => {
                    const isExpiringSoon = b.expiryDate && new Date(b.expiryDate).getTime() - Date.now() < 30 * 24 * 60 * 60 * 1000;
                    return (
                      <tr key={b.tempId} className="hover:bg-slate-50/50">
                        <td className="px-2 py-1.5">
                          <input value={b.batchNumber}
                            onChange={(e) => onUpdateBatch(b.tempId, { batchNumber: e.target.value })}
                            className="w-24 h-8 rounded-lg border-2 border-slate-200 px-2 text-xs font-mono font-bold focus:outline-none focus:border-amber-500" />
                        </td>
                        <td className="px-2 py-1.5">
                          <input type="date" value={b.manufactureDate ?? ''}
                            onChange={(e) => onUpdateBatch(b.tempId, { manufactureDate: e.target.value })}
                            className="w-32 h-8 rounded-lg border-2 border-slate-200 px-2 text-xs font-bold focus:outline-none focus:border-amber-500" />
                        </td>
                        <td className="px-2 py-1.5">
                          <div className="flex items-center gap-1">
                            <input type="date" value={b.expiryDate ?? ''}
                              onChange={(e) => onUpdateBatch(b.tempId, { expiryDate: e.target.value })}
                              className={[
                                'w-32 h-8 rounded-lg border-2 px-2 text-xs font-bold focus:outline-none',
                                isExpiringSoon ? 'border-rose-300 bg-rose-50 text-rose-900 focus:border-rose-500'
                                  : 'border-slate-200 focus:border-amber-500',
                              ].join(' ')} />
                            {isExpiringSoon && <AlertTriangle className="h-3.5 w-3.5 text-rose-600" />}
                          </div>
                        </td>
                        <td className="px-2 py-1.5">
                          <input type="number" step="0.01" value={b.quantity}
                            onChange={(e) => onUpdateBatch(b.tempId, { quantity: Number(e.target.value || 0) })}
                            className="w-20 h-8 rounded-lg border-2 border-slate-200 px-2 text-xs font-bold tabular-nums text-right focus:outline-none focus:border-amber-500" />
                        </td>
                        <td className="px-2 py-1.5">
                          <input type="number" step="0.01" value={b.costPrice}
                            onChange={(e) => onUpdateBatch(b.tempId, { costPrice: Number(e.target.value || 0) })}
                            className="w-24 h-8 rounded-lg border-2 border-slate-200 px-2 text-xs font-bold tabular-nums text-right focus:outline-none focus:border-amber-500" />
                        </td>
                        <td className="px-2 py-1.5">
                          <button type="button" onClick={() => onRemoveBatch(b.tempId)}
                            className="h-7 w-7 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center">
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="rounded-xl border-2 border-dashed border-amber-300 bg-white p-6 text-center">
              <Calendar className="h-8 w-8 text-amber-400 mx-auto mb-2" />
              <div className="text-sm font-extrabold text-slate-700">No batches yet</div>
              <div className="text-xs text-slate-500 font-semibold mt-1">Add Batch button click karo</div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
