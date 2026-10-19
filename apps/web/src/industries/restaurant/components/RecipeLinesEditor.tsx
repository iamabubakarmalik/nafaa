/**
 * Recipe editor used by the menu item editor and the recipes page: pick raw
 * material, write each line in a unit that fits its stock unit (gram for a
 * kg item, ml for litres, pcs or dozen), add wastage, set how many plates
 * the batch makes, and see the plate cost and food cost live.
 *
 * The draft helpers turn an API recipe into a draft and back.
 */

import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { AlertTriangle, Percent, Plus, Search, Trash2, Wheat, X } from 'lucide-react';
import { cn } from '@core/lib/cn';
import { formatPKR } from '@core/lib/format';
import { catalogApi } from '@modules/inventory/products/list/api';
import { productsApi } from '@modules/inventory/products/api/products.api';
import type { Recipe, RecipeInput } from '../api/recipes.api';
import { convertQty, cookUnit, unitChoices } from '../lib/recipeUnits';

export interface RecipeLine {
  ingredientProductId: string;
  name: string;
  /** Unit the ingredient is stocked and costed in. */
  stockUnit: string;
  /** Today's cost per stock unit. */
  rate: number;
  stock: number | null;
  quantity: number;
  unit: string;
  isOptional: boolean;
  notes: string;
}

export interface RecipeDraft {
  lines: RecipeLine[];
  /** Plates one batch of these quantities makes. */
  yieldQuantity: number;
  preparationSteps: string;
  cookingTime: number | null;
}

export const emptyRecipe = (): RecipeDraft => ({ lines: [], yieldQuantity: 1, preparationSteps: '', cookingTime: null });

const r2 = (n: number) => Math.round(n * 100) / 100;
const fmtQty = (n: number) => String(Number(Number(n).toFixed(3)));

export function recipeFromApi(r: Recipe | null | undefined): RecipeDraft {
  if (!r) return emptyRecipe();
  return {
    yieldQuantity: Number(r.yieldQuantity) || 1,
    preparationSteps: r.preparationSteps ?? '',
    cookingTime: r.cookingTime ?? null,
    lines: [...r.ingredients]
      .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0))
      .map((i) => ({
        ingredientProductId: i.ingredientProductId,
        name: i.ingredient?.name ?? 'Saamaan',
        stockUnit: i.ingredient?.unit ?? i.unit,
        rate: Number(i.ingredient?.costPrice) || Number(i.costPerUnit) || 0,
        stock: i.ingredient?.stock != null ? Number(i.ingredient.stock) : null,
        quantity: Number(i.quantity) || 0,
        unit: i.unit,
        isOptional: !!i.isOptional,
        notes: i.notes ?? '',
      })),
  };
}

/** Batch cost (optional lines left out) and cost of one plate. */
export function recipeTotals(d: RecipeDraft) {
  const batch = d.lines.reduce((s, l) => s + (l.isOptional ? 0 : convertQty(l.quantity, l.unit, l.stockUnit) * l.rate), 0);
  return { batch: r2(batch), perPlate: r2(batch / (d.yieldQuantity || 1)) };
}

/** First thing that stops the recipe from saving, or null. */
export function recipeProblem(d: RecipeDraft): string | null {
  if (!d.lines.length) return null;
  const empty = d.lines.find((l) => !(l.quantity > 0));
  if (empty) return `${empty.name}: quantity likhein`;
  if (!(d.yieldQuantity > 0)) return 'Kitni plate banti hain — 0 se zyada likhein';
  return null;
}

export function recipeInput(menuItemId: string, d: RecipeDraft): RecipeInput {
  return {
    menuItemId,
    yieldQuantity: d.yieldQuantity || 1,
    yieldUnit: 'portion',
    preparationSteps: d.preparationSteps.trim() || undefined,
    cookingTime: d.cookingTime ?? undefined,
    ingredients: d.lines.map((l, i) => ({
      ingredientProductId: l.ingredientProductId,
      quantity: l.quantity,
      unit: l.unit,
      costPerUnit: l.rate,
      isOptional: l.isOptional,
      notes: l.notes.trim() || undefined,
      displayOrder: i,
    })),
  };
}

const UNIT_LABEL: Record<string, string> = { gram: 'gram', kg: 'kg', liter: 'litre', ml: 'ml', pcs: 'pcs', dozen: 'darjan' };
const unitLabel = (u: string) => UNIT_LABEL[u] ?? u;
const fieldCls = 'h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-[0.875rem] text-slate-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20';

export function RecipeLinesEditor({ value, onChange, price, dishProductId }: {
  value: RecipeDraft;
  onChange: (d: RecipeDraft) => void;
  /** Menu price of one plate, for food cost %. */
  price?: number;
  /** The dish itself, kept out of the ingredient search. */
  dishProductId?: string;
}) {
  const [q, setQ] = useState('');
  const [all, setAll] = useState(false);
  const [adding, setAdding] = useState(false);
  const [wasteAt, setWasteAt] = useState<number | null>(null);
  const term = q.trim();

  const search = useQuery({
    queryKey: ['restaurant-ingredient-search', term, all],
    queryFn: () => catalogApi.list({ search: term || undefined, stock: 'all', active: 'active', sort: 'name', kindOf: all ? undefined : 'raw' }, 1, 40),
    staleTime: 30_000,
  });
  const chosen = new Set(value.lines.map((l) => l.ingredientProductId));
  const options = (search.data?.items ?? []).filter((i) => !chosen.has(i.id) && i.id !== dishProductId).slice(0, 14);

  const setLines = (lines: RecipeLine[]) => onChange({ ...value, lines });
  const patch = (i: number, p: Partial<RecipeLine>) => setLines(value.lines.map((l, j) => (j === i ? { ...l, ...p } : l)));
  const add = (item: { id: string; name: string; unit: string; costPrice: number; stock: number }) => {
    setLines([...value.lines, {
      ingredientProductId: item.id, name: item.name, stockUnit: item.unit, rate: Number(item.costPrice) || 0, stock: Number(item.stock),
      quantity: 0, unit: cookUnit(item.unit), isOptional: false, notes: '',
    }]);
    setQ('');
  };

  const totals = recipeTotals(value);
  const pct = price && price > 0 ? (totals.perPlate / price) * 100 : null;

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex flex-wrap gap-2">
          <label className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Chicken, chawal, oil, tamatar…" aria-label="Raw material search"
              className={cn(fieldCls, 'h-10 w-full pl-9')} />
          </label>
          <button type="button" onClick={() => setAll((v) => !v)} aria-pressed={all}
            className={cn('h-10 rounded-lg px-3 text-[0.8125rem] font-semibold ring-1', all ? 'bg-slate-900 text-white ring-slate-900' : 'bg-white text-slate-600 ring-slate-200 hover:bg-slate-50')}>
            {all ? 'Sab maal' : 'Sirf raw material'}
          </button>
          <button type="button" onClick={() => setAdding((v) => !v)} className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-amber-50 px-3 text-[0.8125rem] font-semibold text-amber-900 ring-1 ring-amber-200 hover:bg-amber-100">
            <Plus className="h-4 w-4" />Naya raw material
          </button>
        </div>
        {adding && <QuickRawMaterial initialName={term} onDone={(p) => { setAdding(false); if (p) add(p); }} />}
        <div className="flex flex-wrap gap-1.5">
          {search.isLoading && <span className="text-[0.8125rem] text-slate-400">Dhoond rahe hain…</span>}
          {!search.isLoading && !options.length && (
            <span className="text-[0.8125rem] text-slate-500">
              {term ? `"${term}" nahi mila — "Naya raw material" se banayein` : 'Koi raw material nahi. Pehle chicken, chawal, oil jaisi cheezein "Raw material" bana kar daalein.'}
            </span>
          )}
          {options.map((i) => (
            <button key={i.id} type="button" onClick={() => add(i)}
              className="inline-flex h-8 items-center gap-1 rounded-full bg-slate-100 px-3 text-[0.8125rem] font-medium text-slate-800 hover:bg-brand-50 hover:text-brand-800">
              <Plus className="h-3.5 w-3.5" />{i.name}
              <span className="text-slate-500">· {i.costPrice > 0 ? `${formatPKR(i.costPrice)}/${unitLabel(i.unit)}` : 'cost nahi'}</span>
            </button>
          ))}
        </div>
      </div>

      {value.lines.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-8 text-center">
          <Wheat className="mx-auto h-6 w-6 text-amber-600" />
          <p className="mt-2 text-[0.875rem] font-semibold text-slate-800">Abhi recipe khali hai</p>
          <p className="mt-0.5 text-[0.8125rem] text-slate-500">Upar se saamaan chunein. Dish bikne par yahi saamaan stock se nikalta hai aur cost isi se banti hai.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {value.lines.map((l, i) => {
            const units = unitChoices(l.stockUnit);
            const fits = units.includes(l.unit);
            const used = convertQty(l.quantity, l.unit, l.stockUnit);
            const cost = used * l.rate;
            const perPlate = used / (value.yieldQuantity || 1);
            const plates = l.stock != null && perPlate > 0 ? Math.floor(l.stock / perPlate) : null;
            return (
              <li key={l.ingredientProductId} className={cn('rounded-xl border p-2.5', l.quantity > 0 && fits ? 'border-slate-200' : 'border-rose-300 bg-rose-50/40')}>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[0.875rem] font-semibold text-slate-900">{l.name}</p>
                    <p className="text-[0.75rem] text-slate-500">
                      {l.rate > 0 ? `${formatPKR(l.rate)} fi ${unitLabel(l.stockUnit)}` : <span className="text-amber-700">Cost nahi — purchase se aayegi</span>}
                      {l.stock != null && <> · stock {fmtQty(l.stock)} {unitLabel(l.stockUnit)}{plates !== null && !l.isOptional ? ` · ${plates} plate` : ''}</>}
                    </p>
                  </div>
                  <input inputMode="decimal" value={l.quantity || ''} placeholder="Kitna" aria-label={`${l.name} quantity`}
                    onChange={(e) => patch(i, { quantity: Number(e.target.value.replace(/[^\d.]/g, '')) || 0 })}
                    className={cn(fieldCls, 'w-24 text-right tabular-nums')} />
                  <select value={l.unit} onChange={(e) => patch(i, { unit: e.target.value })} aria-label={`${l.name} unit`} className={cn(fieldCls, 'w-24')}>
                    {!fits && <option value={l.unit}>{unitLabel(l.unit)} (ghalat)</option>}
                    {units.map((u) => <option key={u} value={u}>{unitLabel(u)}</option>)}
                  </select>
                  <span className="w-20 text-right text-[0.8125rem] font-semibold tabular-nums text-slate-800">{l.isOptional ? '—' : formatPKR(cost)}</span>
                  <button type="button" onClick={() => setWasteAt(wasteAt === i ? null : i)} title="Wastage jorein" aria-label="Wastage"
                    className={cn('flex h-9 w-9 items-center justify-center rounded-lg ring-1', wasteAt === i ? 'bg-amber-100 text-amber-800 ring-amber-200' : 'text-slate-500 ring-slate-200 hover:bg-slate-50')}>
                    <Percent className="h-4 w-4" />
                  </button>
                  <button type="button" onClick={() => setLines(value.lines.filter((_, j) => j !== i))} aria-label="Hatayein"
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-rose-600 hover:bg-rose-50"><Trash2 className="h-4 w-4" /></button>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-[0.75rem] text-slate-600">
                  <label className="inline-flex items-center gap-1.5">
                    <input type="checkbox" checked={l.isOptional} onChange={(e) => patch(i, { isOptional: e.target.checked })} className="h-4 w-4 rounded border-slate-300" />
                    Marzi ka (grahak maange to) — stock aur cost me nahi ginta
                  </label>
                  <input value={l.notes} onChange={(e) => patch(i, { notes: e.target.value.slice(0, 200) })} placeholder="Note (marzi hai)" aria-label={`${l.name} note`}
                    className={cn(fieldCls, 'h-8 min-w-[10rem] flex-1 text-[0.75rem]')} />
                </div>
                {!fits && <p className="mt-1.5 text-[0.75rem] font-medium text-rose-700">Stock {unitLabel(l.stockUnit)} me hai — {units.map(unitLabel).join(' ya ')} chunein</p>}
                {wasteAt === i && <WastageRow line={l} onApply={(qty, note) => { patch(i, { quantity: qty, notes: note }); setWasteAt(null); }} />}
              </li>
            );
          })}
        </ul>
      )}

      {value.lines.length > 0 && (
        <div className="grid gap-3 rounded-2xl bg-slate-50 p-3.5 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
          <label className="block text-[0.8125rem] font-medium text-slate-700">
            Is saamaan se kitni plate banti hain
            <input inputMode="decimal" value={value.yieldQuantity || ''} onChange={(e) => onChange({ ...value, yieldQuantity: Number(e.target.value.replace(/[^\d.]/g, '')) || 0 })}
              className={cn(fieldCls, 'mt-1.5 w-full text-right font-semibold tabular-nums')} />
            <span className="mt-1 block text-[0.6875rem] font-normal text-slate-500">Degh ki recipe ho to poori degh ka saamaan likhein aur yahan plate ginein (maslan 40)</span>
          </label>
          <div className="grid grid-cols-3 gap-2 text-[0.8125rem]">
            <Fact label="Poora saamaan" value={formatPKR(totals.batch)} />
            <Fact label="Ek plate ki cost" value={formatPKR(totals.perPlate)} strong />
            <Fact label="Food cost" value={pct === null ? '—' : `${pct.toFixed(1)}%`}
              hint={pct === null ? 'Rate likhein' : `Profit ${formatPKR((price ?? 0) - totals.perPlate)}`}
              tone={pct === null ? undefined : pct > 45 ? 'bad' : pct > 35 ? 'warn' : 'good'} />
          </div>
        </div>
      )}
      {value.lines.some((l) => !(l.rate > 0) && !l.isOptional) && (
        <p className="flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2 text-[0.75rem] text-amber-900 ring-1 ring-amber-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />Kuch saamaan ki cost nahi likhi — plate ki cost kam dikhegi. Purchase karne par cost khud aa jati hai.
        </p>
      )}
    </div>
  );
}

function Fact({ label, value, hint, strong, tone }: { label: string; value: string; hint?: string; strong?: boolean; tone?: 'good' | 'warn' | 'bad' }) {
  return (
    <div className="rounded-xl bg-white p-2.5 ring-1 ring-slate-200">
      <p className="text-[0.6875rem] font-medium text-slate-500">{label}</p>
      <p className={cn('truncate font-bold tabular-nums', strong ? 'text-[1.0625rem] text-slate-900' : 'text-slate-800',
        tone === 'bad' && 'text-rose-700', tone === 'warn' && 'text-amber-700', tone === 'good' && 'text-success-700')}>{value}</p>
      {hint && <p className="truncate text-[0.6875rem] text-slate-500">{hint}</p>}
    </div>
  );
}

/** Net quantity plus wastage %, written back as the gross quantity the store gives out. */
function WastageRow({ line, onApply }: { line: RecipeLine; onApply: (qty: number, note: string) => void }) {
  const [net, setNet] = useState(line.quantity ? String(line.quantity) : '');
  const [pct, setPct] = useState('10');
  const n = Number(net) || 0;
  const p = Number(pct) || 0;
  const gross = Math.round(n * (1 + p / 100) * 1000) / 1000;
  return (
    <div className="mt-2 flex flex-wrap items-end gap-2 rounded-lg bg-amber-50 p-2.5 ring-1 ring-amber-200">
      <label className="text-[0.6875rem] font-semibold text-amber-900">Saaf maal ({unitLabel(line.unit)})
        <input inputMode="decimal" value={net} onChange={(e) => setNet(e.target.value.replace(/[^\d.]/g, ''))} className={cn(fieldCls, 'mt-1 block w-24 text-right')} />
      </label>
      <label className="text-[0.6875rem] font-semibold text-amber-900">Wastage %
        <input inputMode="decimal" value={pct} onChange={(e) => setPct(e.target.value.replace(/[^\d.]/g, ''))} className={cn(fieldCls, 'mt-1 block w-20 text-right')} />
      </label>
      <p className="pb-2 text-[0.75rem] text-amber-900">Stock se niklega: <strong className="tabular-nums">{fmtQty(gross)} {unitLabel(line.unit)}</strong></p>
      <button type="button" disabled={!(n > 0)} onClick={() => onApply(gross, `Saaf ${fmtQty(n)} ${unitLabel(line.unit)} + ${fmtQty(p)}% wastage`)}
        className="ml-auto h-9 rounded-lg bg-amber-600 px-3 text-[0.8125rem] font-semibold text-white disabled:opacity-50">Laga dein</button>
    </div>
  );
}

const RAW_UNITS = [
  { value: 'kg', label: 'Kilo' }, { value: 'gram', label: 'Gram' }, { value: 'liter', label: 'Litre' },
  { value: 'ml', label: 'ML' }, { value: 'pcs', label: 'Adad (pcs)' }, { value: 'dozen', label: 'Darjan' },
];

/** Adds a raw material (name, stock unit, cost) without leaving the recipe. */
function QuickRawMaterial({ initialName, onDone }: {
  initialName: string;
  onDone: (p: { id: string; name: string; unit: string; costPrice: number; stock: number } | null) => void;
}) {
  const qc = useQueryClient();
  const [name, setName] = useState(initialName);
  const [unit, setUnit] = useState('kg');
  const [rate, setRate] = useState('');
  const [busy, setBusy] = useState(false);
  const problem = useMemo(() => (!name.trim() ? 'Naam likhein' : null), [name]);

  const save = async () => {
    if (problem || busy) return;
    setBusy(true);
    try {
      // The shared payload type has no raw-material flag; the API takes it.
      const p = await productsApi.create({ name: name.trim(), unit, price: 0, costPrice: Number(rate) || 0, stock: 0, isRawMaterial: true } as never);
      qc.invalidateQueries({ queryKey: ['restaurant-ingredient-search'] });
      toast.success(`${p.name} raw material me jur gaya — stock purchase se aayega`);
      onDone({ id: p.id, name: p.name, unit: p.unit, costPrice: Number(p.costPrice) || 0, stock: 0 });
    } catch (e) {
      toast.error((e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Raw material nahi bana');
    } finally { setBusy(false); }
  };

  return (
    <div className="flex flex-wrap items-end gap-2 rounded-xl bg-amber-50 p-3 ring-1 ring-amber-200">
      <label className="min-w-[10rem] flex-1 text-[0.75rem] font-semibold text-amber-900">Naam
        <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Maslan: Chicken boneless" className={cn(fieldCls, 'mt-1 block w-full')}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void save(); } }} />
      </label>
      <label className="text-[0.75rem] font-semibold text-amber-900">Stock kis me
        <select value={unit} onChange={(e) => setUnit(e.target.value)} className={cn(fieldCls, 'mt-1 block w-28')}>
          {RAW_UNITS.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
        </select>
      </label>
      <label className="text-[0.75rem] font-semibold text-amber-900">Cost fi {unitLabel(unit)}
        <input inputMode="decimal" value={rate} onChange={(e) => setRate(e.target.value.replace(/[^\d.]/g, ''))} placeholder="0" className={cn(fieldCls, 'mt-1 block w-24 text-right')} />
      </label>
      <button type="button" onClick={() => void save()} disabled={!!problem || busy} className="h-9 rounded-lg bg-amber-600 px-3 text-[0.8125rem] font-semibold text-white disabled:opacity-50">
        {busy ? 'Ban raha…' : 'Jorein'}
      </button>
      <button type="button" onClick={() => onDone(null)} aria-label="Band" className="flex h-9 w-9 items-center justify-center rounded-lg text-amber-800 hover:bg-amber-100"><X className="h-4 w-4" /></button>
      <p className="w-full text-[0.6875rem] text-amber-800">Poori details (packing, kam stock ki had) baad me <Link to="/products" className="font-semibold underline">Menu → Raw material</Link> se.</p>
    </div>
  );
}
