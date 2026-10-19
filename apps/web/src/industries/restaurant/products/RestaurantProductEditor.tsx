/**
 * Restaurant item editor on the shared product editor. Three kinds of item:
 *   dish          made in the kitchen: menu details, sizes, add-ons, recipe
 *   bought item   sold as bought (cold drink, water): menu details and stock
 *   raw material  chicken, rice, oil: stock unit, packing for purchase, cost
 *
 * The menu profile, add-on groups and recipe are saved after the product
 * through the restaurant API. A user without menu or kitchen permission can
 * still save the product; the parts they may not change are skipped with a
 * notice.
 */

import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Boxes, ChefHat, Clock, CupSoda, Flame, Layers, Plus, Sparkles, Trash2, UtensilsCrossed, Wheat } from 'lucide-react';
import { cn } from '@core/lib/cn';
import { formatPKR } from '@core/lib/format';
import { hasPermission, PERMISSIONS, type PermissionKey } from '@core/lib/permissions';
import { useAuthStore } from '@core/stores/auth.store';
import { ProductEditorPage } from '@modules/inventory/products/editor/ProductEditorPage';
import { basicStep, priceStep, stockStep } from '@modules/inventory/products/editor/coreSteps';
import { Chip, NumberField, Section, TextField, Tiles, Toggle, inputClass } from '@modules/inventory/products/editor/fields';
import type { CoreOptions, EditorConfig, EditorDraft, Errors, StepContext, VariantDraft } from '@modules/inventory/products/editor/types';
import { menuItemsApi, type DietaryTag, type SpiceLevel } from '../api/menu-items.api';
import { modifiersApi } from '../api/modifiers.api';
import { recipesApi } from '../api/recipes.api';
import { RecipeLinesEditor, emptyRecipe, recipeFromApi, recipeInput, recipeProblem, recipeTotals, type RecipeDraft } from '../components/RecipeLinesEditor';
import { DAYS, DIET, SPICE, clock12, modifierTypeOf } from '../lib/menuMeta';

type Kind = 'dish' | 'bought' | 'raw';

export interface RestaurantExtra {
  menuItemId: string | null;
  recipeId: string | null;
  /** Listed on the restaurant counter (has a menu profile). */
  onMenu: boolean;
  /** Switched on today; off is the kitchen's "86". */
  available: boolean;
  prepTimeMinutes: number | null;
  spiceLevel: SpiceLevel;
  dietaryTags: DietaryTag[];
  chefSpecial: boolean;
  bestSeller: boolean;
  tagLine: string;
  servingSize: string;
  servesPeople: number | null;
  calories: number | null;
  allergenInfo: string;
  cookingInstructions: string;
  /** Served only between these times / on these days. */
  limitHours: boolean;
  availableFrom: string;
  availableTo: string;
  availableDays: number[];
  modifierGroupIds: string[];
  recipe: RecipeDraft;
}

const initial: RestaurantExtra = {
  menuItemId: null, recipeId: null, onMenu: true, available: true, prepTimeMinutes: 15, spiceLevel: 'NONE', dietaryTags: ['HALAL'],
  chefSpecial: false, bestSeller: false, tagLine: '', servingSize: '', servesPeople: 1, calories: null, allergenInfo: '', cookingInstructions: '',
  limitHours: false, availableFrom: '', availableTo: '', availableDays: [], modifierGroupIds: [], recipe: emptyRecipe(),
};

const kindOf = (d: EditorDraft<RestaurantExtra>): Kind => (d.core.isRawMaterial ? 'raw' : d.core.productType === 'BOUGHT' ? 'bought' : 'dish');
const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
const can = (p: PermissionKey) => {
  const u = useAuthStore.getState().user;
  return hasPermission(u?.role, u?.permissions, p);
};

const UNITS = [
  { value: 'plate', label: 'Plate' }, { value: 'pcs', label: 'Adad (pcs)' }, { value: 'cup', label: 'Cup' }, { value: 'glass', label: 'Glass' },
  { value: 'bowl', label: 'Bowl' }, { value: 'bottle', label: 'Botal' }, { value: 'kg', label: 'Kilo' }, { value: 'gram', label: 'Gram' },
  { value: 'liter', label: 'Litre' }, { value: 'ml', label: 'ML' }, { value: 'dozen', label: 'Darjan' }, { value: 'packet', label: 'Packet' },
];
const SIZE_PRESETS = [['Half', 'Full'], ['Quarter', 'Half', 'Full'], ['Small', 'Medium', 'Large'], ['Regular', 'Large'], ['Single', 'Double']];
const PREP = [5, 10, 15, 20, 30, 45];
const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

/* ── Basic step: what kind of item ── */
function KindTiles({ ctx }: { ctx: StepContext<RestaurantExtra> }) {
  const kind = kindOf(ctx.draft);
  const pick = (k: Kind) => {
    if (k === kind) return;
    const unit = ctx.draft.core.unit;
    if (k === 'raw') ctx.setCore({ isRawMaterial: true, productType: null, unit: ['plate', 'cup', 'glass', 'bowl'].includes(unit) ? 'kg' : unit });
    else ctx.setCore({ isRawMaterial: false, productType: k === 'dish' ? 'MADE' : 'BOUGHT', unit: k === 'dish' && ['kg', 'gram', 'liter', 'ml'].includes(unit) ? 'plate' : unit });
    ctx.setExtra({ onMenu: k !== 'raw' });
  };
  const tiles: Array<[Kind, typeof ChefHat, string, string]> = [
    ['dish', ChefHat, 'Kitchen me banti hai', 'Biryani, karahi, burger, chai — recipe, size aur add-ons ke saath'],
    ['bought', CupSoda, 'Bani banai bikti hai', 'Cold drink, paani, chips — stock gin kar'],
    ['raw', Wheat, 'Raw material', 'Chicken, chawal, oil — menu par nahi, recipe me lagta hai'],
  ];
  return (
    <div>
      <span className="mb-1.5 block text-[0.8125rem] font-medium text-slate-700">Yeh cheez</span>
      <div className="grid gap-2 sm:grid-cols-3">
        {tiles.map(([k, Icon, t, h]) => (
          <button key={k} type="button" onClick={() => pick(k)}
            className={cn('flex items-start gap-3 rounded-xl border p-3 text-left transition', kind === k ? 'border-brand-500 bg-brand-50 ring-2 ring-brand-500/20' : 'border-slate-200 hover:bg-slate-50')}>
            <Icon className={cn('mt-0.5 h-5 w-5 shrink-0', kind === k ? 'text-brand-700' : 'text-slate-500')} />
            <span><span className="block text-[0.875rem] font-semibold text-slate-900">{t}</span><span className="block text-[0.75rem] text-slate-500">{h}</span></span>
          </button>
        ))}
      </div>
      {ctx.isEdit && kind === 'raw' && ctx.draft.extra.menuItemId && (
        <p className="mt-2 text-[0.75rem] text-amber-700">Raw material banane par yeh menu se hat jayegi — purane bill waise hi rahenge.</p>
      )}
    </div>
  );
}

/* ── Menu step ── */
function MenuStep({ ctx }: { ctx: StepContext<RestaurantExtra> }) {
  const x = ctx.draft.extra;
  const set = ctx.setExtra;
  const dish = kindOf(ctx.draft) === 'dish';
  return (
    <div className="space-y-4">
      <Section icon={UtensilsCrossed} title="Menu par" hint="Counter aur online menu par kab aur kaise dikhe">
        <div className="grid gap-2 sm:grid-cols-2">
          <Toggle on={x.onMenu} onChange={(onMenu) => set({ onMenu, available: onMenu ? x.available : false })} title="Menu par hai" hint="Band ho to restaurant counter par nahi aati" />
          <Toggle on={x.onMenu && x.available} onChange={(available) => set({ available, onMenu: available ? true : x.onMenu })} title="Aaj mil rahi hai"
            hint="Khatam ho jaye to band karein (kitchen ki zubaan me 86) — kal subah dobara chalu" />
        </div>
        {!x.onMenu && <p className="mt-2 text-[0.75rem] text-amber-700">Menu par nahi hogi — sirf retail POS ya products list se bik sakti hai.</p>}
      </Section>

      {dish && (
        <Section icon={Clock} title="Kitchen" hint="Order screen aur KOT par dikhta hai">
          <div className="space-y-3">
            <div>
              <NumberField label="Banne me kitne minute" allowEmpty value={x.prepTimeMinutes} onChange={(prepTimeMinutes) => set({ prepTimeMinutes })} suffix="min" error={ctx.errors.prep}
                hint="Waiter grahak ko isi hisaab se waqt batata hai" />
              <div className="mt-1.5 flex flex-wrap gap-1.5">{PREP.map((m) => <Chip key={m} on={x.prepTimeMinutes === m} onClick={() => set({ prepTimeMinutes: m })}>{m} min</Chip>)}</div>
            </div>
            <div>
              <span className="mb-1.5 block text-[0.8125rem] font-medium text-slate-700">Teekhapan</span>
              <Tiles value={x.spiceLevel} onChange={(spiceLevel) => set({ spiceLevel })} columns="grid-cols-3 sm:grid-cols-5"
                options={SPICE.map((s) => ({ value: s.value, label: s.label, icon: s.chillies || undefined }))} />
            </div>
            <label className="block">
              <span className="mb-1.5 block text-[0.8125rem] font-medium text-slate-700">Cook ke liye hidayat</span>
              <textarea value={x.cookingInstructions} onChange={(e) => set({ cookingInstructions: e.target.value.slice(0, 2000) })} rows={2}
                placeholder="Maslan: tikka 8 minute grill, upar se makhan" className={cn(inputClass, 'h-auto py-2')} />
              <span className="mt-1 block text-xs text-slate-500">Marzi hai — KOT par chhapti hai</span>
            </label>
          </div>
        </Section>
      )}

      <Section icon={Sparkles} title="Grahak ke liye" hint="Menu card, QR menu aur online store par">
        <div className="space-y-3">
          <div className="flex flex-wrap gap-1.5">
            <Chip on={x.chefSpecial} onClick={() => set({ chefSpecial: !x.chefSpecial })}>Chef special</Chip>
            <Chip on={x.bestSeller} onClick={() => set({ bestSeller: !x.bestSeller })}>Best seller</Chip>
          </div>
          <div>
            <span className="mb-1.5 block text-[0.8125rem] font-medium text-slate-700">Kya hai is me</span>
            <div className="flex flex-wrap gap-1.5">{DIET.map((d) => <Chip key={d.value} on={x.dietaryTags.includes(d.value)} onClick={() => set({ dietaryTags: toggle(x.dietaryTags, d.value) })}>{d.label}</Chip>)}</div>
            {ctx.errors.diet && <p className="mt-1.5 text-[0.8125rem] font-medium text-rose-600">{ctx.errors.diet}</p>}
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <TextField label="Chhoti line" value={x.tagLine} onChange={(v) => set({ tagLine: v.slice(0, 60) })} placeholder="Ghar jaisa zaiqa" hint="Card par naam ke neeche" />
            <TextField label="Kitna hota hai" value={x.servingSize} onChange={(v) => set({ servingSize: v.slice(0, 60) })} placeholder="1 plate, 500 ml, 6 pcs" />
            <NumberField label="Kitne logon ke liye" allowEmpty value={x.servesPeople} onChange={(servesPeople) => set({ servesPeople })} error={ctx.errors.serves} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <NumberField label="Calories" allowEmpty value={x.calories} onChange={(calories) => set({ calories })} hint="Marzi hai" />
            <TextField label="Allergy" value={x.allergenInfo} onChange={(v) => set({ allergenInfo: v.slice(0, 500) })} placeholder="Nuts, doodh, anda" hint="Marzi hai" />
          </div>
        </div>
      </Section>

      <Section icon={Clock} title="Kab milti hai" hint="Nashta subah, BBQ sirf raat — is waqt ke bahar counter par nahi aati">
        <div className="space-y-3">
          <Toggle on={x.limitHours} onChange={(limitHours) => set({ limitHours })} title="Sirf kuch waqt / din" hint={x.limitHours ? 'Shop ke waqt (PKT) ke hisaab se' : 'Band ho to jab tak menu par hai, har waqt'} />
          {x.limitHours && (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <TimeField label="Kab se" value={x.availableFrom} onChange={(availableFrom) => set({ availableFrom })} error={ctx.errors.from} />
                <TimeField label="Kab tak" value={x.availableTo} onChange={(availableTo) => set({ availableTo })} error={ctx.errors.to}
                  hint={x.availableFrom && x.availableTo && x.availableTo < x.availableFrom ? 'Raat 12 ke baad tak chalega' : undefined} />
              </div>
              <div>
                <span className="mb-1.5 block text-[0.8125rem] font-medium text-slate-700">Din (khali = roz)</span>
                <div className="flex flex-wrap gap-1.5">{DAYS.map((d, i) => <Chip key={d} on={x.availableDays.includes(i)} onClick={() => set({ availableDays: toggle(x.availableDays, i).sort() })}>{d}</Chip>)}</div>
              </div>
            </>
          )}
        </div>
      </Section>
    </div>
  );
}

function TimeField({ label, value, onChange, error, hint }: { label: string; value: string; onChange: (v: string) => void; error?: string; hint?: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[0.8125rem] font-medium text-slate-700">{label}</span>
      <input type="time" value={value} onChange={(e) => onChange(e.target.value)} className={cn(inputClass, error && 'border-rose-400')} />
      {error ? <span className="mt-1 block text-xs font-medium text-rose-600">{error}</span> : <span className="mt-1 block text-xs text-slate-500">{hint ?? (value ? clock12(value) : 'Khali = koi had nahi')}</span>}
    </label>
  );
}

/* ── Sizes and add-ons ── */
function SizesAndAddOns({ ctx }: { ctx: StepContext<RestaurantExtra> }) {
  const c = ctx.draft.core;
  const x = ctx.draft.extra;
  const bought = kindOf(ctx.draft) === 'bought';
  const groups = useQuery({ queryKey: ['restaurant-modifiers'], queryFn: () => modifiersApi.list(), staleTime: 60_000 });
  const setVariants = (variants: VariantDraft[]) => ctx.setCore({ variants });
  const has = (n: string) => c.variants.some((v) => v.name.toLowerCase() === n.toLowerCase());
  const add = (name: string) => { if (name.trim() && !has(name)) setVariants([...c.variants, { name: name.trim(), sku: '', barcode: '', colorHex: '', price: null, costPrice: null, stock: 0, isActive: true }]); };
  const patch = (i: number, p: Partial<VariantDraft>) => setVariants(c.variants.map((v, j) => (j === i ? { ...v, ...p } : v)));
  const live = (groups.data ?? []).filter((g) => g.isActive || x.modifierGroupIds.includes(g.id));

  return (
    <div className="space-y-4">
      <Section icon={Layers} title="Size" hint="Half / Full, Chhota / Bara — har size ka apna rate. Ek hi size ho to khali chhorein.">
        <div className="space-y-3">
          <div className="flex flex-wrap gap-1.5">
            {SIZE_PRESETS.map((set) => (
              <button key={set.join()} type="button" onClick={() => set.forEach(add)} className="h-8 rounded-full bg-slate-100 px-3 text-[0.8125rem] font-medium text-slate-700 hover:bg-slate-200">+ {set.join(' / ')}</button>
            ))}
          </div>
          {c.variants.length > 0 && (
            <ul className="space-y-2">
              {c.variants.map((v, i) => (
                <li key={v.id ?? `new-${i}`} className={cn('grid items-end gap-2 rounded-xl border p-2.5 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_auto]', v.isActive ? 'border-slate-200' : 'border-slate-200 bg-slate-50 opacity-70')}>
                  <TextField label="Size" value={v.name} onChange={(name) => patch(i, { name })} />
                  <NumberField label="Rate" prefix="Rs" allowEmpty value={v.price} onChange={(price) => patch(i, { price })} placeholder={String(c.price || 0)} />
                  <NumberField label="Cost (marzi)" prefix="Rs" allowEmpty value={v.costPrice} onChange={(costPrice) => patch(i, { costPrice })} placeholder={String(c.costPrice || 0)} />
                  <div className="flex gap-1.5">
                    {bought && !v.id && <NumberField label="Stock" allowEmpty value={v.stock} onChange={(stock) => patch(i, { stock: stock ?? 0 })} />}
                    {v.id
                      ? <button type="button" onClick={() => patch(i, { isActive: !v.isActive })} className={cn('h-10 rounded-lg px-2.5 text-[0.75rem] font-semibold ring-1', v.isActive ? 'bg-success-50 text-success-700 ring-success-200' : 'bg-slate-100 text-slate-500 ring-slate-200')}>{v.isActive ? 'Chalu' : 'Band'}</button>
                      : <button type="button" onClick={() => setVariants(c.variants.filter((_, j) => j !== i))} aria-label="Hatayein" className="flex h-10 w-10 items-center justify-center rounded-lg text-rose-600 hover:bg-rose-50"><Trash2 className="h-4 w-4" /></button>}
                  </div>
                </li>
              ))}
            </ul>
          )}
          {ctx.errors.variants && <p className="text-[0.8125rem] font-medium text-rose-600">{ctx.errors.variants}</p>}
          {c.variants.length > 0 && kindOf(ctx.draft) === 'dish' && (
            <p className="text-[0.75rem] text-slate-500">Rate khali = dish ka rate ({formatPKR(c.price)}). Abhi har size par recipe ka poora saamaan stock se nikalta hai — chhote size ki cost alag likh dein taake profit sahi aaye.</p>
          )}
        </div>
      </Section>

      <Section icon={Plus} title="Add-ons" hint="Order lete waqt yeh options poochay jayenge — extra cheese, raita, bagair pyaaz"
        actions={<Link to="/restaurant/modifiers" className="text-[0.8125rem] font-semibold text-brand-700 hover:underline">Add-on groups →</Link>}>
        {groups.isLoading ? <p className="text-[0.8125rem] text-slate-400">Aa rahe hain…</p> : groups.isError ? (
          <p className="text-[0.8125rem] text-amber-700">Add-ons dekhne ki permission nahi (Menu dekhna).</p>
        ) : !live.length ? (
          <p className="text-[0.8125rem] text-slate-500">Abhi koi add-on group nahi. <Link to="/restaurant/modifiers" className="font-semibold text-brand-700 hover:underline">Pehla group banayein</Link> — maslan "Extra" me cheese +100, raita +50.</p>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2">
            {live.map((g) => {
              const on = x.modifierGroupIds.includes(g.id);
              return (
                <li key={g.id}>
                  <button type="button" onClick={() => ctx.setExtra({ modifierGroupIds: toggle(x.modifierGroupIds, g.id) })} aria-pressed={on}
                    className={cn('flex w-full items-start gap-3 rounded-xl border p-3 text-left transition', on ? 'border-brand-500 bg-brand-50/70 ring-2 ring-brand-500/20' : 'border-slate-200 hover:bg-slate-50')}>
                    <span className={cn('mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border text-[0.6875rem] font-bold', on ? 'border-brand-600 bg-brand-600 text-white' : 'border-slate-300')}>{on ? '✓' : ''}</span>
                    <span className="min-w-0">
                      <span className="block text-[0.875rem] font-semibold text-slate-900">{g.name} <span className="font-normal text-slate-500">· {modifierTypeOf(g.type).label}{g.isRequired ? ' · zaroori' : ''}</span></span>
                      <span className="block truncate text-[0.75rem] text-slate-500">
                        {g.options.filter((o) => o.isActive !== false).slice(0, 4).map((o) => `${o.name}${o.priceAdjustment ? ` ${o.priceAdjustment > 0 ? '+' : ''}${o.priceAdjustment}` : ''}`).join(', ') || 'Grahak ka note'}
                      </span>
                      {!g.isActive && <span className="block text-[0.6875rem] text-amber-700">Group band hai</span>}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </Section>
    </div>
  );
}

/* ── Recipe ── */
function RecipeStep({ ctx }: { ctx: StepContext<RestaurantExtra> }) {
  const x = ctx.draft.extra;
  const per = recipeTotals(x.recipe).perPlate;
  const kitchen = can(PERMISSIONS.RESTAURANT_KITCHEN_MANAGE);
  return (
    <div className="space-y-4">
      <Section icon={Wheat} title={`"${ctx.draft.core.name || 'Is dish'}" me kya lagta hai`}
        hint="Dish bikne par yahi saamaan stock se nikalta hai aur isi se plate ki cost aur profit banta hai">
        {!kitchen && <p className="mb-3 rounded-xl bg-amber-50 px-3 py-2 text-[0.75rem] text-amber-900 ring-1 ring-amber-200">Recipe save karne ke liye "Kitchen sambhalna" ki permission chahiye — aap dekh sakte hain, badal nahi sakte.</p>}
        <RecipeLinesEditor value={x.recipe} onChange={(recipe) => ctx.setExtra({ recipe })} price={ctx.draft.core.price} dishProductId={ctx.productId} />
        {ctx.errors.recipe && <p className="mt-2 text-[0.8125rem] font-medium text-rose-600">{ctx.errors.recipe}</p>}
      </Section>
      {x.recipe.lines.length > 0 && (
        <Section icon={Flame} title="Banane ka tareeqa" hint="Marzi hai — naye cook ke liye">
          <div className="grid gap-3 sm:grid-cols-[minmax(0,3fr)_minmax(0,1fr)]">
            <label className="block">
              <textarea value={x.recipe.preparationSteps} onChange={(e) => ctx.setExtra({ recipe: { ...x.recipe, preparationSteps: e.target.value.slice(0, 5000) } })} rows={4}
                placeholder={'1. Chicken ko dahi aur masale me 2 ghante rakhein\n2. …'} className={cn(inputClass, 'h-auto py-2')} />
            </label>
            <NumberField label="Pakne me" suffix="min" allowEmpty value={x.recipe.cookingTime} onChange={(cookingTime) => ctx.setExtra({ recipe: { ...x.recipe, cookingTime } })} />
          </div>
        </Section>
      )}
      {per > 0 && Math.abs(per - ctx.draft.core.costPrice) > 0.5 && (
        <p className="rounded-xl bg-slate-50 px-3 py-2 text-[0.8125rem] text-slate-600 ring-1 ring-slate-200">Save karne par dish ki cost {formatPKR(per)} ho jayegi (abhi {formatPKR(ctx.draft.core.costPrice)}). Raw material ka rate badle to "Recipes → Rates taaza karein" se sab dishes ki cost theek ho jati hai.</p>
      )}
    </div>
  );
}

/* ── Config ── */
const core: CoreOptions = { units: UNITS, skuPrefix: 'MENU', packs: true, markups: [100, 150, 200, 250] };

const basic = basicStep<RestaurantExtra>(core, {
  extra: (ctx) => <KindTiles ctx={ctx} />,
  categorySuggestions: ['BBQ', 'Karahi', 'Biryani / Chawal', 'Fast food', 'Chinese', 'Naan / Roti', 'Drinks', 'Chai / Coffee', 'Dessert', 'Nashta', 'Deals', 'Raw material'],
  namePlaceholder: 'Jaise: Chicken Karahi',
});
const price = priceStep<RestaurantExtra>(core, { allowZeroPrice: true });
const stock = stockStep<RestaurantExtra>({ ...core, variants: false }, { quick: [1, 5, 10, 24, 50] });

const config: EditorConfig<RestaurantExtra> = {
  label: 'Restaurant',
  draftKey: 'nafaa.product-editor.restaurant',
  paths: { list: '/products', detail: (id) => `/restaurant-menu-items/${id}`, create: '/restaurant-menu-items/new' },
  core,
  extra: {
    initial,
    load: async (productId) => {
      const m = await menuItemsApi.byProduct(productId).catch(() => null);
      if (!m) return { onMenu: false, available: false, menuItemId: null };
      // Every day ticked is the same as no day limit.
      const days = (m.availableDays ?? []).length === 7 ? [] : m.availableDays ?? [];
      const hours = !!(m.availableFrom || m.availableTo || days.length);
      return {
        menuItemId: m.id, recipeId: m.recipe?.id ?? null, onMenu: true, available: m.isAvailable,
        prepTimeMinutes: m.prepTimeMinutes ?? null, spiceLevel: m.isSpicy ? (m.spiceLevel ?? 'MEDIUM') : 'NONE', dietaryTags: m.dietaryTags ?? [],
        chefSpecial: !!m.chefSpecial, bestSeller: !!m.bestSeller, tagLine: m.tagLine ?? '', servingSize: m.servingSize ?? '', servesPeople: m.servesPeople ?? null,
        calories: m.calories ?? null, allergenInfo: m.allergenInfo ?? '', cookingInstructions: m.cookingInstructions ?? '',
        limitHours: hours, availableFrom: m.availableFrom ?? '', availableTo: m.availableTo ?? '', availableDays: days,
        modifierGroupIds: [...(m.modifiers ?? [])].sort((a, b) => a.displayOrder - b.displayOrder).map((g) => g.modifierGroupId),
        recipe: recipeFromApi(m.recipe),
      };
    },
    product: (d, payload) => {
      const kind = kindOf(d);
      const per = kind === 'dish' ? recipeTotals(d.extra.recipe).perPlate : 0;
      return {
        ...payload,
        isRawMaterial: kind === 'raw',
        productType: kind === 'raw' ? null : kind === 'dish' ? 'MADE' : 'BOUGHT',
        // A recipe dish costs what its plate costs; the API keeps it in step after purchases.
        ...(per > 0 && { costPrice: per }),
      };
    },
    save: async (productId, d) => {
      const x = d.extra;
      const kind = kindOf(d);
      const menu = can(PERMISSIONS.RESTAURANT_MENU_MANAGE);
      const kitchen = can(PERMISSIONS.RESTAURANT_KITCHEN_MANAGE);

      if (kind === 'raw') {
        if (x.menuItemId && menu) await menuItemsApi.setAvailable(x.menuItemId, false);
        return;
      }
      if (!x.onMenu && !x.menuItemId) return;
      if (!menu) {
        toast.warning('Product save ho gaya — menu ki details ke liye "Menu sambhalna" ki permission chahiye');
        return;
      }
      const spicy = x.spiceLevel !== 'NONE';
      const m = await menuItemsApi.upsert({
        productId,
        prepTimeMinutes: x.prepTimeMinutes ?? undefined,
        cookingInstructions: x.cookingInstructions.trim(),
        chefSpecial: x.chefSpecial, bestSeller: x.bestSeller,
        isSpicy: spicy, spiceLevel: spicy ? x.spiceLevel : undefined,
        calories: x.calories ?? undefined, servingSize: x.servingSize.trim(), servesPeople: x.servesPeople ?? undefined,
        dietaryTags: x.dietaryTags, allergenInfo: x.allergenInfo.trim(), tagLine: x.tagLine.trim(),
        isAvailable: x.onMenu && x.available,
        availableFrom: x.limitHours ? x.availableFrom : '', availableTo: x.limitHours ? x.availableTo : '',
        availableDays: x.limitHours ? x.availableDays : [],
      });
      await menuItemsApi.attachModifiers(m.id, x.modifierGroupIds);

      if (kind !== 'dish') return;
      if (!kitchen) {
        if (x.recipe.lines.length) toast.warning('Recipe save nahi hui — "Kitchen sambhalna" ki permission chahiye');
        return;
      }
      if (x.recipe.lines.length) await recipesApi.upsert(recipeInput(m.id, x.recipe));
      else if (x.recipeId) await recipesApi.remove(x.recipeId);
    },
  },
  steps: [
    {
      ...basic,
      validate: (d, isEdit) => {
        const e: Errors = { ...(basic.validate?.(d, isEdit) ?? {}) };
        if (kindOf(d) === 'raw' && ['plate', 'cup', 'glass', 'bowl'].includes(d.core.unit)) e.unit = 'Raw material ka stock kilo, gram, litre ya adad me rakhein';
        return e;
      },
    },
    {
      ...price,
      validate: (d, isEdit) => {
        const e: Errors = { ...(price.validate?.(d, isEdit) ?? {}) };
        // Raw material is not sold, so it needs only a cost.
        if (kindOf(d) !== 'raw' && !(d.core.price > 0)) e.price = 'Menu ka rate likhein';
        return e;
      },
    },
    {
      id: 'menu', title: 'Menu', hint: 'Waqt, teekhapan, kitchen', icon: UtensilsCrossed, when: (d) => kindOf(d) !== 'raw',
      render: (ctx) => <MenuStep ctx={ctx} />,
      validate: (d): Errors => {
        const x = d.extra;
        const e: Errors = {};
        if (x.prepTimeMinutes != null && (x.prepTimeMinutes < 0 || x.prepTimeMinutes > 600)) e.prep = '0 se 600 minute ke beech';
        if (x.servesPeople != null && (x.servesPeople < 1 || x.servesPeople > 100)) e.serves = '1 se 100 ke beech';
        if (x.dietaryTags.includes('VEGAN') && (x.dietaryTags.includes('CONTAINS_EGG') || x.dietaryTags.some((t) => ['CHICKEN', 'BEEF', 'MUTTON', 'CONTAINS_SEAFOOD'].includes(t)))) e.diet = 'Vegan me gosht ya anda nahi ho sakta';
        else if (x.dietaryTags.includes('VEGETARIAN') && x.dietaryTags.some((t) => ['CHICKEN', 'BEEF', 'MUTTON', 'CONTAINS_SEAFOOD'].includes(t))) e.diet = 'Veg me gosht nahi ho sakta';
        if (x.limitHours) {
          if (x.availableFrom && !HHMM.test(x.availableFrom)) e.from = 'Waqt sahi nahi';
          if (x.availableTo && !HHMM.test(x.availableTo)) e.to = 'Waqt sahi nahi';
          if (x.availableFrom && x.availableFrom === x.availableTo) e.to = 'Shuru aur khatam ek jaisa nahi ho sakta';
          if (!x.availableFrom && !x.availableTo && !x.availableDays.length) e.from = 'Waqt ya din chunein, ya yeh band karein';
        }
        return e;
      },
    },
    {
      id: 'sizes', title: 'Size / Add-ons', hint: 'Half/Full, extras', icon: Boxes, when: (d) => kindOf(d) !== 'raw',
      render: (ctx) => <SizesAndAddOns ctx={ctx} />,
      validate: (d): Errors => {
        const names = d.core.variants.map((v) => v.name.trim().toLowerCase());
        if (names.some((n) => !n)) return { variants: 'Har size ka naam likhein' };
        if (new Set(names).size !== names.length) return { variants: 'Do size ka naam ek jaisa hai' };
        if (d.core.variants.some((v) => v.price !== null && !(v.price > 0))) return { variants: 'Size ka rate 0 se zyada likhein, ya khali chhorein' };
        return {};
      },
    },
    {
      id: 'recipe', title: 'Recipe', hint: 'Saamaan aur plate ki cost', icon: Wheat, when: (d) => kindOf(d) === 'dish',
      render: (ctx) => <RecipeStep ctx={ctx} />,
      validate: (d): Errors => {
        const p = recipeProblem(d.extra.recipe);
        return p ? { recipe: p } : {};
      },
    },
    { ...stock, when: (d) => kindOf(d) !== 'dish' },
  ],
  summary: (d) => {
    const kind = kindOf(d);
    const x = d.extra;
    const per = recipeTotals(x.recipe).perPlate;
    return (
      <div className="mt-3 space-y-1 border-t border-slate-100 pt-3 text-[0.8125rem]">
        <p className="text-slate-600">{kind === 'dish' ? 'Kitchen me banti hai' : kind === 'bought' ? 'Bani banai bikti hai' : 'Raw material'}</p>
        {kind !== 'raw' && <p className={x.onMenu && x.available ? 'text-success-700' : 'text-amber-700'}>{!x.onMenu ? 'Menu par nahi' : x.available ? 'Menu par · aaj mil rahi hai' : 'Menu par · aaj band (86)'}</p>}
        {kind !== 'raw' && x.limitHours && x.availableFrom && <p className="text-slate-600">{clock12(x.availableFrom)} – {clock12(x.availableTo) || 'band hone tak'}</p>}
        {d.core.variants.length > 0 && <p className="text-slate-600">{d.core.variants.length} size</p>}
        {x.modifierGroupIds.length > 0 && <p className="text-slate-600">{x.modifierGroupIds.length} add-on group</p>}
        {kind === 'dish' && (x.recipe.lines.length
          ? <p className="text-slate-600">Recipe: {x.recipe.lines.length} cheezein · plate {formatPKR(per)}{d.core.price > 0 && per > 0 ? ` · ${((per / d.core.price) * 100).toFixed(0)}% food cost` : ''}</p>
          : <p className="text-amber-700">Recipe nahi — stock nahi katega</p>)}
      </div>
    );
  },
  refresh: ['restaurant-menu-board', 'restaurant-menu-items', 'restaurant-cookability', 'restaurant-recipes', 'restaurant-product-extra', 'restaurant-modifiers', 'products'],
  guide: [
    { icon: ChefHat, color: '#ea580c', title: 'Teen tarah ki cheez', text: 'Kitchen me banne wali dish, bani banai bikne wali (cold drink) aur raw material (chicken, oil). Raw material menu par nahi aata, recipe me lagta hai.' },
    { icon: Layers, color: '#2563eb', title: 'Size aur add-ons', text: 'Half / Full jaise size ka apna rate. Extra cheese, raita jaisi cheezein Add-on groups se — ek group kai dishes par lag sakta hai.' },
    { icon: Wheat, color: '#a16207', title: 'Recipe', text: 'Gram, ml ya adad me likhein — stock kilo/litre me ho to khud badal jata hai. Dish bikne par saamaan stock se nikalta hai aur plate ki cost isi se banti hai.' },
    { icon: Clock, color: '#16a34a', title: 'Kab milti hai', text: '"Aaj mil rahi hai" band karein jab khatam ho jaye. Nashta ya BBQ ka waqt likhein to us waqt ke bahar counter par nahi aati.' },
  ],
};

export default function RestaurantProductEditor() {
  return <ProductEditorPage config={config} />;
}
