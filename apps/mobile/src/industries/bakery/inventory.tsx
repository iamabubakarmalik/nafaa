/**
 * Bakery products through the shared products list, editor and detail (web
 * BakeryProducts, BakeryProductEditor, BakeryProductDetail): made or bought,
 * selling units with their own rates (per slice, pound, dozen…), the recipe
 * with live cost, cake options, shelf life and allergens. Raw materials are
 * not products; they live on the Raw material screen.
 */

import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { CakeSlice, ChefHat, Clock, ShoppingBag, Trash2, Wheat } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import {
  PRICE_FIELD, deriveBakeryCategory, deriveSize, defaultShelfLifeDays, extraUnitsFor, fmtQty, isCakeLike, isWeighedUnit, liveBatches, needsFridge, rateBetween, recipeCost,
  type RecipeLine,
} from '@nafaa/core/bakery';
import { formatDate, formatMoney } from '@/core/format';
import { msg, t } from '@/core/i18n';
import { useOfflineList } from '@/core/offline';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { Amount, Badge, Button, Card, Chip, EmptyState, FormSection, IconButton, Input, ListRow, Row, Select, Switch, Text, TextArea, useTheme } from '@/design';
import { NumberInput } from '@/modules/inventory/components/fields';
import { nearestKind, useCategoryTree, type CategoryNode } from '@/modules/inventory/components/Pickers';
import { categoriesApi } from '@/modules/inventory/api/taxonomy';
import { GENERAL_CORE } from '@/modules/inventory/industry/general';
import { registerInventoryIndustry } from '@/modules/inventory/industry/registry';
import type { CoreOptions, EditorConfig, StepContext, StepDef } from '@/modules/inventory/industry/types';
import { basicStep, priceStep, stockStep } from '@/modules/inventory/screens/editor/coreSteps';
import type { EditorDraft, Errors } from '@/modules/inventory/screens/editor/types';
import { bakeryProductsApi, freshnessApi, ingredientsApi, type BakeryCategory, type BakeryProfile, type FreshnessLog, type Ingredient } from './api';
import { BAKERY_KINDS, CREAMS, FLAVORS, RAW_KEY, SHAPES, rawCategoryOf } from './meta';

type Kind = 'MADE' | 'BOUGHT';
type RateKey = 'pcs' | 'dozen' | 'slice' | 'kg' | 'pound' | 'box' | 'tray';

export interface BakeryExtra {
  kindGuess: Kind;
  rates: Partial<Record<RateKey, number | null>>;
  weightGrams: number | null; numberOfSlices: number | null; servingSize: number | null;
  flavor: string; shape: string; cream: string; customFlavor: string; customShape: string; customCream: string;
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
  flavor: 'VANILLA', shape: 'ROUND', cream: 'BUTTERCREAM', customFlavor: '', customShape: '', customCream: '',
  isCakeCustomizable: true, allowsMessageOnCake: true, allowsPhotoOnCake: false, allowsCustomShape: false, allowsFlavorChoice: true, allowsSizeChoice: true,
  decorations: [], ingredientList: '', servingSuggestions: '', recipe: [], recipeYield: 1,
  shelfLifeDays: 3, shelfLifeHours: null, fridge: false, prepTimeHours: 4, advanceOrderHours: 24, minOrderQty: 1, maxOrderQty: null,
  allergens: [], containsEgg: true, containsNuts: false, containsGluten: true, containsDairy: true,
  isEggless: false, isVegan: false, isSugarFree: false, isHalal: true, calories: null,
  isPopular: false, isBestSeller: false, isNewArrival: false, isSeasonal: false, seasonName: '',
};

const UNITS = [
  { value: 'pcs', label: msg('Piece') }, { value: 'dozen', label: msg('Dozen') }, { value: 'kg', label: msg('Kilo') }, { value: 'pound', label: msg('Pound') },
  { value: 'gram', label: msg('Gram') }, { value: 'slice', label: msg('Slice') }, { value: 'box', label: msg('Box') }, { value: 'tray', label: msg('Tray') },
  { value: 'packet', label: msg('Packet') }, { value: 'bottle', label: msg('Bottle') }, { value: 'plate', label: msg('Plate') }, { value: 'custom', label: msg('Apna') },
];
const UNIT_LABEL: Record<string, string> = Object.fromEntries(UNITS.map((u) => [u.value, u.label]));
const DECORATIONS: string[] = [msg('Roses'), msg('Phool'), msg('Ribbon'), msg('Sitare'), msg('Sprinkles'), msg('Taaza phal'), msg('Chocolate chips'), msg('Candles'), msg('Pearls'), msg('Unicorn'), msg('Crown'), msg('Dil'), msg('Ghubbare'), msg('Fondant patte')];
const ALLERGENS: string[] = [msg('Nuts'), msg('Doodh'), msg('Anday'), msg('Gluten'), msg('Soya'), msg('Til'), msg('Mungphali'), msg('Machhli')];
const SHELF_DAYS = [1, 2, 3, 7, 15, 30, 90];
const KNOWN = new Set(UNITS.map((u) => u.value));
const toggle = (list: string[], v: string) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
const num = (v: unknown) => (v === null || v === undefined || v === '' ? null : Number(v));
const kindOf = (d: EditorDraft<BakeryExtra>): Kind => (d.core.productType === 'MADE' || d.core.productType === 'BOUGHT' ? d.core.productType : d.extra.kindGuess);

function useBakeryCategory(d: EditorDraft<BakeryExtra>) {
  const cats = useOfflineList<{ id: string; name: string }>('category');
  const { nodes } = useCategoryTree();
  const name = (cats.data ?? []).find((c) => c.id === d.core.categoryId)?.name;
  // A kind set on the shop category (or its nearest parent) wins over the guess from the names.
  return (nearestKind(nodes, d.core.categoryId) as BakeryCategory | null) ?? deriveBakeryCategory(name, d.core.name);
}

/* ───────────────────────── editor steps ───────────────────────── */

function KindAndSize({ ctx }: { ctx: StepContext<BakeryExtra> }) {
  const kind = kindOf(ctx.draft);
  const cake = isCakeLike(useBakeryCategory(ctx.draft));
  const unit = ctx.draft.core.unit;
  const custom = !KNOWN.has(unit) || unit === 'custom';
  return (
    <>
      <Text size="sm" weight="semibold" tone="secondary">{t('Yeh cheez')}</Text>
      {([['MADE', ChefHat, msg('Khud banate hain'), msg('Cake, bread, patties — recipe aur freshness ke saath')], ['BOUGHT', ShoppingBag, msg('Khareed kar bechte hain'), msg('Juice, chips, packet wala maal')]] as const).map(([k, icon, title, hint]) => (
        <ListRow key={k} icon={icon} iconTone={kind === k ? 'brand' : 'neutral'} title={t(title)} subtitle={t(hint)} selected={kind === k}
          disabled={ctx.isEdit && kind !== k && !!ctx.draft.core.productType} onPress={() => ctx.setCore({ productType: k })} />
      ))}
      {!ctx.isEdit && <ListRow icon={Wheat} iconTone="warning" title={t('Raw material')} subtitle={t('Atta, cheeni, makhan — yeh bikta nahi, Raw material page par jata hai →')} chevron onPress={() => router.push('/bakery/ingredients' as never)} />}
      {custom && <Input label={t('Apne naap ka naam')} value={unit === 'custom' ? '' : unit} onChangeText={(v) => ctx.setCore({ unit: v.trim() ? v : 'custom' })} placeholder={t('Jaise: thaal, degh')} error={ctx.errors.customUnit} />}
      {(isWeighedUnit(unit) || cake) && (
        <Row gap={2}>
          <NumberInput containerStyle={{ flex: 1 }} label={t('Wazan (gram)')} value={ctx.draft.extra.weightGrams} onChangeValue={(weightGrams) => ctx.setExtra({ weightGrams })} hint={t('Ek cheez ka')} />
          {cake && <NumberInput integer containerStyle={{ flex: 1 }} label={t('Kitne slice')} value={ctx.draft.extra.numberOfSlices} onChangeValue={(numberOfSlices) => ctx.setExtra({ numberOfSlices })} />}
          {cake && <NumberInput integer containerStyle={{ flex: 1 }} label={t('Kitne logon ke liye')} value={ctx.draft.extra.servingSize} onChangeValue={(servingSize) => ctx.setExtra({ servingSize })} />}
        </Row>
      )}
    </>
  );
}

function Badges({ ctx }: { ctx: StepContext<BakeryExtra> }) {
  const x = ctx.draft.extra;
  return (
    <>
      <Text size="sm" weight="semibold" tone="secondary">{t('Nishaan')}</Text>
      <Row gap={2} wrap>
        <Chip label={t('Mashhoor')} selected={x.isPopular} onPress={() => ctx.setExtra({ isPopular: !x.isPopular })} />
        <Chip label={t('Best seller')} selected={x.isBestSeller} onPress={() => ctx.setExtra({ isBestSeller: !x.isBestSeller })} />
        <Chip label={t('Naya')} selected={x.isNewArrival} onPress={() => ctx.setExtra({ isNewArrival: !x.isNewArrival })} />
        <Chip label={t('Mausami')} selected={x.isSeasonal} onPress={() => ctx.setExtra({ isSeasonal: !x.isSeasonal })} />
      </Row>
      {x.isSeasonal && <Input label={t('Kis mausam / mauqe ka')} value={x.seasonName} onChangeText={(seasonName) => ctx.setExtra({ seasonName })} placeholder={t('Ramzan, Eid, Sardi')} error={ctx.errors.seasonName} />}
    </>
  );
}

function OtherRates({ ctx }: { ctx: StepContext<BakeryExtra> }) {
  const base = ctx.draft.core.unit;
  const keys = KNOWN.has(base) ? (extraUnitsFor(base) as RateKey[]) : [];
  if (!keys.length) return null;
  const opts = { weightGrams: ctx.draft.extra.weightGrams, slices: ctx.draft.extra.numberOfSlices };
  return (
    <>
      <Text size="sm" weight="semibold" tone="secondary">{t('Aur kis tarah bechte hain (zaroori nahi)')}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {keys.map((k) => {
          const suggest = ctx.draft.core.price ? Math.round(ctx.draft.core.price * rateBetween(k, base, opts)) : 0;
          return (
            <View key={k} style={{ width: '48%' }}>
              <NumberInput label={t('Fi {{label}}', { label: t(UNIT_LABEL[k] ?? k) })} prefix="Rs" value={ctx.draft.extra.rates[k] ?? null}
                onChangeValue={(v) => ctx.setExtra({ rates: { ...ctx.draft.extra.rates, [k]: v } })} placeholder={suggest ? String(suggest) : '—'} />
            </View>
          );
        })}
      </View>
    </>
  );
}

function Recipe({ ctx }: { ctx: StepContext<BakeryExtra> }) {
  const th = useTheme();
  const x = ctx.draft.extra;
  const [q, setQ] = useState('');
  const { data: ingredients = [] } = useQuery({ queryKey: [RAW_KEY, 'list', false], queryFn: () => ingredientsApi.list({}) });
  const chosen = new Set(x.recipe.map((r) => r.ingredientId));
  const term = q.trim().toLowerCase();
  const options = ingredients.filter((i) => i.isActive !== false && !chosen.has(i.id) && (!term || i.name.toLowerCase().includes(term))).slice(0, 12);
  const cost = recipeCost(x.recipe, x.recipeYield, ingredients);
  const setLines = (recipe: RecipeLine[]) => ctx.setExtra({ recipe });
  return (
    <FormSection title={t('"{{value}}" mein kya lagta hai', { value: ctx.draft.core.name || t('Is cheez') })} description={t('Bharein to cost khud nikal aati hai — zaroori nahi')}>
      {ingredients.length === 0 ? (
        <Button variant="soft" icon={Wheat} onPress={() => router.push('/bakery/ingredients' as never)}>{t('Pehle raw material daalein')}</Button>
      ) : (
        <>
          <Input value={q} onChangeText={setQ} placeholder={t('Atta, cheeni, anday…')} />
          <Row gap={2} wrap>{options.map((i) => <Chip key={i.id} label={`+ ${i.name} · ${formatMoney(i.costPerUnit)}/${i.unit}`} onPress={() => setLines([...x.recipe, { ingredientId: i.id, name: i.name, qty: 0, unit: i.unit, costPerUnit: i.costPerUnit }])} />)}</Row>
          {x.recipe.map((r, i) => (
            <Row key={r.ingredientId} gap={2}>
              <Text weight="semibold" style={{ flex: 1 }} numberOfLines={1}>{r.name}</Text>
              <NumberInput containerStyle={{ width: 90 }} value={r.qty || null} placeholder={t('Kitna')} error={r.qty > 0 ? undefined : ' '}
                onChangeValue={(v) => setLines(x.recipe.map((l, j) => (j === i ? { ...l, qty: v ?? 0 } : l)))} />
              <Text size="xs" tone="muted" style={{ width: 40 }}>{r.unit}</Text>
              <IconButton icon={Trash2} label={t('Hatayein')} variant="danger" onPress={() => setLines(x.recipe.filter((_, j) => j !== i))} />
            </Row>
          ))}
          {ctx.errors.recipe && <Text size="xs" tone="danger">{ctx.errors.recipe}</Text>}
          {x.recipe.length > 0 && (
            <Card tone="muted">
              <View style={{ gap: th.space(2) }}>
                <NumberInput label={t('Is saamaan se kitne {{unit}} bante hain', { unit: ctx.draft.core.unit })} value={x.recipeYield} onChangeValue={(v) => ctx.setExtra({ recipeYield: v || 1 })} />
                <Row justify="between"><Text tone="secondary">{t('Poori kharch')}</Text><Amount value={cost.batchCost} weight="semibold" /></Row>
                <Row justify="between"><Text tone="secondary">{t('Ek ki cost')}</Text><Amount value={cost.perUnit} weight="bold" size="lg" /></Row>
                {cost.canMake !== null && <Text size="xs" tone="muted">{t('Gudaam se {{canMake}} ban sakte', { canMake: fmtQty(cost.canMake) })}</Text>}
                {Math.abs(cost.perUnit - ctx.draft.core.costPrice) > 1 && <Button onPress={() => ctx.setCore({ costPrice: Math.round(cost.perUnit * 100) / 100 })}>{t('Yehi cost laga dein')}</Button>}
              </View>
            </Card>
          )}
        </>
      )}
    </FormSection>
  );
}

function CakeOptions({ ctx }: { ctx: StepContext<BakeryExtra> }) {
  const x = ctx.draft.extra;
  const set = ctx.setExtra;
  return (
    <FormSection title={t('Cake ki details')} description={t('Order lete waqt yahi options milenge')}>
      <Select label={t('Flavour')} value={x.flavor} onChange={(flavor) => set({ flavor })} options={FLAVORS.map((f) => ({ value: f.value, label: `${f.emoji} ${t(f.label)}` }))} />
      {x.flavor.startsWith('CUSTOM') && <Input label={t('Flavour ka naam')} value={x.customFlavor} onChangeText={(customFlavor) => set({ customFlavor })} />}
      <Select label={t('Shape')} value={x.shape} onChange={(shape) => set({ shape })} options={SHAPES.map((f) => ({ value: f.value, label: `${f.emoji} ${t(f.label)}` }))} />
      <Select label={t('Cream')} value={x.cream} onChange={(cream) => set({ cream })} options={CREAMS.map((f) => ({ value: f.value, label: `${f.emoji} ${t(f.label)}` }))} />
      {x.cream === 'OTHER' && <Input label={t('Cream ka naam')} value={x.customCream} onChangeText={(customCream) => set({ customCream })} />}
      <Switch value={x.isCakeCustomizable} onChange={(isCakeCustomizable) => set({ isCakeCustomizable })} label={t('Order par banta hai')} description={t('Grahak apni marzi bata sakta hai')} />
      <Switch value={x.allowsMessageOnCake} onChange={(allowsMessageOnCake) => set({ allowsMessageOnCake })} label={t('Cake par naam / message')} />
      <Switch value={x.allowsPhotoOnCake} onChange={(allowsPhotoOnCake) => set({ allowsPhotoOnCake })} label={t('Cake par photo')} />
      <Switch value={x.allowsFlavorChoice} onChange={(allowsFlavorChoice) => set({ allowsFlavorChoice })} label={t('Flavour grahak chune')} />
      <Switch value={x.allowsSizeChoice} onChange={(allowsSizeChoice) => set({ allowsSizeChoice })} label={t('Size grahak chune')} />
      <Switch value={x.allowsCustomShape} onChange={(allowsCustomShape) => set({ allowsCustomShape })} label={t('Apni shakal')} />
      <Text size="sm" weight="semibold" tone="secondary">{t('Sajawat')}</Text>
      <Row gap={2} wrap>{[...DECORATIONS, ...x.decorations.filter((d) => !DECORATIONS.includes(d))].map((d) => <Chip key={d} label={t(d)} selected={x.decorations.includes(d)} onPress={() => set({ decorations: toggle(x.decorations, d) })} />)}</Row>
    </FormSection>
  );
}

function RecipeStepBody({ ctx }: { ctx: StepContext<BakeryExtra> }) {
  const cake = isCakeLike(useBakeryCategory(ctx.draft));
  return (
    <>
      <Recipe ctx={ctx} />
      {cake && <CakeOptions ctx={ctx} />}
      <FormSection title={t('Grahak ke liye')}>
        <TextArea label={t('Kya kya dala hai')} value={ctx.draft.extra.ingredientList} onChangeText={(ingredientList) => ctx.setExtra({ ingredientList })} placeholder={t('Maida, cheeni, anday, makhan…')} />
        <Input label={t('Kaise khayein / pesh karein')} value={ctx.draft.extra.servingSuggestions} onChangeText={(servingSuggestions) => ctx.setExtra({ servingSuggestions })} placeholder={t('Thanda kar ke')} />
      </FormSection>
    </>
  );
}

function FreshStepBody({ ctx }: { ctx: StepContext<BakeryExtra> }) {
  const x = ctx.draft.extra;
  const set = ctx.setExtra;
  const made = kindOf(ctx.draft) === 'MADE';
  const bc = useBakeryCategory(ctx.draft);
  return (
    <>
      <FormSection title={t('Kitne din chalti hai')} description={t('Is category ke liye aam tor par {{defaultShelfLifeDays}} din', { defaultShelfLifeDays: defaultShelfLifeDays(bc) })}>
        <Row gap={2} wrap>{SHELF_DAYS.map((d) => <Chip key={d} label={t('{{d}} din', { d })} selected={x.shelfLifeDays === d && !x.shelfLifeHours} onPress={() => set({ shelfLifeDays: d, shelfLifeHours: null })} />)}</Row>
        <Row gap={2}>
          <NumberInput integer containerStyle={{ flex: 1 }} label={t('Din')} value={x.shelfLifeDays} onChangeValue={(shelfLifeDays) => set({ shelfLifeDays })} error={ctx.errors.shelfLife} />
          <NumberInput integer containerStyle={{ flex: 1 }} label={t('Ya ghante')} value={x.shelfLifeHours} onChangeValue={(shelfLifeHours) => set({ shelfLifeHours })} hint={t('Ek din se kam chalne wali cheez')} />
        </Row>
        <Switch value={x.fridge} onChange={(fridge) => set({ fridge })} label={t('Fridge mein rakhni hai')} description={needsFridge(bc) ? t('Is category ke liye aam tor par haan') : undefined} />
      </FormSection>
      {made && (
        <FormSection title={t('Banane aur order ka waqt')}>
          <Row gap={2}>
            <NumberInput containerStyle={{ flex: 1 }} label={t('Banane mein (ghante)')} value={x.prepTimeHours} onChangeValue={(prepTimeHours) => set({ prepTimeHours })} />
            <NumberInput containerStyle={{ flex: 1 }} label={t('Kitna pehle order (ghante)')} value={x.advanceOrderHours} onChangeValue={(advanceOrderHours) => set({ advanceOrderHours })} />
          </Row>
          <Row gap={2}>
            <NumberInput containerStyle={{ flex: 1 }} label={t('Kam se kam')} value={x.minOrderQty} onChangeValue={(minOrderQty) => set({ minOrderQty })} />
            <NumberInput containerStyle={{ flex: 1 }} label={t('Zyada se zyada')} value={x.maxOrderQty} onChangeValue={(maxOrderQty) => set({ maxOrderQty })} error={ctx.errors.maxOrder} />
          </Row>
        </FormSection>
      )}
      <FormSection title={t('Kya shamil hai')} description={t('Allergy wale grahak ke liye')}>
        <Row gap={2} wrap>
          <Chip label={t('Anda')} selected={x.containsEgg} onPress={() => set({ containsEgg: !x.containsEgg })} />
          <Chip label={t('Doodh')} selected={x.containsDairy} onPress={() => set({ containsDairy: !x.containsDairy })} />
          <Chip label={t('Dry fruit / nuts')} selected={x.containsNuts} onPress={() => set({ containsNuts: !x.containsNuts })} />
          <Chip label={t('Gluten (maida)')} selected={x.containsGluten} onPress={() => set({ containsGluten: !x.containsGluten })} />
        </Row>
        <Row gap={2} wrap>
          <Chip label={t('Halal')} selected={x.isHalal} onPress={() => set({ isHalal: !x.isHalal })} />
          <Chip label={t('Anday ke bagair')} selected={x.isEggless} onPress={() => set({ isEggless: !x.isEggless })} />
          <Chip label={t('Vegan')} selected={x.isVegan} onPress={() => set({ isVegan: !x.isVegan })} />
          <Chip label={t('Cheeni ke bagair')} selected={x.isSugarFree} onPress={() => set({ isSugarFree: !x.isSugarFree })} />
        </Row>
        <Row gap={2} wrap>{ALLERGENS.map((a) => <Chip key={a} label={t(a)} selected={x.allergens.includes(a)} onPress={() => set({ allergens: toggle(x.allergens, a) })} />)}</Row>
        {ctx.errors.diet && <Text size="xs" tone="danger">{ctx.errors.diet}</Text>}
        <NumberInput integer label={t('Calories (ek serving)')} value={x.calories} onChangeValue={(calories) => set({ calories })} />
      </FormSection>
    </>
  );
}

const core: CoreOptions = { ...GENERAL_CORE, units: UNITS, skuPrefix: 'BKR', variants: false, batches: false };
const basic = basicStep<BakeryExtra>(core, { extra: (ctx) => <KindAndSize ctx={ctx} />, after: (ctx) => <Badges ctx={ctx} />, namePlaceholder: msg('Jaise: Chocolate Fudge Cake') });
const basicWithChecks: StepDef<BakeryExtra> = {
  ...basic,
  validate: (d, isEdit) => {
    const e: Errors = { ...(basic.validate?.(d, isEdit) ?? {}) };
    if (d.core.unit === 'custom') e.customUnit = t('Apne naap ka naam likhein');
    if (d.extra.isSeasonal && !d.extra.seasonName.trim()) e.seasonName = t('Mausam ka naam likhein');
    return e;
  },
};

const editor: EditorConfig<BakeryExtra> = {
  core,
  extra: {
    initial,
    load: async (productId) => {
      const p = await bakeryProductsApi.byProduct(productId).catch(() => null);
      if (!p) return {};
      const a = p as Record<string, unknown> & BakeryProfile;
      const ing = a.ingredients ?? {};
      const rates: Partial<Record<RateKey, number | null>> = {};
      for (const [k, field] of Object.entries(PRICE_FIELD)) if (a[field] != null) rates[k as RateKey] = Number(a[field]);
      const b = (k: string) => !!a[k];
      return {
        kindGuess: a.isCustomizable || a.isCakeCustomizable || (ing.lines?.length ?? 0) > 0 ? 'MADE' : 'BOUGHT',
        rates, weightGrams: num(a.weightGrams), numberOfSlices: num(a.numberOfSlices), servingSize: num(a.servingSize),
        flavor: String(a.defaultFlavor ?? initial.flavor), shape: String(a.defaultShape ?? initial.shape), cream: String(a.defaultCreamType ?? initial.cream),
        customFlavor: ing.custom?.flavor ?? '', customShape: ing.custom?.shape ?? '', customCream: ing.custom?.cream ?? '',
        isCakeCustomizable: b('isCakeCustomizable'), allowsMessageOnCake: b('allowsMessageOnCake'), allowsPhotoOnCake: b('allowsPhotoOnCake'),
        allowsCustomShape: b('allowsCustomShape'), allowsFlavorChoice: b('allowsFlavorChoice'), allowsSizeChoice: b('allowsSizeChoice'),
        decorations: ing.decorations ?? [], ingredientList: String(a.ingredientList ?? ''), servingSuggestions: String(a.servingSuggestions ?? ''),
        recipe: (ing.lines ?? []).map((l) => ({ ...l, qty: Number(l.qty) || 0, costPerUnit: Number(l.costPerUnit) || 0 })), recipeYield: Number(ing.yield) || 1,
        shelfLifeDays: num(a.shelfLifeDays), shelfLifeHours: num(a.shelfLifeHours), fridge: b('requiresRefrigeration'),
        prepTimeHours: num(a.prepTimeHours), advanceOrderHours: num(a.advanceOrderHours), minOrderQty: num(a.minOrderQty), maxOrderQty: num(a.maxOrderQty),
        allergens: (a.allergens as string[]) ?? [], containsEgg: b('containsEgg'), containsNuts: b('containsNuts'), containsGluten: b('containsGluten'), containsDairy: b('containsDairy'),
        isEggless: b('isEggless'), isVegan: b('isVegan'), isSugarFree: b('isSugarFree'), isHalal: a.isHalal !== false, calories: num(a.caloriesPerServing),
        isPopular: b('isPopular'), isBestSeller: b('isBestSeller'), isNewArrival: b('isNewArrival'), isSeasonal: b('isSeasonalItem'), seasonName: String(a.seasonName ?? ''),
      };
    },
    // The shared product API does not take productType; it is saved with the bakery profile.
    product: (d, { productType: _shared, ...payload }) => ({
      ...payload,
      weight: d.extra.weightGrams ?? undefined,
      expiryTracked: !!(d.extra.shelfLifeDays || d.extra.shelfLifeHours),
    }),
    save: async (productId, d) => {
      const x = d.extra;
      const c = d.core;
      const made = kindOf(d) === 'MADE';
      const cats = await categoriesApi.list<CategoryNode>().catch(() => [] as CategoryNode[]);
      const rates: Record<string, number | undefined> = {};
      for (const [k, field] of Object.entries(PRICE_FIELD)) rates[field] = x.rates[k as RateKey] ?? undefined;
      if (PRICE_FIELD[c.unit]) rates[PRICE_FIELD[c.unit]] = c.price;
      await bakeryProductsApi.upsert({
        productId, productType: kindOf(d),
        category: (nearestKind(cats, c.categoryId) as BakeryCategory | null) ?? deriveBakeryCategory(cats.find((k) => k.id === c.categoryId)?.name, c.name),
        defaultSize: deriveSize(c.unit, x.weightGrams),
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
      });
    },
  },
  steps: [
    basicWithChecks,
    priceStep<BakeryExtra>(core, { extra: (ctx) => <OtherRates ctx={ctx} /> }),
    {
      id: 'recipe', title: msg('Recipe'), icon: Wheat, when: (d) => kindOf(d) === 'MADE', render: (ctx) => <RecipeStepBody ctx={ctx} />,
      validate: (d): Errors => (d.extra.recipe.some((r) => !(r.qty > 0)) ? { recipe: t('Har cheez ki quantity likhein') } : {}),
    },
    {
      id: 'fresh', title: msg('Freshness'), icon: Clock, render: (ctx) => <FreshStepBody ctx={ctx} />,
      validate: (d) => {
        const e: Errors = {};
        const x = d.extra;
        if (kindOf(d) === 'MADE' && !x.shelfLifeDays && !x.shelfLifeHours) e.shelfLife = t('Khud bani cheez kitne din chalti hai likhein');
        if (x.maxOrderQty && x.minOrderQty && x.maxOrderQty < x.minOrderQty) e.maxOrder = t('Kam se kam se chhota nahi ho sakta');
        if (x.isEggless && x.containsEgg) e.diet = t('"Anday ke bagair" aur "Anda" dono nahi ho sakte');
        return e;
      },
    },
    stockStep<BakeryExtra>(core, { quick: [1, 6, 12, 24, 50, 100] }),
  ],
  summary: (d) => [
    [t('Yeh cheez'), kindOf(d) === 'MADE' ? t('Khud banate hain') : t('Khareed kar bechte hain')],
    ...(d.extra.recipe.length ? [[t('Recipe'), t('{{count}} cheezein', { count: d.extra.recipe.length })] as [string, string]] : []),
    ...(d.extra.shelfLifeDays || d.extra.shelfLifeHours ? [[t('Chalti hai'), d.extra.shelfLifeDays ? t('{{count}} din', { count: d.extra.shelfLifeDays }) : t('{{count}} ghante', { count: d.extra.shelfLifeHours })] as [string, string]] : []),
  ],
};

/* ───────────────────────── list and detail ───────────────────────── */

const shelfLife = (days: number | null | undefined, hours: number | null | undefined) =>
  days ? t('{{count}} din', { count: days }) : hours ? t('{{count}} ghante', { count: hours }) : null;

/** Raw material tab on the products list: the store at a glance, with a way to the full screen. */
function RawMaterialsTab() {
  const th = useTheme();
  const can = usePermission();
  const q = useQuery({ queryKey: [RAW_KEY, 'list', false], queryFn: () => ingredientsApi.list({}), enabled: can(P.BAKERY_INGREDIENTS_VIEW) });
  const list = (q.data ?? []).filter((i) => i.isActive !== false);
  if (!can(P.BAKERY_INGREDIENTS_VIEW)) return <EmptyState icon={Wheat} title={t('Raw material')} message={t('Is ke liye ijazat chahiye')} />;
  return (
    <View style={{ gap: th.space(2), padding: th.space(4) }}>
      <Button variant="secondary" icon={Wheat} onPress={() => router.push('/bakery/ingredients' as never)}>{t('Raw material kholein')}</Button>
      <Card flush>
        {list.length === 0 ? <Text tone="muted" style={{ padding: th.space(4) }}>{t('Abhi koi saamaan nahi')}</Text> : list.slice(0, 50).map((i: Ingredient, n) => {
          const low = Number(i.currentStock) <= Number(i.reorderLevel ?? i.minStock ?? 0);
          return <ListRow key={i.id} divider={n < Math.min(list.length, 50) - 1} leading={<Text size="lg">{rawCategoryOf(i.category).emoji}</Text>} title={i.name}
            trailing={<Text weight="bold" tone={low ? 'warning' : 'default'} ltr>{`${fmtQty(i.currentStock)} ${i.unit}`}</Text>} onPress={() => router.push('/bakery/ingredients' as never)} />;
        })}
      </Card>
    </View>
  );
}

interface DetailExtra { profile: BakeryProfile | null; fresh: FreshnessLog[]; ingredients: Ingredient[] }
const detailKind = (productType: unknown, p: BakeryProfile | null) =>
  productType === 'MADE' || productType === 'BOUGHT' ? productType : p?.isCustomizable || p?.isCakeCustomizable || p?.ingredients?.lines?.length ? 'MADE' : 'BOUGHT';
const recipeOf = (x?: DetailExtra) => recipeCost(x?.profile?.ingredients?.lines ?? [], Number(x?.profile?.ingredients?.yield) || 1, x?.ingredients ?? []);

registerInventoryIndustry({
  id: 'bakery',
  categoryKinds: BAKERY_KINDS,
  label: msg('Bakery'),
  list: {
    noun: 'cheezein',
    filters: ['kind', 'tags'],
    facetLabels: { kind: { made: msg('Khud banaya'), bought: msg('Khareed kar') } },
    extras: (item) => {
      const b = item.bakery;
      if (!b) return {};
      const life = shelfLife(b.shelfLifeDays, b.shelfLifeHours);
      return {
        badges: [...(b.fridge ? [{ label: t('Fridge'), tone: 'info' as const }] : []), ...(life ? [{ label: life, tone: 'neutral' as const }] : [])],
        chips: [b.kind === 'made' ? t('Khud banaya') : t('Khareed kar')],
      };
    },
    extraTab: { id: 'raw', label: msg('Raw material'), icon: Wheat, Component: RawMaterialsTab },
    actions: [
      { icon: Wheat, label: msg('Raw material'), href: '/bakery/ingredients', permission: P.BAKERY_INGREDIENTS_VIEW },
      { icon: ChefHat, label: msg('Baking'), href: '/bakery/production', permission: P.BAKERY_PRODUCTION_VIEW },
      { icon: CakeSlice, label: msg('Cake orders'), href: '/bakery/cake-orders', permission: P.BAKERY_ORDERS_VIEW },
    ],
    stockChips: (item) => (item.bakery?.kind === 'made' ? [1, 6, 12, 24, 50] : [1, 5, 10, 25]),
    guide: [
      { icon: Clock, title: msg('Shelf life'), text: msg('Jo cheez khud banti hai uske kitne din chalne ki had likhein — card par dikhti hai, purani cheez pehle bechein.') },
      { icon: Wheat, title: msg('Raw material'), text: msg('"Raw material" tab mein atta, cheeni, makhan ka stock — jo had se kam ho woh peela.') },
    ],
  },
  editor,
  detail: {
    extra: {
      key: 'bakery-product-detail-extra',
      load: async (id): Promise<DetailExtra> => {
        const [profile, fresh, ingredients] = await Promise.all([
          bakeryProductsApi.byProduct(id).catch(() => null),
          freshnessApi.list({ productId: id }).catch(() => [] as FreshnessLog[]),
          ingredientsApi.list({}).catch(() => [] as Ingredient[]),
        ]);
        return { profile: profile ?? null, fresh: Array.isArray(fresh) ? fresh : [], ingredients: Array.isArray(ingredients) ? ingredients : [] };
      },
    },
    badges: ({ product, extra }) => {
      const x = extra as DetailExtra | undefined;
      const kind = detailKind(product.productType, x?.profile ?? null);
      return [
        { label: kind === 'MADE' ? t('Khud banti hai') : t('Khareed kar'), tone: kind === 'MADE' ? 'warning' : 'neutral' },
        ...(x?.profile?.requiresRefrigeration ? [{ label: t('Fridge'), tone: 'info' as const }] : []),
        ...(x?.profile?.isSeasonalItem ? [{ label: String(x.profile.seasonName || t('Mausami')), tone: 'accent' as const }] : []),
      ];
    },
    facts: ({ extra, product, costHidden }) => {
      const p = (extra as DetailExtra | undefined)?.profile;
      if (!p) return [];
      const out: Array<[string, string]> = [];
      const life = shelfLife(p.shelfLifeDays, p.shelfLifeHours);
      if (life) out.push([t('Chalti hai'), life]);
      if (p.weightGrams) out.push([t('Wazan'), `${p.weightGrams} g`]);
      if (p.numberOfSlices) out.push([t('Slice'), String(p.numberOfSlices)]);
      for (const [k, field] of Object.entries(PRICE_FIELD)) {
        if (k !== product.unit && p[field]) out.push([t('Fi {{value}}', { value: t(UNIT_LABEL[k] ?? k) }), formatMoney(Number(p[field]))]);
      }
      const r = recipeOf(extra as DetailExtra);
      if (r.rows.length && !costHidden) out.push([t('Recipe se ek ki cost'), formatMoney(r.perUnit)]);
      return out;
    },
    tile: ({ extra }) => {
      const p = (extra as DetailExtra | undefined)?.profile;
      const life = shelfLife(p?.shelfLifeDays, p?.shelfLifeHours);
      return life ? { label: t('Freshness'), value: life, hint: p?.requiresRefrigeration ? t('fridge mein') : undefined } : null;
    },
    alerts: ({ extra, product, costHidden }) => {
      const x = extra as DetailExtra | undefined;
      const p = x?.profile ?? null;
      const kind = detailKind(product.productType, p);
      const r = recipeOf(x);
      const expired = (x?.fresh ?? []).filter((f) => f.currentQty > 0 && new Date(f.expiryDate ?? f.bestBefore).getTime() < Date.now());
      const notes: string[] = [];
      if (!product.costPrice) notes.push(t('Cost nahi likhi — profit ka hisaab ghalat hoga'));
      if (kind === 'MADE' && !p?.shelfLifeDays && !p?.shelfLifeHours) notes.push(t('Kitne din chalti hai, yeh nahi likha'));
      if (!costHidden && r.rows.length && product.costPrice && Math.abs(r.perUnit - product.costPrice) / product.costPrice > 0.05) {
        notes.push(t('Aaj ke rate se recipe ki cost {{perUnit}} hai, product par {{costPrice}} likhi hai', { perUnit: formatMoney(r.perUnit), costPrice: formatMoney(product.costPrice) }));
      }
      if (!notes.length && !expired.length) return null;
      return (
        <View style={{ gap: 8 }}>
          {expired.length > 0 && <Card tone="danger"><Text size="sm">{t('{{value}} {{unit}} purana maal shelf par hai — expire ho chuka. Hata dein ya sasta bechein.', { value: expired.reduce((s, f) => s + f.currentQty, 0), unit: product.unit })}</Text></Card>}
          {notes.map((n) => <Card key={n} tone="warning"><Text size="sm">{n}</Text></Card>)}
        </View>
      );
    },
    tabs: [
      {
        id: 'recipe', label: msg('Recipe'), icon: Wheat,
        when: ({ extra }) => !!(extra as DetailExtra | undefined)?.profile?.ingredients?.lines?.length,
        render: ({ extra, product, costHidden }) => {
          const r = recipeOf(extra as DetailExtra);
          return (
            <Card flush title={t('Ek dafa me {{yieldQty}} {{unit}}', { yieldQty: fmtQty(Number((extra as DetailExtra).profile?.ingredients?.yield) || 1), unit: product.unit })}
              description={r.canMake !== null ? t('Gudaam se {{canMake}} ban sakte{{value}}', { canMake: fmtQty(r.canMake), value: r.limiting ? t(' (pehle {{limiting}} khatam)', { limiting: r.limiting.name }) : '' }) : undefined}>
              {r.rows.map((l, i) => (
                <ListRow key={l.ingredientId} dense divider={i < r.rows.length - 1} title={l.name} subtitle={`${fmtQty(l.qty)} ${l.unit}${l.stock !== null ? ` · ${t('Gudaam')} ${fmtQty(l.stock)}` : ''}`}
                  trailing={costHidden ? undefined : <Amount value={l.cost} weight="semibold" />} />
              ))}
              {!costHidden && <ListRow dense title={t('Ek ki cost')} trailing={<Amount value={r.perUnit} weight="bold" />} />}
            </Card>
          );
        },
      },
      {
        id: 'fresh', label: msg('Freshness'), icon: Clock,
        when: ({ extra }) => ((extra as DetailExtra | undefined)?.fresh ?? []).length > 0,
        render: ({ extra }) => {
          const logs = liveBatches((extra as DetailExtra).fresh ?? []);
          const all = (extra as DetailExtra).fresh ?? [];
          return (
            <Card flush title={t('Har batch ka hisaab')}>
              {(logs.length ? logs : all.slice(0, 20).map((f) => ({ ...f, left: 0 }))).map((f, i, a) => (
                <ListRow key={f.id} dense divider={i < a.length - 1} icon={Clock} iconTone={f.left <= 0 ? 'danger' : f.left <= 12 ? 'warning' : 'success'}
                  title={`${f.batchNumber ? `#${f.batchNumber} · ` : ''}${fmtQty(f.currentQty)} / ${fmtQty(f.initialQty)}`}
                  subtitle={t('{{sold}} bika · {{wasted}} waste', { sold: fmtQty(f.soldQty), wasted: fmtQty(f.wastedQty) })}
                  trailing={<Badge tone={f.left <= 0 ? 'danger' : 'neutral'}>{formatDate(f.expiryDate ?? f.bestBefore)}</Badge>} />
              ))}
            </Card>
          );
        },
      },
    ],
    stockChips: [1, 6, 12, 24, 50],
  },
});

