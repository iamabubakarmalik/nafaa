/**
 * Furniture item editor on the shared product editor: what it is (sofa, bed,
 * almari…), condition (new, showroom piece), wood, polish, fabric and size,
 * fitting and delivery needs, warranty, and where it stands in the showroom.
 * Colours and fabrics are variants, each with its own stock.
 */

import { useCategoryKindSync } from '@modules/inventory/categories/lib/kinds';
import { Hammer, Palette, Ruler, Sofa, Star, Truck } from 'lucide-react';
import { ProductEditorPage } from '@modules/inventory/products/editor/ProductEditorPage';
import { basicStep, priceStep, stockStep } from '@modules/inventory/products/editor/coreSteps';
import { Chip, NumberField, Section, TextField, Tiles, Toggle } from '@modules/inventory/products/editor/fields';
import type { CoreOptions, EditorConfig, StepContext, StepDef } from '@modules/inventory/products/editor/types';
import { furnitureProductsApi, type FurnitureConditionType, type FurnitureProductProfile } from '../api/products.api';
import { CATEGORY_GROUPS, CONDITIONS, FABRICS, FURNITURE_KEYS, MATERIALS, POLISHES, WOODS, categoryLabel, materialOf } from '../lib/meta';
import { t } from '@core/i18n';

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
const opt = (v: string) => v.trim() || undefined;
const num = (v: number | null) => (v != null && Number.isFinite(v) ? v : undefined);

function Kind({ ctx }: { ctx: StepContext<FurnitureExtra> }) {
  // The furniture type follows the shop category's kind; there is no separate picker.
  useCategoryKindSync(ctx.draft.core.categoryId, ctx.draft.extra.categoryType, (categoryType) => ctx.setExtra({ categoryType }));
  return null;
}

function Build({ ctx }: { ctx: StepContext<FurnitureExtra> }) {
  const x = ctx.draft.extra;
  const set = ctx.setExtra;
  return (
    <div className="space-y-4">
      <Section icon={Sofa} title={t('Halat')} hint={t('Display piece aksar kam qeemat par bikta hai')}>
        <Tiles value={x.conditionType} onChange={(conditionType) => set({ conditionType })} columns="grid-cols-2 sm:grid-cols-5"
          options={(['BRAND_NEW', 'DISPLAY_MODEL', 'FLOOR_MODEL', 'REFURBISHED', 'PRE_OWNED'] as FurnitureConditionType[]).map((c) => ({ value: c, label: CONDITIONS[c].label }))} />
      </Section>
      <Section icon={Palette} title={t('Lakri, polish aur kapra')} hint={t('Customer sab se pehle yahi poochta hai')}>
        <p className="mb-1 text-[0.75rem] font-semibold text-slate-500">{t('Main material')}</p>
        <div className="flex flex-wrap gap-1.5">{MATERIAL_TILES.map((m) => <Chip key={m} on={x.primaryMaterial === m} onClick={() => set({ primaryMaterial: x.primaryMaterial === m ? '' : m })}>{MATERIALS[m]}</Chip>)}</div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <TextField label={t('Lakri')} value={x.woodType} onChange={(woodType) => set({ woodType })} placeholder={t('Sheesham')} />
          <TextField label={t('Polish')} value={x.polishType} onChange={(polishType) => set({ polishType })} placeholder={t('Walnut matte')} />
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">{WOODS.map((v) => <Chip key={v} on={x.woodType === v} onClick={() => set({ woodType: x.woodType === v ? '' : v })}>{v}</Chip>)}</div>
        <div className="mt-2 flex flex-wrap gap-1.5">{POLISHES.map((v) => <Chip key={v} on={x.polishType === v} onClick={() => set({ polishType: x.polishType === v ? '' : v })}>{v}</Chip>)}</div>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <TextField label={t('Rang')} value={x.colorName} onChange={(colorName) => set({ colorName })} placeholder={t('Dark brown')} />
          <TextField label={t('Kapra')} value={x.upholsteryFabric} onChange={(upholsteryFabric) => set({ upholsteryFabric })} placeholder={t('Velvet')} />
          <TextField label={t('Gaddi ke andar')} value={x.cushionFilling} onChange={(cushionFilling) => set({ cushionFilling })} placeholder={t('Foam')} />
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {FABRICS.map((v) => <Chip key={v} on={x.upholsteryFabric === v} onClick={() => set({ upholsteryFabric: x.upholsteryFabric === v ? '' : v })}>{v}</Chip>)}
          {FILLINGS.map((v) => <Chip key={v} on={x.cushionFilling === v} onClick={() => set({ cushionFilling: x.cushionFilling === v ? '' : v })}>{v}</Chip>)}
        </div>
        <p className="mt-2 text-[0.75rem] text-slate-500">{t('Ek hi design kai rang ya kapre me ho to Price step me variants banayein — har rang ka apna stock.')}</p>
      </Section>
      <Section icon={Ruler} title={t('Size')} hint={t('cm me — customer kamre ka size milata hai')}>
        <div className="grid gap-3 sm:grid-cols-3">
          <NumberField label={t('Lambai (cm)')} allowEmpty value={x.lengthCm} onChange={(lengthCm) => set({ lengthCm })} />
          <NumberField label={t('Chaurai (cm)')} allowEmpty value={x.widthCm} onChange={(widthCm) => set({ widthCm })} />
          <NumberField label={t('Unchai (cm)')} allowEmpty value={x.heightCm} onChange={(heightCm) => set({ heightCm })} />
          <NumberField label={t('Kitne log baithte')} allowEmpty value={x.seatingCapacity} onChange={(v) => set({ seatingCapacity: v == null ? null : Math.max(0, Math.round(v)) })} hint={t('Sofa / dining')} />
          <NumberField label={t('Daraz')} allowEmpty value={x.drawersCount} onChange={(v) => set({ drawersCount: v == null ? null : Math.max(0, Math.round(v)) })} />
          <NumberField label={t('Wazan (kg)')} allowEmpty value={x.weightKg} onChange={(weightKg) => set({ weightKg })} />
        </div>
      </Section>
    </div>
  );
}

function Delivery({ ctx }: { ctx: StepContext<FurnitureExtra> }) {
  const x = ctx.draft.extra;
  const set = ctx.setExtra;
  return (
    <div className="space-y-4">
      <Section icon={Truck} title={t('Delivery aur fitting')} hint={t('Delivery banate waqt yahi charges khud aate hain')}>
        <div className="grid gap-2 sm:grid-cols-2">
          <Toggle on={x.requiresAssembly} onChange={(requiresAssembly) => set({ requiresAssembly })} icon={Hammer} title={t('Ghar par fitting chahiye')} hint={t('Bed, almari, dining')} />
          <Toggle on={x.requiresLargeVehicle} onChange={(requiresLargeVehicle) => set({ requiresLargeVehicle })} icon={Truck} title={t('Bari gaari chahiye')} hint={t('Shehzore / Mazda')} />
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {x.requiresAssembly && <NumberField label={t('Fitting charge')} prefix="Rs" allowEmpty value={x.assemblyChargeExtra} onChange={(assemblyChargeExtra) => set({ assemblyChargeExtra })} hint={t('0 = free')} />}
          <NumberField label={t('Delivery charge')} prefix="Rs" allowEmpty value={x.deliveryChargeBase} onChange={(deliveryChargeBase) => set({ deliveryChargeBase })} hint={t('Shehar ke andar')} />
          <NumberField label={t('Helper')} allowEmpty value={x.helpersNeeded} onChange={(v) => set({ helpersNeeded: v == null ? null : Math.max(0, Math.round(v)) })} />
        </div>
      </Section>
      <Section icon={Star} title={t('Warranty aur order par')} hint={t('Bill aur product page par')}>
        <div className="grid gap-3 sm:grid-cols-3">
          <NumberField label={t('Warranty (mahine)')} allowEmpty value={x.warrantyMonths} onChange={(v) => set({ warrantyMonths: v == null ? null : Math.max(0, Math.round(v)) })} />
          <TextField label={t('Showroom me kahan')} value={x.showroomLocation} onChange={(showroomLocation) => set({ showroomLocation })} placeholder={t('Ground floor')} />
          <TextField label={t('Section')} value={x.displayZone} onChange={(displayZone) => set({ displayZone })} placeholder={t('Bed room corner')} />
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <Toggle on={x.isTermiteProof} onChange={(isTermiteProof) => set({ isTermiteProof })} title={t('Deemak se mehfooz')} />
          <Toggle on={x.isWaterResistant} onChange={(isWaterResistant) => set({ isWaterResistant })} title={t('Paani se kharab nahi')} />
          <Toggle on={x.isCustomizable} onChange={(isCustomizable) => set({ isCustomizable })} title={t('Size / rang badal kar bana dete hain')} hint={t('Custom order par')} />
          {x.isCustomizable && <NumberField label={t('Order par kitne din')} allowEmpty value={x.customLeadTimeDays} onChange={(v) => set({ customLeadTimeDays: v == null ? null : Math.max(1, Math.round(v)) })} />}
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <Toggle on={x.isFeatured} onChange={(isFeatured) => set({ isFeatured })} title={t('Khaas')} hint={t('Aage dikhayein')} />
          <Toggle on={x.isNewArrival} onChange={(isNewArrival) => set({ isNewArrival })} title={t('Naya design')} />
          <Toggle on={x.isBestSeller} onChange={(isBestSeller) => set({ isBestSeller })} title={t('Zyada bikne wala')} />
        </div>
      </Section>
    </div>
  );
}

const core: CoreOptions = {
  units: [{ value: 'pcs', label: t('Adad (pcs)') }, { value: 'set', label: t('Set') }, { value: 'sqft', label: t('Sq. ft') }],
  skuPrefix: 'FR',
  packs: false,
  variants: { presets: [{ group: t('Rang'), values: ['Walnut', 'Dark brown', 'White', 'Black', 'Natural'] }, { group: t('Kapra'), values: ['Velvet', 'Jute', 'Leather', 'Rexine'] }, { group: t('Size'), values: ['Single', 'Double', 'King', 'Queen'] }] },
  batches: false,
  markups: [15, 20, 30, 40],
};

const buildStep: StepDef<FurnitureExtra> = { id: 'furniture', title: t('Banawat'), hint: t('Lakri, polish, kapra, size'), icon: Palette, render: (ctx) => <Build ctx={ctx} /> };
const deliveryStep: StepDef<FurnitureExtra> = { id: 'delivery', title: t('Delivery'), hint: t('Fitting, gaari, warranty'), icon: Truck, render: (ctx) => <Delivery ctx={ctx} /> };

const config: EditorConfig<FurnitureExtra> = {
  label: t('Furniture'),
  draftKey: 'nafaa.product-editor.furniture',
  paths: { list: '/products', detail: (id) => `/furniture-products/${id}`, create: '/furniture-products/new' },
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
    basicStep<FurnitureExtra>(core, {
      extra: (ctx) => <Kind ctx={ctx} />, namePlaceholder: t('Jaise: Sheesham double bed (Royal)'),
      categorySuggestions: ['Bed room', 'Sofa', 'Dining', 'Office', 'Almari', 'Decor'],
    }),
    priceStep<FurnitureExtra>(core),
    buildStep,
    deliveryStep,
    stockStep<FurnitureExtra>(core, { quick: [1, 2, 4, 6] }),
  ],
  summary: (d) => {
    const x = d.extra;
    return (
      <div className="mt-3 space-y-1 border-t border-slate-100 pt-3 text-[0.8125rem]">
        <p className="text-slate-700">{[x.categoryType ? categoryLabel(x.categoryType) : null, CONDITIONS[x.conditionType]?.label, x.primaryMaterial ? materialOf(x.primaryMaterial) : null].filter(Boolean).join(' · ')}</p>
        {(x.woodType || x.polishType) && <p className="text-slate-600">{[x.woodType, x.polishType, x.upholsteryFabric].filter(Boolean).join(' · ')}</p>}
        {x.requiresAssembly && <p className="text-sky-700">{t('Fitting chahiye{{value}}', { value: x.assemblyChargeExtra ? t(' · Rs {{assemblyChargeExtra}}', { assemblyChargeExtra: x.assemblyChargeExtra }) : '' })}</p>}
      </div>
    );
  },
  refresh: [FURNITURE_KEYS.profiles, 'furniture-product-detail'],
  guide: [
    { icon: Palette, color: '#a16207', title: t('Lakri aur polish'), text: t('Lakri, polish aur kapra likhein — counter par naam ke neeche dikhta hai aur customer ka pehla sawal yahi hota hai.') },
    { icon: Sofa, color: '#7c3aed', title: t('Rang / kapra variants'), text: t('Ek design kai rang me ho to variants banayein — har rang ka apna stock aur barcode.') },
    { icon: Truck, color: '#0891b2', title: t('Delivery'), text: t('Fitting aur delivery charge yahan likhein — delivery banate waqt yaad dilata hai.') },
  ],
};

export default function FurnitureProductWizardPage() {
  return <ProductEditorPage config={config} />;
}
