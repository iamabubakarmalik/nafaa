/**
 * Sales history: every bill for any period with totals that cover the whole
 * filter, grouped by day; search by bill, customer, phone, product or barcode;
 * scan a bill's barcode; analytics for the same filter. Bills waiting on this
 * phone show on top; with no internet the phone's own copy (last 30 days) is used.
 */

import { router, useLocalSearchParams } from 'expo-router';
import { BarChart3, CloudOff, ListChecks, ScanLine, ShoppingCart, SlidersHorizontal } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { businessDayKey, formatWeekdayDate } from '@/core/format';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import {
  Amount, Badge, Button, ChipGroup, EmptyState, IconButton, ListTemplate, Row, Segmented, StatTile, Text, toast, useTheme,
} from '@/design';
import { Scanner } from '@/core/hardware/scanner';
import { salesHistoryApi } from '../api/history';
import { AnalyticsView } from '../components/AnalyticsView';
import { FiltersSheet } from '../components/FiltersSheet';
import { DayHeader, SaleRow, type HistoryRow } from '../components/SaleRow';
import { STATUS_FILTERS, tierLabel } from '../lib/meta';
import { useCostMask } from '../lib/mask';
import { PERIOD_PRESETS } from '../lib/period';
import { useHistory } from '../lib/useHistory';

export function SalesHistoryScreen({ tabBar = true }: { tabBar?: boolean }) {
  const th = useTheme();
  const can = usePermission();
  const { q } = useLocalSearchParams<{ q?: string }>();
  const h = useHistory('today', { search: q });
  const { costHidden, cost } = useCostMask();
  const [tab, setTab] = useState<'bills' | 'analytics'>('bills');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [scanning, setScanning] = useState(false);
  const st = h.stats;

  const rows = useMemo<HistoryRow[]>(() => {
    const today = businessDayKey(Date.now(), h.startHour);
    const y = businessDayKey(Date.now() - 86_400_000, h.startHour);
    const out: HistoryRow[] = [];
    let i = 0;
    while (i < h.sales.length) {
      const key = businessDayKey(h.sales[i].soldAt, h.startHour);
      let j = i;
      let total = 0;
      while (j < h.sales.length && businessDayKey(h.sales[j].soldAt, h.startHour) === key) { if (h.sales[j].status !== 'VOIDED') total += h.sales[j].total; j++; }
      const label = key === today ? t('Aaj') : key === y ? t('Kal') : formatWeekdayDate(new Date(`${key}T12:00:00+05:00`));
      out.push({ kind: 'day', key: `d-${key}-${i}`, label, total, count: j - i });
      for (let k = i; k < j; k++) out.push({ kind: 'sale', key: h.sales[k].id, sale: h.sales[k], first: k === i, last: k === j - 1 });
      i = j;
    }
    return out;
  }, [h.sales, h.startHour]);

  const openByCode = async (code: string) => {
    const c = code.trim();
    if (!c) return false;
    try {
      const res = await salesHistoryApi.list({ from: 'all', to: businessDayKey(Date.now(), h.startHour), status: 'all', sort: 'new', search: c }, 1, 5);
      const hit = res.items.find((s) => s.saleNumber.toLowerCase() === c.toLowerCase()) ?? (res.items.length === 1 ? res.items[0] : null);
      if (hit) { setScanning(false); router.push(`/sales/${hit.id}` as never); return true; }
    } catch { /* offline: fall through */ }
    toast.error(t('Bill "{{c}}" nahi mila', { c }));
    return false;
  };

  const tierCells = h.tiers ? [
    ...(['RETAIL', 'WHOLESALE', 'CREDIT'] as const).filter((x) => h.tiers![x].bills > 0).map((x) => ({ tier: x as 'RETAIL' | 'WHOLESALE' | 'CREDIT' | 'MIXED', bills: h.tiers![x].bills })),
    ...(h.tiers.mixedBills > 0 ? [{ tier: 'MIXED' as const, bills: h.tiers.mixedBills }] : []),
  ] : [];

  const summary = (
    <View style={{ gap: th.space(3) }}>
      <Segmented value={tab} onChange={setTab} options={[{ value: 'bills', label: t('Bill'), icon: ListChecks }, { value: 'analytics', label: t('Analytics'), icon: BarChart3 }]} />
      <ChipGroup value={h.preset === 'custom' ? 'custom' : h.preset} onChange={(v) => h.setPreset(v as typeof h.preset)} style={{ marginHorizontal: -th.space(4) }}
        options={[...PERIOD_PRESETS.map((p) => ({ value: p.value, label: t(p.label) })), ...(h.preset === 'custom' ? [{ value: 'custom', label: h.label }] : [])]} />
      {tab === 'bills' && (
        <>
          <Row gap={2}>
            <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} label={t('Total sale')} loading={!st} value={<Amount value={st?.total ?? 0} size="lg" weight="bold" />} hint={t('{{count}} bill', { count: st?.bills ?? 0 })} />
            <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} tone="success" label={t('Haath mein aaya')} loading={!st} value={<Amount value={st?.paid ?? 0} size="lg" weight="bold" />}
              hint={st?.change ? t('return {{change}}', { change: Math.round(st.change) }) : t('cash + online')} />
          </Row>
          <Row gap={2}>
            <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} tone="warning" label={t('Udhaar')} loading={!st} value={<Amount value={st?.credit ?? 0} size="lg" weight="bold" />}
              hint={t('{{creditCount}} bill', { creditCount: st?.creditCount ?? 0 })} onPress={() => h.setStatus(h.status === 'credit' ? 'all' : 'credit')} />
            {h.fromPhone ? (
              <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} tone="info" label={t('Ausat bill')} loading={!st} value={<Amount value={st?.average ?? 0} size="lg" weight="bold" />} hint={t('{{value}} cheezein', { value: Math.round(st?.qty ?? 0) })} />
            ) : (
              <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} tone="info" label={t('Profit')} loading={!st}
                value={costHidden ? <Text size="lg" weight="bold">{'Rs ••••'}</Text> : <Amount value={st?.profit ?? 0} size="lg" weight="bold" />}
                hint={costHidden ? t('Cost lock') : t('{{value}}% margin', { value: (st?.margin ?? 0).toFixed(1) })} />
            )}
          </Row>
          {tierCells.length > 0 && (
            <Row gap={2} wrap>
              {tierCells.map((c) => (
                <Badge key={c.tier} tone={h.tier === c.tier ? 'brand' : 'neutral'} solid={h.tier === c.tier} size="md">{`${tierLabel(c.tier)} · ${c.bills}`}</Badge>
              ))}
            </Row>
          )}
          {h.fromPhone && <Row gap={1.5}><CloudOff size={14} color={th.colors.textMuted} /><Text size="xs" tone="muted" style={{ flex: 1 }}>{t('Internet nahi — phone par save pichle 30 din ke bill dikh rahe hain.')}</Text></Row>}
          {h.pendingCount > 0 && <Row gap={1.5}><CloudOff size={14} color={th.colors.warning.text} /><Text size="xs" tone="warning" style={{ flex: 1 }}>{t('{{count}} bill phone par save hain — internet aate hi server par chale jayenge', { count: h.pendingCount })}</Text></Row>}
        </>
      )}
      {tab === 'analytics' && <AnalyticsView filters={h.filters} costHidden={costHidden} />}
    </View>
  );

  return (
    <>
      <ListTemplate<HistoryRow>
        title={t('Sale ka record')}
        tabBar={tabBar}
        onBack={tabBar ? null : undefined}
        actions={<Row gap={1}>
          <IconButton icon={ScanLine} label={t('Bill scan')} onPress={() => setScanning(true)} />
          <IconButton icon={SlidersHorizontal} label={t('Filters')} badge={h.hasFilters || h.preset === 'custom'} onPress={() => setFiltersOpen(true)} />
        </Row>}
        search={tab === 'bills' ? { value: h.search, onChange: h.setSearch, placeholder: t('Bill number, customer, phone, product ya barcode…'), onScan: () => setScanning(true) } : undefined}
        filters={tab === 'bills' ? { value: h.status, onChange: (v) => h.setStatus(v as typeof h.status), options: STATUS_FILTERS.map((o) => ({ value: o.value, label: t(o.label), icon: o.icon })) } : undefined}
        summary={summary}
        data={tab === 'bills' ? rows : []}
        grouped={false}
        loading={tab === 'bills' && h.loading}
        error={tab === 'bills' ? h.error : undefined}
        onRetry={() => void h.refetch()}
        refreshing={h.refreshing}
        onRefresh={() => void h.refetch()}
        onEndReached={h.loadMore}
        keyExtractor={(r) => r.key}
        renderItem={({ item }) => (item.kind === 'day'
          ? <DayHeader label={item.label} total={item.total} count={item.count} />
          : <SaleRow sale={item.sale} first={item.first} last={item.last} />)}
        empty={tab === 'bills' ? (
          <EmptyState icon={ShoppingCart} title={h.hasFilters ? t('Is filter mein koi bill nahi') : t('Is period mein koi sale nahi')}
            message={h.hasFilters ? t('Filter badal kar dekhein') : t('POS se pehli sale karein, ya period badlein')}
            action={h.hasFilters ? <Button variant="secondary" onPress={h.clear}>{t('Filter hatayein')}</Button>
              : can(P.POS_USE) ? <Button onPress={() => router.push('/pos' as never)}>{t('POS kholein')}</Button> : undefined} />
        ) : <View />}
      />
      <FiltersSheet h={h} open={filtersOpen} onClose={() => setFiltersOpen(false)} />
      {scanning && <Scanner title={t('Bill ka barcode scan')} onCode={openByCode} onClose={() => setScanning(false)} />}
    </>
  );
}
