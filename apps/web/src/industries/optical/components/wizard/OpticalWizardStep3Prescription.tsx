import { Eye, Info, AlertCircle, TrendingUp, TrendingDown, Sparkles } from 'lucide-react';
import { Input } from '@core/ui/Input';
import type { OpticalWizardLens } from '../../hooks/useOpticalWizard';

interface Props {
  lens: OpticalWizardLens;
  onChange: (patch: Partial<OpticalWizardLens>) => void;
  categoryType: string;
  errors: string[];
}

const SPH_PRESETS = [
  { label: 'Low myopia (-0.25 to -3)', min: -3, max: -0.25 },
  { label: 'Mid myopia (-3.25 to -6)', min: -6, max: -3.25 },
  { label: 'High myopia (-6.25 to -10)', min: -10, max: -6.25 },
  { label: 'Low hyperopia (+0.25 to +3)', min: 0.25, max: 3 },
  { label: 'Mid hyperopia (+3.25 to +6)', min: 3.25, max: 6 },
  { label: 'Full range (-10 to +6)', min: -10, max: 6 },
];

const CYL_PRESETS = [
  { label: 'No astigmatism', min: 0, max: 0 },
  { label: 'Mild (-0.25 to -1.00)', min: -1, max: -0.25 },
  { label: 'Moderate (-1.25 to -2.00)', min: -2, max: -1.25 },
  { label: 'High (-2.25 to -4.00)', min: -4, max: -2.25 },
];

export function OpticalWizardStep3Prescription({ lens, onChange, categoryType, errors }: Props) {
  const isFrame = ['EYEGLASSES_FRAME', 'SUNGLASSES', 'READING_GLASSES', 'SPORTS_EYEWEAR', 'SAFETY_GOGGLES', 'KIDS_EYEWEAR'].includes(categoryType);
  const isLens = ['PRESCRIPTION_LENS', 'PROGRESSIVE_LENS', 'BIFOCAL_LENS', 'BLUE_CUT_LENS', 'PHOTOCHROMIC_LENS'].includes(categoryType);
  const isCL = categoryType === 'CONTACT_LENS';

  const applyPreset = (min: number, max: number) => {
    onChange({ supportsMinSph: min, supportsMaxSph: max });
  };
  const applyCylPreset = (min: number, max: number) => {
    onChange({ supportsMinCyl: min, supportsMaxCyl: max });
  };

  return (
    <div className="space-y-5">
      {errors.length > 0 && (
        <div className="rounded-2xl bg-rose-50 border-2 border-rose-300 p-4 flex items-start gap-2.5">
          <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="text-sm text-rose-900">
            <div className="font-extrabold mb-1">Fix before continuing:</div>
            <ul className="list-disc pl-4 space-y-0.5 font-semibold">{errors.map((e, i) => <li key={i}>{e}</li>)}</ul>
          </div>
        </div>
      )}

      <div className="rounded-2xl bg-gradient-to-br from-cyan-50 to-white border-2 border-cyan-200 p-4 flex items-start gap-3">
        <div className="h-11 w-11 rounded-xl bg-cyan-600 text-white flex items-center justify-center shadow-md shrink-0">
          <Eye className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <h3 className="font-extrabold text-cyan-900">Prescription Range (Optional)</h3>
          <p className="text-xs text-cyan-800 font-semibold mt-0.5 leading-relaxed">
            Tell the system which SPH/CYL powers this product supports. When a customer's prescription comes in,
            we'll automatically suggest only compatible frames/lenses. Leave blank if this is a plano (non-Rx) item.
          </p>
        </div>
      </div>

      {isFrame && (
        <div className="rounded-xl bg-blue-50 border-2 border-blue-200 p-3 text-xs text-blue-900 font-extrabold">
          💡 For frames, this range means: what powers can be fitted into these lenses (based on lens depth).
        </div>
      )}
      {isLens && (
        <div className="rounded-xl bg-emerald-50 border-2 border-emerald-200 p-3 text-xs text-emerald-900 font-extrabold">
          💡 For lenses, this is the power range this specific lens material supports. High-index lenses can handle stronger prescriptions.
        </div>
      )}
      {isCL && (
        <div className="rounded-xl bg-violet-50 border-2 border-violet-200 p-3 text-xs text-violet-900 font-extrabold">
          💡 For contact lenses, this is the SKU-level power. Usually you'd add each power as a separate variant in Step 4.
        </div>
      )}

      {/* SPH RANGE */}
      <section className="rounded-2xl border-2 border-cyan-300 bg-gradient-to-br from-cyan-50 to-white p-5 space-y-4">
        <SectionHead icon={TrendingDown} title="Sphere (SPH) Range" desc="Nearsighted (–) to farsighted (+)" tone="cyan" />

        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <Lbl><span className="text-rose-700">Min SPH</span> (most negative / strongest myopia)</Lbl>
            <input type="number" step="0.25" value={lens.supportsMinSph}
              onChange={(e) => onChange({ supportsMinSph: e.target.value === '' ? '' : Number(e.target.value) })}
              placeholder="-6.00"
              className="h-14 w-full rounded-2xl border-2 border-slate-200 bg-white px-4 text-2xl font-extrabold tabular-nums text-rose-700 focus:outline-none focus:border-rose-500" />
          </div>
          <div>
            <Lbl><span className="text-emerald-700">Max SPH</span> (most positive / strongest hyperopia)</Lbl>
            <input type="number" step="0.25" value={lens.supportsMaxSph}
              onChange={(e) => onChange({ supportsMaxSph: e.target.value === '' ? '' : Number(e.target.value) })}
              placeholder="+4.00"
              className="h-14 w-full rounded-2xl border-2 border-slate-200 bg-white px-4 text-2xl font-extrabold tabular-nums text-emerald-700 focus:outline-none focus:border-emerald-500" />
          </div>
        </div>

        <div>
          <div className="text-[10px] uppercase tracking-wider font-extrabold text-slate-600 mb-1.5 flex items-center gap-1">
            <Sparkles className="h-3 w-3 text-amber-500" /> Quick range presets
          </div>
          <div className="grid sm:grid-cols-2 gap-1.5">
            {SPH_PRESETS.map((p) => (
              <button key={p.label} type="button" onClick={() => applyPreset(p.min, p.max)}
                className="px-3 py-2 rounded-xl bg-white border-2 border-cyan-200 hover:bg-cyan-50 hover:border-cyan-400 text-cyan-800 text-xs font-extrabold text-left">
                {p.label}
                <div className="text-[10px] font-bold text-slate-500 tabular-nums">
                  {p.min >= 0 ? '+' : ''}{p.min.toFixed(2)} to {p.max >= 0 ? '+' : ''}{p.max.toFixed(2)}
                </div>
              </button>
            ))}
          </div>
        </div>

        {lens.supportsMinSph !== '' && lens.supportsMaxSph !== '' && (
          <div className="rounded-2xl bg-white border-2 border-emerald-300 p-4">
            <div className="text-[10px] uppercase tracking-wider font-extrabold text-emerald-700 mb-1">Supports SPH range</div>
            <div className="text-2xl font-extrabold text-slate-900 tabular-nums">
              {Number(lens.supportsMinSph) >= 0 ? '+' : ''}{Number(lens.supportsMinSph).toFixed(2)}
              {' '}to{' '}
              {Number(lens.supportsMaxSph) >= 0 ? '+' : ''}{Number(lens.supportsMaxSph).toFixed(2)}
            </div>
          </div>
        )}
      </section>

      {/* CYL RANGE */}
      <section className="rounded-2xl border-2 border-violet-300 bg-gradient-to-br from-violet-50 to-white p-5 space-y-4">
        <SectionHead icon={TrendingUp} title="Cylinder (CYL) Range" desc="For astigmatism correction" tone="violet" />

        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <Lbl>Min CYL (most negative)</Lbl>
            <input type="number" step="0.25" value={lens.supportsMinCyl}
              onChange={(e) => onChange({ supportsMinCyl: e.target.value === '' ? '' : Number(e.target.value) })}
              placeholder="-2.00"
              className="h-12 w-full rounded-xl border-2 border-slate-200 bg-white px-4 text-lg font-extrabold tabular-nums focus:outline-none focus:border-violet-500" />
          </div>
          <div>
            <Lbl>Max CYL</Lbl>
            <input type="number" step="0.25" value={lens.supportsMaxCyl}
              onChange={(e) => onChange({ supportsMaxCyl: e.target.value === '' ? '' : Number(e.target.value) })}
              placeholder="0.00"
              className="h-12 w-full rounded-xl border-2 border-slate-200 bg-white px-4 text-lg font-extrabold tabular-nums focus:outline-none focus:border-violet-500" />
          </div>
        </div>

        <div>
          <div className="text-[10px] uppercase tracking-wider font-extrabold text-slate-600 mb-1.5 flex items-center gap-1">
            <Sparkles className="h-3 w-3 text-amber-500" /> CYL presets
          </div>
          <div className="grid sm:grid-cols-2 gap-1.5">
            {CYL_PRESETS.map((p) => (
              <button key={p.label} type="button" onClick={() => applyCylPreset(p.min, p.max)}
                className="px-3 py-2 rounded-xl bg-white border-2 border-violet-200 hover:bg-violet-50 hover:border-violet-400 text-violet-800 text-xs font-extrabold text-left">
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* SUMMARY */}
      {(lens.supportsMinSph !== '' || lens.supportsMaxSph !== '' || lens.supportsProgressive) && (
        <section className="rounded-2xl bg-gradient-to-br from-slate-950 to-cyan-900 text-white p-5 shadow-xl">
          <div className="flex items-center gap-2 mb-3">
            <Info className="h-4 w-4 text-cyan-300" />
            <span className="text-[10px] uppercase font-extrabold tracking-wider text-cyan-300">Prescription Support Summary</span>
          </div>
          <div className="grid sm:grid-cols-3 gap-3">
            <div>
              <div className="text-[10px] uppercase font-extrabold text-white/60">SPH range</div>
              <div className="text-lg font-extrabold tabular-nums mt-1">
                {lens.supportsMinSph !== '' && lens.supportsMaxSph !== ''
                  ? `${Number(lens.supportsMinSph) >= 0 ? '+' : ''}${Number(lens.supportsMinSph)} to ${Number(lens.supportsMaxSph) >= 0 ? '+' : ''}${Number(lens.supportsMaxSph)}`
                  : 'Any / plano'}
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase font-extrabold text-white/60">CYL range</div>
              <div className="text-lg font-extrabold tabular-nums mt-1">
                {lens.supportsMaxCyl !== '' && Math.abs(Number(lens.supportsMaxCyl)) > 0
                  ? `Up to ${Math.abs(Number(lens.supportsMaxCyl))}`
                  : 'None'}
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase font-extrabold text-white/60">Progressive</div>
              <div className="text-lg font-extrabold mt-1">
                {lens.supportsProgressive ? '✓ Supported' : '✗ No'}
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

function SectionHead({ icon: Icon, title, desc, tone }: any) {
  const tones: Record<string, string> = {
    cyan: 'from-cyan-500 to-sky-700',
    violet: 'from-violet-500 to-purple-700',
  };
  return (
    <div className="flex items-center gap-3 pb-2 border-b border-slate-100">
      <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${tones[tone]} text-white flex items-center justify-center shadow-md`}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <h3 className="font-extrabold text-slate-900">{title}</h3>
        <p className="text-xs text-slate-500 font-semibold">{desc}</p>
      </div>
    </div>
  );
}
function Lbl({ children }: any) {
  return <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 mb-1.5">{children}</label>;
}
