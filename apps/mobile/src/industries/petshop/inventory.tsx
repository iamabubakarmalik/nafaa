/**
 * Pet shop items through the shared products list, editor and detail (web
 * PetshopProducts, PetshopProductWizardPage, PetshopProductDetailPage): what
 * the item is (food, medicine, care, gear, aquarium), which animal it is for,
 * brand and pack, medicine facts and an expiry ribbon.
 */

import { useQuery } from '@tanstack/react-query';
import { CalendarX, PawPrint, Scissors } from 'lucide-react-native';
import { useMemo } from 'react';
import { View } from 'react-native';
import { categoryGroup, expiryDays } from '@nafaa/core/industries/petshop';
import { formatDate } from '@/core/format';
import { msg, t } from '@/core/i18n';
import { Card, ChipGroup, FormSection, Input, Row, Switch, Text } from '@/design';
import { NumberInput } from '@/modules/inventory/components/fields';
import { registerInventoryIndustry } from '@/modules/inventory/industry/registry';
import type { CoreOptions, EditorConfig, StepContext, StepDef } from '@/modules/inventory/industry/types';
import { basicStep, priceStep, stockStep } from '@/modules/inventory/screens/editor/coreSteps';
import type { Errors } from '@/modules/inventory/screens/editor/types';
import { todayKey } from '../_shared/deskKit';
import { petProductsApi, type PetLifeStage, type PetProfile, type PetSpecies } from './api';
import { BRANDS, CATEGORY_GROUPS, DOSAGE_FORMS, LIFE_STAGE, PET_KEYS, PET_SIZES, SPECIES, categoryLabel, speciesLabel } from './meta';
import { useCategoryKindSync } from '@/modules/inventory/components/Pickers';

interface PetExtra {
  categoryType: string; species: PetSpecies | ''; lifeStage: PetLifeStage | ''; brand: string; packSize: string; flavor: string; weightKg: number | null;
  isGrainFree: boolean; isPrescriptionOnly: boolean; activeIngredient: string; dosageForm: string; dosageStrength: string; storageInstructions: string;
  size: string; material: string; tankCapacityLiters: number | null;
}
const initial: PetExtra = {
  categoryType: '', species: '', lifeStage: '', brand: '', packSize: '', flavor: '', weightKg: null, isGrainFree: false, isPrescriptionOnly: false,
  activeIngredient: '', dosageForm: '', dosageStrength: '', storageInstructions: '', size: '', material: '', tankCapacityLiters: null,
};
const opt = (v: string) => v.trim() || undefined;
const num = (v: number | null) => (v != null && Number.isFinite(v) ? v : undefined);
const pick = (cur: string, v: string) => (cur === v ? '' : v);

function Kind({ ctx }: { ctx: StepContext<PetExtra> }) {
  // The item type comes from the shop category's kind (nearest parent); the editor shows no separate picker.
  useCategoryKindSync(ctx.draft.core.categoryId, ctx.draft.extra.categoryType, (kind) => ctx.setExtra({ categoryType: kind }));
  return null;
}

function Details({ ctx }: { ctx: StepContext<PetExtra> }) {
  const x = ctx.draft.extra;
  const set = ctx.setExtra;
  const group = categoryGroup(x.categoryType || null);
  return (
    <View style={{ gap: 16 }}>
      <Kind ctx={ctx} />
      <FormSection title={t('Kis janwar ke liye')} description={t('Counter par janwar ka naam likhne se ye cheez milti hai')}>
        <ChipGroup wrap value={x.species} onChange={(v) => set({ species: pick(x.species, v) as PetSpecies | '' })} options={(Object.keys(SPECIES) as PetSpecies[]).map((k) => ({ value: k, label: `${SPECIES[k].emoji} ${t(SPECIES[k].label)}` }))} />
        <ChipGroup wrap value={x.lifeStage} onChange={(v) => set({ lifeStage: pick(x.lifeStage, v) as PetLifeStage | '' })} options={(Object.keys(LIFE_STAGE) as PetLifeStage[]).map((k) => ({ value: k, label: t(LIFE_STAGE[k]) }))} />
      </FormSection>
      <FormSection title={t('Brand aur pack')} description={t('Bill aur counter par naam ke neeche dikhta hai')}>
        <Input label={t('Brand')} value={x.brand} onChangeText={(brand) => set({ brand })} placeholder="Royal Canin" />
        <ChipGroup wrap value={x.brand} onChange={(v) => set({ brand: pick(x.brand, v) })} options={BRANDS.map((b) => ({ value: b, label: b }))} />
        <Input label={t('Pack')} value={x.packSize} onChangeText={(packSize) => set({ packSize })} placeholder={t('1.5 kg, 400 g')} />
        {group === 'food' && <Input label={t('Flavour')} value={x.flavor} onChangeText={(flavor) => set({ flavor })} placeholder={t('Chicken, fish')} />}
        {group === 'food' && <NumberInput label={t('Ek pack ka wazan (kg)')} value={x.weightKg} onChangeValue={(weightKg) => set({ weightKg })} error={ctx.errors.weightKg} hint={t('Khula bechna ho to Price step me kg unit jorein')} />}
        {group === 'food' && <Switch value={x.isGrainFree} onChange={(isGrainFree) => set({ isGrainFree })} label={t('Grain free')} />}
      </FormSection>
      {group === 'medicine' && (
        <FormSection title={t('Dawai')} description={t('Expiry har batch ki Stock step me likhein')}>
          <Input label={t('Asal dawa (salt)')} value={x.activeIngredient} onChangeText={(activeIngredient) => set({ activeIngredient })} placeholder="Ivermectin" />
          <Input label={t('Taqat')} value={x.dosageStrength} onChangeText={(dosageStrength) => set({ dosageStrength })} placeholder="10 mg" />
          <Input label={t('Shakal')} value={x.dosageForm} onChangeText={(dosageForm) => set({ dosageForm })} placeholder="Tablet" />
          <ChipGroup wrap value={x.dosageForm} onChange={(v) => set({ dosageForm: pick(x.dosageForm, v) })} options={DOSAGE_FORMS.map((f) => ({ value: t(f), label: t(f) }))} />
          <Switch value={x.isPrescriptionOnly} onChange={(isPrescriptionOnly) => set({ isPrescriptionOnly })} label={t('Doctor ki parchi par')} description={t('Counter par yaad dilata hai')} />
          <Input label={t('Kaise rakhein (marzi)')} value={x.storageInstructions} onChangeText={(storageInstructions) => set({ storageInstructions })} placeholder={t('Fridge me')} />
        </FormSection>
      )}
      {(group === 'gear' || group === 'aquarium') && (
        <FormSection title={t('Size')} description={t('Patta, bistar, pinjra ya tank')}>
          <Input label={t('Size')} value={x.size} onChangeText={(size) => set({ size })} />
          <ChipGroup wrap value={x.size} onChange={(v) => set({ size: pick(x.size, v) })} options={PET_SIZES.map((v) => ({ value: t(v), label: t(v) }))} />
          <Input label={t('Material')} value={x.material} onChangeText={(material) => set({ material })} placeholder={t('Leather, steel')} />
          {group === 'aquarium' && <NumberInput label={t('Tank (litre)')} value={x.tankCapacityLiters} onChangeValue={(tankCapacityLiters) => set({ tankCapacityLiters })} />}
        </FormSection>
      )}
    </View>
  );
}

const core: CoreOptions = {
  units: [{ value: 'pcs', label: msg('Adad') }, { value: 'pack', label: msg('Pack') }, { value: 'kg', label: msg('Kg (khula khana)') }, { value: 'g', label: msg('Gram') }, { value: 'l', label: msg('Litre') }, { value: 'ml', label: 'ml' }],
  skuPrefix: 'PS',
  packs: true,
  variants: { presets: [{ group: msg('Size'), values: PET_SIZES }, { group: msg('Flavour'), values: ['Chicken', 'Fish', 'Beef', 'Lamb'] }] },
  batches: true,
  markups: [15, 25, 35, 50],
};

const detailsStep: StepDef<PetExtra> = {
  id: 'pet', title: msg('Janwar aur tafseel'), icon: PawPrint, render: (ctx) => <Details ctx={ctx} />,
  validate: (d) => {
    const e: Errors = {};
    if (d.extra.weightKg != null && (d.extra.weightKg <= 0 || d.extra.weightKg > 100)) e.weightKg = t('0 se 100 kg');
    return e;
  },
};

const editor: EditorConfig<PetExtra> = {
  core,
  extra: {
    initial,
    load: async (productId) => {
      const p = await petProductsApi.byProduct(productId).catch(() => null);
      if (!p) return {};
      return {
        categoryType: p.categoryType ?? '', species: p.species ?? '', lifeStage: p.lifeStage ?? '', brand: p.brand ?? '', packSize: p.packSize ?? '', flavor: p.flavor ?? '',
        weightKg: p.weightKg ?? null, isGrainFree: p.isGrainFree, isPrescriptionOnly: p.isPrescriptionOnly, activeIngredient: p.activeIngredient ?? '', dosageForm: p.dosageForm ?? '',
        dosageStrength: p.dosageStrength ?? '', storageInstructions: p.storageInstructions ?? '', size: p.size ?? '', material: p.material ?? '', tankCapacityLiters: p.tankCapacityLiters ?? null,
      };
    },
    save: async (productId, d) => {
      const x = d.extra;
      await petProductsApi.upsert({
        productId, categoryType: x.categoryType || undefined, species: x.species || undefined, lifeStage: x.lifeStage || undefined, brand: opt(x.brand), packSize: opt(x.packSize),
        flavor: opt(x.flavor), weightKg: num(x.weightKg), isGrainFree: x.isGrainFree, isPrescriptionOnly: x.isPrescriptionOnly, activeIngredient: opt(x.activeIngredient),
        dosageForm: opt(x.dosageForm), dosageStrength: opt(x.dosageStrength), storageInstructions: opt(x.storageInstructions), size: opt(x.size), material: opt(x.material),
        tankCapacityLiters: num(x.tankCapacityLiters),
      } as Partial<PetProfile>);
    },
  },
  steps: [basicStep<PetExtra>(core), detailsStep, priceStep<PetExtra>(core), stockStep<PetExtra>(core, { quick: [5, 10, 20, 50] })],
  summary: (d) => [
    ...(d.extra.categoryType ? [[t('Ye kya hai'), categoryLabel(d.extra.categoryType)] as [string, string]] : []),
    ...(d.extra.species ? [[t('Kis ke liye'), speciesLabel(d.extra.species)] as [string, string]] : []),
  ],
};

/** Pet profiles by product id (one request, shared by every row). */
function usePetProfiles() {
  const q = useQuery({ queryKey: [PET_KEYS.profiles], queryFn: () => petProductsApi.list(), staleTime: 60_000 });
  return useMemo(() => new Map((q.data ?? []).map((p) => [p.productId, p])), [q.data]);
}

const lineOf = (p?: PetProfile) => (p ? [p.brand, p.species ? speciesLabel(p.species) : null, p.lifeStage ? t(LIFE_STAGE[p.lifeStage]) : null, p.packSize].filter(Boolean).join(' · ') : '');

registerInventoryIndustry({
  id: 'petshop',
  label: msg('Pet shop'),
  categoryKinds: CATEGORY_GROUPS.flatMap((g) => g.items).filter(([v]) => v !== 'OTHER').map(([value, label]) => ({ value, label })),
  list: {
    noun: 'cheez',
    filters: ['tags'],
    useSource: usePetProfiles,
    extras: (item, ctx) => {
      if (item.productType === 'PET_ANIMAL') return { ribbon: { text: t('Zinda janwar'), tone: 'accent' }, line: t('Record "Live animals" me hai') };
      const p = (ctx.source as Map<string, PetProfile> | undefined)?.get(item.id);
      const left = expiryDays(p?.expiryDate, todayKey());
      return {
        line: lineOf(p) || undefined,
        ribbon: left === null ? undefined : left < 0 ? { text: t('Expire'), tone: 'danger' } : left <= 30 ? { text: t('{{left}} din me expire', { left }), tone: 'warning' } : undefined,
        badges: p?.isPrescriptionOnly ? [{ label: t('Parchi'), tone: 'info' }] : [],
        chips: p?.categoryType ? [categoryLabel(p.categoryType)] : [],
      };
    },
    actions: [
      { icon: PawPrint, label: msg('Live animals'), href: '/petshop/live-animals' },
      { icon: Scissors, label: msg('Grooming'), href: '/petshop/grooming' },
    ],
    stockChips: () => [5, 10, 20, 50],
    guide: [
      { icon: PawPrint, title: msg('Kis janwar ke liye'), text: msg('Har cheez par janwar aur umar likhein — counter par "billi" ya "kutta" likhne se wahi cheezein aati hain.') },
      { icon: CalendarX, title: msg('Expiry'), text: msg('Dawai, vaccine aur khane ki batch ki expiry likhein — expire hone wali cheez par laal patti aati hai.') },
    ],
  },
  editor,
  detail: {
    extra: { key: 'petshop-product-detail', load: (id) => petProductsApi.byProduct(id).catch(() => null) },
    badges: ({ extra }) => { const p = extra as PetProfile | null | undefined; return p?.categoryType ? [{ label: categoryLabel(p.categoryType), tone: 'warning' as const }] : []; },
    facts: ({ extra }) => {
      const p = extra as PetProfile | null | undefined;
      if (!p) return [];
      const rows: Array<[string, string | undefined]> = [
        [t('Kis ke liye'), p.species ? speciesLabel(p.species) : undefined], [t('Umar'), p.lifeStage ? t(LIFE_STAGE[p.lifeStage]) : undefined], [t('Brand'), p.brand], [t('Pack'), p.packSize],
        [t('Flavour'), p.flavor], [t('Wazan'), p.weightKg ? `${p.weightKg} kg` : undefined], [t('Asal dawa'), p.activeIngredient], [t('Taqat'), p.dosageStrength], [t('Shakal'), p.dosageForm],
        [t('Parchi'), p.isPrescriptionOnly ? t('Doctor ki parchi par') : undefined], [t('Kaise rakhein'), p.storageInstructions], [t('Size'), p.size], [t('Material'), p.material],
        [t('Tank'), p.tankCapacityLiters ? t('{{count}} litre', { count: p.tankCapacityLiters }) : undefined],
      ];
      return rows.filter((r): r is [string, string] => !!r[1]);
    },
    tile: ({ extra }) => {
      const p = extra as PetProfile | null | undefined;
      const left = expiryDays(p?.expiryDate, todayKey());
      if (left === null) return null;
      return { label: t('Expiry'), value: left < 0 ? t('Expire') : t('{{left}} din', { left }), hint: p?.expiryDate ? formatDate(p.expiryDate, { year: true }) : undefined };
    },
    alerts: ({ extra, stock }) => {
      const left = expiryDays((extra as PetProfile | null | undefined)?.expiryDate, todayKey());
      if (left === null || left > 30 || stock <= 0) return null;
      return <Card tone="warning"><Row gap={2}><CalendarX size={16} /><Text size="sm" weight="medium" style={{ flex: 1 }}>{left < 0 ? t('Ye cheez expire ho chuki hai — counter se hatayein aur Damage me likhein') : t('{{left}} din me expire — pehle bechein', { left })}</Text></Row></Card>;
    },
    stockChips: [5, 10, 20, 50],
  },
});
