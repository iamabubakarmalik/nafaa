import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Save, Trash2, Star, Eye, Package, DollarSign,
  Boxes, Image as ImageIcon, Layers, Hash, Plus, X, ExternalLink,
  Smartphone, ArrowRight,
} from 'lucide-react';
import { productsApi, type CreateProductPayload } from '@/api/products.api';
import { brandsApi } from '@/api/brands.api';
import { tagsApi } from '@/api/tags.api';
import { categoriesApi } from '@/api/categories.api';
import { productImagesApi } from '@/api/product-images.api';
import {
  productVariantsApi,
  type UpsertVariantPayload,
  type ProductVariant,
} from '@/api/product-variants.api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { UploadDropzone, ImageGallery } from '@/components/uploads';
import { VariantBuilder } from '../components/VariantBuilder';
import { VariantCard } from '../components/VariantCard';
import { UnitSelect } from '../components/UnitSelect';
import { formatPKRFull } from '@/lib/format';
import { toast } from 'sonner';
import { useBusinessFeatures } from '@/hooks/useBusinessFeatures';
import { BulkImeiAddModal } from '@/features/industries/mobile/components/BulkImeiAddModal';
import { imeiApi } from '@/features/industries/mobile/api/imei.api';
import {
  IndustrySection,
  IndustryVariantExtra,
  useActiveIndustryPlugin,
} from '@/features/industries/_shared/components/IndustrySection';

type Tab = 'basic' | 'pricing' | 'inventory' | 'images' | 'variants' | 'tags' | 'imei';

const baseTabs: { id: Tab; label: string; icon: any }[] = [
  { id: 'basic', label: 'Basic Info', icon: Package },
  { id: 'pricing', label: 'Pricing & Tax', icon: DollarSign },
  { id: 'inventory', label: 'Inventory', icon: Boxes },
  { id: 'images', label: 'Images', icon: ImageIcon },
  { id: 'variants', label: 'Variants', icon: Layers },
  { id: 'tags', label: 'Tags', icon: Hash },
];

const emptyForm: CreateProductPayload = {
  name: '', description: '', shortDescription: '', categoryId: '', brandId: '',
  sku: '', barcode: '', unit: 'pcs', price: 0, costPrice: 0,
  wholesalePrice: undefined, taxRate: 0, stock: 0, lowStockAlert: 5,
  weight: undefined, weightUnit: 'g', dimensions: '', expiryTracked: false,
  isActive: true, isFeatured: false, tagIds: [], imageUrls: [],
};

type VariantDraftMap = Record<string, UpsertVariantPayload>;

const trimToUndefined = (value?: string | null) => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
};

const variantToDraft = (variant: ProductVariant): UpsertVariantPayload => ({
  name: variant.name,
  sku: variant.sku ?? undefined,
  barcode: variant.barcode ?? undefined,
  color: variant.color ?? undefined,
  colorHex: variant.colorHex ?? undefined,
  size: variant.size ?? undefined,
  weight: variant.weight ?? undefined,
  unit: variant.unit ?? undefined,
  price: variant.price,
  costPrice: variant.costPrice ?? 0,
  wholesalePrice: variant.wholesalePrice ?? undefined,
  stock: variant.stock ?? 0,
  lowStockAlert: variant.lowStockAlert ?? 5,
  imageUrl: variant.imageUrl ?? undefined,
  isActive: variant.isActive,
  sortOrder: variant.sortOrder ?? 0,
});

const sanitizeVariantPayload = (draft: UpsertVariantPayload): UpsertVariantPayload => ({
  name: draft.name.trim(),
  sku: trimToUndefined(draft.sku),
  barcode: trimToUndefined(draft.barcode),
  color: trimToUndefined(draft.color),
  colorHex: trimToUndefined(draft.colorHex),
  size: trimToUndefined(draft.size),
  weight: draft.weight === undefined || draft.weight === null ? undefined : Number(draft.weight),
  unit: trimToUndefined(draft.unit),
  price: Number(draft.price ?? 0),
  costPrice: Number(draft.costPrice ?? 0),
  wholesalePrice:
    draft.wholesalePrice === undefined || draft.wholesalePrice === null
      ? undefined
      : Number(draft.wholesalePrice),
  stock: Number(draft.stock ?? 0),
  lowStockAlert: Number(draft.lowStockAlert ?? 5),
  imageUrl: trimToUndefined(draft.imageUrl),
  isActive: draft.isActive ?? true,
  sortOrder: Number(draft.sortOrder ?? 0),
});

export default function ProductFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEdit = Boolean(id);
  const submitLockRef = useRef(false);
  const { features: businessFeatures } = useBusinessFeatures();

  const [tab, setTab] = useState<Tab>('basic');
  const [form, setForm] = useState<CreateProductPayload>(emptyForm);
  const [variantDrafts, setVariantDrafts] = useState<VariantDraftMap>({});
  const [showImeiAdd, setShowImeiAdd] = useState(false);
  const [imeiVariantContext, setImeiVariantContext] = useState<{ id?: string; name?: string }>({});

  // Active industry plugin (for display purposes)
  const activePlugin = useActiveIndustryPlugin(form.unit ?? 'pcs');
  const isIndustrySpecific = activePlugin.key !== 'STANDARD';

  // Tabs
  const tabs = [...baseTabs];
  if (isEdit && businessFeatures.imei) {
    tabs.push({ id: 'imei', label: 'IMEI Tracking', icon: Smartphone });
  }

  const { data: product } = useQuery({
    queryKey: ['product', id],
    queryFn: () => productsApi.getOne(id!),
    enabled: isEdit,
  });

  const { data: categories = [] } = useQuery({ queryKey: ['categories'], queryFn: categoriesApi.list });
  const { data: brands = [] } = useQuery({ queryKey: ['brands'], queryFn: () => brandsApi.list() });
  const { data: allTags = [] } = useQuery({ queryKey: ['tags'], queryFn: tagsApi.list });

  const { data: images = [], refetch: refetchImages } = useQuery({
    queryKey: ['product-images', id],
    queryFn: () => productImagesApi.list(id!),
    enabled: isEdit,
  });

  const { data: variants = [], refetch: refetchVariants } = useQuery({
    queryKey: ['product-variants', id],
    queryFn: () => productVariantsApi.list(id!),
    enabled: isEdit,
  });

  const { data: imeis = [], refetch: refetchImeis } = useQuery({
    queryKey: ['product-imeis', id],
    queryFn: () => imeiApi.listByProduct(id!),
    enabled: isEdit && businessFeatures.imei,
  });

  useEffect(() => {
    if (product) {
      setForm({
        name: product.name,
        description: product.description ?? '',
        shortDescription: product.shortDescription ?? '',
        categoryId: product.categoryId ?? '',
        brandId: product.brandId ?? '',
        sku: product.sku ?? '',
        barcode: product.barcode ?? '',
        unit: product.unit,
        price: product.price,
        costPrice: product.costPrice,
        wholesalePrice: product.wholesalePrice ?? undefined,
        taxRate: product.taxRate,
        stock: product.stock,
        lowStockAlert: product.lowStockAlert,
        weight: product.weight ?? undefined,
        weightUnit: product.weightUnit ?? 'g',
        dimensions: product.dimensions ?? '',
        expiryTracked: product.expiryTracked,
        isActive: product.isActive,
        isFeatured: product.isFeatured,
        tagIds: product.tags?.map((t) => t.tag.id) ?? [],
        imageUrls: product.images?.map((img) => img.url) ?? [],
      });
    }
  }, [product]);

  useEffect(() => {
    const next: VariantDraftMap = {};
    variants.forEach((variant) => {
      next[variant.id] = variantToDraft(variant);
    });
    setVariantDrafts(next);
  }, [variants]);

  const updateVariantDraft = (variantId: string, patch: Partial<UpsertVariantPayload>) => {
    setVariantDrafts((prev) => ({
      ...prev,
      [variantId]: { ...(prev[variantId] ?? {}), ...patch },
    }));
  };

  // ─── Mutations ─────────────────────────────────────────────
  const saveMutation = useMutation({
    mutationFn: async () => (isEdit ? productsApi.update(id!, form) : productsApi.create(form)),
  });

  const removeMutation = useMutation({
    mutationFn: () => productsApi.remove(id!),
    onSuccess: (data: any) => {
      toast.success(data?.softDeleted ? 'Product deactivated (sales history preserved)' : 'Product deleted permanently');
      navigate('/products');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed to delete product'),
  });

  const addImageMutation = useMutation({
    mutationFn: (url: string) => productImagesApi.add(id!, { url, isPrimary: images.length === 0 }),
    onSuccess: () => refetchImages(),
  });
  const setPrimaryMutation = useMutation({
    mutationFn: (imageId: string) => productImagesApi.setPrimary(id!, imageId),
    onSuccess: () => refetchImages(),
  });
  const removeImageMutation = useMutation({
    mutationFn: (imageId: string) => productImagesApi.remove(id!, imageId),
    onSuccess: () => refetchImages(),
  });
  const reorderImagesMutation = useMutation({
    mutationFn: (ids: string[]) => productImagesApi.reorder(id!, ids),
    onSuccess: () => refetchImages(),
  });

  const bulkVariantsMutation = useMutation({
    mutationFn: (vs: UpsertVariantPayload[]) =>
      productVariantsApi.bulkCreate(id!, vs.map((v) => sanitizeVariantPayload(v))),
    onSuccess: () => {
      refetchVariants();
      toast.success('Variants generated');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed to generate variants'),
  });

  const saveVariantMutation = useMutation({
    mutationFn: ({ variantId, payload }: { variantId: string; payload: UpsertVariantPayload }) =>
      productVariantsApi.update(id!, variantId, payload),
    onSuccess: () => {
      refetchVariants();
      toast.success('Variant updated');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed to update variant'),
  });

  const removeVariantMutation = useMutation({
    mutationFn: (vid: string) => productVariantsApi.remove(id!, vid),
    onSuccess: () => {
      refetchVariants();
      toast.success('Variant deleted');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed to delete variant'),
  });

  const removeImeiMutation = useMutation({
    mutationFn: (imeiId: string) => imeiApi.remove(imeiId),
    onSuccess: () => {
      refetchImeis();
      toast.success('IMEI removed');
    },
  });

  // ─── Handlers ──────────────────────────────────────────────
  const handleSaveProduct = async () => {
    if (submitLockRef.current || saveMutation.isPending) return;
    if (!form.name.trim()) {
      toast.error('Product name required');
      setTab('basic');
      return;
    }
    submitLockRef.current = true;
    try {
      const saved = await saveMutation.mutateAsync();
      queryClient.setQueryData(['product', saved.id], saved);
      await queryClient.invalidateQueries({ queryKey: ['products'] });
      await queryClient.invalidateQueries({ queryKey: ['product', saved.id] });
      toast.success(isEdit ? 'Product updated' : 'Product created successfully');
      if (!isEdit) navigate(`/products/${saved.id}/edit`, { replace: true });
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed');
    } finally {
      setTimeout(() => { submitLockRef.current = false; }, 700);
    }
  };

  const toggleTag = (tagId: string) => {
    setForm((f) => ({
      ...f,
      tagIds: f.tagIds?.includes(tagId)
        ? f.tagIds.filter((t) => t !== tagId)
        : [...(f.tagIds ?? []), tagId],
    }));
  };

  const handleVariantSave = (variantId: string) => {
    const draft = variantDrafts[variantId];
    if (!draft?.name?.trim()) {
      toast.error('Variant name required');
      return;
    }
    saveVariantMutation.mutate({ variantId, payload: sanitizeVariantPayload(draft) });
  };

  const handleVariantImageChange = (variantId: string, url: string | null) => {
    const current = variantDrafts[variantId];
    if (!current) return;
    const nextDraft: UpsertVariantPayload = { ...current, imageUrl: url ?? undefined };
    setVariantDrafts((prev) => ({ ...prev, [variantId]: nextDraft }));
    saveVariantMutation.mutate({ variantId, payload: sanitizeVariantPayload(nextDraft) });
  };

  // ─── Derived ───────────────────────────────────────────────
  const profitPerUnit = (form.price ?? 0) - (form.costPrice ?? 0);
  const profitMargin = form.price > 0 ? (((form.price - (form.costPrice ?? 0)) / form.price) * 100) : 0;

  const imeiStats = {
    total: imeis.length,
    inStock: imeis.filter((i) => i.status === 'IN_STOCK').length,
    sold: imeis.filter((i) => i.status === 'SOLD').length,
  };

  // Shared props for industry sections
  const industryProps = {
    productId: id,
    form,
    setForm,
    isEdit,
    variants,
    unit: form.unit ?? 'pcs',
  };

  return (
    <div className="space-y-6">
      {showImeiAdd && id && (
        <BulkImeiAddModal
          productId={id}
          productName={form.name}
          variantId={imeiVariantContext.id}
          variantName={imeiVariantContext.name}
          defaultCostPrice={form.costPrice ?? 0}
          onSuccess={() => refetchImeis()}
          onClose={() => { setShowImeiAdd(false); setImeiVariantContext({}); }}
        />
      )}

      <div className="flex items-center justify-between flex-wrap gap-3">
        <Link to="/products" className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-brand-600">
          <ArrowLeft className="h-4 w-4" /> Back to Products
        </Link>
        {isEdit && (
          <Link to="/catalog" target="_blank" className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-bold hover:bg-emerald-100">
            <ExternalLink className="h-3.5 w-3.5" /> View in Catalog
          </Link>
        )}
      </div>

      <section className="rounded-3xl bg-gradient-to-br from-brand-900 to-emerald-700 text-white p-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium">
              <Package className="h-3.5 w-3.5" />
              {isEdit ? 'Editing Product' : 'New Product'}
              {isIndustrySpecific && (
                <span className="ml-1 px-1.5 py-0.5 rounded bg-emerald-400/30 text-[10px] font-extrabold uppercase">
                  {activePlugin.label}
                </span>
              )}
            </div>
            <h1 className="mt-3 text-3xl font-bold">{form.name || 'Untitled product'}</h1>
            {form.sku && <p className="mt-1 text-sm text-white/80 font-mono">{form.sku}</p>}
          </div>

          <div className="flex gap-2 flex-wrap">
            {isEdit && (
              <Button variant="secondary" onClick={() => { if (confirm(`Delete "${form.name}"?`)) removeMutation.mutate(); }}>
                <Trash2 className="h-4 w-4" /> Delete
              </Button>
            )}
            <Button onClick={handleSaveProduct} loading={saveMutation.isPending} className="bg-white text-slate-900 hover:bg-slate-100">
              <Save className="h-4 w-4" />
              {isEdit ? 'Save Changes' : 'Create Product'}
            </Button>
          </div>
        </div>

        {/* 🎨 Industry-specific header action bar (auto-renders from plugin) */}
        <IndustrySection slot="HeaderActionBar" {...industryProps} />
      </section>

      <div className="flex gap-2 overflow-x-auto pb-2">
        {tabs.map((t) => {
          const Icon = t.icon;
          const disabled = !isEdit && (t.id === 'images' || t.id === 'variants' || t.id === 'imei');
          return (
            <button
              key={t.id}
              onClick={() => !disabled && setTab(t.id)}
              disabled={disabled}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition ${
                tab === t.id
                  ? 'bg-brand-600 text-white shadow-md'
                  : disabled
                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    : 'bg-white text-slate-700 border border-slate-200 hover:border-brand-300'
              }`}
            >
              <Icon className="h-4 w-4" />
              {t.label}
              {disabled && <span className="text-[10px]">(save first)</span>}
              {t.id === 'imei' && isEdit && imeiStats.inStock > 0 && (
                <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-full bg-emerald-500 text-white">
                  {imeiStats.inStock}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="grid xl:grid-cols-[1fr_380px] gap-6 items-stretch">
        <div className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6">

          {tab === 'basic' && (
            <div className="space-y-5 max-w-4xl">
              <Input
                label="Product Name *"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Sun Flower, Flora-17 Economy"
              />

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Short Description</label>
                <input
                  className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm"
                  value={form.shortDescription ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, shortDescription: e.target.value }))}
                  placeholder="One-liner that appears on cards"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Full Description</label>
                <textarea
                  rows={5}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  value={form.description ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Detailed description, features..."
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Category</label>
                  <select
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"
                    value={form.categoryId ?? ''}
                    onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}
                  >
                    <option value="">No category</option>
                    {categories.map((c: any) => (<option key={c.id} value={c.id}>{c.name}</option>))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Brand</label>
                  <select
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"
                    value={form.brandId ?? ''}
                    onChange={(e) => setForm((f) => ({ ...f, brandId: e.target.value }))}
                  >
                    <option value="">No brand</option>
                    {brands.map((b) => (<option key={b.id} value={b.id}>{b.name}</option>))}
                  </select>
                </div>
              </div>

              <div className="grid sm:grid-cols-3 gap-4">
                <Input label="SKU" value={form.sku ?? ''} onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value }))} placeholder="FL17-ECO" />
                <Input label="Barcode" value={form.barcode ?? ''} onChange={(e) => setForm((f) => ({ ...f, barcode: e.target.value }))} placeholder="1234567890123" />
                <UnitSelect value={form.unit ?? 'pcs'} onChange={(unit) => setForm((f) => ({ ...f, unit }))} label="Unit" hint="sqft for carpets, kg for grocery, pcs for mobile" />
              </div>

              <div className="flex flex-wrap gap-4 pt-2">
                <label className="inline-flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={form.isActive ?? true} onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))} className="h-4 w-4 rounded" />
                  <Eye className="h-4 w-4 text-slate-600" /> Active
                </label>
                <label className="inline-flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={form.isFeatured ?? false} onChange={(e) => setForm((f) => ({ ...f, isFeatured: e.target.checked }))} className="h-4 w-4 rounded" />
                  <Star className="h-4 w-4 text-amber-500" /> Featured
                </label>
                {businessFeatures.expiry && !isIndustrySpecific && (
                  <label className="inline-flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={form.expiryTracked ?? false} onChange={(e) => setForm((f) => ({ ...f, expiryTracked: e.target.checked }))} className="h-4 w-4 rounded" />
                    Track Expiry / Batches
                  </label>
                )}
              </div>
            </div>
          )}

          {tab === 'pricing' && (
            <div className="space-y-5 max-w-4xl">
              <div className="grid sm:grid-cols-3 gap-4">
                <Input label="Sell Price (PKR) *" type="number" value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: Number(e.target.value) }))} />
                <Input label="Cost Price (PKR)" type="number" value={form.costPrice ?? 0} onChange={(e) => setForm((f) => ({ ...f, costPrice: Number(e.target.value) }))} />
                <Input label="Wholesale Price (PKR)" type="number" value={form.wholesalePrice ?? ''} onChange={(e) => setForm((f) => ({ ...f, wholesalePrice: e.target.value ? Number(e.target.value) : undefined }))} hint="For B2B / bulk customers" />
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <Input label="Tax Rate (%)" type="number" value={form.taxRate ?? 0} onChange={(e) => setForm((f) => ({ ...f, taxRate: Number(e.target.value) }))} hint="GST or sales tax percentage" />
              </div>
              <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-5">
                <div className="text-xs font-bold uppercase tracking-wider text-emerald-700">Profit Margin</div>
                <div className="mt-2 text-3xl font-bold text-emerald-900">{form.price > 0 ? `${profitMargin.toFixed(2)}%` : '—'}</div>
                <div className="text-sm text-emerald-700 mt-1">Profit per {form.unit}: {formatPKRFull(profitPerUnit)}</div>
              </div>
            </div>
          )}

          {/* 🎨 INVENTORY — plugin handles everything */}
          {tab === 'inventory' && (
            <IndustrySection slot="InventorySection" {...industryProps} />
          )}

          {tab === 'images' && isEdit && (
            <div className="space-y-5">
              <UploadDropzone
                purpose="product-image"
                maxFiles={20}
                onUploaded={(records) => { records.forEach((r) => addImageMutation.mutate(r.url)); }}
                hint="Drop product images here — first becomes primary"
              />
              <div>
                <h3 className="font-bold text-slate-900 mb-3">Gallery ({images.length})</h3>
                <ImageGallery
                  images={images}
                  onSetPrimary={(imgId) => setPrimaryMutation.mutate(imgId)}
                  onRemove={(imgId) => removeImageMutation.mutate(imgId)}
                  onReorder={(ids) => reorderImagesMutation.mutate(ids)}
                />
              </div>
            </div>
          )}

          {tab === 'variants' && isEdit && (
            <div className="space-y-6">
              {/* 🎨 Industry variants banner */}
              <IndustrySection slot="VariantsBanner" {...industryProps} />

              <VariantBuilder
                basePrice={form.price ?? 0}
                baseCostPrice={form.costPrice ?? 0}
                onGenerate={(vs) => bulkVariantsMutation.mutate(vs)}
              />

              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-slate-900">Existing Variants ({variants.length})</h3>
                  {variants.length > 0 && (
                    <div className="text-xs text-slate-500">
                      Image change = auto save • Other fields = press <strong>Save Variant</strong>
                    </div>
                  )}
                </div>

                {variants.length === 0 ? (
                  <div className="rounded-2xl border-2 border-dashed border-slate-200 p-12 text-center">
                    <Layers className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                    <div className="font-bold text-slate-700">No variants yet</div>
                    <p className="text-sm text-slate-500 mt-1">Use builder above to generate variants</p>
                  </div>
                ) : (
                  <div className="space-y-5">
                    {variants.map((variant) => {
                      const draft = variantDrafts[variant.id] ?? variantToDraft(variant);
                      const rowLoading = saveVariantMutation.isPending && saveVariantMutation.variables?.variantId === variant.id;
                      const deleteLoading = removeVariantMutation.isPending && removeVariantMutation.variables === variant.id;
                      return (
                        <div key={variant.id}>
                          <VariantCard
                            variant={variant}
                            draft={draft}
                            parentUnit={form.unit ?? 'pcs'}
                            onUpdate={(patch) => updateVariantDraft(variant.id, patch)}
                            onImageChange={(url) => handleVariantImageChange(variant.id, url)}
                            onSave={() => handleVariantSave(variant.id)}
                            onDelete={() => {
                              if (confirm('Delete variant ' + variant.name + '?')) {
                                removeVariantMutation.mutate(variant.id);
                              }
                            }}
                            saving={rowLoading}
                            deleting={deleteLoading}
                          />
                          {/* 🎨 Industry-specific variant extra panel */}
                          <IndustryVariantExtra {...industryProps} variant={variant} />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {tab === 'tags' && (
            <div className="max-w-3xl">
              {allTags.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">
                  No tags yet. Create tags first from{' '}
                  <Link to="/tags" className="text-brand-600 font-bold">Tags page</Link>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {allTags.map((t) => {
                    const active = form.tagIds?.includes(t.id);
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => toggleTag(t.id)}
                        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border-2 text-sm font-bold transition ${active ? 'shadow' : 'opacity-60 hover:opacity-100'}`}
                        style={{
                          backgroundColor: active ? `${t.color}20` : '#fff',
                          borderColor: active ? t.color : '#e2e8f0',
                          color: active ? t.color : '#475569',
                        }}
                      >
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: t.color }} />
                        {t.name}
                        {active && <X className="h-3 w-3" />}
                        {!active && <Plus className="h-3 w-3" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {tab === 'imei' && isEdit && businessFeatures.imei && (
            <div className="space-y-5">
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 p-4 text-center">
                  <div className="text-[10px] uppercase tracking-wider text-blue-700 font-bold">Total IMEIs</div>
                  <div className="text-3xl font-extrabold text-blue-900 mt-1">{imeiStats.total}</div>
                </div>
                <div className="rounded-2xl bg-gradient-to-br from-emerald-50 to-green-50 border-2 border-emerald-200 p-4 text-center">
                  <div className="text-[10px] uppercase tracking-wider text-emerald-700 font-bold">In Stock</div>
                  <div className="text-3xl font-extrabold text-emerald-900 mt-1">{imeiStats.inStock}</div>
                </div>
                <div className="rounded-2xl bg-gradient-to-br from-violet-50 to-purple-50 border-2 border-violet-200 p-4 text-center">
                  <div className="text-[10px] uppercase tracking-wider text-violet-700 font-bold">Sold</div>
                  <div className="text-3xl font-extrabold text-violet-900 mt-1">{imeiStats.sold}</div>
                </div>
              </div>

              <div className="flex gap-2 flex-wrap">
                <Button
                  onClick={() => { setImeiVariantContext({}); setShowImeiAdd(true); }}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                >
                  <Plus className="h-4 w-4" /> Add IMEIs (Product Level)
                </Button>
                {variants.length > 0 && (
                  <select
                    onChange={(e) => {
                      if (!e.target.value) return;
                      const v = variants.find((vr) => vr.id === e.target.value);
                      if (v) { setImeiVariantContext({ id: v.id, name: v.name }); setShowImeiAdd(true); }
                      e.target.value = '';
                    }}
                    className="h-10 rounded-xl border-2 border-blue-300 bg-blue-50 px-3 text-sm font-bold text-blue-700"
                    defaultValue=""
                  >
                    <option value="">+ Add IMEIs for Variant...</option>
                    {variants.map((v) => (<option key={v.id} value={v.id}>{v.name}</option>))}
                  </select>
                )}
              </div>

              {imeis.length === 0 ? (
                <div className="rounded-2xl border-2 border-dashed border-blue-200 bg-blue-50/30 p-12 text-center">
                  <Smartphone className="h-12 w-12 text-blue-300 mx-auto mb-3" />
                  <div className="font-bold text-slate-700">No IMEIs added yet</div>
                  <p className="text-sm text-slate-500 mt-1">Add IMEIs to track individual units</p>
                </div>
              ) : (
                <div className="rounded-2xl border border-slate-200 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-3 py-2 text-left font-bold text-slate-700 text-xs uppercase">IMEI</th>
                        <th className="px-3 py-2 text-left font-bold text-slate-700 text-xs uppercase">Variant</th>
                        <th className="px-3 py-2 text-left font-bold text-slate-700 text-xs uppercase">Status</th>
                        <th className="px-3 py-2 text-left font-bold text-slate-700 text-xs uppercase">Cost</th>
                        <th className="px-3 py-2 text-right font-bold text-slate-700 text-xs uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {imeis.map((imei) => (
                        <tr key={imei.id} className="hover:bg-slate-50">
                          <td className="px-3 py-2">
                            <div className="font-mono font-bold text-slate-900 text-xs">{imei.imei1}</div>
                            {imei.imei2 && (<div className="font-mono text-[10px] text-slate-500">2: {imei.imei2}</div>)}
                          </td>
                          <td className="px-3 py-2 text-xs">
                            {imei.variant?.name || <span className="text-slate-400">—</span>}
                            {imei.color && (<span className="ml-1 text-[10px] text-violet-700 font-bold">{imei.color}</span>)}
                          </td>
                          <td className="px-3 py-2">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              imei.status === 'IN_STOCK' ? 'bg-emerald-100 text-emerald-700' :
                              imei.status === 'SOLD' ? 'bg-violet-100 text-violet-700' :
                              imei.status === 'RETURNED' ? 'bg-amber-100 text-amber-700' :
                              'bg-slate-100 text-slate-700'
                            }`}>
                              {imei.status}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-xs font-bold">{formatPKRFull(imei.costPrice)}</td>
                          <td className="px-3 py-2 text-right">
                            {imei.status === 'IN_STOCK' && (
                              <button
                                onClick={() => { if (confirm(`Remove IMEI ${imei.imei1}?`)) removeImeiMutation.mutate(imei.id); }}
                                className="h-7 w-7 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 inline-flex items-center justify-center"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        {/* SIDE PREVIEW PANEL */}
        <aside className="flex flex-col gap-4">
          <div className="rounded-3xl bg-white border border-slate-200 shadow-lg overflow-hidden">
            <div className="px-4 py-2.5 bg-gradient-to-r from-slate-900 to-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <div className="text-[10px] uppercase tracking-widest font-bold text-white/90">Customer Preview</div>
              </div>
              <div className="text-[10px] text-white/60 font-medium">Live</div>
            </div>

            <div className="relative aspect-square bg-gradient-to-br from-slate-50 to-slate-100 overflow-hidden group">
              {images && images[0]?.url ? (
                <img src={images[0].url} alt={form.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-slate-300">
                  <div className="h-20 w-20 rounded-2xl bg-white shadow-inner flex items-center justify-center mb-2">
                    <Package className="h-10 w-10" />
                  </div>
                  <div className="text-[11px] font-semibold text-slate-400">Add product image</div>
                </div>
              )}

              {isIndustrySpecific && (
                <div className="absolute top-3 left-3 px-2 py-1 rounded-md bg-emerald-600 text-white text-[10px] font-extrabold uppercase tracking-wider shadow-lg">
                  {activePlugin.label}
                </div>
              )}

              {form.isFeatured && (
                <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-amber-500 text-white text-[10px] font-bold shadow-lg flex items-center gap-1">
                  <Star className="h-3 w-3 fill-white" /> FEATURED
                </div>
              )}

              {images && images.length > 1 && (
                <div className="absolute bottom-3 right-3 px-2 py-1 rounded-full bg-slate-900/70 backdrop-blur text-white text-[10px] font-bold">
                  +{images.length - 1} more
                </div>
              )}
            </div>

            <div className="p-4 space-y-3">
              {form.brandId && brands.find((b) => b.id === form.brandId) && (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-violet-50 border border-violet-200">
                  <span className="h-1.5 w-1.5 rounded-full bg-violet-500" />
                  <span className="text-[10px] uppercase tracking-wider text-violet-700 font-bold">
                    {brands.find((b) => b.id === form.brandId)?.name}
                  </span>
                </div>
              )}

              <div>
                <h3 className="font-extrabold text-slate-900 text-lg leading-snug line-clamp-2">{form.name || 'Product name'}</h3>
                {form.shortDescription && (<p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">{form.shortDescription}</p>)}
              </div>

              <div className="flex items-baseline gap-2 pt-1">
                <div className="text-3xl font-extrabold text-emerald-600 leading-none tracking-tight">{formatPKRFull(form.price ?? 0)}</div>
                <div className="text-xs font-semibold text-slate-400">/ {form.unit}</div>
              </div>

              {form.wholesalePrice && (
                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-[11px] font-bold text-amber-700">
                  Wholesale: {formatPKRFull(form.wholesalePrice)}
                </div>
              )}

              {/* 🎨 Industry-specific customer stock block (e.g. carpet sqft) */}
              <IndustrySection slot="CustomerStockBlock" {...industryProps} />

              {variants.length > 0 && (
                <div className="pt-3 border-t border-slate-100">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-[11px] uppercase tracking-wider text-slate-700 font-bold">
                      {isIndustrySpecific ? 'Colors / Options' : 'Available Variants'}
                    </div>
                    <div className="text-[10px] text-slate-500 font-semibold">{variants.length} options</div>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5">
                    {variants.slice(0, 8).map((v) => (
                      <div key={v.id} className="group/v relative aspect-square rounded-lg border border-slate-200 bg-slate-50 overflow-hidden cursor-pointer hover:border-emerald-400 hover:shadow-md transition-all" title={`${v.name}${v.price ? ` — ${formatPKRFull(v.price)}` : ''}`}>
                        {v.imageUrl ? (
                          <img src={v.imageUrl} alt={v.name} className="w-full h-full object-cover" />
                        ) : v.colorHex ? (
                          <div className="w-full h-full" style={{ backgroundColor: v.colorHex }} />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[9px] font-bold text-slate-600 bg-gradient-to-br from-slate-100 to-slate-200">
                            {v.size || v.name.slice(0, 3).toUpperCase()}
                          </div>
                        )}
                        <div className="absolute inset-x-0 bottom-0 px-1 py-0.5 bg-slate-900/85 backdrop-blur text-white text-[8px] font-bold text-center truncate opacity-0 group-hover/v:opacity-100 transition-opacity">
                          {v.size || v.color || v.name.slice(0, 6)}
                        </div>
                      </div>
                    ))}
                    {variants.length > 8 && (
                      <div className="aspect-square rounded-lg border border-dashed border-slate-300 bg-slate-50 flex items-center justify-center text-[10px] font-extrabold text-slate-500">
                        +{variants.length - 8}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {form.tagIds && form.tagIds.length > 0 && (
                <div className="pt-3 border-t border-slate-100">
                  <div className="flex flex-wrap gap-1">
                    {form.tagIds.slice(0, 4).map((tagId) => {
                      const tag = allTags.find((t) => t.id === tagId);
                      if (!tag) return null;
                      return (
                        <span key={tag.id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ backgroundColor: `${tag.color}15`, color: tag.color, border: `1px solid ${tag.color}40` }}>
                          {tag.name}
                        </span>
                      );
                    })}
                    {form.tagIds.length > 4 && (
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-[10px] font-bold">+{form.tagIds.length - 4}</span>
                    )}
                  </div>
                </div>
              )}

              {!form.isActive && (
                <div className="rounded-lg bg-rose-50 border border-rose-200 px-3 py-2 text-[11px] font-bold text-rose-700 text-center">
                  ⚠ Product is INACTIVE — hidden from catalog
                </div>
              )}
            </div>
          </div>

          <div className="rounded-2xl bg-slate-50 border border-slate-200 p-3">
            <div className="text-[10px] uppercase tracking-wider font-bold text-slate-500 mb-2 flex items-center gap-1.5">
              <Eye className="h-3 w-3" />
              Admin Info (you only)
            </div>

            {/* 🎨 Industry-specific admin stock block (e.g. carpet rolls) */}
            {isIndustrySpecific ? (
              <IndustrySection slot="AdminStockBlock" {...industryProps} />
            ) : (
              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="rounded-lg bg-white border border-slate-200 p-2">
                  <div className="text-[9px] text-slate-500 font-bold uppercase">Stock</div>
                  <div className="text-sm font-extrabold text-slate-900">
                    {form.stock ?? 0}
                    <span className="text-[10px] text-slate-500 font-bold ml-1">{form.unit}</span>
                  </div>
                </div>
                <div className="rounded-lg bg-white border border-slate-200 p-2">
                  <div className="text-[9px] text-slate-500 font-bold uppercase">Variants</div>
                  <div className="text-sm font-extrabold text-slate-900">{variants.length}</div>
                </div>
              </div>
            )}

            {businessFeatures.imei && isEdit && (
              <div className="mt-2 rounded-lg bg-blue-50 border border-blue-200 p-2">
                <div className="text-[9px] text-blue-700 font-bold uppercase flex items-center gap-1">
                  <Smartphone className="h-2.5 w-2.5" />
                  IMEI Inventory
                </div>
                <div className="flex items-baseline gap-2 mt-1">
                  <div className="text-sm font-extrabold text-blue-900">{imeiStats.inStock}</div>
                  <div className="text-[10px] text-blue-700">in stock / {imeiStats.total} total</div>
                </div>
              </div>
            )}

            {form.costPrice !== undefined && form.price > 0 && (
              <div className="mt-2 pt-2 border-t border-slate-200 space-y-1 text-[11px]">
                <div className="flex justify-between"><span className="text-slate-600">Cost:</span><span className="font-bold text-slate-900">{formatPKRFull(form.costPrice ?? 0)}</span></div>
                <div className="flex justify-between"><span className="text-slate-600">Profit:</span><span className="font-extrabold text-emerald-700">{formatPKRFull((form.price ?? 0) - (form.costPrice ?? 0))}</span></div>
                <div className="flex justify-between"><span className="text-slate-600">Margin:</span><span className="font-bold text-emerald-700">{form.price > 0 ? `${(((form.price - (form.costPrice ?? 0)) / form.price) * 100).toFixed(1)}%` : '—'}</span></div>
              </div>
            )}

            {isEdit && (
              <Link to="/catalog" target="_blank" className="mt-3 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-bold transition-colors">
                Open in Catalog <ArrowRight className="h-3 w-3" />
              </Link>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
