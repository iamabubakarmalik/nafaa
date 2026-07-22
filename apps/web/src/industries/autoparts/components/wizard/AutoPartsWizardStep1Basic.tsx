import { useQuery } from '@tanstack/react-query';
import {
  Package, DollarSign, Image as ImageIcon, Sparkles, Star, Eye,
  TrendingUp, Hash, AlertCircle, Percent, Tag, Barcode as BarcodeIcon,
  Wrench, Award,
} from 'lucide-react';
import { Input } from '@core/ui/Input';
import { UploadDropzone } from '@core/components/uploads';
import { categoriesApi } from '@modules/inventory/categories/api/categories.api';
import { brandsApi } from '@modules/inventory/brands/api/brands.api';
import { tagsApi } from '@modules/inventory/tags/api/tags.api';
import { formatPKRFull } from '@core/lib/format';
import type { AutoPartsWizardBasic } from '../../hooks/useAutoPartsWizard';
import type { PartCategory } from '../../api/part-profiles.api';

interface Props {
  basic: AutoPartsWizardBasic;
  onChange: (patch: Partial<AutoPartsWizardBasic>) => void;
  errors: string[];
}

const PART_CATEGORIES: { value: PartCategory; label: string; emoji: string; group: string }[] = [
  { value: 'ENGINE', label: 'Engine', emoji: '⚙️', group: 'Powertrain' },
  { value: 'TRANSMISSION', label: 'Transmission', emoji: '🔧', group: 'Powertrain' },
  { value: 'DRIVETRAIN', label: 'Drivetrain', emoji: '⚙️', group: 'Powertrain' },
  { value: 'BRAKES', label: 'Brakes', emoji: '🛑', group: 'Safety' },
  { value: 'SUSPENSION', label: 'Suspension', emoji: '🔩', group: 'Chassis' },
  { value: 'STEERING', label: 'Steering', emoji: '🎯', group: 'Chassis' },
  { value: 'TIRES_WHEELS', label: 'Tires & Wheels', emoji: '🛞', group: 'Chassis' },
  { value: 'ELECTRICAL', label: 'Electrical', emoji: '⚡', group: 'Electrical' },
  { value: 'BATTERY', label: 'Battery', emoji: '🔋', group: 'Electrical' },
  { value: 'IGNITION', label: 'Ignition', emoji: '🔥', group: 'Electrical' },
  { value: 'LIGHTING', label: 'Lighting', emoji: '💡', group: 'Electrical' },
  { value: 'SENSORS', label: 'Sensors', emoji: '📡', group: 'Electrical' },
  { value: 'COOLING', label: 'Cooling', emoji: '❄️', group: 'Systems' },
  { value: 'AC_HEATING', label: 'A/C & Heating', emoji: '🌡️', group: 'Systems' },
  { value: 'EXHAUST', label: 'Exhaust', emoji: '💨', group: 'Systems' },
  { value: 'FUEL_SYSTEM', label: 'Fuel System', emoji: '⛽', group: 'Systems' },
  { value: 'FILTERS', label: 'Filters', emoji: '🌀', group: 'Consumables' },
  { value: 'OILS_FLUIDS', label: 'Oils & Fluids', emoji: '🛢️', group: 'Consumables' },
  { value: 'BELTS_HOSES', label: 'Belts & Hoses', emoji: '🔗', group: 'Consumables' },
  { value: 'GASKETS', label: 'Gaskets', emoji: '⭕', group: 'Consumables' },
  { value: 'BEARINGS', label: 'Bearings', emoji: '⚙️', group: 'Consumables' },
  { value: 'BODY', label: 'Body', emoji: '🚗', group: 'Exterior' },
  { value: 'INTERIOR', label: 'Interior', emoji: '🪑', group: 'Interior' },
  { value: 'ACCESSORIES', label: 'Accessories', emoji: '✨', group: 'Other' },
  { value: 'TOOLS', label: 'Tools', emoji: '🔨', group: 'Other' },
  { value: 'CONSUMABLES', label: 'Consumables', emoji: '📦', group: 'Other' },
  { value: 'OTHER', label: 'Other', emoji: '📦', group: 'Other' },
];

const UNIT_PRESETS = [
  { value: 'pcs', label: 'Piece', hint: '🔢' },
  { value: 'set', label: 'Set', hint: '📦' },
  { value: 'pair', label: 'Pair', hint: '🔗' },
  { value: 'liter', label: 'Liter', hint: '🛢️' },
  { value: 'ml', label: 'mL', hint: '🛢️' },
  { value: 'meter', label: 'Meter', hint: '📏' },
  { value: 'feet', label: 'Feet', hint: '📏' },
  { value: 'kg', label: 'Kg', hint: '⚖️' },
];

export function AutoPartsWizardStep1Basic({ basic, onChange, errors }: Props) {
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

  // Group categories
  const groupedCategories = PART_CATEGORIES.reduce((acc, cat) => {
    if (!acc[cat.group]) acc[cat.group] = [];
    acc[cat.group].push(cat);
    return acc;
  }, {} as Record<string, typeof PART_CATEGORIES>);

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
        <SectionHeader icon={Package} title="Part Identity" desc="Name, category, brand" />

        <Input
          label="Part Name *"
          value={basic.name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="e.g. Front Brake Pad Set, Oil Filter, Spark Plug"
          hint="POS aur catalog par dikhega"
        />

        <div>
          <label className="block text-sm font-bold text-slate-700 mb-1.5">Description</label>
          <textarea
            rows={2}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-500/20"
            value={basic.description}
            onChange={(e) => onChange({ description: e.target.value })}
            placeholder="Features, specifications, fitment notes..."
          />
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5">Category</label>
            <select
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:border-slate-500"
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
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:border-slate-500"
              value={basic.brandId}
              onChange={(e) => onChange({ brandId: e.target.value })}
            >
              <option value="">Select brand</option>
              {brands.map((b) => (<option key={b.id} value={b.id}>{b.name}</option>))}
            </select>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <Input
            label="SKU / Code"
            value={basic.sku}
            onChange={(e) => onChange({ sku: e.target.value })}
            placeholder="BRK-PAD-001"
            leftIcon={<Hash className="h-4 w-4 text-slate-400" />}
          />
          <Input
            label="Barcode"
            value={basic.barcode}
            onChange={(e) => onChange({ barcode: e.target.value })}
            placeholder="Scan or type"
            leftIcon={<BarcodeIcon className="h-4 w-4 text-slate-400" />}
          />
        </div>
      </section>

      {/* Part Category (Auto-parts specific) */}
      <section className="rounded-2xl border-2 border-orange-200 bg-gradient-to-br from-orange-50 to-white p-5 space-y-4">
        <SectionHeader icon={Wrench} title="Part Type Classification *" desc="System/component category" tone="orange" />

        {Object.entries(groupedCategories).map(([group, cats]) => (
          <div key={group}>
            <div className="text-[10px] uppercase tracking-wider font-extrabold text-orange-700 mb-2">{group}</div>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {cats.map((cat) => {
                const active = basic.partCategory === cat.value;
                return (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => onChange({ partCategory: cat.value })}
                    className={[
                      'p-2.5 rounded-xl border-2 text-center transition',
                      active
                        ? 'border-orange-600 bg-orange-100 shadow-md scale-105'
                        : 'border-slate-200 bg-white hover:border-orange-400',
                    ].join(' ')}
                  >
                    <div className="text-xl mb-0.5">{cat.emoji}</div>
                    <div className={['text-[10px] font-extrabold leading-tight',
                      active ? 'text-orange-900' : 'text-slate-700'].join(' ')}>
                      {cat.label}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        <Input
          label="Sub-Category (optional)"
          value={basic.subCategory}
          onChange={(e) => onChange({ subCategory: e.target.value })}
          placeholder="e.g. Ceramic pads, Synthetic oil"
          hint="More specific classification"
        />
      </section>

      {/* Unit */}
      <section className="rounded-2xl border-2 border-slate-200 bg-white p-5">
        <SectionHeader icon={Package} title="Selling Unit" desc="Piece, set, liter, meter..." />
        <div className="grid grid-cols-4 gap-2 mt-3">
          {UNIT_PRESETS.map((u) => {
            const active = basic.unit === u.value;
            return (
              <button key={u.value} type="button"
                onClick={() => onChange({ unit: u.value })}
                className={[
                  'h-16 rounded-xl border-2 text-sm font-extrabold transition flex flex-col items-center justify-center gap-1',
                  active ? 'border-slate-700 bg-slate-700 text-white shadow-md'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-400',
                ].join(' ')}>
                <span className="text-xl">{u.hint}</span>
                <span>{u.label}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Pricing */}
      <section className="rounded-2xl border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-5 space-y-4">
        <SectionHeader icon={DollarSign} title="Pricing" desc="Cost, sale, wholesale" tone="emerald" />

        <div className="grid sm:grid-cols-3 gap-4">
          <Input
            label="Cost (PKR)"
            type="number" step="0.01"
            value={basic.costPrice}
            onChange={(e) => onChange({ costPrice: e.target.value === '' ? '' : Number(e.target.value) })}
            placeholder="0"
            hint="Purchase rate"
          />
          <Input
            label="Sale (PKR) *"
            type="number" step="0.01"
            value={basic.salePrice}
            onChange={(e) => onChange({ salePrice: e.target.value === '' ? '' : Number(e.target.value) })}
            placeholder="0"
            hint="Retail rate"
          />
          <Input
            label="Wholesale (PKR)"
            type="number" step="0.01"
            value={basic.wholesalePrice}
            onChange={(e) => onChange({ wholesalePrice: e.target.value === '' ? '' : Number(e.target.value) })}
            placeholder="Optional"
            hint="Workshop/dealer rate"
          />
        </div>

        {sale > 0 && cost > 0 && (
          <div className={[
            'rounded-xl border-2 p-3 flex items-center justify-between',
            isLoss ? 'bg-rose-50 border-rose-300' :
            margin >= 30 ? 'bg-emerald-50 border-emerald-300' :
            'bg-amber-50 border-amber-300',
          ].join(' ')}>
            <div className="flex items-center gap-2">
              <TrendingUp className={['h-5 w-5',
                isLoss ? 'text-rose-700' : margin >= 30 ? 'text-emerald-700' : 'text-amber-700'].join(' ')} />
              <div>
                <div className={['text-[10px] uppercase tracking-wider font-extrabold',
                  isLoss ? 'text-rose-700' : margin >= 30 ? 'text-emerald-700' : 'text-amber-700'].join(' ')}>
                  {isLoss ? '⚠️ Loss Alert' : 'Profit per unit'}
                </div>
                <div className={['text-lg font-extrabold tabular-nums leading-tight',
                  isLoss ? 'text-rose-900' : 'text-slate-900'].join(' ')}>
                  {formatPKRFull(profit)}
                </div>
              </div>
            </div>
            <div className={['text-2xl font-extrabold tabular-nums',
              isLoss ? 'text-rose-700' : margin >= 30 ? 'text-emerald-700' : 'text-amber-700'].join(' ')}>
              {margin.toFixed(1)}%
            </div>
          </div>
        )}

        <div className="grid sm:grid-cols-3 gap-4">
          <Input
            label="Tax Rate (%)"
            type="number" step="0.01"
            value={basic.taxRate}
            onChange={(e) => onChange({ taxRate: e.target.value === '' ? '' : Number(e.target.value) })}
            placeholder="0"
            leftIcon={<Percent className="h-4 w-4 text-slate-400" />}
          />
          <Input
            label={`Stock (${basic.unit})`}
            type="number" step="0.01"
            value={basic.stock}
            onChange={(e) => onChange({ stock: e.target.value === '' ? '' : Number(e.target.value) })}
            placeholder="0"
            hint="Current on-hand"
          />
          <Input
            label="Low Stock Alert"
            type="number" step="1"
            value={basic.lowStockAlert}
            onChange={(e) => onChange({ lowStockAlert: e.target.value === '' ? '' : Number(e.target.value) })}
            placeholder="5"
            hint="Warning threshold"
          />
        </div>
      </section>

      {/* Settings */}
      <section className="rounded-2xl border-2 border-slate-200 bg-white p-5 space-y-3">
        <SectionHeader icon={Sparkles} title="Product Settings" desc="Visibility & display" />

        <div className="grid sm:grid-cols-2 gap-2">
          <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl hover:bg-slate-50 transition border-2 border-transparent hover:border-slate-200">
            <input type="checkbox" checked={basic.isActive}
              onChange={(e) => onChange({ isActive: e.target.checked })} className="h-5 w-5 rounded" />
            <Eye className="h-5 w-5 text-slate-600" />
            <div className="flex-1">
              <div className="font-extrabold text-slate-900 text-sm">Active</div>
              <div className="text-xs text-slate-500 font-semibold">Show in POS & catalog</div>
            </div>
          </label>

          <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl hover:bg-slate-50 transition border-2 border-transparent hover:border-slate-200">
            <input type="checkbox" checked={basic.isFeatured}
              onChange={(e) => onChange({ isFeatured: e.target.checked })} className="h-5 w-5 rounded" />
            <Star className="h-5 w-5 text-amber-500" />
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
          <SectionHeader icon={Tag} title="Tags" desc="Organize parts" />
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
        <SectionHeader icon={ImageIcon} title="Part Images" desc="First image primary" />
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
                <img src={url} alt={`part-${idx}`} className="w-full h-full object-cover" />
                {idx === 0 && (
                  <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded-md bg-slate-700 text-white text-[9px] font-extrabold">PRIMARY</div>
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
    orange: 'from-orange-500 to-red-600',
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
