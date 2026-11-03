/**
 * One custom order (web CustomOrderDetailPage): where it stands (quotation,
 * advance, making, ready, delivery), the money (advances and later payments go
 * to the drawer and the customer's khata; the bill is made when it leaves the
 * shop), the karigar and his progress, and the design.
 */

import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { CalendarClock, CheckCircle2, Hammer, Pencil, Phone, Receipt, Ruler, Truck, Wallet, XCircle } from 'lucide-react-native';
import { useState } from 'react';
import { Image, Linking, View } from 'react-native';
import { daysTo, paidPercent } from '@nafaa/core/industries/furniture';
import { apiErrorMessage } from '@/core/api/errors';
import { formatDate, formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { Badge, Button, Card, DetailRow, DetailSection, DetailTemplate, IconButton, ProgressBar, Row, Text, confirm, toast, useTheme } from '@/design';
import { OfflineNote, useDeskOnline } from '../../_shared/deskKit';
import { MoneySheet, ReasonSheet } from '../../_shared/trade/sheets';
import { dueText } from '../../_shared/trade/kit';
import { customOrdersApi, type FurnitureOrderStatus } from '../api';
import { ApproveSheet, KarigarSheet, ProgressSheet } from '../components/OrderSheets';
import { BILLED_ORDER, FURNITURE_KEYS, OPEN_ORDER, categoryLabel, materialOf, orderStatus, orderTotal, refreshFurniture, sizeText } from '../meta';

const STEPS = [
  { step: 0, label: 'Quotation' }, { step: 1, label: 'Advance' }, { step: 2, label: 'Ban raha' }, { step: 3, label: 'Tayyar' }, { step: 4, label: 'Raste me' }, { step: 5, label: 'De diya' },
];

export function CustomOrderDetailScreen() {
  const th = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const can = usePermission();
  const { guard } = useDeskOnline('furnitureDesk');
  const canManage = can(P.SERVICE_JOBS_MANAGE);
  const canTakeMoney = can(P.POS_USE);
  const [panel, setPanel] = useState<'pay' | 'karigar' | 'progress' | 'cancel' | 'approve' | null>(null);
  const [busy, setBusy] = useState(false);
  const q = useQuery({ queryKey: [FURNITURE_KEYS.orders, 'one', id], queryFn: () => customOrdersApi.getOne(id!), enabled: !!id });
  const o = q.data;
  const done = (msg: string) => { toast.success(msg); setPanel(null); refreshFurniture([FURNITURE_KEYS.orders, FURNITURE_KEYS.deliveries, FURNITURE_KEYS.carpenters]); void q.refetch(); };

  const setStatus = (v: { status: FurnitureOrderStatus; cancellationReason?: string }) => guard(async () => {
    setBusy(true);
    try {
      const r = await customOrdersApi.updateStatus(id!, v);
      done(BILLED_ORDER.includes(r.status) && r.balanceAmount > 0 ? t('Bill ban gaya — {{balanceAmount}} customer ke khate me', { balanceAmount: formatMoney(r.balanceAmount) }) : t('Order: {{label}}', { label: t(orderStatus(r.status).label) }));
    } catch (e) { toast.error(apiErrorMessage(e, t('Nahi hua'))); } finally { setBusy(false); }
  });
  const pay = (v: { amount: number; paymentMethod: string; notes?: string }) => guard(async () => {
    setBusy(true);
    try {
      const r = await customOrdersApi.recordPayment(id!, { amount: v.amount, paymentMethod: v.paymentMethod, reference: v.notes });
      done(r.balanceAmount > 0 ? t('Payment save — {{balanceAmount}} baqi', { balanceAmount: formatMoney(r.balanceAmount) }) : t('Payment save — poora mil gaya'));
    } catch (e) { toast.error(apiErrorMessage(e, t('Payment save nahi hui'))); } finally { setBusy(false); }
  });
  const handOver = async () => {
    if (!o) return;
    const total = orderTotal(o);
    const ok = await confirm({
      title: o.status === 'OUT_FOR_DELIVERY' ? t('Furniture pohanch gaya?') : t('Customer khud le gaya?'), confirmLabel: t('Haan, bill banayein'),
      message: t('Ab bill banega: {{total}}. {{value}}{{value2}}', { total: formatMoney(total), value: o.totalPaid > 0 ? t('{{totalPaid}} advance katega, ', { totalPaid: formatMoney(o.totalPaid) }) : '', value2: o.balanceAmount > 0 ? t('{{balanceAmount}} {{customerName}} ke khate me udhaar.', { balanceAmount: formatMoney(o.balanceAmount), customerName: o.customerName }) : t('poora paisa mil chuka.') }),
    });
    if (ok) setStatus({ status: 'DELIVERED' });
  };

  const st = o ? orderStatus(o.status) : null;
  const open = !!o && OPEN_ORDER.includes(o.status);
  const closed = o?.status === 'CANCELLED' || o?.status === 'REFUNDED';
  const total = o ? orderTotal(o) : 0;
  const updates = o && Array.isArray(o.progressUpdates) ? [...o.progressUpdates].reverse() : [];
  const due = o && open ? dueText(daysTo(o.expectedDeliveryDate)) : null;

  return (
    <DetailTemplate
      title={o?.productType ?? t('Order')}
      subtitle={o ? `${o.orderNumber} · ${o.customerName}` : undefined}
      loading={q.isLoading} error={q.data ? null : q.error} onRetry={() => void q.refetch()} onRefresh={() => void q.refetch()} refreshing={q.isRefetching}
      actions={o && canManage && !BILLED_ORDER.includes(o.status) && !closed ? <IconButton icon={Pencil} label={t('Badlein')} onPress={() => guard(() => router.push(`/furniture/custom-orders/${o.id}/edit` as never))} /> : undefined}
    >
      {o && st && (
        <View style={{ gap: th.space(4) }}>
          <OfflineNote feature="furnitureDesk" />
          <Row gap={2} wrap>
            <Badge tone={st.tone}>{t(st.label)}</Badge>
            <Text size="sm" tone="muted" ltr>{o.customerPhone}</Text>
          </Row>
          {!closed && (
            <Row gap={1.5} wrap>
              {STEPS.map((s) => <Badge key={s.step} tone={st.step >= s.step ? 'brand' : 'neutral'}>{t(s.label)}</Badge>)}
            </Row>
          )}
          {closed && <Card tone="danger"><Text size="sm">{t('Cancel {{value}} — {{value2}}. {{value3}}', { value: o.cancelledAt ? formatDate(o.cancelledAt) : '', value2: o.cancellationReason ?? '—', value3: o.totalPaid > 0 ? t('{{totalPaid}} advance customer ke khate me hai.', { totalPaid: formatMoney(o.totalPaid) }) : '' })}</Text></Card>}

          <Card title={t('Ab kya karna hai')}>
            <View style={{ gap: th.space(2) }}>
              {o.status === 'QUOTATION' && canManage && <Button icon={CheckCircle2} onPress={() => guard(() => setPanel('approve'))}>{t('Qeemat pakki karein')}</Button>}
              {canTakeMoney && !closed && o.balanceAmount > 0 && <Button icon={Wallet} variant={o.status === 'QUOTATION' ? 'secondary' : 'primary'} onPress={() => guard(() => setPanel('pay'))}>{BILLED_ORDER.includes(o.status) ? t('Baqi wusool karein') : t('Advance / qist lein')}</Button>}
              {canManage && open && <Button icon={Hammer} variant="secondary" onPress={() => guard(() => setPanel('karigar'))}>{o.carpenterName ? t('Karigar badlein') : t('Karigar dein')}</Button>}
              {canManage && (o.status === 'DEPOSIT_PAID' || o.status === 'IN_PRODUCTION') && <Button icon={Ruler} variant="secondary" onPress={() => guard(() => setPanel('progress'))}>{t('Kaam kitna hua')}</Button>}
              {canManage && o.status === 'READY_FOR_DELIVERY' && <Button icon={Truck} loading={busy} onPress={() => setStatus({ status: 'OUT_FOR_DELIVERY' })}>{t('Delivery bhejein')}</Button>}
              {canManage && (o.status === 'READY_FOR_DELIVERY' || o.status === 'OUT_FOR_DELIVERY') && <Button icon={CheckCircle2} variant={o.status === 'OUT_FOR_DELIVERY' ? 'primary' : 'secondary'} onPress={() => guard(() => void handOver())}>{o.status === 'OUT_FOR_DELIVERY' ? t('Pohanch gaya') : t('Customer le gaya')}</Button>}
              {canManage && (o.status === 'DELIVERED' || o.status === 'ASSEMBLED') && <Button icon={CheckCircle2} variant="secondary" loading={busy} onPress={() => setStatus({ status: 'COMPLETED' })}>{t('Mukammal')}</Button>}
              {o.status === 'OUT_FOR_DELIVERY' && <Button icon={Truck} variant="link" onPress={() => router.push('/furniture/deliveries' as never)}>{t('Delivery slip')}</Button>}
              {o.sale && <Button icon={Receipt} variant="link" onPress={() => router.push(`/sales/${o.sale!.id}` as never)}>{t('Bill {{saleNumber}}', { saleNumber: o.sale.saleNumber })}</Button>}
              {canManage && (open || o.status === 'OUT_FOR_DELIVERY') && <Button icon={XCircle} variant="ghost" onPress={() => guard(() => setPanel('cancel'))}>{t('Cancel')}</Button>}
            </View>
          </Card>

          <DetailSection title={t('Hisaab')}>
            <DetailRow label={t('Qeemat')} value={formatMoney(o.finalPrice ?? o.quotedPrice)} />
            {o.requiresInstallation && <DetailRow label={t('Fitting')} value={formatMoney(o.installationCharge ?? 0)} />}
            <DetailRow label={t('Kul')} value={formatMoney(total)} />
            <DetailRow label={t('Mil chuka')} value={formatMoney(o.totalPaid)} />
            <DetailRow label={t('Baqi')} value={formatMoney(o.balanceAmount)} last />
          </DetailSection>
          <View style={{ gap: 4 }}>
            <ProgressBar value={Math.max(paidPercent(total, o.totalPaid), 2) / 100} tone="success" />
            <Text size="xs" tone="muted">{o.depositAmount > 0 && !o.depositPaid ? t('Advance tay: {{depositAmount}} · ', { depositAmount: formatMoney(o.depositAmount) }) : ''}{BILLED_ORDER.includes(o.status) ? t('Bill ban chuka — baqi customer ke khate me hai') : t('Har payment usi din drawer aur khate me; bill delivery par')}</Text>
          </View>

          <DetailSection title={t('Design')}>
            <View style={{ padding: th.space(3), gap: th.space(2) }}>
              <Text size="sm">{o.description}</Text>
              {o.designNotes ? <Card tone="warning"><Text size="sm">{t('Karigar: {{designNotes}}', { designNotes: o.designNotes })}</Text></Card> : null}
            </View>
            {([[t('Kya hai'), o.categoryType ? categoryLabel(o.categoryType) : null], [t('Material'), o.material ? materialOf(o.material) : null], [t('Lakri'), o.woodType], [t('Polish'), o.polishRequested],
              [t('Rang'), o.colorRequested], [t('Kapra'), o.upholsteryFabric], [t('Size'), sizeText(o)], [t('Warranty'), t('{{n}} mahine', { n: o.warrantyMonths })]] as Array<[string, string | null | undefined]>)
              .filter(([, v]) => v).map(([k, v], i, a) => <DetailRow key={k} label={k} value={String(v)} last={i === a.length - 1} />)}
          </DetailSection>
          {(o.sketchUrls.length > 0 || o.progressPhotos.length > 0) && (
            <Row gap={2} wrap>
              {[...o.sketchUrls, ...o.progressPhotos].map((u) => <Image key={u} source={{ uri: u }} style={{ width: 96, height: 96, borderRadius: th.radius('lg') }} />)}
            </Row>
          )}

          {updates.length > 0 && (
            <Card title={t('Kaam ki report')}>
              {updates.map((u, i) => (
                <Row key={i} gap={3}><Text weight="semibold" tone="brand" ltr style={{ width: 48 }}>{u.pct}%</Text><Text size="sm" style={{ flex: 1 }}>{u.note ?? '—'}</Text><Text size="2xs" tone="muted">{formatDate(u.at)}</Text></Row>
              ))}
            </Card>
          )}

          <DetailSection title={t('Customer')}>
            <DetailRow label={t('Naam')} value={o.customerName} />
            <DetailRow label={t('Phone')} value={<Button size="sm" variant="link" icon={Phone} onPress={() => void Linking.openURL(`tel:${o.customerPhone}`)}>{o.customerPhone}</Button>} />
            {(o.deliveryAddress || o.customerAddress) ? <DetailRow label={t('Pata')} value={[o.deliveryAddress || o.customerAddress, o.deliveryArea, o.deliveryCity].filter(Boolean).join(', ')} last /> : <DetailRow label={t('Pata')} value="—" last />}
          </DetailSection>
          <DetailSection title={t('Waqt')}>
            <DetailRow label={t('Order')} value={formatDate(o.quotationDate)} />
            <DetailRow label={t('Dena')} value={<View style={{ alignItems: 'flex-end' }}><Text size="sm">{o.expectedDeliveryDate ? formatDate(o.expectedDeliveryDate) : '—'}</Text>{due ? <Text size="2xs" tone={due.tone === 'muted' ? 'muted' : due.tone}>{due.text}</Text> : null}</View>} last={!o.actualDeliveryDate} />
            {o.actualDeliveryDate ? <DetailRow label={t('Diya')} value={formatDate(o.actualDeliveryDate)} last /> : null}
          </DetailSection>
          <DetailSection title={t('Karigar')}>
            <DetailRow label={t('Karigar')} value={o.carpenterName ?? t('Abhi nahi diya')} last={!o.workshopLocation && !(o.progressPct > 0)} />
            {o.workshopLocation ? <DetailRow label={t('Workshop')} value={o.workshopLocation} last={!(o.progressPct > 0)} /> : null}
            {(o.status === 'IN_PRODUCTION' || o.status === 'DEPOSIT_PAID' || o.progressPct > 0) ? <DetailRow label={t('{{progressPct}}% kaam', { progressPct: o.progressPct })} value={<View style={{ width: 120 }}><ProgressBar value={Math.max(o.progressPct, 2) / 100} tone="warning" /></View>} last /> : null}
          </DetailSection>
          {o.notes ? <Card tone="default"><Text size="sm" tone="secondary">{o.notes}</Text></Card> : null}

          <MoneySheet open={panel === 'pay'} title={BILLED_ORDER.includes(o.status) ? t('Baqi wusool karein') : t('Advance / qist lein')} description={`${o.orderNumber} · ${o.customerName}`} due={o.balanceAmount} max={o.balanceAmount} busy={busy}
            hint={t('Baqi {{balanceAmount}} — drawer aur khate me jata hai', { balanceAmount: formatMoney(o.balanceAmount) })} onSubmit={pay} onClose={() => setPanel(null)} />
          <ApproveSheet o={o} open={panel === 'approve'} onClose={() => setPanel(null)} onDone={() => done(t('Qeemat pakki — ab advance lein'))} />
          <KarigarSheet o={o} open={panel === 'karigar'} onClose={() => setPanel(null)} onDone={() => done(t('Karigar de diya'))} />
          <ProgressSheet o={o} open={panel === 'progress'} onClose={() => setPanel(null)} onDone={(pct) => done(pct >= 100 ? t('Order tayyar — delivery bhejein') : t('Kaam save'))} />
          <ReasonSheet open={panel === 'cancel'} title={t('Order cancel karein?')} cta={t('Cancel karein')} danger busy={busy} label={t('Wajah')} placeholder={t('Customer ne mana kar diya')}
            message={o.totalPaid > 0 ? t('{{totalPaid}} advance customer ke khate me rahega — wapas dena ho to Khata se dein.', { totalPaid: formatMoney(o.totalPaid) }) : t('Is order par koi advance nahi.')}
            onSubmit={(reason) => setStatus({ status: 'CANCELLED', cancellationReason: reason })} onClose={() => setPanel(null)} />
        </View>
      )}
    </DetailTemplate>
  );
}
