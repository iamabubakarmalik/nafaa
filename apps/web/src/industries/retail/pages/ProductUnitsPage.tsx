import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Layers, Plus, Search, X, Edit3, Trash2, Star, Package,
  Barcode, Save, ArrowRightLeft, CheckCircle2, Sparkles,
  ArrowLeft, Zap, TrendingUp, Copy, RefreshCw, Boxes, Container,
} from 'lucide-react';
import { productUnitsApi, type ProductUnit, type UnitConversionType } from '../api/product-units.api';
import { productsApi } from '@modules/inventory/products/api/products.api';
import { formatPKR, formatPKRFull } from '@core/lib/format';
import { Button } from '@core/ui/Button';
import { toast } from 'sonner';
import { useCostHidden, PrivacyToggle } from '@core/ui/HiddenValue';
import BarcodeScanner from '@core/components/barcode/BarcodeScanner';

const PRESETS = [
  { n: 'Half-Dozen', r: 6, t: 'PACK' as UnitConversionType, e: '🥚' },
  { n: 'Dozen', r: 12, t: 'DOZEN' as UnitConversionType, e: '🗳️' },
  { n: 'Pack', r: 10, t: 'PACK' as UnitConversionType, e: '📦' },
  { n: 'Box', r: 24, t: 'BOX' as UnitConversionType, e: '🗃️' },
  { n: 'Carton', r: 120, t: 'CARTON' as UnitConversionType, e: '📮' },
  { n: 'Bag', r: 50, t: 'CUSTOM' as UnitConversionType, e: '👝' },
];

export default function ProductUnitsPage() {
  const queryClient = useQueryClient();
  const hideCost = useCostHidden();
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [productSearch, setProductSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingUnit, setEditingUnit] = useState<ProductUnit | null>(null);

  const { data: productsData, isLoading: loadingProducts } = useQuery({
    queryKey: ['products-for-units', productSearch],
    queryFn: () => productsApi.list({ page: 1, limit: 100, search: productSearch || undefined } as any),
  });

  const products: any[] = (productsData as any)?.items ?? [];
  const selectedProduct = products.find((p) => p.id === selectedProductId);

  const { data: units = [], isLoading, refetch } = useQuery({
    queryKey: ['product-units', selectedProductId],
    queryFn: () => productUnitsApi.byProduct(selectedProductId),
    enabled: !!selectedProductId,
  });

  const basePrice = Number(selectedProduct?.price || 0);
  const baseCost = Number(selectedProduct?.costPrice || 0);

  const removeMutation = useMutation({
    mutationFn: (id: string) => productUnitsApi.remove(id),
    onSuccess: () => {
      toast.success('Unit delete ho gaya');
      queryClient.invalidateQueries({ queryKey: ['product-units'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Delete fail hua'),
  });

  const quickAddPreset = useMutation({
    mutationFn: async ({ name, rate, type }: { name: string; rate: number; type: UnitConversionType }) => {
      return productUnitsApi.create({
        productId: selectedProductId,
        unitName: name.toLowerCase(),
        unitLabel: `${name} (${rate} ${selectedProduct?.unit || 'pcs'})`,
        conversionType: type,
        conversionRate: rate,
        price: Math.round(basePrice * rate),
        costPrice: Math.round(baseCost * rate),
        isBase: false,
        isDefault: false,
        isActive: true,
      });
    },
    onSuccess: () => {
      toast.success('Unit add ho gaya');
      queryClient.invalidateQueries({ queryKey: ['product-units'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Add fail hua'),
  });

  const stats = useMemo(() => {
    return {
      total: units.length,
      active: units.filter((u) => u.isActive).length,
      hasBase: units.some((u) => u.isBase),
    };
  }, [units]);

  return (
    <div className="space-y-5">
      {/* HERO */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-emerald-900 to-teal-700 text-white p-6 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-emerald-400/20 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-cyan-400/15 blur-3xl" />

        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <Sparkles className="h-3.5 w-3.5 text-amber-300" /> Multi-Unit Selling
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">📦 Product Units</h1>
            <p className="mt-2 text-sm text-white/80">
              Piece, Dozen, Carton — sab units alag price se becho
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => refetch()}
              className="inline-flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/20 px-4 py-2.5 text-sm font-bold backdrop-blur"
            >
              <RefreshCw className="h-4 w-4" /> Refresh
            </button>
            <PrivacyToggle />
          </div>
        </div>
      </section>

      <div className="grid xl:grid-cols-[400px_1fr] gap-5">
        {/* ═══ LEFT: Product picker ═══ */}
        <section className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm overflow-hidden flex flex-col max-h-[calc(100vh-200px)]">
          <div className="shrink-0 px-4 py-3 border-b-2 border-slate-100 bg-slate-50">
            <h3 className="font-extrabold text-slate-900 text-sm">Product Chuno</h3>
          </div>
          <div className="shrink-0 p-3 border-b border-slate-100">
            <div className="relative">
              <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                autoFocus
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                placeholder="Product dhundo..."
                className="h-11 w-full rounded-xl border-2 border-slate-200 bg-white pl-10 pr-10 text-sm font-semibold focus:outline-none focus:border-emerald-500"
              />
              {productSearch && (
                <button onClick={() => setProductSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 rounded hover:bg-slate-100 flex items-center justify-center">
                  <X className="h-3.5 w-3.5 text-slate-400" />
                </button>
              )}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loadingProducts ? (
              <div className="p-6 text-center text-sm text-slate-500 font-semibold">Loading...</div>
            ) : products.length === 0 ? (
              <div className="p-6 text-center">
                <Package className="h-12 w-12 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-extrabold text-slate-700">Koi product nahi mila</p>
              </div>
            ) : (
              products.map((p) => (
                <button
                  key={p.id}
                  onClick={() => { setSelectedProductId(p.id); setShowForm(false); setEditingUnit(null); }}
                  className={[
                    'w-full px-4 py-3 flex items-center gap-3 hover:bg-slate-50 transition text-left border-b border-slate-50',
                    selectedProductId === p.id ? 'bg-emerald-50 border-l-4 border-emerald-500' : '',
                  ].join(' ')}
                >
                  <div className="h-11 w-11 rounded-xl bg-slate-100 overflow-hidden flex items-center justify-center shrink-0 border border-slate-200">
                    {p.images?.[0]?.url ? (
                      <img src={p.images[0].url} alt="" loading="lazy" className="h-full w-full object-cover" />
                    ) : (
                      <Package className="h-5 w-5 text-slate-400" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-extrabold text-sm truncate text-slate-900">{p.name}</div>
                    <div className="text-xs text-slate-500 font-bold">{p.unit} • {formatPKR(p.price)}</div>
                  </div>
                </button>
              ))
            )}
          </div>
        </section>

        {/* ═══ RIGHT: Units panel ═══ */}
        <section className="space-y-4 min-w-0">
          {!selectedProduct ? (
            <div className="rounded-3xl bg-white border-2 border-dashed border-slate-200 p-16 text-center">
              <div className="h-20 w-20 rounded-3xl bg-gradient-to-br from-emerald-100 to-teal-200 mx-auto flex items-center justify-center">
                <Layers className="h-10 w-10 text-emerald-600" />
              </div>
              <h3 className="mt-4 text-lg font-extrabold text-slate-900">Product Chuno</h3>
              <p className="mt-1 text-sm text-slate-500 font-semibold">
                Left se product select karo, phir uske units manage karo
              </p>
            </div>
          ) : (
            <>
              {/* Product header */}
              <div className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm p-4 flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="h-14 w-14 rounded-2xl bg-slate-100 overflow-hidden flex items-center justify-center shrink-0 border border-slate-200">
                    {selectedProduct.images?.[0]?.url ? (
                      <img src={selectedProduct.images[0].url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <Package className="h-6 w-6 text-slate-400" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="font-extrabold text-lg text-slate-900 truncate">{selectedProduct.name}</h2>
                    <div className="text-xs text-slate-500 font-bold flex items-center gap-2 flex-wrap">
                      <span>Base: <strong className="text-slate-700">{selectedProduct.unit}</strong></span>
                      <span>•</span>
                      <span className="text-emerald-700 font-extrabold">{formatPKR(basePrice)}/{selectedProduct.unit}</span>
                      <span>•</span>
                      <span>{stats.total} units set</span>
                    </div>
                  </div>
                </div>
                <Button
                  onClick={() => { setEditingUnit(null); setShowForm(true); }}
                  className="bg-gradient-to-r from-emerald-600 to-teal-700"
                >
                  <Plus className="h-4 w-4" /> Custom Unit
                </Button>
              </div>

              {/* Quick presets */}
              <div className="rounded-3xl bg-gradient-to-br from-emerald-50 to-white border-2 border-emerald-200 p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[10px] uppercase tracking-wider font-extrabold text-emerald-700 flex items-center gap-1">
                      <Zap className="h-3 w-3 text-amber-500" /> Ek Click Se Add
                    </div>
                    <h4 className="font-extrabold text-slate-900 text-sm mt-0.5">Common conversions</h4>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                  {PRESETS.map((p) => {
                    const exists = units.some((u) => u.unitName.toLowerCase() === p.n.toLowerCase());
                    return (
                      <button
                        key={p.n}
                        disabled={exists || quickAddPreset.isPending || !basePrice}
                        onClick={() => quickAddPreset.mutate({ name: p.n, rate: p.r, type: p.t })}
                        className={[
                          'p-3 rounded-2xl border-2 text-center transition disabled:cursor-not-allowed',
                          exists
                            ? 'border-emerald-300 bg-emerald-50 opacity-70'
                            : 'border-slate-200 bg-white hover:border-emerald-400 hover:shadow-sm disabled:opacity-40',
                        ].join(' ')}
                      >
                        <div className="text-2xl leading-none">{p.e}</div>
                        <div className="font-extrabold text-xs text-slate-900 mt-1">{p.n}</div>
                        <div className="text-[9px] text-slate-500 font-bold">= {p.r} {selectedProduct.unit}</div>
                        <div className="text-[9px] text-emerald-700 font-extrabold mt-0.5">
                          {exists ? '✓ Added' : formatPKRFull(basePrice * p.r)}
                        </div>
                      </button>
                    );
                  })}
                </div>
                {!basePrice && (
                  <div className="rounded-xl bg-amber-50 border-2 border-amber-200 p-2.5 text-xs font-bold text-amber-800">
                    ⚠️ Pehle product ka base price set karo, phir presets kaam karenge
                  </div>
                )}
              </div>

              {/* Form */}
              {showForm && (
                <UnitForm
                  productId={selectedProduct.id}
                  baseUnit={selectedProduct.unit}
                  basePrice={basePrice}
                  baseCost={baseCost}
                  editing={editingUnit}
                  onClose={() => { setShowForm(false); setEditingUnit(null); }}
                  onSaved={() => {
                    setShowForm(false);
                    setEditingUnit(null);
                    queryClient.invalidateQueries({ queryKey: ['product-units'] });
                  }}
                />
              )}

              {/* Units list */}
              {isLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => <div key={i} className="h-24 rounded-2xl bg-slate-100 animate-pulse" />)}
                </div>
              ) : units.length === 0 ? (
                <div className="rounded-3xl bg-white border-2 border-dashed border-slate-300 p-12 text-center">
                  <Layers className="h-14 w-14 text-slate-300 mx-auto mb-2" />
                  <h3 className="font-extrabold text-slate-900">Koi unit nahi</h3>
                  <p className="mt-1 text-sm text-slate-500 font-semibold">
                    Upar se preset click karo ya "Custom Unit" banao
                  </p>
                </div>
              ) : (
                <div className="grid gap-3">
                  {units.map((unit) => (
                    <UnitCard
                      key={unit.id}
                      unit={unit}
                      baseUnit={selectedProduct.unit}
                      hideCost={hideCost}
                      onEdit={() => { setEditingUnit(unit); setShowForm(true); }}
                      onDelete={() => {
                        if (confirm(`"${unit.unitName}" delete karein?`)) removeMutation.mutate(unit.id);
                      }}
                    />
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

/* ══════════ Unit Card ══════════ */
function UnitCard({ unit, baseUnit, hideCost, onEdit, onDelete }: {
  unit: ProductUnit;
  baseUnit: string;
  hideCost: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const profit = Number(unit.price || 0) - Number(unit.costPrice || 0);
  return (
    <div className={[
      'rounded-2xl bg-white border-2 shadow-sm p-4',
      unit.isBase ? 'border-emerald-400 ring-2 ring-emerald-100' : 'border-slate-200',
    ].join(' ')}>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <div className={[
              'h-10 w-10 rounded-xl flex items-center justify-center shrink-0',
              unit.isBase ? 'bg-emerald-500 text-white' : 'bg-emerald-100 text-emerald-700',
            ].join(' ')}>
              {unit.isBase ? <Star className="h-5 w-5 fill-white" /> : <Layers className="h-5 w-5" />}
            </div>
            <div>
              <h4 className="font-extrabold text-slate-900 capitalize text-base">{unit.unitName}</h4>
              <div className="flex items-center gap-1 flex-wrap mt-0.5">
                {unit.isBase && (
                  <span className="px-1.5 py-0.5 rounded-md bg-emerald-500 text-white text-[9px] font-extrabold">BASE</span>
                )}
                {unit.isDefault && !unit.isBase && (
                  <span className="px-1.5 py-0.5 rounded-md bg-amber-500 text-white text-[9px] font-extrabold">POS DEFAULT</span>
                )}
                {!unit.isActive && (
                  <span className="px-1.5 py-0.5 rounded-md bg-slate-500 text-white text-[9px] font-extrabold">BAND</span>
                )}
              </div>
            </div>
          </div>

          <div className="mt-2 flex items-center gap-2 flex-wrap text-xs text-slate-600 font-bold">
            <span className="inline-flex items-center gap-1">
              <ArrowRightLeft className="h-3 w-3 text-slate-400" />
              1 {unit.unitName} = <strong className="text-slate-900 tabular-nums">{unit.conversionRate}</strong> {baseUnit}
            </span>
            {unit.barcode && (
              <>
                <span className="text-slate-300">•</span>
                <span className="inline-flex items-center gap-0.5 font-mono">
                  <Barcode className="h-3 w-3" /> {unit.barcode}
                </span>
              </>
            )}
            {unit.sku && (
              <>
                <span className="text-slate-300">•</span>
                <span className="font-mono">SKU: {unit.sku}</span>
              </>
            )}
          </div>
        </div>

        <div className="text-right shrink-0">
          <div className="text-2xl font-extrabold text-emerald-700 tabular-nums leading-none">{formatPKR(unit.price)}</div>
          {!hideCost && (
            <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 justify-end mt-1">
              {unit.costPrice > 0 && <span>Cost: {formatPKR(unit.costPrice)}</span>}
              {unit.wholesalePrice && <span>W/S: {formatPKR(unit.wholesalePrice)}</span>}
            </div>
          )}
          {!hideCost && profit !== 0 && (
            <div className={[
              'text-[10px] font-extrabold mt-0.5',
              profit >= 0 ? 'text-emerald-700' : 'text-rose-700',
            ].join(' ')}>
              Faida: {formatPKR(profit)}
            </div>
          )}
          <div className="mt-2 flex gap-1 justify-end">
            <button onClick={onEdit} className="h-8 w-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center">
              <Edit3 className="h-3.5 w-3.5" />
            </button>
            {!unit.isBase && (
              <button onClick={onDelete} className="h-8 w-8 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ══════════ Unit Form ══════════ */
function UnitForm({ productId, baseUnit, basePrice, baseCost, editing, onClose, onSaved }: {
  productId: string;
  baseUnit: string;
  basePrice: number;
  baseCost: number;
  editing: ProductUnit | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    unitName: editing?.unitName ?? '',
    unitLabel: editing?.unitLabel ?? '',
    conversionType: (editing?.conversionType ?? 'CUSTOM') as UnitConversionType,
    conversionRate: editing?.conversionRate ?? 1,
    price: editing?.price ?? 0,
    costPrice: editing?.costPrice ?? 0,
    wholesalePrice: editing?.wholesalePrice ?? ('' as any),
    mrpPrice: editing?.mrpPrice ?? ('' as any),
    barcode: editing?.barcode ?? '',
    sku: editing?.sku ?? '',
    isBase: editing?.isBase ?? false,
    isDefault: editing?.isDefault ?? false,
    isActive: editing?.isActive ?? true,
  });
  const [scanOpen, setScanOpen] = useState(false);

  // Auto-calc price when conversion rate changes (only for new)
  const autofillPrices = () => {
    setForm({
      ...form,
      price: Math.round(basePrice * form.conversionRate),
      costPrice: Math.round(baseCost * form.conversionRate),
    });
    toast.success('Prices auto-fill ho gaye');
  };

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload: any = {
        productId,
        ...form,
        wholesalePrice: form.wholesalePrice === '' ? undefined : Number(form.wholesalePrice),
        mrpPrice: form.mrpPrice === '' ? undefined : Number(form.mrpPrice),
      };
      // On edit: dedupe SKU/barcode if unchanged
      if (editing) {
        if ((payload.sku ?? '') === (editing.sku ?? '')) delete payload.sku;
        if ((payload.barcode ?? '') === (editing.barcode ?? '')) delete payload.barcode;
      }
      return editing
        ? productUnitsApi.update(editing.id, payload)
        : productUnitsApi.create(payload);
    },
    onSuccess: () => {
      toast.success(editing ? 'Unit update ho gaya' : 'Unit ban gaya');
      onSaved();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Save fail hua'),
  });

  return (
    <>
      {scanOpen && (
        <BarcodeScanner
          onDetected={(c: string) => { setForm({ ...form, barcode: c.trim() }); setScanOpen(false); }}
          onClose={() => setScanOpen(false)}
        />
      )}
      <div className="rounded-3xl bg-white border-2 border-emerald-300 shadow-lg overflow-hidden">
        <div className="px-5 py-3 border-b-2 border-emerald-100 bg-gradient-to-r from-emerald-50 to-teal-50 flex items-center justify-between">
          <h3 className="font-extrabold text-emerald-900">
            {editing ? '✏️ Edit Unit' : '➕ Naya Unit'}
          </h3>
          <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-white flex items-center justify-center">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-extrabold uppercase text-slate-600 mb-1.5">Unit ka naam *</label>
              <input
                autoFocus
                value={form.unitName}
                onChange={(e) => setForm({ ...form, unitName: e.target.value })}
                placeholder="dozen"
                className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-extrabold uppercase text-slate-600 mb-1.5">
                Kitne {baseUnit} = 1 {form.unitName || 'unit'} *
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={form.conversionRate}
                  onChange={(e) => setForm({ ...form, conversionRate: Number(e.target.value) })}
                  className="h-11 flex-1 rounded-xl border-2 border-slate-200 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-emerald-500"
                />
                {!editing && basePrice > 0 && (
                  <button
                    onClick={autofillPrices}
                    className="h-11 px-3 rounded-xl bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-xs font-extrabold inline-flex items-center gap-1"
                    title="Auto-fill prices"
                  >
                    <Zap className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-extrabold uppercase text-emerald-700 mb-1.5">Bikri Rate *</label>
              <input
                type="number"
                step="0.01"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
                className="h-12 w-full rounded-xl border-2 border-emerald-300 bg-emerald-50 px-3 text-xl font-extrabold tabular-nums text-emerald-900 focus:outline-none focus:border-emerald-600"
              />
            </div>
            <div>
              <label className="block text-xs font-extrabold uppercase text-slate-600 mb-1.5">Kharid Rate</label>
              <input
                type="number"
                step="0.01"
                value={form.costPrice}
                onChange={(e) => setForm({ ...form, costPrice: Number(e.target.value) })}
                className="h-12 w-full rounded-xl border-2 border-slate-200 px-3 text-xl font-extrabold tabular-nums focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-extrabold uppercase text-violet-700 mb-1.5">Wholesale</label>
              <input
                type="number"
                step="0.01"
                value={form.wholesalePrice}
                onChange={(e) => setForm({ ...form, wholesalePrice: e.target.value as any })}
                placeholder="Optional"
                className="h-11 w-full rounded-xl border-2 border-violet-200 px-3 text-sm font-bold tabular-nums focus:outline-none focus:border-violet-500"
              />
            </div>
            <div>
              <label className="block text-xs font-extrabold uppercase text-blue-700 mb-1.5">MRP</label>
              <input
                type="number"
                step="0.01"
                value={form.mrpPrice}
                onChange={(e) => setForm({ ...form, mrpPrice: e.target.value as any })}
                placeholder="Optional"
                className="h-11 w-full rounded-xl border-2 border-blue-200 px-3 text-sm font-bold tabular-nums focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-extrabold uppercase text-slate-600 mb-1.5">Unit Barcode</label>
              <div className="flex gap-2">
                <input
                  value={form.barcode}
                  onChange={(e) => setForm({ ...form, barcode: e.target.value })}
                  placeholder="Optional"
                  className="h-11 flex-1 rounded-xl border-2 border-slate-200 px-3 text-sm font-mono font-bold focus:outline-none focus:border-emerald-500"
                />
                <button
                  onClick={() => setScanOpen(true)}
                  className="h-11 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-extrabold"
                >
                  Scan
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-extrabold uppercase text-slate-600 mb-1.5">SKU</label>
              <input
                value={form.sku}
                onChange={(e) => setForm({ ...form, sku: e.target.value })}
                placeholder="COLG-DZN"
                className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-mono font-bold focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <label className="flex items-center gap-2 p-3 rounded-xl border-2 border-slate-200 cursor-pointer hover:border-emerald-300">
              <input type="checkbox" checked={form.isBase} onChange={(e) => setForm({ ...form, isBase: e.target.checked })} className="h-4 w-4 rounded" />
              <span className="text-xs font-extrabold text-slate-700">Base Unit</span>
            </label>
            <label className="flex items-center gap-2 p-3 rounded-xl border-2 border-slate-200 cursor-pointer hover:border-amber-300">
              <input type="checkbox" checked={form.isDefault} onChange={(e) => setForm({ ...form, isDefault: e.target.checked })} className="h-4 w-4 rounded" />
              <span className="text-xs font-extrabold text-slate-700">POS Default</span>
            </label>
            <label className="flex items-center gap-2 p-3 rounded-xl border-2 border-slate-200 cursor-pointer hover:border-emerald-300">
              <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="h-4 w-4 rounded" />
              <span className="text-xs font-extrabold text-slate-700">Active</span>
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
              <Save className="h-4 w-4" /> {editing ? 'Update' : 'Save'}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
