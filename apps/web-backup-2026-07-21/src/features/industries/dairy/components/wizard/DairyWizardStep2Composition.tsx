import {
  Beaker, Award, Thermometer, Sparkles, AlertCircle, Info,
  Droplets, Leaf, ShieldCheck, Snowflake, Clock, Calendar,
} from 'lucide-react';
import { Input } from '@/components/ui/Input';
import type { DairyWizardComposition } from '../../hooks/useDairyWizard';
import type { MilkQuality } from '../../api/products.api';

interface Props {
  composition: DairyWizardComposition;
  onChange: (patch: Partial<DairyWizardComposition>) => void;
  errors: string[];
}

const QUALITY_GRADES: { value: MilkQuality; label: string; color: string; desc: string }[] = [
  { value: 'A_GRADE', label: 'A Grade', color: 'from-emerald-500 to-green-600', desc: 'Premium quality' },
  { value: 'B_GRADE', label: 'B Grade', color: 'from-blue-500 to-cyan-600', desc: 'Standard quality' },
  { value: 'C_GRADE', label: 'C Grade', color: 'from-amber-500 to-orange-600', desc: 'Below standard' },
  { value: 'REJECTED', label: 'Rejected', color: 'from-red-500 to-rose-600', desc: 'Not acceptable' },
];

const QUALITY_ATTRIBUTES = [
  { key: 'isPasteurized' as const, label: 'Pasteurized', desc: 'Heat-treated for safety', icon: ShieldCheck, color: 'blue' },
  { key: 'isHomogenized' as const, label: 'Homogenized', desc: 'Uniform consistency', icon: Sparkles, color: 'cyan' },
  { key: 'isRaw' as const, label: 'Raw', desc: 'Direct from farm', icon: Droplets, color: 'amber' },
  { key: 'isOrganic' as const, label: 'Organic', desc: 'Chemical-free', icon: Leaf, color: 'green' },
  { key: 'isFresh' as const, label: 'Fresh', desc: 'Freshly produced', icon: Snowflake, color: 'sky' },
];

export function DairyWizardStep2Composition({ composition, onChange, errors }: Props) {
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

      <div className="rounded-2xl bg-gradient-to-br from-fuchsia-50 to-white border-2 border-fuchsia-200 p-4 flex items-start gap-3">
        <div className="h-10 w-10 rounded-xl bg-fuchsia-600 text-white flex items-center justify-center shadow-md shrink-0">
          <Beaker className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <h3 className="font-extrabold text-fuchsia-900 text-sm">Composition & Quality</h3>
          <p className="text-xs text-fuchsia-800 font-semibold mt-0.5 leading-relaxed">
            Fat/SNF content, quality grade, aur storage requirements. Sab optional hain — bhar dein jitni info hai.
          </p>
        </div>
      </div>

      {/* Composition */}
      <section className="rounded-2xl border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-white p-5 space-y-4">
        <SectionHeader icon={Beaker} title="Composition Analysis" desc="Fat, SNF, Protein content" tone="amber" />

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="text-xs uppercase tracking-wider font-extrabold text-amber-700 mb-1 block">
              Fat Content (%)
            </label>
            <input
              type="number" step="0.1"
              value={composition.fatContent}
              onChange={(e) => onChange({ fatContent: e.target.value === '' ? '' : Number(e.target.value) })}
              placeholder="6.0"
              className="h-14 w-full rounded-xl border-2 border-amber-300 bg-white px-3 text-2xl font-extrabold tabular-nums focus:outline-none focus:border-amber-500"
            />
            <p className="text-[10px] text-slate-500 mt-1 font-semibold">Buffalo: 6-7%, Cow: 3-4%</p>
          </div>

          <div>
            <label className="text-xs uppercase tracking-wider font-extrabold text-blue-700 mb-1 block">
              SNF Content (%)
            </label>
            <input
              type="number" step="0.1"
              value={composition.snfContent}
              onChange={(e) => onChange({ snfContent: e.target.value === '' ? '' : Number(e.target.value) })}
              placeholder="8.5"
              className="h-14 w-full rounded-xl border-2 border-blue-300 bg-white px-3 text-2xl font-extrabold tabular-nums focus:outline-none focus:border-blue-500"
            />
            <p className="text-[10px] text-slate-500 mt-1 font-semibold">Solids Not Fat (min 8.5%)</p>
          </div>

          <div>
            <label className="text-xs uppercase tracking-wider font-extrabold text-emerald-700 mb-1 block">
              Protein Content (%)
            </label>
            <input
              type="number" step="0.1"
              value={composition.proteinContent}
              onChange={(e) => onChange({ proteinContent: e.target.value === '' ? '' : Number(e.target.value) })}
              placeholder="3.5"
              className="h-14 w-full rounded-xl border-2 border-emerald-300 bg-white px-3 text-2xl font-extrabold tabular-nums focus:outline-none focus:border-emerald-500"
            />
            <p className="text-[10px] text-slate-500 mt-1 font-semibold">Protein per 100ml</p>
          </div>
        </div>

        <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl border-2 border-red-200 bg-red-50 hover:border-red-300 transition">
          <input
            type="checkbox"
            checked={composition.waterAdded}
            onChange={(e) => onChange({ waterAdded: e.target.checked })}
            className="h-5 w-5 rounded"
          />
          <Droplets className="h-5 w-5 text-red-600" />
          <div className="flex-1">
            <div className="font-extrabold text-red-900 text-sm">Water Added</div>
            <div className="text-xs text-red-700 font-semibold">Mark if water has been added to the milk</div>
          </div>
        </label>
      </section>

      {/* Quality Grade */}
      <section className="rounded-2xl border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-5 space-y-4">
        <SectionHeader icon={Award} title="Quality Grade" desc="Overall quality classification" tone="emerald" />

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <button
            type="button"
            onClick={() => onChange({ quality: '' })}
            className={[
              'p-3 rounded-xl border-2 text-center transition',
              composition.quality === '' ? 'border-slate-500 bg-slate-100 shadow' : 'border-slate-200 bg-white hover:border-slate-300',
            ].join(' ')}
          >
            <div className="text-2xl mb-1">❓</div>
            <div className="text-xs font-extrabold">Not Set</div>
          </button>
          {QUALITY_GRADES.map((g) => {
            const active = composition.quality === g.value;
            return (
              <button
                key={g.value}
                type="button"
                onClick={() => onChange({ quality: g.value })}
                className={[
                  'p-3 rounded-xl border-2 text-center transition',
                  active
                    ? 'text-white shadow-md scale-105 bg-gradient-to-br ' + g.color + ' border-transparent'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-emerald-400',
                ].join(' ')}
              >
                <Award className={['h-5 w-5 mx-auto mb-1', active ? 'text-white' : 'text-slate-500'].join(' ')} />
                <div className="text-xs font-extrabold">{g.label}</div>
                <div className={['text-[9px] font-semibold mt-0.5', active ? 'text-white/90' : 'text-slate-500'].join(' ')}>
                  {g.desc}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Quality Attributes */}
      <section className="rounded-2xl border-2 border-cyan-200 bg-gradient-to-br from-cyan-50 to-white p-5 space-y-4">
        <SectionHeader icon={ShieldCheck} title="Quality Attributes" desc="Certifications & properties" tone="cyan" />

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {QUALITY_ATTRIBUTES.map((attr) => {
            const active = composition[attr.key];
            const Icon = attr.icon;
            return (
              <label
                key={attr.key}
                className={[
                  'flex items-start gap-3 cursor-pointer p-3 rounded-xl border-2 transition',
                  active
                    ? 'border-' + attr.color + '-500 bg-' + attr.color + '-50 shadow'
                    : 'border-slate-200 bg-white hover:border-' + attr.color + '-300',
                ].join(' ')}
              >
                <input
                  type="checkbox"
                  checked={active}
                  onChange={(e) => onChange({ [attr.key]: e.target.checked } as any)}
                  className="h-5 w-5 rounded shrink-0 mt-0.5"
                />
                <Icon className={['h-5 w-5 shrink-0 mt-0.5', active ? 'text-' + attr.color + '-600' : 'text-slate-400'].join(' ')} />
                <div className="flex-1 min-w-0">
                  <div className={['font-extrabold text-sm', active ? 'text-' + attr.color + '-900' : 'text-slate-900'].join(' ')}>
                    {attr.label}
                  </div>
                  <div className="text-[11px] text-slate-500 font-semibold leading-tight">{attr.desc}</div>
                </div>
              </label>
            );
          })}
        </div>
      </section>

      {/* Storage Requirements */}
      <section className="rounded-2xl border-2 border-sky-200 bg-gradient-to-br from-sky-50 to-white p-5 space-y-4">
        <SectionHeader icon={Thermometer} title="Storage & Shelf Life" desc="Temperature requirements" tone="sky" />

        <label className={[
          'flex items-center gap-3 cursor-pointer p-3 rounded-xl border-2 transition',
          composition.requiresRefrigeration ? 'border-sky-500 bg-sky-50 shadow' : 'border-slate-200 bg-white hover:border-sky-300',
        ].join(' ')}>
          <input
            type="checkbox"
            checked={composition.requiresRefrigeration}
            onChange={(e) => onChange({ requiresRefrigeration: e.target.checked })}
            className="h-5 w-5 rounded"
          />
          <Snowflake className={['h-5 w-5', composition.requiresRefrigeration ? 'text-sky-600' : 'text-slate-400'].join(' ')} />
          <div className="flex-1">
            <div className="font-extrabold text-slate-900 text-sm">Requires Refrigeration</div>
            <div className="text-xs text-slate-500 font-semibold">Must be kept cold to prevent spoilage</div>
          </div>
        </label>

        {composition.requiresRefrigeration && (
          <div className="grid sm:grid-cols-2 gap-4 pl-8">
            <div>
              <label className="text-xs uppercase font-extrabold text-sky-700 mb-1 block">Min Temp (°C)</label>
              <input
                type="number" step="0.5"
                value={composition.storageTempMin}
                onChange={(e) => onChange({ storageTempMin: e.target.value === '' ? '' : Number(e.target.value) })}
                placeholder="2"
                className="h-11 w-full rounded-xl border-2 border-sky-300 bg-white px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-sky-500"
              />
            </div>
            <div>
              <label className="text-xs uppercase font-extrabold text-sky-700 mb-1 block">Max Temp (°C)</label>
              <input
                type="number" step="0.5"
                value={composition.storageTempMax}
                onChange={(e) => onChange({ storageTempMax: e.target.value === '' ? '' : Number(e.target.value) })}
                placeholder="8"
                className="h-11 w-full rounded-xl border-2 border-sky-300 bg-white px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>
        )}

        <div className="grid sm:grid-cols-3 gap-4 pt-2 border-t border-sky-100">
          <div>
            <label className="text-xs uppercase font-extrabold text-slate-600 mb-1 block flex items-center gap-1">
              <Calendar className="h-3 w-3" /> Production Date
            </label>
            <input
              type="date"
              value={composition.productionDate}
              onChange={(e) => onChange({ productionDate: e.target.value })}
              className="h-11 w-full rounded-xl border-2 border-slate-200 bg-white px-3 text-sm font-bold focus:outline-none focus:border-sky-500"
            />
          </div>
          <div>
            <label className="text-xs uppercase font-extrabold text-slate-600 mb-1 block flex items-center gap-1">
              <Clock className="h-3 w-3" /> Best Before (hours)
            </label>
            <input
              type="number"
              value={composition.bestBeforeHours}
              onChange={(e) => onChange({ bestBeforeHours: e.target.value === '' ? '' : Number(e.target.value) })}
              placeholder="24"
              className="h-11 w-full rounded-xl border-2 border-slate-200 bg-white px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-sky-500"
            />
          </div>
          <div>
            <label className="text-xs uppercase font-extrabold text-slate-600 mb-1 block flex items-center gap-1">
              <Clock className="h-3 w-3" /> Shelf Life (hours)
            </label>
            <input
              type="number"
              value={composition.shelfLifeHours}
              onChange={(e) => onChange({ shelfLifeHours: e.target.value === '' ? '' : Number(e.target.value) })}
              placeholder="48"
              className="h-11 w-full rounded-xl border-2 border-slate-200 bg-white px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-sky-500"
            />
          </div>
        </div>

        <div className="rounded-xl bg-blue-50 border-2 border-blue-200 p-3 flex items-start gap-2">
          <Info className="h-4 w-4 text-blue-700 shrink-0 mt-0.5" />
          <div className="text-xs text-blue-900 font-semibold leading-relaxed">
            <strong>Best Before</strong>: Quality peak time. <strong>Shelf Life</strong>: Safe consumption limit.
            Fresh milk typically: 24hr best, 48hr shelf. Refrigerated dairy: 3-7 days.
          </div>
        </div>
      </section>
    </div>
  );
}

function SectionHeader({ icon: Icon, title, desc, tone = 'slate' }: any) {
  const tones: Record<string, string> = {
    slate: 'from-slate-500 to-slate-700',
    emerald: 'from-emerald-500 to-emerald-700',
    amber: 'from-amber-500 to-orange-700',
    cyan: 'from-cyan-500 to-blue-700',
    sky: 'from-sky-500 to-blue-700',
    fuchsia: 'from-fuchsia-500 to-pink-700',
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
