import { useQuery } from '@tanstack/react-query';
import {
  Beef, DollarSign, Image as ImageIcon, Sparkles, Star, Eye,
  TrendingUp, Hash, AlertCircle, Weight, Percent, Tag,
  Award, Package, Scissors,
} from 'lucide-react';
import { Input } from '@core/ui/Input';
import { UploadDropzone } from '@core/components/uploads';
import { categoriesApi } from '@modules/inventory/categories/api/categories.api';
import { brandsApi } from '@modules/inventory/brands/api/brands.api';
import { tagsApi } from '@modules/inventory/tags/api/tags.api';
import { formatPKRFull } from '@core/lib/format';
import type { MeatWizardBasic } from '../../hooks/useMeatWizard';
import type { AnimalType, CutCategory, FreshnessType, SaleUnit } from '../../api/products.api';

interface Props {
  basic: MeatWizardBasic;
  onChange: (patch: Partial<MeatWizardBasic>) => void;
  errors: string[];
}

const ANIMAL_TYPES: { value: AnimalType; label: string; emoji: string }[] = [
  { value: 'BEEF', label: 'Beef', emoji: '🐄' },
  { value: 'MUTTON', label: 'Mutton', emoji: '🐑' },
  { value: 'GOAT', label: 'Goat', emoji: '🐐' },
  { value: 'LAMB', label: 'Lamb', emoji: '🐏' },
  { value: 'CHICKEN', label: 'Chicken', emoji: '🐔' },
  { value: 'DUCK', label: 'Duck', emoji: '🦆' },
  { value: 'TURKEY', label: 'Turkey', emoji: '🦃' },
  { value: 'QUAIL', label: 'Quail', emoji: '🐦' },
  { value: 'CAMEL', label: 'Camel', emoji: '🐫' },
  { value: 'BUFFALO', label: 'Buffalo', emoji: '🐃' },
  { value: 'FISH', label: 'Fish', emoji: '🐟' },
  { value: 'PRAWN', label: 'Prawn', emoji: '🦐' },
];

const CUT_CATEGORIES: { value: CutCategory; label: string; group: string }[] = [
  { value: 'WHOLE_ANIMAL', label: 'Whole Animal', group: 'Whole' },
  { value: 'HALF_ANIMAL', label: 'Half', group: 'Whole' },
  { value: 'QUARTER', label: 'Quarter', group: 'Whole' },
  { value: 'PRIMAL_CUT', label: 'Primal Cut', group: 'Primary' },
  { value: 'RETAIL_CUT', label: 'Retail Cut', group: 'Primary' },
  { value: 'BONELESS', label: 'Boneless', group: 'Primary' },
  { value: 'WITH_BONE', label: 'With Bone', group: 'Primary' },
  { value: 'MINCE', label: 'Mince/Qeema', group: 'Primary' },
  { value: 'UNDERCUT', label: 'Undercut', group: 'Cuts' },
  { value: 'RIBS', label: 'Ribs', group: 'Cuts' },
  { value: 'CHOPS', label: 'Chops', group: 'Cuts' },
  { value: 'BREAST', label: 'Breast', group: 'Parts' },
  { value: 'LEG', label: 'Leg/Raan', group: 'Parts' },
  { value: 'THIGH', label: 'Thigh', group: 'Parts' },
  { value: 'WING', label: 'Wing', group: 'Parts' },
  { value: 'DRUMSTICK', label: 'Drumstick', group: 'Parts' },
  { value: 'LIVER', label: 'Liver/Kaleji', group: 'Offal' },
  { value: 'KIDNEY', label: 'Kidney/Gurda', group: 'Offal' },
  { value: 'HEART', label: 'Heart', group: 'Offal' },
  { value: 'BRAIN', label: 'Brain/Maghaz', group: 'Offal' },
  { value: 'TONGUE', label: 'Tongue', group: 'Offal' },
  { value: 'TROTTERS', label: 'Trotters/Paye', group: 'Offal' },
  { value: 'HEAD', label: 'Head/Sri', group: 'Offal' },
  { value: 'BONES', label: 'Bones', group: 'Other' },
];

const FRESHNESS: { value: FreshnessType; label: string; emoji: string }[] = [
  { value: 'LIVE', label: 'Live', emoji: '🐄' },
  { value: 'FRESH_SLAUGHTERED', label: 'Fresh Slaughtered', emoji: '✨' },
  { value: 'FRESH_CHILLED', label: 'Fresh Chilled', emoji: '❄️' },
  { value: 'FROZEN', label: 'Frozen', emoji: '🧊' },
  { value: 'MARINATED', label: 'Marinated', emoji: '🌶️' },
  { value: 'SMOKED', label: 'Smoked', emoji: '💨' },
  { value: 'DRIED', label: 'Dried', emoji: '🌾' },
];

const SALE_UNITS: { value: SaleUnit; label: string }[] = [
  { value: 'KG', label: 'Per Kg' },
  { value: 'GRAM', label: 'Per Gram' },
  { value: 'POUND', label: 'Per Pound' },
  { value: 'PIECE', label: 'Per Piece' },
  { value: 'DOZEN', label: 'Per Dozen' },
  { value: 'WHOLE', label: 'Whole' },
  { value: 'HALF', label: 'Half' },
  { value: 'QUARTER', label: 'Quarter' },
];

export function MeatWizardStep1Basic({ basic, onChange, errors }: Props) {
  const { data: categories = [] } = useQuery({ queryKey: ['categories'], queryFn: categoriesApi.list });
  const { data: brands = [] } = useQuery({ queryKey: ['brands'], queryFn: () => brandsApi.list() });
  const { data: allTags = [] } = useQuery({ queryKey: ['tags'], queryFn: tagsApi.list });

  const price = Number(basic.pricePerKg || 0);
  const cost = Number(basic.costPrice || 0);
  const profit = price - cost;
  const margin = price > 0 ? (profit / price) * 100 : 0;
  const isLoss = cost > 0 && price > 0 && profit < 0;

  const cutGroups = Array.from(new Set(CUT_CATEGORIES.map((c) => c.group)));

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
        <SectionHeader icon={Beef} title="Product Identity" desc="Naam, category, brand" />
        <Input
          label="Product Name *"
          value={basic.name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="e.g. Boneless Beef Undercut, Chicken Breast Fillet"
          hint="POS aur catalog par dikhega"
        />
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-1.5">Description</label>
          <textarea
            rows={2}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
            value={basic.description}
            onChange={(e) => onChange({ description: e.target.value })}
            placeholder="Fresh, tender, best for BBQ..."
          />
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5">Category</label>
            <select
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:border-red-500"
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
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:border-red-500"
              value={basic.brandId}
              onChange={(e) => onChange({ brandId: e.target.value })}
            >
              <option value="">Select brand</option>
              {brands.map((b) => (<option key={b.id} value={b.id}>{b.name}</option>))}
            </select>
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <Input label="SKU" value={basic.sku} onChange={(e) => onChange({ sku: e.target.value })}
            placeholder="BEEF-UND-001" leftIcon={<Hash className="h-4 w-4 text-slate-400" />} />
          <Input label="Barcode" value={basic.barcode} onChange={(e) => onChange({ barcode: e.target.value })} placeholder="Optional" />
        </div>
      </section>

      {/* Animal Type */}
      <section className="rounded-2xl border-2 border-red-200 bg-gradient-to-br from-red-50 to-white p-5 space-y-4">
        <SectionHeader icon={Beef} title="Animal Type *" desc="Kis janwar ka gosht hai" tone="red" />
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2">
          {ANIMAL_TYPES.map((a) => {
            const active = basic.animalType === a.value;
            return (
              <button key={a.value} type="button" onClick={() => onChange({ animalType: a.value })}
                className={['h-20 rounded-xl border-2 text-sm font-extrabold transition flex flex-col items-center justify-center gap-1',
                  active ? 'border-red-600 bg-red-600 text-white shadow-md scale-105'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-red-400'].join(' ')}>
                <span className="text-3xl">{a.emoji}</span>
                <span className="text-xs">{a.label}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Cut Category */}
      <section className="rounded-2xl border-2 border-rose-200 bg-gradient-to-br from-rose-50 to-white p-5 space-y-4">
        <SectionHeader icon={Scissors} title="Cut Category *" desc="Meat cut ka type" tone="rose" />
        {cutGroups.map((group) => (
          <div key={group}>
            <div className="text-[10px] uppercase font-extrabold text-slate-600 mb-1.5">{group}</div>
            <div className="flex flex-wrap gap-1.5">
              {CUT_CATEGORIES.filter((c) => c.group === group).map((c) => {
                const active = basic.cutCategory === c.value;
                return (
                  <button key={c.value} type="button" onClick={() => onChange({ cutCategory: c.value })}
                    className={['px-3 py-1.5 rounded-lg text-xs font-extrabold transition',
                      active ? 'bg-rose-600 text-white shadow'
                        : 'bg-white border-2 border-slate-200 text-slate-700 hover:border-rose-400'].join(' ')}>
                    {c.label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </section>

      {/* Freshness + Sale Unit */}
      <section className="rounded-2xl border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-white p-5 space-y-4">
        <SectionHeader icon={Package} title="Freshness & Sale Unit" desc="How is it sold?" tone="blue" />
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">Freshness Type</label>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {FRESHNESS.map((f) => {
              const active = basic.freshnessType === f.value;
              return (
                <button key={f.value} type="button" onClick={() => onChange({ freshnessType: f.value })}
                  className={['p-3 rounded-xl border-2 text-center transition',
                    active ? 'border-blue-600 bg-blue-600 text-white shadow-md'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-blue-400'].join(' ')}>
                  <div className="text-2xl">{f.emoji}</div>
                  <div className="text-[10px] font-extrabold mt-1">{f.label}</div>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">Sale Unit</label>
          <div className="grid grid-cols-4 gap-2">
            {SALE_UNITS.map((u) => {
              const active = basic.saleUnit === u.value;
              return (
                <button key={u.value} type="button" onClick={() => onChange({ saleUnit: u.value })}
                  className={['py-2 rounded-lg text-xs font-extrabold transition',
                    active ? 'bg-blue-600 text-white shadow' :
                    'bg-white border-2 border-slate-200 text-slate-700 hover:border-blue-300'].join(' ')}>
                  {u.label}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="rounded-2xl border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-5 space-y-4">
        <SectionHeader icon={DollarSign} title="Pricing (Weight-Based)" desc="Per kg + optional per piece" tone="emerald" />

        <div className="grid sm:grid-cols-2 gap-4">
          <Input label="Price per Kg (PKR) *" type="number" step="0.01" value={basic.pricePerKg}
            onChange={(e) => onChange({ pricePerKg: e.target.value === '' ? '' : Number(e.target.value) })}
            placeholder="0" hint="Main selling rate" />
          <Input label="Price per Piece (PKR)" type="number" step="0.01" value={basic.pricePerPiece}
            onChange={(e) => onChange({ pricePerPiece: e.target.value === '' ? '' : Number(e.target.value) })}
            placeholder="Optional" hint="For whole cuts" />
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
          <Input label="Cost per Kg (PKR)" type="number" step="0.01" value={basic.costPrice}
            onChange={(e) => onChange({ costPrice: e.target.value === '' ? '' : Number(e.target.value) })}
            placeholder="0" hint="Purchase cost" />
          <Input label="Wholesale/kg (PKR)" type="number" step="0.01" value={basic.wholesalePrice}
            onChange={(e) => onChange({ wholesalePrice: e.target.value === '' ? '' : Number(e.target.value) })}
            placeholder="Optional" hint="Bulk rate" />
          <Input label="Tax Rate (%)" type="number" step="0.01" value={basic.taxRate}
            onChange={(e) => onChange({ taxRate: e.target.value === '' ? '' : Number(e.target.value) })}
            placeholder="0" leftIcon={<Percent className="h-4 w-4 text-slate-400" />} />
        </div>

        {price > 0 && cost > 0 && (
          <div className={['rounded-xl border-2 p-3 flex items-center justify-between',
            isLoss ? 'bg-rose-50 border-rose-300'
              : margin >= 20 ? 'bg-emerald-50 border-emerald-300'
              : 'bg-amber-50 border-amber-300'].join(' ')}>
            <div className="flex items-center gap-2">
              <TrendingUp className={['h-5 w-5', isLoss ? 'text-rose-700' : margin >= 20 ? 'text-emerald-700' : 'text-amber-700'].join(' ')} />
              <div>
                <div className={['text-[10px] uppercase tracking-wider font-extrabold',
                  isLoss ? 'text-rose-700' : margin >= 20 ? 'text-emerald-700' : 'text-amber-700'].join(' ')}>
                  {isLoss ? '⚠️ Loss Alert' : 'Profit per kg'}
                </div>
                <div className={['text-lg font-extrabold tabular-nums leading-tight',
                  isLoss ? 'text-rose-900' : 'text-slate-900'].join(' ')}>
                  {formatPKRFull(profit)}
                </div>
              </div>
            </div>
            <div className={['text-2xl font-extrabold tabular-nums',
              isLoss ? 'text-rose-700' : margin >= 20 ? 'text-emerald-700' : 'text-amber-700'].join(' ')}>
              {margin.toFixed(1)}%
            </div>
          </div>
        )}
      </section>

      {/* Order Constraints */}
      <section className="rounded-2xl border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-white p-5 space-y-4">
        <SectionHeader icon={Weight} title="Order Constraints" desc="Min/max weight, variance" tone="amber" />
        <div className="grid sm:grid-cols-3 gap-4">
          <Input label="Min Order (kg)" type="number" step="0.01" value={basic.minOrderKg}
            onChange={(e) => onChange({ minOrderKg: e.target.value === '' ? '' : Number(e.target.value) })}
            placeholder="0.25" hint="Kam se kam" />
          <Input label="Max Order (kg)" type="number" step="0.01" value={basic.maxOrderKg}
            onChange={(e) => onChange({ maxOrderKg: e.target.value === '' ? '' : Number(e.target.value) })}
            placeholder="Optional" hint="Zyada se zyada" />
          <Input label="Weight Variance (%)" type="number" step="0.01" value={basic.weightVariancePct}
            onChange={(e) => onChange({ weightVariancePct: e.target.value === '' ? '' : Number(e.target.value) })}
            placeholder="5" hint="±% acceptable" />
        </div>
      </section>

      {/* Meat Attributes */}
      <section className="rounded-2xl border-2 border-slate-200 bg-white p-5 space-y-3">
        <SectionHeader icon={Scissors} title="Meat Attributes" desc="Bone, skin properties" />
        <div className="grid sm:grid-cols-3 gap-2">
          <label className={['flex items-center gap-3 cursor-pointer p-3 rounded-xl transition border-2',
            basic.isBoneless ? 'border-slate-700 bg-slate-100' : 'border-slate-200 hover:border-slate-300'].join(' ')}>
            <input type="checkbox" checked={basic.isBoneless} onChange={(e) => onChange({ isBoneless: e.target.checked, isBoneIn: e.target.checked ? false : basic.isBoneIn })} className="h-5 w-5 rounded" />
            <div>
              <div className="font-extrabold text-slate-900 text-sm">Boneless</div>
              <div className="text-[10px] text-slate-500 font-semibold">No bones</div>
            </div>
          </label>
          <label className={['flex items-center gap-3 cursor-pointer p-3 rounded-xl transition border-2',
            basic.isBoneIn ? 'border-slate-700 bg-slate-100' : 'border-slate-200 hover:border-slate-300'].join(' ')}>
            <input type="checkbox" checked={basic.isBoneIn} onChange={(e) => onChange({ isBoneIn: e.target.checked, isBoneless: e.target.checked ? false : basic.isBoneless })} className="h-5 w-5 rounded" />
            <div>
              <div className="font-extrabold text-slate-900 text-sm">With Bone</div>
              <div className="text-[10px] text-slate-500 font-semibold">Bone-in</div>
            </div>
          </label>
          <label className={['flex items-center gap-3 cursor-pointer p-3 rounded-xl transition border-2',
            basic.isSkinless ? 'border-slate-700 bg-slate-100' : 'border-slate-200 hover:border-slate-300'].join(' ')}>
            <input type="checkbox" checked={basic.isSkinless} onChange={(e) => onChange({ isSkinless: e.target.checked })} className="h-5 w-5 rounded" />
            <div>
              <div className="font-extrabold text-slate-900 text-sm">Skinless</div>
              <div className="text-[10px] text-slate-500 font-semibold">Skin removed</div>
            </div>
          </label>
        </div>
      </section>

      {/* Settings */}
      <section className="rounded-2xl border-2 border-slate-200 bg-white p-5 space-y-3">
        <SectionHeader icon={Sparkles} title="Visibility" desc="POS aur catalog settings" />
        <div className="grid sm:grid-cols-2 gap-2">
          <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl hover:bg-slate-50 transition border-2 border-transparent hover:border-slate-200">
            <input type="checkbox" checked={basic.isActive}
              onChange={(e) => onChange({ isActive: e.target.checked })} className="h-5 w-5 rounded" />
            <Eye className="h-5 w-5 text-slate-600" />
            <div className="flex-1">
              <div className="font-extrabold text-slate-900 text-sm">Active</div>
              <div className="text-xs text-slate-500 font-semibold">Sellable in POS</div>
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
                <img src={url} alt={`meat-${idx}`} className="w-full h-full object-cover" />
                {idx === 0 && (
                  <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded-md bg-red-600 text-white text-[9px] font-extrabold">PRIMARY</div>
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
    red: 'from-red-500 to-rose-700',
    rose: 'from-rose-500 to-pink-700',
    blue: 'from-blue-500 to-cyan-700',
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
