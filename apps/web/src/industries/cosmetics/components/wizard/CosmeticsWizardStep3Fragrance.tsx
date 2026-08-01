import { useState } from 'react';
import {
  Wind, Sparkles, Sun, Snowflake, Cloud, Leaf, Info, Plus, X,
  Clock, Radio,
} from 'lucide-react';
import { isFragranceCategory } from '../../hooks/useCosmeticsWizard';
import type { CosmeticsWizardFragrance } from '../../hooks/useCosmeticsWizard';

interface Props {
  fragrance: CosmeticsWizardFragrance;
  onChange: (patch: Partial<CosmeticsWizardFragrance>) => void;
  categoryType: string;
  errors: string[];
}

const FRAGRANCE_FAMILIES = [
  { v: 'Floral', l: 'Floral', e: '🌸' },
  { v: 'Fruity', l: 'Fruity', e: '🍑' },
  { v: 'Citrus', l: 'Citrus', e: '🍋' },
  { v: 'Woody', l: 'Woody', e: '🌳' },
  { v: 'Oriental', l: 'Oriental', e: '🕌' },
  { v: 'Fresh', l: 'Fresh', e: '💧' },
  { v: 'Musky', l: 'Musky', e: '🦌' },
  { v: 'Gourmand', l: 'Gourmand', e: '🍰' },
  { v: 'Aromatic', l: 'Aromatic', e: '🌿' },
  { v: 'Chypre', l: 'Chypre', e: '🍃' },
  { v: 'Fougère', l: 'Fougère', e: '🌾' },
  { v: 'Aquatic', l: 'Aquatic', e: '🌊' },
];

const TOP_NOTES = [
  'Bergamot', 'Lemon', 'Orange', 'Grapefruit', 'Mandarin', 'Lime',
  'Green Apple', 'Pear', 'Peach', 'Blackcurrant', 'Raspberry',
  'Mint', 'Basil', 'Ginger', 'Pink Pepper', 'Cardamom', 'Aldehydes',
];

const MIDDLE_NOTES = [
  'Rose', 'Jasmine', 'Ylang-Ylang', 'Tuberose', 'Lily of the Valley',
  'Iris', 'Violet', 'Geranium', 'Lavender', 'Neroli', 'Orange Blossom',
  'Peony', 'Freesia', 'Magnolia', 'Cinnamon', 'Clove', 'Nutmeg',
];

const BASE_NOTES = [
  'Sandalwood', 'Cedarwood', 'Vetiver', 'Patchouli', 'Oud', 'Amber',
  'Vanilla', 'Musk', 'Tonka Bean', 'Benzoin', 'Frankincense', 'Myrrh',
  'Leather', 'Tobacco', 'Coffee', 'Chocolate', 'Caramel', 'Honey',
  'White Musk', 'Cashmeran', 'Iso E Super',
];

const SEASONS = [
  { v: 'Spring', l: 'Spring', e: '🌸' },
  { v: 'Summer', l: 'Summer', e: '☀️' },
  { v: 'Autumn', l: 'Autumn', e: '🍂' },
  { v: 'Winter', l: 'Winter', e: '❄️' },
];

const OCCASIONS = [
  { v: 'Daily', l: 'Daily Wear', e: '☕' },
  { v: 'Office', l: 'Office', e: '💼' },
  { v: 'Evening', l: 'Evening', e: '🌙' },
  { v: 'Party', l: 'Party', e: '🎉' },
  { v: 'Wedding', l: 'Wedding', e: '💍' },
  { v: 'Date', l: 'Date Night', e: '💕' },
  { v: 'Formal', l: 'Formal', e: '🎩' },
  { v: 'Casual', l: 'Casual', e: '👕' },
  { v: 'Sport', l: 'Sport/Gym', e: '🏋️' },
  { v: 'Special', l: 'Special Occasions', e: '✨' },
];

const LONGEVITY_OPTIONS = ['2-4 hours', '4-6 hours', '6-8 hours', '8-12 hours', '12-24 hours', 'All day'];
const SILLAGE_OPTIONS = ['Intimate', 'Moderate', 'Strong', 'Enormous'];

export function CosmeticsWizardStep3Fragrance({ fragrance, onChange, categoryType }: Props) {
  const [newTop, setNewTop] = useState('');
  const [newMiddle, setNewMiddle] = useState('');
  const [newBase, setNewBase] = useState('');

  const isFragrance = isFragranceCategory(categoryType);

  const tog = (field: 'topNotes' | 'middleNotes' | 'baseNotes' | 'season' | 'occasion', val: string) => {
    const cur = (fragrance[field] ?? []) as string[];
    onChange({ [field]: cur.includes(val) ? cur.filter((x) => x !== val) : [...cur, val] } as any);
  };

  const addNote = (field: 'topNotes' | 'middleNotes' | 'baseNotes', val: string, setter: (v: string) => void) => {
    const t = val.trim();
    if (!t) return;
    const cur = (fragrance[field] ?? []) as string[];
    if (cur.includes(t)) return;
    onChange({ [field]: [...cur, t] } as any);
    setter('');
  };

  return (
    <div className="space-y-5">
      <div className={['rounded-2xl border-2 p-4 flex items-start gap-3',
        isFragrance ? 'bg-violet-50 border-violet-200' : 'bg-slate-50 border-slate-200'].join(' ')}>
        <Info className={['h-5 w-5 shrink-0 mt-0.5', isFragrance ? 'text-violet-700' : 'text-slate-600'].join(' ')} />
        <div className={['text-sm', isFragrance ? 'text-violet-900' : 'text-slate-700'].join(' ')}>
          <div className="font-extrabold mb-1">
            {isFragrance ? '🌹 Fragrance Details' : 'Fragrance step — optional for non-fragrance products'}
          </div>
          <div className="font-semibold">
            {isFragrance
              ? 'These fields power the fragrance recommender and help customers find their signature scent.'
              : 'Only fill this if the product has a scent worth noting (e.g. scented lotion, perfumed hair oil). Skip otherwise.'}
          </div>
        </div>
      </div>

      {/* FAMILY */}
      <section className="rounded-2xl border-2 border-slate-200 bg-white p-5 space-y-3">
        <SectionHead icon={Wind} title="Fragrance Family" tone="violet" />
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {FRAGRANCE_FAMILIES.map((f) => {
            const a = fragrance.fragranceFamily === f.v;
            return (
              <button key={f.v} type="button"
                onClick={() => onChange({ fragranceFamily: fragrance.fragranceFamily === f.v ? '' : f.v })}
                className={['p-2.5 rounded-xl border-2 transition flex flex-col items-center gap-1',
                  a ? 'border-violet-600 bg-violet-600 text-white shadow-md scale-[1.02]'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-violet-400'].join(' ')}>
                <span className="text-2xl">{f.e}</span>
                <span className="text-[10px] font-extrabold text-center">{f.l}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* NOTES PYRAMID */}
      <section className="rounded-2xl border-2 border-slate-200 bg-white p-5 space-y-5">
        <SectionHead icon={Sparkles} title="Fragrance Notes Pyramid" tone="pink" />

        {/* Top Notes */}
        <div className="rounded-2xl bg-gradient-to-br from-yellow-50 to-amber-50 border-2 border-yellow-200 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Sun className="h-5 w-5 text-amber-700" />
            <div>
              <h4 className="font-extrabold text-amber-900">Top Notes</h4>
              <p className="text-[10px] font-bold text-amber-700">First impression — first 15 minutes</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {TOP_NOTES.map((n) => {
              const a = fragrance.topNotes?.includes(n);
              return (
                <button key={n} type="button" onClick={() => tog('topNotes', n)}
                  className={['px-2.5 py-1 rounded-full border-2 text-[11px] font-extrabold transition',
                    a ? 'border-amber-500 bg-amber-500 text-white' : 'border-slate-200 bg-white text-slate-700 hover:border-amber-400'].join(' ')}>
                  {n}
                </button>
              );
            })}
          </div>
          <div className="flex gap-2">
            <input value={newTop} onChange={(e) => setNewTop(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addNote('topNotes', newTop, setNewTop)}
              placeholder="Custom top note..."
              className="h-10 flex-1 rounded-lg border-2 border-amber-200 bg-white px-3 text-xs font-bold focus:outline-none focus:border-amber-500" />
            <button type="button" onClick={() => addNote('topNotes', newTop, setNewTop)} disabled={!newTop.trim()}
              className="h-10 px-3 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs disabled:opacity-50">
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Middle Notes */}
        <div className="rounded-2xl bg-gradient-to-br from-pink-50 to-rose-50 border-2 border-pink-200 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-pink-700" />
            <div>
              <h4 className="font-extrabold text-pink-900">Middle / Heart Notes</h4>
              <p className="text-[10px] font-bold text-pink-700">Character — 1 to 4 hours</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {MIDDLE_NOTES.map((n) => {
              const a = fragrance.middleNotes?.includes(n);
              return (
                <button key={n} type="button" onClick={() => tog('middleNotes', n)}
                  className={['px-2.5 py-1 rounded-full border-2 text-[11px] font-extrabold transition',
                    a ? 'border-pink-500 bg-pink-500 text-white' : 'border-slate-200 bg-white text-slate-700 hover:border-pink-400'].join(' ')}>
                  {n}
                </button>
              );
            })}
          </div>
          <div className="flex gap-2">
            <input value={newMiddle} onChange={(e) => setNewMiddle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addNote('middleNotes', newMiddle, setNewMiddle)}
              placeholder="Custom middle note..."
              className="h-10 flex-1 rounded-lg border-2 border-pink-200 bg-white px-3 text-xs font-bold focus:outline-none focus:border-pink-500" />
            <button type="button" onClick={() => addNote('middleNotes', newMiddle, setNewMiddle)} disabled={!newMiddle.trim()}
              className="h-10 px-3 rounded-lg bg-pink-600 hover:bg-pink-700 text-white font-extrabold text-xs disabled:opacity-50">
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Base Notes */}
        <div className="rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-orange-200 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Leaf className="h-5 w-5 text-orange-700" />
            <div>
              <h4 className="font-extrabold text-orange-900">Base Notes</h4>
              <p className="text-[10px] font-bold text-orange-700">Foundation — 4+ hours, dry-down</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {BASE_NOTES.map((n) => {
              const a = fragrance.baseNotes?.includes(n);
              return (
                <button key={n} type="button" onClick={() => tog('baseNotes', n)}
                  className={['px-2.5 py-1 rounded-full border-2 text-[11px] font-extrabold transition',
                    a ? 'border-orange-500 bg-orange-500 text-white' : 'border-slate-200 bg-white text-slate-700 hover:border-orange-400'].join(' ')}>
                  {n}
                </button>
              );
            })}
          </div>
          <div className="flex gap-2">
            <input value={newBase} onChange={(e) => setNewBase(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addNote('baseNotes', newBase, setNewBase)}
              placeholder="Custom base note..."
              className="h-10 flex-1 rounded-lg border-2 border-orange-200 bg-white px-3 text-xs font-bold focus:outline-none focus:border-orange-500" />
            <button type="button" onClick={() => addNote('baseNotes', newBase, setNewBase)} disabled={!newBase.trim()}
              className="h-10 px-3 rounded-lg bg-orange-600 hover:bg-orange-700 text-white font-extrabold text-xs disabled:opacity-50">
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </section>

      {/* PERFORMANCE */}
      <section className="rounded-2xl border-2 border-slate-200 bg-white p-5 space-y-4">
        <SectionHead icon={Clock} title="Performance" tone="blue" />
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <Lbl><Clock className="h-3 w-3 inline mr-1" /> Longevity</Lbl>
            <select value={fragrance.longevityHours}
              onChange={(e) => onChange({ longevityHours: e.target.value })}
              className="h-11 w-full rounded-xl border-2 border-slate-200 bg-white px-3 text-sm font-bold focus:outline-none focus:border-blue-500">
              <option value="">Not specified</option>
              {LONGEVITY_OPTIONS.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
          <div>
            <Lbl><Radio className="h-3 w-3 inline mr-1" /> Sillage / Projection</Lbl>
            <select value={fragrance.sillage}
              onChange={(e) => onChange({ sillage: e.target.value })}
              className="h-11 w-full rounded-xl border-2 border-slate-200 bg-white px-3 text-sm font-bold focus:outline-none focus:border-blue-500">
              <option value="">Not specified</option>
              {SILLAGE_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
      </section>

      {/* SEASON */}
      <section className="rounded-2xl border-2 border-slate-200 bg-white p-5 space-y-3">
        <SectionHead icon={Cloud} title="Best Seasons" tone="sky" />
        <div className="grid grid-cols-4 gap-2">
          {SEASONS.map((s) => {
            const a = fragrance.season?.includes(s.v);
            return (
              <button key={s.v} type="button" onClick={() => tog('season', s.v)}
                className={['p-3 rounded-xl border-2 transition flex flex-col items-center gap-1.5',
                  a ? 'border-sky-500 bg-sky-500 text-white shadow-md' : 'border-slate-200 bg-white text-slate-700 hover:border-sky-400'].join(' ')}>
                <span className="text-2xl">{s.e}</span>
                <span className="text-xs font-extrabold">{s.l}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* OCCASION */}
      <section className="rounded-2xl border-2 border-slate-200 bg-white p-5 space-y-3">
        <SectionHead icon={Sparkles} title="Best Occasions" tone="pink" />
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
          {OCCASIONS.map((o) => {
            const a = fragrance.occasion?.includes(o.v);
            return (
              <button key={o.v} type="button" onClick={() => tog('occasion', o.v)}
                className={['p-2.5 rounded-xl border-2 transition flex flex-col items-center gap-1',
                  a ? 'border-pink-500 bg-pink-500 text-white shadow-md' : 'border-slate-200 bg-white text-slate-700 hover:border-pink-400'].join(' ')}>
                <span className="text-xl">{o.e}</span>
                <span className="text-[10px] font-extrabold text-center">{o.l}</span>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function SectionHead({ icon: Icon, title, tone }: any) {
  const tones: Record<string, string> = {
    violet: 'from-violet-500 to-purple-700',
    pink: 'from-pink-500 to-rose-700',
    blue: 'from-blue-500 to-cyan-700',
    sky: 'from-sky-500 to-blue-700',
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
