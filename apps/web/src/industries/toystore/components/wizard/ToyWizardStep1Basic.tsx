import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Baby, DollarSign, Image as ImageIcon, Sparkles, Star, TrendingUp,
  AlertCircle, Percent, Camera, Wand2, ChevronDown, ChevronUp, Zap,
  Tag, Users, Gift, Award, Cake, Palette, Heart,
} from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '@core/ui/Input';
import { UploadDropzone } from '@core/components/uploads';
import BarcodeScanner from '@core/components/barcode/BarcodeScanner';
import { categoriesApi } from '@modules/inventory/categories/api/categories.api';
import { tagsApi } from '@modules/inventory/tags/api/tags.api';
import { formatPKRFull } from '@core/lib/format';
import type { ToyWizardBasic } from '../../hooks/useToyWizard';

interface Props {
  basic: ToyWizardBasic;
  onChange: (patch: Partial<ToyWizardBasic>) => void;
  errors: string[];
}

const CATEGORY_GROUPS: Array<{ group: string; items: Array<{ v: string; l: string; e: string }> }> = [
  {
    group: 'Building & Puzzles',
    items: [
      { v: 'BUILDING_BLOCKS', l: 'Building Blocks', e: '🧱' },
      { v: 'LEGO', l: 'LEGO', e: '🟨' },
      { v: 'PUZZLE', l: 'Puzzle', e: '🧩' },
      { v: 'ROBOTICS_KIT', l: 'Robotics', e: '🤖' },
      { v: 'CODING_TOY', l: 'Coding', e: '💻' },
    ],
  },
  {
    group: 'Dolls & Figures',
    items: [
      { v: 'DOLL', l: 'Doll', e: '👧' },
      { v: 'ACTION_FIGURE', l: 'Action Figure', e: '🦸' },
      { v: 'PLUSH_TOY', l: 'Plush Toy', e: '🧸' },
      { v: 'STUFFED_ANIMAL', l: 'Stuffed Animal', e: '🐻' },
      { v: 'CHARACTER_TOY', l: 'Character', e: '⚡' },
      { v: 'COLLECTIBLE', l: 'Collectible', e: '💎' },
    ],
  },
  {
    group: 'Educational & STEM',
    items: [
      { v: 'EDUCATIONAL_TOY', l: 'Educational', e: '📚' },
      { v: 'STEM_TOY', l: 'STEM', e: '🔬' },
      { v: 'MONTESSORI', l: 'Montessori', e: '🌱' },
      { v: 'SCIENCE_KIT', l: 'Science Kit', e: '⚗️' },
      { v: 'MICROSCOPE', l: 'Microscope', e: '🔬' },
      { v: 'TELESCOPE', l: 'Telescope', e: '🔭' },
      { v: 'CHEMISTRY_SET', l: 'Chemistry', e: '🧪' },
      { v: 'ART_CRAFT', l: 'Art & Craft', e: '🎨' },
    ],
  },
  {
    group: 'Remote Control & Vehicles',
    items: [
      { v: 'RC_CAR', l: 'RC Car', e: '🚗' },
      { v: 'RC_DRONE', l: 'RC Drone', e: '🚁' },
      { v: 'RC_HELICOPTER', l: 'RC Heli', e: '🚁' },
      { v: 'DIE_CAST_CAR', l: 'Die-cast', e: '🏎️' },
      { v: 'TRAIN_SET', l: 'Train Set', e: '🚂' },
    ],
  },
  {
    group: 'Games',
    items: [
      { v: 'BOARD_GAME', l: 'Board Game', e: '🎲' },
      { v: 'CARD_GAME', l: 'Card Game', e: '🃏' },
      { v: 'TRADING_CARDS', l: 'Trading Cards', e: '🎴' },
      { v: 'MAGIC_TRICKS', l: 'Magic', e: '🎩' },
    ],
  },
  {
    group: 'Pretend Play',
    items: [
      { v: 'DOLL_HOUSE', l: 'Doll House', e: '🏠' },
      { v: 'KITCHEN_SET', l: 'Kitchen Set', e: '🍳' },
      { v: 'PRETEND_PLAY', l: 'Pretend Play', e: '🎭' },
      { v: 'COSTUMES', l: 'Costumes', e: '👘' },
      { v: 'MUSICAL_INSTRUMENT', l: 'Musical', e: '🎹' },
    ],
  },
  {
    group: 'Outdoor & Ride-on',
    items: [
      { v: 'OUTDOOR_TOY', l: 'Outdoor', e: '🌳' },
      { v: 'RIDE_ON', l: 'Ride-on', e: '🛴' },
      { v: 'BIKE_TRIKE', l: 'Bike/Trike', e: '🚲' },
      { v: 'BALL_SPORTS', l: 'Ball Sports', e: '⚽' },
      { v: 'WATER_TOY', l: 'Water Toy', e: '💦' },
      { v: 'BEACH_TOY', l: 'Beach Toy', e: '🏖️' },
      { v: 'SAND_TOY', l: 'Sand Toy', e: '🏝️' },
    ],
  },
  {
    group: 'Baby & Infant',
    items: [
      { v: 'BABY_TOY', l: 'Baby Toy', e: '🍼' },
      { v: 'RATTLE', l: 'Rattle', e: '🔔' },
      { v: 'TEETHER', l: 'Teether', e: '🦷' },
      { v: 'STACKING_TOY', l: 'Stacking', e: '🏗️' },
      { v: 'SOFT_TOY', l: 'Soft Toy', e: '☁️' },
    ],
  },
  {
    group: 'Other',
    items: [
      { v: 'BUBBLE_TOY', l: 'Bubbles', e: '🫧' },
      { v: 'SLIME_PUTTY', l: 'Slime', e: '🟢' },
      { v: 'YO_YO', l: 'Yo-Yo', e: '🪀' },
      { v: 'FIDGET_TOY', l: 'Fidget', e: '🌀' },
      { v: 'PARTY_SUPPLIES', l: 'Party', e: '🎉' },
      { v: 'OTHER', l: 'Other', e: '📦' },
    ],
  },
];

const AGE_GROUPS: Array<{ v: string; l: string; e: string; years: string; safety?: string }> = [
  { v: 'NEWBORN_0_6M', l: '0-6 Months', e: '👶', years: '0-0.5 yr', safety: 'critical' },
  { v: 'INFANT_6_12M', l: '6-12 Months', e: '🍼', years: '0.5-1 yr', safety: 'critical' },
  { v: 'TODDLER_1_2Y', l: '1-2 Years', e: '🧸', years: '1-2 yr', safety: 'critical' },
  { v: 'TODDLER_2_3Y', l: '2-3 Years', e: '🎈', years: '2-3 yr', safety: 'critical' },
  { v: 'PRESCHOOL_3_5Y', l: '3-5 Years', e: '🎨', years: '3-5 yr' },
  { v: 'KIDS_5_8Y', l: '5-8 Years', e: '🎒', years: '5-8 yr' },
  { v: 'KIDS_8_12Y', l: '8-12 Years', e: '⚽', years: '8-12 yr' },
  { v: 'TWEEN_12_14Y', l: '12-14 Years', e: '📱', years: '12-14 yr' },
  { v: 'TEEN_14_PLUS', l: '14+ Years', e: '🎮', years: '14+ yr' },
  { v: 'ALL_AGES', l: 'All Ages', e: '👨‍👩‍👧‍👦', years: 'Any' },
];

const GENDER_OPTIONS = [
  { v: 'UNISEX', l: 'Unisex', e: '⚧️', color: 'violet' },
  { v: 'BOYS', l: 'Boys', e: '👦', color: 'blue' },
  { v: 'GIRLS', l: 'Girls', e: '👧', color: 'pink' },
];

const MARKUPS = [15, 25, 35, 50, 75, 100];

const POPULAR_FRANCHISES = [
  'Disney', 'Marvel', 'Barbie', 'LEGO', 'Hot Wheels', 'Peppa Pig',
  'PAW Patrol', 'Frozen', 'Spider-Man', 'Pokemon', 'Minecraft', 'Star Wars',
];

export function ToyWizardStep1Basic({ basic, onChange, errors }: Props) {
  const [scan, setScan] = useState(false);
  const [adv, setAdv] = useState(Boolean(basic.mrp || basic.taxRate || basic.discountedPrice));

  const { data: cats = [] } = useQuery({ queryKey: ['categories'], queryFn: categoriesApi.list });
  const { data: tags = [] } = useQuery({ queryKey: ['tags'], queryFn: tagsApi.list });

  const cost = Number(basic.costPrice || 0);
  const sale = Number(basic.retailPrice || 0);
  const profit = sale - cost;
  const margin = sale > 0 ? (profit / sale) * 100 : 0;
  const loss = cost > 0 && sale > 0 && profit < 0;

  const autoSku = () => {
    const base = (basic.name || 'TOY').toUpperCase().replace(/[^A-Z0-9 ]/g, '').trim()
      .split(/\s+/).slice(0, 2).map((w) => w.slice(0, 4)).join('-') || 'TOY';
    onChange({ sku: `${base}-${Math.floor(1000 + Math.random() * 9000)}` });
    toast.success('SKU generated');
  };

  const markup = (pct: number) => {
    if (!cost) return toast.error('Enter cost price first');
    onChange({ retailPrice: Math.round(cost * (1 + pct / 100)) });
  };

  const togTag = (id: string) => {
    const c = basic.tagIds ?? [];
    onChange({ tagIds: c.includes(id) ? c.filter((t) => t !== id) : [...c, id] });
  };

  const selectedAge = AGE_GROUPS.find((a) => a.v === basic.ageGroup);
  const isCriticalAge = selectedAge?.safety === 'critical';

  return (
    <div className="space-y-5">
      {scan && (
        <BarcodeScanner
          onDetected={(c: string) => { onChange({ barcode: c.trim() }); setScan(false); toast.success('Barcode captured'); }}
          onClose={() => setScan(false)}
        />
      )}

      {errors.length > 0 && (
        <div className="rounded-2xl bg-rose-50 border-2 border-rose-300 p-4 flex items-start gap-2.5">
          <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="text-sm text-rose-900">
            <div className="font-extrabold mb-1">Fix before continuing:</div>
            <ul className="list-disc pl-4 space-y-0.5 font-semibold">{errors.map((e, i) => <li key={i}>{e}</li>)}</ul>
          </div>
        </div>
      )}

      {/* 1 — NAME */}
      <section className="rounded-2xl border-2 border-pink-300 bg-gradient-to-br from-pink-50 to-white p-5 space-y-4">
        <Head icon={Baby} n="1" t="Toy Name" d="Product title jo customer dekhega" tone="pink" />
        <input autoFocus value={basic.name} onChange={(e) => onChange({ name: e.target.value })}
          placeholder="LEGO Classic Creative Bricks 500 Pcs"
          className="h-16 w-full rounded-2xl border-2 border-pink-300 bg-white px-4 text-xl font-extrabold text-slate-900 placeholder:text-slate-300 focus:outline-none focus:border-pink-600 focus:ring-4 focus:ring-pink-200" />

        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <Lbl>SKU / Code</Lbl>
            <div className="flex gap-2">
              <input value={basic.sku} onChange={(e) => onChange({ sku: e.target.value })} placeholder="TOY-LEGO-001"
                className="h-11 flex-1 rounded-xl border-2 border-slate-200 px-3 text-sm font-mono font-bold focus:outline-none focus:border-pink-500" />
              <button type="button" onClick={autoSku}
                className="h-11 px-3 rounded-xl bg-pink-100 hover:bg-pink-200 text-pink-700 font-extrabold text-xs inline-flex items-center gap-1">
                <Wand2 className="h-4 w-4" /> Auto
              </button>
            </div>
          </div>
          <div>
            <Lbl>Barcode</Lbl>
            <div className="flex gap-2">
              <input value={basic.barcode} onChange={(e) => onChange({ barcode: e.target.value })} placeholder="5702017189895"
                className="h-11 flex-1 rounded-xl border-2 border-slate-200 px-3 text-sm font-mono font-bold focus:outline-none focus:border-pink-500" />
              <button type="button" onClick={() => setScan(true)}
                className="h-11 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs inline-flex items-center gap-1">
                <Camera className="h-4 w-4" /> Scan
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 2 — AGE GROUP (MOST IMPORTANT) */}
      <section className="rounded-2xl border-2 border-amber-300 bg-gradient-to-br from-amber-50 to-white p-5 space-y-3">
        <Head icon={Cake} n="2" t="Age Group" d="Kis umar ke bache ke liye — safety critical" tone="amber" />
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {AGE_GROUPS.map((a) => {
            const active = basic.ageGroup === a.v;
            const critical = a.safety === 'critical';
            return (
              <button key={a.v} type="button" onClick={() => onChange({ ageGroup: a.v })}
                className={['relative p-2.5 rounded-xl border-2 transition flex flex-col items-center gap-0.5 min-h-[78px]',
                  active ? 'border-amber-600 bg-amber-600 text-white shadow-md scale-[1.03]'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-amber-400'].join(' ')}>
                {critical && !active && (
                  <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-rose-500" title="Safety-critical age" />
                )}
                <span className="text-2xl leading-none">{a.e}</span>
                <span className="text-[10px] font-extrabold text-center leading-tight">{a.l}</span>
                <span className={['text-[9px] font-bold', active ? 'text-white/80' : 'text-slate-500'].join(' ')}>{a.years}</span>
              </button>
            );
          })}
        </div>

        {isCriticalAge && (
          <div className="rounded-xl bg-rose-50 border-2 border-rose-300 p-3 flex items-start gap-2 text-xs text-rose-900">
            <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="font-semibold">
              <strong>Safety-critical age.</strong> Small parts, choking hazard, and non-toxic material fields will be checked in Step 3.
            </div>
          </div>
        )}

        <div className="grid sm:grid-cols-2 gap-3 pt-2 border-t border-amber-200">
          <div>
            <Lbl>Min Age (years) <Opt /></Lbl>
            <input type="number" step="0.5" min="0" value={basic.ageMinYears}
              onChange={(e) => onChange({ ageMinYears: e.target.value === '' ? '' : Number(e.target.value) })}
              placeholder="e.g. 3"
              className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-amber-500" />
          </div>
          <div>
            <Lbl>Max Age (years) <Opt /></Lbl>
            <input type="number" step="0.5" min="0" value={basic.ageMaxYears}
              onChange={(e) => onChange({ ageMaxYears: e.target.value === '' ? '' : Number(e.target.value) })}
              placeholder="e.g. 8"
              className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-amber-500" />
          </div>
        </div>
      </section>

      {/* 3 — GENDER */}
      <section className="rounded-2xl border-2 border-slate-200 bg-white p-5 space-y-3">
        <Head icon={Users} n="3" t="Target Gender" d="Boys / Girls / Unisex" />
        <div className="grid grid-cols-3 gap-2">
          {GENDER_OPTIONS.map((g) => {
            const active = basic.genderTarget === g.v;
            const tones: Record<string, string> = {
              violet: 'border-violet-500 bg-violet-500 text-white',
              blue: 'border-blue-500 bg-blue-500 text-white',
              pink: 'border-pink-500 bg-pink-500 text-white',
            };
            return (
              <button key={g.v} type="button" onClick={() => onChange({ genderTarget: g.v })}
                className={['p-4 rounded-xl border-2 transition flex flex-col items-center gap-1',
                  active ? `${tones[g.color]} shadow-md scale-[1.02]`
                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-400'].join(' ')}>
                <span className="text-3xl">{g.e}</span>
                <span className="text-sm font-extrabold">{g.l}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* 4 — CATEGORY */}
      <section className="rounded-2xl border-2 border-slate-200 bg-white p-5 space-y-3">
        <Head icon={Tag} n="4" t="Category Type" d="Toy type" />
        <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
          {CATEGORY_GROUPS.map((grp) => (
            <div key={grp.group}>
              <div className="text-[10px] uppercase tracking-wider font-extrabold text-slate-500 mb-1.5">{grp.group}</div>
              <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2">
                {grp.items.map((c) => {
                  const a = basic.categoryType === c.v;
                  return (
                    <button key={c.v} type="button" onClick={() => onChange({ categoryType: c.v })}
                      className={['p-2.5 rounded-xl border-2 transition flex flex-col items-center justify-center gap-0.5 min-h-[68px]',
                        a ? 'border-pink-600 bg-pink-600 text-white shadow-md scale-[1.03]'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-pink-400'].join(' ')}>
                      <span className="text-xl leading-none">{c.e}</span>
                      <span className="text-[10px] font-extrabold text-center leading-tight">{c.l}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 5 — BRAND & FRANCHISE */}
      <section className="rounded-2xl border-2 border-slate-200 bg-white p-5 space-y-4">
        <Head icon={Award} n="5" t="Brand & Franchise" d="Brand aur character (optional)" />
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <Lbl>Brand <Opt /></Lbl>
            <input value={basic.brand} onChange={(e) => onChange({ brand: e.target.value })}
              placeholder="LEGO, Mattel, Hasbro..."
              className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-pink-500" />
          </div>
          <div>
            <Lbl>Character / Franchise <Opt /></Lbl>
            <input list="franchisePresets" value={basic.characterFranchise}
              onChange={(e) => onChange({ characterFranchise: e.target.value })}
              placeholder="Disney, Marvel, Barbie..."
              className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-pink-500" />
            <datalist id="franchisePresets">
              {POPULAR_FRANCHISES.map((f) => <option key={f} value={f} />)}
            </datalist>
          </div>
        </div>
        <div>
          <Lbl>Theme <Opt /></Lbl>
          <input value={basic.themeCategory} onChange={(e) => onChange({ themeCategory: e.target.value })}
            placeholder="Space, Dinosaurs, Princess, Superhero..."
            className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-pink-500" />
        </div>

        <div className="flex flex-wrap gap-1.5">
          <span className="text-[10px] uppercase font-extrabold text-slate-500 mr-1 self-center">Popular:</span>
          {POPULAR_FRANCHISES.map((f) => (
            <button key={f} type="button" onClick={() => onChange({ characterFranchise: f })}
              className="px-2.5 py-1 rounded-full border-2 border-slate-200 hover:border-pink-400 bg-white text-xs font-extrabold text-slate-700">
              {f}
            </button>
          ))}
        </div>
      </section>

      {/* 6 — PRICING */}
      <section className="rounded-2xl border-2 border-emerald-300 bg-gradient-to-br from-emerald-50 to-white p-5 space-y-4">
        <Head icon={DollarSign} n="6" t="Pricing" d="Cost aur retail price" tone="emerald" />

        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <Lbl>Cost Price</Lbl>
            <input type="number" step="0.01" inputMode="decimal" value={basic.costPrice}
              onChange={(e) => onChange({ costPrice: e.target.value === '' ? '' : Number(e.target.value) })} placeholder="0"
              className="h-14 w-full rounded-2xl border-2 border-slate-200 bg-white px-4 text-2xl font-extrabold tabular-nums focus:outline-none focus:border-slate-500" />
          </div>
          <div>
            <Lbl tone="emerald">Retail Price *</Lbl>
            <input type="number" step="0.01" inputMode="decimal" value={basic.retailPrice}
              onChange={(e) => onChange({ retailPrice: e.target.value === '' ? '' : Number(e.target.value) })} placeholder="0"
              className="h-14 w-full rounded-2xl border-2 border-emerald-400 bg-emerald-50 px-4 text-2xl font-extrabold tabular-nums text-emerald-900 focus:outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-200" />
          </div>
        </div>

        {cost > 0 && (
          <div>
            <div className="text-[10px] uppercase tracking-wider font-extrabold text-slate-600 mb-1.5 flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-amber-500" /> Quick markup (toys: 25-50% typical)
            </div>
            <div className="flex flex-wrap gap-1.5">
              {MARKUPS.map((m) => (
                <button key={m} type="button" onClick={() => markup(m)}
                  className="px-3 py-2 rounded-xl bg-white border-2 border-emerald-200 hover:bg-emerald-50 hover:border-emerald-400 text-emerald-800 text-xs font-extrabold">
                  +{m}% <span className="text-slate-500 font-bold">= {formatPKRFull(Math.round(cost * (1 + m / 100)))}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {sale > 0 && cost > 0 && (
          <div className={['rounded-2xl border-2 p-4',
            loss ? 'bg-rose-50 border-rose-300' : margin >= 25 ? 'bg-emerald-50 border-emerald-300' : 'bg-amber-50 border-amber-300'].join(' ')}>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <TrendingUp className={['h-6 w-6', loss ? 'text-rose-700' : margin >= 25 ? 'text-emerald-700' : 'text-amber-700'].join(' ')} />
                <div>
                  <div className={['text-[10px] uppercase tracking-wider font-extrabold',
                    loss ? 'text-rose-700' : margin >= 25 ? 'text-emerald-700' : 'text-amber-700'].join(' ')}>
                    {loss ? 'Loss warning' : 'Profit per unit'}
                  </div>
                  <div className="text-2xl font-extrabold tabular-nums">{formatPKRFull(profit)}</div>
                </div>
              </div>
              <div className={['text-3xl font-extrabold tabular-nums',
                loss ? 'text-rose-700' : margin >= 25 ? 'text-emerald-700' : 'text-amber-700'].join(' ')}>
                {margin.toFixed(1)}%
              </div>
            </div>
          </div>
        )}

        <button type="button" onClick={() => setAdv((v) => !v)}
          className="w-full py-2.5 rounded-xl bg-white border-2 border-slate-200 hover:border-emerald-300 text-xs font-extrabold text-slate-700 inline-flex items-center justify-center gap-1.5">
          {adv ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          {adv ? 'Hide extra rates' : 'MRP / Discounted / Tax / Warranty'}
        </button>

        {adv && (
          <div className="grid sm:grid-cols-2 gap-3">
            <Input label="MRP" type="number" step="0.01" value={basic.mrp}
              onChange={(e) => onChange({ mrp: e.target.value === '' ? '' : Number(e.target.value) })} placeholder="Printed price" />
            <Input label="Discounted Price" type="number" step="0.01" value={basic.discountedPrice}
              onChange={(e) => onChange({ discountedPrice: e.target.value === '' ? '' : Number(e.target.value) })} placeholder="Sale price" />
            <Input label="Tax %" type="number" step="0.01" value={basic.taxRate}
              onChange={(e) => onChange({ taxRate: e.target.value === '' ? '' : Number(e.target.value) })}
              placeholder="0" leftIcon={<Percent className="h-4 w-4 text-slate-400" />} />
            <Input label="Warranty (months)" type="number" min="0" value={basic.warrantyMonths}
              onChange={(e) => onChange({ warrantyMonths: e.target.value === '' ? '' : Number(e.target.value) })}
              placeholder="e.g. 6" />
          </div>
        )}
      </section>

      {/* 7 — CATEGORY / DESCRIPTION */}
      <section className="rounded-2xl border-2 border-slate-200 bg-white p-5 space-y-4">
        <Head icon={Tag} n="7" t="Category & Description" d="Optional but helps search" />
        <div>
          <Lbl>Shop Category</Lbl>
          <select value={basic.categoryId} onChange={(e) => onChange({ categoryId: e.target.value })}
            className="h-11 w-full rounded-xl border-2 border-slate-200 bg-white px-3 text-sm font-bold focus:outline-none focus:border-pink-500">
            <option value="">None</option>
            {(cats as any[]).map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
          </select>
        </div>
        <div>
          <Lbl>Description <Opt /></Lbl>
          <textarea rows={2} value={basic.description} onChange={(e) => onChange({ description: e.target.value })}
            placeholder="Key features, what makes this toy special..."
            className="w-full rounded-xl border-2 border-slate-200 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-pink-500" />
        </div>
      </section>

      {/* 8 — IMAGES */}
      <section className="rounded-2xl border-2 border-slate-200 bg-white p-5 space-y-3">
        <Head icon={ImageIcon} n="8" t="Product Images" d="First image = main cover" />
        <UploadDropzone purpose="product-image" maxFiles={10}
          onUploaded={(recs: any[]) => onChange({ imageUrls: [...(basic.imageUrls ?? []), ...recs.map((r) => r.url)] })}
          hint="Up to 10 images" />
        {basic.imageUrls.length > 0 && (
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
            {basic.imageUrls.map((url, i) => (
              <div key={url + i} className="relative group aspect-square rounded-xl overflow-hidden border-2 border-slate-200">
                <img src={url} alt="" className="w-full h-full object-cover" />
                {i === 0 && <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded-md bg-pink-600 text-white text-[9px] font-extrabold">MAIN</div>}
                <button type="button" onClick={() => onChange({ imageUrls: basic.imageUrls.filter((_, x) => x !== i) })}
                  className="absolute top-1 right-1 h-6 w-6 rounded-full bg-slate-900/80 hover:bg-rose-600 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center font-extrabold">×</button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 9 — MARKETING FLAGS + GIFT OPTIONS */}
      <section className="rounded-2xl border-2 border-slate-200 bg-white p-5 space-y-4">
        <Head icon={Sparkles} n="9" t="Marketing & Gift Options" d="Highlights aur gift services" />

        <div>
          <Lbl>Marketing Flags</Lbl>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <Tog checked={basic.isFeatured} onChange={(v: boolean) => onChange({ isFeatured: v })} icon={Star} label="Featured" />
            <Tog checked={basic.isBestSeller} onChange={(v: boolean) => onChange({ isBestSeller: v })} icon={Award} label="Best Seller" />
            <Tog checked={basic.isNewArrival} onChange={(v: boolean) => onChange({ isNewArrival: v })} icon={Zap} label="New Arrival" />
            <Tog checked={basic.isTrending} onChange={(v: boolean) => onChange({ isTrending: v })} icon={TrendingUp} label="Trending" />
          </div>
        </div>

        <div>
          <Lbl>Gift Occasions</Lbl>
          <div className="grid grid-cols-3 gap-2">
            <Tog checked={basic.isBirthdayGift} onChange={(v: boolean) => onChange({ isBirthdayGift: v })} icon={Cake} label="Birthday" tone="pink" />
            <Tog checked={basic.isEidGift} onChange={(v: boolean) => onChange({ isEidGift: v })} icon={Gift} label="Eid" tone="emerald" />
            <Tog checked={basic.isChristmasGift} onChange={(v: boolean) => onChange({ isChristmasGift: v })} icon={Gift} label="Christmas" tone="rose" />
          </div>
        </div>

        <div>
          <Lbl>Gift Services</Lbl>
          <div className="grid grid-cols-2 gap-2">
            <Tog checked={basic.giftWrapAvailable} onChange={(v: boolean) => onChange({ giftWrapAvailable: v })} icon={Gift} label="Gift Wrap Available" tone="pink" />
            <Tog checked={basic.giftMessageAvailable} onChange={(v: boolean) => onChange({ giftMessageAvailable: v })} icon={Heart} label="Gift Message" tone="rose" />
          </div>
        </div>

        {(tags as any[]).length > 0 && (
          <div>
            <Lbl>Tags</Lbl>
            <div className="flex flex-wrap gap-2">
              {(tags as any[]).map((t) => {
                const a = basic.tagIds?.includes(t.id);
                return (
                  <button key={t.id} type="button" onClick={() => togTag(t.id)}
                    className={['inline-flex items-center gap-2 px-3 py-2 rounded-full border-2 text-sm font-extrabold',
                      a ? 'shadow-sm' : 'opacity-60 hover:opacity-100'].join(' ')}
                    style={{ backgroundColor: a ? `${t.color}20` : '#fff', borderColor: a ? t.color : '#e2e8f0', color: a ? t.color : '#475569' }}>
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: t.color }} />{t.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function Head({ icon: Icon, n, t, d, tone = 'slate' }: any) {
  const g: Record<string, string> = {
    slate: 'from-slate-500 to-slate-700',
    emerald: 'from-emerald-500 to-emerald-700',
    pink: 'from-pink-500 to-rose-700',
    amber: 'from-amber-500 to-orange-700',
  };
  return (
    <div className="flex items-center gap-3 pb-2 border-b-2 border-slate-100">
      <div className={['h-10 w-10 rounded-xl text-white flex items-center justify-center shadow-md bg-gradient-to-br shrink-0', g[tone]].join(' ')}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <h3 className="font-extrabold text-slate-900 text-base leading-tight">
          <span className="text-slate-400">{n}.</span> {t}
        </h3>
        <p className="text-xs text-slate-500 font-semibold">{d}</p>
      </div>
    </div>
  );
}
function Lbl({ children, tone }: any) {
  return <label className={['block text-xs font-extrabold uppercase tracking-wider mb-1.5',
    tone === 'emerald' ? 'text-emerald-700' : 'text-slate-600'].join(' ')}>{children}</label>;
}
function Opt() { return <span className="text-slate-400 normal-case font-bold">(optional)</span>; }
function Tog({ checked, onChange, icon: Icon, label, tone }: any) {
  const tones: Record<string, string> = {
    pink: checked ? 'border-pink-500 bg-pink-50 text-pink-800' : 'border-slate-200 bg-white text-slate-600 hover:border-pink-300',
    emerald: checked ? 'border-emerald-500 bg-emerald-50 text-emerald-800' : 'border-slate-200 bg-white text-slate-600 hover:border-emerald-300',
    rose: checked ? 'border-rose-500 bg-rose-50 text-rose-800' : 'border-slate-200 bg-white text-slate-600 hover:border-rose-300',
    default: checked ? 'border-pink-500 bg-pink-50 text-pink-800' : 'border-slate-200 bg-white text-slate-600 hover:border-pink-300',
  };
  return (
    <button type="button" onClick={() => onChange(!checked)}
      className={['flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition', tones[tone || 'default']].join(' ')}>
      <Icon className={['h-5 w-5', checked ? 'fill-current' : ''].join(' ')} />
      <span className="text-[11px] font-extrabold">{label}</span>
    </button>
  );
}
