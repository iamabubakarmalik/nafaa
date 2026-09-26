import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, X, Plus, Check, Loader2, Sparkles, Tag } from 'lucide-react';
import { toast } from 'sonner';
import { categoriesApi, type Category } from '@modules/inventory/categories/api/categories.api';
import { CATEGORY_SUGGESTIONS, deriveBakeryCategory, prettyCategory } from '../../lib/bakeryCategory';

interface Props {
  /** Chuni hui category ki id ('' = koi nahi) */
  value: string;
  onChange: (categoryId: string, categoryName: string) => void;
  /** Product ka naam — sirf "system ne ye samjha" dikhane ke liye */
  productName?: string;
}

/* ═════════════════════════════════════════════════════════════
   CATEGORY PICKER
   ─────────────────────────────────────────────────────────────
   Sirf EK category — wohi jo dukaan-daar khud banata hai.

   Pehle yahan 36 emoji button ka ek pakka khana tha jis me
   dukaan-daar ki apni cheez shayad hoti hi nahi. Ab neeche wali
   tajaweez sirf madad ke liye hain: click karo to usi naam ki
   category ban jati hai, warna apna naya naam likh lo.
   ═════════════════════════════════════════════════════════════ */
export function BakeryCategoryPicker({ value, onChange, productName }: Props) {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: categoriesApi.list,
  });

  const createMut = useMutation({
    mutationFn: (name: string) => categoriesApi.create({ name }),
    onSuccess: (cat: Category) => {
      qc.invalidateQueries({ queryKey: ['categories'] });
      onChange(cat.id, cat.name);
      setSearch('');
      toast.success(`"${cat.name}" ban gayi`);
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Category nahi ban saki'),
  });

  const selected = categories.find((c) => c.id === value);

  const q = search.trim().toLowerCase();
  const filtered = useMemo(
    () => (q ? categories.filter((c) => c.name.toLowerCase().includes(q)) : categories),
    [categories, q],
  );

  /** Wo tajaweez jo abhi bani hi nahi — banne layak */
  const openSuggestions = useMemo(() => {
    const have = new Set(categories.map((c) => c.name.trim().toLowerCase()));
    return CATEGORY_SUGGESTIONS.filter((s) => !have.has(s.name.toLowerCase()));
  }, [categories]);

  /** Tajweez par click — pehle se ho to chun lo, warna bana do */
  const pickSuggestion = (name: string) => {
    const existing = categories.find(
      (c) => c.name.trim().toLowerCase() === name.trim().toLowerCase(),
    );
    if (existing) return onChange(existing.id, existing.name);
    createMut.mutate(name);
  };

  const exactExists = categories.some(
    (c) => c.name.trim().toLowerCase() === q,
  );

  /* Enum system khud samajhta hai — dukaan-daar ko sirf dikhaya
     jata hai, poocha nahi. */
  const derived = deriveBakeryCategory(selected?.name, productName);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <label className="text-sm font-extrabold text-slate-700 dark:text-slate-300">
          Category <span className="text-rose-500">*</span>
        </label>
        {selected && (
          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 inline-flex items-center gap-1">
            <Sparkles className="h-3 w-3 text-pink-500" />
            System ne samjha: <strong className="text-pink-600 dark:text-pink-400">{prettyCategory(derived)}</strong>
          </span>
        )}
      </div>

      {/* ── Chuni hui ── */}
      {selected ? (
        <div className="flex items-center gap-2.5 rounded-2xl border-2 border-pink-400 bg-pink-50 dark:bg-pink-500/10 p-3">
          <span className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0 text-white font-black"
            style={{ background: selected.color || '#ec4899' }}>
            {selected.name.charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <div className="font-extrabold text-sm text-slate-900 dark:text-white truncate">{selected.name}</div>
            <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
              {selected._count?.products ?? 0} cheezein is category me
            </div>
          </div>
          <button type="button" onClick={() => onChange('', '')}
            className="h-9 w-9 rounded-xl bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0 hover:border-rose-400 transition">
            <X className="h-4 w-4 text-slate-500" />
          </button>
        </div>
      ) : (
        <div className="rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 p-3 text-center">
          <Tag className="h-5 w-5 text-slate-400 mx-auto" />
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-1">
            Koi category nahi chuni — neeche se chuno ya apni banao
          </p>
        </div>
      )}

      {/* ── Dhoondo / banao ── */}
      <div className="relative">
        <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && q && !exactExists) {
              e.preventDefault();
              createMut.mutate(search.trim());
            }
          }}
          placeholder="Category dhoondo ya naya naam likho…"
          className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 pl-9 pr-3 text-sm font-bold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-pink-500"
        />
      </div>

      {q && !exactExists && (
        <button type="button" disabled={createMut.isPending}
          onClick={() => createMut.mutate(search.trim())}
          className="w-full h-11 rounded-xl bg-pink-600 hover:bg-pink-700 disabled:opacity-60 text-white text-sm font-extrabold inline-flex items-center justify-center gap-2 transition">
          {createMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          "{search.trim()}" naam se nayi category banao
        </button>
      )}

      {/* ── Mojooda list ── */}
      {isLoading ? (
        <div className="py-6 text-center">
          <Loader2 className="h-5 w-5 animate-spin text-pink-500 mx-auto" />
        </div>
      ) : filtered.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {filtered.map((c) => {
            const active = c.id === value;
            return (
              <button key={c.id} type="button"
                onClick={() => onChange(c.id, c.name)}
                className={`h-10 px-3 rounded-xl border-2 text-xs font-extrabold inline-flex items-center gap-1.5 transition ${
                  active
                    ? 'border-pink-500 bg-pink-50 dark:bg-pink-500/15 text-pink-700 dark:text-pink-300'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:border-pink-400'
                }`}>
                <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: c.color || '#94a3b8' }} />
                {c.name}
                {active && <Check className="h-3.5 w-3.5" />}
              </button>
            );
          })}
        </div>
      ) : !q ? (
        <p className="text-xs font-bold text-slate-400 text-center py-2">
          Abhi koi category nahi bani — neeche se koi tajweez chuno
        </p>
      ) : null}

      {/* ── Tajaweez ── */}
      {openSuggestions.length > 0 && (
        <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/60 border-2 border-slate-200 dark:border-slate-700 p-3">
          <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">
            Tajaweez — click karo to ban jayegi
          </div>
          <div className="flex flex-wrap gap-1.5">
            {openSuggestions.map((s) => (
              <button key={s.name} type="button" disabled={createMut.isPending}
                onClick={() => pickSuggestion(s.name)}
                className="h-9 px-2.5 rounded-lg bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 hover:border-pink-400 text-[11px] font-extrabold text-slate-700 dark:text-slate-200 inline-flex items-center gap-1.5 disabled:opacity-50 transition">
                <span>{s.emoji}</span> {s.name}
              </button>
            ))}
          </div>
          <p className="text-[10px] font-bold text-slate-400 mt-2">
            Ye sirf madad ke liye hain. Aap ki dukaan me jo naam chalta hai, wohi likh lein.
          </p>
        </div>
      )}
    </div>
  );
}
