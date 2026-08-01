import { useState } from 'react';
import {
  Sparkles, Palette, Ruler, Battery, Radio, Users, Music,
  Volume2, Lightbulb, Zap, GraduationCap, Info, Package,
  Video, FileText, Plus, X,
} from 'lucide-react';
import { Input } from '@core/ui/Input';
import type { ToyWizardDetails } from '../../hooks/useToyWizard';

interface Props {
  details: ToyWizardDetails;
  onChange: (patch: Partial<ToyWizardDetails>) => void;
  categoryType: string;
  ageGroup: string;
  errors: string[];
}

const LEARNING_AREAS = [
  'Math', 'Language', 'Science', 'Reading', 'Writing', 'Colors', 'Shapes',
  'Numbers', 'Alphabet', 'Music', 'Art', 'Geography', 'History', 'Coding',
];

const DEVELOPMENT_SKILLS = [
  'Fine Motor Skills', 'Gross Motor Skills', 'Cognitive', 'Social', 'Emotional',
  'Creativity', 'Problem Solving', 'Hand-Eye Coordination', 'Memory',
  'Focus', 'Sensory', 'Communication', 'Logical Thinking',
];

const MATERIALS = [
  'Plastic', 'Wood', 'Metal', 'Cotton', 'Polyester', 'Rubber',
  'Silicone', 'Cardboard', 'Paper', 'Foam', 'Fabric', 'Vinyl',
  'Aluminium', 'Steel', 'Eco-friendly Plastic', 'Recycled Materials',
];

const BATTERY_TYPES = ['AA', 'AAA', 'C', 'D', '9V', 'Button Cell', 'Lithium', 'Rechargeable'];

const LANGUAGES = ['English', 'Urdu', 'Arabic', 'Punjabi', 'Sindhi', 'Pashto'];

const PLAYER_COUNTS = ['1 Player', '1-2 Players', '2 Players', '2-4 Players', '3-6 Players', '4+ Players', 'Group Play'];

export function ToyWizardStep2Details({ details, onChange, categoryType, ageGroup }: Props) {
  const [customLearning, setCustomLearning] = useState('');
  const [customSkill, setCustomSkill] = useState('');
  const [customMaterial, setCustomMaterial] = useState('');

  const isRcCategory = categoryType.startsWith('RC_');
  const isBabyCategory = ['BABY_TOY', 'RATTLE', 'TEETHER', 'STACKING_TOY', 'SOFT_TOY'].includes(categoryType);
  const isBoardGame = ['BOARD_GAME', 'CARD_GAME'].includes(categoryType);

  const tog = (field: keyof ToyWizardDetails, val: string) => {
    const cur = (details[field] ?? []) as string[];
    onChange({ [field]: cur.includes(val) ? cur.filter((x) => x !== val) : [...cur, val] } as any);
  };

  const addCustom = (field: keyof ToyWizardDetails, val: string, setter: (v: string) => void) => {
    const t = val.trim();
    if (!t) return;
    const cur = (details[field] ?? []) as string[];
    if (cur.includes(t)) return;
    onChange({ [field]: [...cur, t] } as any);
    setter('');
  };

  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-pink-50 border-2 border-pink-200 p-4 flex items-start gap-3">
        <Info className="h-5 w-5 text-pink-700 shrink-0 mt-0.5" />
        <div className="text-sm text-pink-900">
          <div className="font-extrabold mb-1">Detail fields (all optional)</div>
          <div className="font-semibold">
            Fill only what applies to this toy. Fields adapt to the category and age group you picked.
            {isRcCategory && ' RC specs shown.'}
            {isBabyCategory && ' Baby-focused fields highlighted.'}
          </div>
        </div>
      </div>

      {/* EDUCATIONAL VALUE */}
      <section className="rounded-2xl border-2 border-slate-200 bg-white p-5 space-y-4">
        <SectionHead icon={GraduationCap} title="Educational Value" tone="pink" />

        <label className="flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition
          border-slate-200 bg-white hover:border-pink-300 has-[:checked]:border-pink-400 has-[:checked]:bg-pink-50">
          <input type="checkbox" checked={details.isEducational}
            onChange={(e) => onChange({ isEducational: e.target.checked })} className="h-5 w-5 rounded" />
          <GraduationCap className={['h-5 w-5', details.isEducational ? 'text-pink-600' : 'text-slate-400'].join(' ')} />
          <div className="min-w-0">
            <div className="font-extrabold text-sm text-slate-900">This is an educational toy</div>
            <div className="text-[11px] text-slate-500 font-semibold">Teaches skills, concepts, or knowledge</div>
          </div>
        </label>

        {details.isEducational && (
          <>
            <div>
              <Lbl>Learning Areas</Lbl>
              <div className="flex flex-wrap gap-1.5">
                {LEARNING_AREAS.map((la) => {
                  const a = details.learningAreas?.includes(la);
                  return (
                    <button key={la} type="button" onClick={() => tog('learningAreas', la)}
                      className={['px-3 py-1.5 rounded-full border-2 text-xs font-extrabold transition',
                        a ? 'border-pink-500 bg-pink-500 text-white' : 'border-slate-200 bg-white text-slate-700 hover:border-pink-300'].join(' ')}>
                      {la}
                    </button>
                  );
                })}
              </div>
              <div className="flex gap-2 mt-2">
                <input value={customLearning} onChange={(e) => setCustomLearning(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addCustom('learningAreas', customLearning, setCustomLearning)}
                  placeholder="Custom learning area..."
                  className="h-10 flex-1 rounded-lg border-2 border-slate-200 px-3 text-xs font-bold focus:outline-none focus:border-pink-500" />
                <button type="button" onClick={() => addCustom('learningAreas', customLearning, setCustomLearning)}
                  className="h-10 px-3 rounded-lg bg-pink-600 hover:bg-pink-700 text-white text-xs font-extrabold inline-flex items-center gap-1">
                  <Plus className="h-3.5 w-3.5" /> Add
                </button>
              </div>
            </div>

            <div>
              <Lbl>Development Skills</Lbl>
              <div className="flex flex-wrap gap-1.5">
                {DEVELOPMENT_SKILLS.map((s) => {
                  const a = details.developmentSkills?.includes(s);
                  return (
                    <button key={s} type="button" onClick={() => tog('developmentSkills', s)}
                      className={['px-3 py-1.5 rounded-full border-2 text-xs font-extrabold transition',
                        a ? 'border-violet-500 bg-violet-500 text-white' : 'border-slate-200 bg-white text-slate-700 hover:border-violet-300'].join(' ')}>
                      {s}
                    </button>
                  );
                })}
              </div>
              <div className="flex gap-2 mt-2">
                <input value={customSkill} onChange={(e) => setCustomSkill(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addCustom('developmentSkills', customSkill, setCustomSkill)}
                  placeholder="Custom skill..."
                  className="h-10 flex-1 rounded-lg border-2 border-slate-200 px-3 text-xs font-bold focus:outline-none focus:border-violet-500" />
                <button type="button" onClick={() => addCustom('developmentSkills', customSkill, setCustomSkill)}
                  className="h-10 px-3 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-xs font-extrabold inline-flex items-center gap-1">
                  <Plus className="h-3.5 w-3.5" /> Add
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <label className="flex items-center gap-2 p-3 rounded-xl border-2 border-slate-200 hover:border-pink-300 cursor-pointer has-[:checked]:border-pink-400 has-[:checked]:bg-pink-50">
                <input type="checkbox" checked={details.isMontessoriApproved}
                  onChange={(e) => onChange({ isMontessoriApproved: e.target.checked })}
                  className="h-4 w-4 rounded" />
                <span className="text-xs font-extrabold text-slate-700">🌱 Montessori Approved</span>
              </label>
              <label className="flex items-center gap-2 p-3 rounded-xl border-2 border-slate-200 hover:border-pink-300 cursor-pointer has-[:checked]:border-pink-400 has-[:checked]:bg-pink-50">
                <input type="checkbox" checked={details.isWaldorfApproved}
                  onChange={(e) => onChange({ isWaldorfApproved: e.target.checked })}
                  className="h-4 w-4 rounded" />
                <span className="text-xs font-extrabold text-slate-700">🌿 Waldorf Approved</span>
              </label>
            </div>
          </>
        )}
      </section>

      {/* MATERIAL & PHYSICAL */}
      <section className="rounded-2xl border-2 border-slate-200 bg-white p-5 space-y-4">
        <SectionHead icon={Palette} title="Material & Physical" tone="violet" />

        <div>
          <Lbl>Primary Material</Lbl>
          <input list="materialPresets" value={details.material}
            onChange={(e) => onChange({ material: e.target.value })} placeholder="Plastic, Wood, Cotton..."
            className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-violet-500" />
          <datalist id="materialPresets">
            {MATERIALS.map((m) => <option key={m} value={m} />)}
          </datalist>
        </div>

        <div>
          <Lbl>All Materials Used</Lbl>
          <div className="flex flex-wrap gap-1.5">
            {MATERIALS.map((m) => {
              const a = details.materialsUsed?.includes(m);
              return (
                <button key={m} type="button" onClick={() => tog('materialsUsed', m)}
                  className={['px-2.5 py-1 rounded-full border-2 text-xs font-extrabold transition',
                    a ? 'border-violet-500 bg-violet-500 text-white' : 'border-slate-200 bg-white text-slate-700 hover:border-violet-300'].join(' ')}>
                  {a ? '✓ ' : ''}{m}
                </button>
              );
            })}
          </div>
          <div className="flex gap-2 mt-2">
            <input value={customMaterial} onChange={(e) => setCustomMaterial(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addCustom('materialsUsed', customMaterial, setCustomMaterial)}
              placeholder="Custom material..."
              className="h-10 flex-1 rounded-lg border-2 border-slate-200 px-3 text-xs font-bold focus:outline-none focus:border-violet-500" />
            <button type="button" onClick={() => addCustom('materialsUsed', customMaterial, setCustomMaterial)}
              className="h-10 px-3 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-xs font-extrabold inline-flex items-center gap-1">
              <Plus className="h-3.5 w-3.5" /> Add
            </button>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <Lbl>Color Name</Lbl>
            <input value={details.colorName} onChange={(e) => onChange({ colorName: e.target.value })}
              placeholder="Multi-color, Pink, Blue..."
              className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-violet-500" />
          </div>
          <div>
            <Lbl>Color Preview</Lbl>
            <div className="flex gap-2 items-center">
              <input type="color" value={details.colorHex || '#ec4899'} onChange={(e) => onChange({ colorHex: e.target.value })}
                className="h-11 w-16 rounded-xl border-2 border-slate-200 cursor-pointer" />
              <input value={details.colorHex} onChange={(e) => onChange({ colorHex: e.target.value })} placeholder="#ec4899"
                className="h-11 flex-1 rounded-xl border-2 border-slate-200 px-3 text-sm font-mono focus:outline-none focus:border-violet-500" />
            </div>
          </div>
        </div>
      </section>

      {/* SIZE & DIMENSIONS */}
      <section className="rounded-2xl border-2 border-slate-200 bg-white p-5 space-y-4">
        <SectionHead icon={Ruler} title="Size & Dimensions" tone="slate" />
        <div className="grid sm:grid-cols-2 gap-3">
          <Input label="Size" placeholder="Small / Medium / Large / 30cm" value={details.size}
            onChange={(e) => onChange({ size: e.target.value })} />
          <Input label="Dimensions (LxWxH)" placeholder="30 x 20 x 15 cm" value={details.dimensions}
            onChange={(e) => onChange({ dimensions: e.target.value })} />
          <Input label="Weight (grams)" type="number" placeholder="500" value={details.weightGrams}
            onChange={(e) => onChange({ weightGrams: e.target.value === '' ? '' : Number(e.target.value) })} />
          <Input label="Number of Pieces" type="number" placeholder="e.g. 500 (for LEGO)" value={details.numberOfPieces}
            onChange={(e) => onChange({ numberOfPieces: e.target.value === '' ? '' : Number(e.target.value) })} />
        </div>
      </section>

      {/* BATTERY */}
      <section className="rounded-2xl border-2 border-slate-200 bg-white p-5 space-y-4">
        <SectionHead icon={Battery} title="Battery Requirements" tone="amber" />
        <label className="flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition
          border-slate-200 bg-white hover:border-amber-300 has-[:checked]:border-amber-400 has-[:checked]:bg-amber-50">
          <input type="checkbox" checked={details.requiresBatteries}
            onChange={(e) => onChange({ requiresBatteries: e.target.checked })} className="h-5 w-5 rounded" />
          <Battery className={['h-5 w-5', details.requiresBatteries ? 'text-amber-600' : 'text-slate-400'].join(' ')} />
          <div className="min-w-0">
            <div className="font-extrabold text-sm text-slate-900">Requires batteries</div>
            <div className="text-[11px] text-slate-500 font-semibold">Toy needs batteries to work</div>
          </div>
        </label>

        {details.requiresBatteries && (
          <>
            <label className="flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition
              border-emerald-200 bg-emerald-50 hover:border-emerald-300 has-[:checked]:border-emerald-400 has-[:checked]:bg-emerald-100">
              <input type="checkbox" checked={details.batteriesIncluded}
                onChange={(e) => onChange({ batteriesIncluded: e.target.checked })} className="h-5 w-5 rounded" />
              <div>
                <div className="font-extrabold text-sm text-emerald-900">Batteries included in box</div>
                <div className="text-[11px] text-emerald-700 font-semibold">
                  {details.batteriesIncluded ? 'Ready to play!' : '⚠️ Upsell opportunity — mention at checkout'}
                </div>
              </div>
            </label>

            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <Lbl>Battery Type</Lbl>
                <select value={details.batteryType} onChange={(e) => onChange({ batteryType: e.target.value })}
                  className="h-11 w-full rounded-xl border-2 border-slate-200 bg-white px-3 text-sm font-bold focus:outline-none focus:border-amber-500">
                  <option value="">Select type</option>
                  {BATTERY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <Input label="Quantity" type="number" placeholder="e.g. 3" value={details.batteryQuantity}
                onChange={(e) => onChange({ batteryQuantity: e.target.value === '' ? '' : Number(e.target.value) })} />
            </div>
          </>
        )}
      </section>

      {/* RC SPECIFIC */}
      <section className="rounded-2xl border-2 border-slate-200 bg-white p-5 space-y-4">
        <SectionHead icon={Radio} title="Remote Control" tone="blue" />
        <label className="flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition
          border-slate-200 bg-white hover:border-blue-300 has-[:checked]:border-blue-400 has-[:checked]:bg-blue-50">
          <input type="checkbox" checked={details.isRemoteControlled}
            onChange={(e) => onChange({ isRemoteControlled: e.target.checked })} className="h-5 w-5 rounded" />
          <Radio className={['h-5 w-5', details.isRemoteControlled ? 'text-blue-600' : 'text-slate-400'].join(' ')} />
          <div className="min-w-0">
            <div className="font-extrabold text-sm text-slate-900">Remote controlled</div>
            <div className="text-[11px] text-slate-500 font-semibold">RC car, drone, helicopter etc.</div>
          </div>
        </label>

        {(details.isRemoteControlled || isRcCategory) && (
          <div className="grid sm:grid-cols-2 gap-3">
            <Input label="Control Range" placeholder="15 meters" value={details.rcRange}
              onChange={(e) => onChange({ rcRange: e.target.value })} />
            <Input label="Frequency" placeholder="2.4 GHz" value={details.rcFrequency}
              onChange={(e) => onChange({ rcFrequency: e.target.value })} />
            <Input label="Charging Time" placeholder="60 minutes" value={details.rcChargingTime}
              onChange={(e) => onChange({ rcChargingTime: e.target.value })} />
            <Input label="Run Time" placeholder="20 minutes" value={details.rcRunTime}
              onChange={(e) => onChange({ rcRunTime: e.target.value })} />
          </div>
        )}
      </section>

      {/* PLAY EXPERIENCE */}
      <section className="rounded-2xl border-2 border-slate-200 bg-white p-5 space-y-4">
        <SectionHead icon={Users} title="Play Experience" tone="emerald" />
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <Lbl>Player Count</Lbl>
            <select value={details.playerCount} onChange={(e) => onChange({ playerCount: e.target.value })}
              className="h-11 w-full rounded-xl border-2 border-slate-200 bg-white px-3 text-sm font-bold focus:outline-none focus:border-emerald-500">
              <option value="">Not specified</option>
              {PLAYER_COUNTS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <Input label="Play Duration (min)" type="number" placeholder="30" value={details.playDurationMinutes}
            onChange={(e) => onChange({ playDurationMinutes: e.target.value === '' ? '' : Number(e.target.value) })} />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <Check2 checked={details.isMultiplayer} onChange={(v: boolean) => onChange({ isMultiplayer: v })} icon={Users} label="Multiplayer" />
          <Check2 checked={details.hasSound} onChange={(v: boolean) => onChange({ hasSound: v })} icon={Volume2} label="Sound" />
          <Check2 checked={details.hasLights} onChange={(v: boolean) => onChange({ hasLights: v })} icon={Lightbulb} label="Lights" />
          <Check2 checked={details.hasMotor} onChange={(v: boolean) => onChange({ hasMotor: v })} icon={Zap} label="Motor" />
        </div>

        <label className="flex items-center gap-3 p-3 rounded-xl border-2 border-slate-200 hover:border-amber-300 cursor-pointer has-[:checked]:border-amber-400 has-[:checked]:bg-amber-50">
          <input type="checkbox" checked={details.isCollectible}
            onChange={(e) => onChange({ isCollectible: e.target.checked })} className="h-5 w-5 rounded" />
          <div>
            <div className="font-extrabold text-sm text-slate-900">💎 Collectible item</div>
            <div className="text-[11px] text-slate-500 font-semibold">Limited edition, series, rare pieces</div>
          </div>
        </label>
      </section>

      {/* LANGUAGE & INSTRUCTIONS */}
      <section className="rounded-2xl border-2 border-slate-200 bg-white p-5 space-y-4">
        <SectionHead icon={Music} title="Language & Extras" tone="rose" />

        {(details.hasSound || isBoardGame || details.isEducational) && (
          <div>
            <Lbl>Languages Supported</Lbl>
            <div className="flex flex-wrap gap-1.5">
              {LANGUAGES.map((l) => {
                const a = details.languagesSupported?.includes(l);
                return (
                  <button key={l} type="button" onClick={() => tog('languagesSupported', l)}
                    className={['px-3 py-1.5 rounded-full border-2 text-xs font-extrabold transition',
                      a ? 'border-rose-500 bg-rose-500 text-white' : 'border-slate-200 bg-white text-slate-700 hover:border-rose-300'].join(' ')}>
                    {l}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <label className="flex items-center gap-3 p-3 rounded-xl border-2 border-slate-200 hover:border-rose-300 cursor-pointer has-[:checked]:border-rose-400 has-[:checked]:bg-rose-50">
          <input type="checkbox" checked={details.hasReplacementParts}
            onChange={(e) => onChange({ hasReplacementParts: e.target.checked })} className="h-5 w-5 rounded" />
          <Package className={['h-5 w-5', details.hasReplacementParts ? 'text-rose-600' : 'text-slate-400'].join(' ')} />
          <div>
            <div className="font-extrabold text-sm text-slate-900">Replacement parts available</div>
            <div className="text-[11px] text-slate-500 font-semibold">Aftermarket support for lost/broken pieces</div>
          </div>
        </label>

        <div className="grid sm:grid-cols-2 gap-3">
          <Input label="Video URL (YouTube demo)" placeholder="https://youtube.com/..." value={details.videoUrl}
            onChange={(e) => onChange({ videoUrl: e.target.value })} leftIcon={<Video className="h-4 w-4 text-slate-400" />} />
          <Input label="Instruction Manual URL" placeholder="https://..." value={details.instructionUrl}
            onChange={(e) => onChange({ instructionUrl: e.target.value })} leftIcon={<FileText className="h-4 w-4 text-slate-400" />} />
        </div>
      </section>
    </div>
  );
}

function SectionHead({ icon: Icon, title, tone }: any) {
  const tones: Record<string, string> = {
    pink: 'from-pink-500 to-rose-700',
    violet: 'from-violet-500 to-purple-700',
    amber: 'from-amber-500 to-orange-700',
    blue: 'from-blue-500 to-cyan-700',
    emerald: 'from-emerald-500 to-teal-700',
    rose: 'from-rose-500 to-red-700',
    slate: 'from-slate-500 to-slate-700',
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
function Check2({ checked, onChange, icon: Icon, label }: any) {
  return (
    <label className={['flex flex-col items-center gap-1 p-3 rounded-xl border-2 cursor-pointer transition',
      checked ? 'border-emerald-500 bg-emerald-50 text-emerald-800' : 'border-slate-200 bg-white text-slate-600 hover:border-emerald-300'].join(' ')}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="sr-only" />
      <Icon className="h-5 w-5" />
      <span className="text-[11px] font-extrabold">{label}</span>
    </label>
  );
}
