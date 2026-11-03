/**
 * Carpet through the shared products list, editor and detail (web
 * CarpetProducts, CarpetProductEditor, CarpetProductDetail). Roll goods (sold
 * by sqft, sq meter, sq gaz, running ft or meter): designs or colours as
 * variants, and on a new product the opening rolls (width x length, cost and
 * rate per sqft). Their stock is only the rolls and pieces, never a typed
 * number. Rugs, dari, underlay and fitting items (pcs or service) use the
 * normal stock step.
 */

import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Layers, Palette, Plus, Ruler, Scissors, Trash2, Upload } from 'lucide-react-native';
import { View } from 'react-native';
import { isCarpetUnit } from '@nafaa/core/industries/carpet';
import { formatMoney } from '@/core/format';
import { msg, t } from '@/core/i18n';
import { Button, Card, ChipGroup, FormSection, IconButton, Input, ListRow, MoneyInput, Row, Switch, Text, toast, useTheme } from '@/design';
import { variantsApi } from '@/modules/inventory/api/products';
import { registerInventoryIndustry } from '@/modules/inventory/industry/registry';
import type { CoreOptions, EditorConfig, StepContext, StepDef } from '@/modules/inventory/industry/types';
import { basicStep, priceStep, stockStep } from '@/modules/inventory/screens/editor/coreSteps';
import type { EditorDraft, Errors } from '@/modules/inventory/screens/editor/types';
import { carpetCutPiecesApi, carpetRollsApi, type CarpetCutPiece, type CarpetProductSummary, type CarpetRoll } from './api';
import { SizeInput } from './components/SizeInput';
import { PIECES_KEY, ROLLS_KEY, SUMMARY_KEY, ftIn, opt, r2, realFt, refreshCarpet, rollSqft, rollStatus, pieceStatus, unitLabel } from './meta';

interface RollDraft { design: string; rollNumber: string; wFt: number | null; wIn: number | null; lFt: number | null; lIn: number | null; cost: number | null; rate: number | null; rack: string }
export interface CarpetExtra { rolls: RollDraft[] }

const blankRoll = (design = ''): RollDraft => ({ design, rollNumber: '', wFt: 12, wIn: null, lFt: null, lIn: null, cost: null, rate: null, rack: '' });
const sqftOf = (r: RollDraft) => rollSqft(r.wFt ?? 0, r.wIn ?? 0, r.lFt ?? 0, r.lIn ?? 0);

const core: CoreOptions = {
  units: [
    { value: 'sqft', label: msg('Sq ft') }, { value: 'sqyd', label: msg('Sq gaz') }, { value: 'sqm', label: msg('Sq meter') },
    { value: 'ft', label: msg('Running ft') }, { value: 'm', label: msg('Running meter') }, { value: 'pcs', label: msg('Piece (rug)') }, { value: 'service', label: msg('Service (fitting)') },
  ],
  skuPrefix: 'CPT',
  packs: false,
  variants: { presets: [
    { group: msg('Rang'), values: ['Red', 'Maroon', 'Beige', 'Grey', 'Blue', 'Green', 'Brown', 'Cream'] },
    { group: msg('Design'), values: ['Plain', 'Floral', 'Irani', 'Modern', 'Border'] },
  ] },
  batches: false,
  markups: [20, 30, 40, 50],
};

/* ── Designs (variants) for roll goods ── */
function Designs({ ctx }: { ctx: StepContext<CarpetExtra> }) {
  const th = useTheme();
  const vs = ctx.draft.core.variants;
  const set = (i: number, patch: Partial<(typeof vs)[number]>) => ctx.setCore({ variants: vs.map((v, j) => (j === i ? { ...v, ...patch } : v)) });
  const add = (name = '') => ctx.setCore({ variants: [...vs, { name, sku: '', barcode: '', colorHex: '', price: null, costPrice: null, stock: 0, isActive: true }] });
  const presets = core.variants ? core.variants.presets[0].values.filter((p) => !vs.some((v) => v.name.toLowerCase() === p.toLowerCase())).slice(0, 6) : [];
  return (
    <FormSection title={t('Designs / rang')} description={t('Ek carpet ke alag design ya rang — har roll kisi design ka hota hai. Ek hi design hai to khaali chhorein.')}>
      {vs.map((v, i) => (
        <Card key={v.id ?? i}>
          <View style={{ gap: th.space(2) }}>
            <Input label={t('Design ka naam')} value={v.name} onChangeText={(name) => set(i, { name })} placeholder={t('Jaise: Maroon Irani')} disabled={!v.isActive} />
            <MoneyInput label={t('Alag rate')} value={v.price} onChangeValue={(price) => set(i, { price })} hint={t('Rate (khaali = product ka)')} />
            <Row justify="between">
              {v.id ? <Switch value={v.isActive} onChange={(isActive) => set(i, { isActive })} label={v.isActive ? t('Chalu karein') : t('Band karein')} />
                : <IconButton icon={Trash2} label={t('Hatayein')} variant="danger" onPress={() => ctx.setCore({ variants: vs.filter((_, j) => j !== i) })} />}
            </Row>
          </View>
        </Card>
      ))}
      <Row gap={2} wrap>
        <Button size="sm" icon={Plus} variant="soft" onPress={() => add()}>{t('Design')}</Button>
        {presets.map((p) => <Button key={p} size="sm" variant="secondary" onPress={() => add(p)}>{`+ ${p}`}</Button>)}
      </Row>
      {ctx.errors.variants ? <Text size="sm" tone="danger">{ctx.errors.variants}</Text> : null}
    </FormSection>
  );
}

/* ── Opening rolls (new product) or the rolls it has (edit) ── */
function Rolls({ ctx }: { ctx: StepContext<CarpetExtra> }) {
  const th = useTheme();
  const c = ctx.draft.core;
  const rolls = ctx.draft.extra.rolls;
  const designs = c.variants.filter((v) => v.isActive && v.name.trim()).map((v) => v.name.trim());
  const set = (i: number, patch: Partial<RollDraft>) => ctx.setExtra({ rolls: rolls.map((r, j) => (j === i ? { ...r, ...patch } : r)) });
  const total = rolls.reduce((s, r) => s + sqftOf(r), 0);
  if (ctx.isEdit) return <ExistingRolls productId={ctx.productId} />;
  return (
    <FormSection title={t('Shuru ke rolls')} description={t('Dukaan me abhi jo rolls pare hain — har roll ki chaurai, lambai aur sqft ki cost / rate. Baad ke rolls Purchase ya Rolls page se aate hain.')}>
      {rolls.length === 0 ? <Card tone="default"><Text size="sm" tone="muted">{t('Abhi koi roll nahi — "Roll" dabayein. Bina roll ke ye carpet counter par nahi bikega.')}</Text></Card> : rolls.map((r, i) => (
        <Card key={i}>
          <View style={{ gap: th.space(2) }}>
            {designs.length > 0 && <ChipGroup value={r.design} onChange={(design) => set(i, { design })} options={designs.map((d) => ({ value: d, label: d }))} />}
            <Input label={t('Roll number')} value={r.rollNumber} onChangeText={(rollNumber) => set(i, { rollNumber })} placeholder={t('Roll # (khud)')} ltr />
            <SizeInput label={t('Chaurai')} ft={r.wFt} inch={r.wIn} onChange={(wFt, wIn) => set(i, { wFt, wIn })} />
            <SizeInput label={t('Lambai')} ft={r.lFt} inch={r.lIn} onChange={(lFt, lIn) => set(i, { lFt, lIn })} />
            <MoneyInput label={t('Cost / sqft')} value={r.cost} onChangeValue={(cost) => set(i, { cost })} placeholder={c.costPrice && c.unit === 'sqft' ? String(c.costPrice) : undefined} />
            <MoneyInput label={t('Rate / sqft')} value={r.rate} onChangeValue={(rate) => set(i, { rate })} placeholder={c.price && c.unit === 'sqft' ? String(c.price) : undefined} />
            <Input label={t('Rack / jagah')} value={r.rack} onChangeText={(rack) => set(i, { rack })} />
            <Row justify="between">
              <Text size="sm" ltr>{ftIn(r.wFt ?? 0, r.wIn ?? 0)} × {ftIn(r.lFt ?? 0, r.lIn ?? 0)} = <Text size="sm" weight="bold">{t('{{rollSqft}} sqft', { rollSqft: sqftOf(r) })}</Text></Text>
              <IconButton icon={Trash2} label={t('Hatayein')} variant="danger" onPress={() => ctx.setExtra({ rolls: rolls.filter((_, j) => j !== i) })} />
            </Row>
            {ctx.errors[`roll${i}`] ? <Text size="sm" tone="danger">{ctx.errors[`roll${i}`]}</Text> : null}
          </View>
        </Card>
      ))}
      <Button icon={Plus} variant="soft" onPress={() => ctx.setExtra({ rolls: [...rolls, blankRoll(designs[0] ?? '')] })}>{t('Roll')}</Button>
      {rolls.length > 0 && <Text size="sm">{t('Kul:')} <Text size="sm" weight="bold" ltr>{t('{{count}} roll · {{totalSqft}} sqft', { count: rolls.length, totalSqft: r2(total) })}</Text></Text>}
    </FormSection>
  );
}

function ExistingRolls({ productId }: { productId?: string }) {
  const q = useQuery({ queryKey: [ROLLS_KEY, 'product', productId], queryFn: () => carpetRollsApi.list({ productId, inStockOnly: true, limit: 100 }), enabled: !!productId });
  const items = q.data?.items ?? [];
  return (
    <FormSection title={t('Is carpet ke rolls')} description={t('Stock rolls aur tukron se banta hai — naya roll Purchase ya Rolls page se, lambai Adjust se badlein')}>
      <Card flush>
        {items.length === 0 ? <View style={{ padding: 16 }}><Text size="sm" tone="muted">{t('Koi chalu roll nahi.')}</Text></View> : items.map((r, i) => (
          <ListRow key={r.id} divider={i < items.length - 1} title={<Text weight="semibold" ltr>{r.rollNumber}</Text>} subtitle={r.variant?.name ?? undefined}
            trailing={<Text size="xs" tone="muted" ltr>{ftIn(r.widthFt, r.widthInch)} × {ftIn(r.remainingLengthFt, r.remainingLengthInch)} · {r2(r.remainingSqft)} sqft</Text>}
            chevron onPress={() => router.push(`/carpet/rolls/${r.id}` as never)} />
        ))}
      </Card>
      <Button variant="link" onPress={() => router.push({ pathname: '/carpet/rolls', params: { productId } } as never)}>{t('Rolls kholein')}</Button>
    </FormSection>
  );
}

function rollErrors(d: EditorDraft<CarpetExtra>, isEdit: boolean): Errors {
  if (isEdit) return {};
  const e: Errors = {};
  const seen = new Set<string>();
  d.extra.rolls.forEach((r, i) => {
    if (!(realFt(r.wFt ?? 0, r.wIn ?? 0) > 0)) e[`roll${i}`] = t('Chaurai likhein');
    else if (!(realFt(r.lFt ?? 0, r.lIn ?? 0) > 0)) e[`roll${i}`] = t('Lambai likhein');
    else if ((r.wIn ?? 0) >= 12 || (r.lIn ?? 0) >= 12) e[`roll${i}`] = t('Inch 12 se kam likhein');
    else if (r.rollNumber.trim() && seen.has(r.rollNumber.trim())) e[`roll${i}`] = t('Roll number do dafa hai');
    seen.add(r.rollNumber.trim());
  });
  return e;
}

const isRollGood = (d: EditorDraft<CarpetExtra>) => isCarpetUnit(d.core.unit);

const designsStep: StepDef<CarpetExtra> = {
  id: 'rolls', title: msg('Designs aur rolls'), icon: Ruler, when: isRollGood,
  validate: (d, isEdit) => {
    const names = d.core.variants.map((v) => v.name.trim().toLowerCase());
    const e: Errors = names.some((x) => !x) ? { variants: t('Har design ka naam likhein') } : new Set(names).size !== names.length ? { variants: t('Do designs ka naam ek jaisa hai') } : {};
    return { ...e, ...rollErrors(d, isEdit) };
  },
  render: (ctx) => <View style={{ gap: 16 }}><Designs ctx={ctx} /><Rolls ctx={ctx} /></View>,
};

const plainStock = stockStep<CarpetExtra>(core, { quick: [1, 2, 5, 10, 20] });

const editor: EditorConfig<CarpetExtra> = {
  core,
  extra: {
    initial: { rolls: [] },
    // Roll goods hold no typed stock: rolls and pieces make it.
    product: (d, payload) => (isCarpetUnit(d.core.unit) && 'stock' in payload ? { ...payload, stock: 0 } : payload),
    save: async (productId, d, { isEdit, shopId }) => {
      if (isEdit || !isCarpetUnit(d.core.unit) || !d.extra.rolls.length) return;
      const variants = await variantsApi.list(productId).catch(() => []);
      const variantOf = (name: string) => variants.find((v) => v.name.trim().toLowerCase() === name.trim().toLowerCase())?.id;
      const fallbackCost = d.core.unit === 'sqft' ? d.core.costPrice : 0;
      const fallbackRate = d.core.unit === 'sqft' ? d.core.price : 0;
      const res = await carpetRollsApi.bulkOpening(d.extra.rolls.map((r) => ({
        productId, variantId: r.design ? variantOf(r.design) : undefined, shopId: shopId ?? undefined, rollNumber: opt(r.rollNumber),
        widthFt: r.wFt ?? 0, widthInch: r.wIn ?? 0, originalLengthFt: r.lFt ?? 0, originalLengthInch: r.lIn ?? 0,
        costPerSqft: r.cost ?? fallbackCost, salePricePerSqft: r.rate ?? fallbackRate, rackNumber: opt(r.rack), sourceType: 'OPENING_STOCK' as const,
      })));
      const errors: Array<{ index: number; error: string }> = res?.errors ?? [];
      if (errors.length) toast.error(t('{{count}} roll save nahi hue: {{value}} — Rolls page se dobara daalein', { count: errors.length, value: errors.map((e) => `Roll ${e.index + 1}: ${e.error}`).join(' • ') }));
      refreshCarpet();
    },
  },
  steps: [
    basicStep<CarpetExtra>(core, { namePlaceholder: msg('Jaise: Turkish Shaggy 12ft ya Irani Rug 5×7') }),
    priceStep<CarpetExtra>(core, { allowZeroPrice: true }),
    designsStep,
    { ...plainStock, when: (d) => !isRollGood(d) && d.core.unit !== 'service' },
  ],
  summary: (d) => (isCarpetUnit(d.core.unit) ? [
    [t('Bikta hai'), t('{{unit}} me kat kar bikta hai', { unit: unitLabel(d.core.unit) })],
    ...(d.core.variants.length ? [[t('Design'), String(d.core.variants.length)] as [string, string]] : []),
    ...(d.extra.rolls.length ? [[t('Rolls'), t('{{count}} roll · {{r2}} sqft', { count: d.extra.rolls.length, r2: r2(d.extra.rolls.reduce((s, r) => s + sqftOf(r), 0)) })] as [string, string]] : []),
  ] : []),
};

/* ── list and detail ── */

interface DetailExtra { rolls: CarpetRoll[]; pieces: CarpetCutPiece[] }
const sum = (xs: number[]) => r2(xs.reduce((a, b) => a + b, 0));

registerInventoryIndustry({
  id: 'carpet',
  label: msg('Carpet'),
  list: {
    noun: 'maal',
    filters: ['tags'],
    useSource: () => useQuery({ queryKey: [SUMMARY_KEY, 'all'], queryFn: () => carpetRollsApi.productSummary(), staleTime: 60_000 }).data,
    extras: (item, ctx) => {
      if (!isCarpetUnit(item.unit)) return {};
      const s = (ctx.source as CarpetProductSummary[] | undefined)?.find((x) => x.productId === item.id);
      return {
        line: t('{{value}} me bikta hai', { value: unitLabel(item.unit) }),
        chips: [s ? t('{{totalSqft}} sqft · {{rollCount}} roll{{value}}', { totalSqft: Math.round(s.totalSqft).toLocaleString('en-PK'), rollCount: s.rollCount, value: s.cutPiecesCount ? t(' · {{cutPiecesCount}} tukre', { cutPiecesCount: s.cutPiecesCount }) : '' }) : t('Koi roll nahi')],
      };
    },
    actions: [
      { icon: Layers, label: msg('Rolls'), href: '/carpet/rolls' },
      { icon: Scissors, label: msg('Tukre'), href: '/carpet/cut-pieces' },
      { icon: Upload, label: msg('Rolls import'), href: '/carpet/rolls/bulk-import' },
    ],
    stockChips: () => [1, 2, 5, 10],
    stockLocked: (item) => (isCarpetUnit(item.unit) ? t('Roll wale maal ka stock Rolls page ya purchase se aata hai') : null),
    guide: [
      { icon: Layers, title: msg('Roll wala maal'), text: msg('Sqft, sq gaz ya running ft wale carpet ka stock rolls aur tukron se banta hai — stock Rolls page se daalein ya purchase karein, yahan se nahi.') },
      { icon: Scissors, title: msg('Tukre'), text: msg('Roll kaatne par bachi patti khud tukra ban jati hai; Tukre page par rate aur rack likhein.') },
      { icon: Ruler, title: msg('Rugs aur baqi maal'), text: msg('Rug, dari, underlay piece me bikte hain — un ka stock aam maal ki tarah hai.') },
    ],
  },
  editor,
  detail: {
    extra: {
      key: 'carpet-product-detail',
      load: async (id): Promise<DetailExtra> => {
        const [rolls, pieces] = await Promise.all([
          carpetRollsApi.list({ productId: id, limit: 200 }).then((r) => r.items).catch(() => [] as CarpetRoll[]),
          carpetCutPiecesApi.list({ productId: id, status: 'AVAILABLE', limit: 200 }).then((r) => r.items).catch(() => [] as CarpetCutPiece[]),
        ]);
        return { rolls, pieces };
      },
    },
    badges: ({ product }) => (isCarpetUnit(product.unit) ? [{ label: t('Roll se {{unit}} me', { unit: unitLabel(product.unit) }), tone: 'success' as const }] : []),
    facts: ({ extra, product }) => {
      const x = extra as DetailExtra | undefined;
      if (!isCarpetUnit(product.unit) || !x) return [];
      const active = x.rolls.filter((r) => r.status === 'ACTIVE' && r.remainingSqft > 0);
      const rates = active.map((r) => Number(r.salePricePerSqft)).filter((v) => v > 0);
      return [
        [t('Chalu rolls'), `${active.length} · ${sum(active.map((r) => r.remainingSqft))} sqft`],
        [t('Tukre'), `${x.pieces.length} · ${sum(x.pieces.map((p) => p.totalSqft))} sqft`],
        [t('Roll rate'), rates.length ? `${formatMoney(Math.min(...rates))} – ${formatMoney(Math.max(...rates))} / sqft` : '—'],
        [t('Khatam rolls'), String(x.rolls.filter((r) => r.status === 'FINISHED').length)],
      ];
    },
    tile: ({ extra, product }) => {
      const x = extra as DetailExtra | undefined;
      return isCarpetUnit(product.unit) && x
        ? { label: t('Rolls + tukre'), value: `${Math.round(sum(x.rolls.filter((r) => r.status === 'ACTIVE').map((r) => r.remainingSqft)) + sum(x.pieces.map((p) => p.totalSqft)))} sqft`, hint: t('Stock inhi se banta hai') }
        : null;
    },
    alerts: ({ extra, product }) => {
      const x = extra as DetailExtra | undefined;
      if (!isCarpetUnit(product.unit) || !x || x.rolls.some((r) => r.status === 'ACTIVE') || x.pieces.length) return null;
      return (
        <Card tone="warning">
          <Row gap={2} justify="between">
            <Text size="sm" weight="medium" style={{ flex: 1 }}>{t('Is carpet ka koi chalu roll ya tukra nahi — counter par nahi bikega')}</Text>
            <Button size="sm" variant="soft" onPress={() => router.push('/purchases/new' as never)}>{t('Purchase')}</Button>
          </Row>
        </Card>
      );
    },
    tabs: [
      {
        id: 'rolls', label: msg('Rolls'), icon: Layers, when: ({ product }) => isCarpetUnit(product.unit),
        render: ({ extra }) => {
          const x = extra as DetailExtra | undefined;
          return (
            <Card flush title={t('Rolls')} description={t('Har roll ki bachi lambai, sqft aur rate')}>
              {!x?.rolls.length ? <View style={{ padding: 16 }}><Text size="sm" tone="muted">{t('Koi roll nahi.')}</Text></View> : x.rolls.map((r, i) => (
                <ListRow key={r.id} divider={i < x.rolls.length - 1} title={<Text weight="semibold" ltr>{r.rollNumber}{r.variant?.name ? `  ${r.variant.name}` : ''}</Text>}
                  subtitle={t('{{widthFt}} × {{remainingLengthFt}} · {{remainingSqft}} sqft · {{salePricePerSqft}}/sqft', { widthFt: ftIn(r.widthFt, r.widthInch), remainingLengthFt: ftIn(r.remainingLengthFt, r.remainingLengthInch), remainingSqft: r2(r.remainingSqft), salePricePerSqft: formatMoney(r.salePricePerSqft) })}
                  trailing={<Text size="xs" tone={rollStatus(r.status).tone === 'success' ? 'success' : 'muted'}>{t(rollStatus(r.status).label)}</Text>}
                  chevron onPress={() => router.push(`/carpet/rolls/${r.id}` as never)} />
              ))}
            </Card>
          );
        },
      },
      {
        id: 'pieces', label: msg('Tukre'), icon: Scissors, when: ({ product, extra }) => isCarpetUnit(product.unit) && !!(extra as DetailExtra | undefined)?.pieces.length,
        render: ({ extra }) => {
          const x = extra as DetailExtra;
          return (
            <Card flush title={t('Tukre')} description={t('Bikne ko tayyar tukre')}>
              {x.pieces.map((p, i) => (
                <ListRow key={p.id} divider={i < x.pieces.length - 1} title={<Text weight="semibold" ltr>{p.pieceCode}</Text>}
                  subtitle={t('{{widthFt}} × {{lengthFt}} · {{totalSqft}} sqft · {{salePrice}}', { widthFt: ftIn(p.widthFt, p.widthInch), lengthFt: ftIn(p.lengthFt, p.lengthInch), totalSqft: r2(p.totalSqft), salePrice: formatMoney(p.salePrice) })}
                  trailing={<Text size="xs" tone="muted">{t(pieceStatus(p.status).label)}</Text>} />
              ))}
            </Card>
          );
        },
      },
    ],
    stockChips: [1, 2, 5, 10],
  },
});
