/**
 * Agri product editor on the shared product editor: what kind of input it
 * is (seed, fertilizer, spray, feed, tool), the pack weight and formula,
 * the crops and season it is for, spray safety, the government
 * registration, and a bulk rate. Stock opens by batch with expiry (sprays).
 */

import { Bug, FlaskConical, Leaf, PawPrint, ShieldAlert, Sprout, Tags, Wrench } from 'lucide-react';
import { cn } from '@core/lib/cn';
import { ProductEditorPage } from '@modules/inventory/products/editor/ProductEditorPage';
import { basicStep, priceStep, stockStep } from '@modules/inventory/products/editor/coreSteps';
import { Chip, NumberField, Section, TextField, Tiles, Toggle, inputClass } from '@modules/inventory/products/editor/fields';
import type { CoreOptions, EditorConfig, Errors, StepContext, StepDef } from '@modules/inventory/products/editor/types';
import { agriProductsApi, type AgriCategory, type AgriProductProfile, type FeedType, type FertilizerType, type SeedType, type SeasonType } from '../api/products.api';
import { AGRI_FACTS_KEY } from '../hooks/useAgriFacts';
import { AGRI_CATEGORY_SUGGESTIONS, isFeedKind, isFertKind, isSeedKind, isSprayKind, needsGovtReg, prettyAgriKind, type AgriKind } from '../lib/agriCategory';
import { certStatus, SEASONS } from '../lib/agriUnits';
import { CROPS, dayKey } from '../lib/meta';

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
  category: 'FERTILIZER', seedType: '', fertilizerType: '', feedType: '', brand: '', manufacturer: '',
  packSize: '50', packUnit: 'kg', npkRatio: '', activeIngredient: '', concentration: '',
  targetCrops: [], targetPests: '', season: '', applicationRate: '', applicationMethod: '',
  toxicityLevel: '', reEntryPeriod: null, ppePeriod: null, warningLabel: '',
  govtRegNumber: '', govtRegExpiry: '', isRestricted: false, requiresLicense: false, isOrganic: false,
  bulkDiscountThreshold: null, bulkDiscountPct: null, storageInstructions: '',
};

const KINDS: Array<{ value: AgriCategory; label: string; icon: typeof Sprout }> = [
  { value: 'SEEDS', label: 'Beej', icon: Sprout },
  { value: 'FERTILIZER', label: 'Khaad', icon: FlaskConical },
  { value: 'INSECTICIDE', label: 'Keeray ki dawa', icon: Bug },
  { value: 'HERBICIDE', label: 'Ghaas ki dawa', icon: Bug },
  { value: 'FUNGICIDE', label: 'Fungus ki dawa', icon: Bug },
  { value: 'PLANT_NUTRIENT', label: 'Ghiza / zinc', icon: Leaf },
  { value: 'ANIMAL_FEED', label: 'Feed', icon: PawPrint },
  { value: 'VETERINARY_MEDICINE', label: 'Jaanwar ki dawa', icon: PawPrint },
  { value: 'FARM_TOOLS', label: 'Auzaar / sprayer', icon: Wrench },
  { value: 'OTHER', label: 'Kuch aur', icon: Leaf },
];
const SEED_TYPES: Array<[SeedType, string]> = [['WHEAT', 'Gandum'], ['COTTON', 'Kapas'], ['RICE', 'Chawal'], ['MAIZE', 'Makai'], ['SUGARCANE', 'Ganna'], ['POTATO', 'Aloo'], ['VEGETABLES', 'Sabzi'], ['FODDER', 'Chara'], ['OILSEEDS', 'Tel wale'], ['OTHER', 'Aur']];
const FERT_TYPES: Array<[FertilizerType, string]> = [['UREA', 'Urea'], ['DAP', 'DAP'], ['NPK', 'NPK'], ['POTASH', 'Potash (SOP/MOP)'], ['ZINC', 'Zinc'], ['BORON', 'Boron'], ['ORGANIC', 'Organic'], ['LIQUID', 'Liquid'], ['OTHER', 'Aur']];
const FEED_TYPES: Array<[FeedType, string]> = [['CONCENTRATE', 'Wanda'], ['STARTER', 'Starter'], ['GROWER', 'Grower'], ['FINISHER', 'Finisher'], ['LAYER', 'Layer'], ['MINERAL_MIX', 'Mineral mix'], ['OIL_CAKE', 'Khal'], ['BRAN', 'Chokar'], ['OTHER', 'Aur']];
const PACK_UNITS = ['kg', 'gram', 'litre', 'ml'];
const TOXICITY = [{ v: 'I', l: 'Laal (bohat zehreeli)' }, { v: 'II', l: 'Peeli' }, { v: 'III', l: 'Neeli' }, { v: 'IV', l: 'Hari (kam)' }];

const opt = (v: string) => v.trim() || undefined;
const isSpray = (k: AgriCategory) => isSprayKind(k as AgriKind);

/* ── Basic step addition: what it is and the company ── */
function Kind({ ctx }: { ctx: StepContext<AgriExtra> }) {
  const x = ctx.draft.extra;
  const k = x.category as AgriKind;
  const sub: Array<[string, string]> | null = isSeedKind(k) ? SEED_TYPES : isFertKind(k) ? FERT_TYPES : isFeedKind(k) ? FEED_TYPES : null;
  const subValue = isSeedKind(k) ? x.seedType : isFertKind(k) ? x.fertilizerType : x.feedType;
  const setSub = (v: string) => ctx.setExtra(isSeedKind(k) ? { seedType: v as SeedType } : isFertKind(k) ? { fertilizerType: v as FertilizerType } : { feedType: v as FeedType });
  return (
    <div className="space-y-4">
      <Section title="Kya cheez hai" hint="Isi se POS ka filter, registration ki shart aur spray ki hifazat ka sawal tay hota hai">
        <Tiles value={x.category} onChange={(category) => ctx.setExtra({ category, ...(isSpray(category) && !['litre', 'ml'].includes(x.packUnit) && { packUnit: 'ml', packSize: '' }) })}
          columns="grid-cols-2 sm:grid-cols-5" options={KINDS.map((o) => ({ value: o.value, label: o.label, icon: o.icon }))} />
        {sub && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {sub.map(([v, l]) => <Chip key={v} on={subValue === v} onClick={() => setSub(subValue === v ? '' : v)}>{l}</Chip>)}
          </div>
        )}
      </Section>
      <div className="grid gap-3 sm:grid-cols-2">
        <TextField label="Company" value={x.manufacturer} onChange={(manufacturer) => ctx.setExtra({ manufacturer })} placeholder="Fauji, Engro, Syngenta, ICI…" hint="Card par dikhti hai — company ka maal isi se dhoondte hain" />
        <TextField label="Brand" value={x.brand} onChange={(brand) => ctx.setExtra({ brand })} placeholder="Sona Urea, Confidor…" hint="Marzi hai" />
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
      <Section title="Pack" hint="Ek bori / bottle me kitna — receipt par kul kilo isi se banta hai">
        <div className="flex flex-wrap items-end gap-3">
          <div className="w-32"><TextField label="Wazan / hajm" value={x.packSize} onChange={(packSize) => ctx.setExtra({ packSize: packSize.replace(/[^\d.]/g, '') })} placeholder="50" error={ctx.errors.packSize} /></div>
          <div className="flex flex-wrap gap-1.5 pb-1">{PACK_UNITS.map((u) => <Chip key={u} on={x.packUnit === u} onClick={() => ctx.setExtra({ packUnit: u })}>{u}</Chip>)}</div>
        </div>
      </Section>
      {(isFertKind(k) || isSpray(x.category) || k === 'PLANT_NUTRIENT') && (
        <Section title="Formula" hint="Farmer aksar formula se maangta hai — POS search me bhi aata hai">
          <div className="grid gap-3 sm:grid-cols-3">
            {isFertKind(k) && <TextField label="NPK" value={x.npkRatio} onChange={(npkRatio) => ctx.setExtra({ npkRatio })} placeholder="46-0-0, 18-46-0" />}
            <TextField label="Active ingredient" value={x.activeIngredient} onChange={(activeIngredient) => ctx.setExtra({ activeIngredient })} placeholder="Imidacloprid, Zinc sulphate" />
            <TextField label="Strength" value={x.concentration} onChange={(concentration) => ctx.setExtra({ concentration })} placeholder="20% SL, 33%" />
          </div>
        </Section>
      )}
      <Section title="Kis fasal ke liye" hint="POS par 'gandum' likhne se ye cheez aa jati hai; fasal calendar me bijai se pehle stock dekha jata hai">
        <div className="flex flex-wrap gap-1.5">{CROPS.map((c) => <Chip key={c} on={x.targetCrops.includes(c)} onClick={() => toggleCrop(c)}>{c}</Chip>)}</div>
        {isSpray(x.category) && (
          <label className="mt-3 block">
            <span className="mb-1.5 block text-[0.8125rem] font-medium text-slate-700">Kis keeray / bimari ke liye</span>
            <input value={x.targetPests} onChange={(e) => ctx.setExtra({ targetPests: e.target.value })} placeholder="Sundi, safed makhi, tela (comma se alag)" className={inputClass} />
          </label>
        )}
        <div className="mt-3">
          <span className="mb-1.5 block text-[0.8125rem] font-medium text-slate-700">Season</span>
          <div className="flex flex-wrap gap-1.5">{SEASONS.map((s) => <Chip key={s.v} on={x.season === s.v} onClick={() => ctx.setExtra({ season: x.season === s.v ? '' : s.v as SeasonType })}>{s.l}</Chip>)}</div>
        </div>
      </Section>
      <Section title="Istemal" hint="Receipt par chhapta hai — farmer ko dose yaad rehti hai">
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField label="Dose" value={x.applicationRate} onChange={(applicationRate) => ctx.setExtra({ applicationRate })} placeholder="1 bori fi acre, 250 ml fi acre" />
          <TextField label="Tareeqa" value={x.applicationMethod} onChange={(applicationMethod) => ctx.setExtra({ applicationMethod })} placeholder="Chhatta, spray, paani ke sath" />
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
      <Section icon={ShieldAlert} title="Sarkari registration" hint="Registration ki date guzar jaye to POS par ye cheez nahi bikti">
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField label="Registration number" value={x.govtRegNumber} onChange={(govtRegNumber) => ctx.setExtra({ govtRegNumber })} placeholder="Reg. No. 1234/2025" />
          <label className="block">
            <span className="mb-1.5 block text-[0.8125rem] font-medium text-slate-700">Aakhri date</span>
            <input type="date" value={x.govtRegExpiry} onChange={(e) => ctx.setExtra({ govtRegExpiry: e.target.value })} className={inputClass} />
            {cert && <span className={cn('mt-1 block text-[0.75rem]', cert.state === 'expired' ? 'font-semibold text-rose-600' : cert.state === 'soon' ? 'text-amber-700' : 'text-slate-500')}>{cert.text}</span>}
          </label>
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <Toggle on={x.isRestricted} onChange={(isRestricted) => ctx.setExtra({ isRestricted })} icon={ShieldAlert} title="Pabandi wali" hint="POS par yaad dihani aati hai" />
          <Toggle on={x.requiresLicense} onChange={(requiresLicense) => ctx.setExtra({ requiresLicense })} title="License zaroori" hint="Farmer ka license dekh kar" />
          <Toggle on={x.isOrganic} onChange={(isOrganic) => ctx.setExtra({ isOrganic })} icon={Leaf} title="Organic" />
        </div>
      </Section>
      {isSpray(x.category) && (
        <Section icon={Bug} title="Spray ki hifazat" hint="Receipt par chhapta hai: kitne din khet me na jayein aur katai se kitne din pehle band">
          <span className="mb-1.5 block text-[0.8125rem] font-medium text-slate-700">Zeher ka darja (dabbe ki patti ka rang)</span>
          <div className="flex flex-wrap gap-1.5">{TOXICITY.map((t) => <Chip key={t.v} on={x.toxicityLevel === t.v} onClick={() => ctx.setExtra({ toxicityLevel: x.toxicityLevel === t.v ? '' : t.v })}>{t.l}</Chip>)}</div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <NumberField label="Spray ke baad khet me na jayein" allowEmpty value={x.reEntryPeriod} onChange={(reEntryPeriod) => ctx.setExtra({ reEntryPeriod })} suffix="din" />
            <NumberField label="Katai se pehle band karein" allowEmpty value={x.ppePeriod} onChange={(ppePeriod) => ctx.setExtra({ ppePeriod })} suffix="din" />
          </div>
          <label className="mt-3 block">
            <span className="mb-1.5 block text-[0.8125rem] font-medium text-slate-700">Khabardar</span>
            <input value={x.warningLabel} onChange={(e) => ctx.setExtra({ warningLabel: e.target.value })} placeholder="Bachon se door rakhein, khali dabba zameen me dabayein" className={inputClass} />
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
    <Section icon={Tags} title="Bulk rate" hint="Itni boriyan ek bill me hon to POS khud kam rate lagata hai">
      <div className="grid gap-3 sm:grid-cols-2">
        <NumberField label="Kam se kam quantity" allowEmpty value={x.bulkDiscountThreshold} onChange={(bulkDiscountThreshold) => ctx.setExtra({ bulkDiscountThreshold })} placeholder="10" error={ctx.errors.bulk} />
        <NumberField label="Discount" allowEmpty value={x.bulkDiscountPct} onChange={(bulkDiscountPct) => ctx.setExtra({ bulkDiscountPct })} suffix="%" placeholder="2" />
      </div>
      {rate !== null && x.bulkDiscountThreshold ? <p className="mt-2 text-[0.8125rem] text-slate-600">{x.bulkDiscountThreshold}+ par rate Rs {Math.round(rate * 100) / 100}</p> : null}
    </Section>
  );
}

const core: CoreOptions = {
  units: [
    { value: 'bag', label: 'Bori' }, { value: 'kg', label: 'Kilo' }, { value: 'bottle', label: 'Bottle' }, { value: 'litre', label: 'Litre' },
    { value: 'packet', label: 'Packet' }, { value: 'ml', label: 'ml' }, { value: 'gram', label: 'Gram' }, { value: 'ton', label: 'Ton' },
    { value: 'pcs', label: 'Adad (pcs)' }, { value: 'bundle', label: 'Bundle' },
  ],
  skuPrefix: 'AGR',
  packs: true,
  variants: false,
  batches: true,
  markups: [2, 3, 5, 8, 10],
};

const usageStep: StepDef<AgriExtra> = {
  id: 'usage', title: 'Fasal aur pack', hint: 'Wazan, formula, fasal', icon: Sprout, render: (ctx) => <Usage ctx={ctx} />,
  validate: (d): Errors => (d.extra.packSize && !(Number(d.extra.packSize) > 0) ? { packSize: 'Wazan sahi likhein (jaise 50)' } : {}),
};
const rulesStep: StepDef<AgriExtra> = {
  id: 'rules', title: 'Registration', hint: 'Sarkari number, hifazat', icon: ShieldAlert, render: (ctx) => <Rules ctx={ctx} />,
  when: (d) => needsGovtReg(d.extra.category as AgriKind) || isSpray(d.extra.category),
};

const toProfile = (productId: string, x: AgriExtra): Partial<AgriProductProfile> => ({
  productId, category: x.category,
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
  label: 'Agri',
  draftKey: 'nafaa.product-editor.agri',
  paths: { list: '/agri/products', detail: (id) => `/agri-products/${id}`, create: '/agri-products/new' },
  core,
  extra: {
    initial,
    load: async (productId) => {
      const p = await agriProductsApi.byProduct(productId).catch(() => null);
      if (!p) return {};
      return {
        category: p.category, seedType: p.seedType ?? '', fertilizerType: p.fertilizerType ?? '', feedType: p.feedType ?? '',
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
    basicStep<AgriExtra>(core, { extra: (ctx) => <Kind ctx={ctx} />, namePlaceholder: 'Jaise: Sona Urea 50kg', categorySuggestions: AGRI_CATEGORY_SUGGESTIONS.map((c) => c.name) }),
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
      if ((min && !pct) || (!min && pct)) e.bulk = 'Bulk rate ke liye quantity aur % dono likhein';
      else if (pct != null && (pct < 0 || pct > 90)) e.bulk = 'Discount 0 se 90% tak';
      return e;
    },
  } : s)),
  summary: (d) => {
    const x = d.extra;
    return (
      <div className="mt-3 space-y-1 border-t border-slate-100 pt-3 text-[0.8125rem]">
        <p className="text-slate-700">{[prettyAgriKind(x.category as AgriKind), x.packSize && `${x.packSize} ${x.packUnit}`, x.npkRatio, x.activeIngredient].filter(Boolean).join(' · ')}</p>
        {x.targetCrops.length > 0 && <p className="text-slate-600">{x.targetCrops.join(', ')}</p>}
        {x.govtRegExpiry && certStatus(x.govtRegExpiry).state === 'expired' && <p className="font-medium text-rose-700">Registration khatam — POS par nahi bikegi</p>}
        {x.bulkDiscountThreshold && x.bulkDiscountPct ? <p className="text-emerald-700">{x.bulkDiscountThreshold}+ par {x.bulkDiscountPct}% kam</p> : null}
      </div>
    );
  },
  refresh: [AGRI_FACTS_KEY, 'agri-profiles-all', 'agri-product-detail'],
  guide: [
    { icon: Sprout, color: '#65a30d', title: 'Bori aur kilo', text: 'Unit "Bori" rakhein aur pack 50 kg likhein. Khula kilo bhi bechna ho to Price step me "Kilo" pack jorein (1 bori = 50).' },
    { icon: ShieldAlert, color: '#e11d48', title: 'Registration', text: 'Beej, khaad aur spray ki registration ki aakhri date likhein — guzar jaye to POS par nahi bikti.' },
    { icon: Tags, color: '#16a34a', title: 'Bulk rate', text: '10 bori par 2% kam jaisa rate yahan likhein — POS quantity poori hote hi khud laga deta hai.' },
  ],
};

/** Agri product editor (routes /agri-products/new and /agri-products/:id/edit). */
export default function AgriProductWizardPage() {
  return <ProductEditorPage config={config} />;
}
