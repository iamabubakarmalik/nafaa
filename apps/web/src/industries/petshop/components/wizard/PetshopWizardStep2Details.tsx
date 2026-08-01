import { useState } from 'react';
import {
  Sparkles, Beef, Wheat, Leaf, Ruler, Palette, Droplets,
  Plus, X, Info, Fish, Zap,
} from 'lucide-react';
import { Input } from '@core/ui/Input';
import type { PetshopWizardDetails } from '../../hooks/usePetshopWizard';
import { isFoodCategory, isAccessoryCategory, isAquariumCategory, isMedicineCategory } from '../../hooks/usePetshopWizard';

interface Props {
  details: PetshopWizardDetails;
  onChange: (patch: Partial<PetshopWizardDetails>) => void;
  categoryType: string;
  errors: string[];
}

const PROTEIN_SOURCES = ['Chicken', 'Beef', 'Lamb', 'Fish', 'Salmon', 'Tuna', 'Turkey', 'Duck', 'Rabbit', 'Venison', 'Vegetarian', 'Plant-based'];
const FLAVORS = ['Chicken', 'Beef', 'Lamb', 'Fish', 'Salmon', 'Tuna', 'Mixed', 'Vegetable', 'Cheese', 'Liver'];
const PACK_SIZES = ['100g', '250g', '400g', '500g', '1kg', '2kg', '3kg', '4kg', '5kg', '7.5kg', '10kg', '15kg', '20kg'];
const BREED_SIZES = ['Extra Small', 'Small', 'Medium', 'Large', 'Extra Large', 'Giant'];
const BENEFITS = [
  'Immunity Boost', 'Joint Health', 'Digestive Support', 'Skin & Coat', 'Weight Control',
  'Dental Health', 'Brain Development', 'Heart Health', 'Eye Health', 'Sensitive Stomach',
  'High Protein', 'Low Fat', 'High Fiber', 'Rich in Omega-3', 'Antioxidants', 'Probiotics',
];
const COLORS = ['Red', 'Blue', 'Green', 'Yellow', 'Pink', 'Black', 'White', 'Grey', 'Brown', 'Multi-color'];
const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
const MATERIALS = ['Plastic', 'Rubber', 'Fabric', 'Metal', 'Wood', 'Leather', 'Rope', 'Nylon', 'Ceramic', 'Silicone'];
const TANK_SHAPES = ['Rectangular', 'Bow Front', 'Cube', 'Cylinder', 'Hexagonal', 'Bowl', 'Custom'];

export function PetshopWizardStep2Details({ details, onChange, categoryType }: Props) {
  const [customBenefit, setCustomBenefit] = useState('');

  const showFood = isFoodCategory(categoryType);
  const showAccessory = isAccessoryCategory(categoryType);
  const showAquarium = isAquariumCategory(categoryType);
  const showMedicine = isMedicineCategory(categoryType);
  const showNothingSpecific = !showFood && !showAccessory && !showAquarium && !showMedicine;

  const tog = (field: 'benefits' | 'suitedForBreedSizes', val: string) => {
    const cur = (details[field] ?? []) as string[];
    onChange({ [field]: cur.includes(val) ? cur.filter((x) => x !== val) : [...cur, val] } as any);
  };

  const addBenefit = (v: string) => {
    const t = v.trim();
    if (!t) return;
    const cur = details.benefits ?? [];
    if (cur.includes(t)) return;
    onChange({ benefits: [...cur, t] });
    setCustomBenefit('');
  };

  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-amber-50 border-2 border-amber-200 p-4 flex items-start gap-3">
        <Info className="h-5 w-5 text-amber-700 shrink-0 mt-0.5" />
        <div className="text-sm text-amber-900">
          <div className="font-extrabold mb-1">Smart fields</div>
          <div className="font-semibold">
            Fields adapt to the category you picked
            {showFood && ' — showing food nutrition details.'}
            {showAccessory && ' — showing size, color and material.'}
            {showAquarium && ' — showing tank capacity and filter specs.'}
            {showMedicine && ' — medicine details are in the next step.'}
            {showNothingSpecific && ' — this category needs no extra details. You can skip ahead.'}
          </div>
        </div>
      </div>

      {/* FOOD FIELDS */}
      {showFood && (
        <>
          <section className="rounded-2xl border-2 border-slate-200 bg-white p-5 space-y-4">
            <SectionHead icon={Wheat} title="Pack & Serving" tone="amber" />
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <Lbl>Pack Size</Lbl>
                <input list="packSizes" value={details.packSize}
                  onChange={(e) => onChange({ packSize: e.target.value })} placeholder="4kg"
                  className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-amber-500" />
                <datalist id="packSizes">{PACK_SIZES.map((s) => <option key={s} value={s} />)}</datalist>
              </div>
              <div>
                <Lbl>Weight (kg)</Lbl>
                <input type="number" step="0.01" value={details.weightKg}
                  onChange={(e) => onChange({ weightKg: e.target.value === '' ? '' : Number(e.target.value) })}
                  placeholder="4"
                  className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-amber-500" />
              </div>
              <div>
                <Lbl>Flavor</Lbl>
                <input list="flavors" value={details.flavor}
                  onChange={(e) => onChange({ flavor: e.target.value })} placeholder="Chicken"
                  className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-amber-500" />
                <datalist id="flavors">{FLAVORS.map((f) => <option key={f} value={f} />)}</datalist>
              </div>
              <div>
                <Lbl>Primary Protein</Lbl>
                <input list="proteins" value={details.proteinSource}
                  onChange={(e) => onChange({ proteinSource: e.target.value })} placeholder="Chicken"
                  className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-amber-500" />
                <datalist id="proteins">{PROTEIN_SOURCES.map((p) => <option key={p} value={p} />)}</datalist>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border-2 border-slate-200 bg-white p-5 space-y-4">
            <SectionHead icon={Beef} title="Nutrition Analysis" tone="rose" />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Input label="Protein %" type="number" step="0.1" value={details.proteinPct}
                onChange={(e) => onChange({ proteinPct: e.target.value === '' ? '' : Number(e.target.value) })} placeholder="26" />
              <Input label="Fat %" type="number" step="0.1" value={details.fatPct}
                onChange={(e) => onChange({ fatPct: e.target.value === '' ? '' : Number(e.target.value) })} placeholder="15" />
              <Input label="Fiber %" type="number" step="0.1" value={details.fiberPct}
                onChange={(e) => onChange({ fiberPct: e.target.value === '' ? '' : Number(e.target.value) })} placeholder="4" />
              <Input label="Moisture %" type="number" step="0.1" value={details.moisturePct}
                onChange={(e) => onChange({ moisturePct: e.target.value === '' ? '' : Number(e.target.value) })} placeholder="10" />
            </div>
            <div>
              <Lbl>Ingredients</Lbl>
              <textarea rows={2} value={details.ingredients}
                onChange={(e) => onChange({ ingredients: e.target.value })}
                placeholder="Chicken meal, brown rice, corn, vegetable oil..."
                className="w-full rounded-xl border-2 border-slate-200 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-rose-500" />
            </div>
          </section>

          <section className="rounded-2xl border-2 border-slate-200 bg-white p-5 space-y-4">
            <SectionHead icon={Leaf} title="Diet Attributes" tone="emerald" />
            <div className="grid sm:grid-cols-3 gap-2">
              <Check2 checked={details.isGrainFree} onChange={(v: boolean) => onChange({ isGrainFree: v })} label="Grain Free" emoji="🌾" />
              <Check2 checked={details.isOrganic} onChange={(v: boolean) => onChange({ isOrganic: v })} label="Organic" emoji="🌿" />
              <Check2 checked={details.isHypoallergenic} onChange={(v: boolean) => onChange({ isHypoallergenic: v })} label="Hypoallergenic" emoji="🌸" />
            </div>

            <div>
              <Lbl>Benefits <span className="text-slate-400 normal-case font-bold">(multi-select)</span></Lbl>
              <div className="flex flex-wrap gap-1.5">
                {BENEFITS.map((b) => {
                  const a = details.benefits?.includes(b);
                  return (
                    <button key={b} type="button" onClick={() => tog('benefits', b)}
                      className={['px-3 py-1.5 rounded-full border-2 text-xs font-extrabold transition',
                        a ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-200 bg-white text-slate-700 hover:border-emerald-300'].join(' ')}>
                      {a ? '✓ ' : '+ '}{b}
                    </button>
                  );
                })}
              </div>
              <div className="flex gap-2 mt-2">
                <input value={customBenefit} onChange={(e) => setCustomBenefit(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addBenefit(customBenefit)}
                  placeholder="Custom benefit..."
                  className="h-10 flex-1 rounded-xl border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-emerald-500" />
                <button type="button" onClick={() => addBenefit(customBenefit)} disabled={!customBenefit.trim()}
                  className="h-10 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm inline-flex items-center gap-1 disabled:opacity-50">
                  <Plus className="h-4 w-4" /> Add
                </button>
              </div>
            </div>

            <div>
              <Lbl>Suited For Breed Sizes</Lbl>
              <div className="flex flex-wrap gap-1.5">
                {BREED_SIZES.map((s) => {
                  const a = details.suitedForBreedSizes?.includes(s);
                  return (
                    <button key={s} type="button" onClick={() => tog('suitedForBreedSizes', s)}
                      className={['px-3 py-1.5 rounded-full border-2 text-xs font-extrabold transition',
                        a ? 'border-amber-500 bg-amber-500 text-white' : 'border-slate-200 bg-white text-slate-700 hover:border-amber-300'].join(' ')}>
                      {s}
                    </button>
                  );
                })}
              </div>
            </div>

            <Input label="Suitable Age Range" placeholder="e.g. 2 months to 12 months" value={details.suitedForAges}
              onChange={(e) => onChange({ suitedForAges: e.target.value })} />
          </section>
        </>
      )}

      {/* ACCESSORY FIELDS */}
      {showAccessory && (
        <section className="rounded-2xl border-2 border-slate-200 bg-white p-5 space-y-4">
          <SectionHead icon={Ruler} title="Accessory Details" tone="violet" />
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Lbl>Size</Lbl>
              <div className="flex flex-wrap gap-1.5">
                {SIZES.map((s) => {
                  const a = details.size === s;
                  return (
                    <button key={s} type="button" onClick={() => onChange({ size: s })}
                      className={['px-4 py-2 rounded-xl border-2 text-sm font-extrabold transition',
                        a ? 'border-violet-500 bg-violet-500 text-white' : 'border-slate-200 bg-white text-slate-700 hover:border-violet-300'].join(' ')}>
                      {s}
                    </button>
                  );
                })}
              </div>
            </div>
            <Input label="Dimensions" placeholder="30 × 20 × 15 cm" value={details.dimensions}
              onChange={(e) => onChange({ dimensions: e.target.value })} />
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Lbl>Color <Palette className="h-3 w-3 inline text-violet-500" /></Lbl>
              <div className="flex flex-wrap gap-1.5">
                {COLORS.map((c) => {
                  const a = details.color === c;
                  return (
                    <button key={c} type="button" onClick={() => onChange({ color: c })}
                      className={['px-3 py-1.5 rounded-full border-2 text-xs font-extrabold transition',
                        a ? 'border-violet-500 bg-violet-500 text-white' : 'border-slate-200 bg-white text-slate-700 hover:border-violet-300'].join(' ')}>
                      {c}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <Lbl>Material</Lbl>
              <input list="materials" value={details.material}
                onChange={(e) => onChange({ material: e.target.value })} placeholder="Nylon, Rubber..."
                className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-violet-500" />
              <datalist id="materials">{MATERIALS.map((m) => <option key={m} value={m} />)}</datalist>
            </div>
          </div>
        </section>
      )}

      {/* AQUARIUM FIELDS */}
      {showAquarium && (
        <section className="rounded-2xl border-2 border-slate-200 bg-white p-5 space-y-4">
          <SectionHead icon={Fish} title="Aquarium Specs" tone="sky" />
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Lbl>Tank Capacity (L)</Lbl>
              <input type="number" value={details.tankCapacityLiters}
                onChange={(e) => onChange({ tankCapacityLiters: e.target.value === '' ? '' : Number(e.target.value) })}
                placeholder="60"
                className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-sky-500" />
            </div>
            <div>
              <Lbl>Tank Shape</Lbl>
              <select value={details.tankShape} onChange={(e) => onChange({ tankShape: e.target.value })}
                className="h-11 w-full rounded-xl border-2 border-slate-200 bg-white px-3 text-sm font-bold focus:outline-none focus:border-sky-500">
                <option value="">Select shape</option>
                {TANK_SHAPES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <Input label="Filter Capacity" placeholder="500 L/hour" value={details.filterCapacity}
              onChange={(e) => onChange({ filterCapacity: e.target.value })}
              leftIcon={<Droplets className="h-4 w-4 text-sky-400" />} />
            <Input label="Wattage" placeholder="15W" value={details.wattage}
              onChange={(e) => onChange({ wattage: e.target.value })}
              leftIcon={<Zap className="h-4 w-4 text-amber-400" />} />
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <Input label="Dimensions" placeholder="60 × 30 × 40 cm" value={details.dimensions}
              onChange={(e) => onChange({ dimensions: e.target.value })} />
            <Input label="Color" placeholder="Clear, Black frame..." value={details.color}
              onChange={(e) => onChange({ color: e.target.value })} />
          </div>
        </section>
      )}

      {/* MEDICINE placeholder */}
      {showMedicine && (
        <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-8 text-center">
          <Sparkles className="h-10 w-10 text-amber-500 mx-auto mb-2" />
          <div className="font-extrabold text-slate-800">Medicine details are on the next step</div>
          <div className="text-xs text-slate-500 font-semibold mt-1">
            Prescription, batch number, dosage and expiry live in step 3.
          </div>
        </div>
      )}

      {/* Nothing specific */}
      {showNothingSpecific && (
        <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-8 text-center">
          <Info className="h-10 w-10 text-slate-400 mx-auto mb-2" />
          <div className="font-extrabold text-slate-700">No extra details needed</div>
          <div className="text-xs text-slate-500 font-semibold mt-1">Continue to the next step</div>
        </div>
      )}
    </div>
  );
}

function SectionHead({ icon: Icon, title, tone }: any) {
  const tones: Record<string, string> = {
    amber: 'from-amber-500 to-orange-700',
    rose: 'from-rose-500 to-red-700',
    emerald: 'from-emerald-500 to-teal-700',
    violet: 'from-violet-500 to-purple-700',
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
function Check2({ checked, onChange, label, emoji }: any) {
  return (
    <label className={['flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition',
      checked ? 'border-emerald-400 bg-emerald-50' : 'border-slate-200 bg-white hover:border-emerald-300'].join(' ')}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-5 w-5 rounded" />
      <span className="text-2xl">{emoji}</span>
      <span className="font-extrabold text-sm text-slate-900">{label}</span>
    </label>
  );
}
