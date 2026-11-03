/**
 * Cake orders (web CakeOrdersPage): due today and tomorrow, late, ready and
 * money to collect; the record by view with search, delivery, occasion and
 * sort; the week ahead by day; and analytics. Swipe a row for the next step,
 * money, cancel or WhatsApp. Orders need the server; the last loaded lists
 * stay readable offline.
 */

import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { AlertTriangle, ArrowDownWideNarrow, BarChart3, Cake, CalendarDays, CheckCircle2, Clock, ListChecks, Plus, ShoppingBag, SlidersHorizontal, Wallet } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { useAuthStore } from '@/core/auth/store';
import { formatMoney } from '@/core/format';
import { msg, t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { useBillLanguage } from '@/core/receipt';
import { Amount, ChipGroup, EmptyState, IconButton, ListRow, ListTemplate, Row, Segmented, Select, Sheet, StatTile, Text, useDebouncedValue, useTheme } from '@/design';
import { openWhatsApp } from '@/modules/customers/lib/contact';
import { CachedNote } from '@/modules/sales/components/CachedNote';
import { PERIOD_PRESETS, usePeriod } from '@/modules/sales/lib/period';
import { cakeOrdersApi, type CakeOrder, type CakeOrderQuery, type CakeOrderView } from '../api';
import { CakeAnalytics, CakeOrderRow, CakeWeek } from '../components/CakeViews';
import { useCakeActions } from '../components/useOrderActions';
import { CAKE_KEY, DELIVERY, OCCASIONS, cakeText } from '../meta';

type Tab = 'orders' | 'week' | 'analytics';
type Sort = NonNullable<CakeOrderQuery['sort']>;

const VIEWS: Array<{ value: CakeOrderView; label: string }> = [
  { value: 'active', label: msg('Chal rahe') }, { value: 'today', label: msg('Aaj dena hai') }, { value: 'tomorrow', label: msg('Kal dena hai') },
  { value: 'late', label: msg('Late') }, { value: 'ready', label: msg('Tayyar / raaste me') }, { value: 'unpaid', label: msg('Paisa baqi') },
  { value: 'done', label: msg('De diye / cancel') }, { value: 'all', label: msg('Sab') },
];

export function CakeOrdersScreen() {
  const th = useTheme();
  const can = usePermission();
  const lang = useBillLanguage();
  const shop = useAuthStore((s) => s.tenant?.name) ?? t('Bakery');
  const canManage = can(P.BAKERY_ORDERS_MANAGE);
  const act = useCakeActions();
  const [tab, setTab] = useState<Tab>('orders');
  const [view, setView] = useState<CakeOrderView>('active');
  const [delivery, setDelivery] = useState('');
  const [occasion, setOccasion] = useState('');
  const [sort, setSort] = useState<Sort>('due');
  const [filters, setFilters] = useState(false);
  const { q: openWith } = useLocalSearchParams<{ q?: string }>();
  const [search, setSearch] = useState(openWith ?? '');
  const query = useDebouncedValue(search.trim(), 250);
  const due = usePeriod('all');
  const an = usePeriod('month');

  const q: CakeOrderQuery = {
    view, sort, search: query || undefined, deliveryType: delivery || undefined, occasion: occasion || undefined,
    ...(due.period.from !== 'all' ? { from: due.period.from, to: due.period.to } : {}),
  };
  const list = useInfiniteQuery({
    queryKey: [CAKE_KEY, 'page', q],
    queryFn: ({ pageParam }) => cakeOrdersApi.page({ ...q, page: pageParam, limit: 30 }),
    initialPageParam: 1,
    getNextPageParam: (l) => (l.page < l.pages ? l.page + 1 : undefined),
    placeholderData: (p) => p,
    refetchInterval: 60_000,
    enabled: tab === 'orders',
  });
  const sum = useQuery({ queryKey: [CAKE_KEY, 'summary', 'open'], queryFn: () => cakeOrdersApi.summary(), refetchInterval: 60_000 });
  const open = sum.data?.open;
  const rows = list.data?.pages.flatMap((p) => p.items) ?? [];
  const first = list.data?.pages[0];
  const pick = (v: CakeOrderView) => { setTab('orders'); setView(v); };
  const filtered = !!delivery || !!occasion || due.preset !== 'all';

  const header = (
    <View style={{ gap: th.space(3) }}>
      <Segmented value={tab} onChange={setTab} options={[{ value: 'orders', label: t('Orders'), icon: ListChecks }, { value: 'week', label: t('Hafta'), icon: CalendarDays }, { value: 'analytics', label: t('Analytics'), icon: BarChart3 }]} />
      <Row gap={2}>
        <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} icon={Clock} tone="warning" label={t('Aaj dena hai')} loading={!open} value={String(open?.today ?? 0)} hint={t('Kal {{tomorrow}}', { tomorrow: open?.tomorrow ?? 0 })} onPress={() => pick('today')} />
        <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} icon={AlertTriangle} tone={open?.late ? 'danger' : 'neutral'} label={t('Late')} loading={!open} value={String(open?.late ?? 0)} hint={open?.late ? t('Customer ko foran batayein') : t('Koi late nahi')} onPress={() => pick('late')} />
      </Row>
      <Row gap={2}>
        <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} icon={CheckCircle2} tone="success" label={t('Tayyar')} loading={!open} value={String(open?.ready ?? 0)} hint={t('Dene ke liye')} onPress={() => pick('ready')} />
        <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} icon={Wallet} tone={open?.advanceShort ? 'danger' : 'info'} label={t('Lena baqi')} loading={!open} value={<Amount value={open?.due ?? 0} size="lg" weight="bold" compact />}
          hint={open?.advanceShort ? t('{{advanceShort}} ka advance adhoora', { advanceShort: open.advanceShort }) : t('{{unpaid}} orders par', { unpaid: open?.unpaid ?? 0 })} onPress={() => pick('unpaid')} />
      </Row>
      {tab === 'orders' && (
        <>
          <ChipGroup value={view} onChange={setView} style={{ marginHorizontal: -th.space(4) }}
            options={VIEWS.map((v) => ({ value: v.value, label: t(v.label), count: first?.counts?.[v.value] }))} />
          {first?.totals && first.total > 0 && (
            <Text size="sm" tone="secondary">{t('{{total}} orders · {{sales}}', { total: first.total, sales: formatMoney(first.totals.value) })}{first.totals.due > 0 ? ` · ${t('Lena baqi {{due}}', { due: formatMoney(first.totals.due) })}` : ''}</Text>
          )}
          <CachedNote query={list} />
        </>
      )}
      {tab === 'week' && <><Text size="sm" tone="muted">{t('Agle 7 din — har din ke cake waqt ke hisaab se. Card par click karein to order khulega.')}</Text><CakeWeek startHour={due.startHour} /></>}
      {tab === 'analytics' && (
        <>
          <ChipGroup value={an.preset} onChange={(v) => an.setPreset(v as typeof an.preset)} style={{ marginHorizontal: -th.space(4) }} options={PERIOD_PRESETS.filter((p) => p.value !== 'all').map((p) => ({ value: p.value, label: t(p.label) }))} />
          <CakeAnalytics period={an.period} sales={(n) => formatMoney(n)} />
        </>
      )}
    </View>
  );

  return (
    <>
      <ListTemplate<CakeOrder>
        title={t('Cake orders')}
        grouped={false}
        actions={<Row gap={1}>
          <IconButton icon={ShoppingBag} label={t('Bare orders')} onPress={() => router.push('/bakery/bulk-orders' as never)} />
          {tab === 'orders' && <IconButton icon={SlidersHorizontal} label={t('Filters')} badge={filtered ? 1 : undefined} onPress={() => setFilters(true)} />}
        </Row>}
        search={tab === 'orders' ? { value: search, onChange: setSearch, placeholder: t('Customer, phone, order #, cake par likha…') } : undefined}
        summary={header}
        data={tab === 'orders' ? rows : []}
        loading={tab === 'orders' && list.isLoading}
        error={tab === 'orders' && !list.data ? list.error : undefined}
        onRetry={() => void list.refetch()}
        refreshing={list.isRefetching && !list.isFetchingNextPage}
        onRefresh={() => { void list.refetch(); void sum.refetch(); }}
        onEndReached={() => { if (list.hasNextPage && !list.isFetchingNextPage) void list.fetchNextPage(); }}
        keyExtractor={(o) => o.id}
        renderItem={({ item }) => (
          <View style={{ marginHorizontal: th.space(4), marginBottom: th.space(2), borderRadius: th.radius('xl'), overflow: 'hidden', backgroundColor: th.colors.surface, borderWidth: th.isDark ? 1 : 0.5, borderColor: th.colors.border }}>
            <CakeOrderRow o={item} canManage={canManage} onNext={() => act.next(item)} onPay={() => act.pay(item)} onCancel={() => act.cancel(item)}
              onWhatsApp={() => openWhatsApp(item.customerPhone, cakeText(item, shop, lang))} />
          </View>
        )}
        empty={tab === 'orders' ? <EmptyState icon={Cake} title={filtered || query ? t('Is filter me koi order nahi') : view === 'late' ? t('Koi order late nahi — shabash') : view === 'today' ? t('Aaj koi cake nahi dena') : t('Koi order nahi')}
          message={t('Birthday ya shadi ka cake pehle se book karein — advance lein, parchi dein, waqt par yaad dilaye ga.')} /> : undefined}
        fab={canManage ? { icon: Plus, label: t('Naya order'), onPress: () => router.push('/bakery/cake-orders/new' as never) } : undefined}
      />
      {act.sheets}
      <Sheet open={filters} onClose={() => setFilters(false)} title={t('Filters')}>
        <View style={{ gap: th.space(3) }}>
          <Text size="sm" weight="semibold" tone="secondary">{t('Dene ki date')}</Text>
          <ChipGroup wrap value={due.preset} onChange={(v) => due.setPreset(v as typeof due.preset)} options={PERIOD_PRESETS.map((p) => ({ value: p.value, label: t(p.label) }))} />
          <Select label={t('Kaise dena')} value={delivery} onChange={setDelivery} options={[{ value: '', label: t('Sab') }, ...DELIVERY.map((d) => ({ value: d.id, label: t(d.label) }))]} />
          <Select label={t('Mauqa')} value={occasion} onChange={setOccasion} options={[{ value: '', label: t('Sab mauqe') }, ...OCCASIONS.map((o) => ({ value: o.value, label: `${o.emoji} ${t(o.label)}` }))]} />
          <Text size="sm" weight="semibold" tone="secondary">{t('Tarteeb')}</Text>
          <View>
            {([['due', msg('Jo pehle dena hai')], ['recent', msg('Naye book pehle')], ['amount', msg('Bari rakam pehle')]] as const).map(([v, l]) => (
              <ListRow key={v} icon={ArrowDownWideNarrow} title={t(l)} selected={sort === v} onPress={() => setSort(v)} />
            ))}
          </View>
          {filtered && <ListRow title={t('Filter saaf karein')} destructive onPress={() => { setDelivery(''); setOccasion(''); due.setPreset('all'); }} />}
        </View>
      </Sheet>
    </>
  );
}
