/** Branches side by side for a chosen period: sales, expenses, profit and growth. */

import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { businessDayKey } from '@/core/format';
import { Amount, Badge, Card, ChipGroup, EmptyState, HBarList, Screen, SkeletonRows, StatTile, Text, ErrorState, useTheme } from '@/design';
import { shopsApi, type BranchFigures } from '../api/organization';
import { KV } from '../components/parts';
import { SHOP_TYPES } from '../lib/meta';

type Period = 'today' | '7d' | '30d' | 'month';
const DAY = 86_400_000;

function range(p: Period) {
  const now = Date.now();
  const to = businessDayKey(now);
  if (p === 'today') return { from: to, to };
  if (p === '7d') return { from: businessDayKey(now - 6 * DAY), to };
  if (p === '30d') return { from: businessDayKey(now - 29 * DAY), to };
  return { from: `${to.slice(0, 8)}01`, to };
}

export function BranchCompareScreen() {
  const th = useTheme();
  const can = usePermission();
  const [period, setPeriod] = useState<Period>('7d');
  const r = useMemo(() => range(period), [period]);
  const q = useQuery({ queryKey: ['shops-compare', r.from, r.to], queryFn: () => shopsApi.compare(r), enabled: can(P.REPORTS_VIEW) });
  const d = q.data;

  return (
    <Screen title={t('Compare branches')} narrow onRefresh={() => q.refetch()} refreshing={q.isRefetching}>
      <ChipGroup value={period} onChange={setPeriod} style={{ marginHorizontal: -th.space(4) }} options={[
        { value: 'today', label: t('Today') }, { value: '7d', label: t('7 din') }, { value: '30d', label: t('30 din') }, { value: 'month', label: t('Is mahine') },
      ]} />
      {!can(P.REPORTS_VIEW) ? <EmptyState title={t('Yeh dekhne ke liye Reports ki permission chahiye')} />
        : q.isLoading ? <SkeletonRows count={4} avatar={false} />
          : q.error ? <ErrorState error={q.error} onRetry={q.refetch} />
            : !d || !d.shops.length ? <EmptyState title={t('Is muddat me koi data nahi')} />
              : (
                <>
                  <View style={{ flexDirection: 'row', gap: th.space(2) }}>
                    <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} label={t('Net sale')} value={<Amount value={d.totals.net} weight="bold" compact />} hint={t('{{count}} bills', { count: d.totals.bills })} />
                    {d.totals.netProfit !== undefined && !d.costHidden
                      ? <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} tone="success" label={t('Net profit')} value={<Amount value={d.totals.netProfit} weight="bold" compact colorize />} />
                      : <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} tone="warning" label={t('Expenses')} value={<Amount value={d.totals.expenses} weight="bold" compact />} />}
                  </View>
                  <Card title={t('Sale by branch')}>
                    <HBarList colorful rows={d.shops.map((s) => ({ key: s.id, label: s.name, value: s.net, display: <Amount value={s.net} size="sm" weight="semibold" compact /> }))} />
                  </Card>
                  {d.shops.map((s) => <BranchCard key={s.id} s={s} costHidden={d.costHidden} />)}
                </>
              )}
    </Screen>
  );
}

function BranchCard({ s, costHidden }: { s: BranchFigures; costHidden: boolean }) {
  const th = useTheme();
  const type = SHOP_TYPES[s.type];
  return (
    <Card title={s.name} action={<Badge tone={s.growth >= 0 ? 'success' : 'danger'}>{`${s.growth >= 0 ? '+' : ''}${Math.round(s.growth)}%`}</Badge>} description={`${t(type.label)} · ${t('{{value}}% of sale', { value: Math.round(s.share) })}`}>
      <View style={{ gap: th.space(1.5) }}>
        <KV label={t('Bills')} value={<Text size="sm" weight="semibold" ltr>{String(s.bills)}</Text>} />
        <KV label={t('Net sale')} value={<Amount value={s.net} size="sm" />} />
        <KV label={t('Average bill')} value={<Amount value={s.avgBill} size="sm" />} />
        <KV label={t('Expenses')} value={<Amount value={s.expenses} size="sm" />} />
        {!costHidden && s.netProfit !== undefined && <KV label={t('Net profit')} value={<Amount value={s.netProfit} size="sm" colorize />} />}
        <KV label={t('Udhaar par sale')} value={<Amount value={s.credit} size="sm" />} />
      </View>
    </Card>
  );
}
