/**
 * Jewelry through the shared products list, editor and detail (web
 * JewelryProducts, JewelryItemWizard, JewelryItemDetail): type and karat,
 * weights (gross, stones, net), banwai per gram / fixed / percent, kaat,
 * polish and hallmark charges, stones, and the price at today's rate that the
 * counter uses. Hallmark, certificate, buy-back and return terms in the last
 * step.
 */

import { router } from 'expo-router';
import { Award, Coins, Gem, Plus, Scale, ShieldCheck, Trash2, TrendingUp } from 'lucide-react-native';
import { View } from 'react-native';
import { TOLA, metalOf, piecePrice, profilePrice, r3, rateFor, type MetalType, type PricedPiece, type Purity } from '@nafaa/core/industries/jewelry';
import { formatMoney } from '@/core/format';
import { msg, t } from '@/core/i18n';
import { Amount, Badge, Button, Card, ChipGroup, FormSection, IconButton, Input, ListRow, MoneyInput, Row, Select, Switch, Text, useTheme } from '@/design';
import { NumberInput } from '@/modules/inventory/components/fields';
import { useCategoryKindSync } from '@/modules/inventory/components/Pickers';
import { registerInventoryIndustry } from '@/modules/inventory/industry/registry';
import type { CoreOptions, EditorConfig, StepContext, StepDef } from '@/modules/inventory/industry/types';
import { basicStep, priceStep, stockStep } from '@/modules/inventory/screens/editor/coreSteps';
import type { EditorDraft, Errors } from '@/modules/inventory/screens/editor/types';
import { jewelryProductsApi, type GemstoneType, type JewelryCategory, type JewelryProductProfile, type JewelryStyle } from './api';
import { KaratBadge, PurityPicker } from './components/ui';
import { JEWELRY_KINDS, KEYS, STONES, STYLES, categoryLabel, grams, purityLabel, tola, useMetalRates } from './meta';

interface Stone { type: GemstoneType; count: number; caret: number; totalValue: number }

export interface JewelryExtra {
  category: JewelryCategory; style: JewelryStyle; metalType: MetalType; purity: Purity;
  itemCode: string; designNumber: string; size: string;
  grossWeight: number; stoneWeight: number; netWeight: number;
  makingChargePerGram: number; makingChargeFixed: number; makingChargePct: number;
  wastagePct: number; wastageGrams: number; polishCharge: number; hallmarkCharge: number; otherCharges: number;
  stones: Stone[];
  hallmarkNumber: string; certificateNumber: string; isCertified: boolean;
  isBuyBackEligible: boolean; buyBackPct: number; isReturnable: boolean; returnDays: number;
  karigarName: string; isBridalCollection: boolean;
}

const initial: JewelryExtra = {
  category: 'OTHER', style: 'TRADITIONAL', metalType: 'GOLD', purity: 'KARAT_22', itemCode: '', designNumber: '', size: '',
  grossWeight: 0, stoneWeight: 0, netWeight: 0, makingChargePerGram: 0, makingChargeFixed: 0, makingChargePct: 0,
  wastagePct: 0, wastageGrams: 0, polishCharge: 0, hallmarkCharge: 0, otherCharges: 0, stones: [],
  hallmarkNumber: '', certificateNumber: '', isCertified: false, isBuyBackEligible: true, buyBackPct: 90, isReturnable: true, returnDays: 7,
  karigarName: '', isBridalCollection: false,
};

const opt = (s: string) => s.trim() || undefined;
const stonesTotal = (x: JewelryExtra) => x.stones.reduce((s, g) => s + (Number(g.totalValue) || 0), 0);

function Identity({ ctx }: { ctx: StepContext<JewelryExtra> }) {
  const th = useTheme();
  const x = ctx.draft.extra;
  // The jewelry type comes from the shop category's kind (nearest parent); the editor shows no separate picker.
  useCategoryKindSync(ctx.draft.core.categoryId, x.category, (category) => ctx.setExtra({ category: category as JewelryCategory }));
  return (
    <View style={{ gap: th.space(3) }}>
      <PurityPicker label={t('Karat / metal')} value={x.purity} onChange={(p) => ctx.setExtra({ purity: p, metalType: metalOf(p) })} />
      <Text size="xs" tone="muted">{t('Qeemat isi karat ke aaj ke rate se lagti hai')}</Text>
      <Select label={t('Design')} value={x.style} onChange={(v) => ctx.setExtra({ style: v as JewelryStyle })} options={STYLES.map(([v, l]) => ({ value: v, label: t(l) }))} />
      <Input label={t('Design number')} value={x.designNumber} onChangeText={(v) => ctx.setExtra({ designNumber: v })} placeholder="D-1042" ltr hint={t('Search me milta hai')} />
      <Input label={t('Size')} value={x.size} onChangeText={(v) => ctx.setExtra({ size: v })} placeholder={t('Angoothi 16, choori 2.6')} />
    </View>
  );
}

function Weights({ ctx }: { ctx: StepContext<JewelryExtra> }) {
  const th = useTheme();
  const x = ctx.draft.extra;
  const { rates, isLoading } = useMetalRates();
  const rate = rateFor(rates, x.metalType, x.purity);
  const price = rate ? piecePrice({
    netWeight: x.netWeight, ratePerGram: rate.ratePerGram, makingChargePerGram: x.makingChargePerGram, makingChargeFixed: x.makingChargeFixed, makingChargePct: x.makingChargePct,
    wastagePct: x.wastagePct, wastageGrams: x.wastageGrams, polishCharges: x.polishCharge + x.otherCharges, hallmarkCharges: x.hallmarkCharge, stoneValue: stonesTotal(x),
  }) : null;
  const setWeight = (patch: Partial<Pick<JewelryExtra, 'grossWeight' | 'stoneWeight'>>) => {
    const next = { grossWeight: x.grossWeight, stoneWeight: x.stoneWeight, ...patch };
    ctx.setExtra({ ...patch, netWeight: r3(Math.max(next.grossWeight - next.stoneWeight, 0)) });
  };
  const setStone = (i: number, patch: Partial<Stone>) => ctx.setExtra({ stones: x.stones.map((s, j) => (j === i ? { ...s, ...patch } : s)) });
  const num = (key: keyof JewelryExtra) => (v: number | null) => ctx.setExtra({ [key]: v ?? 0 } as Partial<JewelryExtra>);
  return (
    <View style={{ gap: th.space(5) }}>
      <FormSection title={t('Wazan')} description={t('Kaante par tol kar likhein — nag ka wazan alag')}>
        <NumberInput label={t('Kul wazan (g)')} value={x.grossWeight || null} onChangeValue={(v) => setWeight({ grossWeight: v ?? 0 })} error={ctx.errors.grossWeight} hint={x.grossWeight ? t('{{value}} tola', { value: (x.grossWeight / TOLA).toFixed(3) }) : t('Nag samait')} />
        <NumberInput label={t('Nag / moti ka wazan (g)')} value={x.stoneWeight || null} onChangeValue={(v) => setWeight({ stoneWeight: v ?? 0 })} hint={t('Sone me nahi gina jata')} />
        <NumberInput label={t('Asal (net) wazan (g)')} value={x.netWeight || null} onChangeValue={num('netWeight')} error={ctx.errors.netWeight} hint={t('Isi par rate lagta hai')} />
      </FormSection>
      <FormSection title={t('Banwai aur kaat')} description={t('Jo dukaan leti hai — ek ya zyada tareeqe')}>
        <MoneyInput label={t('Banwai per gram')} value={x.makingChargePerGram || null} onChangeValue={num('makingChargePerGram')} />
        <MoneyInput label={t('Banwai fixed')} value={x.makingChargeFixed || null} onChangeValue={num('makingChargeFixed')} />
        <NumberInput label={t('Banwai %')} value={x.makingChargePct || null} onChangeValue={num('makingChargePct')} hint={t('Sone ki qeemat ka')} />
        <NumberInput label={t('Kaat / wastage %')} value={x.wastagePct || null} onChangeValue={num('wastagePct')} error={ctx.errors.wastagePct} />
        <NumberInput label={t('Kaat grams me')} value={x.wastageGrams || null} onChangeValue={num('wastageGrams')} hint={t('Aaj ke rate par')} />
        <MoneyInput label={t('Polish')} value={x.polishCharge || null} onChangeValue={num('polishCharge')} />
        <MoneyInput label={t('Hallmark')} value={x.hallmarkCharge || null} onChangeValue={num('hallmarkCharge')} />
        <MoneyInput label={t('Doosre charges')} value={x.otherCharges || null} onChangeValue={num('otherCharges')} />
      </FormSection>
      <FormSection title={t('Nag (stones)')} description={t('Har nag ki qeemat bill me alag aati hai')}>
        <Button variant="soft" size="sm" icon={Plus} onPress={() => ctx.setExtra({ stones: [...x.stones, { type: 'CZ', count: 1, caret: 0, totalValue: 0 }] })}>{t('Nag')}</Button>
        {x.stones.length === 0 ? <Text size="sm" tone="muted">{t('Koi nag nahi')}</Text> : x.stones.map((s, i) => (
          <Card key={i}>
            <View style={{ gap: th.space(2) }}>
              <Row justify="between">
                <View style={{ flex: 1 }}><Select label={t('Nag')} value={s.type} onChange={(v) => setStone(i, { type: v as GemstoneType })} options={STONES.map(([v, l]) => ({ value: v, label: t(l) }))} /></View>
                <IconButton icon={Trash2} label={t('Nag hatayein')} variant="danger" onPress={() => ctx.setExtra({ stones: x.stones.filter((_, j) => j !== i) })} />
              </Row>
              <Row gap={2} align="start">
                <View style={{ flex: 1 }}><NumberInput label={t('Ginti')} value={s.count} integer onChangeValue={(v) => setStone(i, { count: Math.max(Math.round(v ?? 1), 1) })} /></View>
                <View style={{ flex: 1 }}><NumberInput label={t('Carat')} value={s.caret || null} onChangeValue={(v) => setStone(i, { caret: v ?? 0 })} /></View>
              </Row>
              <MoneyInput label={t('Qeemat')} value={s.totalValue || null} onChangeValue={(v) => setStone(i, { totalValue: v ?? 0 })} />
            </View>
          </Card>
        ))}
      </FormSection>
      <Card tone="warning" title={t('Aaj ki qeemat')} description={rate ? t('{{purity}} @ {{rate}}/g', { purity: purityLabel(x.purity), rate: formatMoney(rate.ratePerGram) }) : undefined}>
        {isLoading ? <Text size="sm">{t('Rate load ho raha hai…')}</Text> : !price ? (
          <Text size="sm">{t('{{purity}} ka aaj ka rate set nahi.', { purity: purityLabel(x.purity) })} <Text size="sm" weight="semibold" onPress={() => router.push('/jewelry/metal-rates' as never)}>{t('Rate likhein')}</Text></Text>
        ) : (
          <View style={{ gap: th.space(2) }}>
            {([[t('Sona'), price.metal], [t('Banwai'), price.making], [t('Kaat'), price.wastage], [t('Nag + charges'), price.stones + price.other]] as const).map(([l, v]) => (
              <Row key={l} justify="between"><Text size="sm" tone="secondary">{l}</Text><Amount value={v} weight="semibold" /></Row>
            ))}
            <Row justify="between"><Text weight="bold">{t('Kul')}</Text><Amount value={price.total} size="lg" weight="bold" /></Row>
            <Button size="sm" variant={Math.round(price.total) === Math.round(ctx.draft.core.price) ? 'soft' : 'primary'} disabled={Math.round(price.total) === Math.round(ctx.draft.core.price)}
              onPress={() => ctx.setCore({ price: Math.round(price.total) })}>
              {Math.round(price.total) === Math.round(ctx.draft.core.price) ? t('Sale price yehi hai') : t('Sale price {{value}} lagayein', { value: formatMoney(Math.round(price.total)) })}
            </Button>
            <Text size="xs" tone="muted">{t('POS par qeemat hamesha aaj ke rate se dobara banti hai — yahan ki price sirf list aur reports ke liye hai.')}</Text>
          </View>
        )}
      </Card>
    </View>
  );
}

const weightsStep: StepDef<JewelryExtra> = {
  id: 'weight', title: msg('Wazan aur banwai'), icon: Scale,
  validate: (d) => {
    const e: Errors = {};
    const x = d.extra;
    if (!['IMITATION', 'OTHER'].includes(x.metalType)) {
      if (!(x.grossWeight > 0)) e.grossWeight = t('Kul wazan likhein');
      if (!(x.netWeight > 0)) e.netWeight = t('Asal wazan likhein');
    }
    if (x.netWeight > x.grossWeight + 0.0005) e.netWeight = t('Asal wazan kul wazan se zyada nahi ho sakta');
    if (x.wastagePct > 30) e.wastagePct = t('Kaat 30% se zyada? Check karein');
    return e;
  },
  render: (ctx) => <Weights ctx={ctx} />,
};

function Terms({ ctx }: { ctx: StepContext<JewelryExtra> }) {
  const th = useTheme();
  const x = ctx.draft.extra;
  return (
      <View style={{ gap: th.space(5) }}>
        <FormSection title={t('Hallmark aur certificate')}>
          <Input label={t('Hallmark number')} value={x.hallmarkNumber} onChangeText={(v) => ctx.setExtra({ hallmarkNumber: v })} placeholder={t('PSQCA / lab number')} hint={t('Bill par chhapta hai')} />
          <Input label={t('Certificate number')} value={x.certificateNumber} onChangeText={(v) => ctx.setExtra({ certificateNumber: v, isCertified: !!v.trim() || x.isCertified })} />
        </FormSection>
        <FormSection title={t('Wapsi aur buy-back')} description={t('Customer ko bill par yahi likha milta hai')}>
          <Switch label={t('Buy-back hota hai')} description={t('Dukaan wapas khareedti hai')} value={x.isBuyBackEligible} onChange={(v) => ctx.setExtra({ isBuyBackEligible: v })} />
          {x.isBuyBackEligible && <NumberInput label={t('Buy-back kitne % par')} value={x.buyBackPct} onChangeValue={(v) => ctx.setExtra({ buyBackPct: Math.min(v ?? 0, 100) })} hint={t('Sone ki aaj ki qeemat ka')} />}
          <Switch label={t('Wapsi ho sakti hai')} description={t('Bill ke saath, tay dinon me')} value={x.isReturnable} onChange={(v) => ctx.setExtra({ isReturnable: v })} />
          {x.isReturnable && <NumberInput label={t('Wapsi kitne din me')} value={x.returnDays} integer onChangeValue={(v) => ctx.setExtra({ returnDays: Math.round(v ?? 0) })} />}
        </FormSection>
        <FormSection title={t('Aur')}>
          <Input label={t('Karigar')} value={x.karigarName} onChangeText={(v) => ctx.setExtra({ karigarName: v })} placeholder={t('Kis ne banaya')} />
          <Input label={t('Item code')} value={x.itemCode} onChangeText={(v) => ctx.setExtra({ itemCode: v })} placeholder={t('Dukaan ka andar ka code')} />
          <Switch label={t('Bridal collection')} description={t('Shaadi ke set — POS par alag filter')} value={x.isBridalCollection} onChange={(v) => ctx.setExtra({ isBridalCollection: v })} />
        </FormSection>
      </View>
  );
}

const termsStep: StepDef<JewelryExtra> = { id: 'terms', title: msg('Hallmark aur wapsi'), icon: ShieldCheck, render: (ctx) => <Terms ctx={ctx} /> };

const core: CoreOptions = {
  units: [{ value: 'pcs', label: msg('Piece') }, { value: 'set', label: msg('Set') }, { value: 'pair', label: msg('Jora') }],
  skuPrefix: 'JW', packs: false, variants: false,
};

const editor: EditorConfig<JewelryExtra> = {
  core,
  extra: {
    initial,
    load: async (productId) => {
      const p = await jewelryProductsApi.byProduct(productId).catch(() => null);
      if (!p) return {};
      return {
        category: p.category, style: p.style, metalType: p.metalType, purity: p.purity, itemCode: p.itemCode ?? '', designNumber: p.designNumber ?? '', size: p.size ?? '',
        grossWeight: p.grossWeight, stoneWeight: p.stoneWeight, netWeight: p.netWeight, makingChargePerGram: p.makingChargePerGram, makingChargeFixed: p.makingChargeFixed,
        makingChargePct: p.makingChargePct, wastagePct: p.wastagePct, wastageGrams: p.wastageGrams, polishCharge: p.polishCharge, hallmarkCharge: p.hallmarkCharge,
        otherCharges: (p.otherCharges ?? 0) + (p.designerCharge ?? 0),
        stones: (p.gemstones ?? []).map((g) => ({ type: g.type, count: g.count ?? 1, caret: g.caret ?? 0, totalValue: g.totalValue ?? 0 })),
        hallmarkNumber: p.hallmarkNumber ?? '', certificateNumber: p.certificateNumber ?? '', isCertified: p.isCertified, isBuyBackEligible: p.isBuyBackEligible, buyBackPct: p.buyBackPct,
        isReturnable: p.isReturnable, returnDays: p.returnDays, karigarName: p.karigarName ?? '', isBridalCollection: p.isBridalCollection,
      };
    },
    save: async (productId, d: EditorDraft<JewelryExtra>) => {
      const x = d.extra;
      await jewelryProductsApi.upsert({
        productId, category: x.category, style: x.style, metalType: x.metalType, purity: x.purity, itemCode: opt(x.itemCode), designNumber: opt(x.designNumber), size: opt(x.size),
        grossWeight: x.grossWeight, stoneWeight: x.stoneWeight, netWeight: x.netWeight, makingChargePerGram: x.makingChargePerGram, makingChargeFixed: x.makingChargeFixed,
        makingChargePct: x.makingChargePct, wastagePct: x.wastagePct, wastageGrams: x.wastageGrams, polishCharge: x.polishCharge, hallmarkCharge: x.hallmarkCharge, designerCharge: 0,
        otherCharges: x.otherCharges, hasStones: x.stones.length > 0, hasDiamond: x.stones.some((s) => s.type === 'DIAMOND'), hasPearl: x.stones.some((s) => s.type === 'PEARL'),
        hasGemstone: x.stones.some((s) => !['CZ', 'DIAMOND', 'PEARL'].includes(s.type)), stoneCount: x.stones.reduce((s, g) => s + g.count, 0),
        gemstones: x.stones.map((s) => ({ type: s.type, count: s.count, caret: s.caret, totalValue: s.totalValue })),
        hallmarkNumber: opt(x.hallmarkNumber), certificateNumber: opt(x.certificateNumber), isCertified: x.isCertified || !!x.certificateNumber.trim(),
        isBuyBackEligible: x.isBuyBackEligible, buyBackPct: x.buyBackPct, isReturnable: x.isReturnable, returnDays: x.returnDays, karigarName: opt(x.karigarName),
        isBridalCollection: x.isBridalCollection, isFeatured: d.core.isFeatured,
      });
    },
  },
  steps: [
    basicStep<JewelryExtra>(core, { extra: (ctx) => <Identity ctx={ctx} />, namePlaceholder: t('Jaise: 22K Turkish choori jora') }),
    weightsStep,
    priceStep<JewelryExtra>(core),
    stockStep<JewelryExtra>(core, { quick: [1, 2, 3, 5] }),
    termsStep,
  ],
  summary: (d) => [
    [t('Zewar'), [categoryLabel(d.extra.category), purityLabel(d.extra.purity)].join(' · ')],
    ...(d.extra.netWeight > 0 ? [[t('Wazan'), `${grams(d.extra.netWeight)} · ${tola(d.extra.netWeight)}`] as [string, string]] : []),
    ...(d.extra.stones.length > 0 ? [[t('Nag'), `${d.extra.stones.reduce((s, g) => s + g.count, 0)} · ${formatMoney(stonesTotal(d.extra))}`] as [string, string]] : []),
    ...(d.extra.hallmarkNumber ? [[t('Hallmark'), d.extra.hallmarkNumber] as [string, string]] : []),
  ],
};

/** Price breakdown of a piece at today's rate (detail tab). */
function TodayPrice({ j, saved }: { j: JewelryProductProfile; saved: number }) {
  const th = useTheme();
  const { rates, isLoading } = useMetalRates();
  const p = profilePrice(j as unknown as PricedPiece, rates);
  const rate = rateFor(rates, j.metalType, j.purity);
  if (isLoading) return null;
  if (!p || !rate) return <Card title={t('Aaj ki qeemat')}><Text size="sm">{t('{{purity}} ka aaj ka rate set nahi.', { purity: purityLabel(j.purity) })}</Text></Card>;
  const buyBack = j.isBuyBackEligible ? Math.round(p.metal * (j.buyBackPct / 100)) : null;
  const rows: Array<[string, number]> = [[t('Sona / chandi'), p.metal], [t('Banwai'), p.making], [t('Kaat (wastage)'), p.wastage], [t('Nag'), p.stones], [t('Polish, hallmark, doosre'), p.other]];
  return (
    <View style={{ gap: th.space(3) }}>
      <Card title={t('Aaj ki qeemat')} description={t('{{purity}} @ {{rate}}/g · {{w}}', { purity: purityLabel(j.purity), rate: formatMoney(rate.ratePerGram), w: grams(j.netWeight) })}>
        {rows.filter(([, v]) => v > 0).map(([l, v]) => <Row key={l} justify="between"><Text size="sm" tone="secondary">{l}</Text><Amount value={v} weight="semibold" /></Row>)}
        <Row justify="between"><Text weight="bold">{t('Kul')}</Text><Amount value={p.total} size="lg" weight="bold" /></Row>
        {Math.abs(p.total - saved) >= 1 && <Text size="xs" tone="warning">{t('Save ki hui price {{saved}} hai — POS par aaj ke rate wali {{total}} lagegi.', { saved: formatMoney(saved), total: formatMoney(p.total) })}</Text>}
      </Card>
      <Card title={t('Wapsi aur buy-back')}>
        <Row justify="between"><Text size="sm" tone="secondary">{t('Buy-back')}</Text><Text size="sm" weight="medium">{j.isBuyBackEligible ? t('{{pct}}% — aaj {{value}}', { pct: j.buyBackPct, value: formatMoney(buyBack ?? 0) }) : t('Nahi')}</Text></Row>
        <Row justify="between"><Text size="sm" tone="secondary">{t('Wapsi')}</Text><Text size="sm" weight="medium">{j.isReturnable ? t('{{n}} din me', { n: j.returnDays }) : t('Nahi')}</Text></Row>
      </Card>
    </View>
  );
}

registerInventoryIndustry({
  id: 'jewelry',
  label: msg('Jewelry'),
  categoryKinds: JEWELRY_KINDS,
  list: {
    noun: 'zewar',
    filters: ['tags'],
    actions: [
      { icon: TrendingUp, label: msg('Aaj ka rate'), href: '/jewelry/metal-rates' },
      { icon: Coins, label: msg('Metal stock'), href: '/jewelry/metal-stock', permission: 'stock_movements.view' },
    ],
    stockChips: () => [1, 2, 5, 10],
    guide: [
      { icon: Scale, title: msg('Wazan aur karat'), text: msg('Har zewar ka asal (net) wazan aur karat likhein. Card par aaj ke rate se qeemat dikhti hai.') },
      { icon: TrendingUp, title: msg('Aaj ka rate'), text: msg('Subah "Aaj ka rate" me 24K likhein — baqi karat khud ban jate hain. POS par qeemat usi se lagti hai.') },
      { icon: Gem, title: msg('Banwai aur nag'), text: msg('Banwai (per gram ya fixed), kaat/wastage aur nag ki qeemat zewar me likhein — bill par alag alag chhapti hai.') },
    ],
  },
  editor,
  detail: {
    extra: { key: 'jewelry-product-detail', load: (id) => jewelryProductsApi.byProduct(id).catch(() => null) },
    badges: ({ extra }) => {
      const j = extra as JewelryProductProfile | null | undefined;
      if (!j) return [];
      return [{ label: purityLabel(j.purity), tone: j.purity.startsWith('SILVER') || j.purity.startsWith('STERLING') ? 'neutral' : 'warning' }, ...(j.hallmarkNumber ? [{ label: t('Hallmark'), tone: 'success' as const }] : []), ...(j.isBridalCollection ? [{ label: t('Bridal'), tone: 'accent' as const }] : [])];
    },
    facts: ({ extra }) => {
      const j = extra as JewelryProductProfile | null | undefined;
      if (!j) return [];
      const rows: Array<[string, string | undefined]> = [
        [t('Type'), categoryLabel(j.category)], [t('Karat'), purityLabel(j.purity)], [t('Kul wazan'), `${grams(j.grossWeight)} (${tola(j.grossWeight)})`],
        [t('Nag ka wazan'), j.stoneWeight ? grams(j.stoneWeight) : undefined], [t('Asal wazan'), `${grams(j.netWeight)} (${tola(j.netWeight)})`],
        [t('Banwai'), [j.makingChargePerGram ? `${formatMoney(j.makingChargePerGram)}/g` : '', j.makingChargeFixed ? formatMoney(j.makingChargeFixed) : '', j.makingChargePct ? `${j.makingChargePct}%` : ''].filter(Boolean).join(' + ') || undefined],
        [t('Kaat'), [j.wastagePct ? `${j.wastagePct}%` : '', j.wastageGrams ? grams(j.wastageGrams) : ''].filter(Boolean).join(' + ') || undefined],
        [t('Size'), j.size], [t('Design number'), j.designNumber], [t('Hallmark'), j.hallmarkNumber], [t('Certificate'), j.certificateNumber], [t('Karigar'), j.karigarName],
      ];
      return rows.filter((r): r is [string, string] => !!r[1]);
    },
    tile: ({ extra }) => {
      const j = extra as JewelryProductProfile | null | undefined;
      return j ? { label: t('Asal wazan'), value: grams(j.netWeight), hint: tola(j.netWeight) } : null;
    },
    tabs: [{
      id: 'price', label: msg('Aaj ki qeemat'), icon: TrendingUp, when: ({ extra }) => !!extra,
      render: ({ extra, product }) => <TodayPrice j={extra as JewelryProductProfile} saved={Number(product.price) || 0} />,
    }],
    stockChips: [1, 2, 5],
  },
});
