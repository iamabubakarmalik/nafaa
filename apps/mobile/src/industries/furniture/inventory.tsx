/**
 * Furniture through the shared products list, editor and detail (web
 * FurnitureProductsPage, FurnitureProductWizardPage, FurnitureProductDetailPage):
 * what it is (sofa, bed, almari), condition (new, showroom piece), wood, polish,
 * fabric and size, fitting and delivery needs, warranty, and where it stands in
 * the showroom. Colours and fabrics are variants, each with its own stock.
 */

import { useQuery } from '@tanstack/react-query';
import { ClipboardList, Hammer, Palette, Ruler, Sofa, Star, Truck } from 'lucide-react-native';
import { View } from 'react-native';
import { formatMoney } from '@/core/format';
import { msg, t } from '@/core/i18n';
import { ChipGroup, FormSection, Input, MoneyInput, Switch, Text } from '@/design';
import { NumberInput, Tiles } from '@/modules/inventory/components/fields';
import { registerInventoryIndustry } from '@/modules/inventory/industry/registry';
import type { CoreOptions, EditorConfig, StepContext, StepDef } from '@/modules/inventory/industry/types';
import { basicStep, priceStep, stockStep } from '@/modules/inventory/screens/editor/coreSteps';
import { furnitureProductsApi, type FurnitureConditionType, type FurnitureProductProfile } from './api';
import { CATEGORY_GROUPS, CONDITIONS, FABRICS, FURNITURE_KEYS, MATERIALS, POLISHES, WOODS, categoryLabel, materialOf, opt, sizeText } from './meta';

interface FurnitureExtra {
  categoryType: string; conditionType: FurnitureConditionType; primaryMaterial: string;
  woodType: string; polishType: string; colorName: string; upholsteryFabric: string; cushionFilling: string;
  lengthCm: number | null; widthCm: number | null; heightCm: number | null; seatingCapacity: number | null; drawersCount: number | null; weightKg: number | null;
  requiresAssembly: boolean; assemblyChargeExtra: number | null; requiresLargeVehicle: boolean; helpersNeeded: number | null; deliveryChargeBase: number | null;
  isCustomizable: boolean; customLeadTimeDays: number | null; warrantyMonths: number | null; isTermiteProof: boolean; isWaterResistant: boolean;
  showroomLocation: string; displayZone: string; collectionName: string; modelNumber: string;
  isFeatured: boolean; isNewArrival: boolean; isBestSeller: boolean; notes: string;
}
const initial: FurnitureExtra = {
  categoryType: '', conditionType: 'BRAND_NEW', primaryMaterial: '', woodType: '', polishType: '', colorName: '', upholsteryFabric: '', cushionFilling: '',
  lengthCm: null, widthCm: null, heightCm: null, seatingCapacity: null, drawersCount: null, weightKg: null,
  requiresAssembly: false, assemblyChargeExtra: null, requiresLargeVehicle: true, helpersNeeded: 2, deliveryChargeBase: null,
  isCustomizable: false, customLeadTimeDays: null, warrantyMonths: 12, isTermiteProof: false, isWaterResistant: false,
  showroomLocation: '', displayZone: '', collectionName: '', modelNumber: '', isFeatured: false, isNewArrival: false, isBestSeller: false, notes: '',
};
const FILLINGS = ['Foam', 'Spring', 'Fiber', 'Foam + spring'];
const MATERIAL_TILES = ['SOLID_WOOD_SHEESHAM', 'SOLID_WOOD_TEAK', 'ENGINEERED_WOOD', 'MDF', 'PLYWOOD', 'METAL_IRON', 'FABRIC_VELVET', 'LEATHER_FAUX'];
const num = (v: number | null) => (v != null && Number.isFinite(v) ? v : undefined);
const pick = (cur: string, v: string) => (cur === v ? '' : v);

function Kind({ ctx }: { ctx: StepContext<FurnitureExtra> }) {
  const x = ctx.draft.extra;
  return (
    <FormSection title={t('Ye kya hai')} description={t('Isi se counter ke filter (Sofa, Bed room, Dining) chalte hain. Order par banne wali cheez Custom orders me daalein.')}>
      {CATEGORY_GROUPS.map((g) => (
        <View key={g.id} style={{ gap: 6 }}>
          <Text size="xs" weight="semibold" tone="muted">{t(g.label)}</Text>
          <ChipGroup wrap value={x.categoryType} onChange={(v) => ctx.setExtra({ categoryType: pick(x.categoryType, v) })} options={g.items.map(([value, label]) => ({ value, label: t(label) }))} />
        </View>
      ))}
    </FormSection>
  );
}

function Build({ ctx }: { ctx: StepContext<FurnitureExtra> }) {
  const x = ctx.draft.extra;
  const set = ctx.setExtra;
  return (
    <View style={{ gap: 16 }}>
      <FormSection title={t('Halat')} description={t('Display piece aksar kam qeemat par bikta hai')}>
        <Tiles value={x.conditionType} onChange={(conditionType) => set({ conditionType })} columns={2}
          options={(['BRAND_NEW', 'DISPLAY_MODEL', 'FLOOR_MODEL', 'REFURBISHED', 'PRE_OWNED'] as FurnitureConditionType[]).map((c) => ({ value: c, label: t(CONDITIONS[c].label) }))} />
      </FormSection>
      <FormSection title={t('Lakri, polish aur kapra')} description={t('Customer sab se pehle yahi poochta hai')}>
        <Text size="xs" weight="semibold" tone="muted">{t('Main material')}</Text>
        <ChipGroup wrap value={x.primaryMaterial} onChange={(v) => set({ primaryMaterial: pick(x.primaryMaterial, v) })} options={MATERIAL_TILES.map((m) => ({ value: m, label: t(MATERIALS[m]) }))} />
        <Input label={t('Lakri')} value={x.woodType} onChangeText={(woodType) => set({ woodType })} placeholder={t('Sheesham')} />
        <ChipGroup wrap value={x.woodType} onChange={(v) => set({ woodType: pick(x.woodType, v) })} options={WOODS.map((v) => ({ value: v, label: v }))} />
        <Input label={t('Polish')} value={x.polishType} onChangeText={(polishType) => set({ polishType })} placeholder={t('Walnut matte')} />
        <ChipGroup wrap value={x.polishType} onChange={(v) => set({ polishType: pick(x.polishType, v) })} options={POLISHES.map((v) => ({ value: v, label: v }))} />
        <Input label={t('Rang')} value={x.colorName} onChangeText={(colorName) => set({ colorName })} placeholder={t('Dark brown')} />
        <Input label={t('Kapra')} value={x.upholsteryFabric} onChangeText={(upholsteryFabric) => set({ upholsteryFabric })} placeholder={t('Velvet')} />
        <ChipGroup wrap value={x.upholsteryFabric} onChange={(v) => set({ upholsteryFabric: pick(x.upholsteryFabric, v) })} options={FABRICS.map((v) => ({ value: v, label: v }))} />
        <Input label={t('Gaddi ke andar')} value={x.cushionFilling} onChangeText={(cushionFilling) => set({ cushionFilling })} placeholder={t('Foam')} />
        <ChipGroup wrap value={x.cushionFilling} onChange={(v) => set({ cushionFilling: pick(x.cushionFilling, v) })} options={FILLINGS.map((v) => ({ value: v, label: v }))} />
        <Text size="xs" tone="muted">{t('Ek hi design kai rang ya kapre me ho to Price step me variants banayein — har rang ka apna stock.')}</Text>
      </FormSection>
      <FormSection title={t('Size')} description={t('cm me — customer kamre ka size milata hai')}>
        <NumberInput label={t('Lambai (cm)')} value={x.lengthCm} onChangeValue={(lengthCm) => set({ lengthCm })} />
        <NumberInput label={t('Chaurai (cm)')} value={x.widthCm} onChangeValue={(widthCm) => set({ widthCm })} />
        <NumberInput label={t('Unchai (cm)')} value={x.heightCm} onChangeValue={(heightCm) => set({ heightCm })} />
        <NumberInput label={t('Kitne log baithte')} integer value={x.seatingCapacity} onChangeValue={(seatingCapacity) => set({ seatingCapacity })} hint={t('Sofa / dining')} />
        <NumberInput label={t('Daraz')} integer value={x.drawersCount} onChangeValue={(drawersCount) => set({ drawersCount })} />
        <NumberInput label={t('Wazan (kg)')} value={x.weightKg} onChangeValue={(weightKg) => set({ weightKg })} />
      </FormSection>
    </View>
  );
}

function Delivery({ ctx }: { ctx: StepContext<FurnitureExtra> }) {
  const x = ctx.draft.extra;
  const set = ctx.setExtra;
  return (
    <View style={{ gap: 16 }}>
      <FormSection title={t('Delivery aur fitting')} description={t('Delivery banate waqt yahi charges khud aate hain')}>
        <Switch value={x.requiresAssembly} onChange={(requiresAssembly) => set({ requiresAssembly })} label={t('Ghar par fitting chahiye')} description={t('Bed, almari, dining')} />
        <Switch value={x.requiresLargeVehicle} onChange={(requiresLargeVehicle) => set({ requiresLargeVehicle })} label={t('Bari gaari chahiye')} description={t('Shehzore / Mazda')} />
        {x.requiresAssembly && <MoneyInput label={t('Fitting charge')} value={x.assemblyChargeExtra} onChangeValue={(assemblyChargeExtra) => set({ assemblyChargeExtra })} hint={t('0 = free')} />}
        <MoneyInput label={t('Delivery charge')} value={x.deliveryChargeBase} onChangeValue={(deliveryChargeBase) => set({ deliveryChargeBase })} hint={t('Shehar ke andar')} />
        <NumberInput label={t('Helper')} integer value={x.helpersNeeded} onChangeValue={(helpersNeeded) => set({ helpersNeeded })} />
      </FormSection>
      <FormSection title={t('Warranty aur order par')} description={t('Bill aur product page par')}>
        <NumberInput label={t('Warranty (mahine)')} integer value={x.warrantyMonths} onChangeValue={(warrantyMonths) => set({ warrantyMonths })} />
        <Input label={t('Showroom me kahan')} value={x.showroomLocation} onChangeText={(showroomLocation) => set({ showroomLocation })} placeholder={t('Ground floor')} />
        <Input label={t('Section')} value={x.displayZone} onChangeText={(displayZone) => set({ displayZone })} placeholder={t('Bed room corner')} />
        <Switch value={x.isTermiteProof} onChange={(isTermiteProof) => set({ isTermiteProof })} label={t('Deemak se mehfooz')} />
        <Switch value={x.isWaterResistant} onChange={(isWaterResistant) => set({ isWaterResistant })} label={t('Paani se kharab nahi')} />
        <Switch value={x.isCustomizable} onChange={(isCustomizable) => set({ isCustomizable })} label={t('Size / rang badal kar bana dete hain')} description={t('Custom order par')} />
        {x.isCustomizable && <NumberInput label={t('Order par kitne din')} integer value={x.customLeadTimeDays} onChangeValue={(customLeadTimeDays) => set({ customLeadTimeDays })} />}
        <Switch value={x.isFeatured} onChange={(isFeatured) => set({ isFeatured })} label={t('Khaas')} description={t('Aage dikhayein')} />
        <Switch value={x.isNewArrival} onChange={(isNewArrival) => set({ isNewArrival })} label={t('Naya design')} />
        <Switch value={x.isBestSeller} onChange={(isBestSeller) => set({ isBestSeller })} label={t('Zyada bikne wala')} />
      </FormSection>
    </View>
  );
}

const core: CoreOptions = {
  units: [{ value: 'pcs', label: msg('Adad (pcs)') }, { value: 'set', label: msg('Set') }, { value: 'sqft', label: msg('Sq. ft') }],
  skuPrefix: 'FR',
  packs: false,
  variants: { presets: [{ group: msg('Rang'), values: ['Walnut', 'Dark brown', 'White', 'Black', 'Natural'] }, { group: msg('Kapra'), values: ['Velvet', 'Jute', 'Leather', 'Rexine'] }, { group: msg('Size'), values: ['Single', 'Double', 'King', 'Queen'] }] },
  batches: false,
  markups: [15, 20, 30, 40],
};

const buildStep: StepDef<FurnitureExtra> = { id: 'furniture', title: msg('Banawat'), icon: Palette, render: (ctx) => <Build ctx={ctx} /> };
const deliveryStep: StepDef<FurnitureExtra> = { id: 'delivery', title: msg('Delivery'), icon: Truck, render: (ctx) => <Delivery ctx={ctx} /> };

const editor: EditorConfig<FurnitureExtra> = {
  core,
  extra: {
    initial,
    load: async (productId) => {
      const p = await furnitureProductsApi.byProduct(productId).catch(() => null);
      if (!p) return {};
      return {
        categoryType: p.categoryType ?? '', conditionType: p.conditionType, primaryMaterial: p.primaryMaterial ?? '',
        woodType: p.woodType ?? '', polishType: p.polishType ?? '', colorName: p.colorName ?? '', upholsteryFabric: p.upholsteryFabric ?? '', cushionFilling: p.cushionFilling ?? '',
        lengthCm: p.lengthCm ?? null, widthCm: p.widthCm ?? null, heightCm: p.heightCm ?? null, seatingCapacity: p.seatingCapacity ?? null, drawersCount: p.drawersCount ?? null, weightKg: p.weightKg ?? null,
        requiresAssembly: p.requiresAssembly, assemblyChargeExtra: p.assemblyChargeExtra ?? null, requiresLargeVehicle: p.requiresLargeVehicle, helpersNeeded: p.helpersNeeded ?? null,
        deliveryChargeBase: p.deliveryChargeBase ?? null, isCustomizable: p.isCustomizable, customLeadTimeDays: p.customLeadTimeDays ?? null, warrantyMonths: p.warrantyMonths ?? null,
        isTermiteProof: p.isTermiteProof, isWaterResistant: p.isWaterResistant, showroomLocation: p.showroomLocation ?? '', displayZone: p.displayZone ?? '',
        collectionName: p.collectionName ?? '', modelNumber: p.modelNumber ?? '', isFeatured: p.isFeatured, isNewArrival: p.isNewArrival, isBestSeller: p.isBestSeller, notes: p.notes ?? '',
      };
    },
    save: async (productId, d) => {
      const x = d.extra;
      await furnitureProductsApi.upsert({
        productId, categoryType: (x.categoryType || undefined) as FurnitureProductProfile['categoryType'], conditionType: x.conditionType,
        primaryMaterial: (x.primaryMaterial || undefined) as FurnitureProductProfile['primaryMaterial'],
        woodType: opt(x.woodType), polishType: opt(x.polishType), colorName: opt(x.colorName), upholsteryFabric: opt(x.upholsteryFabric), cushionFilling: opt(x.cushionFilling),
        lengthCm: num(x.lengthCm), widthCm: num(x.widthCm), heightCm: num(x.heightCm), seatingCapacity: num(x.seatingCapacity), drawersCount: num(x.drawersCount), weightKg: num(x.weightKg),
        requiresAssembly: x.requiresAssembly, assemblyChargeExtra: x.requiresAssembly ? num(x.assemblyChargeExtra) : undefined, requiresLargeVehicle: x.requiresLargeVehicle,
        helpersNeeded: num(x.helpersNeeded), deliveryChargeBase: num(x.deliveryChargeBase), isCustomizable: x.isCustomizable,
        customLeadTimeDays: x.isCustomizable ? num(x.customLeadTimeDays) : undefined, warrantyMonths: num(x.warrantyMonths),
        isTermiteProof: x.isTermiteProof, isWaterResistant: x.isWaterResistant, showroomLocation: opt(x.showroomLocation), displayZone: opt(x.displayZone),
        collectionName: opt(x.collectionName), modelNumber: opt(x.modelNumber), isFeatured: x.isFeatured, isNewArrival: x.isNewArrival, isBestSeller: x.isBestSeller, notes: opt(x.notes),
      });
    },
  },
  steps: [
    basicStep<FurnitureExtra>(core, { extra: (ctx) => <Kind ctx={ctx} />, namePlaceholder: msg('Jaise: Sheesham double bed (Royal)') }),
    priceStep<FurnitureExtra>(core),
    buildStep,
    deliveryStep,
    stockStep<FurnitureExtra>(core, { quick: [1, 2, 4, 6] }),
  ],
  summary: (d) => {
    const x = d.extra;
    return [
      [t('Maal'), [x.categoryType ? categoryLabel(x.categoryType) : null, CONDITIONS[x.conditionType] ? t(CONDITIONS[x.conditionType].label) : null, x.primaryMaterial ? materialOf(x.primaryMaterial) : null].filter(Boolean).join(' · ')],
      ...((x.woodType || x.polishType) ? [[t('Lakri / polish'), [x.woodType, x.polishType, x.upholsteryFabric].filter(Boolean).join(' · ')] as [string, string]] : []),
      ...(x.requiresAssembly ? [[t('Fitting'), t('Fitting chahiye{{value}}', { value: x.assemblyChargeExtra ? t(' · Rs {{assemblyChargeExtra}}', { assemblyChargeExtra: x.assemblyChargeExtra }) : '' })] as [string, string]] : []),
    ];
  },
};

const line = (p?: FurnitureProductProfile) => (p ? [p.categoryType ? categoryLabel(p.categoryType) : null, p.woodType || (p.primaryMaterial ? materialOf(p.primaryMaterial) : null), p.polishType || p.colorName].filter(Boolean).join(' · ') : '');

registerInventoryIndustry({
  id: 'furniture',
  label: msg('Furniture'),
  list: {
    noun: 'item',
    filters: ['tags'],
    useSource: () => {
      const q = useQuery({ queryKey: [FURNITURE_KEYS.profiles], queryFn: () => furnitureProductsApi.list(), staleTime: 60_000 });
      return new Map<string, FurnitureProductProfile>((q.data ?? []).map((p) => [p.productId, p]));
    },
    extras: (item, ctx) => {
      const p = (ctx.source as Map<string, FurnitureProductProfile> | undefined)?.get(item.id);
      if (!p) return {};
      const cond = p.conditionType !== 'BRAND_NEW' ? CONDITIONS[p.conditionType] : undefined;
      return {
        line: line(p) || undefined,
        badges: [
          ...(cond ? [{ label: t(cond.label), tone: 'warning' as const }] : []),
          ...(p.requiresAssembly ? [{ label: t('Fitting'), tone: 'info' as const }] : []),
          ...(p.isCustomizable ? [{ label: t('Order par bhi'), tone: 'accent' as const }] : []),
        ],
      };
    },
    actions: [
      { icon: ClipboardList, label: msg('Custom orders'), href: '/furniture/custom-orders' },
      { icon: Truck, label: msg('Deliveries'), href: '/furniture/deliveries' },
    ],
    stockChips: () => [1, 2, 4, 6],
    guide: [
      { icon: Sofa, title: msg('Showroom ka maal'), text: msg('Jo furniture tayyar pada hai wo yahan — counter par bikta hai. Order par banne wala Custom orders me.') },
      { icon: Palette, title: msg('Rang aur kapra'), text: msg('Ek design kai rang me ho to Edit → Price me variants banayein — har rang ka stock alag.') },
      { icon: Truck, title: msg('Delivery'), text: msg('Bill ke baad counter se hi delivery banti hai — fitting aur gaari ke charges ke saath.') },
    ],
  },
  editor,
  detail: {
    extra: { key: 'furniture-product-detail', load: (id) => furnitureProductsApi.byProduct(id).catch(() => null) },
    badges: ({ extra }) => {
      const p = extra as FurnitureProductProfile | null | undefined;
      if (!p) return [];
      const c = CONDITIONS[p.conditionType];
      return [
        ...(p.categoryType ? [{ label: categoryLabel(p.categoryType), tone: 'warning' as const }] : []),
        ...(c ? [{ label: t(c.label), tone: c.tone }] : []),
        ...(p.requiresAssembly ? [{ label: t('Fitting'), tone: 'info' as const }] : []),
      ];
    },
    facts: ({ extra }) => {
      const p = extra as FurnitureProductProfile | null | undefined;
      if (!p) return [];
      const rows: Array<[string, string | undefined]> = [
        [t('Material'), p.primaryMaterial ? materialOf(p.primaryMaterial) : undefined], [t('Lakri'), p.woodType], [t('Polish'), p.polishType], [t('Rang'), p.colorName],
        [t('Kapra'), p.upholsteryFabric], [t('Gaddi'), p.cushionFilling], [t('Size'), sizeText(p) || undefined],
        [t('Baithne wale'), p.seatingCapacity ? String(p.seatingCapacity) : undefined], [t('Daraz'), p.drawersCount ? String(p.drawersCount) : undefined],
        [t('Warranty'), p.warrantyMonths ? t('{{n}} mahine', { n: p.warrantyMonths }) : undefined], [t('Deemak'), p.isTermiteProof ? t('Mehfooz') : undefined],
        [t('Showroom'), [p.showroomLocation, p.displayZone].filter(Boolean).join(' · ') || undefined],
        [t('Order par'), p.isCustomizable ? t('Haan{{value}}', { value: p.customLeadTimeDays ? t(' · {{customLeadTimeDays}} din', { customLeadTimeDays: p.customLeadTimeDays }) : '' }) : undefined],
        ['MRP', p.mrp ? formatMoney(p.mrp) : undefined],
      ];
      return rows.filter((r): r is [string, string] => !!r[1]);
    },
    tile: ({ extra }) => {
      const p = extra as FurnitureProductProfile | null | undefined;
      return p ? {
        label: t('Delivery'), value: p.deliveryChargeBase ? formatMoney(p.deliveryChargeBase) : t('Likha nahi'),
        hint: [p.requiresAssembly ? t('Fitting {{value}}', { value: p.assemblyChargeExtra ? formatMoney(p.assemblyChargeExtra) : t('free') }) : null, p.requiresLargeVehicle ? t('Bari gaari') : null, p.helpersNeeded ? t('{{n}} helper', { n: p.helpersNeeded }) : null].filter(Boolean).join(' · ') || undefined,
      } : null;
    },
    stockChips: [1, 2, 4, 6],
  },
});
