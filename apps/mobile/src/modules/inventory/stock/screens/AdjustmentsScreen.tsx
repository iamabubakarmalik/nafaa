/**
 * Stock adjustments: stock in or out by hand, damaged and lost goods,
 * physical counts, and the record of all of it with value in rupees (same as
 * the web page). Filters by period, type, reason and search; lines saved
 * together are shown together. Analytics shows where stock went. The record
 * needs internet; new adjustments and counts work offline.
 */

import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { ClipboardCheck, PackageSearch, Plus, Printer, SlidersHorizontal } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { effectOf, type AdjustmentType } from '@nafaa/core/inventory';
import { formatDateTime, formatPKR } from '@/core/format';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import {
  Badge, Button, Card, ChipGroup, EmptyState, Icon, IconButton, ListTemplate, Row, Segmented, Select, Sheet, Text, useDebouncedValue, useTheme,
} from '@/design';
import { EFFECT_META, INV, qty, useCostMask } from '../../lib/shared';
import { adjustmentsApi, type AdjustmentQuery, type StockAdjustment } from '../api';
import { ADJ_TYPES, ADJ_TYPE_ORDER, periodRange, type PeriodPreset } from '../meta';
import { Bars, OnlineOnly, PeriodChips, StatStrip, printTable } from '../components/parts';
import { usePaged } from '../usePaged';

type TypeFilter = 'all' | AdjustmentType;
const SIGN = { GAIN: 1, LOSS: -1, NONE: 0 } as const;

const itemLabel = (a: StockAdjustment) => [a.product.name, a.variant?.name, a.carpetRoll ? `#${a.carpetRoll.rollNumber}` : null, a.imei?.imei1].filter(Boolean).join(' · ');
const qtyLabel = (a: StockAdjustment) => `${ADJ_TYPES[a.type].sign > 0 ? '+' : '−'}${qty(a.quantity)} ${a.product.unit}`;

function groupByRef(items: StockAdjustment[]) {
  const out: StockAdjustment[][] = [];
  for (const a of items) {
    const last = out[out.length - 1];
    if (last && a.groupRef && last[0].groupRef === a.groupRef) last.push(a);
    else out.push([a]);
  }
  return out;
}

export function AdjustmentsScreen() {
  const th = useTheme();
  const can = usePermission();
  const { cost } = useCostMask();
  const [period, setPeriod] = useState<PeriodPreset>('month');
  const [type, setType] = useState<TypeFilter>('all');
  const [reason, setReason] = useState('');
  const [search, setSearch] = useState('');
  const query = useDebouncedValue(search.trim(), 250);
  const [tab, setTab] = useState<'record' | 'analytics'>('record');
  const [filters, setFilters] = useState(false);

  const range = periodRange(period);
  const f: Omit<AdjustmentQuery, 'page' | 'limit'> = { ...(range ?? {}), type, reason: reason || undefined, search: query || undefined };
  const list = usePaged([INV, 'adj', 'list', f], (page) => adjustmentsApi.list({ ...f, page, limit: 30 }), tab === 'record');
  const reasons = useQuery({ queryKey: [INV, 'adj', 'reasons'], queryFn: adjustmentsApi.reasons, staleTime: 5 * 60_000 });
  const analytics = useQuery({ queryKey: [INV, 'adj', 'analytics', f], queryFn: () => adjustmentsApi.analytics(f), enabled: tab === 'analytics' });
  const groups = useMemo(() => groupByRef(list.items), [list.items]);
  const tot = list.first?.totals;
  const filtered = type !== 'all' || !!reason || !!query;
  const canManage = can(P.STOCK_ADJUSTMENTS_MANAGE);

  const print = async () => {
    const all = await adjustmentsApi.list({ ...f, page: 1, limit: 200 });
    await printTable({
      title: t('Stock adjustments'),
      subtitle: range ? `${range.from} — ${range.to}` : t('Sab tareekhen'),
      columns: [t('Waqt'), t('Cheez'), t('Type'), t('Wajah'), t('Quantity'), t('Qeemat')],
      rows: all.items.map((a) => [formatDateTime(a.createdAt), itemLabel(a), t(ADJ_TYPES[a.type].label), t(a.reason), qtyLabel(a), formatPKR(a.value)]),
    });
  };

  const summary = (
    <View style={{ gap: th.space(3) }}>
      <PeriodChips value={period} onChange={setPeriod} />
      {tot && (
        <StatStrip items={[
          { label: t('Stock nuksan'), value: `−${cost(tot.stockLoss ?? tot.outValue + tot.damageValue + tot.lossValue)}`, hint: t('Profit se minus'), tone: 'danger' },
          { label: t('Stock faida'), value: `+${cost(tot.stockGain ?? tot.inValue)}`, hint: t('Profit mein plus'), tone: 'success' },
          { label: t('Profit par asar'), value: `${(tot.profitNet ?? tot.net) >= 0 ? '+' : '−'}${cost(Math.abs(tot.profitNet ?? tot.net))}`,
            hint: tot.correctionValue ? t('correction {{correctionValue}} alag', { correctionValue: cost(tot.correctionValue) }) : t('faida − nuksan'), tone: 'brand' },
          { label: t('Is period me'), value: String(tot.count), hint: 'adjustment', tone: 'neutral' },
        ]} />
      )}
      <Segmented value={tab} onChange={setTab} options={[{ value: 'record', label: t('Record') }, { value: 'analytics', label: t('Analytics') }]} />
      {tab === 'record' && (
        <ChipGroup value={type} onChange={setType} style={{ marginHorizontal: -th.space(4) }}
          options={[{ value: 'all', label: t('Sab') }, ...ADJ_TYPE_ORDER.map((k) => ({ value: k, label: t(ADJ_TYPES[k].label), icon: ADJ_TYPES[k].icon }))]} />
      )}
      {tab === 'record' && <OnlineOnly feature="reports" updatedAt={list.cached.fromCache ? list.cached.updatedAt : null} />}
      {tab === 'analytics' && <AdjustmentAnalyticsView data={analytics.data} loading={analytics.isLoading} cost={cost} />}
    </View>
  );

  return (
    <>
      <ListTemplate
        title={t('Stock adjustments')}
        actions={<Row gap={1}>
          <IconButton icon={SlidersHorizontal} label={t('Filters')} badge={filtered && !!reason} onPress={() => setFilters(true)} />
          <IconButton icon={Printer} label={t('Print')} onPress={() => void print()} disabled={!list.items.length} />
          {canManage && <IconButton icon={ClipboardCheck} label={t('Stock ginti')} onPress={() => router.push('/stock-adjustments/count' as never)} />}
        </Row>}
        search={tab === 'record' ? { value: search, onChange: setSearch, placeholder: t('Product, SKU, wajah ya note…') } : undefined}
        summary={summary}
        data={tab === 'record' ? groups : []}
        loading={tab === 'record' && list.loading}
        error={tab === 'record' ? list.error : null}
        onRetry={list.refetch}
        refreshing={list.refreshing}
        onRefresh={list.refetch}
        onEndReached={list.loadMore}
        footer={list.loadingMore ? <ActivityIndicator style={{ margin: 16 }} /> : undefined}
        grouped={false}
        keyExtractor={(g) => g[0].id}
        renderItem={({ item }) => <Group rows={item} cost={cost} />}
        empty={tab === 'record' ? (
          <EmptyState icon={PackageSearch} title={filtered ? t('Is filter me koi adjustment nahi') : t('Is period me koi adjustment nahi')}
            message={t('Maal toota, gum hua ya ginti me farq nikla? Yahan likhein taake stock aur hisaab sahi rahe.')}
            action={canManage ? <Row gap={2}>
              <Button icon={Plus} onPress={() => router.push('/stock-adjustments/new' as never)}>{t('Naya adjustment')}</Button>
              <Button variant="secondary" icon={ClipboardCheck} onPress={() => router.push('/stock-adjustments/count' as never)}>{t('Stock ginti')}</Button>
            </Row> : undefined} />
        ) : <View />}
        fab={canManage ? { icon: Plus, label: t('Naya adjustment'), onPress: () => router.push('/stock-adjustments/new' as never) } : undefined}
      />
      <Sheet open={filters} onClose={() => setFilters(false)} title={t('Filters')}
        footer={<Row gap={2}>
          <Button variant="secondary" style={{ flex: 1 }} onPress={() => { setType('all'); setReason(''); setSearch(''); }}>{t('Filter saaf karein')}</Button>
          <Button style={{ flex: 1 }} onPress={() => setFilters(false)}>{t('Dekhein')}</Button>
        </Row>}>
        <View style={{ gap: th.space(3) }}>
          <Select label={t('Wajah')} value={reason} onChange={setReason} searchable
            options={[{ value: '', label: t('Sab wajah') }, ...(reasons.data ?? []).map((r) => ({ value: r, label: t(r) }))]} />
        </View>
      </Sheet>
    </>
  );
}

function Group({ rows, cost }: { rows: StockAdjustment[]; cost: (n: number) => string }) {
  const th = useTheme();
  const head = rows[0];
  const many = rows.length > 1;
  const count = head.groupRef?.startsWith('CNT');
  const net = rows.reduce((s, a) => s + SIGN[effectOf(a)] * a.value, 0);
  const meta = [formatDateTime(head.createdAt), head.shop?.name, head.createdBy?.fullName].filter(Boolean).join(' · ');
  return (
    <Card flush style={{ marginHorizontal: th.space(4), marginBottom: th.space(2) }}>
      {many && (
        <Row gap={2} wrap style={{ paddingHorizontal: th.space(4), paddingVertical: th.space(2), backgroundColor: th.colors.surfaceMuted }}>
          <Badge tone={count ? 'info' : 'neutral'}>{t('{{value}} · {{count}} line', { value: count ? t('Stock ginti') : t('Ek sath'), count: rows.length })}</Badge>
          <Text size="2xs" tone="muted" style={{ flex: 1 }} numberOfLines={1}>{meta}</Text>
          <Text size="sm" weight="semibold" tone={net >= 0 ? 'success' : 'danger'} ltr>{`${net >= 0 ? '+' : '−'}${cost(Math.abs(net))}`}</Text>
        </Row>
      )}
      {rows.map((a, i) => {
        const m = ADJ_TYPES[a.type];
        const effect = EFFECT_META[effectOf(a)];
        const counted = a.countedQty != null && a.systemQty != null;
        return (
          <View key={a.id} style={{ flexDirection: 'row', gap: th.space(3), alignItems: 'center', padding: th.space(3), borderTopWidth: i ? 1 : 0, borderTopColor: th.colors.divider }}>
            <View style={{ width: 36, height: 36, borderRadius: th.radius('md'), backgroundColor: th.colors[m.tone].soft, alignItems: 'center', justifyContent: 'center' }}>
              <Icon icon={m.icon} size={18} color={th.colors[m.tone].text} />
            </View>
            <View style={{ flex: 1, gap: 3 }}>
              <Text size="sm" weight="semibold" numberOfLines={1}>{itemLabel(a)}</Text>
              <Row gap={1.5} wrap>
                <Badge tone={m.tone}>{t(m.label)}</Badge>
                <Badge tone={effect.tone}>{t(effect.label)}</Badge>
              </Row>
              <Text size="xs" tone="muted" numberOfLines={2}>
                {t(a.reason)}{counted ? t(' · gina {{countedQty}}, system {{systemQty}}', { countedQty: a.countedQty, systemQty: a.systemQty }) : a.note ? ` — ${a.note}` : ''}
              </Text>
              {!many && <Text size="2xs" tone="subtle" numberOfLines={1}>{[formatDateTime(a.createdAt), a.shop?.name, a.createdBy?.fullName].filter(Boolean).join(' · ')}</Text>}
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text weight="bold" tone={m.sign > 0 ? 'success' : 'danger'} ltr>{qtyLabel(a)}</Text>
              <Text size="xs" tone="muted" ltr>{`${effectOf(a) === 'GAIN' ? '+' : effectOf(a) === 'LOSS' ? '−' : ''}${cost(a.value)}`}</Text>
            </View>
          </View>
        );
      })}
    </Card>
  );
}

function AdjustmentAnalyticsView({ data, loading, cost }: { data?: Awaited<ReturnType<typeof adjustmentsApi.analytics>>; loading: boolean; cost: (n: number) => string }) {
  const th = useTheme();
  if (loading || !data) return loading ? <ActivityIndicator /> : <OnlineOnly feature="reports" />;
  const label = (k: string) => (k in ADJ_TYPES ? t(ADJ_TYPES[k as AdjustmentType].label) : t(k));
  return (
    <View style={{ gap: th.space(3) }}>
      <StatStrip items={[
        { label: t('Stock faida'), value: `+${cost(data.totals.gained)}`, tone: 'success' },
        { label: t('Stock nuksan'), value: `−${cost(data.totals.lost)}`, tone: 'danger' },
        { label: t('Adjustments'), value: String(data.totals.count), tone: 'neutral' },
      ]} />
      <Bars title={t('Type ke hisaab se')} rows={data.byType.map((b) => ({ key: b.key, label: label(b.key), amount: b.value, value: cost(Math.abs(b.value)), hint: t('{{count}} line', { count: b.count }) }))} />
      <Bars title={t('Wajah')} tone="warning" rows={data.byReason.map((b) => ({ key: b.key, label: t(b.key), amount: b.value, value: cost(Math.abs(b.value)), hint: t('{{count}} line', { count: b.count }) }))} />
      <Bars title={t('Sab se zyada nuqsan')} tone="danger" rows={data.topLosses.map((b) => ({ key: b.name, label: b.name, amount: b.value, value: cost(b.value), hint: `${qty(b.qty)} ${b.unit}` }))} />
      <Bars title={t('Kis ne kiya')} tone="info" rows={data.byPerson.map((b) => ({ key: b.key, label: b.key, amount: b.value, value: cost(Math.abs(b.value)), hint: t('{{count}} line', { count: b.count }) }))} />
    </View>
  );
}
