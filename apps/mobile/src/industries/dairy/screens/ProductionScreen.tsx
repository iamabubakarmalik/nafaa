/**
 * Dahi / makhan and spoiled stock (web ProductionPage): milk used and what it
 * made (the milk leaves stock, the new items come in at the milk's cost), each
 * batch's yield, and the day's damaged stock (the shared Damage screen).
 */

import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Factory, Milk, Plus, Trash2, TrendingDown } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { isMilkType } from '@nafaa/core/industries/dairy';
import { formatDate } from '@/core/format';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { Badge, Button, Card, ChipGroup, EmptyState, IconButton, ListRow, ListTemplate, Row, Select, Sheet, SwipeRow, Text, toast, useTheme } from '@/design';
import { NumberInput } from '@/modules/inventory/components/fields';
import { PERIOD_PRESETS, usePeriod } from '@/modules/sales/lib/period';
import { useCostMask } from '@/modules/sales/lib/mask';
import { OfflineNote, errorText, useDeskOnline } from '../../_shared/deskKit';
import { ReasonSheet, RowCard, StatRow } from '../../_shared/farm/ui';
import { dairyProductionApi, dairyProductsApi, type ProductionBatch } from '../api';
import { DAIRY_KEYS, qty, refreshDairy, typeLabel } from '../meta';

interface Item { id: string; name: string; unit: string; stock: number; kind: string; featured: boolean }

export function ProductionScreen() {
  const th = useTheme();
  const canStock = usePermission()(P.STOCK_ADJUSTMENTS_MANAGE);
  const { guard } = useDeskOnline('dairyDesk');
  const { cost } = useCostMask();
  const per = usePeriod('week');
  const [making, setMaking] = useState(false);
  const [cancelling, setCancelling] = useState<ProductionBatch | null>(null);
  const range = { from: per.period.from, to: per.period.to };
  const listQ = useQuery({ queryKey: [DAIRY_KEYS.production, range.from, range.to], queryFn: () => dairyProductionApi.list(range) });
  const x = listQ.data?.totals;

  const header = (
    <View style={{ gap: th.space(3) }}>
      <ChipGroup value={per.preset} onChange={(v) => per.setPreset(v as typeof per.preset)} style={{ marginHorizontal: -th.space(4) }} options={PERIOD_PRESETS.filter((p) => p.value !== 'all').map((p) => ({ value: p.value, label: t(p.label) }))} />
      <StatRow tiles={[
        { icon: Factory, tone: 'accent', label: t('Batch'), loading: listQ.isLoading, value: String(x?.batches ?? 0) },
        { icon: Milk, tone: 'info', label: t('Doodh laga'), loading: listQ.isLoading, value: `${qty(x?.milkUsed ?? 0)} L`, hint: cost(x?.cost ?? 0) },
      ]} />
      {!!x?.made.length && <Card><Text size="xs" tone="muted">{t('Bana')}</Text><Text size="sm" weight="semibold">{x.made.map((m) => `${qty(m.quantity)} ${m.unit} ${m.name}`).join(' · ')}</Text></Card>}
      <Button variant="secondary" icon={Trash2} onPress={() => router.push('/damage' as never)}>{t('Kharab / din ka bacha')}</Button>
      <OfflineNote feature="dairyDesk" />
    </View>
  );

  return (
    <>
      <ListTemplate<ProductionBatch>
        title={t('Dahi / makhan aur kharab maal')}
        grouped={false}
        summary={header}
        data={listQ.data?.items ?? []}
        loading={listQ.isLoading}
        error={listQ.data ? null : listQ.error}
        onRetry={() => void listQ.refetch()}
        refreshing={listQ.isRefetching}
        onRefresh={() => void listQ.refetch()}
        keyExtractor={(b) => b.reference}
        renderItem={({ item: b }) => {
          const row = (
            <RowCard dim={b.cancelled}>
              <ListRow icon={Factory} iconTone={b.cancelled ? 'neutral' : 'accent'}
                title={<Row gap={1.5} wrap><Text weight="semibold" numberOfLines={1} style={{ flexShrink: 1 }}>{b.outputs.map((o) => `${qty(o.quantity)} ${o.unit} ${o.name}`).join(' + ') || '—'}</Text>{b.cancelled && <Badge tone="neutral">{t('Cancel')}</Badge>}</Row>}
                subtitle={<View style={{ gap: 2 }}><Text size="xs" tone="muted">{`${formatDate(b.date)}${b.shopName ? ` · ${b.shopName}` : ''}`}</Text><Text size="xs" tone="secondary">{b.source ? `${qty(b.source.quantity)} ${b.source.unit} ${b.source.name}` : ''}{b.yieldPct != null ? ` · ${t('Yield')} ${b.yieldPct}%` : ''}</Text></View>}
                trailing={<Text size="sm" weight="semibold" ltr>{cost(b.cost)}</Text>} />
            </RowCard>
          );
          return canStock && !b.cancelled ? <SwipeRow end={[{ icon: Trash2, label: t('Cancel'), tone: 'danger', onPress: () => guard(() => setCancelling(b)) }]}>{row}</SwipeRow> : row;
        }}
        empty={<EmptyState icon={Factory} title={t('Abhi koi batch nahi')} message={t('Kitna doodh lagaya aur kitna dahi / makhan bana — yahan likhein.')} />}
        fab={canStock ? { icon: Plus, label: t('Banaya'), onPress: () => guard(() => setMaking(true)) } : undefined}
      />
      <MakeSheet open={making} onClose={() => setMaking(false)} />
      <ReasonSheet open={!!cancelling} title={t('Batch cancel')} description={t('Doodh wapas stock me aa jayega')} cta={t('Cancel')} required={false} onClose={() => setCancelling(null)}
        onConfirm={async (reason) => { try { await dairyProductionApi.cancel(cancelling!.reference, reason || undefined); refreshDairy([DAIRY_KEYS.production, DAIRY_KEYS.profiles, 'inv']); toast.success(t('Batch cancel — doodh wapas stock me')); } catch (e) { toast.error(errorText(e, t('Cancel nahi hua'))); throw e; } }} />
    </>
  );
}

function MakeSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const th = useTheme();
  const q = useQuery({ queryKey: [DAIRY_KEYS.profiles], queryFn: () => dairyProductsApi.list({}).catch(() => []), enabled: open, staleTime: 60_000 });
  const items = useMemo<Item[]>(() => (q.data ?? []).filter((p) => { const pr = p.product as { isActive?: boolean } | undefined; return pr && pr.isActive !== false; }).map((p) => {
    const pr = p.product as { name: string; unit?: string; stock?: number };
    return { id: p.productId, name: pr.name, unit: pr.unit ?? 'liter', stock: Number(pr.stock) || 0, kind: p.productType, featured: p.isFeatured };
  }), [q.data]);
  const milk = items.filter((i) => isMilkType(i.kind));
  const made = items.filter((i) => !isMilkType(i.kind));
  const [sourceId, setSourceId] = useState('');
  const [used, setUsed] = useState<number | null>(null);
  const [outs, setOuts] = useState<Array<{ productId: string; quantity: number | null }>>([{ productId: '', quantity: null }]);
  const [busy, setBusy] = useState(false);
  const source = milk.find((m) => m.id === sourceId) ?? milk.find((m) => m.featured) ?? milk[0];
  const error = !source ? t('Pehle Products me doodh ka item banayein') : !(used && used > 0) ? t('Doodh ki quantity likhein') : !outs.some((o) => o.productId && (o.quantity ?? 0) > 0) ? t('Kya bana likhein') : '';
  const save = async () => {
    if (error) { toast.error(error); return; }
    setBusy(true);
    try {
      const b = await dairyProductionApi.create({ sourceProductId: source!.id, sourceQty: used!, outputs: outs.filter((o) => o.productId && (o.quantity ?? 0) > 0).map((o) => ({ productId: o.productId, quantity: o.quantity! })) });
      refreshDairy([DAIRY_KEYS.production, DAIRY_KEYS.profiles, 'inv']);
      toast.success(t('Ban gaya — yield {{value}}%', { value: b.yieldPct ?? 0 }), b.warnings[0] ? { message: b.warnings[0] } : undefined);
      setUsed(null); setOuts([{ productId: '', quantity: null }]); onClose();
    } catch (e) { toast.error(errorText(e, t('Save nahi hua'))); } finally { setBusy(false); }
  };
  return (
    <Sheet open={open} onClose={onClose} height={0.9} title={t('Banaya')} footer={<Button fullWidth size="lg" loading={busy} onPress={() => void save()}>{t('Save')}</Button>}>
      <View style={{ gap: th.space(3) }}>
        <Select label={t('Kaunsa doodh')} value={source?.id ?? ''} onChange={setSourceId} options={milk.length ? milk.map((m) => ({ value: m.id, label: t('{{name}} — stock {{stock}} {{unit}}', { name: m.name, stock: qty(m.stock), unit: m.unit }) })) : [{ value: '', label: t('Pehle Products me doodh ka item banayein') }]} />
        <NumberInput label={t('Kitna laga ({{value}})', { value: source?.unit ?? 'liter' })} value={used} onChangeValue={setUsed} />
        <Text size="sm" weight="semibold" tone="secondary">{t('Kya bana')}</Text>
        {outs.map((o, i) => (
          <Row key={i} gap={2} align="end">
            <View style={{ flex: 2 }}><Select value={o.productId} onChange={(v) => setOuts((x) => x.map((y, j) => (j === i ? { ...y, productId: v } : y)))} placeholder={made.length ? t('Chunein…') : t('Products me dahi / makhan banayein')} options={made.map((m) => ({ value: m.id, label: `${m.name} (${typeLabel(m.kind)})` }))} /></View>
            <View style={{ flex: 1 }}><NumberInput placeholder={t('Kitna bana')} value={o.quantity} onChangeValue={(v) => setOuts((x) => x.map((y, j) => (j === i ? { ...y, quantity: v } : y)))} /></View>
            <IconButton icon={Trash2} label={t('Hatayein')} variant="ghost" disabled={outs.length === 1} onPress={() => setOuts((x) => x.filter((_, j) => j !== i))} />
          </Row>
        ))}
        <Button variant="secondary" icon={Plus} onPress={() => setOuts((x) => [...x, { productId: '', quantity: null }])}>{t('Line jorein')}</Button>
        <Row gap={2}><TrendingDown size={14} color={th.colors.textMuted} /><Text size="xs" tone="muted" style={{ flex: 1 }}>{t('Har batch ka yield (kitna bana) dikhta hai — kam aaye to doodh ya tareeqa check karein.')}</Text></Row>
      </View>
    </Sheet>
  );
}
