/**
 * All purchases and orders: period, status (open orders, part received,
 * received, on credit, returned, cancelled), supplier and search, a page at
 * a time from the server with totals for the whole filter; analytics for
 * the period. Purchases saved on this phone and not sent yet show on top.
 * The last loaded list stays readable offline.
 */

import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { BarChart3, ClipboardList, CloudOff, ListChecks, PackageCheck, Plus, Printer, SlidersHorizontal, Users, Wheat } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { formatRelative } from '@/core/format';
import { t } from '@/core/i18n';
import { useCachedNotice, useOutbox } from '@/core/offline';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import {
  Badge, Button, ChipGroup, EmptyState, IconButton, ListRow, ListTemplate, Row, Segmented, Select, Sheet, StatTile, Text, useDebouncedValue, useTheme, Amount,
} from '@/design';
import { PUR, useCostMask } from '@/modules/inventory/lib/shared';
import { useShellUi } from '@/modules/shell/hooks/useShellUi';
import { purchasesApi, type PurchaseListQuery, type PurchaseListRow, type PurchaseStatusFilter } from '../api/purchases';
import { PurchaseAnalyticsView } from '../components/Analytics';
import { useSupplierPickerList } from '../components/SupplierPicker';
import { printDoc, purchasesListDoc } from '../lib/docs';
import { day, RANGE_PRESETS, rangeOf, STATUS, STATUS_FILTERS, type RangePreset } from '../lib/meta';

type Row = PurchaseListRow | { pending: true; id: string; title: string; amount: number | null; createdAt: number };

export function PurchasesScreen() {
  const th = useTheme();
  const can = usePermission();
  const { cost: money } = useCostMask();
  const [tab, setTab] = useState<'bills' | 'analytics'>('bills');
  const [preset, setPreset] = useState<RangePreset>('month');
  const [status, setStatus] = useState<PurchaseStatusFilter>('all');
  const [supplierId, setSupplierId] = useState('');
  const [search, setSearch] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const query = useDebouncedValue(search.trim(), 250);
  const period = rangeOf(preset);
  const q: PurchaseListQuery = { ...(period ?? {}), status, supplierId: supplierId || undefined, search: query || undefined, limit: 30 };

  const list = useInfiniteQuery({
    queryKey: [PUR, 'list', q],
    queryFn: ({ pageParam }) => purchasesApi.page({ ...q, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.page < last.pages ? last.page + 1 : undefined),
    placeholderData: (prev) => prev,
  });
  const summary = useQuery({ queryKey: [PUR, 'summary'], queryFn: purchasesApi.summary, staleTime: 60_000 });
  const suppliers = useSupplierPickerList();
  const cached = useCachedNotice(list);
  const { items: outbox } = useOutbox();
  const pending = useMemo(() => outbox.filter((o) => o.kind === 'purchase.create' && o.status !== 'done'), [outbox]);

  const first = list.data?.pages[0];
  const totals = first?.totals;
  const rows: Row[] = useMemo(() => [
    ...pending.map((o) => ({ pending: true as const, id: o.id, title: o.title, amount: o.amount, createdAt: o.createdAt })),
    ...(list.data?.pages.flatMap((p) => p.items) ?? []),
  ], [pending, list.data]);
  const s = summary.data;
  const filtered = status !== 'all' || !!supplierId;

  const summaryBlock = (
    <View style={{ gap: th.space(3) }}>
      {s && (
        <Row gap={2}>
          <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} label={t('Is mahine')} value={money(s.monthPurchases)} hint={t('{{monthCount}} bill', { monthCount: s.monthCount })} />
          <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} tone="danger" label={t('Suppliers ko dena')} value={money(s.outstandingDue)} hint={t('{{suppliersWithDue}} supplier', { suppliersWithDue: s.suppliersWithDue })}
            onPress={() => router.push('/suppliers' as never)} />
        </Row>
      )}
      {s && (s.openOrders ?? 0) > 0 && (
        <StatTile tone="info" icon={ClipboardList} label={t('Khule orders')} value={String(s.openOrders)} hint={s.openOrdersValue ? money(s.openOrdersValue) : undefined}
          onPress={() => { setTab('bills'); setStatus('PENDING'); }} />
      )}
      <Segmented value={tab} onChange={setTab} options={[{ value: 'bills', label: t('Bills'), icon: ListChecks }, { value: 'analytics', label: t('Analytics'), icon: BarChart3 }]} />
      <ChipGroup value={preset} onChange={setPreset} options={RANGE_PRESETS.filter((r) => tab === 'bills' || r.value !== 'all').map((r) => ({ value: r.value, label: t(r.label) }))}
        style={{ marginHorizontal: -th.space(4) }} />
      {tab === 'bills' && totals && (
        <Row gap={2}>
          <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} tone="success" icon={PackageCheck} label={t('Maal aaya')} value={money(totals.value)} hint={t('{{count}} bill', { count: first?.total ?? 0 })} />
          <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} tone="info" label={t('Diye')} value={money(totals.paid)}
            hint={totals.returned > 0 ? t('Wapas {{returned}}', { returned: money(totals.returned) }) : t('udhaar wale dekhein')} onPress={() => setStatus(status === 'credit' ? 'all' : 'credit')} />
        </Row>
      )}
      {cached.fromCache && cached.updatedAt && <Row gap={1.5}><CloudOff size={14} color={th.colors.textMuted} /><Text size="xs" tone="muted">{t('Last updated {{time}}', { time: formatRelative(cached.updatedAt) })}</Text></Row>}
      {tab === 'analytics' && <PurchaseAnalyticsView range={period} money={money} />}
    </View>
  );

  return (
    <>
      <ListTemplate<Row>
        title={t('Purchase')}
        actions={<Row gap={1}>
          <IconButton icon={Users} label={t('Suppliers')} onPress={() => router.push('/suppliers' as never)} />
          {tab === 'bills' && <IconButton icon={Printer} label={t('Print')} disabled={!rows.length}
            onPress={async () => printDoc(purchasesListDoc(await purchasesApi.page({ ...q, page: 1, limit: 200 }), period ? `${period.from} — ${period.to}` : t('Sab tareekhen')))} />}
          {tab === 'bills' && <IconButton icon={SlidersHorizontal} label={t('Filters')} badge={filtered} onPress={() => setFiltersOpen(true)} />}
        </Row>}
        search={tab === 'bills' ? { value: search, onChange: setSearch, placeholder: t('Bill #, supplier ya cheez…') } : undefined}
        filters={tab === 'bills' ? { value: status, onChange: (v) => setStatus(v as PurchaseStatusFilter), options: STATUS_FILTERS.map((o) => ({ value: o.value, label: t(o.label) })) } : undefined}
        summary={summaryBlock}
        data={tab === 'bills' ? rows : []}
        loading={tab === 'bills' && list.isLoading}
        error={tab === 'bills' && !first ? list.error : undefined}
        onRetry={list.refetch}
        refreshing={list.isRefetching && !list.isFetchingNextPage}
        onRefresh={() => { void list.refetch(); void summary.refetch(); }}
        onEndReached={() => { if (list.hasNextPage && !list.isFetchingNextPage) void list.fetchNextPage(); }}
        keyExtractor={(r) => r.id}
        renderItem={({ item: r }) => ('pending' in r ? (
          <ListRow icon={CloudOff} iconTone="warning" title={r.title} subtitle={t('Phone par save hai — internet aane par bhej diya jayega')}
            trailing={r.amount != null ? <Amount value={r.amount} weight="bold" /> : undefined} onPress={() => useShellUi.getState().open('sync')} />
        ) : <PurchaseRow p={r} money={money} />)}
        empty={tab === 'bills' ? (
          <EmptyState icon={PackageCheck} title={t('Is filter me koi purchase nahi')} message={t('Period ya filter badlein, ya nayi purchase karein')}
            action={can(P.PURCHASES_CREATE) ? <Button icon={Plus} onPress={() => router.push('/purchases/new' as never)}>{t('Nayi purchase')}</Button> : undefined} />
        ) : <View />}
        fab={can(P.PURCHASES_CREATE) ? { icon: Plus, label: t('Nayi purchase'), onPress: () => router.push('/purchases/new' as never) } : undefined}
      />
      <Sheet open={filtersOpen} onClose={() => setFiltersOpen(false)} title={t('Filters')}
        footer={<Row gap={2}>
          <Button variant="secondary" style={{ flex: 1 }} onPress={() => { setStatus('all'); setSupplierId(''); setSearch(''); }}>{t('Filter hatayein')}</Button>
          <Button style={{ flex: 1 }} onPress={() => setFiltersOpen(false)}>{t('Theek hai')}</Button>
        </Row>}>
        <View style={{ gap: th.space(3) }}>
          <Select label={t('Supplier')} value={supplierId} onChange={setSupplierId} searchable
            options={[{ value: '', label: t('Sab suppliers') }, ...(suppliers.data?.items ?? []).map((x) => ({ value: x.id, label: x.name }))]} />
          {can(P.PURCHASES_CREATE) && <Button variant="soft" icon={ClipboardList} onPress={() => { setFiltersOpen(false); router.push('/purchases/new?order=1' as never); }}>{t('Order')}</Button>}
        </View>
      </Sheet>
    </>
  );
}

function PurchaseRow({ p, money }: { p: PurchaseListRow; money: (n: number) => string }) {
  const st = STATUS[p.status];
  const value = p.status === 'PENDING' ? p.total : p.receivedValue;
  const credit = Math.max(p.receivedValue - p.paidAmount, 0);
  const raw = p.items.some((i) => i.ingredientId);
  const first = p.items.slice(0, 2).map((i) => `${Number(i.quantity.toFixed(2))} ${i.unitName} ${i.itemName}`).join(' · ');
  return (
    <ListRow
      title={<Row gap={1.5} wrap><Text weight="semibold" numberOfLines={1}>{p.supplier.name}</Text><Badge tone={st.tone}>{t(st.label)}</Badge>{raw && <Badge tone="warning" icon={Wheat}>{t('Raw')}</Badge>}</Row>}
      subtitle={`${first}${p.items.length > 2 ? ` +${p.items.length - 2}` : ''}\n${p.purchaseNumber} · ${day(p.purchasedAt)}${p.shop?.name ? ` · ${p.shop.name}` : ''}${p.status === 'PENDING' && p.expectedAt ? t(' · aana hai {{value}}', { value: day(p.expectedAt) }) : ''}`}
      trailing={(
        <View style={{ alignItems: 'flex-end', gap: 2 }}>
          <Text weight="bold" ltr>{money(value)}</Text>
          {p.status !== 'PENDING' && p.status !== 'CANCELLED' && (
            <Text size="xs" tone={credit > 0 ? 'danger' : 'success'}>{credit > 0 ? t('Udhaar {{credit}}', { credit: money(credit) }) : t('Poora diya')}</Text>
          )}
          {p.returnedAmount > 0 && <Text size="2xs" tone="warning">{t('Return {{returnedAmount}}', { returnedAmount: money(p.returnedAmount) })}</Text>}
        </View>
      )}
      chevron
      onPress={() => router.push(`/purchases/${p.id}` as never)}
    />
  );
}
