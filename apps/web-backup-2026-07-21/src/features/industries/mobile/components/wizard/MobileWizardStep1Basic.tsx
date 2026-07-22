import { useQuery } from '@tanstack/react-query';
import {
  Package, DollarSign, Image as ImageIcon, Sparkles, Star, Eye,
  TrendingUp, Hash, AlertCircle, Smartphone, Cable, Shuffle,
  ShieldCheck, Clock,
} from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { UploadDropzone } from '@/components/uploads';
import { categoriesApi } from '@/api/categories.api';
import { brandsApi } from '@/api/brands.api';
import { tagsApi } from '@/api/tags.api';
import { formatPKRFull } from '@/lib/format';
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
  color: string;
  examples: string;
}> = [
  {
    key: 'PHONE',
    label: 'Phone / Device',
    desc: 'IMEI-tracked device (smartphone, tablet)',
    icon: Smartphone,
    color: 'blue',
    examples: 'iPhone, Samsung, tablets, smartwatches',
  },
  {
    key: 'ACCESSORY',
    label: 'Accessory',
    desc: 'Regular stock, no IMEI needed',
    icon: Cable,
    color: 'emerald',
    examples: 'Chargers, cables, covers, screen protectors',
  },
  {
    key: 'MIXED',
    label: 'Mixed',
    desc: 'Different variants use different types',
    icon: Shuffle,
    color: 'amber',
    examples: 'Sometimes rare — variant chooses its own type',
  },
];

export function MobileWizardStep1Basic({ basic, onChange, errors }: Props) {
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
    onChange({
      tagIds: current.includes(id) ? current.filter((t) => t !== id) : [...current, id],
    });
  };

  const priceUnit = basic.productType === 'ACCESSORY' ? 'unit' : 'device';

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

      {/* SECTION 1 — Identity */}
      <section className="rounded-2xl border-2 border-slate-200 bg-white p-5 space-y-4">
        <SectionHeader icon={Package} title="Product Identity" desc="Model naam, brand, category" />

        <Input
          label="Product Name *"
          value={basic.name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="e.g. iPhone 15 Pro, Samsung Galaxy A54"
          hint="Ye naam POS aur receipt par dikhega"
        />

        <div>
          <label className="block text-sm font-bold text-slate-700 mb-1.5">Description</label>
          <textarea
            rows={3}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            value={basic.description}
            onChange={(e) => onChange({ description: e.target.value })}
            placeholder="Features, specs, network compatibility..."
          />
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5">Category</label>
            <select
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
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
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
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
            placeholder="Optional"
          />
        </div>
      </section>

      {/* SECTION 2 — Product Type */}
      <section className="rounded-2xl border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-white p-5 space-y-4">
        <SectionHeader
          icon={Smartphone}
          title="Product Type"
          desc="Ye product IMEI-tracked hai ya simple stock?"
          tone="blue"
        />

        <div className="grid sm:grid-cols-3 gap-2.5">
          {PRODUCT_TYPES.map((t) => {
            const active = basic.productType === t.key;
            const Icon = t.icon;
            const colorClasses: Record<string, string> = {
              blue: active ? 'border-blue-600 bg-blue-50 shadow-md ring-2 ring-blue-200'
                            : 'border-slate-200 bg-white hover:border-blue-400',
              emerald: active ? 'border-emerald-600 bg-emerald-50 shadow-md ring-2 ring-emerald-200'
                              : 'border-slate-200 bg-white hover:border-emerald-400',
              amber: active ? 'border-amber-600 bg-amber-50 shadow-md ring-2 ring-amber-200'
                            : 'border-slate-200 bg-white hover:border-amber-400',
            };
            const iconBg: Record<string, string> = {
              blue: active ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-700',
              emerald: active ? 'bg-emerald-600 text-white' : 'bg-emerald-100 text-emerald-700',
              amber: active ? 'bg-amber-600 text-white' : 'bg-amber-100 text-amber-700',
            };
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => onChange({ productType: t.key })}
                className={[
                  'flex items-start gap-3 p-3 rounded-2xl border-2 text-left transition',
                  colorClasses[t.color],
                ].join(' ')}
              >
                <div className={['h-10 w-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm', iconBg[t.color]].join(' ')}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-extrabold text-slate-900 text-sm">{t.label}</div>
                  <div className="text-[11px] text-slate-600 font-semibold leading-snug mt-0.5">{t.desc}</div>
                  <div className="text-[10px] text-slate-500 font-bold italic mt-1">{t.examples}</div>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* SECTION 3 — Warranty + PTA Default */}
      <section className="rounded-2xl border-2 border-indigo-200 bg-gradient-to-br from-indigo-50 to-white p-5 space-y-4">
        <SectionHeader
          icon={ShieldCheck}
          title="Warranty & PTA Default"
          desc="IMEIs Step 3 mein ye default use karengi"
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
            <label className="block text-sm font-bold text-slate-700 mb-1.5">Default PTA Status</label>
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
                      'h-10 rounded-lg border-2 text-[10px] font-extrabold transition',
                      active
                        ? `${colors.bg} ${colors.text} ${colors.border} shadow-sm ring-2 ring-blue-200`
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300',
                    ].join(' ')}
                    title={PTA_STATUS_LABELS[status]}
                  >
                    {PTA_STATUS_LABELS[status].split(' ')[0]}
                  </button>
                );
              })}
            </div>
            <p className="text-[10px] text-slate-500 font-semibold mt-1">
              Naya IMEI add hote waqt ye default aajayega
            </p>
          </div>
        </div>
      </section>

      {/* SECTION 4 — Pricing */}
      <section className="rounded-2xl border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-5 space-y-4">
        <SectionHeader
          icon={DollarSign}
          title={`Pricing (per ${priceUnit})`}
          desc="Prices Step 3 mein IMEIs / stock mein auto-fill honge"
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
            isLoss ? 'bg-rose-50 border-rose-300' :
            margin >= 20 ? 'bg-emerald-50 border-emerald-300' :
            'bg-amber-50 border-amber-300',
          ].join(' ')}>
            <div className="flex items-center gap-2">
              <TrendingUp className={[
                'h-5 w-5',
                isLoss ? 'text-rose-700' : margin >= 20 ? 'text-emerald-700' : 'text-amber-700',
              ].join(' ')} />
              <div>
                <div className={[
                  'text-[10px] uppercase tracking-wider font-extrabold',
                  isLoss ? 'text-rose-700' : margin >= 20 ? 'text-emerald-700' : 'text-amber-700',
                ].join(' ')}>
                  {isLoss ? '⚠️ Loss Alert' : `Profit per ${priceUnit}`}
                </div>
                <div className={[
                  'text-lg font-extrabold tabular-nums leading-tight',
                  isLoss ? 'text-rose-900' : 'text-slate-900',
                ].join(' ')}>
                  {formatPKRFull(profit)}
                </div>
              </div>
            </div>
            <div className={[
              'text-2xl font-extrabold tabular-nums',
              isLoss ? 'text-rose-700' : margin >= 20 ? 'text-emerald-700' : 'text-amber-700',
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

      {/* SECTION 5 — Settings */}
      <section className="rounded-2xl border-2 border-slate-200 bg-white p-5 space-y-3">
        <SectionHeader icon={Sparkles} title="Product Settings" desc="Visibility aur featured status" />

        <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl hover:bg-slate-50 transition border-2 border-transparent hover:border-slate-200">
          <input type="checkbox" checked={basic.isActive} onChange={(e) => onChange({ isActive: e.target.checked })} className="h-5 w-5 rounded" />
          <Eye className="h-5 w-5 text-slate-600" />
          <div className="flex-1">
            <div className="font-extrabold text-slate-900 text-sm">Active</div>
            <div className="text-xs text-slate-500 font-semibold">POS aur catalog mein visible</div>
          </div>
        </label>

        <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl hover:bg-slate-50 transition border-2 border-transparent hover:border-slate-200">
          <input type="checkbox" checked={basic.isFeatured} onChange={(e) => onChange({ isFeatured: e.target.checked })} className="h-5 w-5 rounded" />
          <Star className="h-5 w-5 text-amber-500" />
          <div className="flex-1">
            <div className="font-extrabold text-slate-900 text-sm">Featured</div>
            <div className="text-xs text-slate-500 font-semibold">Catalog mein highlight</div>
          </div>
        </label>
      </section>

      {/* SECTION 6 — Tags */}
      {allTags.length > 0 && (
        <section className="rounded-2xl border-2 border-slate-200 bg-white p-5 space-y-3">
          <SectionHeader icon={Hash} title="Tags" desc="Product ko organize karne ke liye" />
          <div className="flex flex-wrap gap-2">
            {allTags.map((t) => {
              const active = basic.tagIds?.includes(t.id);
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => toggleTag(t.id)}
                  className={['inline-flex items-center gap-2 px-3 py-1.5 rounded-full border-2 text-sm font-bold transition', active ? 'shadow-sm' : 'opacity-60 hover:opacity-100'].join(' ')}
                  style={{
                    backgroundColor: active ? `${t.color}20` : '#fff',
                    borderColor: active ? t.color : '#e2e8f0',
                    color: active ? t.color : '#475569',
                  }}
                >
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: t.color }} />
                  {t.name}
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* SECTION 7 — Images */}
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
    <div className="flex items-center gap-3 pb-2 border-b-2 border-slate-100">
      <div className={['h-10 w-10 rounded-xl text-white flex items-center justify-center shadow-md bg-gradient-to-br', tones[tone] ?? tones.slate].join(' ')}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <h3 className="font-extrabold text-slate-900 text-base leading-tight">{title}</h3>
        <p className="text-xs text-slate-500 font-semibold">{desc}</p>
      </div>
    </div>
  );
}
