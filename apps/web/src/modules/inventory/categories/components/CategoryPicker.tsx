// apps/web/src/modules/inventory/categories/components/CategoryPicker.tsx
import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Tag, Search, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { categoriesApi, type Category } from '../api/categories.api';

/* ═════════════════════════════════════════════════════════════
   CATEGORY PICKER — har industry ke wizard ke liye ek hi
   ─────────────────────────────────────────────────────────────
   Pehle har wizard me DO category poochhi jati thi: ek hardcoded
   "Category Type" (jo Prisma enum se aata tha) aur ek dukandar ki
   apni Category. Dukandar confuse hota tha.

   Ab sirf yehi ek picker hai. Andar wala enum (`categoryType`),
   jo POS chips aur reports chalata hai, category ke NAAM se khud
   nikal aata hai — `makeCategoryTypeResolver` se.
   ═════════════════════════════════════════════════════════════ */

interface Props {
  /** Chuni hui category ka id */
  value: string;
  onChange: (categoryId: string) => void;
  /** Search box tabhi dikhao jab itni se zyada hon */
  searchAfter?: number;
  /** Industry ka rang */
  tone?: 'blue' | 'emerald' | 'violet' | 'amber' | 'rose' | 'pink' | 'teal' | 'orange';
  /** Khaali hone par misalein — jaise "Headphones, Chargers, Cables" */
  examples?: string;
}

const TONES = {
  blue:    { on: 'border-blue-600 bg-blue-600',       hover: 'hover:border-blue-400',    soft: 'bg-blue-50 hover:bg-blue-100 text-blue-700',       ring: 'focus:border-blue-500',    btn: 'bg-blue-600 hover:bg-blue-700',       box: 'border-blue-200 bg-blue-50' },
  emerald: { on: 'border-emerald-600 bg-emerald-600', hover: 'hover:border-emerald-400', soft: 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700', ring: 'focus:border-emerald-500', btn: 'bg-emerald-600 hover:bg-emerald-700', box: 'border-emerald-200 bg-emerald-50' },
  violet:  { on: 'border-violet-600 bg-violet-600',   hover: 'hover:border-violet-400',  soft: 'bg-violet-50 hover:bg-violet-100 text-violet-700',  ring: 'focus:border-violet-500',  btn: 'bg-violet-600 hover:bg-violet-700',   box: 'border-violet-200 bg-violet-50' },
  amber:   { on: 'border-amber-600 bg-amber-600',     hover: 'hover:border-amber-400',   soft: 'bg-amber-50 hover:bg-amber-100 text-amber-700',    ring: 'focus:border-amber-500',   btn: 'bg-amber-600 hover:bg-amber-700',     box: 'border-amber-200 bg-amber-50' },
  rose:    { on: 'border-rose-600 bg-rose-600',       hover: 'hover:border-rose-400',    soft: 'bg-rose-50 hover:bg-rose-100 text-rose-700',       ring: 'focus:border-rose-500',    btn: 'bg-rose-600 hover:bg-rose-700',       box: 'border-rose-200 bg-rose-50' },
  pink:    { on: 'border-pink-600 bg-pink-600',       hover: 'hover:border-pink-400',    soft: 'bg-pink-50 hover:bg-pink-100 text-pink-700',       ring: 'focus:border-pink-500',    btn: 'bg-pink-600 hover:bg-pink-700',       box: 'border-pink-200 bg-pink-50' },
  teal:    { on: 'border-teal-600 bg-teal-600',       hover: 'hover:border-teal-400',    soft: 'bg-teal-50 hover:bg-teal-100 text-teal-700',       ring: 'focus:border-teal-500',    btn: 'bg-teal-600 hover:bg-teal-700',       box: 'border-teal-200 bg-teal-50' },
  orange:  { on: 'border-orange-600 bg-orange-600',   hover: 'hover:border-orange-400',  soft: 'bg-orange-50 hover:bg-orange-100 text-orange-700', ring: 'focus:border-orange-500',  btn: 'bg-orange-600 hover:bg-orange-700',   box: 'border-orange-200 bg-orange-50' },
};

export function CategoryPicker({
  value, onChange, searchAfter = 6, tone = 'blue',
  examples = 'jaise apni dukan ki cheezon ke naam',
}: Props) {
  const qc = useQueryClient();
  const t = TONES[tone];
  const [search, setSearch] = useState('');
  const [newCat, setNewCat] = useState('');
  const [showNew, setShowNew] = useState(false);

  const { data: cats = [] } = useQuery({ queryKey: ['categories'], queryFn: categoriesApi.list });

  const visible = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return cats as Category[];
    return (cats as Category[]).filter((c) => c.name.toLowerCase().includes(q));
  }, [cats, search]);

  /* Nayi category wahin ban jaye — wizard chhodna na pare */
  const create = useMutation({
    mutationFn: () => categoriesApi.create({ name: newCat.trim() }),
    onSuccess: (created: Category) => {
      toast.success(`"${created.name}" ban gayi`);
      qc.invalidateQueries({ queryKey: ['categories'] });
      onChange(created.id);
      setNewCat('');
      setShowNew(false);
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Category nahi bani'),
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-end">
        <button type="button" onClick={() => setShowNew((v) => !v)}
          className={`h-9 px-3 rounded-lg text-xs font-extrabold inline-flex items-center gap-1 transition ${t.soft}`}>
          <Plus className="h-3.5 w-3.5" /> Nayi category
        </button>
      </div>

      {showNew && (
        <div className={`rounded-xl border-2 p-3 flex gap-2 ${t.box}`}>
          <input
            value={newCat}
            onChange={(e) => setNewCat(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); create.mutate(); } }}
            autoFocus
            placeholder="Category ka naam"
            className={`h-10 flex-1 rounded-lg border-2 border-slate-200 bg-white px-3 text-sm font-bold focus:outline-none transition ${t.ring}`}
          />
          <button type="button" onClick={() => create.mutate()}
            disabled={!newCat.trim() || create.isPending}
            className={`h-10 px-4 rounded-lg text-white text-sm font-extrabold disabled:opacity-50 transition ${t.btn}`}>
            {create.isPending ? '...' : 'Banao'}
          </button>
        </div>
      )}

      {(cats as Category[]).length > searchAfter && (
        <div className="relative">
          <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Category dhoondo..."
            className={`h-11 w-full rounded-xl border-2 border-slate-200 bg-white pl-9 pr-3 text-sm font-bold text-slate-900 focus:outline-none transition ${t.ring}`}
          />
        </div>
      )}

      {(cats as Category[]).length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-6 text-center">
          <Tag className="h-8 w-8 text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-extrabold text-slate-700">Abhi koi category nahi bani</p>
          <p className="text-xs font-semibold text-slate-500 mt-0.5">
            "Nayi category" se banayein — {examples}
          </p>
        </div>
      ) : visible.length === 0 ? (
        <p className="text-sm font-semibold text-slate-500 py-6 text-center">
          "{search}" se koi category nahi mili
        </p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 max-h-72 overflow-y-auto pr-1">
          {visible.map((c) => {
            const on = value === c.id;
            return (
              <button key={c.id} type="button"
                onClick={() => onChange(on ? '' : c.id)}
                className={['p-3 rounded-xl border-2 transition flex items-center gap-2 text-left min-h-[56px]',
                  on ? `${t.on} text-white shadow-md` : `border-slate-200 bg-white text-slate-700 ${t.hover}`].join(' ')}>
                <span className="h-7 w-7 rounded-lg shrink-0 flex items-center justify-center text-sm"
                  style={{ background: on ? 'rgba(255,255,255,.2)' : (c.color ?? '#e2e8f0') }}>
                  {c.icon ?? '📦'}
                </span>
                <span className="text-xs font-extrabold leading-tight truncate">{c.name}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════
   NAAM SE `categoryType` NIKALNA
   ─────────────────────────────────────────────────────────────
   Har industry apni keyword list deti hai. Match na ho to
   fallback (aksar 'OTHER') — koi nuqsan nahi, sirf grouping
   aam ho jati hai.
   ═════════════════════════════════════════════════════════════ */

export function makeCategoryTypeResolver<T extends string>(
  hints: [RegExp, T][],
  fallback: T,
) {
  return (name?: string | null): T => {
    const n = (name ?? '').trim();
    if (!n) return fallback;
    for (const [re, type] of hints) {
      if (re.test(n)) return type;
    }
    return fallback;
  };
}
