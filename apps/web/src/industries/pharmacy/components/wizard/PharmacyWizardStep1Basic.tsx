import { useQuery } from '@tanstack/react-query';
import {
  Pill, DollarSign, Image as ImageIcon, Sparkles, Star, Eye,
  TrendingUp, Hash, AlertCircle, Percent, Tag, Building,
  Award, Package, FileText, Palette,
} from 'lucide-react';
import { Input } from '@core/ui/Input';
import { UploadDropzone } from '@core/components/uploads';
import { categoriesApi } from '@modules/inventory/categories/api/categories.api';
import { brandsApi } from '@modules/inventory/brands/api/brands.api';
import { tagsApi } from '@modules/inventory/tags/api/tags.api';
import { formatPKRFull } from '@core/lib/format';
import type { PharmacyWizardBasic } from '../../hooks/usePharmacyWizard';

interface Props {
  basic: PharmacyWizardBasic;
  onChange: (patch: Partial<PharmacyWizardBasic>) => void;
  errors: string[];
}

const UNIT_PRESETS = [
  { value: 'tablet', label: 'Tablet', hint: '💊' },
  { value: 'capsule', label: 'Capsule', hint: '💊' },
  { value: 'strip', label: 'Strip', hint: '📦' },
  { value: 'bottle', label: 'Bottle', hint: '🍼' },
  { value: 'ml', label: 'mL', hint: '💧' },
  { value: 'vial', label: 'Vial', hint: '🧪' },
  { value: 'sachet', label: 'Sachet', hint: '📄' },
  { value: 'ampule', label: 'Ampule', hint: '💉' },
];

const DOSAGE_FORMS = [
  'Tablet', 'Capsule', 'Syrup', 'Suspension', 'Injection', 'Cream',
  'Ointment', 'Drops', 'Inhaler', 'Sachet', 'Powder', 'Suppository',
  'Lotion', 'Gel', 'Spray', 'Patch',
];

const BRAND_TIERS = [
  { value: 'PREMIUM', label: 'Premium', color: 'purple' },
  { value: 'STANDARD', label: 'Standard', color: 'blue' },
  { value: 'ECONOMY', label: 'Economy', color: 'green' },
  { value: 'GENERIC', label: 'Generic', color: 'gray' },
];

export function PharmacyWizardStep1Basic({ basic, onChange, errors }: Props) {
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
            <div className="font-extrabold mb-0.5">Fix before Next:</div>
            <ul className="list-disc pl-4 space-y-0.5">
              {errors.map((e, i) => <li key={i}>{e}</li>)}
            </ul>
          </div>
        </div>
      )}

      {/* Identity */}
      <section className="rounded-2xl border-2 border-slate-200 bg-white p-5 space-y-4">
        <SectionHeader icon={Pill} title="Medicine Identity" desc="Brand name, category, code" />

        <Input
          label="Medicine Name *"
          value={basic.name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="e.g. Panadol Extra 500mg, Augmentin 625mg"
          hint="Brand name jaisa strip par likha hai"
        />

        <div>
          <label className="block text-sm font-bold text-slate-700 mb-1.5">Description</label>
          <textarea
            rows={2}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
            value={basic.description}
            onChange={(e) => onChange({ description: e.target.value })}
            placeholder="What it treats, brief info..."
          />
        </div>

        <Input
          label="Indication"
          value={basic.indication}
          onChange={(e) => onChange({ indication: e.target.value })}
          placeholder="Pain, Fever, Infection..."
          hint="Kis ke liye use hota hai"
          leftIcon={<FileText className="h-4 w-4 text-slate-400" />}
        />

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5">Category</label>
            <select
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:border-teal-500"
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
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:border-teal-500"
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
            label="SKU / Item Code"
            value={basic.sku}
            onChange={(e) => onChange({ sku: e.target.value })}
            placeholder="PAN-500-EX"
            leftIcon={<Hash className="h-4 w-4 text-slate-400" />}
          />
          <Input
            label="Barcode"
            value={basic.barcode}
            onChange={(e) => onChange({ barcode: e.target.value })}
            placeholder="8901234567890"
            hint="Strip / bottle par scan karo"
          />
        </div>
      </section>

      {/* DRAP Registration */}
      <section className="rounded-2xl border-2 border-teal-200 bg-gradient-to-br from-teal-50 to-white p-5 space-y-4">
        <SectionHeader icon={Award} title="DRAP Registration" desc="Regulatory info" tone="teal" />

        <div className="grid sm:grid-cols-2 gap-4">
          <Input
            label="DRAP Registration #"
            value={basic.registrationNumber}
            onChange={(e) => onChange({ registrationNumber: e.target.value })}
            placeholder="e.g. 001234"
            hint="Drug Regulatory Authority of Pakistan"
          />
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5">Approval Date</label>
            <input
              type="date"
              value={basic.approvalDate}
              onChange={(e) => onChange({ approvalDate: e.target.value })}
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold focus:outline-none focus:border-teal-500"
            />
          </div>
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
          <Input
            label="Manufacturer"
            value={basic.manufacturer}
            onChange={(e) => onChange({ manufacturer: e.target.value })}
            placeholder="GSK / Getz / Bosch"
            leftIcon={<Building className="h-4 w-4 text-slate-400" />}
          />
          <Input
            label="Country of Origin"
            value={basic.countryOfOrigin}
            onChange={(e) => onChange({ countryOfOrigin: e.target.value })}
            placeholder="Pakistan"
          />
          <Input
            label="Imported By"
            value={basic.importedBy}
            onChange={(e) => onChange({ importedBy: e.target.value })}
            placeholder="If imported"
          />
        </div>
      </section>

      {/* Dosage Form */}
      <section className="rounded-2xl border-2 border-slate-200 bg-white p-5 space-y-4">
        <SectionHeader icon={Package} title="Dosage Form & Packaging" desc="Physical characteristics" />

        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">Dosage Form</label>
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5">
            {DOSAGE_FORMS.map((form) => {
              const active = basic.dosageForm === form;
              return (
                <button
                  key={form}
                  type="button"
                  onClick={() => onChange({ dosageForm: form })}
                  className={[
                    'py-2 rounded-lg text-[10px] font-extrabold transition border-2',
                    active
                      ? 'border-teal-600 bg-teal-600 text-white'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-teal-400',
                  ].join(' ')}
                >
                  {form}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <Input
            label="Pack Size"
            value={basic.packSize}
            onChange={(e) => onChange({ packSize: e.target.value })}
            placeholder="10 tablets / 60ml / 20's"
          />
          <Input
            label="Pack Unit"
            value={basic.packUnit}
            onChange={(e) => onChange({ packUnit: e.target.value })}
            placeholder="strip / bottle / box"
          />
        </div>

        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">Selling Unit</label>
          <div className="grid grid-cols-4 gap-2">
            {UNIT_PRESETS.map((u) => {
              const active = basic.unit === u.value;
              return (
                <button
                  key={u.value}
                  type="button"
                  onClick={() => onChange({ unit: u.value })}
                  className={[
                    'h-16 rounded-xl border-2 text-sm font-extrabold transition flex flex-col items-center justify-center gap-1',
                    active
                      ? 'border-teal-600 bg-teal-600 text-white shadow-md'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-teal-400',
                  ].join(' ')}
                >
                  <span className="text-xl">{u.hint}</span>
                  <span>{u.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
          <Input
            label="Color"
            value={basic.color}
            onChange={(e) => onChange({ color: e.target.value })}
            placeholder="White, Yellow..."
            leftIcon={<Palette className="h-4 w-4 text-slate-400" />}
          />
          <Input
            label="Shape"
            value={basic.shape}
            onChange={(e) => onChange({ shape: e.target.value })}
            placeholder="Round, Oval..."
          />
          <Input
            label="Markings"
            value={basic.markings}
            onChange={(e) => onChange({ markings: e.target.value })}
            placeholder="GSK 500"
            hint="Imprint on tablet"
          />
        </div>
      </section>

      {/* Brand Tier & Generic */}
      <section className="rounded-2xl border-2 border-violet-200 bg-gradient-to-br from-violet-50 to-white p-5 space-y-4">
        <SectionHeader icon={Sparkles} title="Brand Tier & Type" desc="Positioning" tone="violet" />

        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">Brand Tier</label>
          <div className="grid grid-cols-4 gap-2">
            {BRAND_TIERS.map((tier) => {
              const active = basic.brandTier === tier.value;
              return (
                <button
                  key={tier.value}
                  type="button"
                  onClick={() => onChange({ brandTier: tier.value })}
                  className={[
                    'p-3 rounded-xl border-2 text-center transition',
                    active
                      ? 'border-violet-600 bg-violet-600 text-white shadow-md'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-violet-400',
                  ].join(' ')}
                >
                  <div className="text-sm font-extrabold">{tier.label}</div>
                </button>
              );
            })}
          </div>
        </div>

        <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl border-2 border-emerald-200 bg-emerald-50 hover:bg-emerald-100 transition">
          <input
            type="checkbox"
            checked={basic.isGeneric}
            onChange={(e) => onChange({ isGeneric: e.target.checked })}
            className="h-5 w-5 rounded"
          />
          <div className="flex-1">
            <div className="font-extrabold text-emerald-900 text-sm">Generic Medicine</div>
            <div className="text-xs text-emerald-700 font-semibold">Non-branded, low-cost equivalent</div>
          </div>
        </label>
      </section>

      {/* Pricing */}
      <section className="rounded-2xl border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-5 space-y-4">
        <SectionHeader icon={DollarSign} title="Pricing" desc={`Per ${basic.unit || 'unit'}`} tone="emerald" />

        <div className="grid sm:grid-cols-4 gap-4">
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
            hint="Customer rate"
          />
          <Input
            label="Wholesale (PKR)"
            type="number" step="0.01"
            value={basic.wholesalePrice}
            onChange={(e) => onChange({ wholesalePrice: e.target.value === '' ? '' : Number(e.target.value) })}
            placeholder="Optional"
            hint="B2B rate"
          />
          <Input
            label="MRP (PKR)"
            type="number" step="0.01"
            value={basic.mrpPrice}
            onChange={(e) => onChange({ mrpPrice: e.target.value === '' ? '' : Number(e.target.value) })}
            placeholder="Optional"
            hint="Printed MRP"
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
              <TrendingUp className={['h-5 w-5',
                isLoss ? 'text-rose-700' : margin >= 20 ? 'text-emerald-700' : 'text-amber-700'].join(' ')} />
              <div>
                <div className={['text-[10px] uppercase tracking-wider font-extrabold',
                  isLoss ? 'text-rose-700' : margin >= 20 ? 'text-emerald-700' : 'text-amber-700'].join(' ')}>
                  {isLoss ? '⚠️ Loss Alert' : `Profit per ${basic.unit || 'unit'}`}
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

        <Input
          label="Tax Rate (%)"
          type="number" step="0.01"
          value={basic.taxRate}
          onChange={(e) => onChange({ taxRate: e.target.value === '' ? '' : Number(e.target.value) })}
          placeholder="0"
          hint="Sales tax if applicable"
          leftIcon={<Percent className="h-4 w-4 text-slate-400" />}
        />
      </section>

      {/* Stock (when batches off) */}
      <section className="rounded-2xl border-2 border-slate-200 bg-white p-5 space-y-4">
        <SectionHeader icon={Package} title="Base Stock" desc="Batches step mein detailed tracking available" />

        <div className="grid sm:grid-cols-2 gap-4">
          <Input
            label={`Current Stock (${basic.unit})`}
            type="number" step="0.01"
            value={basic.currentStock}
            onChange={(e) => onChange({ currentStock: Number(e.target.value || 0) })}
            hint="Simple total (batches off case)"
          />
          <Input
            label="Low Stock Alert"
            type="number" step="1"
            value={basic.lowStockAlert}
            onChange={(e) => onChange({ lowStockAlert: Number(e.target.value || 0) })}
            hint="Neeche is se → alert"
          />
        </div>
      </section>

      {/* Settings */}
      <section className="rounded-2xl border-2 border-slate-200 bg-white p-5 space-y-3">
        <SectionHeader icon={Sparkles} title="Visibility Settings" desc="Active, featured" />

        <div className="grid sm:grid-cols-2 gap-2">
          <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl hover:bg-slate-50 transition border-2 border-transparent hover:border-slate-200">
            <input type="checkbox" checked={basic.isActive}
              onChange={(e) => onChange({ isActive: e.target.checked })} className="h-5 w-5 rounded" />
            <Eye className="h-5 w-5 text-slate-600" />
            <div className="flex-1">
              <div className="font-extrabold text-slate-900 text-sm">Active</div>
              <div className="text-xs text-slate-500 font-semibold">POS aur catalog visible</div>
            </div>
          </label>

          <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl hover:bg-slate-50 transition border-2 border-transparent hover:border-slate-200">
            <input type="checkbox" checked={basic.isFeatured}
              onChange={(e) => onChange({ isFeatured: e.target.checked })} className="h-5 w-5 rounded" />
            <Star className="h-5 w-5 text-amber-500" />
            <div className="flex-1">
              <div className="font-extrabold text-slate-900 text-sm">Featured</div>
              <div className="text-xs text-slate-500 font-semibold">Catalog highlight</div>
            </div>
          </label>
        </div>
      </section>

      {/* Tags */}
      {allTags.length > 0 && (
        <section className="rounded-2xl border-2 border-slate-200 bg-white p-5 space-y-3">
          <SectionHeader icon={Tag} title="Tags" desc="Organize medicines" />
          <div className="flex flex-wrap gap-2">
            {allTags.map((t) => {
              const active = basic.tagIds?.includes(t.id);
              return (
                <button
                  key={t.id} type="button" onClick={() => toggleTag(t.id)}
                  className={['inline-flex items-center gap-2 px-3 py-1.5 rounded-full border-2 text-sm font-bold transition',
                    active ? 'shadow-sm' : 'opacity-60 hover:opacity-100'].join(' ')}
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

      {/* Images */}
      <section className="rounded-2xl border-2 border-slate-200 bg-white p-5 space-y-3">
        <SectionHeader icon={ImageIcon} title="Product Images" desc="Strip / bottle photos" />

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
                <img src={url} alt={`med-${idx}`} className="w-full h-full object-cover" />
                {idx === 0 && (
                  <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded-md bg-teal-600 text-white text-[9px] font-extrabold">PRIMARY</div>
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
    teal: 'from-teal-500 to-cyan-700',
    violet: 'from-violet-500 to-purple-700',
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
