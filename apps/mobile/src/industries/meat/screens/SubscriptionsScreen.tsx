/** Supply plans (web SubscriptionsPage): a restaurant's or family's regular meat. Each plan lists kg per item and how often; "Deliver today" makes the order at today's rates. */

import { useQuery } from '@tanstack/react-query';
import { CalendarClock, Pause, Play, Plus, Trash2, Truck, XCircle } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { planDue, planMonthly } from '@nafaa/core/industries/meat';
import { formatDate, formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { Amount, Badge, Button, Card, DetailRow, EmptyState, IconButton, Input, ListRow, ListTemplate, Row, Segmented, Select, Sheet, Text, TextArea, toast, useTheme } from '@/design';
import { CustomerPickerSheet, type PickedCustomer } from '@/modules/customers/components/CustomerPickerSheet';
import { NumberInput } from '@/modules/inventory/components/fields';
import { ProductPicker } from '@/modules/inventory/components/ProductPicker';
import { OfflineNote, errorText, useDeskOnline } from '../../_shared/deskKit';
import { ReasonSheet, RowCard, StatRow } from '../../_shared/farm/ui';
import { subscriptionsApi, type Subscription, type SubscriptionFreq } from '../api';
import { FREQ, MEAT_KEYS, SUB_STATUS, freqLabel, kg, opt, refreshMeat } from '../meta';

export function SubscriptionsScreen() {
  const th = useTheme();
  const can = usePermission();
  const canEdit = can(P.CUSTOMERS_EDIT);
  const { guard } = useDeskOnline('meatDesk');
  const [status, setStatus] = useState('ACTIVE');
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState<Subscription | null>(null);
  const [form, setForm] = useState<Subscription | 'new' | null>(null);
  const q = useQuery({ queryKey: [MEAT_KEYS.subs, status], queryFn: () => subscriptionsApi.list({ status: status || undefined }) });
  const all = q.data ?? [];
  const s = search.trim().toLowerCase();
  const rows = all.filter((x) => !s || [x.subscriptionNumber, x.contactPerson, x.contactPhone, x.deliveryAddress].join(' ').toLowerCase().includes(s));
  const due = all.filter((x) => planDue(x)).length;
  const live = open ? all.find((x) => x.id === open.id) ?? open : null;

  const header = (
    <View style={{ gap: th.space(3) }}>
      <StatRow tiles={[
        { icon: CalendarClock, tone: 'info', label: t('Chalu plan'), loading: q.isLoading, value: String(all.filter((x) => x.status === 'ACTIVE').length) },
        { icon: Truck, tone: due ? 'warning' : 'neutral', label: t('Delivery aaj / kal'), loading: q.isLoading, value: String(due) },
      ]} />
      <Segmented value={status} onChange={setStatus} options={[{ value: 'ACTIVE', label: t('Chalu') }, { value: 'PAUSED', label: t('Ruki hui') }, { value: '', label: t('Sab') }]} />
      <OfflineNote feature="meatDesk" />
    </View>
  );

  return (
    <>
      <ListTemplate<Subscription>
        title={t('Supply plans')}
        grouped={false}
        search={{ value: search, onChange: setSearch, placeholder: t('Plan, customer ya pata…') }}
        summary={header}
        data={rows}
        loading={q.isLoading}
        error={q.data ? null : q.error}
        onRetry={() => void q.refetch()}
        refreshing={q.isRefetching}
        onRefresh={() => void q.refetch()}
        keyExtractor={(x) => x.id}
        renderItem={({ item: x }) => {
          const st = SUB_STATUS[x.status] ?? { label: x.status, tone: 'neutral' as const };
          return (
            <RowCard>
              <ListRow icon={CalendarClock} iconTone={planDue(x) ? 'warning' : st.tone}
                title={<Row gap={1.5} wrap><Text weight="semibold" numberOfLines={1} style={{ flexShrink: 1 }}>{x.contactPerson ?? x.subscriptionNumber}</Text><Badge tone={st.tone}>{t(st.label)}</Badge></Row>}
                subtitle={<View style={{ gap: 2 }}><Text size="xs" tone="muted" ltr numberOfLines={1}>{`${x.subscriptionNumber} · ${freqLabel(x.frequency)}`}</Text><Text size="xs" tone="secondary" numberOfLines={1}>{x.standardItems.map((i) => `${i.productName} ${kg(i.kg)}`).join(', ')}</Text>{!!x.nextDeliveryDate && x.status === 'ACTIVE' && <Text size="xs" tone={planDue(x) ? 'warning' : 'muted'}>{t('Agli delivery')} {formatDate(x.nextDeliveryDate)}</Text>}</View>}
                trailing={<View style={{ alignItems: 'flex-end' }}><Text size="sm" weight="semibold" ltr>{kg(x.totalMonthlyKg)}</Text><Text size="2xs" tone="muted">{t('Kg / mahina')}</Text></View>}
                chevron onPress={() => setOpen(x)} />
            </RowCard>
          );
        }}
        empty={<EmptyState icon={CalendarClock} title={search ? t('Koi plan nahi mila') : t('Abhi koi supply plan nahi')} message={t('Restaurant ya ghar ka roz / hafta war gosht ka plan banayein.')} />}
        fab={canEdit ? { icon: Plus, label: t('Naya supply plan'), onPress: () => guard(() => setForm('new')) } : undefined}
      />
      <PlanSheet s={live} canEdit={canEdit} onClose={() => setOpen(null)} onEdit={(x) => { setOpen(null); guard(() => setForm(x)); }} />
      <PlanForm value={form} onClose={() => setForm(null)} />
    </>
  );
}

function PlanSheet({ s, canEdit, onClose, onEdit }: { s: Subscription | null; canEdit: boolean; onClose: () => void; onEdit: (s: Subscription) => void }) {
  const th = useTheme();
  const { guard } = useDeskOnline('meatDesk');
  const [reasonFor, setReasonFor] = useState<'pause' | 'cancel' | null>(null);
  const [busy, setBusy] = useState(false);
  const run = async (fn: () => Promise<unknown>, ok: string) => {
    setBusy(true);
    try { await fn(); refreshMeat([MEAT_KEYS.subs, MEAT_KEYS.orders]); toast.success(ok); } catch (e) { toast.error(errorText(e, t('Nahi hua'))); } finally { setBusy(false); }
  };
  return (
    <>
      <Sheet open={!!s && !reasonFor} onClose={onClose} height={0.88} title={s?.contactPerson ?? s?.subscriptionNumber} description={s ? `${s.subscriptionNumber} · ${freqLabel(s.frequency)}` : undefined}
        footer={s && canEdit && s.status === 'ACTIVE' ? <Button fullWidth size="lg" icon={Truck} loading={busy} onPress={() => guard(() => void run(() => subscriptionsApi.deliver(s.id).then((r) => toast.success(t('Order {{orderNumber}} ban gaya', { orderNumber: r.orderNumber }))), t('Aaj ki delivery bana di')))}>{t('Aaj ki delivery banayein')}</Button> : undefined}>
        {s && (
          <View style={{ gap: th.space(3) }}>
            <Row gap={2} wrap><Badge tone={(SUB_STATUS[s.status] ?? { tone: 'neutral' as const }).tone}>{t(SUB_STATUS[s.status]?.label ?? s.status)}</Badge>{s.discountPct > 0 && <Badge tone="success">{`${s.discountPct}%`}</Badge>}</Row>
            <Card flush title={t('Roz / baar ka maal')}>
              {s.standardItems.map((i, k) => <ListRow key={k} dense divider={k < s.standardItems.length - 1} title={i.productName} trailing={<Text size="sm" weight="semibold" ltr>{kg(i.kg)}</Text>} />)}
            </Card>
            <Card flush>
              <DetailRow label={t('Delivery ka pata')} value={s.deliveryAddress} />
              {!!s.deliveryTimeSlot && <DetailRow label={t('Waqt (marzi)')} value={s.deliveryTimeSlot} />}
              <DetailRow label={t('Kg / mahina')} value={kg(s.totalMonthlyKg)} />
              <DetailRow label={t('Kul delivery')} value={`${s.totalDeliveries} · ${formatMoney(s.totalRevenue)}`} />
              {!!s.nextDeliveryDate && <DetailRow label={t('Agli delivery')} value={formatDate(s.nextDeliveryDate, { year: true })} />}
              {!!s.pauseReason && <DetailRow label={t('Wajah (marzi)')} value={s.pauseReason} />}
              <DetailRow label={t('Note')} value={s.notes ?? '—'} last />
            </Card>
            {canEdit && (
              <Row gap={2} wrap>
                {s.status === 'ACTIVE' && <Button variant="secondary" icon={Pause} style={{ flex: 1 }} onPress={() => guard(() => setReasonFor('pause'))}>{t('Rokein')}</Button>}
                {s.status === 'PAUSED' && <Button variant="secondary" icon={Play} style={{ flex: 1 }} loading={busy} onPress={() => guard(() => void run(() => subscriptionsApi.resume(s.id), t('Plan dobara chalu')))}>{t('Dobara chalu')}</Button>}
                {(s.status === 'ACTIVE' || s.status === 'PAUSED') && <Button variant="secondary" style={{ flex: 1 }} onPress={() => onEdit(s)}>{t('Badlein')}</Button>}
                {(s.status === 'ACTIVE' || s.status === 'PAUSED') && <Button variant="ghost" icon={XCircle} style={{ flex: 1 }} onPress={() => guard(() => setReasonFor('cancel'))}>{t('Band karein')}</Button>}
              </Row>
            )}
          </View>
        )}
      </Sheet>
      <ReasonSheet open={!!reasonFor} title={reasonFor === 'pause' ? t('Plan rokein') : t('Plan band karein?')} cta={reasonFor === 'pause' ? t('Rokein') : t('Band karein')} danger={reasonFor === 'cancel'} required={false} label={t('Wajah (marzi)')} onClose={() => setReasonFor(null)}
        onConfirm={async (reason) => { await run(() => (reasonFor === 'pause' ? subscriptionsApi.pause(s!.id, opt(reason)) : subscriptionsApi.cancel(s!.id, opt(reason))), reasonFor === 'pause' ? t('Plan ruk gaya') : t('Plan band')); }} />
    </>
  );
}

interface Line { productId: string; name: string; kg: number | null; rate: number }

function PlanForm({ value, onClose }: { value: Subscription | 'new' | null; onClose: () => void }) {
  const th = useTheme();
  const s = value === 'new' ? null : value;
  const [customer, setCustomer] = useState<PickedCustomer | null>(null);
  const [pick, setPick] = useState(false);
  const [freq, setFreq] = useState<SubscriptionFreq>('DAILY');
  const [address, setAddress] = useState('');
  const [slot, setSlot] = useState('');
  const [discount, setDiscount] = useState<number | null>(null);
  const [lines, setLines] = useState<Line[]>([]);
  const [picking, setPicking] = useState(false);
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!value) return;
    setCustomer(s ? { id: s.customerId, name: s.contactPerson ?? t('Customer'), phone: s.contactPhone ?? null, balance: 0, creditLimit: 0 } : null);
    setFreq(s?.frequency ?? 'DAILY'); setAddress(s?.deliveryAddress ?? ''); setSlot(s?.deliveryTimeSlot ?? ''); setDiscount(s?.discountPct || null);
    setLines(s?.standardItems.map((i) => ({ productId: i.productId, name: i.productName, kg: i.kg, rate: 0 })) ?? []); setNotes(s?.notes ?? '');
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps
  const est = planMonthly(lines.map((l) => ({ kg: l.kg ?? 0, rate: l.rate })), freq, discount ?? 0);
  const error = !customer ? t('Customer chunein') : !address.trim() ? t('Delivery ka pata likhein') : !lines.length ? t('Kam se kam ek item') : lines.some((l) => !((l.kg ?? 0) > 0)) ? t('Har item ke kg likhein') : discount != null && (discount < 0 || discount > 50) ? t('Discount 0 se 50% tak') : '';
  const save = async () => {
    if (error) { toast.error(error); return; }
    const body = { customerId: customer!.id, frequency: freq, deliveryAddress: address.trim(), deliveryTimeSlot: opt(slot) ?? null, discountPct: discount ?? 0, notes: opt(notes) ?? null, standardItems: lines.map((l) => ({ productId: l.productId, kg: l.kg ?? 0 })) };
    setBusy(true);
    try { const r = s ? await subscriptionsApi.update(s.id, body) : await subscriptionsApi.create(body); refreshMeat([MEAT_KEYS.subs]); toast.success(s ? t('Plan badal diya') : t('Plan {{subscriptionNumber}} ban gaya', { subscriptionNumber: r.subscriptionNumber })); onClose(); }
    catch (e) { toast.error(errorText(e, t('Plan save nahi hua'))); } finally { setBusy(false); }
  };
  return (
    <>
      <Sheet open={!!value && !pick && !picking} onClose={onClose} height={0.95} title={s ? t('{{subscriptionNumber}} badlein', { subscriptionNumber: s.subscriptionNumber }) : t('Naya supply plan')} description={est.kg ? `${t('Kg / mahina')}: ${kg(est.kg)}` : undefined} footer={<Button fullWidth size="lg" loading={busy} onPress={() => void save()}>{t('Save')}</Button>}>
        <View style={{ gap: th.space(3) }}>
          <ListRow icon={CalendarClock} title={customer ? customer.name : t('Customer')} subtitle={customer?.phone ?? t('Naam ya phone likhein')} chevron={!s} onPress={s ? undefined : () => setPick(true)} />
          <Select label={t('Kitni dafa')} value={freq} onChange={(v) => setFreq(v as SubscriptionFreq)} options={FREQ.map((f) => ({ value: f.value, label: t(f.label) }))} />
          <Input label={t('Waqt (marzi)')} value={slot} onChangeText={setSlot} maxLength={60} placeholder={t('Subah 9 se 10')} />
          <NumberInput label={t('Discount %')} value={discount} onChangeValue={setDiscount} />
          <Input label={t('Delivery ka pata')} value={address} onChangeText={setAddress} maxLength={1000} />
          {lines.map((l, i) => (
            <Row key={l.productId} gap={2} align="end">
              <View style={{ flex: 2 }}><Text size="sm" weight="medium" numberOfLines={2}>{l.name}</Text></View>
              <View style={{ flex: 1 }}><NumberInput value={l.kg} onChangeValue={(v) => setLines((ls) => ls.map((x, j) => (j === i ? { ...x, kg: v } : x)))} hint="kg" /></View>
              <IconButton icon={Trash2} label={t('Hatayein')} variant="ghost" onPress={() => setLines((ls) => ls.filter((_, j) => j !== i))} />
            </Row>
          ))}
          <Button variant="secondary" icon={Plus} onPress={() => setPicking(true)}>{t('Item jorein')}</Button>
          <TextArea label={t('Note (marzi)')} value={notes} onChangeText={setNotes} maxLength={500} />
          {est.estimate > 0 && <Text size="sm" tone="secondary">{t('Andaza / mahina')}: <Amount value={est.estimate} weight="bold" /></Text>}
        </View>
      </Sheet>
      <CustomerPickerSheet open={pick} title={t('Customer')} onPick={(c) => { setCustomer(c); setPick(false); }} onClose={() => setPick(false)} />
      <ProductPicker open={!!value && picking} onClose={() => setPicking(false)} title={t('Item jorein')} variants={false} includeRaw={false} pickedIds={new Set(lines.map((l) => l.productId))}
        onPick={({ product }) => { setLines((ls) => [...ls, { productId: product.id, name: product.name, kg: null, rate: product.price }]); setPicking(false); }} />
    </>
  );
}
