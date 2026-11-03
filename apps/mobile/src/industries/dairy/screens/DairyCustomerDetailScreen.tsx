/** One delivery customer (web DairyCustomerDetailPage): balance, payment, pause / close, last two months of deliveries and monthly bills. */

import { useMutation, useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { BookOpen, FileText, Pause, Pencil, Phone, Play, Wallet, XCircle } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { previousMonth } from '@nafaa/core/industries/dairy';
import { formatDate, formatMoney, pkParts } from '@/core/format';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { Amount, Badge, Button, Card, DatePicker, DetailRow, DetailTemplate, HeroAmount, HeroText, IconButton, ListRow, PageHero, Row, Segmented, Sheet, Text, toast, useTheme } from '@/design';
import { callPhone } from '@/modules/customers/lib/contact';
import { ReceiveSheet } from '../../_shared/farm/ReceiveSheet';
import { OfflineNote, dateToKey, errorText, keyToDate, todayKey, useDeskOnline } from '../../_shared/deskKit';
import { ReasonSheet } from '../../_shared/farm/ui';
import { dairyCustomersApi, monthlyBillsApi } from '../api';
import { CUSTOMER_STATUS, DAIRY_KEYS, DELIVERY_STATUS, FREQUENCY, liters, monthLabel, qty, refreshDairy } from '../meta';

export function DairyCustomerDetailScreen() {
  const th = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const can = usePermission();
  const canKhata = can(P.KHATA_MANAGE);
  const { guard } = useDeskOnline('dairyDesk');
  const [tab, setTab] = useState<'deliveries' | 'bills'>('deliveries');
  const [sheet, setSheet] = useState<'pay' | 'pause' | 'close' | null>(null);
  const q = useQuery({ queryKey: [DAIRY_KEYS.customer, id], queryFn: () => dairyCustomersApi.getOne(id!), enabled: !!id });
  const c = q.data;
  const owe = c?.currentBalance ?? 0;
  const st = c ? CUSTOMER_STATUS[c.status] : null;
  const now = pkParts(Date.now());
  const last = previousMonth(now.month + 1, now.year);
  const monthLiters = useMemo(() => (c?.recentDeliveries ?? []).filter((d) => d.status === 'DELIVERED' && Date.now() - new Date(d.deliveryDate).getTime() < 30 * 86_400_000).reduce((s, d) => s + d.deliveredQty, 0), [c]);
  const done = (msg: string) => { refreshDairy([DAIRY_KEYS.customer, DAIRY_KEYS.customers, DAIRY_KEYS.bills], true); toast.success(msg); };
  const fail = (fb: string) => (e: unknown) => toast.error(errorText(e, fb));
  const resume = useMutation({ mutationFn: () => dairyCustomersApi.resume(id!), onSuccess: () => done(t('Delivery dobara chalu')), onError: fail(t('Nahi hua')) });
  const reopen = useMutation({ mutationFn: () => dairyCustomersApi.reopen(id!), onSuccess: () => done(t('Khata dobara chalu')), onError: fail(t('Nahi hua')) });
  const bill = useMutation({
    mutationFn: () => monthlyBillsApi.make({ dairyCustomerId: id!, month: last.month, year: last.year }),
    onSuccess: (b) => { done(b.refreshed ? t('Bill {{billNumber}} naye hisaab se theek', { billNumber: b.billNumber }) : t('Bill {{billNumber}} ban gaya', { billNumber: b.billNumber })); router.push('/dairy/bills' as never); },
    onError: fail(t('Bill nahi bana')),
  });

  return (
    <DetailTemplate
      title={c?.name ?? t('Customer')} subtitle={c ? [c.customerNumber, c.route?.name].filter(Boolean).join(' · ') : undefined}
      loading={q.isLoading} error={q.data ? null : q.error} onRetry={() => void q.refetch()} onRefresh={() => void q.refetch()} refreshing={q.isRefetching}
      actions={c && can(P.CUSTOMERS_EDIT) ? <IconButton icon={Pencil} label={t('Badlein')} onPress={() => guard(() => router.push(`/dairy/customers/${c.id}/edit` as never))} /> : undefined}
      summary={c ? <PageHero title={c.name} chip={st ? t(st.label) : undefined} stats={[
        { label: owe >= 0 ? t('Baqi') : t('Advance'), value: <HeroAmount value={Math.abs(owe)} size="2xl" /> },
        { label: t('30 din ka doodh'), value: <HeroText size="2xl" weight="bold" ltr>{liters(monthLiters)}</HeroText> },
      ]} /> : undefined}
      bottomActions={c && canKhata && c.status !== 'CLOSED' ? <Button fullWidth variant="success" icon={Wallet} onPress={() => guard(() => setSheet('pay'))}>{t('Payment lein')}</Button> : undefined}
    >
      {c && (
        <View style={{ gap: th.space(4) }}>
          <OfflineNote feature="dairyDesk" />
          <Row gap={2}>
            {!!c.phone && <Button variant="secondary" icon={Phone} style={{ flex: 1 }} onPress={() => callPhone(c.phone)}>{t('Call')}</Button>}
            {c.customerId && <Button variant="secondary" icon={BookOpen} style={{ flex: 1 }} onPress={() => router.push(`/customers/${c.customerId}` as never)}>{t('Khata')}</Button>}
            {canKhata && <Button variant="secondary" icon={FileText} style={{ flex: 1 }} loading={bill.isPending} onPress={() => guard(() => bill.mutate())}>{t('{{month}} ka bill', { month: monthLabel(last.month, last.year) })}</Button>}
          </Row>
          <Card flush>
            <DetailRow label={t('Roz')} value={`${c.morningQuantity} + ${c.eveningQuantity} L · ${t(FREQUENCY[c.deliveryFrequency]?.label ?? c.deliveryFrequency)}`} />
            <DetailRow label={t('Rate')} value={c.customRate ? formatMoney(c.customRate) : t('Dukaan ka')} />
            <DetailRow label={t('Kul delivery')} value={`${c.totalDeliveries} · ${t('{{missedDeliveries}} naga', { missedDeliveries: c.missedDeliveries })}`} />
            <DetailRow label={t('Status')} value={st ? <Badge tone={st.tone}>{t(st.label)}</Badge> : c.status} />
            {c.status === 'SUSPENDED' && c.pausedTo && <DetailRow label={t('Ruka hua')} value={t('{{pausedTo}} tak', { pausedTo: formatDate(c.pausedTo) })} />}
            {!!c.address && <DetailRow label={t('Pata')} value={[c.address, c.area, c.landmark].filter(Boolean).join(', ')} />}
            <DetailRow label={t('Aakhri payment')} value={c.lastPaymentDate ? formatDate(c.lastPaymentDate, { year: true }) : '—'} last />
          </Card>
          {!c.khataLinked && <Card tone="warning"><Text size="sm">{t('Khata pehli payment par jurega')}</Text></Card>}
          <Row gap={2} wrap>
            {c.status === 'ACTIVE' && <Button variant="secondary" icon={Pause} style={{ flex: 1 }} onPress={() => guard(() => setSheet('pause'))}>{t('Kuch din rokein')}</Button>}
            {c.status === 'SUSPENDED' && <Button variant="secondary" icon={Play} style={{ flex: 1 }} loading={resume.isPending} onPress={() => guard(() => resume.mutate())}>{t('Dobara chalu')}</Button>}
            {can(P.CUSTOMERS_EDIT) && (c.status !== 'CLOSED'
              ? <Button variant="secondary" icon={XCircle} style={{ flex: 1 }} onPress={() => guard(() => setSheet('close'))}>{t('Khata band')}</Button>
              : <Button variant="secondary" icon={Play} style={{ flex: 1 }} loading={reopen.isPending} onPress={() => guard(() => reopen.mutate())}>{t('Khata dobara kholein')}</Button>)}
          </Row>
          <Segmented value={tab} onChange={setTab} options={[{ value: 'deliveries', label: t('Delivery (2 mahine)') }, { value: 'bills', label: t('Mahine ke bill') }]} />
          <Card flush>
            {tab === 'deliveries' ? ((c.recentDeliveries ?? []).length === 0 ? <View style={{ padding: th.space(4) }}><Text size="sm" tone="muted">{t('Abhi koi delivery nahi')}</Text></View> : (c.recentDeliveries ?? []).slice(0, 40).map((d, i, a) => (
              <ListRow key={d.id} dense divider={i < a.length - 1} title={`${formatDate(d.deliveryDate)} · ${t(d.slot === 'EVENING' ? 'Shaam' : 'Subah')}`} subtitle={d.status === 'DELIVERED' ? `${qty(d.deliveredQty)} L @ ${formatMoney(d.ratePerLiter)}` : `${qty(d.scheduledQty)} L`}
                trailing={<View style={{ alignItems: 'flex-end', gap: 2 }}>{d.status === 'DELIVERED' && <Amount value={d.totalAmount} size="sm" weight="semibold" />}<Badge tone={DELIVERY_STATUS[d.status]?.tone ?? 'neutral'}>{t(DELIVERY_STATUS[d.status]?.label ?? d.status)}</Badge></View>} />
            ))) : ((c.bills ?? []).length === 0 ? <View style={{ padding: th.space(4) }}><Text size="sm" tone="muted">{t('Abhi koi bill nahi')}</Text></View> : (c.bills ?? []).map((b, i, a) => (
              <ListRow key={b.id} dense divider={i < a.length - 1} title={monthLabel(b.month, b.year)} subtitle={`${b.billNumber} · ${liters(b.totalLiters)}`} trailing={<View style={{ alignItems: 'flex-end' }}><Amount value={b.totalAmount} size="sm" weight="semibold" /><Badge tone={b.isPaid ? 'success' : 'warning'}>{b.isPaid ? t('Ada') : t('Baqi')}</Badge></View>} />
            )))}
          </Card>

          <ReceiveSheet open={sheet === 'pay'} title={t('Payment lein')} description={`${c.name}${owe > 0 ? ` · ${formatMoney(owe)}` : ''}`} cta={t('Payment lein')}
            onConfirm={async ({ paymentMethod, paidAmount }) => { await dairyCustomersApi.payment(c.id, { amount: paidAmount, paymentMethod }); done(t('Payment khate me jama')); }} onClose={() => setSheet(null)} />
          <PauseSheet open={sheet === 'pause'} onClose={() => setSheet(null)} onConfirm={async (from, to, reason) => { await dairyCustomersApi.pause(c.id, { pausedFrom: from, pausedTo: to, reason }); done(t('Delivery ruk gayi')); }} />
          <ReasonSheet open={sheet === 'close'} title={t('Khata band')} description={t('Khata band — roz ki list se hat gaye')} cta={t('Khata band')} required={false} onClose={() => setSheet(null)}
            onConfirm={async (reason) => { try { await dairyCustomersApi.close(c.id, reason || undefined); done(t('Khata band — roz ki list se hat gaye')); } catch (e) { toast.error(errorText(e, t('Band nahi hua'))); throw e; } }} />
        </View>
      )}
    </DetailTemplate>
  );
}

function PauseSheet({ open, onClose, onConfirm }: { open: boolean; onClose: () => void; onConfirm: (from: string, to: string, reason?: string) => Promise<unknown> }) {
  const th = useTheme();
  const [from, setFrom] = useState(todayKey());
  const [to, setTo] = useState(todayKey());
  const [busy, setBusy] = useState(false);
  const bad = to < from;
  return (
    <Sheet open={open} onClose={onClose} title={t('Kuch din rokein')} description={t('Customer bahar gaya ho to "Rokein" se tareekh tak delivery band karein; tareekh guzarte hi khud chalu ho jati hai.')}
      footer={<Button fullWidth size="lg" loading={busy} disabled={bad} onPress={async () => { setBusy(true); try { await onConfirm(from, to); onClose(); } catch (e) { toast.error(errorText(e, t('Nahi hua'))); } finally { setBusy(false); } }}>{t('Rokein')}</Button>}>
      <View style={{ gap: th.space(3) }}>
        <DatePicker label={t('Kab se')} value={keyToDate(from)} onChange={(d) => setFrom(dateToKey(d))} />
        <DatePicker label={t('Kab tak')} value={keyToDate(to)} onChange={(d) => setTo(dateToKey(d))} error={bad ? t('Wapsi ki tareekh shuru se pehle nahi') : undefined} />
      </View>
    </Sheet>
  );
}
