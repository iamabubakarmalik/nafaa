import { useState } from 'react';
import {
  Droplet, Users, Sun, Heart, Package, Plus, X, Info,
  BookOpen, AlertTriangle, Sparkles,
} from 'lucide-react';
import { Input } from '@core/ui/Input';
import type { CosmeticsWizardIngredients } from '../../hooks/useCosmeticsWizard';

interface Props {
  ingredients: CosmeticsWizardIngredients;
  onChange: (patch: Partial<CosmeticsWizardIngredients>) => void;
  categoryType: string;
  errors: string[];
}

const SKIN_TYPES = [
  { v: 'DRY', l: 'Dry', e: '🌵' },
  { v: 'OILY', l: 'Oily', e: '💧' },
  { v: 'COMBINATION', l: 'Combination', e: '🎭' },
  { v: 'NORMAL', l: 'Normal', e: '✨' },
  { v: 'SENSITIVE', l: 'Sensitive', e: '🌸' },
  { v: 'ACNE_PRONE', l: 'Acne-prone', e: '🎯' },
  { v: 'MATURE', l: 'Mature', e: '👵' },
  { v: 'ALL_TYPES', l: 'All Types', e: '🌍' },
];

const SKIN_TONES = [
  { v: 'FAIR', l: 'Fair', hex: '#f5e6d3' },
  { v: 'LIGHT', l: 'Light', hex: '#e8c9a0' },
  { v: 'MEDIUM', l: 'Medium', hex: '#d4a373' },
  { v: 'TAN', l: 'Tan', hex: '#b07b4a' },
  { v: 'DEEP', l: 'Deep', hex: '#8b5a3c' },
  { v: 'DARK', l: 'Dark', hex: '#5c3a2e' },
  { v: 'UNIVERSAL', l: 'Universal', hex: '#e0e0e0' },
];

const SKIN_CONCERNS = [
  'Acne', 'Blackheads', 'Whiteheads', 'Dark Spots', 'Hyperpigmentation',
  'Fine Lines', 'Wrinkles', 'Sagging', 'Dullness', 'Uneven Tone',
  'Redness', 'Rosacea', 'Enlarged Pores', 'Dryness', 'Dehydration',
  'Oiliness', 'Sensitivity', 'Dark Circles', 'Puffiness', 'Sun Damage',
  'Melasma', 'Anti-aging', 'Firming', 'Brightening', 'Even Skin Tone',
];

const KEY_INGREDIENTS = [
  'Hyaluronic Acid', 'Niacinamide', 'Retinol', 'Vitamin C', 'Vitamin E',
  'Salicylic Acid', 'Glycolic Acid', 'Lactic Acid', 'Peptides', 'Ceramides',
  'Squalane', 'Argan Oil', 'Jojoba Oil', 'Rosehip Oil', 'Aloe Vera',
  'Green Tea', 'Centella Asiatica', 'Snail Mucin', 'AHA', 'BHA', 'PHA',
  'Zinc Oxide', 'Titanium Dioxide', 'Kojic Acid', 'Alpha Arbutin',
  'Tranexamic Acid', 'Bakuchiol', 'Collagen', 'Keratin', 'Biotin',
];

const BENEFITS = [
  'Hydrating', 'Moisturizing', 'Brightening', 'Anti-aging', 'Firming',
  'Smoothing', 'Plumping', 'Purifying', 'Balancing', 'Soothing',
  'Calming', 'Cooling', 'Nourishing', 'Repairing', 'Protecting',
  'Long-lasting', 'Buildable', 'Blendable', 'Waterproof', 'Sweat-proof',
  'Non-drying', 'Non-sticky', 'Lightweight', 'Fast-absorbing',
];

const SPF_OPTIONS = ['SPF 15', 'SPF 20', 'SPF 30', 'SPF 40', 'SPF 50', 'SPF 50+', 'SPF 60', 'SPF 70', 'SPF 100'];

export function CosmeticsWizardStep2Ingredients({ ingredients, onChange, categoryType }: Props) {
  const [newIngredient, setNewIngredient] = useState('');
  const [newConcern, setNewConcern] = useState('');
  const [newBenefit, setNewBenefit] = useState('');

  const tog = (field: 'skinType' | 'skinTone' | 'skinConcerns' | 'keyIngredients' | 'benefits', val: string) => {
    const cur = (ingredients[field] ?? []) as string[];
    onChange({ [field]: cur.includes(val) ? cur.filter((x) => x !== val) : [...cur, val] } as any);
  };

  const addToList = (field: 'skinConcerns' | 'keyIngredients' | 'benefits', val: string, setter: (v: string) => void) => {
    const t = val.trim();
    if (!t) return;
    const cur = (ingredients[field] ?? []) as string[];
    if (cur.includes(t)) return;
    onChange({ [field]: [...cur, t] } as any);
    setter('');
  };

  const isSunscreen = categoryType === 'SUNSCREEN';

  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-pink-50 border-2 border-pink-200 p-4 flex items-start gap-3">
        <Info className="h-5 w-5 text-pink-700 shrink-0 mt-0.5" />
        <div className="text-sm text-pink-900">
          <div className="font-extrabold mb-1">Help customers find the perfect match</div>
          <div className="font-semibold">
            Skin type, tone, concerns, and ingredients power the shade matcher and personalized recommendations.
            All fields are optional — fill what applies.
          </div>
        </div>
      </div>

      {/* SIZE */}
      <section className="rounded-2xl border-2 border-slate-200 bg-white p-5 space-y-4">
        <SectionHead icon={Package} title="Size / Volume" tone="blue" />
        <div className="grid sm:grid-cols-3 gap-3">
          <div>
            <Lbl>Size (ml)</Lbl>
            <input type="number" step="0.1" value={ingredients.sizeMl}
              onChange={(e) => onChange({ sizeMl: e.target.value === '' ? '' : Number(e.target.value) })}
              placeholder="30"
              className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-blue-500" />
          </div>
          <div>
            <Lbl>Size (grams)</Lbl>
            <input type="number" step="0.1" value={ingredients.sizeGrams}
              onChange={(e) => onChange({ sizeGrams: e.target.value === '' ? '' : Number(e.target.value) })}
              placeholder="50"
              className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-blue-500" />
          </div>
          <div>
            <Lbl>Display Size</Lbl>
            <input value={ingredients.sizeDisplay} onChange={(e) => onChange({ sizeDisplay: e.target.value })}
              placeholder="30ml / 1 fl oz"
              className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-blue-500" />
          </div>
        </div>
      </section>

      {/* SKIN TYPE */}
      <section className="rounded-2xl border-2 border-slate-200 bg-white p-5 space-y-3">
        <SectionHead icon={Users} title="Recommended Skin Types" tone="violet" />
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
          {SKIN_TYPES.map((s) => {
            const a = ingredients.skinType?.includes(s.v);
            return (
              <button key={s.v} type="button" onClick={() => tog('skinType', s.v)}
                className={['p-2.5 rounded-xl border-2 transition flex flex-col items-center gap-1',
                  a ? 'border-violet-600 bg-violet-600 text-white shadow-md' : 'border-slate-200 bg-white text-slate-700 hover:border-violet-400'].join(' ')}>
                <span className="text-xl">{s.e}</span>
                <span className="text-[10px] font-extrabold text-center">{s.l}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* SKIN TONE */}
      <section className="rounded-2xl border-2 border-slate-200 bg-white p-5 space-y-3">
        <SectionHead icon={Droplet} title="Skin Tone Match" tone="pink" />
        <p className="text-xs text-slate-500 font-semibold">Which skin tones does this product suit?</p>
        <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
          {SKIN_TONES.map((s) => {
            const a = ingredients.skinTone?.includes(s.v);
            return (
              <button key={s.v} type="button" onClick={() => tog('skinTone', s.v)}
                className={['p-2.5 rounded-xl border-2 transition flex flex-col items-center gap-1.5',
                  a ? 'border-pink-600 shadow-md ring-2 ring-pink-200' : 'border-slate-200 hover:border-pink-300'].join(' ')}>
                <span className="h-8 w-8 rounded-full border-2 border-white shadow" style={{ backgroundColor: s.hex }} />
                <span className={['text-[10px] font-extrabold', a ? 'text-pink-800' : 'text-slate-700'].join(' ')}>{s.l}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* SKIN CONCERNS */}
      <section className="rounded-2xl border-2 border-slate-200 bg-white p-5 space-y-3">
        <SectionHead icon={Heart} title="Targets These Concerns" tone="rose" />
        <div>
          <Lbl>Quick add — common concerns</Lbl>
          <div className="flex flex-wrap gap-1.5">
            {SKIN_CONCERNS.map((c) => {
              const a = ingredients.skinConcerns?.includes(c);
              return (
                <button key={c} type="button" onClick={() => tog('skinConcerns', c)}
                  className={['px-3 py-1.5 rounded-full border-2 text-xs font-extrabold transition',
                    a ? 'border-rose-500 bg-rose-500 text-white' : 'border-slate-200 bg-white text-slate-700 hover:border-rose-300'].join(' ')}>
                  {c}
                </button>
              );
            })}
          </div>
        </div>
        <div className="flex gap-2">
          <input value={newConcern} onChange={(e) => setNewConcern(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addToList('skinConcerns', newConcern, setNewConcern)}
            placeholder="Custom concern..."
            className="h-11 flex-1 rounded-xl border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-rose-500" />
          <button type="button" onClick={() => addToList('skinConcerns', newConcern, setNewConcern)} disabled={!newConcern.trim()}
            className="h-11 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-sm inline-flex items-center gap-1 disabled:opacity-50">
            <Plus className="h-4 w-4" /> Add
          </button>
        </div>
      </section>

      {/* KEY INGREDIENTS */}
      <section className="rounded-2xl border-2 border-slate-200 bg-white p-5 space-y-3">
        <SectionHead icon={BookOpen} title="Key Ingredients" tone="emerald" />
        <div>
          <Lbl>Quick add — popular actives</Lbl>
          <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto pr-1">
            {KEY_INGREDIENTS.map((i) => {
              const a = ingredients.keyIngredients?.includes(i);
              return (
                <button key={i} type="button" onClick={() => tog('keyIngredients', i)}
                  className={['px-3 py-1.5 rounded-full border-2 text-xs font-extrabold transition',
                    a ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-200 bg-white text-slate-700 hover:border-emerald-300'].join(' ')}>
                  {i}
                </button>
              );
            })}
          </div>
        </div>
        <div className="flex gap-2">
          <input value={newIngredient} onChange={(e) => setNewIngredient(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addToList('keyIngredients', newIngredient, setNewIngredient)}
            placeholder="Custom ingredient..."
            className="h-11 flex-1 rounded-xl border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-emerald-500" />
          <button type="button" onClick={() => addToList('keyIngredients', newIngredient, setNewIngredient)} disabled={!newIngredient.trim()}
            className="h-11 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm inline-flex items-center gap-1 disabled:opacity-50">
            <Plus className="h-4 w-4" /> Add
          </button>
        </div>
      </section>

      {/* FULL INGREDIENTS (INCI) */}
      <section className="rounded-2xl border-2 border-slate-200 bg-white p-5 space-y-3">
        <SectionHead icon={BookOpen} title="Full Ingredient List (INCI)" tone="slate" />
        <textarea rows={4} value={ingredients.fullIngredients}
          onChange={(e) => onChange({ fullIngredients: e.target.value })}
          placeholder="Aqua, Glycerin, Cyclopentasiloxane, Dimethicone, Niacinamide..."
          className="w-full rounded-xl border-2 border-slate-200 px-3 py-2 text-xs font-mono focus:outline-none focus:border-slate-500" />
        <p className="text-[10px] text-slate-500 font-bold">
          💡 List ingredients in order of concentration (highest first) per INCI standard.
        </p>
      </section>

      {/* SPF */}
      {(isSunscreen || categoryType === 'FOUNDATION' || categoryType === 'MOISTURIZER' || categoryType === 'DAY_CREAM' || categoryType === 'BB_CREAM') && (
        <section className="rounded-2xl border-2 border-amber-300 bg-gradient-to-br from-amber-50 to-white p-5 space-y-3">
          <SectionHead icon={Sun} title="SPF Rating" tone="amber" />
          <div>
            <Lbl>SPF Level</Lbl>
            <div className="flex flex-wrap gap-1.5">
              {SPF_OPTIONS.map((s) => (
                <button key={s} type="button" onClick={() => onChange({ spfRating: ingredients.spfRating === s ? '' : s })}
                  className={['px-3 py-2 rounded-xl border-2 text-xs font-extrabold transition',
                    ingredients.spfRating === s ? 'border-amber-600 bg-amber-600 text-white shadow-md' : 'border-slate-200 bg-white text-slate-700 hover:border-amber-400'].join(' ')}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* BENEFITS */}
      <section className="rounded-2xl border-2 border-slate-200 bg-white p-5 space-y-3">
        <SectionHead icon={Sparkles} title="Key Benefits" tone="pink" />
        <div>
          <Lbl>Quick add</Lbl>
          <div className="flex flex-wrap gap-1.5">
            {BENEFITS.map((b) => {
              const a = ingredients.benefits?.includes(b);
              return (
                <button key={b} type="button" onClick={() => tog('benefits', b)}
                  className={['px-3 py-1.5 rounded-full border-2 text-xs font-extrabold transition',
                    a ? 'border-pink-500 bg-pink-500 text-white' : 'border-slate-200 bg-white text-slate-700 hover:border-pink-300'].join(' ')}>
                  {b}
                </button>
              );
            })}
          </div>
        </div>
        <div className="flex gap-2">
          <input value={newBenefit} onChange={(e) => setNewBenefit(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addToList('benefits', newBenefit, setNewBenefit)}
            placeholder="Custom benefit..."
            className="h-11 flex-1 rounded-xl border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-pink-500" />
          <button type="button" onClick={() => addToList('benefits', newBenefit, setNewBenefit)} disabled={!newBenefit.trim()}
            className="h-11 px-4 rounded-xl bg-pink-600 hover:bg-pink-700 text-white font-extrabold text-sm inline-flex items-center gap-1 disabled:opacity-50">
            <Plus className="h-4 w-4" /> Add
          </button>
        </div>
      </section>

      {/* HOW TO USE */}
      <section className="rounded-2xl border-2 border-slate-200 bg-white p-5 space-y-3">
        <SectionHead icon={Info} title="How to Use" tone="sky" />
        <textarea rows={3} value={ingredients.howToUse}
          onChange={(e) => onChange({ howToUse: e.target.value })}
          placeholder="Apply a pea-sized amount to clean skin twice daily. Follow with moisturizer and SPF."
          className="w-full rounded-xl border-2 border-slate-200 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-sky-500" />
      </section>

      {/* WARNINGS */}
      <section className="rounded-2xl border-2 border-amber-200 bg-amber-50/40 p-5 space-y-3">
        <SectionHead icon={AlertTriangle} title="Warnings / Precautions" tone="amber" />
        <textarea rows={2} value={ingredients.warnings}
          onChange={(e) => onChange({ warnings: e.target.value })}
          placeholder="Patch test 24hrs before use. Avoid contact with eyes. Discontinue if irritation occurs."
          className="w-full rounded-xl border-2 border-amber-200 bg-white px-3 py-2 text-sm font-semibold focus:outline-none focus:border-amber-500" />
      </section>
    </div>
  );
}

function SectionHead({ icon: Icon, title, tone }: any) {
  const tones: Record<string, string> = {
    pink: 'from-pink-500 to-rose-700',
    violet: 'from-violet-500 to-purple-700',
    emerald: 'from-emerald-500 to-teal-700',
    blue: 'from-blue-500 to-cyan-700',
    rose: 'from-rose-500 to-red-700',
    amber: 'from-amber-500 to-orange-600',
    sky: 'from-sky-500 to-blue-700',
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
