import {
  ShieldCheck, AlertTriangle, Info, Package, DollarSign,
  Sparkles, Star, TrendingUp, Eye, AlertCircle, Percent,
  HeartPulse,
} from 'lucide-react';
import { Input } from '@/components/ui/Input';
import type { AgriWizardSafety } from '../../hooks/useAgriWizard';

interface Props {
  safety: AgriWizardSafety;
  baseUnit: string;
  onChange: (patch: Partial<AgriWizardSafety>) => void;
  errors: string[];
}

const TOXICITY_LEVELS = [
  { value: 'LOW', label: 'Low', color: 'bg-green-500' },
  { value: 'MODERATE', label: 'Moderate', color: 'bg-yellow-500' },
  { value: 'HIGH', label: 'High', color: 'bg-orange-500' },
  { value: 'VERY_HIGH', label: 'Very High', color: 'bg-red-600' },
  { value: 'EXTREMELY_HAZARDOUS', label: 'Extremely Hazardous', color: 'bg-red-900' },
];

const HAZARD_CLASSES = [
  { value: '', label: 'None' },
  { value: 'Ia', label: 'Ia - Extremely Hazardous' },
  { value: 'Ib', label: 'Ib - Highly Hazardous' },
  { value: 'II', label: 'II - Moderately Hazardous' },
  { value: 'III', label: 'III - Slightly Hazardous' },
  { value: 'IV', label: 'IV - Unlikely to Present Hazard' },
];

export function AgriWizardStep3Safety({ safety, baseUnit, onChange, errors }: Props) {
  return (
    <div className="space-y-5">
      {errors.length > 0 && (
        <div className="rounded-2xl bg-rose-50 border-2 border-rose-200 p-3 flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
          <div className="text-xs text-rose-900">
            <div className="font-extrabold mb-0.5">Fix before saving:</div>
            <ul className="list-disc pl-4 space-y-0.5">
              {errors.map((e, i) => <li key={i}>{e}</li>)}
            </ul>
          </div>
        </div>
      )}

      <div className="rounded-2xl bg-gradient-to-br from-amber-50 to-white border-2 border-amber-200 p-4 flex items-start gap-3">
        <div className="h-10 w-10 rounded-xl bg-amber-600 text-white flex items-center justify-center shadow-md shrink-0">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <h3 className="font-extrabold text-amber-900 text-sm">Safety, Stock & Settings</h3>
          <p className="text-xs text-amber-800 font-semibold mt-0.5 leading-relaxed">
            Hazard info, storage alerts, bulk pricing, aur product flags. Sab optional hai.
          </p>
        </div>
      </div>

      {/* Hazard & Safety */}
      <section className="rounded-2xl border-2 border-rose-200 bg-gradient-to-br from-rose-50 to-white p-5 space-y-4">
        <SectionHeader icon={AlertTriangle} title="Hazard & Safety" desc="Toxicity, PPE, warning labels" tone="amber" />

        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">Toxicity Level</label>
          <div className="grid grid-cols-5 gap-2">
            {TOXICITY_LEVELS.map((t) => {
              const active = safety.toxicityLevel === t.value;
              return (
                <button key={t.value} type="button"
                  onClick={() => onChange({ toxicityLevel: active ? '' : t.value })}
                  className={['p-2 rounded-xl border-2 text-center transition',
                    active ? t.color + ' text-white border-current shadow-md scale-105'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-rose-400'].join(' ')}>
                  <div className="text-xs font-extrabold">{t.label}</div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <Input label="PPE Period (hours)" type="number" value={safety.ppePeriod}
            onChange={(e) => onChange({ ppePeriod: e.target.value === '' ? '' : Number(e.target.value) })}
            placeholder="e.g. 24" hint="Personal protection needed for X hours" />
          <Input label="Re-Entry Period (hours)" type="number" value={safety.reEntryPeriod}
            onChange={(e) => onChange({ reEntryPeriod: e.target.value === '' ? '' : Number(e.target.value) })}
            placeholder="e.g. 48" hint="Safe to re-enter field after X hours" />
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <Input label="Warning Label" value={safety.warningLabel}
            onChange={(e) => onChange({ warningLabel: e.target.value })}
            placeholder="e.g. POISON, HARMFUL, DANGER" />
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5">Hazard Class (WHO)</label>
            <select
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold focus:outline-none focus:border-rose-500"
              value={safety.hazardClass}
              onChange={(e) => onChange({ hazardClass: e.target.value })}
            >
              {HAZARD_CLASSES.map((h) => (<option key={h.value} value={h.value}>{h.label}</option>))}
            </select>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-2">
          <label className={['flex items-center gap-3 cursor-pointer p-3 rounded-xl transition border-2',
            safety.isRestricted ? 'border-rose-600 bg-rose-100' : 'border-slate-200 hover:border-rose-400'].join(' ')}>
            <input type="checkbox" checked={safety.isRestricted}
              onChange={(e) => onChange({ isRestricted: e.target.checked })} className="h-5 w-5 rounded" />
            <AlertTriangle className={['h-5 w-5', safety.isRestricted ? 'text-rose-600' : 'text-slate-400'].join(' ')} />
            <div className="flex-1">
              <div className="font-extrabold text-slate-900 text-sm">Restricted Product</div>
              <div className="text-xs text-slate-500 font-semibold">Special license required to sell</div>
            </div>
          </label>
          <label className={['flex items-center gap-3 cursor-pointer p-3 rounded-xl transition border-2',
            safety.requiresLicense ? 'border-amber-600 bg-amber-100' : 'border-slate-200 hover:border-amber-400'].join(' ')}>
            <input type="checkbox" checked={safety.requiresLicense}
              onChange={(e) => onChange({ requiresLicense: e.target.checked })} className="h-5 w-5 rounded" />
            <ShieldCheck className={['h-5 w-5', safety.requiresLicense ? 'text-amber-600' : 'text-slate-400'].join(' ')} />
            <div className="flex-1">
              <div className="font-extrabold text-slate-900 text-sm">Requires License</div>
              <div className="text-xs text-slate-500 font-semibold">Buyer must have agri license</div>
            </div>
          </label>
        </div>

        <div>
          <label className="block text-sm font-bold text-slate-700 mb-1.5">Precautions</label>
          <textarea
            rows={2}
            value={safety.precautions}
            onChange={(e) => onChange({ precautions: e.target.value })}
            placeholder="Wear gloves and mask. Do not inhale spray. Keep away from children..."
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-rose-500"
          />
        </div>

        <div>
          <label className="block text-sm font-bold text-slate-700 mb-1.5">First Aid</label>
          <textarea
            rows={2}
            value={safety.firstAid}
            onChange={(e) => onChange({ firstAid: e.target.value })}
            placeholder="In case of contact with eyes, rinse with water for 15 minutes. If swallowed, seek medical attention immediately..."
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-rose-500"
          />
        </div>

        <Input label="MSDS URL (Material Safety Data Sheet)" value={safety.msdsUrl}
          onChange={(e) => onChange({ msdsUrl: e.target.value })}
          placeholder="https://..." />
      </section>

      {/* Stock */}
      <section className="rounded-2xl border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-5 space-y-4">
        <SectionHeader icon={Package} title="Stock & Alerts" desc="Current stock, reorder level" tone="emerald" />

        <div className="grid sm:grid-cols-3 gap-4">
          <Input label={`Current Stock (${baseUnit})`} type="number" step="0.01" value={safety.currentStock}
            onChange={(e) => onChange({ currentStock: e.target.value === '' ? '' : Number(e.target.value) })}
            placeholder="0" hint="Kitna abhi hai" />
          <Input label="Reorder Level" type="number" value={safety.reorderLevel}
            onChange={(e) => onChange({ reorderLevel: e.target.value === '' ? '' : Number(e.target.value) })}
            placeholder="e.g. 20" hint="Auto-reorder trigger" />
          <Input label="Low Stock Alert" type="number" value={safety.minStockAlert}
            onChange={(e) => onChange({ minStockAlert: e.target.value === '' ? '' : Number(e.target.value) })}
            placeholder="5" hint="Warning threshold" />
        </div>
      </section>

      {/* Bulk Pricing */}
      <section className="rounded-2xl border-2 border-violet-200 bg-gradient-to-br from-violet-50 to-white p-5 space-y-4">
        <SectionHeader icon={DollarSign} title="Bulk Pricing" desc="Discount for bulk orders" tone="sky" />

        <div className="grid sm:grid-cols-2 gap-4">
          <Input label="Bulk Discount Threshold" type="number" value={safety.bulkDiscountThreshold}
            onChange={(e) => onChange({ bulkDiscountThreshold: e.target.value === '' ? '' : Number(e.target.value) })}
            placeholder="e.g. 10" hint={`Buy ${safety.bulkDiscountThreshold || 'X'}+ ${baseUnit} → discount`} />
          <Input label="Bulk Discount (%)" type="number" step="0.1" value={safety.bulkDiscountPct}
            onChange={(e) => onChange({ bulkDiscountPct: e.target.value === '' ? '' : Number(e.target.value) })}
            placeholder="e.g. 5" leftIcon={<Percent className="h-4 w-4 text-slate-400" />} />
        </div>

        {Number(safety.bulkDiscountThreshold || 0) > 0 && Number(safety.bulkDiscountPct || 0) > 0 && (
          <div className="rounded-xl bg-violet-100 border-2 border-violet-300 p-3 text-sm font-bold text-violet-800">
            💡 Customer buying {safety.bulkDiscountThreshold}+ {baseUnit} will get {safety.bulkDiscountPct}% discount automatically
          </div>
        )}
      </section>

      {/* Product Flags */}
      <section className="rounded-2xl border-2 border-slate-200 bg-white p-5 space-y-3">
        <SectionHeader icon={Sparkles} title="Product Flags" desc="Popular, best seller, seasonal" />

        <div className="grid sm:grid-cols-3 gap-2">
          <label className={['flex items-center gap-3 cursor-pointer p-3 rounded-xl transition border-2',
            safety.isPopular ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-blue-300'].join(' ')}>
            <input type="checkbox" checked={safety.isPopular}
              onChange={(e) => onChange({ isPopular: e.target.checked })} className="h-5 w-5 rounded" />
            <TrendingUp className={['h-5 w-5', safety.isPopular ? 'text-blue-600' : 'text-slate-400'].join(' ')} />
            <div className="flex-1">
              <div className="font-extrabold text-slate-900 text-sm">Popular</div>
              <div className="text-xs text-slate-500 font-semibold">Fast moving</div>
            </div>
          </label>
          <label className={['flex items-center gap-3 cursor-pointer p-3 rounded-xl transition border-2',
            safety.isBestSeller ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 hover:border-emerald-300'].join(' ')}>
            <input type="checkbox" checked={safety.isBestSeller}
              onChange={(e) => onChange({ isBestSeller: e.target.checked })} className="h-5 w-5 rounded" />
            <Star className={['h-5 w-5', safety.isBestSeller ? 'text-emerald-600 fill-emerald-600' : 'text-slate-400'].join(' ')} />
            <div className="flex-1">
              <div className="font-extrabold text-slate-900 text-sm">Best Seller</div>
              <div className="text-xs text-slate-500 font-semibold">Top selling item</div>
            </div>
          </label>
          <label className={['flex items-center gap-3 cursor-pointer p-3 rounded-xl transition border-2',
            safety.isSeasonal ? 'border-teal-500 bg-teal-50' : 'border-slate-200 hover:border-teal-300'].join(' ')}>
            <input type="checkbox" checked={safety.isSeasonal}
              onChange={(e) => onChange({ isSeasonal: e.target.checked })} className="h-5 w-5 rounded" />
            <Eye className={['h-5 w-5', safety.isSeasonal ? 'text-teal-600' : 'text-slate-400'].join(' ')} />
            <div className="flex-1">
              <div className="font-extrabold text-slate-900 text-sm">Seasonal</div>
              <div className="text-xs text-slate-500 font-semibold">Kharif/Rabi specific</div>
            </div>
          </label>
        </div>
      </section>
    </div>
  );
}

function SectionHeader({ icon: Icon, title, desc, tone = 'slate' }: any) {
  const tones: Record<string, string> = {
    slate: 'from-slate-500 to-slate-700',
    emerald: 'from-emerald-500 to-emerald-700',
    lime: 'from-lime-500 to-green-700',
    sky: 'from-sky-500 to-cyan-700',
    blue: 'from-blue-500 to-blue-700',
    amber: 'from-amber-500 to-orange-700',
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
