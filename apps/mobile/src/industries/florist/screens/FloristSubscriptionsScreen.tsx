/**
 * Flower subscriptions (web FloristSubscriptionsPage): daily, weekly or monthly
 * bouquets for a home or office. "Delivered" bills that delivery to the
 * customer's khata. Needs the server.
 */

import { useMutation, useQuery } from '@tanstack/react-query';
import { CheckCircle2, Pause, Play, Plus, Repeat, Truck, Wallet, XCircle } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { daysUntil } from '@nafaa/core/industries/florist';
import { formatDate, formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { Amount, Badge, ChipGroup, DatePicker, EmptyState, FormSection, Input, ListRow, ListTemplate, MoneyInput, Row, Segmented, Sheet, Button, StatTile, SwipeRow, Text, TextArea, confirm, toast, useTheme, type SwipeAction } from '@/design';
import { usePaged } from '@/modules/inventory/stock/usePaged';
import { CachedNote } from '@/modules/sales/components/CachedNote';
import { OfflineNote, dateToKey, errorText, keyToDate, todayKey, useDeskOnline } from '../../_shared/deskKit';
import { floristSubscriptionsApi, type SubFrequency, type Subscription, type SubscriptionInput } from '../api';
import { FLORIST_KEYS, FREQUENCY, SUB_STATUS, frequencyLabel, refreshFlorist } from '../meta';

type Tab = 'due' | 'ACTIVE' | 'PAUSED' | 'all';
const LIMIT = 25;
const phoneOk = (v: string) => /^[0-9+\-\s]{10,15}$/.test(v.trim());

export function FloristSubscriptionsScreen() {
  const th = useTheme();
  const canWork = usePermission()(P.POS_USE);
  const { guard } = useDeskOnline('floristOrders');
  const [tab, setTab] = useState<Tab>('due');
  const [search, setSearch] = useState('');
  const [form, setForm] = useState<Subscription | 'new' | null>(null);
  const today = todayKey();
  const params = { search: search.trim() || undefined, due: tab === 'due' ? true : undefined, status: tab === 'ACTIVE' || tab === 'PAUSED' ? tab : undefined, limit: LIMIT };
  const list = usePaged([FLORIST_KEYS.subscriptions, 'paged', tab, params], (page) => floristSubscriptionsApi.paged({ ...params, page }).then((r) => ({ ...r, pages: Math.max(Math.ceil(r.total / LIMIT), 1) })));
  const head = useQuery({ queryKey: [FLORIST_KEYS.subscriptions, 'head'], queryFn: () => floristSubscriptionsApi.paged({ limit: 1 }) });
  const counts = head.data?.counts ?? {};

  const act = useMutation({
    mutationFn: ({ s, kind }: { s: Subscription; kind: 'pause' | 'resume' | 'cancel' }) => floristSubscriptionsApi[kind](s.id),
    onSuccess: () => refreshFlorist([FLORIST_KEYS.subscriptions]),
    onError: (e) => toast.error(errorText(e, t('Nahi hua'))),
  });
  const deliver = async (s: Subscription) => {
    const ok = await confirm({ title: t('Delivery ho gayi?'), message: t('{{customerName}} ki {{value}}vi delivery.', { customerName: s.customerName, value: s.completedDeliveries + 1 }) + (s.pricePerDelivery > 0 ? ` ${t('{{price}} customer ke khate me udhaar likhe jayenge.', { price: formatMoney(s.pricePerDelivery) })}` : ''), confirmLabel: t('Haan, likhein') });
    if (!ok) return;
    try { const r = await floristSubscriptionsApi.markDelivered(s.id); refreshFlorist([FLORIST_KEYS.subscriptions], true); toast.success(r.sale ? t('Delivery likhi — bill {{saleNumber}} khate me', { saleNumber: r.sale.saleNumber }) : t('Delivery likh di')); }
    catch (e) { toast.error(errorText(e, t('Delivery nahi likhi'))); }
  };
  const cancel = async (s: Subscription) => {
    if (await confirm({ title: t('Subscription band?'), message: t('Aage koi delivery nahi banegi. Pichli deliveries ke bill aur khata waise hi rahenge.'), tone: 'danger', confirmLabel: t('Haan, band') })) act.mutate({ s, kind: 'cancel' });
  };

  const header = (
    <View style={{ gap: th.space(3) }}>
      <Row gap={2}>
        <StatTile style={{ flex: 1 }} icon={Truck} tone={head.data?.due ? 'danger' : 'neutral'} label={t('Aaj deni hain')} loading={head.isLoading} value={String(head.data?.due ?? 0)} onPress={() => setTab('due')} />
        <StatTile style={{ flex: 1 }} icon={Wallet} tone="info" label={t('Ek round ki value')} loading={head.isLoading} value={formatMoney(head.data?.perRound ?? 0)} hint={t('Sab chalu subscriptions')} />
      </Row>
      <Segmented value={tab} onChange={setTab} options={[{ value: 'due', label: t('Aaj') }, { value: 'ACTIVE', label: t('Chalu') }, { value: 'PAUSED', label: t('Ruki hui') }, { value: 'all', label: t('Sab') }]} />
      <OfflineNote feature="floristOrders" />
      <CachedNote query={head} />
    </View>
  );

  return (
    <>
      <ListTemplate<Subscription>
        title={t('Phool subscriptions')}
        grouped={false}
        search={{ value: search, onChange: setSearch, placeholder: t('Naam, phone, number, plan ya pata…') }}
        summary={header}
        data={list.items}
        loading={list.loading}
        error={list.error}
        onRetry={list.refetch}
        refreshing={list.refreshing}
        onRefresh={() => { list.refetch(); void head.refetch(); }}
        onEndReached={list.loadMore}
        keyExtractor={(s) => s.id}
        renderItem={({ item: s }) => {
          const left = daysUntil(s.nextDeliveryDate, today);
          const dueNow = s.status === 'ACTIVE' && left !== null && left <= 0;
          const st = SUB_STATUS[s.status];
          const end: SwipeAction[] = !canWork ? [] : [
            ...(dueNow ? [{ icon: CheckCircle2, label: t('Delivery ho gayi'), tone: 'success' as const, onPress: () => guard(() => void deliver(s)) }] : []),
            ...(s.status === 'ACTIVE' ? [{ icon: Pause, label: t('Rokein'), tone: 'brand' as const, onPress: () => guard(() => act.mutate({ s, kind: 'pause' })) }] : []),
            ...(s.status === 'PAUSED' ? [{ icon: Play, label: t('Dobara chalayein'), tone: 'brand' as const, onPress: () => guard(() => act.mutate({ s, kind: 'resume' })) }] : []),
            ...(s.status !== 'CANCELLED' ? [{ icon: XCircle, label: t('Band karein'), tone: 'danger' as const, onPress: () => guard(() => void cancel(s)) }] : []),
          ];
          return (
            <View style={{ marginHorizontal: th.space(4), marginBottom: th.space(2), borderRadius: th.radius('xl'), overflow: 'hidden', backgroundColor: th.colors.surface, borderWidth: th.isDark ? 1 : 0.5, borderColor: th.colors.border }}>
              <SwipeRow end={end}>
                <ListRow icon={Repeat} iconTone={dueNow ? 'danger' : st.tone}
                  title={<Row gap={1.5} wrap><Text weight="semibold" numberOfLines={1} style={{ flexShrink: 1 }}>{s.customerName}</Text><Badge tone={st.tone}>{t(st.label)}</Badge></Row>}
                  subtitle={<View style={{ gap: 2 }}>
                    <Text size="xs" tone="muted" numberOfLines={1}>{[s.subscriptionNumber, s.planName, s.bouquetType].filter(Boolean).join(' · ')}</Text>
                    <Text size="xs" tone={dueNow ? 'danger' : 'secondary'}>{s.status !== 'ACTIVE' ? t('{{completedDeliveries}} deliveries', { completedDeliveries: s.completedDeliveries }) : left === null ? '' : left < 0 ? t('{{value}} din se reh gayi', { value: -left }) : left === 0 ? t('Aaj deni hai') : `${formatDate(s.nextDeliveryDate!)} · ${frequencyLabel(s.frequency)}`}</Text>
                  </View>}
                  trailing={<View style={{ alignItems: 'flex-end', gap: 4 }}><Amount value={s.pricePerDelivery} weight="bold" /><Text size="2xs" tone="muted">{t('har delivery')}</Text></View>}
                  chevron={canWork && s.status !== 'CANCELLED'} onPress={canWork && s.status !== 'CANCELLED' ? () => guard(() => setForm(s)) : undefined} />
              </SwipeRow>
            </View>
          );
        }}
        empty={<EmptyState icon={Repeat} title={tab === 'due' ? t('Aaj koi delivery baqi nahi') : t('Is filter me kuch nahi')} message={t('Ghar ya office me har hafte phool — subscription banayein, har delivery ka bill khud khate me jayega.')} />}
        fab={canWork ? { icon: Plus, label: t('Nayi subscription'), onPress: () => guard(() => setForm('new')) } : undefined}
      />
      <SubForm sub={form} onClose={() => setForm(null)} />
    </>
  );
}

function SubForm({ sub, onClose }: { sub: Subscription | 'new' | null; onClose: () => void }) {
  const th = useTheme();
  const s0 = sub === 'new' ? null : sub;
  const [d, setD] = useState({ customerName: '', customerPhone: '', deliveryAddress: '', planName: '', bouquetType: '', frequency: 'WEEKLY' as SubFrequency, pricePerDelivery: null as number | null, startDate: todayKey(), endDate: '', notes: '' });
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!sub) return;
    setTouched(false);
    setD({ customerName: s0?.customerName ?? '', customerPhone: s0?.customerPhone ?? '', deliveryAddress: s0?.deliveryAddress ?? '', planName: s0?.planName ?? '', bouquetType: s0?.bouquetType ?? '',
      frequency: s0?.frequency ?? 'WEEKLY', pricePerDelivery: s0?.pricePerDelivery ?? null, startDate: s0?.startDate.slice(0, 10) ?? todayKey(), endDate: s0?.endDate?.slice(0, 10) ?? '', notes: s0?.notes ?? '' });
  }, [sub]); // eslint-disable-line react-hooks/exhaustive-deps
  const set = <K extends keyof typeof d>(k: K, v: (typeof d)[K]) => setD((x) => ({ ...x, [k]: v }));
  const errors: Record<string, string> = {};
  if (!d.customerName.trim()) errors.customerName = t('Customer ka naam likhein');
  if (!phoneOk(d.customerPhone)) errors.customerPhone = t('Phone 10 se 15 hindse');
  if (!d.deliveryAddress.trim()) errors.deliveryAddress = t('Pata likhein');
  if (!d.planName.trim()) errors.planName = t('Plan ka naam likhein');
  if (!d.bouquetType.trim()) errors.bouquetType = t('Kaun sa bouquet — likhein');
  if (d.pricePerDelivery === null || d.pricePerDelivery < 0) errors.pricePerDelivery = t('Rate likhein');
  if (d.endDate && d.startDate && d.endDate < d.startDate) errors.endDate = t('Khatam ki date shuru se pehle nahi');
  const err = (k: string) => (touched ? errors[k] : undefined);
  const first = Object.values(errors)[0];
  const save = async () => {
    setTouched(true);
    if (first) { toast.error(first); return; }
    const body: SubscriptionInput = { customerName: d.customerName.trim(), customerPhone: d.customerPhone.trim(), deliveryAddress: d.deliveryAddress.trim(), planName: d.planName.trim(), bouquetType: d.bouquetType.trim(),
      frequency: d.frequency, pricePerDelivery: d.pricePerDelivery ?? 0, startDate: d.startDate, endDate: d.endDate || undefined, notes: d.notes.trim() || undefined };
    setBusy(true);
    try {
      const r = s0 ? await floristSubscriptionsApi.update(s0.id, body) : await floristSubscriptionsApi.create(body);
      refreshFlorist([FLORIST_KEYS.subscriptions]);
      toast.success(s0 ? t('Save ho gaya') : t('Subscription {{subscriptionNumber}} ban gayi', { subscriptionNumber: r.subscriptionNumber }));
      onClose();
    } catch (e) { toast.error(errorText(e, t('Save nahi hua'))); } finally { setBusy(false); }
  };
  return (
    <Sheet open={!!sub} onClose={onClose} height={0.92} title={s0 ? t('{{subscriptionNumber}} badlein', { subscriptionNumber: s0.subscriptionNumber }) : t('Nayi subscription')}
      footer={<Button fullWidth size="lg" loading={busy} onPress={() => void save()}>{s0 ? t('Save') : t('Banayein')}</Button>}>
      <View style={{ gap: th.space(3) }}>
        <FormSection>
          <Input label={t('Customer')} value={d.customerName} onChangeText={(v) => set('customerName', v)} error={err('customerName')} hint={t('Pehli delivery par isi naam / phone se khata banta hai')} />
          <Input label={t('Phone')} keyboardType="phone-pad" ltr value={d.customerPhone} onChangeText={(v) => set('customerPhone', v)} error={err('customerPhone')} placeholder="0300 1234567" />
          <TextArea label={t('Pata')} value={d.deliveryAddress} onChangeText={(v) => set('deliveryAddress', v)} error={err('deliveryAddress')} />
          <Input label={t('Plan')} value={d.planName} onChangeText={(v) => set('planName', v)} error={err('planName')} placeholder={t('Office reception, ghar ka guldasta')} />
          <Input label={t('Bouquet')} value={d.bouquetType} onChangeText={(v) => set('bouquetType', v)} error={err('bouquetType')} placeholder={t('12 gulab mix')} />
          <Text size="sm" weight="medium" tone="secondary">{t('Kitni dafa')}</Text>
          <ChipGroup value={d.frequency} onChange={(v) => set('frequency', v as SubFrequency)} options={Object.keys(FREQUENCY).map((k) => ({ value: k, label: frequencyLabel(k) }))} />
          <MoneyInput label={t('Rate har delivery')} value={d.pricePerDelivery} onChangeValue={(v) => set('pricePerDelivery', v)} error={err('pricePerDelivery')} />
          <DatePicker label={t('Shuru ki date')} value={keyToDate(d.startDate)} onChange={(x) => set('startDate', dateToKey(x))} />
          <DatePicker label={t('Khatam ki date (marzi)')} value={keyToDate(d.endDate)} onChange={(x) => set('endDate', dateToKey(x))} error={err('endDate')} />
          <TextArea label={t('Note (marzi)')} value={d.notes} onChangeText={(v) => set('notes', v)} />
        </FormSection>
      </View>
    </Sheet>
  );
}
