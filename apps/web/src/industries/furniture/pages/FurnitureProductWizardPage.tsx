/**
 * Furniture item editor on the shared product editor: what it is (sofa, bed,
 * almari…), condition (new, showroom piece), wood, polish, fabric and size,
 * fitting and delivery needs, warranty, and where it stands in the showroom.
 * Colours and fabrics are variants, each with its own stock.
 */

import { Hammer, Palette, Ruler, Sofa, Star, Truck } from 'lucide-react';
import { ProductEditorPage } from '@modules/inventory/products/editor/ProductEditorPage';
import { basicStep, priceStep, stockStep } from '@modules/inventory/products/editor/coreSteps';
import { Chip, NumberField, Section, TextField, Tiles, Toggle } from '@modules/inventory/products/editor/fields';
import type { CoreOptions, EditorConfig, StepContext, StepDef } from '@modules/inventory/products/editor/types';
import { furnitureProductsApi, type FurnitureConditionType, type FurnitureProductProfile } from '../api/products.api';
import { CATEGORY_GROUPS, CONDITIONS, FABRICS, FURNITURE_KEYS, MATERIALS, POLISHES, WOODS, categoryLabel, materialOf } from '../lib/meta';

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
  const x = ctx.draft.extra;
  return (
    <div className="space-y-2">
      <span className="block text-[0.8125rem] font-medium text-slate-700">Ye kya hai</span>
      {CATEGORY_GROUPS.map((g) => (
        <div key={g.id}>
          <p className="mb-1 text-[0.75rem] font-semibold text-slate-500">{g.label}</p>
          <div className="flex flex-wrap gap-1.5">
            {g.items.map(([v, l]) => <Chip key={v} on={x.categoryType === v} onClick={() => ctx.setExtra({ categoryType: x.categoryType === v ? '' : v })}>{l}</Chip>)}
          </div>
        </div>
      ))}
      <p className="text-[0.75rem] text-slate-500">Isi se counter ke filter (Sofa, Bed room, Dining) chalte hain. Order par banne wali cheez Custom orders me daalein.</p>
    </div>
  );
}

function Build({ ctx }: { ctx: StepContext<FurnitureExtra> }) {
  const x = ctx.draft.extra;
  const set = ctx.setExtra;
  return (
    <div className="space-y-4">
      <Section icon={Sofa} title="Halat" hint="Display piece aksar kam qeemat par bikta hai">
        <Tiles value={x.conditionType} onChange={(conditionType) => set({ conditionType })} columns="grid-cols-2 sm:grid-cols-5"
          options={(['BRAND_NEW', 'DISPLAY_MODEL', 'FLOOR_MODEL', 'REFURBISHED', 'PRE_OWNED'] as FurnitureConditionType[]).map((c) => ({ value: c, label: CONDITIONS[c].label }))} />
      </Section>
      <Section icon={Palette} title="Lakri, polish aur kapra" hint="Customer sab se pehle yahi poochta hai">
        <p className="mb-1 text-[0.75rem] font-semibold text-slate-500">Main material</p>
        <div className="flex flex-wrap gap-1.5">{MATERIAL_TILES.map((m) => <Chip key={m} on={x.primaryMaterial === m} onClick={() => set({ primaryMaterial: x.primaryMaterial === m ? '' : m })}>{MATERIALS[m]}</Chip>)}</div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <TextField label="Lakri" value={x.woodType} onChange={(woodType) => set({ woodType })} placeholder="Sheesham" />
          <TextField label="Polish" value={x.polishType} onChange={(polishType) => set({ polishType })} placeholder="Walnut matte" />
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">{WOODS.map((v) => <Chip key={v} on={x.woodType === v} onClick={() => set({ woodType: x.woodType === v ? '' : v })}>{v}</Chip>)}</div>
        <div className="mt-2 flex flex-wrap gap-1.5">{POLISHES.map((v) => <Chip key={v} on={x.polishType === v} onClick={() => set({ polishType: x.polishType === v ? '' : v })}>{v}</Chip>)}</div>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <TextField label="Rang" value={x.colorName} onChange={(colorName) => set({ colorName })} placeholder="Dark brown" />
          <TextField label="Kapra" value={x.upholsteryFabric} onChange={(upholsteryFabric) => set({ upholsteryFabric })} placeholder="Velvet" />
          <TextField label="Gaddi ke andar" value={x.cushionFilling} onChange={(cushionFilling) => set({ cushionFilling })} placeholder="Foam" />
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {FABRICS.map((v) => <Chip key={v} on={x.upholsteryFabric === v} onClick={() => set({ upholsteryFabric: x.upholsteryFabric === v ? '' : v })}>{v}</Chip>)}
          {FILLINGS.map((v) => <Chip key={v} on={x.cushionFilling === v} onClick={() => set({ cushionFilling: x.cushionFilling === v ? '' : v })}>{v}</Chip>)}
        </div>
        <p className="mt-2 text-[0.75rem] text-slate-500">Ek hi design kai rang ya kapre me ho to Price step me variants banayein — har rang ka apna stock.</p>
      </Section>
      <Section icon={Ruler} title="Size" hint="cm me — customer kamre ka size milata hai">
        <div className="grid gap-3 sm:grid-cols-3">
          <NumberField label="Lambai (cm)" allowEmpty value={x.lengthCm} onChange={(lengthCm) => set({ lengthCm })} />
          <NumberField label="Chaurai (cm)" allowEmpty value={x.widthCm} onChange={(widthCm) => set({ widthCm })} />
          <NumberField label="Unchai (cm)" allowEmpty value={x.heightCm} onChange={(heightCm) => set({ heightCm })} />
          <NumberField label="Kitne log baithte" allowEmpty value={x.seatingCapacity} onChange={(v) => set({ seatingCapacity: v == null ? null : Math.max(0, Math.round(v)) })} hint="Sofa / dining" />
          <NumberField label="Daraz" allowEmpty value={x.drawersCount} onChange={(v) => set({ drawersCount: v == null ? null : Math.max(0, Math.round(v)) })} />
          <NumberField label="Wazan (kg)" allowEmpty value={x.weightKg} onChange={(weightKg) => set({ weightKg })} />
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
      <Section icon={Truck} title="Delivery aur fitting" hint="Delivery banate waqt yahi charges khud aate hain">
        <div className="grid gap-2 sm:grid-cols-2">
          <Toggle on={x.requiresAssembly} onChange={(requiresAssembly) => set({ requiresAssembly })} icon={Hammer} title="Ghar par fitting chahiye" hint="Bed, almari, dining" />
          <Toggle on={x.requiresLargeVehicle} onChange={(requiresLargeVehicle) => set({ requiresLargeVehicle })} icon={Truck} title="Bari gaari chahiye" hint="Shehzore / Mazda" />
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {x.requiresAssembly && <NumberField label="Fitting charge" prefix="Rs" allowEmpty value={x.assemblyChargeExtra} onChange={(assemblyChargeExtra) => set({ assemblyChargeExtra })} hint="0 = free" />}
          <NumberField label="Delivery charge" prefix="Rs" allowEmpty value={x.deliveryChargeBase} onChange={(deliveryChargeBase) => set({ deliveryChargeBase })} hint="Shehar ke andar" />
          <NumberField label="Helper" allowEmpty value={x.helpersNeeded} onChange={(v) => set({ helpersNeeded: v == null ? null : Math.max(0, Math.round(v)) })} />
        </div>
      </Section>
      <Section icon={Star} title="Warranty aur order par" hint="Bill aur product page par">
        <div className="grid gap-3 sm:grid-cols-3">
          <NumberField label="Warranty (mahine)" allowEmpty value={x.warrantyMonths} onChange={(v) => set({ warrantyMonths: v == null ? null : Math.max(0, Math.round(v)) })} />
          <TextField label="Showroom me kahan" value={x.showroomLocation} onChange={(showroomLocation) => set({ showroomLocation })} placeholder="Ground floor" />
          <TextField label="Section" value={x.displayZone} onChange={(displayZone) => set({ displayZone })} placeholder="Bed room corner" />
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <Toggle on={x.isTermiteProof} onChange={(isTermiteProof) => set({ isTermiteProof })} title="Deemak se mehfooz" />
          <Toggle on={x.isWaterResistant} onChange={(isWaterResistant) => set({ isWaterResistant })} title="Paani se kharab nahi" />
          <Toggle on={x.isCustomizable} onChange={(isCustomizable) => set({ isCustomizable })} title="Size / rang badal kar bana dete hain" hint="Custom order par" />
          {x.isCustomizable && <NumberField label="Order par kitne din" allowEmpty value={x.customLeadTimeDays} onChange={(v) => set({ customLeadTimeDays: v == null ? null : Math.max(1, Math.round(v)) })} />}
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <Toggle on={x.isFeatured} onChange={(isFeatured) => set({ isFeatured })} title="Khaas" hint="Aage dikhayein" />
          <Toggle on={x.isNewArrival} onChange={(isNewArrival) => set({ isNewArrival })} title="Naya design" />
          <Toggle on={x.isBestSeller} onChange={(isBestSeller) => set({ isBestSeller })} title="Zyada bikne wala" />
        </div>
      </Section>
    </div>
  );
}

const core: CoreOptions = {
  units: [{ value: 'pcs', label: 'Adad (pcs)' }, { value: 'set', label: 'Set' }, { value: 'sqft', label: 'Sq. ft' }],
  skuPrefix: 'FR',
  packs: false,
  variants: { presets: [{ group: 'Rang', values: ['Walnut', 'Dark brown', 'White', 'Black', 'Natural'] }, { group: 'Kapra', values: ['Velvet', 'Jute', 'Leather', 'Rexine'] }, { group: 'Size', values: ['Single', 'Double', 'King', 'Queen'] }] },
  batches: false,
  markups: [15, 20, 30, 40],
};

const buildStep: StepDef<FurnitureExtra> = { id: 'furniture', title: 'Banawat', hint: 'Lakri, polish, kapra, size', icon: Palette, render: (ctx) => <Build ctx={ctx} /> };
const deliveryStep: StepDef<FurnitureExtra> = { id: 'delivery', title: 'Delivery', hint: 'Fitting, gaari, warranty', icon: Truck, render: (ctx) => <Delivery ctx={ctx} /> };

const config: EditorConfig<FurnitureExtra> = {
  label: 'Furniture',
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
      extra: (ctx) => <Kind ctx={ctx} />, namePlaceholder: 'Jaise: Sheesham double bed (Royal)',
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
        {x.requiresAssembly && <p className="text-sky-700">Fitting chahiye{x.assemblyChargeExtra ? ` · Rs ${x.assemblyChargeExtra}` : ''}</p>}
      </div>
    );
  },
  refresh: [FURNITURE_KEYS.profiles, 'furniture-product-detail'],
  guide: [
    { icon: Palette, color: '#a16207', title: 'Lakri aur polish', text: 'Lakri, polish aur kapra likhein — counter par naam ke neeche dikhta hai aur customer ka pehla sawal yahi hota hai.' },
    { icon: Sofa, color: '#7c3aed', title: 'Rang / kapra variants', text: 'Ek design kai rang me ho to variants banayein — har rang ka apna stock aur barcode.' },
    { icon: Truck, color: '#0891b2', title: 'Delivery', text: 'Fitting aur delivery charge yahan likhein — delivery banate waqt yaad dilata hai.' },
  ],
};

export default function FurnitureProductWizardPage() {
  return <ProductEditorPage config={config} />;
}
