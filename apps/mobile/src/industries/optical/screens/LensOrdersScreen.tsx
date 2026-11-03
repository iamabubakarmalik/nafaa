/**
 * Glasses and repair orders (web LensOrdersPage): the desk from advance to
 * lab to ready to handed over, views, money to collect and lab performance.
 * Swipe a row for the next step, hand-over, payment or WhatsApp. Orders need
 * the server; the last loaded lists stay readable offline.
 */

import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { AlarmClock, BarChart3, CheckCircle2, FlaskConical, Glasses, ListChecks, MessageCircle, Plus, Printer, Wallet, Wrench, XCircle } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { daysFrom, isOrderClosed, isOrderReady, nextOrderStep, REPAIR } from '@nafaa/core/industries/optical';
import { formatMoney } from '@/core/format';
import { msg, t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { useBillLanguage } from '@/core/receipt';
import { Amount, Badge, Card, ChipGroup, EmptyState, HBarList, IconButton, ListRow, ListTemplate, Row, Segmented, SkeletonRows, StatTile, SwipeRow, Text, useDebouncedValue, useTheme, type SwipeAction } from '@/design';
import { openWhatsApp } from '@/modules/customers/lib/contact';
import { printDoc } from '@/modules/purchasing/lib/docs';
import { CachedNote } from '@/modules/sales/components/CachedNote';
import { useCostMask } from '@/modules/sales/lib/mask';
import { lensOrdersApi, type LensOrderPage, type LensOrderView, type OpticalLensOrder } from '../api';
import { OrderDialogs, useOrderActions, type OrderDialog } from '../components/OrderSheets';
import { Pill } from '../components/parts';
import { labDoc, orderDoc } from '../docs';
import { usePaged } from '../hooks';
import { OPTICAL_KEYS, dayOnly, orderStatusOf, orderText, stepLabel } from '../meta';

type Tab = 'orders' | 'analytics';

const VIEWS: Array<{ value: LensOrderView; label: string }> = [
  { value: 'open', label: msg('Chal rahe') }, { value: 'lab', label: msg('Lab me') }, { value: 'ready', label: msg('Tayyar') }, { value: 'late', label: msg('Late') },
  { value: 'unpaid', label: msg('Paisa baqi') }, { value: 'repairs', label: msg('Repair') }, { value: 'delivered', label: msg('De diye') }, { value: 'cancelled', label: msg('Cancel') }, { value: 'all', label: msg('Sab') },
];

export function LensOrdersScreen() {
  const th = useTheme();
  const can = usePermission();
  const lang = useBillLanguage();
  const { cost } = useCostMask();
  const canBill = can(P.POS_USE);
  const params = useLocalSearchParams<{ view?: string }>();
  const [tab, setTab] = useState<Tab>('orders');
  const [view, setView] = useState<LensOrderView>((params.view as LensOrderView) || 'open');
  const [search, setSearch] = useState('');
  const [dialog, setDialog] = useState<OrderDialog>(null);
  const q = useDebouncedValue(search.trim(), 250);
  const actions = useOrderActions(() => setDialog(null));
  useEffect(() => { if (params.view) { setTab('orders'); setView(params.view as LensOrderView); } }, [params.view]);

  const query = { view, search: q || undefined };
  const { q: list, rows, first, more } = usePaged<OpticalLensOrder, LensOrderPage>([OPTICAL_KEYS.orders, 'page', query], (page) => lensOrdersApi.page({ ...query, page, limit: 30 }), tab === 'orders');
  const sum = useQuery({ queryKey: [OPTICAL_KEYS.orders, 'summary'], queryFn: lensOrdersApi.summary, refetchInterval: 60_000 });
  const s = sum.data;
  const pick = (v: LensOrderView) => { setTab('orders'); setView(v); };

  const swipe = (o: OpticalLensOrder): SwipeAction[] => {
    const repair = o.lensType === REPAIR;
    const closed = isOrderClosed(o.status);
    const next = nextOrderStep(o.status, repair);
    const out: SwipeAction[] = [];
    if (canBill && !closed && next) {
      out.push({ icon: FlaskConical, label: stepLabel(next.step), tone: 'brand', onPress: () => (next.to === 'SENT_TO_LAB' ? setDialog({ kind: 'lab', order: o }) : actions.step.mutate({ o, status: next.to })) });
    }
    if (canBill && !closed && isOrderReady(o.status)) out.push({ icon: CheckCircle2, label: t('De diya'), tone: 'success', onPress: () => setDialog({ kind: 'deliver', order: o }) });
    if (canBill && !closed && o.remainingAmount > 0.009) out.push({ icon: Wallet, label: t('Payment'), tone: 'info', onPress: () => setDialog({ kind: 'pay', order: o }) });
    if (!closed) out.push({ icon: MessageCircle, label: t('WhatsApp'), tone: 'success', onPress: () => { openWhatsApp(o.customerPhone, orderText(o, repair, formatMoney(o.remainingAmount), lang)); } });
    out.push({ icon: Printer, label: t('Parchi'), tone: 'neutral', onPress: () => void printDoc(orderDoc(o, repair)) });
    if (!repair) out.push({ icon: FlaskConical, label: t('Lab parchi'), tone: 'neutral', onPress: () => void printDoc(labDoc(o)) });
    if (canBill && !closed) out.push({ icon: XCircle, label: t('Cancel'), tone: 'danger', onPress: () => setDialog({ kind: 'cancel', order: o }) });
    return out;
  };

  const header = (
    <View style={{ gap: th.space(3) }}>
      <Segmented value={tab} onChange={setTab} options={[{ value: 'orders', label: t('Orders'), icon: ListChecks }, { value: 'analytics', label: t('Analytics'), icon: BarChart3 }]} />
      <Row gap={2}>
        <StatTile style={{ flex: 1 }} icon={FlaskConical} tone="info" label={t('Lab me')} loading={!s} value={String(s?.atLab ?? 0)} hint={s?.dueToday ? t('{{dueToday}} aaj aane hain', { dueToday: s.dueToday }) : undefined} onPress={() => pick('lab')} />
        <StatTile style={{ flex: 1 }} icon={CheckCircle2} tone="success" label={t('Tayyar')} loading={!s} value={String((s?.received ?? 0) + (s?.ready ?? 0))} hint={t('Customer ko bulayein')} onPress={() => pick('ready')} />
      </Row>
      <Row gap={2}>
        <StatTile style={{ flex: 1 }} icon={AlarmClock} tone={s?.overdue ? 'danger' : 'neutral'} label={t('Late')} loading={!s} value={String(s?.overdue ?? 0)} hint={t('Date guzar gayi')} onPress={() => pick('late')} />
        <StatTile style={{ flex: 1 }} icon={Wallet} tone="warning" label={t('Lena baqi')} loading={!s} value={<Amount value={s?.totalReceivable ?? 0} size="lg" weight="bold" compact />} hint={t('Repair chal rahi: {{count}}', { count: s?.repairsOpen ?? 0 })} onPress={() => pick('unpaid')} />
      </Row>
      {tab === 'orders' && (
        <>
          <ChipGroup value={view} onChange={setView} style={{ marginHorizontal: -th.space(4) }} options={VIEWS.map((v) => ({ value: v.value, label: t(v.label) }))} />
          {first && first.total > 0 && <Text size="sm" tone="secondary">{t('Is list me: kul {{value}} · baqi {{due}}', { value: cost(first.totals.value), due: cost(first.totals.due) })}</Text>}
          <CachedNote query={list} />
        </>
      )}
      {tab === 'analytics' && <Analytics />}
    </View>
  );

  return (
    <>
      <ListTemplate<OpticalLensOrder>
        title={t('Chashma orders')} subtitle={t('Advance → lab → tayyar → customer ko diya')}
        grouped={false}
        actions={canBill ? <IconButton icon={Wrench} label={t('Repair')} onPress={() => router.push('/optical/lens-orders/new?type=repair' as never)} /> : undefined}
        search={tab === 'orders' ? { value: search, onChange: setSearch, placeholder: t('Order number, customer, mobile, frame ya lab…') } : undefined}
        summary={header}
        data={tab === 'orders' ? rows : []}
        loading={tab === 'orders' && list.isLoading}
        error={tab === 'orders' && !list.data ? list.error : undefined}
        onRetry={() => void list.refetch()}
        refreshing={list.isRefetching && !list.isFetchingNextPage}
        onRefresh={() => { void list.refetch(); void sum.refetch(); }}
        onEndReached={more}
        keyExtractor={(o) => o.id}
        renderItem={({ item: o }) => {
          const repair = o.lensType === REPAIR;
          const closed = isOrderClosed(o.status);
          const days = daysFrom(o.expectedDate);
          const late = days != null && days < 0 && !closed;
          return (
            <View style={{ marginHorizontal: th.space(4), marginBottom: th.space(2), borderRadius: th.radius('xl'), overflow: 'hidden', backgroundColor: th.colors.surface, borderWidth: th.isDark ? 1 : 0.5, borderColor: th.colors.border }}>
              <SwipeRow end={swipe(o)}>
                <ListRow
                  overline={`${o.orderNumber} · ${dayOnly(o.orderedAt)}`}
                  title={o.customerName}
                  subtitle={`${o.frameName} · ${repair ? t('Repair') : [o.lensType, o.lensIndex].filter(Boolean).map((x) => t(x as string)).join(' · ')}`}
                  trailing={(
                    <View style={{ alignItems: 'flex-end', gap: 4 }}>
                      <Pill meta={orderStatusOf(o.status)} />
                      <Amount value={o.totalPrice} size="sm" weight="semibold" />
                      {o.remainingAmount > 0.009 && o.status !== 'CANCELLED' ? <Text size="2xs" weight="semibold" tone="warning">{t('{{remainingAmount}} baqi', { remainingAmount: formatMoney(o.remainingAmount) })}</Text> : null}
                    </View>
                  )}
                  chevron onPress={() => router.push(`/optical/lens-orders/${o.id}` as never)} />
              </SwipeRow>
              {(o.labName || o.expectedDate || repair) && (
                <View style={{ flexDirection: 'row', gap: th.space(2), paddingHorizontal: th.space(4), paddingBottom: th.space(2.5), flexWrap: 'wrap' }}>
                  {repair && <Badge tone="warning">{t('Repair')}</Badge>}
                  {o.labName ? <Badge tone="neutral">{o.labName}</Badge> : null}
                  {o.expectedDate ? <Badge tone={late ? 'danger' : 'neutral'}>{closed ? dayOnly(o.expectedDate) : days === 0 ? t('Aaj') : late ? t('{{value}} din late', { value: -(days as number) }) : dayOnly(o.expectedDate)}</Badge> : null}
                </View>
              )}
            </View>
          );
        }}
        empty={tab === 'orders' ? <EmptyState icon={Glasses} title={q ? t('"{{q}}" se koi order nahi mila', { q }) : t('Is list me koi order nahi')} message={t('Naya order banayein — advance, lab aur pickup sab yahin se.')} /> : undefined}
        fab={canBill ? { icon: Plus, label: t('Naya order'), onPress: () => router.push('/optical/lens-orders/new' as never) } : undefined}
      />
      <OrderDialogs dialog={dialog} close={() => setDialog(null)} actions={actions} />
    </>
  );
}

function Analytics() {
  const th = useTheme();
  const { cost } = useCostMask();
  const labs = useQuery({ queryKey: [OPTICAL_KEYS.orders, 'labs'], queryFn: lensOrdersApi.labPerformance });
  const sum = useQuery({ queryKey: [OPTICAL_KEYS.orders, 'summary'], queryFn: lensOrdersApi.summary });
  const s = sum.data;
  const rows = s ? [
    { key: 'o', label: t('Naye'), value: s.ordered }, { key: 'l', label: t('Lab me'), value: s.atLab }, { key: 'r', label: t('Lab se aaye'), value: s.received },
    { key: 't', label: t('Tayyar'), value: s.ready }, { key: 'x', label: t('Late'), value: s.overdue },
  ] : [];
  return (
    <View style={{ gap: th.space(3) }}>
      <Card title={t('Orders kahan hain')} description={s ? t('Is mahine {{monthlyOrders}} order · {{monthlyValue}}', { monthlyOrders: s.monthlyOrders, monthlyValue: cost(s.monthlyValue) }) : undefined}>
        {sum.isLoading ? <SkeletonRows count={3} /> : <HBarList colorful rows={rows} />}
      </Card>
      <Card flush title={t('Labs')} description={t('Kitne order, kitne din me wapas, kitne late')}>
        {labs.isLoading ? <SkeletonRows count={2} /> : !labs.data?.length ? <Text tone="muted" style={{ padding: th.space(4) }}>{t('Abhi kisi lab ko order nahi gaya')}</Text> : labs.data.map((l, i) => (
          <ListRow key={l.labName} dense divider={i < labs.data!.length - 1} title={l.labName}
            subtitle={t('{{count}} order · ausat {{days}} din · waqt par {{pct}}%', { count: l.totalOrders, days: l.avgTurnaroundDays, pct: l.onTimePct })}
            trailing={<View style={{ alignItems: 'flex-end' }}><Text size="sm" weight="semibold" ltr>{cost(l.lensRevenue)}</Text>{l.lateDeliveries ? <Text size="2xs" tone="danger">{t('{{count}} late', { count: l.lateDeliveries })}</Text> : null}</View>} />
        ))}
      </Card>
    </View>
  );
}
