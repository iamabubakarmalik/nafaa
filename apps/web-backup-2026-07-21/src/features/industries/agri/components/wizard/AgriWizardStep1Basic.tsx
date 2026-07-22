import { useQuery } from '@tanstack/react-query';
import {
  Wheat, DollarSign, Image as ImageIcon, Sparkles, Star, Eye,
  TrendingUp, Hash, AlertCircle, Tag, Percent, Package,
} from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { UploadDropzone } from '@/components/uploads';
import { categoriesApi } from '@/api/categories.api';
import { brandsApi } from '@/api/brands.api';
import { tagsApi } from '@/api/tags.api';
import { formatPKRFull } from '@/lib/format';
import type { AgriWizardBasic, AgriCategory, SeedType, FertilizerType, FeedType } from '../../hooks/useAgriWizard';

interface Props {
  basic: AgriWizardBasic;
  onChange: (patch: Partial<AgriWizardBasic>) => void;
  errors: string[];
}

const AGRI_CATEGORIES: { value: AgriCategory; label: string; emoji: string }[] = [
  { value: 'SEEDS', label: 'Seeds', emoji: '🌱' },
  { value: 'FERTILIZER', label: 'Fertilizer', emoji: '🧪' },
  { value: 'PESTICIDE', label: 'Pesticide', emoji: '💊' },
  { value: 'HERBICIDE', label: 'Herbicide', emoji: '🌿' },
  { value: 'FUNGICIDE', label: 'Fungicide', emoji: '🍄' },
  { value: 'INSECTICIDE', label: 'Insecticide', emoji: '🐛' },
  { value: 'ANIMAL_FEED', label: 'Animal Feed', emoji: '🐄' },
  { value: 'POULTRY_FEED', label: 'Poultry Feed', emoji: '🐔' },
  { value: 'CATTLE_FEED', label: 'Cattle Feed', emoji: '🐮' },
  { value: 'FISH_FEED', label: 'Fish Feed', emoji: '🐟' },
  { value: 'VETERINARY_MEDICINE', label: 'Vet Medicine', emoji: '💉' },
  { value: 'FARM_TOOLS', label: 'Farm Tools', emoji: '🔧' },
  { value: 'IRRIGATION', label: 'Irrigation', emoji: '💧' },
  { value: 'MACHINERY_PART', label: 'Machinery Parts', emoji: '⚙️' },
  { value: 'ORGANIC_INPUT', label: 'Organic Input', emoji: '🍃' },
  { value: 'OTHER', label: 'Other', emoji: '📦' },
];

const SEED_TYPES: { value: SeedType; label: string }[] = [
  { value: 'WHEAT', label: 'Wheat' }, { value: 'RICE', label: 'Rice' },
  { value: 'COTTON', label: 'Cotton' }, { value: 'MAIZE', label: 'Maize' },
  { value: 'SUGARCANE', label: 'Sugarcane' }, { value: 'POTATO', label: 'Potato' },
  { value: 'ONION', label: 'Onion' }, { value: 'TOMATO', label: 'Tomato' },
  { value: 'CHILLI', label: 'Chilli' }, { value: 'PULSES', label: 'Pulses' },
  { value: 'VEGETABLES', label: 'Vegetables' }, { value: 'FRUITS', label: 'Fruits' },
  { value: 'FODDER', label: 'Fodder' }, { value: 'OILSEEDS', label: 'Oilseeds' },
  { value: 'OTHER', label: 'Other' },
];

const FERTILIZER_TYPES: { value: FertilizerType; label: string }[] = [
  { value: 'UREA', label: 'Urea' }, { value: 'DAP', label: 'DAP' },
  { value: 'NPK', label: 'NPK' }, { value: 'POTASH', label: 'Potash' },
  { value: 'ZINC', label: 'Zinc' }, { value: 'SULFUR', label: 'Sulfur' },
  { value: 'BORON', label: 'Boron' }, { value: 'MICRONUTRIENT', label: 'Micronutrient' },
  { value: 'ORGANIC', label: 'Organic' }, { value: 'BIO_FERTILIZER', label: 'Bio Fertilizer' },
  { value: 'LIQUID', label: 'Liquid' }, { value: 'FOLIAR', label: 'Foliar' },
  { value: 'OTHER', label: 'Other' },
];

const FEED_TYPES: { value: FeedType; label: string }[] = [
  { value: 'STARTER', label: 'Starter' }, { value: 'GROWER', label: 'Grower' },
  { value: 'FINISHER', label: 'Finisher' }, { value: 'LAYER', label: 'Layer' },
  { value: 'BREEDER', label: 'Breeder' }, { value: 'MILK_REPLACER', label: 'Milk Replacer' },
  { value: 'MINERAL_MIX', label: 'Mineral Mix' }, { value: 'CONCENTRATE', label: 'Concentrate' },
  { value: 'ROUGHAGE', label: 'Roughage' }, { value: 'SILAGE', label: 'Silage' },
  { value: 'HAY', label: 'Hay' }, { value: 'BRAN', label: 'Bran' },
  { value: 'OIL_CAKE', label: 'Oil Cake' }, { value: 'MOLASSES', label: 'Molasses' },
  { value: 'OTHER', label: 'Other' },
];

const UNIT_PRESETS = [
  { value: 'bag', label: 'Bag', hint: '🛍️' },
  { value: 'kg', label: 'Kg', hint: '⚖️' },
  { value: 'liter', label: 'Liter', hint: '🥛' },
  { value: 'ton', label: 'Ton', hint: '⚖️' },
  { value: 'pcs', label: 'Piece', hint: '🔢' },
  { value: 'packet', label: 'Packet', hint: '📦' },
  { value: 'acre', label: 'Per Acre', hint: '🌾' },
  { value: 'ml', label: 'ML', hint: '🥛' },
];

export function AgriWizardStep1Basic({ basic, onChange, errors }: Props) {
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

  const showSeedType = basic.agriCategory === 'SEEDS';
  const showFertilizerType = basic.agriCategory === 'FERTILIZER';
  const showFeedType = ['ANIMAL_FEED', 'POULTRY_FEED', 'CATTLE_FEED', 'FISH_FEED'].includes(basic.agriCategory);

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
        <SectionHeader icon={Wheat} title="Product Identity" desc="Naam, category, brand" />
        <Input
          label="Product Name *"
          value={basic.name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="e.g. Urea Fertilizer 50kg, Cotton Seed BX-777, Poultry Feed Starter"
          hint="POS aur receipt par dikhega"
        />
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-1.5">Description</label>
          <textarea
            rows={2}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-lime-500 focus:ring-2 focus:ring-lime-500/20"
            value={basic.description}
            onChange={(e) => onChange({ description: e.target.value })}
            placeholder="Short description for POS..."
          />
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5">Category</label>
            <select
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:border-lime-500"
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
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:border-lime-500"
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
            placeholder="UREA-50KG" leftIcon={<Hash className="h-4 w-4 text-slate-400" />} />
          <Input label="Barcode" value={basic.barcode} onChange={(e) => onChange({ barcode: e.target.value })}
            placeholder="8901234567890" />
        </div>
      </section>

      {/* Agri Category */}
      <section className="rounded-2xl border-2 border-lime-200 bg-gradient-to-br from-lime-50 to-white p-5 space-y-4">
        <SectionHeader icon={Package} title="Agri Category" desc="Product kis type ka hai" tone="lime" />
        <div className="grid grid-cols-4 gap-2">
          {AGRI_CATEGORIES.map((cat) => {
            const active = basic.agriCategory === cat.value;
            return (
              <button
                key={cat.value}
                type="button"
                onClick={() => onChange({ agriCategory: cat.value })}
                className={[
                  'h-16 rounded-xl border-2 text-sm font-extrabold transition flex flex-col items-center justify-center gap-1',
                  active ? 'border-lime-600 bg-lime-600 text-white shadow-md'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-lime-400',
                ].join(' ')}
              >
                <span className="text-xl">{cat.emoji}</span>
                <span className="text-[10px] text-center leading-tight">{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* Category-specific sub-type */}
        {showSeedType && (
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5">Seed Type</label>
            <select
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold focus:outline-none focus:border-lime-500"
              value={basic.seedType}
              onChange={(e) => onChange({ seedType: e.target.value as SeedType })}
            >
              <option value="">-- Select Seed Type --</option>
              {SEED_TYPES.map((s) => (<option key={s.value} value={s.value}>{s.label}</option>))}
            </select>
          </div>
        )}
        {showFertilizerType && (
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5">Fertilizer Type</label>
            <select
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold focus:outline-none focus:border-lime-500"
              value={basic.fertilizerType}
              onChange={(e) => onChange({ fertilizerType: e.target.value as FertilizerType })}
            >
              <option value="">-- Select Fertilizer Type --</option>
              {FERTILIZER_TYPES.map((f) => (<option key={f.value} value={f.value}>{f.label}</option>))}
            </select>
          </div>
        )}
        {showFeedType && (
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5">Feed Type</label>
            <select
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold focus:outline-none focus:border-lime-500"
              value={basic.feedType}
              onChange={(e) => onChange({ feedType: e.target.value as FeedType })}
            >
              <option value="">-- Select Feed Type --</option>
              {FEED_TYPES.map((f) => (<option key={f.value} value={f.value}>{f.label}</option>))}
            </select>
          </div>
        )}
        <Input
          label="Sub-Category (optional)"
          value={basic.subCategory}
          onChange={(e) => onChange({ subCategory: e.target.value })}
          placeholder="e.g. Liquid, Granular, Coated"
        />
      </section>

      {/* Unit */}
      <section className="rounded-2xl border-2 border-sky-200 bg-gradient-to-br from-sky-50 to-white p-5 space-y-4">
        <SectionHeader icon={Package} title="Base Selling Unit" desc="Ye main unit hai" tone="sky" />
        <div className="grid grid-cols-4 gap-2">
          {UNIT_PRESETS.map((u) => {
            const active = basic.baseUnit === u.value;
            return (
              <button key={u.value} type="button" onClick={() => onChange({ baseUnit: u.value })}
                className={['h-16 rounded-xl border-2 text-sm font-extrabold transition flex flex-col items-center justify-center gap-1',
                  active ? 'border-sky-600 bg-sky-600 text-white shadow-md'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-sky-400'].join(' ')}>
                <span className="text-xl">{u.hint}</span>
                <span>{u.label}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Pricing */}
      <section className="rounded-2xl border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-5 space-y-4">
        <SectionHeader icon={DollarSign} title="Pricing" desc="Cost aur sale price" tone="emerald" />
        <div className="grid sm:grid-cols-3 gap-4">
          <Input label="Cost (PKR)" type="number" step="0.01" value={basic.costPrice}
            onChange={(e) => onChange({ costPrice: e.target.value === '' ? '' : Number(e.target.value) })}
            placeholder="0" hint="Purchase rate" />
          <Input label="Sale Price (PKR) *" type="number" step="0.01" value={basic.salePrice}
            onChange={(e) => onChange({ salePrice: e.target.value === '' ? '' : Number(e.target.value) })}
            placeholder="0" hint="Customer rate" />
          <Input label="Wholesale (PKR)" type="number" step="0.01" value={basic.wholesalePrice}
            onChange={(e) => onChange({ wholesalePrice: e.target.value === '' ? '' : Number(e.target.value) })}
            placeholder="Optional" hint="Bulk rate" />
        </div>
        {sale > 0 && cost > 0 && (
          <div className={['rounded-xl border-2 p-3 flex items-center justify-between',
            isLoss ? 'bg-rose-50 border-rose-300' :
            margin >= 25 ? 'bg-emerald-50 border-emerald-300' : 'bg-amber-50 border-amber-300'].join(' ')}>
            <div className="flex items-center gap-2">
              <TrendingUp className={['h-5 w-5', isLoss ? 'text-rose-700' : margin >= 25 ? 'text-emerald-700' : 'text-amber-700'].join(' ')} />
              <div>
                <div className={['text-[10px] uppercase tracking-wider font-extrabold',
                  isLoss ? 'text-rose-700' : margin >= 25 ? 'text-emerald-700' : 'text-amber-700'].join(' ')}>
                  {isLoss ? '⚠️ Loss Alert' : 'Profit per ' + basic.baseUnit}
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
          placeholder="0" leftIcon={<Percent className="h-4 w-4 text-slate-400" />} />
      </section>

      {/* Settings */}
      <section className="rounded-2xl border-2 border-slate-200 bg-white p-5 space-y-3">
        <SectionHeader icon={Sparkles} title="Product Settings" desc="Visibility aur featured" />
        <div className="grid sm:grid-cols-2 gap-2">
          <label className={['flex items-center gap-3 cursor-pointer p-3 rounded-xl transition border-2',
            basic.isActive ? 'border-blue-500 bg-blue-50' : 'border-transparent hover:border-slate-200 hover:bg-slate-50'].join(' ')}>
            <input type="checkbox" checked={basic.isActive}
              onChange={(e) => onChange({ isActive: e.target.checked })} className="h-5 w-5 rounded" />
            <Eye className="h-5 w-5 text-slate-600" />
            <div className="flex-1">
              <div className="font-extrabold text-slate-900 text-sm">Active</div>
              <div className="text-xs text-slate-500 font-semibold">POS aur catalog mein visible</div>
            </div>
          </label>
          <label className={['flex items-center gap-3 cursor-pointer p-3 rounded-xl transition border-2',
            basic.isFeatured ? 'border-amber-500 bg-amber-50' : 'border-transparent hover:border-slate-200 hover:bg-slate-50'].join(' ')}>
            <input type="checkbox" checked={basic.isFeatured}
              onChange={(e) => onChange({ isFeatured: e.target.checked })} className="h-5 w-5 rounded" />
            <Star className={['h-5 w-5', basic.isFeatured ? 'text-amber-500 fill-amber-500' : 'text-slate-400'].join(' ')} />
            <div className="flex-1">
              <div className="font-extrabold text-slate-900 text-sm">Featured</div>
              <div className="text-xs text-slate-500 font-semibold">Catalog mein highlight</div>
            </div>
          </label>
        </div>
      </section>

      {/* Tags */}
      {allTags.length > 0 && (
        <section className="rounded-2xl border-2 border-slate-200 bg-white p-5 space-y-3">
          <SectionHeader icon={Tag} title="Tags" desc="Product organize karo" />
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
                <img src={url} alt={`agri-${idx}`} className="w-full h-full object-cover" />
                {idx === 0 && (
                  <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded-md bg-lime-600 text-white text-[9px] font-extrabold">PRIMARY</div>
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
    lime: 'from-lime-500 to-green-700',
    sky: 'from-sky-500 to-cyan-700',
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
