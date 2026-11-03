/**
 * Mobile shop reports (web devices stock-report panel and dashboard widgets):
 * profit by source, PTA, top brands, repairs, installments, used phones and
 * stock aging. Reports add up the whole shop, so they need internet.
 */

import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { Amount, Badge, Card, ChipGroup, DetailRow, EmptyState, HBarList, ListRow, Row, Screen, SkeletonRows, StatTile, Text, useTheme } from '@/design';
import { useCostMask } from '@/modules/sales/lib/mask';
import { OfflineNote } from '../../_shared/deskKit';
import { mobileReportsApi } from '../api';
import { useShopId } from '../components/kit';
import { conditionOf, metaText, ptaOf, planStatusOf, repairStatusOf } from '../meta';

type Tab = 'overview' | 'pta' | 'brands' | 'repairs' | 'emi' | 'used' | 'aging';
const TABS: Array<{ value: Tab; label: string }> = [
  { value: 'overview', label: t('Overview') }, { value: 'pta', label: t('PTA') }, { value: 'brands', label: t('Brands') }, { value: 'repairs', label: t('Repairs') },
  { value: 'emi', label: t('Instalment plans') }, { value: 'used', label: t('Used phones') }, { value: 'aging', label: t('Stock aging') },
];
const DAYS = [7, 30, 90];

export function MobileReportsScreen() {
  const th = useTheme();
  const shopId = useShopId();
  const { cost } = useCostMask();
  const [tab, setTab] = useState<Tab>('overview');
  const [days, setDays] = useState(30);
  const range = useMemo(() => { const to = new Date(); return { from: new Date(to.getTime() - days * 86_400_000).toISOString(), to: to.toISOString() }; }, [days]);
  const dash = useQuery({ queryKey: ['mobile-dashboard-ops', 'dash'], queryFn: () => mobileReportsApi.dashboard(), enabled: tab === 'overview' });
  const src = useQuery({ queryKey: ['mobile-profit-by-source', days], queryFn: () => mobileReportsApi.profitBySource(range), enabled: tab === 'overview' });
  const pta = useQuery({ queryKey: ['mobile-pta-breakdown'], queryFn: () => mobileReportsApi.ptaBreakdown(), enabled: tab === 'pta' });
  const brands = useQuery({ queryKey: ['mobile-top-brands', days], queryFn: () => mobileReportsApi.topBrands(days), enabled: tab === 'brands' });
  const rep = useQuery({ queryKey: ['mobile-repair-analytics', days], queryFn: () => mobileReportsApi.repairAnalytics(days), enabled: tab === 'repairs' });
  const emi = useQuery({ queryKey: ['mobile-emi-analytics'], queryFn: () => mobileReportsApi.emiAnalytics(), enabled: tab === 'emi' });
  const used = useQuery({ queryKey: ['mobile-used-analytics', days], queryFn: () => mobileReportsApi.usedPhoneAnalytics(days), enabled: tab === 'used' });
  const aging = useQuery({ queryKey: ['mobile-stock-aging', shopId], queryFn: () => mobileReportsApi.stockAging(shopId ?? undefined), enabled: tab === 'aging' });
  const active = { overview: src, pta, brands, repairs: rep, emi, used, aging }[tab];
  const tile = (label: string, value: string, tone?: 'success' | 'danger' | 'warning' | 'info') => <StatTile key={label} style={{ flex: 1 }} label={label} tone={tone} value={value} />;

  return (
    <Screen title={t('Mobile reports')} onRefresh={() => void active.refetch()} refreshing={active.isRefetching}>
      <View style={{ gap: th.space(3) }}>
        <ChipGroup value={tab} onChange={setTab} options={TABS} />
        {['overview', 'brands', 'repairs', 'used'].includes(tab) && <ChipGroup value={String(days)} onChange={(v) => setDays(Number(v))} options={DAYS.map((d) => ({ value: String(d), label: t('{{d}} din', { d }) }))} />}
        <OfflineNote feature="reports" />
        {active.isLoading ? <SkeletonRows count={4} /> : active.isError ? <EmptyState title={t('Report nahi khuli')} message={t('Internet check karein aur dobara koshish karein.')} /> : (
          <>
            {tab === 'overview' && dash.data && (
              <>
                <Row gap={2}>{tile(t('Phone stock'), String(dash.data.newPhonesInStock))}{tile(t('Stock value'), cost(dash.data.newPhonesStockValue))}</Row>
                <Row gap={2}>{tile(t('Used phones'), String(dash.data.usedPhonesInStock))}{tile(t('Repair khule'), String(dash.data.openRepairTickets))}</Row>
                <Row gap={2}>{tile(t('Chal rahe plan'), String(dash.data.activeEmiPlans))}{tile(t('Qiston ka baqi'), cost(dash.data.emiOutstanding), 'warning')}</Row>
                <Row gap={2}>{tile(t('Is mahine sale'), formatMoney(dash.data.monthRevenue))}{tile(t('Is mahine profit'), cost(dash.data.monthProfit), 'success')}</Row>
              </>
            )}
            {tab === 'overview' && src.data && (
              <>
                <Card flush title={t('Kamai ka rasta')} description={t('{{d}} din ka profit', { d: days })}>
                  {src.data.sources.map((s, i) => (
                    <ListRow key={s.key} divider={i < src.data!.sources.length - 1} title={t(s.label)} subtitle={t('{{n}} sale · {{m}}% margin', { n: s.sales, m: Math.round(s.margin) })}
                      trailing={<View style={{ alignItems: 'flex-end' }}><Text weight="bold" ltr>{cost(s.profit)}</Text><Text size="2xs" tone="muted" ltr>{formatMoney(s.revenue)}</Text></View>} />
                  ))}
                </Card>
                {src.data.topProducts.length > 0 && <Card title={t('Sab se zyada profit')}><HBarList rows={src.data.topProducts.slice(0, 6).map((p) => ({ key: p.productId, label: p.name, value: p.profit, display: formatMoney(p.profit) }))} /></Card>}
              </>
            )}
            {tab === 'pta' && (pta.data ?? []).map((r) => (
              <ListRow key={r.ptaStatus} title={t(ptaOf(r.ptaStatus).label)} subtitle={t('Tax diya {{n}}', { n: formatMoney(r.taxPaid) })} leading={<Badge tone={ptaOf(r.ptaStatus).tone}>{r.count}</Badge>} trailing={<Text weight="semibold" ltr>{cost(r.stockValue)}</Text>} />
            ))}
            {tab === 'brands' && ((brands.data ?? []).length === 0 ? <EmptyState title={t('Abhi koi sale nahi')} /> : (brands.data ?? []).map((b) => (
              <ListRow key={b.brandId} title={b.brandName} subtitle={t('{{n}} phone · {{m}}% margin', { n: b.unitsSold, m: Math.round(b.margin) })} trailing={<View style={{ alignItems: 'flex-end' }}><Text weight="bold" ltr>{formatMoney(b.revenue)}</Text><Text size="2xs" tone="success" ltr>{cost(b.profit)}</Text></View>} />
            )))}
            {tab === 'repairs' && rep.data && (
              <>
                <Row gap={2}>{tile(t('Wapas diye'), String(rep.data.delivered))}{tile(t('Kamai'), formatMoney(rep.data.totalRevenue))}</Row>
                <Row gap={2}>{tile(t('Parts ki cost'), cost(rep.data.partsOwnCost))}{tile(t('Profit'), cost(rep.data.grossProfit), 'success')}</Row>
                <Card flush title={t('Halat')}>{rep.data.byStatus.map((s, i) => <DetailRow key={s.status} last={i === rep.data!.byStatus.length - 1} label={t(repairStatusOf(s.status).label)} value={String(s.count)} />)}</Card>
                {rep.data.topBrands.length > 0 && <Card title={t('Kaun se brand aate hain')}><HBarList rows={rep.data.topBrands.map((b) => ({ key: b.brand, label: b.brand, value: b.count, display: String(b.count) }))} /></Card>}
              </>
            )}
            {tab === 'emi' && emi.data && (
              <>
                <Row gap={2}>{tile(t('Qiston me diya'), cost(emi.data.activeFinanced))}{tile(t('Mila'), cost(emi.data.activePaid), 'success')}</Row>
                <Row gap={2}>{tile(t('Baqi'), cost(emi.data.activeRemaining), 'warning')}{tile(t('Late'), cost(emi.data.overdueAmount), emi.data.overdueCount ? 'danger' : undefined)}</Row>
                <Card flush title={t('Plan ki halat')}>{emi.data.byStatus.map((s, i) => <DetailRow key={s.status} last={i === emi.data!.byStatus.length - 1} label={t(planStatusOf(s.status).label)} value={`${s.count} · ${cost(s.remaining)}`} />)}</Card>
              </>
            )}
            {tab === 'used' && used.data && (
              <>
                <Row gap={2}>{tile(t('Bik gaye'), String(used.data.soldCount))}{tile(t('Profit'), cost(used.data.soldProfit), 'success')}</Row>
                <Row gap={2}>{tile(t('Stock me'), String(used.data.inStockCount))}{tile(t('Mumkin profit'), cost(used.data.inStockPotentialProfit))}</Row>
                <Card flush title={t('Halat ke hisaab se')}>{used.data.byCondition.map((c, i) => <DetailRow key={c.condition} last={i === used.data!.byCondition.length - 1} label={t(conditionOf(c.condition).label)} value={`${c.count} · ${cost(c.totalCost)}`} />)}</Card>
              </>
            )}
            {tab === 'aging' && aging.data && (
              <>
                <Row gap={2}>{tile(t('Kul stock value'), cost(aging.data.totals.totalValue))}{tile(t('Mumkin profit'), cost(aging.data.totals.potentialProfit), 'success')}</Row>
                <Card flush title={t('Kitne din se shelf par')}>{aging.data.buckets.map((b, i) => <DetailRow key={b.key} last={i === aging.data!.buckets.length - 1} label={t(b.label)} value={`${b.phones + b.usedPhones} · ${cost(b.phoneValue + b.usedValue)}`} />)}</Card>
                {aging.data.deadStock.count > 0 && <Card tone="warning" title={t('Purana stock')} description={t('{{n}} phone · {{v}}', { n: aging.data.deadStock.count, v: cost(aging.data.deadStock.value) })}>{aging.data.deadStock.items.slice(0, 6).map((it) => <Text key={it.id} size="sm">{it.name} · {t('{{d}} din', { d: it.ageDays })}</Text>)}</Card>}
              </>
            )}
          </>
        )}
      </View>
    </Screen>
  );
}
