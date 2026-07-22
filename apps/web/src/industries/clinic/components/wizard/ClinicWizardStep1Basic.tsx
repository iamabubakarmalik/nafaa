import { useQuery } from '@tanstack/react-query';
import {
  Package, DollarSign, Image as ImageIcon, Eye, Star, Zap,
  Sparkles, Tag, ArrowRight, AlertTriangle, Info, X, Stethoscope, Clock,
} from 'lucide-react';
import { Input } from '@core/ui/Input';
import { Button } from '@core/ui/Button';
import { UploadDropzone } from '@core/components/uploads';
import { categoriesApi } from '@modules/inventory/categories/api/categories.api';
import { brandsApi } from '@modules/inventory/brands/api/brands.api';
import { tagsApi } from '@modules/inventory/tags/api/tags.api';
import { SERVICE_CATEGORIES } from '../../api/constants';
import type { ClinicWizardBasic } from '../../hooks/useClinicWizard';

interface Props {
  basic: ClinicWizardBasic;
  onChange: (patch: Partial<ClinicWizardBasic>) => void;
  onNext: () => void;
  validation: { valid: boolean; errors: string[] };
}

export function ClinicWizardStep1Basic({ basic, onChange, onNext, validation }: Props) {
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

  return (
    <div className="space-y-5">
      <section className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-slate-200 dark:border-neutral-800 shadow-sm p-5 space-y-4">
        <SectionHeader icon={Package} title="Service Identity" desc="Clinical service details" />

        <Input
          label="Service Name *"
          value={basic.name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="e.g. Cardiology Consultation, CBC Test, Root Canal"
          autoFocus
        />

        <div>
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
            Service Category *
          </label>
          <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-8 gap-2">
            {SERVICE_CATEGORIES.map((c) => {
              const active = basic.serviceCategory === c.value;
              return (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => onChange({ serviceCategory: c.value })}
                  className={[
                    'group px-2 py-2.5 rounded-xl border-2 transition-all flex flex-col items-center gap-1',
                    active
                      ? 'border-cyan-500 bg-gradient-to-br from-cyan-50 to-blue-50 shadow-md ring-2 ring-cyan-200'
                      : 'border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:border-cyan-300',
                  ].join(' ')}
                >
                  <span className="text-xl group-hover:scale-110 transition-transform">{c.emoji}</span>
                  <span className={[
                    'text-[9px] font-extrabold text-center leading-tight',
                    active ? 'text-cyan-800' : 'text-slate-700 dark:text-slate-300',
                  ].join(' ')}>
                    {c.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
          <Input
            label="Sub-category"
            value={basic.subcategory}
            onChange={(e) => onChange({ subcategory: e.target.value })}
            placeholder="e.g. Pediatric, Adult"
          />
          <Input
            label="Service Code"
            value={basic.serviceCode}
            onChange={(e) => onChange({ serviceCode: e.target.value })}
            placeholder="e.g. CONS-001"
          />
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Duration (min)</label>
            <div className="relative">
              <Clock className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="number"
                value={basic.durationMin}
                onChange={(e) => onChange({ durationMin: e.target.value === '' ? '' : Number(e.target.value) })}
                placeholder="15"
                className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 pl-10 pr-3 text-sm font-bold tabular-nums focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            Description
          </label>
          <textarea
            rows={3}
            className="w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm focus:outline-none focus:border-cyan-500 resize-none"
            value={basic.descriptionLong}
            onChange={(e) => onChange({ descriptionLong: e.target.value })}
            placeholder="Detailed clinical service description..."
          />
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Base Category</label>
            <select
              className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm focus:outline-none focus:border-cyan-500"
              value={basic.categoryId}
              onChange={(e) => onChange({ categoryId: e.target.value })}
            >
              <option value="">No category</option>
              {categories.map((c: any) => (<option key={c.id} value={c.id}>{c.name}</option>))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Brand / Provider</label>
            <select
              className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm focus:outline-none focus:border-cyan-500"
              value={basic.brandId}
              onChange={(e) => onChange({ brandId: e.target.value })}
            >
              <option value="">No brand</option>
              {brands.map((b) => (<option key={b.id} value={b.id}>{b.name}</option>))}
            </select>
          </div>
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
          <Input label="SKU (optional)" value={basic.sku} onChange={(e) => onChange({ sku: e.target.value })} placeholder="Auto if empty" />
          <Input label="Barcode" value={basic.barcode} onChange={(e) => onChange({ barcode: e.target.value })} placeholder="Optional" />
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Unit</label>
            <select
              value={basic.unit}
              onChange={(e) => onChange({ unit: e.target.value })}
              className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-cyan-500"
            >
              <option value="service">Service</option>
              <option value="visit">Visit</option>
              <option value="session">Session</option>
              <option value="procedure">Procedure</option>
              <option value="test">Test</option>
              <option value="package">Package</option>
              <option value="hour">Hour</option>
            </select>
          </div>
        </div>
      </section>

      {/* ─── PRICING TIERS ─── */}
      <section className="rounded-3xl bg-gradient-to-br from-cyan-50 via-white to-blue-50 dark:from-cyan-950/30 dark:via-neutral-900 dark:to-blue-950/30 border-2 border-cyan-200 dark:border-cyan-800 shadow-sm p-5 space-y-4">
        <SectionHeader
          icon={DollarSign}
          title="Pricing Tiers"
          desc="Base price required. Follow-up, emergency, home visit, telemedicine — all optional."
        />

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <PriceInput label="Base Price *" emoji="🩺" value={basic.basePrice} onChange={(v: any) => onChange({ basePrice: v })} tone="cyan" required />
          <PriceInput label="Follow-up" emoji="🔁" value={basic.followUpPrice} onChange={(v: any) => onChange({ followUpPrice: v })} tone="blue" />
          <PriceInput label="Emergency" emoji="🚨" value={basic.emergencyPrice} onChange={(v: any) => onChange({ emergencyPrice: v })} tone="red" />
          <PriceInput label="Telemedicine" emoji="📹" value={basic.telemedicinePrice} onChange={(v: any) => onChange({ telemedicinePrice: v })} tone="purple" />
          <PriceInput label="Home Visit" emoji="🏠" value={basic.homeVisitPrice} onChange={(v: any) => onChange({ homeVisitPrice: v })} tone="teal" />
          <PriceInput label="Discounted" emoji="💰" value={basic.discountedPrice} onChange={(v: any) => onChange({ discountedPrice: v })} tone="amber" />
        </div>

        <div className="grid sm:grid-cols-2 gap-3 pt-3 border-t border-cyan-200/60">
          <Input
            label="Tax Rate (%)"
            type="number"
            value={basic.taxRate}
            onChange={(e) => onChange({ taxRate: e.target.value === '' ? '' : Number(e.target.value) })}
            placeholder="0"
          />
        </div>
      </section>

      {/* ─── IMAGES ─── */}
      <section className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-slate-200 dark:border-neutral-800 shadow-sm p-5 space-y-4">
        <SectionHeader icon={ImageIcon} title="Service Images" desc="First image is primary" />
        <UploadDropzone
          purpose="product-image"
          maxFiles={10}
          onUploaded={(records) => {
            onChange({ imageUrls: [...basic.imageUrls, ...records.map((r) => r.url)] });
          }}
          hint="Service photos, brochures, procedure images"
        />
        {basic.imageUrls.length > 0 && (
          <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-6 gap-2">
            {basic.imageUrls.map((url, idx) => (
              <div key={idx} className="group relative aspect-square rounded-xl overflow-hidden border-2 border-slate-200">
                <img src={url} alt="" className="w-full h-full object-cover" />
                {idx === 0 && (
                  <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-cyan-600 text-white text-[9px] font-extrabold">PRIMARY</div>
                )}
                <button
                  onClick={() => onChange({ imageUrls: basic.imageUrls.filter((_, i) => i !== idx) })}
                  className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ─── FLAGS ─── */}
      <section className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-slate-200 dark:border-neutral-800 shadow-sm p-5 space-y-4">
        <SectionHeader icon={Sparkles} title="Visibility & Marketing" desc="Badges & flags" />
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2">
          <FlagCard active={basic.isActive} onToggle={(v: any) => onChange({ isActive: v })} icon={Eye} label="Active" desc="Visible" tone="emerald" />
          <FlagCard active={basic.isFeatured} onToggle={(v: any) => onChange({ isFeatured: v })} icon={Star} label="Featured" desc="Top pick" tone="amber" />
          <FlagCard active={basic.isPopular} onToggle={(v: any) => onChange({ isPopular: v })} icon={Zap} label="Popular" desc="Trending" tone="red" />
          <FlagCard active={basic.isDiscounted} onToggle={(v: any) => onChange({ isDiscounted: v })} icon={Sparkles} label="Discounted" desc="On sale" tone="fuchsia" />
        </div>
      </section>

      {/* ─── TAGS ─── */}
      {allTags.length > 0 && (
        <section className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-slate-200 dark:border-neutral-800 shadow-sm p-5 space-y-3">
          <SectionHeader icon={Tag} title="Tags" desc="For search & filtering" />
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

      {!validation.valid && validation.errors.length > 0 && (
        <div className="rounded-2xl bg-rose-50 dark:bg-rose-950/30 border-2 border-rose-300 p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-rose-700 shrink-0 mt-0.5" />
          <div className="flex-1 text-sm text-rose-900">
            <div className="font-extrabold mb-1">Fix these:</div>
            <ul className="list-disc list-inside space-y-0.5 text-xs">
              {validation.errors.map((e, i) => (<li key={i}>{e}</li>))}
            </ul>
          </div>
        </div>
      )}

      <div className="rounded-2xl bg-gradient-to-r from-cyan-50 to-blue-50 border-2 border-cyan-200 p-4 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <Info className="h-5 w-5 text-cyan-700 shrink-0" />
          <div className="text-sm text-cyan-900">
            <div className="font-extrabold">Step 1 ready?</div>
            <div className="text-[11px] text-cyan-700 font-semibold">Next: prep instructions, requirements, package details</div>
          </div>
        </div>
        <Button onClick={onNext} disabled={!validation.valid} className="bg-gradient-to-r from-cyan-600 to-blue-700 shadow-md">
          Next: Requirements <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function SectionHeader({ icon: Icon, title, desc }: any) {
  return (
    <div className="flex items-center gap-3 pb-3 border-b-2 border-slate-100 dark:border-neutral-800">
      <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 text-white flex items-center justify-center shadow-md">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <h3 className="font-extrabold text-slate-900 dark:text-white text-lg leading-tight">{title}</h3>
        <p className="text-[11px] text-slate-500 font-semibold">{desc}</p>
      </div>
    </div>
  );
}

function PriceInput({ label, emoji, value, onChange, tone, required }: any) {
  const tones: Record<string, string> = {
    cyan: 'border-cyan-300 bg-cyan-50 text-cyan-900 focus:border-cyan-500',
    blue: 'border-blue-300 bg-blue-50 text-blue-900 focus:border-blue-500',
    red: 'border-red-300 bg-red-50 text-red-900 focus:border-red-500',
    purple: 'border-purple-300 bg-purple-50 text-purple-900 focus:border-purple-500',
    teal: 'border-teal-300 bg-teal-50 text-teal-900 focus:border-teal-500',
    amber: 'border-amber-300 bg-amber-50 text-amber-900 focus:border-amber-500',
  };
  return (
    <div>
      <label className="block text-[11px] font-extrabold text-slate-700 mb-1.5 uppercase tracking-wider">
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

function FlagCard({ active, onToggle, icon: Icon, label, desc, tone }: any) {
  const tones: Record<string, string> = {
    emerald: 'from-emerald-500 to-green-600 border-emerald-500',
    amber: 'from-amber-500 to-orange-500 border-amber-500',
    red: 'from-red-500 to-rose-600 border-red-500',
    fuchsia: 'from-fuchsia-500 to-purple-600 border-fuchsia-500',
  };
  return (
    <button
      type="button"
      onClick={() => onToggle(!active)}
      className={[
        'p-3 rounded-xl border-2 text-left transition-all',
        active ? 'bg-gradient-to-br ' + tones[tone] + ' text-white shadow-md'
          : 'border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:border-slate-300',
      ].join(' ')}
    >
      <div className="flex items-center gap-2">
        <Icon className={'h-4 w-4 ' + (active ? 'text-white' : 'text-slate-500')} />
        <div className={'font-extrabold text-sm ' + (active ? 'text-white' : 'text-slate-900')}>{label}</div>
      </div>
      <div className={'text-[10px] font-semibold mt-0.5 ' + (active ? 'text-white/85' : 'text-slate-500')}>{desc}</div>
    </button>
  );
}
