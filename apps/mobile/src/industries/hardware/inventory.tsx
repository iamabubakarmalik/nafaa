/**
 * Hardware items through the shared products list, editor and detail (web
 * HardwareProductEditor / Products / ProductDetail): what kind of item it is
 * (cement, pipe, paint…), its size, grade or shade, loose and pack sale, retail
 * and wholesale rate, quantity rates for bulk buyers, sizes as variants and
 * the reorder point.
 */

import { router } from 'expo-router';
import { Award, FileText, RefreshCw, Ruler, Tags, Trash2, Truck } from 'lucide-react-native';
import { View } from 'react-native';
import { qty, slipUnit } from '@nafaa/core/industries/hardware';
import { formatMoney } from '@/core/format';
import { msg, t } from '@/core/i18n';
import { queryClient } from '@/core/query/client';
import { Button, Card, Chip, ChipGroup, FormSection, IconButton, Input, ListRow, MoneyInput, Row, Switch, Text, toast } from '@/design';
import { NumberInput } from '@/modules/inventory/components/fields';
import { registerInventoryIndustry } from '@/modules/inventory/industry/registry';
import type { CoreOptions, EditorConfig, StepContext, StepDef } from '@/modules/inventory/industry/types';
import { basicStep, priceStep, stockStep } from '@/modules/inventory/screens/editor/coreSteps';
import { errText, opt } from '../_shared/trade/desk';
import { bulkPricingApi, hardwareProductsApi, reorderRulesApi, type HardwareFacts, type HardwareProduct, type ReorderRule, type Tier } from './api';
import { factLine, useHardwareFacts, useTiers } from './components/facts';
import { CATEGORY, KEYS, categoryLabel, isPaint } from './meta';

interface TierDraft { id?: string; minQuantity: number | null; price: number | null; label: string }
export interface HardwareExtra {
  categoryType: string; diameter: string; grade: string; gradeStrength: string; bagWeight: number | null; tileSize: string; finishType: string; piecesPerBox: number | null; sqftPerBox: number | null;
  colorName: string; colorCode: string; finishSheen: string; coverage: number | null; litersPerCan: number | null; manufacturingLocation: string; requiresTruck: boolean; isFastMoving: boolean;
  tiers: TierDraft[]; removedTiers: string[]; reorderPoint: number | null; minStock: number | null; reorderQty: number | null; preferredSupplier: string;
}
const initial: HardwareExtra = {
  categoryType: '', diameter: '', grade: '', gradeStrength: '', bagWeight: null, tileSize: '', finishType: '', piecesPerBox: null, sqftPerBox: null, colorName: '', colorCode: '', finishSheen: '',
  coverage: null, litersPerCan: null, manufacturingLocation: '', requiresTruck: false, isFastMoving: false, tiers: [], removedTiers: [], reorderPoint: null, minStock: null, reorderQty: null, preferredSupplier: '',
};
const SIZES = ['1/2"', '3/4"', '1"', '1-1/4"', '1-1/2"', '2"', '3"', '4"', '6"'];
const STEEL = ['3 sootar (10mm)', '4 sootar (12mm)', '5 sootar (16mm)', '6 sootar (20mm)'];
const TILE = ['12x12', '16x16', '24x24', '12x24', '24x48'];
const SHEEN = ['Matt', 'Silk', 'Gloss', 'Emulsion', 'Enamel', 'Weather shield'];
const CANS = [0.9, 3.64, 18.2];
const num = (v: number | null) => (v != null && Number.isFinite(v) ? v : undefined);
const toggle = (cur: string, v: string) => (cur === v ? '' : v);

function Kind({ ctx }: { ctx: StepContext<HardwareExtra> }) {
  const x = ctx.draft.extra;
  return (
    <FormSection title={t('Maal ka type')} description={t('Isi se agla step size, grade ya shade poochta hai aur POS par paint ka shade likhne ka option aata hai.')}>
      <ChipGroup wrap value={x.categoryType} onChange={(v) => ctx.setExtra({ categoryType: toggle(x.categoryType, v) })} options={CATEGORY.map((c) => ({ value: c.value, label: t(c.label) }))} />
    </FormSection>
  );
}

function Specs({ ctx }: { ctx: StepContext<HardwareExtra> }) {
  const x = ctx.draft.extra;
  const set = ctx.setExtra;
  const c = x.categoryType;
  const pipe = ['PLUMBING_PIPE', 'PLUMBING_FITTING', 'STEEL_PIPE', 'ELECTRIC_CONDUIT'].includes(c);
  const steel = c === 'STEEL_REBAR';
  const cement = c === 'CEMENT';
  const tile = ['TILES_FLOOR', 'TILES_WALL', 'MARBLE', 'GRANITE'].includes(c);
  const paint = isPaint(c) || c === 'THINNER';
  const any = !pipe && !steel && !cement && !tile && !paint;
  const chips = (list: string[], value: string, key: keyof HardwareExtra) => <ChipGroup wrap value={value} onChange={(v) => set({ [key]: toggle(value, v) } as Partial<HardwareExtra>)} options={list.map((v) => ({ value: v, label: v }))} />;
  return (
    <>
      {(pipe || any) && (
        <FormSection title={t('Size')} description={t('Bill aur challan par naam ke saath likha jata hai — har size ka rate alag ho to Stock step me size ko variant banayein')}>
          <Input label={t('Size / dia')} value={x.diameter} onChangeText={(diameter) => set({ diameter })} placeholder={t('3/4", 4 inch, 2.5 mm')} />
          {chips(SIZES, x.diameter, 'diameter')}
          <Input label={t('Class / grade')} value={x.grade} onChangeText={(grade) => set({ grade })} placeholder={t('Class B, PN-10, Schedule 40')} />
        </FormSection>
      )}
      {steel && (
        <FormSection title={t('Sarya')} description={t('Sootar aur grade — contractor isi se maangta hai')}>
          {chips(STEEL, x.diameter, 'diameter')}
          <Input label={t('Grade')} value={x.grade} onChangeText={(grade) => set({ grade })} placeholder="40 / 60" />
          <NumberInput label={t('Ek ton me kitne kg')} value={x.bagWeight} onChangeValue={(bagWeight) => set({ bagWeight })} hint={t('Marzi hai')} />
        </FormSection>
      )}
      {cement && (
        <FormSection title={t('Cement')} description={t('Bag ka wazan aur type')}>
          <NumberInput label={t('Bag ka wazan (kg)')} value={x.bagWeight} onChangeValue={(bagWeight) => set({ bagWeight })} placeholder="50" />
          <Input label={t('Type')} value={x.gradeStrength} onChangeText={(gradeStrength) => set({ gradeStrength })} placeholder={t('OPC, SRC, White')} />
        </FormSection>
      )}
      {tile && (
        <FormSection title={t('Tiles')} description={t('Dabbe me kitni tiles aur kitne square feet — customer ke kamre ke hisaab se dabbe nikalte hain')}>
          {chips(TILE, x.tileSize, 'tileSize')}
          <Input label={t('Size')} value={x.tileSize} onChangeText={(tileSize) => set({ tileSize })} placeholder={t('24x24')} />
          <NumberInput label={t('Ek dabbe me tiles')} integer value={x.piecesPerBox} onChangeValue={(piecesPerBox) => set({ piecesPerBox })} />
          <NumberInput label={t('Ek dabba = sq ft')} value={x.sqftPerBox} onChangeValue={(sqftPerBox) => set({ sqftPerBox })} />
          <Input label={t('Finish')} value={x.finishType} onChangeText={(finishType) => set({ finishType })} placeholder={t('Glossy, Matt, Rustic')} />
        </FormSection>
      )}
      {paint && (
        <FormSection title={t('Paint')} description={t('Shade aur finish — tinting wala shade POS par har line par likha ja sakta hai')}>
          <Input label={t('Shade ka naam')} value={x.colorName} onChangeText={(colorName) => set({ colorName })} placeholder={t('Off white, Sky blue, Base A')} />
          <Input label={t('Shade code')} value={x.colorCode} onChangeText={(colorCode) => set({ colorCode })} placeholder="1234" ltr />
          {chips(SHEEN, x.finishSheen, 'finishSheen')}
          <NumberInput label={t('Dabba (liter)')} value={x.litersPerCan} onChangeValue={(litersPerCan) => set({ litersPerCan })} hint={t('Quarter 0.9 · Gallon 3.64 · Drum 18.2')} />
          <Row gap={2} wrap>{CANS.map((v) => <Chip key={v} selected={x.litersPerCan === v} label={t('{{v}} L', { v })} onPress={() => set({ litersPerCan: v })} />)}</Row>
          <NumberInput label={t('Kitni deewar (sq ft per liter)')} value={x.coverage} onChangeValue={(coverage) => set({ coverage })} />
        </FormSection>
      )}
      <FormSection title={t('Delivery aur company')}>
        <Switch value={x.requiresTruck} onChange={(requiresTruck) => set({ requiresTruck })} label={t('Gaari me jata hai')} description={t('Cement, sarya, ret — bill ke baad challan yaad dilaya jata hai')} />
        <Switch value={x.isFastMoving} onChange={(isFastMoving) => set({ isFastMoving })} label={t('Tez bikne wala')} description={t('Reorder list me upar aata hai')} />
        <Input label={t('Kahan bana')} value={x.manufacturingLocation} onChangeText={(manufacturingLocation) => set({ manufacturingLocation })} placeholder={t('Pakistan, China, Iran')} />
      </FormSection>
    </>
  );
}

/** Quantity rates: more of an item at a lower rate; the counter applies it when the quantity is typed. */
function Tiers({ ctx }: { ctx: StepContext<HardwareExtra> }) {
  const x = ctx.draft.extra;
  const c = ctx.draft.core;
  const set = (tiers: TierDraft[]) => ctx.setExtra({ tiers });
  const update = (i: number, patch: Partial<TierDraft>) => set(x.tiers.map((z, j) => (j === i ? { ...z, ...patch } : z)));
  const remove = (i: number) => { const z = x.tiers[i]; ctx.setExtra({ tiers: x.tiers.filter((_, j) => j !== i), removedTiers: z.id ? [...x.removedTiers, z.id] : x.removedTiers }); };
  return (
    <FormSection title={t('Quantity rate (bulk)')} description={t('Zyada {{value}} lene par kam rate — POS par quantity likhte hi lag jata hai', { value: c.unit || t('maal') })}>
      {x.tiers.length === 0 ? <Text size="sm" tone="muted">{t('Koi quantity rate nahi. Jaise: 50 bag se upar Rs 1,180 ek bag.')}</Text> : x.tiers.map((z, i) => (
        <Card key={z.id ?? i} style={{ gap: 8 }}>
          <Row gap={2}>
            <View style={{ flex: 1 }}><NumberInput label={t('Kam se kam ({{value}})', { value: c.unit || t('qty') })} value={z.minQuantity} onChangeValue={(minQuantity) => update(i, { minQuantity })} /></View>
            <View style={{ flex: 1 }}><MoneyInput label={t('Ek ka rate')} value={z.price} onChangeValue={(price) => update(i, { price })} /></View>
            <IconButton icon={Trash2} label={t('Hatayein')} variant="danger" onPress={() => remove(i)} />
          </Row>
          <Input label={t('Naam (marzi)')} value={z.label} onChangeText={(label) => update(i, { label })} placeholder={t('Thekedar rate')} />
        </Card>
      ))}
      <Button variant="soft" icon={Tags} onPress={() => set([...x.tiers, { minQuantity: null, price: null, label: '' }])}>{t('Rate jorein')}</Button>
      {ctx.errors.tiers ? <Text size="xs" tone="danger">{ctx.errors.tiers}</Text> : null}
    </FormSection>
  );
}

function Reorder({ ctx }: { ctx: StepContext<HardwareExtra> }) {
  const x = ctx.draft.extra;
  const set = ctx.setExtra;
  return (
    <FormSection title={t('Kab mangwana hai (reorder)')} description={t('Stock is had se neeche aaye to Reorder list aur dashboard par aata hai — khali chhor dein to nahi')}>
      <NumberInput label={t('Reorder point')} value={x.reorderPoint} onChangeValue={(reorderPoint) => set({ reorderPoint })} error={ctx.errors.reorder} hint={t('Itna reh jaye to mangwayein')} />
      <NumberInput label={t('Kam se kam (khatra)')} value={x.minStock} onChangeValue={(minStock) => set({ minStock })} />
      <NumberInput label={t('Kitna mangwana')} value={x.reorderQty} onChangeValue={(reorderQty) => set({ reorderQty })} />
      <Input label={t('Kis se mangwana')} value={x.preferredSupplier} onChangeText={(preferredSupplier) => set({ preferredSupplier })} placeholder={t('Supplier ka naam / phone')} />
    </FormSection>
  );
}

const core: CoreOptions = {
  units: [
    { value: 'pcs', label: msg('Adad (pcs)') }, { value: 'feet', label: msg('Feet') }, { value: 'meter', label: msg('Meter') }, { value: 'kg', label: msg('Kg') }, { value: 'bag', label: msg('Bag') }, { value: 'box', label: msg('Box / dabba') },
    { value: 'gallon', label: msg('Gallon') }, { value: 'liter', label: msg('Liter') }, { value: 'sqft', label: msg('Sq ft') }, { value: 'ton', label: msg('Ton') }, { value: 'bundle', label: msg('Bundle') }, { value: 'sheet', label: msg('Sheet') },
    { value: 'roll', label: msg('Roll') }, { value: 'cft', label: msg('Cft (ret/bajri)') }, { value: 'set', label: msg('Set') },
  ],
  skuPrefix: 'HW', packs: true, batches: false, markups: [5, 8, 10, 15, 20],
  variants: { presets: [{ group: msg('Pipe / fitting size'), values: SIZES }, { group: msg('Sarya'), values: STEEL }, { group: msg('Paint dabba'), values: ['Quarter', 'Gallon', 'Drum'] }, { group: msg('Rang'), values: ['White', 'Black', 'Grey', 'Ivory', 'Chrome'] }] },
};

const specsStep: StepDef<HardwareExtra> = { id: 'specs', title: msg('Size / shade'), icon: Ruler, render: (ctx) => <Specs ctx={ctx} /> };

function tierErrors(x: HardwareExtra, price: number): Record<string, string> {
  const mins = x.tiers.map((z) => Number(z.minQuantity));
  if (x.tiers.some((z) => !(Number(z.minQuantity) > 0) || !(Number(z.price) > 0))) return { tiers: t('Har quantity rate me kam se kam quantity aur rate likhein') };
  if (new Set(mins).size !== mins.length) return { tiers: t('Do rate ek hi quantity par hain') };
  if (price > 0 && x.tiers.some((z) => Number(z.price) > price)) return { tiers: t('Quantity rate asal qeemat se zyada nahi hona chahiye') };
  return {};
}
function reorderErrors(x: HardwareExtra): Record<string, string> {
  if (x.reorderPoint == null) return {};
  if (x.reorderPoint < 0 || (x.minStock ?? 0) < 0) return { reorder: t('Had manfi nahi ho sakti') };
  if (x.minStock != null && x.minStock > x.reorderPoint) return { reorder: t('Kam se kam wali had reorder point se bari nahi ho sakti') };
  return {};
}

const price = priceStep<HardwareExtra>(core, { extra: (ctx) => <Tiers ctx={ctx} /> });
const stock = stockStep<HardwareExtra>(core, { quick: [10, 50, 100, 500, 1000], extra: (ctx) => <Reorder ctx={ctx} /> });

const editor: EditorConfig<HardwareExtra> = {
  core,
  extra: {
    initial,
    load: async (productId) => {
      const [p, rule] = await Promise.all([hardwareProductsApi.byProduct(productId).catch(() => null), reorderRulesApi.byProduct(productId).catch(() => null)]);
      const out: Partial<HardwareExtra> = {};
      if (p) Object.assign(out, {
        categoryType: p.categoryType ?? '', diameter: p.diameter ?? '', grade: p.grade ?? '', gradeStrength: p.gradeStrength ?? '', bagWeight: p.bagWeight ?? null, tileSize: p.tileSize ?? '', finishType: p.finishType ?? '',
        piecesPerBox: p.piecesPerBox ?? null, sqftPerBox: p.sqftPerBox ?? null, colorName: p.colorName ?? '', colorCode: p.colorCode ?? '', finishSheen: p.finishSheen ?? '', coverage: p.coverage ?? null,
        litersPerCan: p.litersPerCan ?? null, manufacturingLocation: p.manufacturingLocation ?? '', requiresTruck: p.requiresTruck, isFastMoving: p.isFastMoving,
        tiers: (p.bulkPricing ?? []).map((z) => ({ id: z.id, minQuantity: z.minQuantity, price: z.price, label: z.label ?? '' })),
      });
      if (rule?.isActive) Object.assign(out, { reorderPoint: rule.reorderPoint, minStock: rule.minStock, reorderQty: rule.reorderQty, preferredSupplier: rule.preferredSupplier ?? '' });
      return out;
    },
    save: async (productId, d) => {
      const x = d.extra;
      const profile: Record<string, unknown> = {
        productId, categoryType: x.categoryType || undefined, unit: slipUnit(d.core.unit), diameter: opt(x.diameter), grade: opt(x.grade), gradeStrength: opt(x.gradeStrength), bagWeight: num(x.bagWeight), tileSize: opt(x.tileSize),
        finishType: opt(x.finishType), piecesPerBox: num(x.piecesPerBox), sqftPerBox: num(x.sqftPerBox), colorName: opt(x.colorName), colorCode: opt(x.colorCode), finishSheen: opt(x.finishSheen), coverage: num(x.coverage),
        litersPerCan: num(x.litersPerCan), manufacturingLocation: opt(x.manufacturingLocation), requiresTruck: x.requiresTruck, isFastMoving: x.isFastMoving, wholesalePrice: num(d.core.wholesalePrice), retailPrice: num(d.core.price),
      };
      await hardwareProductsApi.upsert(Object.fromEntries(Object.entries(profile).filter(([, v]) => v !== undefined)) as { productId: string });
      for (const id of x.removedTiers) await bulkPricingApi.remove(id);
      for (const z of x.tiers) {
        const body = { productId, minQuantity: Number(z.minQuantity), price: Number(z.price), label: opt(z.label) };
        if (z.id) await bulkPricingApi.update(z.id, body); else await bulkPricingApi.create(body);
      }
      // Reorder needs the buying permission; the item itself is saved either way.
      if (x.reorderPoint != null) {
        await reorderRulesApi.upsert({ productId, reorderPoint: x.reorderPoint, minStock: x.minStock ?? 0, reorderQty: x.reorderQty ?? Math.max(x.reorderPoint * 2, 1), preferredSupplier: opt(x.preferredSupplier), isActive: true })
          .catch((e) => toast.error(errText(e, t('Reorder point save nahi hua'))));
      }
      for (const k of [KEYS.facts, KEYS.tiers, KEYS.detail, KEYS.reorder]) void queryClient.invalidateQueries({ queryKey: [k] });
    },
  },
  steps: [
    basicStep<HardwareExtra>(core, { extra: (ctx) => <Kind ctx={ctx} />, namePlaceholder: msg('Jaise: PPR Pipe 3/4" ya Lucky Cement') }),
    specsStep,
    { ...price, validate: (d, e) => ({ ...price.validate?.(d, e), ...tierErrors(d.extra, d.core.price) }) },
    { ...stock, validate: (d, e) => ({ ...stock.validate?.(d, e), ...reorderErrors(d.extra) }) },
  ],
  summary: (d) => {
    const x = d.extra;
    const facts = [categoryLabel(x.categoryType || null), x.diameter, x.tileSize, [x.colorName, x.colorCode].filter(Boolean).join(' '), x.finishSheen].filter(Boolean);
    return [
      ...(facts.length ? [[t('Maal'), facts.join(' · ')] as [string, string]] : []),
      ...(x.tiers.length ? [[t('Quantity rate'), String(x.tiers.length)] as [string, string]] : []),
      ...(x.reorderPoint != null ? [[t('Reorder'), t('{{n}} par', { n: x.reorderPoint })] as [string, string]] : []),
    ];
  },
};

interface DetailExtra { profile: HardwareProduct | null; rule: ReorderRule | null }
interface ListSource { facts: Map<string, HardwareFacts>; tiers: Map<string, Tier[]> }

registerInventoryIndustry({
  id: 'hardware',
  label: msg('Hardware'),
  list: {
    noun: 'item',
    filters: ['tags'],
    useSource: (): ListSource => ({ facts: useHardwareFacts(), tiers: useTiers() }),
    extras: (item, ctx) => {
      const src = ctx.source as ListSource | undefined;
      const f = src?.facts.get(item.id);
      const list = src?.tiers.get(item.id);
      return {
        line: factLine(f),
        badges: [...(list?.length ? [{ label: t('Bulk'), tone: 'success' as const }] : []), ...(f?.requiresTruck ? [{ label: t('Gaari'), tone: 'warning' as const }] : [])],
        chips: [f?.categoryType ? categoryLabel(f.categoryType) : '', isPaint(f?.categoryType) && f?.colorCode ? f.colorCode : '', list?.[0] ? t('{{minQuantity}}+ par {{price}}', { minQuantity: qty(list[0].minQuantity), price: formatMoney(list[0].price) }) : ''].filter(Boolean),
      };
    },
    actions: [{ icon: RefreshCw, label: msg('Reorder'), href: '/hardware/reorder-rules' }, { icon: Award, label: msg('Brands'), href: '/brands' }, { icon: FileText, label: msg('Quotation'), href: '/hardware/quotations/new' }],
    stockChips: (item) => (['bag', 'ton', 'gallon'].includes((item.unit ?? '').toLowerCase()) ? [1, 10, 50, 100] : [10, 50, 100, 500]),
    guide: [
      { icon: Ruler, title: msg('Size aur grade'), text: msg('Har item par size, grade ya shade naam ke neeche dikhta hai — 1/2" aur 3/4" pipe alag pehchane jate hain.') },
      { icon: Tags, title: msg('Quantity rate'), text: msg('Jis item par "Bulk rate" laga hai, POS par zyada quantity likhne se kam rate khud lagta hai.') },
      { icon: Truck, title: msg('Gaari wala maal'), text: msg('Cement, sarya, ret par "Gaari" ka nishan — bill ke baad challan banana yaad rahe.') },
    ],
  },
  editor,
  detail: {
    extra: {
      key: KEYS.detail,
      load: async (id): Promise<DetailExtra> => {
        const [profile, rule] = await Promise.all([hardwareProductsApi.byProduct(id).catch(() => null), reorderRulesApi.byProduct(id).catch(() => null)]);
        return { profile, rule: rule?.isActive ? rule : null };
      },
    },
    badges: ({ extra }) => {
      const p = (extra as DetailExtra | undefined)?.profile;
      if (!p) return [];
      return [...(p.categoryType ? [{ label: categoryLabel(p.categoryType), tone: 'warning' as const }] : []), ...(p.requiresTruck ? [{ label: t('Gaari me jata hai'), tone: 'neutral' as const }] : []),
        ...(isPaint(p.categoryType) && (p.colorName || p.colorCode) ? [{ label: [p.colorName, p.colorCode].filter(Boolean).join(' '), tone: 'accent' as const }] : [])];
    },
    facts: ({ extra }) => {
      const p = (extra as DetailExtra | undefined)?.profile;
      if (!p) return [];
      return ([
        [t('Size / dia'), p.diameter], [t('Grade'), p.grade ?? p.gradeStrength], [t('Bag'), p.bagWeight ? `${p.bagWeight} kg` : undefined], [t('Tile size'), p.tileSize], [t('Finish'), p.finishSheen ?? p.finishType],
        [t('Dabba'), p.litersPerCan ? `${p.litersPerCan} liter` : undefined], [t('Kitni deewar'), p.coverage ? t('{{coverage}} sq ft / liter', { coverage: p.coverage }) : undefined],
        [t('Ek dabba'), [p.piecesPerBox && t('{{n}} tiles', { n: p.piecesPerBox }), p.sqftPerBox && `${p.sqftPerBox} sq ft`].filter(Boolean).join(' · ') || undefined],
        [t('Kahan bana'), p.manufacturingLocation], [t('Wholesale'), p.wholesalePrice ? formatMoney(p.wholesalePrice) : undefined],
      ] as Array<[string, string | undefined]>).filter((r): r is [string, string] => !!r[1]);
    },
    tile: ({ extra }) => {
      const r = (extra as DetailExtra | undefined)?.rule;
      return r ? { label: t('Reorder point'), value: qty(r.reorderPoint), hint: t('{{reorderQty}} mangwana', { reorderQty: qty(r.reorderQty) }) } : null;
    },
    alerts: ({ extra, stock, product }) => {
      const r = (extra as DetailExtra | undefined)?.rule;
      if (!r || stock > r.reorderPoint) return null;
      return <Card tone="warning"><ListRow icon={RefreshCw} title={t('Stock reorder point ({{reorderPoint}}) tak aa gaya — {{reorderQty}} {{unit}} mangwayein', { reorderPoint: qty(r.reorderPoint), reorderQty: qty(r.reorderQty), unit: product.unit })} chevron onPress={() => router.push('/purchases/new' as never)} /></Card>;
    },
    tabs: [{
      id: 'rates', label: msg('Quantity rate'), icon: Tags, when: ({ extra }) => !!(extra as DetailExtra | undefined)?.profile?.bulkPricing?.length,
      render: ({ extra, product }) => {
        const p = (extra as DetailExtra).profile!;
        return (
          <Card flush title={t('Quantity rate')}>
            <ListRow dense divider title={t('Aam rate (1 {{unit}})', { unit: product.unit })} trailing={<Text weight="bold" ltr>{formatMoney(product.price)}</Text>} />
            {p.bulkPricing!.map((z, i) => <ListRow key={z.id} dense divider={i < p.bulkPricing!.length - 1} title={`${qty(z.minQuantity)}${z.maxQuantity ? `–${qty(z.maxQuantity)}` : '+'} ${product.unit}${z.label ? ` · ${z.label}` : ''}`} trailing={<Text weight="bold" tone="success" ltr>{formatMoney(z.price)}</Text>} />)}
          </Card>
        );
      },
    }],
    stockChips: [1, 10, 50, 100],
  },
});

