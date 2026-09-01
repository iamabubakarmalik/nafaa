import { useQuery } from '@tanstack/react-query';
import {
  Package, DollarSign, Image as ImageIcon, Sparkles, Star, Eye,
  TrendingUp, Hash, AlertCircle, Smartphone, Cable, Shuffle,
  ShieldCheck, Zap,
} from 'lucide-react';
import { Input } from '@core/ui/Input';
import { UploadDropzone } from '@core/components/uploads';
import { categoriesApi } from '@modules/inventory/categories/api/categories.api';
import { brandsApi } from '@modules/inventory/brands/api/brands.api';
import { tagsApi } from '@modules/inventory/tags/api/tags.api';
import { formatPKRFull } from '@core/lib/format';
import {
  PTA_STATUS_LABELS, PTA_STATUS_COLORS, type PtaStatus,
} from '../../api/imei.api';
import type { MobileWizardBasic, MobileProductType } from '../../hooks/useMobileWizard';

interface Props {
  basic: MobileWizardBasic;
  onChange: (patch: Partial<MobileWizardBasic>) => void;
  errors: string[];
}

const PRODUCT_TYPES: Array<{
  key: MobileProductType;
  label: string;
  desc: string;
  icon: any;
  color: 'blue' | 'emerald' | 'amber';
  examples: string;
}> = [
  {
    key: 'PHONE',
    label: 'Phone / Device',
    desc: 'IMEI-tracked — har unit ka apna IMEI + PTA',
    icon: Smartphone,
    color: 'blue',
    examples: 'iPhone, Samsung, tablets, smartwatches',
  },
  {
    key: 'ACCESSORY',
    label: 'Accessory',
    desc: 'Simple stock — koi IMEI nahi, sirf qty',
    icon: Cable,
    color: 'emerald',
    examples: 'Chargers, covers, glass, cables, handsfree',
  },
  {
    key: 'MIXED',
    label: 'Mixed',
    desc: 'Har variant apna type khud choose karega',
    icon: Shuffle,
    color: 'amber',
    examples: 'Rare — jaise phone + free cover bundle',
  },
];

/** Accessory quick-name chips — 1 tap se naam */
const ACCESSORY_QUICK = [
  { label: 'Charger', emoji: '🔌' },
  { label: 'Cover', emoji: '📱' },
  { label: 'Tempered Glass', emoji: '🛡️' },
  { label: 'Handsfree', emoji: '🎧' },
  { label: 'Data Cable', emoji: '🔗' },
  { label: 'Power Bank', emoji: '🔋' },
  { label: 'Earbuds', emoji: '🎵' },
  { label: 'Car Charger', emoji: '🚗' },
  { label: 'Memory Card', emoji: '💾' },
  { label: 'OTG', emoji: '📲' },
];

export function MobileWizardStep1Basic({ basic, onChange, errors }: Props) {
  const { data: categories = [] } = useQuery({ queryKey: ['categories'], queryFn: categoriesApi.list });
  const { data: brands = [] } = useQuery({ queryKey: ['brands'], queryFn: () => brandsApi.list() });
  const { data: allTags = [] } = useQuery({ queryKey: ['tags'], queryFn: tagsApi.list });

  const isAccessory = basic.productType === 'ACCESSORY';
  const cost = Number(basic.costPrice || 0);
  const sale = Number(basic.salePrice || 0);
  const profit = sale - cost;
  const margin = sale > 0 ? (profit / sale) * 100 : 0;
  const isLoss = cost > 0 && sale > 0 && profit < 0;

  const toggleTag = (id: string) => {
    const current = basic.tagIds ?? [];
    onChange({
      tagIds: current.includes(id) ? current.filter((t) => t !== id) : [...current, id],
    });
  };

  const priceUnit = isAccessory ? 'piece' : 'device';

  return (
    <div className="space-y-5">
      {errors.length > 0 && (
        <div className="rounded-2xl bg-rose-50 dark:bg-rose-500/10 border-2 border-rose-200 dark:border-rose-500/40 p-3 flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
          <div className="text-xs text-rose-900 dark:text-rose-200">
            <div className="font-extrabold mb-0.5">Next se pehle ye fix karein:</div>
            <ul className="list-disc pl-4 space-y-0.5">
              {errors.map((e, i) => <li key={i}>{e}</li>)}
            </ul>
          </div>
        </div>
      )}

      {/* ═══ SECTION 1 — Identity ═══ */}
      <section className="rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 space-y-4">
        <SectionHeader icon={Package} title="Product Identity" desc="Naam, brand, category — POS aur receipt pe yehi dikhega" />

        <Input
          label="Product Name *"
          value={basic.name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder={isAccessory ? 'e.g. iPhone 15 Cover, 25W Charger' : 'e.g. iPhone 15 Pro, Samsung Galaxy A54'}
          hint="Ye naam POS aur receipt par dikhega"
        />

        {/* 🎧 Accessory quick names */}
        {isAccessory && !basic.name && (
          <div>
            <div className="text-[10px] uppercase tracking-wider font-extrabold text-emerald-700 dark:text-emerald-400 mb-1.5 flex items-center gap-1">
              <Zap className="h-3 w-3" /> 1-Tap Quick Names
            </div>
            <div className="flex flex-wrap gap-1.5">
              {ACCESSORY_QUICK.map((q) => (
                <button
                  key={q.label}
                  type="button"
                  onClick={() => onChange({ name: q.label })}
                  className="px-2.5 py-1.5 rounded-lg border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-emerald-400 dark:hover:border-emerald-500 text-xs font-extrabold text-slate-700 dark:text-slate-200 transition active:scale-95"
                >
                  {q.emoji} {q.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">Description</label>
          <textarea
            rows={3}
            className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition"
            value={basic.description}
            onChange={(e) => onChange({ description: e.target.value })}
            placeholder={isAccessory ? 'Compatibility, material, wattage...' : 'Features, specs, network compatibility...'}
          />
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">Category</label>
            <select
              className="h-11 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition"
              value={basic.categoryId}
              onChange={(e) => onChange({ categoryId: e.target.value })}
            >
              <option value="">Select category</option>
              {categories.map((c: any) => (<option key={c.id} value={c.id}>{c.name}</option>))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">Brand</label>
            <select
              className="h-11 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition"
              value={basic.brandId}
              onChange={(e) => onChange({ brandId: e.target.value })}
            >
              <option value="">Select brand</option>
              {brands.map((b) => (<option key={b.id} value={b.id}>{b.name}</option>))}
            </select>
          </div>
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
          <Input
            label="Model Number"
            value={basic.modelNumber}
            onChange={(e) => onChange({ modelNumber: e.target.value })}
            placeholder="A2848, SM-G990B"
            hint="Manufacturer model #"
          />
          <Input
            label="SKU"
            value={basic.sku}
            onChange={(e) => onChange({ sku: e.target.value })}
            placeholder="Auto if empty"
          />
          <Input
            label="Barcode"
            value={basic.barcode}
            onChange={(e) => onChange({ barcode: e.target.value })}
            placeholder={isAccessory ? 'POS scan ke liye recommended' : 'Optional'}
          />
        </div>
      </section>

      {/* ═══ SECTION 2 — Product Type ═══ */}
      <section className="rounded-2xl border-2 border-blue-200 dark:border-blue-500/40 bg-gradient-to-br from-blue-50 to-white dark:from-blue-500/10 dark:to-slate-900 p-5 space-y-4">
        <SectionHeader
          icon={Smartphone}
          title="Product Type"
          desc="IMEI-tracked phone hai ya simple-stock accessory?"
          tone="blue"
        />

        <div className="grid sm:grid-cols-3 gap-2.5">
          {PRODUCT_TYPES.map((t) => {
            const active = basic.productType === t.key;
            const Icon = t.icon;
            const colorClasses: Record<string, string> = {
              blue: active
                ? 'border-blue-600 bg-blue-50 dark:bg-blue-500/15 shadow-md ring-2 ring-blue-200 dark:ring-blue-500/30'
                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-blue-400',
              emerald: active
                ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-500/15 shadow-md ring-2 ring-emerald-200 dark:ring-emerald-500/30'
                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-emerald-400',
              amber: active
                ? 'border-amber-600 bg-amber-50 dark:bg-amber-500/15 shadow-md ring-2 ring-amber-200 dark:ring-amber-500/30'
                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-amber-400',
            };
            const iconBg: Record<string, string> = {
              blue: active ? 'bg-blue-600 text-white' : 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300',
              emerald: active ? 'bg-emerald-600 text-white' : 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300',
              amber: active ? 'bg-amber-600 text-white' : 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300',
            };
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => onChange({ productType: t.key })}
                className={[
                  'flex items-start gap-3 p-3 rounded-2xl border-2 text-left transition active:scale-[0.98]',
                  colorClasses[t.color],
                ].join(' ')}
              >
                <div className={['h-10 w-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm', iconBg[t.color]].join(' ')}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-extrabold text-slate-900 dark:text-white text-sm">{t.label}</div>
                  <div className="text-[11px] text-slate-600 dark:text-slate-300 font-semibold leading-snug mt-0.5">{t.desc}</div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold italic mt-1">{t.examples}</div>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* ═══ SECTION 3 — Warranty + PTA (phones only) ═══ */}
      {!isAccessory && (
        <section className="rounded-2xl border-2 border-indigo-200 dark:border-indigo-500/40 bg-gradient-to-br from-indigo-50 to-white dark:from-indigo-500/10 dark:to-slate-900 p-5 space-y-4">
          <SectionHeader
            icon={ShieldCheck}
            title="Warranty & PTA Default"
            desc="Step 3 ke IMEIs ye defaults use karengi"
            tone="indigo"
          />

          <div className="grid sm:grid-cols-2 gap-4">
            <Input
              label="Warranty Period (months)"
              type="number"
              step="1"
              value={basic.warrantyMonths}
              onChange={(e) => onChange({ warrantyMonths: e.target.value === '' ? '' : Number(e.target.value) })}
              placeholder="12"
              hint="Standard warranty duration"
            />
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">Default PTA Status</label>
              <div className="grid grid-cols-5 gap-1.5">
                {(['APPROVED', 'NON_PTA', 'PATCH', 'PENDING', 'EXEMPT'] as PtaStatus[]).map((status) => {
                  const active = basic.defaultPtaStatus === status;
                  const colors = PTA_STATUS_COLORS[status];
                  return (
                    <button
                      key={status}
                      type="button"
                      onClick={() => onChange({ defaultPtaStatus: status })}
                      className={[
                        'h-10 rounded-lg border-2 text-[10px] font-extrabold transition active:scale-95',
                        active
                          ? `${colors.bg} ${colors.text} ${colors.border} shadow-sm ring-2 ring-blue-200 dark:ring-blue-500/30`
                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:border-slate-400',
                      ].join(' ')}
                      title={PTA_STATUS_LABELS[status]}
                    >
                      {PTA_STATUS_LABELS[status].split(' ')[0]}
                    </button>
                  );
                })}
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold mt-1">
                Naya IMEI add hote waqt ye default aajayega
              </p>
            </div>
          </div>
        </section>
      )}

      {/* ═══ SECTION 4 — Pricing ═══ */}
      <section className="rounded-2xl border-2 border-emerald-200 dark:border-emerald-500/40 bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-500/10 dark:to-slate-900 p-5 space-y-4">
        <SectionHeader
          icon={DollarSign}
          title={`Pricing (per ${priceUnit})`}
          desc={isAccessory ? 'Simple — cost aur sale rate' : 'Prices Step 3 ke IMEIs mein auto-fill hongi'}
          tone="emerald"
        />

        <div className="grid sm:grid-cols-3 gap-4">
          <Input
            label="Cost Price (PKR)"
            type="number"
            step="0.01"
            value={basic.costPrice}
            onChange={(e) => onChange({ costPrice: e.target.value === '' ? '' : Number(e.target.value) })}
            placeholder="0"
            hint="Purchase rate"
          />
          <Input
            label="Sale Price (PKR) *"
            type="number"
            step="0.01"
            value={basic.salePrice}
            onChange={(e) => onChange({ salePrice: e.target.value === '' ? '' : Number(e.target.value) })}
            placeholder="0"
            hint="Customer rate"
          />
          <Input
            label="Wholesale Price (PKR)"
            type="number"
            step="0.01"
            value={basic.wholesalePrice}
            onChange={(e) => onChange({ wholesalePrice: e.target.value === '' ? '' : Number(e.target.value) })}
            placeholder="Optional"
            hint="B2B rate"
          />
        </div>

        {sale > 0 && cost > 0 && (
          <div className={[
            'rounded-xl border-2 p-3 flex items-center justify-between',
            isLoss ? 'bg-rose-50 dark:bg-rose-500/10 border-rose-300 dark:border-rose-500/40'
            : margin >= 20 ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-300 dark:border-emerald-500/40'
            : 'bg-amber-50 dark:bg-amber-500/10 border-amber-300 dark:border-amber-500/40',
          ].join(' ')}>
            <div className="flex items-center gap-2">
              <TrendingUp className={[
                'h-5 w-5',
                isLoss ? 'text-rose-700 dark:text-rose-400' : margin >= 20 ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400',
              ].join(' ')} />
              <div>
                <div className={[
                  'text-[10px] uppercase tracking-wider font-extrabold',
                  isLoss ? 'text-rose-700 dark:text-rose-400' : margin >= 20 ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400',
                ].join(' ')}>
                  {isLoss ? '⚠️ Loss Alert — sale price cost se kam!' : `Profit per ${priceUnit}`}
                </div>
                <div className="text-lg font-extrabold tabular-nums leading-tight text-slate-900 dark:text-white">
                  {formatPKRFull(profit)}
                </div>
              </div>
            </div>
            <div className={[
              'text-2xl font-extrabold tabular-nums',
              isLoss ? 'text-rose-700 dark:text-rose-400' : margin >= 20 ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400',
            ].join(' ')}>
              {margin.toFixed(1)}%
            </div>
          </div>
        )}

        <Input
          label="Tax Rate (%)"
          type="number"
          step="0.01"
          value={basic.taxRate}
          onChange={(e) => onChange({ taxRate: e.target.value === '' ? '' : Number(e.target.value) })}
          placeholder="0"
          hint="GST/sales tax if applicable"
        />
      </section>

      {/* ═══ SECTION 5 — Settings ═══ */}
      <section className="rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 space-y-3">
        <SectionHeader icon={Sparkles} title="Product Settings" desc="Visibility aur featured status" />

        <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition border-2 border-transparent hover:border-slate-200 dark:hover:border-slate-700">
          <input type="checkbox" checked={basic.isActive} onChange={(e) => onChange({ isActive: e.target.checked })} className="h-5 w-5 rounded accent-blue-600" />
          <Eye className="h-5 w-5 text-slate-600 dark:text-slate-400" />
          <div className="flex-1">
            <div className="font-extrabold text-slate-900 dark:text-white text-sm">Active</div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-semibold">POS aur catalog mein visible</div>
          </div>
        </label>

        <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition border-2 border-transparent hover:border-slate-200 dark:hover:border-slate-700">
          <input type="checkbox" checked={basic.isFeatured} onChange={(e) => onChange({ isFeatured: e.target.checked })} className="h-5 w-5 rounded accent-amber-500" />
          <Star className="h-5 w-5 text-amber-500" />
          <div className="flex-1">
            <div className="font-extrabold text-slate-900 dark:text-white text-sm">Featured</div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-semibold">Catalog mein highlight — sab se upar</div>
          </div>
        </label>
      </section>

      {/* ═══ SECTION 6 — Tags ═══ */}
      {allTags.length > 0 && (
        <section className="rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 space-y-3">
          <SectionHeader icon={Hash} title="Tags" desc="Product ko organize karne ke liye" />
          <div className="flex flex-wrap gap-2">
            {allTags.map((t) => {
              const active = basic.tagIds?.includes(t.id);
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => toggleTag(t.id)}
                  className={['inline-flex items-center gap-2 px-3 py-1.5 rounded-full border-2 text-sm font-bold transition active:scale-95', active ? 'shadow-sm' : 'opacity-60 hover:opacity-100'].join(' ')}
                  style={{
                    backgroundColor: active ? `${t.color}20` : undefined,
                    borderColor: active ? t.color : undefined,
                    color: active ? t.color : undefined,
                  }}
                  data-inactive={!active || undefined}
                >
                  {!active && <span className="h-2 w-2 rounded-full" style={{ backgroundColor: t.color }} />}
                  <span className={active ? '' : 'text-slate-600 dark:text-slate-300'}>{t.name}</span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* ═══ SECTION 7 — Images ═══ */}
      <section className="rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 space-y-3">
        <SectionHeader icon={ImageIcon} title="Product Images" desc="Pehla image primary — POS pe yehi dikhega" />

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
              <div key={url + idx} className="relative group aspect-square rounded-xl overflow-hidden border-2 border-slate-200 dark:border-slate-700">
                <img src={url} alt={`mobile-${idx}`} className="w-full h-full object-cover" />
                {idx === 0 && (
                  <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded-md bg-blue-600 text-white text-[9px] font-extrabold">PRIMARY</div>
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

function SectionHeader({
  icon: Icon, title, desc, tone = 'slate',
}: { icon: any; title: string; desc: string; tone?: string }) {
  const tones: Record<string, string> = {
    slate: 'from-slate-500 to-slate-700',
    emerald: 'from-emerald-500 to-emerald-700',
    blue: 'from-blue-500 to-blue-700',
    indigo: 'from-indigo-500 to-indigo-700',
  };
  return (
    <div className="flex items-center gap-3 pb-2 border-b-2 border-slate-100 dark:border-slate-800">
      <div className={['h-10 w-10 rounded-xl text-white flex items-center justify-center shadow-md bg-gradient-to-br', tones[tone] ?? tones.slate].join(' ')}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <h3 className="font-extrabold text-slate-900 dark:text-white text-base leading-tight">{title}</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold">{desc}</p>
      </div>
    </div>
  );
}
