import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { X, Save, Layers, Ruler, DollarSign, MapPin, Hash } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { productsApi } from '@/api/products.api';
import { productVariantsApi } from '@/api/product-variants.api';
import { carpetRollsApi, type CreateCarpetRollPayload } from '../api/carpet-rolls.api';
import { formatPKRFull } from '@/lib/format';

interface Props {
  preselectedProductId?: string;
  preselectedVariantId?: string;
  onSuccess?: () => void;
  onClose: () => void;
}

const emptyForm: CreateCarpetRollPayload = {
  productId: '',
  variantId: undefined,
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
};

export function AddRollModal({
  preselectedProductId,
  preselectedVariantId,
  onSuccess,
  onClose,
}: Props) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<CreateCarpetRollPayload>({
    ...emptyForm,
    productId: preselectedProductId ?? '',
    variantId: preselectedVariantId,
  });

  const { data: productsData } = useQuery({
    queryKey: ['products', { limit: 200, isActive: true }],
    queryFn: () => productsApi.list({ limit: 200, isActive: true }),
  });

  const { data: variants = [] } = useQuery({
    queryKey: ['product-variants', form.productId],
    queryFn: () => productVariantsApi.list(form.productId),
    enabled: Boolean(form.productId),
  });

  const createMutation = useMutation({
    mutationFn: () => carpetRollsApi.create(form),
    onSuccess: () => {
      toast.success(`Roll added — ${form.rollNumber || 'auto-generated'}`);
      queryClient.invalidateQueries({ queryKey: ['carpet-rolls'] });
      queryClient.invalidateQueries({ queryKey: ['carpet-rolls-summary'] });
      onSuccess?.();
      onClose();
    },
    onError: (e: any) => {
      toast.error(e?.response?.data?.message || 'Failed to add roll');
    },
  });

  const totalSqft =
    (Number(form.widthFt) + Number(form.widthInch || 0) / 12) *
    (Number(form.originalLengthFt || 0) + Number(form.originalLengthInch || 0) / 12);
  const totalCost = totalSqft * Number(form.costPerSqft || 0);
  const totalSaleValue = totalSqft * Number(form.salePricePerSqft || 0);
  const expectedProfit = totalSaleValue - totalCost;

  const products = productsData?.items ?? [];
  const selectedProduct = products.find((p) => p.id === form.productId);

  const handleSubmit = () => {
    if (!form.productId) {
      toast.error('Product select karein');
      return;
    }
    if (!form.originalLengthFt || form.originalLengthFt <= 0) {
      toast.error('Roll length zaroori hai');
      return;
    }
    if (!form.widthFt || form.widthFt <= 0) {
      toast.error('Width zaroori hai');
      return;
    }
    createMutation.mutate();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl my-8 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-br from-brand-900 to-emerald-700 text-white p-5 flex items-center justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium">
              <Layers className="h-3.5 w-3.5" /> Carpet Inventory
            </div>
            <h2 className="mt-2 text-2xl font-bold">Add New Roll</h2>
            <p className="text-xs text-white/80 mt-1">
              Physical roll add karein — stock automatically update ho jayega
            </p>
          </div>
          <button
            onClick={onClose}
            className="h-9 w-9 rounded-full bg-white/10 hover:bg-white/20 inline-flex items-center justify-center"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
          {/* Product + Variant */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wider font-bold text-slate-500">
              <Hash className="h-3.5 w-3.5" /> Product Selection
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Product *
                </label>
                <select
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"
                  value={form.productId}
                  onChange={(e) =>
                    setForm({ ...form, productId: e.target.value, variantId: undefined })
                  }
                >
                  <option value="">Select product…</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} {p.sku ? `(${p.sku})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Color / Variant
                </label>
                <select
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm disabled:bg-slate-50"
                  value={form.variantId ?? ''}
                  onChange={(e) =>
                    setForm({ ...form, variantId: e.target.value || undefined })
                  }
                  disabled={!form.productId || variants.length === 0}
                >
                  <option value="">
                    {variants.length === 0 ? 'No variants' : 'No specific color'}
                  </option>
                  {variants.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name}
                      {v.color ? ` — ${v.color}` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <Input
                label="Roll Number (optional)"
                value={form.rollNumber ?? ''}
                onChange={(e) => setForm({ ...form, rollNumber: e.target.value })}
                placeholder="R-001 (khali chhor dein auto generate ke liye)"
                hint="Manual ya supplier ka roll number"
              />
              <Input
                label="Design Code (optional)"
                value={form.designCode ?? ''}
                onChange={(e) => setForm({ ...form, designCode: e.target.value })}
                placeholder="SF-2024-A"
              />
            </div>
          </div>

          {/* Dimensions */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wider font-bold text-slate-500">
              <Ruler className="h-3.5 w-3.5" /> Roll Dimensions
            </div>
            <div className="grid sm:grid-cols-3 gap-3">
              <Input
                label="Width (feet) *"
                type="number"
                step="0.01"
                value={form.widthFt}
                onChange={(e) => setForm({ ...form, widthFt: Number(e.target.value) })}
                hint="Common: 12ft"
              />
              <Input
                label="Width Extra (inch)"
                type="number"
                step="0.5"
                value={form.widthInch ?? 0}
                onChange={(e) => setForm({ ...form, widthInch: Number(e.target.value) })}
                hint="0–11 (e.g. 13ft 2in)"
              />
              <Input
                label="Length (feet) *"
                type="number"
                step="1"
                value={form.originalLengthFt}
                onChange={(e) =>
                  setForm({ ...form, originalLengthFt: Number(e.target.value) })
                }
                hint="Whole feet (e.g. 29 for 29ft 6in)"
              />
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <Input
                label="Length Extra (inches)"
                type="number"
                step="1"
                min="0"
                max="11"
                value={form.originalLengthInch ?? 0}
                onChange={(e) =>
                  setForm({ ...form, originalLengthInch: Number(e.target.value) })
                }
                hint="0-11 inches (Pakistani format: 29.6 = 29ft + 6in)"
              />
              <div className="rounded-xl bg-blue-50 border-2 border-blue-200 p-3 text-xs flex items-center">
                <div>
                  <div className="font-extrabold text-blue-900 mb-0.5">📏 Calculator Mode</div>
                  <div className="text-blue-700 font-semibold">
                    Stock book "29.6" likha hai? <br />
                    Length: <strong>29</strong> ft, Inches: <strong>6</strong>
                  </div>
                </div>
              </div>
            </div>

            {totalSqft > 0 && (
              <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 flex items-center justify-between">
                <div>
                  <div className="text-[10px] uppercase tracking-wider font-bold text-emerald-700">
                    Total Roll Area
                  </div>
                  <div className="text-2xl font-extrabold text-emerald-900 mt-0.5">
                    {totalSqft.toFixed(2)} <span className="text-sm font-bold">sqft</span>
                  </div>
                </div>
                <div className="text-right text-xs text-emerald-700 font-bold">
                  {Number(form.widthFt)}ft {Number(form.widthInch || 0) > 0 ? `${form.widthInch}in` : ''} ×{' '}
                  {Number(form.originalLengthFt)}ft {Number(form.originalLengthInch || 0) > 0 ? `${form.originalLengthInch}in` : ''}
                </div>
              </div>
            )}
          </div>

          {/* Pricing */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wider font-bold text-slate-500">
              <DollarSign className="h-3.5 w-3.5" /> Pricing (per sqft)
            </div>
            <div className="grid sm:grid-cols-3 gap-3">
              <Input
                label="Cost / sqft (PKR)"
                type="number"
                step="0.01"
                value={form.costPerSqft ?? 0}
                onChange={(e) =>
                  setForm({ ...form, costPerSqft: Number(e.target.value) })
                }
                hint="Aap ne kitne mein khareeda"
              />
              <Input
                label="Sale / sqft (PKR)"
                type="number"
                step="0.01"
                value={form.salePricePerSqft ?? 0}
                onChange={(e) =>
                  setForm({ ...form, salePricePerSqft: Number(e.target.value) })
                }
                hint="Customer ko kitne mein bechain"
              />
              <Input
                label="Wholesale / sqft (PKR)"
                type="number"
                step="0.01"
                value={form.wholesalePricePerSqft ?? ''}
                onChange={(e) =>
                  setForm({
                    ...form,
                    wholesalePricePerSqft: e.target.value
                      ? Number(e.target.value)
                      : undefined,
                  })
                }
                hint="Bulk customers ke liye"
              />
            </div>

            {totalSqft > 0 && (form.costPerSqft || form.salePricePerSqft) ? (
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-lg bg-slate-50 border border-slate-200 p-2.5 text-center">
                  <div className="text-[10px] uppercase font-bold text-slate-500">Total Cost</div>
                  <div className="text-sm font-extrabold text-slate-900 mt-0.5">
                    {formatPKRFull(totalCost)}
                  </div>
                </div>
                <div className="rounded-lg bg-blue-50 border border-blue-200 p-2.5 text-center">
                  <div className="text-[10px] uppercase font-bold text-blue-700">Sale Value</div>
                  <div className="text-sm font-extrabold text-blue-900 mt-0.5">
                    {formatPKRFull(totalSaleValue)}
                  </div>
                </div>
                <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-2.5 text-center">
                  <div className="text-[10px] uppercase font-bold text-emerald-700">Profit</div>
                  <div className="text-sm font-extrabold text-emerald-900 mt-0.5">
                    {formatPKRFull(expectedProfit)}
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          {/* Source + Location */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wider font-bold text-slate-500">
              <MapPin className="h-3.5 w-3.5" /> Source & Location
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Source Type
                </label>
                <select
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"
                  value={form.sourceType}
                  onChange={(e) =>
                    setForm({ ...form, sourceType: e.target.value as any })
                  }
                >
                  <option value="OPENING_STOCK">Opening Stock (already shop par para hai)</option>
                  <option value="PURCHASE">Naya Purchase</option>
                  <option value="TRANSFER_IN">Transfer In (doosray shop se aaya)</option>
                  <option value="RETURN">Customer Return</option>
                  <option value="ADJUSTMENT">Manual Adjustment</option>
                </select>
              </div>
              <Input
                label="Rack / Location"
                value={form.rackNumber ?? ''}
                onChange={(e) => setForm({ ...form, rackNumber: e.target.value })}
                placeholder="Wall-2, Godown-A, Rack-1"
              />
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <Input
                label="Quality (optional)"
                value={form.quality ?? ''}
                onChange={(e) => setForm({ ...form, quality: e.target.value })}
                placeholder="Premium / Standard / Economy"
              />
              <Input
                label="Pile / Material (optional)"
                value={form.pile ?? ''}
                onChange={(e) => setForm({ ...form, pile: e.target.value })}
                placeholder="Wool / Synthetic / Mixed"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Notes
              </label>
              <textarea
                rows={2}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                value={form.notes ?? ''}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Koi extra detail, defect, supplier note…"
              />
            </div>
          </div>

          {/* Product preview */}
          {selectedProduct && (
            <div className="rounded-xl bg-violet-50 border border-violet-200 p-3 text-xs">
              <div className="font-bold text-violet-900">{selectedProduct.name}</div>
              <div className="text-violet-700">
                Default sale: {formatPKRFull(selectedProduct.price)} / {selectedProduct.unit}
                {selectedProduct.costPrice
                  ? ` • Cost: ${formatPKRFull(selectedProduct.costPrice)}`
                  : ''}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 border-t border-slate-200 p-4 flex items-center justify-between gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-200"
          >
            Cancel
          </button>
          <Button
            onClick={handleSubmit}
            loading={createMutation.isPending}
            className="bg-gradient-to-r from-brand-700 to-emerald-700"
          >
            <Save className="h-4 w-4" /> Save Roll
          </Button>
        </div>
      </div>
    </div>
  );
}
