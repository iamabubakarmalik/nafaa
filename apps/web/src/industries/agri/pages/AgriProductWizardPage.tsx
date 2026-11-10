/**
 * Agri product editor on the shared product editor: the pack weight and formula,
 * the crops and season it is for, spray safety, the government
 * registration, and a bulk rate. Stock opens by batch with expiry (sprays).
 */

import { Bug, Leaf, ShieldAlert, Sprout, Tags } from 'lucide-react';
import { cn } from '@core/lib/cn';
import { useCategoryKindSync } from '@modules/inventory/categories/lib/kinds';
import { ProductEditorPage } from '@modules/inventory/products/editor/ProductEditorPage';
import { basicStep, priceStep, stockStep } from '@modules/inventory/products/editor/coreSteps';
import { Chip, NumberField, Section, TextField, Toggle, inputClass } from '@modules/inventory/products/editor/fields';
import type { CoreOptions, EditorConfig, Errors, StepContext, StepDef } from '@modules/inventory/products/editor/types';
import { agriProductsApi, type AgriCategory, type AgriProductProfile, type FeedType, type FertilizerType, type SeedType, type SeasonType } from '../api/products.api';
import { AGRI_FACTS_KEY } from '../hooks/useAgriFacts';
import { AGRI_CATEGORY_SUGGESTIONS, isFeedKind, isFertKind, isSeedKind, isSprayKind, needsGovtReg, prettyAgriKind, type AgriKind } from '../lib/agriCategory';
import { certStatus, SEASONS } from '../lib/agriUnits';
import { CROPS, dayKey } from '../lib/meta';
import { t as tr } from '@core/i18n';

export interface AgriExtra {
  category: AgriCategory;
  seedType: SeedType | ''; fertilizerType: FertilizerType | ''; feedType: FeedType | '';
  brand: string; manufacturer: string;
  packSize: string; packUnit: string; npkRatio: string; activeIngredient: string; concentration: string;
  targetCrops: string[]; targetPests: string; season: SeasonType | '';
  applicationRate: string; applicationMethod: string;
  toxicityLevel: string; reEntryPeriod: number | null; ppePeriod: number | null; warningLabel: string;
  govtRegNumber: string; govtRegExpiry: string; isRestricted: boolean; requiresLicense: boolean; isOrganic: boolean;
  bulkDiscountThreshold: number | null; bulkDiscountPct: number | null;
  storageInstructions: string;
}

const initial: AgriExtra = {
  category: 'OTHER', seedType: '', fertilizerType: '', feedType: '', brand: '', manufacturer: '',
  packSize: '50', packUnit: 'kg', npkRatio: '', activeIngredient: '', concentration: '',
  targetCrops: [], targetPests: '', season: '', applicationRate: '', applicationMethod: '',
  toxicityLevel: '', reEntryPeriod: null, ppePeriod: null, warningLabel: '',
  govtRegNumber: '', govtRegExpiry: '', isRestricted: false, requiresLicense: false, isOrganic: false,
  bulkDiscountThreshold: null, bulkDiscountPct: null, storageInstructions: '',
};

const PACK_UNITS = ['kg', 'gram', 'litre', 'ml'];
const TOXICITY = [{ v: 'I', l: tr('Laal (bohat zehreeli)') }, { v: 'II', l: tr('Peeli') }, { v: 'III', l: tr('Neeli') }, { v: 'IV', l: tr('Hari (kam)') }];

const opt = (v: string) => v.trim() || undefined;
const isSpray = (k: AgriCategory) => isSprayKind(k as AgriKind);

/* ── Basic step addition: what it is and the company ── */
function Kind({ ctx }: { ctx: StepContext<AgriExtra> }) {
  const x = ctx.draft.extra;
  // The item type comes from the shop category's kind (nearest parent); the editor shows no separate picker.
  useCategoryKindSync(ctx.draft.core.categoryId, x.category, (kind) => {
    const category = kind as AgriCategory;
    ctx.setExtra({ category, ...(isSpray(category) && !['litre', 'ml'].includes(x.packUnit) && { packUnit: 'ml', packSize: '' }) });
  });
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <TextField label={tr('Company')} value={x.manufacturer} onChange={(manufacturer) => ctx.setExtra({ manufacturer })} placeholder={tr('Fauji, Engro, Syngenta, ICI…')} hint={tr('Card par dikhti hai — company ka maal isi se dhoondte hain')} />
        <TextField label={tr('Brand')} value={x.brand} onChange={(brand) => ctx.setExtra({ brand })} placeholder={tr('Sona Urea, Confidor…')} hint={tr('Marzi hai')} />
      </div>
    </div>
  );
}

/* ── Agri step: pack, formula, crops, season, dose ── */
function Usage({ ctx }: { ctx: StepContext<AgriExtra> }) {
  const x = ctx.draft.extra;
  const k = x.category as AgriKind;
  const toggleCrop = (c: string) => ctx.setExtra({ targetCrops: x.targetCrops.includes(c) ? x.targetCrops.filter((y) => y !== c) : [...x.targetCrops, c] });
  return (
    <div className="space-y-4">
      <Section title={tr('Pack')} hint={tr('Ek bori / bottle me kitna — receipt par kul kilo isi se banta hai')}>
        <div className="flex flex-wrap items-end gap-3">
          <div className="w-32"><TextField label={tr('Wazan / hajm')} value={x.packSize} onChange={(packSize) => ctx.setExtra({ packSize: packSize.replace(/[^\d.]/g, '') })} placeholder="50" error={ctx.errors.packSize} /></div>
          <div className="flex flex-wrap gap-1.5 pb-1">{PACK_UNITS.map((u) => <Chip key={u} on={x.packUnit === u} onClick={() => ctx.setExtra({ packUnit: u })}>{u}</Chip>)}</div>
        </div>
      </Section>
      {(isFertKind(k) || isSpray(x.category) || k === 'PLANT_NUTRIENT') && (
        <Section title={tr('Formula')} hint={tr('Farmer aksar formula se maangta hai — POS search me bhi aata hai')}>
          <div className="grid gap-3 sm:grid-cols-3">
            {isFertKind(k) && <TextField label={tr('NPK')} value={x.npkRatio} onChange={(npkRatio) => ctx.setExtra({ npkRatio })} placeholder="46-0-0, 18-46-0" />}
            <TextField label={tr('Active ingredient')} value={x.activeIngredient} onChange={(activeIngredient) => ctx.setExtra({ activeIngredient })} placeholder={tr('Imidacloprid, Zinc sulphate')} />
            <TextField label={tr('Strength')} value={x.concentration} onChange={(concentration) => ctx.setExtra({ concentration })} placeholder={tr('20% SL, 33%')} />
          </div>
        </Section>
      )}
      <Section title={tr('Kis fasal ke liye')} hint={tr('POS par \'gandum\' likhne se ye cheez aa jati hai; fasal calendar me bijai se pehle stock dekha jata hai')}>
        <div className="flex flex-wrap gap-1.5">{CROPS.map((c) => <Chip key={c} on={x.targetCrops.includes(c)} onClick={() => toggleCrop(c)}>{c}</Chip>)}</div>
        {isSpray(x.category) && (
          <label className="mt-3 block">
            <span className="mb-1.5 block text-[0.8125rem] font-medium text-slate-700">{tr('Kis keeray / bimari ke liye')}</span>
            <input value={x.targetPests} onChange={(e) => ctx.setExtra({ targetPests: e.target.value })} placeholder={tr('Sundi, safed makhi, tela (comma se alag)')} className={inputClass} />
          </label>
        )}
        <div className="mt-3">
          <span className="mb-1.5 block text-[0.8125rem] font-medium text-slate-700">{tr('Season')}</span>
          <div className="flex flex-wrap gap-1.5">{SEASONS.map((s) => <Chip key={s.v} on={x.season === s.v} onClick={() => ctx.setExtra({ season: x.season === s.v ? '' : s.v as SeasonType })}>{s.l}</Chip>)}</div>
        </div>
      </Section>
      <Section title={tr('Istemal')} hint={tr('Receipt par chhapta hai — farmer ko dose yaad rehti hai')}>
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField label={tr('Dose')} value={x.applicationRate} onChange={(applicationRate) => ctx.setExtra({ applicationRate })} placeholder={tr('1 bori fi acre, 250 ml fi acre')} />
          <TextField label={tr('Tareeqa')} value={x.applicationMethod} onChange={(applicationMethod) => ctx.setExtra({ applicationMethod })} placeholder={tr('Chhatta, spray, paani ke sath')} />
        </div>
      </Section>
    </div>
  );
}

/* ── Safety and registration step (seeds, fertilizer, sprays) ── */
function Rules({ ctx }: { ctx: StepContext<AgriExtra> }) {
  const x = ctx.draft.extra;
  const cert = x.govtRegExpiry ? certStatus(x.govtRegExpiry) : null;
  return (
    <div className="space-y-4">
      <Section icon={ShieldAlert} title={tr('Sarkari registration')} hint={tr('Registration ki date guzar jaye to POS par ye cheez nahi bikti')}>
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField label={tr('Registration number')} value={x.govtRegNumber} onChange={(govtRegNumber) => ctx.setExtra({ govtRegNumber })} placeholder={tr('Reg. No. 1234/2025')} />
          <label className="block">
            <span className="mb-1.5 block text-[0.8125rem] font-medium text-slate-700">{tr('Aakhri date')}</span>
            <input type="date" value={x.govtRegExpiry} onChange={(e) => ctx.setExtra({ govtRegExpiry: e.target.value })} className={inputClass} />
            {cert && <span className={cn('mt-1 block text-[0.75rem]', cert.state === 'expired' ? 'font-semibold text-rose-600' : cert.state === 'soon' ? 'text-amber-700' : 'text-slate-500')}>{cert.text}</span>}
          </label>
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <Toggle on={x.isRestricted} onChange={(isRestricted) => ctx.setExtra({ isRestricted })} icon={ShieldAlert} title={tr('Pabandi wali')} hint={tr('POS par yaad dihani aati hai')} />
          <Toggle on={x.requiresLicense} onChange={(requiresLicense) => ctx.setExtra({ requiresLicense })} title={tr('License zaroori')} hint={tr('Farmer ka license dekh kar')} />
          <Toggle on={x.isOrganic} onChange={(isOrganic) => ctx.setExtra({ isOrganic })} icon={Leaf} title={tr('Organic')} />
        </div>
      </Section>
      {isSpray(x.category) && (
        <Section icon={Bug} title={tr('Spray ki hifazat')} hint={tr('Receipt par chhapta hai: kitne din khet me na jayein aur katai se kitne din pehle band')}>
          <span className="mb-1.5 block text-[0.8125rem] font-medium text-slate-700">{tr('Zeher ka darja (dabbe ki patti ka rang)')}</span>
          <div className="flex flex-wrap gap-1.5">{TOXICITY.map((t) => <Chip key={t.v} on={x.toxicityLevel === t.v} onClick={() => ctx.setExtra({ toxicityLevel: x.toxicityLevel === t.v ? '' : t.v })}>{t.l}</Chip>)}</div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <NumberField label={tr('Spray ke baad khet me na jayein')} allowEmpty value={x.reEntryPeriod} onChange={(reEntryPeriod) => ctx.setExtra({ reEntryPeriod })} suffix="din" />
            <NumberField label={tr('Katai se pehle band karein')} allowEmpty value={x.ppePeriod} onChange={(ppePeriod) => ctx.setExtra({ ppePeriod })} suffix="din" />
          </div>
          <label className="mt-3 block">
            <span className="mb-1.5 block text-[0.8125rem] font-medium text-slate-700">{tr('Khabardar')}</span>
            <input value={x.warningLabel} onChange={(e) => ctx.setExtra({ warningLabel: e.target.value })} placeholder={tr('Bachon se door rakhein, khali dabba zameen me dabayein')} className={inputClass} />
          </label>
        </Section>
      )}
    </div>
  );
}

/* ── Price step addition: bulk rate ── */
function Bulk({ ctx }: { ctx: StepContext<AgriExtra> }) {
  const x = ctx.draft.extra;
  const price = ctx.draft.core.price;
  const rate = x.bulkDiscountPct ? price * (1 - x.bulkDiscountPct / 100) : null;
  return (
    <Section icon={Tags} title={tr('Bulk rate')} hint={tr('Itni boriyan ek bill me hon to POS khud kam rate lagata hai')}>
      <div className="grid gap-3 sm:grid-cols-2">
        <NumberField label={tr('Kam se kam quantity')} allowEmpty value={x.bulkDiscountThreshold} onChange={(bulkDiscountThreshold) => ctx.setExtra({ bulkDiscountThreshold })} placeholder="10" error={ctx.errors.bulk} />
        <NumberField label={tr('Discount')} allowEmpty value={x.bulkDiscountPct} onChange={(bulkDiscountPct) => ctx.setExtra({ bulkDiscountPct })} suffix="%" placeholder="2" />
      </div>
      {rate !== null && x.bulkDiscountThreshold ? <p className="mt-2 text-[0.8125rem] text-slate-600">{tr('{{bulkDiscountThreshold}}+ par rate Rs {{value}}', { bulkDiscountThreshold: x.bulkDiscountThreshold, value: Math.round(rate * 100) / 100 })}</p> : null}
    </Section>
  );
}

const core: CoreOptions = {
  units: [
    { value: 'bag', label: tr('Bori') }, { value: 'kg', label: tr('Kilo') }, { value: 'bottle', label: tr('Bottle') }, { value: 'litre', label: tr('Litre') },
    { value: 'packet', label: tr('Packet') }, { value: 'ml', label: 'ml' }, { value: 'gram', label: tr('Gram') }, { value: 'ton', label: tr('Ton') },
    { value: 'pcs', label: tr('Adad (pcs)') }, { value: 'bundle', label: tr('Bundle') },
  ],
  skuPrefix: 'AGR',
  packs: true,
  variants: false,
  batches: true,
  markups: [2, 3, 5, 8, 10],
};

const usageStep: StepDef<AgriExtra> = {
  id: 'usage', title: tr('Fasal aur pack'), hint: tr('Wazan, formula, fasal'), icon: Sprout, render: (ctx) => <Usage ctx={ctx} />,
  validate: (d): Errors => (d.extra.packSize && !(Number(d.extra.packSize) > 0) ? { packSize: tr('Wazan sahi likhein (jaise 50)') } : {}),
};
const rulesStep: StepDef<AgriExtra> = {
  id: 'rules', title: tr('Registration'), hint: tr('Sarkari number, hifazat'), icon: ShieldAlert, render: (ctx) => <Rules ctx={ctx} />,
  when: (d) => needsGovtReg(d.extra.category as AgriKind) || isSpray(d.extra.category),
};

const toProfile = (productId: string, x: AgriExtra): Partial<AgriProductProfile> => ({
  productId, category: x.category || 'OTHER',
  seedType: isSeedKind(x.category as AgriKind) && x.seedType ? x.seedType : undefined,
  fertilizerType: isFertKind(x.category as AgriKind) && x.fertilizerType ? x.fertilizerType : undefined,
  feedType: isFeedKind(x.category as AgriKind) && x.feedType ? x.feedType : undefined,
  brand: opt(x.brand), manufacturer: opt(x.manufacturer), packSize: opt(x.packSize), packUnit: opt(x.packUnit),
  npkRatio: opt(x.npkRatio), activeIngredient: opt(x.activeIngredient), concentration: opt(x.concentration),
  targetCrops: x.targetCrops, targetPests: x.targetPests.split(',').map((s) => s.trim()).filter(Boolean),
  season: x.season || undefined, applicationRate: opt(x.applicationRate), applicationMethod: opt(x.applicationMethod),
  toxicityLevel: opt(x.toxicityLevel), reEntryPeriod: x.reEntryPeriod ?? undefined, ppePeriod: x.ppePeriod ?? undefined, warningLabel: opt(x.warningLabel),
  govtRegNumber: opt(x.govtRegNumber), govtRegExpiry: opt(x.govtRegExpiry), isRestricted: x.isRestricted, requiresLicense: x.requiresLicense, isOrganic: x.isOrganic,
  bulkDiscountThreshold: x.bulkDiscountThreshold ?? undefined, bulkDiscountPct: x.bulkDiscountPct ?? undefined,
  storageInstructions: opt(x.storageInstructions),
});

const config: EditorConfig<AgriExtra> = {
  label: tr('Agri'),
  draftKey: 'nafaa.product-editor.agri',
  paths: { list: '/agri/products', detail: (id) => `/agri-products/${id}`, create: '/agri-products/new' },
  core,
  extra: {
    initial,
    load: async (productId) => {
      const p = await agriProductsApi.byProduct(productId).catch(() => null);
      if (!p) return { category: 'OTHER' };
      return {
        category: p.category ?? 'OTHER', seedType: p.seedType ?? '', fertilizerType: p.fertilizerType ?? '', feedType: p.feedType ?? '',
        brand: p.brand ?? '', manufacturer: p.manufacturer ?? '', packSize: p.packSize ?? '', packUnit: p.packUnit ?? 'kg',
        npkRatio: p.npkRatio ?? '', activeIngredient: p.activeIngredient ?? '', concentration: p.concentration ?? '',
        targetCrops: p.targetCrops ?? [], targetPests: (p.targetPests ?? []).join(', '), season: p.season ?? '',
        applicationRate: p.applicationRate ?? '', applicationMethod: p.applicationMethod ?? '', toxicityLevel: p.toxicityLevel ?? '',
        reEntryPeriod: p.reEntryPeriod ?? null, ppePeriod: p.ppePeriod ?? null, warningLabel: p.warningLabel ?? '',
        govtRegNumber: p.govtRegNumber ?? '', govtRegExpiry: p.govtRegExpiry ? dayKey(new Date(p.govtRegExpiry)) : '',
        isRestricted: p.isRestricted, requiresLicense: p.requiresLicense, isOrganic: p.isOrganic,
        bulkDiscountThreshold: p.bulkDiscountThreshold ?? null, bulkDiscountPct: p.bulkDiscountPct ?? null, storageInstructions: p.storageInstructions ?? '',
      };
    },
    save: async (productId, d, { isEdit }) => {
      const body = toProfile(productId, d.extra);
      await (isEdit ? agriProductsApi.update(body) : agriProductsApi.upsert(body));
    },
  },
  steps: [
    basicStep<AgriExtra>(core, { extra: (ctx) => <Kind ctx={ctx} />, namePlaceholder: tr('Jaise: Sona Urea 50kg'), categorySuggestions: AGRI_CATEGORY_SUGGESTIONS.map((c) => c.name) }),
    usageStep,
    priceStep<AgriExtra>(core, {
      extra: (ctx) => <Bulk ctx={ctx} />,
    }),
    rulesStep,
    stockStep<AgriExtra>(core, { quick: [10, 50, 100, 500] }),
  ].map((s) => (s.id === 'price' ? {
    ...s,
    validate: (d, isEdit) => {
      const e = s.validate?.(d, isEdit) ?? {};
      const { bulkDiscountThreshold: min, bulkDiscountPct: pct } = d.extra;
      if ((min && !pct) || (!min && pct)) e.bulk = tr('Bulk rate ke liye quantity aur % dono likhein');
      else if (pct != null && (pct < 0 || pct > 90)) e.bulk = tr('Discount 0 se 90% tak');
      return e;
    },
  } : s)),
  summary: (d) => {
    const x = d.extra;
    return (
      <div className="mt-3 space-y-1 border-t border-slate-100 pt-3 text-[0.8125rem]">
        <p className="text-slate-700">{[prettyAgriKind(x.category as AgriKind), x.packSize && `${x.packSize} ${x.packUnit}`, x.npkRatio, x.activeIngredient].filter(Boolean).join(' · ')}</p>
        {x.targetCrops.length > 0 && <p className="text-slate-600">{x.targetCrops.join(', ')}</p>}
        {x.govtRegExpiry && certStatus(x.govtRegExpiry).state === 'expired' && <p className="font-medium text-rose-700">{tr('Registration khatam — POS par nahi bikegi')}</p>}
        {x.bulkDiscountThreshold && x.bulkDiscountPct ? <p className="text-emerald-700">{tr('{{bulkDiscountThreshold}}+ par {{bulkDiscountPct}}% kam', { bulkDiscountThreshold: x.bulkDiscountThreshold, bulkDiscountPct: x.bulkDiscountPct })}</p> : null}
      </div>
    );
  },
  refresh: [AGRI_FACTS_KEY, 'agri-profiles-all', 'agri-product-detail'],
  guide: [
    { icon: Sprout, color: '#65a30d', title: tr('Bori aur kilo'), text: tr('Unit "Bori" rakhein aur pack 50 kg likhein. Khula kilo bhi bechna ho to Price step me "Kilo" pack jorein (1 bori = 50).') },
    { icon: ShieldAlert, color: '#e11d48', title: tr('Registration'), text: tr('Beej, khaad aur spray ki registration ki aakhri date likhein — guzar jaye to POS par nahi bikti.') },
    { icon: Tags, color: '#16a34a', title: tr('Bulk rate'), text: tr('10 bori par 2% kam jaisa rate yahan likhein — POS quantity poori hote hi khud laga deta hai.') },
  ],
};

/** Agri product editor (routes /agri-products/new and /agri-products/:id/edit). */
export default function AgriProductWizardPage() {
  return <ProductEditorPage config={config} />;
}
