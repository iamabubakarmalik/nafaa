/**
 * Orders by weight (web WeightOrdersPage): a family's Eid order, a restaurant's
 * daily chicken, a home delivery. Views by step (open, today, ready, on the way,
 * done); each order moves on step by step, takes the weighed kg, an advance, the
 * bill at hand-over (split payment, the rest on khata), cancel and advance
 * refund, and shares a cutting slip. Analytics sums the open book.
 */

import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { AlertTriangle, ArrowRight, Ban, CalendarClock, Package, Pencil, Plus, Receipt, Scale, Share2, Truck, Undo2, Wallet } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Share, View } from 'react-native';
import { dueOf, isLateOrder, isOpenOrder, nextOrderStep, weighedTotal } from '@nafaa/core/industries/meat';
import { formatDateTime, formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { withManagerPin } from '@/core/security/ManagerPin';
import { Amount, Badge, Button, Card, ChipGroup, DetailRow, EmptyState, ListRow, ListTemplate, Row, Segmented, Sheet, Text, toast, useTheme } from '@/design';
import { NumberInput } from '@/modules/inventory/components/fields';
import { usePaged } from '@/modules/inventory/stock/usePaged';
import { useCostMask } from '@/modules/sales/lib/mask';
import { OfflineNote, PaySheet, errorText, useDeskOnline } from '../../_shared/deskKit';
import { ReasonSheet, RowCard, StatRow } from '../../_shared/farm/ui';
import { CheckoutSheet, RefundSheet } from '../components/MoneySheets';
import { weightOrdersApi, type OrderTab, type WeightOrder } from '../api';
import { MEAT_KEYS, ORDER_STATUS, STEP_LABEL, kg, refreshMeat } from '../meta';

const LIMIT = 25;
const TABS: Array<{ id: OrderTab; label: string }> = [
  { id: 'open', label: t('Chal rahe') }, { id: 'today', label: t('Aaj dene') }, { id: 'ready', label: t('Tayyar') }, { id: 'delivery', label: t('Delivery') },
  { id: 'delivered', label: t('De diye') }, { id: 'cancelled', label: t('Cancel') }, { id: 'all', label: t('Sab') },
];

export function WeightOrdersScreen() {
  const th = useTheme();
  const { tab: tabParam } = useLocalSearchParams<{ tab?: string }>();
  const can = usePermission();
  const { guard } = useDeskOnline('meatDesk');
  const { cost } = useCostMask();
  const [tab, setTab] = useState<OrderTab>('open');
  const [view, setView] = useState<'orders' | 'analytics'>('orders');
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  useEffect(() => { if (tabParam && TABS.some((x) => x.id === tabParam)) setTab(tabParam as OrderTab); }, [tabParam]);
  const params = { tab, search: search.trim() || undefined, limit: LIMIT };
  const list = usePaged([MEAT_KEYS.orders, 'page', params], (page) => weightOrdersApi.page({ ...params, page }).then((r) => ({ ...r, pages: Math.max(Math.ceil(r.total / LIMIT), 1) })));
  const first = list.first;
  const lateCount = list.items.filter((o) => isLateOrder(o)).length;

  const header = (
    <View style={{ gap: th.space(3) }}>
      <StatRow tiles={[
        { icon: Package, tone: 'info', label: t('Chal rahe'), loading: list.loading, value: String(first?.counts.open ?? 0), hint: cost(first?.openValue ?? 0), onPress: () => setTab('open') },
        { icon: Wallet, tone: 'success', label: t('Advance'), loading: list.loading, value: cost(first?.advances ?? 0) },
      ]} />
      <StatRow tiles={[
        { icon: CalendarClock, tone: (first?.counts.today ?? 0) > 0 ? 'warning' : 'neutral', label: t('Aaj dene'), loading: list.loading, value: String(first?.counts.today ?? 0), onPress: () => setTab('today') },
        { icon: Package, tone: 'success', label: t('Tayyar'), loading: list.loading, value: String(first?.counts.ready ?? 0), onPress: () => setTab('ready') },
      ]} />
      <Segmented value={view} onChange={setView} options={[{ value: 'orders', label: t('Orders') }, { value: 'analytics', label: t('Analytics') }]} />
      {view === 'orders' && <ChipGroup value={tab} onChange={(v) => setTab(v as OrderTab)} style={{ marginHorizontal: -th.space(4) }} options={TABS.map((x) => ({ value: x.id, label: `${x.label}${first?.counts[x.id] ? ` · ${first.counts[x.id]}` : ''}` }))} />}
      {lateCount > 0 && <Card tone="danger"><Row gap={2}><AlertTriangle size={16} color={th.colors.danger.text} /><Text size="sm" weight="medium" style={{ flex: 1 }}>{t('{{count}} order late hain', { count: lateCount })}</Text></Row></Card>}
      <OfflineNote feature="meatDesk" />
      {view === 'analytics' && first && (
        <Card flush>
          <DetailRow label={t('Khule orders ki value')} value={formatMoney(first.openValue)} />
          <DetailRow label={t('Advance')} value={formatMoney(first.advances)} />
          <DetailRow label={t('Baqi (orders par)')} value={<Amount value={Math.max(first.openValue - first.advances, 0)} weight="bold" />} last />
        </Card>
      )}
    </View>
  );

  return (
    <>
      <ListTemplate<WeightOrder>
        title={t('Weight orders')}
        grouped={false}
        search={view === 'orders' ? { value: search, onChange: setSearch, placeholder: t('Order #, customer, phone…') } : undefined}
        summary={header}
        data={view === 'orders' ? list.items : []}
        loading={view === 'orders' && list.loading}
        error={list.error}
        onRetry={list.refetch}
        refreshing={list.refreshing}
        onRefresh={list.refetch}
        onEndReached={list.loadMore}
        keyExtractor={(o) => o.id}
        renderItem={({ item: o }) => {
          const st = ORDER_STATUS[o.status];
          return (
            <RowCard>
              <ListRow icon={o.isDelivery ? Truck : Package} iconTone={isLateOrder(o) ? 'danger' : st.tone}
                title={<Row gap={1.5} wrap><Text weight="semibold" numberOfLines={1} style={{ flexShrink: 1 }}>{o.customerName ?? '—'}</Text><Badge tone={st.tone}>{t(st.label)}</Badge>{isLateOrder(o) && <Badge tone="danger">{t('Late')}</Badge>}</Row>}
                subtitle={<View style={{ gap: 2 }}>
                  <Text size="xs" tone="muted" ltr numberOfLines={1}>{o.orderNumber}{o.neededBy ? ` · ${formatDateTime(o.neededBy)}` : ''}</Text>
                  <Text size="xs" tone="secondary" numberOfLines={1}>{o.items.map((i) => `${i.productName} ${kg(i.actualKg ?? i.requestedKg)}`).join(', ')}</Text>
                </View>}
                trailing={<View style={{ alignItems: 'flex-end' }}><Amount value={o.total} weight="bold" />{o.paidAmount > 0 && o.status !== 'DELIVERED' && o.status !== 'CANCELLED' && <Text size="2xs" tone="success">{t('Advance')} {formatMoney(o.paidAmount)}</Text>}</View>}
                chevron onPress={() => setOpen(o.id)} />
            </RowCard>
          );
        }}
        empty={view === 'orders' ? <EmptyState icon={Package} title={search ? t('Koi order nahi mila') : t('Abhi koi order nahi')} message={t('Kitne kg, kaunsa cut, kab chahiye — advance abhi lein, bill dete waqt banega')} /> : undefined}
        fab={can(P.POS_USE) ? { icon: Plus, label: t('Naya order'), onPress: () => guard(() => router.push('/meat/weight-orders/new' as never)) } : undefined}
      />
      <OrderSheet id={open} onClose={() => setOpen(null)} />
    </>
  );
}

function OrderSheet({ id, onClose }: { id: string | null; onClose: () => void }) {
  const th = useTheme();
  const can = usePermission();
  const { guard } = useDeskOnline('meatDesk');
  const [dialog, setDialog] = useState<'pay' | 'weigh' | 'bill' | 'cancel' | 'refund' | null>(null);
  const [busy, setBusy] = useState(false);
  const q = useQuery({ queryKey: [MEAT_KEYS.orders, 'one', id], queryFn: () => weightOrdersApi.getOne(id!), enabled: !!id });
  const o = q.data;
  const next = o ? nextOrderStep(o.status, o.isDelivery) : null;
  const open = !!o && isOpenOrder(o.status);
  const due = o ? dueOf(o.total, o.paidAmount) : 0;
  const done = (money = false) => { refreshMeat([MEAT_KEYS.orders], money); void q.refetch(); };
  const advance = async () => {
    if (!o || !next) return;
    setBusy(true);
    try { await weightOrdersApi.updateStatus(o.id, next.status); done(); toast.success(t(ORDER_STATUS[next.status].label)); } catch (e) { toast.error(errorText(e, t('Nahi hua'))); } finally { setBusy(false); }
  };
  const slip = () => {
    if (!o) return;
    const lines = o.items.map((i) => `${i.productName}  ${kg(i.actualKg ?? i.requestedKg)}${i.cuttingInstructions ? ` — ${i.cuttingInstructions}` : ''}`);
    void Share.share({ message: [`${t('Order')} ${o.orderNumber}`, [o.customerName, o.customerPhone].filter(Boolean).join(' · '), o.neededBy ? `${t('Kab')}: ${formatDateTime(o.neededBy)}` : '', o.isDelivery ? `${t('Pata')}: ${o.deliveryAddress ?? '—'}` : '', o.cuttingStyle ? `${t('Cutting')}: ${o.cuttingStyle}` : '', ...lines, o.specialInstructions ?? ''].filter(Boolean).join('\n') });
  };
  return (
    <>
      <Sheet open={!!id && !dialog} onClose={onClose} height={0.92} title={o?.customerName ?? t('Order')} description={o ? `${o.orderNumber}${o.neededBy ? ` · ${formatDateTime(o.neededBy)}` : ''}` : undefined}
        footer={o && open ? (
          <Row gap={2}>
            {next && <Button style={{ flex: 2 }} size="lg" iconEnd={ArrowRight} loading={busy} onPress={() => guard(() => void advance())}>{t(STEP_LABEL[next.step])}</Button>}
            {o.status === 'READY' && !o.isDelivery && can(P.POS_USE) && <Button style={{ flex: 2 }} size="lg" variant="success" icon={Receipt} onPress={() => guard(() => setDialog('bill'))}>{t('Bill banayein aur de dein')}</Button>}
            {o.status === 'OUT_FOR_DELIVERY' && can(P.POS_USE) && <Button style={{ flex: 2 }} size="lg" variant="success" icon={Receipt} onPress={() => guard(() => setDialog('bill'))}>{t('Bill banayein aur de dein')}</Button>}
          </Row>
        ) : undefined}>
        {o && (
          <View style={{ gap: th.space(3) }}>
            <Row gap={2} wrap><Badge tone={ORDER_STATUS[o.status].tone}>{t(ORDER_STATUS[o.status].label)}</Badge>{o.isDelivery && <Badge tone="info">{t('Delivery')}</Badge>}{!!o.occasion && <Badge tone="neutral">{o.occasion}</Badge>}{isLateOrder(o) && <Badge tone="danger">{t('Late')}</Badge>}</Row>
            <Card flush>
              {o.items.map((i, k) => (
                <ListRow key={i.id ?? k} dense divider title={i.productName} subtitle={`${t('Maanga {{requestedKg}} · {{pricePerKg}}/kg', { requestedKg: kg(i.requestedKg), pricePerKg: formatMoney(i.pricePerKg) })}${i.actualKg != null ? ` · ${t('Wazan')} ${kg(i.actualKg)}` : ''}${i.cuttingInstructions ? `\n${i.cuttingInstructions}` : ''}`}
                  trailing={<Amount value={i.actualKg != null ? i.actualKg * i.pricePerKg : i.total} size="sm" weight="semibold" />} />
              ))}
              {o.deliveryCharges > 0 && <DetailRow label={t('Delivery')} value={formatMoney(o.deliveryCharges)} />}
              {o.discount > 0 && <DetailRow label={t('Discount')} value={`− ${formatMoney(o.discount)}`} />}
              <DetailRow label={t('Kul')} value={<Amount value={o.total} weight="bold" />} />
              <DetailRow label={t('Advance')} value={<Amount value={o.paidAmount} tone="success" />} />
              <DetailRow label={t('Baqi')} value={<Amount value={due} weight="bold" tone={due > 0 ? 'danger' : undefined} />} last />
            </Card>
            <Card flush>
              {!!o.customerPhone && <DetailRow label={t('Phone')} value={<Text ltr>{o.customerPhone}</Text>} />}
              {o.isDelivery && <DetailRow label={t('Pata')} value={o.deliveryAddress ?? '—'} />}
              {!!o.cuttingStyle && <DetailRow label={t('Cutting kaisi')} value={o.cuttingStyle} />}
              <DetailRow label={t('Note')} value={o.specialInstructions || o.cancellationReason || '—'} last />
            </Card>
            <Row gap={2} wrap>
              {open && can(P.POS_USE) && <Button variant="secondary" icon={Scale} style={{ flex: 1 }} onPress={() => guard(() => setDialog('weigh'))}>{t('Wazan')}</Button>}
              {open && can(P.POS_USE) && due > 0 && <Button variant="secondary" icon={Wallet} style={{ flex: 1 }} onPress={() => guard(() => setDialog('pay'))}>{t('Paisa mila')}</Button>}
              {open && can(P.POS_USE) && <Button variant="secondary" icon={Pencil} style={{ flex: 1 }} onPress={() => { onClose(); router.push(`/meat/weight-orders/new?id=${o.id}` as never); }}>{t('Badlein')}</Button>}
              <Button variant="secondary" icon={Share2} style={{ flex: 1 }} onPress={slip}>{t('Slip')}</Button>
              {open && can(P.POS_USE) && <Button variant="ghost" icon={Ban} style={{ flex: 1 }} onPress={() => guard(() => setDialog('cancel'))}>{t('Cancel')}</Button>}
              {o.status === 'CANCELLED' && o.paidAmount > 0 && can(P.RETURNS_CREATE) && <Button variant="secondary" icon={Undo2} style={{ flex: 1 }} onPress={() => guard(() => setDialog('refund'))}>{t('Advance wapas')}</Button>}
            </Row>
          </View>
        )}
      </Sheet>
      {o && <WeighSheet o={o} open={dialog === 'weigh'} onClose={() => setDialog(null)} onDone={() => done()} />}
      <PaySheet open={dialog === 'pay'} title={t('Advance / paisa mila')} name={o ? `${o.orderNumber} · ${o.customerName ?? ''}` : ''} due={due} advance cta={t('Darj karein')}
        onConfirm={async ({ paymentMethod, paidAmount }) => { await weightOrdersApi.addPayment(o!.id, paidAmount, paymentMethod, o!.paidAmount); done(true); toast.success(t('{{formatPKR}} darj ho gaya', { formatPKR: formatMoney(paidAmount) })); }} onClose={() => setDialog(null)} />
      <CheckoutSheet open={dialog === 'bill'} title={o ? `${o.orderNumber} · ${o.customerName ?? ''}` : ''} total={o?.total ?? 0} held={o?.khataPaid ?? 0} legacy={o?.legacyPaid ?? 0} customerName={o?.customerName}
        lines={o?.items.map((i) => ({ label: `${i.productName} ${kg(i.actualKg ?? i.requestedKg)}`, value: formatMoney((i.actualKg ?? i.requestedKg) * i.pricePerKg) }))}
        onConfirm={async (payments) => { await withManagerPin(t('Udhaar ki had'), (managerPin) => weightOrdersApi.checkout(o!.id, { payments, expectedTotal: o!.total, managerPin }), 'credit'); done(true); toast.success(t('Bill ban gaya — order de diya')); }} onClose={() => setDialog(null)} />
      <ReasonSheet open={dialog === 'cancel'} title={t('Cancel karein?')} description={o?.paidAmount ? t('Advance khate me jama rehta hai — wapas dena ho to "Advance wapas" se dein.') : undefined} cta={t('Haan, cancel')}
        onClose={() => setDialog(null)} onConfirm={async (reason) => { try { await weightOrdersApi.updateStatus(o!.id, 'CANCELLED', reason); done(); toast.success(t('Cancel ho gaya')); } catch (e) { toast.error(errorText(e, t('Cancel nahi hua'))); throw e; } }} />
      <RefundSheet open={dialog === 'refund'} title={o ? `${o.orderNumber} · ${o.customerName ?? ''}` : ''} held={o?.khataPaid ?? 0} legacy={o?.legacyPaid ?? 0} onRefund={(pin) => weightOrdersApi.refund(o!.id, pin).then(() => done(true))} onClose={() => setDialog(null)} />
    </>
  );
}

function WeighSheet({ o, open, onClose, onDone }: { o: WeightOrder; open: boolean; onClose: () => void; onDone: () => void }) {
  const th = useTheme();
  const [kgs, setKgs] = useState<Record<string, number | null>>({});
  const [busy, setBusy] = useState(false);
  const [seen, setSeen] = useState(false);
  if (open && !seen) { setSeen(true); setKgs(Object.fromEntries(o.items.map((i) => [i.id!, i.actualKg ?? i.requestedKg]))); }
  if (!open && seen) setSeen(false);
  const total = weighedTotal(o.items.map((i) => ({ requestedKg: kgs[i.id!] ?? 0, pricePerKg: i.pricePerKg })), o.deliveryCharges, o.discount);
  const save = async () => {
    setBusy(true);
    try { await weightOrdersApi.updateActualWeights(o.id, o.items.map((i) => ({ itemId: i.id!, actualKg: kgs[i.id!] ?? 0 }))); toast.success(t('Wazan likh diya')); onDone(); onClose(); }
    catch (e) { toast.error(errorText(e, t('Wazan save nahi hua'))); } finally { setBusy(false); }
  };
  return (
    <Sheet open={open} onClose={onClose} title={t('Asal wazan likhein')} description={t('{{orderNumber}} · scale par jitna aaya', { orderNumber: o.orderNumber })}
      footer={<Button fullWidth size="lg" icon={Scale} loading={busy} onPress={() => void save()}>{t('Save · {{total}}', { total: formatMoney(total) })}</Button>}>
      <View style={{ gap: th.space(3) }}>
        {o.items.map((i) => (
          <View key={i.id} style={{ gap: 4 }}>
            <Text size="sm" weight="medium">{i.productName}</Text>
            <Text size="xs" tone="muted">{t('Maanga {{requestedKg}} · {{pricePerKg}}/kg', { requestedKg: kg(i.requestedKg), pricePerKg: formatMoney(i.pricePerKg) })}</Text>
            <NumberInput value={kgs[i.id!] ?? null} onChangeValue={(v) => setKgs((k) => ({ ...k, [i.id!]: v }))} hint="kg" />
          </View>
        ))}
      </View>
    </Sheet>
  );
}
