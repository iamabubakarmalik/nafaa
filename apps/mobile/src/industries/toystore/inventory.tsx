/**
 * Toys through the shared products list, editor and detail (web
 * ToyProductsPage, ToyProductWizardPage, ToyProductDetailPage). A toy carries
 * its type, age range, brand and character, safety marks (small parts,
 * certificates), cells it needs and gift marks (Eid, birthday, gift wrap).
 * Colours and models are variants; packs (dozen, carton) come from the Price
 * step.
 */

import { router } from 'expo-router';
import { AlertTriangle, Baby, BatteryCharging, Gift, Moon, ShieldAlert, Sparkles } from 'lucide-react-native';
import { cellsNeeded, toyErrors, youngWithSmallParts } from '@nafaa/core/industries/toystore';
import { formatMoney } from '@/core/format';
import { msg, t } from '@/core/i18n';
import { Card, ChipGroup, FormSection, Row, Switch, Text } from '@/design';
import { NumberInput } from '@/modules/inventory/components/fields';
import { registerInventoryIndustry } from '@/modules/inventory/industry/registry';
import type { CoreOptions, EditorConfig, StepContext, StepDef } from '@/modules/inventory/industry/types';
import { basicStep, priceStep, stockStep } from '@/modules/inventory/screens/editor/coreSteps';
import type { Errors } from '@/modules/inventory/screens/editor/types';
import { Input } from '@/design';
import { toyProductsApi, type ToyFact, type ToyProductProfile } from './api';
import { useToyFacts } from './hooks';
import { AGE_GROUPS, BATTERIES, CATEGORIES, CATEGORY_GROUPS, CERTIFICATIONS, GENDERS, KEYS, ageText, factLine, labelOf } from './meta';
import { useCategoryKindSync } from '@/modules/inventory/components/Pickers';

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
const Label = ({ children }: { children: string }) => <Text size="sm" weight="semibold" tone="secondary">{children}</Text>;

/** Chips from [code, source label] pairs. */
const pairs = (list: Array<[string, string]>) => list.map(([value, label]) => ({ value, label: t(label) }));

/* ───────────── basic step addition: type and brand ───────────── */

function Kind({ ctx }: { ctx: StepContext<ToyExtra> }) {
  const x = ctx.draft.extra;
  // The item type comes from the shop category's kind (nearest parent); the editor shows no separate picker.
  useCategoryKindSync(ctx.draft.core.categoryId, ctx.draft.extra.categoryType, (kind) => ctx.setExtra({ categoryType: kind }));
  return (
    <>
      <Input label={t('Brand')} value={x.brand} onChangeText={(brand) => ctx.setExtra({ brand })} placeholder={t('Hot Wheels, Barbie, Lego, local')} />
      <Input label={t('Character')} value={x.characterFranchise} onChangeText={(characterFranchise) => ctx.setExtra({ characterFranchise })} placeholder={t('Spider-Man, Frozen, Doraemon')} hint={t('Bachay isi naam se maangte hain — POS search me aata hai')} />
    </>
  );
}

/* ───────────── toy step: age, safety, cells, gift marks ───────────── */

function Toy({ ctx }: { ctx: StepContext<ToyExtra> }) {
  const x = ctx.draft.extra;
  const set = ctx.setExtra;
  const young = youngWithSmallParts(x);
  const e = ctx.errors;
  return (
    <>
      <FormSection title={t('Umar')} description={t('Kis umar ke bachay ke liye — POS ke umar chips aur Gift finder isi se chalte hain')}>
        <ChipGroup wrap multiple value={[...new Set([x.ageGroup, ...x.ageGroups])]}
          onChange={(next) => {
            const added = next.find((v) => v !== x.ageGroup && !x.ageGroups.includes(v));
            if (added) return set({ ageGroups: [...x.ageGroups, added] });
            const removed = [x.ageGroup, ...x.ageGroups].find((v) => !next.includes(v));
            if (removed === x.ageGroup) return set({ ageGroup: x.ageGroups[0] ?? 'ALL_AGES', ageGroups: x.ageGroups.slice(1) });
            set({ ageGroups: x.ageGroups.filter((v) => v !== removed) });
          }}
          options={AGE_GROUPS.map(([v, l]) => ({ value: v, label: `${t(l)}${x.ageGroup === v ? ' ★' : ''}` }))} />
        <Text size="xs" tone="muted">{t('★ asal umar hai; baqi chips bhi chun sakte hain jin me ye khilona chalta hai.')}</Text>
        <Row gap={2}>
          <NumberInput integer containerStyle={{ flex: 1 }} label={t('Kam se kam umar')} value={x.ageMinYears} onChangeValue={(ageMinYears) => set({ ageMinYears })} trailing={<Text size="sm" tone="muted">{t('saal')}</Text>} error={e.age} />
          <NumberInput integer containerStyle={{ flex: 1 }} label={t('Zyada se zyada umar')} value={x.ageMaxYears} onChangeValue={(ageMaxYears) => set({ ageMaxYears })} trailing={<Text size="sm" tone="muted">{t('saal')}</Text>} />
        </Row>
        <Label>{t('Kis ke liye')}</Label>
        <ChipGroup wrap value={x.genderTarget} onChange={(genderTarget) => set({ genderTarget })} options={pairs(GENDERS)} />
      </FormSection>

      <FormSection title={t('Safety')} description={t('Chhote purze wale khilone 3 saal se chhote bachon ko na dein — POS par nishani aati hai')}>
        <Switch value={x.chokingHazard} onChange={(chokingHazard) => set({ chokingHazard, smallPartsWarning: chokingHazard || x.smallPartsWarning })} label={t('Chhote purze (gale me phans sakte hain)')} description={t('3 saal se kam umar ke liye nahi')} />
        <Switch value={x.isNonToxic} onChange={(isNonToxic) => set({ isNonToxic })} label={t('Non-toxic')} description={t('Rang aur plastic bachon ke liye mehfooz')} />
        {young && <Card tone="warning"><Text size="sm">{t('Umar 3 saal se kam likhi hai magar chhote purze hain — dobara dekh lein.')}</Text></Card>}
        <Label>{t('Certificate (dabbe par likha ho)')}</Label>
        <ChipGroup wrap multiple value={x.safetyCertifications} onChange={(safetyCertifications) => set({ safetyCertifications })} options={pairs(CERTIFICATIONS)} />
      </FormSection>

      <FormSection title={t('Cell aur remote')} description={t('Cell dabbe me na hon to POS par yaad dilaya jata hai')}>
        <Switch value={x.requiresBatteries} onChange={(requiresBatteries) => set({ requiresBatteries, batteriesIncluded: requiresBatteries && x.batteriesIncluded })} label={t('Cell se chalta hai')} />
        <Switch value={x.isRemoteControlled} onChange={(isRemoteControlled) => set({ isRemoteControlled })} label={t('Remote control')} />
        {x.requiresBatteries && (
          <>
            <ChipGroup wrap value={x.batteryType} onChange={(batteryType) => set({ batteryType: x.batteryType === batteryType ? '' : batteryType })} options={BATTERIES.map((b) => ({ value: b, label: b }))} />
            <NumberInput integer label={t('Kitne cell')} value={x.batteryQuantity} onChangeValue={(batteryQuantity) => set({ batteryQuantity: batteryQuantity == null ? null : Math.round(batteryQuantity) })} error={e.cells} />
            <Switch value={x.batteriesIncluded} onChange={(batteriesIncluded) => set({ batteriesIncluded })} label={t('Cell dabbe me hain')} />
          </>
        )}
      </FormSection>

      <FormSection title={t('Aur tafseel')}>
        <Input label={t('Material')} value={x.material} onChangeText={(material) => set({ material })} placeholder={t('Plastic, lakri, kapra')} />
        <Row gap={2}>
          <NumberInput integer containerStyle={{ flex: 1 }} label={t('Kitne piece')} value={x.numberOfPieces} onChangeValue={(numberOfPieces) => set({ numberOfPieces: numberOfPieces == null ? null : Math.round(numberOfPieces) })} hint={t('Puzzle, blocks')} />
          <NumberInput integer containerStyle={{ flex: 1 }} label={t('Warranty')} value={x.warrantyMonths} onChangeValue={(warrantyMonths) => set({ warrantyMonths: warrantyMonths == null ? null : Math.round(warrantyMonths) })} trailing={<Text size="sm" tone="muted">{t('mahine')}</Text>} />
        </Row>
        <Switch value={x.isEducational} onChange={(isEducational) => set({ isEducational })} label={t('Educational / seekhne wala')} description={t('Gift finder me school wale bachon ke liye upar aata hai')} />
      </FormSection>

      <FormSection title={t('Gift')} description={t('Eid aur saalgirah ke season me in khilonon ki list alag dikhti hai')}>
        <Switch value={x.isEidGift} onChange={(isEidGift) => set({ isEidGift })} label={t('Eid gift')} />
        <Switch value={x.isBirthdayGift} onChange={(isBirthdayGift) => set({ isBirthdayGift })} label={t('Saalgirah gift')} />
        <Switch value={x.giftWrapAvailable} onChange={(giftWrapAvailable) => set({ giftWrapAvailable })} label={t('Gift wrap ho sakta hai')} />
      </FormSection>
    </>
  );
}

/* ───────────── price step addition: printed price ───────────── */

function Mrp({ ctx }: { ctx: StepContext<ToyExtra> }) {
  return (
    <FormSection title={t('Dabbe par likhi qeemat (MRP)')} description={t('Marzi hai — receipt par bachat dikhane ke liye')}>
      <NumberInput label={t('MRP')} prefix="Rs" value={ctx.draft.extra.mrp} onChangeValue={(mrp) => ctx.setExtra({ mrp })} error={ctx.errors.mrp} />
    </FormSection>
  );
}

const ERROR_TEXT = {
  ageNegative: msg('Umar manfi nahi ho sakti'), ageOrder: msg('Zyada wali umar kam wali se choti hai'), cells: msg('Kam se kam 1 cell'), mrp: msg('MRP bechne ki qeemat se kam hai'),
};

const core: CoreOptions = {
  units: [{ value: 'pcs', label: msg('Piece') }, { value: 'set', label: msg('Set') }, { value: 'pack', label: msg('Pack') }, { value: 'box', label: msg('Box') }],
  skuPrefix: 'TOY',
  packs: true,
  variants: { presets: [
    { group: msg('Rang'), values: ['Red', 'Blue', 'Pink', 'Yellow', 'Green', 'Black', 'White'] },
    { group: msg('Size'), values: ['Small', 'Medium', 'Large'] },
  ] },
  batches: false,
  markups: [20, 30, 40, 50, 60],
};

function checks(x: ToyExtra, price?: number): Errors {
  const e = toyErrors({ ...x, price });
  const out: Errors = {};
  for (const [k, v] of Object.entries(e)) out[k] = t(ERROR_TEXT[v as keyof typeof ERROR_TEXT]);
  return out;
}

const toyStep: StepDef<ToyExtra> = { id: 'toy', title: msg('Umar aur safety'), icon: Baby, render: (ctx) => <Toy ctx={ctx} />, validate: (d) => { const { mrp: _m, ...rest } = checks(d.extra); return rest; } };

const editor: EditorConfig<ToyExtra> = {
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
      const profile: Record<string, unknown> = {
        productId, categoryType: x.categoryType || undefined,
        ageGroup: x.ageGroup, ageGroups: [...new Set([x.ageGroup, ...x.ageGroups])],
        ageMinYears: num(x.ageMinYears), ageMaxYears: num(x.ageMaxYears), genderTarget: x.genderTarget,
        brand: opt(x.brand), characterFranchise: opt(x.characterFranchise), material: opt(x.material), numberOfPieces: num(x.numberOfPieces),
        isEducational: x.isEducational, requiresBatteries: x.requiresBatteries, batteriesIncluded: x.requiresBatteries && x.batteriesIncluded,
        batteryType: x.requiresBatteries ? opt(x.batteryType) : undefined, batteryQuantity: x.requiresBatteries ? num(x.batteryQuantity) : undefined,
        isRemoteControlled: x.isRemoteControlled, chokingHazard: x.chokingHazard, smallPartsWarning: x.smallPartsWarning, isNonToxic: x.isNonToxic,
        safetyCertifications: x.safetyCertifications, isEidGift: x.isEidGift, isBirthdayGift: x.isBirthdayGift, giftWrapAvailable: x.giftWrapAvailable,
        warrantyMonths: num(x.warrantyMonths), mrp: num(x.mrp), retailPrice: d.core.price, costPrice: d.core.costPrice, notes: opt(x.notes),
      };
      await toyProductsApi.upsert(Object.fromEntries(Object.entries(profile).filter(([, v]) => v !== undefined)));
    },
  },
  steps: ([
    basicStep<ToyExtra>(core, { extra: (ctx) => <Kind ctx={ctx} />, namePlaceholder: msg('Jaise: Remote car 1:18 ya Barbie doll') }),
    toyStep,
    priceStep<ToyExtra>(core, { extra: (ctx) => <Mrp ctx={ctx} /> }),
    stockStep<ToyExtra>(core, { quick: [1, 6, 12, 24, 48] }),
  ] as Array<StepDef<ToyExtra>>).map((s): StepDef<ToyExtra> => (s.id === 'price'
    ? { ...s, validate: (d, edit) => ({ ...s.validate?.(d, edit), ...(checks(d.extra, d.core.price).mrp ? { mrp: checks(d.extra, d.core.price).mrp } : {}) }) }
    : s)),
  summary: (d) => {
    const x = d.extra;
    const rows: Array<[string, string]> = [];
    const facts = [ageText({ ageGroup: x.ageGroup, ageMinYears: x.ageMinYears, ageMaxYears: x.ageMaxYears }), labelOf(CATEGORIES, x.categoryType), x.brand].filter(Boolean);
    if (facts.length) rows.push([t('Tafseel'), facts.join(' · ')]);
    if (x.chokingHazard) rows.push([t('Safety'), t('Chhote purze — 3 saal se kam nahi')]);
    const cells = cellsNeeded({ ...x }, t('haan'));
    if (cells) rows.push([t('Cell'), t('Cell alag: {{value}}', { value: cells })]);
    return rows;
  },
};

type Facts = Map<string, ToyFact>;

registerInventoryIndustry({
  id: 'toystore',
  label: msg('Toy shop'),
  categoryKinds: CATEGORIES.filter(([v]) => v !== 'OTHER').map(([value, label]) => ({ value, label })),
  list: {
    noun: 'khilona',
    filters: ['tags'],
    useSource: useToyFacts,
    extras: (item, ctx) => {
      const f = (ctx.source as Facts | undefined)?.get(item.id);
      if (!f) return {};
      const cells = cellsNeeded(f, t('cell'));
      return {
        line: factLine(f),
        badges: f.chokingHazard ? [{ label: t('3 saal se kam nahi'), tone: 'warning' as const }] : [],
        chips: [...(cells ? [t('Cell alag: {{cells}}', { cells })] : []), ...(f.isEidGift ? [t('Eid')] : []), ...(f.isEducational ? [t('Educational')] : [])],
      };
    },
    actions: [
      { icon: Gift, label: msg('Gift packs'), href: '/toystore/gift-packs' },
      { icon: ShieldAlert, label: msg('Safety'), href: '/toystore/safety-review' },
    ],
    stockChips: () => [1, 6, 12, 24],
    guide: [
      { icon: Baby, title: msg('Umar'), text: msg('Har khilone par umar likhein — POS par umar ke chips se foran milta hai aur Gift finder bhi isi se chalta hai.') },
      { icon: AlertTriangle, title: msg('Chhote purze'), text: msg('3 saal se chhote bachon ke liye "Chhote purze" wale khilone POS par peeli nishani ke saath aate hain.') },
      { icon: BatteryCharging, title: msg('Cell'), text: msg('Jis khilone ke cell dabbe me nahi, us par "Cell alag" aata hai — customer ko cell bhi de dein.') },
      { icon: Sparkles, title: msg('Rang aur model'), text: msg('Ek khilona kai rang me ho to Stock step me rang ko variant banayein — har rang ka stock alag.') },
    ],
  },
  editor,
  detail: {
    extra: { key: KEYS.detail, load: async (id) => ({ toy: await toyProductsApi.byProduct(id).catch(() => null) }) },
    badges: ({ extra }) => {
      const p = (extra as { toy: ToyProductProfile | null } | undefined)?.toy;
      if (!p) return [];
      return [
        { label: ageText(p) || t('Umar'), tone: 'accent' as const },
        ...(p.categoryType ? [{ label: labelOf(CATEGORIES, p.categoryType), tone: 'neutral' as const }] : []),
        ...(p.chokingHazard ? [{ label: t('Chhote purze'), tone: 'warning' as const }] : []),
        ...(p.isEidGift ? [{ label: t('Eid gift'), tone: 'success' as const }] : []),
      ];
    },
    facts: ({ extra }) => {
      const p = (extra as { toy: ToyProductProfile | null } | undefined)?.toy;
      if (!p) return [];
      const certs = (p.safetyCertifications ?? []).map((c) => labelOf(CERTIFICATIONS, c)).join(', ');
      const rows: Array<[string, string | undefined]> = [
        [t('Brand'), p.brand], [t('Character'), p.characterFranchise], [t('Kis ke liye'), labelOf(GENDERS, p.genderTarget)],
        [t('Material'), p.material], [t('Piece'), p.numberOfPieces ? String(p.numberOfPieces) : undefined],
        [t('Cell'), p.requiresBatteries ? `${[p.batteryQuantity, p.batteryType].filter(Boolean).join(' x ') || t('Haan')}${p.batteriesIncluded ? t(' (dabbe me)') : t(' (alag)')}` : undefined],
        [t('Remote'), p.isRemoteControlled ? t('Haan') : undefined],
        [t('Certificate'), certs || undefined], [t('Warranty'), p.warrantyMonths ? t('{{count}} mahine', { count: p.warrantyMonths }) : undefined],
        ['MRP', p.mrp ? formatMoney(p.mrp) : undefined],
        [t('Gift'), [p.isBirthdayGift && t('Saalgirah'), p.isEidGift && t('Eid'), p.giftWrapAvailable && t('Gift wrap')].filter(Boolean).join(' · ') || undefined],
      ];
      return rows.filter((r): r is [string, string] => !!r[1]);
    },
    alerts: ({ extra }) => {
      const p = (extra as { toy: ToyProductProfile | null } | undefined)?.toy;
      if (!p) return <Card tone="muted"><Text size="sm">{t('Is khilone par umar aur safety nahi likhi — Edit se likhein, POS ke umar chips me aa jayega.')}</Text></Card>;
      const cells = cellsNeeded(p, t('cell'));
      if (!p.chokingHazard && !cells) return null;
      return (
        <>
          {p.chokingHazard && <Card tone="warning" onPress={() => router.push('/toystore/safety-review' as never)}><Text size="sm" weight="medium">{t('Chhote purze hain — 3 saal se chhote bachay ke liye na dein.')}</Text><Text size="xs" tone="brand">{t('Safety review →')}</Text></Card>}
          {cells && <Card tone="info"><Text size="sm" weight="medium">{t('Cell dabbe me nahi ({{cells}}) — bechte waqt cell bhi pesh karein.', { cells })}</Text></Card>}
        </>
      );
    },
    stockChips: [1, 6, 12, 24],
  },
});
