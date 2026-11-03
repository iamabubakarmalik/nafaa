/**
 * Stock movements (web StockMovementsPage): every entry that moved stock —
 * sales, purchases, returns, adjustments, damage, transfers, production and
 * opening — with the balance after it, totals for the whole filter and
 * analytics. Filter by period, kind, direction, person and search. Needs
 * internet; the last loaded list stays readable offline.
 */

import { useQuery } from '@tanstack/react-query';
import { Activity, Printer, SlidersHorizontal } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { formatDateTime } from '@/core/format';
import { t } from '@/core/i18n';
import { Button, ChipGroup, EmptyState, IconButton, ListRow, ListTemplate, Row, Segmented, Select, Sheet, Text, useDebouncedValue, useTheme } from '@/design';
import { INV, qty, useCostMask } from '../../lib/shared';
import { movementsApi, type MovementQuery } from '../api';
import { MOVEMENT_GROUPS, movementOf, periodRange, type PeriodPreset } from '../meta';
import { Bars, OnlineOnly, PeriodChips, StatStrip, printTable } from '../components/parts';
import { usePaged } from '../usePaged';

export function StockMovementsScreen({ productId }: { productId?: string } = {}) {
  const th = useTheme();
  const { cost } = useCostMask();
  const [tab, setTab] = useState<'ledger' | 'analytics'>('ledger');
  const [period, setPeriod] = useState<PeriodPreset>('week');
  const [group, setGroup] = useState('all');
  const [direction, setDirection] = useState<'all' | 'in' | 'out'>('all');
  const [userId, setUserId] = useState('');
  const [search, setSearch] = useState('');
  const query = useDebouncedValue(search.trim(), 250);
  const [filters, setFilters] = useState(false);
  const range = periodRange(period);
  const types = MOVEMENT_GROUPS.find((g) => g.id === group)?.types.join(',');
  const f: MovementQuery = { ...(range ?? {}), type: types, direction, userId: userId || undefined, search: query || undefined, productId };
  const list = usePaged([INV, 'moves', f], (page) => movementsApi.list({ ...f, page, limit: 40 }), tab === 'ledger');
  const analytics = useQuery({ queryKey: [INV, 'moves', 'analytics', f], queryFn: () => movementsApi.analytics(f), enabled: tab === 'analytics' });
  const people = useQuery({ queryKey: [INV, 'moves', 'people'], queryFn: movementsApi.people, staleTime: 5 * 60_000 });
  const tot = list.first?.totals;

  const print = async () => {
    const all = await movementsApi.list({ ...f, page: 1, limit: 300 });
    await printTable({
      title: t('Stock movements'), subtitle: range ? `${range.from} — ${range.to}` : t('Sab tareekhen'),
      columns: [t('Waqt'), t('Cheez'), t('Kya hua'), t('Quantity'), t('Baad mein'), t('Branch')],
      rows: all.items.map((m) => [formatDateTime(m.createdAt), m.variant ? `${m.product.name} · ${m.variant.name}` : m.product.name, t(movementOf(m.type).label), `${m.quantity > 0 ? '+' : ''}${qty(m.quantity)} ${m.product.unit}`, qty(m.balanceAfter), m.shop?.name ?? '']),
    });
  };

  const summary = (
    <View style={{ gap: th.space(3) }}>
      <PeriodChips value={period} onChange={setPeriod} />
      {tot && (
        <StatStrip items={[
          { label: t('Andar aaya'), value: `+${qty(tot.qtyIn)}`, tone: 'success', onPress: () => setDirection('in') },
          { label: t('Bahar gaya'), value: `−${qty(tot.qtyOut)}`, tone: 'danger', onPress: () => setDirection('out') },
          { label: t('Entries'), value: String(tot.count), tone: 'neutral', onPress: () => setDirection('all') },
        ]} />
      )}
      <Segmented value={tab} onChange={setTab} options={[{ value: 'ledger', label: t('Record') }, { value: 'analytics', label: t('Analytics') }]} />
      <ChipGroup value={group} onChange={setGroup} style={{ marginHorizontal: -th.space(4) }}
        options={[{ value: 'all', label: t('Sab') }, ...MOVEMENT_GROUPS.map((g) => ({ value: g.id, label: t(g.label) }))]} />
      {tab === 'ledger' && <OnlineOnly feature="reports" updatedAt={list.cached.fromCache ? list.cached.updatedAt : null} />}
      {tab === 'analytics' && (analytics.isLoading ? <ActivityIndicator /> : analytics.data ? (
        <View style={{ gap: th.space(3) }}>
          <StatStrip items={[
            { label: t('Andar aaya'), value: cost(analytics.data.totals.valueIn), tone: 'success' },
            { label: t('Bahar gaya'), value: cost(analytics.data.totals.valueOut), tone: 'danger' },
          ]} />
          <Bars title={t('Kis tarah')} rows={analytics.data.byType.map((b) => ({ key: b.type, label: t(movementOf(b.type).label), amount: b.value, value: cost(Math.abs(b.value)), hint: t('{{count}} entry · {{qty}}', { count: b.count, qty: qty(b.qty) }) }))} />
          <Bars title={t('Sab se zyada hilne wala maal')} tone="info" rows={analytics.data.topMovers.map((m) => ({ key: m.name, label: m.name, amount: m.value, value: cost(Math.abs(m.value)), hint: `+${qty(m.in)} / −${qty(m.out)} ${m.unit}` }))} />
          <Bars title={t('Kis ne kiya')} tone="neutral" rows={analytics.data.byPerson.map((p) => ({ key: p.name, label: p.name, amount: p.value, value: cost(Math.abs(p.value)), hint: t('{{count}} entry', { count: p.count }) }))} />
        </View>
      ) : <OnlineOnly feature="reports" />)}
    </View>
  );

  return (
    <>
      <ListTemplate
        title={t('Stock movements')}
        actions={<Row gap={1}>
          <IconButton icon={SlidersHorizontal} label={t('Filters')} badge={!!userId || direction !== 'all'} onPress={() => setFilters(true)} />
          <IconButton icon={Printer} label={t('Print')} onPress={() => void print()} disabled={!list.items.length} />
        </Row>}
        search={tab === 'ledger' ? { value: search, onChange: setSearch, placeholder: t('Product, SKU, reference ya note…') } : undefined}
        summary={summary}
        data={tab === 'ledger' ? list.items : []}
        loading={tab === 'ledger' && list.loading}
        error={tab === 'ledger' ? list.error : null}
        onRetry={list.refetch}
        refreshing={list.refreshing}
        onRefresh={list.refetch}
        onEndReached={list.loadMore}
        footer={list.loadingMore ? <ActivityIndicator style={{ margin: 16 }} /> : undefined}
        keyExtractor={(m) => m.id}
        renderItem={({ item: m }) => {
          const meta = movementOf(m.type);
          const inward = m.quantity > 0;
          return (
            <ListRow icon={meta.icon} iconTone={meta.tone}
              overline={`${t(meta.label)} · ${formatDateTime(m.createdAt)}`}
              title={m.variant ? `${m.product.name} · ${m.variant.name}` : m.product.name}
              subtitle={[m.reference, m.note, m.shop?.name, m.createdBy?.fullName].filter(Boolean).join(' · ') || undefined}
              trailing={<View style={{ alignItems: 'flex-end' }}>
                <Text weight="bold" tone={inward ? 'success' : 'danger'} ltr>{`${inward ? '+' : ''}${qty(m.quantity)} ${m.product.unit}`}</Text>
                <Text size="xs" tone="muted" ltr>{t('Baad mein')} {qty(m.balanceAfter)}</Text>
              </View>} />
          );
        }}
        empty={tab === 'ledger' ? <EmptyState icon={Activity} title={t('Is filter me koi entry nahi')} /> : <View />}
      />
      <Sheet open={filters} onClose={() => setFilters(false)} title={t('Filters')} footer={<Button fullWidth onPress={() => setFilters(false)}>{t('Dekhein')}</Button>}>
        <View style={{ gap: th.space(3) }}>
          <Segmented value={direction} onChange={setDirection} options={[{ value: 'all', label: t('Sab') }, { value: 'in', label: t('Andar aaya') }, { value: 'out', label: t('Bahar gaya') }]} />
          <Select label={t('Kis ne kiya')} value={userId} onChange={setUserId} options={[{ value: '', label: t('Sab log') }, ...(people.data ?? []).map((p) => ({ value: p.id, label: p.fullName }))]} />
        </View>
      </Sheet>
    </>
  );
}
