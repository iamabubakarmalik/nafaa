/**
 * Custom orders (web CustomOrdersPage): furniture made to order. Quotation,
 * advance, karigar, ready, delivery. Advances go on the customer's khata the
 * day they come in; the order's bill is made when the furniture leaves the
 * shop. Orders are cancelled, never deleted.
 */

import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { AlertTriangle, ClipboardList, FileText, Hammer, PackageCheck, Plus, Truck, Wallet } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { daysTo } from '@nafaa/core/industries/furniture';
import { formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { Amount, Badge, Card, ChipGroup, EmptyState, HBarList, IconButton, ListRow, ListTemplate, ProgressBar, Text, useTheme } from '@/design';
import { usePaged } from '@/modules/inventory/stock/usePaged';
import { CachedNote } from '@/modules/sales/components/CachedNote';
import { OfflineNote, useDeskOnline } from '../../_shared/deskKit';
import { Meta, RowCard, StatGrid, dueText } from '../../_shared/trade/kit';
import { customOrdersApi, type FurnitureCustomOrder } from '../api';
import { BILLED_ORDER, FURNITURE_KEYS, OPEN_ORDER, orderStatus, orderTotal } from '../meta';
import { formatDate } from '@/core/format';

type Tab = 'open' | 'quotes' | 'making' | 'ready' | 'done' | 'cancelled' | 'all' | 'analytics';
const LIMIT = 25;
const TAB_STATUS: Record<Tab, string | undefined> = {
  open: OPEN_ORDER.join(','), quotes: 'QUOTATION', making: 'DEPOSIT_PAID,IN_PRODUCTION', ready: 'READY_FOR_DELIVERY',
  done: ['OUT_FOR_DELIVERY', ...BILLED_ORDER].join(','), cancelled: 'CANCELLED,REFUNDED', all: undefined, analytics: undefined,
};

export function CustomOrdersScreen() {
  const th = useTheme();
  const can = usePermission();
  const { guard } = useDeskOnline('furnitureDesk');
  const [tab, setTab] = useState<Tab>('open');
  const [search, setSearch] = useState('');
  const params = { status: TAB_STATUS[tab], search: search.trim() || undefined, limit: LIMIT };
  const list = usePaged([FURNITURE_KEYS.orders, 'page', params], (page) => customOrdersApi.page({ ...params, page }).then((r) => ({ items: r.items, page: r.page, pages: Math.max(Math.ceil(r.total / LIMIT), 1) })), tab !== 'analytics');
  const sum = useQuery({ queryKey: [FURNITURE_KEYS.orders, 'summary'], queryFn: () => customOrdersApi.summary() });
  const all = useQuery({ queryKey: [FURNITURE_KEYS.orders, 'analytics'], queryFn: () => customOrdersApi.page({ page: 1, limit: 200 }), enabled: tab === 'analytics' });
  const s = sum.data;
  const canCreate = can(P.SERVICE_JOBS_MANAGE);

  const analytics = useMemo(() => {
    const items = (all.data?.items ?? []).filter((o) => o.status !== 'CANCELLED' && o.status !== 'REFUNDED');
    const group = (key: (o: FurnitureCustomOrder) => string) => {
      const m = new Map<string, { count: number; value: number }>();
      for (const o of items) { const k = key(o); const x = m.get(k) ?? { count: 0, value: 0 }; x.count += 1; x.value += orderTotal(o); m.set(k, x); }
      return [...m.entries()].map(([k, v]) => ({ key: k, ...v })).sort((a, b) => b.value - a.value).slice(0, 10);
    };
    return { byItem: group((o) => o.productType), byCarpenter: group((o) => o.carpenterName || t('Karigar nahi')), byWood: group((o) => o.woodType || t('Likha nahi')) };
  }, [all.data]);

  const tabs: Array<{ value: Tab; label: string; n?: number | null }> = [
    { value: 'open', label: t('Chal rahe') }, { value: 'quotes', label: t('Quotation'), n: s?.quotation }, { value: 'making', label: t('Ban rahe') }, { value: 'ready', label: t('Tayyar'), n: s?.ready },
    { value: 'done', label: t('De diye') }, { value: 'cancelled', label: t('Cancel') }, { value: 'all', label: t('Sab') }, { value: 'analytics', label: t('Analytics') },
  ];

  const bars = (title: string, rows: Array<{ key: string; count: number; value: number }>) => (
    <Card title={title}><HBarList colorful rows={rows.map((r) => ({ key: r.key, label: r.key, value: r.value, display: <Text size="xs" tone="muted">{`${r.count} · ${formatMoney(r.value)}`}</Text> }))} /></Card>
  );

  const summary = (
    <View style={{ gap: th.space(3) }}>
      <StatGrid items={[
        { icon: FileText, tone: 'info', label: t('Quotation'), loading: sum.isLoading, value: String(s?.quotation ?? 0), hint: t('Advance ka intezar'), onPress: () => setTab('quotes') },
        { icon: Hammer, tone: 'warning', label: t('Ban rahe'), loading: sum.isLoading, value: String((s?.deposit ?? 0) + (s?.production ?? 0)), hint: s?.late ? t('{{late}} late', { late: s.late }) : t('Sab waqt par'), onPress: () => setTab('making') },
        { icon: PackageCheck, tone: 'success', label: t('Tayyar'), loading: sum.isLoading, value: String(s?.ready ?? 0), hint: t('Delivery bhejein'), onPress: () => setTab('ready') },
        { icon: Wallet, tone: 'accent', label: t('Advance / wusooli'), loading: sum.isLoading, value: formatMoney(s?.totalCollected ?? 0), hint: t('{{value}} baqi', { value: formatMoney(s?.totalReceivable ?? 0) }) },
      ]} />
      <OfflineNote feature="furnitureDesk" />
      <CachedNote query={sum} />
      <ChipGroup value={tab} onChange={(v) => setTab(v as Tab)} style={{ marginHorizontal: -th.space(4) }} options={tabs.map((x) => ({ value: x.value, label: x.n ? `${x.label} · ${x.n}` : x.label }))} />
      {tab === 'analytics' && (all.isLoading ? null : (
        <View style={{ gap: th.space(3) }}>
          {bars(t('Kya zyada banwaya'), analytics.byItem)}
          {bars(t('Karigar (kaam ki qeemat)'), analytics.byCarpenter)}
          {bars(t('Lakri'), analytics.byWood)}
        </View>
      ))}
    </View>
  );

  return (
    <ListTemplate<FurnitureCustomOrder>
      title={t('Custom orders')}
      subtitle={t('Quotation se delivery tak — advance, karigar aur baqi paisa')}
      grouped={false}
      actions={<IconButton icon={Truck} label={t('Deliveries')} onPress={() => router.push('/furniture/deliveries' as never)} />}
      search={tab !== 'analytics' ? { value: search, onChange: setSearch, placeholder: t('Order, customer, phone, cheez ya karigar…') } : undefined}
      summary={summary}
      data={tab === 'analytics' ? [] : list.items}
      loading={tab !== 'analytics' && list.loading}
      error={tab !== 'analytics' ? list.error : undefined}
      onRetry={list.refetch}
      refreshing={list.refreshing}
      onRefresh={() => { list.refetch(); void sum.refetch(); }}
      onEndReached={list.loadMore}
      keyExtractor={(o) => o.id}
      renderItem={({ item: o }) => {
        const st = orderStatus(o.status);
        const late = OPEN_ORDER.includes(o.status) && (daysTo(o.expectedDeliveryDate) ?? 0) < 0;
        const due = OPEN_ORDER.includes(o.status) ? dueText(daysTo(o.expectedDeliveryDate)) : null;
        return (
          <RowCard>
            <ListRow
              title={<Text weight="semibold" numberOfLines={1}>{o.productType}</Text>}
              subtitle={<View style={{ gap: 3 }}>
                <Meta parts={[o.orderNumber, o.customerName, o.customerPhone, o.woodType, o.carpenterName ? t('Karigar {{carpenterName}}', { carpenterName: o.carpenterName }) : null]} />
                {(o.status === 'IN_PRODUCTION' || o.status === 'DEPOSIT_PAID') && <ProgressBar value={Math.max(o.progressPct, 3) / 100} tone="warning" />}
                <Text size="xs" tone={due?.tone === 'muted' ? 'muted' : due?.tone ?? 'muted'}>{[o.expectedDeliveryDate ? formatDate(o.expectedDeliveryDate) : null, due?.text].filter(Boolean).join(' · ')}</Text>
              </View>}
              trailing={<View style={{ alignItems: 'flex-end', gap: 3 }}>
                <Amount value={orderTotal(o)} weight="bold" size="sm" />
                <Text size="2xs" tone={o.balanceAmount > 0 ? 'warning' : 'success'}>{o.balanceAmount > 0 ? t('{{balanceAmount}} baqi', { balanceAmount: formatMoney(o.balanceAmount) }) : t('Poora mila')}</Text>
                <View style={{ flexDirection: 'row', gap: 4, alignItems: 'center' }}>{late ? <AlertTriangle size={14} color={th.colors.danger.text} /> : null}<Badge tone={st.tone}>{t(st.label)}</Badge></View>
              </View>}
              chevron
              onPress={() => router.push(`/furniture/custom-orders/${o.id}` as never)}
            />
          </RowCard>
        );
      }}
      empty={tab === 'analytics' ? undefined : <EmptyState icon={ClipboardList} title={t('Is filter me koi order nahi')} message={t('Bed, sofa ya almari order par banani ho to naya order banayein.')} />}
      fab={canCreate ? { icon: Plus, label: t('Order'), onPress: () => guard(() => router.push('/furniture/custom-orders/new' as never)) } : undefined}
    />
  );
}
