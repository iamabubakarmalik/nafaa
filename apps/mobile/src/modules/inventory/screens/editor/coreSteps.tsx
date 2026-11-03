/**
 * The three shared editor steps, same as the web: who the product is
 * (basic), its prices and packs, and its stock (opening count, variants,
 * batches). Industries reuse them and add their own fields through the
 * `extra` / `after` slots, or add whole steps of their own.
 */

import { router } from 'expo-router';
import { Boxes, CalendarClock, ClipboardList, Layers, Lock, Plus, ScanLine, Tag, Trash2, Wallet, Wand2 } from 'lucide-react-native';
import { useState, type ReactNode } from 'react';
import { View } from 'react-native';
import {
  autoSku, belowCost, DEFAULT_MARKUPS, duplicateCodes, expiryState, inStoreEan13, marginPct, openingStock, PACK_PRESETS, packPricesFromBase,
  packSavingPct, perBaseUnit, priceForMarkup, type PackKind,
} from '@nafaa/core/inventory';
import { formatPKR, formatDate } from '@/core/format';
import { msg, t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import {
  Badge, Button, Card, Chip, DatePicker, IconButton, Input, MoneyInput, Row, Switch, Text, TextArea, useTheme,
} from '@/design';
import { Scanner } from '@/core/hardware/scanner';
import { BrandSelect, CategorySelect, TagsSelect } from '../../components/Pickers';
import { MarginCard, NumberInput, Tiles } from '../../components/fields';
import { PhotoField } from '../../components/PhotoField';
import type { CoreOptions, StepContext, StepDef } from '../../industry/types';
import { qty, useCostMask } from '../../lib/shared';
import type { BatchDraft, Errors, UnitDraft, VariantDraft } from './types';

type Slot<X> = (ctx: StepContext<X>) => ReactNode;

function Section({ title, hint, icon: _icon, action, children }: { title: string; hint?: string; icon?: unknown; action?: ReactNode; children: ReactNode }) {
  const th = useTheme();
  return (
    <View style={{ gap: th.space(3) }}>
      <Row justify="between" align="start" gap={2}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text size="base" weight="bold">{title}</Text>
          {hint && <Text size="xs" tone="muted">{hint}</Text>}
        </View>
        {action}
      </Row>
      {children}
    </View>
  );
}

/* ─────────────────────────── Step 1: basic ─────────────────────────── */

function CodeFields<X>({ ctx, prefix }: { ctx: StepContext<X>; prefix: string }) {
  const c = ctx.draft.core;
  const [scan, setScan] = useState(false);
  return (
    <>
      <Input label={t('SKU (apna code)')} value={c.sku} onChangeText={(sku) => ctx.setCore({ sku })} placeholder={t('Khali chhorein to khud ban jayega')} ltr autoCapitalize="characters"
        hint={t('Andar ka code — report aur dhoondne ke liye')}
        trailing={<IconButton icon={Wand2} label={t('Auto')} size="sm" variant="soft" onPress={() => ctx.setCore({ sku: autoSku(c.name, prefix) })} />} />
      <Input label={t('Barcode')} value={c.barcode} onChangeText={(barcode) => ctx.setCore({ barcode })} placeholder={t('Dabbe par likha number')} ltr keyboardType="number-pad"
        error={ctx.errors.barcode} hint={t('POS scanner isi se cheez uthata hai — do cheezon ka ek barcode nahi ho sakta')}
        trailing={<Row gap={1}>
          <IconButton icon={ScanLine} label={t('Scan')} size="sm" variant="soft" onPress={() => setScan(true)} />
          {!c.barcode && <IconButton icon={Wand2} label={t('Naya barcode banayein')} size="sm" variant="soft" onPress={() => ctx.setCore({ barcode: inStoreEan13() })} />}
        </Row>} />
      {scan && <Scanner title={t('Barcode scan')} onClose={() => setScan(false)} onCode={(code) => { ctx.setCore({ barcode: code.trim() }); }} />}
    </>
  );
}

export function basicStep<X>(core: CoreOptions, opts: { extra?: Slot<X>; after?: Slot<X>; namePlaceholder?: string } = {}): StepDef<X> {
  return {
    id: 'basic', title: msg('Pehchaan'), icon: Tag,
    validate: (d) => {
      const e: Errors = {};
      if (!d.core.name.trim()) e.name = t('Naam likhein');
      if (!d.core.unit.trim()) e.unit = t('Unit chunein');
      return e;
    },
    render: (ctx) => {
      const c = ctx.draft.core;
      return (
        <>
          <Section title={t('Cheez kya hai')} hint={t('Wohi naam likhein jo grahak bolta hai — POS par isi se milegi')}>
            <Input label={t('Naam')} value={c.name} onChangeText={(name) => ctx.setCore({ name })} error={ctx.errors.name} size="lg"
              placeholder={opts.namePlaceholder ? t(opts.namePlaceholder) : t('Jaise: Tapal Danedar 95g')} autoFocus={!ctx.isEdit} />
            {opts.extra?.(ctx)}
            <CategorySelect value={c.categoryId} onChange={(categoryId) => ctx.setCore({ categoryId })} hint={t('POS ke filter aur reports isi se bante hain')} />
            <BrandSelect value={c.brandId} onChange={(brandId) => ctx.setCore({ brandId })} />
            <CodeFields ctx={ctx} prefix={core.skuPrefix} />
          </Section>
          <Section title={t('Kis hisaab se bikti hai')} hint={t('Stock aur rate isi unit mein ginay jayenge')}>
            <Tiles value={c.unit} onChange={(unit) => ctx.setCore({ unit })} options={core.units.map((u) => ({ value: u.value, label: t(u.label) }))} />
            {ctx.errors.unit && <Text size="xs" tone="danger">{ctx.errors.unit}</Text>}
          </Section>
          <PhotoField value={c.images} onChange={(images) => ctx.setCore({ images })} />
          <Section title={t('Aur')} hint={t('Zaroori nahi — baad mein bhi bhar sakte hain')}>
            <TextArea label={t('Details')} value={c.description} onChangeText={(description) => ctx.setCore({ description })} placeholder={t('Size, flavour, kis kaam aati hai…')} />
            <TagsSelect value={c.tagIds} onChange={(tagIds) => ctx.setCore({ tagIds })} />
            <Switch value={c.isActive} onChange={(isActive) => ctx.setCore({ isActive })} label={t('Chalu')} description={t('Band ho to POS par nahi dikhti')} />
            <Switch value={c.isFeatured} onChange={(isFeatured) => ctx.setCore({ isFeatured })} label={t('Khaas')} description={t('POS aur store mein upar dikhti hai')} />
            <Switch value={c.isRawMaterial} onChange={(isRawMaterial) => ctx.setCore({ isRawMaterial })} label={t('Raw material (kacha maal)')} description={t('Sirf purchase aur banane me — POS par nahi bikti')} />
            {opts.after?.(ctx)}
          </Section>
        </>
      );
    },
  };
}

/* ─────────────────────────── Step 2: price ─────────────────────────── */

function MarginPill({ price, cost }: { price: number | null | undefined; cost: number }) {
  const m = marginPct(price, cost);
  if (m === null) return null;
  return <Badge tone={m < 0 ? 'danger' : m < 10 ? 'warning' : 'success'}>{t('Margin {{value}}%', { value: m.toFixed(1) })}</Badge>;
}

function PacksEditor<X>({ ctx }: { ctx: StepContext<X> }) {
  const th = useTheme();
  const c = ctx.draft.core;
  const units = c.units;
  const set = (next: UnitDraft[]) => ctx.setCore({ units: next });
  const base = (): UnitDraft => ({ unitName: c.unit, conversionType: 'BASE', conversionRate: 1, isBase: true, price: c.price, costPrice: c.costPrice, wholesalePrice: c.wholesalePrice, creditPrice: c.creditPrice, mrpPrice: null, barcode: '', sku: '', isActive: true });
  const add = (name: string, rate: number, type: PackKind) => {
    const list = units.length ? units : [base()];
    set([...list, { unitName: name, conversionType: type, conversionRate: rate, isBase: false, ...packPricesFromBase(c, rate), mrpPrice: null, barcode: '', sku: '', isActive: true }]);
  };
  const update = (i: number, patch: Partial<UnitDraft>) => set(units.map((u, x) => (x === i ? { ...u, ...patch } : u)));
  return (
    <Section title={t('Packing (darjan, dabba, carton)')} icon={Boxes}
      hint={t('Ek cheez kai tarah bikti ho to — POS par har packing ka apna rate aur barcode. Save hui packing band hoti hai, mitti nahi.')}
      action={units.length > 0 && units.every((u) => !u.id) ? <Button size="sm" variant="ghost" onPress={() => set([])}>{t('Sab hatayein')}</Button> : undefined}>
      <Row gap={1.5} wrap>
        {PACK_PRESETS.filter((p) => !units.some((u) => u.unitName === p.name || u.unitName === t(p.name))).map((p) => (
          <Chip key={p.name} icon={Plus} label={t(p.name)} onPress={() => add(t(p.name), p.rate, p.type)} />
        ))}
        <Chip icon={Plus} label={t('Apni')} onPress={() => add(t('Nayi packing'), 2, 'CUSTOM')} />
      </Row>
      {units.map((u, i) => {
        const saving = u.isBase ? 0 : packSavingPct(c.price, u.price, u.conversionRate);
        return (
          <Card key={u.id ?? i} tone={u.isBase ? 'brand' : 'default'} style={{ opacity: u.isActive ? 1 : 0.6 }}>
            <View style={{ gap: th.space(2) }}>
              <Row gap={2} align="end">
                <Input containerStyle={{ flex: 1.4 }} label={t('Naam')} value={u.unitName} disabled={u.isBase} onChangeText={(unitName) => update(i, { unitName })} />
                <NumberInput containerStyle={{ flex: 1 }} label={t('Kitne {{unit}}', { unit: c.unit })} value={u.conversionRate || null} disabled={u.isBase}
                  onChangeValue={(v) => update(i, { conversionRate: v ?? 0 })} error={ctx.errors[`unit${i}`]} />
                {u.isBase ? null : u.id
                  ? <Switch value={u.isActive} onChange={(isActive) => update(i, { isActive })} />
                  : <IconButton icon={Trash2} label={t('Hatayein')} variant="danger" onPress={() => set(units.filter((_, x) => x !== i))} />}
              </Row>
              <Row gap={2}>
                <MoneyInput containerStyle={{ flex: 1 }} label={t('Rate')} value={u.price || null} onChangeValue={(v) => update(i, { price: v ?? 0 })} />
                <MoneyInput containerStyle={{ flex: 1 }} label={t('Cost')} value={u.costPrice || null} onChangeValue={(v) => update(i, { costPrice: v ?? 0 })} />
              </Row>
              <Row gap={2}>
                <MoneyInput containerStyle={{ flex: 1 }} label={t('Wholesale')} value={u.wholesalePrice} placeholder={u.price ? String(u.price) : t('Retail')}
                  onChangeValue={(v) => update(i, { wholesalePrice: v && v > 0 ? v : null })} />
                <MoneyInput containerStyle={{ flex: 1 }} label={t('Credit (udhaar)')} value={u.creditPrice} placeholder={u.price ? String(u.price) : t('Retail')}
                  onChangeValue={(v) => update(i, { creditPrice: v && v > 0 ? v : null })} />
              </Row>
              <Input label={t('Barcode')} value={u.barcode} onChangeText={(barcode) => update(i, { barcode })} ltr keyboardType="number-pad" />
              {(belowCost(u.wholesalePrice, u.costPrice) || belowCost(u.creditPrice, u.costPrice)) && (
                <Text size="xs" tone="warning">{t('{{value}} price Cost se kam hai — is rate par loss hoga', { value: [belowCost(u.wholesalePrice, u.costPrice) && 'Wholesale', belowCost(u.creditPrice, u.costPrice) && 'Credit'].filter(Boolean).join(' / ') })}</Text>
              )}
              {!u.isBase && (
                <Row gap={1.5} wrap>
                  <Text size="xs" tone="muted">{t('Fi {{unit}}:', { unit: c.unit })}</Text>
                  <Text size="xs" weight="bold" ltr>{formatPKR(perBaseUnit(u.price, u.conversionRate))}</Text>
                  {saving > 0.5 && <Badge tone="success">{t('{{value}}% sasta', { value: saving.toFixed(0) })}</Badge>}
                  <Text size="xs" tone="muted">{t('Discount:')}</Text>
                  {[0, 3, 5, 8, 10].map((d) => <Chip key={d} label={`${d}%`} onPress={() => update(i, { price: Math.round(c.price * u.conversionRate * (1 - d / 100)) })} />)}
                </Row>
              )}
            </View>
          </Card>
        );
      })}
    </Section>
  );
}

export function priceStep<X>(core: CoreOptions, opts: { extra?: Slot<X>; allowZeroPrice?: boolean } = {}): StepDef<X> {
  const markups = core.markups ?? [...DEFAULT_MARKUPS];
  return {
    id: 'price', title: msg('Qeemat'), icon: Wallet,
    validate: (d) => {
      const e: Errors = {};
      if (!opts.allowZeroPrice && !(d.core.price > 0)) e.price = t('Bechne ki qeemat likhein');
      if (d.core.costPrice < 0) e.costPrice = t('Cost ulti nahi ho sakti');
      d.core.units.forEach((u, i) => {
        if (!u.unitName.trim()) e[`unit${i}`] = t('Packing ka naam likhein');
        if (!(u.conversionRate > 0)) e[`unit${i}`] = t('{{value}}: kitne aate hain likhein', { value: u.unitName || 'Packing' });
      });
      if (duplicateCodes(d.core.units.map((u) => u.barcode)).length) e.units = t('Do packing ka barcode ek jaisa hai');
      return e;
    },
    render: (ctx) => <PriceStepBody ctx={ctx} core={core} markups={markups} extra={opts.extra} />,
  };
}

function PriceStepBody<X>({ ctx, core, markups, extra }: { ctx: StepContext<X>; core: CoreOptions; markups: number[]; extra?: Slot<X> }) {
  const c = ctx.draft.core;
  const { costHidden } = useCostMask();
  const low = [belowCost(c.wholesalePrice, c.costPrice) && t('Wholesale price'), belowCost(c.creditPrice, c.costPrice) && t('Credit (udhaar) price')].filter(Boolean);
  return (
    <>
      <Section title={t('Ek {{unit}} ki qeemat', { unit: c.unit })} hint={t('Cost likhein to profit khud nikal aata hai')}>
        {!costHidden && (
          <MoneyInput label={t('Cost price (Company price)')} value={c.costPrice || null} onChangeValue={(v) => ctx.setCore({ costPrice: v ?? 0 })}
            error={ctx.errors.costPrice} hint={t('Ek unit company se kitne ki aati hai')} />
        )}
        <MoneyInput label={t('Retail price')} value={c.price || null} onChangeValue={(v) => ctx.setCore({ price: v ?? 0 })} error={ctx.errors.price} size="lg"
          hint={<Row gap={1.5}>{!costHidden && <MarginPill price={c.price} cost={c.costPrice} />}<Text size="xs" tone="muted">{t('Aam grahak ka rate')}</Text></Row>} />
        {!costHidden && c.costPrice > 0 && (
          <Row gap={1.5} wrap>
            <Text size="xs" tone="muted">{t('Cost par profit jorein:')}</Text>
            {markups.map((m) => {
              const p = priceForMarkup(c.costPrice, m);
              return <Chip key={m} label={`+${m}% · ${p}`} selected={c.price === p} onPress={() => ctx.setCore({ price: p })} />;
            })}
          </Row>
        )}
        <Row gap={2} style={{ alignItems: 'flex-start' }}>
          <MoneyInput containerStyle={{ flex: 1 }} label={t('Wholesale price')} value={c.wholesalePrice} placeholder={c.price ? String(c.price) : t('Retail')}
            onChangeValue={(v) => ctx.setCore({ wholesalePrice: v && v > 0 ? v : null })} hint={t('Dukandar ka rate · khaali ho to Retail')} />
          <MoneyInput containerStyle={{ flex: 1 }} label={t('Credit (udhaar) price')} value={c.creditPrice} placeholder={c.price ? String(c.price) : t('Retail')}
            onChangeValue={(v) => ctx.setCore({ creditPrice: v && v > 0 ? v : null })} hint={t('Udhaar ka rate · khaali ho to Retail')} />
        </Row>
        {low.length > 0 && !costHidden && (
          <Card tone="warning"><Text size="sm">{t('{{value}} Cost ({{costPrice}}) se kam hai — is rate par har sale par loss hoga.', { value: low.join(' / '), costPrice: formatPKR(c.costPrice) })}</Text></Card>
        )}
        <NumberInput label={t('Tax')} value={c.taxRate || null} onChangeValue={(v) => ctx.setCore({ taxRate: v ?? 0 })} hint={t('Agar bill par tax lagta hai')} trailing={<Text tone="muted">%</Text>} />
        {extra?.(ctx)}
        <MarginCard cost={c.costPrice} price={c.price} hidden={costHidden} />
      </Section>
      {core.packs && <PacksEditor ctx={ctx} />}
      {ctx.errors.units && <Text size="sm" tone="danger">{ctx.errors.units}</Text>}
    </>
  );
}

/* ─────────────────────────── Step 3: stock ─────────────────────────── */

function VariantsEditor<X>({ ctx, presets }: { ctx: StepContext<X>; presets: Array<{ group: string; values: string[] }> }) {
  const th = useTheme();
  const c = ctx.draft.core;
  const [name, setName] = useState('');
  const set = (variants: VariantDraft[]) => ctx.setCore({ variants });
  const add = (n: string) => {
    if (!n.trim() || c.variants.some((v) => v.name.toLowerCase() === n.trim().toLowerCase())) return;
    set([...c.variants, { name: n.trim(), sku: '', barcode: '', colorHex: '', price: null, costPrice: null, stock: 0, isActive: true }]);
  };
  const update = (i: number, patch: Partial<VariantDraft>) => set(c.variants.map((v, x) => (x === i ? { ...v, ...patch } : v)));
  return (
    <View style={{ gap: th.space(3) }}>
      {presets.map((p) => (
        <Row key={p.group} gap={1.5} wrap>
          <Text size="xs" tone="muted" style={{ width: 56 }}>{t(p.group)}</Text>
          {p.values.map((v) => {
            const on = c.variants.some((x) => x.name === v);
            return <Chip key={v} label={t(v)} selected={on} onPress={() => (on ? set(c.variants.filter((x) => x.name !== v || x.id)) : add(v))} />;
          })}
        </Row>
      ))}
      <Input value={name} onChangeText={setName} placeholder={t('Apna variant likh kar Enter dabayein (jaise: Laal 128GB)')} returnKeyType="done"
        onSubmitEditing={() => { add(name); setName(''); }}
        trailing={<IconButton icon={Plus} label={t('Jorein')} size="sm" variant="soft" onPress={() => { add(name); setName(''); }} />} />
      {c.variants.map((v, i) => (
        <Card key={v.id ?? i} style={{ opacity: v.isActive ? 1 : 0.6 }}>
          <View style={{ gap: th.space(2) }}>
            <Row gap={2} align="end">
              <Input containerStyle={{ flex: 1 }} label={t('Variant')} value={v.name} onChangeText={(n) => update(i, { name: n })} />
              {v.id ? <Switch value={v.isActive} onChange={(isActive) => update(i, { isActive })} />
                : <IconButton icon={Trash2} label={t('Hatayein')} variant="danger" onPress={() => set(c.variants.filter((_, x) => x !== i))} />}
            </Row>
            <Row gap={2}>
              {v.id
                ? <View style={{ flex: 1, gap: 4 }}><Text size="xs" tone="muted">{t('Stock')}</Text><Text weight="bold" ltr>{qty(v.stock)}</Text></View>
                : <NumberInput containerStyle={{ flex: 1 }} label={t('Stock')} value={v.stock || null} onChangeValue={(s) => update(i, { stock: s ?? 0 })} />}
              <MoneyInput containerStyle={{ flex: 1 }} label={t('Rate')} value={v.price} placeholder={String(c.price || '')} onChangeValue={(p) => update(i, { price: p })} />
            </Row>
            <Row gap={2}>
              <Input containerStyle={{ flex: 1 }} label={t('SKU')} value={v.sku} onChangeText={(sku) => update(i, { sku })} ltr />
              <Input containerStyle={{ flex: 1 }} label={t('Barcode')} value={v.barcode} onChangeText={(barcode) => update(i, { barcode })} ltr keyboardType="number-pad" />
            </Row>
          </View>
        </Card>
      ))}
    </View>
  );
}

function BatchesEditor<X>({ ctx }: { ctx: StepContext<X> }) {
  const th = useTheme();
  const c = ctx.draft.core;
  const set = (batches: BatchDraft[]) => ctx.setCore({ batches });
  const update = (i: number, patch: Partial<BatchDraft>) => set(c.batches.map((b, x) => (x === i ? { ...b, ...patch } : b)));
  const today = new Date().toISOString().slice(0, 10);
  const asDate = (s: string) => (s ? new Date(`${s}T00:00:00`) : null);
  const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return (
    <View style={{ gap: th.space(2) }}>
      {c.batches.map((b, i) => {
        const state = expiryState(b.expiryDate, today);
        return (
          <Card key={b.id ?? i} tone={state === 'expired' ? 'danger' : state === 'soon' ? 'warning' : 'default'}>
            <View style={{ gap: th.space(2) }}>
              <Row gap={2} align="end">
                <Input containerStyle={{ flex: 1 }} label={t('Batch number')} value={b.batchNumber} onChangeText={(batchNumber) => update(i, { batchNumber })} ltr error={ctx.errors[`batch${i}`]} />
                {!b.id && <IconButton icon={Trash2} label={t('Hatayein')} variant="danger" onPress={() => set(c.batches.filter((_, x) => x !== i))} />}
              </Row>
              <Row gap={2}>
                <View style={{ flex: 1 }}><DatePicker label={t('Bani')} value={asDate(b.manufactureDate)} onChange={(d) => update(i, { manufactureDate: ymd(d) })} /></View>
                <View style={{ flex: 1 }}><DatePicker label={t('Expiry')} value={asDate(b.expiryDate)} onChange={(d) => update(i, { expiryDate: ymd(d) })} /></View>
              </Row>
              <Row gap={2}>
                {b.id
                  ? <View style={{ flex: 1, gap: 4 }}><Text size="xs" tone="muted">{t('Kitna')}</Text><Text weight="bold" ltr>{qty(b.quantity)}</Text></View>
                  : <NumberInput containerStyle={{ flex: 1 }} label={t('Kitna')} value={b.quantity || null} onChangeValue={(q) => update(i, { quantity: q ?? 0 })} />}
                <MoneyInput containerStyle={{ flex: 1 }} label={t('Cost')} value={b.costPrice || null} onChangeValue={(v) => update(i, { costPrice: v ?? 0 })} />
              </Row>
              {b.expiryDate ? <Text size="xs" tone="muted">{formatDate(b.expiryDate)}</Text> : null}
            </View>
          </Card>
        );
      })}
      {ctx.isEdit
        ? <Text size="xs" tone="muted">{t('{{value}}Naya batch Purchase ke saath aata hai — wahan batch number aur expiry likhein.', { value: c.batches.length ? t('Batch number, date aur cost yahan theek kar sakte hain. ') : '' })}</Text>
        : <Button variant="soft" icon={Plus} onPress={() => set([...c.batches, { batchNumber: `B-${String(c.batches.length + 1).padStart(3, '0')}`, manufactureDate: '', expiryDate: '', quantity: 0, costPrice: c.costPrice, notes: '' }])}>{t('Batch jorein')}</Button>}
    </View>
  );
}

function StockLocked({ stock, unit }: { stock: number; unit: string }) {
  const can = usePermission();
  return (
    <Card tone="muted">
      <Text size="xs" tone="muted">{t('Is branch mein')}</Text>
      <Text size="2xl" weight="bold" ltr>{`${qty(stock)} ${unit}`}</Text>
      <Row gap={1.5} wrap style={{ marginTop: 8 }}>
        {can(P.STOCK_ADJUSTMENTS_MANAGE) && <Button size="sm" variant="secondary" icon={ClipboardList} onPress={() => router.push('/stock-adjustments' as never)}>{t('Adjustments')}</Button>}
        {can(P.PURCHASES_CREATE) && <Button size="sm" variant="secondary" icon={Plus} onPress={() => router.push('/purchases/new' as never)}>{t('Purchase')}</Button>}
      </Row>
    </Card>
  );
}

export function stockStep<X>(core: CoreOptions, opts: { extra?: Slot<X>; title?: string; quick?: number[] } = {}): StepDef<X> {
  const quick = opts.quick ?? [10, 25, 50, 100, 200, 500];
  return {
    id: 'stock', title: opts.title ?? msg('Stock'), icon: Layers,
    validate: (d) => {
      const e: Errors = {};
      const names = d.core.variants.map((v) => v.name.trim().toLowerCase());
      if (names.some((n) => !n)) e.variants = t('Har variant ka naam likhein');
      else if (new Set(names).size !== names.length) e.variants = t('Do variants ka naam ek jaisa hai');
      if (duplicateCodes(d.core.variants.map((v) => v.barcode)).length) e.variants = t('Do variants ka barcode ek jaisa hai');
      d.core.batches.forEach((b, i) => {
        if (!b.batchNumber.trim()) e[`batch${i}`] = t('Batch number likhein');
        else if (!b.id && !(b.quantity > 0)) e[`batch${i}`] = t('{{batchNumber}}: kitna maal likhein', { batchNumber: b.batchNumber });
      });
      if (d.core.lowStockAlert < 0) e.lowStockAlert = t('Had ulti nahi ho sakti');
      return e;
    },
    render: (ctx) => {
      const c = ctx.draft.core;
      const simple = !c.variants.length && !c.batches.length;
      const opening = openingStock(c);
      const alertField = (
        <NumberInput label={t('Kam stock ki had')} value={c.lowStockAlert} onChangeValue={(v) => ctx.setCore({ lowStockAlert: v ?? 0 })} error={ctx.errors.lowStockAlert}
          hint={t('Itna ya kam bachne par "Kam" ki patti lagegi')} trailing={<Text tone="muted">{c.unit}</Text>} />
      );
      return (
        <>
          {ctx.isEdit ? (
            <Section title={t('Abhi ka stock')} icon={Lock} hint={t('Edit karne se stock nahi badalta — Adjustment ya Purchase se badlein, taake har badlao ka record rahe')}>
              <StockLocked stock={c.stock} unit={c.unit} />
              {alertField}
            </Section>
          ) : (
            <Section title={t('Shuru ka stock')} hint={t('Sirf pehli dafa — baad mein stock Adjustment ya Purchase se badlega')}>
              {!simple ? (
                <Card tone="muted">
                  <Text size="xs" tone="muted">{t('Variants / batches se')}</Text>
                  <Text size="2xl" weight="bold" ltr>{`${qty(opening)} ${c.unit}`}</Text>
                  <Text size="xs" tone="muted">{t('Neeche har variant ya batch ka stock likhein')}</Text>
                </Card>
              ) : (
                <>
                  <NumberInput label={t('Kitna {{unit}}', { unit: c.unit })} size="lg" value={c.stock || null} onChangeValue={(v) => ctx.setCore({ stock: v ?? 0 })}
                    hint={t('Abhi shelf par kitna hai — khali chhorein to 0')} />
                  <Row gap={1.5} wrap>
                    {quick.map((q) => <Chip key={q} label={`+${q}`} onPress={() => ctx.setCore({ stock: (Number(c.stock) || 0) + q })} />)}
                    {c.stock > 0 && <Chip label={t('Saaf')} onPress={() => ctx.setCore({ stock: 0 })} />}
                  </Row>
                </>
              )}
              {alertField}
              {c.price > 0 && opening > 0 && (
                <Text size="sm" tone="muted">{t('Is stock ki value: {{cost}} cost · {{sale}} bechne par', { cost: formatPKR(opening * c.costPrice), sale: formatPKR(opening * c.price) })}</Text>
              )}
            </Section>
          )}
          {core.variants && (
            <Section title={t('Variants (size, rang, flavour)')} icon={Boxes}
              hint={ctx.isEdit ? t('Naye variant ka shuru ka stock record ke saath judta hai; purane variant band hote hain, mitte nahi') : t('Ek hi cheez ke alag size, rang ya flavour — har ek ka apna stock aur rate')}>
              <VariantsEditor ctx={ctx} presets={core.variants.presets} />
              {ctx.errors.variants && <Text size="sm" tone="danger">{ctx.errors.variants}</Text>}
            </Section>
          )}
          {core.batches && (
            <Section title={t('Batch aur expiry')} icon={CalendarClock} hint={t('Dawai, khane ki cheezein — jo pehle expire ho woh pehle bechein')}>
              <Switch value={c.expiryTracked || c.batches.length > 0} onChange={(expiryTracked) => ctx.setCore({ expiryTracked })} label={t('Expiry ka hisaab rakhein')} disabled={c.batches.length > 0} />
              <BatchesEditor ctx={ctx} />
            </Section>
          )}
          {opts.extra?.(ctx)}
        </>
      );
    },
  };
}
