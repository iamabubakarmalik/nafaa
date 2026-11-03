/**
 * Home delivery (web DeliveriesPage): the day's list per slot and route. Make the
 * list from every customer's daily litres, mark homes delivered one by one or all
 * together (each makes a bill on the customer's khata), correct a quantity, skip
 * or cancel. Undoing a delivered one needs the bill void permission and the
 * manager PIN when the shop asks for it.
 */

import { useMutation, useQuery } from '@tanstack/react-query';
import { Ban, CheckCircle2, Clock, ListChecks, Pencil, Plus, Truck, Undo2 } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { deliveryAmount } from '@nafaa/core/industries/dairy';
import { formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { Amount, Badge, Button, Card, ChipGroup, EmptyState, Input, ListRow, ListTemplate, MoneyInput, Row, Segmented, Sheet, SwipeRow, Text, confirm, toast, useTheme } from '@/design';
import { NumberInput } from '@/modules/inventory/components/fields';
import { withManagerPin } from '@/core/security/ManagerPin';
import { useCostMask } from '@/modules/sales/lib/mask';
import { OfflineNote, errorText, todayKey, useDeskOnline } from '../../_shared/deskKit';
import { DayBar } from '../../_shared/farm/DayBar';
import { PickerSheet } from '../../_shared/farm/PickerSheet';
import { RowCard, StatRow } from '../../_shared/farm/ui';
import { dairyCustomersApi, dairyDeliveriesApi, routesApi, type DairyCustomer, type DairyDelivery } from '../api';
import { DAIRY_KEYS, DELIVERY_STATUS, PAY_METHODS, liters, opt, qty, refreshDairy, slotLabel, slotNow } from '../meta';

type Tab = 'pending' | 'delivered' | 'skipped' | 'all';
const inTab = (d: DairyDelivery, tab: Tab) => (tab === 'all' ? true : tab === 'pending' ? d.status === 'SCHEDULED' : tab === 'delivered' ? d.status === 'DELIVERED' : d.status === 'SKIPPED' || d.status === 'CANCELLED');

export function DeliveriesScreen() {
  const th = useTheme();
  const canVoid = usePermission()(P.SALES_VOID);
  const { guard } = useDeskOnline('dairyDesk');
  const { cost } = useCostMask();
  const [date, setDate] = useState(todayKey());
  const [slot, setSlot] = useState<'MORNING' | 'EVENING'>(slotNow());
  const [routeId, setRouteId] = useState('');
  const [tab, setTab] = useState<Tab>('pending');
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<DairyDelivery | null>(null);
  const [undo, setUndo] = useState<{ d: DairyDelivery; kind: 'skip' | 'cancel' } | null>(null);
  const [adding, setAdding] = useState(false);
  const today = todayKey();
  const sheetQ = useQuery({ queryKey: [DAIRY_KEYS.deliveries, date, slot, routeId, search.trim()], queryFn: () => dairyDeliveriesApi.sheet({ from: date, to: date, slot, routeId: routeId || undefined, search: search.trim() || undefined }), refetchInterval: 60_000 });
  const sumQ = useQuery({ queryKey: [DAIRY_KEYS.deliveries, 'summary', date], queryFn: () => dairyDeliveriesApi.summary(date) });
  const routesQ = useQuery({ queryKey: [DAIRY_KEYS.routes, 'active'], queryFn: () => routesApi.all({ active: true }), staleTime: 5 * 60_000 });
  const all = sheetQ.data ?? [];
  const pending = all.filter((d) => d.status === 'SCHEDULED');
  const rows = all.filter((d) => inTab(d, tab));
  const s = sumQ.data;
  const counts: Record<Tab, number> = { pending: pending.length, delivered: all.filter((d) => inTab(d, 'delivered')).length, skipped: all.filter((d) => inTab(d, 'skipped')).length, all: all.length };

  const generate = useMutation({
    mutationFn: () => dairyDeliveriesApi.generate({ date, slot, routeId: routeId || undefined }),
    onSuccess: (r) => { refreshDairy([DAIRY_KEYS.deliveries]); toast.success(r.generatedCount ? t('{{generatedCount}} ghar list me aa gaye', { generatedCount: r.generatedCount }) : t('List pehle se bani hui hai — koi naya ghar nahi')); setTab('pending'); },
    onError: (e) => toast.error(errorText(e, t('List nahi bani'))),
  });
  const deliverOne = useMutation({
    mutationFn: (d: DairyDelivery) => dairyDeliveriesApi.deliver(d.id, { deliveredQty: d.scheduledQty }),
    onSuccess: (_r, d) => { refreshDairy([DAIRY_KEYS.deliveries], true); toast.success(t('{{value}} — {{scheduledQty}} pohancha, khate me likha', { value: d.customer?.name ?? t('Customer'), scheduledQty: liters(d.scheduledQty) })); },
    onError: (e) => toast.error(errorText(e, t('Delivery save nahi hui'))),
  });
  const deliverAll = async () => {
    const ok = await confirm({ title: t('Sab pohancha'), message: t('{{count}} ghar ki delivery khaton me likh di jayegi', { count: pending.length }), confirmLabel: t('Sab pohancha') });
    if (!ok) return;
    try {
      const r = await dairyDeliveriesApi.confirmAll({ date, slot, routeId: routeId || undefined, ids: pending.map((d) => d.id) });
      refreshDairy([DAIRY_KEYS.deliveries], true);
      if (r.failed.length) toast.warning(t('{{done}} pohanchi, {{count}} reh gayi', { done: r.done, count: r.failed.length }), { message: r.failed[0]?.reason });
      else toast.success(t('{{done}} delivery pohanchi — sab khaton me likh di', { done: r.done }));
    } catch (e) { toast.error(errorText(e, t('Delivery save nahi hui'))); }
  };

  const header = (
    <View style={{ gap: th.space(3) }}>
      <DayBar value={date} onChange={setDate} />
      <Segmented value={slot} onChange={setSlot} options={[{ value: 'MORNING', label: t('Subah') }, { value: 'EVENING', label: t('Shaam') }]} />
      {(routesQ.data ?? []).length > 0 && <ChipGroup value={routeId} onChange={setRouteId} style={{ marginHorizontal: -th.space(4) }} options={[{ value: '', label: t('Sab route') }, ...(routesQ.data ?? []).map((r) => ({ value: r.id, label: r.name }))]} />}
      <StatRow tiles={[
        { icon: Truck, tone: 'info', label: t('Doodh gaya'), loading: sumQ.isLoading, value: liters(s?.totalLiters ?? 0), hint: t('Subah {{morningLiters}} · Shaam {{eveningLiters}}', { morningLiters: liters(s?.morningLiters), eveningLiters: liters(s?.eveningLiters) }) },
        { icon: CheckCircle2, tone: 'success', label: t('Khate me likha'), loading: sumQ.isLoading, value: cost(s?.totalRevenue ?? 0), hint: `${t('Darwaze par mila')} ${cost(s?.collected ?? 0)}` },
      ]} />
      <ChipGroup value={tab} onChange={(v) => setTab(v as Tab)} style={{ marginHorizontal: -th.space(4) }} options={[
        { value: 'pending', label: `${t('Baqi')} · ${counts.pending}` }, { value: 'delivered', label: `${t('Pohancha')} · ${counts.delivered}` }, { value: 'skipped', label: `${t('Naga / cancel')} · ${counts.skipped}` }, { value: 'all', label: t('Sab') },
      ]} />
      <Row gap={2}>
        <Button style={{ flex: 1 }} variant="secondary" icon={ListChecks} loading={generate.isPending} disabled={date > today} onPress={() => guard(() => generate.mutate())}>{t('List banayein')}</Button>
        {pending.length > 0 && date <= today && <Button style={{ flex: 1 }} variant="success" icon={CheckCircle2} onPress={() => guard(() => void deliverAll())}>{t('Sab pohancha')}</Button>}
      </Row>
      <OfflineNote feature="dairyDesk" />
    </View>
  );

  return (
    <>
      <ListTemplate<DairyDelivery>
        title={t('Home delivery')}
        grouped={false}
        search={{ value: search, onChange: setSearch, placeholder: t('Customer ka naam, number ya phone…') }}
        summary={header}
        data={rows}
        loading={sheetQ.isLoading}
        error={sheetQ.data ? null : sheetQ.error}
        onRetry={() => void sheetQ.refetch()}
        refreshing={sheetQ.isRefetching}
        onRefresh={() => { void sheetQ.refetch(); void sumQ.refetch(); }}
        keyExtractor={(d) => d.id}
        renderItem={({ item: d }) => {
          const st = DELIVERY_STATUS[d.status] ?? { label: d.status, tone: 'neutral' as const };
          const open = d.status === 'SCHEDULED' || d.status === 'SKIPPED';
          const done = d.status === 'DELIVERED';
          const row = (
            <RowCard dim={d.status === 'CANCELLED'}>
              <ListRow icon={done ? CheckCircle2 : Clock} iconTone={st.tone}
                title={<Row gap={1.5} wrap><Text weight="semibold" numberOfLines={1} style={{ flexShrink: 1 }}>{d.customer?.name ?? t('Customer')}</Text><Badge tone={st.tone}>{t(st.label)}</Badge></Row>}
                subtitle={<View style={{ gap: 2 }}><Text size="xs" tone="muted" numberOfLines={1}>{[d.customer?.customerNumber, d.customer?.area ?? d.customer?.address, d.customer?.route?.name].filter(Boolean).join(' · ')}</Text><Text size="xs" tone="secondary">{done ? `${qty(d.deliveredQty)} L @ ${formatMoney(d.ratePerLiter)}` : `${qty(d.scheduledQty)} L`}{d.skipReason ? ` · ${d.skipReason}` : ''}</Text></View>}
                trailing={done ? <Amount value={d.totalAmount} weight="bold" /> : undefined}
                chevron onPress={() => (open ? guard(() => setEditing(d)) : done && canVoid ? guard(() => setEditing(d)) : undefined)} />
            </RowCard>
          );
          const end = [
            ...(open ? [{ icon: CheckCircle2, label: t('Pohancha'), tone: 'success' as const, onPress: () => guard(() => deliverOne.mutate(d)) }, { icon: Pencil, label: t('Badlein'), tone: 'brand' as const, onPress: () => guard(() => setEditing(d)) }] : []),
            ...(d.status === 'SCHEDULED' ? [{ icon: Undo2, label: t('Naga'), tone: 'neutral' as const, onPress: () => guard(() => setUndo({ d, kind: 'skip' })) }] : []),
            ...(done && canVoid ? [{ icon: Undo2, label: t('Naga tha'), tone: 'neutral' as const, onPress: () => guard(() => setUndo({ d, kind: 'skip' })) }] : []),
            ...(d.status !== 'CANCELLED' && d.status !== 'DELIVERED' ? [{ icon: Ban, label: t('Cancel'), tone: 'danger' as const, onPress: () => guard(() => setUndo({ d, kind: 'cancel' })) }] : []),
          ];
          return end.length ? <SwipeRow end={end}>{row}</SwipeRow> : row;
        }}
        empty={<EmptyState icon={Truck} title={t('Abhi koi delivery nahi')} message={t('Subah ya shaam chun kar "List banayein" dabayein — har customer ki roz ki quantity se list ban jati hai.')} />}
        fab={{ icon: Plus, label: t('Extra delivery'), onPress: () => guard(() => setAdding(true)) }}
      />
      <DeliverSheet delivery={editing} onClose={() => setEditing(null)} />
      <UndoSheet value={undo} onClose={() => setUndo(null)} />
      <ExtraSheet open={adding} date={date} slot={slot} onClose={() => setAdding(false)} />
    </>
  );
}

/** Delivered with a different quantity, money taken at the door, or a correction. */
function DeliverSheet({ delivery: d, onClose }: { delivery: DairyDelivery | null; onClose: () => void }) {
  const th = useTheme();
  const posted = d?.status === 'DELIVERED';
  const [q, setQ] = useState<number | null>(null);
  const [paid, setPaid] = useState<number | null>(null);
  const [method, setMethod] = useState('CASH');
  const [busy, setBusy] = useState(false);
  const [seen, setSeen] = useState<string | null>(null);
  if (d && seen !== d.id) { setSeen(d.id); setQ(posted ? d.deliveredQty : d.scheduledQty); setPaid(null); setMethod('CASH'); }
  const n = q ?? 0;
  const amount = d ? deliveryAmount(n, d.ratePerLiter) : 0;
  const error = !(n > 0) || n > 1000 ? t('Quantity 0 se zyada aur 1000 se kam') : (paid ?? 0) > amount + 0.01 ? t('Bill sirf {{money}} ka hai — zyada paise customer ke khate me "Payment" se lein', { money: formatMoney(amount) }) : '';
  const save = async () => {
    if (!d || error) { if (error) toast.error(error); return; }
    setBusy(true);
    try {
      const body = { deliveredQty: n, paidAmount: paid ?? undefined, paymentMethod: method };
      if (posted) await withManagerPin(t('Delivery badalna'), (managerPin) => dairyDeliveriesApi.deliver(d.id, { ...body, managerPin }), 'void'); else await dairyDeliveriesApi.deliver(d.id, body);
      refreshDairy([DAIRY_KEYS.deliveries], true); toast.success(posted ? t('Delivery badal di — naya bill khate me') : t('Delivery save')); setSeen(null); onClose(); }
    catch (e) { toast.error(errorText(e, t('Save nahi hua'))); } finally { setBusy(false); }
  };
  return (
    <Sheet open={!!d} onClose={() => { setSeen(null); onClose(); }} title={d ? `${d.customer?.name ?? t('Customer')} — ${slotLabel(d.slot)}` : ''}
      description={d ? (posted ? t('Purana bill void hoga aur nayi quantity ka bill khate me likha jayega') : t('Roz ki quantity {{scheduledQty}} · rate {{ratePerLiter}}', { scheduledQty: liters(d.scheduledQty), ratePerLiter: formatMoney(d.ratePerLiter) })) : undefined}
      footer={<Button fullWidth size="lg" loading={busy} onPress={() => void save()}>{posted ? t('Badal dein') : t('Pohancha')}</Button>}>
      <View style={{ gap: th.space(3) }}>
        <NumberInput label={t('Kitna diya (liter)')} value={q} onChangeValue={setQ} hint={t('Bill: {{amount}}', { amount: formatMoney(amount) })} autoFocus />
        <ChipGroup wrap value={String(n)} onChange={(v) => setQ(Number(v))} options={[0.5, 1, 1.5, 2, 3, 5].map((v) => ({ value: String(v), label: `${v} L` }))} />
        <MoneyInput label={t('Darwaze par mile (marzi)')} value={paid} onChangeValue={setPaid} hint={t('Baqi khate me')} />
        <ChipGroup wrap value={method} onChange={setMethod} options={PAY_METHODS.map((m) => ({ value: m.value, label: t(m.label) }))} />
        <Card tone="muted"><Text size="sm" tone="secondary">{t('Doodh stock se nikalta hai aur bill customer ke khate me jata hai.')}</Text></Card>
      </View>
    </Sheet>
  );
}

function UndoSheet({ value, onClose }: { value: { d: DairyDelivery; kind: 'skip' | 'cancel' } | null; onClose: () => void }) {
  const th = useTheme();
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const d = value?.d;
  const posted = d?.status === 'DELIVERED';
  const presets = value?.kind === 'skip' ? ['Ghar band tha', 'Customer ne mana kiya', 'Bahar gaye hain', 'Rider nahi gaya'] : ['Ghalti se bani', 'Customer chhor gaya'];
  const run = async () => {
    if (!value || !d) return;
    setBusy(true);
    try {
      const call = (managerPin?: string) => { const body = { reason: opt(reason), managerPin }; return value.kind === 'skip' ? dairyDeliveriesApi.markSkipped(d.id, body) : dairyDeliveriesApi.markCancelled(d.id, body); };
      if (posted) await withManagerPin(t('Delivery badalna'), call, 'void'); else await call();
      refreshDairy([DAIRY_KEYS.deliveries], true);
      toast.success(value.kind === 'skip' ? t('Naga likh diya') : t('Delivery cancel'));
      setReason(''); onClose();
    } catch (e) { toast.error(errorText(e, t('Nahi hua'))); } finally { setBusy(false); }
  };
  return (
    <Sheet open={!!value} onClose={onClose} title={value ? (value.kind === 'skip' ? t('{{value}} — naga', { value: d?.customer?.name ?? '' }) : t('Delivery cancel')) : ''}
      description={posted ? t('Ye delivery khate me likhi ja chuki — us ka bill void hoga aur doodh stock me wapas aayega') : undefined}
      footer={<Button fullWidth size="lg" variant={value?.kind === 'cancel' ? 'danger' : 'primary'} loading={busy} onPress={() => void run()}>{value?.kind === 'skip' ? t('Naga likhein') : t('Cancel karein')}</Button>}>
      <View style={{ gap: th.space(3) }}>
        <ChipGroup wrap value={reason} onChange={setReason} options={presets.map((p) => ({ value: t(p), label: t(p) }))} />
        <Input label={t('Wajah')} value={reason} onChangeText={setReason} />
      </View>
    </Sheet>
  );
}

/** A delivery outside the fixed list: one-off order or extra milk. */
function ExtraSheet({ open, date, slot, onClose }: { open: boolean; date: string; slot: 'MORNING' | 'EVENING'; onClose: () => void }) {
  const th = useTheme();
  const [picked, setPicked] = useState<DairyCustomer | null>(null);
  const [picking, setPicking] = useState(false);
  const [amount, setAmount] = useState<number | null>(null);
  const [rate, setRate] = useState<number | null>(null);
  const [now, setNow] = useState(true);
  const [busy, setBusy] = useState(false);
  const save = async () => {
    if (!picked) { toast.error(t('Customer chunein')); return; }
    if (!amount || amount <= 0 || amount > 1000) { toast.error(t('Quantity 0 se zyada aur 1000 se kam')); return; }
    setBusy(true);
    try { await dairyDeliveriesApi.add({ dairyCustomerId: picked.id, deliveryDate: date, slot, scheduledQty: amount, ratePerLiter: rate ?? undefined, deliverNow: now }); refreshDairy([DAIRY_KEYS.deliveries], now); toast.success(now ? t('Delivery khate me likh di') : t('List me jor di')); setPicked(null); setAmount(null); setRate(null); onClose(); }
    catch (e) { toast.error(errorText(e, t('Save nahi hua'))); } finally { setBusy(false); }
  };
  return (
    <>
      <Sheet open={open && !picking} onClose={onClose} title={t('Extra delivery — {{slot}}', { slot: slotLabel(slot) })} description={t('Roz ki list ke ilawa — jaise mehmaan aaye, ya jab maange wala customer')}
        footer={<Button fullWidth size="lg" loading={busy} onPress={() => void save()}>{now ? t('Pohancha — khate me likhein') : t('List me jorein')}</Button>}>
        <View style={{ gap: th.space(3) }}>
          <ListRow icon={Truck} title={picked ? picked.name : t('Customer chunein')} subtitle={picked ? `${picked.customerNumber} · ${picked.address ?? picked.phone ?? ''}` : t('Customer ka naam, number ya phone…')} chevron onPress={() => setPicking(true)} />
          <NumberInput label={t('Quantity (liter)')} value={amount} onChangeValue={setAmount} />
          <MoneyInput label={t('Rate (marzi)')} value={rate} onChangeValue={setRate} hint={t('Khali = customer ya dukaan ka rate')} />
          {!!amount && !!rate && <Text size="sm" tone="secondary">{t('Bill: {{value}}', { value: formatMoney(amount * rate) })}</Text>}
          <ChipGroup value={now ? 'now' : 'list'} onChange={(v) => setNow(v === 'now')} options={[{ value: 'now', label: t('Abhi de diya (khate me abhi likhein)') }, { value: 'list', label: t('List me jorein') }]} />
        </View>
      </Sheet>
      <PickerSheet<DairyCustomer> open={open && picking} title={t('Customer chunein')} cacheKey="dairy-customers" onClose={() => setPicking(false)} placeholder={t('Customer ka naam, number ya phone…')}
        load={(term) => dairyCustomersApi.page({ tab: 'all', search: term || undefined, limit: 15 }).then((r) => r.items.filter((c) => c.status !== 'CLOSED'))}
        onPick={(c) => { setPicked(c); if (c.customRate) setRate(c.customRate); setPicking(false); }}
        row={(c, pick) => <ListRow dense icon={Truck} title={c.name} subtitle={[c.customerNumber, c.area].filter(Boolean).join(' · ')} onPress={pick} />} />
    </>
  );
}
