import { useState } from 'react';
import {
  Sparkles, Info, Plus, X, Ruler, Shirt, Footprints, Dumbbell, Zap,
  BadgeCheck, Award, Weight,
} from 'lucide-react';
import { Input } from '@core/ui/Input';
import type { SportsWizardSpecs } from '../../hooks/useSportsWizard';
import { isCricketBatCategory, isBallCategory, isApparelCategory, isShoeCategory, isGymCategory } from '../../hooks/useSportsWizard';

interface Props {
  specs: SportsWizardSpecs;
  onChange: (patch: Partial<SportsWizardSpecs>) => void;
  categoryType: string;
  errors: string[];
}

const BAT_WOODS = ['English Willow', 'Kashmir Willow', 'Poplar', 'Composite', 'Bamboo'];
const BAT_GRADES = ['Grade 1+', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Pro Grade'];
const BAT_SIZES = ['Full Size (SH)', 'Size 6', 'Size 5', 'Size 4', 'Size 3', 'Junior', 'Youth'];
const HANDLE_TYPES = ['Round', 'Oval', 'Semi-Oval', 'Single Spring', 'Double Spring'];

const APPAREL_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', '4XL', 'Kids-S', 'Kids-M', 'Kids-L'];
const APPAREL_MATERIALS = ['Polyester', 'Cotton', 'Dri-Fit', 'Micro-Polyester', 'Mesh', 'Blend'];
const FITS = ['Regular', 'Slim', 'Athletic', 'Loose', 'Compression'];

const SHOE_SIZES_UK = ['3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13'];
const SOLE_TYPES = ['Rubber', 'EVA', 'PU', 'TPU', 'Leather', 'Composite'];
const STUD_TYPES = ['Firm Ground (FG)', 'Soft Ground (SG)', 'Astro Turf (AG)', 'Indoor (IN)', 'Multi-Ground (MG)', 'Spikes'];

const GYM_MATERIALS = ['Steel', 'Cast Iron', 'Rubber Coated', 'Neoprene', 'Vinyl', 'PU Coated'];

const CERTIFICATIONS = [
  'ICC Approved', 'BCCI Certified', 'FIFA Approved', 'BWF Approved',
  'ITF Approved', 'ISO 9001', 'CE Certified', 'ASTM Certified',
];

export function SportsWizardStep2Specs({ specs, onChange, categoryType }: Props) {
  const [newCert, setNewCert] = useState('');

  const showBat = isCricketBatCategory(categoryType);
  const showBall = isBallCategory(categoryType);
  const showApparel = isApparelCategory(categoryType);
  const showShoe = isShoeCategory(categoryType);
  const showGym = isGymCategory(categoryType);
  const showNoSpecific = !showBat && !showBall && !showApparel && !showShoe && !showGym;

  const togCert = (v: string) => {
    const cur = specs.certifications ?? [];
    onChange({ certifications: cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v] });
  };

  const addCustomCert = () => {
    const t = newCert.trim();
    if (!t) return;
    if (specs.certifications?.includes(t)) return;
    onChange({ certifications: [...(specs.certifications ?? []), t] });
    setNewCert('');
  };

  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-emerald-50 border-2 border-emerald-200 p-4 flex items-start gap-3">
        <Info className="h-5 w-5 text-emerald-700 shrink-0 mt-0.5" />
        <div className="text-sm text-emerald-900">
          <div className="font-extrabold mb-1">Smart fields</div>
          <div className="font-semibold">
            Fields adapt to your category
            {showBat && ' — cricket bat specifications visible.'}
            {showBall && ' — ball type & material fields visible.'}
            {showApparel && ' — apparel size & fit fields visible.'}
            {showShoe && ' — shoe size & sole type fields visible.'}
            {showGym && ' — gym equipment specs visible.'}
            {showNoSpecific && ' — this category has no extra specs. You can skip ahead.'}
          </div>
        </div>
      </div>

      {/* CRICKET BAT */}
      {showBat && (
        <section className="rounded-2xl border-2 border-slate-200 bg-white p-5 space-y-4">
          <SectionHead icon={Award} title="Cricket Bat Specs" tone="emerald" />
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Lbl>Bat Wood</Lbl>
              <select value={specs.batWood} onChange={(e) => onChange({ batWood: e.target.value })}
                className="h-11 w-full rounded-xl border-2 border-slate-200 bg-white px-3 text-sm font-bold focus:outline-none focus:border-emerald-500">
                <option value="">Select wood</option>
                {BAT_WOODS.map((w) => <option key={w} value={w}>{w}</option>)}
              </select>
            </div>
            <div>
              <Lbl>Bat Grade</Lbl>
              <select value={specs.batGrade} onChange={(e) => onChange({ batGrade: e.target.value })}
                className="h-11 w-full rounded-xl border-2 border-slate-200 bg-white px-3 text-sm font-bold focus:outline-none focus:border-emerald-500">
                <option value="">Select grade</option>
                {BAT_GRADES.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div>
              <Lbl>Bat Size</Lbl>
              <select value={specs.batSize} onChange={(e) => onChange({ batSize: e.target.value })}
                className="h-11 w-full rounded-xl border-2 border-slate-200 bg-white px-3 text-sm font-bold focus:outline-none focus:border-emerald-500">
                <option value="">Select size</option>
                {BAT_SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <Input label="Weight (grams)" type="number" placeholder="1150" value={specs.batWeightGrams}
              onChange={(e) => onChange({ batWeightGrams: e.target.value === '' ? '' : Number(e.target.value) })}
              leftIcon={<Weight className="h-4 w-4 text-slate-400" />} />
            <div className="sm:col-span-2">
              <Lbl>Handle Type</Lbl>
              <div className="grid grid-cols-5 gap-2">
                {HANDLE_TYPES.map((h) => {
                  const a = specs.handleType === h;
                  return (
                    <button key={h} type="button" onClick={() => onChange({ handleType: h })}
                      className={['h-11 rounded-xl border-2 text-xs font-extrabold transition',
                        a ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-200 bg-white text-slate-700 hover:border-emerald-400'].join(' ')}>
                      {h}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* BALL */}
      {showBall && (
        <section className="rounded-2xl border-2 border-slate-200 bg-white p-5 space-y-4">
          <SectionHead icon={Sparkles} title="Ball Specifications" tone="blue" />
          <div className="grid sm:grid-cols-2 gap-3">
            <Input label="Ball Type" placeholder="Test, ODI, Practice, Tennis-taped..." value={specs.ballType}
              onChange={(e) => onChange({ ballType: e.target.value })} />
            <Input label="Weight" placeholder="156g (cricket) / 450g (football)" value={specs.ballWeight}
              onChange={(e) => onChange({ ballWeight: e.target.value })} />
            <Input label="Circumference" placeholder="22.4-22.9 cm" value={specs.ballCircumference}
              onChange={(e) => onChange({ ballCircumference: e.target.value })} />
            <Input label="Material" placeholder="Leather, Synthetic, Rubber..." value={specs.ballMaterial}
              onChange={(e) => onChange({ ballMaterial: e.target.value })} />
          </div>
        </section>
      )}

      {/* APPAREL */}
      {showApparel && (
        <section className="rounded-2xl border-2 border-slate-200 bg-white p-5 space-y-4">
          <SectionHead icon={Shirt} title="Apparel & Kit Specs" tone="violet" />

          <div>
            <Lbl>Size</Lbl>
            <div className="flex flex-wrap gap-1.5">
              {APPAREL_SIZES.map((s) => {
                const a = specs.size === s;
                return (
                  <button key={s} type="button" onClick={() => onChange({ size: s })}
                    className={['px-3 py-1.5 rounded-lg border-2 text-xs font-extrabold transition',
                      a ? 'border-violet-600 bg-violet-600 text-white' : 'border-slate-200 bg-white text-slate-700 hover:border-violet-400'].join(' ')}>
                    {s}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Lbl>Material</Lbl>
              <select value={specs.material} onChange={(e) => onChange({ material: e.target.value })}
                className="h-11 w-full rounded-xl border-2 border-slate-200 bg-white px-3 text-sm font-bold focus:outline-none focus:border-violet-500">
                <option value="">Select material</option>
                {APPAREL_MATERIALS.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <Lbl>Fit</Lbl>
              <select value={specs.fit} onChange={(e) => onChange({ fit: e.target.value })}
                className="h-11 w-full rounded-xl border-2 border-slate-200 bg-white px-3 text-sm font-bold focus:outline-none focus:border-violet-500">
                <option value="">Select fit</option>
                {FITS.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
          </div>

          <label className={['flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition',
            specs.hasCustomization ? 'border-violet-400 bg-violet-50' : 'border-slate-200 bg-white hover:border-violet-300'].join(' ')}>
            <input type="checkbox" checked={specs.hasCustomization}
              onChange={(e) => onChange({ hasCustomization: e.target.checked })}
              className="h-5 w-5 rounded" />
            <Sparkles className={['h-5 w-5', specs.hasCustomization ? 'text-violet-600' : 'text-slate-400'].join(' ')} />
            <div>
              <div className="font-extrabold text-sm text-slate-900">Supports Name & Number Printing</div>
              <div className="text-[11px] text-slate-500 font-semibold">For team jerseys</div>
            </div>
          </label>
        </section>
      )}

      {/* SHOES */}
      {showShoe && (
        <section className="rounded-2xl border-2 border-slate-200 bg-white p-5 space-y-4">
          <SectionHead icon={Footprints} title="Shoe Specifications" tone="amber" />

          <div>
            <Lbl>Shoe Size (UK)</Lbl>
            <div className="flex flex-wrap gap-1.5">
              {SHOE_SIZES_UK.map((s) => {
                const a = specs.shoeSize === s;
                return (
                  <button key={s} type="button" onClick={() => onChange({ shoeSize: s })}
                    className={['h-10 w-12 rounded-lg border-2 text-sm font-extrabold transition',
                      a ? 'border-amber-600 bg-amber-600 text-white' : 'border-slate-200 bg-white text-slate-700 hover:border-amber-400'].join(' ')}>
                    {s}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Lbl>Sole Type</Lbl>
              <select value={specs.soleType} onChange={(e) => onChange({ soleType: e.target.value })}
                className="h-11 w-full rounded-xl border-2 border-slate-200 bg-white px-3 text-sm font-bold focus:outline-none focus:border-amber-500">
                <option value="">Select sole</option>
                {SOLE_TYPES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <Lbl>Stud Type</Lbl>
              <select value={specs.studType} onChange={(e) => onChange({ studType: e.target.value })}
                className="h-11 w-full rounded-xl border-2 border-slate-200 bg-white px-3 text-sm font-bold focus:outline-none focus:border-amber-500">
                <option value="">Not applicable</option>
                {STUD_TYPES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
        </section>
      )}

      {/* GYM */}
      {showGym && (
        <section className="rounded-2xl border-2 border-slate-200 bg-white p-5 space-y-4">
          <SectionHead icon={Dumbbell} title="Gym Equipment Specs" tone="rose" />

          <div className="grid sm:grid-cols-2 gap-3">
            <Input label="Weight" placeholder="10kg / 20lbs" value={specs.weight}
              onChange={(e) => onChange({ weight: e.target.value })}
              leftIcon={<Weight className="h-4 w-4 text-slate-400" />} />
            <Input label="Max User Weight" placeholder="120kg" value={specs.maxUserWeight}
              onChange={(e) => onChange({ maxUserWeight: e.target.value })} />
            <Input label="Dimensions" placeholder="180 x 60 x 130 cm" value={specs.dimensions}
              onChange={(e) => onChange({ dimensions: e.target.value })}
              leftIcon={<Ruler className="h-4 w-4 text-slate-400" />} />
            <div>
              <Lbl>Material</Lbl>
              <select value={specs.material2} onChange={(e) => onChange({ material2: e.target.value })}
                className="h-11 w-full rounded-xl border-2 border-slate-200 bg-white px-3 text-sm font-bold focus:outline-none focus:border-rose-500">
                <option value="">Select material</option>
                {GYM_MATERIALS.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <Input label="Power Rating" placeholder="2.5 HP DC Motor" value={specs.powerRating}
              onChange={(e) => onChange({ powerRating: e.target.value })}
              leftIcon={<Zap className="h-4 w-4 text-slate-400" />} />
            <Input label="Motor Type" placeholder="DC / AC / Belt drive" value={specs.motorType}
              onChange={(e) => onChange({ motorType: e.target.value })} />
          </div>

          <label className={['flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition',
            specs.foldable ? 'border-rose-400 bg-rose-50' : 'border-slate-200 bg-white hover:border-rose-300'].join(' ')}>
            <input type="checkbox" checked={specs.foldable}
              onChange={(e) => onChange({ foldable: e.target.checked })}
              className="h-5 w-5 rounded" />
            <div>
              <div className="font-extrabold text-sm text-slate-900">Foldable for Storage</div>
              <div className="text-[11px] text-slate-500 font-semibold">Saves space when not in use</div>
            </div>
          </label>
        </section>
      )}

      {/* CERTIFICATIONS — Always visible */}
      <section className="rounded-2xl border-2 border-slate-200 bg-white p-5 space-y-4">
        <SectionHead icon={BadgeCheck} title="Certifications & Approvals" tone="blue" />
        <div>
          <Lbl>Common certifications — click to add</Lbl>
          <div className="flex flex-wrap gap-1.5">
            {CERTIFICATIONS.map((c) => {
              const a = specs.certifications?.includes(c);
              return (
                <button key={c} type="button" onClick={() => togCert(c)}
                  className={['px-3 py-1.5 rounded-full border-2 text-xs font-extrabold transition',
                    a ? 'border-blue-500 bg-blue-500 text-white' : 'border-slate-200 bg-white text-slate-700 hover:border-blue-300'].join(' ')}>
                  {a ? '✓ ' : ''}{c}
                </button>
              );
            })}
          </div>
        </div>
        <div>
          <Lbl>Add custom certification</Lbl>
          <div className="flex gap-2">
            <input value={newCert} onChange={(e) => setNewCert(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addCustomCert()}
              placeholder="e.g. PCB Approved"
              className="h-11 flex-1 rounded-xl border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-blue-500" />
            <button type="button" onClick={addCustomCert} disabled={!newCert.trim()}
              className="h-11 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-sm inline-flex items-center gap-1 disabled:opacity-50">
              <Plus className="h-4 w-4" /> Add
            </button>
          </div>
        </div>
        {(specs.certifications ?? []).length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {specs.certifications.map((c) => (
              <div key={c} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-100 border-2 border-blue-300 text-xs font-extrabold text-blue-800">
                {c}
                <button type="button" onClick={() => togCert(c)} className="hover:text-rose-700">
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function SectionHead({ icon: Icon, title, tone }: any) {
  const tones: Record<string, string> = {
    emerald: 'from-emerald-500 to-teal-700',
    blue: 'from-blue-500 to-cyan-700',
    violet: 'from-violet-500 to-purple-700',
    amber: 'from-amber-500 to-orange-700',
    rose: 'from-rose-500 to-red-700',
  };
  return (
    <div className="flex items-center gap-3 pb-2 border-b border-slate-100">
      <div className={`h-9 w-9 rounded-xl bg-gradient-to-br ${tones[tone]} text-white flex items-center justify-center shadow-md`}>
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="font-extrabold text-slate-900">{title}</h3>
    </div>
  );
}
function Lbl({ children }: any) {
  return <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 mb-1.5">{children}</label>;
}
