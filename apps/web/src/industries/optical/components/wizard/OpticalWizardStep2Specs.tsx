import { useState } from 'react';
import {
  Sparkles, Ruler, Palette, Plus, X, Eye, Shield, Sun,
  Info, Circle, Layers,
} from 'lucide-react';
import { Input } from '@core/ui/Input';
import type { OpticalWizardFrame, OpticalWizardLens, OpticalWizardContactLens } from '../../hooks/useOpticalWizard';
import { isFrameCategory, isLensCategory, isContactLensCategory } from '../../hooks/useOpticalWizard';

interface Props {
  frame: OpticalWizardFrame;
  lens: OpticalWizardLens;
  contactLens: OpticalWizardContactLens;
  onChangeFrame: (patch: Partial<OpticalWizardFrame>) => void;
  onChangeLens: (patch: Partial<OpticalWizardLens>) => void;
  onChangeContactLens: (patch: Partial<OpticalWizardContactLens>) => void;
  categoryType: string;
  errors: string[];
}

const FRAME_SHAPES = [
  { v: 'ROUND', l: 'Round', e: '⭕' },
  { v: 'SQUARE', l: 'Square', e: '⬜' },
  { v: 'RECTANGLE', l: 'Rectangle', e: '▭' },
  { v: 'OVAL', l: 'Oval', e: '⬭' },
  { v: 'CAT_EYE', l: 'Cat Eye', e: '🐱' },
  { v: 'AVIATOR', l: 'Aviator', e: '✈️' },
  { v: 'WAYFARER', l: 'Wayfarer', e: '🕶️' },
  { v: 'CLUBMASTER', l: 'Clubmaster', e: '👔' },
  { v: 'GEOMETRIC', l: 'Geometric', e: '🔶' },
  { v: 'RIMLESS', l: 'Rimless', e: '👀' },
  { v: 'SEMI_RIMLESS', l: 'Semi-Rimless', e: '👓' },
  { v: 'BROWLINE', l: 'Browline', e: '➖' },
  { v: 'BUTTERFLY', l: 'Butterfly', e: '🦋' },
  { v: 'OTHER', l: 'Other', e: '❓' },
];

const FRAME_MATERIALS = [
  { v: 'METAL', l: 'Metal' },
  { v: 'PLASTIC', l: 'Plastic' },
  { v: 'ACETATE', l: 'Acetate' },
  { v: 'TITANIUM', l: 'Titanium' },
  { v: 'STAINLESS_STEEL', l: 'Stainless Steel' },
  { v: 'WOOD', l: 'Wood' },
  { v: 'BAMBOO', l: 'Bamboo' },
  { v: 'TR90', l: 'TR90' },
  { v: 'ULTEM', l: 'Ultem' },
  { v: 'MIXED', l: 'Mixed' },
  { v: 'OTHER', l: 'Other' },
];

const LENS_TYPES = ['Single Vision', 'Bifocal', 'Progressive', 'Reading', 'Computer', 'Driving', 'Toric', 'Multifocal'];
const LENS_MATERIALS = ['CR-39', 'Polycarbonate', 'Trivex', 'High Index', 'Glass', 'Photochromic'];
const LENS_INDEXES = ['1.50', '1.56', '1.60', '1.67', '1.74'];
const LENS_COATINGS = [
  'Anti-Reflective', 'Blue Light Cut', 'UV Protection', 'Anti-Glare',
  'Anti-Scratch', 'Water Repellent', 'Anti-Fog', 'Hard Coat',
  'Polarized', 'Photochromic', 'Mirror Coating',
];

const CL_DURATIONS = ['Daily', 'Weekly', 'Bi-Weekly', 'Monthly', '3 Months', '6 Months', 'Yearly'];
const CL_WATER_CONTENT = ['38%', '42%', '55%', '58%', '65%', '75%'];
const CL_BASE_CURVES = ['8.4', '8.5', '8.6', '8.7', '8.8', '9.0'];
const CL_DIAMETERS = ['13.8', '14.0', '14.1', '14.2', '14.5'];

const COLOR_PRESETS = [
  { name: 'Black', hex: '#000000' },
  { name: 'Tortoise', hex: '#5C3A21' },
  { name: 'Brown', hex: '#8B4513' },
  { name: 'Gold', hex: '#D4AF37' },
  { name: 'Silver', hex: '#C0C0C0' },
  { name: 'Rose Gold', hex: '#B76E79' },
  { name: 'Gunmetal', hex: '#2A3439' },
  { name: 'Navy', hex: '#000080' },
  { name: 'Red', hex: '#B22222' },
  { name: 'Clear', hex: '#F0F8FF' },
  { name: 'Pink', hex: '#FFB6C1' },
  { name: 'Blue', hex: '#4169E1' },
];

export function OpticalWizardStep2Specs({
  frame, lens, contactLens,
  onChangeFrame, onChangeLens, onChangeContactLens,
  categoryType,
}: Props) {
  const [newColor, setNewColor] = useState('');

  const showFrame = isFrameCategory(categoryType);
  const showLens = isLensCategory(categoryType);
  const showContactLens = isContactLensCategory(categoryType);
  const showNothing = !showFrame && !showLens && !showContactLens;

  const togCoating = (c: string) => {
    const cur = lens.lensCoatings ?? [];
    onChangeLens({ lensCoatings: cur.includes(c) ? cur.filter((x) => x !== c) : [...cur, c] });
  };

  const addColor = (name: string) => {
    const t = name.trim();
    if (!t) return;
    const cur = frame.frameColorOptions ?? [];
    if (cur.includes(t)) return;
    onChangeFrame({ frameColorOptions: [...cur, t] });
    setNewColor('');
  };

  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-cyan-50 border-2 border-cyan-200 p-4 flex items-start gap-3">
        <Info className="h-5 w-5 text-cyan-700 shrink-0 mt-0.5" />
        <div className="text-sm text-cyan-900">
          <div className="font-extrabold mb-1">Smart fields</div>
          <div className="font-semibold">
            {showFrame && 'Showing frame measurements and colors.'}
            {showLens && 'Showing lens type, material, index, and coatings.'}
            {showContactLens && 'Showing contact lens duration, curvature, and diameter.'}
            {showNothing && 'This category needs no extra specs. Move to next step.'}
          </div>
        </div>
      </div>

      {/* FRAME */}
      {showFrame && (
        <>
          <section className="rounded-2xl border-2 border-slate-200 bg-white p-5 space-y-4">
            <SectionHead icon={Sparkles} title="Frame Shape" tone="cyan" />
            <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-7 gap-2">
              {FRAME_SHAPES.map((s) => {
                const a = frame.frameShape === s.v;
                return (
                  <button key={s.v} type="button" onClick={() => onChangeFrame({ frameShape: s.v })}
                    className={['p-2.5 rounded-xl border-2 transition flex flex-col items-center gap-1',
                      a ? 'border-cyan-600 bg-cyan-600 text-white shadow-md scale-[1.03]'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-cyan-400'].join(' ')}>
                    <span className="text-xl">{s.e}</span>
                    <span className="text-[10px] font-extrabold text-center">{s.l}</span>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="rounded-2xl border-2 border-slate-200 bg-white p-5 space-y-4">
            <SectionHead icon={Layers} title="Frame Material" tone="violet" />
            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2">
              {FRAME_MATERIALS.map((m) => {
                const a = frame.frameMaterial === m.v;
                return (
                  <button key={m.v} type="button" onClick={() => onChangeFrame({ frameMaterial: m.v })}
                    className={['px-3 py-2 rounded-xl border-2 text-xs font-extrabold transition',
                      a ? 'border-violet-500 bg-violet-500 text-white' : 'border-slate-200 bg-white text-slate-700 hover:border-violet-300'].join(' ')}>
                    {m.l}
                  </button>
                );
              })}
            </div>
          </section>

          <section className="rounded-2xl border-2 border-slate-200 bg-white p-5 space-y-4">
            <SectionHead icon={Ruler} title="Frame Measurements (mm)" tone="blue" />
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <Input label="Frame Size" type="number" value={frame.frameSizeMm} placeholder="52"
                onChange={(e) => onChangeFrame({ frameSizeMm: e.target.value === '' ? '' : Number(e.target.value) })} />
              <Input label="Bridge Size" type="number" value={frame.bridgeSizeMm} placeholder="18"
                onChange={(e) => onChangeFrame({ bridgeSizeMm: e.target.value === '' ? '' : Number(e.target.value) })} />
              <Input label="Temple Length" type="number" value={frame.templeLengthMm} placeholder="140"
                onChange={(e) => onChangeFrame({ templeLengthMm: e.target.value === '' ? '' : Number(e.target.value) })} />
              <Input label="Lens Width" type="number" value={frame.lensWidthMm} placeholder="52"
                onChange={(e) => onChangeFrame({ lensWidthMm: e.target.value === '' ? '' : Number(e.target.value) })} />
              <Input label="Lens Height" type="number" value={frame.lensHeightMm} placeholder="38"
                onChange={(e) => onChangeFrame({ lensHeightMm: e.target.value === '' ? '' : Number(e.target.value) })} />
              <Input label="Frame Weight (g)" type="number" value={frame.frameWeightG} placeholder="24"
                onChange={(e) => onChangeFrame({ frameWeightG: e.target.value === '' ? '' : Number(e.target.value) })} />
            </div>
            {frame.frameSizeMm && frame.bridgeSizeMm && frame.templeLengthMm && (
              <div className="rounded-xl bg-blue-50 border-2 border-blue-200 p-3 text-sm font-extrabold text-blue-900">
                📐 Standard notation: {frame.frameSizeMm}▫{frame.bridgeSizeMm} - {frame.templeLengthMm}
              </div>
            )}
          </section>

          <section className="rounded-2xl border-2 border-slate-200 bg-white p-5 space-y-4">
            <SectionHead icon={Palette} title="Color" tone="pink" />
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <Lbl>Primary Color Name</Lbl>
                <input value={frame.colorName} onChange={(e) => onChangeFrame({ colorName: e.target.value })}
                  placeholder="Tortoise Brown"
                  className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-pink-500" />
              </div>
              <div>
                <Lbl>Color Preview</Lbl>
                <div className="flex gap-2 items-center">
                  <input type="color" value={frame.colorHex || '#000000'}
                    onChange={(e) => onChangeFrame({ colorHex: e.target.value })}
                    className="h-11 w-16 rounded-xl border-2 border-slate-200 cursor-pointer" />
                  <input value={frame.colorHex} onChange={(e) => onChangeFrame({ colorHex: e.target.value })}
                    placeholder="#000000"
                    className="h-11 flex-1 rounded-xl border-2 border-slate-200 px-3 text-sm font-mono focus:outline-none focus:border-pink-500" />
                </div>
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider font-extrabold text-slate-600 mb-2">Quick presets</div>
              <div className="flex flex-wrap gap-1.5">
                {COLOR_PRESETS.map((c) => (
                  <button key={c.hex} type="button" onClick={() => onChangeFrame({ colorName: c.name, colorHex: c.hex })}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border-2 border-slate-200 hover:border-pink-400 text-xs font-extrabold">
                    <span className="h-4 w-4 rounded-full border-2 border-white shadow" style={{ backgroundColor: c.hex }} />
                    {c.name}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Lbl>Additional Color Options <span className="text-slate-400 normal-case font-bold">(available colors)</span></Lbl>
              <div className="flex gap-2">
                <input value={newColor} onChange={(e) => setNewColor(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addColor(newColor)}
                  placeholder="e.g. Havana, Matte Black"
                  className="h-11 flex-1 rounded-xl border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-pink-500" />
                <button type="button" onClick={() => addColor(newColor)} disabled={!newColor.trim()}
                  className="h-11 px-4 rounded-xl bg-pink-600 hover:bg-pink-700 text-white font-extrabold text-sm inline-flex items-center gap-1 disabled:opacity-50">
                  <Plus className="h-4 w-4" /> Add
                </button>
              </div>
              {(frame.frameColorOptions ?? []).length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {frame.frameColorOptions.map((c) => (
                    <div key={c} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-pink-100 border-2 border-pink-300 text-xs font-extrabold text-pink-800">
                      {c}
                      <button type="button" onClick={() => onChangeFrame({ frameColorOptions: frame.frameColorOptions.filter((x) => x !== c) })}
                        className="hover:text-rose-700">
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </>
      )}

      {/* LENS */}
      {showLens && (
        <>
          <section className="rounded-2xl border-2 border-slate-200 bg-white p-5 space-y-4">
            <SectionHead icon={Eye} title="Lens Specifications" tone="blue" />
            <div className="grid sm:grid-cols-3 gap-3">
              <div>
                <Lbl>Lens Type</Lbl>
                <input list="lensTypes" value={lens.lensType}
                  onChange={(e) => onChangeLens({ lensType: e.target.value })}
                  placeholder="Single Vision"
                  className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-blue-500" />
                <datalist id="lensTypes">{LENS_TYPES.map((t) => <option key={t} value={t} />)}</datalist>
              </div>
              <div>
                <Lbl>Material</Lbl>
                <input list="lensMaterials" value={lens.lensMaterial}
                  onChange={(e) => onChangeLens({ lensMaterial: e.target.value })}
                  placeholder="CR-39, Polycarbonate..."
                  className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-blue-500" />
                <datalist id="lensMaterials">{LENS_MATERIALS.map((m) => <option key={m} value={m} />)}</datalist>
              </div>
              <div>
                <Lbl>Refractive Index</Lbl>
                <input list="lensIndexes" value={lens.lensIndex}
                  onChange={(e) => onChangeLens({ lensIndex: e.target.value })}
                  placeholder="1.56"
                  className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-blue-500" />
                <datalist id="lensIndexes">{LENS_INDEXES.map((i) => <option key={i} value={i} />)}</datalist>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border-2 border-slate-200 bg-white p-5 space-y-4">
            <SectionHead icon={Shield} title="Lens Coatings" tone="emerald" />
            <div className="flex flex-wrap gap-1.5">
              {LENS_COATINGS.map((c) => {
                const a = lens.lensCoatings?.includes(c);
                return (
                  <button key={c} type="button" onClick={() => togCoating(c)}
                    className={['px-3 py-1.5 rounded-full border-2 text-xs font-extrabold transition',
                      a ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-200 bg-white text-slate-700 hover:border-emerald-300'].join(' ')}>
                    {a ? '✓ ' : '+ '}{c}
                  </button>
                );
              })}
            </div>
          </section>

          <section className="rounded-2xl border-2 border-slate-200 bg-white p-5 space-y-4">
            <SectionHead icon={Sun} title="Special Features" tone="amber" />
            <div className="grid sm:grid-cols-2 gap-2">
              <Check2 checked={lens.hasBlueCut} onChange={(v: boolean) => onChangeLens({ hasBlueCut: v })}
                icon={Shield} label="Blue Light Cut" desc="Protects from screen light" />
              <Check2 checked={lens.hasAntiGlare} onChange={(v: boolean) => onChangeLens({ hasAntiGlare: v })}
                icon={Sparkles} label="Anti-Glare" desc="Reduces reflection" />
              <Check2 checked={lens.hasUvProtection} onChange={(v: boolean) => onChangeLens({ hasUvProtection: v })}
                icon={Sun} label="UV Protection" desc="Blocks harmful UV rays" />
              <Check2 checked={lens.isPolarized} onChange={(v: boolean) => onChangeLens({ isPolarized: v })}
                icon={Eye} label="Polarized" desc="Cuts glare from water/roads" />
              <Check2 checked={lens.isPhotochromic} onChange={(v: boolean) => onChangeLens({ isPhotochromic: v })}
                icon={Sun} label="Photochromic" desc="Auto-darkens in sunlight" />
              <Check2 checked={lens.supportsProgressive} onChange={(v: boolean) => onChangeLens({ supportsProgressive: v })}
                icon={Layers} label="Progressive Support" desc="Multiple focus zones" />
            </div>
          </section>
        </>
      )}

      {/* CONTACT LENS */}
      {showContactLens && (
        <>
          <section className="rounded-2xl border-2 border-slate-200 bg-white p-5 space-y-4">
            <SectionHead icon={Circle} title="Contact Lens Specifications" tone="cyan" />
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <Lbl>Duration / Replacement</Lbl>
                <select value={contactLens.clDuration} onChange={(e) => onChangeContactLens({ clDuration: e.target.value })}
                  className="h-11 w-full rounded-xl border-2 border-slate-200 bg-white px-3 text-sm font-bold focus:outline-none focus:border-cyan-500">
                  <option value="">Select duration</option>
                  {CL_DURATIONS.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <Lbl>Water Content</Lbl>
                <input list="clWater" value={contactLens.clWaterContent}
                  onChange={(e) => onChangeContactLens({ clWaterContent: e.target.value })}
                  placeholder="58%"
                  className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-cyan-500" />
                <datalist id="clWater">{CL_WATER_CONTENT.map((w) => <option key={w} value={w} />)}</datalist>
              </div>
              <div>
                <Lbl>Base Curve (BC)</Lbl>
                <input list="clBC" value={contactLens.clBaseCurve}
                  onChange={(e) => onChangeContactLens({ clBaseCurve: e.target.value })}
                  placeholder="8.6"
                  className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-cyan-500" />
                <datalist id="clBC">{CL_BASE_CURVES.map((b) => <option key={b} value={b} />)}</datalist>
              </div>
              <div>
                <Lbl>Diameter (DIA)</Lbl>
                <input list="clDIA" value={contactLens.clDiameter}
                  onChange={(e) => onChangeContactLens({ clDiameter: e.target.value })}
                  placeholder="14.2"
                  className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-cyan-500" />
                <datalist id="clDIA">{CL_DIAMETERS.map((d) => <option key={d} value={d} />)}</datalist>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border-2 border-slate-200 bg-white p-5 space-y-4">
            <SectionHead icon={Shield} title="Contact Lens Features" tone="emerald" />
            <div className="grid sm:grid-cols-2 gap-2">
              <Check2 checked={contactLens.clUvProtection} onChange={(v: boolean) => onChangeContactLens({ clUvProtection: v })}
                icon={Sun} label="UV Protection" desc="Blocks UV rays" />
              <Check2 checked={contactLens.clForAstigmatism} onChange={(v: boolean) => onChangeContactLens({ clForAstigmatism: v })}
                icon={Eye} label="Toric (Astigmatism)" desc="Corrects astigmatism" />
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function SectionHead({ icon: Icon, title, tone }: any) {
  const tones: Record<string, string> = {
    cyan: 'from-cyan-500 to-sky-700',
    blue: 'from-blue-500 to-cyan-700',
    violet: 'from-violet-500 to-purple-700',
    pink: 'from-pink-500 to-rose-700',
    emerald: 'from-emerald-500 to-teal-700',
    amber: 'from-amber-500 to-orange-700',
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
function Check2({ checked, onChange, icon: Icon, label, desc }: any) {
  return (
    <label className={['flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition',
      checked ? 'border-cyan-400 bg-cyan-50' : 'border-slate-200 bg-white hover:border-cyan-300'].join(' ')}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-5 w-5 rounded" />
      <Icon className={['h-5 w-5', checked ? 'text-cyan-600' : 'text-slate-400'].join(' ')} />
      <div className="min-w-0">
        <div className="font-extrabold text-sm text-slate-900">{label}</div>
        <div className="text-[11px] text-slate-500 font-semibold">{desc}</div>
      </div>
    </label>
  );
}
