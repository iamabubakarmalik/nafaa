import { ChefHat, ShoppingBag, Wheat, Check, Info } from 'lucide-react';
import type { BakeryItemType } from '../../hooks/useBakeryWizard';

interface Props {
  value: BakeryItemType;
  onChange: (t: BakeryItemType) => void;
  /** Edit me type badalna mana hai — cheez pehle se bani hui hai */
  locked?: boolean;
}

const OPTIONS: Array<{
  id: BakeryItemType;
  emoji: string;
  icon: any;
  title: string;
  examples: string;
  desc: string;
  ring: string;
  bg: string;
}> = [
  {
    id: 'MADE',
    emoji: '🧁',
    icon: ChefHat,
    title: 'Hum khud banate hain',
    examples: 'Cake, pastry, patties, bread',
    desc: 'Recipe, taazgi aur production — sab chalega',
    ring: 'border-pink-500 ring-pink-200 dark:ring-pink-500/25',
    bg: 'from-pink-50 to-fuchsia-50 dark:from-pink-500/10 dark:to-fuchsia-500/10',
  },
  {
    id: 'BOUGHT',
    emoji: '📦',
    icon: ShoppingBag,
    title: 'Bahar se la kar bechte hain',
    examples: 'Lays, bottle, chips, juice',
    desc: 'Sirf rate, cost aur stock — cake wale sawal nahi',
    ring: 'border-blue-500 ring-blue-200 dark:ring-blue-500/25',
    bg: 'from-blue-50 to-sky-50 dark:from-blue-500/10 dark:to-sky-500/10',
  },
  {
    id: 'RAW',
    emoji: '🌾',
    icon: Wheat,
    title: 'Banane ka saamaan',
    examples: 'Maida, cheeni, makkhan, cream',
    desc: 'Ye bikta nahi — POS aur catalog me nazar nahi aayega',
    ring: 'border-violet-500 ring-violet-200 dark:ring-violet-500/25',
    bg: 'from-violet-50 to-purple-50 dark:from-violet-500/10 dark:to-purple-500/10',
  },
];

/* ═════════════════════════════════════════════════════════════
   YE CHEEZ KYA HAI
   ─────────────────────────────────────────────────────────────
   Bakery me teen bilkul alag cheezein hoti hain, aur inka hisab
   bhi alag chalta hai. Pehle wizard sab ko ek jaisa samajhta tha:
   Lays ke packet se bhi cake ka flavour poochta tha, aur maida
   bhi Product ban kar POS par aa jata tha.

   Ab pehla sawal yehi hai — aur uske baad ke saare step isi se
   tay hote hain.
   ═════════════════════════════════════════════════════════════ */
export function BakeryItemTypePicker({ value, onChange, locked }: Props) {
  return (
    <section className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-slate-200 dark:border-neutral-800 shadow-sm p-5 space-y-3">
      <div>
        <h3 className="font-extrabold text-slate-900 dark:text-white text-lg">Ye cheez kya hai?</h3>
        <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-0.5">
          Isi se aage ke sawal tay hote hain — galat chuna to fazool ke khaane bharne parenge
        </p>
      </div>

      <div className="grid sm:grid-cols-3 gap-3">
        {OPTIONS.map((o) => {
          const active = value === o.id;
          const Icon = o.icon;
          return (
            <button
              key={o.id}
              type="button"
              disabled={locked && !active}
              onClick={() => onChange(o.id)}
              className={[
                'text-left rounded-2xl border-2 p-4 transition-all relative',
                locked && !active ? 'opacity-40 cursor-not-allowed' : 'hover:-translate-y-0.5 hover:shadow-md',
                active
                  ? `${o.ring} ring-4 bg-gradient-to-br ${o.bg} shadow-lg`
                  : 'border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800',
              ].join(' ')}
            >
              {active && (
                <span className="absolute top-3 right-3 h-6 w-6 rounded-full bg-emerald-500 text-white flex items-center justify-center">
                  <Check className="h-3.5 w-3.5" />
                </span>
              )}
              <div className="text-3xl">{o.emoji}</div>
              <div className="mt-2 font-black text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                <Icon className="h-4 w-4 shrink-0" /> {o.title}
              </div>
              <div className="text-[11px] font-extrabold text-slate-500 dark:text-slate-400 mt-1">
                {o.examples}
              </div>
              <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-1.5 leading-snug">
                {o.desc}
              </div>
            </button>
          );
        })}
      </div>

      {locked ? (
        <div className="rounded-2xl bg-amber-50 dark:bg-amber-500/10 border-2 border-amber-200 dark:border-amber-500/30 p-3 flex gap-2">
          <Info className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-[12px] font-bold text-amber-900 dark:text-amber-200">
            Edit me type nahi badalta. Cheez pehle se bani hui hai — agar type galat hai to
            nayi bana lein.
          </p>
        </div>
      ) : value === 'RAW' ? (
        <div className="rounded-2xl bg-violet-50 dark:bg-violet-500/10 border-2 border-violet-200 dark:border-violet-500/30 p-3 flex gap-2">
          <Info className="h-4 w-4 text-violet-600 shrink-0 mt-0.5" />
          <p className="text-[12px] font-bold text-violet-900 dark:text-violet-200">
            Banane ka saamaan <strong>bechne ki cheez nahi</strong>. Ye Ingredients me jayega —
            POS, catalog aur products ki list me kahin nazar nahi aayega. Iska kaam sirf itna
            hai ke cake ki recipe me lag sake aur khatam hone par aap ko pata chal jaye.
          </p>
        </div>
      ) : null}
    </section>
  );
}
