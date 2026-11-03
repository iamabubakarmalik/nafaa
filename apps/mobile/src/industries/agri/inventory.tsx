/**
 * Agri products through the shared products list, editor and detail (web
 * AgriProductWizardPage, AgriProductsListPage): what kind of input it is (seed,
 * fertilizer, spray, feed, tool), pack weight and formula, crops and season,
 * spray safety, government registration and a bulk rate. Stock opens by batch
 * with expiry (sprays).
 */

import { CalendarX, Leaf, ShieldAlert, Sprout } from 'lucide-react-native';
import { View } from 'react-native';
import { deriveAgriKind, isFeedKind, isFertKind, isSeedKind, isSprayKind, needsGovtReg, type AgriKind } from '@nafaa/core/industries/agri';
import { formatDate } from '@/core/format';
import { msg, t } from '@/core/i18n';
import { Card, ChipGroup, DatePicker, FormSection, Input, Row, Switch, Text } from '@/design';
import { Tiles, NumberInput } from '@/modules/inventory/components/fields';
import { registerInventoryIndustry } from '@/modules/inventory/industry/registry';
import type { CoreOptions, EditorConfig, StepContext, StepDef } from '@/modules/inventory/industry/types';
import { basicStep, priceStep, stockStep } from '@/modules/inventory/screens/editor/coreSteps';
import type { Errors } from '@/modules/inventory/screens/editor/types';
import { dateToKey, keyToDate } from '../_shared/deskKit';
import { agriProductsApi, type AgriCategory, type AgriProductProfile, type FeedType, type FertilizerType, type SeasonType, type SeedType } from './api';
import { useAgriFacts, factLine } from './facts';
import { AGRI_KEYS, CROPS, KIND_LABEL, SEASONS, certText, kindLabel, opt, seasonLabel } from './meta';

export interface AgriExtra {
  category: AgriCategory; seedType: SeedType | ''; fertilizerType: FertilizerType | ''; feedType: FeedType | ''; brand: string; manufacturer: string;
  packSize: string; packUnit: string; npkRatio: string; activeIngredient: string; concentration: string; targetCrops: string[]; targetPests: string; season: SeasonType | '';
  applicationRate: string; applicationMethod: string; toxicityLevel: string; reEntryPeriod: number | null; ppePeriod: number | null; warningLabel: string;
  govtRegNumber: string; govtRegExpiry: string; isRestricted: boolean; requiresLicense: boolean; isOrganic: boolean; bulkDiscountThreshold: number | null; bulkDiscountPct: number | null;
  storageInstructions: string;
}
const initial: AgriExtra = {
  category: 'FERTILIZER', seedType: '', fertilizerType: '', feedType: '', brand: '', manufacturer: '', packSize: '50', packUnit: 'kg', npkRatio: '', activeIngredient: '', concentration: '',
  targetCrops: [], targetPests: '', season: '', applicationRate: '', applicationMethod: '', toxicityLevel: '', reEntryPeriod: null, ppePeriod: null, warningLabel: '',
  govtRegNumber: '', govtRegExpiry: '', isRestricted: false, requiresLicense: false, isOrganic: false, bulkDiscountThreshold: null, bulkDiscountPct: null, storageInstructions: '',
};

const KINDS: Array<{ value: AgriCategory; label: string }> = [
  { value: 'SEEDS', label: msg('Beej') }, { value: 'FERTILIZER', label: msg('Khaad') }, { value: 'INSECTICIDE', label: msg('Keeray ki dawa') }, { value: 'HERBICIDE', label: msg('Ghaas ki dawa') },
  { value: 'FUNGICIDE', label: msg('Fungus ki dawa') }, { value: 'PLANT_NUTRIENT', label: msg('Ghiza / zinc') }, { value: 'ANIMAL_FEED', label: msg('Feed') },
  { value: 'VETERINARY_MEDICINE', label: msg('Jaanwar ki dawa') }, { value: 'FARM_TOOLS', label: msg('Auzaar / sprayer') }, { value: 'OTHER', label: msg('Kuch aur') },
];
const SEED_TYPES: Array<[SeedType, string]> = [['WHEAT', msg('Gandum')], ['COTTON', msg('Kapas')], ['RICE', msg('Chawal')], ['MAIZE', msg('Makai')], ['SUGARCANE', msg('Ganna')], ['POTATO', msg('Aloo')], ['VEGETABLES', msg('Sabzi')], ['FODDER', msg('Chara')], ['OILSEEDS', msg('Tel wale')], ['OTHER', msg('Aur')]];
const FERT_TYPES: Array<[FertilizerType, string]> = [['UREA', msg('Urea')], ['DAP', 'DAP'], ['NPK', 'NPK'], ['POTASH', msg('Potash (SOP/MOP)')], ['ZINC', msg('Zinc')], ['BORON', msg('Boron')], ['ORGANIC', msg('Organic')], ['LIQUID', msg('Liquid')], ['OTHER', msg('Aur')]];
const FEED_TYPES: Array<[FeedType, string]> = [['CONCENTRATE', msg('Wanda')], ['STARTER', msg('Starter')], ['GROWER', msg('Grower')], ['FINISHER', msg('Finisher')], ['LAYER', msg('Layer')], ['MINERAL_MIX', msg('Mineral mix')], ['OIL_CAKE', msg('Khal')], ['BRAN', msg('Chokar')], ['OTHER', msg('Aur')]];
const PACK_UNITS = ['kg', 'gram', 'litre', 'ml'];
const TOXICITY = [{ v: 'I', l: msg('Laal (bohat zehreeli)') }, { v: 'II', l: msg('Peeli') }, { v: 'III', l: msg('Neeli') }, { v: 'IV', l: msg('Hari (kam)') }];
const pick = (cur: string, v: string) => (cur === v ? '' : v);
const spray = (k: string) => isSprayKind(k as AgriKind);

function Kind({ ctx }: { ctx: StepContext<AgriExtra> }) {
  const x = ctx.draft.extra;
  const k = x.category as AgriKind;
  const sub: Array<[string, string]> | null = isSeedKind(k) ? SEED_TYPES : isFertKind(k) ? FERT_TYPES : isFeedKind(k) ? FEED_TYPES : null;
  const subValue = isSeedKind(k) ? x.seedType : isFertKind(k) ? x.fertilizerType : x.feedType;
  const setSub = (v: string) => ctx.setExtra(isSeedKind(k) ? { seedType: v as SeedType } : isFertKind(k) ? { fertilizerType: v as FertilizerType } : { feedType: v as FeedType });
  return (
    <>
      <FormSection title={t('Kya cheez hai')} description={t('Isi se POS ka filter, registration ki shart aur spray ki hifazat ka sawal tay hota hai')}>
        <Tiles columns={2} value={x.category} onChange={(category) => ctx.setExtra({ category, ...(spray(category) && !['litre', 'ml'].includes(x.packUnit) ? { packUnit: 'ml', packSize: '' } : {}) })} options={KINDS.map((o) => ({ value: o.value, label: t(o.label) }))} />
        {sub && <ChipGroup wrap value={subValue} onChange={(v) => setSub(pick(subValue, v))} options={sub.map(([value, label]) => ({ value, label: t(label) }))} />}
      </FormSection>
      <FormSection title={t('Company')}>
        <Input label={t('Company')} value={x.manufacturer} onChangeText={(manufacturer) => ctx.setExtra({ manufacturer })} placeholder={t('Fauji, Engro, Syngenta, ICI…')} hint={t('Card par dikhti hai — company ka maal isi se dhoondte hain')} />
        <Input label={t('Brand')} value={x.brand} onChangeText={(brand) => ctx.setExtra({ brand })} placeholder={t('Sona Urea, Confidor…')} hint={t('Marzi hai')} />
      </FormSection>
    </>
  );
}

function Usage({ ctx }: { ctx: StepContext<AgriExtra> }) {
  const x = ctx.draft.extra;
  const k = x.category as AgriKind;
  return (
    <View style={{ gap: 16 }}>
      <FormSection title={t('Pack')} description={t('Ek bori / bottle me kitna — receipt par kul kilo isi se banta hai')}>
        <NumberInput label={t('Wazan / hajm')} value={x.packSize ? Number(x.packSize) : null} onChangeValue={(v) => ctx.setExtra({ packSize: v == null ? '' : String(v) })} error={ctx.errors.packSize} />
        <ChipGroup value={x.packUnit} onChange={(packUnit) => ctx.setExtra({ packUnit })} options={PACK_UNITS.map((u) => ({ value: u, label: u }))} />
      </FormSection>
      {(isFertKind(k) || spray(x.category) || k === 'PLANT_NUTRIENT') && (
        <FormSection title={t('Formula')} description={t('Farmer aksar formula se maangta hai — POS search me bhi aata hai')}>
          {isFertKind(k) && <Input label={t('NPK')} value={x.npkRatio} onChangeText={(npkRatio) => ctx.setExtra({ npkRatio })} placeholder="46-0-0, 18-46-0" ltr />}
          <Input label={t('Active ingredient')} value={x.activeIngredient} onChangeText={(activeIngredient) => ctx.setExtra({ activeIngredient })} placeholder={t('Imidacloprid, Zinc sulphate')} />
          <Input label={t('Strength')} value={x.concentration} onChangeText={(concentration) => ctx.setExtra({ concentration })} placeholder={t('20% SL, 33%')} />
        </FormSection>
      )}
      <FormSection title={t('Kis fasal ke liye')} description={t("POS par 'gandum' likhne se ye cheez aa jati hai; fasal calendar me bijai se pehle stock dekha jata hai")}>
        <ChipGroup wrap multiple value={x.targetCrops} onChange={(targetCrops) => ctx.setExtra({ targetCrops })} options={CROPS.map((c) => ({ value: c, label: t(c) }))} />
        {spray(x.category) && <Input label={t('Kis keeray / bimari ke liye')} value={x.targetPests} onChangeText={(targetPests) => ctx.setExtra({ targetPests })} placeholder={t('Sundi, safed makhi, tela (comma se alag)')} />}
        <Text size="sm" weight="medium" tone="secondary">{t('Season')}</Text>
        <ChipGroup wrap value={x.season} onChange={(v) => ctx.setExtra({ season: pick(x.season, v) as SeasonType | '' })} options={SEASONS.map((s) => ({ value: s.value, label: t(s.label) }))} />
      </FormSection>
      <FormSection title={t('Istemal')} description={t('Receipt par chhapta hai — farmer ko dose yaad rehti hai')}>
        <Input label={t('Dose')} value={x.applicationRate} onChangeText={(applicationRate) => ctx.setExtra({ applicationRate })} placeholder={t('1 bori fi acre, 250 ml fi acre')} />
        <Input label={t('Tareeqa')} value={x.applicationMethod} onChangeText={(applicationMethod) => ctx.setExtra({ applicationMethod })} placeholder={t('Chhatta, spray, paani ke sath')} />
      </FormSection>
    </View>
  );
}

function Rules({ ctx }: { ctx: StepContext<AgriExtra> }) {
  const x = ctx.draft.extra;
  const cert = x.govtRegExpiry ? certText(x.govtRegExpiry) : null;
  return (
    <View style={{ gap: 16 }}>
      <FormSection title={t('Sarkari registration')} description={t('Registration ki date guzar jaye to POS par ye cheez nahi bikti')}>
        <Input label={t('Registration number')} value={x.govtRegNumber} onChangeText={(govtRegNumber) => ctx.setExtra({ govtRegNumber })} placeholder={t('Reg. No. 1234/2025')} />
        <DatePicker label={t('Aakhri date')} value={keyToDate(x.govtRegExpiry)} onChange={(d) => ctx.setExtra({ govtRegExpiry: dateToKey(d) })} />
        {cert && <Text size="xs" tone={cert.state === 'expired' ? 'danger' : cert.state === 'soon' ? 'warning' : 'muted'}>{cert.text}</Text>}
        <Switch value={x.isRestricted} onChange={(isRestricted) => ctx.setExtra({ isRestricted })} label={t('Pabandi wali')} description={t('POS par yaad dihani aati hai')} />
        <Switch value={x.requiresLicense} onChange={(requiresLicense) => ctx.setExtra({ requiresLicense })} label={t('License zaroori')} description={t('Farmer ka license dekh kar')} />
        <Switch value={x.isOrganic} onChange={(isOrganic) => ctx.setExtra({ isOrganic })} label={t('Organic')} />
      </FormSection>
      {spray(x.category) && (
        <FormSection title={t('Spray ki hifazat')} description={t('Receipt par chhapta hai: kitne din khet me na jayein aur katai se kitne din pehle band')}>
          <Text size="sm" weight="medium" tone="secondary">{t('Zeher ka darja (dabbe ki patti ka rang)')}</Text>
          <ChipGroup wrap value={x.toxicityLevel} onChange={(v) => ctx.setExtra({ toxicityLevel: pick(x.toxicityLevel, v) })} options={TOXICITY.map((o) => ({ value: o.v, label: t(o.l) }))} />
          <NumberInput label={t('Spray ke baad khet me na jayein')} integer value={x.reEntryPeriod} onChangeValue={(reEntryPeriod) => ctx.setExtra({ reEntryPeriod })} hint={t('din')} />
          <NumberInput label={t('Katai se pehle band karein')} integer value={x.ppePeriod} onChangeValue={(ppePeriod) => ctx.setExtra({ ppePeriod })} hint={t('din')} />
          <Input label={t('Khabardar')} value={x.warningLabel} onChangeText={(warningLabel) => ctx.setExtra({ warningLabel })} placeholder={t('Bachon se door rakhein, khali dabba zameen me dabayein')} />
        </FormSection>
      )}
    </View>
  );
}

function Bulk({ ctx }: { ctx: StepContext<AgriExtra> }) {
  const x = ctx.draft.extra;
  const rate = x.bulkDiscountPct ? ctx.draft.core.price * (1 - x.bulkDiscountPct / 100) : null;
  return (
    <FormSection title={t('Bulk rate')} description={t('Itni boriyan ek bill me hon to POS khud kam rate lagata hai')}>
      <NumberInput label={t('Kam se kam quantity')} value={x.bulkDiscountThreshold} onChangeValue={(bulkDiscountThreshold) => ctx.setExtra({ bulkDiscountThreshold })} error={ctx.errors.bulk} />
      <NumberInput label={t('Discount')} value={x.bulkDiscountPct} onChangeValue={(bulkDiscountPct) => ctx.setExtra({ bulkDiscountPct })} hint="%" />
      {rate !== null && x.bulkDiscountThreshold ? <Text size="sm" tone="secondary">{t('{{bulkDiscountThreshold}}+ par rate Rs {{value}}', { bulkDiscountThreshold: x.bulkDiscountThreshold, value: Math.round(rate * 100) / 100 })}</Text> : null}
    </FormSection>
  );
}

const core: CoreOptions = {
  units: [
    { value: 'bag', label: msg('Bori') }, { value: 'kg', label: msg('Kilo') }, { value: 'bottle', label: msg('Bottle') }, { value: 'litre', label: msg('Litre') }, { value: 'packet', label: msg('Packet') },
    { value: 'ml', label: 'ml' }, { value: 'gram', label: msg('Gram') }, { value: 'ton', label: msg('Ton') }, { value: 'pcs', label: msg('Adad (pcs)') }, { value: 'bundle', label: msg('Bundle') },
  ],
  skuPrefix: 'AGR', packs: true, variants: false, batches: true, markups: [2, 3, 5, 8, 10],
};

const usageStep: StepDef<AgriExtra> = {
  id: 'usage', title: msg('Fasal aur pack'), icon: Sprout, render: (ctx) => <Usage ctx={ctx} />,
  validate: (d): Errors => (d.extra.packSize && !(Number(d.extra.packSize) > 0) ? { packSize: t('Wazan sahi likhein (jaise 50)') } : {}),
};
const rulesStep: StepDef<AgriExtra> = {
  id: 'rules', title: msg('Registration'), icon: ShieldAlert, render: (ctx) => <Rules ctx={ctx} />,
  when: (d) => needsGovtReg(d.extra.category as AgriKind) || spray(d.extra.category),
};

const price = priceStep<AgriExtra>(core, { extra: (ctx) => <Bulk ctx={ctx} /> });
const priceWithBulk: StepDef<AgriExtra> = {
  ...price,
  validate: (d, isEdit) => {
    const e = price.validate?.(d, isEdit) ?? {};
    const { bulkDiscountThreshold: min, bulkDiscountPct: pct } = d.extra;
    if ((min && !pct) || (!min && pct)) e.bulk = t('Bulk rate ke liye quantity aur % dono likhein');
    else if (pct != null && (pct < 0 || pct > 90)) e.bulk = t('Discount 0 se 90% tak');
    return e;
  },
};

const toProfile = (productId: string, x: AgriExtra): Partial<AgriProductProfile> => ({
  productId, category: x.category,
  seedType: isSeedKind(x.category as AgriKind) && x.seedType ? x.seedType : undefined,
  fertilizerType: isFertKind(x.category as AgriKind) && x.fertilizerType ? x.fertilizerType : undefined,
  feedType: isFeedKind(x.category as AgriKind) && x.feedType ? x.feedType : undefined,
  brand: opt(x.brand), manufacturer: opt(x.manufacturer), packSize: opt(x.packSize), packUnit: opt(x.packUnit), npkRatio: opt(x.npkRatio), activeIngredient: opt(x.activeIngredient), concentration: opt(x.concentration),
  targetCrops: x.targetCrops, targetPests: x.targetPests.split(',').map((s) => s.trim()).filter(Boolean), season: x.season || undefined, applicationRate: opt(x.applicationRate), applicationMethod: opt(x.applicationMethod),
  toxicityLevel: opt(x.toxicityLevel), reEntryPeriod: x.reEntryPeriod ?? undefined, ppePeriod: x.ppePeriod ?? undefined, warningLabel: opt(x.warningLabel),
  govtRegNumber: opt(x.govtRegNumber), govtRegExpiry: opt(x.govtRegExpiry), isRestricted: x.isRestricted, requiresLicense: x.requiresLicense, isOrganic: x.isOrganic,
  bulkDiscountThreshold: x.bulkDiscountThreshold ?? undefined, bulkDiscountPct: x.bulkDiscountPct ?? undefined, storageInstructions: opt(x.storageInstructions),
});

const editor: EditorConfig<AgriExtra> = {
  core,
  extra: {
    initial,
    load: async (productId) => {
      const p = await agriProductsApi.byProduct(productId).catch(() => null);
      if (!p) return {};
      return {
        category: p.category, seedType: p.seedType ?? '', fertilizerType: p.fertilizerType ?? '', feedType: p.feedType ?? '', brand: p.brand ?? '', manufacturer: p.manufacturer ?? '',
        packSize: p.packSize ?? '', packUnit: p.packUnit ?? 'kg', npkRatio: p.npkRatio ?? '', activeIngredient: p.activeIngredient ?? '', concentration: p.concentration ?? '',
        targetCrops: p.targetCrops ?? [], targetPests: (p.targetPests ?? []).join(', '), season: p.season ?? '', applicationRate: p.applicationRate ?? '', applicationMethod: p.applicationMethod ?? '',
        toxicityLevel: p.toxicityLevel ?? '', reEntryPeriod: p.reEntryPeriod ?? null, ppePeriod: p.ppePeriod ?? null, warningLabel: p.warningLabel ?? '', govtRegNumber: p.govtRegNumber ?? '',
        govtRegExpiry: p.govtRegExpiry ? p.govtRegExpiry.slice(0, 10) : '', isRestricted: p.isRestricted, requiresLicense: p.requiresLicense, isOrganic: p.isOrganic,
        bulkDiscountThreshold: p.bulkDiscountThreshold ?? null, bulkDiscountPct: p.bulkDiscountPct ?? null, storageInstructions: p.storageInstructions ?? '',
      };
    },
    save: async (productId, d, { isEdit }) => {
      const body = toProfile(productId, d.extra);
      await (isEdit ? agriProductsApi.update(body) : agriProductsApi.upsert(body));
    },
  },
  steps: [
    basicStep<AgriExtra>(core, { extra: (ctx) => <Kind ctx={ctx} />, namePlaceholder: msg('Jaise: Sona Urea 50kg') }),
    usageStep,
    priceWithBulk,
    rulesStep,
    stockStep<AgriExtra>(core, { quick: [10, 50, 100, 500] }),
  ],
  summary: (d) => {
    const x = d.extra;
    return [
      [t('Kya cheez hai'), [kindLabel(x.category), x.packSize && `${x.packSize} ${x.packUnit}`, x.npkRatio, x.activeIngredient].filter(Boolean).join(' · ')],
      ...(x.targetCrops.length ? [[t('Fasal'), x.targetCrops.join(', ')] as [string, string]] : []),
      ...(x.govtRegExpiry && certText(x.govtRegExpiry).state === 'expired' ? [[t('Registration'), t('Registration khatam — POS par nahi bikegi')] as [string, string]] : []),
      ...(x.bulkDiscountThreshold && x.bulkDiscountPct ? [[t('Bulk rate'), t('{{bulkDiscountThreshold}}+ par {{bulkDiscountPct}}% kam', { bulkDiscountThreshold: x.bulkDiscountThreshold, bulkDiscountPct: x.bulkDiscountPct })] as [string, string]] : []),
    ];
  },
};

function useSource() { return useAgriFacts(); }

registerInventoryIndustry({
  id: 'agri',
  label: msg('Agri'),
  list: {
    noun: 'maal',
    filters: ['tags'],
    useSource,
    stockChips: () => [1, 10, 50, 100],
    extras: (item, ctx) => {
      const f = (ctx.source as Map<string, ReturnType<typeof useAgriFacts> extends Map<string, infer V> ? V : never> | undefined)?.get(item.id);
      const kind = (f?.category as AgriKind | undefined) ?? deriveAgriKind(item.category?.name, item.name);
      const cert = needsGovtReg(kind) ? certText(f?.govtRegExpiry) : null;
      const bulk = Number(f?.bulkDiscountThreshold) > 0 && Number(f?.bulkDiscountPct) > 0;
      return {
        line: factLine(f),
        ribbon: cert?.state === 'expired' ? { text: t('Reg khatam'), tone: 'danger' } : cert?.state === 'soon' ? { text: t('Reg jald khatam'), tone: 'warning' } : undefined,
        badges: bulk ? [{ label: t('Bulk'), tone: 'success' }] : [],
        chips: [...(kind !== 'OTHER' ? [t(KIND_LABEL[kind])] : []), ...(f?.season ? [seasonLabel(f.season)] : [])],
      };
    },
    actions: [{ icon: Sprout, label: msg('Fasal calendar'), href: '/agri/seasonal-plans' }, { icon: Leaf, label: msg('Farmers'), href: '/agri/farmers' }],
    guide: [
      { icon: Sprout, title: msg('Bori aur kilo'), text: msg('Base unit bori rakhein aur pack me "50 kg" likhein. Khula kilo bechna ho to Price step me "Kilo" pack jorein — stock bori ke hisaab se ghatta hai.') },
      { icon: ShieldAlert, title: msg('Sarkari registration'), text: msg('Beej, khaad aur spray ki registration ki aakhri date likhein. Date guzar jaye to POS par nahi bikti.') },
      { icon: CalendarX, title: msg('Spray ka batch'), text: msg('Company se maal lete waqt Purchase me batch aur expiry likhein. POS pehle jaldi expire hone wala batch bechta hai.') },
    ],
  },
  editor,
  detail: {
    extra: { key: AGRI_KEYS.profile, load: (id) => agriProductsApi.byProduct(id).catch(() => null) },
    badges: ({ extra }) => { const p = extra as AgriProductProfile | null | undefined; return p?.category ? [{ label: kindLabel(p.category), tone: 'success' as const }] : []; },
    facts: ({ extra }) => {
      const p = extra as AgriProductProfile | null | undefined;
      if (!p) return [];
      const rows: Array<[string, string | undefined]> = [
        [t('Company'), p.manufacturer], [t('Brand'), p.brand], [t('Pack'), Number(p.packSize) > 0 ? `${p.packSize} ${p.packUnit || 'kg'}` : undefined], [t('NPK'), p.npkRatio],
        [t('Active ingredient'), p.activeIngredient], [t('Strength'), p.concentration], [t('Fasal'), p.targetCrops?.join(', ')], [t('Keeray'), p.targetPests?.join(', ')],
        [t('Season'), p.season ? seasonLabel(p.season) : undefined], [t('Dose'), p.applicationRate], [t('Tareeqa'), p.applicationMethod],
        [t('Registration number'), p.govtRegNumber], [t('Registration'), p.govtRegExpiry ? `${formatDate(p.govtRegExpiry, { year: true })} · ${certText(p.govtRegExpiry).text}` : undefined],
        [t('Bulk rate'), p.bulkDiscountThreshold && p.bulkDiscountPct ? t('{{bulkDiscountThreshold}}+ par {{bulkDiscountPct}}% kam', { bulkDiscountThreshold: p.bulkDiscountThreshold, bulkDiscountPct: p.bulkDiscountPct }) : undefined],
      ];
      return rows.filter((r): r is [string, string] => !!r[1]);
    },
    alerts: ({ extra }) => {
      const p = extra as AgriProductProfile | null | undefined;
      if (!p?.govtRegExpiry) return null;
      const c = certText(p.govtRegExpiry);
      if (c.state !== 'expired' && c.state !== 'soon') return null;
      return <Card tone={c.state === 'expired' ? 'danger' : 'warning'}><Row gap={2}><ShieldAlert size={16} /><Text size="sm" weight="medium" style={{ flex: 1 }}>{c.text}</Text></Row></Card>;
    },
    stockChips: [1, 10, 50, 100],
  },
});
