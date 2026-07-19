import { useQuery } from '@tanstack/react-query';
import {
  Shirt, DollarSign, Image as ImageIcon, Sparkles, Star, Eye,
  TrendingUp, Hash, AlertCircle, Percent, Tag, Award, Zap,
  Palette, Ruler, Users, Package,
} from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { UploadDropzone } from '@/components/uploads';
import { categoriesApi } from '@/api/categories.api';
import { brandsApi } from '@/api/brands.api';
import { tagsApi } from '@/api/tags.api';
import { collectionsApi } from '../../api/collections.api';
import { sizeChartsApi } from '../../api/size-charts.api';
import { formatPKRFull } from '@/lib/format';
import type { GarmentWizardBasic } from '../../hooks/useGarmentWizard';

interface Props {
  basic: GarmentWizardBasic;
  onChange: (patch: Partial<GarmentWizardBasic>) => void;
  errors: string[];
}

const GENDERS = [
  { value: 'MEN', label: 'Men', emoji: '👨' },
  { value: 'WOMEN', label: 'Women', emoji: '👩' },
  { value: 'BOYS', label: 'Boys', emoji: '👦' },
  { value: 'GIRLS', label: 'Girls', emoji: '👧' },
  { value: 'UNISEX', label: 'Unisex', emoji: '👥' },
  { value: 'KIDS', label: 'Kids', emoji: '🧒' },
  { value: 'BABY', label: 'Baby', emoji: '👶' },
];

const CATEGORY_TYPES = [
  { value: 'KURTA', label: 'Kurta', emoji: '👘' },
  { value: 'SHALWAR_KAMEEZ', label: 'Shalwar Kameez', emoji: '👗' },
  { value: 'THREE_PIECE', label: '3-Piece', emoji: '🧥' },
  { value: 'TWO_PIECE', label: '2-Piece', emoji: '🧥' },
  { value: 'SUIT', label: 'Suit', emoji: '🤵' },
  { value: 'WAISTCOAT', label: 'Waistcoat', emoji: '🦺' },
  { value: 'SHIRT', label: 'Shirt', emoji: '👔' },
  { value: 'T_SHIRT', label: 'T-Shirt', emoji: '👕' },
  { value: 'POLO', label: 'Polo', emoji: '👕' },
  { value: 'TROUSER', label: 'Trouser', emoji: '👖' },
  { value: 'JEANS', label: 'Jeans', emoji: '👖' },
  { value: 'SHORTS', label: 'Shorts', emoji: '🩳' },
  { value: 'ABAYA', label: 'Abaya', emoji: '🧕' },
  { value: 'HIJAB', label: 'Hijab', emoji: '🧕' },
  { value: 'DUPATTA', label: 'Dupatta', emoji: '🧣' },
  { value: 'SAREE', label: 'Saree', emoji: '👗' },
  { value: 'LEHENGA', label: 'Lehenga', emoji: '💃' },
  { value: 'FROCK', label: 'Frock', emoji: '👗' },
  { value: 'MAXI', label: 'Maxi', emoji: '👗' },
  { value: 'GOWN', label: 'Gown', emoji: '👗' },
  { value: 'JACKET', label: 'Jacket', emoji: '🧥' },
  { value: 'COAT', label: 'Coat', emoji: '🧥' },
  { value: 'SWEATER', label: 'Sweater', emoji: '🧶' },
  { value: 'HOODIE', label: 'Hoodie', emoji: '👕' },
  { value: 'FABRIC', label: 'Fabric', emoji: '🧵' },
  { value: 'ACCESSORY', label: 'Accessory', emoji: '👜' },
  { value: 'OTHER', label: 'Other', emoji: '📦' },
];

const FABRIC_TYPES = [
  'COTTON', 'LAWN', 'LINEN', 'KHADDAR', 'KARANDI', 'SILK', 'CHIFFON',
  'ORGANZA', 'VELVET', 'DENIM', 'JERSEY', 'WOOL', 'POLYESTER', 'VISCOSE',
  'CAMBRIC', 'NET', 'GEORGETTE', 'LEATHER', 'MIXED', 'OTHER',
];

const WORK_TYPES = [
  { value: 'PLAIN', label: 'Plain' },
  { value: 'PRINTED', label: 'Printed' },
  { value: 'EMBROIDERED', label: 'Embroidered' },
  { value: 'HAND_EMBROIDERED', label: 'Hand Embroidered' },
  { value: 'BLOCK_PRINTED', label: 'Block Printed' },
  { value: 'DIGITAL_PRINTED', label: 'Digital Printed' },
  { value: 'SEQUIN_WORK', label: 'Sequin Work' },
  { value: 'ZARI_WORK', label: 'Zari Work' },
  { value: 'MIRROR_WORK', label: 'Mirror Work' },
  { value: 'PEARL_WORK', label: 'Pearl Work' },
  { value: 'STONE_WORK', label: 'Stone Work' },
  { value: 'LACE_WORK', label: 'Lace Work' },
  { value: 'PATCH_WORK', label: 'Patch Work' },
];

const FIT_TYPES = [
  { value: 'SLIM', label: 'Slim' },
  { value: 'REGULAR', label: 'Regular' },
  { value: 'RELAXED', label: 'Relaxed' },
  { value: 'OVERSIZED', label: 'Oversized' },
  { value: 'SKINNY', label: 'Skinny' },
  { value: 'STRAIGHT', label: 'Straight' },
  { value: 'BOOTCUT', label: 'Bootcut' },
  { value: 'FLARED', label: 'Flared' },
  { value: 'CUSTOM', label: 'Custom' },
];

const SEASONS = [
  { value: 'SPRING', label: 'Spring', emoji: '🌸' },
  { value: 'SUMMER', label: 'Summer', emoji: '☀️' },
  { value: 'AUTUMN', label: 'Autumn', emoji: '🍂' },
  { value: 'WINTER', label: 'Winter', emoji: '❄️' },
  { value: 'ALL_SEASON', label: 'All Season', emoji: '🌍' },
];

export function GarmentWizardStep1Basic({ basic, onChange, errors }: Props) {
  const { data: categories = [] } = useQuery({ queryKey: ['categories'], queryFn: categoriesApi.list });
  const { data: brands = [] } = useQuery({ queryKey: ['brands'], queryFn: () => brandsApi.list() });
  const { data: allTags = [] } = useQuery({ queryKey: ['tags'], queryFn: tagsApi.list });
  const { data: collections = [] } = useQuery({
    queryKey: ['collections-for-wizard'],
    queryFn: () => collectionsApi.list({ active: true }),
  });
  const { data: sizeCharts = [] } = useQuery({
    queryKey: ['size-charts-for-wizard'],
    queryFn: () => sizeChartsApi.list({ active: true }),
  });

  const cost = Number(basic.costPrice || 0);
  const sale = Number(basic.salePrice || 0);
  const profit = sale - cost;
  const margin = sale > 0 ? (profit / sale) * 100 : 0;
  const isLoss = cost > 0 && sale > 0 && profit < 0;

  const toggleTag = (id: string) => {
    const current = basic.tagIds ?? [];
    onChange({ tagIds: current.includes(id) ? current.filter((t) => t !== id) : [...current, id] });
  };

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
        <SectionHeader icon={Shirt} title="Product Identity" desc="Naam, brand, style code" />

        <Input
          label="Product Name *"
          value={basic.name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="e.g. Eid Chikankari Kurta, Winter Wool Coat"
        />

        <div>
          <label className="block text-sm font-bold text-slate-700 mb-1.5">Description</label>
          <textarea
            rows={2}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20"
            value={basic.description}
            onChange={(e) => onChange({ description: e.target.value })}
            placeholder="Style, design, details..."
          />
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5">Category</label>
            <select
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:border-pink-500"
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
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:border-pink-500"
              value={basic.brandId}
              onChange={(e) => onChange({ brandId: e.target.value })}
            >
              <option value="">Select brand</option>
              {brands.map((b) => (<option key={b.id} value={b.id}>{b.name}</option>))}
            </select>
          </div>
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
          <Input label="SKU" value={basic.sku} onChange={(e) => onChange({ sku: e.target.value })}
            placeholder="EID-KURTA-01" leftIcon={<Hash className="h-4 w-4 text-slate-400" />} />
          <Input label="Barcode" value={basic.barcode} onChange={(e) => onChange({ barcode: e.target.value })} placeholder="Optional" />
          <Input label="Style Code" value={basic.styleCode} onChange={(e) => onChange({ styleCode: e.target.value })} placeholder="EID26-001" />
        </div>
      </section>

      {/* Gender + Category Type */}
      <section className="rounded-2xl border-2 border-fuchsia-200 bg-gradient-to-br from-fuchsia-50 to-white p-5 space-y-4">
        <SectionHeader icon={Users} title="Target Audience & Type" desc="Gender aur category" tone="fuchsia" />

        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">Gender</label>
          <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
            {GENDERS.map((g) => {
              const active = basic.gender === g.value;
              return (
                <button
                  key={g.value} type="button"
                  onClick={() => onChange({ gender: g.value as any })}
                  className={[
                    'p-2 rounded-xl border-2 text-center transition',
                    active
                      ? 'border-fuchsia-600 bg-fuchsia-600 text-white shadow-md'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-fuchsia-400',
                  ].join(' ')}
                >
                  <div className="text-xl">{g.emoji}</div>
                  <div className="text-[10px] font-extrabold mt-0.5">{g.label}</div>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">Garment Category</label>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 max-h-64 overflow-y-auto">
            {CATEGORY_TYPES.map((c) => {
              const active = basic.categoryType === c.value;
              return (
                <button
                  key={c.value} type="button"
                  onClick={() => onChange({ categoryType: c.value as any })}
                  className={[
                    'p-2 rounded-xl border-2 text-center transition',
                    active
                      ? 'border-fuchsia-600 bg-fuchsia-600 text-white shadow-md'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-fuchsia-400',
                  ].join(' ')}
                >
                  <div className="text-xl">{c.emoji}</div>
                  <div className="text-[10px] font-extrabold mt-0.5">{c.label}</div>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Fabric & Work */}
      <section className="rounded-2xl border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-white p-5 space-y-4">
        <SectionHeader icon={Palette} title="Fabric & Craftsmanship" desc="Material, work, fit" tone="purple" />

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5">Fabric Type</label>
            <select
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:border-purple-500"
              value={basic.fabricType}
              onChange={(e) => onChange({ fabricType: e.target.value as any })}
            >
              <option value="">Select fabric</option>
              {FABRIC_TYPES.map((f) => (<option key={f} value={f}>{f}</option>))}
            </select>
          </div>
          <Input
            label="Fabric Blend"
            value={basic.fabricBlend}
            onChange={(e) => onChange({ fabricBlend: e.target.value })}
            placeholder="60% Cotton 40% Polyester"
          />
        </div>

        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">Work Type</label>
          <div className="flex flex-wrap gap-1.5">
            {WORK_TYPES.map((w) => {
              const active = basic.workType === w.value;
              return (
                <button
                  key={w.value} type="button"
                  onClick={() => onChange({ workType: w.value as any })}
                  className={[
                    'px-2.5 py-1.5 rounded-lg text-xs font-extrabold border-2 transition',
                    active
                      ? 'border-purple-600 bg-purple-100 text-purple-800'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-purple-300',
                  ].join(' ')}
                >{w.label}</button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">Fit Type</label>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
            {FIT_TYPES.map((f) => {
              const active = basic.fitType === f.value;
              return (
                <button
                  key={f.value} type="button"
                  onClick={() => onChange({ fitType: f.value as any })}
                  className={[
                    'py-2 rounded-lg text-xs font-extrabold border-2 transition',
                    active
                      ? 'border-purple-600 bg-purple-600 text-white'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-purple-300',
                  ].join(' ')}
                >{f.label}</button>
              );
            })}
          </div>
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
          <Input label="Neckline" value={basic.neckline} onChange={(e) => onChange({ neckline: e.target.value })} placeholder="V-neck, Round" />
          <Input label="Sleeve Type" value={basic.sleeveType} onChange={(e) => onChange({ sleeveType: e.target.value })} placeholder="Full, Half" />
          <Input label="Pattern" value={basic.pattern} onChange={(e) => onChange({ pattern: e.target.value })} placeholder="Floral, Stripes" />
        </div>

        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">Season</label>
          <div className="grid grid-cols-5 gap-2">
            {SEASONS.map((s) => {
              const active = basic.season === s.value;
              return (
                <button
                  key={s.value} type="button"
                  onClick={() => onChange({ season: s.value })}
                  className={[
                    'p-2 rounded-xl border-2 text-center transition',
                    active
                      ? 'border-amber-500 bg-amber-100 text-amber-800'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-amber-300',
                  ].join(' ')}
                >
                  <div className="text-xl">{s.emoji}</div>
                  <div className="text-[10px] font-extrabold mt-0.5">{s.label}</div>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Collection & Size Chart */}
      <section className="rounded-2xl border-2 border-slate-200 bg-white p-5 space-y-4">
        <SectionHeader icon={Sparkles} title="Collection & Reference" desc="Link to collection & size chart" />

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5">Collection (optional)</label>
            <select
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:border-fuchsia-500"
              value={basic.collectionId}
              onChange={(e) => onChange({ collectionId: e.target.value })}
            >
              <option value="">No collection</option>
              {collections.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5">Size Chart (optional)</label>
            <select
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:border-cyan-500"
              value={basic.sizeChartId}
              onChange={(e) => onChange({ sizeChartId: e.target.value })}
            >
              <option value="">No size chart</option>
              {sizeCharts.map((s) => (<option key={s.id} value={s.id}>{s.name}</option>))}
            </select>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="rounded-2xl border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-5 space-y-4">
        <SectionHeader icon={DollarSign} title="Pricing" desc="Cost aur sale price" tone="emerald" />

        <div className="grid sm:grid-cols-4 gap-4">
          <Input
            label="Cost (PKR)" type="number" step="0.01"
            value={basic.costPrice}
            onChange={(e) => onChange({ costPrice: e.target.value === '' ? '' : Number(e.target.value) })}
            placeholder="0"
          />
          <Input
            label="Sale (PKR) *" type="number" step="0.01"
            value={basic.salePrice}
            onChange={(e) => onChange({ salePrice: e.target.value === '' ? '' : Number(e.target.value) })}
            placeholder="0"
          />
          <Input
            label="Wholesale (PKR)" type="number" step="0.01"
            value={basic.wholesalePrice}
            onChange={(e) => onChange({ wholesalePrice: e.target.value === '' ? '' : Number(e.target.value) })}
            placeholder="Optional"
          />
          <Input
            label="Tax (%)" type="number" step="0.01"
            value={basic.taxRate}
            onChange={(e) => onChange({ taxRate: e.target.value === '' ? '' : Number(e.target.value) })}
            placeholder="0"
            leftIcon={<Percent className="h-4 w-4 text-slate-400" />}
          />
        </div>

        {sale > 0 && cost > 0 && (
          <div className={[
            'rounded-xl border-2 p-3 flex items-center justify-between',
            isLoss ? 'bg-rose-50 border-rose-300' :
            margin >= 40 ? 'bg-emerald-50 border-emerald-300' :
            'bg-amber-50 border-amber-300',
          ].join(' ')}>
            <div className="flex items-center gap-2">
              <TrendingUp className={['h-5 w-5',
                isLoss ? 'text-rose-700' : margin >= 40 ? 'text-emerald-700' : 'text-amber-700'].join(' ')} />
              <div>
                <div className={['text-[10px] uppercase tracking-wider font-extrabold',
                  isLoss ? 'text-rose-700' : margin >= 40 ? 'text-emerald-700' : 'text-amber-700'].join(' ')}>
                  {isLoss ? '⚠️ Loss Alert' : 'Profit per item'}
                </div>
                <div className="text-lg font-extrabold tabular-nums leading-tight text-slate-900">
                  {formatPKRFull(profit)}
                </div>
              </div>
            </div>
            <div className={['text-2xl font-extrabold tabular-nums',
              isLoss ? 'text-rose-700' : margin >= 40 ? 'text-emerald-700' : 'text-amber-700'].join(' ')}>
              {margin.toFixed(1)}%
            </div>
          </div>
        )}
      </section>

      {/* Marketing Flags */}
      <section className="rounded-2xl border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-white p-5 space-y-3">
        <SectionHeader icon={Star} title="Marketing Badges" desc="Highlight this product" tone="amber" />

        <div className="grid sm:grid-cols-2 gap-2">
          <label className={['flex items-center gap-3 cursor-pointer p-3 rounded-xl transition border-2',
            basic.isNewArrival ? 'border-emerald-500 bg-emerald-50' : 'border-transparent hover:border-slate-200 hover:bg-slate-50'].join(' ')}>
            <input type="checkbox" checked={basic.isNewArrival}
              onChange={(e) => onChange({ isNewArrival: e.target.checked })} className="h-5 w-5 rounded" />
            <Sparkles className={['h-5 w-5', basic.isNewArrival ? 'text-emerald-500' : 'text-slate-400'].join(' ')} />
            <div className="flex-1">
              <div className="font-extrabold text-slate-900 text-sm">New Arrival</div>
              <div className="text-xs text-slate-500 font-semibold">Show "NEW" badge</div>
            </div>
          </label>

          <label className={['flex items-center gap-3 cursor-pointer p-3 rounded-xl transition border-2',
            basic.isBestSeller ? 'border-amber-500 bg-amber-50' : 'border-transparent hover:border-slate-200 hover:bg-slate-50'].join(' ')}>
            <input type="checkbox" checked={basic.isBestSeller}
              onChange={(e) => onChange({ isBestSeller: e.target.checked })} className="h-5 w-5 rounded" />
            <Star className={['h-5 w-5', basic.isBestSeller ? 'text-amber-500 fill-amber-500' : 'text-slate-400'].join(' ')} />
            <div className="flex-1">
              <div className="font-extrabold text-slate-900 text-sm">Best Seller</div>
              <div className="text-xs text-slate-500 font-semibold">Show "BEST" badge</div>
            </div>
          </label>

          <label className={['flex items-center gap-3 cursor-pointer p-3 rounded-xl transition border-2',
            basic.isOnSale ? 'border-rose-500 bg-rose-50' : 'border-transparent hover:border-slate-200 hover:bg-slate-50'].join(' ')}>
            <input type="checkbox" checked={basic.isOnSale}
              onChange={(e) => onChange({ isOnSale: e.target.checked })} className="h-5 w-5 rounded" />
            <Zap className={['h-5 w-5', basic.isOnSale ? 'text-rose-500' : 'text-slate-400'].join(' ')} />
            <div className="flex-1">
              <div className="font-extrabold text-slate-900 text-sm">On Sale</div>
              <div className="text-xs text-slate-500 font-semibold">Show "SALE" badge</div>
            </div>
          </label>

          <label className={['flex items-center gap-3 cursor-pointer p-3 rounded-xl transition border-2',
            basic.isFeatured ? 'border-violet-500 bg-violet-50' : 'border-transparent hover:border-slate-200 hover:bg-slate-50'].join(' ')}>
            <input type="checkbox" checked={basic.isFeatured}
              onChange={(e) => onChange({ isFeatured: e.target.checked })} className="h-5 w-5 rounded" />
            <Award className={['h-5 w-5', basic.isFeatured ? 'text-violet-500' : 'text-slate-400'].join(' ')} />
            <div className="flex-1">
              <div className="font-extrabold text-slate-900 text-sm">Featured</div>
              <div className="text-xs text-slate-500 font-semibold">Highlight in catalog</div>
            </div>
          </label>
        </div>
      </section>

      {/* Tags */}
      {allTags.length > 0 && (
        <section className="rounded-2xl border-2 border-slate-200 bg-white p-5 space-y-3">
          <SectionHeader icon={Tag} title="Tags" desc="Organize" />
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
          maxFiles={15}
          onUploaded={(records) => {
            onChange({ imageUrls: [...(basic.imageUrls ?? []), ...records.map((r) => r.url)] });
          }}
          hint="Drop up to 15 images (front, back, close-up, model)"
        />

        {basic.imageUrls.length > 0 && (
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
            {basic.imageUrls.map((url, idx) => (
              <div key={url + idx} className="relative group aspect-square rounded-xl overflow-hidden border-2 border-slate-200">
                <img src={url} alt={`garment-${idx}`} className="w-full h-full object-cover" />
                {idx === 0 && (
                  <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded-md bg-pink-600 text-white text-[9px] font-extrabold">PRIMARY</div>
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
    pink: 'from-pink-500 to-fuchsia-700',
    fuchsia: 'from-fuchsia-500 to-pink-700',
    purple: 'from-purple-500 to-violet-700',
    amber: 'from-amber-500 to-orange-700',
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
