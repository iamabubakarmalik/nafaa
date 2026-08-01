import { useState } from 'react';
import {
  ShieldAlert, ShieldCheck, AlertTriangle, Plus, X, CheckCircle2,
  Award, Baby, Info,
} from 'lucide-react';
import type { ToyWizardSafety } from '../../hooks/useToyWizard';

interface Props {
  safety: ToyWizardSafety;
  onChange: (patch: Partial<ToyWizardSafety>) => void;
  ageGroup: string;
  ageMinYears: number | '';
  errors: string[];
}

const CERTIFICATIONS = [
  { v: 'CE', l: 'CE Mark', e: '🇪🇺', desc: 'European Conformity — mandatory in EU' },
  { v: 'ASTM', l: 'ASTM F963', e: '🇺🇸', desc: 'American toy safety standard' },
  { v: 'CPSC', l: 'CPSC', e: '🛡️', desc: 'US Consumer Product Safety Commission' },
  { v: 'EN71', l: 'EN71', e: '📋', desc: 'European toy safety directive' },
  { v: 'ISO_8124', l: 'ISO 8124', e: '🌍', desc: 'International toy safety standard' },
  { v: 'BIS', l: 'BIS', e: '🇮🇳', desc: 'Bureau of Indian Standards' },
  { v: 'PSA', l: 'PSA', e: '🇯🇵', desc: 'Product Safety Association Japan' },
  { v: 'OTHER', l: 'Other', e: '📄', desc: 'Custom certification' },
];

const COMMON_WARNINGS = [
  'Small parts — choking hazard',
  'Not for children under 3 years',
  'Adult supervision required',
  'Contains magnets — do not swallow',
  'Long cord — strangulation hazard',
  'Sharp edges',
  'Contains button batteries',
  'Not suitable for water',
  'Do not use as flotation device',
  'Contains latex',
];

export function ToyWizardStep3Safety({ safety, onChange, ageGroup, ageMinYears, errors }: Props) {
  const [customWarning, setCustomWarning] = useState('');

  const criticalAges = ['NEWBORN_0_6M', 'INFANT_6_12M', 'TODDLER_1_2Y', 'TODDLER_2_3Y'];
  const isCritical = criticalAges.includes(ageGroup) || (Number(ageMinYears || 99) < 3);

  const tog = (val: string) => {
    const cur = safety.safetyCertifications ?? [];
    onChange({ safetyCertifications: cur.includes(val) ? cur.filter((x) => x !== val) : [...cur, val] });
  };

  const addWarning = (val: string) => {
    const t = val.trim();
    if (!t) return;
    const cur = safety.safetyWarnings ?? [];
    if (cur.includes(t)) return;
    onChange({ safetyWarnings: [...cur, t] });
    setCustomWarning('');
  };

  const removeWarning = (val: string) => {
    onChange({ safetyWarnings: (safety.safetyWarnings ?? []).filter((x) => x !== val) });
  };

  const safetyScore = [
    safety.isNonToxic, safety.isBpaFree, safety.isPhthalateFree,
    !safety.chokingHazard || !isCritical,
    !safety.smallPartsWarning || !isCritical,
    (safety.safetyCertifications ?? []).length > 0,
  ].filter(Boolean).length;
  const safetyPct = Math.round((safetyScore / 6) * 100);

  return (
    <div className="space-y-5">
      {errors.length > 0 && (
        <div className="rounded-2xl bg-rose-50 border-2 border-rose-300 p-4 flex items-start gap-2.5">
          <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="text-sm text-rose-900">
            <div className="font-extrabold mb-1">Safety warnings:</div>
            <ul className="list-disc pl-4 space-y-0.5 font-semibold">{errors.map((e, i) => <li key={i}>{e}</li>)}</ul>
          </div>
        </div>
      )}

      {isCritical && (
        <div className="rounded-2xl bg-gradient-to-br from-rose-50 to-orange-50 border-2 border-rose-300 p-4 flex items-start gap-3">
          <Baby className="h-6 w-6 text-rose-700 shrink-0 mt-0.5" />
          <div>
            <h3 className="font-extrabold text-rose-900">⚠️ Safety-critical age group</h3>
            <p className="text-xs font-semibold text-rose-800 mt-0.5">
              Toys for children under 3 need extra care: NO small parts, NO choking hazards, MUST be non-toxic and BPA-free.
              Safety certifications strongly recommended.
            </p>
          </div>
        </div>
      )}

      {/* SAFETY SCORE */}
      <section className="rounded-2xl bg-gradient-to-br from-slate-950 to-slate-800 text-white p-5 shadow-xl">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-emerald-300" />
            <h3 className="font-extrabold text-lg">Safety Score</h3>
          </div>
          <div className={['text-4xl font-extrabold tabular-nums',
            safetyPct >= 80 ? 'text-emerald-300' : safetyPct >= 50 ? 'text-amber-300' : 'text-rose-300'].join(' ')}>
            {safetyPct}%
          </div>
        </div>
        <div className="h-3 rounded-full bg-white/10 overflow-hidden">
          <div className={['h-full transition-all',
            safetyPct >= 80 ? 'bg-emerald-500' : safetyPct >= 50 ? 'bg-amber-500' : 'bg-rose-500'].join(' ')}
            style={{ width: `${safetyPct}%` }} />
        </div>
        <p className="text-xs font-semibold text-white/70 mt-2">
          {safetyPct >= 80 ? '✅ Excellent — this toy is well-certified and safe' :
           safetyPct >= 50 ? '⚠️ Good — consider adding more certifications' :
           '❌ Low — please add certifications and check safety flags'}
        </p>
      </section>

      {/* CERTIFICATIONS */}
      <section className="rounded-2xl border-2 border-emerald-300 bg-gradient-to-br from-emerald-50 to-white p-5 space-y-4">
        <SectionHead icon={Award} title="Safety Certifications" desc="Approved standards" tone="emerald" />
        <div className="grid sm:grid-cols-2 gap-2">
          {CERTIFICATIONS.map((c) => {
            const a = safety.safetyCertifications?.includes(c.v);
            return (
              <button key={c.v} type="button" onClick={() => tog(c.v)}
                className={['p-3 rounded-xl border-2 transition flex items-center gap-3 text-left',
                  a ? 'border-emerald-600 bg-emerald-600 text-white shadow-md'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-emerald-400'].join(' ')}>
                <span className="text-2xl">{c.e}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-extrabold text-sm">{c.l}</div>
                  <div className={['text-[10px] font-bold', a ? 'text-white/80' : 'text-slate-500'].join(' ')}>{c.desc}</div>
                </div>
                {a && <CheckCircle2 className="h-5 w-5 shrink-0" />}
              </button>
            );
          })}
        </div>
      </section>

      {/* MATERIAL SAFETY */}
      <section className="rounded-2xl border-2 border-slate-200 bg-white p-5 space-y-4">
        <SectionHead icon={ShieldCheck} title="Material Safety" desc="Chemical composition" tone="blue" />
        <div className="grid sm:grid-cols-3 gap-2">
          <SafetyTog checked={safety.isNonToxic} onChange={(v: boolean) => onChange({ isNonToxic: v })}
            icon="🧪" label="Non-toxic" desc="Certified non-toxic materials" />
          <SafetyTog checked={safety.isBpaFree} onChange={(v: boolean) => onChange({ isBpaFree: v })}
            icon="🌿" label="BPA-Free" desc="No Bisphenol A" />
          <SafetyTog checked={safety.isPhthalateFree} onChange={(v: boolean) => onChange({ isPhthalateFree: v })}
            icon="✨" label="Phthalate-Free" desc="No harmful plasticizers" />
        </div>
      </section>

      {/* HAZARDS */}
      <section className="rounded-2xl border-2 border-rose-300 bg-gradient-to-br from-rose-50 to-white p-5 space-y-4">
        <SectionHead icon={ShieldAlert} title="Hazard Flags" desc="Mark any risks — full transparency" tone="rose" />

        <label className={['flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition',
          safety.chokingHazard ? 'border-rose-500 bg-rose-100' : 'border-slate-200 bg-white hover:border-rose-300'].join(' ')}>
          <input type="checkbox" checked={safety.chokingHazard}
            onChange={(e) => onChange({ chokingHazard: e.target.checked })} className="h-5 w-5 rounded" />
          <AlertTriangle className={['h-5 w-5', safety.chokingHazard ? 'text-rose-700' : 'text-slate-400'].join(' ')} />
          <div className="flex-1">
            <div className="font-extrabold text-sm text-slate-900">⚠️ Choking hazard</div>
            <div className="text-[11px] text-slate-600 font-semibold">
              {isCritical && safety.chokingHazard
                ? '❌ NOT SAFE for the age group you selected — reconsider'
                : 'Contains small pieces that could be swallowed'}
            </div>
          </div>
        </label>

        <label className={['flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition',
          safety.smallPartsWarning ? 'border-amber-500 bg-amber-100' : 'border-slate-200 bg-white hover:border-amber-300'].join(' ')}>
          <input type="checkbox" checked={safety.smallPartsWarning}
            onChange={(e) => onChange({ smallPartsWarning: e.target.checked })} className="h-5 w-5 rounded" />
          <AlertTriangle className={['h-5 w-5', safety.smallPartsWarning ? 'text-amber-700' : 'text-slate-400'].join(' ')} />
          <div className="flex-1">
            <div className="font-extrabold text-sm text-slate-900">Small parts warning</div>
            <div className="text-[11px] text-slate-600 font-semibold">Requires supervision, unsuitable for younger siblings</div>
          </div>
        </label>
      </section>

      {/* CUSTOM WARNINGS */}
      <section className="rounded-2xl border-2 border-slate-200 bg-white p-5 space-y-4">
        <SectionHead icon={Info} title="Additional Warnings" desc="Custom safety notes" tone="amber" />

        <div>
          <Lbl>Quick add — common warnings</Lbl>
          <div className="flex flex-wrap gap-1.5">
            {COMMON_WARNINGS.map((w) => {
              const added = safety.safetyWarnings?.includes(w);
              return (
                <button key={w} type="button" disabled={added} onClick={() => addWarning(w)}
                  className={['px-3 py-1.5 rounded-full border-2 text-xs font-extrabold transition disabled:cursor-not-allowed',
                    added ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-white text-slate-700 hover:border-amber-400'].join(' ')}>
                  {added ? '✓ ' : '+ '}{w}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <Lbl>Or add custom warning</Lbl>
          <div className="flex gap-2">
            <input value={customWarning} onChange={(e) => setCustomWarning(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addWarning(customWarning)}
              placeholder="Custom warning message..."
              className="h-11 flex-1 rounded-xl border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-amber-500" />
            <button type="button" onClick={() => addWarning(customWarning)} disabled={!customWarning.trim()}
              className="h-11 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-sm inline-flex items-center gap-1 disabled:opacity-50">
              <Plus className="h-4 w-4" /> Add
            </button>
          </div>
        </div>

        {(safety.safetyWarnings ?? []).length > 0 && (
          <div>
            <div className="text-[10px] uppercase tracking-wider font-extrabold text-slate-600 mb-2">
              {safety.safetyWarnings.length} active warnings
            </div>
            <div className="flex flex-wrap gap-1.5">
              {safety.safetyWarnings.map((w) => (
                <div key={w} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-100 border-2 border-amber-300 text-xs font-extrabold text-amber-800">
                  ⚠️ {w}
                  <button type="button" onClick={() => removeWarning(w)} className="hover:text-rose-700">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function SectionHead({ icon: Icon, title, desc, tone }: any) {
  const tones: Record<string, string> = {
    emerald: 'from-emerald-500 to-teal-700',
    blue: 'from-blue-500 to-cyan-700',
    rose: 'from-rose-500 to-red-700',
    amber: 'from-amber-500 to-orange-700',
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
function SafetyTog({ checked, onChange, icon, label, desc }: any) {
  return (
    <button type="button" onClick={() => onChange(!checked)}
      className={['p-3 rounded-xl border-2 transition text-center',
        checked ? 'border-emerald-500 bg-emerald-50 text-emerald-800' : 'border-slate-200 bg-white text-slate-600 hover:border-emerald-300'].join(' ')}>
      <div className="text-3xl mb-1">{icon}</div>
      <div className="font-extrabold text-sm">{label}</div>
      <div className={['text-[10px] font-bold mt-0.5', checked ? 'text-emerald-700' : 'text-slate-500'].join(' ')}>{desc}</div>
      {checked && <CheckCircle2 className="h-4 w-4 mx-auto mt-1 text-emerald-600" />}
    </button>
  );
}
