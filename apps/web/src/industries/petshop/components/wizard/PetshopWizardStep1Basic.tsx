import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  PawPrint, DollarSign, Image as ImageIcon, Sparkles, Star, TrendingUp,
  AlertCircle, Percent, Camera, Wand2, ChevronDown, ChevronUp, Zap,
  Tag, Heart, Award, Baby,
} from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '@core/ui/Input';
import { UploadDropzone } from '@core/components/uploads';
import BarcodeScanner from '@core/components/barcode/BarcodeScanner';
import { categoriesApi } from '@modules/inventory/categories/api/categories.api';
import { tagsApi } from '@modules/inventory/tags/api/tags.api';
import { formatPKRFull } from '@core/lib/format';
import type { PetshopWizardBasic } from '../../hooks/usePetshopWizard';

interface Props {
  basic: PetshopWizardBasic;
  onChange: (patch: Partial<PetshopWizardBasic>) => void;
  errors: string[];
}

const CATEGORY_GROUPS: Array<{ group: string; items: Array<{ v: string; l: string; e: string }> }> = [
  {
    group: 'Food & Nutrition',
    items: [
      { v: 'DRY_FOOD', l: 'Dry Food', e: '🥣' },
      { v: 'WET_FOOD', l: 'Wet Food', e: '🥫' },
      { v: 'TREATS', l: 'Treats', e: '🍖' },
      { v: 'SUPPLEMENTS', l: 'Supplements', e: '💊' },
      { v: 'PRESCRIPTION_DIET', l: 'Rx Diet', e: '📋' },
    ],
  },
  {
    group: 'Accessories',
    items: [
      { v: 'TOYS', l: 'Toys', e: '🎾' },
      { v: 'BEDS', l: 'Beds', e: '🛏️' },
      { v: 'CARRIERS', l: 'Carriers', e: '👜' },
      { v: 'LEASHES_COLLARS', l: 'Leash/Collar', e: '🎗️' },
      { v: 'CLOTHING', l: 'Clothing', e: '👕' },
      { v: 'GROOMING_SUPPLIES', l: 'Grooming', e: '🧴' },
      { v: 'HYGIENE', l: 'Hygiene', e: '🧻' },
      { v: 'TRAINING', l: 'Training', e: '🎓' },
      { v: 'LITTER', l: 'Litter', e: '🏖️' },
    ],
  },
  {
    group: 'Aquarium',
    items: [
      { v: 'AQUARIUM_TANK', l: 'Tank', e: '🐠' },
      { v: 'AQUARIUM_FILTER', l: 'Filter', e: '💧' },
      { v: 'AQUARIUM_DECOR', l: 'Decor', e: '🪸' },
      { v: 'AQUARIUM_FOOD', l: 'Fish Food', e: '🐟' },
      { v: 'AQUARIUM_MEDICINE', l: 'Fish Rx', e: '💉' },
    ],
  },
  {
    group: 'Birds & Reptiles',
    items: [
      { v: 'BIRD_CAGE', l: 'Bird Cage', e: '🐦' },
      { v: 'BIRD_FOOD', l: 'Bird Food', e: '🌾' },
      { v: 'BIRD_ACCESSORIES', l: 'Bird Acc.', e: '🪺' },
      { v: 'REPTILE_HABITAT', l: 'Habitat', e: '🦎' },
      { v: 'REPTILE_FOOD', l: 'Rep. Food', e: '🦗' },
      { v: 'REPTILE_HEATING', l: 'Heating', e: '🌡️' },
    ],
  },
  {
    group: 'Vet & Medicine',
    items: [
      { v: 'VET_MEDICINE', l: 'Medicine', e: '💊' },
      { v: 'VET_VACCINE', l: 'Vaccine', e: '💉' },
      { v: 'FIRST_AID', l: 'First Aid', e: '🩹' },
      { v: 'OTHER', l: 'Other', e: '📦' },
    ],
  },
];

const SPECIES = [
  { v: 'DOG', l: 'Dog', e: '🐕' },
  { v: 'CAT', l: 'Cat', e: '🐈' },
  { v: 'BIRD', l: 'Bird', e: '🦜' },
  { v: 'FISH', l: 'Fish', e: '🐠' },
  { v: 'RABBIT', l: 'Rabbit', e: '🐰' },
  { v: 'HAMSTER', l: 'Hamster', e: '🐹' },
  { v: 'GUINEA_PIG', l: 'Guinea Pig', e: '🐹' },
  { v: 'TURTLE', l: 'Turtle', e: '🐢' },
  { v: 'REPTILE', l: 'Reptile', e: '🦎' },
  { v: 'PARROT', l: 'Parrot', e: '🦜' },
  { v: 'HORSE', l: 'Horse', e: '🐴' },
  { v: 'FARM_ANIMAL', l: 'Farm', e: '🐄' },
  { v: 'ALL', l: 'All Species', e: '🌐' },
  { v: 'OTHER', l: 'Other', e: '🐾' },
];

const LIFE_STAGES = [
  { v: 'PUPPY_KITTEN', l: 'Puppy / Kitten', e: '🐶', tone: 'pink' },
  { v: 'JUNIOR', l: 'Junior', e: '🐕', tone: 'blue' },
  { v: 'ADULT', l: 'Adult', e: '🦮', tone: 'emerald' },
  { v: 'SENIOR', l: 'Senior', e: '👴', tone: 'amber' },
  { v: 'ALL_STAGES', l: 'All Stages', e: '🌐', tone: 'violet' },
];

const MARKUPS = [10, 15, 20, 25, 30, 40];

export function PetshopWizardStep1Basic({ basic, onChange, errors }: Props) {
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
    const base = (basic.name || 'PET').toUpperCase().replace(/[^A-Z0-9 ]/g, '').trim()
      .split(/\s+/).slice(0, 2).map((w) => w.slice(0, 4)).join('-') || 'PET';
    const sp = basic.species ? basic.species.slice(0, 3) : '';
    onChange({ sku: `${base}-${sp}-${Math.floor(100 + Math.random() * 900)}` });
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
      <section className="rounded-2xl border-2 border-amber-300 bg-gradient-to-br from-amber-50 to-white p-5 space-y-4">
        <Head icon={PawPrint} n="1" t="Product Name" d="Brand, species, purpose" tone="amber" />
        <input autoFocus value={basic.name} onChange={(e) => onChange({ name: e.target.value })}
          placeholder="Royal Canin Puppy Dry Food 4kg"
          className="h-16 w-full rounded-2xl border-2 border-amber-300 bg-white px-4 text-xl font-extrabold text-slate-900 placeholder:text-slate-300 focus:outline-none focus:border-amber-600 focus:ring-4 focus:ring-amber-200" />

        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <Lbl>Brand <Opt /></Lbl>
            <input value={basic.brand} onChange={(e) => onChange({ brand: e.target.value })}
              placeholder="Royal Canin, Pedigree, Whiskas..."
              className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-amber-500" />
          </div>
          <div>
            <Lbl>Breed-Specific <Opt /></Lbl>
            <input value={basic.breedSpecific} onChange={(e) => onChange({ breedSpecific: e.target.value })}
              placeholder="German Shepherd, Persian..."
              className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-amber-500" />
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <Lbl>SKU / Code</Lbl>
            <div className="flex gap-2">
              <input value={basic.sku} onChange={(e) => onChange({ sku: e.target.value })} placeholder="RC-PUPPY-4K"
                className="h-11 flex-1 rounded-xl border-2 border-slate-200 px-3 text-sm font-mono font-bold focus:outline-none focus:border-amber-500" />
              <button type="button" onClick={autoSku}
                className="h-11 px-3 rounded-xl bg-violet-100 hover:bg-violet-200 text-violet-700 font-extrabold text-xs inline-flex items-center gap-1">
                <Wand2 className="h-4 w-4" /> Auto
              </button>
            </div>
          </div>
          <div>
            <Lbl>Barcode</Lbl>
            <div className="flex gap-2">
              <input value={basic.barcode} onChange={(e) => onChange({ barcode: e.target.value })} placeholder="3182550702836"
                className="h-11 flex-1 rounded-xl border-2 border-slate-200 px-3 text-sm font-mono font-bold focus:outline-none focus:border-amber-500" />
              <button type="button" onClick={() => setScan(true)}
                className="h-11 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs inline-flex items-center gap-1">
                <Camera className="h-4 w-4" /> Scan
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 2 — CATEGORY */}
      <section className="rounded-2xl border-2 border-slate-200 bg-white p-5 space-y-3">
        <Head icon={Tag} n="2" t="Category Type" d="What kind of product is this?" />
        <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
          {CATEGORY_GROUPS.map((grp) => (
            <div key={grp.group}>
              <div className="text-[10px] uppercase tracking-wider font-extrabold text-slate-500 mb-1.5">{grp.group}</div>
              <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-2">
                {grp.items.map((c) => {
                  const a = basic.categoryType === c.v;
                  return (
                    <button key={c.v} type="button" onClick={() => onChange({ categoryType: c.v })}
                      className={['p-2.5 rounded-xl border-2 transition flex flex-col items-center justify-center gap-0.5 min-h-[68px]',
                        a ? 'border-amber-600 bg-amber-600 text-white shadow-md scale-[1.03]'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-amber-400'].join(' ')}>
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

      {/* 3 — SPECIES */}
      <section className="rounded-2xl border-2 border-slate-200 bg-white p-5 space-y-3">
        <Head icon={Heart} n="3" t="For Which Pet?" d="Species this product suits" />
        <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
          {SPECIES.map((s) => {
            const a = basic.species === s.v;
            return (
              <button key={s.v} type="button" onClick={() => onChange({ species: s.v })}
                className={['p-2.5 rounded-xl border-2 transition flex flex-col items-center gap-0.5',
                  a ? 'border-orange-600 bg-orange-600 text-white shadow-md scale-[1.02]'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-orange-400'].join(' ')}>
                <span className="text-2xl">{s.e}</span>
                <span className="text-[10px] font-extrabold">{s.l}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* 4 — LIFE STAGE */}
      <section className="rounded-2xl border-2 border-slate-200 bg-white p-5 space-y-3">
        <Head icon={Baby} n="4" t="Life Stage" d="Puppy, adult or senior?" />
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
          {LIFE_STAGES.map((s) => {
            const a = basic.lifeStage === s.v;
            const tones: Record<string, string> = {
              pink: 'border-pink-500 bg-pink-500 text-white',
              blue: 'border-blue-500 bg-blue-500 text-white',
              emerald: 'border-emerald-500 bg-emerald-500 text-white',
              amber: 'border-amber-500 bg-amber-500 text-white',
              violet: 'border-violet-500 bg-violet-500 text-white',
            };
            return (
              <button key={s.v} type="button" onClick={() => onChange({ lifeStage: s.v })}
                className={['p-3 rounded-xl border-2 transition flex flex-col items-center gap-1',
                  a ? `${tones[s.tone]} shadow-md scale-[1.02]` : 'border-slate-200 bg-white text-slate-700 hover:border-slate-400'].join(' ')}>
                <span className="text-2xl">{s.e}</span>
                <span className="text-[10px] font-extrabold text-center">{s.l}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* 5 — PRICING */}
      <section className="rounded-2xl border-2 border-emerald-300 bg-gradient-to-br from-emerald-50 to-white p-5 space-y-4">
        <Head icon={DollarSign} n="5" t="Pricing" d="Cost and retail price" tone="emerald" />

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
                  <div className={['text-[10px] uppercase tracking-wider font-extrabold',
                    loss ? 'text-rose-700' : margin >= 15 ? 'text-emerald-700' : 'text-amber-700'].join(' ')}>
                    {loss ? 'Loss warning' : 'Profit per unit'}
                  </div>
                  <div className="text-2xl font-extrabold tabular-nums">{formatPKRFull(profit)}</div>
                </div>
              </div>
              <div className={['text-3xl font-extrabold tabular-nums',
                loss ? 'text-rose-700' : margin >= 15 ? 'text-emerald-700' : 'text-amber-700'].join(' ')}>
                {margin.toFixed(1)}%
              </div>
            </div>
          </div>
        )}

        <button type="button" onClick={() => setAdv((v) => !v)}
          className="w-full py-2.5 rounded-xl bg-white border-2 border-slate-200 hover:border-emerald-300 text-xs font-extrabold text-slate-700 inline-flex items-center justify-center gap-1.5">
          {adv ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          {adv ? 'Hide extra rates' : 'MRP / Discounted Price / Tax'}
        </button>

        {adv && (
          <div className="grid sm:grid-cols-3 gap-3">
            <Input label="MRP" type="number" step="0.01" value={basic.mrp}
              onChange={(e) => onChange({ mrp: e.target.value === '' ? '' : Number(e.target.value) })} placeholder="Printed price" />
            <Input label="Discounted Price" type="number" step="0.01" value={basic.discountedPrice}
              onChange={(e) => onChange({ discountedPrice: e.target.value === '' ? '' : Number(e.target.value) })} placeholder="Sale price" />
            <Input label="Tax %" type="number" step="0.01" value={basic.taxRate}
              onChange={(e) => onChange({ taxRate: e.target.value === '' ? '' : Number(e.target.value) })}
              placeholder="0" leftIcon={<Percent className="h-4 w-4 text-slate-400" />} />
          </div>
        )}
      </section>

      {/* 6 — CATEGORY / DESCRIPTION */}
      <section className="rounded-2xl border-2 border-slate-200 bg-white p-5 space-y-4">
        <Head icon={Tag} n="6" t="Category & Description" d="Optional, helps search" />
        <div>
          <Lbl>Shop Category</Lbl>
          <select value={basic.categoryId} onChange={(e) => onChange({ categoryId: e.target.value })}
            className="h-11 w-full rounded-xl border-2 border-slate-200 bg-white px-3 text-sm font-bold focus:outline-none focus:border-amber-500">
            <option value="">None</option>
            {(cats as any[]).map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
          </select>
        </div>
        <div>
          <Lbl>Description <Opt /></Lbl>
          <textarea rows={2} value={basic.description} onChange={(e) => onChange({ description: e.target.value })}
            placeholder="Key features, what makes it special..."
            className="w-full rounded-xl border-2 border-slate-200 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-amber-500" />
        </div>
      </section>

      {/* 7 — IMAGES */}
      <section className="rounded-2xl border-2 border-slate-200 bg-white p-5 space-y-3">
        <Head icon={ImageIcon} n="7" t="Product Images" d="First image is the primary" />
        <UploadDropzone purpose="product-image" maxFiles={10}
          onUploaded={(recs: any[]) => onChange({ imageUrls: [...(basic.imageUrls ?? []), ...recs.map((r) => r.url)] })}
          hint="Up to 10 images" />
        {basic.imageUrls.length > 0 && (
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
            {basic.imageUrls.map((url, i) => (
              <div key={url + i} className="relative group aspect-square rounded-xl overflow-hidden border-2 border-slate-200">
                <img src={url} alt="" className="w-full h-full object-cover" />
                {i === 0 && <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded-md bg-amber-600 text-white text-[9px] font-extrabold">MAIN</div>}
                <button type="button" onClick={() => onChange({ imageUrls: basic.imageUrls.filter((_, x) => x !== i) })}
                  className="absolute top-1 right-1 h-6 w-6 rounded-full bg-slate-900/80 hover:bg-rose-600 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center font-extrabold">×</button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 8 — FLAGS */}
      <section className="rounded-2xl border-2 border-slate-200 bg-white p-5 space-y-4">
        <Head icon={Sparkles} n="8" t="Marketing Flags" d="Where it gets highlighted" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <Tog checked={basic.isFeatured} onChange={(v: boolean) => onChange({ isFeatured: v })} icon={Star} label="Featured" />
          <Tog checked={basic.isBestSeller} onChange={(v: boolean) => onChange({ isBestSeller: v })} icon={Award} label="Best Seller" />
          <Tog checked={basic.isNewArrival} onChange={(v: boolean) => onChange({ isNewArrival: v })} icon={Zap} label="New Arrival" />
          <Tog checked={basic.isOnSale} onChange={(v: boolean) => onChange({ isOnSale: v })} icon={TrendingUp} label="On Sale" />
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
function Tog({ checked, onChange, icon: Icon, label }: any) {
  return (
    <button type="button" onClick={() => onChange(!checked)}
      className={['flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition',
        checked ? 'border-amber-500 bg-amber-50 text-amber-800' : 'border-slate-200 bg-white text-slate-600 hover:border-amber-300'].join(' ')}>
      <Icon className={['h-5 w-5', checked ? 'text-amber-600 fill-amber-100' : 'text-slate-500'].join(' ')} />
      <span className="text-[11px] font-extrabold">{label}</span>
    </button>
  );
}
