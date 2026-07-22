import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  X, Save, Layers, Ruler, DollarSign, MapPin, ChevronDown, ChevronUp,
  Sparkles, Zap, Package,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@core/ui/Button';
import { Input } from '@core/ui/Input';
import { productsApi } from '@modules/inventory/products/api/products.api';
import { productVariantsApi } from '@modules/inventory/products/api/product-variants.api';
import { carpetRollsApi, type CreateCarpetRollPayload } from '../api/carpet-rolls.api';
import { formatPKRFull } from '@core/lib/format';

interface Props {
  preselectedProductId?: string;
  preselectedVariantId?: string;
  onSuccess?: () => void;
  onClose: () => void;
}

/**
 * FAST Add Roll Modal
 * ────────────────────────────────────────────────────────
 * Design goals:
 *   • Auto-fill EVERYTHING from product defaults (prices)
 *   • Only 4 mandatory fields visible: variant, width, length, rack
 *   • Advanced fields (source, quality, pile, notes) collapsed
 *   • Auto roll-number generation
 *   • Enter key advances focus / saves
 *   • Zero clutter — cashier can add roll in <10 seconds
 */
export function AddRollModal({
  preselectedProductId,
  preselectedVariantId,
  onSuccess,
  onClose,
}: Props) {
  const queryClient = useQueryClient();

  const [form, setForm] = useState<CreateCarpetRollPayload>({
    productId: preselectedProductId ?? '',
    variantId: preselectedVariantId,
    rollNumber: '',
    designCode: '',
    widthFt: 12,
    widthInch: 0,
    originalLengthFt: 0,
    originalLengthInch: 0,
    costPerSqft: 0,
    salePricePerSqft: 0,
    wholesalePricePerSqft: undefined,
    sourceType: 'OPENING_STOCK',
    rackNumber: '',
    notes: '',
    quality: '',
    pile: '',
  });

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [autoRollNum, setAutoRollNum] = useState(true);

  // ─── Data ────────────────────────────────────────────
  const { data: productsData } = useQuery({
    queryKey: ['products', { limit: 500, isActive: true }],
    queryFn: () => productsApi.list({ limit: 500, isActive: true }),
    staleTime: 60_000,
  });

  const { data: variants = [] } = useQuery({
    queryKey: ['product-variants', form.productId],
    queryFn: () => productVariantsApi.list(form.productId),
    enabled: Boolean(form.productId),
    staleTime: 60_000,
  });

  // Existing rolls for this product — for auto roll-number
  const { data: existingRollsData } = useQuery({
    queryKey: ['carpet-rolls', { productId: form.productId, limit: 1 }],
    queryFn: () => carpetRollsApi.list({ productId: form.productId, limit: 500 }),
    enabled: Boolean(form.productId),
    staleTime: 30_000,
  });

  const products = productsData?.items ?? [];
  const selectedProduct = useMemo(
    () => products.find((p) => p.id === form.productId),
    [products, form.productId],
  );
  const selectedVariant = useMemo(
    () => variants.find((v) => v.id === form.variantId),
    [variants, form.variantId],
  );

  // ─── Auto-fill prices when product/variant changes ───
  useEffect(() => {
    if (!selectedProduct) return;
    setForm((f) => ({
      ...f,
      costPerSqft:
        selectedVariant?.costPrice ??
        selectedProduct.costPrice ??
        f.costPerSqft,
      salePricePerSqft:
        selectedVariant?.price ??
        selectedProduct.price ??
        f.salePricePerSqft,
      wholesalePricePerSqft:
        selectedVariant?.wholesalePrice ??
        selectedProduct.wholesalePrice ??
        f.wholesalePricePerSqft,
    }));
  }, [selectedProduct?.id, selectedVariant?.id]); // eslint-disable-line

  // ─── Auto roll-number ────────────────────────────────
  useEffect(() => {
    if (!autoRollNum || !existingRollsData) return;
    const existing = existingRollsData.items ?? [];
    // Find highest R-### number and increment
    let maxN = 0;
    for (const r of existing) {
      const m = String(r.rollNumber ?? '').match(/R-(\d+)/i);
      if (m) maxN = Math.max(maxN, parseInt(m[1], 10));
    }
    const next = `R-${String(maxN + 1).padStart(3, '0')}`;
    setForm((f) => ({ ...f, rollNumber: next }));
  }, [autoRollNum, existingRollsData]);

  // ─── Mutation ────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: () => carpetRollsApi.create(form),
    onSuccess: () => {
      toast.success(`✓ ${form.rollNumber} added`);
      queryClient.invalidateQueries({ queryKey: ['carpet-rolls'] });
      queryClient.invalidateQueries({ queryKey: ['carpet-rolls-summary'] });
      queryClient.invalidateQueries({ queryKey: ['carpet-rolls-for-product', form.productId] });
      queryClient.invalidateQueries({ queryKey: ['carpet-product-summary'] });
      onSuccess?.();
      onClose();
    },
    onError: (e: any) => {
      toast.error(e?.response?.data?.message || 'Failed to add roll');
    },
  });

  // ─── Derived ─────────────────────────────────────────
  const widthReal =
    Number(form.widthFt) + Number(form.widthInch || 0) / 12;
  const lengthReal =
    Number(form.originalLengthFt) + Number(form.originalLengthInch || 0) / 12;
  const totalSqft = widthReal * lengthReal;
  const totalCost = totalSqft * Number(form.costPerSqft || 0);
  const totalSaleValue = totalSqft * Number(form.salePricePerSqft || 0);
  const profit = totalSaleValue - totalCost;
  const margin = totalSaleValue > 0 ? (profit / totalSaleValue) * 100 : 0;

  const handleSubmit = () => {
    if (!form.productId) { toast.error('Product select karein'); return; }
    if (!form.widthFt || form.widthFt <= 0) { toast.error('Width required'); return; }
    if (!form.originalLengthFt || form.originalLengthFt <= 0) { toast.error('Length required'); return; }
    createMutation.mutate();
  };

  const canSave = form.productId && form.widthFt > 0 && form.originalLengthFt > 0;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[95vh] flex flex-col overflow-hidden">
        {/* HEADER — Compact */}
        <div className="bg-gradient-to-br from-emerald-700 to-emerald-600 text-white px-5 py-3.5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-white/15 flex items-center justify-center">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-extrabold leading-none">Add Roll</h2>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/20 text-[10px] font-extrabold">
                  <Zap className="h-2.5 w-2.5" /> FAST
                </span>
              </div>
              <p className="text-[11px] text-white/85 font-semibold mt-0.5">
                Prices auto-fill • 10-second entry
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="h-9 w-9 rounded-xl bg-white/15 hover:bg-white/25 flex items-center justify-center"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* BODY */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Product + Variant */}
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-extrabold text-slate-700 uppercase tracking-wider mb-1.5">
                Product *
              </label>
              <select
                autoFocus={!form.productId}
                className="h-11 w-full rounded-xl border-2 border-slate-200 bg-white px-3 text-sm font-bold focus:outline-none focus:border-emerald-500"
                value={form.productId}
                onChange={(e) =>
                  setForm({ ...form, productId: e.target.value, variantId: undefined })
                }
              >
                <option value="">Select product…</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}{p.sku ? ` (${p.sku})` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-extrabold text-slate-700 uppercase tracking-wider mb-1.5">
                Color / Variant
              </label>
              <select
                className="h-11 w-full rounded-xl border-2 border-slate-200 bg-white px-3 text-sm font-bold focus:outline-none focus:border-emerald-500 disabled:bg-slate-50 disabled:text-slate-400"
                value={form.variantId ?? ''}
                onChange={(e) =>
                  setForm({ ...form, variantId: e.target.value || undefined })
                }
                disabled={!form.productId || variants.length === 0}
              >
                <option value="">
                  {variants.length === 0 ? 'No variants' : '— Select color —'}
                </option>
                {variants.map((v) => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Auto price preview (visible immediately after product select) */}
          {selectedProduct && (
            <div className="rounded-xl bg-gradient-to-r from-emerald-50 to-white border-2 border-emerald-200 p-3 flex items-center gap-2 flex-wrap text-[11px]">
              <Sparkles className="h-3 w-3 text-emerald-700 shrink-0" />
              <span className="font-extrabold text-emerald-900">Auto-filled from {selectedVariant ? 'variant' : 'product'}:</span>
              <span className="font-bold text-slate-700">
                Cost <span className="text-slate-900 tabular-nums">{formatPKRFull(form.costPerSqft ?? 0)}</span>
              </span>
              <span className="text-slate-400">•</span>
              <span className="font-bold text-slate-700">
                Sale <span className="text-emerald-700 tabular-nums">{formatPKRFull(form.salePricePerSqft ?? 0)}</span>
              </span>
              {form.wholesalePricePerSqft ? (
                <>
                  <span className="text-slate-400">•</span>
                  <span className="font-bold text-slate-700">
                    W/S <span className="text-amber-700 tabular-nums">{formatPKRFull(form.wholesalePricePerSqft)}</span>
                  </span>
                </>
              ) : null}
            </div>
          )}

          {/* Roll number + Auto toggle */}
          <div className="grid sm:grid-cols-[1fr_auto] gap-3 items-end">
            <div>
              <label className="block text-[11px] font-extrabold text-slate-700 uppercase tracking-wider mb-1.5">
                Roll Number
              </label>
              <input
                value={form.rollNumber ?? ''}
                onChange={(e) => {
                  setForm({ ...form, rollNumber: e.target.value });
                  setAutoRollNum(false);
                }}
                placeholder="R-001"
                className="h-11 w-full rounded-xl border-2 border-slate-200 bg-white px-3 text-sm font-mono font-extrabold focus:outline-none focus:border-emerald-500"
              />
            </div>
            <label className="inline-flex items-center gap-2 cursor-pointer h-11 px-3 rounded-xl bg-blue-50 border-2 border-blue-200 hover:bg-blue-100 transition">
              <input
                type="checkbox"
                checked={autoRollNum}
                onChange={(e) => setAutoRollNum(e.target.checked)}
                className="h-4 w-4 rounded"
              />
              <span className="text-xs font-extrabold text-blue-900">Auto #</span>
            </label>
          </div>

          {/* Dimensions — big, clear inputs */}
          <div className="rounded-xl bg-slate-50 border-2 border-slate-200 p-3.5 space-y-3">
            <div className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Ruler className="h-3 w-3" /> Dimensions
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-extrabold text-slate-600 uppercase mb-1">Width</label>
                <div className="flex gap-1">
                  <div className="relative flex-1">
                    <input
                      type="number"
                      step="1"
                      value={form.widthFt || ''}
                      onChange={(e) =>
                        setForm({ ...form, widthFt: Number(e.target.value) || 0 })
                      }
                      placeholder="12"
                      className="h-11 w-full rounded-xl border-2 border-slate-300 bg-white px-3 pr-8 text-base font-extrabold tabular-nums text-right focus:outline-none focus:border-emerald-500"
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-extrabold text-slate-500">ft</span>
                  </div>
                  <div className="relative w-20">
                    <input
                      type="number"
                      step="1"
                      min="0"
                      max="11"
                      value={form.widthInch || ''}
                      onChange={(e) => {
                        const v = Number(e.target.value) || 0;
                        if (v > 11) return;
                        setForm({ ...form, widthInch: v });
                      }}
                      placeholder="0"
                      className="h-11 w-full rounded-xl border-2 border-slate-300 bg-white px-3 pr-8 text-base font-extrabold tabular-nums text-right focus:outline-none focus:border-emerald-500"
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-extrabold text-slate-500">in</span>
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-extrabold text-slate-600 uppercase mb-1">Length *</label>
                <div className="flex gap-1">
                  <div className="relative flex-1">
                    <input
                      type="number"
                      step="1"
                      value={form.originalLengthFt || ''}
                      onChange={(e) =>
                        setForm({ ...form, originalLengthFt: Number(e.target.value) || 0 })
                      }
                      placeholder="29"
                      className="h-11 w-full rounded-xl border-2 border-emerald-300 bg-white px-3 pr-8 text-base font-extrabold tabular-nums text-right focus:outline-none focus:border-emerald-500"
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-extrabold text-slate-500">ft</span>
                  </div>
                  <div className="relative w-20">
                    <input
                      type="number"
                      step="1"
                      min="0"
                      max="11"
                      value={form.originalLengthInch || ''}
                      onChange={(e) => {
                        const v = Number(e.target.value) || 0;
                        if (v > 11) return;
                        setForm({ ...form, originalLengthInch: v });
                      }}
                      placeholder="6"
                      className="h-11 w-full rounded-xl border-2 border-emerald-300 bg-white px-3 pr-8 text-base font-extrabold tabular-nums text-right focus:outline-none focus:border-emerald-500"
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-extrabold text-slate-500">in</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Live sqft + value preview */}
            {totalSqft > 0 && (
              <div className="rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 text-white p-3 flex items-center justify-between flex-wrap gap-2">
                <div>
                  <div className="text-[10px] uppercase tracking-wider font-extrabold text-emerald-100">Total Area</div>
                  <div className="text-2xl font-extrabold tabular-nums">
                    {totalSqft.toFixed(2)} <span className="text-sm font-bold">sqft</span>
                  </div>
                  <div className="text-[10px] text-emerald-100 font-bold">
                    {widthReal.toFixed(2)}ft × {lengthReal.toFixed(2)}ft
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] uppercase tracking-wider font-extrabold text-emerald-100">Sale Value</div>
                  <div className="text-2xl font-extrabold tabular-nums">
                    {formatPKRFull(totalSaleValue)}
                  </div>
                  {profit > 0 && (
                    <div className="text-[10px] text-emerald-100 font-bold">
                      Profit {formatPKRFull(profit)} ({margin.toFixed(0)}%)
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Rack (single field, quick access) */}
          <div>
            <label className="block text-[11px] font-extrabold text-slate-700 uppercase tracking-wider mb-1.5 items-center gap-1.5">
              <MapPin className="h-3 w-3" /> Rack / Location
            </label>
            <input
              value={form.rackNumber ?? ''}
              onChange={(e) => setForm({ ...form, rackNumber: e.target.value })}
              placeholder="Wall-1, Rack-A"
              className="h-11 w-full rounded-xl border-2 border-slate-200 bg-white px-3 text-sm font-bold focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Advanced (collapsed) */}
          <button
            type="button"
            onClick={() => setShowAdvanced((v) => !v)}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 border-2 border-slate-200 text-xs font-extrabold text-slate-700 transition"
          >
            <span className="inline-flex items-center gap-1.5">
              <Package className="h-3 w-3" />
              Advanced (prices, source, quality, notes)
            </span>
            {showAdvanced ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>

          {showAdvanced && (
            <div className="space-y-3 pt-2 border-t-2 border-slate-100">
              <div className="grid sm:grid-cols-3 gap-3">
                <Input
                  label="Cost /sqft"
                  type="number"
                  step="0.01"
                  value={form.costPerSqft ?? 0}
                  onChange={(e) => setForm({ ...form, costPerSqft: Number(e.target.value) })}
                />
                <Input
                  label="Sale /sqft"
                  type="number"
                  step="0.01"
                  value={form.salePricePerSqft ?? 0}
                  onChange={(e) => setForm({ ...form, salePricePerSqft: Number(e.target.value) })}
                />
                <Input
                  label="Wholesale /sqft"
                  type="number"
                  step="0.01"
                  value={form.wholesalePricePerSqft ?? ''}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      wholesalePricePerSqft: e.target.value ? Number(e.target.value) : undefined,
                    })
                  }
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Source Type</label>
                  <select
                    className="h-11 w-full rounded-xl border-2 border-slate-200 bg-white px-3 text-sm font-bold focus:outline-none focus:border-emerald-500"
                    value={form.sourceType}
                    onChange={(e) => setForm({ ...form, sourceType: e.target.value as any })}
                  >
                    <option value="OPENING_STOCK">Opening Stock</option>
                    <option value="PURCHASE">Purchase</option>
                    <option value="TRANSFER_IN">Transfer In</option>
                    <option value="RETURN">Return</option>
                    <option value="ADJUSTMENT">Adjustment</option>
                  </select>
                </div>
                <Input
                  label="Design Code"
                  value={form.designCode ?? ''}
                  onChange={(e) => setForm({ ...form, designCode: e.target.value })}
                  placeholder="SF-2026-A"
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <Input
                  label="Quality"
                  value={form.quality ?? ''}
                  onChange={(e) => setForm({ ...form, quality: e.target.value })}
                  placeholder="Premium / Standard"
                />
                <Input
                  label="Pile"
                  value={form.pile ?? ''}
                  onChange={(e) => setForm({ ...form, pile: e.target.value })}
                  placeholder="Wool / Synthetic"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Notes</label>
                <textarea
                  rows={2}
                  className="w-full rounded-xl border-2 border-slate-200 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-emerald-500"
                  value={form.notes ?? ''}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Any special note"
                />
              </div>
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="bg-slate-50 border-t-2 border-slate-200 p-4 flex items-center justify-between gap-2 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-sm font-extrabold text-slate-600 hover:bg-slate-200 transition"
          >
            Cancel
          </button>
          <Button
            onClick={handleSubmit}
            loading={createMutation.isPending}
            disabled={!canSave}
            className="bg-gradient-to-r from-emerald-700 to-emerald-600 disabled:opacity-40 shadow-lg"
          >
            <Save className="h-4 w-4" />
            {totalSqft > 0 ? `Save Roll (${totalSqft.toFixed(0)} sqft)` : 'Save Roll'}
          </Button>
        </div>
      </div>
    </div>
  );
}
