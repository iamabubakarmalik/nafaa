import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Save, X, Plus, Trash2, Search, Package, Sparkles,
  Tag, Calendar, Star, Info, Percent, CheckCircle2, AlertTriangle,
  Camera, Wand2, TrendingUp, ChevronDown, ChevronUp,
} from 'lucide-react';
import { toast } from 'sonner';
import { combosApi, type ComboStatus, type ComboItem } from '../api/combos.api';
import { productsApi } from '@modules/inventory/products/api/products.api';
import { categoriesApi } from '@modules/inventory/categories/api/categories.api';
import { formatPKR, formatPKRFull } from '@core/lib/format';
import { Button } from '@core/ui/Button';
import { UploadDropzone } from '@core/components/uploads';
import BarcodeScanner from '@core/components/barcode/BarcodeScanner';

const DISCOUNT_QUICK = [5, 10, 15, 20, 25];

export default function ComboFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEdit = !!id;

  const [form, setForm] = useState({
    name: '', description: '', sku: '', barcode: '', imageUrl: '', categoryId: '',
    comboPrice: 0, status: 'ACTIVE' as ComboStatus,
    validFrom: '', validTo: '',
    maxPurchasePerCustomer: '' as any, stockAvailable: '' as any,
    isFeatured: false, tagLine: '',
  });
  const [items, setItems] = useState<ComboItem[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [showProductSearch, setShowProductSearch] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);

  const { data: existingCombo, isLoading: loadingCombo } = useQuery({
    queryKey: ['combo', id],
    queryFn: () => combosApi.getOne(id!),
    enabled: isEdit,
  });

  useEffect(() => {
    if (existingCombo) {
      setForm({
        name: existingCombo.name,
        description: existingCombo.description || '',
        sku: existingCombo.sku || '',
        barcode: existingCombo.barcode || '',
        imageUrl: existingCombo.imageUrl || '',
        categoryId: existingCombo.categoryId || '',
        comboPrice: existingCombo.comboPrice,
        status: existingCombo.status,
        validFrom: existingCombo.validFrom ? existingCombo.validFrom.slice(0, 10) : '',
        validTo: existingCombo.validTo ? existingCombo.validTo.slice(0, 10) : '',
        maxPurchasePerCustomer: existingCombo.maxPurchasePerCustomer ?? '',
        stockAvailable: existingCombo.stockAvailable ?? '',
        isFeatured: existingCombo.isFeatured,
        tagLine: existingCombo.tagLine || '',
      });
      setItems(existingCombo.items || []);
    }
  }, [existingCombo]);

  const { data: productsData } = useQuery({
    queryKey: ['products-for-combo', productSearch],
    queryFn: () => productsApi.list({ page: 1, limit: 30, search: productSearch || undefined } as any),
    enabled: showProductSearch,
  });
  const { data: categories = [] } = useQuery({ queryKey: ['categories'], queryFn: categoriesApi.list });

  const originalTotal = useMemo(() =>
    items.reduce((sum, it) => sum + (it.originalPrice ?? it.product?.price ?? 0) * it.quantity, 0),
    [items]);
  const savings = Math.max(originalTotal - form.comboPrice, 0);
  const savingsPercent = originalTotal > 0 ? (savings / originalTotal) * 100 : 0;
  const isLoss = form.comboPrice > originalTotal && originalTotal > 0;

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload: any = {
        name: form.name,
        description: form.description || undefined,
        sku: form.sku || undefined,
        barcode: form.barcode || undefined,
        imageUrl: form.imageUrl || undefined,
        categoryId: form.categoryId || undefined,
        comboPrice: form.comboPrice,
        status: form.status,
        validFrom: form.validFrom || undefined,
        validTo: form.validTo || undefined,
        maxPurchasePerCustomer: form.maxPurchasePerCustomer ? Number(form.maxPurchasePerCustomer) : undefined,
        stockAvailable: form.stockAvailable ? Number(form.stockAvailable) : undefined,
        isFeatured: form.isFeatured,
        tagLine: form.tagLine || undefined,
        items: items.map((it) => ({
          productId: it.productId,
          variantId: it.variantId,
          unitId: it.unitId,
          quantity: it.quantity,
          unitName: it.unitName,
          originalPrice: it.originalPrice,
        })),
      };
      // On edit, drop SKU/barcode if unchanged
      if (isEdit && existingCombo) {
        if ((payload.sku ?? '') === (existingCombo.sku ?? '')) delete payload.sku;
        if ((payload.barcode ?? '') === (existingCombo.barcode ?? '')) delete payload.barcode;
      }
      return isEdit ? combosApi.update(id!, payload) : combosApi.create(payload);
    },
    onSuccess: () => {
      toast.success(isEdit ? 'Combo update ho gaya' : 'Combo ban gaya!');
      queryClient.invalidateQueries({ queryKey: ['retail-combos'] });
      queryClient.invalidateQueries({ queryKey: ['combo', id] });
      navigate('/retail/combos');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Save fail hua'),
  });

  const addProductToItems = (product: any) => {
    const existing = items.find((i) => i.productId === product.id && !i.variantId);
    if (existing) {
      setItems(items.map((i) =>
        i.productId === product.id && !i.variantId ? { ...i, quantity: i.quantity + 1 } : i
      ));
      toast.success(`+1 ${product.name}`);
    } else {
      setItems([...items, {
        productId: product.id,
        quantity: 1,
        unitName: product.unit,
        originalPrice: product.price,
        product,
      }]);
      toast.success(`${product.name} added`);
    }
    setProductSearch('');
  };

  const handleBarcodeScan = async (code: string) => {
    setScanOpen(false);
    try {
      const p = await productsApi.byBarcode(code.trim());
      if (p) addProductToItems(p);
    } catch {
      toast.error('Barcode ka product nahi mila');
    }
  };

  const updateItem = (i: number, patch: Partial<ComboItem>) => {
    setItems(items.map((it, idx) => idx === i ? { ...it, ...patch } : it));
  };
  const removeItem = (i: number) => setItems(items.filter((_, idx) => idx !== i));

  const applyDiscount = (pct: number) => {
    if (originalTotal === 0) return toast.error('Pehle items add karo');
    setForm({ ...form, comboPrice: Math.round(originalTotal * (1 - pct / 100)) });
  };

  const autoSku = () => {
    const b = (form.name || 'COMBO').toUpperCase().replace(/[^A-Z0-9 ]/g, '').trim()
      .split(/\s+/).slice(0, 2).map((w) => w.slice(0, 4)).join('-') || 'COMBO';
    setForm({ ...form, sku: `${b}-${Math.floor(1000 + Math.random() * 9000)}` });
    toast.success('SKU ban gaya');
  };

  const canSave = form.name.trim() && form.comboPrice > 0 && items.length >= 2;

  if (isEdit && loadingCombo) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-12 w-12 rounded-full border-4 border-violet-200 border-t-violet-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-24">
      {scanOpen && <BarcodeScanner onDetected={handleBarcodeScan} onClose={() => setScanOpen(false)} />}

      {/* HERO */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-violet-900 to-purple-700 text-white p-6 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-violet-400/20 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-pink-400/15 blur-3xl" />

        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-3">
            <button
              onClick={() => navigate('/retail/combos')}
              className="h-11 w-11 rounded-2xl bg-white/15 hover:bg-white/25 backdrop-blur flex items-center justify-center border border-white/20"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
                <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                {isEdit ? 'Combo Edit' : 'Naya Combo'}
              </div>
              <h1 className="mt-2 text-3xl sm:text-4xl font-extrabold leading-tight">
                🎁 {isEdit ? form.name || 'Combo' : 'Naya Combo Deal'}
              </h1>
              <p className="mt-1 text-sm text-white/80 font-semibold">
                2+ products ka bundle → customer bachata, aap ki volume badhe
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid xl:grid-cols-[1fr_400px] gap-5 items-start">
        {/* ═══ LEFT ═══ */}
        <div className="space-y-5 min-w-0">
          {/* 1. NAME */}
          <section className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm p-5 space-y-4">
            <Head n="1" icon={Info} title="Combo Ka Naam" desc="Customer ko yeh dikhega" tone="violet" />

            <div>
              <label className="block text-xs font-extrabold uppercase text-slate-600 mb-1.5">Naam *</label>
              <input
                autoFocus
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Chai Combo (Cheeni + Patti + Rusk)"
                className="h-14 w-full rounded-2xl border-2 border-slate-200 px-4 text-lg font-extrabold focus:outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-200"
              />
            </div>

            <div>
              <label className="block text-xs font-extrabold uppercase text-slate-600 mb-1.5">
                Tag Line <span className="text-slate-400 normal-case font-bold">(marketing)</span>
              </label>
              <input
                value={form.tagLine}
                onChange={(e) => setForm({ ...form, tagLine: e.target.value })}
                placeholder="Best Deal! / Ramzan Special / Sirf Aaj"
                className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-violet-500"
              />
            </div>

            <div>
              <label className="block text-xs font-extrabold uppercase text-slate-600 mb-1.5">
                Description <span className="text-slate-400 normal-case font-bold">(optional)</span>
              </label>
              <textarea
                rows={2}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Kya khaas hai is combo mein..."
                className="w-full rounded-xl border-2 border-slate-200 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-violet-500 resize-none"
              />
            </div>
          </section>

          {/* 2. ITEMS */}
          <section className="rounded-3xl bg-white border-2 border-blue-300 shadow-sm p-5 space-y-4">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <Head n="2" icon={Package} title="Combo Items" desc="Kam se kam 2 products add karo" tone="blue" />
              <span className={[
                'px-3 py-1.5 rounded-full text-xs font-extrabold',
                items.length >= 2 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700',
              ].join(' ')}>
                {items.length} items {items.length >= 2 ? '✓' : `(${2 - items.length} aur chahiye)`}
              </span>
            </div>

            {/* Search box */}
            <div className="rounded-2xl border-2 border-blue-200 bg-blue-50/50 p-3 space-y-2">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    value={productSearch}
                    onChange={(e) => { setProductSearch(e.target.value); setShowProductSearch(true); }}
                    onFocus={() => setShowProductSearch(true)}
                    placeholder="Product naam ya SKU se dhundo..."
                    className="h-11 w-full rounded-xl border-2 border-slate-200 bg-white pl-10 pr-3 text-sm font-semibold focus:outline-none focus:border-blue-500"
                  />
                </div>
                <button
                  onClick={() => setScanOpen(true)}
                  className="h-11 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-extrabold inline-flex items-center gap-1"
                >
                  <Camera className="h-4 w-4" /> Scan
                </button>
              </div>

              {showProductSearch && productSearch && (
                <div className="max-h-64 overflow-y-auto space-y-1 border-t border-blue-200 pt-2">
                  {(productsData?.items ?? []).length === 0 ? (
                    <div className="text-xs text-slate-500 font-semibold p-3 text-center">
                      Koi product nahi mila
                    </div>
                  ) : (
                    (productsData?.items ?? []).map((p) => (
                      <button
                        key={p.id}
                        onClick={() => addProductToItems(p)}
                        className="w-full px-3 py-2 flex items-center gap-3 rounded-lg bg-white hover:bg-blue-50 border-2 border-transparent hover:border-blue-200 transition text-left"
                      >
                        <div className="h-10 w-10 rounded-lg bg-slate-100 overflow-hidden flex items-center justify-center shrink-0">
                          {p.images?.[0]?.url ? (
                            <img src={p.images[0].url} alt="" loading="lazy" className="h-full w-full object-cover" />
                          ) : (
                            <Package className="h-5 w-5 text-slate-400" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-extrabold text-sm truncate">{p.name}</div>
                          <div className="text-xs text-slate-500 font-semibold">
                            {formatPKR(p.price)}/{p.unit} • Stock: {p.stock}
                          </div>
                        </div>
                        <Plus className="h-4 w-4 text-blue-600" />
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Items list */}
            {items.length === 0 ? (
              <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                <Package className="h-12 w-12 text-slate-400 mx-auto mb-2" />
                <p className="font-extrabold text-slate-700">Koi item nahi</p>
                <p className="text-xs text-slate-500 font-semibold mt-1">Upar se product search kar ke add karo</p>
              </div>
            ) : (
              <div className="space-y-2">
                {items.map((item, i) => (
                  <div key={i} className="rounded-xl border-2 border-slate-200 bg-white p-3 flex items-center gap-3">
                    <div className="h-11 w-11 rounded-xl bg-slate-100 overflow-hidden flex items-center justify-center shrink-0">
                      {item.product?.images?.[0]?.url ? (
                        <img src={item.product.images[0].url} alt="" loading="lazy" className="h-full w-full object-cover" />
                      ) : (
                        <Package className="h-5 w-5 text-slate-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-extrabold text-sm truncate">{item.product?.name || 'Product'}</div>
                      <div className="text-xs text-slate-500 font-bold">
                        {formatPKR(item.originalPrice ?? item.product?.price ?? 0)}/{item.unitName || 'unit'}
                      </div>
                    </div>
                    <div className="inline-flex items-center bg-slate-100 rounded-lg overflow-hidden shrink-0">
                      <button
                        onClick={() => updateItem(i, { quantity: Math.max(0.01, item.quantity - 1) })}
                        className="h-9 w-9 hover:bg-slate-200 font-extrabold text-slate-700"
                      >
                        −
                      </button>
                      <input
                        type="number"
                        step="0.01"
                        value={item.quantity}
                        onChange={(e) => updateItem(i, { quantity: Number(e.target.value) })}
                        className="h-9 w-16 text-center bg-transparent border-0 font-extrabold text-sm focus:outline-none tabular-nums"
                      />
                      <button
                        onClick={() => updateItem(i, { quantity: item.quantity + 1 })}
                        className="h-9 w-9 bg-blue-600 text-white hover:bg-blue-700 font-extrabold"
                      >
                        +
                      </button>
                    </div>
                    <div className="text-right shrink-0 min-w-[80px]">
                      <div className="text-xs font-bold text-slate-500">Line total</div>
                      <div className="font-extrabold text-emerald-700 tabular-nums text-sm">
                        {formatPKR((item.originalPrice ?? item.product?.price ?? 0) * item.quantity)}
                      </div>
                    </div>
                    <button
                      onClick={() => removeItem(i)}
                      className="h-9 w-9 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center shrink-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* 3. PRICING */}
          <section className="rounded-3xl bg-white border-2 border-emerald-300 shadow-sm p-5 space-y-4">
            <Head n="3" icon={TrendingUp} title="Combo Ki Keemat" desc="Individual total se kam rakho" tone="emerald" />

            <div>
              <label className="block text-xs font-extrabold uppercase text-emerald-700 mb-1.5">Combo Price (Rs) *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.comboPrice || ''}
                onChange={(e) => setForm({ ...form, comboPrice: Number(e.target.value) })}
                placeholder="0"
                className="h-16 w-full rounded-2xl border-2 border-emerald-400 bg-emerald-50 px-4 text-3xl font-extrabold tabular-nums text-emerald-900 focus:outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-200"
              />
            </div>

            {originalTotal > 0 && (
              <>
                <div>
                  <div className="text-[10px] uppercase tracking-wider font-extrabold text-slate-600 mb-1.5 flex items-center gap-1">
                    <Sparkles className="h-3 w-3 text-amber-500" /> Fatafat discount lagao
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {DISCOUNT_QUICK.map((d) => (
                      <button
                        key={d}
                        onClick={() => applyDiscount(d)}
                        className="px-3 py-2 rounded-xl bg-white border-2 border-emerald-200 hover:border-emerald-400 text-emerald-800 text-xs font-extrabold"
                      >
                        -{d}% <span className="text-slate-500 font-bold">= {formatPKRFull(Math.round(originalTotal * (1 - d / 100)))}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className={[
                  'rounded-2xl border-2 p-4',
                  isLoss ? 'bg-rose-50 border-rose-300' : savingsPercent >= 10 ? 'bg-emerald-50 border-emerald-300' : 'bg-amber-50 border-amber-300',
                ].join(' ')}>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className={[
                        'text-[10px] uppercase tracking-wider font-extrabold',
                        isLoss ? 'text-rose-700' : savingsPercent >= 10 ? 'text-emerald-700' : 'text-amber-700',
                      ].join(' ')}>
                        {isLoss ? '⚠️ Nuqsaan!' : 'Customer Ki Bachat'}
                      </div>
                      <div className={[
                        'text-2xl font-extrabold tabular-nums',
                        isLoss ? 'text-rose-900' : 'text-slate-900',
                      ].join(' ')}>
                        {formatPKRFull(savings)}
                      </div>
                    </div>
                    <div className={[
                      'text-3xl font-extrabold tabular-nums',
                      isLoss ? 'text-rose-700' : savingsPercent >= 10 ? 'text-emerald-700' : 'text-amber-700',
                    ].join(' ')}>
                      {savingsPercent.toFixed(1)}%
                    </div>
                  </div>
                </div>
              </>
            )}
          </section>

          {/* 4. ADVANCED */}
          <section className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm p-5 space-y-3">
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="w-full flex items-center justify-between gap-3"
            >
              <Head n="4" icon={Tag} title="Extra Settings" desc="SKU, dates, status" tone="slate" />
              {showAdvanced ? <ChevronUp className="h-5 w-5 text-slate-400" /> : <ChevronDown className="h-5 w-5 text-slate-400" />}
            </button>

            {showAdvanced && (
              <div className="space-y-3 pt-2">
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-extrabold uppercase text-slate-600 mb-1.5">SKU</label>
                    <div className="flex gap-2">
                      <input
                        value={form.sku}
                        onChange={(e) => setForm({ ...form, sku: e.target.value })}
                        placeholder="COMBO-CHAI-01"
                        className="h-11 flex-1 rounded-xl border-2 border-slate-200 px-3 text-sm font-mono font-bold focus:outline-none focus:border-violet-500"
                      />
                      <button
                        onClick={autoSku}
                        className="h-11 px-3 rounded-xl bg-violet-100 hover:bg-violet-200 text-violet-700 text-xs font-extrabold inline-flex items-center gap-1"
                      >
                        <Wand2 className="h-4 w-4" /> Auto
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-extrabold uppercase text-slate-600 mb-1.5">Barcode</label>
                    <input
                      value={form.barcode}
                      onChange={(e) => setForm({ ...form, barcode: e.target.value })}
                      placeholder="Optional"
                      className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-mono font-bold focus:outline-none focus:border-violet-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-extrabold uppercase text-slate-600 mb-1.5">Category</label>
                  <select
                    value={form.categoryId}
                    onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                    className="h-11 w-full rounded-xl border-2 border-slate-200 bg-white px-3 text-sm font-bold focus:outline-none focus:border-violet-500"
                  >
                    <option value="">Koi nahi</option>
                    {(categories as any[]).map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
                  </select>
                </div>

                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-extrabold uppercase text-slate-600 mb-1.5">Kab se</label>
                    <input
                      type="date"
                      value={form.validFrom}
                      onChange={(e) => setForm({ ...form, validFrom: e.target.value })}
                      className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-violet-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-extrabold uppercase text-slate-600 mb-1.5">Kab tak</label>
                    <input
                      type="date"
                      value={form.validTo}
                      onChange={(e) => setForm({ ...form, validTo: e.target.value })}
                      className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-violet-500"
                    />
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-extrabold uppercase text-slate-600 mb-1.5">Max per customer</label>
                    <input
                      type="number"
                      value={form.maxPurchasePerCustomer}
                      onChange={(e) => setForm({ ...form, maxPurchasePerCustomer: e.target.value })}
                      placeholder="Unlimited"
                      className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-violet-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-extrabold uppercase text-slate-600 mb-1.5">Stock available</label>
                    <input
                      type="number"
                      value={form.stockAvailable}
                      onChange={(e) => setForm({ ...form, stockAvailable: e.target.value })}
                      placeholder="Unlimited"
                      className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-violet-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-extrabold uppercase text-slate-600 mb-1.5">Status</label>
                  <div className="grid grid-cols-4 gap-2">
                    {(['ACTIVE', 'DRAFT', 'INACTIVE', 'EXPIRED'] as ComboStatus[]).map((s) => (
                      <button
                        key={s}
                        onClick={() => setForm({ ...form, status: s })}
                        className={[
                          'py-2.5 rounded-xl text-xs font-extrabold transition border-2',
                          form.status === s
                            ? 'bg-violet-600 text-white border-violet-600 shadow'
                            : 'bg-white border-slate-200 text-slate-700 hover:border-violet-300',
                        ].join(' ')}
                      >
                        {s.charAt(0) + s.slice(1).toLowerCase()}
                      </button>
                    ))}
                  </div>
                </div>

                <label className="flex items-center gap-3 p-3 rounded-2xl border-2 border-amber-200 bg-amber-50 cursor-pointer hover:border-amber-400">
                  <input
                    type="checkbox"
                    checked={form.isFeatured}
                    onChange={(e) => setForm({ ...form, isFeatured: e.target.checked })}
                    className="h-5 w-5 rounded"
                  />
                  <Star className={`h-4 w-4 ${form.isFeatured ? 'text-amber-500 fill-amber-500' : 'text-amber-400'}`} />
                  <div className="flex-1">
                    <div className="font-extrabold text-sm text-amber-900">Featured Combo</div>
                    <div className="text-xs text-amber-700 font-semibold">POS pe prominently show hoga</div>
                  </div>
                </label>

                <div>
                  <label className="block text-xs font-extrabold uppercase text-slate-600 mb-1.5">Image</label>
                  {form.imageUrl ? (
                    <div className="relative w-40 h-40 rounded-xl overflow-hidden border-2 border-slate-200">
                      <img src={form.imageUrl} alt="" className="w-full h-full object-cover" />
                      <button
                        onClick={() => setForm({ ...form, imageUrl: '' })}
                        className="absolute top-1 right-1 h-7 w-7 rounded-lg bg-rose-600 text-white flex items-center justify-center"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <UploadDropzone
                      maxFiles={1}
                      onUploaded={(records: any[]) => {
                        const first = Array.isArray(records) ? records[0] : records;
                        const url = typeof first === 'string' ? first : (first as any)?.url;
                        if (url) setForm({ ...form, imageUrl: url });
                      }}
                    />
                  )}
                </div>
              </div>
            )}
          </section>
        </div>

        {/* ═══ RIGHT — Live preview ═══ */}
        <aside className="flex flex-col gap-3 xl:sticky xl:top-4 xl:self-start">
          {/* Preview card */}
          <div className="rounded-3xl bg-white border-2 border-violet-300 shadow-lg overflow-hidden">
            <div className="px-4 py-2 border-b border-slate-100 bg-gradient-to-r from-violet-50 to-purple-50">
              <div className="text-[10px] uppercase tracking-wider font-extrabold text-violet-700 flex items-center gap-1">
                <Sparkles className="h-3 w-3" /> Live Preview
              </div>
            </div>

            <div className="aspect-video bg-gradient-to-br from-violet-500 via-purple-600 to-pink-600 relative overflow-hidden">
              {form.imageUrl ? (
                <img src={form.imageUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Sparkles className="h-16 w-16 text-white/40" />
                </div>
              )}
              {form.tagLine && (
                <div className="absolute top-2 left-2 px-2 py-1 rounded-md bg-white/95 text-[10px] font-extrabold text-violet-700 uppercase tracking-wider shadow">
                  {form.tagLine}
                </div>
              )}
              {form.isFeatured && (
                <div className="absolute top-2 right-2 h-8 w-8 rounded-lg bg-amber-500 text-white flex items-center justify-center shadow">
                  <Star className="h-4 w-4 fill-current" />
                </div>
              )}
              {savingsPercent > 0 && (
                <div className="absolute bottom-2 left-2 px-2.5 py-1 rounded-full bg-emerald-500 text-white text-xs font-extrabold shadow-lg">
                  SAVE {savingsPercent.toFixed(0)}%
                </div>
              )}
            </div>

            <div className="p-4">
              <h4 className="font-extrabold text-slate-900 text-base line-clamp-2 leading-tight">
                {form.name || 'Combo Ka Naam'}
              </h4>
              <div className="mt-1 text-xs text-slate-500 font-semibold">{items.length} items</div>
              <div className="mt-2 flex items-end justify-between">
                <div>
                  {originalTotal > form.comboPrice && originalTotal > 0 && (
                    <div className="text-xs text-slate-500 line-through font-bold">
                      {formatPKR(originalTotal)}
                    </div>
                  )}
                  <div className="text-2xl font-extrabold text-emerald-700 tabular-nums leading-none">
                    {formatPKR(form.comboPrice)}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Pricing summary */}
          <div className="rounded-3xl bg-gradient-to-br from-slate-950 to-emerald-900 text-white p-5 shadow-xl">
            <div className="text-[10px] uppercase tracking-wider font-extrabold text-emerald-300 mb-3">
              💰 Pricing Impact
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-white/70 font-semibold">Individual Total</span>
                <span className="font-bold tabular-nums">{formatPKR(originalTotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-emerald-300 font-semibold">Combo Price</span>
                <span className="font-extrabold text-emerald-300 tabular-nums text-lg">{formatPKR(form.comboPrice)}</span>
              </div>
              <div className="pt-2 border-t border-white/20 flex justify-between">
                <span className="text-amber-300 font-extrabold flex items-center gap-1">
                  <Percent className="h-3 w-3" /> Customer Ki Bachat
                </span>
                <div className="text-right">
                  <div className="font-extrabold text-amber-300 tabular-nums">{formatPKR(savings)}</div>
                  <div className="text-[10px] font-extrabold text-amber-300">({savingsPercent.toFixed(1)}%)</div>
                </div>
              </div>
            </div>
            {isLoss && (
              <div className="mt-3 p-2 rounded-lg bg-rose-500/30 border border-rose-300/40 text-xs font-bold text-rose-100 flex items-center gap-1">
                <AlertTriangle className="h-3.5 w-3.5" /> Combo price individual total se zyada — koi bachat nahi
              </div>
            )}
          </div>

          {/* Checklist */}
          <div className="rounded-2xl bg-slate-50 border-2 border-slate-200 p-3 space-y-1.5">
            <div className="text-[10px] uppercase tracking-wider font-extrabold text-slate-600 flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" /> Checklist
            </div>
            <Chk done={!!form.name.trim()} label="Combo ka naam" />
            <Chk done={items.length >= 2} label={`Kam se kam 2 items (${items.length}/2)`} />
            <Chk done={form.comboPrice > 0} label="Combo price" />
            <Chk done={savings > 0} label="Individual se sasta" />
          </div>
        </aside>
      </div>

      {/* Sticky footer */}
      <div className="fixed bottom-0 left-0 right-0 z-30 border-t-2 border-slate-200 bg-white/95 backdrop-blur px-4 py-3 lg:pl-[300px]">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
          <Button variant="secondary" onClick={() => navigate('/retail/combos')}>Cancel</Button>
          <div className="text-xs font-extrabold text-slate-500 hidden sm:block">
            {isEdit ? 'Editing combo' : 'Naya combo bana rahe hain'}
          </div>
          <Button
            className="bg-gradient-to-r from-violet-600 to-purple-700"
            onClick={() => saveMutation.mutate()}
            loading={saveMutation.isPending}
            disabled={!canSave}
          >
            <Save className="h-4 w-4" />
            {isEdit ? 'Update Karo' : 'Combo Banao'}
          </Button>
        </div>
      </div>
    </div>
  );
}

function Head({ n, icon: Icon, title, desc, tone }: any) {
  const tones: Record<string, string> = {
    violet: 'from-violet-500 to-purple-700',
    blue: 'from-blue-500 to-blue-700',
    emerald: 'from-emerald-500 to-teal-700',
    slate: 'from-slate-500 to-slate-700',
  };
  return (
    <div className="flex items-center gap-3">
      <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${tones[tone]} text-white flex items-center justify-center shadow-md shrink-0`}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <h3 className="font-extrabold text-slate-900 text-base leading-tight">
          <span className="text-slate-400">{n}.</span> {title}
        </h3>
        <p className="text-xs text-slate-500 font-semibold">{desc}</p>
      </div>
    </div>
  );
}

function Chk({ done, label }: { done: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <div className={[
        'h-4 w-4 rounded-md flex items-center justify-center shrink-0',
        done ? 'bg-emerald-500 text-white' : 'bg-white border-2 border-slate-300',
      ].join(' ')}>
        {done && <CheckCircle2 className="h-3 w-3" />}
      </div>
      <span className={['font-bold', done ? 'text-emerald-800 line-through' : 'text-slate-600'].join(' ')}>{label}</span>
    </div>
  );
}
