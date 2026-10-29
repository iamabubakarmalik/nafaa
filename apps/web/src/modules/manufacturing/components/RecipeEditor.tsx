/**
 * Recipe editor (bill of materials) for one product: raw items with quantity
 * and unit, how many units one batch makes, wastage, fixed costs per batch,
 * and "made when sold". The cost per unit, the margin on each selling price
 * and what the stock can make update as you type.
 *
 * Used on the Recipes page, the product detail page and the product editor.
 * Keys: Enter moves to the next field · Ctrl/Cmd+S saves.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AlertTriangle, Coins, Factory, Percent, Save, Trash2, Zap } from 'lucide-react';
import { Badge, Button, Kbd, Switch, confirmDialog } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { PRICE_TIER_LABEL } from '@core/lib/priceTiers';
import { useMasked } from '@modules/dashboard/engine/useMasked';
import { ProductSearch } from '@modules/inventory/stock-adjustments/components/ProductSearch';
import { usePurchaseSources, type Source } from '@modules/purchasing/purchases/editor/sources';
import { MFG_KEY, errText, manufacturingApi, qty, type Recipe, type RecipeInput } from '../api';
import { baseQty, marginPct, round, unitOptions, wholeUnits, type UnitOption } from '../units';

interface LineDraft {
  key: string;
  productId: string;
  name: string;
  stockUnit: string;
  cost: number;
  stock: number;
  options: UnitOption[];
  unitKey: string;
  quantity: number;
}

export interface RecipeEditorProduct {
  id: string;
  name: string;
  unit: string;
  price: number;
  wholesalePrice?: number | null;
  creditPrice?: number | null;
}

const num = (v: string) => (v.trim() === '' ? 0 : Number(v));
const inputCls = 'h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm tabular-nums text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15 disabled:bg-slate-50';

let seq = 0;
const lineKey = () => `l${++seq}`;

/** A saved recipe line as an editable row; its pack (if any) is kept as a unit choice. */
function fromSaved(l: Recipe['lines'][number]): LineDraft {
  const packs = l.unitId && l.packRate ? [{ id: l.unitId, name: l.unitName, rate: l.packRate }] : [];
  const options = unitOptions(l.stockUnit, packs);
  const match = l.unitId ? options.find((o) => o.unitId === l.unitId) : options.find((o) => o.name.toLowerCase() === l.unitName.toLowerCase());
  const opts = match ? options : [...options, { key: `rel:${l.unitName}`, name: l.unitName, unitId: null, packRate: null }];
  return {
    key: lineKey(), productId: l.productId, name: l.name, stockUnit: l.stockUnit,
    cost: l.unitCost ?? 0, stock: l.stock, options: opts, unitKey: match?.key ?? `rel:${l.unitName}`, quantity: l.quantity,
  };
}

export function RecipeEditor({ product, recipe, canEdit, onSaved, compact }: {
  product: RecipeEditorProduct;
  recipe: Recipe | null;
  canEdit: boolean;
  onSaved?: (r: Recipe | null) => void;
  /** Tighter layout inside another page (product editor). */
  compact?: boolean;
}) {
  const qc = useQueryClient();
  const { cost: money, costHidden } = useMasked();
  const { sources, byCode, loading } = usePurchaseSources(false);
  const bySource = useMemo(() => new Map(sources.map((s) => [s.id, s])), [sources]);

  const [yieldQty, setYieldQty] = useState(String(recipe?.yieldQty ?? 1));
  const [wastage, setWastage] = useState(String(recipe?.wastagePercent ?? 0));
  const [packing, setPacking] = useState(String(recipe?.packingCost ?? 0));
  const [labour, setLabour] = useState(String(recipe?.labourCost ?? 0));
  const [overhead, setOverhead] = useState(String(recipe?.overheadCost ?? 0));
  const [makeOnSale, setMakeOnSale] = useState(!!recipe?.makeOnSale);
  const [active, setActive] = useState(recipe?.isActive ?? true);
  // Lines start from the saved recipe at once; the product list adds pack choices when it arrives.
  const [lines, setLines] = useState<LineDraft[]>(() => (recipe?.lines ?? []).map((l) => fromSaved(l)));
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const focusKey = useRef<string | null>(null);

  useEffect(() => {
    if (!bySource.size) return;
    setLines((ls) => ls.map((l) => {
      const s = bySource.get(l.productId);
      if (!s) return l;
      const chosen = l.options.find((o) => o.key === l.unitKey);
      const options = unitOptions(l.stockUnit, s.units);
      const keep = chosen && !options.some((o) => o.key === chosen.key) ? [...options, chosen] : options;
      return { ...l, options: keep };
    }));
  }, [bySource]);

  useEffect(() => {
    if (!focusKey.current) return;
    const el = document.querySelector<HTMLInputElement>(`[data-qty="${focusKey.current}"]`);
    focusKey.current = null;
    el?.focus();
    el?.select();
  }, [lines]);

  const touch = () => setDirty(true);

  const add = (s: Source) => {
    if (s.id === product.id) { toast.error('Product apni hi Recipe me nahi aa sakta'); return; }
    if (s.hasVariants) { toast.error(`${s.name} ke variants hain — bina variant wala item lein`); return; }
    const existing = lines.find((l) => l.productId === s.id);
    if (existing) { focusKey.current = existing.key; setLines((ls) => [...ls]); return; }
    const options = unitOptions(s.baseUnit, s.units);
    const key = lineKey();
    focusKey.current = key;
    setLines((ls) => [...ls, { key, productId: s.id, name: s.name, stockUnit: s.baseUnit, cost: s.cost, stock: s.stock, options, unitKey: 'base', quantity: 1 }]);
    touch();
  };

  const patch = (key: string, p: Partial<LineDraft>) => { setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...p } : l))); touch(); };
  const remove = (key: string) => { setLines((ls) => ls.filter((l) => l.key !== key)); touch(); };

  // Live cost: the same rules as the server.
  const calc = useMemo(() => {
    const y = num(yieldQty) > 0 ? num(yieldQty) : 1;
    const w = 1 + Math.max(0, num(wastage)) / 100;
    let canBatches = Number.POSITIVE_INFINITY;
    let limitedBy: string | null = null;
    const rows = lines.map((l) => {
      const unit = l.options.find((o) => o.key === l.unitKey) ?? l.options[0];
      const base = baseQty(l.quantity, unit, l.stockUnit) * w;
      const c = base * l.cost;
      const covers = base > 0 ? Math.max(0, l.stock) / base : Number.POSITIVE_INFINITY;
      if (covers < canBatches) { canBatches = covers; limitedBy = l.name; }
      return { key: l.key, base, cost: c, unit };
    });
    const material = rows.reduce((s, r) => s + r.cost, 0);
    const extra = Math.max(0, num(packing)) + Math.max(0, num(labour)) + Math.max(0, num(overhead));
    const total = material + extra;
    const unitCost = total / y;
    const batches = Number.isFinite(canBatches) ? Math.floor(canBatches * 1000) / 1000 : 0;
    return { rows: new Map(rows.map((r) => [r.key, r])), material, extra, total, unitCost, y, batches, units: Math.floor(batches * y * 1000) / 1000, limitedBy };
  }, [lines, yieldQty, wastage, packing, labour, overhead]);

  const tiers: Array<[string, number | null | undefined]> = [
    [PRICE_TIER_LABEL.RETAIL, product.price],
    [PRICE_TIER_LABEL.WHOLESALE, product.wholesalePrice],
    [PRICE_TIER_LABEL.CREDIT, product.creditPrice],
  ];

  const save = async () => {
    if (!canEdit || busy) return;
    if (!lines.length) { toast.error('Kam se kam ek raw item jorein'); return; }
    if (!(num(yieldQty) > 0)) { toast.error('Ek batch se kitna banta hai — likhein'); return; }
    if (lines.some((l) => !(l.quantity > 0))) { toast.error('Har raw item ki quantity likhein'); return; }
    const body: RecipeInput = {
      yieldQty: num(yieldQty), wastagePercent: num(wastage), packingCost: num(packing), labourCost: num(labour), overheadCost: num(overhead),
      makeOnSale, isActive: active,
      lines: lines.map((l) => {
        const u = l.options.find((o) => o.key === l.unitKey) ?? l.options[0];
        return { productId: l.productId, quantity: l.quantity, unitName: u.name, unitId: u.unitId };
      }),
    };
    setBusy(true);
    try {
      const res = await manufacturingApi.saveRecipe(product.id, body);
      toast.success('Recipe save ho gayi');
      setDirty(false);
      void qc.invalidateQueries({ queryKey: [MFG_KEY] });
      void qc.invalidateQueries({ queryKey: ['product', product.id] });
      onSaved?.(res.recipe);
    } catch (e) { toast.error(errText(e, 'Save nahi hui')); }
    finally { setBusy(false); }
  };

  const del = async () => {
    if (!recipe || !canEdit) return;
    const ok = await confirmDialog({ title: `"${product.name}" ki Recipe hatayein?`, text: 'Pichhli production ka record rahega. Product waisa hi rahega.', yes: 'Hatayein', danger: true });
    if (!ok) return;
    try {
      await manufacturingApi.deleteRecipe(product.id);
      toast.success('Recipe hata di');
      void qc.invalidateQueries({ queryKey: [MFG_KEY] });
      onSaved?.(null);
    } catch (e) { toast.error(errText(e)); }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Inside the product editor Ctrl+S saves the product, so the recipe keeps its own button there.
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's' && canEdit && !compact) { e.preventDefault(); void save(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const marginText = (m: number | null) => (m === null ? '—' : `${m.toFixed(1)}%`);
  const ro = !canEdit;

  return (
    <div className={cn('grid gap-4', !compact && 'xl:grid-cols-[minmax(0,1fr)_20rem]')}>
      <div className="min-w-0 space-y-4">
        {/* Raw items */}
        <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80 sm:p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-[0.9375rem] font-semibold text-slate-900">Raw maal (1 batch)</h3>
              <p className="text-[0.8125rem] text-slate-500">Ek batch me kya kya lagta hai — g, kg, packing sab chalta hai</p>
            </div>
            {!ro && <p className="hidden items-center gap-1 text-[0.75rem] text-slate-500 sm:inline-flex"><Kbd>Enter</Kbd> agla{!compact && <> · <Kbd>Ctrl</Kbd>+<Kbd>S</Kbd> save</>}</p>}
          </div>
          {!ro && (
            <ProductSearch sources={sources.filter((s) => s.id !== product.id)} byCode={byCode} loading={loading} showUnits={false}
              placeholder="Raw item dhoondein — naam, SKU ya barcode…" onPick={(s) => add(s)} />
          )}
          {lines.length === 0 ? (
            <p className="mt-4 rounded-xl bg-slate-50 px-4 py-6 text-center text-[0.875rem] text-slate-500">Abhi koi raw item nahi. Upar se dhoond kar jorein — jaise moong daal, masoor, packing bag.</p>
          ) : (
            <ul data-enter-next className="mt-3 divide-y divide-slate-100">
              {lines.map((l) => {
                const r = calc.rows.get(l.key);
                const short = r && r.base > Math.max(0, l.stock);
                return (
                  <li key={l.key} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] items-center gap-x-2 gap-y-2 py-2.5 sm:grid-cols-[minmax(0,1fr)_7rem_7.5rem_6.5rem_2.25rem] sm:gap-x-3">
                    <div className="col-span-2 min-w-0 sm:col-span-1">
                      <p className="truncate text-[0.875rem] font-medium text-slate-900">{l.name}</p>
                      <p className={cn('text-[0.75rem]', short ? 'text-rose-600' : 'text-slate-500')}>
                        Stock {qty(l.stock)} {l.stockUnit}{r ? ` · lagega ${qty(round(r.base, 4))} ${l.stockUnit}` : ''}
                      </p>
                    </div>
                    <span className="col-start-3 row-start-2 text-right text-[0.8125rem] font-semibold tabular-nums text-slate-700 sm:col-start-4 sm:row-start-1">{r ? money(r.cost) : '—'}</span>
                    <input data-qty={l.key} type="number" inputMode="decimal" min={0} step="any" aria-label={`${l.name} quantity`} disabled={ro}
                      value={Number.isFinite(l.quantity) ? l.quantity : ''} onChange={(e) => patch(l.key, { quantity: num(e.target.value) })}
                      className={cn(inputCls, 'col-start-1 row-start-2 sm:col-start-2 sm:row-start-1')} />
                    <select aria-label={`${l.name} unit`} disabled={ro} value={l.unitKey} onChange={(e) => patch(l.key, { unitKey: e.target.value })}
                      className={cn(inputCls, 'col-start-2 row-start-2 sm:col-start-3 sm:row-start-1')}>
                      {l.options.map((o) => <option key={o.key} value={o.key}>{o.name}{o.packRate ? ` (${qty(o.packRate)} ${l.stockUnit})` : ''}</option>)}
                    </select>
                    {!ro && (
                      <button type="button" onClick={() => remove(l.key)} aria-label={`${l.name} hatayein`} tabIndex={-1}
                        className="col-start-3 row-start-1 flex h-9 w-9 items-center justify-center justify-self-end rounded-xl text-slate-400 hover:bg-rose-50 hover:text-rose-600 sm:col-start-5">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Yield, wastage and fixed costs */}
        <section data-enter-next className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80 sm:p-5">
          <h3 className="text-[0.9375rem] font-semibold text-slate-900">Batch aur Cost</h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <label className="block">
              <span className="mb-1 block text-[0.8125rem] font-medium text-slate-700">1 batch se kitna banta hai ({product.unit})</span>
              <input type="number" min={0} step="any" inputMode="decimal" disabled={ro} value={yieldQty} onChange={(e) => { setYieldQty(e.target.value); touch(); }} className={inputCls} />
            </label>
            <label className="block">
              <span className="mb-1 block text-[0.8125rem] font-medium text-slate-700">Wastage %</span>
              <input type="number" min={0} max={90} step="any" inputMode="decimal" disabled={ro} value={wastage} onChange={(e) => { setWastage(e.target.value); touch(); }} className={inputCls} />
              <span className="mt-1 block text-[0.6875rem] text-slate-500">Banate waqt zaya hone wala raw maal</span>
            </label>
            {!costHidden && (
              <>
                <label className="block">
                  <span className="mb-1 block text-[0.8125rem] font-medium text-slate-700">Packing (Rs / batch)</span>
                  <input type="number" min={0} step="any" inputMode="decimal" disabled={ro} value={packing} onChange={(e) => { setPacking(e.target.value); touch(); }} className={inputCls} />
                </label>
                <label className="block">
                  <span className="mb-1 block text-[0.8125rem] font-medium text-slate-700">Mazdoori (Rs / batch)</span>
                  <input type="number" min={0} step="any" inputMode="decimal" disabled={ro} value={labour} onChange={(e) => { setLabour(e.target.value); touch(); }} className={inputCls} />
                </label>
                <label className="block">
                  <span className="mb-1 block text-[0.8125rem] font-medium text-slate-700">Gas / bijli (Rs / batch)</span>
                  <input type="number" min={0} step="any" inputMode="decimal" disabled={ro} value={overhead} onChange={(e) => { setOverhead(e.target.value); touch(); }} className={inputCls} />
                </label>
              </>
            )}
          </div>
          <div className="mt-4 space-y-3 border-t border-slate-100 pt-4">
            <Switch checked={makeOnSale} disabled={ro} onChange={(e) => { setMakeOnSale(e.target.checked); touch(); }}
              label={<span className="inline-flex items-center gap-1.5"><Zap className="h-4 w-4 text-amber-500" />Bikte waqt banayein</span>}
              description="Pehle se stock nahi banta — bill par bechte hi raw maal stock se kam ho jata hai (jaise dry fruit box)" />
            <Switch checked={active} disabled={ro} onChange={(e) => { setActive(e.target.checked); touch(); }}
              label="Recipe chalu hai" description="Band Recipe se production nahi hoti" />
          </div>
        </section>
      </div>

      {/* Live cost */}
      <aside className={cn('space-y-3', !compact && 'xl:sticky xl:top-24 xl:self-start')}>
        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80">
          <p className="flex items-center gap-1.5 text-[0.75rem] font-semibold uppercase tracking-wide text-slate-500"><Coins className="h-3.5 w-3.5" />Cost (abhi ke rate par)</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900">{money(calc.unitCost)}<span className="text-[0.8125rem] font-medium text-slate-500"> / {product.unit}</span></p>
          <dl className="mt-3 space-y-1.5 text-[0.8125rem]">
            <div className="flex justify-between"><dt className="text-slate-500">Raw maal / batch</dt><dd className="tabular-nums">{money(calc.material)}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Packing, mazdoori, bijli</dt><dd className="tabular-nums">{money(calc.extra)}</dd></div>
            <div className="flex justify-between font-semibold"><dt className="text-slate-700">1 batch ({qty(calc.y)} {product.unit})</dt><dd className="tabular-nums">{money(calc.total)}</dd></div>
          </dl>
        </div>
        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80">
          <p className="flex items-center gap-1.5 text-[0.75rem] font-semibold uppercase tracking-wide text-slate-500"><Percent className="h-3.5 w-3.5" />Profit har price par</p>
          <ul className="mt-2 space-y-1.5 text-[0.8125rem]">
            {tiers.map(([label, price]) => {
              const m = marginPct(price, calc.unitCost);
              return (
                <li key={label} className="flex items-center justify-between gap-2">
                  <span className="text-slate-500">{label}</span>
                  {Number(price) > 0 ? (
                    <span className="tabular-nums">
                      <span className="text-slate-800">{money(Number(price))}</span>
                      {!costHidden && <span className={cn('ml-2 font-semibold', m !== null && m < 0 ? 'text-rose-600' : 'text-success-700')}>{money(Number(price) - calc.unitCost)} · {marginText(m)}</span>}
                    </span>
                  ) : <span className="text-slate-400">price nahi</span>}
                </li>
              );
            })}
          </ul>
          {!costHidden && marginPct(product.price, calc.unitCost) !== null && marginPct(product.price, calc.unitCost)! < 0 && (
            <p className="mt-2 flex items-center gap-1.5 rounded-lg bg-rose-50 px-2.5 py-1.5 text-[0.75rem] text-rose-800"><AlertTriangle className="h-3.5 w-3.5" />Cost price se zyada hai — nuqsan hoga</p>
          )}
        </div>
        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80">
          <p className="flex items-center gap-1.5 text-[0.75rem] font-semibold uppercase tracking-wide text-slate-500"><Factory className="h-3.5 w-3.5" />Stock se ban sakta hai</p>
          <p className="mt-1 text-xl font-bold tabular-nums text-slate-900">{lines.length ? `${qty(wholeUnits(calc.units, product.unit))} ${product.unit}` : '—'}</p>
          {lines.length > 0 && calc.limitedBy && <p className="text-[0.75rem] text-slate-500">{qty(calc.batches)} batch · sab se pehle {calc.limitedBy} khatam hoga</p>}
          {makeOnSale && <Badge className="mt-2" size="xs" variant="warning"><Zap className="h-3 w-3" />Bikte waqt banta hai</Badge>}
        </div>
        {canEdit && (
          <div className="flex flex-wrap gap-2">
            <Button className="flex-1" onClick={() => void save()} loading={busy} leftIcon={<Save className="h-4 w-4" />}>{recipe ? 'Recipe save karein' : 'Recipe banayein'}</Button>
            {recipe && <Button variant="critical" onClick={() => void del()} aria-label="Recipe hatayein"><Trash2 className="h-4 w-4" /></Button>}
          </div>
        )}
        {dirty && canEdit && <p className="text-center text-[0.75rem] text-amber-700">Badlav save nahi hue</p>}
      </aside>
    </div>
  );
}
