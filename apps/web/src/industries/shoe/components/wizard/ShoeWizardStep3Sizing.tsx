import { Ruler, ArrowUpDown, Info, Zap } from 'lucide-react';
import type { ShoeWizardSizing } from '../../hooks/useShoeWizard';

interface Props {
  sizing: ShoeWizardSizing;
  onChange: (patch: Partial<ShoeWizardSizing>) => void;
  errors: string[];
}

const SIZE_SYSTEMS = [
  { v: 'UK', l: 'UK', desc: 'Pakistan/UK standard', e: '🇬🇧', sample: '5 - 12' },
  { v: 'US', l: 'US', desc: 'American sizes', e: '🇺🇸', sample: '6 - 13' },
  { v: 'EU', l: 'EU', desc: 'European sizes', e: '🇪🇺', sample: '36 - 46' },
  { v: 'CM', l: 'CM', desc: 'Centimeters', e: '📏', sample: '22 - 30' },
  { v: 'KIDS', l: 'Kids', desc: 'Children sizing', e: '👶', sample: '3 - 6' },
];

const WIDTHS = [
  { v: 'NARROW', l: 'Narrow', desc: 'For slim feet', e: '│', color: 'blue' },
  { v: 'REGULAR', l: 'Regular', desc: 'Standard width', e: '║', color: 'emerald' },
  { v: 'WIDE', l: 'Wide', desc: 'Comfort fit', e: '║║', color: 'amber' },
  { v: 'EXTRA_WIDE', l: 'Extra Wide', desc: 'Very roomy', e: '║║║', color: 'rose' },
];

export function ShoeWizardStep3Sizing({ sizing, onChange, errors }: Props) {
  return (
    <div className="space-y-5">
      {errors.length > 0 && (
        <div className="rounded-2xl bg-rose-50 border-2 border-rose-300 p-4 flex items-start gap-2.5">
          <Info className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="text-sm text-rose-900">
            <div className="font-extrabold mb-1">Fix before continuing:</div>
            <ul className="list-disc pl-4 space-y-0.5 font-semibold">{errors.map((e, i) => <li key={i}>{e}</li>)}</ul>
          </div>
        </div>
      )}

      <div className="rounded-2xl bg-gradient-to-br from-orange-50 to-white border-2 border-orange-200 p-4 flex items-start gap-3">
        <div className="h-11 w-11 rounded-xl bg-orange-600 text-white flex items-center justify-center shadow-md shrink-0">
          <Ruler className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <h3 className="font-extrabold text-orange-900">Sizing System</h3>
          <p className="text-xs text-orange-800 font-semibold mt-0.5 leading-relaxed">
            Pick the size system that matches the shoe's labelling. You'll add actual size numbers (5, 6, 7...) in Step 5.
          </p>
        </div>
      </div>

      {/* SIZE SYSTEM */}
      <section className="rounded-2xl border-2 border-orange-300 bg-gradient-to-br from-orange-50 to-white p-5 space-y-3">
        <SectionHead icon={Ruler} title="Size System" desc="Which chart do these sizes follow?" tone="orange" />
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {SIZE_SYSTEMS.map((s) => {
            const a = sizing.sizeSystem === s.v;
            return (
              <button key={s.v} type="button" onClick={() => onChange({ sizeSystem: s.v })}
                className={['p-3 rounded-xl border-2 transition text-left',
                  a ? 'border-orange-600 bg-orange-600 text-white shadow-md scale-[1.02]'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-orange-400'].join(' ')}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xl">{s.e}</span>
                  <span className="font-extrabold text-base">{s.l}</span>
                </div>
                <div className={['text-[10px] font-bold', a ? 'text-white/85' : 'text-slate-500'].join(' ')}>
                  {s.desc}
                </div>
                <div className={['text-[10px] font-mono mt-0.5', a ? 'text-white/70' : 'text-slate-400'].join(' ')}>
                  e.g. {s.sample}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* WIDTH */}
      <section className="rounded-2xl border-2 border-slate-200 bg-white p-5 space-y-3">
        <SectionHead icon={ArrowUpDown} title="Width Fit" desc="Standard or wider fit?" tone="blue" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {WIDTHS.map((w) => {
            const a = sizing.width === w.v;
            const tones: Record<string, string> = {
              blue: 'border-blue-500 bg-blue-500 text-white',
              emerald: 'border-emerald-500 bg-emerald-500 text-white',
              amber: 'border-amber-500 bg-amber-500 text-white',
              rose: 'border-rose-500 bg-rose-500 text-white',
            };
            return (
              <button key={w.v} type="button" onClick={() => onChange({ width: w.v })}
                className={['p-3 rounded-xl border-2 transition flex flex-col items-center gap-1',
                  a ? `${tones[w.color]} shadow-md scale-[1.02]` : 'border-slate-200 bg-white text-slate-700 hover:border-slate-400'].join(' ')}>
                <span className="text-2xl font-mono">{w.e}</span>
                <span className="text-xs font-extrabold">{w.l}</span>
                <span className={['text-[10px] font-bold', a ? 'text-white/80' : 'text-slate-500'].join(' ')}>
                  {w.desc}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* FIT INDICATORS */}
      <section className="rounded-2xl border-2 border-slate-200 bg-white p-5 space-y-3">
        <SectionHead icon={Zap} title="Fit Alerts" desc="Warn customers if sizing is unusual" tone="amber" />
        <div className="grid grid-cols-2 gap-2">
          <FitToggle
            checked={sizing.runsSmall}
            onChange={(v: boolean) => onChange({ runsSmall: v, runsLarge: v ? false : sizing.runsLarge })}
            icon="⚠️" label="Runs Small" desc="Suggest 1 size up" tone="amber" />
          <FitToggle
            checked={sizing.runsLarge}
            onChange={(v: boolean) => onChange({ runsLarge: v, runsSmall: v ? false : sizing.runsSmall })}
            icon="⚠️" label="Runs Large" desc="Suggest 1 size down" tone="blue" />
        </div>
        <div>
          <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 mb-1.5">
            Sizing Notes <span className="text-slate-400 normal-case font-bold">(optional)</span>
          </label>
          <textarea rows={2} value={sizing.sizingNotes} onChange={(e) => onChange({ sizingNotes: e.target.value })}
            placeholder="e.g. Half size up for wide feet. True to size for regular feet."
            className="w-full rounded-xl border-2 border-slate-200 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-orange-500" />
        </div>
      </section>

      {sizing.sizeSystem && (
        <section className="rounded-2xl bg-gradient-to-br from-slate-950 to-orange-900 text-white p-5 shadow-xl">
          <div className="flex items-center gap-2 mb-3">
            <Info className="h-4 w-4 text-amber-300" />
            <span className="text-[10px] uppercase font-extrabold tracking-wider text-amber-300">Preview</span>
          </div>
          <div className="text-sm font-bold text-white/85">
            You've picked <strong className="text-amber-300">{sizing.sizeSystem}</strong> sizing
            with <strong className="text-amber-300">{sizing.width.replace(/_/g, ' ')}</strong> width.
            Next step you'll enter each size number with its own stock, box, and shelf location.
          </div>
        </section>
      )}
    </div>
  );
}

function SectionHead({ icon: Icon, title, desc, tone }: any) {
  const tones: Record<string, string> = {
    orange: 'from-orange-500 to-amber-700',
    blue: 'from-blue-500 to-cyan-700',
    amber: 'from-amber-500 to-orange-600',
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

function FitToggle({ checked, onChange, icon, label, desc, tone }: any) {
  const tones: Record<string, string> = {
    amber: 'border-amber-500 bg-amber-50 text-amber-900',
    blue: 'border-blue-500 bg-blue-50 text-blue-900',
  };
  return (
    <label className={['flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition',
      checked ? tones[tone] : 'border-slate-200 bg-white text-slate-700 hover:border-slate-400'].join(' ')}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-5 w-5 rounded" />
      <span className="text-2xl">{icon}</span>
      <div className="min-w-0">
        <div className="font-extrabold text-sm">{label}</div>
        <div className="text-[11px] font-semibold opacity-75">{desc}</div>
      </div>
    </label>
  );
}
