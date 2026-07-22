import { useQuery } from '@tanstack/react-query';
import {
  Package, DollarSign, Image as ImageIcon, Eye, Star, TrendingUp,
  Zap, Sparkles, Award, Tag, ArrowRight, AlertTriangle, Info,
  X, Cake,
} from 'lucide-react';
import { Input } from '@core/ui/Input';
import { Button } from '@core/ui/Button';
import { UploadDropzone } from '@core/components/uploads';
import { categoriesApi } from '@modules/inventory/categories/api/categories.api';
import { brandsApi } from '@modules/inventory/brands/api/brands.api';
import { tagsApi } from '@modules/inventory/tags/api/tags.api';
import { formatPKRFull } from '@core/lib/format';
import { CATEGORIES, SIZES } from '../../api/constants';
import type { BakeryWizardBasic } from '../../hooks/useBakeryWizard';

interface Props {
  basic: BakeryWizardBasic;
  onChange: (patch: Partial<BakeryWizardBasic>) => void;
  onNext: () => void;
  validation: { valid: boolean; errors: string[] };
}

export function BakeryWizardStep1Basic({ basic, onChange, onNext, validation }: Props) {
  const { data: categories = [] } = useQuery({ queryKey: ['categories'], queryFn: categoriesApi.list });
  const { data: brands = [] } = useQuery({ queryKey: ['brands'], queryFn: () => brandsApi.list() });
  const { data: allTags = [] } = useQuery({ queryKey: ['tags'], queryFn: tagsApi.list });

  const toggleTag = (tagId: string) => {
    onChange({
      tagIds: basic.tagIds.includes(tagId)
        ? basic.tagIds.filter((t) => t !== tagId)
        : [...basic.tagIds, tagId],
    });
  };

  const bakeryCategory = CATEGORIES.find((c) => c.value === basic.bakeryCategory);
  const isCakeType = ['CAKE', 'CUPCAKE', 'CHEESECAKE', 'CUSTOM_CAKE', 'WEDDING_CAKE', 'BIRTHDAY_CAKE', 'ANNIVERSARY_CAKE'].includes(basic.bakeryCategory);

  return (
    <div className="space-y-5">
      {/* ─── IDENTITY ─── */}
      <section className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-slate-200 dark:border-neutral-800 shadow-sm p-5 space-y-4">
        <SectionHeader icon={Package} title="Product Identity" desc="Basic bakery product details" />

        <Input
          label="Product Name *"
          value={basic.name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="e.g. Chocolate Truffle Cake, Croissant, Gulab Jamun"
          autoFocus
        />

        <div>
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
            Bakery Category *
          </label>
          <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-2">
            {CATEGORIES.map((c) => {
              const active = basic.bakeryCategory === c.value;
              return (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => onChange({ bakeryCategory: c.value })}
                  className={[
                    'group px-2 py-2.5 rounded-xl border-2 transition-all flex flex-col items-center gap-1',
                    active
                      ? 'border-pink-500 bg-gradient-to-br from-pink-50 to-fuchsia-50 dark:from-pink-950/40 dark:to-fuchsia-950/40 shadow-md ring-2 ring-pink-200'
                      : 'border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:border-pink-300 hover:shadow-sm',
                  ].join(' ')}
                >
                  <span className="text-xl group-hover:scale-110 transition-transform">{c.emoji}</span>
                  <span className={[
                    'text-[9px] font-extrabold text-center leading-tight',
                    active ? 'text-pink-800' : 'text-slate-700 dark:text-slate-300',
                  ].join(' ')}>
                    {c.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Default Size
            </label>
            <select
              value={basic.defaultSize}
              onChange={(e) => onChange({ defaultSize: e.target.value as any })}
              className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-pink-500"
            >
              {SIZES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.emoji} {s.label}
                  {s.kg ? ` (${s.kg}kg)` : ''}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Base Unit
            </label>
            <select
              value={basic.unit}
              onChange={(e) => onChange({ unit: e.target.value })}
              className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-pink-500"
            >
              <option value="pcs">Piece</option>
              <option value="slice">Slice</option>
              <option value="box">Box</option>
              <option value="tray">Tray</option>
              <option value="dozen">Dozen</option>
              <option value="pound">Pound</option>
              <option value="kg">Kilogram</option>
              <option value="gram">Gram</option>
              <option value="loaf">Loaf</option>
              <option value="plate">Plate</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            Description
          </label>
          <textarea
            rows={3}
            className="w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm focus:outline-none focus:border-pink-500 resize-none"
            value={basic.descriptionLong}
            onChange={(e) => onChange({ descriptionLong: e.target.value })}
            placeholder="Rich, moist, layered chocolate cake with fresh cream frosting..."
          />
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Base Category
            </label>
            <select
              className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm focus:outline-none focus:border-pink-500"
              value={basic.categoryId}
              onChange={(e) => onChange({ categoryId: e.target.value })}
            >
              <option value="">No category</option>
              {categories.map((c: any) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Brand
            </label>
            <select
              className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm focus:outline-none focus:border-pink-500"
              value={basic.brandId}
              onChange={(e) => onChange({ brandId: e.target.value })}
            >
              <option value="">No brand</option>
              {brands.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
          <Input
            label="SKU (optional)"
            value={basic.sku}
            onChange={(e) => onChange({ sku: e.target.value })}
            placeholder="Auto if empty"
          />
          <Input
            label="Barcode (optional)"
            value={basic.barcode}
            onChange={(e) => onChange({ barcode: e.target.value })}
            placeholder="Scan or type"
          />
          <Input
            label="Weight (grams)"
            type="number"
            value={basic.weightGrams}
            onChange={(e) => onChange({ weightGrams: e.target.value === '' ? '' : Number(e.target.value) })}
            placeholder="500"
          />
        </div>
      </section>

      {/* ─── PRICING (MULTI-UNIT) ─── */}
      <section className="rounded-3xl bg-gradient-to-br from-pink-50 via-white to-fuchsia-50 dark:from-pink-950/30 dark:via-neutral-900 dark:to-fuchsia-950/30 border-2 border-pink-200 dark:border-pink-800 shadow-sm p-5 space-y-4">
        <SectionHeader
          icon={DollarSign}
          title="Pricing (fill any that apply)"
          desc="Multi-unit pricing — 1kg, 1lb, per piece, per dozen, etc. At least one required."
        />

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <PriceInput
            label="Per Kilogram"
            emoji="⚖️"
            value={basic.pricePerKg}
            onChange={(v) => onChange({ pricePerKg: v })}
            tone="pink"
          />
          <PriceInput
            label="Per Pound"
            emoji="⚖️"
            value={basic.pricePerPound}
            onChange={(v) => onChange({ pricePerPound: v })}
            tone="fuchsia"
          />
          <PriceInput
            label="Per Piece"
            emoji="🎂"
            value={basic.pricePerPiece}
            onChange={(v) => onChange({ pricePerPiece: v })}
            tone="amber"
          />
          <PriceInput
            label="Per Dozen"
            emoji="📦"
            value={basic.pricePerDozen}
            onChange={(v) => onChange({ pricePerDozen: v })}
            tone="orange"
          />
          <PriceInput
            label="Per Slice"
            emoji="🍰"
            value={basic.pricePerSlice}
            onChange={(v) => onChange({ pricePerSlice: v })}
            tone="rose"
          />
          <PriceInput
            label="Per Box"
            emoji="📦"
            value={basic.pricePerBox}
            onChange={(v) => onChange({ pricePerBox: v })}
            tone="purple"
          />
          <PriceInput
            label="Per Tray"
            emoji="🍱"
            value={basic.pricePerTray}
            onChange={(v) => onChange({ pricePerTray: v })}
            tone="violet"
          />
        </div>

        <div className="grid sm:grid-cols-3 gap-3 pt-3 border-t border-pink-200/60 dark:border-pink-800/60">
          <Input
            label="Tax Rate (%)"
            type="number"
            value={basic.taxRate}
            onChange={(e) => onChange({ taxRate: e.target.value === '' ? '' : Number(e.target.value) })}
            placeholder="0"
          />
          {isCakeType && (
            <>
              <Input
                label="Serving Size (people)"
                type="number"
                value={basic.servingSize}
                onChange={(e) => onChange({ servingSize: e.target.value === '' ? '' : Number(e.target.value) })}
                placeholder="6-8"
              />
              <Input
                label="Number of Slices"
                type="number"
                value={basic.numberOfSlices}
                onChange={(e) => onChange({ numberOfSlices: e.target.value === '' ? '' : Number(e.target.value) })}
                placeholder="10"
              />
            </>
          )}
        </div>
      </section>

      {/* ─── IMAGES ─── */}
      <section className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-slate-200 dark:border-neutral-800 shadow-sm p-5 space-y-4">
        <SectionHeader icon={ImageIcon} title="Product Images" desc="First image becomes primary — customer catalog mein sabse pehle" />
        <UploadDropzone
          purpose="product-image"
          maxFiles={10}
          onUploaded={(records) => {
            onChange({ imageUrls: [...basic.imageUrls, ...records.map((r) => r.url)] });
          }}
          hint="Cake photos, decoration angles, occasion shots — sab kuch"
        />

        {basic.imageUrls.length > 0 && (
          <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-6 gap-2">
            {basic.imageUrls.map((url, idx) => (
              <div key={idx} className="group relative aspect-square rounded-xl overflow-hidden border-2 border-slate-200 dark:border-neutral-700">
                <img src={url} alt={'Image ' + (idx + 1)} className="w-full h-full object-cover" />
                {idx === 0 && (
                  <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded-md bg-pink-600 text-white text-[9px] font-extrabold">
                    PRIMARY
                  </div>
                )}
                <button
                  onClick={() => onChange({ imageUrls: basic.imageUrls.filter((_, i) => i !== idx) })}
                  className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-xs font-extrabold"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ─── MARKETING FLAGS ─── */}
      <section className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-slate-200 dark:border-neutral-800 shadow-sm p-5 space-y-4">
        <SectionHeader icon={Award} title="Marketing & Visibility" desc="Highlight badges customers will see" />

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
          <FlagCard active={basic.isActive} onToggle={(v) => onChange({ isActive: v })} icon={Eye} label="Active" desc="Visible in POS & catalog" tone="emerald" />
          <FlagCard active={basic.isFeatured} onToggle={(v) => onChange({ isFeatured: v })} icon={Star} label="Featured" desc="Show at top" tone="amber" />
          <FlagCard active={basic.isPopular} onToggle={(v) => onChange({ isPopular: v })} icon={Zap} label="Popular" desc="Trending badge" tone="red" />
          <FlagCard active={basic.isBestSeller} onToggle={(v) => onChange({ isBestSeller: v })} icon={TrendingUp} label="Best Seller" desc="Top pick badge" tone="rose" />
          <FlagCard active={basic.isNewArrival} onToggle={(v) => onChange({ isNewArrival: v })} icon={Sparkles} label="New Arrival" desc="Fresh launch" tone="cyan" />
          <FlagCard active={basic.isSeasonalItem} onToggle={(v) => onChange({ isSeasonalItem: v })} icon={Cake} label="Seasonal" desc="Limited time" tone="fuchsia" />
        </div>

        {basic.isSeasonalItem && (
          <Input
            label="Season Name *"
            value={basic.seasonName}
            onChange={(e) => onChange({ seasonName: e.target.value })}
            placeholder="e.g. Eid, Christmas, Ramadan, Valentine's Day"
          />
        )}
      </section>

      {/* ─── TAGS ─── */}
      {allTags.length > 0 && (
        <section className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-slate-200 dark:border-neutral-800 shadow-sm p-5 space-y-3">
          <SectionHeader icon={Tag} title="Tags (optional)" desc="For search and filtering" />
          <div className="flex flex-wrap gap-1.5">
            {allTags.map((t) => {
              const active = basic.tagIds.includes(t.id);
              return (
                <button
                  key={t.id}
                  onClick={() => toggleTag(t.id)}
                  className={'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border-2 text-xs font-extrabold transition ' + (active ? 'shadow-sm' : 'opacity-60 hover:opacity-100')}
                  style={{
                    backgroundColor: active ? (t.color + '20') : '#fff',
                    borderColor: active ? t.color : '#e2e8f0',
                    color: active ? t.color : '#475569',
                  }}
                >
                  <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: t.color }} />
                  {t.name}
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* ─── VALIDATION + NEXT ─── */}
      {!validation.valid && validation.errors.length > 0 && (
        <div className="rounded-2xl bg-rose-50 dark:bg-rose-950/30 border-2 border-rose-300 dark:border-rose-800 p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-rose-700 shrink-0 mt-0.5" />
          <div className="flex-1 text-sm text-rose-900 dark:text-rose-200">
            <div className="font-extrabold mb-1">Aage badhne se pehle ye theek karein:</div>
            <ul className="list-disc list-inside space-y-0.5 text-xs">
              {validation.errors.map((e, i) => (<li key={i}>{e}</li>))}
            </ul>
          </div>
        </div>
      )}

      <div className="rounded-2xl bg-gradient-to-r from-pink-50 to-fuchsia-50 dark:from-pink-950/30 dark:to-fuchsia-950/30 border-2 border-pink-200 dark:border-pink-800 p-4 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <Info className="h-5 w-5 text-pink-700 shrink-0" />
          <div className="text-sm text-pink-900 dark:text-pink-200">
            <div className="font-extrabold">Step 1 ready?</div>
            <div className="text-[11px] text-pink-700 font-semibold">
              Next: cake flavor, shape, customization options
            </div>
          </div>
        </div>
        <Button
          onClick={onNext}
          disabled={!validation.valid}
          className="bg-gradient-to-r from-pink-600 to-fuchsia-600 shadow-md"
        >
          Next: Cake Details <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function SectionHeader({ icon: Icon, title, desc }: { icon: any; title: string; desc: string }) {
  return (
    <div className="flex items-center gap-3 pb-3 border-b-2 border-slate-100 dark:border-neutral-800">
      <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-pink-500 to-fuchsia-600 text-white flex items-center justify-center shadow-md">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <h3 className="font-extrabold text-slate-900 dark:text-white text-lg leading-tight">{title}</h3>
        <p className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">{desc}</p>
      </div>
    </div>
  );
}

function PriceInput({ label, emoji, value, onChange, tone }: {
  label: string; emoji: string;
  value: number | ''; onChange: (v: number | '') => void;
  tone: string;
}) {
  const tones: Record<string, string> = {
    pink: 'border-pink-300 bg-pink-50 dark:bg-pink-950/30 text-pink-900 focus:border-pink-500',
    fuchsia: 'border-fuchsia-300 bg-fuchsia-50 dark:bg-fuchsia-950/30 text-fuchsia-900 focus:border-fuchsia-500',
    amber: 'border-amber-300 bg-amber-50 dark:bg-amber-950/30 text-amber-900 focus:border-amber-500',
    orange: 'border-orange-300 bg-orange-50 dark:bg-orange-950/30 text-orange-900 focus:border-orange-500',
    rose: 'border-rose-300 bg-rose-50 dark:bg-rose-950/30 text-rose-900 focus:border-rose-500',
    purple: 'border-purple-300 bg-purple-50 dark:bg-purple-950/30 text-purple-900 focus:border-purple-500',
    violet: 'border-violet-300 bg-violet-50 dark:bg-violet-950/30 text-violet-900 focus:border-violet-500',
  };
  return (
    <div>
      <label className="block text-[11px] font-extrabold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
        {emoji} {label}
      </label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-extrabold text-slate-500">Rs</span>
        <input
          type="number"
          step="0.01"
          min="0"
          value={value}
          onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
          placeholder="0"
          className={'h-11 w-full rounded-xl border-2 pl-8 pr-3 text-sm font-extrabold tabular-nums focus:outline-none ' + tones[tone]}
        />
      </div>
    </div>
  );
}

function FlagCard({ active, onToggle, icon: Icon, label, desc, tone }: {
  active: boolean; onToggle: (v: boolean) => void;
  icon: any; label: string; desc: string; tone: string;
}) {
  const tones: Record<string, string> = {
    emerald: 'from-emerald-500 to-green-600 border-emerald-500',
    amber: 'from-amber-500 to-orange-500 border-amber-500',
    red: 'from-red-500 to-rose-600 border-red-500',
    rose: 'from-rose-500 to-pink-600 border-rose-500',
    cyan: 'from-cyan-500 to-blue-600 border-cyan-500',
    fuchsia: 'from-fuchsia-500 to-purple-600 border-fuchsia-500',
  };
  return (
    <button
      type="button"
      onClick={() => onToggle(!active)}
      className={[
        'p-3 rounded-xl border-2 text-left transition-all',
        active
          ? 'bg-gradient-to-br ' + tones[tone] + ' text-white shadow-md'
          : 'border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:border-slate-300',
      ].join(' ')}
    >
      <div className="flex items-center gap-2">
        <Icon className={'h-4 w-4 ' + (active ? 'text-white' : 'text-slate-500')} />
        <div className={'font-extrabold text-sm ' + (active ? 'text-white' : 'text-slate-900 dark:text-white')}>
          {label}
        </div>
      </div>
      <div className={'text-[10px] font-semibold mt-0.5 ' + (active ? 'text-white/80' : 'text-slate-500 dark:text-slate-400')}>
        {desc}
      </div>
    </button>
  );
}
