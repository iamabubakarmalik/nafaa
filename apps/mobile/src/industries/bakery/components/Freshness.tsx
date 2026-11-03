/**
 * Shelf batches and waste (web fresh/*): record pieces sold, sold cheap or
 * thrown away (optionally also a damage report so stock comes down after
 * approval; the report works offline), add a batch by hand, the waste record
 * and its analytics.
 */

import { useMutation, useQuery } from '@tanstack/react-query';
import { CheckCircle2, Flame, Plus, Tag, Trash2 } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { byWeight, fmtQty, qtyInput, qtyValue } from '@nafaa/core/bakery';
import { apiErrorMessage } from '@/core/api/errors';
import { formatDateTime } from '@/core/format';
import { msg, t } from '@/core/i18n';
import { enqueueDamage } from '@/core/offline';
import { kv } from '@/core/storage/kv';
import { Badge, BarChart, Button, Card, Chip, ChipGroup, EmptyState, HBarList, Input, ListRow, Row, Sheet, Skeleton, StatTile, Switch, Text, toast, useTheme } from '@/design';
import { ProductPicker } from '@/modules/inventory/components/ProductPicker';
import { useCostMask } from '@/modules/sales/lib/mask';
import { shortKey, type Period } from '@/modules/sales/lib/period';
import { freshnessApi, type FreshnessLog, type WasteSource } from '../api';
import { FRESH_KEY, SOURCE, refreshBakery } from '../meta';

export type BatchAction = 'sale' | 'discount' | 'discard';

// Raw reasons are saved so waste analytics group the same way in every language.
const REASONS = [msg('Waqt guzar gaya'), msg('Bika nahi'), msg('Jal gaya'), msg('Toot gaya'), msg('Fungus / kharab')];
const DAMAGE_PREF = 'nafaa.bakery.discard-damage';

export function BatchActionSheet({ log, mode, onClose }: { log: FreshnessLog; mode: BatchAction; onClose: () => void }) {
  const th = useTheme();
  const max = Number(log.currentQty) || 0;
  const weight = byWeight(log.unit);
  const [qty, setQty] = useState(String(max));
  const [reason, setReason] = useState('');
  const [damage, setDamage] = useState(() => kv.get<boolean>(DAMAGE_PREF, true) !== false);
  const n = qtyValue(qty, weight);
  const meta = {
    sale: { title: t('Kitne bik gaye?'), btn: t('Sale likhein'), icon: CheckCircle2, variant: 'success' as const },
    discount: { title: t('Kitne sasta becha?'), btn: t('Darj karein'), icon: Tag, variant: 'primary' as const },
    discard: { title: t('Kitne phenke?'), btn: t('Waste likhein'), icon: Trash2, variant: 'danger' as const },
  }[mode];
  const save = useMutation({
    mutationFn: async () => {
      if (mode === 'sale') { await freshnessApi.sale(log.id, n); return false; }
      if (mode === 'discount') { await freshnessApi.discount(log.id, n); return false; }
      const why = REASONS.find((r) => t(r) === reason.trim()) ?? (reason.trim() || REASONS[0]);
      await freshnessApi.discard(log.id, n, why);
      if (!damage) return false;
      try {
        await enqueueDamage({ productId: log.productId, quantity: n, reason: why, reasonCode: why === REASONS[0] || /guzar|expire/i.test(why) ? 'EXPIRY' : 'SPOILAGE', notes: t('Bakery batch {{value}}', { value: log.batchNumber ?? log.id }) });
        return true;
      } catch (e) {
        toast.warning(t('Waste likh diya, magar damage report nahi bani: {{apiError}}', { apiError: apiErrorMessage(e) }));
        return false;
      }
    },
    onSuccess: (damaged) => {
      toast.success(mode === 'discard' ? t('{{n}} waste likh diye{{value}}', { n, value: damaged ? t(' — damage report approval ke liye gayi') : '' }) : t('Darj ho gaya'));
      refreshBakery([FRESH_KEY]);
      onClose();
    },
    onError: (e) => toast.error(apiErrorMessage(e, t('Nahi ho saka'))),
  });
  const quick = [max, weight ? Math.round(max * 500) / 1000 : Math.floor(max / 2), 1].filter((v, i, a) => v > 0 && a.indexOf(v) === i);
  return (
    <Sheet open onClose={onClose} title={meta.title} description={t('{{productName}}{{value}} · {{max}} para hai', { productName: log.productName, value: log.batchNumber ? ` · ${log.batchNumber}` : '', max: fmtQty(max) })}
      footer={<Button fullWidth size="lg" variant={meta.variant} icon={meta.icon} disabled={n <= 0 || n > max} loading={save.isPending} onPress={() => save.mutate()}>{meta.btn}</Button>}>
      <View style={{ gap: th.space(3) }}>
        <Input size="xl" value={qty} onChangeText={(v) => setQty(qtyInput(v, weight))} keyboardType={weight ? 'decimal-pad' : 'number-pad'} ltr error={n > max ? t('Sirf {{max}} para hai', { max: fmtQty(max) }) : undefined} />
        <Row gap={2}>{quick.map((v, i) => <Chip key={v} label={i === 0 ? t('Sab') : fmtQty(v)} selected={n === v} onPress={() => setQty(String(v))} />)}</Row>
        {mode === 'discard' && (
          <>
            <Input label={t('Wajah')} value={reason} onChangeText={setReason} placeholder={t('Waqt guzar gaya, jal gaya…')} hint={t('Waste ke record me isi se pata chalta hai kyun phenkna para')} />
            <Row gap={2} wrap>{REASONS.map((r) => <Chip key={r} label={t(r)} selected={reason === t(r)} onPress={() => setReason(t(r))} />)}</Row>
            <Switch value={damage} onChange={(v) => { setDamage(v); kv.set(DAMAGE_PREF, v); }} label={t('Stock se bhi ghatayein')} description={t('Damage report banegi; manager manzoor kare to stock kam hoga aur profit me loss ginega')} />
          </>
        )}
        {mode === 'discount' && <Text size="xs" tone="muted">{t('Sirf ginti hai — rate POS par khud kam karein. Sasta becha maal phenka nahi gaya, is liye yeh bacha hua paisa hai.')}</Text>}
        {mode === 'sale' && <Text size="xs" tone="muted">{t('POS ki sale batch se khud nahi ghatti — din ke aakhir me yahan ginti theek karein.')}</Text>}
      </View>
    </Sheet>
  );
}

export function NewBatchSheet({ onClose }: { onClose: () => void }) {
  const th = useTheme();
  const [product, setProduct] = useState<{ id: string; name: string; unit?: string } | null>(null);
  const [picking, setPicking] = useState(true);
  const [qty, setQty] = useState('');
  const [hours, setHours] = useState(24);
  const [batch, setBatch] = useState('');
  const weight = byWeight(product?.unit);
  const amount = qtyValue(qty, weight);
  const save = useMutation({
    mutationFn: () => {
      const now = new Date();
      const best = new Date(now.getTime() + hours * 3_600_000).toISOString();
      return freshnessApi.create({ productId: product!.id, productName: product!.name, batchNumber: batch.trim() || undefined, productionDate: now.toISOString(), bestBefore: best, expiryDate: best, initialQty: amount, currentQty: amount });
    },
    onSuccess: () => { toast.success(t('Batch jur gaya')); refreshBakery([FRESH_KEY]); onClose(); },
    onError: (e) => toast.error(apiErrorMessage(e, t('Nahi ho saka'))),
  });
  return (
    <>
      <Sheet open={!picking} onClose={onClose} title={t('Naya batch')} description={t('Jo maal bana aur shelf par rakha — kab tak theek rahega')}
        footer={<Button fullWidth size="lg" icon={Plus} disabled={!product || !(amount > 0)} loading={save.isPending} onPress={() => save.mutate()}>{t('Batch jorein')}</Button>}>
        <View style={{ gap: th.space(3) }}>
          <ListRow title={product?.name ?? t('Kaunsi cheez…')} chevron onPress={() => setPicking(true)} />
          <Row gap={2}>
            <Input containerStyle={{ flex: 1 }} label={weight ? t('Kitna banaya ({{unit}})', { unit: product?.unit }) : t('Kitne banaye')} value={qty} onChangeText={(v) => setQty(qtyInput(v, weight))} keyboardType={weight ? 'decimal-pad' : 'number-pad'} ltr />
            <Input containerStyle={{ flex: 1 }} label={t('Batch / naam')} value={batch} onChangeText={setBatch} placeholder={t('Subah wala')} hint={t('Marzi hai')} />
          </Row>
          <Text size="sm" weight="semibold" tone="secondary">{t('Kab tak theek')}</Text>
          <Row gap={2} wrap>{[6, 12, 24, 48, 72, 168].map((h) => <Chip key={h} label={h < 24 ? t('{{h}} ghante', { h }) : t('{{value}} din', { value: h / 24 })} selected={hours === h} onPress={() => setHours(h)} />)}</Row>
        </View>
      </Sheet>
      <ProductPicker open={picking} onClose={() => (product ? setPicking(false) : onClose())} title={t('Kaunsi cheez…')} includeRaw={false} variants={false}
        onPick={(p) => { setProduct({ id: p.product.id, name: p.product.name, unit: p.product.unit }); setPicking(false); }} />
    </>
  );
}

export const useWastage = (period: Period) => {
  const range = period.from === 'all' ? { to: period.to } : period;
  return useQuery({ queryKey: [FRESH_KEY, 'wastage', range], queryFn: () => freshnessApi.wastage(range), placeholderData: (p) => p });
};

export function WasteRecord({ period, search }: { period: Period; search: string }) {
  const th = useTheme();
  const { cost } = useCostMask();
  const [source, setSource] = useState<'' | WasteSource>('');
  const q = useWastage(period);
  const s = search.trim().toLowerCase();
  const rows = (q.data?.rows ?? []).filter((r) => (!source || r.source === source) && (!s || r.name.toLowerCase().includes(s) || r.reason.toLowerCase().includes(s)));
  return (
    <View style={{ gap: th.space(3) }}>
      <ChipGroup value={source} onChange={setSource} style={{ marginHorizontal: -th.space(4) }}
        options={[{ value: '' as const, label: t('Sab') }, ...(Object.keys(SOURCE) as WasteSource[]).map((k) => ({ value: k, label: t(SOURCE[k].label), icon: SOURCE[k].icon }))]} />
      {!q.data ? <Skeleton height={140} /> : !rows.length ? (
        <EmptyState icon={Flame} title={t('Is period me koi waste nahi likha')} message={t('Shelf ka maal "Phenk diya", baking me kharab "Ban gaya" ke waqt, aur raw material "Waste hua" se yahan aata hai.')} />
      ) : (
        <Card flush>
          {rows.slice(0, 200).map((r, i) => (
            <ListRow key={r.id} divider={i < Math.min(rows.length, 200) - 1} icon={SOURCE[r.source].icon} iconTone={SOURCE[r.source].tone}
              title={<Row gap={1.5} wrap><Text weight="semibold" numberOfLines={1} style={{ flexShrink: 1 }}>{r.name}</Text><Badge tone={SOURCE[r.source].tone}>{t(SOURCE[r.source].label)}</Badge></Row>}
              subtitle={`${t(r.reason)}${r.ref ? ` · ${r.ref}` : ''} · ${formatDateTime(r.at)}`}
              trailing={<View style={{ alignItems: 'flex-end' }}><Text weight="bold" ltr>{`${fmtQty(r.qty)} ${r.unit}`}</Text><Text size="2xs" tone="danger" ltr>{r.cost != null ? cost(r.cost) : '••••'}</Text></View>} />
          ))}
        </Card>
      )}
    </View>
  );
}

export function WasteAnalytics({ period, onReason }: { period: Period; onReason: (r: string) => void }) {
  const th = useTheme();
  const { cost, costHidden } = useCostMask();
  const q = useWastage(period);
  const d = q.data;
  if (!d) return <Skeleton height={180} />;
  const x = d.totals;
  const money = (n?: number) => (costHidden || n == null ? '••••' : cost(n));
  return (
    <View style={{ gap: th.space(3) }}>
      {x.wastePct != null && x.wastePct > 10 && <Card tone="danger"><Text size="sm">{t('Har 100 bane hue me se {{wastePct}} phenkne par rahe hain. Neeche dekhein kis cheez me sab se zyada — us ka batch chhota karein ya "Kya banana hai" ka andaza istemal karein.', { wastePct: Math.round(x.wastePct) })}</Text></Card>}
      <Row gap={2}>
        <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} icon={Trash2} tone="danger" label={t('Waste')} value={money(x.cost)} hint={t('{{count}} dafa', { count: x.count })} />
        <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} icon={Flame} tone={x.wastePct != null && x.wastePct > 10 ? 'danger' : 'success'} label={t('Waste ki sharah')} value={x.wastePct != null ? `${x.wastePct}%` : '—'} hint={t('10% se kam achha')} />
      </Row>
      {d.byDay.length > 0 && <Card title={t('Har din')}><BarChart labels={d.byDay.map((b) => shortKey(b.key))} series={[{ key: 'q', label: t('Quantity'), values: d.byDay.map((b) => b.qty), color: th.colors.danger.solid }]} /></Card>}
      {d.byReason.length > 0 && <Card title={t('Wajah')}><HBarList rows={d.byReason.slice(0, 8).map((b) => ({ key: b.key, label: t(b.key), value: b.cost ?? b.qty, display: <Text size="xs" tone="muted">{`${fmtQty(b.qty)} · ${money(b.cost)}`}</Text>, onPress: () => onReason(b.key) }))} /></Card>}
      {d.byItem.length > 0 && <Card title={t('Cheez')}><HBarList rows={d.byItem.slice(0, 8).map((b) => ({ key: b.key, label: b.key, value: b.cost ?? b.qty, display: <Text size="xs" tone="muted">{`${fmtQty(b.qty)} · ${money(b.cost)}`}</Text> }))} /></Card>}
      {d.bySource.length > 0 && <Card title={t('Kahan se')}><HBarList rows={d.bySource.map((b) => ({ key: b.key, label: t(SOURCE[b.key as WasteSource]?.label ?? b.key), value: b.cost ?? b.qty, display: <Text size="xs" tone="muted">{money(b.cost)}</Text> }))} /></Card>}
    </View>
  );
}
