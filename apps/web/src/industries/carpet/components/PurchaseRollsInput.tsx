import { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Plus, Trash2, Layers, AlertTriangle, Copy, Calculator, RefreshCw,
} from 'lucide-react';
import { productVariantsApi } from '@modules/inventory/products/api/product-variants.api';
import { formatPKRFull } from '@core/lib/format';

export interface PurchaseRoll {
  id: string;
  rollNumber: string;
  designCode: string;
  widthFt: string;
  widthInch: string;
  lengthFt: string;
  lengthInch: string;
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
  expectedTotalSqft?: number;
}

const newRoll = (): PurchaseRoll => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  rollNumber: '', designCode: '',
  widthFt: '12', widthInch: '0',
  lengthFt: '', lengthInch: '0',
  costPerSqft: '', salePricePerSqft: '',
  variantId: '', rackNumber: '', notes: '', quality: '', pile: '',
});

export function PurchaseRollsInput({
  productId, productName, defaultCostPerSqft, rolls, onChange, expectedTotalSqft,
}: Props) {
  const [showAdvanced, setShowAdvanced] = useState<Record<string, boolean>>({});

  const { data: variants = [], isLoading: variantsLoading } = useQuery({
    queryKey: ['product-variants', productId],
    queryFn: () => productVariantsApi.list(productId),
    enabled: !!productId,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const activeVariants = variants.filter((v) => v.isActive);

  // Auto-select first variant when variants load and rolls have no variant
  useEffect(() => {
    if (variantsLoading || activeVariants.length === 0) return;
    let changed = false;
    const patched = rolls.map((r) => {
      if (!r.variantId && activeVariants.length > 0) {
        changed = true;
        return { ...r, variantId: activeVariants[0].id };
      }
      return r;
    });
    if (changed) onChange(patched);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [variantsLoading, activeVariants.length]);

  const addRoll = () => {
    const init = newRoll();
    if (defaultCostPerSqft) init.costPerSqft = String(defaultCostPerSqft);
    if (activeVariants.length > 0) init.variantId = activeVariants[0].id;
    onChange([...rolls, init]);
  };

  const addMultiple = (count: number) => {
    const arr: PurchaseRoll[] = [];
    for (let i = 0; i < count; i++) {
      const r = newRoll();
      if (defaultCostPerSqft) r.costPerSqft = String(defaultCostPerSqft);
      if (activeVariants.length > 0) r.variantId = activeVariants[0].id;
      arr.push(r);
    }
    onChange([...rolls, ...arr]);
  };

  const updateRoll = (id: string, patch: Partial<PurchaseRoll>) => {
    onChange(rolls.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  const removeRoll = (id: string) => onChange(rolls.filter((r) => r.id !== id));

  const duplicateRoll = (id: string) => {
    const roll = rolls.find((r) => r.id === id);
    if (!roll) return;
    onChange([...rolls, {
      ...roll,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      rollNumber: '',
    }]);
  };

  const stats = useMemo(() => {
    let totalSqft = 0, totalCost = 0, totalSaleValue = 0, invalidCount = 0;
    rolls.forEach((r) => {
      const wFt = Number(r.widthFt) || 0;
      const wIn = Number(r.widthInch) || 0;
      const lFt = Number(r.lengthFt) || 0;
      const lIn = Number(r.lengthInch) || 0;
      if (wFt <= 0 || lFt <= 0) { invalidCount++; return; }
      const fullW = wFt + wIn / 12;
      const fullL = lFt + lIn / 12;
      const sqft = fullW * fullL;
      totalSqft += sqft;
      totalCost += sqft * (Number(r.costPerSqft) || 0);
      totalSaleValue += sqft * (Number(r.salePricePerSqft) || 0);
    });
    const expectedProfit = totalSaleValue - totalCost;
    const matches = expectedTotalSqft !== undefined
      ? Math.abs(totalSqft - expectedTotalSqft) <= 0.5 : true;
    return {
      totalSqft: Number(totalSqft.toFixed(2)),
      totalCost: Number(totalCost.toFixed(2)),
      totalSaleValue: Number(totalSaleValue.toFixed(2)),
      expectedProfit: Number(expectedProfit.toFixed(2)),
      invalidCount, matches,
    };
  }, [rolls, expectedTotalSqft]);

  return (
    <div className="rounded-2xl border-2 border-emerald-200 bg-emerald-50/30 p-4 space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-600 to-emerald-700 text-white flex items-center justify-center shadow-md">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <div className="font-extrabold text-emerald-900 text-base">Carpet Rolls — {productName}</div>
            <div className="text-xs text-emerald-700 font-bold">
              {rolls.length} roll{rolls.length !== 1 ? 's' : ''} • {stats.totalSqft.toFixed(2)} sqft
              {variantsLoading && <span className="ml-2 inline-flex items-center gap-1 text-blue-700"><RefreshCw className="h-2.5 w-2.5 animate-spin" /> loading variants...</span>}
            </div>
          </div>
        </div>

        <div className="flex gap-1.5">
          <button type="button" onClick={addRoll}
            className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-extrabold shadow-sm">
            <Plus className="h-3.5 w-3.5" /> Add Roll
          </button>
          <select onChange={(e) => { if (!e.target.value) return; addMultiple(Number(e.target.value)); e.target.value = ''; }}
            className="h-9 rounded-lg border-2 border-emerald-300 bg-white px-2 text-xs font-extrabold text-emerald-700"
            defaultValue="">
            <option value="">+ Bulk</option>
            <option value="2">+ 2 rolls</option>
            <option value="5">+ 5 rolls</option>
            <option value="10">+ 10 rolls</option>
          </select>
        </div>
      </div>

      {rolls.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div className="rounded-lg bg-white border-2 border-emerald-200 p-2.5">
            <div className="text-[10px] uppercase font-extrabold text-emerald-700">Total Sqft</div>
            <div className="text-lg font-extrabold text-emerald-900 tabular-nums">{stats.totalSqft.toFixed(2)}</div>
            {expectedTotalSqft !== undefined && !stats.matches && (
              <div className="text-[10px] text-rose-600 font-bold mt-0.5">Expected: {expectedTotalSqft}</div>
            )}
          </div>
          <div className="rounded-lg bg-white border-2 border-emerald-200 p-2.5">
            <div className="text-[10px] uppercase font-extrabold text-emerald-700">Total Cost</div>
            <div className="text-lg font-extrabold text-slate-900 tabular-nums">{formatPKRFull(stats.totalCost)}</div>
          </div>
          <div className="rounded-lg bg-white border-2 border-emerald-200 p-2.5">
            <div className="text-[10px] uppercase font-extrabold text-emerald-700">Sale Value</div>
            <div className="text-lg font-extrabold text-blue-900 tabular-nums">{formatPKRFull(stats.totalSaleValue)}</div>
          </div>
          <div className="rounded-lg bg-amber-50 border-2 border-amber-200 p-2.5">
            <div className="text-[10px] uppercase font-extrabold text-amber-700">Profit Est.</div>
            <div className="text-lg font-extrabold text-amber-900 tabular-nums">{formatPKRFull(stats.expectedProfit)}</div>
          </div>
        </div>
      )}

      {expectedTotalSqft !== undefined && !stats.matches && rolls.length > 0 && (
        <div className="rounded-lg bg-rose-50 border-2 border-rose-200 p-3 flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 text-rose-700 shrink-0 mt-0.5" />
          <div className="text-xs text-rose-800 font-semibold">
            <strong>Mismatch:</strong> Total rolls sqft ({stats.totalSqft}) item qty ({expectedTotalSqft}) se match nahi kar raha.
          </div>
        </div>
      )}

      <div className="space-y-2">
        {rolls.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-emerald-300 bg-white p-8 text-center">
            <Layers className="h-10 w-10 text-emerald-400 mx-auto mb-2" />
            <div className="text-base font-extrabold text-emerald-900">No rolls added yet</div>
            <div className="text-sm text-emerald-700 mt-1 font-semibold">Click "Add Roll" to enter roll details</div>
          </div>
        ) : (
          rolls.map((roll, idx) => {
            const isAdv = showAdvanced[roll.id] ?? false;
            const wFt = Number(roll.widthFt) || 0;
            const wIn = Number(roll.widthInch) || 0;
            const lFt = Number(roll.lengthFt) || 0;
            const lIn = Number(roll.lengthInch) || 0;
            const sqft = (wFt + wIn / 12) * (lFt + lIn / 12);

            return (
              <div key={roll.id} className="rounded-xl bg-white border-2 border-emerald-200 p-3 space-y-2 hover:shadow-sm transition">
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="h-8 w-8 rounded-lg bg-emerald-100 text-emerald-700 font-extrabold text-sm flex items-center justify-center shrink-0">
                    {idx + 1}
                  </div>
                  <input type="text" placeholder="Roll # (auto if empty)"
                    value={roll.rollNumber}
                    onChange={(e) => updateRoll(roll.id, { rollNumber: e.target.value })}
                    className="h-9 flex-1 min-w-[120px] rounded-lg border-2 border-slate-200 px-2.5 text-sm font-mono font-extrabold focus:outline-none focus:border-emerald-500" />

                  {variantsLoading ? (
                    <div className="h-9 px-2.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold inline-flex items-center gap-1">
                      <RefreshCw className="h-3 w-3 animate-spin" /> Loading...
                    </div>
                  ) : activeVariants.length > 0 && (
                    <select value={roll.variantId}
                      onChange={(e) => updateRoll(roll.id, { variantId: e.target.value })}
                      className="h-9 rounded-lg border-2 border-violet-300 bg-violet-50 px-2 text-xs font-extrabold text-violet-800 max-w-[160px]">
                      <option value="">No color</option>
                      {activeVariants.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.name}{v.color ? ` (${v.color})` : ''}
                        </option>
                      ))}
                    </select>
                  )}
                  <button type="button" onClick={() => duplicateRoll(roll.id)}
                    className="h-8 w-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center"
                    title="Duplicate">
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                  <button type="button" onClick={() => removeRoll(roll.id)}
                    className="h-8 w-8 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  <Field label="Width (ft)">
                    <input type="number" step="1" value={roll.widthFt}
                      onChange={(e) => updateRoll(roll.id, { widthFt: e.target.value })}
                      placeholder="12"
                      className="h-9 w-full rounded-lg border-2 border-slate-200 px-2 text-sm font-extrabold text-right focus:outline-none focus:border-emerald-500" />
                  </Field>
                  <Field label="Width (in)">
                    <input type="number" step="1" min="0" max="11" value={roll.widthInch}
                      onChange={(e) => updateRoll(roll.id, { widthInch: e.target.value })}
                      placeholder="0"
                      className="h-9 w-full rounded-lg border-2 border-slate-200 px-2 text-sm font-extrabold text-right focus:outline-none focus:border-emerald-500" />
                  </Field>
                  <Field label="Length (ft) *">
                    <input type="number" step="1" value={roll.lengthFt}
                      onChange={(e) => updateRoll(roll.id, { lengthFt: e.target.value })}
                      placeholder="29"
                      className="h-9 w-full rounded-lg border-2 border-emerald-300 bg-emerald-50 px-2 text-sm font-extrabold text-right focus:outline-none focus:border-emerald-500" />
                  </Field>
                  <Field label="Length (in)">
                    <input type="number" step="1" min="0" max="11" value={roll.lengthInch}
                      onChange={(e) => updateRoll(roll.id, { lengthInch: e.target.value })}
                      placeholder="0"
                      className="h-9 w-full rounded-lg border-2 border-slate-200 px-2 text-sm font-extrabold text-right focus:outline-none focus:border-emerald-500" />
                  </Field>
                  <Field label="Total Sqft">
                    <div className="h-9 rounded-lg bg-emerald-50 border-2 border-emerald-200 px-2 flex items-center justify-end text-sm font-extrabold text-emerald-700 tabular-nums">
                      {sqft > 0 ? sqft.toFixed(2) : '—'}
                    </div>
                  </Field>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Field label="Cost / sqft">
                    <input type="number" step="0.01" value={roll.costPerSqft}
                      onChange={(e) => updateRoll(roll.id, { costPerSqft: e.target.value })}
                      placeholder="72"
                      className="h-9 w-full rounded-lg border-2 border-slate-200 px-2 text-sm font-extrabold text-right focus:outline-none focus:border-blue-500" />
                  </Field>
                  <Field label="Sale / sqft">
                    <input type="number" step="0.01" value={roll.salePricePerSqft}
                      onChange={(e) => updateRoll(roll.id, { salePricePerSqft: e.target.value })}
                      placeholder="90"
                      className="h-9 w-full rounded-lg border-2 border-slate-200 px-2 text-sm font-extrabold text-right focus:outline-none focus:border-emerald-500" />
                  </Field>
                </div>

                <button type="button"
                  onClick={() => setShowAdvanced((s) => ({ ...s, [roll.id]: !isAdv }))}
                  className="text-xs font-extrabold text-emerald-700 hover:underline">
                  {isAdv ? '− Hide advanced' : '+ Show advanced (design, rack, quality, pile)'}
                </button>

                {isAdv && (
                  <div className="pt-2 border-t-2 border-emerald-100 grid grid-cols-2 gap-2">
                    <input type="text" placeholder="Design code" value={roll.designCode}
                      onChange={(e) => updateRoll(roll.id, { designCode: e.target.value })}
                      className="h-9 rounded-lg border-2 border-slate-200 px-2 text-sm font-bold focus:outline-none focus:border-emerald-500" />
                    <input type="text" placeholder="Rack / Location" value={roll.rackNumber}
                      onChange={(e) => updateRoll(roll.id, { rackNumber: e.target.value })}
                      className="h-9 rounded-lg border-2 border-slate-200 px-2 text-sm font-bold focus:outline-none focus:border-emerald-500" />
                    <input type="text" placeholder="Quality" value={roll.quality}
                      onChange={(e) => updateRoll(roll.id, { quality: e.target.value })}
                      className="h-9 rounded-lg border-2 border-slate-200 px-2 text-sm font-bold focus:outline-none focus:border-emerald-500" />
                    <input type="text" placeholder="Pile" value={roll.pile}
                      onChange={(e) => updateRoll(roll.id, { pile: e.target.value })}
                      className="h-9 rounded-lg border-2 border-slate-200 px-2 text-sm font-bold focus:outline-none focus:border-emerald-500" />
                    <input type="text" placeholder="Notes" value={roll.notes}
                      onChange={(e) => updateRoll(roll.id, { notes: e.target.value })}
                      className="h-9 col-span-2 rounded-lg border-2 border-slate-200 px-2 text-sm font-bold focus:outline-none focus:border-emerald-500" />
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {rolls.length > 0 && (
        <div className="rounded-lg bg-blue-50 border-2 border-blue-200 p-2.5 flex items-start gap-2">
          <Calculator className="h-3.5 w-3.5 text-blue-700 shrink-0 mt-0.5" />
          <div className="text-xs text-blue-900 font-semibold">
            <strong>Tip:</strong> Roll number khali chhor dein — system auto generate karega (CR-2026-XXXX).
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: any }) {
  return (
    <div>
      <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-0.5">{label}</label>
      {children}
    </div>
  );
}

export function rollsToPayload(rolls: PurchaseRoll[]): any[] {
  return rolls
    .filter((r) => Number(r.widthFt) > 0 && Number(r.lengthFt) > 0)
    .map((r) => ({
      rollNumber: r.rollNumber.trim() || undefined,
      designCode: r.designCode.trim() || undefined,
      widthFt: Number(r.widthFt),
      widthInch: Number(r.widthInch) || 0,
      lengthFt: Number(r.lengthFt),
      lengthInch: Number(r.lengthInch) || 0,
      costPerSqft: r.costPerSqft ? Number(r.costPerSqft) : undefined,
      salePricePerSqft: r.salePricePerSqft ? Number(r.salePricePerSqft) : undefined,
      variantId: r.variantId || undefined,
      rackNumber: r.rackNumber.trim() || undefined,
      notes: r.notes.trim() || undefined,
      quality: r.quality.trim() || undefined,
      pile: r.pile.trim() || undefined,
    }));
}

export function calculateRollsTotal(rolls: PurchaseRoll[]): number {
  return rolls.reduce((sum, r) => {
    const w = (Number(r.widthFt) || 0) + (Number(r.widthInch) || 0) / 12;
    const l = (Number(r.lengthFt) || 0) + (Number(r.lengthInch) || 0) / 12;
    return sum + w * l;
  }, 0);
}
