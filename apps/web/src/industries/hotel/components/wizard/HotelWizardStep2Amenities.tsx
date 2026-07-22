import { useState } from 'react';
import {
  Sparkles, Wind, Tv, Wifi, Coffee, Home, Bath, Lock,
  Utensils, Dog, Cigarette, Ruler, Plus, X, AlertCircle,
  Check,
} from 'lucide-react';
import type { HotelWizardAmenities } from '../../hooks/useHotelWizard';

interface Props {
  amenities: HotelWizardAmenities;
  onChange: (patch: Partial<HotelWizardAmenities>) => void;
  onAddCustom: (amenity: string) => void;
  onToggleCustom: (amenity: string) => void;
  errors: string[];
}

const AMENITY_TILES = [
  { key: 'hasAC' as const, label: 'Air Conditioning', icon: Wind, color: 'blue', desc: 'Central/split AC' },
  { key: 'hasHeater' as const, label: 'Heater', icon: Wind, color: 'orange', desc: 'Winter heating' },
  { key: 'hasTV' as const, label: 'TV / Cable', icon: Tv, color: 'purple', desc: 'LED with channels' },
  { key: 'hasWifi' as const, label: 'WiFi', icon: Wifi, color: 'cyan', desc: 'Free internet' },
  { key: 'hasMinibar' as const, label: 'Minibar', icon: Coffee, color: 'amber', desc: 'Stocked fridge' },
  { key: 'hasBalcony' as const, label: 'Balcony', icon: Home, color: 'emerald', desc: 'Outdoor space' },
  { key: 'hasKitchen' as const, label: 'Kitchen', icon: Utensils, color: 'rose', desc: 'Cooking facilities' },
  { key: 'hasBathtub' as const, label: 'Bathtub', icon: Bath, color: 'sky', desc: 'Soak tub' },
  { key: 'hasSafe' as const, label: 'Safe', icon: Lock, color: 'slate', desc: 'In-room safe' },
  { key: 'isPetFriendly' as const, label: 'Pet Friendly', icon: Dog, color: 'teal', desc: 'Pets allowed' },
  { key: 'isSmoking' as const, label: 'Smoking Allowed', icon: Cigarette, color: 'stone', desc: 'Smoking OK' },
];

const AMENITY_COLORS: Record<string, string> = {
  blue: 'border-blue-500 bg-blue-50 text-blue-800',
  orange: 'border-orange-500 bg-orange-50 text-orange-800',
  purple: 'border-purple-500 bg-purple-50 text-purple-800',
  cyan: 'border-cyan-500 bg-cyan-50 text-cyan-800',
  amber: 'border-amber-500 bg-amber-50 text-amber-800',
  emerald: 'border-emerald-500 bg-emerald-50 text-emerald-800',
  rose: 'border-rose-500 bg-rose-50 text-rose-800',
  sky: 'border-sky-500 bg-sky-50 text-sky-800',
  slate: 'border-slate-500 bg-slate-50 text-slate-800',
  teal: 'border-teal-500 bg-teal-50 text-teal-800',
  stone: 'border-stone-500 bg-stone-50 text-stone-800',
};

const AMENITY_ICON_COLORS: Record<string, string> = {
  blue: 'text-blue-600', orange: 'text-orange-600', purple: 'text-purple-600',
  cyan: 'text-cyan-600', amber: 'text-amber-600', emerald: 'text-emerald-600',
  rose: 'text-rose-600', sky: 'text-sky-600', slate: 'text-slate-600',
  teal: 'text-teal-600', stone: 'text-stone-600',
};

const COMMON_EXTRAS = [
  'Room Service', 'Daily Housekeeping', 'Iron & Board', 'Hair Dryer',
  'Slippers', 'Bathrobes', 'Free Toiletries', 'Coffee Machine',
  'Tea Kettle', 'Refrigerator', 'Microwave', 'Work Desk',
  'Sitting Area', 'Fireplace', 'Sea View', 'Mountain View',
  'City View', 'Garden View', 'Pool Access', 'Gym Access',
  'Spa Access', 'Airport Shuttle', 'Room Dining', 'Wake-up Call',
];

export function HotelWizardStep2Amenities({
  amenities, onChange, onAddCustom, onToggleCustom, errors,
}: Props) {
  const [customInput, setCustomInput] = useState('');

  const activeCount = AMENITY_TILES.filter((t) => amenities[t.key]).length + amenities.customAmenities.length;

  const addCustom = () => {
    const val = customInput.trim();
    if (!val) return;
    onAddCustom(val);
    setCustomInput('');
  };

  return (
    <div className="space-y-5">
      {errors.length > 0 && (
        <div className="rounded-2xl bg-rose-50 border-2 border-rose-200 p-3 flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
          <div className="text-xs text-rose-900">
            <ul className="list-disc pl-4 space-y-0.5">
              {errors.map((e, i) => <li key={i}>{e}</li>)}
            </ul>
          </div>
        </div>
      )}

      <div className="rounded-2xl bg-gradient-to-br from-indigo-50 to-white border-2 border-indigo-200 p-4 flex items-start gap-3">
        <div className="h-10 w-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shrink-0">
          <Sparkles className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <h3 className="font-extrabold text-indigo-900 text-sm">Amenities & Features</h3>
          <p className="text-xs text-indigo-800 font-semibold mt-0.5 leading-relaxed">
            Guests ko show hone wali features. {activeCount} amenities selected.
          </p>
        </div>
      </div>

      {/* Room Size */}
      <section className="rounded-2xl border-2 border-slate-200 bg-white p-5 space-y-4">
        <div className="flex items-center gap-3 pb-2 border-b-2 border-slate-100">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-slate-500 to-slate-700 text-white flex items-center justify-center shadow-md">
            <Ruler className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-slate-900 text-base">Room Size</h3>
            <p className="text-xs text-slate-500 font-semibold">Physical dimensions (optional)</p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5">Size in Square Feet</label>
            <div className="relative">
              <input
                type="number" min="0"
                value={amenities.sizeSqft}
                onChange={(e) => onChange({ sizeSqft: e.target.value === '' ? '' : Number(e.target.value) })}
                placeholder="e.g. 250"
                className="h-11 w-full rounded-xl border-2 border-slate-200 bg-white pl-3 pr-16 text-sm font-extrabold tabular-nums focus:outline-none focus:border-indigo-500"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-extrabold text-slate-500">sqft</span>
            </div>
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5">Size in Square Meters</label>
            <div className="relative">
              <input
                type="number" min="0" step="0.01"
                value={amenities.sizeSqm}
                onChange={(e) => onChange({ sizeSqm: e.target.value === '' ? '' : Number(e.target.value) })}
                placeholder="e.g. 23"
                className="h-11 w-full rounded-xl border-2 border-slate-200 bg-white pl-3 pr-16 text-sm font-extrabold tabular-nums focus:outline-none focus:border-indigo-500"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-extrabold text-slate-500">sqm</span>
            </div>
          </div>
        </div>
      </section>

      {/* Standard Amenities */}
      <section className="rounded-2xl border-2 border-indigo-200 bg-gradient-to-br from-indigo-50 to-white p-5 space-y-4">
        <div className="flex items-center gap-3 pb-2 border-b-2 border-indigo-100">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-700 text-white flex items-center justify-center shadow-md">
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <h3 className="font-extrabold text-indigo-900 text-base">Standard Amenities</h3>
            <p className="text-xs text-indigo-700 font-semibold">Click to toggle each feature</p>
          </div>
          <div className="text-[10px] font-extrabold text-indigo-700 bg-indigo-100 px-2 py-1 rounded-lg">
            {AMENITY_TILES.filter((t) => amenities[t.key]).length} of {AMENITY_TILES.length}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {AMENITY_TILES.map((tile) => {
            const active = amenities[tile.key];
            const Icon = tile.icon;
            return (
              <button
                key={tile.key} type="button"
                onClick={() => onChange({ [tile.key]: !active } as any)}
                className={[
                  'flex items-start gap-2 p-3 rounded-xl border-2 text-left transition',
                  active
                    ? AMENITY_COLORS[tile.color] + ' shadow-md ring-2 ring-offset-1 ring-current'
                    : 'border-slate-200 bg-white hover:border-slate-300',
                ].join(' ')}
              >
                <div className={[
                  'h-9 w-9 rounded-lg flex items-center justify-center shrink-0',
                  active ? 'bg-white text-current' : 'bg-slate-100 ' + AMENITY_ICON_COLORS[tile.color],
                ].join(' ')}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className={[
                    'text-xs font-extrabold',
                    active ? '' : 'text-slate-900',
                  ].join(' ')}>{tile.label}</div>
                  <div className={[
                    'text-[10px] font-semibold leading-tight',
                    active ? 'opacity-80' : 'text-slate-500',
                  ].join(' ')}>{tile.desc}</div>
                </div>
                {active && <Check className="h-4 w-4 shrink-0" />}
              </button>
            );
          })}
        </div>
      </section>

      {/* Common Extras */}
      <section className="rounded-2xl border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-white p-5 space-y-4">
        <div className="flex items-center gap-3 pb-2 border-b-2 border-purple-100">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 text-white flex items-center justify-center shadow-md">
            <Plus className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <h3 className="font-extrabold text-purple-900 text-base">Additional Features</h3>
            <p className="text-xs text-purple-700 font-semibold">
              Click quick-add chips or type your own — {amenities.customAmenities.length} added
            </p>
          </div>
        </div>

        {/* Add custom */}
        <div className="flex gap-2">
          <input
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCustom())}
            placeholder="Type your custom amenity..."
            className="h-11 flex-1 rounded-xl border-2 border-slate-200 bg-white px-3 text-sm font-bold focus:outline-none focus:border-purple-500"
          />
          <button
            type="button" onClick={addCustom}
            disabled={!customInput.trim()}
            className="h-11 px-5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-sm inline-flex items-center gap-1 disabled:opacity-50 shadow-md"
          >
            <Plus className="h-4 w-4" /> Add
          </button>
        </div>

        {/* Quick add chips */}
        <div>
          <div className="text-[10px] uppercase font-extrabold text-slate-600 mb-2">Quick Add</div>
          <div className="flex flex-wrap gap-1.5">
            {COMMON_EXTRAS.map((extra) => {
              const active = amenities.customAmenities.includes(extra);
              return (
                <button
                  key={extra} type="button"
                  onClick={() => onToggleCustom(extra)}
                  className={[
                    'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-extrabold border-2 transition',
                    active
                      ? 'border-purple-500 bg-purple-100 text-purple-800 shadow-sm'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-purple-300',
                  ].join(' ')}
                >
                  {active && <Check className="h-2.5 w-2.5" />}
                  {extra}
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected custom amenities */}
        {amenities.customAmenities.length > 0 && (
          <div>
            <div className="text-[10px] uppercase font-extrabold text-purple-700 mb-2">
              Selected ({amenities.customAmenities.length})
            </div>
            <div className="flex flex-wrap gap-1.5">
              {amenities.customAmenities.map((amenity) => (
                <span
                  key={amenity}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-purple-100 border-2 border-purple-300 text-purple-800 text-xs font-extrabold"
                >
                  {amenity}
                  <button
                    type="button"
                    onClick={() => onToggleCustom(amenity)}
                    className="h-4 w-4 rounded-full bg-purple-600 hover:bg-rose-600 text-white flex items-center justify-center"
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
