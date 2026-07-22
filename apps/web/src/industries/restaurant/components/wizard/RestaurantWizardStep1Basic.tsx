import { useQuery } from '@tanstack/react-query';
import {
  ChefHat, DollarSign, Image as ImageIcon, Sparkles, Star, Eye,
  TrendingUp, Hash, AlertCircle, Clock, Users, Percent, Tag,
  Calendar, Award, Flame,
} from 'lucide-react';
import { Input } from '@core/ui/Input';
import { UploadDropzone } from '@core/components/uploads';
import { categoriesApi } from '@modules/inventory/categories/api/categories.api';
import { brandsApi } from '@modules/inventory/brands/api/brands.api';
import { tagsApi } from '@modules/inventory/tags/api/tags.api';
import { formatPKRFull } from '@core/lib/format';
import type { RestaurantWizardBasic } from '../../hooks/useRestaurantWizard';

interface Props {
  basic: RestaurantWizardBasic;
  onChange: (patch: Partial<RestaurantWizardBasic>) => void;
  onToggleDay: (day: number) => void;
  errors: string[];
}

const UNIT_PRESETS = [
  { value: 'plate', label: 'Plate', hint: '🍽️' },
  { value: 'cup', label: 'Cup', hint: '🥤' },
  { value: 'bowl', label: 'Bowl', hint: '🍜' },
  { value: 'glass', label: 'Glass', hint: '🥛' },
  { value: 'pcs', label: 'Piece', hint: '🔢' },
  { value: 'kg', label: 'Kg', hint: '⚖️' },
  { value: 'liter', label: 'Liter', hint: '🥛' },
  { value: 'gram', label: 'Gram', hint: '⚖️' },
];

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function RestaurantWizardStep1Basic({ basic, onChange, onToggleDay, errors }: Props) {
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
        <SectionHeader icon={ChefHat} title="Menu Item Identity" desc="Naam, category, brand" />
        <Input
          label="Menu Item Name *"
          value={basic.name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="e.g. Chicken Biryani, Zinger Burger, Chai"
          hint="POS aur menu par dikhega"
        />
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-1.5">Description</label>
          <textarea
            rows={2}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
            value={basic.description}
            onChange={(e) => onChange({ description: e.target.value })}
            placeholder="Full description shown to customers..."
          />
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5">Category</label>
            <select
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:border-orange-500"
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
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:border-orange-500"
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
            placeholder="BIR-001" leftIcon={<Hash className="h-4 w-4 text-slate-400" />} />
          <Input label="Barcode" value={basic.barcode} onChange={(e) => onChange({ barcode: e.target.value })} placeholder="Optional" />
        </div>
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">Serving Unit</label>
          <div className="grid grid-cols-4 gap-2">
            {UNIT_PRESETS.map((u) => {
              const active = basic.unit === u.value;
              return (
                <button key={u.value} type="button" onClick={() => onChange({ unit: u.value })}
                  className={['h-16 rounded-xl border-2 text-sm font-extrabold transition flex flex-col items-center justify-center gap-1',
                    active ? 'border-orange-600 bg-orange-600 text-white shadow-md'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-orange-400'].join(' ')}>
                  <span className="text-xl">{u.hint}</span>
                  <span>{u.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="rounded-2xl border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-5 space-y-4">
        <SectionHeader icon={DollarSign} title="Pricing" desc="Menu price + cost tracking" tone="emerald" />
        <div className="grid sm:grid-cols-3 gap-4">
          <Input label="Cost (PKR)" type="number" step="0.01" value={basic.costPrice}
            onChange={(e) => onChange({ costPrice: e.target.value === '' ? '' : Number(e.target.value) })}
            placeholder="0" hint="Ingredient cost estimate" />
          <Input label="Menu Price (PKR) *" type="number" step="0.01" value={basic.salePrice}
            onChange={(e) => onChange({ salePrice: e.target.value === '' ? '' : Number(e.target.value) })}
            placeholder="0" hint="Customer pays" />
          <Input label="Wholesale Price (PKR)" type="number" step="0.01" value={basic.wholesalePrice}
            onChange={(e) => onChange({ wholesalePrice: e.target.value === '' ? '' : Number(e.target.value) })}
            placeholder="Optional" hint="Bulk order rate" />
        </div>
        {sale > 0 && cost > 0 && (
          <div className={['rounded-xl border-2 p-3 flex items-center justify-between',
            isLoss ? 'bg-rose-50 border-rose-300'
              : margin >= 40 ? 'bg-emerald-50 border-emerald-300'
              : 'bg-amber-50 border-amber-300'].join(' ')}>
            <div className="flex items-center gap-2">
              <TrendingUp className={['h-5 w-5', isLoss ? 'text-rose-700' : margin >= 40 ? 'text-emerald-700' : 'text-amber-700'].join(' ')} />
              <div>
                <div className={['text-[10px] uppercase tracking-wider font-extrabold',
                  isLoss ? 'text-rose-700' : margin >= 40 ? 'text-emerald-700' : 'text-amber-700'].join(' ')}>
                  {isLoss ? '⚠️ Loss Alert' : 'Profit per item'}
                </div>
                <div className={['text-lg font-extrabold tabular-nums leading-tight',
                  isLoss ? 'text-rose-900' : 'text-slate-900'].join(' ')}>
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
        <Input label="Tax Rate (%)" type="number" step="0.01" value={basic.taxRate}
          onChange={(e) => onChange({ taxRate: e.target.value === '' ? '' : Number(e.target.value) })}
          placeholder="0" hint="GST if applicable" leftIcon={<Percent className="h-4 w-4 text-slate-400" />} />
      </section>

      {/* Restaurant Details */}
      <section className="rounded-2xl border-2 border-orange-200 bg-gradient-to-br from-orange-50 to-white p-5 space-y-4">
        <SectionHeader icon={Clock} title="Restaurant Details" desc="Prep time, servings, calories" tone="orange" />
        <div className="grid sm:grid-cols-3 gap-4">
          <Input label="Prep Time (min)" type="number" value={basic.prepTimeMinutes}
            onChange={(e) => onChange({ prepTimeMinutes: e.target.value === '' ? '' : Number(e.target.value) })}
            placeholder="15" hint="Kitchen time" leftIcon={<Clock className="h-4 w-4 text-slate-400" />} />
          <Input label="Serves People" type="number" value={basic.servesPeople}
            onChange={(e) => onChange({ servesPeople: e.target.value === '' ? '' : Number(e.target.value) })}
            placeholder="1" hint="Portion size" leftIcon={<Users className="h-4 w-4 text-slate-400" />} />
          <Input label="Calories" type="number" value={basic.calories}
            onChange={(e) => onChange({ calories: e.target.value === '' ? '' : Number(e.target.value) })}
            placeholder="Optional" hint="Per serving" />
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <Input label="Serving Size" value={basic.servingSize} onChange={(e) => onChange({ servingSize: e.target.value })}
            placeholder="1 plate / 500ml" />
          <Input label="Tag Line" value={basic.tagLine} onChange={(e) => onChange({ tagLine: e.target.value })}
            placeholder="New! / Popular / Signature" />
        </div>
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-1.5">Cooking Instructions (kitchen-side)</label>
          <textarea rows={2} value={basic.cookingInstructions}
            onChange={(e) => onChange({ cookingInstructions: e.target.value })}
            placeholder="Grill on medium heat, add spices last..."
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-orange-500" />
        </div>
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-1.5">Allergen Info</label>
          <input value={basic.allergenInfo} onChange={(e) => onChange({ allergenInfo: e.target.value })}
            placeholder="Contains peanuts, dairy, gluten..."
            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:border-orange-500" />
        </div>
      </section>

      {/* Availability */}
      <section className="rounded-2xl border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-white p-5 space-y-4">
        <SectionHeader icon={Calendar} title="Availability Schedule" desc="Time-based menu (optional)" tone="blue" />
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5">Available From</label>
            <input type="time" value={basic.availableFrom} onChange={(e) => onChange({ availableFrom: e.target.value })}
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold focus:outline-none focus:border-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5">Available To</label>
            <input type="time" value={basic.availableTo} onChange={(e) => onChange({ availableTo: e.target.value })}
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold focus:outline-none focus:border-blue-500" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">Days of Week (empty = all days)</label>
          <div className="grid grid-cols-7 gap-1">
            {DAYS.map((day, idx) => {
              const active = basic.availableDays.includes(idx);
              return (
                <button key={day} type="button" onClick={() => onToggleDay(idx)}
                  className={['py-2 rounded-lg text-xs font-extrabold transition',
                    active ? 'bg-blue-600 text-white shadow'
                      : 'bg-white border-2 border-slate-200 text-slate-600 hover:border-blue-300'].join(' ')}>
                  {day}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Settings */}
      <section className="rounded-2xl border-2 border-slate-200 bg-white p-5 space-y-3">
        <SectionHeader icon={Sparkles} title="Menu Settings" desc="Featured, chef special, availability" />
        <div className="grid sm:grid-cols-2 gap-2">
          <label className={['flex items-center gap-3 cursor-pointer p-3 rounded-xl transition border-2',
            basic.chefSpecial ? 'border-amber-500 bg-amber-50' : 'border-transparent hover:border-slate-200 hover:bg-slate-50'].join(' ')}>
            <input type="checkbox" checked={basic.chefSpecial}
              onChange={(e) => onChange({ chefSpecial: e.target.checked })} className="h-5 w-5 rounded" />
            <Star className={['h-5 w-5', basic.chefSpecial ? 'text-amber-500 fill-amber-500' : 'text-slate-400'].join(' ')} />
            <div className="flex-1">
              <div className="font-extrabold text-slate-900 text-sm">Chef Special</div>
              <div className="text-xs text-slate-500 font-semibold">Highlight in menu</div>
            </div>
          </label>
          <label className={['flex items-center gap-3 cursor-pointer p-3 rounded-xl transition border-2',
            basic.bestSeller ? 'border-emerald-500 bg-emerald-50' : 'border-transparent hover:border-slate-200 hover:bg-slate-50'].join(' ')}>
            <input type="checkbox" checked={basic.bestSeller}
              onChange={(e) => onChange({ bestSeller: e.target.checked })} className="h-5 w-5 rounded" />
            <TrendingUp className={['h-5 w-5', basic.bestSeller ? 'text-emerald-600' : 'text-slate-400'].join(' ')} />
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
              <div className="text-xs text-slate-500 font-semibold">Show in POS & menu</div>
            </div>
          </label>
          <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl hover:bg-slate-50 transition border-2 border-transparent hover:border-slate-200">
            <input type="checkbox" checked={basic.isFeatured}
              onChange={(e) => onChange({ isFeatured: e.target.checked })} className="h-5 w-5 rounded" />
            <Award className="h-5 w-5 text-amber-500" />
            <div className="flex-1">
              <div className="font-extrabold text-slate-900 text-sm">Featured</div>
              <div className="text-xs text-slate-500 font-semibold">Show in catalog</div>
            </div>
          </label>
        </div>
      </section>

      {/* Tags */}
      {allTags.length > 0 && (
        <section className="rounded-2xl border-2 border-slate-200 bg-white p-5 space-y-3">
          <SectionHeader icon={Tag} title="Tags" desc="Organize menu items" />
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
        <SectionHeader icon={ImageIcon} title="Menu Images" desc="Pehla image menu par dikhega" />
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
                <img src={url} alt={`menu-${idx}`} className="w-full h-full object-cover" />
                {idx === 0 && (
                  <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded-md bg-orange-600 text-white text-[9px] font-extrabold">PRIMARY</div>
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
    orange: 'from-orange-500 to-red-700',
    blue: 'from-blue-500 to-blue-700',
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
