import { useState } from 'react';
import {
  Droplets, Wind, Shield, Heart, Leaf, HandMetal, Sparkles,
  Trophy, Package, DollarSign, TrendingUp, Percent, AlertCircle,
  ChevronDown, ChevronUp, Info, Award,
} from 'lucide-react';
import { Input } from '@core/ui/Input';
import { formatPKRFull } from '@core/lib/format';
import type { ShoeWizardFeatures, ShoeWizardWarranty, ShoeWizardPricing } from '../../hooks/useShoeWizard';

interface Props {
  features: ShoeWizardFeatures;
  warranty: ShoeWizardWarranty;
  pricing: ShoeWizardPricing;
  categoryType: string;
  onChangeFeatures: (patch: Partial<ShoeWizardFeatures>) => void;
  onChangeWarranty: (patch: Partial<ShoeWizardWarranty>) => void;
  onChangePricing: (patch: Partial<ShoeWizardPricing>) => void;
  errors: string[];
}

const SPORTS = [
  'Running', 'Football', 'Cricket', 'Basketball', 'Tennis', 'Hiking',
  'Gym', 'Yoga', 'Cycling', 'Squash', 'Badminton', 'Volleyball', 'Golf',
];

const SURFACES = ['Turf', 'Grass', 'Court', 'Track', 'Concrete', 'Trail', 'Gravel', 'Sand', 'Ice', 'Indoor'];

const CARE_PRESETS = [
  'Wipe with damp cloth', 'Do not machine wash', 'Air dry only',
  'Use leather conditioner', 'Store with shoe trees', 'Keep away from direct sunlight',
  'Handwash in cold water', 'Do not tumble dry',
];

const MARKUPS = [10, 15, 20, 25, 30, 40, 50];

export function ShoeWizardStep4FeaturesPricing({
  features, warranty, pricing, categoryType,
  onChangeFeatures, onChangeWarranty, onChangePricing, errors,
}: Props) {
  const [adv, setAdv] = useState(Boolean(pricing.mrp || pricing.taxRate || pricing.memberPrice));
  const isSports = categoryType?.startsWith('SPORTS_') || false;

  const cost = Number(pricing.costPrice || 0);
  const sale = Number(pricing.retailPrice || 0);
  const profit = sale - cost;
  const margin = sale > 0 ? (profit / sale) * 100 : 0;
  const loss = cost > 0 && sale > 0 && profit < 0;

  const markup = (pct: number) => {
    if (!cost) return;
    onChangePricing({ retailPrice: Math.round(cost * (1 + pct / 100)) });
  };

  const togSurface = (s: string) => {
    const cur = features.playingSurface ?? [];
    onChangeFeatures({ playingSurface: cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s] });
  };

  return (
    <div className="space-y-5">
      {errors.length > 0 && (
        <div className="rounded-2xl bg-rose-50 border-2 border-rose-300 p-4 flex items-start gap-2.5">
          <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="text-sm text-rose-900">
            <div className="font-extrabold mb-1">Fix before continuing:</div>
            <ul className="list-disc pl-4 space-y-0.5 font-semibold">{errors.map((e, i) => <li key={i}>{e}</li>)}</ul>
          </div>
        </div>
      )}

      {/* FEATURES */}
      <section className="rounded-2xl border-2 border-slate-200 bg-white p-5 space-y-4">
        <SectionHead icon={Sparkles} title="Features" desc="What makes it special?" tone="violet" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <Feat checked={features.isWaterproof} onChange={(v: boolean) => onChangeFeatures({ isWaterproof: v })}
            icon={Droplets} label="Waterproof" tone="blue" />
          <Feat checked={features.isBreathable} onChange={(v: boolean) => onChangeFeatures({ isBreathable: v })}
            icon={Wind} label="Breathable" tone="sky" />
          <Feat checked={features.hasAirCushion} onChange={(v: boolean) => onChangeFeatures({ hasAirCushion: v })}
            icon={Sparkles} label="Air Cushion" tone="violet" />
          <Feat checked={features.hasArchSupport} onChange={(v: boolean) => onChangeFeatures({ hasArchSupport: v })}
            icon={Shield} label="Arch Support" tone="emerald" />
          <Feat checked={features.isOrthopedic} onChange={(v: boolean) => onChangeFeatures({ isOrthopedic: v })}
            icon={Heart} label="Orthopedic" tone="rose" />
          <Feat checked={features.isVegan} onChange={(v: boolean) => onChangeFeatures({ isVegan: v })}
            icon={Leaf} label="Vegan" tone="emerald" />
          <Feat checked={features.isHandmade} onChange={(v: boolean) => onChangeFeatures({ isHandmade: v })}
            icon={HandMetal} label="Handmade" tone="amber" />
        </div>
      </section>

      {/* SPORTS (conditional) */}
      {isSports && (
        <section className="rounded-2xl border-2 border-emerald-300 bg-gradient-to-br from-emerald-50 to-white p-5 space-y-4">
          <SectionHead icon={Trophy} title="Sports Details" desc="For sports shoes only" tone="emerald" />
          <div>
            <Lbl>Sport</Lbl>
            <div className="flex flex-wrap gap-1.5">
              {SPORTS.map((s) => {
                const a = features.sport === s;
                return (
                  <button key={s} type="button"
                    onClick={() => onChangeFeatures({ sport: a ? '' : s })}
                    className={['px-3 py-1.5 rounded-full border-2 text-xs font-extrabold transition',
                      a ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-200 bg-white text-slate-700 hover:border-emerald-300'].join(' ')}>
                    {s}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <Lbl>Playing Surface <span className="text-slate-400 normal-case font-bold">(multi-select)</span></Lbl>
            <div className="flex flex-wrap gap-1.5">
              {SURFACES.map((s) => {
                const a = features.playingSurface?.includes(s);
                return (
                  <button key={s} type="button" onClick={() => togSurface(s)}
                    className={['px-3 py-1.5 rounded-full border-2 text-xs font-extrabold transition',
                      a ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-200 bg-white text-slate-700 hover:border-emerald-300'].join(' ')}>
                    {s}
                  </button>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* WARRANTY & BOX */}
      <section className="rounded-2xl border-2 border-slate-200 bg-white p-5 space-y-4">
        <SectionHead icon={Shield} title="Warranty & Packaging" desc="What's included" tone="blue" />
        <div className="grid sm:grid-cols-2 gap-3">
          <Input label="Warranty (months)" type="number" min="0" value={warranty.warrantyMonths}
            onChange={(e) => onChangeWarranty({ warrantyMonths: e.target.value === '' ? '' : Number(e.target.value) })}
            placeholder="0 for no warranty" />
          <Input label="Warranty Details" placeholder="Manufacturing defects only" value={warranty.warrantyDetails}
            onChange={(e) => onChangeWarranty({ warrantyDetails: e.target.value })} />
        </div>

        <div>
          <Lbl>Care Instructions</Lbl>
          <textarea rows={2} value={warranty.careInstructions}
            onChange={(e) => onChangeWarranty({ careInstructions: e.target.value })}
            placeholder="How to care for the shoe..."
            className="w-full rounded-xl border-2 border-slate-200 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-blue-500" />
          <div className="mt-2 flex flex-wrap gap-1.5">
            {CARE_PRESETS.map((c) => (
              <button key={c} type="button"
                onClick={() => {
                  const current = warranty.careInstructions;
                  const next = current ? `${current}\n${c}` : c;
                  onChangeWarranty({ careInstructions: next });
                }}
                className="px-2 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-800 text-[10px] font-extrabold">
                + {c}
              </button>
            ))}
          </div>
        </div>

        <Input label="Cleaning Recommendation" placeholder="Use suede brush weekly" value={warranty.cleaningRecommendation}
          onChange={(e) => onChangeWarranty({ cleaningRecommendation: e.target.value })} />

        <div className="pt-3 border-t border-slate-100">
          <Lbl>What's in the box?</Lbl>
          <div className="grid grid-cols-3 gap-2">
            <Tog2 checked={warranty.includesBox} onChange={(v: boolean) => onChangeWarranty({ includesBox: v })}
              icon={Package} label="Original Box" />
            <Tog2 checked={warranty.includesDustBag} onChange={(v: boolean) => onChangeWarranty({ includesDustBag: v })}
              icon={Package} label="Dust Bag" />
            <Tog2 checked={warranty.includesExtraLaces} onChange={(v: boolean) => onChangeWarranty({ includesExtraLaces: v })}
              icon={Package} label="Extra Laces" />
          </div>
        </div>

        {warranty.includesBox && (
          <Input label="Box Colour (optional)" placeholder="Orange Nike box" value={warranty.boxColor}
            onChange={(e) => onChangeWarranty({ boxColor: e.target.value })} />
        )}
      </section>

      {/* PRICING */}
      <section className="rounded-2xl border-2 border-emerald-300 bg-gradient-to-br from-emerald-50 to-white p-5 space-y-4">
        <SectionHead icon={DollarSign} title="Pricing" desc="Cost and retail price" tone="emerald" />

        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <Lbl>Cost Price</Lbl>
            <input type="number" step="0.01" inputMode="decimal" value={pricing.costPrice}
              onChange={(e) => onChangePricing({ costPrice: e.target.value === '' ? '' : Number(e.target.value) })} placeholder="0"
              className="h-14 w-full rounded-2xl border-2 border-slate-200 bg-white px-4 text-2xl font-extrabold tabular-nums focus:outline-none focus:border-slate-500" />
          </div>
          <div>
            <label className="block text-xs font-extrabold uppercase tracking-wider text-emerald-700 mb-1.5">Retail Price *</label>
            <input type="number" step="0.01" inputMode="decimal" value={pricing.retailPrice}
              onChange={(e) => onChangePricing({ retailPrice: e.target.value === '' ? '' : Number(e.target.value) })} placeholder="0"
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
            loss ? 'bg-rose-50 border-rose-300' : margin >= 20 ? 'bg-emerald-50 border-emerald-300' : 'bg-amber-50 border-amber-300'].join(' ')}>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <TrendingUp className={['h-6 w-6', loss ? 'text-rose-700' : margin >= 20 ? 'text-emerald-700' : 'text-amber-700'].join(' ')} />
                <div>
                  <div className={['text-[10px] uppercase tracking-wider font-extrabold',
                    loss ? 'text-rose-700' : margin >= 20 ? 'text-emerald-700' : 'text-amber-700'].join(' ')}>
                    {loss ? 'Loss warning' : 'Profit per pair'}
                  </div>
                  <div className="text-2xl font-extrabold tabular-nums">{formatPKRFull(profit)}</div>
                </div>
              </div>
              <div className={['text-3xl font-extrabold tabular-nums',
                loss ? 'text-rose-700' : margin >= 20 ? 'text-emerald-700' : 'text-amber-700'].join(' ')}>
                {margin.toFixed(1)}%
              </div>
            </div>
          </div>
        )}

        <button type="button" onClick={() => setAdv((v) => !v)}
          className="w-full py-2.5 rounded-xl bg-white border-2 border-slate-200 hover:border-emerald-300 text-xs font-extrabold text-slate-700 inline-flex items-center justify-center gap-1.5">
          {adv ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          {adv ? 'Hide extra rates' : 'MRP / Wholesale / Member / Tax'}
        </button>

        {adv && (
          <div className="grid sm:grid-cols-2 gap-3">
            <Input label="MRP (printed price)" type="number" step="0.01" value={pricing.mrp}
              onChange={(e) => onChangePricing({ mrp: e.target.value === '' ? '' : Number(e.target.value) })} placeholder="Optional" />
            <Input label="Wholesale Price" type="number" step="0.01" value={pricing.wholesalePrice}
              onChange={(e) => onChangePricing({ wholesalePrice: e.target.value === '' ? '' : Number(e.target.value) })} placeholder="Bulk price" />
            <Input label="Member / Loyalty Price" type="number" step="0.01" value={pricing.memberPrice}
              onChange={(e) => onChangePricing({ memberPrice: e.target.value === '' ? '' : Number(e.target.value) })} placeholder="VIP customers" />
            <Input label="Tax %" type="number" step="0.01" value={pricing.taxRate}
              onChange={(e) => onChangePricing({ taxRate: e.target.value === '' ? '' : Number(e.target.value) })}
              placeholder="0" leftIcon={<Percent className="h-4 w-4 text-slate-400" />} />
          </div>
        )}
      </section>
    </div>
  );
}

function SectionHead({ icon: Icon, title, desc, tone }: any) {
  const tones: Record<string, string> = {
    violet: 'from-violet-500 to-purple-700',
    emerald: 'from-emerald-500 to-teal-700',
    blue: 'from-blue-500 to-cyan-700',
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

function Feat({ checked, onChange, icon: Icon, label, tone }: any) {
  const tones: Record<string, string> = {
    blue: 'border-blue-500 bg-blue-50 text-blue-800',
    sky: 'border-sky-500 bg-sky-50 text-sky-800',
    violet: 'border-violet-500 bg-violet-50 text-violet-800',
    emerald: 'border-emerald-500 bg-emerald-50 text-emerald-800',
    rose: 'border-rose-500 bg-rose-50 text-rose-800',
    amber: 'border-amber-500 bg-amber-50 text-amber-800',
  };
  return (
    <button type="button" onClick={() => onChange(!checked)}
      className={['flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition',
        checked ? tones[tone] : 'border-slate-200 bg-white text-slate-600 hover:border-slate-400'].join(' ')}>
      <Icon className={['h-5 w-5', checked ? '' : 'text-slate-500'].join(' ')} />
      <span className="text-[11px] font-extrabold text-center">{label}</span>
    </button>
  );
}

function Tog2({ checked, onChange, icon: Icon, label }: any) {
  return (
    <label className={['flex items-center gap-2 p-2.5 rounded-xl border-2 cursor-pointer transition',
      checked ? 'border-emerald-500 bg-emerald-50 text-emerald-900' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-400'].join(' ')}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 rounded" />
      <Icon className={['h-4 w-4', checked ? 'text-emerald-600' : 'text-slate-500'].join(' ')} />
      <span className="text-xs font-extrabold">{label}</span>
    </label>
  );
}
