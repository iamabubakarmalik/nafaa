/**
 * Toy editor on the shared product editor. A toy carries its type, age
 * range, brand and character, safety marks (small parts, certificates),
 * cells it needs and gift marks (Eid, birthday, gift wrap). Colours and
 * models are variants, packs (dozen, carton) come from the Price step.
 */

import { AlertTriangle, Baby, BatteryCharging, Gift, Moon, Radio, ShieldCheck, Sparkles } from 'lucide-react';
import { ProductEditorPage } from '@modules/inventory/products/editor/ProductEditorPage';
import { basicStep, priceStep, stockStep } from '@modules/inventory/products/editor/coreSteps';
import { Chip, NumberField, Section, TextField, Toggle } from '@modules/inventory/products/editor/fields';
import type { CoreOptions, EditorConfig, Errors, StepContext, StepDef } from '@modules/inventory/products/editor/types';
import { toyProductsApi, type ToyProductProfile, type ToyAgeGroup, type ToyCategoryType, type ToyGenderTarget, type ToySafetyCertification } from '../api/products.api';
import { AGE_GROUPS, BATTERIES, CATEGORIES, CATEGORY_GROUPS, CERTIFICATIONS, GENDERS, KEYS, ageText, labelOf } from '../lib/meta';

export interface ToyExtra {
  categoryType: string; ageGroup: string; ageGroups: string[]; ageMinYears: number | null; ageMaxYears: number | null; genderTarget: string;
  brand: string; characterFranchise: string; material: string; numberOfPieces: number | null; isEducational: boolean;
  requiresBatteries: boolean; batteriesIncluded: boolean; batteryType: string; batteryQuantity: number | null; isRemoteControlled: boolean;
  chokingHazard: boolean; smallPartsWarning: boolean; isNonToxic: boolean; safetyCertifications: string[];
  isEidGift: boolean; isBirthdayGift: boolean; giftWrapAvailable: boolean; warrantyMonths: number | null; mrp: number | null; notes: string;
}

const initial: ToyExtra = {
  categoryType: '', ageGroup: 'KIDS_5_8Y', ageGroups: [], ageMinYears: null, ageMaxYears: null, genderTarget: 'UNISEX',
  brand: '', characterFranchise: '', material: '', numberOfPieces: null, isEducational: false,
  requiresBatteries: false, batteriesIncluded: false, batteryType: '', batteryQuantity: null, isRemoteControlled: false,
  chokingHazard: false, smallPartsWarning: false, isNonToxic: true, safetyCertifications: [],
  isEidGift: false, isBirthdayGift: true, giftWrapAvailable: true, warrantyMonths: null, mrp: null, notes: '',
};

const opt = (v: string) => v.trim() || undefined;
const num = (v: number | null) => (v != null && Number.isFinite(v) ? v : undefined);
const toggle = (list: string[], v: string) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

/* ── Basic step addition: type and brand ── */
function Kind({ ctx }: { ctx: StepContext<ToyExtra> }) {
  const x = ctx.draft.extra;
  return (
    <div className="space-y-3">
      <div>
        <span className="mb-1.5 block text-[0.8125rem] font-medium text-slate-700">Khilone ka type</span>
        <div className="space-y-2">
          {CATEGORY_GROUPS.map((g) => (
            <div key={g.group} className="flex flex-wrap items-center gap-1.5">
              <span className="w-full text-[0.6875rem] font-semibold uppercase tracking-wide text-slate-400 sm:w-32">{g.group}</span>
              {g.items.map(([v, l]) => <Chip key={v} on={x.categoryType === v} onClick={() => ctx.setExtra({ categoryType: x.categoryType === v ? '' : v })}>{l}</Chip>)}
            </div>
          ))}
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <TextField label="Brand" value={x.brand} onChange={(brand) => ctx.setExtra({ brand })} placeholder="Hot Wheels, Barbie, Lego, local" />
        <TextField label="Character" value={x.characterFranchise} onChange={(characterFranchise) => ctx.setExtra({ characterFranchise })} placeholder="Spider-Man, Frozen, Doraemon" hint="Bachay isi naam se maangte hain — POS search me aata hai" />
      </div>
    </div>
  );
}

/* ── Toy step: age, safety, cells, gift marks ── */
function Toy({ ctx }: { ctx: StepContext<ToyExtra> }) {
  const x = ctx.draft.extra;
  const set = ctx.setExtra;
  const young = x.ageMinYears != null && x.ageMinYears < 3;
  return (
    <div className="space-y-4">
      <Section icon={Baby} title="Umar" hint="Kis umar ke bachay ke liye — POS ke umar chips aur Gift finder isi se chalte hain">
        <div className="flex flex-wrap gap-1.5">
          {AGE_GROUPS.map(([v, l]) => (
            <Chip key={v} on={x.ageGroup === v || x.ageGroups.includes(v)}
              onClick={() => (x.ageGroup === v ? set({ ageGroup: x.ageGroups[0] ?? 'ALL_AGES', ageGroups: x.ageGroups.slice(1) }) : x.ageGroups.includes(v) ? set({ ageGroups: toggle(x.ageGroups, v) }) : set({ ageGroups: [...x.ageGroups, v] }))}>
              {l}{x.ageGroup === v ? ' ★' : ''}
            </Chip>
          ))}
        </div>
        <p className="mt-1.5 text-[0.75rem] text-slate-500">★ asal umar hai; baqi chips bhi chun sakte hain jin me ye khilona chalta hai.</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <NumberField label="Kam se kam umar" allowEmpty value={x.ageMinYears} onChange={(ageMinYears) => set({ ageMinYears })} suffix="saal" error={ctx.errors.age} />
          <NumberField label="Zyada se zyada umar" allowEmpty value={x.ageMaxYears} onChange={(ageMaxYears) => set({ ageMaxYears })} suffix="saal" />
          <label className="block">
            <span className="mb-1.5 block text-[0.8125rem] font-medium text-slate-700">Kis ke liye</span>
            <div className="flex flex-wrap gap-1.5">{GENDERS.map(([v, l]) => <Chip key={v} on={x.genderTarget === v} onClick={() => set({ genderTarget: v })}>{l}</Chip>)}</div>
          </label>
        </div>
      </Section>

      <Section icon={ShieldCheck} title="Safety" hint="Chhote purze wale khilone 3 saal se chhote bachon ko na dein — POS par nishani aati hai">
        <div className="grid gap-2 sm:grid-cols-2">
          <Toggle on={x.chokingHazard} onChange={(chokingHazard) => set({ chokingHazard, smallPartsWarning: chokingHazard || x.smallPartsWarning })} icon={AlertTriangle} title="Chhote purze (gale me phans sakte hain)" hint="3 saal se kam umar ke liye nahi" />
          <Toggle on={x.isNonToxic} onChange={(isNonToxic) => set({ isNonToxic })} icon={ShieldCheck} title="Non-toxic" hint="Rang aur plastic bachon ke liye mehfooz" />
        </div>
        {young && x.chokingHazard && <p className="mt-2 rounded-xl bg-amber-50 px-3 py-2 text-[0.8125rem] text-amber-900 ring-1 ring-amber-200">Umar 3 saal se kam likhi hai magar chhote purze hain — dobara dekh lein.</p>}
        <span className="mb-1.5 mt-3 block text-[0.8125rem] font-medium text-slate-700">Certificate (dabbe par likha ho)</span>
        <div className="flex flex-wrap gap-1.5">
          {CERTIFICATIONS.map(([v, l]) => <Chip key={v} on={x.safetyCertifications.includes(v)} onClick={() => set({ safetyCertifications: toggle(x.safetyCertifications, v) })}>{l}</Chip>)}
        </div>
      </Section>

      <Section icon={BatteryCharging} title="Cell aur remote" hint="Cell dabbe me na hon to POS par yaad dilaya jata hai">
        <div className="grid gap-2 sm:grid-cols-2">
          <Toggle on={x.requiresBatteries} onChange={(requiresBatteries) => set({ requiresBatteries, batteriesIncluded: requiresBatteries && x.batteriesIncluded })} icon={BatteryCharging} title="Cell se chalta hai" />
          <Toggle on={x.isRemoteControlled} onChange={(isRemoteControlled) => set({ isRemoteControlled })} icon={Radio} title="Remote control" />
        </div>
        {x.requiresBatteries && (
          <div className="mt-3 space-y-3">
            <div className="flex flex-wrap gap-1.5">{BATTERIES.map((b) => <Chip key={b} on={x.batteryType === b} onClick={() => set({ batteryType: x.batteryType === b ? '' : b })}>{b}</Chip>)}</div>
            <div className="grid gap-3 sm:grid-cols-2">
              <NumberField label="Kitne cell" allowEmpty value={x.batteryQuantity} onChange={(batteryQuantity) => set({ batteryQuantity: batteryQuantity == null ? null : Math.round(batteryQuantity) })} error={ctx.errors.cells} />
              <Toggle on={x.batteriesIncluded} onChange={(batteriesIncluded) => set({ batteriesIncluded })} title="Cell dabbe me hain" />
            </div>
          </div>
        )}
      </Section>

      <Section icon={Sparkles} title="Aur tafseel">
        <div className="grid gap-3 sm:grid-cols-3">
          <TextField label="Material" value={x.material} onChange={(material) => set({ material })} placeholder="Plastic, lakri, kapra" />
          <NumberField label="Kitne piece" allowEmpty value={x.numberOfPieces} onChange={(numberOfPieces) => set({ numberOfPieces: numberOfPieces == null ? null : Math.round(numberOfPieces) })} hint="Puzzle, blocks" />
          <NumberField label="Warranty" allowEmpty value={x.warrantyMonths} onChange={(warrantyMonths) => set({ warrantyMonths: warrantyMonths == null ? null : Math.round(warrantyMonths) })} suffix="mahine" />
        </div>
        <div className="mt-3"><Toggle on={x.isEducational} onChange={(isEducational) => set({ isEducational })} title="Educational / seekhne wala" hint="Gift finder me school wale bachon ke liye upar aata hai" /></div>
      </Section>

      <Section icon={Gift} title="Gift" hint="Eid aur saalgirah ke season me in khilonon ki list alag dikhti hai">
        <div className="grid gap-2 sm:grid-cols-3">
          <Toggle on={x.isEidGift} onChange={(isEidGift) => set({ isEidGift })} icon={Moon} title="Eid gift" />
          <Toggle on={x.isBirthdayGift} onChange={(isBirthdayGift) => set({ isBirthdayGift })} icon={Gift} title="Saalgirah gift" />
          <Toggle on={x.giftWrapAvailable} onChange={(giftWrapAvailable) => set({ giftWrapAvailable })} title="Gift wrap ho sakta hai" />
        </div>
      </Section>
    </div>
  );
}

/* ── Price step addition: printed price ── */
function Mrp({ ctx }: { ctx: StepContext<ToyExtra> }) {
  return (
    <Section title="Dabbe par likhi qeemat (MRP)" hint="Marzi hai — receipt par bachat dikhane ke liye">
      <NumberField label="MRP" prefix="Rs" allowEmpty value={ctx.draft.extra.mrp} onChange={(mrp) => ctx.setExtra({ mrp })} error={ctx.errors.mrp} />
    </Section>
  );
}

const core: CoreOptions = {
  units: [{ value: 'pcs', label: 'Piece' }, { value: 'set', label: 'Set' }, { value: 'pack', label: 'Pack' }, { value: 'box', label: 'Box' }],
  skuPrefix: 'TOY',
  packs: true,
  variants: { presets: [
    { group: 'Rang', values: ['Red', 'Blue', 'Pink', 'Yellow', 'Green', 'Black', 'White'] },
    { group: 'Size', values: ['Small', 'Medium', 'Large'] },
  ] },
  batches: false,
  markups: [20, 30, 40, 50, 60],
};

function toyErrors(x: ToyExtra): Errors {
  const e: Errors = {};
  if ((x.ageMinYears ?? 0) < 0 || (x.ageMaxYears ?? 0) < 0) e.age = 'Umar manfi nahi ho sakti';
  else if (x.ageMinYears != null && x.ageMaxYears != null && x.ageMaxYears < x.ageMinYears) e.age = 'Zyada wali umar kam wali se choti hai';
  if (x.requiresBatteries && x.batteryQuantity != null && x.batteryQuantity < 1) e.cells = 'Kam se kam 1 cell';
  return e;
}

const toyStep: StepDef<ToyExtra> = { id: 'toy', title: 'Umar aur safety', hint: 'Umar, cell, gift', icon: Baby, render: (ctx) => <Toy ctx={ctx} />, validate: (d) => toyErrors(d.extra) };

const config: EditorConfig<ToyExtra> = {
  label: 'Toy shop',
  draftKey: 'nafaa.product-editor.toystore',
  paths: { list: '/products', detail: (id) => `/toystore-products/${id}`, create: '/toystore-products/new' },
  core,
  extra: {
    initial,
    load: async (productId) => {
      const p = await toyProductsApi.byProduct(productId).catch(() => null);
      if (!p) return {};
      return {
        categoryType: p.categoryType ?? '', ageGroup: p.ageGroup, ageGroups: (p.ageGroups ?? []).filter((a) => a !== p.ageGroup),
        ageMinYears: p.ageMinYears ?? null, ageMaxYears: p.ageMaxYears ?? null, genderTarget: p.genderTarget,
        brand: p.brand ?? '', characterFranchise: p.characterFranchise ?? '', material: p.material ?? '', numberOfPieces: p.numberOfPieces ?? null,
        isEducational: p.isEducational, requiresBatteries: p.requiresBatteries, batteriesIncluded: p.batteriesIncluded,
        batteryType: p.batteryType ?? '', batteryQuantity: p.batteryQuantity ?? null, isRemoteControlled: p.isRemoteControlled,
        chokingHazard: p.chokingHazard, smallPartsWarning: p.smallPartsWarning, isNonToxic: p.isNonToxic, safetyCertifications: p.safetyCertifications ?? [],
        isEidGift: p.isEidGift, isBirthdayGift: p.isBirthdayGift, giftWrapAvailable: p.giftWrapAvailable,
        warrantyMonths: p.warrantyMonths ?? null, mrp: p.mrp ?? null, notes: p.notes ?? '',
      };
    },
    save: async (productId, d) => {
      const x = d.extra;
      const profile = {
        productId, categoryType: (x.categoryType || undefined) as ToyCategoryType | undefined,
        ageGroup: x.ageGroup as ToyAgeGroup, ageGroups: [...new Set([x.ageGroup, ...x.ageGroups])] as ToyAgeGroup[],
        ageMinYears: num(x.ageMinYears), ageMaxYears: num(x.ageMaxYears), genderTarget: x.genderTarget as ToyGenderTarget,
        brand: opt(x.brand), characterFranchise: opt(x.characterFranchise), material: opt(x.material), numberOfPieces: num(x.numberOfPieces),
        isEducational: x.isEducational, requiresBatteries: x.requiresBatteries, batteriesIncluded: x.requiresBatteries && x.batteriesIncluded,
        batteryType: x.requiresBatteries ? opt(x.batteryType) : undefined, batteryQuantity: x.requiresBatteries ? num(x.batteryQuantity) : undefined,
        isRemoteControlled: x.isRemoteControlled, chokingHazard: x.chokingHazard, smallPartsWarning: x.smallPartsWarning, isNonToxic: x.isNonToxic,
        safetyCertifications: x.safetyCertifications as ToySafetyCertification[],
        isEidGift: x.isEidGift, isBirthdayGift: x.isBirthdayGift, giftWrapAvailable: x.giftWrapAvailable,
        warrantyMonths: num(x.warrantyMonths), mrp: num(x.mrp), retailPrice: d.core.price, costPrice: d.core.costPrice, notes: opt(x.notes),
      };
      await toyProductsApi.upsert(Object.fromEntries(Object.entries(profile).filter(([, v]) => v !== undefined)) as Partial<ToyProductProfile>);
    },
  },
  steps: [
    basicStep<ToyExtra>(core, {
      extra: (ctx) => <Kind ctx={ctx} />,
      namePlaceholder: 'Jaise: Remote car 1:18 ya Barbie doll',
      categorySuggestions: ['Gurya', 'Gaariyan', 'Puzzle aur games', 'Baby toys', 'Outdoor', 'Educational', 'Party saman'],
    }),
    toyStep,
    priceStep<ToyExtra>(core, { extra: (ctx) => <Mrp ctx={ctx} /> }),
    stockStep<ToyExtra>(core, { quick: [1, 6, 12, 24, 48] }),
  ].map((s): StepDef<ToyExtra> => (s.id === 'price'
    ? { ...s, validate: (d, e) => ({ ...s.validate?.(d, e), ...(d.extra.mrp != null && d.extra.mrp > 0 && d.extra.mrp < d.core.price ? { mrp: 'MRP bechne ki qeemat se kam hai' } : {}) }) }
    : s)),
  summary: (d) => {
    const x = d.extra;
    const facts = [ageText({ ageGroup: x.ageGroup, ageMinYears: x.ageMinYears, ageMaxYears: x.ageMaxYears }), labelOf(CATEGORIES, x.categoryType), x.brand].filter(Boolean);
    return (
      <div className="mt-3 space-y-1 border-t border-slate-100 pt-3 text-[0.8125rem]">
        {facts.length > 0 && <p className="text-slate-700">{facts.join(' · ')}</p>}
        {x.chokingHazard && <p className="font-medium text-amber-700">Chhote purze — 3 saal se kam nahi</p>}
        {x.requiresBatteries && !x.batteriesIncluded && <p className="text-slate-600">Cell alag: {[x.batteryQuantity, x.batteryType].filter(Boolean).join(' x ') || 'haan'}</p>}
      </div>
    );
  },
  refresh: [KEYS.facts, KEYS.detail, KEYS.safety],
  guide: [
    { icon: Baby, color: '#db2777', title: 'Umar', text: 'Asal umar chunein, phir wo umar bhi jin me khilona chalta hai. POS par umar chips se dhoonda jata hai.' },
    { icon: AlertTriangle, color: '#d97706', title: 'Chhote purze', text: 'Jis khilone me chhote purze hon us par nishan lagayein — POS aur Safety review me nazar aata hai.' },
    { icon: Sparkles, color: '#7c3aed', title: 'Rang', text: 'Ek hi khilona kai rang me ho to Stock step me rang ko variant banayein.' },
  ],
};

export default function ToyProductWizardPage() {
  return <ProductEditorPage config={config} />;
}
