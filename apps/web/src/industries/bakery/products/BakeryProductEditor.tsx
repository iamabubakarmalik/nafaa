/**
 * Bakery product editor: made or bought (saved on the product, no longer
 * guessed), units with extra rates (per kg, dozen, slice…), recipe with live
 * cost, cake options, freshness and allergens, and the opening stock.
 * Raw materials are ingredients, not products, so that choice opens the
 * ingredients page instead.
 */

import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CakeSlice, ChefHat, Clock, Leaf, Search, ShoppingBag, Snowflake, Trash2, Wheat } from 'lucide-react';
import { cn } from '@core/lib/cn';
import { formatPKR } from '@core/lib/format';
import { categoriesApi } from '@modules/inventory/categories/api/categories.api';
import { ProductEditorPage } from '@modules/inventory/products/editor/ProductEditorPage';
import { basicStep, priceStep, stockStep } from '@modules/inventory/products/editor/coreSteps';
import { Chip, NumberField, Section, TextField, Tiles, Toggle, inputClass } from '@modules/inventory/products/editor/fields';
import type { CoreOptions, EditorConfig, EditorDraft, Errors, StepContext, StepDef } from '@modules/inventory/products/editor/types';
import { bakeryProductsApi, type CakeFlavor, type CakeShape, type CreamType } from '../api/products.api';
import { ingredientsApi } from '../api/ingredients.api';
import { CREAMS, FLAVORS, SHAPES } from '../api/constants';
import { CATEGORY_SUGGESTIONS, defaultShelfLifeDays, deriveBakeryCategory, isCakeLike, needsFridge } from '../lib/bakeryCategory';
import { UNITS, deriveSize, extraUnitsFor, isWeighed, priceField, rateBetween } from '../lib/bakeryUnits';

type Kind = 'MADE' | 'BOUGHT';
type RateKey = 'pcs' | 'dozen' | 'slice' | 'kg' | 'pound' | 'box' | 'tray';
interface RecipeLine { ingredientId: string; name: string; qty: number; unit: string; costPerUnit: number }

export interface BakeryExtra {
  kindGuess: Kind;
  rates: Partial<Record<RateKey, number | null>>;
  weightGrams: number | null; numberOfSlices: number | null; servingSize: number | null;
  flavor: CakeFlavor; shape: CakeShape; cream: CreamType; customFlavor: string; customShape: string; customCream: string;
  isCakeCustomizable: boolean; allowsMessageOnCake: boolean; allowsPhotoOnCake: boolean; allowsCustomShape: boolean; allowsFlavorChoice: boolean; allowsSizeChoice: boolean;
  decorations: string[]; ingredientList: string; servingSuggestions: string;
  recipe: RecipeLine[]; recipeYield: number;
  shelfLifeDays: number | null; shelfLifeHours: number | null; fridge: boolean;
  prepTimeHours: number | null; advanceOrderHours: number | null; minOrderQty: number | null; maxOrderQty: number | null;
  allergens: string[]; containsEgg: boolean; containsNuts: boolean; containsGluten: boolean; containsDairy: boolean;
  isEggless: boolean; isVegan: boolean; isSugarFree: boolean; isHalal: boolean; calories: number | null;
  isPopular: boolean; isBestSeller: boolean; isNewArrival: boolean; isSeasonal: boolean; seasonName: string;
}

const initial: BakeryExtra = {
  kindGuess: 'MADE', rates: {}, weightGrams: null, numberOfSlices: null, servingSize: null,
  flavor: 'VANILLA' as CakeFlavor, shape: 'ROUND' as CakeShape, cream: 'BUTTERCREAM' as CreamType, customFlavor: '', customShape: '', customCream: '',
  isCakeCustomizable: true, allowsMessageOnCake: true, allowsPhotoOnCake: false, allowsCustomShape: false, allowsFlavorChoice: true, allowsSizeChoice: true,
  decorations: [], ingredientList: '', servingSuggestions: '', recipe: [], recipeYield: 1,
  shelfLifeDays: 3, shelfLifeHours: null, fridge: false, prepTimeHours: 4, advanceOrderHours: 24, minOrderQty: 1, maxOrderQty: null,
  allergens: [], containsEgg: true, containsNuts: false, containsGluten: true, containsDairy: true,
  isEggless: false, isVegan: false, isSugarFree: false, isHalal: true, calories: null,
  isPopular: false, isBestSeller: false, isNewArrival: false, isSeasonal: false, seasonName: '',
};

const DECORATIONS = ['Roses', 'Phool', 'Ribbon', 'Sitare', 'Sprinkles', 'Taaza phal', 'Chocolate chips', 'Candles', 'Pearls', 'Unicorn', 'Crown', 'Dil', 'Ghubbare', 'Fondant patte'];
const ALLERGENS = ['Nuts', 'Doodh', 'Anday', 'Gluten', 'Soya', 'Til', 'Mungphali', 'Machhli'];
const SHELF_DAYS = [1, 2, 3, 7, 15, 30, 90];
const KNOWN_UNITS = new Set(UNITS.map((u) => u.key));
const kindOf = (d: EditorDraft<BakeryExtra>): Kind => (d.core.productType === 'MADE' || d.core.productType === 'BOUGHT' ? d.core.productType : d.extra.kindGuess);
const toggle = (list: string[], v: string) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
const num = (v: unknown) => (v === null || v === undefined || v === '' ? null : Number(v));

function useBakeryCategory(d: EditorDraft<BakeryExtra>) {
  const { data: cats = [] } = useQuery({ queryKey: ['categories'], queryFn: categoriesApi.list, staleTime: 5 * 60_000 });
  const catName = cats.find((c) => c.id === d.core.categoryId)?.name;
  return deriveBakeryCategory(catName, d.core.name);
}

/* ── Basic step additions ── */
function KindAndSize({ ctx }: { ctx: StepContext<BakeryExtra> }) {
  const kind = kindOf(ctx.draft);
  const bc = useBakeryCategory(ctx.draft);
  const cake = isCakeLike(bc);
  const custom = !KNOWN_UNITS.has(ctx.draft.core.unit) || ctx.draft.core.unit === 'custom';
  return (
    <div className="space-y-4">
      <div>
        <span className="mb-1.5 block text-[0.8125rem] font-medium text-slate-700">Yeh cheez</span>
        <div className="grid gap-2 sm:grid-cols-3">
          {([['MADE', ChefHat, 'Khud banate hain', 'Cake, bread, patties — recipe aur freshness ke saath'], ['BOUGHT', ShoppingBag, 'Khareed kar bechte hain', 'Juice, chips, packet wala maal']] as const).map(([k, Icon, t, h]) => (
            <button key={k} type="button" disabled={ctx.isEdit && kind !== k && !!ctx.draft.core.productType} onClick={() => ctx.setCore({ productType: k })}
              className={cn('flex items-start gap-3 rounded-xl border p-3 text-left transition disabled:opacity-50', kind === k ? 'border-brand-500 bg-brand-50 ring-2 ring-brand-500/20' : 'border-slate-200 hover:bg-slate-50')}>
              <Icon className={cn('mt-0.5 h-5 w-5 shrink-0', kind === k ? 'text-brand-700' : 'text-slate-500')} />
              <span><span className="block text-[0.875rem] font-semibold text-slate-900">{t}</span><span className="block text-[0.75rem] text-slate-500">{h}</span></span>
            </button>
          ))}
          {!ctx.isEdit && (
            <Link to="/bakery/ingredients?new=1" className="flex items-start gap-3 rounded-xl border border-dashed border-slate-300 p-3 text-left hover:bg-slate-50">
              <Wheat className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
              <span><span className="block text-[0.875rem] font-semibold text-slate-900">Raw material</span><span className="block text-[0.75rem] text-slate-500">Atta, cheeni, makhan — yeh bikta nahi, Raw material page par jata hai →</span></span>
            </Link>
          )}
        </div>
      </div>
      {custom && (
        <TextField label="Apne naap ka naam" required value={ctx.draft.core.unit === 'custom' ? '' : ctx.draft.core.unit} onChange={(v) => ctx.setCore({ unit: v.trim() ? v : 'custom' })}
          placeholder="Jaise: thaal, degh" error={ctx.errors.customUnit} />
      )}
      {(isWeighed(ctx.draft.core.unit) || cake) && (
        <div className="grid gap-3 sm:grid-cols-3">
          <NumberField label="Wazan" suffix="gram" allowEmpty value={ctx.draft.extra.weightGrams} onChange={(weightGrams) => ctx.setExtra({ weightGrams })} hint="Ek cheez ka" />
          {cake && <NumberField label="Kitne slice" allowEmpty value={ctx.draft.extra.numberOfSlices} onChange={(numberOfSlices) => ctx.setExtra({ numberOfSlices })} />}
          {cake && <NumberField label="Kitne logon ke liye" allowEmpty value={ctx.draft.extra.servingSize} onChange={(servingSize) => ctx.setExtra({ servingSize })} />}
        </div>
      )}
    </div>
  );
}

function Badges({ ctx }: { ctx: StepContext<BakeryExtra> }) {
  const x = ctx.draft.extra;
  return (
    <div className="space-y-2">
      <span className="block text-[0.8125rem] font-medium text-slate-700">Nishaan</span>
      <div className="flex flex-wrap gap-1.5">
        <Chip on={x.isPopular} onClick={() => ctx.setExtra({ isPopular: !x.isPopular })}>Mashhoor</Chip>
        <Chip on={x.isBestSeller} onClick={() => ctx.setExtra({ isBestSeller: !x.isBestSeller })}>Best seller</Chip>
        <Chip on={x.isNewArrival} onClick={() => ctx.setExtra({ isNewArrival: !x.isNewArrival })}>Naya</Chip>
        <Chip on={x.isSeasonal} onClick={() => ctx.setExtra({ isSeasonal: !x.isSeasonal })}>Mausami</Chip>
      </div>
      {x.isSeasonal && <TextField label="Kis mausam / mauqe ka" value={x.seasonName} onChange={(seasonName) => ctx.setExtra({ seasonName })} placeholder="Ramzan, Eid, Sardi" error={ctx.errors.seasonName} />}
    </div>
  );
}

/* ── Price step: other ways to sell ── */
function OtherRates({ ctx }: { ctx: StepContext<BakeryExtra> }) {
  const base = ctx.draft.core.unit;
  const keys = KNOWN_UNITS.has(base) ? (extraUnitsFor(base) as RateKey[]) : [];
  if (!keys.length) return null;
  const opts = { weightGrams: ctx.draft.extra.weightGrams ?? '', slices: ctx.draft.extra.numberOfSlices ?? '' } as const;
  return (
    <div>
      <span className="mb-1.5 block text-[0.8125rem] font-medium text-slate-700">Aur kis tarah bechte hain (zaroori nahi)</span>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {keys.map((k) => {
          const label = UNITS.find((u) => u.key === k)?.label ?? k;
          const suggest = ctx.draft.core.price ? Math.round(ctx.draft.core.price * rateBetween(k, base, opts)) : 0;
          return (
            <NumberField key={k} label={`Fi ${label}`} prefix="Rs" allowEmpty value={ctx.draft.extra.rates[k] ?? null}
              onChange={(v) => ctx.setExtra({ rates: { ...ctx.draft.extra.rates, [k]: v } })}
              placeholder={suggest ? String(suggest) : '—'} />
          );
        })}
      </div>
    </div>
  );
}

/* ── Recipe and cake step ── */
function Recipe({ ctx }: { ctx: StepContext<BakeryExtra> }) {
  const x = ctx.draft.extra;
  const [q, setQ] = useState('');
  const { data: ingredients = [] } = useQuery({ queryKey: ['bakery-ingredients-list'], queryFn: () => ingredientsApi.list({}) });
  const chosen = new Set(x.recipe.map((r) => r.ingredientId));
  const term = q.trim().toLowerCase();
  const options = useMemo(() => ingredients.filter((i) => !chosen.has(i.id) && (!term || i.name.toLowerCase().includes(term))).slice(0, 12), [ingredients, term, x.recipe]); // eslint-disable-line react-hooks/exhaustive-deps
  const batch = x.recipe.reduce((s, r) => s + r.qty * r.costPerUnit, 0);
  const per = x.recipeYield > 0 ? batch / x.recipeYield : batch;
  const setLines = (recipe: RecipeLine[]) => ctx.setExtra({ recipe });
  return (
    <Section icon={Wheat} title={`"${ctx.draft.core.name || 'Is cheez'}" mein kya lagta hai`} hint="Bharein to cost khud nikal aati hai — zaroori nahi">
      {ingredients.length === 0 ? (
        <p className="text-[0.8125rem] text-slate-500">Pehle raw material daalein — <Link to="/bakery/ingredients?new=1" className="font-semibold text-brand-700 hover:underline">yahan se</Link>.</p>
      ) : (
        <div className="space-y-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Atta, cheeni, anday…" className={cn(inputClass, 'h-10 pl-9 text-[0.875rem]')} />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {options.map((i) => (
              <button key={i.id} type="button" onClick={() => setLines([...x.recipe, { ingredientId: i.id, name: i.name, qty: 0, unit: i.unit, costPerUnit: i.costPerUnit }])}
                className="inline-flex h-8 items-center gap-1 rounded-full bg-amber-50 px-3 text-[0.8125rem] font-medium text-amber-900 hover:bg-amber-100">+ {i.name} <span className="text-amber-700/70">· {formatPKR(i.costPerUnit)}/{i.unit}</span></button>
            ))}
          </div>
          {x.recipe.length > 0 && (
            <ul className="space-y-2">
              {x.recipe.map((r, i) => (
                <li key={r.ingredientId} className={cn('flex items-center gap-2 rounded-xl border p-2.5', r.qty > 0 ? 'border-slate-200' : 'border-rose-300 bg-rose-50/50')}>
                  <span className="min-w-0 flex-1 truncate text-[0.875rem] font-medium text-slate-900">{r.name}</span>
                  <input inputMode="decimal" value={r.qty || ''} placeholder="Kitna" onChange={(e) => setLines(x.recipe.map((l, j) => (j === i ? { ...l, qty: Number(e.target.value.replace(/[^\d.]/g, '')) } : l)))}
                    className={cn(inputClass, 'h-9 w-24 text-[0.875rem] tabular-nums')} />
                  <span className="w-12 text-[0.75rem] text-slate-500">{r.unit}</span>
                  <span className="w-24 text-right text-[0.8125rem] tabular-nums text-slate-700">{formatPKR(r.qty * r.costPerUnit)}</span>
                  <button type="button" onClick={() => setLines(x.recipe.filter((_, j) => j !== i))} aria-label="Hatayein" className="flex h-8 w-8 items-center justify-center rounded-lg text-rose-600 hover:bg-rose-50"><Trash2 className="h-4 w-4" /></button>
                </li>
              ))}
            </ul>
          )}
          {x.recipe.length > 0 && (
            <div className="flex flex-wrap items-end gap-3 rounded-2xl bg-slate-50 p-3.5">
              <NumberField label={`Is saamaan se kitne ${ctx.draft.core.unit} bante hain`} value={x.recipeYield} onChange={(v) => ctx.setExtra({ recipeYield: v || 1 })} />
              <div className="text-[0.8125rem]">
                <p className="text-slate-500">Poori kharch <strong className="tabular-nums text-slate-900">{formatPKR(batch)}</strong></p>
                <p className="text-slate-500">Ek ki cost <strong className="text-[1.0625rem] tabular-nums text-slate-900">{formatPKR(per)}</strong></p>
              </div>
              {Math.abs(per - ctx.draft.core.costPrice) > 1 && (
                <button type="button" onClick={() => ctx.setCore({ costPrice: Math.round(per * 100) / 100 })} className="ml-auto h-9 rounded-xl bg-brand-600 px-3 text-[0.8125rem] font-semibold text-white">Yehi cost laga dein</button>
              )}
            </div>
          )}
        </div>
      )}
    </Section>
  );
}

function CakeOptions({ ctx }: { ctx: StepContext<BakeryExtra> }) {
  const x = ctx.draft.extra;
  const set = ctx.setExtra;
  return (
    <Section icon={CakeSlice} title="Cake ki details" hint="Order lete waqt yahi options milenge">
      <div className="space-y-4">
        <div>
          <span className="mb-1.5 block text-[0.8125rem] font-medium text-slate-700">Flavour</span>
          <Tiles value={x.flavor} onChange={(flavor) => set({ flavor })} columns="grid-cols-3 sm:grid-cols-6" options={FLAVORS.map((f) => ({ value: f.value, label: f.label, icon: f.emoji }))} />
          {String(x.flavor).startsWith('CUSTOM') && <div className="mt-2"><TextField label="Flavour ka naam" value={x.customFlavor} onChange={(customFlavor) => set({ customFlavor })} /></div>}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <span className="mb-1.5 block text-[0.8125rem] font-medium text-slate-700">Shakal</span>
            <Tiles value={x.shape} onChange={(shape) => set({ shape })} columns="grid-cols-3" options={SHAPES.map((f) => ({ value: f.value, label: f.label, icon: f.emoji }))} />
          </div>
          <div>
            <span className="mb-1.5 block text-[0.8125rem] font-medium text-slate-700">Cream</span>
            <Tiles value={x.cream} onChange={(cream) => set({ cream })} columns="grid-cols-3" options={CREAMS.map((f) => ({ value: f.value, label: f.label, icon: f.emoji }))} />
            {x.cream === 'OTHER' && <div className="mt-2"><TextField label="Cream ka naam" value={x.customCream} onChange={(customCream) => set({ customCream })} /></div>}
          </div>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <Toggle on={x.isCakeCustomizable} onChange={(isCakeCustomizable) => set({ isCakeCustomizable })} title="Order par banta hai" hint="Grahak apni marzi bata sakta hai" />
          <Toggle on={x.allowsMessageOnCake} onChange={(allowsMessageOnCake) => set({ allowsMessageOnCake })} title="Cake par naam / message" />
          <Toggle on={x.allowsPhotoOnCake} onChange={(allowsPhotoOnCake) => set({ allowsPhotoOnCake })} title="Cake par photo" />
          <Toggle on={x.allowsFlavorChoice} onChange={(allowsFlavorChoice) => set({ allowsFlavorChoice })} title="Flavour grahak chune" />
          <Toggle on={x.allowsSizeChoice} onChange={(allowsSizeChoice) => set({ allowsSizeChoice })} title="Size grahak chune" />
          <Toggle on={x.allowsCustomShape} onChange={(allowsCustomShape) => set({ allowsCustomShape })} title="Apni shakal" />
        </div>
        <div>
          <span className="mb-1.5 block text-[0.8125rem] font-medium text-slate-700">Sajawat</span>
          <div className="flex flex-wrap gap-1.5">{[...DECORATIONS, ...x.decorations.filter((d) => !DECORATIONS.includes(d))].map((d) => <Chip key={d} on={x.decorations.includes(d)} onClick={() => set({ decorations: toggle(x.decorations, d) })}>{d}</Chip>)}</div>
        </div>
      </div>
    </Section>
  );
}

function RecipeStep({ ctx }: { ctx: StepContext<BakeryExtra> }) {
  const cake = isCakeLike(useBakeryCategory(ctx.draft));
  return (
    <div className="space-y-4">
      <Recipe ctx={ctx} />
      {cake && <CakeOptions ctx={ctx} />}
      <Section title="Grahak ke liye">
        <div className="space-y-3">
          <label className="block text-[0.8125rem] font-medium text-slate-700">Kya kya dala hai
            <textarea value={ctx.draft.extra.ingredientList} onChange={(e) => ctx.setExtra({ ingredientList: e.target.value })} rows={2} className={cn(inputClass, 'mt-1.5 h-auto py-2')} placeholder="Maida, cheeni, anday, makhan…" />
          </label>
          <TextField label="Kaise khayein / pesh karein" value={ctx.draft.extra.servingSuggestions} onChange={(servingSuggestions) => ctx.setExtra({ servingSuggestions })} placeholder="Thanda kar ke" />
        </div>
      </Section>
    </div>
  );
}

/* ── Freshness step ── */
function Freshness({ ctx }: { ctx: StepContext<BakeryExtra> }) {
  const x = ctx.draft.extra;
  const set = ctx.setExtra;
  const made = kindOf(ctx.draft) === 'MADE';
  const bc = useBakeryCategory(ctx.draft);
  return (
    <div className="space-y-4">
      <Section icon={Clock} title="Kitne din chalti hai" hint={`Is category ke liye aam tor par ${defaultShelfLifeDays(bc)} din`}>
        <div className="space-y-3">
          <div className="flex flex-wrap gap-1.5">
            {SHELF_DAYS.map((d) => <Chip key={d} on={x.shelfLifeDays === d && !x.shelfLifeHours} onClick={() => set({ shelfLifeDays: d, shelfLifeHours: null })}>{d} din</Chip>)}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <NumberField label="Din" allowEmpty value={x.shelfLifeDays} onChange={(shelfLifeDays) => set({ shelfLifeDays })} error={ctx.errors.shelfLife} />
            <NumberField label="Ya ghante" allowEmpty value={x.shelfLifeHours} onChange={(shelfLifeHours) => set({ shelfLifeHours })} hint="Ek din se kam chalne wali cheez" />
          </div>
          <Toggle on={x.fridge} onChange={(fridge) => set({ fridge })} icon={Snowflake} title="Fridge mein rakhni hai" hint={needsFridge(bc) ? 'Is category ke liye aam tor par haan' : undefined} />
        </div>
      </Section>
      {made && (
        <Section icon={ChefHat} title="Banane aur order ka waqt">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <NumberField label="Banane mein" suffix="ghante" allowEmpty value={x.prepTimeHours} onChange={(prepTimeHours) => set({ prepTimeHours })} />
            <NumberField label="Kitna pehle order" suffix="ghante" allowEmpty value={x.advanceOrderHours} onChange={(advanceOrderHours) => set({ advanceOrderHours })} />
            <NumberField label="Kam se kam" allowEmpty value={x.minOrderQty} onChange={(minOrderQty) => set({ minOrderQty })} />
            <NumberField label="Zyada se zyada" allowEmpty value={x.maxOrderQty} onChange={(maxOrderQty) => set({ maxOrderQty })} error={ctx.errors.maxOrder} />
          </div>
        </Section>
      )}
      <Section icon={Leaf} title="Kya shamil hai" hint="Allergy wale grahak ke liye">
        <div className="space-y-3">
          <div className="flex flex-wrap gap-1.5">
            <Chip on={x.containsEgg} onClick={() => set({ containsEgg: !x.containsEgg })}>Anda</Chip>
            <Chip on={x.containsDairy} onClick={() => set({ containsDairy: !x.containsDairy })}>Doodh</Chip>
            <Chip on={x.containsNuts} onClick={() => set({ containsNuts: !x.containsNuts })}>Dry fruit / nuts</Chip>
            <Chip on={x.containsGluten} onClick={() => set({ containsGluten: !x.containsGluten })}>Gluten (maida)</Chip>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <Chip on={x.isHalal} onClick={() => set({ isHalal: !x.isHalal })}>Halal</Chip>
            <Chip on={x.isEggless} onClick={() => set({ isEggless: !x.isEggless })}>Anday ke bagair</Chip>
            <Chip on={x.isVegan} onClick={() => set({ isVegan: !x.isVegan })}>Vegan</Chip>
            <Chip on={x.isSugarFree} onClick={() => set({ isSugarFree: !x.isSugarFree })}>Cheeni ke bagair</Chip>
          </div>
          <div className="flex flex-wrap gap-1.5">{ALLERGENS.map((a) => <Chip key={a} on={x.allergens.includes(a)} onClick={() => set({ allergens: toggle(x.allergens, a) })}>{a}</Chip>)}</div>
          {ctx.errors.diet && <p className="text-[0.8125rem] font-medium text-rose-600">{ctx.errors.diet}</p>}
          <div className="max-w-xs"><NumberField label="Calories (ek serving)" allowEmpty value={x.calories} onChange={(calories) => set({ calories })} /></div>
        </div>
      </Section>
    </div>
  );
}

const core: CoreOptions = {
  units: UNITS.map((u) => ({ value: u.key, label: u.label })),
  skuPrefix: 'BKR',
};

const basic = basicStep<BakeryExtra>(core, {
  extra: (ctx) => <KindAndSize ctx={ctx} />,
  after: (ctx) => <Badges ctx={ctx} />,
  categorySuggestions: CATEGORY_SUGGESTIONS.map((c) => c.name),
  namePlaceholder: 'Jaise: Chocolate Fudge Cake',
});
const basicWithChecks: StepDef<BakeryExtra> = {
  ...basic,
  validate: (d, isEdit) => {
    const e: Errors = { ...(basic.validate?.(d, isEdit) ?? {}) };
    if (d.core.unit === 'custom') e.customUnit = 'Apne naap ka naam likhein';
    if (d.extra.isSeasonal && !d.extra.seasonName.trim()) e.seasonName = 'Mausam ka naam likhein';
    return e;
  },
};
const stock = stockStep<BakeryExtra>(core, { quick: [1, 6, 12, 24, 50, 100] });

const config: EditorConfig<BakeryExtra> = {
  label: 'Bakery',
  draftKey: 'nafaa.product-editor.bakery',
  paths: { list: '/products', detail: (id) => `/bakery-products/${id}`, create: '/bakery-products/new' },
  core,
  extra: {
    initial,
    load: async (productId) => {
      const p = await bakeryProductsApi.byProduct(productId).catch(() => null);
      if (!p) return {};
      const a = p as unknown as Record<string, any>;
      const ing = a.ingredients ?? {};
      const rates: Partial<Record<RateKey, number | null>> = {};
      for (const [k, field] of Object.entries(priceField)) if (a[field] != null) rates[k as RateKey] = Number(a[field]);
      return {
        kindGuess: a.isCustomizable || a.isCakeCustomizable || (ing.lines?.length ?? 0) > 0 ? 'MADE' : 'BOUGHT',
        rates, weightGrams: num(a.weightGrams), numberOfSlices: num(a.numberOfSlices), servingSize: num(a.servingSize),
        flavor: a.defaultFlavor ?? initial.flavor, shape: a.defaultShape ?? initial.shape, cream: a.defaultCreamType ?? initial.cream,
        customFlavor: ing.custom?.flavor ?? '', customShape: ing.custom?.shape ?? '', customCream: ing.custom?.cream ?? '',
        isCakeCustomizable: !!a.isCakeCustomizable, allowsMessageOnCake: !!a.allowsMessageOnCake, allowsPhotoOnCake: !!a.allowsPhotoOnCake,
        allowsCustomShape: !!a.allowsCustomShape, allowsFlavorChoice: !!a.allowsFlavorChoice, allowsSizeChoice: !!a.allowsSizeChoice,
        decorations: ing.decorations ?? [], ingredientList: a.ingredientList ?? '', servingSuggestions: a.servingSuggestions ?? '',
        recipe: (ing.lines ?? []).map((l: RecipeLine) => ({ ...l, qty: Number(l.qty) || 0, costPerUnit: Number(l.costPerUnit) || 0 })), recipeYield: Number(ing.yield) || 1,
        shelfLifeDays: num(a.shelfLifeDays), shelfLifeHours: num(a.shelfLifeHours), fridge: !!a.requiresRefrigeration,
        prepTimeHours: num(a.prepTimeHours), advanceOrderHours: num(a.advanceOrderHours), minOrderQty: num(a.minOrderQty), maxOrderQty: num(a.maxOrderQty),
        allergens: a.allergens ?? [], containsEgg: !!a.containsEgg, containsNuts: !!a.containsNuts, containsGluten: !!a.containsGluten, containsDairy: !!a.containsDairy,
        isEggless: !!a.isEggless, isVegan: !!a.isVegan, isSugarFree: !!a.isSugarFree, isHalal: a.isHalal !== false, calories: num(a.caloriesPerServing),
        isPopular: !!a.isPopular, isBestSeller: !!a.isBestSeller, isNewArrival: !!a.isNewArrival, isSeasonal: !!a.isSeasonalItem, seasonName: a.seasonName ?? '',
      };
    },
    // The shared product API does not take productType (400); it is saved with the bakery profile below.
    product: (d, { productType: _shared, ...payload }) => ({
      ...payload,
      weight: d.extra.weightGrams ?? undefined,
      weightUnit: d.extra.weightGrams ? 'g' : undefined,
      expiryTracked: !!(d.extra.shelfLifeDays || d.extra.shelfLifeHours),
    }),
    save: async (productId, d) => {
      const x = d.extra;
      const c = d.core;
      const made = kindOf(d) === 'MADE';
      const cats = await categoriesApi.list().catch(() => []);
      const rates: Record<string, number | undefined> = {};
      for (const [k, field] of Object.entries(priceField)) rates[field] = x.rates[k as RateKey] ?? undefined;
      if (priceField[c.unit]) rates[priceField[c.unit]] = c.price;
      await bakeryProductsApi.upsert({
        productId,
        productType: kindOf(d),
        category: deriveBakeryCategory(cats.find((k) => k.id === c.categoryId)?.name, c.name),
        defaultSize: deriveSize(c.unit, x.weightGrams ?? ''),
        defaultFlavor: made ? x.flavor : undefined, defaultShape: made ? x.shape : undefined, defaultCreamType: made ? x.cream : undefined,
        ...rates,
        weightGrams: x.weightGrams ?? undefined, servingSize: x.servingSize ?? undefined, numberOfSlices: x.numberOfSlices ?? undefined,
        isCustomizable: made && x.isCakeCustomizable, isCakeCustomizable: made && x.isCakeCustomizable,
        allowsMessageOnCake: x.allowsMessageOnCake, allowsPhotoOnCake: x.allowsPhotoOnCake, allowsCustomShape: x.allowsCustomShape,
        allowsFlavorChoice: x.allowsFlavorChoice, allowsSizeChoice: x.allowsSizeChoice,
        prepTimeHours: x.prepTimeHours ?? undefined, advanceOrderHours: x.advanceOrderHours ?? undefined, minOrderQty: x.minOrderQty ?? 1, maxOrderQty: x.maxOrderQty ?? undefined,
        shelfLifeHours: x.shelfLifeHours ?? undefined, shelfLifeDays: x.shelfLifeDays ?? undefined, requiresRefrigeration: x.fridge,
        allergens: x.allergens, containsEgg: x.containsEgg, containsNuts: x.containsNuts, containsGluten: x.containsGluten, containsDairy: x.containsDairy,
        isEggless: x.isEggless, isVegan: x.isVegan, isSugarFree: x.isSugarFree, isHalal: x.isHalal, dietaryBadges: [],
        caloriesPerServing: x.calories ?? undefined,
        ingredients: made ? {
          yield: x.recipeYield,
          custom: { flavor: x.customFlavor || undefined, shape: x.customShape || undefined, cream: x.customCream || undefined },
          decorations: x.decorations.length ? x.decorations : undefined,
          lines: x.recipe.map((r) => ({ ingredientId: r.ingredientId, name: r.name, qty: r.qty, unit: r.unit, costPerUnit: r.costPerUnit })),
        } : undefined,
        imageUrls: c.images.map((i) => i.url),
        descriptionLong: c.description || undefined, ingredientList: x.ingredientList || undefined, servingSuggestions: x.servingSuggestions || undefined,
        isPopular: x.isPopular, isFeatured: c.isFeatured, isBestSeller: x.isBestSeller, isNewArrival: x.isNewArrival,
        isSeasonalItem: x.isSeasonal, seasonName: x.isSeasonal ? x.seasonName : undefined,
      } as never);
    },
  },
  steps: [
    basicWithChecks,
    priceStep<BakeryExtra>(core, { extra: (ctx) => <OtherRates ctx={ctx} /> }),
    { id: 'recipe', title: 'Recipe', hint: 'Kya lagta hai, cake options', icon: Wheat, when: (d) => kindOf(d) === 'MADE', render: (ctx) => <RecipeStep ctx={ctx} />,
      validate: (d): Errors => (d.extra.recipe.some((r) => !(r.qty > 0)) ? { recipe: 'Har cheez ki quantity likhein' } : {}) },
    { id: 'fresh', title: 'Freshness', hint: 'Kitne din, allergy', icon: Clock, render: (ctx) => <Freshness ctx={ctx} />,
      validate: (d) => {
        const e: Errors = {};
        const x = d.extra;
        if (kindOf(d) === 'MADE' && !x.shelfLifeDays && !x.shelfLifeHours) e.shelfLife = 'Khud bani cheez kitne din chalti hai likhein';
        if (x.maxOrderQty && x.minOrderQty && x.maxOrderQty < x.minOrderQty) e.maxOrder = 'Kam se kam se chhota nahi ho sakta';
        if (x.isVegan && (x.containsEgg || x.containsDairy)) e.diet = 'Vegan mein anda ya doodh nahi ho sakta';
        else if (x.isEggless && x.containsEgg) e.diet = '"Anday ke bagair" aur "Anda" dono nahi ho sakte';
        return e;
      } },
    stock,
  ],
  summary: (d) => (
    <div className="mt-3 space-y-1 border-t border-slate-100 pt-3 text-[0.8125rem]">
      <p className="text-slate-600">{kindOf(d) === 'MADE' ? 'Khud banti hai' : 'Khareed kar'}{d.extra.fridge ? ' · Fridge' : ''}</p>
      {(d.extra.shelfLifeDays || d.extra.shelfLifeHours) && <p className="text-orange-700">{d.extra.shelfLifeDays ? `${d.extra.shelfLifeDays} din` : `${d.extra.shelfLifeHours} ghante`} chalti hai</p>}
      {d.extra.recipe.length > 0 && <p className="text-slate-600">Recipe: {d.extra.recipe.length} cheezein</p>}
    </div>
  ),
  refresh: ['bakery-products', 'bakery-profile-by-product', 'bakery-product-detail-extra', 'bakery-all-products', 'bakery-profiles-all'],
  guide: [
    { icon: ChefHat, color: '#ea580c', title: 'Khud banti hai ya khareed kar', text: 'Khud bani cheez ki Recipe aur Freshness ka step khulta hai. Recipe bharein to cost raw material ke rate se khud nikal aati hai.' },
    { icon: Wheat, color: '#a16207', title: 'Raw material', text: 'Atta, cheeni, makhan product nahi — woh Raw material page par jate hain aur recipe mein yahin se chune jate hain.' },
  ],
};

export default function BakeryProductEditor() {
  return <ProductEditorPage config={config} />;
}
