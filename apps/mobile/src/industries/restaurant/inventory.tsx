/**
 * Restaurant items through the shared products list, editor and detail (web
 * RestaurantProductEditor, RestaurantProductDetail, RestaurantProductsListPage).
 * Three kinds of item: a dish made in the kitchen (menu details, sizes,
 * add-ons, recipe), a bought item sold as bought (cold drink) and raw
 * material (chicken, oil) used in recipes. The menu profile, add-ons and
 * recipe are saved after the product through the restaurant API; parts the
 * user may not change are skipped with a notice.
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { BookOpen, Boxes, ChefHat, CircleSlash, Clock, CupSoda, Plus, Power, Sparkles, Trash2, UtensilsCrossed, Wheat } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { convertQty, emptyRecipe, foodCostPct, recipeTotals, type RecipeDraft } from '@nafaa/core/restaurant';
import { apiErrorMessage } from '@/core/api/errors';
import { useAuthStore } from '@/core/auth/store';
import { formatPKR } from '@/core/format';
import { msg, t } from '@/core/i18n';
import { hasPermission, PERMISSIONS as P, usePermission, type PermissionKey } from '@/core/permissions';
import {
  Amount, Badge, Button, Card, Chip, DatePicker, EmptyState, FormSection, IconButton, Input, ListRow, Row, Switch, Text, TextArea, toast, useTheme,
} from '@/design';
import { NumberInput, Tiles } from '@/modules/inventory/components/fields';
import { registerInventoryIndustry } from '@/modules/inventory/industry/registry';
import type { CoreOptions, DetailContext, EditorConfig, StepContext } from '@/modules/inventory/industry/types';
import { basicStep, priceStep, stockStep } from '@/modules/inventory/screens/editor/coreSteps';
import type { EditorDraft, Errors, VariantDraft } from '@/modules/inventory/screens/editor/types';
import { menuItemsApi, type DietaryTag, type SpiceLevel } from './api';
import { boardApi, modifiersApi, recipesApi, type Cookability, type MenuItemFull, type RecipeRow } from './manage/api';
import { RecipeEditor, RecipeSteps, recipeFromApi, recipeInput, recipeProblemText } from './manage/components/RecipeEditor';
import { DAYS, DIET, MENU_KEYS, SPICE, daysLabel, dietLabel, fmt, foodTone, modifierTypeOf, offLabel, refreshMenu, spiceOf } from './manage/meta';
import { clock12, HHMM } from '@nafaa/core/restaurant';

type Kind = 'dish' | 'bought' | 'raw';

export interface RestaurantExtra {
  menuItemId: string | null;
  recipeId: string | null;
  onMenu: boolean;
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
const can = (p: PermissionKey) => { const u = useAuthStore.getState().user; return hasPermission(u?.role, u?.permissions, p); };

const UNITS = [
  { value: 'plate', label: msg('Plate') }, { value: 'pcs', label: msg('Adad (pcs)') }, { value: 'cup', label: msg('Cup') }, { value: 'glass', label: msg('Glass') },
  { value: 'bowl', label: msg('Bowl') }, { value: 'bottle', label: msg('Botal') }, { value: 'kg', label: msg('Kilo') }, { value: 'gram', label: msg('Gram') },
  { value: 'liter', label: msg('Litre') }, { value: 'ml', label: msg('ML') }, { value: 'dozen', label: msg('Darjan') }, { value: 'packet', label: msg('Packet') },
];
const SIZE_PRESETS = [[msg('Half'), msg('Full')], [msg('Quarter'), msg('Half'), msg('Full')], [msg('Small'), msg('Medium'), msg('Large')], [msg('Regular'), msg('Large')], [msg('Single'), msg('Double')]];
const PREP = [5, 10, 15, 20, 30, 45];

const toDate = (hhmm: string) => { const d = new Date(); const [h, m] = (hhmm || '12:00').split(':').map(Number); d.setHours(h, m, 0, 0); return d; };
const fromDate = (d: Date) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

/* ───────────── editor steps ───────────── */

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
    ['dish', ChefHat, msg('Kitchen me banti hai'), msg('Biryani, karahi, burger, chai — recipe, size aur add-ons ke saath')],
    ['bought', CupSoda, msg('Bani banai bikti hai'), msg('Cold drink, paani, chips — stock gin kar')],
    ['raw', Wheat, msg('Raw material'), msg('Chicken, chawal, oil — menu par nahi, recipe me lagta hai')],
  ];
  return (
    <>
      <Text size="sm" weight="semibold" tone="secondary">{t('Yeh cheez')}</Text>
      {tiles.map(([k, icon, title, hint]) => (
        <ListRow key={k} icon={icon} iconTone={kind === k ? 'brand' : 'neutral'} title={t(title)} subtitle={t(hint)} selected={kind === k} onPress={() => pick(k)} />
      ))}
      {ctx.isEdit && kind === 'raw' && ctx.draft.extra.menuItemId && <Text size="xs" tone="warning">{t('Raw material banane par yeh menu se hat jayegi — purane bill waise hi rahenge.')}</Text>}
    </>
  );
}

function MenuStepBody({ ctx }: { ctx: StepContext<RestaurantExtra> }) {
  const th = useTheme();
  const x = ctx.draft.extra;
  const set = ctx.setExtra;
  const dish = kindOf(ctx.draft) === 'dish';
  return (
    <>
      <FormSection title={t('Menu par')} description={t('Counter aur online menu par kab aur kaise dikhe')}>
        <Switch value={x.onMenu} onChange={(onMenu) => set({ onMenu, available: onMenu ? x.available : false })} label={t('Menu par hai')} description={t('Band ho to restaurant counter par nahi aati')} />
        <Switch value={x.onMenu && x.available} onChange={(available) => set({ available, onMenu: available ? true : x.onMenu })} label={t('Aaj mil rahi hai')}
          description={t('Khatam ho jaye to band karein (kitchen ki zubaan me 86) — kal subah dobara chalu')} />
        {!x.onMenu && <Text size="xs" tone="warning">{t('Menu par nahi hogi — sirf retail POS ya products list se bik sakti hai.')}</Text>}
      </FormSection>
      {dish && (
        <FormSection title={t('Kitchen')} description={t('Order screen aur KOT par dikhta hai')}>
          <NumberInput integer label={t('Banne me kitne minute')} value={x.prepTimeMinutes} onChangeValue={(prepTimeMinutes) => set({ prepTimeMinutes })} error={ctx.errors.prep} hint={t('Waiter grahak ko isi hisaab se waqt batata hai')} />
          <Row gap={1.5} wrap>{PREP.map((m) => <Chip key={m} label={t('{{m}} min', { m })} selected={x.prepTimeMinutes === m} onPress={() => set({ prepTimeMinutes: m })} />)}</Row>
          <Text size="sm" weight="semibold" tone="secondary">{t('Teekhapan')}</Text>
          <Tiles value={x.spiceLevel} onChange={(spiceLevel) => set({ spiceLevel })} columns={3} options={SPICE.map((s) => ({ value: s.value, label: `${s.chillies} ${t(s.label)}`.trim() }))} />
          <TextArea label={t('Cook ke liye hidayat')} value={x.cookingInstructions} onChangeText={(v) => set({ cookingInstructions: v.slice(0, 2000) })} placeholder={t('Maslan: tikka 8 minute grill, upar se makhan')} hint={t('Marzi hai — KOT par chhapti hai')} />
        </FormSection>
      )}
      <FormSection title={t('Grahak ke liye')} description={t('Menu card, QR menu aur online store par')}>
        <Row gap={1.5} wrap>
          <Chip label={t('Chef special')} selected={x.chefSpecial} onPress={() => set({ chefSpecial: !x.chefSpecial })} />
          <Chip label={t('Best seller')} selected={x.bestSeller} onPress={() => set({ bestSeller: !x.bestSeller })} />
        </Row>
        <Text size="sm" weight="semibold" tone="secondary">{t('Kya hai is me')}</Text>
        <Row gap={1.5} wrap>{DIET.map((d) => <Chip key={d.value} label={t(d.label)} selected={x.dietaryTags.includes(d.value)} onPress={() => set({ dietaryTags: toggle(x.dietaryTags, d.value) })} />)}</Row>
        {ctx.errors.diet && <Text size="sm" tone="danger">{ctx.errors.diet}</Text>}
        <Input label={t('Chhoti line')} value={x.tagLine} onChangeText={(v) => set({ tagLine: v.slice(0, 60) })} placeholder={t('Ghar jaisa zaiqa')} hint={t('Card par naam ke neeche')} />
        <Row gap={2}>
          <Input containerStyle={{ flex: 1 }} label={t('Kitna hota hai')} value={x.servingSize} onChangeText={(v) => set({ servingSize: v.slice(0, 60) })} placeholder={t('1 plate, 500 ml, 6 pcs')} />
          <NumberInput integer containerStyle={{ flex: 1 }} label={t('Kitne logon ke liye')} value={x.servesPeople} onChangeValue={(servesPeople) => set({ servesPeople })} error={ctx.errors.serves} />
        </Row>
        <Row gap={2}>
          <NumberInput integer containerStyle={{ flex: 1 }} label={t('Calories')} value={x.calories} onChangeValue={(calories) => set({ calories })} hint={t('Marzi hai')} />
          <Input containerStyle={{ flex: 1 }} label={t('Allergy')} value={x.allergenInfo} onChangeText={(v) => set({ allergenInfo: v.slice(0, 500) })} placeholder={t('Nuts, doodh, anda')} hint={t('Marzi hai')} />
        </Row>
      </FormSection>
      <FormSection title={t('Kab milti hai')} description={t('Nashta subah, BBQ sirf raat — is waqt ke bahar counter par nahi aati')}>
        <Switch value={x.limitHours} onChange={(limitHours) => set({ limitHours })} label={t('Sirf kuch waqt / din')} description={x.limitHours ? t('Shop ke waqt (PKT) ke hisaab se') : t('Band ho to jab tak menu par hai, har waqt')} />
        {x.limitHours && (
          <View style={{ gap: th.space(3) }}>
            <Row gap={2}>
              <View style={{ flex: 1 }}><DatePicker mode="time" label={t('Kis waqt se')} value={x.availableFrom ? toDate(x.availableFrom) : null} onChange={(d) => set({ availableFrom: fromDate(d) })} error={ctx.errors.from} hint={x.availableFrom ? clock12(x.availableFrom) : t('Khali = koi had nahi')} /></View>
              <View style={{ flex: 1 }}><DatePicker mode="time" label={t('Kab tak')} value={x.availableTo ? toDate(x.availableTo) : null} onChange={(d) => set({ availableTo: fromDate(d) })} error={ctx.errors.to}
                hint={x.availableFrom && x.availableTo && x.availableTo < x.availableFrom ? t('Raat 12 ke baad tak chalega') : x.availableTo ? clock12(x.availableTo) : t('Khali = koi had nahi')} /></View>
            </Row>
            <Text size="sm" weight="semibold" tone="secondary">{t('Din (khali = roz)')}</Text>
            <Row gap={1.5} wrap>{DAYS.map((d, i) => <Chip key={d} label={t(d)} selected={x.availableDays.includes(i)} onPress={() => set({ availableDays: toggle(x.availableDays, i).sort() })} />)}</Row>
          </View>
        )}
      </FormSection>
    </>
  );
}

function SizesAndAddOns({ ctx }: { ctx: StepContext<RestaurantExtra> }) {
  const th = useTheme();
  const c = ctx.draft.core;
  const x = ctx.draft.extra;
  const bought = kindOf(ctx.draft) === 'bought';
  const groups = useQuery({ queryKey: [MENU_KEYS.modifiers], queryFn: () => modifiersApi.list(), staleTime: 60_000 });
  const setVariants = (variants: VariantDraft[]) => ctx.setCore({ variants });
  const has = (n: string) => c.variants.some((v) => v.name.toLowerCase() === n.toLowerCase());
  const add = (names: string[]) => setVariants([...c.variants, ...names.filter((n) => n.trim() && !has(n)).map((name) => ({ name: name.trim(), sku: '', barcode: '', colorHex: '', price: null, costPrice: null, stock: 0, isActive: true }))]);
  const patch = (i: number, p: Partial<VariantDraft>) => setVariants(c.variants.map((v, j) => (j === i ? { ...v, ...p } : v)));
  const live = (groups.data ?? []).filter((g) => g.isActive || x.modifierGroupIds.includes(g.id));
  return (
    <>
      <FormSection title={t('Size')} description={t('Half / Full, Chhota / Bara — har size ka apna rate. Ek hi size ho to khali chhorein.')}>
        <Row gap={1.5} wrap>{SIZE_PRESETS.map((set) => <Chip key={set.join()} icon={Plus} label={set.map((s) => t(s)).join(' / ')} onPress={() => add(set.map((s) => t(s)))} />)}</Row>
        {c.variants.map((v, i) => (
          <Card key={v.id ?? `new-${i}`} style={{ opacity: v.isActive ? 1 : 0.7 }}>
            <View style={{ gap: th.space(2) }}>
              <Row gap={2}>
                <Input size="md" containerStyle={{ flex: 1 }} label={t('Size')} value={v.name} onChangeText={(name) => patch(i, { name })} />
                {v.id
                  ? <Chip label={v.isActive ? t('Chalu') : t('Band')} selected={v.isActive} onPress={() => patch(i, { isActive: !v.isActive })} />
                  : <IconButton icon={Trash2} label={t('Hatayein')} variant="danger" size="sm" onPress={() => setVariants(c.variants.filter((_, j) => j !== i))} />}
              </Row>
              <Row gap={2}>
                <NumberInput size="md" containerStyle={{ flex: 1 }} label={t('Rate')} prefix="Rs" value={v.price} onChangeValue={(price) => patch(i, { price })} placeholder={String(c.price || 0)} />
                <NumberInput size="md" containerStyle={{ flex: 1 }} label={t('Cost (marzi)')} prefix="Rs" value={v.costPrice} onChangeValue={(costPrice) => patch(i, { costPrice })} placeholder={String(c.costPrice || 0)} />
                {bought && !v.id && <NumberInput size="md" containerStyle={{ flex: 1 }} label={t('Stock')} value={v.stock} onChangeValue={(stock) => patch(i, { stock: stock ?? 0 })} />}
              </Row>
            </View>
          </Card>
        ))}
        {ctx.errors.variants && <Text size="sm" tone="danger">{ctx.errors.variants}</Text>}
        {c.variants.length > 0 && kindOf(ctx.draft) === 'dish' && <Text size="xs" tone="muted">{t('Rate khali = dish ka rate ({{price}}). Har size me recipe ka kitna hissa lagta hai (Half = 0.5) woh Recipe step me likhein — phir har size ka saamaan aur cost recipe se banti hai, upar likhi cost ki zaroorat nahi.', { price: formatPKR(c.price) })}</Text>}
      </FormSection>
      <FormSection title={t('Add-ons')} description={t('Order lete waqt yeh options poochay jayenge — extra cheese, raita, bagair pyaaz')}>
        {groups.isLoading ? <Text size="sm" tone="muted">{t('Aa rahe hain…')}</Text> : groups.isError ? (
          <Text size="sm" tone="warning">{t('Add-ons dekhne ki permission nahi (Menu dekhna).')}</Text>
        ) : !live.length ? (
          <Text size="sm" tone="muted">{t('Abhi koi add-on group nahi.')}</Text>
        ) : live.map((g) => (
          <ListRow key={g.id} dense selected={x.modifierGroupIds.includes(g.id)} onPress={() => ctx.setExtra({ modifierGroupIds: toggle(x.modifierGroupIds, g.id) })}
            title={`${g.name} · ${t(modifierTypeOf(g.type).label)}${g.isRequired ? t(' · zaroori') : ''}`}
            subtitle={(g.options.filter((o) => o.isActive !== false).slice(0, 4).map((o) => `${o.name}${o.priceAdjustment ? ` ${o.priceAdjustment > 0 ? '+' : ''}${o.priceAdjustment}` : ''}`).join(', ') || t('Grahak ka note')) + (!g.isActive ? ` · ${t('Group band hai')}` : '')} />
        ))}
        <Button size="sm" variant="link" onPress={() => router.push('/restaurant/modifiers' as never)}>{t('Add-on groups →')}</Button>
      </FormSection>
    </>
  );
}

function RecipeStepBody({ ctx }: { ctx: StepContext<RestaurantExtra> }) {
  const x = ctx.draft.extra;
  const per = recipeTotals(x.recipe).perPlate;
  const kitchen = can(P.RESTAURANT_KITCHEN_MANAGE);
  return (
    <>
      <FormSection title={t('"{{value}}" me kya lagta hai', { value: ctx.draft.core.name || t('Is dish') })} description={t('Dish bikne par yahi saamaan stock se nikalta hai aur isi se plate ki cost aur profit banta hai')}>
        {!kitchen && <Card tone="warning"><Text size="sm">{t('Recipe save karne ke liye "Kitchen sambhalna" ki permission chahiye — aap dekh sakte hain, badal nahi sakte.')}</Text></Card>}
        <RecipeEditor value={x.recipe} onChange={(recipe) => ctx.setExtra({ recipe })} price={ctx.draft.core.price} dishProductId={ctx.productId}
          sizes={ctx.draft.core.variants.filter((v) => v.isActive && v.name.trim()).map((v) => ({ name: v.name.trim(), price: v.price ?? ctx.draft.core.price }))} />
        {ctx.errors.recipe && <Text size="sm" tone="danger">{ctx.errors.recipe}</Text>}
      </FormSection>
      {x.recipe.lines.length > 0 && (
        <FormSection title={t('Banane ka tareeqa')} description={t('Marzi hai — naye cook ke liye')}>
          <RecipeSteps value={x.recipe} onChange={(recipe) => ctx.setExtra({ recipe })} />
        </FormSection>
      )}
      {per > 0 && Math.abs(per - ctx.draft.core.costPrice) > 0.5 && (
        <Card tone="muted"><Text size="sm">{t('Save karne par dish ki cost {{per}} ho jayegi (abhi {{costPrice}}). Raw material ka rate badle to "Recipes → Rates taaza karein" se sab dishes ki cost update hoti hai.', { per: formatPKR(per), costPrice: formatPKR(ctx.draft.core.costPrice) })}</Text></Card>
      )}
    </>
  );
}

/* ───────────── editor config ───────────── */

const core: CoreOptions = { units: UNITS, skuPrefix: 'MENU', packs: true, variants: false, markups: [100, 150, 200, 250] };
const basic = basicStep<RestaurantExtra>(core, { extra: (ctx) => <KindTiles ctx={ctx} />, namePlaceholder: t('Jaise: Chicken Karahi') });
const price = priceStep<RestaurantExtra>(core, { allowZeroPrice: true });
const stock = stockStep<RestaurantExtra>(core, { quick: [1, 5, 10, 24, 50] });

const editor: EditorConfig<RestaurantExtra> = {
  core,
  extra: {
    initial,
    load: async (productId) => {
      const m = await boardApi.byProduct(productId).catch(() => null);
      if (!m) return { onMenu: false, available: false, menuItemId: null };
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
      return { ...payload, isRawMaterial: kind === 'raw', productType: kind === 'raw' ? null : kind === 'dish' ? 'MADE' : 'BOUGHT', ...(per > 0 && { costPrice: per }) };
    },
    save: async (productId, d) => {
      const x = d.extra;
      const kind = kindOf(d);
      const menu = can(P.RESTAURANT_MENU_MANAGE);
      const kitchen = can(P.RESTAURANT_KITCHEN_MANAGE);
      if (kind === 'raw') {
        if (x.menuItemId && menu) await menuItemsApi.setAvailable(x.menuItemId, false);
        return;
      }
      if (!x.onMenu && !x.menuItemId) return;
      if (!menu) { toast.warning(t('Product save ho gaya — menu ki details ke liye "Menu sambhalna" ki permission chahiye')); return; }
      const spicy = x.spiceLevel !== 'NONE';
      const m = await menuItemsApi.upsert({
        productId, prepTimeMinutes: x.prepTimeMinutes ?? undefined, cookingInstructions: x.cookingInstructions.trim(),
        chefSpecial: x.chefSpecial, bestSeller: x.bestSeller, isSpicy: spicy, spiceLevel: spicy ? x.spiceLevel : undefined,
        calories: x.calories ?? undefined, servingSize: x.servingSize.trim(), servesPeople: x.servesPeople ?? undefined,
        dietaryTags: x.dietaryTags, allergenInfo: x.allergenInfo.trim(), tagLine: x.tagLine.trim(), isAvailable: x.onMenu && x.available,
        availableFrom: x.limitHours ? x.availableFrom : '', availableTo: x.limitHours ? x.availableTo : '', availableDays: x.limitHours ? x.availableDays : [],
      });
      await menuItemsApi.attachModifiers(m.id, x.modifierGroupIds);
      refreshMenu(MENU_KEYS.board, MENU_KEYS.items, MENU_KEYS.recipes, MENU_KEYS.cook, MENU_KEYS.modifiers);
      if (kind !== 'dish') return;
      if (!kitchen) { if (x.recipe.lines.length) toast.warning(t('Recipe save nahi hui — "Kitchen sambhalna" ki permission chahiye')); return; }
      if (x.recipe.lines.length) {
        // Size factors need the saved sizes' ids, which new sizes only have now.
        const sizes = (await boardApi.getOne(m.id)).product?.variants ?? [];
        await recipesApi.upsert(recipeInput(m.id, x.recipe, sizes.map((v) => ({ id: v.id, name: v.name }))));
      } else if (x.recipeId) await recipesApi.remove(x.recipeId);
    },
  },
  steps: [
    {
      ...basic,
      validate: (d, isEdit) => {
        const e: Errors = { ...(basic.validate?.(d, isEdit) ?? {}) };
        if (kindOf(d) === 'raw' && ['plate', 'cup', 'glass', 'bowl'].includes(d.core.unit)) e.unit = t('Raw material ka stock kilo, gram, litre ya adad me rakhein');
        return e;
      },
    },
    {
      ...price,
      validate: (d, isEdit) => {
        const e: Errors = { ...(price.validate?.(d, isEdit) ?? {}) };
        if (kindOf(d) !== 'raw' && !(d.core.price > 0)) e.price = t('Menu ka rate likhein');
        return e;
      },
    },
    {
      id: 'menu', title: msg('Menu'), icon: UtensilsCrossed, when: (d) => kindOf(d) !== 'raw', render: (ctx) => <MenuStepBody ctx={ctx} />,
      validate: (d): Errors => {
        // The draft's extra can still be empty on the first render of a new item.
        const x = { ...initial, ...d.extra };
        const e: Errors = {};
        if (x.prepTimeMinutes != null && (x.prepTimeMinutes < 0 || x.prepTimeMinutes > 600)) e.prep = t('0 se 600 minute ke beech');
        if (x.servesPeople != null && (x.servesPeople < 1 || x.servesPeople > 100)) e.serves = t('1 se 100 ke beech');
        if (x.dietaryTags.includes('VEGAN') && (x.dietaryTags.includes('CONTAINS_EGG') || x.dietaryTags.some((v) => ['CHICKEN', 'BEEF', 'MUTTON', 'CONTAINS_SEAFOOD'].includes(v)))) e.diet = t('Vegan me gosht ya anda nahi ho sakta');
        else if (x.dietaryTags.includes('VEGETARIAN') && x.dietaryTags.some((v) => ['CHICKEN', 'BEEF', 'MUTTON', 'CONTAINS_SEAFOOD'].includes(v))) e.diet = t('Veg me gosht nahi ho sakta');
        if (x.limitHours) {
          if (x.availableFrom && !HHMM.test(x.availableFrom)) e.from = t('Waqt sahi nahi');
          if (x.availableTo && !HHMM.test(x.availableTo)) e.to = t('Waqt sahi nahi');
          if (x.availableFrom && x.availableFrom === x.availableTo) e.to = t('Shuru aur khatam ek jaisa nahi ho sakta');
          if (!x.availableFrom && !x.availableTo && !x.availableDays.length) e.from = t('Waqt ya din chunein, ya yeh band karein');
        }
        return e;
      },
    },
    {
      id: 'sizes', title: msg('Size / Add-ons'), icon: Boxes, when: (d) => kindOf(d) !== 'raw', render: (ctx) => <SizesAndAddOns ctx={ctx} />,
      validate: (d): Errors => {
        const names = d.core.variants.map((v) => v.name.trim().toLowerCase());
        if (names.some((n) => !n)) return { variants: t('Har size ka naam likhein') };
        if (new Set(names).size !== names.length) return { variants: t('Do size ka naam ek jaisa hai') };
        if (d.core.variants.some((v) => v.price !== null && !(v.price > 0))) return { variants: t('Size ka rate 0 se zyada likhein, ya khali chhorein') };
        return {};
      },
    },
    {
      id: 'recipe', title: msg('Recipe'), icon: Wheat, when: (d) => kindOf(d) === 'dish', render: (ctx) => <RecipeStepBody ctx={ctx} />,
      validate: (d): Errors => { const p = recipeProblemText(d.extra.recipe); return p ? { recipe: p } : {}; },
    },
    { ...stock, when: (d) => kindOf(d) !== 'dish' },
  ],
  summary: (d) => {
    const kind = kindOf(d);
    const x = d.extra;
    const per = recipeTotals(x.recipe).perPlate;
    const pct = foodCostPct(per, d.core.price);
    const out: Array<[string, string]> = [[t('Yeh cheez'), kind === 'dish' ? t('Kitchen me banti hai') : kind === 'bought' ? t('Bani banai bikti hai') : t('Raw material')]];
    if (kind !== 'raw') out.push([t('Menu'), !x.onMenu ? t('Menu par nahi') : x.available ? t('Menu par · aaj mil rahi hai') : t('Menu par · aaj band (86)')]);
    if (kind !== 'raw' && x.limitHours && x.availableFrom) out.push([t('Kab milti hai'), `${clock12(x.availableFrom)} – ${clock12(x.availableTo) || t('band hone tak')}`]);
    if (d.core.variants.length) out.push([t('Size'), t('{{count}} size', { count: d.core.variants.length })]);
    if (x.modifierGroupIds.length) out.push([t('Add-ons'), `${x.modifierGroupIds.length} add-on group`]);
    if (kind === 'dish') out.push([t('Recipe'), x.recipe.lines.length ? t('Recipe: {{count}} cheezein · plate {{per}}{{value}}', { count: x.recipe.lines.length, per: formatPKR(per), value: pct !== null && per > 0 ? t(' · {{value}}% food cost', { value: pct.toFixed(0) }) : '' }) : t('Recipe nahi — stock nahi katega')]);
    return out;
  },
};

/* ───────────── list ───────────── */

/** Menu tab on the products list: the board's numbers and the way to the full menu screen. */
function MenuTab() {
  const th = useTheme();
  const q = useQuery({ queryKey: [MENU_KEYS.board, 'tab'], queryFn: () => boardApi.board({ state: 'all', page: 1, limit: 1 }) });
  const st = q.data?.stats;
  return (
    <View style={{ gap: th.space(2), padding: th.space(4) }}>
      <Button icon={UtensilsCrossed} onPress={() => router.push('/restaurant/menu' as never)}>{t('Menu kholein')}</Button>
      {st && (
        <Card flush>
          <ListRow dense icon={Power} iconTone="success" title={t('Menu par mil rahi')} trailing={<Text weight="bold" ltr>{`${st.live} / ${st.dishes}`}</Text>} onPress={() => router.push('/restaurant/menu' as never)} />
          <ListRow dense icon={CircleSlash} iconTone="danger" title={t('Menu par, ban nahi sakti')} trailing={<Text weight="bold">{st.liveButCantMake.length}</Text>} onPress={() => router.push('/restaurant/menu' as never)} />
          <ListRow dense icon={Wheat} iconTone="warning" title={t('Raw material kam')} trailing={<Text weight="bold">{st.rawLow}</Text>} onPress={() => router.push('/restaurant/menu' as never)} />
        </Card>
      )}
    </View>
  );
}

/* ───────────── detail ───────────── */

interface DetailExtra { menu: MenuItemFull | null; cook: Cookability | null; usedIn: RecipeRow[] }
type Ctx = DetailContext<DetailExtra>;
const isRaw = (c: Ctx) => !!c.product.isRawMaterial;
const isDish = (c: Ctx) => !isRaw(c) && (c.product.productType !== 'BOUGHT' || !!c.extra?.menu?.recipe);

function hoursText(m: MenuItemFull) {
  const days = m.availableDays?.length === 7 ? [] : m.availableDays ?? [];
  if (!m.availableFrom && !m.availableTo && !days.length) return t('Jab tak menu par hai, har waqt');
  const time = m.availableFrom || m.availableTo ? `${clock12(m.availableFrom) || t('shuru se')} – ${clock12(m.availableTo) || t('band hone tak')}` : t('Poora din');
  return `${time} · ${daysLabel(days)}`;
}

function MenuTabDetail({ ctx }: { ctx: Ctx }) {
  const th = useTheme();
  const qc = useQueryClient();
  const canManage = usePermission()(P.RESTAURANT_MENU_MANAGE);
  const [busy, setBusy] = useState(false);
  const [choosing, setChoosing] = useState(false);
  const m = ctx.extra?.menu;
  const run = async (fn: () => Promise<unknown>, ok: string) => {
    setBusy(true);
    try { await fn(); toast.success(ok); void qc.invalidateQueries({ queryKey: [MENU_KEYS.extra] }); refreshMenu(MENU_KEYS.board, MENU_KEYS.items); ctx.refresh(); }
    catch (e) { toast.error(apiErrorMessage(e, t('Nahi hua'))); }
    finally { setBusy(false); }
  };
  if (!m) {
    return <EmptyState icon={UtensilsCrossed} title={t('Menu par nahi')} message={t('Restaurant counter par sirf woh cheez aati hai jo menu par ho. Cold drink, paani jaisi cheezein bhi menu par daal dein.')}
      action={canManage ? <Button icon={Plus} loading={busy} onPress={() => void run(() => menuItemsApi.addToMenu([ctx.product.id]), t('Menu par aa gayi'))}>{t('Menu par daalein')}</Button> : undefined} />;
  }
  const spice = m.isSpicy ? spiceOf(m.spiceLevel) : null;
  const onNow = m.isAvailable && !m.offHere;
  const groups = [...(m.modifiers ?? [])].sort((a, b) => a.displayOrder - b.displayOrder);
  const inHours = (h: number) => new Date(Date.now() + h * 3_600_000).toISOString();
  return (
    <View style={{ gap: th.space(3) }}>
      <Card tone={onNow ? 'success' : 'danger'} title={onNow ? t('Mil rahi hai') : m.offHere ? offLabel(m.offUntil) : t('Menu se band hai')}
        description={onNow ? t('Counter par dikh rahi hai') : m.offHere ? (m.offUntil ? t('Is branch me khatam — waqt poora hote hi khud chalu ho jayegi') : t('Is branch me khatam — jab tak chalu na karein')) : t('Har branch me band — counter par nahi aati')}
        action={canManage ? (onNow
          ? <Button size="sm" variant="critical" loading={busy} onPress={() => setChoosing((v) => !v)}>{t('Khatam (86)')}</Button>
          : <Button size="sm" variant="success" loading={busy} onPress={() => void run(() => (m.offHere ? menuItemsApi.setBranch([m.id], true) : menuItemsApi.setAvailable(m.id, true)), t('Chalu kar di'))}>{t('Chalu karein')}</Button>) : undefined}>
        {canManage && onNow && choosing && (
          <View style={{ gap: th.space(2) }}>
            <Text size="sm" weight="semibold">{t('Kab tak band rahe?')}</Text>
            <Row gap={1.5} wrap>
              {([[msg('Aaj din khatam tak'), undefined], [msg('1 ghanta'), 1], [msg('2 ghante'), 2], [msg('Jab tak chalu na karein'), null]] as Array<[string, number | null | undefined]>).map(([label, h]) => (
                <Button key={label} size="sm" variant={h === undefined ? 'critical' : 'secondary'} disabled={busy}
                  onPress={() => { setChoosing(false); void run(() => menuItemsApi.setBranch([m.id], false, h === undefined ? undefined : h === null ? null : inHours(h)), t('Band (86) — {{value}}', { value: t(label).toLowerCase() })); }}>{t(label)}</Button>
              ))}
            </Row>
            <Button size="sm" variant="link" onPress={() => { setChoosing(false); void run(() => menuItemsApi.setAvailable(m.id, false), t('Menu se band — har branch me')); }}>{t('Menu se hi band karein (har branch, khud chalu nahi hogi)')}</Button>
          </View>
        )}
      </Card>
      <Card flush>
        <ListRow dense title={t('Kab milti hai')} subtitle={hoursText(m)} />
        <ListRow dense title={t('Banne me')} trailing={<Text size="sm">{m.prepTimeMinutes ? t('{{prepTimeMinutes}} min', { prepTimeMinutes: m.prepTimeMinutes }) : '—'}</Text>} />
        <ListRow dense title={t('Teekhapan')} trailing={<Text size="sm">{spice ? `${spice.chillies} ${t(spice.label)}` : t('Teekha nahi')}</Text>} />
        <ListRow dense title={t('Kitna')} trailing={<Text size="sm">{`${m.servingSize || '—'}${m.servesPeople ? t(' · {{servesPeople}} log', { servesPeople: m.servesPeople }) : ''}`}</Text>} />
      </Card>
      {m.cookingInstructions && <Card tone="muted"><Text size="sm"><Text size="sm" weight="semibold">{t('Cook ke liye:')} </Text>{m.cookingInstructions}</Text></Card>}
      {!!m.dietaryTags?.length && <Row gap={1.5} wrap>{m.dietaryTags.map((d) => <Badge key={d} tone="neutral">{dietLabel(d)}</Badge>)}</Row>}
      <Card title={t('Add-ons')} action={<Button size="sm" variant="link" onPress={() => router.push('/restaurant/modifiers' as never)}>{t('Groups →')}</Button>}>
        {!groups.length ? <Text size="sm" tone="muted">{t('Koi add-on nahi. Edit me "Size / Add-ons" step se lagayein.')}</Text> : (
          <View style={{ gap: th.space(2) }}>
            {groups.map((g) => {
              const grp = g.modifierGroup;
              const opts = (grp?.options ?? []).filter((o) => o.isActive !== false);
              return (
                <View key={g.modifierGroupId}>
                  <Text size="sm" weight="semibold">{grp?.name ?? t('Group')} <Text size="sm" tone="muted">{`· ${t(modifierTypeOf(grp?.type ?? 'ADDON').label)}${grp?.isRequired ? t(' · zaroori') : ''}`}</Text></Text>
                  <Text size="xs" tone="secondary">{opts.map((o) => `${o.name}${Number(o.priceAdjustment) ? ` (${Number(o.priceAdjustment) > 0 ? '+' : ''}${o.priceAdjustment})` : ''}`).join(', ')}</Text>
                </View>
              );
            })}
          </View>
        )}
      </Card>
    </View>
  );
}

function RecipeTabDetail({ ctx }: { ctx: Ctx }) {
  const th = useTheme();
  const r = ctx.extra?.menu?.recipe;
  const cook = ctx.extra?.cook;
  if (!r) {
    return <EmptyState icon={Wheat} title={t('Recipe nahi bani')} message={t('Recipe ke bagair dish bikne par raw material stock se nahi katta aur profit report me cost andaze se lagti hai.')}
      action={<Button icon={Plus} onPress={() => router.push(`/products/${ctx.product.id}/edit` as never)}>{t('Recipe banayein')}</Button>} />;
  }
  const portions = Number(r.yieldQuantity) || 1;
  let plate = 0;
  const rows = [...(r.ingredients ?? [])].sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0)).map((l) => {
    const unit = l.ingredient?.unit ?? l.unit;
    const rate = Number(l.ingredient?.costPrice) || Number(l.costPerUnit) || 0;
    const waste = Number(l.wastagePercent) || 0;
    const per = convertQty((Number(l.quantity) || 0) * (1 + waste / 100), l.unit, unit) / portions;
    const cost = per * rate;
    if (!l.isOptional) plate += cost;
    return { id: l.id ?? l.ingredientProductId, name: l.ingredient?.name ?? t('Saamaan'), qty: Number(l.quantity), unit: l.unit, stockUnit: unit, per, cost, waste, optional: !!l.isOptional, notes: l.notes };
  });
  const pct = foodCostPct(plate, Number(ctx.product.price) || 0);
  return (
    <View style={{ gap: th.space(3) }}>
      <Card flush title={t('Recipe · {{portions}} plate ka saamaan', { portions: fmt(portions) })} action={<Button size="sm" variant="link" onPress={() => router.push(`/products/${ctx.product.id}/edit` as never)}>{t('Badlein →')}</Button>}>
        {rows.map((x, i) => (
          <ListRow key={x.id} dense divider={i < rows.length - 1} title={`${x.name}${x.optional ? ` ${t('(marzi ka)')}` : ''}`}
            subtitle={`${fmt(x.qty)} ${x.unit}${x.waste > 0 ? ` ${t('+{{waste}}% wastage', { waste: fmt(x.waste) })}` : ''} · ${t('Ek plate')} ${fmt(x.per)} ${x.stockUnit}${x.notes ? ` · ${x.notes}` : ''}`}
            trailing={x.optional || ctx.costHidden ? undefined : <Amount value={x.cost} />} />
        ))}
        <ListRow dense title={t('Ek plate ki cost')} trailing={<Row gap={1.5}>{pct !== null && !ctx.costHidden && <Badge tone={foodTone(pct)}>{`${pct.toFixed(0)}%`}</Badge>}{ctx.costHidden ? <Text>••••</Text> : <Amount value={plate} weight="bold" />}</Row>} />
      </Card>
      {cook && (
        <ListRow icon={ChefHat} iconTone={cook.canMake === 0 ? 'danger' : 'neutral'}
          title={cook.canMake === null ? t('Sab saamaan marzi ka hai') : cook.canMake === 0 ? t('Ab nahi ban sakti — {{value}} khatam', { value: cook.blocker?.name ?? t('saamaan') }) : t('Is branch ke stock se {{canMake}} plate aur ban sakti hain', { canMake: cook.canMake })}
          subtitle={cook.blocker && cook.canMake !== null && cook.canMake > 0 ? t('· pehle {{name}} khatam hoga', { name: cook.blocker.name }) : undefined} />
      )}
      {!!r.preparationSteps && <Card title={t('Banane ka tareeqa')}><Text size="sm">{r.preparationSteps}</Text></Card>}
    </View>
  );
}

function UsedInTab({ ctx }: { ctx: Ctx }) {
  const rows = ctx.extra?.usedIn ?? [];
  const id = ctx.product.id;
  if (!rows.length) return <EmptyState icon={BookOpen} title={t('Kisi recipe me nahi laga. Dish ki recipe me yeh saamaan daalein taake bikne par stock kate.')} />;
  return (
    <Card flush title={t('{{count}} dish me lagta hai', { count: rows.length })}>
      {rows.map((r, i) => {
        const line = r.ingredients.find((x) => x.ingredientProductId === id);
        const per = line ? convertQty((Number(line.quantity) || 0) * (1 + (Number(line.wastagePercent) || 0) / 100), line.unit, ctx.product.unit) / (Number(r.yieldQuantity) || 1) : 0;
        return <ListRow key={r.id} dense divider={i < rows.length - 1} title={r.menuItem.product.name} trailing={<Text size="sm" tone="secondary" ltr>{t('{{per}} {{unit}} fi plate', { per: fmt(per), unit: ctx.product.unit })}</Text>}
          chevron onPress={() => router.push(`/products/${r.menuItem.productId}` as never)} />;
      })}
    </Card>
  );
}

registerInventoryIndustry({
  id: 'restaurant',
  label: msg('Restaurant'),
  list: {
    filters: ['tags'],
    extras: (item) => (item.productType === 'BOUGHT' ? { chips: [t('Bani banai')] } : {}),
    extraTab: { id: 'menu', label: msg('Menu'), icon: ChefHat, Component: MenuTab },
    actions: [
      { icon: UtensilsCrossed, label: msg('Menu'), href: '/restaurant/menu', permission: P.RESTAURANT_MENU_VIEW },
      { icon: Sparkles, label: msg('Add-ons'), href: '/restaurant/modifiers', permission: P.RESTAURANT_MENU_VIEW },
      { icon: BookOpen, label: msg('Recipes'), href: '/restaurant/recipes', permission: P.RESTAURANT_KITCHEN_VIEW },
    ],
    stockChips: () => [1, 5, 10, 25, 50],
    guide: [
      { icon: Power, title: msg('Khatam? Band karein'), text: msg('"Mil rahi" dabane se dish is branch me aaj ke liye band (86) ho jati hai — counter par nahi aati, aur karobari din khatam hote hi khud chalu ho jati hai.') },
      { icon: Wheat, title: msg('Raw material'), text: msg('Chicken, chawal, oil ka stock aur value. Purchase se stock aata hai, dish bikne par recipe ke hisaab se katta hai.') },
      { icon: Clock, title: msg('Kab milti hai'), text: msg('"Aaj mil rahi hai" band karein jab khatam ho jaye. Nashta ya BBQ ka waqt likhein to us waqt ke bahar counter par nahi aati.') },
    ],
  },
  editor,
  detail: {
    extra: {
      key: MENU_KEYS.extra,
      load: async (id): Promise<DetailExtra> => {
        const [menu, cook, recipes] = await Promise.all([
          boardApi.byProduct(id).catch(() => null),
          recipesApi.cookability().catch(() => null),
          recipesApi.list().catch(() => [] as RecipeRow[]),
        ]);
        return { menu, cook: cook?.rows.find((r) => r.productId === id) ?? null, usedIn: recipes.filter((r) => r.ingredients.some((i) => i.ingredientProductId === id)) };
      },
    },
    badges: (c) => {
      if (isRaw(c)) return [{ label: t('Raw material'), tone: 'warning' }];
      const m = c.extra?.menu;
      return [
        !m ? { label: t('Menu par nahi'), tone: 'neutral' as const } : m.isAvailable && !m.offHere ? { label: t('Menu par'), tone: 'success' as const } : { label: m.offHere ? offLabel(m.offUntil) : t('Band (86)'), tone: 'danger' as const },
        ...(m?.chefSpecial ? [{ label: t('Chef special'), tone: 'warning' as const }] : []),
        ...(m?.bestSeller ? [{ label: t('Best seller'), tone: 'brand' as const }] : []),
      ];
    },
    facts: (c) => {
      if (isRaw(c)) return [[t('Type'), t('Raw material — menu par nahi')], [t('Recipes me'), `${c.extra?.usedIn.length ?? 0} dish`]];
      const m = c.extra?.menu;
      const out: Array<[string, string]> = [[t('Type'), isDish(c) ? t('Kitchen me banti hai') : t('Bani banai bikti hai')]];
      if (m) {
        out.push([t('Kab milti hai'), hoursText(m)]);
        if (m.prepTimeMinutes) out.push([t('Banne me'), `${m.prepTimeMinutes} min`]);
        out.push([t('Add-ons'), m.modifiers?.length ? t('{{count}} group', { count: m.modifiers.length }) : t('Nahi')]);
      }
      return out;
    },
    tile: (c) => {
      if (isRaw(c)) return { label: t('Recipes me'), value: `${c.extra?.usedIn.length ?? 0} dish`, hint: t('Is saamaan se banti hain') };
      const cook = c.extra?.cook;
      if (!cook || cook.canMake === null) return null;
      return { label: t('Aur ban sakti hain'), value: `${cook.canMake} plate`, hint: cook.blocker ? t('Pehle {{name}} khatam hoga', { name: cook.blocker.name }) : undefined };
    },
    alerts: (c) => {
      if (isRaw(c)) return null;
      const m = c.extra?.menu;
      const cook = c.extra?.cook;
      if (m?.isAvailable && !m.offHere && cook?.canMake === 0) {
        return <Card tone="danger"><Text size="sm">{t('Menu par hai magar ab nahi ban sakti — {{value}} khatam. Purchase karein ya "Khatam (86)" dabayein.', { value: cook.blocker?.name ?? t('saamaan') })}</Text></Card>;
      }
      if (isDish(c) && m && !m.recipe) {
        return <Card tone="warning" onPress={() => router.push(`/products/${c.product.id}/edit` as never)}><Text size="sm">{t('Recipe nahi — bikne par saamaan stock se nahi katta.')} {t('Recipe banayein')} →</Text></Card>;
      }
      if (cook?.unitProblems?.length) return <Card tone="warning"><Text size="sm">{t('Recipe me {{value}} ki unit stock se nahi milti — recipe theek karein.', { value: cook.unitProblems.join(', ') })}</Text></Card>;
      return null;
    },
    tabs: [
      { id: 'menu', label: msg('Menu'), icon: UtensilsCrossed, when: (c) => !isRaw(c), render: (c) => <MenuTabDetail ctx={c} /> },
      { id: 'recipe', label: msg('Recipe'), icon: Wheat, when: (c) => isDish(c), render: (c) => <RecipeTabDetail ctx={c} /> },
      { id: 'used', label: msg('Recipes me'), icon: ChefHat, when: (c) => isRaw(c), render: (c) => <UsedInTab ctx={c} /> },
    ],
    stockChips: [1, 5, 10, 25, 50],
  },
});

