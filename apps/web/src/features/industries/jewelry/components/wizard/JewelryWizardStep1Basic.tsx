import { useQuery } from '@tanstack/react-query';
import {
  Gem, Scale, Ruler, Image as ImageIcon, Sparkles, Star, Eye,
  Hash, AlertCircle, User, MapPin, Award, Tag,
} from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { UploadDropzone } from '@/components/uploads';
import { categoriesApi } from '@/api/categories.api';
import { brandsApi } from '@/api/brands.api';
import { tagsApi } from '@/api/tags.api';
import type { JewelryWizardBasic } from '../../hooks/useJewelryWizard';
import type { JewelryCategory, JewelryStyle } from '../../api/products.api';
import type { MetalType, Purity } from '../../api/metal-rates.api';

interface Props {
  basic: JewelryWizardBasic;
  onChange: (patch: Partial<JewelryWizardBasic>) => void;
  errors: string[];
}

const CATEGORIES: { value: JewelryCategory; label: string; emoji: string }[] = [
  { value: 'RING', label: 'Ring', emoji: '💍' },
  { value: 'NECKLACE', label: 'Necklace', emoji: '📿' },
  { value: 'EARRINGS', label: 'Earrings', emoji: '👂' },
  { value: 'BANGLE', label: 'Bangle', emoji: '⭕' },
  { value: 'BRACELET', label: 'Bracelet', emoji: '⛓️' },
  { value: 'PENDANT', label: 'Pendant', emoji: '💎' },
  { value: 'CHAIN', label: 'Chain', emoji: '⛓️' },
  { value: 'NOSE_PIN', label: 'Nose Pin', emoji: '👃' },
  { value: 'NOSE_RING', label: 'Nose Ring', emoji: '💫' },
  { value: 'JHUMKA', label: 'Jhumka', emoji: '💫' },
  { value: 'CHOKER', label: 'Choker', emoji: '⚜️' },
  { value: 'MANGALSUTRA', label: 'Mangalsutra', emoji: '📿' },
  { value: 'MAANG_TIKKA', label: 'Maang Tikka', emoji: '👑' },
  { value: 'KUNDAN_SET', label: 'Kundan Set', emoji: '👑' },
  { value: 'BRIDAL_SET', label: 'Bridal Set', emoji: '👰' },
  { value: 'KADA', label: 'Kada', emoji: '🔗' },
  { value: 'PAYAL', label: 'Payal', emoji: '🦶' },
  { value: 'TOE_RING', label: 'Toe Ring', emoji: '🦶' },
  { value: 'COIN', label: 'Coin', emoji: '🪙' },
  { value: 'BAR', label: 'Bar', emoji: '📊' },
  { value: 'BULLION', label: 'Bullion', emoji: '💰' },
  { value: 'OTHER', label: 'Other', emoji: '💎' },
];

const STYLES: { value: JewelryStyle; label: string }[] = [
  { value: 'TRADITIONAL', label: 'Traditional' },
  { value: 'MODERN', label: 'Modern' },
  { value: 'ANTIQUE', label: 'Antique' },
  { value: 'BRIDAL', label: 'Bridal' },
  { value: 'DAILY_WEAR', label: 'Daily Wear' },
  { value: 'PARTY_WEAR', label: 'Party Wear' },
  { value: 'KUNDAN', label: 'Kundan' },
  { value: 'POLKI', label: 'Polki' },
  { value: 'MEENAKARI', label: 'Meenakari' },
  { value: 'JADAU', label: 'Jadau' },
  { value: 'TEMPLE', label: 'Temple' },
  { value: 'FILIGREE', label: 'Filigree' },
  { value: 'HANDMADE', label: 'Handmade' },
  { value: 'ITALIAN', label: 'Italian' },
  { value: 'TURKISH', label: 'Turkish' },
  { value: 'DUBAI', label: 'Dubai' },
  { value: 'INDIAN', label: 'Indian' },
  { value: 'PAKISTANI', label: 'Pakistani' },
  { value: 'CUSTOM', label: 'Custom' },
];

const METALS: { value: MetalType; label: string; emoji: string; color: string }[] = [
  { value: 'GOLD', label: 'Gold', emoji: '🥇', color: 'from-amber-500 to-yellow-600' },
  { value: 'SILVER', label: 'Silver', emoji: '🥈', color: 'from-slate-400 to-slate-500' },
  { value: 'PLATINUM', label: 'Platinum', emoji: '💠', color: 'from-cyan-400 to-blue-500' },
  { value: 'ROSE_GOLD', label: 'Rose Gold', emoji: '🌹', color: 'from-rose-400 to-pink-500' },
  { value: 'WHITE_GOLD', label: 'White Gold', emoji: '⚪', color: 'from-slate-300 to-slate-400' },
  { value: 'PALLADIUM', label: 'Palladium', emoji: '⬜', color: 'from-slate-500 to-slate-600' },
  { value: 'IMITATION', label: 'Imitation', emoji: '🎭', color: 'from-purple-400 to-purple-500' },
];

const PURITIES: Purity[] = [
  'KARAT_24', 'KARAT_22', 'KARAT_21', 'KARAT_18', 'KARAT_14', 'KARAT_10', 'KARAT_9',
  'STERLING_925', 'SILVER_999', 'SILVER_925', 'SILVER_800',
  'PLATINUM_950', 'PLATINUM_900',
];

export function JewelryWizardStep1Basic({ basic, onChange, errors }: Props) {
  const { data: categories = [] } = useQuery({ queryKey: ['categories'], queryFn: categoriesApi.list });
  const { data: brands = [] } = useQuery({ queryKey: ['brands'], queryFn: () => brandsApi.list() });
  const { data: allTags = [] } = useQuery({ queryKey: ['tags'], queryFn: tagsApi.list });

  const gross = Number(basic.grossWeight || 0);
  const net = Number(basic.netWeight || 0);
  const stone = Number(basic.stoneWeight || 0);
  const netMismatch = gross > 0 && net > 0 && Math.abs((gross - stone) - net) > 0.05;

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
        <SectionHeader icon={Gem} title="Jewelry Identity" desc="Item name, code, category" />

        <Input
          label="Item Name *"
          value={basic.name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="e.g. Diamond Solitaire Ring, Kundan Choker Set"
          hint="POS aur invoice par dikhega"
        />

        <div>
          <label className="block text-sm font-bold text-slate-700 mb-1.5">Short Description</label>
          <textarea
            rows={2}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
            value={basic.description}
            onChange={(e) => onChange({ description: e.target.value })}
            placeholder="Elegant design with intricate detailing..."
          />
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <Input
            label="Item Code"
            value={basic.itemCode}
            onChange={(e) => onChange({ itemCode: e.target.value.toUpperCase() })}
            placeholder="RG-001, NKL-KDN-05"
            leftIcon={<Hash className="h-4 w-4 text-slate-400" />}
            hint="Unique jewelry code"
          />
          <Input
            label="Design Number"
            value={basic.designNumber}
            onChange={(e) => onChange({ designNumber: e.target.value })}
            placeholder="D-2024-055"
            hint="Designer's reference"
          />
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <Input
            label="SKU"
            value={basic.sku}
            onChange={(e) => onChange({ sku: e.target.value })}
            placeholder="SKU"
          />
          <Input
            label="Barcode"
            value={basic.barcode}
            onChange={(e) => onChange({ barcode: e.target.value })}
            placeholder="Barcode"
          />
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5">Product Category (POS)</label>
            <select
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:border-amber-500"
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
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:border-amber-500"
              value={basic.brandId}
              onChange={(e) => onChange({ brandId: e.target.value })}
            >
              <option value="">Select brand</option>
              {brands.map((b) => (<option key={b.id} value={b.id}>{b.name}</option>))}
            </select>
          </div>
        </div>
      </section>

      {/* Jewelry Category */}
      <section className="rounded-2xl border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-white p-5 space-y-4">
        <SectionHeader icon={Gem} title="Jewelry Category & Style" desc="Type & design pattern" tone="amber" />

        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">Jewelry Category *</label>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 max-h-56 overflow-y-auto">
            {CATEGORIES.map((c) => {
              const active = basic.category === c.value;
              return (
                <button
                  key={c.value} type="button"
                  onClick={() => onChange({ category: c.value })}
                  className={[
                    'h-16 rounded-xl border-2 text-xs font-extrabold transition flex flex-col items-center justify-center gap-0.5',
                    active ? 'border-amber-600 bg-amber-600 text-white shadow-md'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-amber-400',
                  ].join(' ')}
                >
                  <span className="text-xl">{c.emoji}</span>
                  <span className="leading-tight text-center">{c.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5">Sub-Category</label>
            <input
              value={basic.subCategory}
              onChange={(e) => onChange({ subCategory: e.target.value })}
              placeholder="e.g. Engagement, Anniversary, Wedding"
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:border-amber-500"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5">Style</label>
            <select
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:border-amber-500"
              value={basic.style}
              onChange={(e) => onChange({ style: e.target.value as JewelryStyle })}
            >
              {STYLES.map((s) => (<option key={s.value} value={s.value}>{s.label}</option>))}
            </select>
          </div>
        </div>
      </section>

      {/* Metal & Purity */}
      <section className="rounded-2xl border-2 border-yellow-300 bg-gradient-to-br from-yellow-50 to-white p-5 space-y-4">
        <SectionHeader icon={Award} title="Metal & Purity" desc="Material composition" tone="yellow" />

        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">Metal Type *</label>
          <div className="grid grid-cols-3 sm:grid-cols-7 gap-2">
            {METALS.map((m) => {
              const active = basic.metalType === m.value;
              return (
                <button
                  key={m.value} type="button"
                  onClick={() => onChange({ metalType: m.value })}
                  className={[
                    'p-3 rounded-xl border-2 text-center transition',
                    active
                      ? 'border-current shadow-md scale-105 bg-gradient-to-br ' + m.color + ' text-white'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-yellow-400',
                  ].join(' ')}
                >
                  <div className="text-2xl mb-1">{m.emoji}</div>
                  <div className="text-[10px] font-extrabold">{m.label}</div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5">Purity *</label>
            <select
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold focus:outline-none focus:border-yellow-500"
              value={basic.purity}
              onChange={(e) => onChange({ purity: e.target.value as Purity })}
            >
              {PURITIES.map((p) => (
                <option key={p} value={p}>{p.replace('KARAT_', '').replace('SILVER_', 'S').replace('PLATINUM_', 'Pt-').replace('STERLING_', 'Sterling ')}K</option>
              ))}
            </select>
          </div>
          <Input
            label="Purity Hallmark"
            value={basic.purityHallmark}
            onChange={(e) => onChange({ purityHallmark: e.target.value })}
            placeholder="916, 750, 925"
            hint="Numeric hallmark stamp"
          />
        </div>
      </section>

      {/* Weight */}
      <section className="rounded-2xl border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-5 space-y-4">
        <SectionHeader icon={Scale} title="Weight Details" desc="Gross, net, stone weight" tone="emerald" />

        <div className="grid sm:grid-cols-3 gap-3">
          <Input
            label="Gross Weight (g) *"
            type="number" step="0.001"
            value={basic.grossWeight}
            onChange={(e) => onChange({ grossWeight: e.target.value === '' ? '' : Number(e.target.value) })}
            placeholder="0.000"
            hint="Total including stones"
          />
          <Input
            label="Net Weight (g) *"
            type="number" step="0.001"
            value={basic.netWeight}
            onChange={(e) => onChange({ netWeight: e.target.value === '' ? '' : Number(e.target.value) })}
            placeholder="0.000"
            hint="Metal only"
          />
          <Input
            label="Stone Weight (g)"
            type="number" step="0.001"
            value={basic.stoneWeight}
            onChange={(e) => onChange({ stoneWeight: e.target.value === '' ? '' : Number(e.target.value) })}
            placeholder="0.000"
            hint="Gemstones + pearls"
          />
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <Input
            label="Wax Weight (g)"
            type="number" step="0.001"
            value={basic.waxWeight}
            onChange={(e) => onChange({ waxWeight: e.target.value === '' ? '' : Number(e.target.value) })}
            placeholder="Optional"
          />
          <Input
            label="Other Weight (g)"
            type="number" step="0.001"
            value={basic.otherWeight}
            onChange={(e) => onChange({ otherWeight: e.target.value === '' ? '' : Number(e.target.value) })}
            placeholder="Optional"
          />
        </div>

        {netMismatch && (
          <div className="rounded-xl bg-amber-50 border-2 border-amber-300 p-3 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-900 font-semibold">
              <strong>Weight mismatch:</strong> Gross ({gross}g) − Stones ({stone}g) = {(gross - stone).toFixed(3)}g,
              but Net is {net}g. Check values.
            </div>
          </div>
        )}
      </section>

      {/* Dimensions */}
      <section className="rounded-2xl border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-white p-5 space-y-4">
        <SectionHeader icon={Ruler} title="Dimensions (Optional)" desc="Size, length, width" tone="blue" />

        <div className="grid sm:grid-cols-4 gap-3">
          <Input
            label="Size"
            value={basic.size}
            onChange={(e) => onChange({ size: e.target.value })}
            placeholder="6, M, 16 inch"
          />
          <Input
            label="Length (mm)"
            type="number" step="0.1"
            value={basic.length}
            onChange={(e) => onChange({ length: e.target.value === '' ? '' : Number(e.target.value) })}
            placeholder="0.0"
          />
          <Input
            label="Width (mm)"
            type="number" step="0.1"
            value={basic.width}
            onChange={(e) => onChange({ width: e.target.value === '' ? '' : Number(e.target.value) })}
            placeholder="0.0"
          />
          <Input
            label="Thickness (mm)"
            type="number" step="0.1"
            value={basic.thickness}
            onChange={(e) => onChange({ thickness: e.target.value === '' ? '' : Number(e.target.value) })}
            placeholder="0.0"
          />
        </div>
      </section>

      {/* Origin */}
      <section className="rounded-2xl border-2 border-slate-200 bg-white p-5 space-y-4">
        <SectionHeader icon={User} title="Origin & Craftsman (Optional)" desc="Designer, karigar, workshop" />

        <div className="grid sm:grid-cols-2 gap-3">
          <Input
            label="Designer Name"
            value={basic.designerName}
            onChange={(e) => onChange({ designerName: e.target.value })}
            placeholder="Designer name"
          />
          <Input
            label="Karigar Name"
            value={basic.karigarName}
            onChange={(e) => onChange({ karigarName: e.target.value })}
            placeholder="Craftsman name"
          />
          <Input
            label="Workshop Name"
            value={basic.workshopName}
            onChange={(e) => onChange({ workshopName: e.target.value })}
            placeholder="Workshop/atelier"
          />
          <Input
            label="Country of Origin"
            value={basic.countryOfOrigin}
            onChange={(e) => onChange({ countryOfOrigin: e.target.value })}
            placeholder="Pakistan, India, Italy..."
            leftIcon={<MapPin className="h-4 w-4 text-slate-400" />}
          />
        </div>
      </section>

      {/* Settings */}
      <section className="rounded-2xl border-2 border-slate-200 bg-white p-5 space-y-3">
        <SectionHeader icon={Sparkles} title="Display Settings" desc="Active, featured status" />

        <div className="grid sm:grid-cols-2 gap-2">
          <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl hover:bg-slate-50 transition border-2 border-transparent hover:border-slate-200">
            <input type="checkbox" checked={basic.isActive}
              onChange={(e) => onChange({ isActive: e.target.checked })} className="h-5 w-5 rounded" />
            <Eye className="h-5 w-5 text-slate-600" />
            <div className="flex-1">
              <div className="font-extrabold text-slate-900 text-sm">Active</div>
              <div className="text-xs text-slate-500 font-semibold">Visible in catalog & POS</div>
            </div>
          </label>
          <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl hover:bg-slate-50 transition border-2 border-transparent hover:border-slate-200">
            <input type="checkbox" checked={basic.isFeatured}
              onChange={(e) => onChange({ isFeatured: e.target.checked })} className="h-5 w-5 rounded" />
            <Star className="h-5 w-5 text-amber-500" />
            <div className="flex-1">
              <div className="font-extrabold text-slate-900 text-sm">Featured</div>
              <div className="text-xs text-slate-500 font-semibold">Highlight in showroom</div>
            </div>
          </label>
        </div>
      </section>

      {/* Tags */}
      {allTags.length > 0 && (
        <section className="rounded-2xl border-2 border-slate-200 bg-white p-5 space-y-3">
          <SectionHeader icon={Tag} title="Tags" desc="Organize collection" />
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
        <SectionHeader icon={ImageIcon} title="Product Images" desc="Multiple angles recommended" />
        <UploadDropzone
          purpose="product-image"
          maxFiles={10}
          onUploaded={(records) => {
            const urls = Array.isArray(records) ? records.map((r: any) => r.url || r).filter(Boolean) : [(records as any)?.url || records];
            onChange({ imageUrls: [...(basic.imageUrls ?? []), ...urls.filter((u): u is string => Boolean(u))] });
          }}
          hint="Drop up to 10 images"
        />
        {basic.imageUrls.length > 0 && (
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
            {basic.imageUrls.map((url, idx) => (
              <div key={url + idx} className="relative group aspect-square rounded-xl overflow-hidden border-2 border-slate-200">
                <img src={url} alt={`jewelry-${idx}`} className="w-full h-full object-cover" />
                {idx === 0 && (
                  <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded-md bg-amber-600 text-white text-[9px] font-extrabold">PRIMARY</div>
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
    amber: 'from-amber-500 to-yellow-700',
    yellow: 'from-yellow-500 to-amber-700',
    emerald: 'from-emerald-500 to-green-700',
    blue: 'from-blue-500 to-cyan-700',
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
