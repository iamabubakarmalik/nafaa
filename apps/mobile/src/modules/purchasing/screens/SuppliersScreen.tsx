/**
 * Suppliers: who we buy from and what we owe. Search, dues, status, city
 * and sort run on the server a page at a time; swipe a supplier to pay,
 * buy, call or WhatsApp. Owed money is shown by age; analytics in a tab.
 * The last loaded list stays readable offline.
 */

import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Banknote, BarChart3, CloudOff, MessageCircle, Phone, Plus, Printer, ShoppingCart, SlidersHorizontal, Users } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { formatPKR, formatRelative } from '@/core/format';
import { t } from '@/core/i18n';
import { useCachedNotice } from '@/core/offline';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import {
  Avatar, Button, ChipGroup, EmptyState, IconButton, ListRow, ListTemplate, Row, Segmented, Select, Sheet, StatTile, SwipeRow, Text, useDebouncedValue, useTheme,
  type SwipeAction,
} from '@/design';
import { PUR } from '@/modules/inventory/lib/shared';
import { suppliersApi, type Supplier, type SupplierDues, type SupplierSort, type SupplierStatus } from '../api/suppliers';
import { Bars, SupplierAnalyticsView } from '../components/Analytics';
import { SupplierMoneySheet } from '../components/SupplierMoneySheet';
import { printDoc, suppliersDoc } from '../lib/docs';
import { callPhone, daysAgo, openWhatsApp } from '../lib/meta';

export function SuppliersScreen() {
  const th = useTheme();
  const can = usePermission();
  const canEdit = can(P.SUPPLIERS_EDIT);
  const canBuy = can(P.PURCHASES_CREATE);
  const [tab, setTab] = useState<'list' | 'analytics'>('list');
  const [search, setSearch] = useState('');
  const q = useDebouncedValue(search.trim(), 250);
  const [dues, setDues] = useState<SupplierDues>('all');
  const [status, setStatus] = useState<SupplierStatus>('active');
  const [city, setCity] = useState('');
  const [sort, setSort] = useState<SupplierSort>('due');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [paying, setPaying] = useState<Supplier | null>(null);

  const params = { search: q || undefined, dues, status, city: city || undefined, sort, limit: 30 };
  const list = useInfiniteQuery({
    queryKey: [PUR, 'suppliers', 'list', params],
    queryFn: ({ pageParam }) => suppliersApi.list({ ...params, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.meta.page < last.meta.totalPages ? last.meta.page + 1 : undefined),
    placeholderData: (prev) => prev,
  });
  const sum = useQuery({ queryKey: [PUR, 'suppliers', 'summary'], queryFn: suppliersApi.summary, staleTime: 60_000 });
  const cached = useCachedNotice(list);
  const s = sum.data;
  const items = useMemo(() => list.data?.pages.flatMap((p) => p.items) ?? [], [list.data]);
  const total = list.data?.pages[0]?.meta.total;
  const filtered = status !== 'active' || !!city || sort !== 'due';

  const DUES = [{ value: 'all', label: t('Sab') }, { value: 'due', label: t('Jinhe dena hai') }, { value: 'clear', label: t('Hisaab saaf') }];

  const summary = (
    <View style={{ gap: th.space(3) }}>
      {s && (
        <Row gap={2}>
          <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} tone="danger" icon={Banknote} label={t('Kul dena hai')} value={formatPKR(s.totalOutstanding)} hint={t('{{suppliersWithDebt}} supplier', { suppliersWithDebt: s.suppliersWithDebt })}
            onPress={() => setDues(dues === 'due' ? 'all' : 'due')} />
          <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} label={t('Is mahine purchase')} value={formatPKR(s.monthPurchases)} hint={t('{{monthCount}} bill', { monthCount: s.monthCount })} />
        </Row>
      )}
      <Segmented value={tab} onChange={setTab} options={[{ value: 'list', label: total != null ? `${t('Suppliers')} (${total})` : t('Suppliers'), icon: Users }, { value: 'analytics', label: t('Analytics'), icon: BarChart3 }]} />
      {tab === 'list' && s?.dueAging?.some((b) => b.amount > 0) && (
        <Bars tone="danger" rows={s.dueAging.filter((b) => b.amount > 0).map((b) => ({ key: b.bucket, label: t(b.bucket), sub: t('{{count}} supplier', { count: b.count }), value: b.amount, right: formatPKR(b.amount) }))} />
      )}
      {cached.fromCache && cached.updatedAt && <Row gap={1.5}><CloudOff size={14} color={th.colors.textMuted} /><Text size="xs" tone="muted">{t('Last updated {{time}}', { time: formatRelative(cached.updatedAt) })}</Text></Row>}
      {tab === 'analytics' && <SupplierAnalyticsView />}
    </View>
  );

  return (
    <>
      <ListTemplate<Supplier>
        title={t('Suppliers')}
        actions={<Row gap={1}>
          <IconButton icon={ShoppingCart} label={t('Purchase')} onPress={() => router.push('/purchases' as never)} />
          {tab === 'list' && <IconButton icon={Printer} label={t('Print')} disabled={!items.length} onPress={async () => printDoc(suppliersDoc((await suppliersApi.list({ ...params, page: 1, limit: 500 })).items))} />}
          {tab === 'list' && <IconButton icon={SlidersHorizontal} label={t('Filters')} badge={filtered} onPress={() => setFiltersOpen(true)} />}
        </Row>}
        search={tab === 'list' ? { value: search, onChange: setSearch, placeholder: t('Naam, phone ya shehar…') } : undefined}
        filters={tab === 'list' ? { value: dues, onChange: (v) => setDues(v as SupplierDues), options: DUES } : undefined}
        summary={summary}
        data={tab === 'list' ? items : []}
        loading={tab === 'list' && list.isLoading}
        error={tab === 'list' && !list.data ? list.error : undefined}
        onRetry={list.refetch}
        refreshing={list.isRefetching && !list.isFetchingNextPage}
        onRefresh={() => { void list.refetch(); void sum.refetch(); }}
        onEndReached={() => { if (list.hasNextPage && !list.isFetchingNextPage) void list.fetchNextPage(); }}
        keyExtractor={(x) => x.id}
        renderItem={({ item: x }) => {
          const last = daysAgo(x.lastPurchaseAt);
          const paid = daysAgo(x.lastPaymentAt);
          const end: SwipeAction[] = [
            ...(canEdit && x.outstandingDue > 0 ? [{ icon: Banknote, label: t('Payment'), tone: 'success' as const, onPress: () => setPaying(x) }] : []),
            ...(canBuy ? [{ icon: ShoppingCart, label: t('Purchase'), tone: 'brand' as const, onPress: () => router.push(`/purchases/new?supplier=${x.id}` as never) }] : []),
          ];
          const start: SwipeAction[] = x.phone ? [
            { icon: Phone, label: t('Call'), tone: 'info', onPress: () => callPhone(x.phone) },
            { icon: MessageCircle, label: t('WhatsApp'), tone: 'success', onPress: () => openWhatsApp(x.phone) },
          ] : [];
          return (
            <SwipeRow end={end} start={start}>
              <ListRow
                avatar={<Avatar name={x.name} url={x.logoUrl ?? undefined} size={42} />}
                title={x.name}
                subtitle={`${[x.contactPerson, x.phone, x.city].filter(Boolean).join(' · ') || t('Rabta darj nahi')}\n${t('Aakhri maal')}: ${last == null ? '—' : last === 0 ? t('Aaj') : t('{{last}} din', { last })} · ${t('Aakhri payment')}: ${paid == null ? '—' : paid === 0 ? t('Aaj') : t('{{paid}} din', { paid })}`}
                trailing={(
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text weight="bold" tone={x.outstandingDue > 0 ? 'danger' : 'success'} ltr>{x.outstandingDue > 0 ? formatPKR(x.outstandingDue) : t('Saaf')}</Text>
                    <Text size="2xs" tone="muted">{t('dena hai')}</Text>
                  </View>
                )}
                disabled={false}
                onPress={() => router.push(`/suppliers/${x.id}` as never)}
                style={{ opacity: x.isActive ? 1 : 0.6, backgroundColor: th.colors.surface }}
              />
            </SwipeRow>
          );
        }}
        empty={tab === 'list' ? (
          <EmptyState icon={Users} title={t('Koi supplier nahi mila')}
            action={canEdit ? <Button icon={Plus} onPress={() => router.push('/suppliers/new' as never)}>{t('Naya supplier')}</Button> : undefined} />
        ) : <View />}
        fab={canEdit ? { icon: Plus, label: t('Naya supplier'), onPress: () => router.push('/suppliers/new' as never) } : undefined}
      />
      <Sheet open={filtersOpen} onClose={() => setFiltersOpen(false)} title={t('Filters')}
        footer={<Row gap={2}>
          <Button variant="secondary" style={{ flex: 1 }} onPress={() => { setDues('all'); setStatus('active'); setCity(''); setSort('due'); setSearch(''); }}>{t('Filter hatayein')}</Button>
          <Button style={{ flex: 1 }} onPress={() => setFiltersOpen(false)}>{t('Theek hai')}</Button>
        </Row>}>
        <View style={{ gap: th.space(3) }}>
          <Text size="sm" weight="semibold">{t('Halat')}</Text>
          <ChipGroup wrap value={status} onChange={(v) => setStatus(v as SupplierStatus)} options={[{ value: 'active', label: t('Chalu') }, { value: 'inactive', label: t('Band') }, { value: 'all', label: t('Sab') }]} />
          <Text size="sm" weight="semibold">{t('Sort')}</Text>
          <ChipGroup wrap value={sort} onChange={(v) => setSort(v as SupplierSort)}
            options={[{ value: 'due', label: t('Sab se zyada baqi') }, { value: 'recent', label: t('Haal hi me') }, { value: 'purchased', label: t('Sab se zyada purchase') }, { value: 'orders', label: t('Sab se zyada bill') }, { value: 'name', label: t('Naam (A–Z)') }]} />
          {(s?.cityBreakdown?.length ?? 0) > 1 && (
            <Select label={t('Shehar')} value={city} onChange={setCity}
              options={[{ value: '', label: t('Sab shehar') }, ...s!.cityBreakdown.map((c) => ({ value: c.city, label: `${c.city} (${c.count})` }))]} />
          )}
        </View>
      </Sheet>
      <SupplierMoneySheet supplier={paying} open={!!paying} onClose={() => setPaying(null)} />
    </>
  );
}
