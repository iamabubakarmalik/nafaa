import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Save, Trash2, Star, Eye, Package, DollarSign,
  Boxes, Image as ImageIcon, Layers, Hash, Globe, Plus, X,
} from 'lucide-react';
import { productsApi, type CreateProductPayload } from '@/api/products.api';
import { brandsApi } from '@/api/brands.api';
import { tagsApi } from '@/api/tags.api';
import { categoriesApi } from '@/api/categories.api';
import {
  productImagesApi, type ProductImage,
} from '@/api/product-images.api';
import {
  productVariantsApi, type UpsertVariantPayload,
} from '@/api/product-variants.api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { UploadDropzone, ImageGallery } from '@/components/uploads';
import { VariantBuilder } from '../components/VariantBuilder';
import { toast } from 'sonner';

type Tab = 'basic' | 'pricing' | 'inventory' | 'images' | 'variants' | 'tags' | 'seo';

const tabs: { id: Tab; label: string; icon: any }[] = [
  { id: 'basic', label: 'Basic Info', icon: Package },
  { id: 'pricing', label: 'Pricing & Tax', icon: DollarSign },
  { id: 'inventory', label: 'Inventory', icon: Boxes },
  { id: 'images', label: 'Images', icon: ImageIcon },
  { id: 'variants', label: 'Variants', icon: Layers },
  { id: 'tags', label: 'Tags', icon: Hash },
  { id: 'seo', label: 'SEO & Extra', icon: Globe },
];

const emptyForm: CreateProductPayload = {
  name: '',
  description: '',
  shortDescription: '',
  categoryId: '',
  brandId: '',
  sku: '',
  barcode: '',
  unit: 'pcs',
  price: 0,
  costPrice: 0,
  wholesalePrice: undefined,
  taxRate: 0,
  stock: 0,
  lowStockAlert: 5,
  weight: undefined,
  weightUnit: 'g',
  dimensions: '',
  expiryTracked: false,
  isActive: true,
  isFeatured: false,
  tagIds: [],
  imageUrls: [],
};

export default function ProductFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEdit = Boolean(id);

  const [tab, setTab] = useState<Tab>('basic');
  const [form, setForm] = useState<CreateProductPayload>(emptyForm);

  const { data: product } = useQuery({
    queryKey: ['product', id],
    queryFn: () => productsApi.getOne(id!),
    enabled: isEdit,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: categoriesApi.list,
  });

  const { data: brands = [] } = useQuery({
    queryKey: ['brands'],
    queryFn: () => brandsApi.list(),
  });

  const { data: allTags = [] } = useQuery({
    queryKey: ['tags'],
    queryFn: tagsApi.list,
  });

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
      });
    }
  }, [product]);

  const saveMutation = useMutation({
    mutationFn: () =>
      isEdit
        ? productsApi.update(id!, form)
        : productsApi.create(form),
    onSuccess: (saved) => {
      toast.success(isEdit ? 'Product updated' : 'Product created');
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['product', saved.id] });
      if (!isEdit) navigate(`/products/${saved.id}/edit`);
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  const removeMutation = useMutation({
  mutationFn: () => productsApi.remove(id!),

  onSuccess: (data: any) => {
    if (data?.softDeleted) {
      toast.success('Product deactivated (sales history preserved)', {
        description: `Has ${data.saleCount} sales — cannot hard delete`,
      });
    } else {
      toast.success('Product deleted permanently');
    }

    navigate('/products');
  },

  onError: (e: any) => {
    toast.error(e?.response?.data?.message || 'Failed to delete product');
  },
});

  const addImageMutation = useMutation({
    mutationFn: (url: string) =>
      productImagesApi.add(id!, { url, isPrimary: images.length === 0 }),
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
      productVariantsApi.bulkCreate(id!, vs),
    onSuccess: () => {
      refetchVariants();
      toast.success('Variants generated');
    },
  });

  const removeVariantMutation = useMutation({
    mutationFn: (vid: string) => productVariantsApi.remove(id!, vid),
    onSuccess: () => refetchVariants(),
  });

  const toggleTag = (tagId: string) => {
    setForm((f) => ({
      ...f,
      tagIds: f.tagIds?.includes(tagId)
        ? f.tagIds.filter((t) => t !== tagId)
        : [...(f.tagIds ?? []), tagId],
    }));
  };

  return (
    <div className="space-y-6">
      <Link
        to="/products"
        className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-brand-600"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Products
      </Link>

      {/* Header */}
      <section className="rounded-3xl bg-gradient-to-br from-brand-900 to-emerald-700 text-white p-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium">
              <Package className="h-3.5 w-3.5" />
              {isEdit ? 'Editing Product' : 'New Product'}
            </div>
            <h1 className="mt-3 text-3xl font-bold">{form.name || 'Untitled product'}</h1>
            {form.sku && <p className="mt-1 text-sm text-white/80 font-mono">{form.sku}</p>}
          </div>

          <div className="flex gap-2 flex-wrap">
            {isEdit && (
              <Button
                variant="secondary"
                onClick={() => {
                  if (confirm(`Delete "${form.name}"?`)) removeMutation.mutate();
                }}
              >
                <Trash2 className="h-4 w-4" /> Delete
              </Button>
            )}
            <Button
              onClick={() => saveMutation.mutate()}
              loading={saveMutation.isPending}
              className="bg-white text-slate-900 hover:bg-slate-100"
            >
              <Save className="h-4 w-4" /> {isEdit ? 'Save Changes' : 'Create Product'}
            </Button>
          </div>
        </div>
      </section>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {tabs.map((t) => {
          const Icon = t.icon;
          const disabled = !isEdit && (t.id === 'images' || t.id === 'variants');
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
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6">
        {tab === 'basic' && (
          <div className="space-y-5 max-w-3xl">
            <Input
              label="Product Name *"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Basmati Rice 5kg Premium"
            />

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Short Description
              </label>
              <input
                className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm"
                value={form.shortDescription ?? ''}
                onChange={(e) => setForm({ ...form, shortDescription: e.target.value })}
                placeholder="One-liner that appears on cards"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Full Description
              </label>
              <textarea
                rows={5}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                value={form.description ?? ''}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Detailed description, features, ingredients..."
              />
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Category
                </label>
                <select
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"
                  value={form.categoryId ?? ''}
                  onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                >
                  <option value="">No category</option>
                  {categories.map((c: any) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Brand
                </label>
                <select
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"
                  value={form.brandId ?? ''}
                  onChange={(e) => setForm({ ...form, brandId: e.target.value })}
                >
                  <option value="">No brand</option>
                  {brands.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid sm:grid-cols-3 gap-4">
              <Input
                label="SKU"
                value={form.sku ?? ''}
                onChange={(e) => setForm({ ...form, sku: e.target.value })}
                placeholder="RICE-5KG-001"
              />
              <Input
                label="Barcode"
                value={form.barcode ?? ''}
                onChange={(e) => setForm({ ...form, barcode: e.target.value })}
                placeholder="1234567890123"
              />
              <Input
                label="Unit"
                value={form.unit ?? 'pcs'}
                onChange={(e) => setForm({ ...form, unit: e.target.value })}
                placeholder="pcs, kg, liter, dozen"
              />
            </div>

            <div className="flex flex-wrap gap-4 pt-2">
              <label className="inline-flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.isActive ?? true}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                  className="h-4 w-4 rounded"
                />
                <Eye className="h-4 w-4 text-slate-600" /> Active
              </label>
              <label className="inline-flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.isFeatured ?? false}
                  onChange={(e) => setForm({ ...form, isFeatured: e.target.checked })}
                  className="h-4 w-4 rounded"
                />
                <Star className="h-4 w-4 text-amber-500" /> Featured
              </label>
              <label className="inline-flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.expiryTracked ?? false}
                  onChange={(e) => setForm({ ...form, expiryTracked: e.target.checked })}
                  className="h-4 w-4 rounded"
                />
                Track Expiry / Batches
              </label>
            </div>
          </div>
        )}

        {tab === 'pricing' && (
          <div className="space-y-5 max-w-3xl">
            <div className="grid sm:grid-cols-3 gap-4">
              <Input
                label="Sell Price (PKR) *"
                type="number"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
              />
              <Input
                label="Cost Price (PKR)"
                type="number"
                value={form.costPrice ?? 0}
                onChange={(e) => setForm({ ...form, costPrice: Number(e.target.value) })}
              />
              <Input
                label="Wholesale Price (PKR)"
                type="number"
                value={form.wholesalePrice ?? ''}
                onChange={(e) =>
                  setForm({
                    ...form,
                    wholesalePrice: e.target.value ? Number(e.target.value) : undefined,
                  })
                }
                hint="For B2B / bulk customers"
              />
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <Input
                label="Tax Rate (%)"
                type="number"
                value={form.taxRate ?? 0}
                onChange={(e) => setForm({ ...form, taxRate: Number(e.target.value) })}
                hint="GST or sales tax percentage"
              />
            </div>

            <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-5">
              <div className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                Profit Margin
              </div>
              <div className="mt-2 text-3xl font-bold text-emerald-900">
                {form.price > 0
                  ? `${(((form.price - (form.costPrice ?? 0)) / form.price) * 100).toFixed(1)}%`
                  : '—'}
              </div>
              <div className="text-xs text-emerald-700 mt-1">
                Profit per unit: Rs {((form.price ?? 0) - (form.costPrice ?? 0)).toFixed(0)}
              </div>
            </div>
          </div>
        )}

        {tab === 'inventory' && (
          <div className="space-y-5 max-w-3xl">
            <div className="grid sm:grid-cols-2 gap-4">
              <Input
                label="Current Stock"
                type="number"
                value={form.stock ?? 0}
                onChange={(e) => setForm({ ...form, stock: Number(e.target.value) })}
              />
              <Input
                label="Low Stock Alert"
                type="number"
                value={form.lowStockAlert ?? 5}
                onChange={(e) =>
                  setForm({ ...form, lowStockAlert: Number(e.target.value) })
                }
                hint="Alert when stock falls below this"
              />
            </div>

            <div className="grid sm:grid-cols-3 gap-4">
              <Input
                label="Weight"
                type="number"
                value={form.weight ?? ''}
                onChange={(e) =>
                  setForm({
                    ...form,
                    weight: e.target.value ? Number(e.target.value) : undefined,
                  })
                }
              />
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Weight Unit
                </label>
                <select
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"
                  value={form.weightUnit ?? 'g'}
                  onChange={(e) => setForm({ ...form, weightUnit: e.target.value })}
                >
                  <option value="g">grams (g)</option>
                  <option value="kg">kilograms (kg)</option>
                  <option value="ml">milliliters (ml)</option>
                  <option value="l">liters (l)</option>
                  <option value="oz">ounces (oz)</option>
                  <option value="lb">pounds (lb)</option>
                </select>
              </div>
              <Input
                label="Dimensions (L×W×H)"
                value={form.dimensions ?? ''}
                onChange={(e) => setForm({ ...form, dimensions: e.target.value })}
                placeholder="20×10×5 cm"
              />
            </div>
          </div>
        )}

        {tab === 'images' && isEdit && (
          <div className="space-y-5">
            <UploadDropzone
              purpose="product-image"
              maxFiles={20}
              onUploaded={(records) => {
                records.forEach((r) => addImageMutation.mutate(r.url));
              }}
              hint="Drop product images here — first becomes primary"
            />

            <div>
              <h3 className="font-bold text-slate-900 mb-3">
                Gallery ({images.length})
              </h3>
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
          <div className="space-y-5">
            <VariantBuilder
              basePrice={form.price ?? 0}
              baseCostPrice={form.costPrice ?? 0}
              onGenerate={(vs) => bulkVariantsMutation.mutate(vs)}
            />

            <div>
              <h3 className="font-bold text-slate-900 mb-3">
                Existing Variants ({variants.length})
              </h3>
              {variants.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">
                  No variants yet — use builder above to generate
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="min-w-full text-sm">
                    <thead className="bg-slate-50 text-slate-600">
                      <tr>
                        <th className="text-left px-4 py-3 font-medium">Variant</th>
                        <th className="text-left px-4 py-3 font-medium">Color</th>
                        <th className="text-left px-4 py-3 font-medium">Size</th>
                        <th className="text-right px-4 py-3 font-medium">Price</th>
                        <th className="text-right px-4 py-3 font-medium">Stock</th>
                        <th className="text-right px-4 py-3 font-medium">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {variants.map((v) => (
                        <tr key={v.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3 font-semibold">{v.name}</td>
                          <td className="px-4 py-3">
                            {v.colorHex && (
                              <div className="inline-flex items-center gap-1.5">
                                <span
                                  className="h-4 w-4 rounded-full border border-slate-200"
                                  style={{ backgroundColor: v.colorHex }}
                                />
                                {v.color}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3">{v.size || '—'}</td>
                          <td className="px-4 py-3 text-right font-semibold">
                            Rs {v.price.toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-right">{v.stock}</td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => removeVariantMutation.mutate(v.id)}
                              className="text-rose-600 hover:bg-rose-50 rounded-lg p-1.5"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {tab === 'tags' && (
          <div className="max-w-3xl">
            {allTags.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">
                No tags yet. Create tags first from <Link to="/tags" className="text-brand-600 font-bold">Tags page</Link>
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
                      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border-2 text-sm font-bold transition ${
                        active ? 'shadow' : 'opacity-60 hover:opacity-100'
                      }`}
                      style={{
                        backgroundColor: active ? `${t.color}20` : '#fff',
                        borderColor: active ? t.color : '#e2e8f0',
                        color: active ? t.color : '#475569',
                      }}
                    >
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: t.color }}
                      />
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

        {tab === 'seo' && (
          <div className="space-y-5 max-w-3xl">
            <p className="text-sm text-slate-500">
              These fields help your products appear better in search and external links.
            </p>
            <Input
              label="Meta Title"
              value={(form as any).metaTitle ?? ''}
              onChange={(e) => setForm({ ...form, ...(({ metaTitle: e.target.value } as any)) })}
              placeholder="Defaults to product name"
            />
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Meta Description
              </label>
              <textarea
                rows={3}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                value={(form as any).metaDescription ?? ''}
                onChange={(e) =>
                  setForm({ ...form, ...(({ metaDescription: e.target.value } as any)) })
                }
                placeholder="Short description for search engines (160 characters max)"
                maxLength={160}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
