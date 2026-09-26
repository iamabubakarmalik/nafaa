import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Wheat, Plus, Trash2, Search, Calculator, ArrowRight,
  AlertTriangle, Info, Loader2,
} from 'lucide-react';
import { formatPKR } from '@core/lib/format';
import { ingredientsApi, type Ingredient } from '../../api/ingredients.api';
import type { BakeryRecipeLine } from '../../hooks/useBakeryWizard';

interface Props {
  recipe: BakeryRecipeLine[];
  onAdd: (line: BakeryRecipeLine) => void;
  onUpdate: (ingredientId: string, patch: Partial<BakeryRecipeLine>) => void;
  onRemove: (ingredientId: string) => void;
  /** Ek baar me kitni cheezein banti hain — kharcha isi se taqseem hota hai */
  yieldQty: number;
  onYieldChange: (n: number) => void;
  /** Recipe ka kharcha cost me daalne ke liye */
  onApplyCost?: (costPerUnit: number) => void;
  currentCost?: number | '';
  itemName?: string;
}

/* ═════════════════════════════════════════════════════════════
   RECIPE — "is cake me kya kya lagta hai"
   ─────────────────────────────────────────────────────────────
   Pehle iska koi jawab hi nahi tha. Ingredients ka safha alag
   chalta tha aur product ka alag — beech me koi taar nahi thi.
   Is se do nuqsaan the:

     1. Cost hamesha haath se likhni parti thi, aur maida mehnga
        hote hi purani hi rehti thi.
     2. "Ek cake me kitna kharcha aata hai" ka jawab kisi ke paas
        nahi tha — munafa sirf andaza tha.

   Ab recipe seedha product ke sath judi hai, aur kharcha khud
   ginta hai.
   ═════════════════════════════════════════════════════════════ */
export function BakeryRecipeBuilder({
  recipe, onAdd, onUpdate, onRemove,
  yieldQty, onYieldChange, onApplyCost, currentCost, itemName,
}: Props) {
  const [search, setSearch] = useState('');

  const { data: ingredients = [], isLoading } = useQuery({
    queryKey: ['bakery-ingredients-for-recipe'],
    queryFn: () => ingredientsApi.list({}),
  });

  const chosen = new Set(recipe.map((r) => r.ingredientId));
  const q = search.trim().toLowerCase();

  const options = useMemo(
    () => ingredients
      .filter((i) => i.isActive !== false && !chosen.has(i.id))
      .filter((i) => (q ? i.name.toLowerCase().includes(q) : true))
      .slice(0, 24),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ingredients, q, recipe],
  );

  const batchCost = recipe.reduce(
    (s, r) => s + Number(r.qty || 0) * Number(r.costPerUnit || 0), 0,
  );
  const perUnitCost = yieldQty > 0 ? batchCost / yieldQty : batchCost;

  const costDiffers =
    currentCost !== '' && currentCost !== undefined &&
    Math.abs(Number(currentCost) - perUnitCost) > 0.5;

  return (
    <section className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-slate-200 dark:border-neutral-800 shadow-sm p-5 space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h3 className="font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <Wheat className="h-4 w-4 text-violet-600" />
            {itemName ? `"${itemName}" me kya lagta hai` : 'Is me kya kya lagta hai'}
          </h3>
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-0.5">
            Marzi ki baat hai — bharenge to cost khud nikal aayegi
          </p>
        </div>
        <Link to="/bakery/ingredients"
          className="h-9 px-3 rounded-xl bg-violet-50 dark:bg-violet-500/15 text-violet-700 dark:text-violet-300 text-[11px] font-black inline-flex items-center gap-1.5 hover:bg-violet-100 transition">
          Saamaan ki list <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* ── Chuni hui lines ── */}
      {recipe.length > 0 && (
        <div className="space-y-2">
          {recipe.map((r) => {
            const bad = r.qty === '' || Number(r.qty) <= 0;
            return (
              <div key={r.ingredientId}
                className={`rounded-2xl border-2 p-3 flex items-center gap-2.5 ${
                  bad ? 'border-rose-300 bg-rose-50 dark:bg-rose-500/10' : 'border-slate-200 dark:border-neutral-700 bg-slate-50 dark:bg-neutral-800/60'
                }`}>
                <span className="h-9 w-9 rounded-xl bg-violet-100 dark:bg-violet-500/20 flex items-center justify-center shrink-0">
                  <Wheat className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="font-extrabold text-sm text-slate-900 dark:text-white truncate">{r.name}</div>
                  <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 tabular-nums">
                    {formatPKR(r.costPerUnit)} / {r.unit}
                  </div>
                </div>
                <input
                  type="number" min={0} step="any"
                  value={r.qty}
                  onChange={(e) => onUpdate(r.ingredientId, { qty: e.target.value === '' ? '' : Number(e.target.value) })}
                  placeholder="0"
                  className={`h-10 w-24 rounded-xl border-2 bg-white dark:bg-neutral-900 px-2 text-sm font-extrabold text-center tabular-nums focus:outline-none ${
                    bad ? 'border-rose-400' : 'border-slate-200 dark:border-neutral-700 focus:border-violet-500'
                  }`}
                />
                <span className="text-[11px] font-black text-slate-500 w-10 shrink-0">{r.unit}</span>
                <span className="text-sm font-black text-slate-900 dark:text-white tabular-nums w-20 text-right shrink-0">
                  {formatPKR(Number(r.qty || 0) * Number(r.costPerUnit || 0))}
                </span>
                <button type="button" onClick={() => onRemove(r.ingredientId)}
                  className="h-9 w-9 rounded-xl bg-white dark:bg-neutral-900 border-2 border-slate-200 dark:border-neutral-700 hover:border-rose-400 flex items-center justify-center shrink-0 transition">
                  <Trash2 className="h-4 w-4 text-rose-500" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Kharcha ── */}
      {recipe.length > 0 && (
        <div className="rounded-2xl bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-500/10 dark:to-purple-500/10 border-2 border-violet-200 dark:border-violet-500/30 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Calculator className="h-4 w-4 text-violet-600" />
            <span className="text-sm font-extrabold text-violet-900 dark:text-violet-200">Kharcha</span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[12px] font-bold text-slate-600 dark:text-slate-300">
              Itna saamaan lagane se kitni cheezein banti hain?
            </span>
            <input
              type="number" min={1} step="any"
              value={yieldQty}
              onChange={(e) => onYieldChange(Math.max(Number(e.target.value) || 1, 0.01))}
              className="h-10 w-24 rounded-xl border-2 border-violet-200 dark:border-violet-500/30 bg-white dark:bg-neutral-900 px-2 text-sm font-extrabold text-center tabular-nums focus:outline-none focus:border-violet-500"
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-2">
            <div className="rounded-xl bg-white dark:bg-neutral-900 p-3">
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">Poore batch ka</div>
              <div className="text-lg font-black text-slate-900 dark:text-white tabular-nums">{formatPKR(batchCost)}</div>
            </div>
            <div className="rounded-xl bg-white dark:bg-neutral-900 p-3">
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">Ek cheez ka</div>
              <div className="text-lg font-black text-violet-700 dark:text-violet-300 tabular-nums">{formatPKR(perUnitCost)}</div>
            </div>
          </div>

          {onApplyCost && perUnitCost > 0 && (
            <button type="button" onClick={() => onApplyCost(Number(perUnitCost.toFixed(2)))}
              className="w-full h-11 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-extrabold inline-flex items-center justify-center gap-2 transition">
              <Calculator className="h-4 w-4" /> Ye kharcha cost me daal do
            </button>
          )}

          {costDiffers && (
            <div className="flex gap-2 rounded-xl bg-amber-50 dark:bg-amber-500/10 border-2 border-amber-200 dark:border-amber-500/30 p-2.5">
              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-[11px] font-bold text-amber-900 dark:text-amber-200">
                Aap ne cost {formatPKR(Number(currentCost))} likhi hai, magar recipe se{' '}
                {formatPKR(perUnitCost)} banti hai. Dono me farq hai — munafa is se bigar jayega.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── Naya saamaan chunna ── */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Saamaan dhoondein — maida, cheeni, makkhan…"
            className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 pl-9 pr-3 text-sm font-bold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-violet-500"
          />
        </div>

        {isLoading ? (
          <div className="py-5 text-center"><Loader2 className="h-5 w-5 animate-spin text-violet-500 mx-auto" /></div>
        ) : options.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {options.map((i: Ingredient) => (
              <button key={i.id} type="button"
                onClick={() => {
                  onAdd({
                    ingredientId: i.id,
                    name: i.name,
                    qty: '',
                    unit: i.unit,
                    costPerUnit: Number(i.costPerUnit) || 0,
                  });
                  setSearch('');
                }}
                className="h-10 px-3 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:border-violet-400 text-xs font-extrabold text-slate-700 dark:text-slate-200 inline-flex items-center gap-1.5 transition">
                <Plus className="h-3.5 w-3.5 text-violet-500" /> {i.name}
                <span className="text-[10px] text-slate-400 tabular-nums">{formatPKR(i.costPerUnit)}/{i.unit}</span>
              </button>
            ))}
          </div>
        ) : ingredients.length === 0 ? (
          <div className="rounded-2xl bg-slate-50 dark:bg-neutral-800 border-2 border-dashed border-slate-300 dark:border-neutral-700 p-4 text-center">
            <Wheat className="h-6 w-6 text-slate-400 mx-auto" />
            <p className="text-sm font-extrabold text-slate-700 dark:text-slate-200 mt-2">Abhi koi saamaan nahi</p>
            <p className="text-[11px] font-bold text-slate-500 mt-1">
              Pehle maida, cheeni, makkhan waghera daalein — phir yahan chun sakenge.
            </p>
            <Link to="/bakery/ingredients"
              className="mt-3 h-10 px-4 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-extrabold inline-flex items-center gap-1.5 transition">
              <Plus className="h-4 w-4" /> Saamaan daalein
            </Link>
          </div>
        ) : (
          <p className="text-xs font-bold text-slate-400 text-center py-2">
            {q ? `"${search}" se kuch nahi mila` : 'Saara saamaan recipe me aa chuka hai'}
          </p>
        )}
      </div>

      {recipe.length === 0 && ingredients.length > 0 && (
        <div className="flex gap-2 rounded-2xl bg-slate-50 dark:bg-neutral-800 border-2 border-slate-200 dark:border-neutral-700 p-3">
          <Info className="h-4 w-4 text-slate-500 shrink-0 mt-0.5" />
          <p className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
            Recipe bharna zaroori nahi. Lekin bhar dein to ek faida hai: maida ya cheeni ka
            rate barhte hi aap ko pata chal jayega ke ab ek cake par kitna kharcha aa raha hai.
          </p>
        </div>
      )}
    </section>
  );
}
