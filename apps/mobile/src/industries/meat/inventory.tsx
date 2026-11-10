/**
 * Meat items through the shared products list, editor and detail (web
 * MeatProductWizardPage, MeatProductsPage): the animal and cut (they drive the
 * counter filters and order lines), fresh or frozen, halal certificate and
 * source, sold by kg with an optional pack ("pao", "1 kg pack"), and the
 * restaurant rate as the wholesale price.
 */

import { useQuery } from '@tanstack/react-query';
import { Beef, ShieldCheck, Snowflake } from 'lucide-react-native';
import { useMemo } from 'react';
import { View } from 'react-native';
import { formatDate } from '@/core/format';
import { msg, t } from '@/core/i18n';
import { ChipGroup, DatePicker, FormSection, Input, Switch, Text } from '@/design';
import { NumberInput } from '@/modules/inventory/components/fields';
import { useCategoryKindSync } from '@/modules/inventory/components/Pickers';
import { registerInventoryIndustry } from '@/modules/inventory/industry/registry';
import type { CoreOptions, EditorConfig, StepContext, StepDef } from '@/modules/inventory/industry/types';
import { basicStep, priceStep, stockStep } from '@/modules/inventory/screens/editor/coreSteps';
import type { Errors } from '@/modules/inventory/screens/editor/types';
import { dateToKey, keyToDate } from '../_shared/deskKit';
import { meatProductsApi, type AnimalType, type CutCategory, type FreshnessType, type MeatProductProfile, type SaleUnit } from './api';
import { ANIMALS, MEAT_KEYS, animalText, cutLabel, opt } from './meta';

export interface MeatExtra {
  animalType: AnimalType | ''; cutCategory: CutCategory | ''; freshnessType: FreshnessType; isBoneless: boolean; isFrozen: boolean; isMarinated: boolean; isHalalCertified: boolean;
  halalCertNumber: string; halalCertBy: string; halalCertExpiry: string; farmName: string; slaughterhouseName: string; shelfLifeDays: number | null; minOrderKg: number | null;
}
const initial: MeatExtra = {
  animalType: '', cutCategory: '', freshnessType: 'FRESH_SLAUGHTERED', isBoneless: false, isFrozen: false, isMarinated: false, isHalalCertified: true, halalCertNumber: '', halalCertBy: '', halalCertExpiry: '',
  farmName: '', slaughterhouseName: '', shelfLifeDays: null, minOrderKg: null,
};
const FRESH: Array<{ value: FreshnessType; label: string }> = [
  { value: 'LIVE', label: msg('Zinda') }, { value: 'FRESH_SLAUGHTERED', label: msg('Taaza zibah') }, { value: 'FRESH_CHILLED', label: msg('Thanda (chiller)') }, { value: 'FROZEN', label: msg('Frozen') },
  { value: 'MARINATED', label: msg('Masala laga') }, { value: 'PROCESSED', label: msg('Tayyar (kabab, nuggets)') },
];
const num = (v: number | null) => (v != null && Number.isFinite(v) ? v : undefined);
const saleUnitOf = (unit: string): SaleUnit => (['gram', 'g'].includes(unit) ? 'GRAM' : ['pcs', 'piece'].includes(unit) ? 'PIECE' : unit === 'dozen' ? 'DOZEN' : 'KG');

function Kind({ ctx }: { ctx: StepContext<MeatExtra> }) {
  const x = ctx.draft.extra;
  // The animal comes from the shop category's kind (nearest parent); the editor shows no separate picker.
  // The cut is no longer asked here: an existing product keeps its stored cut.
  useCategoryKindSync(ctx.draft.core.categoryId, x.animalType, (animalType) => ctx.setExtra({ animalType: animalType as AnimalType }));
  return null;
}

function Details({ ctx }: { ctx: StepContext<MeatExtra> }) {
  const x = ctx.draft.extra;
  const set = ctx.setExtra;
  return (
    <View style={{ gap: 16 }}>
      <FormSection title={t('Halat')} description={t('Taaza, frozen ya masala laga — bill aur order par dikhta hai')}>
        <ChipGroup wrap value={x.freshnessType} onChange={(v) => set({ freshnessType: v as FreshnessType, isFrozen: v === 'FROZEN', isMarinated: v === 'MARINATED' })} options={FRESH.map((f) => ({ value: f.value, label: t(f.label) }))} />
        <Switch value={x.isBoneless} onChange={(isBoneless) => set({ isBoneless })} label={t('Boneless')} description={t('Haddi ke bagair')} />
        <NumberInput label={t('Kitne din chalta hai')} integer value={x.shelfLifeDays} onChangeValue={(shelfLifeDays) => set({ shelfLifeDays })} hint={t('Frozen ke liye; khali = usi din')} />
      </FormSection>
      <FormSection title={t('Halal')} description={t('Certificate ho to likhein — halal record aur bill par kaam aata hai')}>
        <Switch value={x.isHalalCertified} onChange={(isHalalCertified) => set({ isHalalCertified })} label={t('Halal certified')} />
        {x.isHalalCertified && (
          <>
            <Input label={t('Certificate #')} value={x.halalCertNumber} onChangeText={(halalCertNumber) => set({ halalCertNumber })} placeholder="PHA-12345" ltr />
            <Input label={t('Kis ne diya')} value={x.halalCertBy} onChangeText={(halalCertBy) => set({ halalCertBy })} placeholder={t('PHA, SANHA…')} />
            <DatePicker label={t('Kab tak')} value={keyToDate(x.halalCertExpiry)} onChange={(d) => set({ halalCertExpiry: dateToKey(d) })} error={ctx.errors.halalCertExpiry} />
          </>
        )}
      </FormSection>
      <FormSection title={t('Kahan se')} description={t('Marzi hai')}>
        <Input label={t('Farm / mandi')} value={x.farmName} onChangeText={(farmName) => set({ farmName })} placeholder={t('Shahpur poultry farm')} />
        <Input label={t('Zibah khana')} value={x.slaughterhouseName} onChangeText={(slaughterhouseName) => set({ slaughterhouseName })} placeholder={t('Apni dukaan / municipal')} />
      </FormSection>
    </View>
  );
}

const core: CoreOptions = {
  units: [{ value: 'kg', label: msg('Kg') }, { value: 'gram', label: msg('Gram') }, { value: 'pcs', label: msg('Adad (pcs)') }, { value: 'dozen', label: msg('Darjan') }],
  skuPrefix: 'MT', packs: true, variants: false, batches: false, markups: [10, 15, 20, 25, 30],
};

function meatErrors(x: MeatExtra): Errors {
  const e: Errors = {};
  return e;
}

const detailsStep: StepDef<MeatExtra> = { id: 'meat', title: msg('Gosht'), icon: Beef, render: (ctx) => <Details ctx={ctx} /> };
const basic = basicStep<MeatExtra>(core, { extra: (ctx) => <Kind ctx={ctx} />, namePlaceholder: msg('Jaise: Chicken boneless, Mutton qeema, Zinda murgi') });

const editor: EditorConfig<MeatExtra> = {
  core,
  extra: {
    initial,
    load: async (productId) => {
      const p = await meatProductsApi.byProduct(productId).catch(() => null);
      if (!p) return {};
      return {
        animalType: p.animalType, cutCategory: p.cutCategory, freshnessType: p.freshnessType, isBoneless: p.isBoneless, isFrozen: p.isFrozen, isMarinated: p.isMarinated, isHalalCertified: p.isHalalCertified,
        halalCertNumber: p.halalCertNumber ?? '', halalCertBy: p.halalCertBy ?? '', halalCertExpiry: p.halalCertExpiry ? p.halalCertExpiry.slice(0, 10) : '', farmName: p.farmName ?? '',
        slaughterhouseName: p.slaughterhouseName ?? '', shelfLifeDays: p.shelfLifeDays ?? null, minOrderKg: p.minOrderKg ?? null,
      };
    },
    save: async (productId, d) => {
      const x = d.extra;
      const body = {
        productId, animalType: x.animalType || undefined, cutCategory: x.cutCategory || undefined, freshnessType: x.freshnessType, saleUnit: saleUnitOf(d.core.unit), pricePerKg: num(d.core.price),
        isBoneless: x.isBoneless, isBoneIn: !x.isBoneless, isFrozen: x.isFrozen, isMarinated: x.isMarinated, isHalalCertified: x.isHalalCertified,
        halalCertNumber: x.isHalalCertified ? opt(x.halalCertNumber) : undefined, halalCertBy: x.isHalalCertified ? opt(x.halalCertBy) : undefined, halalCertExpiry: x.isHalalCertified ? opt(x.halalCertExpiry) : undefined,
        farmName: opt(x.farmName), slaughterhouseName: opt(x.slaughterhouseName), shelfLifeDays: num(x.shelfLifeDays), minOrderKg: num(x.minOrderKg),
      };
      await meatProductsApi.upsert(Object.fromEntries(Object.entries(body).filter(([, v]) => v !== undefined)));
    },
  },
  steps: [
    { ...basic, validate: (d, e) => ({ ...basic.validate?.(d, e), ...meatErrors(d.extra) }) },
    detailsStep,
    priceStep<MeatExtra>(core),
    stockStep<MeatExtra>(core, { quick: [1, 5, 10, 25, 50], extra: (ctx) => (
      <FormSection title={t('Order par kam se kam')}>
        <NumberInput label={t('Order par kam se kam')} value={ctx.draft.extra.minOrderKg} onChangeValue={(minOrderKg) => ctx.setExtra({ minOrderKg })} hint={t('Wazan wale order me isse kam likhne par yaad dilata hai — khali chhor dein to koi had nahi')} />
      </FormSection>
    ) }),
  ],
  summary: (d) => {
    const x = d.extra;
    const facts = [x.animalType ? animalText(x.animalType) : '', cutLabel(x.cutCategory), t(FRESH.find((f) => f.value === x.freshnessType)?.label ?? ''), x.isHalalCertified ? t('Halal') : ''].filter(Boolean);
    return facts.length ? [[t('Gosht'), facts.join(' · ')]] : [];
  },
};

/** Meat profiles by product id (one request, shared by every row). */
function useProfiles() {
  const q = useQuery({ queryKey: [MEAT_KEYS.profiles], queryFn: () => meatProductsApi.list().catch(() => [] as MeatProductProfile[]), staleTime: 60_000 });
  return useMemo(() => new Map((q.data ?? []).map((p) => [p.productId, p])), [q.data]);
}

registerInventoryIndustry({
  id: 'meat',
  label: msg('Meat'),
  categoryKinds: ANIMALS.filter((a) => a.value !== 'OTHER').map((a) => ({ value: a.value, label: a.label })),
  list: {
    noun: 'cheez',
    filters: ['tags'],
    useSource: useProfiles,
    stockChips: () => [1, 5, 10, 25, 50],
    extras: (item, ctx) => {
      const p = (ctx.source as Map<string, MeatProductProfile> | undefined)?.get(item.id);
      if (!p) return {};
      return {
        line: [animalText(p.animalType), cutLabel(p.cutCategory)].filter(Boolean).join(' · ') || undefined,
        badges: [...(p.isHalalCertified ? [{ label: t('Halal'), tone: 'success' as const }] : []), ...(p.isFrozen ? [{ label: t('Frozen'), tone: 'info' as const }] : [])],
        chips: p.minOrderKg ? [t('Kam se kam {{kg}} kg', { kg: p.minOrderKg })] : [],
      };
    },
    guide: [
      { icon: Beef, title: msg('Janwar aur cut'), text: msg('Pehle step me janwar aur cut zaroori hain — POS ke filter, cutting aur orders inhi se chalte hain.') },
      { icon: ShieldCheck, title: msg('Halal'), text: msg('Certificate number aur tareekh likhein; khatam hone wali tareekh product par yaad dilati hai.') },
      { icon: Snowflake, title: msg('Kg aur pack'), text: msg('Unit kg rakhein. Qeemat step me "Pao = 0.25" ya "1 kg pack" jorein — dono tarah bikta hai, stock kg me ginta hai. Wholesale qeemat = restaurant rate.') },
    ],
  },
  editor,
  detail: {
    extra: { key: 'meat-product-detail', load: (id) => meatProductsApi.byProduct(id).catch(() => null) },
    badges: ({ extra }) => {
      const p = extra as MeatProductProfile | null | undefined;
      return p ? [{ label: animalText(p.animalType), tone: 'danger' as const }, ...(p.isHalalCertified ? [{ label: t('Halal'), tone: 'success' as const }] : [])] : [];
    },
    facts: ({ extra }) => {
      const p = extra as MeatProductProfile | null | undefined;
      if (!p) return [];
      const rows: Array<[string, string | undefined]> = [
        [t('Janwar'), animalText(p.animalType)], [t('Cut'), cutLabel(p.cutCategory)], [t('Halat'), t(FRESH.find((f) => f.value === p.freshnessType)?.label ?? '')], [t('Boneless'), p.isBoneless ? t('Haan') : undefined],
        [t('Certificate #'), p.halalCertNumber], [t('Kis ne diya'), p.halalCertBy], [t('Kab tak'), p.halalCertExpiry ? formatDate(p.halalCertExpiry, { year: true }) : undefined],
        [t('Farm / mandi'), p.farmName], [t('Zibah khana'), p.slaughterhouseName], [t('Kitne din chalta hai'), p.shelfLifeDays ? t('{{count}} din', { count: p.shelfLifeDays }) : undefined],
        [t('Order par kam se kam'), p.minOrderKg ? `${p.minOrderKg} kg` : undefined],
      ];
      return rows.filter((r): r is [string, string] => !!r[1]);
    },
    stockChips: [1, 5, 10, 25],
  },
});
