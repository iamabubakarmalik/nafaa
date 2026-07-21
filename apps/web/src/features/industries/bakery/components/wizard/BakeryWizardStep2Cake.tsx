import { useState } from 'react';
import {
  Palette, ArrowRight, ArrowLeft, Sparkles, AlertTriangle,
  Info, MessageSquare, Camera, Shapes, Ruler, Cake, Plus, X,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { FLAVORS, SHAPES, CREAMS } from '../../api/constants';
import type { BakeryWizardCakeDetails } from '../../hooks/useBakeryWizard';

// Common decorative items
const COMMON_DECORATIONS = [
  '🌹 Roses', '🌸 Flowers', '🎀 Ribbons', '⭐ Stars', '🌟 Sprinkles',
  '🍓 Fresh Fruits', '🍫 Chocolate Chips', '🍭 Lollipops', '🎂 Candles',
  '💎 Edible Pearls', '🌈 Rainbow', '🦄 Unicorn Theme', '👑 Crown', '💝 Hearts',
  '🎈 Balloons', '🎊 Confetti', '🌿 Fondant Leaves', '☁️ Cotton Candy',
];

interface Props {
  cake: BakeryWizardCakeDetails;
  isSeasonalItem: boolean;
  onChange: (patch: Partial<BakeryWizardCakeDetails>) => void;
  onToggleDecoration: (item: string) => void;
  onBack: () => void;
  onNext: () => void;
  validation: { valid: boolean; errors: string[] };
}

export function BakeryWizardStep2Cake({
  cake, onChange, onToggleDecoration, onBack, onNext, validation,
}: Props) {
  const [customDecoration, setCustomDecoration] = useState('');

  const addCustomDecoration = () => {
    if (!customDecoration.trim()) return;
    onToggleDecoration(customDecoration.trim());
    setCustomDecoration('');
  };

  return (
    <div className="space-y-5">
      {/* ─── FLAVOR PICKER ─── */}
      <section className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-slate-200 dark:border-neutral-800 shadow-sm p-5 space-y-3">
        <div className="flex items-center gap-3 pb-3 border-b-2 border-slate-100 dark:border-neutral-800">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-pink-500 to-fuchsia-600 text-white flex items-center justify-center shadow-md">
            <Cake className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-slate-900 dark:text-white text-lg leading-tight">Default Flavor</h3>
            <p className="text-[11px] text-slate-500 font-semibold">Customer POS mein isko select karke start karega</p>
          </div>
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2">
          {FLAVORS.map((f) => {
            const active = cake.defaultFlavor === f.value;
            return (
              <button
                key={f.value}
                type="button"
                onClick={() => onChange({ defaultFlavor: f.value })}
                className={[
                  'group relative rounded-xl overflow-hidden transition-all',
                  active ? 'ring-4 ring-pink-500 shadow-lg scale-105' : 'hover:scale-105 hover:shadow-md',
                ].join(' ')}
              >
                <div className={'aspect-square bg-gradient-to-br ' + f.color + ' flex flex-col items-center justify-center gap-1 text-white'}>
                  <div className="text-3xl group-hover:scale-125 transition-transform">{f.emoji}</div>
                  <div className="text-[9px] font-extrabold text-center px-1 leading-tight drop-shadow-md">
                    {f.label}
                  </div>
                </div>
                {active && (
                  <div className="absolute top-1 right-1 h-5 w-5 rounded-full bg-white text-pink-600 flex items-center justify-center shadow-md">
                    ✓
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </section>

      {/* ─── SHAPE + CREAM ─── */}
      <div className="grid lg:grid-cols-2 gap-5">
        {/* SHAPE */}
        <section className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-slate-200 dark:border-neutral-800 shadow-sm p-5 space-y-3">
          <div className="flex items-center gap-3 pb-3 border-b-2 border-slate-100 dark:border-neutral-800">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-purple-500 to-violet-600 text-white flex items-center justify-center shadow-md">
              <Shapes className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 dark:text-white text-lg leading-tight">Default Shape</h3>
              <p className="text-[11px] text-slate-500 font-semibold">Cake ka shape</p>
            </div>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {SHAPES.map((s) => {
              const active = cake.defaultShape === s.value;
              return (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => onChange({ defaultShape: s.value })}
                  className={[
                    'p-2 rounded-xl border-2 transition-all flex flex-col items-center gap-1',
                    active
                      ? 'border-purple-500 bg-purple-50 dark:bg-purple-950/40 shadow-md ring-2 ring-purple-200'
                      : 'border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:border-purple-300',
                  ].join(' ')}
                >
                  <span className="text-xl">{s.emoji}</span>
                  <span className={[
                    'text-[9px] font-extrabold text-center',
                    active ? 'text-purple-800' : 'text-slate-700 dark:text-slate-300',
                  ].join(' ')}>
                    {s.label}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* CREAM TYPE */}
        <section className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-slate-200 dark:border-neutral-800 shadow-sm p-5 space-y-3">
          <div className="flex items-center gap-3 pb-3 border-b-2 border-slate-100 dark:border-neutral-800">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center shadow-md">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 dark:text-white text-lg leading-tight">Cream Type</h3>
              <p className="text-[11px] text-slate-500 font-semibold">Frosting / icing</p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {CREAMS.map((c) => {
              const active = cake.defaultCreamType === c.value;
              return (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => onChange({ defaultCreamType: c.value })}
                  className={[
                    'p-2 rounded-xl border-2 transition-all flex flex-col items-center gap-1',
                    active
                      ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/40 shadow-md ring-2 ring-amber-200'
                      : 'border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:border-amber-300',
                  ].join(' ')}
                >
                  <span className="text-xl">{c.emoji}</span>
                  <span className={[
                    'text-[9px] font-extrabold text-center',
                    active ? 'text-amber-800' : 'text-slate-700 dark:text-slate-300',
                  ].join(' ')}>
                    {c.label}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      </div>

      {/* ─── CUSTOMIZATION TOGGLES ─── */}
      <section className="rounded-3xl bg-gradient-to-br from-fuchsia-50 via-pink-50 to-purple-50 dark:from-fuchsia-950/30 dark:via-pink-950/30 dark:to-purple-950/30 border-2 border-fuchsia-200 dark:border-fuchsia-800 shadow-sm p-5 space-y-4">
        <div className="flex items-center gap-3 pb-3 border-b-2 border-fuchsia-200/60 dark:border-fuchsia-800/60">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-fuchsia-600 to-purple-700 text-white flex items-center justify-center shadow-md">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-slate-900 dark:text-white text-lg leading-tight">Customization Options</h3>
            <p className="text-[11px] text-slate-500 font-semibold">Customer POS mein kya customize kar sakta hai</p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <CustomToggle
            active={cake.isCakeCustomizable}
            onToggle={(v) => onChange({ isCakeCustomizable: v })}
            icon={Sparkles}
            label="Is Customizable"
            desc="Master toggle for customization"
            tone="fuchsia"
          />
          <CustomToggle
            active={cake.allowsMessageOnCake}
            onToggle={(v) => onChange({ allowsMessageOnCake: v })}
            icon={MessageSquare}
            label="Message on Cake"
            desc="'Happy Birthday Ali'"
            tone="pink"
          />
          <CustomToggle
            active={cake.allowsPhotoOnCake}
            onToggle={(v) => onChange({ allowsPhotoOnCake: v })}
            icon={Camera}
            label="Photo Cake"
            desc="Edible photo print"
            tone="purple"
          />
          <CustomToggle
            active={cake.allowsCustomShape}
            onToggle={(v) => onChange({ allowsCustomShape: v })}
            icon={Shapes}
            label="Custom Shape"
            desc="Numbers, letters, characters"
            tone="violet"
          />
          <CustomToggle
            active={cake.allowsFlavorChoice}
            onToggle={(v) => onChange({ allowsFlavorChoice: v })}
            icon={Cake}
            label="Flavor Choice"
            desc="Customer picks flavor"
            tone="amber"
          />
          <CustomToggle
            active={cake.allowsSizeChoice}
            onToggle={(v) => onChange({ allowsSizeChoice: v })}
            icon={Ruler}
            label="Size Choice"
            desc="½lb, 1lb, 2lb..."
            tone="blue"
          />
        </div>
      </section>

      {/* ─── DECORATIONS ─── */}
      <section className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-slate-200 dark:border-neutral-800 shadow-sm p-5 space-y-4">
        <div className="flex items-center gap-3 pb-3 border-b-2 border-slate-100 dark:border-neutral-800">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 text-white flex items-center justify-center shadow-md">
            <span className="text-xl">🌸</span>
          </div>
          <div>
            <h3 className="font-extrabold text-slate-900 dark:text-white text-lg leading-tight">Decorative Items Offered</h3>
            <p className="text-[11px] text-slate-500 font-semibold">Options customer can pick during order</p>
          </div>
          {cake.decorativeItems.length > 0 && (
            <span className="ml-auto px-2 py-0.5 rounded bg-rose-100 text-rose-700 text-[10px] font-extrabold">
              {cake.decorativeItems.length} selected
            </span>
          )}
        </div>

        <div className="flex flex-wrap gap-1.5">
          {COMMON_DECORATIONS.map((d) => {
            const active = cake.decorativeItems.includes(d);
            return (
              <button
                key={d}
                type="button"
                onClick={() => onToggleDecoration(d)}
                className={[
                  'inline-flex items-center px-3 py-1.5 rounded-lg border-2 text-xs font-extrabold transition-all',
                  active
                    ? 'border-rose-500 bg-rose-50 dark:bg-rose-950/40 text-rose-800 shadow-sm ring-2 ring-rose-200'
                    : 'border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-slate-700 hover:border-rose-300',
                ].join(' ')}
              >
                {d}
              </button>
            );
          })}
        </div>

        <div className="pt-3 border-t border-slate-100 dark:border-neutral-800">
          <div className="text-[10px] uppercase tracking-wider font-extrabold text-slate-600 mb-2">Custom Decoration</div>
          <div className="flex gap-2">
            <input
              value={customDecoration}
              onChange={(e) => setCustomDecoration(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustomDecoration(); } }}
              placeholder="e.g. Gold leaf, Fresh mint..."
              className="flex-1 h-10 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-semibold focus:outline-none focus:border-rose-500"
            />
            <button
              onClick={addCustomDecoration}
              disabled={!customDecoration.trim()}
              className="h-10 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold inline-flex items-center gap-1 disabled:opacity-50 transition"
            >
              <Plus className="h-3.5 w-3.5" /> Add
            </button>
          </div>
        </div>

        {cake.decorativeItems.length > 0 && (
          <div className="pt-3 border-t border-slate-100 dark:border-neutral-800">
            <div className="text-[10px] uppercase tracking-wider font-extrabold text-emerald-700 mb-2">Selected</div>
            <div className="flex flex-wrap gap-1">
              {cake.decorativeItems.map((d) => (
                <span
                  key={d}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 text-xs font-extrabold text-emerald-800"
                >
                  {d}
                  <button
                    onClick={() => onToggleDecoration(d)}
                    className="h-4 w-4 rounded hover:bg-emerald-200 flex items-center justify-center"
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* ─── INGREDIENTS + SERVING NOTES ─── */}
      <section className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-slate-200 dark:border-neutral-800 shadow-sm p-5 space-y-3">
        <div className="flex items-center gap-3 pb-3 border-b-2 border-slate-100 dark:border-neutral-800">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-500 to-yellow-600 text-white flex items-center justify-center shadow-md">
            <span className="text-xl">📝</span>
          </div>
          <div>
            <h3 className="font-extrabold text-slate-900 dark:text-white text-lg leading-tight">Customer-Facing Info</h3>
            <p className="text-[11px] text-slate-500 font-semibold">Shown on catalog & receipt</p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            Ingredient List (public)
          </label>
          <textarea
            rows={3}
            value={cake.ingredientList}
            onChange={(e) => onChange({ ingredientList: e.target.value })}
            placeholder="Wheat flour, butter, eggs, sugar, cocoa powder, milk..."
            className="w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm focus:outline-none focus:border-amber-500 resize-none"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            Serving Suggestions
          </label>
          <textarea
            rows={2}
            value={cake.servingSuggestions}
            onChange={(e) => onChange({ servingSuggestions: e.target.value })}
            placeholder="Serve chilled with fresh cream and berries..."
            className="w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm focus:outline-none focus:border-amber-500 resize-none"
          />
        </div>
      </section>

      {/* ─── VALIDATION + NAV ─── */}
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

      <div className="rounded-2xl bg-white dark:bg-neutral-900 border-2 border-slate-200 dark:border-neutral-800 shadow-sm p-4 flex items-center justify-between flex-wrap gap-3">
        <Button variant="secondary" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" /> Back to Basic Info
        </Button>
        <Button
          onClick={onNext}
          disabled={!validation.valid}
          className="bg-gradient-to-r from-fuchsia-600 to-purple-700 shadow-md"
        >
          Next: Production & Diet <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function CustomToggle({ active, onToggle, icon: Icon, label, desc, tone }: {
  active: boolean; onToggle: (v: boolean) => void;
  icon: any; label: string; desc: string; tone: string;
}) {
  const tones: Record<string, string> = {
    fuchsia: 'from-fuchsia-500 to-purple-600 border-fuchsia-500',
    pink: 'from-pink-500 to-rose-600 border-pink-500',
    purple: 'from-purple-500 to-violet-600 border-purple-500',
    violet: 'from-violet-500 to-purple-700 border-violet-500',
    amber: 'from-amber-500 to-orange-600 border-amber-500',
    blue: 'from-blue-500 to-cyan-600 border-blue-500',
  };
  return (
    <button
      type="button"
      onClick={() => onToggle(!active)}
      className={[
        'p-3 rounded-xl border-2 text-left transition-all',
        active
          ? 'bg-gradient-to-br ' + tones[tone] + ' text-white shadow-md'
          : 'border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:border-slate-300',
      ].join(' ')}
    >
      <div className="flex items-center gap-2">
        <Icon className={'h-4 w-4 ' + (active ? 'text-white' : 'text-slate-500')} />
        <div className={'font-extrabold text-sm ' + (active ? 'text-white' : 'text-slate-900 dark:text-white')}>
          {label}
        </div>
      </div>
      <div className={'text-[10px] font-semibold mt-0.5 ' + (active ? 'text-white/85' : 'text-slate-500 dark:text-slate-400')}>
        {desc}
      </div>
    </button>
  );
}
