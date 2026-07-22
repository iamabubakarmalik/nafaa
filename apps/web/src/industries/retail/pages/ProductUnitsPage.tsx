import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Layers, Plus, Search, X, Edit3, Trash2, Star, Package,
  Barcode, DollarSign, Save, RefreshCw, ArrowRightLeft,
  CheckCircle2, Sparkles, ChevronDown,
} from 'lucide-react';
import { productUnitsApi, type ProductUnit, type UnitConversionType } from '../api/product-units.api';
import { productsApi } from '@modules/inventory/products/api/products.api';
import { formatPKR } from '@core/lib/format';
import { Button } from '@core/ui/Button';
import { toast } from 'sonner';

const CONVERSION_TYPES: { value: UnitConversionType; label: string; example: string }[] = [
  { value: 'BASE', label: 'Base Unit', example: 'piece, kg, meter' },
  { value: 'PACK', label: 'Pack', example: '1 pack = 6 pieces' },
  { value: 'BOX', label: 'Box', example: '1 box = 12 pieces' },
  { value: 'DOZEN', label: 'Dozen', example: '1 dozen = 12 pieces' },
  { value: 'CARTON', label: 'Carton', example: '1 carton = 120 pieces' },
  { value: 'KG_TO_GRAM', label: 'Kg → Gram', example: '1 kg = 1000 g' },
  { value: 'L_TO_ML', label: 'L → mL', example: '1 L = 1000 mL' },
  { value: 'CUSTOM', label: 'Custom', example: 'Any conversion' },
];

export default function ProductUnitsPage() {
  const queryClient = useQueryClient();
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [productSearch, setProductSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingUnit, setEditingUnit] = useState<ProductUnit | null>(null);

  const { data: productsData } = useQuery({
    queryKey: ['products-for-units', productSearch],
    queryFn: () => productsApi.list({ page: 1, limit: 100, search: productSearch || undefined }),
  });

  const products = productsData?.items ?? [];
  const selectedProduct = products.find((p) => p.id === selectedProductId);

  const { data: units = [], isLoading, refetch } = useQuery({
    queryKey: ['product-units', selectedProductId],
    queryFn: () => productUnitsApi.byProduct(selectedProductId),
    enabled: !!selectedProductId,
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => productUnitsApi.remove(id),
    onSuccess: () => {
      toast.success('Unit deleted');
      queryClient.invalidateQueries({ queryKey: ['product-units'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Delete failed'),
  });

  return (
    <div className="space-y-6">
      {/* HERO */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-emerald-900 to-teal-700 text-white p-6 sm:p-8 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-emerald-400/20 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-cyan-400/15 blur-3xl" />

        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
              Multi-Unit Selling
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">
              📦 Product Units
            </h1>
            <p className="mt-2 text-sm text-white/80 font-semibold">
              Piece, Dozen, Carton — sab units alag price se becho
            </p>
          </div>
        </div>
      </section>

      <div className="grid lg:grid-cols-[400px_1fr] gap-6">
        {/* PRODUCT PICKER */}
        <section className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b border-slate-100 dark:border-neutral-800 bg-slate-50 dark:bg-neutral-800/50">
            <h3 className="font-extrabold text-slate-900 dark:text-white text-sm">
              Select Product
            </h3>
          </div>
          <div className="p-3 border-b border-slate-100 dark:border-neutral-800">
            <div className="relative">
              <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                placeholder="Search products..."
                className="h-10 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 pl-10 pr-10 text-sm font-semibold focus:outline-none focus:border-emerald-500"
              />
              {productSearch && (
                <button onClick={() => setProductSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 rounded hover:bg-slate-100 flex items-center justify-center">
                  <X className="h-3.5 w-3.5 text-slate-400" />
                </button>
              )}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto max-h-[500px]">
            {products.length === 0 ? (
              <div className="p-6 text-center text-sm text-slate-500 font-semibold">
                No products found
              </div>
            ) : (
              products.map((p) => (
                <button
                  key={p.id}
                  onClick={() => { setSelectedProductId(p.id); setShowForm(false); setEditingUnit(null); }}
                  className={
                    'w-full px-4 py-3 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-neutral-800 transition text-left ' +
                    (selectedProductId === p.id ? 'bg-emerald-50 dark:bg-emerald-950/30 border-l-4 border-emerald-500' : '')
                  }
                >
                  <div className="h-10 w-10 rounded-xl bg-slate-100 dark:bg-neutral-800 overflow-hidden flex items-center justify-center shrink-0">
                    {p.images?.[0]?.url ? (
                      <img src={p.images[0].url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <Package className="h-5 w-5 text-slate-400" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-extrabold text-sm truncate text-slate-900 dark:text-white">{p.name}</div>
                    <div className="text-xs text-slate-500 font-semibold">{p.unit} • {formatPKR(p.price)}</div>
                  </div>
                </button>
              ))
            )}
          </div>
        </section>

        {/* UNITS PANEL */}
        <section className="space-y-4">
          {!selectedProduct ? (
            <div className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-dashed border-slate-200 dark:border-neutral-800 p-12 text-center">
              <div className="h-20 w-20 rounded-3xl bg-slate-100 dark:bg-neutral-800 mx-auto flex items-center justify-center">
                <Layers className="h-10 w-10 text-slate-400" />
              </div>
              <h3 className="mt-4 text-lg font-extrabold text-slate-900 dark:text-white">Select a product</h3>
              <p className="mt-1 text-sm text-slate-500 font-semibold">
                Left side se product choose karo units manage karne ke liye
              </p>
            </div>
          ) : (
            <>
              <div className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm p-5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-12 w-12 rounded-2xl bg-slate-100 dark:bg-neutral-800 overflow-hidden flex items-center justify-center shrink-0">
                    {selectedProduct.images?.[0]?.url ? (
                      <img src={selectedProduct.images[0].url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <Package className="h-6 w-6 text-slate-400" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <h2 className="font-extrabold text-lg text-slate-900 dark:text-white truncate">
                      {selectedProduct.name}
                    </h2>
                    <p className="text-xs text-slate-500 font-semibold">
                      {units.length} unit{units.length !== 1 ? 's' : ''} configured • Base: {selectedProduct.unit}
                    </p>
                  </div>
                </div>
                <Button
                  onClick={() => { setEditingUnit(null); setShowForm(true); }}
                  className="bg-gradient-to-r from-emerald-600 to-teal-700"
                >
                  <Plus className="h-4 w-4" />
                  Add Unit
                </Button>
              </div>

              {showForm && (
                <UnitForm
                  productId={selectedProduct.id}
                  editing={editingUnit}
                  onClose={() => { setShowForm(false); setEditingUnit(null); }}
                  onSaved={() => {
                    setShowForm(false);
                    setEditingUnit(null);
                    queryClient.invalidateQueries({ queryKey: ['product-units'] });
                  }}
                />
              )}

              {isLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => <div key={i} className="h-24 rounded-2xl bg-slate-100 dark:bg-neutral-800 animate-pulse" />)}
                </div>
              ) : units.length === 0 ? (
                <div className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-dashed border-slate-200 dark:border-neutral-800 p-12 text-center">
                  <div className="h-16 w-16 rounded-2xl bg-emerald-100 dark:bg-emerald-950/40 mx-auto flex items-center justify-center">
                    <Layers className="h-8 w-8 text-emerald-600" />
                  </div>
                  <h3 className="mt-3 font-extrabold text-slate-900 dark:text-white">No units yet</h3>
                  <p className="mt-1 text-sm text-slate-500 font-semibold">
                    Add karo — piece → dozen → carton
                  </p>
                </div>
              ) : (
                <div className="grid gap-3">
                  {units.map((unit) => (
                    <div
                      key={unit.id}
                      className={
                        'rounded-2xl bg-white dark:bg-neutral-900 border-2 shadow-sm p-4 ' +
                        (unit.isBase ? 'border-emerald-400 ring-2 ring-emerald-100 dark:ring-emerald-950/40' : 'border-slate-200 dark:border-neutral-800')
                      }
                    >
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-extrabold text-slate-900 dark:text-white capitalize">{unit.unitName}</h4>
                            {unit.isBase && (
                              <span className="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 text-[9px] font-extrabold uppercase border border-emerald-300">
                                <Star className="h-2 w-2 fill-current inline mr-0.5" />
                                Base
                              </span>
                            )}
                            {unit.isDefault && !unit.isBase && (
                              <span className="px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/40 text-amber-700 text-[9px] font-extrabold uppercase border border-amber-300">
                                Default
                              </span>
                            )}
                            {!unit.isActive && (
                              <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-neutral-800 text-slate-500 text-[9px] font-extrabold uppercase">
                                Inactive
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2 mt-1 text-xs text-slate-500 font-semibold flex-wrap">
                            <span className="inline-flex items-center gap-1">
                              <ArrowRightLeft className="h-2.5 w-2.5" />
                              1 {unit.unitName} = <strong className="text-slate-700 dark:text-slate-300 tabular-nums">{unit.conversionRate}</strong> base
                            </span>
                            {unit.barcode && (
                              <>
                                <span>•</span>
                                <span className="inline-flex items-center gap-1 font-mono">
                                  <Barcode className="h-2.5 w-2.5" />
                                  {unit.barcode}
                                </span>
                              </>
                            )}
                            {unit.sku && (
                              <>
                                <span>•</span>
                                <span className="font-mono">SKU: {unit.sku}</span>
                              </>
                            )}
                          </div>

                          {unit.unitLabel && (
                            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 italic">{unit.unitLabel}</p>
                          )}
                        </div>

                        <div className="text-right shrink-0">
                          <div className="text-2xl font-extrabold text-emerald-700 dark:text-emerald-400 tabular-nums">
                            {formatPKR(unit.price)}
                          </div>
                          <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 justify-end mt-0.5">
                            {unit.costPrice > 0 && <span>Cost: {formatPKR(unit.costPrice)}</span>}
                            {unit.wholesalePrice && <span>W/S: {formatPKR(unit.wholesalePrice)}</span>}
                            {unit.mrpPrice && <span>MRP: {formatPKR(unit.mrpPrice)}</span>}
                          </div>
                          <div className="mt-2 flex gap-1 justify-end">
                            <button
                              onClick={() => { setEditingUnit(unit); setShowForm(true); }}
                              className="h-8 w-8 rounded-lg bg-slate-100 dark:bg-neutral-800 hover:bg-slate-200 text-slate-600 flex items-center justify-center"
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                            </button>
                            {!unit.isBase && (
                              <button
                                onClick={() => {
                                  if (confirm('Delete unit "' + unit.unitName + '"?')) removeMutation.mutate(unit.id);
                                }}
                                className="h-8 w-8 rounded-lg bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 text-rose-600 flex items-center justify-center"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}

function UnitForm({ productId, editing, onClose, onSaved }: {
  productId: string;
  editing: ProductUnit | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    unitName: editing?.unitName ?? '',
    unitLabel: editing?.unitLabel ?? '',
    conversionType: editing?.conversionType ?? ('BASE' as UnitConversionType),
    conversionRate: editing?.conversionRate ?? 1,
    price: editing?.price ?? 0,
    costPrice: editing?.costPrice ?? 0,
    wholesalePrice: editing?.wholesalePrice ?? '',
    mrpPrice: editing?.mrpPrice ?? '',
    barcode: editing?.barcode ?? '',
    sku: editing?.sku ?? '',
    isBase: editing?.isBase ?? false,
    isDefault: editing?.isDefault ?? false,
    isActive: editing?.isActive ?? true,
  });

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload: any = {
        productId,
        ...form,
        wholesalePrice: form.wholesalePrice === '' ? undefined : Number(form.wholesalePrice),
        mrpPrice: form.mrpPrice === '' ? undefined : Number(form.mrpPrice),
      };
      return editing
        ? productUnitsApi.update(editing.id, payload)
        : productUnitsApi.create(payload);
    },
    onSuccess: () => {
      toast.success(editing ? 'Unit updated' : 'Unit created');
      onSaved();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Save failed'),
  });

  return (
    <div className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-emerald-300 dark:border-emerald-700 shadow-lg overflow-hidden">
      <div className="px-5 py-3 border-b border-slate-100 dark:border-neutral-800 bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-between">
        <h3 className="font-extrabold text-slate-900 dark:text-white">
          {editing ? 'Edit Unit' : 'New Unit'}
        </h3>
        <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-white dark:hover:bg-neutral-800 flex items-center justify-center">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="p-5 space-y-4">
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] uppercase tracking-wider font-extrabold text-slate-600 dark:text-slate-400 mb-1 block">Unit Name *</label>
            <input
              value={form.unitName}
              onChange={(e) => setForm({ ...form, unitName: e.target.value })}
              placeholder="dozen"
              className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider font-extrabold text-slate-600 dark:text-slate-400 mb-1 block">Display Label</label>
            <input
              value={form.unitLabel}
              onChange={(e) => setForm({ ...form, unitLabel: e.target.value })}
              placeholder="Dozen (12 pieces)"
              className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] uppercase tracking-wider font-extrabold text-slate-600 dark:text-slate-400 mb-1 block">Conversion Type</label>
            <select
              value={form.conversionType}
              onChange={(e) => setForm({ ...form, conversionType: e.target.value as UnitConversionType })}
              className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-emerald-500"
            >
              {CONVERSION_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label} — {t.example}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider font-extrabold text-slate-600 dark:text-slate-400 mb-1 block">
              Conversion Rate * (how many base units = 1 {form.unitName || 'unit'})
            </label>
            <input
              type="number"
              step="0.0001"
              min="0.0001"
              value={form.conversionRate}
              onChange={(e) => setForm({ ...form, conversionRate: Number(e.target.value) })}
              className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        <div className="grid sm:grid-cols-4 gap-3">
          <div>
            <label className="text-[10px] uppercase tracking-wider font-extrabold text-emerald-700 mb-1 block">Selling Price *</label>
            <input
              type="number"
              step="0.01"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
              className="h-11 w-full rounded-xl border-2 border-emerald-200 dark:border-emerald-800 bg-white dark:bg-neutral-800 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider font-extrabold text-slate-600 mb-1 block">Cost Price</label>
            <input
              type="number"
              step="0.01"
              value={form.costPrice}
              onChange={(e) => setForm({ ...form, costPrice: Number(e.target.value) })}
              className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold tabular-nums focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider font-extrabold text-violet-700 mb-1 block">Wholesale</label>
            <input
              type="number"
              step="0.01"
              value={form.wholesalePrice}
              onChange={(e) => setForm({ ...form, wholesalePrice: e.target.value as any })}
              className="h-11 w-full rounded-xl border-2 border-violet-200 dark:border-violet-800 bg-white dark:bg-neutral-800 px-3 text-sm font-bold tabular-nums focus:outline-none focus:border-violet-500"
            />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider font-extrabold text-blue-700 mb-1 block">MRP</label>
            <input
              type="number"
              step="0.01"
              value={form.mrpPrice}
              onChange={(e) => setForm({ ...form, mrpPrice: e.target.value as any })}
              className="h-11 w-full rounded-xl border-2 border-blue-200 dark:border-blue-800 bg-white dark:bg-neutral-800 px-3 text-sm font-bold tabular-nums focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] uppercase tracking-wider font-extrabold text-slate-600 mb-1 block">Barcode (for this unit)</label>
            <input
              value={form.barcode}
              onChange={(e) => setForm({ ...form, barcode: e.target.value })}
              placeholder="8901234567890"
              className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-mono font-bold focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider font-extrabold text-slate-600 mb-1 block">SKU</label>
            <input
              value={form.sku}
              onChange={(e) => setForm({ ...form, sku: e.target.value })}
              placeholder="COLG-DZN"
              className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-mono font-bold focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <label className="flex items-center gap-2 p-3 rounded-xl border-2 border-slate-200 dark:border-neutral-700 cursor-pointer hover:border-emerald-300">
            <input
              type="checkbox"
              checked={form.isBase}
              onChange={(e) => setForm({ ...form, isBase: e.target.checked })}
              className="h-4 w-4 rounded"
            />
            <span className="text-xs font-extrabold text-slate-700 dark:text-slate-300">Base Unit</span>
          </label>
          <label className="flex items-center gap-2 p-3 rounded-xl border-2 border-slate-200 dark:border-neutral-700 cursor-pointer hover:border-amber-300">
            <input
              type="checkbox"
              checked={form.isDefault}
              onChange={(e) => setForm({ ...form, isDefault: e.target.checked })}
              className="h-4 w-4 rounded"
            />
            <span className="text-xs font-extrabold text-slate-700 dark:text-slate-300">Default at POS</span>
          </label>
          <label className="flex items-center gap-2 p-3 rounded-xl border-2 border-slate-200 dark:border-neutral-700 cursor-pointer hover:border-emerald-300">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
              className="h-4 w-4 rounded"
            />
            <span className="text-xs font-extrabold text-slate-700 dark:text-slate-300">Active</span>
          </label>
        </div>

        <div className="flex gap-2 pt-2">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button
            className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-700"
            onClick={() => saveMutation.mutate()}
            loading={saveMutation.isPending}
            disabled={!form.unitName || !form.price}
          >
            <Save className="h-4 w-4" />
            {editing ? 'Update Unit' : 'Create Unit'}
          </Button>
        </div>
      </div>
    </div>
  );
}
