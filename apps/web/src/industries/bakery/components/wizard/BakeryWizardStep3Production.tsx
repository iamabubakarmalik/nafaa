import { useState } from 'react';
import {
  ChefHat, Clock, Snowflake, ArrowRight, ArrowLeft, Save,
  AlertTriangle, Heart, Plus, X, Wheat, Egg, Milk, Nut,
  Flame, Info,
} from 'lucide-react';
import { Button } from '@core/ui/Button';
import type { BakeryWizardProduction } from '../../hooks/useBakeryWizard';

// Common allergens
const COMMON_ALLERGENS = [
  'Egg', 'Milk / Dairy', 'Wheat', 'Nuts', 'Peanuts', 'Soy', 'Sesame',
  'Gluten', 'Sulphites', 'Mustard', 'Fish', 'Shellfish',
];

interface Props {
  production: BakeryWizardProduction;
  onChange: (patch: Partial<BakeryWizardProduction>) => void;
  onToggleAllergen: (allergen: string) => void;
  onBack: () => void;
  onSubmit: () => void;
  submitting: boolean;
  validation: { valid: boolean; errors: string[] };
  allValid: boolean;
}

export function BakeryWizardStep3Production({
  production, onChange, onToggleAllergen, onBack, onSubmit,
  submitting, validation, allValid,
}: Props) {
  const [customAllergen, setCustomAllergen] = useState('');

  const addCustomAllergen = () => {
    if (!customAllergen.trim()) return;
    onToggleAllergen(customAllergen.trim());
    setCustomAllergen('');
  };

  return (
    <div className="space-y-5">
      {/* ─── TIMING ─── */}
      <section className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-slate-200 dark:border-neutral-800 shadow-sm p-5 space-y-4">
        <div className="flex items-center gap-3 pb-3 border-b-2 border-slate-100 dark:border-neutral-800">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 text-white flex items-center justify-center shadow-md">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-slate-900 dark:text-white text-lg leading-tight">Production Timing</h3>
            <p className="text-[11px] text-slate-500 font-semibold">Prep time, advance order, min/max quantity</p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <TimeInput
            label="Prep Time"
            unit="hours"
            emoji="⏱️"
            value={production.prepTimeHours}
            onChange={(v: number | '') => onChange({ prepTimeHours: v })}
            tone="orange"
          />
          <TimeInput
            label="Advance Order"
            unit="hours"
            emoji="📅"
            value={production.advanceOrderHours}
            onChange={(v: number | '') => onChange({ advanceOrderHours: v })}
            tone="amber"
          />
          <TimeInput
            label="Min Order Qty"
            unit=""
            emoji="📦"
            value={production.minOrderQty}
            onChange={(v: number | '') => onChange({ minOrderQty: v })}
            tone="blue"
          />
          <TimeInput
            label="Max Order Qty"
            unit=""
            emoji="📦"
            value={production.maxOrderQty}
            onChange={(v: number | '') => onChange({ maxOrderQty: v })}
            tone="cyan"
          />
        </div>
      </section>

      {/* ─── SHELF LIFE ─── */}
      <section className="rounded-3xl bg-gradient-to-br from-cyan-50 via-blue-50 to-sky-50 dark:from-cyan-950/30 dark:via-blue-950/30 dark:to-sky-950/30 border-2 border-cyan-200 dark:border-cyan-800 shadow-sm p-5 space-y-4">
        <div className="flex items-center gap-3 pb-3 border-b-2 border-cyan-200/60 dark:border-cyan-800/60">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 text-white flex items-center justify-center shadow-md">
            <Snowflake className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-slate-900 dark:text-white text-lg leading-tight">Shelf Life & Storage</h3>
            <p className="text-[11px] text-slate-500 font-semibold">Freshness expiry tracking automatic hoga</p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <TimeInput
            label="Shelf Life"
            unit="hours"
            emoji="⏱️"
            value={production.shelfLifeHours}
            onChange={(v: number | '') => onChange({ shelfLifeHours: v })}
            tone="cyan"
          />
          <TimeInput
            label="Shelf Life"
            unit="days"
            emoji="📅"
            value={production.shelfLifeDays}
            onChange={(v: number | '') => onChange({ shelfLifeDays: v })}
            tone="blue"
          />
        </div>

        <button
          type="button"
          onClick={() => onChange({ requiresRefrigeration: !production.requiresRefrigeration })}
          className={[
            'w-full p-3 rounded-xl border-2 flex items-center gap-3 transition-all',
            production.requiresRefrigeration
              ? 'bg-gradient-to-r from-cyan-500 to-blue-600 border-cyan-500 text-white shadow-md'
              : 'bg-white dark:bg-neutral-800 border-slate-200 dark:border-neutral-700 hover:border-cyan-300',
          ].join(' ')}
        >
          <Snowflake className={'h-5 w-5 ' + (production.requiresRefrigeration ? 'text-white' : 'text-slate-500')} />
          <div className="flex-1 text-left">
            <div className={'font-extrabold text-sm ' + (production.requiresRefrigeration ? 'text-white' : 'text-slate-900 dark:text-white')}>
              Requires Refrigeration
            </div>
            <div className={'text-[10px] font-semibold ' + (production.requiresRefrigeration ? 'text-white/85' : 'text-slate-500')}>
              Cake, cream, dairy products
            </div>
          </div>
          {production.requiresRefrigeration && <span className="text-white text-lg">✓</span>}
        </button>
      </section>

      {/* ─── DIETARY BADGES ─── */}
      <section className="rounded-3xl bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50 dark:from-emerald-950/30 dark:via-green-950/30 dark:to-teal-950/30 border-2 border-emerald-200 dark:border-emerald-800 shadow-sm p-5 space-y-4">
        <div className="flex items-center gap-3 pb-3 border-b-2 border-emerald-200/60 dark:border-emerald-800/60">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 text-white flex items-center justify-center shadow-md">
            <Heart className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-slate-900 dark:text-white text-lg leading-tight">Dietary Badges</h3>
            <p className="text-[11px] text-slate-500 font-semibold">Customer catalog mein highlight badges dikhengey</p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <DietBadge
            active={production.isEggless}
            onToggle={(v) => onChange({ isEggless: v, containsEgg: v ? false : production.containsEgg })}
            emoji="🥚"
            label="Eggless"
            desc="No eggs"
            tone="emerald"
          />
          <DietBadge
            active={production.isVegan}
            onToggle={(v) => onChange({ isVegan: v })}
            emoji="🌱"
            label="Vegan"
            desc="Plant-based"
            tone="green"
          />
          <DietBadge
            active={production.isSugarFree}
            onToggle={(v) => onChange({ isSugarFree: v })}
            emoji="🍬"
            label="Sugar-Free"
            desc="No added sugar"
            tone="blue"
          />
          <DietBadge
            active={production.isHalal}
            onToggle={(v) => onChange({ isHalal: v })}
            emoji="☪️"
            label="Halal"
            desc="Halal certified"
            tone="teal"
          />
        </div>
      </section>

      {/* ─── ALLERGENS ─── */}
      <section className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-slate-200 dark:border-neutral-800 shadow-sm p-5 space-y-4">
        <div className="flex items-center gap-3 pb-3 border-b-2 border-slate-100 dark:border-neutral-800">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center shadow-md">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-slate-900 dark:text-white text-lg leading-tight">Allergen Warnings</h3>
            <p className="text-[11px] text-slate-500 font-semibold">Customer allergy alert ke liye</p>
          </div>
          {production.allergens.length > 0 && (
            <span className="ml-auto px-2 py-0.5 rounded bg-amber-100 text-amber-700 text-[10px] font-extrabold">
              {production.allergens.length} listed
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <ContainsToggle
            active={production.containsEgg}
            onToggle={(v) => onChange({ containsEgg: v })}
            icon={Egg}
            label="Contains Egg"
            tone="amber"
          />
          <ContainsToggle
            active={production.containsDairy}
            onToggle={(v) => onChange({ containsDairy: v })}
            icon={Milk}
            label="Contains Dairy"
            tone="blue"
          />
          <ContainsToggle
            active={production.containsGluten}
            onToggle={(v) => onChange({ containsGluten: v })}
            icon={Wheat}
            label="Contains Gluten"
            tone="orange"
          />
          <ContainsToggle
            active={production.containsNuts}
            onToggle={(v) => onChange({ containsNuts: v })}
            icon={Nut}
            label="Contains Nuts"
            tone="rose"
          />
        </div>

        <div className="pt-3 border-t border-slate-100 dark:border-neutral-800">
          <div className="text-[10px] uppercase tracking-wider font-extrabold text-amber-700 mb-2">
            Additional Allergens
          </div>
          <div className="flex flex-wrap gap-1.5">
            {COMMON_ALLERGENS.map((a) => {
              const active = production.allergens.includes(a);
              return (
                <button
                  key={a}
                  type="button"
                  onClick={() => onToggleAllergen(a)}
                  className={[
                    'inline-flex items-center px-2.5 py-1 rounded-lg border-2 text-xs font-extrabold transition-all',
                    active
                      ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/40 text-amber-800 shadow-sm ring-2 ring-amber-200'
                      : 'border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-slate-700 hover:border-amber-300',
                  ].join(' ')}
                >
                  {a}
                </button>
              );
            })}
          </div>

          <div className="flex gap-2 mt-3">
            <input
              value={customAllergen}
              onChange={(e) => setCustomAllergen(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustomAllergen(); } }}
              placeholder="Custom allergen..."
              className="flex-1 h-10 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-semibold focus:outline-none focus:border-amber-500"
            />
            <button
              onClick={addCustomAllergen}
              disabled={!customAllergen.trim()}
              className="h-10 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-extrabold inline-flex items-center gap-1 disabled:opacity-50 transition"
            >
              <Plus className="h-3.5 w-3.5" /> Add
            </button>
          </div>

          {production.allergens.length > 0 && (
            <div className="mt-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 p-2">
              <div className="text-[9px] uppercase font-extrabold text-amber-700 mb-1">Listed</div>
              <div className="flex flex-wrap gap-1">
                {production.allergens.map((a) => (
                  <span
                    key={a}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white dark:bg-neutral-800 border border-amber-300 text-xs font-extrabold text-amber-900"
                  >
                    ⚠️ {a}
                    <button
                      onClick={() => onToggleAllergen(a)}
                      className="h-4 w-4 rounded hover:bg-amber-200 flex items-center justify-center"
                    >
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ─── NUTRITION ─── */}
      <section className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-slate-200 dark:border-neutral-800 shadow-sm p-5 space-y-3">
        <div className="flex items-center gap-3 pb-3 border-b-2 border-slate-100 dark:border-neutral-800">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-red-500 to-rose-600 text-white flex items-center justify-center shadow-md">
            <Flame className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-slate-900 dark:text-white text-lg leading-tight">Nutrition (optional)</h3>
            <p className="text-[11px] text-slate-500 font-semibold">Basic calorie info</p>
          </div>
        </div>

        <TimeInput
          label="Calories per Serving"
          unit="kcal"
          emoji="🔥"
          value={production.caloriesPerServing}
          onChange={(v: number | '') => onChange({ caloriesPerServing: v })}
          tone="rose"
        />
      </section>

      {/* ─── VALIDATION + SAVE ─── */}
      {!validation.valid && validation.errors.length > 0 && (
        <div className="rounded-2xl bg-rose-50 dark:bg-rose-950/30 border-2 border-rose-300 dark:border-rose-800 p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-rose-700 shrink-0 mt-0.5" />
          <div className="flex-1 text-sm text-rose-900 dark:text-rose-200">
            <div className="font-extrabold mb-1">Fix these:</div>
            <ul className="list-disc list-inside space-y-0.5 text-xs">
              {validation.errors.map((e, i) => (<li key={i}>{e}</li>))}
            </ul>
          </div>
        </div>
      )}

      <div className="rounded-2xl bg-gradient-to-r from-pink-600 via-fuchsia-600 to-purple-700 text-white shadow-xl p-5 flex items-center justify-between flex-wrap gap-3">
        <Button variant="secondary" onClick={onBack} className="bg-white/15 text-white hover:bg-white/25 border-white/20">
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="text-xs font-bold text-pink-100">
            Ready to publish your bakery product?
          </div>
          <Button
            onClick={onSubmit}
            disabled={!allValid || submitting}
            loading={submitting}
            className="bg-white text-fuchsia-800 hover:bg-pink-50 shadow-lg"
          >
            <Save className="h-4 w-4" /> Save Everything
          </Button>
        </div>
      </div>
    </div>
  );
}

function TimeInput({ label, unit, emoji, value, onChange, tone }: {
  label: string; unit: string; emoji: string;
  value: number | ''; onChange: (v: number | '') => void;
  tone: string;
}) {
  const tones: Record<string, string> = {
    orange: 'border-orange-300 focus:border-orange-500',
    amber: 'border-amber-300 focus:border-amber-500',
    blue: 'border-blue-300 focus:border-blue-500',
    cyan: 'border-cyan-300 focus:border-cyan-500',
    rose: 'border-rose-300 focus:border-rose-500',
  };
  return (
    <div>
      <label className="block text-[11px] font-extrabold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
        {emoji} {label}
      </label>
      <div className="relative">
        <input
          type="number"
          step="1"
          min="0"
          value={value}
          onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
          placeholder="0"
          className={'h-11 w-full rounded-xl border-2 bg-white dark:bg-neutral-800 pl-3 pr-14 text-sm font-extrabold tabular-nums focus:outline-none ' + tones[tone]}
        />
        {unit && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-extrabold text-slate-500 uppercase">
            {unit}
          </span>
        )}
      </div>
    </div>
  );
}

function DietBadge({ active, onToggle, emoji, label, desc, tone }: {
  active: boolean; onToggle: (v: boolean) => void;
  emoji: string; label: string; desc: string; tone: string;
}) {
  const tones: Record<string, string> = {
    emerald: 'from-emerald-500 to-green-600 border-emerald-500',
    green: 'from-green-500 to-lime-600 border-green-500',
    blue: 'from-blue-500 to-cyan-600 border-blue-500',
    teal: 'from-teal-500 to-cyan-600 border-teal-500',
  };
  return (
    <button
      type="button"
      onClick={() => onToggle(!active)}
      className={[
        'p-4 rounded-2xl border-2 text-center transition-all',
        active
          ? 'bg-gradient-to-br ' + tones[tone] + ' text-white shadow-md scale-105'
          : 'border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:border-slate-300 hover:scale-105',
      ].join(' ')}
    >
      <div className="text-3xl mb-1">{emoji}</div>
      <div className={'font-extrabold text-sm ' + (active ? 'text-white' : 'text-slate-900 dark:text-white')}>
        {label}
      </div>
      <div className={'text-[10px] font-semibold mt-0.5 ' + (active ? 'text-white/85' : 'text-slate-500')}>
        {desc}
      </div>
    </button>
  );
}

function ContainsToggle({ active, onToggle, icon: Icon, label, tone }: {
  active: boolean; onToggle: (v: boolean) => void;
  icon: any; label: string; tone: string;
}) {
  const tones: Record<string, string> = {
    amber: 'from-amber-500 to-orange-600 border-amber-500',
    blue: 'from-blue-500 to-cyan-600 border-blue-500',
    orange: 'from-orange-500 to-red-600 border-orange-500',
    rose: 'from-rose-500 to-pink-600 border-rose-500',
  };
  return (
    <button
      type="button"
      onClick={() => onToggle(!active)}
      className={[
        'p-2.5 rounded-xl border-2 text-left transition-all flex items-center gap-2',
        active
          ? 'bg-gradient-to-br ' + tones[tone] + ' text-white shadow-md'
          : 'border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:border-slate-300',
      ].join(' ')}
    >
      <Icon className={'h-4 w-4 ' + (active ? 'text-white' : 'text-slate-500')} />
      <div className={'font-extrabold text-xs ' + (active ? 'text-white' : 'text-slate-900 dark:text-white')}>
        {label}
      </div>
    </button>
  );
}
