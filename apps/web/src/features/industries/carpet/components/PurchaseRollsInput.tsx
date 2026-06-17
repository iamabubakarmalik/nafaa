import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Plus, Trash2, Layers, Ruler, AlertTriangle, Copy, Calculator,
} from 'lucide-react';
import { productVariantsApi } from '@/api/product-variants.api';
import { formatPKRFull } from '@/lib/format';

export interface PurchaseRoll {
  id: string;
  rollNumber: string;
  designCode: string;
  widthFt: string;
  widthInch: string;
  lengthFt: string;
  costPerSqft: string;
  salePricePerSqft: string;
  variantId: string;
  rackNumber: string;
  notes: string;
  quality: string;
  pile: string;
}

interface Props {
  productId: string;
  productName: string;
  defaultCostPerSqft?: number;
  rolls: PurchaseRoll[];
  onChange: (rolls: PurchaseRoll[]) => void;
  /** Optional: when total sqft must match an external value */
  expectedTotalSqft?: number;
}

const newRoll = (): PurchaseRoll => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  rollNumber: '',
  designCode: '',
  widthFt: '12',
  widthInch: '0',
  lengthFt: '',
  costPerSqft: '',
  salePricePerSqft: '',
  variantId: '',
  rackNumber: '',
  notes: '',
  quality: '',
  pile: '',
});

export function PurchaseRollsInput({
  productId, productName, defaultCostPerSqft, rolls, onChange, expectedTotalSqft,
}: Props) {
  const [showAdvanced, setShowAdvanced] = useState<Record<string, boolean>>({});

  const { data: variants = [] } = useQuery({
    queryKey: ['product-variants', productId],
    queryFn: () => productVariantsApi.list(productId),
    enabled: !!productId,
  });

  const activeVariants = variants.filter((v) => v.isActive);

  // ─── Add roll ─────────────────────────────────────────────
  const addRoll = () => {
    const initial = newRoll();
    if (defaultCostPerSqft) initial.costPerSqft = String(defaultCostPerSqft);
    onChange([...rolls, initial]);
  };

  // ─── Add multiple rolls (quick bulk) ──────────────────────
  const addMultiple = (count: number) => {
    const newRolls: PurchaseRoll[] = [];
    for (let i = 0; i < count; i++) {
      const r = newRoll();
      if (defaultCostPerSqft) r.costPerSqft = String(defaultCostPerSqft);
      newRolls.push(r);
    }
    onChange([...rolls, ...newRolls]);
  };

  const updateRoll = (id: string, patch: Partial<PurchaseRoll>) => {
    onChange(rolls.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  const removeRoll = (id: string) => {
    onChange(rolls.filter((r) => r.id !== id));
  };

  const duplicateRoll = (id: string) => {
    const roll = rolls.find((r) => r.id === id);
    if (!roll) return;
    const copy: PurchaseRoll = {
      ...roll,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      rollNumber: '',
    };
    onChange([...rolls, copy]);
  };

  // ─── Calculations ─────────────────────────────────────────
  const stats = useMemo(() => {
    let totalSqft = 0;
    let totalCost = 0;
    let totalSaleValue = 0;
    let invalidCount = 0;

    rolls.forEach((r) => {
      const widthFt = Number(r.widthFt) || 0;
      const widthInch = Number(r.widthInch) || 0;
      const lengthFt = Number(r.lengthFt) || 0;
      const costPerSqft = Number(r.costPerSqft) || 0;
      const salePerSqft = Number(r.salePricePerSqft) || 0;

      if (widthFt <= 0 || lengthFt <= 0) {
        invalidCount++;
        return;
      }
      const fullWidth = widthFt + widthInch / 12;
      const sqft = fullWidth * lengthFt;
      totalSqft += sqft;
      totalCost += sqft * costPerSqft;
      totalSaleValue += sqft * salePerSqft;
    });

    const expectedProfit = totalSaleValue - totalCost;
    const matchesExpected =
      expectedTotalSqft !== undefined
        ? Math.abs(totalSqft - expectedTotalSqft) <= 0.5
        : true;

    return {
      totalSqft: Number(totalSqft.toFixed(2)),
      totalCost: Number(totalCost.toFixed(2)),
      totalSaleValue: Number(totalSaleValue.toFixed(2)),
      expectedProfit: Number(expectedProfit.toFixed(2)),
      invalidCount,
      matchesExpected,
    };
  }, [rolls, expectedTotalSqft]);

  return (
    <div className="rounded-2xl border-2 border-emerald-200 bg-emerald-50/30 p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center">
            <Layers className="h-4 w-4" />
          </div>
          <div>
            <div className="font-bold text-emerald-900 text-sm">
              Carpet Rolls — {productName}
            </div>
            <div className="text-[10px] text-emerald-700 font-bold">
              {rolls.length} roll{rolls.length !== 1 ? 's' : ''} • {stats.totalSqft.toFixed(2)} sqft total
            </div>
          </div>
        </div>

        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={addRoll}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
          >
            <Plus className="h-3 w-3" /> Add Roll
          </button>
          <select
            onChange={(e) => {
              if (!e.target.value) return;
              addMultiple(Number(e.target.value));
              e.target.value = '';
            }}
            className="h-7 rounded-lg border-2 border-emerald-300 bg-white px-2 text-[11px] font-bold text-emerald-700"
            defaultValue=""
          >
            <option value="">+ Bulk</option>
            <option value="2">+ 2 rolls</option>
            <option value="5">+ 5 rolls</option>
            <option value="10">+ 10 rolls</option>
          </select>
        </div>
      </div>

      {/* Stats banner */}
      {rolls.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          <div className="rounded-lg bg-white border border-emerald-200 p-2">
            <div className="text-[9px] uppercase font-bold text-emerald-700">Total Sqft</div>
            <div className="text-base font-extrabold text-emerald-900">{stats.totalSqft.toFixed(2)}</div>
            {expectedTotalSqft !== undefined && !stats.matchesExpected && (
              <div className="text-[9px] text-rose-600 font-bold mt-0.5">
                Expected: {expectedTotalSqft}
              </div>
            )}
          </div>
          <div className="rounded-lg bg-white border border-emerald-200 p-2">
            <div className="text-[9px] uppercase font-bold text-emerald-700">Total Cost</div>
            <div className="text-base font-extrabold text-slate-900">{formatPKRFull(stats.totalCost)}</div>
          </div>
          <div className="rounded-lg bg-white border border-emerald-200 p-2">
            <div className="text-[9px] uppercase font-bold text-emerald-700">Sale Value</div>
            <div className="text-base font-extrabold text-blue-900">{formatPKRFull(stats.totalSaleValue)}</div>
          </div>
          <div className="rounded-lg bg-amber-50 border border-amber-200 p-2">
            <div className="text-[9px] uppercase font-bold text-amber-700">Profit Est.</div>
            <div className="text-base font-extrabold text-amber-900">{formatPKRFull(stats.expectedProfit)}</div>
          </div>
        </div>
      )}

      {/* Mismatch warning */}
      {expectedTotalSqft !== undefined && !stats.matchesExpected && rolls.length > 0 && (
        <div className="rounded-lg bg-rose-50 border-2 border-rose-200 p-2.5 flex items-start gap-2">
          <AlertTriangle className="h-3.5 w-3.5 text-rose-700 shrink-0 mt-0.5" />
          <div className="text-[11px] text-rose-800">
            <strong>Mismatch:</strong> Total rolls sqft ({stats.totalSqft}) item quantity ({expectedTotalSqft}) se match nahi kar raha.
            Save kar saktay hain lekin backend reject kar dega.
          </div>
        </div>
      )}

      {/* Rolls list */}
      <div className="space-y-2">
        {rolls.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-emerald-300 bg-white p-6 text-center">
            <Layers className="h-8 w-8 text-emerald-400 mx-auto mb-2" />
            <div className="text-sm font-bold text-emerald-900">No rolls added yet</div>
            <div className="text-xs text-emerald-700 mt-1">Click "Add Roll" to enter roll details</div>
          </div>
        ) : (
          rolls.map((roll, idx) => {
            const isAdvanced = showAdvanced[roll.id] ?? false;
            const widthFt = Number(roll.widthFt) || 0;
            const widthInch = Number(roll.widthInch) || 0;
            const lengthFt = Number(roll.lengthFt) || 0;
            const fullWidth = widthFt + widthInch / 12;
            const sqft = fullWidth * lengthFt;

            return (
              <div
                key={roll.id}
                className="rounded-xl bg-white border-2 border-emerald-200 p-3 space-y-2"
              >
                {/* Top row */}
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-lg bg-emerald-100 text-emerald-700 font-extrabold text-xs flex items-center justify-center shrink-0">
                    {idx + 1}
                  </div>
                  <input
                    type="text"
                    placeholder="Roll # (auto if empty)"
                    value={roll.rollNumber}
                    onChange={(e) => updateRoll(roll.id, { rollNumber: e.target.value })}
                    className="h-8 flex-1 rounded-lg border border-slate-200 px-2.5 text-xs font-mono font-bold focus:outline-none focus:border-emerald-500"
                  />
                  {activeVariants.length > 0 && (
                    <select
                      value={roll.variantId}
                      onChange={(e) => updateRoll(roll.id, { variantId: e.target.value })}
                      className="h-8 rounded-lg border border-violet-300 bg-violet-50 px-2 text-[11px] font-bold text-violet-700 max-w-[140px]"
                    >
                      <option value="">No color</option>
                      {activeVariants.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.name}
                          {v.color ? ` (${v.color})` : ''}
                        </option>
                      ))}
                    </select>
                  )}
                  <button
                    type="button"
                    onClick={() => duplicateRoll(roll.id)}
                    className="h-7 w-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center"
                    title="Duplicate"
                  >
                    <Copy className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeRoll(roll.id)}
                    className="h-7 w-7 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>

                {/* Dimensions row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div>
                    <label className="block text-[9px] font-bold text-slate-500 uppercase mb-0.5">Width (ft)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={roll.widthFt}
                      onChange={(e) => updateRoll(roll.id, { widthFt: e.target.value })}
                      placeholder="12"
                      className="h-8 w-full rounded-lg border border-slate-200 px-2 text-xs font-bold focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-slate-500 uppercase mb-0.5">Width (in)</label>
                    <input
                      type="number"
                      step="0.5"
                      value={roll.widthInch}
                      onChange={(e) => updateRoll(roll.id, { widthInch: e.target.value })}
                      placeholder="0"
                      className="h-8 w-full rounded-lg border border-slate-200 px-2 text-xs font-bold focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-slate-500 uppercase mb-0.5">Length (ft)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={roll.lengthFt}
                      onChange={(e) => updateRoll(roll.id, { lengthFt: e.target.value })}
                      placeholder="100"
                      className="h-8 w-full rounded-lg border-2 border-emerald-300 bg-emerald-50 px-2 text-xs font-bold focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-slate-500 uppercase mb-0.5">Total Sqft</label>
                    <div className="h-8 rounded-lg bg-slate-50 border border-slate-200 px-2 flex items-center text-xs font-extrabold text-emerald-700">
                      {sqft > 0 ? sqft.toFixed(2) : '—'}
                    </div>
                  </div>
                </div>

                {/* Pricing row */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[9px] font-bold text-slate-500 uppercase mb-0.5">Cost / sqft</label>
                    <input
                      type="number"
                      step="0.01"
                      value={roll.costPerSqft}
                      onChange={(e) => updateRoll(roll.id, { costPerSqft: e.target.value })}
                      placeholder="72"
                      className="h-8 w-full rounded-lg border border-slate-200 px-2 text-xs font-bold focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-slate-500 uppercase mb-0.5">Sale / sqft</label>
                    <input
                      type="number"
                      step="0.01"
                      value={roll.salePricePerSqft}
                      onChange={(e) => updateRoll(roll.id, { salePricePerSqft: e.target.value })}
                      placeholder="90"
                      className="h-8 w-full rounded-lg border border-slate-200 px-2 text-xs font-bold focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                {/* Advanced toggle */}
                <button
                  type="button"
                  onClick={() => setShowAdvanced((s) => ({ ...s, [roll.id]: !isAdvanced }))}
                  className="text-[10px] font-bold text-emerald-700 hover:underline"
                >
                  {isAdvanced ? '− Hide advanced' : '+ Show advanced (design code, rack, quality)'}
                </button>

                {/* Advanced fields */}
                {isAdvanced && (
                  <div className="pt-2 border-t border-emerald-100 grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Design code"
                      value={roll.designCode}
                      onChange={(e) => updateRoll(roll.id, { designCode: e.target.value })}
                      className="h-8 rounded-lg border border-slate-200 px-2 text-xs font-bold focus:outline-none focus:border-emerald-500"
                    />
                    <input
                      type="text"
                      placeholder="Rack / Location"
                      value={roll.rackNumber}
                      onChange={(e) => updateRoll(roll.id, { rackNumber: e.target.value })}
                      className="h-8 rounded-lg border border-slate-200 px-2 text-xs font-bold focus:outline-none focus:border-emerald-500"
                    />
                    <input
                      type="text"
                      placeholder="Quality (Premium / Standard)"
                      value={roll.quality}
                      onChange={(e) => updateRoll(roll.id, { quality: e.target.value })}
                      className="h-8 rounded-lg border border-slate-200 px-2 text-xs font-bold focus:outline-none focus:border-emerald-500"
                    />
                    <input
                      type="text"
                      placeholder="Pile (Wool / Synthetic)"
                      value={roll.pile}
                      onChange={(e) => updateRoll(roll.id, { pile: e.target.value })}
                      className="h-8 rounded-lg border border-slate-200 px-2 text-xs font-bold focus:outline-none focus:border-emerald-500"
                    />
                    <input
                      type="text"
                      placeholder="Notes"
                      value={roll.notes}
                      onChange={(e) => updateRoll(roll.id, { notes: e.target.value })}
                      className="h-8 col-span-2 rounded-lg border border-slate-200 px-2 text-xs font-bold focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Help hint */}
      {rolls.length > 0 && (
        <div className="rounded-lg bg-blue-50 border border-blue-200 p-2 flex items-start gap-2">
          <Calculator className="h-3 w-3 text-blue-700 shrink-0 mt-0.5" />
          <div className="text-[10px] text-blue-900">
            <strong>Tip:</strong> Roll number khali chhor dein to system auto generate karega (CR-2026-XXXX format).
            Item quantity rolls ke total sqft ke barabar honi chahiye.
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Helper: Convert PurchaseRoll[] (form state) to backend payload format
 */
export function rollsToPayload(rolls: PurchaseRoll[]): any[] {
  return rolls
    .filter((r) => Number(r.widthFt) > 0 && Number(r.lengthFt) > 0)
    .map((r) => ({
      rollNumber: r.rollNumber.trim() || undefined,
      designCode: r.designCode.trim() || undefined,
      widthFt: Number(r.widthFt),
      widthInch: Number(r.widthInch) || 0,
      lengthFt: Number(r.lengthFt),
      costPerSqft: r.costPerSqft ? Number(r.costPerSqft) : undefined,
      salePricePerSqft: r.salePricePerSqft ? Number(r.salePricePerSqft) : undefined,
      variantId: r.variantId || undefined,
      rackNumber: r.rackNumber.trim() || undefined,
      notes: r.notes.trim() || undefined,
      quality: r.quality.trim() || undefined,
      pile: r.pile.trim() || undefined,
    }));
}

/**
 * Helper: Calculate total sqft from rolls
 */
export function calculateRollsTotal(rolls: PurchaseRoll[]): number {
  return rolls.reduce((sum, r) => {
    const w = (Number(r.widthFt) || 0) + (Number(r.widthInch) || 0) / 12;
    const l = Number(r.lengthFt) || 0;
    return sum + w * l;
  }, 0);
}
