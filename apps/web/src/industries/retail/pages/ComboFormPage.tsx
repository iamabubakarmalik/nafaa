import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Save, X, Plus, Trash2, Search, Package, Sparkles,
  Tag, Calendar, Star, Upload, Info, Percent,
} from 'lucide-react';
import { combosApi, type ComboStatus, type ComboItem } from '../api/combos.api';
import { productsApi } from '@modules/inventory/products/api/products.api';
import { categoriesApi } from '@modules/inventory/categories/api/categories.api';
import { formatPKR } from '@core/lib/format';
import { Button } from '@core/ui/Button';
import { UploadDropzone } from '@core/components/uploads';
import { toast } from 'sonner';

export default function ComboFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEdit = !!id;

  const [form, setForm] = useState({
    name: '',
    description: '',
    sku: '',
    barcode: '',
    imageUrl: '',
    categoryId: '',
    comboPrice: 0,
    status: 'ACTIVE' as ComboStatus,
    validFrom: '',
    validTo: '',
    maxPurchasePerCustomer: '' as any,
    stockAvailable: '' as any,
    isFeatured: false,
    tagLine: '',
  });

  const [items, setItems] = useState<ComboItem[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [showProductSearch, setShowProductSearch] = useState(false);

  // Load existing combo for edit
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

  // Products search
  const { data: productsData } = useQuery({
    queryKey: ['products-for-combo', productSearch],
    queryFn: () => productsApi.list({ page: 1, limit: 30, search: productSearch || undefined }),
    enabled: showProductSearch,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: categoriesApi.list,
  });

  // Calculate savings preview
  const originalTotal = items.reduce((sum, item) => {
    const price = item.originalPrice ?? item.product?.price ?? 0;
    return sum + price * item.quantity;
  }, 0);
  const savings = Math.max(originalTotal - form.comboPrice, 0);
  const savingsPercent = originalTotal > 0 ? (savings / originalTotal) * 100 : 0;

  // Mutations
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
      return isEdit ? combosApi.update(id!, payload) : combosApi.create(payload);
    },
    onSuccess: () => {
      toast.success(isEdit ? 'Combo updated' : 'Combo created!');
      queryClient.invalidateQueries({ queryKey: ['retail-combos'] });
      queryClient.invalidateQueries({ queryKey: ['combo', id] });
      navigate('/retail/combos');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Save failed'),
  });

  const addProductToItems = (product: any) => {
    const existing = items.find((i) => i.productId === product.id && !i.variantId);
    if (existing) {
      setItems(items.map((i) =>
        i.productId === product.id && !i.variantId
          ? { ...i, quantity: i.quantity + 1 }
          : i
      ));
    } else {
      setItems([...items, {
        productId: product.id,
        quantity: 1,
        unitName: product.unit,
        originalPrice: product.price,
        product,
      }]);
    }
    setProductSearch('');
    setShowProductSearch(false);
  };

  const updateItem = (index: number, patch: Partial<ComboItem>) => {
    setItems(items.map((it, i) => i === index ? { ...it, ...patch } : it));
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const canSave = form.name.trim() && form.comboPrice > 0 && items.length >= 2;

  if (isEdit && loadingCombo) {
    return (
      <div className="grid gap-4">
        <div className="h-32 rounded-3xl bg-slate-100 dark:bg-neutral-800 animate-pulse" />
        <div className="h-64 rounded-3xl bg-slate-100 dark:bg-neutral-800 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* HERO */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-violet-900 to-purple-700 text-white p-6 sm:p-8 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-violet-400/20 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-pink-400/15 blur-3xl" />

        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div className="flex items-start gap-3">
            <button
              onClick={() => navigate('/retail/combos')}
              className="h-11 w-11 rounded-2xl bg-white/15 hover:bg-white/25 backdrop-blur flex items-center justify-center transition border border-white/20"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
                <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                {isEdit ? 'Edit Combo' : 'New Combo'}
              </div>
              <h1 className="mt-2 text-3xl sm:text-4xl font-extrabold leading-tight">
                🎁 {isEdit ? form.name || 'Combo' : 'Naya Combo'}
              </h1>
              <p className="mt-1 text-sm text-white/80 font-semibold">
                Bundle products together — customers save, aap ki volume badhe
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="secondary" onClick={() => navigate('/retail/combos')}>
              Cancel
            </Button>
            <Button
              className="bg-white text-slate-900 hover:bg-slate-100"
              onClick={() => saveMutation.mutate()}
              loading={saveMutation.isPending}
              disabled={!canSave}
            >
              <Save className="h-4 w-4" />
              {isEdit ? 'Update Combo' : 'Create Combo'}
            </Button>
          </div>
        </div>
      </section>

      <div className="grid lg:grid-cols-[1fr_400px] gap-6">
        {/* LEFT — Main form */}
        <div className="space-y-6">
          {/* BASIC INFO */}
          <section className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm p-6 space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Info className="h-4 w-4 text-violet-600" />
              <h3 className="font-extrabold text-slate-900 dark:text-white">Basic Information</h3>
            </div>

            <div>
              <label className="text-[10px] uppercase tracking-wider font-extrabold text-slate-600 dark:text-slate-400 mb-1 block">
                Combo Name *
              </label>
              <input
                autoFocus
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Chai Combo (Cheeni + Patti + Rusk)"
                className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-violet-500"
              />
            </div>

            <div>
              <label className="text-[10px] uppercase tracking-wider font-extrabold text-slate-600 dark:text-slate-400 mb-1 block">
                Description
              </label>
              <textarea
                rows={2}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Combo ki details..."
                className="w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-violet-500 resize-none"
              />
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] uppercase tracking-wider font-extrabold text-slate-600 dark:text-slate-400 mb-1 block">
                  SKU
                </label>
                <input
                  value={form.sku}
                  onChange={(e) => setForm({ ...form, sku: e.target.value })}
                  placeholder="COMBO-CHAI-01"
                  className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-mono font-bold focus:outline-none focus:border-violet-500"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wider font-extrabold text-slate-600 dark:text-slate-400 mb-1 block">
                  Barcode
                </label>
                <input
                  value={form.barcode}
                  onChange={(e) => setForm({ ...form, barcode: e.target.value })}
                  placeholder="8901234567890"
                  className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-mono font-bold focus:outline-none focus:border-violet-500"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] uppercase tracking-wider font-extrabold text-slate-600 dark:text-slate-400 mb-1 block">
                Category
              </label>
              <select
                value={form.categoryId}
                onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-violet-500"
              >
                <option value="">— Select category —</option>
                {categories.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] uppercase tracking-wider font-extrabold text-slate-600 dark:text-slate-400 mb-1 block">
                Combo Image
              </label>
              {form.imageUrl ? (
                <div className="relative w-40 h-40 rounded-xl overflow-hidden border-2 border-slate-200 dark:border-neutral-700">
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
                  onUploaded={(records) => {
                    const first = Array.isArray(records) ? records[0] : records;
                    const url = typeof first === 'string' ? first : (first as any)?.url;
                    if (url) setForm({ ...form, imageUrl: url });
                  }}
                />
              )}
            </div>
          </section>

          {/* PRICING */}
          <section className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Tag className="h-4 w-4 text-emerald-600" />
              <h3 className="font-extrabold text-slate-900 dark:text-white">Pricing</h3>
            </div>

            <div>
              <label className="text-[10px] uppercase tracking-wider font-extrabold text-emerald-700 mb-1 block">
                Combo Price (Rs) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.comboPrice || ''}
                onChange={(e) => setForm({ ...form, comboPrice: Number(e.target.value) })}
                placeholder="0"
                className="h-14 w-full rounded-xl border-2 border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/30 px-4 text-2xl font-extrabold tabular-nums focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
              />
              <p className="mt-1 text-xs text-slate-500 font-semibold">
                Individual products ke total se kam rakho — customer bachat dekhega
              </p>
            </div>

            <div>
              <label className="text-[10px] uppercase tracking-wider font-extrabold text-slate-600 dark:text-slate-400 mb-1 block">
                Marketing Tag Line
              </label>
              <input
                value={form.tagLine}
                onChange={(e) => setForm({ ...form, tagLine: e.target.value })}
                placeholder="Best Deal! / Limited Time / Ramzan Special"
                className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-violet-500"
              />
            </div>
          </section>

          {/* ITEMS */}
          <section className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-blue-600" />
                <h3 className="font-extrabold text-slate-900 dark:text-white">Combo Items</h3>
                <span className="px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 text-[10px] font-extrabold">
                  {items.length}
                </span>
              </div>
              <Button
                onClick={() => setShowProductSearch(true)}
                className="bg-gradient-to-r from-blue-600 to-blue-700"
                size="sm"
              >
                <Plus className="h-4 w-4" />
                Add Product
              </Button>
            </div>

            {showProductSearch && (
              <div className="rounded-2xl border-2 border-blue-300 dark:border-blue-700 bg-blue-50/50 dark:bg-blue-950/20 p-3">
                <div className="flex gap-2 mb-2">
                  <div className="relative flex-1">
                    <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      autoFocus
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      placeholder="Search products..."
                      className="h-10 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 pl-10 pr-3 text-sm font-semibold focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <button
                    onClick={() => { setShowProductSearch(false); setProductSearch(''); }}
                    className="h-10 w-10 rounded-xl bg-white dark:bg-neutral-800 hover:bg-slate-100 flex items-center justify-center"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="max-h-64 overflow-y-auto space-y-1">
                  {(productsData?.items ?? []).map((p) => (
                    <button
                      key={p.id}
                      onClick={() => addProductToItems(p)}
                      className="w-full px-3 py-2 flex items-center gap-3 rounded-lg hover:bg-white dark:hover:bg-neutral-800 transition text-left"
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
                          {formatPKR(p.price)} • Stock: {p.stock} {p.unit}
                        </div>
                      </div>
                      <Plus className="h-4 w-4 text-blue-600" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {items.length === 0 ? (
              <div className="rounded-2xl border-2 border-dashed border-slate-200 dark:border-neutral-700 p-8 text-center">
                <Package className="h-12 w-12 text-slate-400 mx-auto mb-2" />
                <p className="font-extrabold text-slate-700 dark:text-slate-300">No items yet</p>
                <p className="text-xs text-slate-500 font-semibold mt-1">
                  Kam se kam 2 products add karo combo banane ke liye
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {items.map((item, i) => (
                  <div key={i} className="rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 p-3 flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-slate-100 dark:bg-neutral-800 overflow-hidden flex items-center justify-center shrink-0">
                      {item.product?.images?.[0]?.url ? (
                        <img src={item.product.images[0].url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <Package className="h-5 w-5 text-slate-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-extrabold text-sm truncate text-slate-900 dark:text-white">
                        {item.product?.name || 'Product'}
                      </div>
                      <div className="text-xs text-slate-500 font-semibold">
                        Individual: {formatPKR(item.originalPrice ?? item.product?.price ?? 0)}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <label className="text-[10px] font-extrabold text-slate-600">QTY</label>
                      <div className="inline-flex items-center bg-slate-100 dark:bg-neutral-700 rounded-lg overflow-hidden">
                        <button
                          onClick={() => updateItem(i, { quantity: Math.max(0.01, item.quantity - 1) })}
                          className="h-8 w-8 hover:bg-slate-200 font-extrabold text-slate-700"
                        >
                          −
                        </button>
                        <input
                          type="number"
                          step="0.01"
                          value={item.quantity}
                          onChange={(e) => updateItem(i, { quantity: Number(e.target.value) })}
                          className="h-8 w-16 text-center bg-transparent border-0 font-extrabold text-sm focus:outline-none"
                        />
                        <button
                          onClick={() => updateItem(i, { quantity: item.quantity + 1 })}
                          className="h-8 w-8 hover:bg-slate-200 font-extrabold text-slate-700"
                        >
                          +
                        </button>
                      </div>
                    </div>
                    <button
                      onClick={() => removeItem(i)}
                      className="h-9 w-9 rounded-lg bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 text-rose-600 flex items-center justify-center shrink-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* ADVANCED */}
          <section className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-amber-600" />
              <h3 className="font-extrabold text-slate-900 dark:text-white">Availability & Limits</h3>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] uppercase tracking-wider font-extrabold text-slate-600 mb-1 block">Valid From</label>
                <input
                  type="date"
                  value={form.validFrom}
                  onChange={(e) => setForm({ ...form, validFrom: e.target.value })}
                  className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-violet-500"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wider font-extrabold text-slate-600 mb-1 block">Valid To</label>
                <input
                  type="date"
                  value={form.validTo}
                  onChange={(e) => setForm({ ...form, validTo: e.target.value })}
                  className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-violet-500"
                />
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] uppercase tracking-wider font-extrabold text-slate-600 mb-1 block">Max per Customer</label>
                <input
                  type="number"
                  value={form.maxPurchasePerCustomer}
                  onChange={(e) => setForm({ ...form, maxPurchasePerCustomer: e.target.value })}
                  placeholder="Unlimited"
                  className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-violet-500"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wider font-extrabold text-slate-600 mb-1 block">Stock Available</label>
                <input
                  type="number"
                  value={form.stockAvailable}
                  onChange={(e) => setForm({ ...form, stockAvailable: e.target.value })}
                  placeholder="Unlimited"
                  className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-violet-500"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] uppercase tracking-wider font-extrabold text-slate-600 mb-1 block">Status</label>
              <div className="grid grid-cols-4 gap-2">
                {(['ACTIVE', 'INACTIVE', 'DRAFT', 'EXPIRED'] as ComboStatus[]).map((s) => (
                  <button
                    key={s}
                    onClick={() => setForm({ ...form, status: s })}
                    className={
                      'py-2 rounded-xl text-xs font-extrabold transition border-2 ' +
                      (form.status === s
                        ? 'bg-violet-600 text-white border-violet-600 shadow'
                        : 'bg-white dark:bg-neutral-800 border-slate-200 dark:border-neutral-700 text-slate-700 dark:text-slate-300 hover:border-violet-300')
                    }
                  >
                    {s.charAt(0) + s.slice(1).toLowerCase()}
                  </button>
                ))}
              </div>
            </div>

            <label className="flex items-center gap-3 p-3 rounded-xl border-2 border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 cursor-pointer hover:border-amber-400">
              <input
                type="checkbox"
                checked={form.isFeatured}
                onChange={(e) => setForm({ ...form, isFeatured: e.target.checked })}
                className="h-5 w-5 rounded"
              />
              <Star className={'h-4 w-4 ' + (form.isFeatured ? 'text-amber-500 fill-amber-500' : 'text-amber-400')} />
              <div className="flex-1">
                <div className="font-extrabold text-sm text-amber-900 dark:text-amber-300">Featured Combo</div>
                <div className="text-xs text-amber-700 dark:text-amber-400 font-semibold">Featured combos POS pe prominently show honge</div>
              </div>
            </label>
          </section>
        </div>

        {/* RIGHT — Live preview */}
        <aside className="space-y-4">
          <div className="sticky top-4 space-y-4">
            {/* PRICING SUMMARY */}
            <section className="rounded-3xl bg-gradient-to-br from-slate-950 to-emerald-900 text-white p-5 shadow-xl">
              <div className="text-[10px] uppercase tracking-wider font-extrabold text-white/70 mb-3">
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
                  <span className="text-amber-300 font-extrabold inline-flex items-center gap-1">
                    <Percent className="h-3 w-3" />
                    Customer Saves
                  </span>
                  <div className="text-right">
                    <div className="font-extrabold text-amber-300 tabular-nums">{formatPKR(savings)}</div>
                    <div className="text-[10px] font-extrabold text-amber-300">
                      ({savingsPercent.toFixed(1)}%)
                    </div>
                  </div>
                </div>
              </div>

              {savings <= 0 && form.comboPrice > 0 && originalTotal > 0 && (
                <div className="mt-3 p-2 rounded-lg bg-rose-500/30 border border-rose-300/40 text-xs font-bold text-rose-100">
                  ⚠️ Combo price individual total se zyada — no savings for customer
                </div>
              )}
            </section>

            {/* CARD PREVIEW */}
            <section className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-violet-300 dark:border-violet-800 shadow-lg overflow-hidden">
              <div className="px-4 py-2 border-b border-slate-100 dark:border-neutral-800 bg-slate-50 dark:bg-neutral-800/50">
                <div className="text-[10px] uppercase tracking-wider font-extrabold text-slate-500 dark:text-slate-400">
                  Live Preview
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
                  <div className="absolute top-2 left-2 px-2 py-1 rounded-md bg-white/90 backdrop-blur text-[10px] font-extrabold text-violet-700 uppercase tracking-wider shadow">
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

              <div className="p-3">
                <h4 className="font-extrabold text-slate-900 dark:text-white text-base line-clamp-2 leading-tight">
                  {form.name || 'Combo Name'}
                </h4>
                <div className="mt-2 text-xs text-slate-500 font-semibold">
                  {items.length} items
                </div>
                <div className="mt-2 flex items-end justify-between">
                  <div>
                    {originalTotal > form.comboPrice && (
                      <div className="text-xs text-slate-500 line-through font-bold">
                        {formatPKR(originalTotal)}
                      </div>
                    )}
                    <div className="text-xl font-extrabold text-emerald-700 dark:text-emerald-400 tabular-nums leading-none">
                      {formatPKR(form.comboPrice)}
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </aside>
      </div>
    </div>
  );
}
