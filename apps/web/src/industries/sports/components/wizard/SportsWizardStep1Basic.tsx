import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Dumbbell, DollarSign, Image as ImageIcon, Sparkles, Star, TrendingUp,
  AlertCircle, Trophy, Percent, Camera, Wand2, Plus, Check, X,
  ChevronDown, ChevronUp, Zap, Palette, Tag, Award, Users, Flag,
} from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '@core/ui/Input';
import { UploadDropzone } from '@core/components/uploads';
import BarcodeScanner from '@core/components/barcode/BarcodeScanner';
import { categoriesApi } from '@modules/inventory/categories/api/categories.api';
import { tagsApi } from '@modules/inventory/tags/api/tags.api';
import { sportsBrandsApi } from '../../api/brands.api';
import { formatPKRFull } from '@core/lib/format';
import type { SportsWizardBasic } from '../../hooks/useSportsWizard';

interface Props {
  basic: SportsWizardBasic;
  onChange: (patch: Partial<SportsWizardBasic>) => void;
  errors: string[];
}

const SPORTS_LIST = [
  { v: 'Cricket', e: '🏏' }, { v: 'Football', e: '⚽' }, { v: 'Basketball', e: '🏀' },
  { v: 'Volleyball', e: '🏐' }, { v: 'Tennis', e: '🎾' }, { v: 'Badminton', e: '🏸' },
  { v: 'Table Tennis', e: '🏓' }, { v: 'Squash', e: '🎾' }, { v: 'Gym / Fitness', e: '🏋️' },
  { v: 'Swimming', e: '🏊' }, { v: 'Boxing', e: '🥊' }, { v: 'Cycling', e: '🚴' },
  { v: 'Hiking', e: '🥾' }, { v: 'Yoga', e: '🧘' }, { v: 'Athletics', e: '🏃' },
];

const CATEGORY_GROUPS = [
  {
    group: 'Cricket',
    items: [
      { v: 'CRICKET_BAT', l: 'Bat', e: '🏏' },
      { v: 'CRICKET_BALL', l: 'Ball', e: '🔴' },
      { v: 'CRICKET_HELMET', l: 'Helmet', e: '⛑️' },
      { v: 'CRICKET_PADS', l: 'Pads', e: '🦵' },
      { v: 'CRICKET_GLOVES', l: 'Gloves', e: '🧤' },
      { v: 'CRICKET_KIT_BAG', l: 'Kit Bag', e: '🎒' },
      { v: 'CRICKET_STUMPS', l: 'Stumps', e: '🎯' },
      { v: 'CRICKET_JERSEY', l: 'Jersey', e: '👕' },
      { v: 'CRICKET_SHOES', l: 'Shoes', e: '👟' },
      { v: 'CRICKET_GUARD', l: 'Guard', e: '🛡️' },
    ],
  },
  {
    group: 'Football',
    items: [
      { v: 'FOOTBALL', l: 'Football', e: '⚽' },
      { v: 'FOOTBALL_JERSEY', l: 'Jersey', e: '👕' },
      { v: 'FOOTBALL_SHOES', l: 'Studs', e: '👟' },
      { v: 'FOOTBALL_KIT', l: 'Full Kit', e: '🎽' },
      { v: 'SHIN_GUARDS', l: 'Shin Guards', e: '🛡️' },
      { v: 'GOALKEEPER_GLOVES', l: 'GK Gloves', e: '🧤' },
      { v: 'GOAL_POST', l: 'Goal Post', e: '🥅' },
    ],
  },
  {
    group: 'Basketball & Volleyball',
    items: [
      { v: 'BASKETBALL', l: 'Basketball', e: '🏀' },
      { v: 'BASKETBALL_JERSEY', l: 'BB Jersey', e: '👕' },
      { v: 'BASKETBALL_SHOES', l: 'BB Shoes', e: '👟' },
      { v: 'BASKETBALL_HOOP', l: 'Hoop', e: '🏀' },
      { v: 'VOLLEYBALL', l: 'Volleyball', e: '🏐' },
      { v: 'VOLLEYBALL_NET', l: 'Net', e: '🕸️' },
      { v: 'NETBALL', l: 'Netball', e: '🏐' },
    ],
  },
  {
    group: 'Racket Sports',
    items: [
      { v: 'BADMINTON_RACKET', l: 'Racket', e: '🏸' },
      { v: 'BADMINTON_SHUTTLECOCK', l: 'Shuttle', e: '🏸' },
      { v: 'TENNIS_RACKET', l: 'Tennis Rkt', e: '🎾' },
      { v: 'TENNIS_BALL', l: 'Tennis Ball', e: '🎾' },
      { v: 'TABLE_TENNIS_BAT', l: 'TT Bat', e: '🏓' },
      { v: 'TABLE_TENNIS_BALL', l: 'TT Ball', e: '🏓' },
      { v: 'SQUASH_RACKET', l: 'Squash Rkt', e: '🎾' },
    ],
  },
  {
    group: 'Gym & Fitness',
    items: [
      { v: 'DUMBBELL', l: 'Dumbbell', e: '🏋️' },
      { v: 'BARBELL', l: 'Barbell', e: '🏋️' },
      { v: 'WEIGHT_PLATE', l: 'Plates', e: '⚫' },
      { v: 'KETTLEBELL', l: 'Kettlebell', e: '🔔' },
      { v: 'BENCH_PRESS', l: 'Bench', e: '🛏️' },
      { v: 'TREADMILL', l: 'Treadmill', e: '🏃' },
      { v: 'EXERCISE_BIKE', l: 'Cycle', e: '🚴' },
      { v: 'ELLIPTICAL', l: 'Elliptical', e: '🏋️' },
      { v: 'ROWING_MACHINE', l: 'Rower', e: '🚣' },
      { v: 'YOGA_MAT', l: 'Yoga Mat', e: '🧘' },
      { v: 'RESISTANCE_BAND', l: 'Bands', e: '🎗️' },
      { v: 'SKIPPING_ROPE', l: 'Rope', e: '➰' },
      { v: 'BOXING_GLOVES', l: 'Box Gloves', e: '🥊' },
      { v: 'PUNCHING_BAG', l: 'Punch Bag', e: '🥊' },
      { v: 'PROTEIN_SUPPLEMENT', l: 'Protein', e: '💪' },
      { v: 'GYM_ACCESSORY', l: 'Gym Acc', e: '🎽' },
    ],
  },
  {
    group: 'Outdoor & Other',
    items: [
      { v: 'SWIMMING_GOGGLES', l: 'Goggles', e: '🥽' },
      { v: 'SWIMSUIT', l: 'Swimsuit', e: '🩱' },
      { v: 'SWIMMING_CAP', l: 'Swim Cap', e: '🧢' },
      { v: 'CAMPING_TENT', l: 'Tent', e: '⛺' },
      { v: 'SLEEPING_BAG', l: 'Sleep Bag', e: '💤' },
      { v: 'HIKING_BAG', l: 'Hike Bag', e: '🎒' },
      { v: 'CYCLING_HELMET', l: 'Helmet', e: '⛑️' },
      { v: 'BICYCLE', l: 'Bicycle', e: '🚲' },
      { v: 'TROPHY', l: 'Trophy', e: '🏆' },
      { v: 'MEDAL', l: 'Medal', e: '🏅' },
      { v: 'WHISTLE', l: 'Whistle', e: '📯' },
      { v: 'STOPWATCH', l: 'Stopwatch', e: '⏱️' },
      { v: 'UMPIRE_GEAR', l: 'Umpire', e: '🧑‍⚖️' },
      { v: 'OTHER', l: 'Other', e: '📦' },
    ],
  },
];

const AGE_GROUPS = [
  { v: 'KIDS', l: 'Kids', e: '👶' },
  { v: 'YOUTH', l: 'Youth', e: '🧒' },
  { v: 'ADULT', l: 'Adult', e: '👨' },
  { v: 'SENIOR', l: 'Senior', e: '👴' },
  { v: 'UNIVERSAL', l: 'All Ages', e: '👥' },
];

const GENDERS = [
  { v: 'MALE', l: 'Male', e: '♂️' },
  { v: 'FEMALE', l: 'Female', e: '♀️' },
  { v: 'UNISEX', l: 'Unisex', e: '⚧️' },
  { v: 'KIDS', l: 'Kids', e: '👶' },
];

const MARKUPS = [10, 15, 20, 25, 30, 40, 50];

const COLOR_PRESETS = [
  { name: 'Red', hex: '#ef4444' }, { name: 'Blue', hex: '#3b82f6' },
  { name: 'Green', hex: '#10b981' }, { name: 'Black', hex: '#000000' },
  { name: 'White', hex: '#ffffff' }, { name: 'Yellow', hex: '#f59e0b' },
  { name: 'Orange', hex: '#f97316' }, { name: 'Purple', hex: '#8b5cf6' },
  { name: 'Pink', hex: '#ec4899' }, { name: 'Grey', hex: '#6b7280' },
];

export function SportsWizardStep1Basic({ basic, onChange, errors }: Props) {
  const qc = useQueryClient();
  const [scan, setScan] = useState(false);
  const [adv, setAdv] = useState(Boolean(basic.wholesalePrice || basic.mrp || basic.taxRate));
  const [newBrand, setNewBrand] = useState('');
  const [showBrand, setShowBrand] = useState(false);

  const { data: cats = [] } = useQuery({ queryKey: ['categories'], queryFn: categoriesApi.list });
  const { data: brands = [] } = useQuery({ queryKey: ['sports-brands'], queryFn: () => sportsBrandsApi.list({ active: true }) });
  const { data: tags = [] } = useQuery({ queryKey: ['tags'], queryFn: tagsApi.list });

  const cost = Number(basic.costPrice || 0);
  const sale = Number(basic.retailPrice || 0);
  const profit = sale - cost;
  const margin = sale > 0 ? (profit / sale) * 100 : 0;
  const loss = cost > 0 && sale > 0 && profit < 0;

  const mkBrand = useMutation({
    mutationFn: () => sportsBrandsApi.create({ name: newBrand.trim(), isActive: true, brandTier: 'MID_RANGE' }),
    onSuccess: (b: any) => {
      toast.success(`"${b.name}" created`);
      onChange({ brandId: b.id });
      setNewBrand(''); setShowBrand(false);
      qc.invalidateQueries({ queryKey: ['sports-brands'] });
    },
  });

  const autoSku = () => {
    const b = (basic.name || 'SPT').toUpperCase().replace(/[^A-Z0-9 ]/g, '').trim()
      .split(/\s+/).slice(0, 2).map((w) => w.slice(0, 4)).join('-') || 'SPT';
    onChange({ sku: `${b}-${Math.floor(1000 + Math.random() * 9000)}` });
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
      <section className="rounded-2xl border-2 border-emerald-300 bg-gradient-to-br from-emerald-50 to-white p-5 space-y-4">
        <Head icon={Dumbbell} n="1" t="Product Name" d="Full model / bat name / kit description" tone="emerald" />
        <input autoFocus value={basic.name} onChange={(e) => onChange({ name: e.target.value })}
          placeholder="SS Ton Gladiator English Willow Cricket Bat"
          className="h-16 w-full rounded-2xl border-2 border-emerald-300 bg-white px-4 text-xl font-extrabold text-slate-900 placeholder:text-slate-300 focus:outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-200" />

        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <Lbl>SKU / Code</Lbl>
            <div className="flex gap-2">
              <input value={basic.sku} onChange={(e) => onChange({ sku: e.target.value })} placeholder="SS-GLAD-EW-01"
                className="h-11 flex-1 rounded-xl border-2 border-slate-200 px-3 text-sm font-mono font-bold focus:outline-none focus:border-emerald-500" />
              <button type="button" onClick={autoSku}
                className="h-11 px-3 rounded-xl bg-violet-100 hover:bg-violet-200 text-violet-700 font-extrabold text-xs inline-flex items-center gap-1">
                <Wand2 className="h-4 w-4" /> Auto
              </button>
            </div>
          </div>
          <div>
            <Lbl>Barcode</Lbl>
            <div className="flex gap-2">
              <input value={basic.barcode} onChange={(e) => onChange({ barcode: e.target.value })} placeholder="8901234567890"
                className="h-11 flex-1 rounded-xl border-2 border-slate-200 px-3 text-sm font-mono font-bold focus:outline-none focus:border-emerald-500" />
              <button type="button" onClick={() => setScan(true)}
                className="h-11 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs inline-flex items-center gap-1">
                <Camera className="h-4 w-4" /> Scan
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 2 — SPORT */}
      <section className="rounded-2xl border-2 border-slate-200 bg-white p-5 space-y-3">
        <Head icon={Trophy} n="2" t="Sport" d="Which sport is this for?" />
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
          {SPORTS_LIST.map((s) => {
            const a = basic.sport === s.v;
            return (
              <button key={s.v} type="button" onClick={() => onChange({ sport: s.v })}
                className={['p-2.5 rounded-xl border-2 transition flex flex-col items-center gap-1 min-h-[70px]',
                  a ? 'border-emerald-600 bg-emerald-600 text-white shadow-md scale-[1.03]'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-emerald-400'].join(' ')}>
                <span className="text-2xl leading-none">{s.e}</span>
                <span className="text-[10px] font-extrabold text-center leading-tight">{s.v}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* 3 — CATEGORY */}
      <section className="rounded-2xl border-2 border-slate-200 bg-white p-5 space-y-3">
        <Head icon={Tag} n="3" t="Category Type" d="What specifically is this item?" />
        <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
          {CATEGORY_GROUPS.map((grp) => (
            <div key={grp.group}>
              <div className="text-[10px] uppercase tracking-wider font-extrabold text-slate-500 mb-1.5">{grp.group}</div>
              <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2">
                {grp.items.map((c) => {
                  const a = basic.categoryType === c.v;
                  return (
                    <button key={c.v} type="button" onClick={() => onChange({ categoryType: c.v })}
                      className={['p-2.5 rounded-xl border-2 transition flex flex-col items-center gap-0.5 min-h-[68px]',
                        a ? 'border-emerald-600 bg-emerald-600 text-white shadow-md scale-[1.03]'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-emerald-400'].join(' ')}>
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

      {/* 4 — AGE & GENDER */}
      <section className="rounded-2xl border-2 border-slate-200 bg-white p-5 space-y-4">
        <Head icon={Users} n="4" t="Age Group & Target Gender" d="Who is this product for?" />

        <div>
          <Lbl>Age Group</Lbl>
          <div className="grid grid-cols-5 gap-2">
            {AGE_GROUPS.map((a) => {
              const active = basic.ageGroup === a.v;
              return (
                <button key={a.v} type="button" onClick={() => onChange({ ageGroup: a.v })}
                  className={['p-2.5 rounded-xl border-2 transition flex flex-col items-center gap-0.5',
                    active ? 'border-blue-600 bg-blue-600 text-white shadow-md'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-blue-400'].join(' ')}>
                  <span className="text-lg">{a.e}</span>
                  <span className="text-[10px] font-extrabold">{a.l}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <Lbl>Target Gender</Lbl>
          <div className="grid grid-cols-4 gap-2">
            {GENDERS.map((g) => {
              const active = basic.genderTarget === g.v;
              return (
                <button key={g.v} type="button" onClick={() => onChange({ genderTarget: g.v })}
                  className={['p-2.5 rounded-xl border-2 transition flex flex-col items-center gap-0.5',
                    active ? 'border-pink-600 bg-pink-600 text-white shadow-md'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-pink-400'].join(' ')}>
                  <span className="text-lg">{g.e}</span>
                  <span className="text-[10px] font-extrabold">{g.l}</span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* 5 — BRAND */}
      <section className="rounded-2xl border-2 border-slate-200 bg-white p-5 space-y-3">
        <div className="flex items-center justify-between">
          <Head icon={Award} n="5" t="Brand" d="SS, MRF, Kookaburra, Adidas..." />
          <button type="button" onClick={() => setShowBrand((v) => !v)}
            className="text-xs font-extrabold text-violet-700 inline-flex items-center gap-1">
            <Plus className="h-3 w-3" /> New brand
          </button>
        </div>
        {showBrand && (
          <div className="flex gap-2">
            <input autoFocus value={newBrand} onChange={(e) => setNewBrand(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && newBrand.trim() && mkBrand.mutate()}
              placeholder="e.g. Yonex"
              className="h-11 flex-1 rounded-xl border-2 border-violet-300 px-3 text-sm font-bold focus:outline-none focus:border-violet-600" />
            <button type="button" disabled={!newBrand.trim() || mkBrand.isPending} onClick={() => mkBrand.mutate()}
              className="h-11 px-4 rounded-xl bg-violet-600 hover:bg-violet-700 text-white disabled:opacity-50">
              <Check className="h-4 w-4" />
            </button>
            <button type="button" onClick={() => { setShowBrand(false); setNewBrand(''); }}
              className="h-11 px-3 rounded-xl bg-slate-100 text-slate-600">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
        <select className="h-12 w-full rounded-xl border-2 border-slate-200 bg-white px-3 text-sm font-bold focus:outline-none focus:border-emerald-500"
          value={basic.brandId} onChange={(e) => onChange({ brandId: e.target.value })}>
          <option value="">-- Select brand --</option>
          {(brands as any[]).map((b) => (
            <option key={b.id} value={b.id}>
              {b.name} {b.brandTier === 'PREMIUM' ? '⭐ Premium' : ''}
              {b.authorizedDealer ? ' ✓ Authorized' : ''}
            </option>
          ))}
        </select>
      </section>

      {/* 6 — COLOR */}
      <section className="rounded-2xl border-2 border-slate-200 bg-white p-5 space-y-3">
        <Head icon={Palette} n="6" t="Color (optional)" d="Primary color of the product" />
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <Lbl>Color Name</Lbl>
            <input value={basic.color} onChange={(e) => onChange({ color: e.target.value })} placeholder="Team Blue"
              className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-emerald-500" />
          </div>
          <div>
            <Lbl>Color Preview</Lbl>
            <div className="flex gap-2 items-center">
              <input type="color" value={basic.colorHex || '#000000'} onChange={(e) => onChange({ colorHex: e.target.value })}
                className="h-11 w-16 rounded-xl border-2 border-slate-200 cursor-pointer" />
              <input value={basic.colorHex} onChange={(e) => onChange({ colorHex: e.target.value })} placeholder="#000000"
                className="h-11 flex-1 rounded-xl border-2 border-slate-200 px-3 text-sm font-mono focus:outline-none focus:border-emerald-500" />
            </div>
          </div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wider font-extrabold text-slate-600 mb-2">Quick colors</div>
          <div className="flex flex-wrap gap-1.5">
            {COLOR_PRESETS.map((c) => (
              <button key={c.hex} type="button" onClick={() => onChange({ color: c.name, colorHex: c.hex })}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border-2 border-slate-200 hover:border-emerald-400 text-xs font-extrabold">
                <span className="h-4 w-4 rounded-full border-2 border-white shadow" style={{ backgroundColor: c.hex }} />
                {c.name}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* 7 — PRICING */}
      <section className="rounded-2xl border-2 border-emerald-300 bg-gradient-to-br from-emerald-50 to-white p-5 space-y-4">
        <Head icon={DollarSign} n="7" t="Pricing" d="Cost and retail price" tone="emerald" />

        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <Lbl>Cost Price (Purchase)</Lbl>
            <input type="number" step="0.01" inputMode="decimal" value={basic.costPrice}
              onChange={(e) => onChange({ costPrice: e.target.value === '' ? '' : Number(e.target.value) })} placeholder="0"
              className="h-14 w-full rounded-2xl border-2 border-slate-200 bg-white px-4 text-2xl font-extrabold tabular-nums focus:outline-none focus:border-slate-500" />
          </div>
          <div>
            <Lbl tone="emerald">Retail Price (Sale) *</Lbl>
            <input type="number" step="0.01" inputMode="decimal" value={basic.retailPrice}
              onChange={(e) => onChange({ retailPrice: e.target.value === '' ? '' : Number(e.target.value) })} placeholder="0"
              className="h-14 w-full rounded-2xl border-2 border-emerald-400 bg-emerald-50 px-4 text-2xl font-extrabold tabular-nums text-emerald-900 focus:outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-200" />
          </div>
        </div>

        {cost > 0 && (
          <div>
            <div className="text-[10px] uppercase tracking-wider font-extrabold text-slate-600 mb-1.5 flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-amber-500" /> Quick markup
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
            loss ? 'bg-rose-50 border-rose-300' : margin >= 15 ? 'bg-emerald-50 border-emerald-300' : 'bg-amber-50 border-amber-300'].join(' ')}>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <TrendingUp className={['h-6 w-6', loss ? 'text-rose-700' : margin >= 15 ? 'text-emerald-700' : 'text-amber-700'].join(' ')} />
                <div>
                  <div className={['text-[10px] uppercase tracking-wider font-extrabold', loss ? 'text-rose-700' : margin >= 15 ? 'text-emerald-700' : 'text-amber-700'].join(' ')}>
                    {loss ? '⚠️ Loss warning!' : 'Profit per unit'}
                  </div>
                  <div className="text-2xl font-extrabold tabular-nums">{formatPKRFull(profit)}</div>
                </div>
              </div>
              <div className={['text-3xl font-extrabold tabular-nums', loss ? 'text-rose-700' : margin >= 15 ? 'text-emerald-700' : 'text-amber-700'].join(' ')}>
                {margin.toFixed(1)}%
              </div>
            </div>
          </div>
        )}

        <button type="button" onClick={() => setAdv((v) => !v)}
          className="w-full py-2.5 rounded-xl bg-white border-2 border-slate-200 hover:border-emerald-300 text-xs font-extrabold text-slate-700 inline-flex items-center justify-center gap-1.5">
          {adv ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          {adv ? 'Hide extra rates' : 'Wholesale / MRP / Tax'}
        </button>

        {adv && (
          <div className="grid sm:grid-cols-3 gap-3">
            <Input label="Wholesale" type="number" step="0.01" value={basic.wholesalePrice}
              onChange={(e) => onChange({ wholesalePrice: e.target.value === '' ? '' : Number(e.target.value) })} placeholder="Optional" />
            <Input label="MRP" type="number" step="0.01" value={basic.mrp}
              onChange={(e) => onChange({ mrp: e.target.value === '' ? '' : Number(e.target.value) })} placeholder="Printed price" />
            <Input label="Tax %" type="number" step="0.01" value={basic.taxRate}
              onChange={(e) => onChange({ taxRate: e.target.value === '' ? '' : Number(e.target.value) })} placeholder="0"
              leftIcon={<Percent className="h-4 w-4 text-slate-400" />} />
          </div>
        )}
      </section>

      {/* 8 — CATEGORY / DESCRIPTION / COUNTRY */}
      <section className="rounded-2xl border-2 border-slate-200 bg-white p-5 space-y-4">
        <Head icon={Tag} n="8" t="Shop Category & Details" d="Optional but helps searching" />

        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <Lbl>Shop Category</Lbl>
            <select value={basic.categoryId} onChange={(e) => onChange({ categoryId: e.target.value })}
              className="h-11 w-full rounded-xl border-2 border-slate-200 bg-white px-3 text-sm font-bold focus:outline-none focus:border-emerald-500">
              <option value="">None</option>
              {(cats as any[]).map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
            </select>
          </div>
          <div>
            <Lbl>Country of Origin</Lbl>
            <input value={basic.countryOfMake} onChange={(e) => onChange({ countryOfMake: e.target.value })}
              placeholder="Pakistan, India, England..."
              className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-emerald-500" />
          </div>
        </div>

        <div>
          <Lbl>Description <Opt /></Lbl>
          <textarea rows={2} value={basic.description} onChange={(e) => onChange({ description: e.target.value })}
            placeholder="Key features, what makes it special..."
            className="w-full rounded-xl border-2 border-slate-200 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-emerald-500" />
        </div>

        <div>
          <Lbl>Care Instructions <Opt /></Lbl>
          <textarea rows={2} value={basic.careInstructions} onChange={(e) => onChange({ careInstructions: e.target.value })}
            placeholder="How to clean, store, maintain..."
            className="w-full rounded-xl border-2 border-slate-200 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-emerald-500" />
        </div>
      </section>

      {/* 9 — IMAGES */}
      <section className="rounded-2xl border-2 border-slate-200 bg-white p-5 space-y-3">
        <Head icon={ImageIcon} n="9" t="Product Images" d="First image becomes the cover" />
        <UploadDropzone purpose="product-image" maxFiles={10}
          onUploaded={(recs: any[]) => onChange({ imageUrls: [...(basic.imageUrls ?? []), ...recs.map((r) => r.url)] })}
          hint="Up to 10 images" />
        {basic.imageUrls.length > 0 && (
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
            {basic.imageUrls.map((url, i) => (
              <div key={url + i} className="relative group aspect-square rounded-xl overflow-hidden border-2 border-slate-200">
                <img src={url} alt="" className="w-full h-full object-cover" />
                {i === 0 && <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded-md bg-emerald-600 text-white text-[9px] font-extrabold">COVER</div>}
                <button type="button" onClick={() => onChange({ imageUrls: basic.imageUrls.filter((_, x) => x !== i) })}
                  className="absolute top-1 right-1 h-6 w-6 rounded-full bg-slate-900/80 hover:bg-rose-600 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center font-extrabold">×</button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 10 — FLAGS */}
      <section className="rounded-2xl border-2 border-slate-200 bg-white p-5 space-y-4">
        <Head icon={Sparkles} n="10" t="Marketing Flags" d="Where it gets highlighted" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <Tog checked={basic.isFeatured} onChange={(v: boolean) => onChange({ isFeatured: v })} icon={Star} label="Featured" />
          <Tog checked={basic.isBestSeller} onChange={(v: boolean) => onChange({ isBestSeller: v })} icon={Award} label="Best Seller" />
          <Tog checked={basic.isNewArrival} onChange={(v: boolean) => onChange({ isNewArrival: v })} icon={Zap} label="New Arrival" />
          <Tog checked={basic.isProfessional} onChange={(v: boolean) => onChange({ isProfessional: v })} icon={Trophy} label="Pro Grade" />
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
    emerald: 'from-emerald-500 to-teal-700',
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
function Tog({ checked, onChange, icon: Icon, label }: any) {
  return (
    <button type="button" onClick={() => onChange(!checked)}
      className={['flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition',
        checked ? 'border-emerald-500 bg-emerald-50 text-emerald-800' : 'border-slate-200 bg-white text-slate-600 hover:border-emerald-300'].join(' ')}>
      <Icon className={['h-5 w-5', checked ? 'text-emerald-600 fill-emerald-100' : 'text-slate-500'].join(' ')} />
      <span className="text-[11px] font-extrabold">{label}</span>
    </button>
  );
}
