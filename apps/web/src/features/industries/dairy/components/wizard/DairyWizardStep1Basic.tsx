import { useQuery } from '@tanstack/react-query';
import {
  Milk, DollarSign, Image as ImageIcon, Sparkles, Star, Eye,
  TrendingUp, Hash, AlertCircle, Percent, Tag, Award, Package,
} from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { UploadDropzone } from '@/components/uploads';
import { categoriesApi } from '@/api/categories.api';
import { brandsApi } from '@/api/brands.api';
import { tagsApi } from '@/api/tags.api';
import { formatPKRFull } from '@/lib/format';
import type { DairyWizardBasic } from '../../hooks/useDairyWizard';
import type { DairyProductType, DairyUnit } from '../../api/products.api';

interface Props {
  basic: DairyWizardBasic;
  onChange: (patch: Partial<DairyWizardBasic>) => void;
  errors: string[];
}

const PRODUCT_TYPES: { value: DairyProductType; label: string; emoji: string; group: string }[] = [
  { value: 'FRESH_MILK', label: 'Fresh Milk', emoji: '🥛', group: 'Milk' },
  { value: 'BUFFALO_MILK', label: 'Buffalo Milk', emoji: '🐃', group: 'Milk' },
  { value: 'COW_MILK', label: 'Cow Milk', emoji: '🐄', group: 'Milk' },
  { value: 'GOAT_MILK', label: 'Goat Milk', emoji: '🐐', group: 'Milk' },
  { value: 'MIXED_MILK', label: 'Mixed Milk', emoji: '🥛', group: 'Milk' },
  { value: 'BOILED_MILK', label: 'Boiled Milk', emoji: '🥛', group: 'Milk' },
  { value: 'RAW_MILK', label: 'Raw Milk', emoji: '🥛', group: 'Milk' },
  { value: 'YOGURT', label: 'Yogurt', emoji: '🥣', group: 'Yogurt' },
  { value: 'DAHI', label: 'Dahi', emoji: '🥣', group: 'Yogurt' },
  { value: 'LASSI', label: 'Lassi', emoji: '🥤', group: 'Drinks' },
  { value: 'BUTTER_MILK', label: 'Butter Milk', emoji: '🥤', group: 'Drinks' },
  { value: 'BUTTER', label: 'Butter', emoji: '🧈', group: 'Fats' },
  { value: 'MAKHAN', label: 'Makhan', emoji: '🧈', group: 'Fats' },
  { value: 'DESI_GHEE', label: 'Desi Ghee', emoji: '🧈', group: 'Fats' },
  { value: 'CREAM', label: 'Cream', emoji: '🥛', group: 'Fats' },
  { value: 'MALAI', label: 'Malai', emoji: '🥛', group: 'Fats' },
  { value: 'KHOA', label: 'Khoa', emoji: '🥛', group: 'Solids' },
  { value: 'MAWA', label: 'Mawa', emoji: '🥛', group: 'Solids' },
  { value: 'PANEER', label: 'Paneer', emoji: '🧀', group: 'Solids' },
  { value: 'CHEESE', label: 'Cheese', emoji: '🧀', group: 'Solids' },
  { value: 'KHEER', label: 'Kheer', emoji: '🍚', group: 'Sweets' },
  { value: 'RABRI', label: 'Rabri', emoji: '🥛', group: 'Sweets' },
  { value: 'KULFI', label: 'Kulfi', emoji: '🍦', group: 'Sweets' },
  { value: 'ICE_CREAM', label: 'Ice Cream', emoji: '🍨', group: 'Sweets' },
  { value: 'SWEETS', label: 'Sweets', emoji: '🍬', group: 'Sweets' },
  { value: 'MILK_POWDER', label: 'Milk Powder', emoji: '📦', group: 'Other' },
  { value: 'OTHER', label: 'Other', emoji: '📦', group: 'Other' },
];

const UNITS: { value: DairyUnit; label: string; emoji: string }[] = [
  { value: 'LITER', label: 'Liter', emoji: '🥛' },
  { value: 'KG', label: 'Kilogram', emoji: '⚖️' },
  { value: 'GRAM', label: 'Gram', emoji: '⚖️' },
  { value: 'PIECE', label: 'Piece', emoji: '🔢' },
  { value: 'PLATE', label: 'Plate', emoji: '🍽️' },
  { value: 'CUP', label: 'Cup', emoji: '🥤' },
  { value: 'BOTTLE', label: 'Bottle', emoji: '🍶' },
  { value: 'PACKET', label: 'Packet', emoji: '📦' },
  { value: 'KATTA', label: 'Katta', emoji: '📦' },
  { value: 'KILO', label: 'Kilo', emoji: '⚖️' },
  { value: 'MAAN', label: 'Maan', emoji: '⚖️' },
  { value: 'SEER', label: 'Seer', emoji: '⚖️' },
];

const CATTLE_TYPES = ['Buffalo', 'Cow', 'Goat', 'Mixed', 'Camel', 'Sheep'];

export function DairyWizardStep1Basic({ basic, onChange, errors }: Props) {
  const { data: categories = [] } = useQuery({ queryKey: ['categories'], queryFn: categoriesApi.list });
  const { data: brands = [] } = useQuery({ queryKey: ['brands'], queryFn: () => brandsApi.list() });
  const { data: allTags = [] } = useQuery({ queryKey: ['tags'], queryFn: tagsApi.list });

  const cost = Number(basic.costPrice || 0);
  const sale = Number(basic.salePrice || 0);
  const profit = sale - cost;
  const margin = sale > 0 ? (profit / sale) * 100 : 0;
  const isLoss = cost > 0 && sale > 0 && profit < 0;

  const toggleTag = (id: string) => {
    const current = basic.tagIds ?? [];
    onChange({ tagIds: current.includes(id) ? current.filter((t) => t !== id) : [...current, id] });
  };

  const groupedTypes = PRODUCT_TYPES.reduce((acc, t) => {
    if (!acc[t.group]) acc[t.group] = [];
    acc[t.group].push(t);
    return acc;
  }, {} as Record<string, typeof PRODUCT_TYPES>);

  return (
    <div className="space-y-5">
      {errors.length > 0 && (
        <div className="rounded-2xl bg-rose-50 border-2 border-rose-200 p-3 flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
          <div className="text-xs text-rose-900">
            <div className="font-extrabold mb-0.5">Fix these before Next:</div>
            <ul className="list-disc pl-4 space-y-0.5">
              {errors.map((e, i) => <li key={i}>{e}</li>)}
            </ul>
          </div>
        </div>
      )}

      {/* Identity */}
      <section className="rounded-2xl border-2 border-slate-200 bg-white p-5 space-y-4">
        <SectionHeader icon={Milk} title="Product Identity" desc="Naam, category, brand" />
        <Input
          label="Product Name *"
          value={basic.name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="e.g. Buffalo Milk 1L, Fresh Yogurt 500g, Desi Ghee 1kg"
        />
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-1.5">Description</label>
          <textarea
            rows={2}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-500/20"
            value={basic.description}
            onChange={(e) => onChange({ description: e.target.value })}
            placeholder="Product details..."
          />
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5">Category</label>
            <select
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:border-fuchsia-500"
              value={basic.categoryId}
              onChange={(e) => onChange({ categoryId: e.target.value })}
            >
              <option value="">Select category</option>
              {categories.map((c: any) => (<option key={c.id} value={c.id}>{c.name}</option>))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5">Brand</label>
            <select
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:border-fuchsia-500"
              value={basic.brandId}
              onChange={(e) => onChange({ brandId: e.target.value })}
            >
              <option value="">Select brand</option>
              {brands.map((b) => (<option key={b.id} value={b.id}>{b.name}</option>))}
            </select>
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <Input label="SKU / Code" value={basic.sku} onChange={(e) => onChange({ sku: e.target.value })}
            placeholder="MILK-1L" leftIcon={<Hash className="h-4 w-4 text-slate-400" />} />
          <Input label="Barcode" value={basic.barcode} onChange={(e) => onChange({ barcode: e.target.value })} placeholder="Optional" />
        </div>
      </section>

      {/* Product Type */}
      <section className="rounded-2xl border-2 border-fuchsia-200 bg-gradient-to-br from-fuchsia-50 to-white p-5 space-y-4">
        <SectionHeader icon={Package} title="Dairy Product Type *" desc="Select the type of dairy product" tone="fuchsia" />

        {Object.entries(groupedTypes).map(([group, types]) => (
          <div key={group}>
            <div className="text-[10px] uppercase tracking-wider font-extrabold text-fuchsia-700 mb-2">{group}</div>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {types.map((t) => {
                const active = basic.productType === t.value;
                return (
                  <button
                    key={t.value} type="button"
                    onClick={() => onChange({ productType: t.value })}
                    className={[
                      'h-16 rounded-xl border-2 text-xs font-extrabold transition flex flex-col items-center justify-center gap-0.5',
                      active ? 'border-fuchsia-600 bg-fuchsia-600 text-white shadow-md scale-105'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-fuchsia-400',
                    ].join(' ')}
                  >
                    <span className="text-xl">{t.emoji}</span>
                    <span className="text-[10px]">{t.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </section>

      {/* Unit + Source */}
      <section className="rounded-2xl border-2 border-slate-200 bg-white p-5 space-y-4">
        <SectionHeader icon={Package} title="Unit & Source" desc="Selling unit + cattle source" />

        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">Selling Unit *</label>
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
            {UNITS.map((u) => {
              const active = basic.unit === u.value;
              return (
                <button
                  key={u.value} type="button"
                  onClick={() => onChange({ unit: u.value })}
                  className={[
                    'h-14 rounded-xl border-2 text-xs font-extrabold transition flex flex-col items-center justify-center gap-0.5',
                    active ? 'border-fuchsia-600 bg-fuchsia-600 text-white shadow-md'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-fuchsia-400',
                  ].join(' ')}
                >
                  <span className="text-lg">{u.emoji}</span>
                  <span className="text-[9px]">{u.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5">Cattle Type</label>
            <select
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:border-fuchsia-500"
              value={basic.cattleType}
              onChange={(e) => onChange({ cattleType: e.target.value })}
            >
              <option value="">-- Select --</option>
              {CATTLE_TYPES.map((c) => (<option key={c} value={c}>{c}</option>))}
            </select>
          </div>
          <Input
            label="Farm Source"
            value={basic.farmSource}
            onChange={(e) => onChange({ farmSource: e.target.value })}
            placeholder="e.g. Local Farm, Own Farm"
          />
        </div>
      </section>

      {/* Pricing */}
      <section className="rounded-2xl border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-5 space-y-4">
        <SectionHeader icon={DollarSign} title="Base Pricing" desc="Cost + sale + wholesale" tone="emerald" />

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Input label="Cost (PKR)" type="number" step="0.01" value={basic.costPrice}
            onChange={(e) => onChange({ costPrice: e.target.value === '' ? '' : Number(e.target.value) })}
            placeholder="0" hint="Purchase rate" />
          <Input label="Sale Price (PKR) *" type="number" step="0.01" value={basic.salePrice}
            onChange={(e) => onChange({ salePrice: e.target.value === '' ? '' : Number(e.target.value) })}
            placeholder="0" hint="Regular rate" />
          <Input label="Wholesale (PKR)" type="number" step="0.01" value={basic.wholesalePrice}
            onChange={(e) => onChange({ wholesalePrice: e.target.value === '' ? '' : Number(e.target.value) })}
            placeholder="Optional" hint="B2B rate" />
          <Input label="Retail (PKR)" type="number" step="0.01" value={basic.retailPrice}
            onChange={(e) => onChange({ retailPrice: e.target.value === '' ? '' : Number(e.target.value) })}
            placeholder="Optional" hint="Shop counter rate" />
        </div>

        {sale > 0 && cost > 0 && (
          <div className={['rounded-xl border-2 p-3 flex items-center justify-between',
            isLoss ? 'bg-rose-50 border-rose-300'
              : margin >= 25 ? 'bg-emerald-50 border-emerald-300'
              : 'bg-amber-50 border-amber-300'].join(' ')}>
            <div className="flex items-center gap-2">
              <TrendingUp className={['h-5 w-5', isLoss ? 'text-rose-700' : margin >= 25 ? 'text-emerald-700' : 'text-amber-700'].join(' ')} />
              <div>
                <div className={['text-[10px] uppercase tracking-wider font-extrabold',
                  isLoss ? 'text-rose-700' : margin >= 25 ? 'text-emerald-700' : 'text-amber-700'].join(' ')}>
                  {isLoss ? '⚠️ Loss Alert' : 'Profit per unit'}
                </div>
                <div className={['text-lg font-extrabold tabular-nums leading-tight',
                  isLoss ? 'text-rose-900' : 'text-slate-900'].join(' ')}>
                  {formatPKRFull(profit)}
                </div>
              </div>
            </div>
            <div className={['text-2xl font-extrabold tabular-nums',
              isLoss ? 'text-rose-700' : margin >= 25 ? 'text-emerald-700' : 'text-amber-700'].join(' ')}>
              {margin.toFixed(1)}%
            </div>
          </div>
        )}

        <Input label="Tax Rate (%)" type="number" step="0.01" value={basic.taxRate}
          onChange={(e) => onChange({ taxRate: e.target.value === '' ? '' : Number(e.target.value) })}
          placeholder="0" hint="GST if applicable" leftIcon={<Percent className="h-4 w-4 text-slate-400" />} />
      </section>

      {/* Settings */}
      <section className="rounded-2xl border-2 border-slate-200 bg-white p-5 space-y-3">
        <SectionHeader icon={Sparkles} title="Product Settings" desc="Featured, best seller, visibility" />

        <div className="grid sm:grid-cols-3 gap-2">
          <label className={['flex items-center gap-3 cursor-pointer p-3 rounded-xl transition border-2',
            basic.isFeatured ? 'border-amber-500 bg-amber-50' : 'border-transparent hover:border-slate-200 hover:bg-slate-50'].join(' ')}>
            <input type="checkbox" checked={basic.isFeatured}
              onChange={(e) => onChange({ isFeatured: e.target.checked })} className="h-5 w-5 rounded" />
            <Star className={['h-5 w-5', basic.isFeatured ? 'text-amber-500 fill-amber-500' : 'text-slate-400'].join(' ')} />
            <div className="flex-1">
              <div className="font-extrabold text-slate-900 text-sm">Featured</div>
              <div className="text-xs text-slate-500 font-semibold">Highlight</div>
            </div>
          </label>
          <label className={['flex items-center gap-3 cursor-pointer p-3 rounded-xl transition border-2',
            basic.isBestSeller ? 'border-emerald-500 bg-emerald-50' : 'border-transparent hover:border-slate-200 hover:bg-slate-50'].join(' ')}>
            <input type="checkbox" checked={basic.isBestSeller}
              onChange={(e) => onChange({ isBestSeller: e.target.checked })} className="h-5 w-5 rounded" />
            <TrendingUp className={['h-5 w-5', basic.isBestSeller ? 'text-emerald-600' : 'text-slate-400'].join(' ')} />
            <div className="flex-1">
              <div className="font-extrabold text-slate-900 text-sm">Best Seller</div>
              <div className="text-xs text-slate-500 font-semibold">Show badge</div>
            </div>
          </label>
          <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl hover:bg-slate-50 transition border-2 border-transparent hover:border-slate-200">
            <input type="checkbox" checked={basic.isActive}
              onChange={(e) => onChange({ isActive: e.target.checked })} className="h-5 w-5 rounded" />
            <Eye className="h-5 w-5 text-slate-600" />
            <div className="flex-1">
              <div className="font-extrabold text-slate-900 text-sm">Active</div>
              <div className="text-xs text-slate-500 font-semibold">Show in POS</div>
            </div>
          </label>
        </div>
      </section>

      {/* Tags */}
      {allTags.length > 0 && (
        <section className="rounded-2xl border-2 border-slate-200 bg-white p-5 space-y-3">
          <SectionHeader icon={Tag} title="Tags" desc="Organize products" />
          <div className="flex flex-wrap gap-2">
            {allTags.map((t) => {
              const active = basic.tagIds?.includes(t.id);
              return (
                <button key={t.id} type="button" onClick={() => toggleTag(t.id)}
                  className={['inline-flex items-center gap-2 px-3 py-1.5 rounded-full border-2 text-sm font-bold transition',
                    active ? 'shadow-sm' : 'opacity-60 hover:opacity-100'].join(' ')}
                  style={{
                    backgroundColor: active ? `${t.color}20` : '#fff',
                    borderColor: active ? t.color : '#e2e8f0',
                    color: active ? t.color : '#475569',
                  }}>
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: t.color }} />
                  {t.name}
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* Images */}
      <section className="rounded-2xl border-2 border-slate-200 bg-white p-5 space-y-3">
        <SectionHeader icon={ImageIcon} title="Product Images" desc="Pehla image primary" />
        <UploadDropzone
          purpose="product-image"
          maxFiles={10}
          onUploaded={(records) => {
            onChange({ imageUrls: [...(basic.imageUrls ?? []), ...records.map((r) => r.url)] });
          }}
          hint="Drop up to 10 images"
        />
        {basic.imageUrls.length > 0 && (
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
            {basic.imageUrls.map((url, idx) => (
              <div key={url + idx} className="relative group aspect-square rounded-xl overflow-hidden border-2 border-slate-200">
                <img src={url} alt={`dairy-${idx}`} className="w-full h-full object-cover" />
                {idx === 0 && (
                  <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded-md bg-fuchsia-600 text-white text-[9px] font-extrabold">PRIMARY</div>
                )}
                <button
                  onClick={() => onChange({ imageUrls: basic.imageUrls.filter((_, i) => i !== idx) })}
                  className="absolute top-1 right-1 h-6 w-6 rounded-full bg-slate-900/80 hover:bg-rose-600 text-white opacity-0 group-hover:opacity-100 transition flex items-center justify-center"
                >×</button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function SectionHeader({ icon: Icon, title, desc, tone = 'slate' }: any) {
  const tones: Record<string, string> = {
    slate: 'from-slate-500 to-slate-700',
    emerald: 'from-emerald-500 to-emerald-700',
    fuchsia: 'from-fuchsia-500 to-pink-700',
  };
  return (
    <div className="flex items-center gap-3 pb-2 border-b-2 border-slate-100">
      <div className={['h-10 w-10 rounded-xl text-white flex items-center justify-center shadow-md bg-gradient-to-br',
        tones[tone] ?? tones.slate].join(' ')}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <h3 className="font-extrabold text-slate-900 text-base leading-tight">{title}</h3>
        <p className="text-xs text-slate-500 font-semibold">{desc}</p>
      </div>
    </div>
  );
}
