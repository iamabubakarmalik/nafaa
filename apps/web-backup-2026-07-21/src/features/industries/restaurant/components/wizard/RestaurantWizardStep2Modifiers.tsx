import { useQuery } from '@tanstack/react-query';
import {
  Flame, Sparkles, AlertCircle, Leaf, Milk, Egg, Fish, Beef,
  Wheat, Info, Award, Check, Plus,
} from 'lucide-react';
import type {
  RestaurantWizardModifiers,
} from '../../hooks/useRestaurantWizard';
import type { SpiceLevel, DietaryTag } from '../../api/menu-items.api';
import { modifiersApi } from '../../api/modifiers.api';

interface Props {
  modifiers: RestaurantWizardModifiers;
  onChange: (patch: Partial<RestaurantWizardModifiers>) => void;
  onToggleDietaryTag: (tag: DietaryTag) => void;
  onToggleModifierGroup: (groupId: string) => void;
  errors: string[];
}

const SPICE_LEVELS: { value: SpiceLevel; label: string; emoji: string; color: string }[] = [
  { value: 'MILD', label: 'Mild', emoji: '🌶️', color: 'bg-green-500' },
  { value: 'MEDIUM', label: 'Medium', emoji: '🌶️🌶️', color: 'bg-yellow-500' },
  { value: 'HOT', label: 'Hot', emoji: '🌶️🌶️🌶️', color: 'bg-orange-500' },
  { value: 'EXTRA_HOT', label: 'Extra Hot', emoji: '🔥🔥🔥', color: 'bg-red-600' },
];

const DIETARY_TAGS: { value: DietaryTag; label: string; icon: any; color: string; desc: string }[] = [
  { value: 'VEGETARIAN', label: 'Vegetarian', icon: Leaf, color: 'green', desc: 'No meat' },
  { value: 'VEGAN', label: 'Vegan', icon: Leaf, color: 'emerald', desc: 'No animal products' },
  { value: 'HALAL', label: 'Halal', icon: Award, color: 'teal', desc: 'Halal certified' },
  { value: 'GLUTEN_FREE', label: 'Gluten Free', icon: Wheat, color: 'yellow', desc: 'No wheat/gluten' },
  { value: 'DAIRY_FREE', label: 'Dairy Free', icon: Milk, color: 'blue', desc: 'No milk products' },
  { value: 'NUT_FREE', label: 'Nut Free', icon: Info, color: 'orange', desc: 'No nuts' },
  { value: 'SPICY', label: 'Spicy', icon: Flame, color: 'red', desc: 'Hot & spicy' },
  { value: 'CONTAINS_EGG', label: 'Contains Egg', icon: Egg, color: 'amber', desc: 'Has eggs' },
  { value: 'CONTAINS_SEAFOOD', label: 'Seafood', icon: Fish, color: 'cyan', desc: 'Contains fish' },
  { value: 'BEEF', label: 'Beef', icon: Beef, color: 'rose', desc: 'Beef dish' },
  { value: 'CHICKEN', label: 'Chicken', icon: Info, color: 'orange', desc: 'Chicken dish' },
  { value: 'MUTTON', label: 'Mutton', icon: Info, color: 'red', desc: 'Mutton dish' },
];

export function RestaurantWizardStep2Modifiers({
  modifiers, onChange, onToggleDietaryTag, onToggleModifierGroup, errors,
}: Props) {
  const { data: modifierGroups = [] } = useQuery({
    queryKey: ['modifier-groups'],
    queryFn: () => modifiersApi.list(),
  });

  return (
    <div className="space-y-5">
      {errors.length > 0 && (
        <div className="rounded-2xl bg-rose-50 border-2 border-rose-200 p-3 flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
          <div className="text-xs text-rose-900">
            <div className="font-extrabold mb-0.5">Fix before Next:</div>
            <ul className="list-disc pl-4 space-y-0.5">
              {errors.map((e, i) => <li key={i}>{e}</li>)}
            </ul>
          </div>
        </div>
      )}

      <div className="rounded-2xl bg-gradient-to-br from-pink-50 to-white border-2 border-pink-200 p-4 flex items-start gap-3">
        <div className="h-10 w-10 rounded-xl bg-pink-600 text-white flex items-center justify-center shadow-md shrink-0">
          <Sparkles className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <h3 className="font-extrabold text-pink-900 text-sm">Modifiers & Dietary Info</h3>
          <p className="text-xs text-pink-800 font-semibold mt-0.5 leading-relaxed">
            Spice level, dietary tags, customization options — customer ko clarity milegi.
            Sab optional hai — sirf zaroorat hai to bharo.
          </p>
        </div>
      </div>

      {/* Spice Level */}
      <section className="rounded-2xl border-2 border-red-200 bg-gradient-to-br from-red-50 to-white p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-red-500 to-orange-600 text-white flex items-center justify-center shadow-md">
            <Flame className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <h3 className="font-extrabold text-red-900 text-base">Spice Level</h3>
            <p className="text-xs text-red-700 font-semibold">Kitna spicy hai ye item?</p>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={modifiers.isSpicy}
              onChange={(e) => onChange({ isSpicy: e.target.checked })}
              className="h-5 w-5 rounded"
            />
            <span className="text-sm font-extrabold text-red-900">Is Spicy?</span>
          </label>
        </div>

        {modifiers.isSpicy && (
          <div className="grid grid-cols-4 gap-2">
            {SPICE_LEVELS.map((level) => {
              const active = modifiers.spiceLevel === level.value;
              return (
                <button
                  key={level.value}
                  type="button"
                  onClick={() => onChange({ spiceLevel: level.value })}
                  className={[
                    'p-3 rounded-xl border-2 text-center transition',
                    active
                      ? level.color + ' text-white border-current shadow-md scale-105'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-red-400',
                  ].join(' ')}
                >
                  <div className="text-2xl mb-1">{level.emoji}</div>
                  <div className="text-xs font-extrabold">{level.label}</div>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* Dietary Tags */}
      <section className="rounded-2xl border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-green-700 text-white flex items-center justify-center shadow-md">
            <Leaf className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <h3 className="font-extrabold text-emerald-900 text-base">Dietary Tags</h3>
            <p className="text-xs text-emerald-700 font-semibold">
              Customer ko dietary info dikhega — {modifiers.dietaryTags.length} selected
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {DIETARY_TAGS.map((tag) => {
            const active = modifiers.dietaryTags.includes(tag.value);
            const Icon = tag.icon;
            return (
              <button
                key={tag.value}
                type="button"
                onClick={() => onToggleDietaryTag(tag.value)}
                className={[
                  'flex items-start gap-2 p-3 rounded-xl border-2 text-left transition',
                  active
                    ? 'border-emerald-600 bg-emerald-100 shadow-md ring-2 ring-emerald-200'
                    : 'border-slate-200 bg-white hover:border-emerald-400',
                ].join(' ')}
              >
                <div className={[
                  'h-8 w-8 rounded-lg flex items-center justify-center shrink-0',
                  active ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600',
                ].join(' ')}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className={[
                    'text-xs font-extrabold',
                    active ? 'text-emerald-900' : 'text-slate-900',
                  ].join(' ')}>
                    {tag.label}
                  </div>
                  <div className="text-[10px] text-slate-500 font-semibold leading-tight">{tag.desc}</div>
                </div>
                {active && <Check className="h-4 w-4 text-emerald-600 shrink-0" />}
              </button>
            );
          })}
        </div>
      </section>

      {/* Modifier Groups */}
      <section className="rounded-2xl border-2 border-pink-200 bg-gradient-to-br from-pink-50 to-white p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-pink-500 to-rose-600 text-white flex items-center justify-center shadow-md">
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <h3 className="font-extrabold text-pink-900 text-base">Customization Options (Modifiers)</h3>
            <p className="text-xs text-pink-700 font-semibold">
              Extra cheese, size variations, no onion — {modifiers.modifierGroupIds.length} groups linked
            </p>
          </div>
          <a
            href="/restaurant/modifiers"
            target="_blank"
            className="text-xs font-extrabold text-pink-700 hover:underline inline-flex items-center gap-1"
          >
            <Plus className="h-3 w-3" />
            Create Group
          </a>
        </div>

        {modifierGroups.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-pink-300 bg-white p-6 text-center">
            <Sparkles className="h-8 w-8 text-pink-400 mx-auto mb-2" />
            <div className="text-sm font-extrabold text-slate-700">No modifier groups yet</div>
            <div className="text-xs text-slate-500 font-semibold mt-1">
              Modifiers page pe jao aur toppings, sizes, add-ons banao. Wapas aa ke yahan link karo.
            </div>
            <a
              href="/restaurant/modifiers"
              target="_blank"
              className="mt-3 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-pink-600 hover:bg-pink-700 text-white text-xs font-extrabold"
            >
              <Plus className="h-3 w-3" />
              Open Modifiers Page
            </a>
          </div>
        ) : (
          <div className="space-y-2">
            {modifierGroups.map((group) => {
              const active = modifiers.modifierGroupIds.includes(group.id);
              return (
                <button
                  key={group.id}
                  type="button"
                  onClick={() => onToggleModifierGroup(group.id)}
                  className={[
                    'w-full rounded-xl border-2 p-3 transition text-left',
                    active
                      ? 'border-pink-500 bg-pink-100 shadow-md ring-2 ring-pink-200'
                      : 'border-slate-200 bg-white hover:border-pink-400',
                  ].join(' ')}
                >
                  <div className="flex items-start gap-3">
                    <div className={[
                      'h-9 w-9 rounded-lg flex items-center justify-center shrink-0',
                      active ? 'bg-pink-600 text-white' : 'bg-pink-100 text-pink-700',
                    ].join(' ')}>
                      <Sparkles className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className={['font-extrabold text-sm', active ? 'text-pink-900' : 'text-slate-900'].join(' ')}>
                          {group.name}
                        </div>
                        <span className="px-1.5 py-0.5 rounded bg-pink-200 text-pink-800 text-[9px] font-extrabold uppercase">
                          {group.type}
                        </span>
                        {group.isRequired && (
                          <span className="px-1.5 py-0.5 rounded bg-red-100 text-red-700 text-[9px] font-extrabold uppercase">
                            Required
                          </span>
                        )}
                        <span className="text-[10px] text-slate-500 font-bold">
                          {group.minSelections}–{group.maxSelections} choices
                        </span>
                      </div>
                      {group.description && (
                        <div className="text-[11px] text-slate-600 font-semibold mt-0.5">{group.description}</div>
                      )}
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {group.options.slice(0, 8).map((opt) => (
                          <span
                            key={opt.id}
                            className="px-1.5 py-0.5 rounded bg-white border border-slate-200 text-[9px] font-bold text-slate-700 inline-flex items-center gap-0.5"
                          >
                            {opt.emoji && <span>{opt.emoji}</span>}
                            {opt.name}
                            {(opt.priceAdjustment ?? 0) !== 0 && (
                              <span className={(opt.priceAdjustment ?? 0) > 0 ? 'text-emerald-700' : 'text-rose-700'}>
                                {(opt.priceAdjustment ?? 0) > 0 ? '+' : ''}Rs {opt.priceAdjustment}
                              </span>
                            )}
                          </span>
                        ))}
                        {group.options.length > 8 && (
                          <span className="text-[9px] font-extrabold text-slate-500">
                            +{group.options.length - 8} more
                          </span>
                        )}
                      </div>
                    </div>
                    {active && <Check className="h-5 w-5 text-pink-600 shrink-0" />}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
