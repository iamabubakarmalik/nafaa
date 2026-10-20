/**
 * Pet shop item editor on the shared product editor: what kind of item it
 * is (food, medicine, care, gear, aquarium), which animal and age it is
 * for, brand, pack and flavour; medicines add the active ingredient,
 * dose and whether a vet's slip is needed. Food sells by pack or loose by
 * weight through units and packs; medicine expiry is kept per batch.
 */

import { Bone, HeartPulse, PawPrint, Pill } from 'lucide-react';
import { ProductEditorPage } from '@modules/inventory/products/editor/ProductEditorPage';
import { basicStep, priceStep, stockStep } from '@modules/inventory/products/editor/coreSteps';
import { Chip, NumberField, Section, TextField, Toggle } from '@modules/inventory/products/editor/fields';
import type { CoreOptions, EditorConfig, Errors, StepContext, StepDef } from '@modules/inventory/products/editor/types';
import { petProductsApi, type PetCategoryType, type PetLifeStage, type PetSpeciesType } from '../api/products.api';
import { CATEGORY_GROUPS, LIFE_STAGE, PET_KEYS, SPECIES, categoryGroup, categoryLabel, speciesLabel } from '../lib/meta';

interface PetExtra {
  categoryType: PetCategoryType | '';
  species: PetSpeciesType | '';
  lifeStage: PetLifeStage | '';
  brand: string; packSize: string; flavor: string; weightKg: number | null;
  isGrainFree: boolean; isPrescriptionOnly: boolean;
  activeIngredient: string; dosageForm: string; dosageStrength: string; storageInstructions: string;
  size: string; material: string; tankCapacityLiters: number | null;
}

const initial: PetExtra = {
  categoryType: '', species: '', lifeStage: '', brand: '', packSize: '', flavor: '', weightKg: null,
  isGrainFree: false, isPrescriptionOnly: false, activeIngredient: '', dosageForm: '', dosageStrength: '', storageInstructions: '',
  size: '', material: '', tankCapacityLiters: null,
};

const BRANDS = ['Royal Canin', 'Pedigree', 'Whiskas', 'Drools', 'Me-O', 'Purina', 'Reflex'];
const FORMS = ['Tablet', 'Syrup', 'Injection', 'Drops', 'Spray', 'Powder'];
const SIZES = ['Chhota', 'Darmiyana', 'Bara', 'XL'];
const opt = (v: string) => v.trim() || undefined;
const num = (v: number | null) => (v != null && Number.isFinite(v) ? v : undefined);

function Kind({ ctx }: { ctx: StepContext<PetExtra> }) {
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
      <p className="text-[0.75rem] text-slate-500">Isi se counter ke filter (khana, dawai, aquarium) chalte hain.</p>
    </div>
  );
}

function Details({ ctx }: { ctx: StepContext<PetExtra> }) {
  const x = ctx.draft.extra;
  const set = ctx.setExtra;
  const group = categoryGroup(x.categoryType || null);
  return (
    <div className="space-y-4">
      <Section icon={PawPrint} title="Kis janwar ke liye" hint="Counter par janwar ka naam likhne se ye cheez milti hai">
        <div className="flex flex-wrap gap-1.5">
          {(Object.keys(SPECIES) as Array<keyof typeof SPECIES>).map((k) => <Chip key={k} on={x.species === k} onClick={() => set({ species: x.species === k ? '' : k })}>{SPECIES[k].emoji} {SPECIES[k].label}</Chip>)}
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {(Object.keys(LIFE_STAGE) as PetLifeStage[]).map((k) => <Chip key={k} on={x.lifeStage === k} onClick={() => set({ lifeStage: x.lifeStage === k ? '' : k })}>{LIFE_STAGE[k]}</Chip>)}
        </div>
      </Section>
      <Section icon={Bone} title="Brand aur pack" hint="Bill aur counter par naam ke neeche dikhta hai">
        <div className="grid gap-3 sm:grid-cols-3">
          <TextField label="Brand" value={x.brand} onChange={(brand) => set({ brand })} placeholder="Royal Canin" />
          <TextField label="Pack" value={x.packSize} onChange={(packSize) => set({ packSize })} placeholder="1.5 kg, 400 g" />
          {group === 'food' && <TextField label="Flavour" value={x.flavor} onChange={(flavor) => set({ flavor })} placeholder="Chicken, fish" />}
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">{BRANDS.map((b) => <Chip key={b} on={x.brand === b} onClick={() => set({ brand: x.brand === b ? '' : b })}>{b}</Chip>)}</div>
        {group === 'food' && (
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <NumberField label="Ek pack ka wazan" allowEmpty value={x.weightKg} onChange={(weightKg) => set({ weightKg })} suffix="kg" error={ctx.errors.weightKg} hint="Khula bechna ho to Price step me kg unit jorein" />
            <Toggle on={x.isGrainFree} onChange={(isGrainFree) => set({ isGrainFree })} title="Grain free" />
          </div>
        )}
      </Section>
      {group === 'medicine' && (
        <Section icon={HeartPulse} title="Dawai" hint="Expiry har batch ki Stock step me likhein">
          <div className="grid gap-3 sm:grid-cols-3">
            <TextField label="Asal dawa (salt)" value={x.activeIngredient} onChange={(activeIngredient) => set({ activeIngredient })} placeholder="Ivermectin" />
            <TextField label="Taqat" value={x.dosageStrength} onChange={(dosageStrength) => set({ dosageStrength })} placeholder="10 mg" />
            <TextField label="Shakal" value={x.dosageForm} onChange={(dosageForm) => set({ dosageForm })} placeholder="Tablet" />
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">{FORMS.map((f) => <Chip key={f} on={x.dosageForm === f} onClick={() => set({ dosageForm: x.dosageForm === f ? '' : f })}>{f}</Chip>)}</div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <Toggle on={x.isPrescriptionOnly} onChange={(isPrescriptionOnly) => set({ isPrescriptionOnly })} icon={Pill} title="Doctor ki parchi par" hint="Counter par yaad dilata hai" />
            <TextField label="Kaise rakhein (marzi)" value={x.storageInstructions} onChange={(storageInstructions) => set({ storageInstructions })} placeholder="Fridge me" />
          </div>
        </Section>
      )}
      {(group === 'gear' || group === 'aquarium') && (
        <Section title="Size" hint="Patta, bistar, pinjra ya tank">
          <div className="grid gap-3 sm:grid-cols-3">
            <TextField label="Size" value={x.size} onChange={(size) => set({ size })} placeholder="Darmiyana" />
            <TextField label="Material" value={x.material} onChange={(material) => set({ material })} placeholder="Leather, steel" />
            {group === 'aquarium' && <NumberField label="Tank" allowEmpty value={x.tankCapacityLiters} onChange={(tankCapacityLiters) => set({ tankCapacityLiters })} suffix="litre" />}
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">{SIZES.map((v) => <Chip key={v} on={x.size === v} onClick={() => set({ size: x.size === v ? '' : v })}>{v}</Chip>)}</div>
        </Section>
      )}
    </div>
  );
}

const core: CoreOptions = {
  units: [
    { value: 'pcs', label: 'Adad' }, { value: 'pack', label: 'Pack' }, { value: 'kg', label: 'Kg (khula khana)' }, { value: 'g', label: 'Gram' },
    { value: 'l', label: 'Litre' }, { value: 'ml', label: 'ml' },
  ],
  skuPrefix: 'PS',
  packs: true,
  variants: { presets: [{ group: 'Size', values: SIZES }, { group: 'Flavour', values: ['Chicken', 'Fish', 'Beef', 'Lamb'] }] },
  batches: true,
  markups: [15, 25, 35, 50],
};

const detailsStep: StepDef<PetExtra> = {
  id: 'pet', title: 'Janwar aur tafseel', hint: 'Kis ke liye, brand, dawai', icon: PawPrint, render: (ctx) => <Details ctx={ctx} />,
  validate: (d) => {
    const e: Errors = {};
    if (d.extra.weightKg != null && (d.extra.weightKg <= 0 || d.extra.weightKg > 100)) e.weightKg = '0 se 100 kg';
    return e;
  },
};

const config: EditorConfig<PetExtra> = {
  label: 'Pet shop',
  draftKey: 'nafaa.product-editor.petshop',
  paths: { list: '/products', detail: (id) => `/petshop-products/${id}`, create: '/petshop-products/new' },
  core,
  extra: {
    initial,
    load: async (productId) => {
      const p = await petProductsApi.byProduct(productId).catch(() => null);
      if (!p) return {};
      return {
        categoryType: p.categoryType ?? '', species: p.species ?? '', lifeStage: p.lifeStage ?? '', brand: p.brand ?? '', packSize: p.packSize ?? '',
        flavor: p.flavor ?? '', weightKg: p.weightKg ?? null, isGrainFree: p.isGrainFree, isPrescriptionOnly: p.isPrescriptionOnly,
        activeIngredient: p.activeIngredient ?? '', dosageForm: p.dosageForm ?? '', dosageStrength: p.dosageStrength ?? '',
        storageInstructions: p.storageInstructions ?? '', size: p.size ?? '', material: p.material ?? '', tankCapacityLiters: p.tankCapacityLiters ?? null,
      };
    },
    save: async (productId, d) => {
      const x = d.extra;
      const body = {
        productId, categoryType: x.categoryType || undefined, species: x.species || undefined, lifeStage: x.lifeStage || undefined,
        brand: opt(x.brand), packSize: opt(x.packSize), flavor: opt(x.flavor), weightKg: num(x.weightKg), isGrainFree: x.isGrainFree,
        isPrescriptionOnly: x.isPrescriptionOnly, activeIngredient: opt(x.activeIngredient), dosageForm: opt(x.dosageForm),
        dosageStrength: opt(x.dosageStrength), storageInstructions: opt(x.storageInstructions), size: opt(x.size), material: opt(x.material),
        tankCapacityLiters: num(x.tankCapacityLiters), costPrice: num(d.core.costPrice), retailPrice: num(d.core.price),
      };
      await petProductsApi.upsert(Object.fromEntries(Object.entries(body).filter(([, v]) => v !== undefined)));
    },
  },
  steps: [
    basicStep<PetExtra>(core, {
      extra: (ctx) => <Kind ctx={ctx} />,
      namePlaceholder: 'Jaise: Royal Canin Persian Adult 2kg',
      categorySuggestions: ['Billi ka khana', 'Kutte ka khana', 'Dawai', 'Saman', 'Aquarium'],
    }),
    detailsStep,
    priceStep<PetExtra>(core),
    stockStep<PetExtra>(core, { quick: [5, 10, 20, 50] }),
  ],
  summary: (d) => {
    const x = d.extra;
    const facts = [x.categoryType ? categoryLabel(x.categoryType) : null, x.species ? speciesLabel(x.species) : null, x.lifeStage ? LIFE_STAGE[x.lifeStage] : null, x.brand, x.packSize].filter(Boolean);
    return facts.length ? <p className="mt-3 border-t border-slate-100 pt-3 text-[0.8125rem] text-slate-700">{facts.join(' · ')}</p> : null;
  },
  refresh: [PET_KEYS.profiles, 'petshop-product-detail'],
  guide: [
    { icon: Bone, color: '#d97706', title: 'Khula khana', text: 'Base unit "kg" rakhein aur Price step me "Bori = 20 kg" pack jorein — bori aur khula dono bikta hai, stock kg me ginta hai.' },
    { icon: HeartPulse, color: '#e11d48', title: 'Dawai ki expiry', text: 'Dawai aur vaccine ki har batch ki expiry Stock step me likhein — counter par purani batch pehle nikalti hai.' },
    { icon: PawPrint, color: '#0284c7', title: 'Janwar', text: 'Zinda janwar yahan nahi, "Live animals" me darj karein — har janwar ka apna record aur bill.' },
  ],
};

export default function PetshopProductWizardPage() {
  return <ProductEditorPage config={config} />;
}
