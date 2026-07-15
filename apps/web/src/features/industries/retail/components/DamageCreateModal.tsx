import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  X, AlertTriangle, Package, Camera, Save, Search,
  DollarSign, Sparkles,
} from 'lucide-react';
import { damageApi, type DamageReasonCode } from '../api/damage.api';
import { productsApi } from '@/api/products.api';
import { formatPKR } from '@/lib/format';
import { Button } from '@/components/ui/Button';
import { UploadDropzone } from '@/components/uploads';
import { toast } from 'sonner';

const REASON_OPTIONS: { value: DamageReasonCode; label: string; emoji: string }[] = [
  { value: 'EXPIRY', label: 'Expired', emoji: '⏰' },
  { value: 'BREAKAGE', label: 'Broken', emoji: '💔' },
  { value: 'SPOILAGE', label: 'Spoiled', emoji: '🥀' },
  { value: 'PEST_DAMAGE', label: 'Pest Damage', emoji: '🐛' },
  { value: 'WATER_DAMAGE', label: 'Water Damage', emoji: '💧' },
  { value: 'THEFT', label: 'Theft', emoji: '🚨' },
  { value: 'MISHANDLING', label: 'Mishandling', emoji: '📦' },
  { value: 'MANUFACTURING_DEFECT', label: 'Defect', emoji: '⚠️' },
  { value: 'OTHER', label: 'Other', emoji: '❓' },
];

interface Props {
  onClose: () => void;
  onCreated: () => void;
}

export function DamageCreateModal({ onClose, onCreated }: Props) {
  const [productSearch, setProductSearch] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [form, setForm] = useState({
    quantity: 1,
    unitCost: 0,
    salvageValue: 0,
    reason: '',
    reasonCode: 'OTHER' as DamageReasonCode,
    notes: '',
    supplierClaim: false,
    claimAmount: 0,
    photos: [] as string[],
  });

  const { data: productsData } = useQuery({
    queryKey: ['products-for-damage', productSearch],
    queryFn: () => productsApi.list({ page: 1, limit: 30, search: productSearch || undefined }),
    enabled: !selectedProduct,
  });

  const products = productsData?.items ?? [];

  const createMutation = useMutation({
    mutationFn: () => damageApi.create({
      productId: selectedProduct.id,
      quantity: form.quantity,
      unitCost: form.unitCost || undefined,
      salvageValue: form.salvageValue || undefined,
      reason: form.reason,
      reasonCode: form.reasonCode,
      notes: form.notes || undefined,
      photos: form.photos,
      supplierClaim: form.supplierClaim,
      claimAmount: form.claimAmount || undefined,
    }),
    onSuccess: () => {
      toast.success('Damage reported successfully');
      onCreated();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Report failed'),
  });

  const costImpact = form.quantity * (form.unitCost || selectedProduct?.costPrice || 0);
  const netLoss = Math.max(costImpact - form.salvageValue, 0);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="w-full sm:max-w-3xl bg-white dark:bg-neutral-900 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[95vh] flex flex-col">
        {/* HEADER */}
        <div className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-rose-900 to-red-700 text-white shrink-0">
          <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-rose-400/20 blur-2xl" />
          <div className="relative px-5 py-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center shadow-lg ring-2 ring-white/20">
                <AlertTriangle className="h-6 w-6 text-white" />
              </div>
              <div>
                <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 backdrop-blur px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider border border-white/20">
                  <Sparkles className="h-2.5 w-2.5 text-amber-300" />
                  Report Damage
                </div>
                <h3 className="font-extrabold text-lg mt-1">Report Damage / Loss</h3>
              </div>
            </div>
            <button onClick={onClose} className="h-10 w-10 rounded-xl bg-white/15 hover:bg-white/25 flex items-center justify-center">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* BODY */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Product Selection */}
          {!selectedProduct ? (
            <div>
              <label className="text-xs uppercase tracking-wider font-extrabold text-slate-600 mb-2 block">Select Product *</label>
              <div className="relative">
                <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  autoFocus
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  placeholder="Search product by name, SKU, barcode..."
                  className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 pl-10 pr-3 text-sm font-semibold focus:outline-none focus:border-rose-500"
                />
              </div>
              <div className="mt-2 max-h-64 overflow-y-auto space-y-1">
                {products.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setSelectedProduct(p)}
                    className="w-full px-3 py-2 flex items-center gap-3 rounded-lg hover:bg-slate-50 dark:hover:bg-neutral-800 transition text-left"
                  >
                    <div className="h-10 w-10 rounded-xl bg-slate-100 dark:bg-neutral-800 overflow-hidden flex items-center justify-center shrink-0">
                      {p.images?.[0]?.url ? (
                        <img src={p.images[0].url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <Package className="h-5 w-5 text-slate-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-extrabold text-sm truncate text-slate-900 dark:text-white">{p.name}</div>
                      <div className="text-xs text-slate-500 font-semibold">
                        Stock: {p.stock} {p.unit} • Cost: {formatPKR(p.costPrice)}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {/* Selected product */}
              <div className="rounded-2xl bg-rose-50 dark:bg-rose-950/30 border-2 border-rose-200 dark:border-rose-800 p-3 flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-white dark:bg-neutral-800 overflow-hidden flex items-center justify-center shrink-0">
                  {selectedProduct.images?.[0]?.url ? (
                    <img src={selectedProduct.images[0].url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <Package className="h-5 w-5 text-slate-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-extrabold text-slate-900 dark:text-white text-sm truncate">{selectedProduct.name}</div>
                  <div className="text-xs text-slate-500 font-semibold">
                    Stock: {selectedProduct.stock} {selectedProduct.unit}
                  </div>
                </div>
                <button
                  onClick={() => setSelectedProduct(null)}
                  className="text-xs font-extrabold text-rose-600 hover:underline"
                >
                  Change
                </button>
              </div>

              {/* Reason Grid */}
              <div>
                <label className="text-xs uppercase tracking-wider font-extrabold text-slate-600 mb-2 block">Damage Reason *</label>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                  {REASON_OPTIONS.map((r) => (
                    <button
                      key={r.value}
                      onClick={() => setForm({ ...form, reasonCode: r.value })}
                      className={
                        'p-3 rounded-xl border-2 text-center transition ' +
                        (form.reasonCode === r.value
                          ? 'border-rose-500 bg-rose-50 dark:bg-rose-950/40 shadow-sm'
                          : 'border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:border-rose-300')
                      }
                    >
                      <div className="text-2xl mb-1">{r.emoji}</div>
                      <div className={
                        'text-[10px] font-extrabold ' +
                        (form.reasonCode === r.value ? 'text-rose-900 dark:text-rose-300' : 'text-slate-700 dark:text-slate-300')
                      }>{r.label}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Quantity + Cost + Salvage */}
              <div className="grid sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] uppercase tracking-wider font-extrabold text-slate-600 mb-1 block">Quantity *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={form.quantity}
                    onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })}
                    className="h-11 w-full rounded-xl border-2 border-rose-200 dark:border-rose-800 bg-white dark:bg-neutral-800 px-3 text-lg font-extrabold tabular-nums focus:outline-none focus:border-rose-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wider font-extrabold text-slate-600 mb-1 block">Unit Cost</label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.unitCost}
                    onChange={(e) => setForm({ ...form, unitCost: Number(e.target.value) })}
                    placeholder={String(selectedProduct.costPrice)}
                    className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold tabular-nums focus:outline-none focus:border-rose-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wider font-extrabold text-slate-600 mb-1 block">Salvage Value</label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.salvageValue}
                    onChange={(e) => setForm({ ...form, salvageValue: Number(e.target.value) })}
                    placeholder="0"
                    className="h-11 w-full rounded-xl border-2 border-blue-200 dark:border-blue-800 bg-white dark:bg-neutral-800 px-3 text-sm font-bold tabular-nums focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Reason description */}
              <div>
                <label className="text-[10px] uppercase tracking-wider font-extrabold text-slate-600 mb-1 block">Detailed Reason *</label>
                <textarea
                  rows={2}
                  value={form.reason}
                  onChange={(e) => setForm({ ...form, reason: e.target.value })}
                  placeholder="Water leaked from ceiling, box got wet..."
                  className="w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-rose-500 resize-none"
                />
              </div>

              {/* Photos */}
              <div>
                <label className="text-[10px] uppercase tracking-wider font-extrabold text-slate-600 mb-1 block">
                  <Camera className="h-3 w-3 inline mr-1" />
                  Photos (evidence)
                </label>
                <UploadDropzone
                  onUploaded={(records) => {
                    const urls = Array.isArray(records)
                      ? records.map((r: any) => r.url || r).filter(Boolean)
                      : [records];
                    setForm({ ...form, photos: [...form.photos, ...urls] });
                  }}
                />
                {form.photos.length > 0 && (
                  <div className="mt-2 flex gap-2 flex-wrap">
                    {form.photos.map((url, i) => (
                      <div key={i} className="relative h-16 w-16 rounded-lg overflow-hidden">
                        <img src={url} alt="" className="h-full w-full object-cover" />
                        <button
                          onClick={() => setForm({ ...form, photos: form.photos.filter((_, idx) => idx !== i) })}
                          className="absolute top-0 right-0 h-5 w-5 rounded-bl-lg bg-rose-600 text-white flex items-center justify-center"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Notes */}
              <div>
                <label className="text-[10px] uppercase tracking-wider font-extrabold text-slate-600 mb-1 block">Internal Notes (optional)</label>
                <textarea
                  rows={2}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="For team reference..."
                  className="w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-rose-500 resize-none"
                />
              </div>

              {/* Supplier claim */}
              <label className="flex items-center gap-2 p-3 rounded-xl border-2 border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.supplierClaim}
                  onChange={(e) => setForm({ ...form, supplierClaim: e.target.checked })}
                  className="h-4 w-4 rounded"
                />
                <div className="flex-1">
                  <div className="text-sm font-extrabold text-blue-900 dark:text-blue-300">Claim from supplier?</div>
                  <div className="text-xs text-blue-700 dark:text-blue-400 font-semibold">
                    Supplier can replace or refund
                  </div>
                </div>
                {form.supplierClaim && (
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Claim amount"
                    value={form.claimAmount || ''}
                    onChange={(e) => setForm({ ...form, claimAmount: Number(e.target.value) })}
                    className="h-9 w-32 rounded-lg border border-blue-300 dark:border-blue-700 bg-white dark:bg-neutral-800 px-2 text-sm font-bold text-right"
                  />
                )}
              </label>

              {/* Impact preview */}
              <div className="rounded-2xl bg-gradient-to-br from-slate-950 to-rose-900 text-white p-4 shadow-lg">
                <div className="text-[10px] uppercase tracking-wider font-extrabold opacity-80 mb-2">Impact Summary</div>
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div>
                    <div className="text-xs opacity-75 font-semibold">Cost Impact</div>
                    <div className="text-lg font-extrabold tabular-nums">{formatPKR(costImpact)}</div>
                  </div>
                  <div>
                    <div className="text-xs opacity-75 font-semibold">Salvage</div>
                    <div className="text-lg font-extrabold tabular-nums text-blue-300">
                      {formatPKR(form.salvageValue)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs opacity-75 font-semibold">Net Loss</div>
                    <div className="text-2xl font-extrabold tabular-nums text-rose-300">
                      {formatPKR(netLoss)}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* FOOTER */}
        <div className="border-t-2 border-slate-200 dark:border-neutral-800 bg-slate-50 dark:bg-neutral-900/50 px-5 py-3 flex items-center justify-end gap-2 shrink-0">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button
            onClick={() => createMutation.mutate()}
            loading={createMutation.isPending}
            disabled={!selectedProduct || !form.reason.trim() || form.quantity <= 0}
            className="bg-gradient-to-r from-rose-600 to-red-700"
          >
            <Save className="h-4 w-4" />
            Report Damage
          </Button>
        </div>
      </div>
    </div>
  );
}
