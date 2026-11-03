/**
 * Load sheets: one per van trip. Lists open, out and settled sheets with the
 * trip's value and cash (expected, handed in, short or excess). New sheets
 * are made from invoiced orders.
 */

import { keepPreviousData, useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Plus, Truck } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { Amount, Button, EmptyState, ListRow, ListTemplate, StatTile, Row, Text, useTheme } from '@/design';
import { DIST_KEY, distributionApi, type LoadSheet, type LoadSheetStatus } from '../api/distribution.api';
import { CachedNote, StatusChip } from '../components/parts';
import { DistributionGate } from '../components/DistributionGate';
import { LoadSheetSheet } from '../components/LoadSheetSheet';
import { dayKeyLabel, rs, SHEET_STATUS } from '../lib/meta';

type Tab = LoadSheetStatus | 'ALL';

export function LoadSheetsScreen() {
  return <DistributionGate title={t('Load sheets')}><Sheets /></DistributionGate>;
}

function Sheets() {
  const th = useTheme();
  const canLoad = usePermission()(P.DISTRIBUTION_LOADSHEETS_MANAGE);
  const [tab, setTab] = useState<Tab>('ALL');
  const [creating, setCreating] = useState(false);

  const q = useInfiniteQuery({
    queryKey: [DIST_KEY, 'sheets', tab],
    queryFn: ({ pageParam }) => distributionApi.loadSheets({ status: tab === 'ALL' ? undefined : tab, page: pageParam, limit: 30 }),
    initialPageParam: 1,
    getNextPageParam: (l) => (l.page * l.limit < l.total ? l.page + 1 : undefined),
    placeholderData: keepPreviousData,
  });
  const toLoadQ = useQuery({ queryKey: [DIST_KEY, 'orders', 'to-load'], queryFn: () => distributionApi.orders({ status: 'INVOICED', unloaded: true, limit: 200 }) });
  const sheets = useMemo(() => q.data?.pages.flatMap((p) => p.sheets) ?? [], [q.data]);
  const toLoad = toLoadQ.data;

  const TABS = [
    { value: 'ALL', label: t('Sab') }, { value: 'OPEN', label: t('Tayyar ho rahi') }, { value: 'DISPATCHED', label: t('Raste me') }, { value: 'SETTLED', label: t('Settle') },
  ];

  return (
    <>
      <ListTemplate<LoadSheet>
        title={t('Load sheets')}
        subtitle={t('Gaari ki trip')}
        filters={{ value: tab, onChange: (v) => setTab(v as Tab), options: TABS }}
        summary={<View style={{ gap: th.space(2) }}>
          {toLoad && toLoad.total > 0 && canLoad && (
            <StatTile icon={Truck} tone="warning" label={t('Load baqi')} value={String(toLoad.total)} hint={rs(toLoad.totalValue)} onPress={() => setCreating(true)} />
          )}
          <CachedNote query={q} />
        </View>}
        data={sheets}
        loading={q.isLoading}
        error={q.isError && !sheets.length ? q.error : undefined}
        onRetry={() => void q.refetch()}
        refreshing={q.isRefetching && !q.isFetchingNextPage}
        onRefresh={() => { void q.refetch(); void toLoadQ.refetch(); }}
        onEndReached={() => { if (q.hasNextPage && !q.isFetchingNextPage) void q.fetchNextPage(); }}
        keyExtractor={(s) => s.id}
        renderItem={({ item: s }) => (
          <ListRow
            icon={Truck}
            title={s.number}
            subtitle={`${dayKeyLabel(s.date.slice(0, 10))} · ${s.routeName ?? s.deliveryUserName ?? t('Mili juli')} · ${t('{{invoiceCount}} invoices', { invoiceCount: s.invoiceCount })}`}
            trailing={<View style={{ alignItems: 'flex-end', gap: 4 }}>
              <Amount value={s.totalValue} weight="bold" />
              <StatusChip meta={SHEET_STATUS[s.status]} />
              {s.status === 'SETTLED' && s.shortAmount !== 0 && <Text size="xs" tone={s.shortAmount > 0 ? 'danger' : 'success'}>{s.shortAmount > 0 ? t('Kam') : t('Zyada')} {rs(Math.abs(s.shortAmount))}</Text>}
            </View>}
            chevron
            onPress={() => router.push(`/distribution/load-sheets/${s.id}` as never)}
          />
        )}
        empty={<EmptyState icon={Truck} title={t('Koi load sheet nahi')} message={t('Invoiced orders se nayi load sheet banayein.')}
          action={canLoad ? <Button icon={Plus} onPress={() => setCreating(true)}>{t('Nayi load sheet')}</Button> : undefined} />}
        fab={canLoad ? { icon: Plus, label: t('Nayi load sheet'), onPress: () => setCreating(true) } : undefined}
      />
      <LoadSheetSheet open={creating} onClose={() => setCreating(false)} />
    </>
  );
}
