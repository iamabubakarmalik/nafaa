import { useState } from 'react';
import {
  TrendingUp, Plus, Trash2, AlertCircle, AlertTriangle, Layers,
  ToggleLeft, ToggleRight, DollarSign, Percent, Info, Package,
  Phone, Clock, Truck,
} from 'lucide-react';
import { Input } from '@core/ui/Input';
import { formatPKR, formatPKRFull } from '@core/lib/format';
import type { HardwareWizardBulkTier, HardwareWizardReorder } from '../../hooks/useHardwareWizard';

interface Props {
  basePrice: number;
  unit: string;
  bulkTiers: HardwareWizardBulkTier[];
  onAddTier: (tier: Omit<HardwareWizardBulkTier, 'tempId'>) => void;
  onUpdateTier: (tempId: string, patch: Partial<HardwareWizardBulkTier>) => void;
  onRemoveTier: (tempId: string) => void;
  reorder: HardwareWizardReorder;
  onUpdateReorder: (patch: Partial<HardwareWizardReorder>) => void;
  errors: string[];
}

const PRESET_TIERS = [
  { label: 'Wholesale', minQuantity: 10, discountPct: 5 },
  { label: 'Contractor', minQuantity: 50, discountPct: 10 },
  { label: 'Project', minQuantity: 100, discountPct: 15 },
  { label: 'Bulk Order', minQuantity: 500, discountPct: 20 },
];

export function HardwareWizardStep3BulkReorder({
  basePrice, unit, bulkTiers, onAddTier, onUpdateTier, onRemoveTier,
  reorder, onUpdateReorder, errors,
}: Props) {
  const [customLabel, setCustomLabel] = useState('');
  const [customMinQty, setCustomMinQty] = useState<number | ''>('');
  const [customDiscount, setCustomDiscount] = useState<number | ''>('');

  const addPresetTier = (preset: typeof PRESET_TIERS[0]) => {
    const price = basePrice * (1 - preset.discountPct / 100);
    onAddTier({
      minQuantity: preset.minQuantity,
      maxQuantity: undefined,
      price: Number(price.toFixed(2)),
      discountPct: preset.discountPct,
      label: preset.label,
    });
  };

  const addCustomTier = () => {
    if (!customLabel.trim() || !customMinQty) return;
    const discount = Number(customDiscount || 0);
    const price = discount > 0 ? basePrice * (1 - discount / 100) : basePrice;
    onAddTier({
      minQuantity: Number(customMinQty),
      maxQuantity: undefined,
      price: Number(price.toFixed(2)),
      discountPct: discount || undefined,
      label: customLabel.trim(),
    });
    setCustomLabel('');
    setCustomMinQty('');
    setCustomDiscount('');
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
            </ul>
          </div>
        </div>
      )}

      <div className="rounded-2xl bg-gradient-to-br from-amber-50 to-white border-2 border-amber-200 p-4 flex items-start gap-3">
        <div className="h-10 w-10 rounded-xl bg-amber-600 text-white flex items-center justify-center shadow-md shrink-0">
          <TrendingUp className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <h3 className="font-extrabold text-amber-900 text-sm">Bulk Tier Pricing & Auto-Reorder</h3>
          <p className="text-xs text-amber-800 font-semibold mt-0.5">
            Contractors ke liye tier pricing + stock kam hone par automatic alert
          </p>
        </div>
      </div>

      {/* BULK PRICING TIERS */}
      <section className="rounded-2xl border-2 border-amber-200 bg-white p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-700 text-white flex items-center justify-center shadow-md">
            <Layers className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <h3 className="font-extrabold text-slate-900 text-base">Bulk Pricing Tiers</h3>
            <p className="text-xs text-slate-500 font-semibold">
              Base price: <strong className="text-emerald-700">{formatPKRFull(basePrice)}</strong> per {unit}
              {bulkTiers.length > 0 && ` • ${bulkTiers.length} tier${bulkTiers.length !== 1 ? 's' : ''}`}
            </p>
          </div>
        </div>

        {/* Preset Quick Add */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-2">Quick Add Presets</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {PRESET_TIERS.map((p) => {
              const exists = bulkTiers.some((t) => t.label === p.label);
              return (
                <button
                  key={p.label} type="button"
                  onClick={() => addPresetTier(p)}
                  disabled={exists || basePrice <= 0}
                  className={[
                    'p-3 rounded-xl border-2 text-center transition',
                    exists
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                      : basePrice <= 0
                        ? 'border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-amber-500 hover:bg-amber-50',
                  ].join(' ')}
                >
                  <div className="text-xs font-extrabold">{p.label}</div>
                  <div className="text-[10px] font-bold mt-0.5">{p.minQuantity}+ {unit}</div>
                  <div className="text-[10px] font-extrabold text-emerald-700 mt-0.5">-{p.discountPct}%</div>
                  {exists && <div className="text-[9px] text-emerald-600 mt-0.5">✓ Added</div>}
                </button>
              );
            })}
          </div>
          {basePrice <= 0 && (
            <div className="mt-2 text-xs text-rose-600 font-semibold">
              ⚠️ Base price required — Step 1 mein sale price fill karo
            </div>
          )}
        </div>

        {/* Custom Tier */}
        <div className="rounded-xl border-2 border-dashed border-amber-300 p-3 space-y-2">
          <div className="text-xs font-extrabold text-slate-700">Custom Tier</div>
          <div className="grid sm:grid-cols-4 gap-2">
            <input value={customLabel} onChange={(e) => setCustomLabel(e.target.value)}
              placeholder="Tier name" className="h-10 rounded-lg border-2 border-slate-200 bg-white px-3 text-xs font-bold focus:outline-none focus:border-amber-500" />
            <input type="number" value={customMinQty}
              onChange={(e) => setCustomMinQty(e.target.value === '' ? '' : Number(e.target.value))}
              placeholder={`Min qty (${unit})`}
              className="h-10 rounded-lg border-2 border-slate-200 bg-white px-3 text-xs font-bold tabular-nums focus:outline-none focus:border-amber-500" />
            <input type="number" step="0.01" value={customDiscount}
              onChange={(e) => setCustomDiscount(e.target.value === '' ? '' : Number(e.target.value))}
              placeholder="Discount %"
              className="h-10 rounded-lg border-2 border-slate-200 bg-white px-3 text-xs font-bold tabular-nums focus:outline-none focus:border-amber-500" />
            <button type="button" onClick={addCustomTier}
              disabled={!customLabel.trim() || !customMinQty}
              className="h-10 rounded-lg bg-amber-600 hover:bg-amber-700 disabled:opacity-40 text-white text-xs font-extrabold inline-flex items-center justify-center gap-1">
              <Plus className="h-3.5 w-3.5" />
              Add
            </button>
          </div>
        </div>

        {/* Tiers Table */}
        {bulkTiers.length > 0 ? (
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-xs">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-2 py-2 text-left font-extrabold uppercase tracking-wider text-slate-700 text-[9px]">Tier Label</th>
                  <th className="px-2 py-2 text-right font-extrabold uppercase tracking-wider text-slate-700 text-[9px]">Min Qty</th>
                  <th className="px-2 py-2 text-right font-extrabold uppercase tracking-wider text-slate-700 text-[9px]">Max Qty</th>
                  <th className="px-2 py-2 text-right font-extrabold uppercase tracking-wider text-slate-700 text-[9px]">Price/{unit}</th>
                  <th className="px-2 py-2 text-right font-extrabold uppercase tracking-wider text-slate-700 text-[9px]">Discount</th>
                  <th className="px-2 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {bulkTiers.map((t) => {
                  const calculatedDiscount = basePrice > 0 ? ((basePrice - t.price) / basePrice) * 100 : 0;
                  return (
                    <tr key={t.tempId} className="hover:bg-amber-50/50">
                      <td className="px-2 py-1.5">
                        <input value={t.label}
                          onChange={(e) => onUpdateTier(t.tempId, { label: e.target.value })}
                          className="w-32 h-8 rounded-lg border-2 border-slate-200 px-2 text-xs font-extrabold focus:outline-none focus:border-amber-500" />
                      </td>
                      <td className="px-2 py-1.5">
                        <input type="number" value={t.minQuantity}
                          onChange={(e) => onUpdateTier(t.tempId, { minQuantity: Number(e.target.value || 0) })}
                          className="w-20 h-8 rounded-lg border-2 border-slate-200 px-2 text-xs font-bold tabular-nums text-right focus:outline-none focus:border-amber-500" />
                      </td>
                      <td className="px-2 py-1.5">
                        <input type="number" value={t.maxQuantity ?? ''}
                          onChange={(e) => onUpdateTier(t.tempId, { maxQuantity: e.target.value === '' ? undefined : Number(e.target.value) })}
                          placeholder="∞"
                          className="w-20 h-8 rounded-lg border-2 border-slate-200 px-2 text-xs font-bold tabular-nums text-right focus:outline-none focus:border-amber-500" />
                      </td>
                      <td className="px-2 py-1.5">
                        <input type="number" step="0.01" value={t.price}
                          onChange={(e) => onUpdateTier(t.tempId, { price: Number(e.target.value || 0) })}
                          className="w-24 h-8 rounded-lg border-2 border-emerald-200 bg-emerald-50 px-2 text-xs font-extrabold tabular-nums text-right text-emerald-800 focus:outline-none focus:border-emerald-500" />
                      </td>
                      <td className="px-2 py-1.5 text-right text-xs font-extrabold text-amber-700 tabular-nums">
                        -{calculatedDiscount.toFixed(1)}%
                      </td>
                      <td className="px-2 py-1.5">
                        <button onClick={() => onRemoveTier(t.tempId)}
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
          <div className="rounded-xl border-2 border-dashed border-amber-300 bg-amber-50 p-6 text-center">
            <Layers className="h-10 w-10 text-amber-400 mx-auto mb-2" />
            <div className="font-extrabold text-slate-700 text-sm">No bulk tiers</div>
            <div className="text-xs text-slate-500 font-semibold mt-1">
              Preset chip click karo, ya custom tier add karo
            </div>
          </div>
        )}
      </section>

      {/* REORDER RULES */}
      <section className="rounded-2xl border-2 border-rose-200 bg-gradient-to-br from-rose-50 to-white p-5 space-y-4">
        <div className="flex items-start gap-3 flex-wrap">
          <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-rose-500 to-red-700 text-white flex items-center justify-center shadow-md shrink-0">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-extrabold text-rose-900 text-lg leading-tight">Auto-Reorder Alerts</h3>
            <p className="text-sm text-rose-700 font-semibold mt-0.5">
              Stock kam hone par WhatsApp/notification bhejo
            </p>
          </div>
          <button type="button" onClick={() => onUpdateReorder({ enabled: !reorder.enabled })}
            className={[
              'inline-flex items-center gap-2 px-4 py-2 rounded-xl font-extrabold text-sm transition shrink-0',
              reorder.enabled
                ? 'bg-rose-100 text-rose-800 hover:bg-rose-200'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
            ].join(' ')}>
            {reorder.enabled
              ? (<><ToggleRight className="h-5 w-5" /> Enabled</>)
              : (<><ToggleLeft className="h-5 w-5" /> Disabled</>)}
          </button>
        </div>

        {reorder.enabled && (
          <>
            <div className="grid sm:grid-cols-3 gap-3">
              <Input label={`Min Stock (${unit})`} type="number"
                value={reorder.minStock}
                onChange={(e) => onUpdateReorder({ minStock: Number(e.target.value || 0) })}
                hint="Absolute minimum" />
              <Input label={`Reorder Point (${unit})`} type="number"
                value={reorder.reorderPoint}
                onChange={(e) => onUpdateReorder({ reorderPoint: Number(e.target.value || 0) })}
                hint="Alert when stock ≤ this" />
              <Input label={`Reorder Qty (${unit})`} type="number"
                value={reorder.reorderQty}
                onChange={(e) => onUpdateReorder({ reorderQty: Number(e.target.value || 0) })}
                hint="How much to order" />
            </div>
            <div className="grid sm:grid-cols-3 gap-3">
              <Input label={`Max Stock (${unit})`} type="number"
                value={reorder.maxStock}
                onChange={(e) => onUpdateReorder({ maxStock: e.target.value === '' ? '' : Number(e.target.value) })}
                placeholder="Optional cap" />
              <Input label="Lead Time (days)" type="number"
                value={reorder.leadTimeDays}
                onChange={(e) => onUpdateReorder({ leadTimeDays: e.target.value === '' ? '' : Number(e.target.value) })}
                placeholder="e.g. 3"
                leftIcon={<Clock className="h-4 w-4 text-slate-400" />} />
              <Input label="Preferred Supplier" value={reorder.preferredSupplier}
                onChange={(e) => onUpdateReorder({ preferredSupplier: e.target.value })}
                placeholder="Supplier name"
                leftIcon={<Truck className="h-4 w-4 text-slate-400" />} />
            </div>
            <Input label="Emergency Contact (phone)" value={reorder.emergencyContact}
              onChange={(e) => onUpdateReorder({ emergencyContact: e.target.value })}
              placeholder="03XX-XXXXXXX"
              leftIcon={<Phone className="h-4 w-4 text-slate-400" />}
              hint="Bhi contact karna hai jab stock khatam ho" />

            <label className="flex items-center gap-3 p-3 rounded-xl border-2 border-blue-200 bg-blue-50 cursor-pointer">
              <input type="checkbox" checked={reorder.autoAlert}
                onChange={(e) => onUpdateReorder({ autoAlert: e.target.checked })}
                className="h-5 w-5 rounded" />
              <div className="flex-1">
                <div className="text-sm font-extrabold text-blue-900">Auto Alert System</div>
                <div className="text-xs text-blue-700 font-semibold">Notification bhejo jab reorder point pahunche</div>
              </div>
            </label>
          </>
        )}

        {!reorder.enabled && (
          <div className="rounded-xl bg-slate-50 border-2 border-slate-200 p-4 flex items-start gap-2">
            <Info className="h-4 w-4 text-slate-600 shrink-0 mt-0.5" />
            <div className="text-xs text-slate-700 font-semibold">
              Reorder alerts off hain — stock kam ho gaya to koi automatic notification nahi jayegi.
              Manual tracking karni padegi.
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
