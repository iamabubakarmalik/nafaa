import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Package, Plus, Trash2, AlertCircle, ToggleLeft, ToggleRight,
  Calendar, AlertTriangle, Info, Repeat, Search, X, Pill, DollarSign,
} from 'lucide-react';
import { productsApi } from '@modules/inventory/products/api/products.api';
import { formatPKR } from '@core/lib/format';
import type {
  PharmacyWizardInventory, PharmacyWizardBatch, PharmacyWizardSubstitute,
} from '../../hooks/usePharmacyWizard';

interface Props {
  basicUnit: string;
  basicCostPrice: number;
  inventory: PharmacyWizardInventory;
  onToggleBatches: (v: boolean) => void;
  onAddBatch: (seed?: Partial<PharmacyWizardBatch>) => void;
  onUpdateBatch: (tempId: string, patch: Partial<PharmacyWizardBatch>) => void;
  onRemoveBatch: (tempId: string) => void;
  onToggleSubstitutes: (v: boolean) => void;
  onAddSubstitute: (sub: Omit<PharmacyWizardSubstitute, 'tempId'>) => void;
  onRemoveSubstitute: (tempId: string) => void;
  errors: string[];
}

export function PharmacyWizardStep3Batches({
  basicUnit, basicCostPrice, inventory,
  onToggleBatches, onAddBatch, onUpdateBatch, onRemoveBatch,
  onToggleSubstitutes, onAddSubstitute, onRemoveSubstitute,
  errors,
}: Props) {
  const [showSubstitutePicker, setShowSubstitutePicker] = useState(false);
  const [substituteSearch, setSubstituteSearch] = useState('');

  const { data: productsData } = useQuery({
    queryKey: ['products-for-substitute', substituteSearch],
    queryFn: () => productsApi.list({ page: 1, limit: 30, search: substituteSearch || undefined }),
    enabled: showSubstitutePicker,
  });

  const totalBatchStock = inventory.batches.reduce((a, b) => a + Number(b.quantity || 0), 0);
  const totalBatchValue = inventory.batches.reduce((a, b) => a + Number(b.quantity || 0) * Number(b.costPrice || 0), 0);

  const now = Date.now();
  const expiringSoon = inventory.batches.filter((b) => {
    if (!b.expiryDate) return false;
    const days = (new Date(b.expiryDate).getTime() - now) / (1000 * 60 * 60 * 24);
    return days > 0 && days <= 90;
  });
  const expired = inventory.batches.filter((b) => {
    if (!b.expiryDate) return false;
    return new Date(b.expiryDate).getTime() < now;
  });

  return (
    <div className="space-y-5">
      {errors.length > 0 && (
        <div className="rounded-2xl bg-rose-50 border-2 border-rose-200 p-3 flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
          <div className="text-xs text-rose-900">
            <div className="font-extrabold mb-0.5">Fix before saving:</div>
            <ul className="list-disc pl-4 space-y-0.5">
              {errors.slice(0, 6).map((e, i) => <li key={i}>{e}</li>)}
            </ul>
          </div>
        </div>
      )}

      <div className="rounded-2xl bg-gradient-to-br from-amber-50 to-white border-2 border-amber-200 p-4 flex items-start gap-3">
        <div className="h-10 w-10 rounded-xl bg-amber-600 text-white flex items-center justify-center shadow-md shrink-0">
          <Package className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <h3 className="font-extrabold text-amber-900 text-sm">Batches & Alternatives</h3>
          <p className="text-xs text-amber-800 font-semibold mt-0.5 leading-relaxed">
            Batch tracking se expiry manage kar sakte ho. Substitutes se out-of-stock case mein alternate suggest hoga.
          </p>
        </div>
      </div>

      {/* Batches Toggle */}
      <section className="rounded-2xl border-2 border-slate-200 bg-white p-5">
        <div className="flex items-start gap-3 flex-wrap">
          <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center shadow-md shrink-0">
            <Package className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-extrabold text-slate-900 text-lg leading-tight">Track Batches & Expiry?</h3>
            <p className="text-sm text-slate-600 font-semibold mt-0.5">
              Alag alag batches ka stock aur expiry track karna — FEFO dispensing
            </p>
          </div>
          <button type="button" onClick={() => onToggleBatches(!inventory.hasBatches)}
            className={['inline-flex items-center gap-2 px-4 py-2 rounded-xl font-extrabold text-sm transition shrink-0',
              inventory.hasBatches ? 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'].join(' ')}>
            {inventory.hasBatches ? (<><ToggleRight className="h-5 w-5" /> Yes, track</>)
              : (<><ToggleLeft className="h-5 w-5" /> No, single stock</>)}
          </button>
        </div>

        {!inventory.hasBatches && (
          <div className="mt-4 rounded-xl bg-blue-50 border-2 border-blue-200 p-3 flex items-start gap-2">
            <Info className="h-4 w-4 text-blue-700 shrink-0 mt-0.5" />
            <div className="text-xs text-blue-900">
              <div className="font-extrabold mb-0.5">Simple stock mode</div>
              <div className="font-semibold">
                Step 1 mein diya gaya stock hi use hoga. Expiry track nahi hogi.
                Batches later product page se add kar sakte hain.
              </div>
            </div>
          </div>
        )}
      </section>

      {inventory.hasBatches && (
        <>
          {/* Batches Table */}
          <section className="rounded-2xl border-2 border-amber-200 bg-white p-5 space-y-4">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-700 text-white flex items-center justify-center shadow-md">
                  <Package className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">Batches</h3>
                  <p className="text-xs text-slate-500 font-semibold">
                    {inventory.batches.length} batch{inventory.batches.length !== 1 ? 'es' : ''} •
                    {totalBatchStock} {basicUnit}
                    {totalBatchValue > 0 && ` • ${formatPKR(totalBatchValue)}`}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onAddBatch({ costPrice: basicCostPrice })}
                className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-extrabold inline-flex items-center gap-1 shadow-sm"
              >
                <Plus className="h-3.5 w-3.5" /> Add Batch
              </button>
            </div>

            {(expiringSoon.length > 0 || expired.length > 0) && (
              <div className="grid sm:grid-cols-2 gap-2">
                {expiringSoon.length > 0 && (
                  <div className="rounded-xl bg-amber-50 border-2 border-amber-200 p-3 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-700 shrink-0" />
                    <div className="text-xs">
                      <div className="font-extrabold text-amber-900">{expiringSoon.length} batch(es) expiring &lt; 90 days</div>
                      <div className="text-amber-700 font-semibold">Priority dispensing needed</div>
                    </div>
                  </div>
                )}
                {expired.length > 0 && (
                  <div className="rounded-xl bg-rose-50 border-2 border-rose-200 p-3 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-rose-700 shrink-0" />
                    <div className="text-xs">
                      <div className="font-extrabold text-rose-900">{expired.length} batch(es) already expired!</div>
                      <div className="text-rose-700 font-semibold">Should be removed</div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {inventory.batches.length > 0 ? (
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-2 py-2 text-left font-extrabold uppercase tracking-wider text-slate-700 text-[9px]">Batch #</th>
                      <th className="px-2 py-2 text-left font-extrabold uppercase tracking-wider text-slate-700 text-[9px]">Mfg Date</th>
                      <th className="px-2 py-2 text-left font-extrabold uppercase tracking-wider text-slate-700 text-[9px]">Expiry</th>
                      <th className="px-2 py-2 text-right font-extrabold uppercase tracking-wider text-slate-700 text-[9px]">Qty</th>
                      <th className="px-2 py-2 text-right font-extrabold uppercase tracking-wider text-slate-700 text-[9px]">Cost</th>
                      <th className="px-2 py-2 text-right font-extrabold uppercase tracking-wider text-slate-700 text-[9px]">Total</th>
                      <th className="px-2 py-2"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {inventory.batches.map((b) => {
                      const isExpired = b.expiryDate && new Date(b.expiryDate).getTime() < now;
                      const isExpiringSoon = b.expiryDate && !isExpired &&
                        (new Date(b.expiryDate).getTime() - now) / (1000 * 60 * 60 * 24) <= 90;
                      const lineTotal = Number(b.quantity || 0) * Number(b.costPrice || 0);
                      return (
                        <tr key={b.tempId} className={[
                          'hover:bg-slate-50/50',
                          isExpired ? 'bg-rose-50/50' : isExpiringSoon ? 'bg-amber-50/50' : '',
                        ].join(' ')}>
                          <td className="px-2 py-1.5">
                            <input
                              value={b.batchNumber}
                              onChange={(e) => onUpdateBatch(b.tempId, { batchNumber: e.target.value })}
                              className="w-24 h-8 rounded-lg border-2 border-slate-200 px-2 text-xs font-mono font-bold focus:outline-none focus:border-amber-500"
                            />
                          </td>
                          <td className="px-2 py-1.5">
                            <input
                              type="date"
                              value={b.manufactureDate ?? ''}
                              onChange={(e) => onUpdateBatch(b.tempId, { manufactureDate: e.target.value })}
                              className="w-32 h-8 rounded-lg border-2 border-slate-200 px-2 text-xs font-bold focus:outline-none focus:border-amber-500"
                            />
                          </td>
                          <td className="px-2 py-1.5">
                            <div className="flex items-center gap-1">
                              <input
                                type="date"
                                value={b.expiryDate ?? ''}
                                onChange={(e) => onUpdateBatch(b.tempId, { expiryDate: e.target.value })}
                                className={[
                                  'w-32 h-8 rounded-lg border-2 px-2 text-xs font-bold focus:outline-none',
                                  isExpired ? 'border-rose-400 bg-rose-50 text-rose-900 focus:border-rose-500'
                                    : isExpiringSoon ? 'border-amber-400 bg-amber-50 text-amber-900 focus:border-amber-500'
                                    : 'border-slate-200 focus:border-amber-500',
                                ].join(' ')}
                              />
                              {isExpired && <AlertTriangle className="h-3.5 w-3.5 text-rose-600" />}
                              {isExpiringSoon && !isExpired && <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />}
                            </div>
                          </td>
                          <td className="px-2 py-1.5">
                            <input
                              type="number" step="0.01"
                              value={b.quantity}
                              onChange={(e) => onUpdateBatch(b.tempId, { quantity: Number(e.target.value || 0) })}
                              className="w-20 h-8 rounded-lg border-2 border-slate-200 px-2 text-xs font-extrabold tabular-nums text-right focus:outline-none focus:border-amber-500"
                            />
                          </td>
                          <td className="px-2 py-1.5">
                            <input
                              type="number" step="0.01"
                              value={b.costPrice}
                              onChange={(e) => onUpdateBatch(b.tempId, { costPrice: Number(e.target.value || 0) })}
                              className="w-24 h-8 rounded-lg border-2 border-slate-200 px-2 text-xs font-bold tabular-nums text-right focus:outline-none focus:border-amber-500"
                            />
                          </td>
                          <td className="px-2 py-1.5 text-right text-xs font-extrabold text-emerald-700 tabular-nums">
                            {formatPKR(lineTotal)}
                          </td>
                          <td className="px-2 py-1.5">
                            <button
                              onClick={() => onRemoveBatch(b.tempId)}
                              className="h-7 w-7 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="bg-amber-50 border-t-2 border-amber-200">
                    <tr>
                      <td colSpan={3} className="px-2 py-2 text-right text-xs font-extrabold text-amber-900 uppercase">
                        Total
                      </td>
                      <td className="px-2 py-2 text-right text-sm font-extrabold text-amber-900 tabular-nums">
                        {totalBatchStock}
                      </td>
                      <td></td>
                      <td className="px-2 py-2 text-right text-sm font-extrabold text-amber-900 tabular-nums">
                        {formatPKR(totalBatchValue)}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            ) : (
              <div className="rounded-xl border-2 border-dashed border-amber-300 bg-amber-50/50 p-8 text-center">
                <Package className="h-10 w-10 text-amber-400 mx-auto mb-2" />
                <div className="font-extrabold text-slate-700 text-sm">No batches yet</div>
                <div className="text-xs text-slate-500 font-semibold mt-1">
                  "Add Batch" click karo — batch number, expiry, quantity fill karo
                </div>
              </div>
            )}
          </section>
        </>
      )}

      {/* Substitutes Toggle */}
      <section className="rounded-2xl border-2 border-slate-200 bg-white p-5">
        <div className="flex items-start gap-3 flex-wrap">
          <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-violet-500 to-purple-700 text-white flex items-center justify-center shadow-md shrink-0">
            <Repeat className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-extrabold text-slate-900 text-lg leading-tight">Alternative Medicines?</h3>
            <p className="text-sm text-slate-600 font-semibold mt-0.5">
              Out-of-stock hone par customer ko substitute suggest ho jayega
            </p>
          </div>
          <button type="button" onClick={() => onToggleSubstitutes(!inventory.hasSubstitutes)}
            className={['inline-flex items-center gap-2 px-4 py-2 rounded-xl font-extrabold text-sm transition shrink-0',
              inventory.hasSubstitutes ? 'bg-violet-100 text-violet-800 hover:bg-violet-200'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'].join(' ')}>
            {inventory.hasSubstitutes ? (<><ToggleRight className="h-5 w-5" /> Yes</>)
              : (<><ToggleLeft className="h-5 w-5" /> Skip</>)}
          </button>
        </div>
      </section>

      {inventory.hasSubstitutes && (
        <section className="rounded-2xl border-2 border-violet-200 bg-white p-5 space-y-4">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div>
              <h3 className="font-extrabold text-slate-900 text-base">Substitute Medicines</h3>
              <p className="text-xs text-slate-500 font-semibold">
                {inventory.substitutes.length} alternative{inventory.substitutes.length !== 1 ? 's' : ''}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowSubstitutePicker(true)}
              className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-purple-700 text-white text-xs font-extrabold inline-flex items-center gap-1 shadow-sm"
            >
              <Plus className="h-3.5 w-3.5" /> Add Substitute
            </button>
          </div>

          {showSubstitutePicker && (
            <div className="rounded-xl border-2 border-violet-300 bg-violet-50 p-3 space-y-2">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    autoFocus
                    value={substituteSearch}
                    onChange={(e) => setSubstituteSearch(e.target.value)}
                    placeholder="Search alternative medicine..."
                    className="h-10 w-full rounded-lg border-2 border-slate-200 bg-white pl-10 pr-3 text-sm font-semibold focus:outline-none focus:border-violet-500"
                  />
                </div>
                <button
                  onClick={() => { setShowSubstitutePicker(false); setSubstituteSearch(''); }}
                  className="h-10 w-10 rounded-lg bg-white hover:bg-slate-100 flex items-center justify-center"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="max-h-56 overflow-y-auto rounded-lg bg-white border border-violet-200">
                {(productsData?.items ?? []).map((p) => {
                  const already = inventory.substitutes.some((s) => s.substituteProductId === p.id);
                  return (
                    <button
                      key={p.id}
                      onClick={() => {
                        if (already) return;
                        onAddSubstitute({
                          substituteProductId: p.id,
                          substituteName: p.name,
                        });
                        setShowSubstitutePicker(false);
                        setSubstituteSearch('');
                      }}
                      disabled={already}
                      className="w-full px-3 py-2 flex items-center gap-3 hover:bg-violet-50 transition text-left border-b border-slate-100 last:border-0 disabled:opacity-40"
                    >
                      <Pill className="h-4 w-4 text-slate-400 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="font-extrabold text-sm truncate">{p.name}</div>
                        <div className="text-xs text-slate-500 font-semibold">
                          {formatPKR(p.price)} • Stock: {p.stock}
                        </div>
                      </div>
                      {already ? <span className="text-[10px] font-extrabold text-emerald-700">✓ Added</span> : <Plus className="h-4 w-4 text-violet-600" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {inventory.substitutes.length > 0 ? (
            <div className="space-y-2">
              {inventory.substitutes.map((sub) => (
                <div key={sub.tempId} className="rounded-xl border-2 border-slate-200 bg-white p-3 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-violet-100 text-violet-700 flex items-center justify-center shrink-0">
                    <Repeat className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-extrabold text-sm text-slate-900 truncate">{sub.substituteName}</div>
                  </div>
                  <button
                    onClick={() => onRemoveSubstitute(sub.tempId)}
                    className="h-8 w-8 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border-2 border-dashed border-violet-300 bg-violet-50/30 p-6 text-center">
              <Repeat className="h-8 w-8 text-violet-400 mx-auto mb-2" />
              <div className="font-extrabold text-slate-700 text-sm">No substitutes added</div>
              <div className="text-xs text-slate-500 font-semibold mt-1">
                Add karo — same salt/generic ki alternate medicines
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
