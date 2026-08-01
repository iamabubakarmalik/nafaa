import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Save, X, Plus, Trash2, Search, Package, Sparkles, Percent, CheckCircle2, AlertTriangle, TrendingUp, Layers, Image as ImageIcon, Star } from 'lucide-react';
import { toast } from 'sonner';
import { electronicsBundlesApi } from '../api/bundles.api';
import { productsApi } from '@modules/inventory/products/api/products.api';
import { formatPKR, formatPKRFull } from '@core/lib/format';
import { Button } from '@core/ui/Button';
import { UploadDropzone } from '@core/components/uploads';

const DISCOUNT_QUICK = [5, 10, 15, 20, 25];

export default function BundleFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const isEdit = !!id;

  const [form, setForm] = useState({
    name: '',
    description: '',
    imageUrl: '',
    bundlePrice: 0,
    isFeatured: false,
    isActive: true,
    validFrom: '',
    validUntil: '',
  });
  const [items, setItems] = useState<Array<{ productId: string; quantity: number; unitPrice: number; product?: any }>>([]);
  const [productSearch, setProductSearch] = useState('');
  const [showProductSearch, setShowProductSearch] = useState(false);

  const { data: existing, isLoading: loadingBundle } = useQuery({
    queryKey: ['electronics-bundle', id],
    queryFn: () => electronicsBundlesApi.getOne(id!),
    enabled: isEdit,
  });

  useEffect(() => {
    if (existing) {
      setForm({
        name: existing.name,
        description: existing.description || '',
        imageUrl: existing.imageUrl || '',
        bundlePrice: existing.bundlePrice,
        isFeatured: existing.isFeatured,
        isActive: existing.isActive,
        validFrom: existing.validFrom ? existing.validFrom.slice(0, 10) : '',
        validUntil: existing.validUntil ? existing.validUntil.slice(0, 10) : '',
      });
      setItems(existing.items || []);
    }
  }, [existing]);

  const { data: productsData } = useQuery({
    queryKey: ['products-for-bundle', productSearch],
    queryFn: () => productsApi.list({ page: 1, limit: 30, search: productSearch || undefined } as any),
    enabled: showProductSearch,
  });

  const originalTotal = useMemo(() =>
    items.reduce((sum, it) => sum + it.unitPrice * it.quantity, 0),
    [items]);
  const savings = Math.max(originalTotal - form.bundlePrice, 0);
  const savingsPct = originalTotal > 0 ? (savings / originalTotal) * 100 : 0;
  const isLoss = form.bundlePrice > originalTotal && originalTotal > 0;

  const save = useMutation({
    mutationFn: () => {
      const payload: any = {
        name: form.name,
        description: form.description || undefined,
        imageUrl: form.imageUrl || undefined,
        bundlePrice: form.bundlePrice,
        originalPrice: originalTotal,
        savings,
        savingsPct,
        isFeatured: form.isFeatured,
        isActive: form.isActive,
        validFrom: form.validFrom || undefined,
        validUntil: form.validUntil || undefined,
        items: items.map((it) => ({
          productId: it.productId,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
        })),
      };
      return isEdit ? electronicsBundlesApi.update(id!, payload) : electronicsBundlesApi.create(payload);
    },
    onSuccess: () => {
      toast.success(isEdit ? 'Bundle updated' : 'Bundle created');
      qc.invalidateQueries({ queryKey: ['electronics-bundles-list'] });
      navigate('/electronics/bundles');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Save failed'),
  });

  const addProduct = (product: any) => {
    const existing = items.find((i) => i.productId === product.id);
    if (existing) {
      setItems(items.map((i) => i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i));
    } else {
      setItems([...items, { productId: product.id, quantity: 1, unitPrice: product.price, product }]);
    }
    setProductSearch('');
  };

  const updateItem = (i: number, patch: any) => {
    setItems(items.map((it, idx) => idx === i ? { ...it, ...patch } : it));
  };

  const removeItem = (i: number) => setItems(items.filter((_, idx) => idx !== i));

  const applyDiscount = (pct: number) => {
    if (originalTotal === 0) return toast.error('Add items first');
    setForm({ ...form, bundlePrice: Math.round(originalTotal * (1 - pct / 100)) });
  };

  const canSave = form.name.trim() && form.bundlePrice > 0 && items.length >= 2;

  if (isEdit && loadingBundle) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-12 w-12 rounded-full border-4 border-pink-200 border-t-pink-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-24">
      {/* HERO */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-pink-900 to-rose-700 text-white p-6 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-pink-400/20 blur-3xl" />
        <div className="relative flex items-start gap-4 flex-wrap">
          <button onClick={() => navigate('/electronics/bundles')}
            className="h-11 w-11 rounded-2xl bg-white/15 hover:bg-white/25 backdrop-blur flex items-center justify-center border border-white/20">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
              {isEdit ? 'Edit Bundle' : 'New Bundle'}
            </div>
            <h1 className="mt-2 text-3xl sm:text-4xl font-extrabold leading-tight">
              🎁 {isEdit ? form.name || 'Bundle' : 'Create Bundle Deal'}
            </h1>
            <p className="mt-1 text-sm text-white/80 font-semibold">
              2+ products bundle karo, customer bachat de, aap ka volume badhega
            </p>
          </div>
        </div>
      </section>

      <div className="grid xl:grid-cols-[1fr_400px] gap-5 items-start">
        <div className="space-y-5 min-w-0">
          {/* Name */}
          <section className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm p-5 space-y-4">
            <SectionHead n="1" icon={Package} title="Bundle Name" desc="Customer ye dekhega" tone="pink" />
            <input autoFocus value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. iPhone + Case + Charger Combo"
              className="h-14 w-full rounded-2xl border-2 border-slate-200 px-4 text-lg font-extrabold focus:outline-none focus:border-pink-500 focus:ring-4 focus:ring-pink-200" />
            <div>
              <label className="block text-xs font-extrabold uppercase text-slate-600 mb-1.5">Description (optional)</label>
              <textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="What makes this bundle special..."
                className="w-full rounded-xl border-2 border-slate-200 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-pink-500" />
            </div>
          </section>

          {/* Items */}
          <section className="rounded-3xl bg-white border-2 border-blue-300 shadow-sm p-5 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <SectionHead n="2" icon={Package} title="Bundle Items" desc="Kam se kam 2 products" tone="blue" />
              <span className={['px-3 py-1.5 rounded-full text-xs font-extrabold',
                items.length >= 2 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'].join(' ')}>
                {items.length} items {items.length >= 2 ? '✓' : `(${2 - items.length} more needed)`}
              </span>
            </div>

            <div className="rounded-2xl border-2 border-blue-200 bg-blue-50/50 p-3 space-y-2">
              <div className="relative">
                <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input value={productSearch}
                  onChange={(e) => { setProductSearch(e.target.value); setShowProductSearch(true); }}
                  onFocus={() => setShowProductSearch(true)}
                  placeholder="Search product to add..."
                  className="h-11 w-full rounded-xl border-2 border-slate-200 bg-white pl-10 pr-3 text-sm font-semibold focus:outline-none focus:border-blue-500" />
              </div>
              {showProductSearch && productSearch && (
                <div className="max-h-64 overflow-y-auto space-y-1 border-t border-blue-200 pt-2">
                  {((productsData as any)?.items ?? []).map((p: any) => (
                    <button key={p.id} onClick={() => addProduct(p)}
                      className="w-full px-3 py-2 flex items-center gap-3 rounded-lg bg-white hover:bg-blue-50 border-2 border-transparent hover:border-blue-200 transition text-left">
                      <div className="h-10 w-10 rounded-lg bg-slate-100 overflow-hidden shrink-0">
                        {p.images?.[0]?.url ? <img src={p.images[0].url} alt="" className="w-full h-full object-cover" /> : <Package className="h-full w-full p-2 text-slate-400" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-extrabold text-sm truncate">{p.name}</div>
                        <div className="text-xs text-slate-500 font-semibold">{formatPKR(p.price)}</div>
                      </div>
                      <Plus className="h-4 w-4 text-blue-600" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {items.length === 0 ? (
              <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                <Package className="h-12 w-12 text-slate-400 mx-auto mb-2" />
                <p className="font-extrabold text-slate-700">No items yet</p>
                <p className="text-xs text-slate-500 font-semibold mt-1">Search above to add products</p>
              </div>
            ) : (
              <div className="space-y-2">
                {items.map((item, i) => (
                  <div key={i} className="rounded-xl border-2 border-slate-200 bg-white p-3 flex items-center gap-3">
                    <div className="h-11 w-11 rounded-xl bg-slate-100 overflow-hidden shrink-0">
                      {item.product?.images?.[0]?.url ? (
                        <img src={item.product.images[0].url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <Package className="h-full w-full p-2 text-slate-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-extrabold text-sm truncate">{item.product?.name || 'Product'}</div>
                      <div className="text-xs text-slate-500 font-bold">{formatPKR(item.unitPrice)}</div>
                    </div>
                    <div className="inline-flex items-center bg-slate-100 rounded-lg overflow-hidden shrink-0">
                      <button onClick={() => updateItem(i, { quantity: Math.max(1, item.quantity - 1) })}
                        className="h-9 w-9 hover:bg-slate-200 font-extrabold">−</button>
                      <input type="number" value={item.quantity}
                        onChange={(e) => updateItem(i, { quantity: Math.max(1, Number(e.target.value)) })}
                        className="h-9 w-14 text-center bg-transparent border-0 font-extrabold text-sm focus:outline-none tabular-nums" />
                      <button onClick={() => updateItem(i, { quantity: item.quantity + 1 })}
                        className="h-9 w-9 bg-blue-600 text-white hover:bg-blue-700 font-extrabold">+</button>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-xs font-bold text-slate-500">Total</div>
                      <div className="font-extrabold text-emerald-700 tabular-nums text-sm">
                        {formatPKR(item.unitPrice * item.quantity)}
                      </div>
                    </div>
                    <button onClick={() => removeItem(i)}
                      className="h-9 w-9 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Pricing */}
          <section className="rounded-3xl bg-white border-2 border-emerald-300 shadow-sm p-5 space-y-4">
            <SectionHead n="3" icon={TrendingUp} title="Bundle Price" desc="Individual total se kam" tone="emerald" />

            <div>
              <label className="block text-xs font-extrabold uppercase text-emerald-700 mb-1.5">Bundle Price *</label>
              <input type="number" step="0.01" value={form.bundlePrice}
                onChange={(e) => setForm({ ...form, bundlePrice: Number(e.target.value) })}
                placeholder="0"
                className="h-16 w-full rounded-2xl border-2 border-emerald-400 bg-emerald-50 px-4 text-3xl font-extrabold tabular-nums text-emerald-900 focus:outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-200" />
            </div>

            {originalTotal > 0 && (
              <>
                <div>
                  <div className="text-[10px] uppercase tracking-wider font-extrabold text-slate-600 mb-1.5">Quick discount</div>
                  <div className="flex flex-wrap gap-1.5">
                    {DISCOUNT_QUICK.map((d) => (
                      <button key={d} onClick={() => applyDiscount(d)}
                        className="px-3 py-2 rounded-xl bg-white border-2 border-emerald-200 hover:border-emerald-400 text-emerald-800 text-xs font-extrabold">
                        -{d}% <span className="text-slate-500 font-bold">= {formatPKRFull(Math.round(originalTotal * (1 - d / 100)))}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className={['rounded-2xl border-2 p-4',
                  isLoss ? 'bg-rose-50 border-rose-300' : savingsPct >= 10 ? 'bg-emerald-50 border-emerald-300' : 'bg-amber-50 border-amber-300'].join(' ')}>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className={['text-[10px] uppercase tracking-wider font-extrabold',
                        isLoss ? 'text-rose-700' : savingsPct >= 10 ? 'text-emerald-700' : 'text-amber-700'].join(' ')}>
                        {isLoss ? '⚠️ Loss!' : 'Customer Savings'}
                      </div>
                      <div className={['text-2xl font-extrabold tabular-nums', isLoss ? 'text-rose-900' : 'text-slate-900'].join(' ')}>
                        {formatPKRFull(savings)}
                      </div>
                    </div>
                    <div className={['text-3xl font-extrabold tabular-nums',
                      isLoss ? 'text-rose-700' : savingsPct >= 10 ? 'text-emerald-700' : 'text-amber-700'].join(' ')}>
                      {savingsPct.toFixed(1)}%
                    </div>
                  </div>
                </div>
              </>
            )}
          </section>

          {/* Extras */}
          <section className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm p-5 space-y-4">
            <SectionHead n="4" icon={Sparkles} title="Extra Settings" desc="Dates, image, flags" tone="slate" />

            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-extrabold uppercase text-slate-600 mb-1.5">Valid From</label>
                <input type="date" value={form.validFrom} onChange={(e) => setForm({ ...form, validFrom: e.target.value })}
                  className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-pink-500" />
              </div>
              <div>
                <label className="block text-xs font-extrabold uppercase text-slate-600 mb-1.5">Valid Until</label>
                <input type="date" value={form.validUntil} onChange={(e) => setForm({ ...form, validUntil: e.target.value })}
                  className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-pink-500" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-extrabold uppercase text-slate-600 mb-1.5">Image</label>
              {form.imageUrl ? (
                <div className="relative w-40 h-40 rounded-xl overflow-hidden border-2 border-slate-200">
                  <img src={form.imageUrl} alt="" className="w-full h-full object-cover" />
                  <button onClick={() => setForm({ ...form, imageUrl: '' })}
                    className="absolute top-1 right-1 h-7 w-7 rounded-lg bg-rose-600 text-white flex items-center justify-center">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <UploadDropzone purpose="bundle-image" maxFiles={1}
                  onUploaded={(recs: any[]) => {
                    const first = Array.isArray(recs) ? recs[0] : recs;
                    const url = typeof first === 'string' ? first : (first as any)?.url;
                    if (url) setForm({ ...form, imageUrl: url });
                  }} />
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <label className="flex items-center gap-2 p-3 rounded-xl border-2 border-amber-200 bg-amber-50 cursor-pointer">
                <input type="checkbox" checked={form.isFeatured}
                  onChange={(e) => setForm({ ...form, isFeatured: e.target.checked })}
                  className="h-4 w-4 rounded" />
                <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                <span className="text-xs font-extrabold text-amber-900">Featured</span>
              </label>
              <label className="flex items-center gap-2 p-3 rounded-xl border-2 border-slate-200 cursor-pointer">
                <input type="checkbox" checked={form.isActive}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                  className="h-4 w-4 rounded" />
                <span className="text-xs font-extrabold text-slate-700">Active</span>
              </label>
            </div>
          </section>
        </div>

        {/* PREVIEW */}
        <aside className="flex flex-col gap-3 xl:sticky xl:top-4 xl:self-start">
          <div className="rounded-3xl bg-white border-2 border-pink-300 shadow-lg overflow-hidden">
            <div className="px-4 py-2 border-b border-slate-100 bg-gradient-to-r from-pink-50 to-rose-50">
              <div className="text-[10px] uppercase tracking-wider font-extrabold text-pink-700 flex items-center gap-1">
                <Sparkles className="h-3 w-3" /> Live Preview
              </div>
            </div>
            <div className="aspect-video bg-gradient-to-br from-pink-500 via-rose-600 to-red-600 relative overflow-hidden">
              {form.imageUrl ? (
                <img src={form.imageUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Layers className="h-16 w-16 text-white/40" />
                </div>
              )}
              {form.isFeatured && (
                <div className="absolute top-2 right-2 h-8 w-8 rounded-lg bg-amber-500 text-white flex items-center justify-center shadow">
                  <Star className="h-4 w-4 fill-current" />
                </div>
              )}
              {savingsPct > 0 && (
                <div className="absolute bottom-2 left-2 px-2.5 py-1 rounded-full bg-emerald-500 text-white text-xs font-extrabold shadow-lg">
                  SAVE {savingsPct.toFixed(0)}%
                </div>
              )}
            </div>
            <div className="p-4">
              <h4 className="font-extrabold text-slate-900 text-base line-clamp-2 leading-tight">
                {form.name || 'Bundle Name'}
              </h4>
              <div className="mt-1 text-xs text-slate-500 font-semibold">{items.length} items</div>
              <div className="mt-2 flex items-end justify-between">
                <div>
                  {originalTotal > form.bundlePrice && originalTotal > 0 && (
                    <div className="text-xs text-slate-500 line-through font-bold">{formatPKR(originalTotal)}</div>
                  )}
                  <div className="text-2xl font-extrabold text-emerald-700 tabular-nums leading-none">
                    {formatPKR(form.bundlePrice)}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Checklist */}
          <div className="rounded-2xl bg-slate-50 border-2 border-slate-200 p-3 space-y-1.5">
            <div className="text-[10px] uppercase tracking-wider font-extrabold text-slate-600 flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" /> Checklist
            </div>
            <Chk done={!!form.name.trim()} label="Bundle name" />
            <Chk done={items.length >= 2} label={`Min 2 items (${items.length}/2)`} />
            <Chk done={form.bundlePrice > 0} label="Bundle price" />
            <Chk done={savings > 0} label="Cheaper than individual" />
          </div>
        </aside>
      </div>

      {/* Sticky Footer */}
      <div className="fixed bottom-0 left-0 right-0 z-30 border-t-2 border-slate-200 bg-white/95 backdrop-blur px-4 py-3 lg:pl-[300px]">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
          <Button variant="secondary" onClick={() => navigate('/electronics/bundles')}>Cancel</Button>
          <Button className="bg-gradient-to-r from-pink-600 to-rose-700"
            onClick={() => save.mutate()} loading={save.isPending} disabled={!canSave}>
            <Save className="h-4 w-4" />
            {isEdit ? 'Update Bundle' : 'Create Bundle'}
          </Button>
        </div>
      </div>
    </div>
  );
}

function SectionHead({ n, icon: Icon, title, desc, tone }: any) {
  const tones: Record<string, string> = {
    pink: 'from-pink-500 to-rose-700',
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
      <div className={['h-4 w-4 rounded-md flex items-center justify-center shrink-0',
        done ? 'bg-emerald-500 text-white' : 'bg-white border-2 border-slate-300'].join(' ')}>
        {done && <CheckCircle2 className="h-3 w-3" />}
      </div>
      <span className={['font-bold', done ? 'text-emerald-800 line-through' : 'text-slate-600'].join(' ')}>{label}</span>
    </div>
  );
}
