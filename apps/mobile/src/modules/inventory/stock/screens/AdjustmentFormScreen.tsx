/**
 * New adjustment (web AdjustmentForm): one or many products, each with a
 * fixed reason that sets its direction and profit effect (Damage, Expiry,
 * Chori, Audit mein zyada nikla…, or opening stock), a quantity in any pack,
 * the variant, and the batch for expiry-tracked goods. Every line shows the
 * branch stock before and after and its value. Works offline: each line is
 * saved on the phone and sent when online; online, many lines are saved
 * together under one reference. Rolls and devices (IMEI) are written off on
 * the industry screens.
 */

import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { ArrowRight, PackageSearch, Plus, Trash2 } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import {
  CORRECTION_CHOICE, GAIN_REASONS, LOSS_REASONS, REASONS, TYPE_TEXT, toBaseQty, type AdjustmentType, type ProfitEffect, type ReasonCode,
} from '@nafaa/core/inventory';
import { apiErrorMessage } from '@/core/api/errors';
import { useAuthStore } from '@/core/auth/store';
import { haptic } from '@/core/device/haptics';
import { t } from '@/core/i18n';
import { enqueueStockAdjustment, offline, OfflineRuleError, useOfflineManifest, type PackRow } from '@/core/offline';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import {
  Badge, Button, Card, Chip, Icon, DatePicker, EmptyState, IconButton, Input, Row, Segmented, Select, Text, TextArea, toast, useTheme, FormTemplate,
} from '@/design';
import { batchesApi } from '../../api/products';
import { BranchSelect } from '../../components/Pickers';
import { DeviceWriteOff } from '../../industry/devices';
import { NumberInput } from '../../components/fields';
import { ProductPicker, type PickedProduct } from '../../components/ProductPicker';
import { CORRECTION_WARNING, EFFECT_META, INV, qty, useCostMask, useOnline, useRefreshInventory } from '../../lib/shared';
import { adjustmentsApi } from '../api';
import { ADJ_TYPES } from '../meta';

interface Line {
  key: string;
  productId: string;
  name: string;
  unit: string;
  variantId: string | null;
  variantName: string | null;
  cost: number;
  stock: number;
  expiryTracked: boolean;
  packs: PackRow[];
  pack: PackRow | null;
  /** null = opening stock; undefined = not picked yet. */
  code?: ReasonCode | null;
  /** Direction for a data correction. */
  dir: 'in' | 'out';
  qty: string;
  batchId: string;
  batchNo: string;
  expiry: string;
  mfg: string;
}

const typeOf = (l: Line): AdjustmentType => {
  if (l.code === null) return 'OPENING_BALANCE';
  if (l.code === undefined) return 'ADJUSTMENT_OUT';
  return REASONS[l.code].type ?? (l.dir === 'in' ? 'ADJUSTMENT_IN' : 'ADJUSTMENT_OUT');
};
const effectOfLine = (l: Line): ProfitEffect => (l.code === null || l.code === undefined ? 'NONE' : REASONS[l.code].effect);
const reasonText = (l: Line) => (l.code === null ? TYPE_TEXT.OPENING_BALANCE : l.code ? REASONS[l.code].label : TYPE_TEXT[typeOf(l)]);
const baseOf = (l: Line) => toBaseQty(Number(l.qty) || 0, l.pack?.conversionRate ?? 1);
const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export function AdjustmentFormScreen() {
  const th = useTheme();
  const can = usePermission();
  const online = useOnline();
  const refresh = useRefreshInventory();
  const { cost } = useCostMask();
  const activeShop = useAuthStore((s) => s.currentShopId);
  const manifest = useOfflineManifest();
  const allowNegative = !!manifest.data?.settings?.allowNegativeStock;
  const canCorrect = can(P.STOCK_ADJUSTMENTS_CORRECT);
  const [shopId, setShopId] = useState<string | null>(activeShop);
  const [lines, setLines] = useState<Line[]>([]);
  const [note, setNote] = useState('');
  const [picker, setPicker] = useState(false);
  const [saving, setSaving] = useState(false);

  const add = async (p: PickedProduct) => {
    const detail = await offline.products.get(p.product.id, shopId);
    const packs = (detail?.packs ?? []).filter((x) => !x.isBase && (x.variantId ?? null) === (p.variantId ?? null));
    const v = p.variantId ? detail?.variants.find((x) => x.id === p.variantId) : null;
    setLines((prev) => {
      const same = prev.findIndex((l) => l.productId === p.product.id && l.variantId === p.variantId && (l.pack?.id ?? null) === (p.pack?.id ?? null));
      if (same >= 0) return prev.map((l, i) => (i === same ? { ...l, qty: String((Number(l.qty) || 0) + 1) } : l));
      const last = prev[prev.length - 1];
      return [...prev, {
        key: `${p.product.id}-${Date.now()}`, productId: p.product.id, name: p.product.name, unit: p.product.unit, variantId: p.variantId, variantName: p.variantName,
        cost: Number(v?.costPrice ?? p.product.costPrice) || 0, stock: Number(p.stock ?? 0), expiryTracked: p.product.expiryTracked, packs, pack: p.pack,
        code: last ? last.code : undefined, dir: last?.dir ?? 'out', qty: '1', batchId: '', batchNo: '', expiry: '', mfg: '',
      }];
    });
  };
  const patch = (key: string, p: Partial<Line>) => setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...p } : l)));

  const problems: string[] = [];
  if (!shopId) problems.push(t('Pehle branch chunein'));
  if (!lines.length) problems.push(t('Kam se kam ek product jorein'));
  for (const l of lines) {
    const n = l.variantName ? `${l.name} · ${l.variantName}` : l.name;
    if (l.code === undefined) problems.push(t('{{n}}: reason chunein (Damage, Expiry, Audit…)', { n }));
    if (l.code === 'CORRECTION' && !canCorrect) problems.push(t('{{n}}: "Galti theek karna" ki permission nahi', { n }));
    if (!(Number(l.qty) > 0)) problems.push(t('{{n}}: quantity likhein', { n }));
    const after = l.stock + ADJ_TYPES[typeOf(l)].sign * baseOf(l);
    if (after < 0 && !allowNegative) problems.push(t('{{n}}: itna stock nahi (abhi {{before}} {{baseUnit}})', { n, before: qty(l.stock), baseUnit: l.unit }));
    if (ADJ_TYPES[typeOf(l)].sign > 0 && (l.expiry || l.mfg) && !l.batchNo.trim()) problems.push(t('{{n}}: expiry ke saath batch number bhi likhein', { n }));
  }
  const total = lines.reduce((s, l) => s + { LOSS: -1, GAIN: 1, NONE: 0 }[effectOfLine(l)] * baseOf(l) * l.cost, 0);

  const batchOf = (l: Line) => {
    if (ADJ_TYPES[typeOf(l)].sign < 0) return l.batchId ? { batchId: l.batchId } : {};
    const batchNumber = l.batchNo.trim();
    return batchNumber ? { batchNumber, ...(l.expiry && { expiryDate: l.expiry }), ...(l.mfg && { manufactureDate: l.mfg }) } : {};
  };

  const save = async () => {
    if (problems.length) { haptic('error'); toast.error(problems[0]); return; }
    if (saving || !shopId) return;
    setSaving(true);
    const n = note.trim() || undefined;
    try {
      if (online && lines.length > 1) {
        await adjustmentsApi.batch({
          shopId, reason: reasonText(lines[0]), note: n,
          items: lines.map((l) => ({
            productId: l.productId, variantId: l.variantId ?? undefined, type: typeOf(l), quantity: Number(l.qty), reason: reasonText(l), reasonCode: l.code ?? undefined,
            ...(l.pack && l.pack.conversionRate !== 1 ? { unitName: l.pack.unitName, conversionRate: l.pack.conversionRate } : {}), ...batchOf(l),
          })),
        });
      } else {
        for (const l of lines) {
          await enqueueStockAdjustment({
            productId: l.productId, variantId: l.variantId ?? undefined, shopId, type: typeOf(l), quantity: baseOf(l), reason: reasonText(l),
            ...(l.code ? { reasonCode: l.code } : {}), note: n, ...(batchOf(l) as object),
          } as Parameters<typeof enqueueStockAdjustment>[0]);
        }
      }
      haptic('success');
      toast.success(lines.length > 1 ? t('{{count}} lines save — stock theek ho gaya', { count: lines.length }) : t('Adjustment save — stock theek ho gaya'));
      void refresh();
      setLines([]);
      router.back();
    } catch (e) {
      toast.error(e instanceof OfflineRuleError ? e.message : apiErrorMessage(e, t('Save nahi hua')));
    } finally {
      setSaving(false);
    }
  };

  return (
    <FormTemplate title={t('Naya adjustment')} subtitle={t('Stock haath se theek karein — reason chunein: nuksan, faida ya data ki galti')}
      dirty={lines.length > 0} saving={saving} onSave={() => void save()}
      saveLabel={t('Save karein{{value}}', { value: lines.length > 1 ? ` (${lines.length})` : '' })}>
      <View style={{ gap: th.space(4) }}>
        {!activeShop && <BranchSelect value={shopId} onChange={setShopId} hint={t('Adjustment hamesha khuli branch ka hota hai.')} />}
        <Button variant="soft" icon={Plus} onPress={() => setPicker(true)}>{t('Product search ya scan')}</Button>
        <DeviceWriteOff shopId={shopId} />
        {!lines.length ? (
          <EmptyState compact icon={PackageSearch} title={t('Upar se product search')} message={t('Har product ke liye reason chunein — Profit par asar wahin dikhega')} />
        ) : lines.map((l) => (
          <LineCard key={l.key} line={l} canCorrect={canCorrect} cost={cost} online={online}
            onChange={(p) => patch(l.key, p)} onRemove={() => setLines((prev) => prev.filter((x) => x.key !== l.key))} />
        ))}
        <TextArea label={t('Note')} value={note} onChangeText={setNote} maxLength={500} placeholder={t('Marzi hai — kya hua, kis ne dekha, kahan rakha tha…')} hint={t('Har line ke sath save hota hai.')} />
        {lines.length > 0 && (
          <Card tone="muted">
            <Row justify="between">
              <Text size="sm" tone="muted">{t('{{count}} line · Profit par asar (cost par)', { count: lines.length })}</Text>
              <Text size="lg" weight="bold" tone={total > 0 ? 'success' : total < 0 ? 'danger' : 'muted'} ltr>{`${total > 0 ? '+' : total < 0 ? '−' : ''}${cost(Math.abs(total))}`}</Text>
            </Row>
          </Card>
        )}
        {lines.length > 0 && problems.length > 0 && (
          <Card tone="warning"><Text size="sm">{problems[0]}{problems.length > 1 ? t(' (+{{value}} aur)', { value: problems.length - 1 }) : ''}</Text></Card>
        )}
      </View>
      <ProductPicker open={picker} onClose={() => setPicker(false)} keepOpen title={t('Naya adjustment')} pickedIds={new Set(lines.map((l) => l.productId))}
        onPick={(p) => void add(p)} />
    </FormTemplate>
  );
}

function LineCard({ line: l, canCorrect, cost, online, onChange, onRemove }: {
  line: Line; canCorrect: boolean; cost: (n: number) => string; online: boolean; onChange: (p: Partial<Line>) => void; onRemove: () => void;
}) {
  const th = useTheme();
  const type = typeOf(l);
  const out = ADJ_TYPES[type].sign < 0;
  const batches = useQuery({ queryKey: [INV, 'batches', l.productId], queryFn: () => batchesApi.list(l.productId), enabled: online && l.expiryTracked, staleTime: 30_000 });
  const own = (batches.data ?? []).filter((b) => (b.variantId ?? '') === (l.variantId ?? '') && b.isActive && Number(b.quantity) > 0);
  const base = baseOf(l);
  const after = l.stock + ADJ_TYPES[type].sign * base;
  const effect = EFFECT_META[effectOfLine(l)];
  const choices: Array<{ label: string; code: ReasonCode | null }> = [
    { label: 'Pehla stock', code: null },
    ...LOSS_REASONS.map((c) => ({ label: REASONS[c].label, code: c })),
    ...GAIN_REASONS.map((c) => ({ label: REASONS[c].label, code: c })),
    ...(canCorrect ? [{ label: CORRECTION_CHOICE.label, code: 'CORRECTION' as ReasonCode }] : []),
  ];
  return (
    <Card>
      <View style={{ gap: th.space(3) }}>
        <Row gap={2} align="start">
          <View style={{ flex: 1 }}>
            <Text weight="semibold" numberOfLines={2}>{l.variantName ? `${l.name} · ${l.variantName}` : l.name}</Text>
            <Text size="xs" tone="muted">{t('Branch stock {{qtyText}} {{baseUnit}}', { qtyText: qty(l.stock), baseUnit: l.unit })}</Text>
          </View>
          <IconButton icon={Trash2} label={t('Hatayein')} variant="danger" size="sm" onPress={onRemove} />
        </Row>
        <Row gap={1.5} wrap>
          {choices.map((c) => <Chip key={c.label} label={t(c.label)} selected={l.code === c.code} onPress={() => onChange({ code: c.code })} />)}
        </Row>
        {l.code === 'CORRECTION' && (
          <>
            <Segmented value={l.dir} onChange={(dir) => onChange({ dir })} options={[{ value: 'in', label: t('Barhayein') }, { value: 'out', label: t('Kam karein') }]} />
            <Text size="xs" tone="warning">{t(CORRECTION_WARNING)}</Text>
          </>
        )}
        <Row gap={2} align="end">
          <NumberInput containerStyle={{ flex: 1 }} label={t('Quantity')} value={Number(l.qty) || null} onChangeValue={(v) => onChange({ qty: v == null ? '' : String(v) })} />
          {l.packs.length > 0 && (
            <View style={{ flex: 1 }}>
              <Select label={t('Unit')} value={l.pack?.id ?? ''} onChange={(id) => onChange({ pack: l.packs.find((p) => p.id === id) ?? null })}
                options={[{ value: '', label: l.unit }, ...l.packs.map((p) => ({ value: p.id, label: `${p.unitLabel || p.unitName} (${qty(p.conversionRate)} ${l.unit})` }))]} />
            </View>
          )}
        </Row>
        {l.expiryTracked && out && own.length > 0 && (
          <Select label={t('Batch')} value={l.batchId} onChange={(batchId) => onChange({ batchId })}
            options={[{ value: '', label: t('Pehle expire hone wala pehle') }, ...own.map((b) => ({ value: b.id, label: `${b.batchNumber} · ${qty(b.quantity)}`, description: b.expiryDate?.slice(0, 10) }))]} />
        )}
        {l.expiryTracked && !out && (
          <View style={{ gap: th.space(2) }}>
            <Input label={t('Batch number')} value={l.batchNo} onChangeText={(batchNo) => onChange({ batchNo })} ltr />
            <Row gap={2}>
              <View style={{ flex: 1 }}><DatePicker label={t('Expiry')} value={l.expiry ? new Date(`${l.expiry}T00:00:00`) : null} onChange={(d) => onChange({ expiry: ymd(d) })} /></View>
              <View style={{ flex: 1 }}><DatePicker label={t('Bani')} value={l.mfg ? new Date(`${l.mfg}T00:00:00`) : null} onChange={(d) => onChange({ mfg: ymd(d) })} /></View>
            </Row>
          </View>
        )}
        <Row gap={2} wrap>
          <Badge tone={ADJ_TYPES[type].tone}>{t(ADJ_TYPES[type].label)}</Badge>
          <Badge tone={effect.tone}>{t(effect.label)}</Badge>
          <Text size="xs" tone="muted" ltr>{`${qty(l.stock)}`}</Text>
          <Icon icon={ArrowRight} size={12} tone="muted" flip />
          <Text size="xs" weight="bold" tone={after < 0 ? 'danger' : 'default'} ltr>{`${qty(after)} ${l.unit}`}</Text>
          <Text size="xs" tone="muted" ltr>{cost(base * l.cost)}</Text>
        </Row>
      </View>
    </Card>
  );
}
