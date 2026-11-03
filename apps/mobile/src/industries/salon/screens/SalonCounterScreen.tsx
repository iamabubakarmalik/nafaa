/**
 * Salon counter (web SalonPosPage), shown in place of the shared counter:
 * pick who is in the chair (or a customer), add services with the stylist for
 * each, use the customer's membership or package session, a gift voucher,
 * discount and tip, then take payment. The bill goes through the salon API so
 * the stylist's commission is booked with the sale. Needs the server.
 */

import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { Crown, Gift, Package, Plus, Ticket, Trash2, UserCheck, X } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { commissionOf, salonBillTotals } from '@nafaa/core/industries/salon';
import { formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { Amount, Badge, Button, Card, Chip, Divider, EmptyState, Input, ListRow, MoneyInput, Row, Screen, SearchBar, Select, Sheet, Switch, Text, toast, useTheme } from '@/design';
import { CustomerField, type PickedCustomer } from '../../_shared/serviceKit';
import { OfflineNote, errorText, useDeskOnline } from '../../_shared/deskKit';
import { ProductPickerSheet, QtyStepper, SplitPaySheet, type SplitResult } from '../../_shared/payKit';
import { salonApi, type Appointment, type SalonBill, type VoucherLookup } from '../api';
import { SALON_KEYS, refreshSalon, serviceLine, staffName, timeOf, toIso } from '../meta';

interface Used { productId: string; name: string; quantity: number }
interface Line { key: number; serviceId: string; staffProfileId: string; price: number | null; packagePurchaseId: string; notes: string; used: Used[] }
interface Retail { productId: string; name: string; listPrice: number; price: number; quantity: number }
let seq = 1;

export function SalonCounterScreen() {
  const th = useTheme();
  const params = useLocalSearchParams<{ appointment?: string }>();
  const { guard } = useDeskOnline('salonDesk');
  const services = useQuery({ queryKey: [SALON_KEYS.services, 'active'], queryFn: () => salonApi.services.list({ active: true }) });
  const staff = useQuery({ queryKey: [SALON_KEYS.staff, 'bookable'], queryFn: () => salonApi.staff.list({ bookable: true }) });
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Karachi' });
  const waiting = useQuery({ queryKey: [SALON_KEYS.calendar, 'counter', today], queryFn: () => salonApi.appointments.calendar(toIso(today, '00:00'), toIso(today, '23:59')), refetchInterval: 30_000 });
  const [customer, setCustomer] = useState<PickedCustomer | null>(null);
  const [lines, setLines] = useState<Line[]>([]);
  const [appt, setAppt] = useState<Appointment | null>(null);
  const [member, setMember] = useState(false);
  const [discount, setDiscount] = useState<number | null>(null);
  const [tip, setTip] = useState<number | null>(null);
  const [voucher, setVoucher] = useState<VoucherLookup | null>(null);
  const [code, setCode] = useState('');
  const [picker, setPicker] = useState(false);
  const [products, setProducts] = useState<Retail[]>([]);
  const [retailOpen, setRetailOpen] = useState(false);
  const [usedFor, setUsedFor] = useState<number | null>(null);
  const [q, setQ] = useState('');
  const [pay, setPay] = useState(false);
  const [done, setDone] = useState<{ bill: SalonBill; appt: Appointment | null } | null>(null);
  const svc = services.data ?? [];
  const perks = useQuery({ queryKey: [SALON_KEYS.perks, customer?.id], queryFn: () => salonApi.bills.perks(customer!.id), enabled: !!customer });
  const memberPct = member ? perks.data?.membership?.discountPct ?? 0 : 0;

  const listOf = (l: Line) => {
    const s = svc.find((x) => x.id === l.serviceId);
    const custom = staff.data?.find((x) => x.id === l.staffProfileId)?.services?.find((x) => x.serviceId === l.serviceId)?.customPrice;
    return Number(custom ?? s?.discountPrice ?? s?.price ?? 0);
  };
  const voucherRs = voucher && !voucher.problem ? voucher.balance : 0;
  const totals = useMemo(() => salonBillTotals({
    services: lines.map((l) => ({ list: listOf(l), price: l.price, fromPackage: !!l.packagePurchaseId })), products: products.map((p) => ({ price: p.price, quantity: p.quantity })), memberPct, discount: discount ?? 0, tip: tip ?? 0, voucher: voucherRs, advance: 0,
  }), [lines, products, memberPct, discount, tip, voucherRs, svc, staff.data]); // eslint-disable-line react-hooks/exhaustive-deps
  const advance = appt?.paidAmount ?? 0;
  const due = Math.max(totals.total - advance, 0);
  const voucherUsed = Math.min(voucherRs, totals.services + totals.products);

  const load = (a: Appointment) => {
    setAppt(a);
    setCustomer(a.customerId ? { id: a.customerId, name: a.customer?.name ?? a.customerName ?? '', phone: a.customer?.phone ?? a.customerPhone ?? '' } : null);
    setLines(a.services.map((s) => ({ key: seq++, serviceId: s.serviceId, staffProfileId: s.staffProfileId ?? '', price: null, packagePurchaseId: '', notes: s.notes ?? '', used: [] })));
    setMember(false);
  };
  useEffect(() => {
    if (!params.appointment || appt?.id === params.appointment) return;
    void salonApi.appointments.getOne(params.appointment).then(load).catch(() => undefined);
  }, [params.appointment]); // eslint-disable-line react-hooks/exhaustive-deps
  const reset = () => { setLines([]); setProducts([]); setAppt(null); setCustomer(null); setMember(false); setDiscount(null); setTip(null); setVoucher(null); setCode(''); };
  const setLine = (key: number, p: Partial<Line>) => setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...p } : l)));
  const applyCode = async () => {
    try { const v = await salonApi.vouchers.lookup(code.trim()); setVoucher(v); if (v.problem) toast.warning(v.problem); } catch (e) { toast.error(errorText(e, t('Code nahi mila'))); }
  };
  const bill = async (p: SplitResult) => {
    const b = await salonApi.bills.create({
      appointmentId: appt?.id, customerId: customer?.id,
      services: lines.map((l) => ({ serviceId: l.serviceId, staffProfileId: l.staffProfileId || undefined, price: l.packagePurchaseId || l.price == null ? undefined : l.price, packagePurchaseId: l.packagePurchaseId || undefined, notes: l.notes.trim() || undefined, used: l.used.length ? l.used.map((u) => ({ productId: u.productId, quantity: u.quantity })) : undefined })),
      products: products.length ? products.map((x) => ({ productId: x.productId, quantity: x.quantity, price: x.price !== x.listPrice ? x.price : undefined })) : undefined,
      useMembership: memberPct > 0 || undefined, discount: discount || undefined, tip: tip || undefined,
      voucherCode: voucherUsed > 0 ? voucher?.code : undefined, voucherAmount: voucherUsed > 0 ? voucherUsed : undefined,
      paymentMethod: p.paymentMethod, paidAmount: p.paidAmount, payments: p.payments,
    });
    refreshSalon([], true);
    const fresh = b.appointment ? await salonApi.appointments.getOne(b.appointment.id).catch(() => null) : null;
    setDone({ bill: b, appt: fresh });
    reset();
  };
  const queue = (waiting.data ?? []).filter((a) => a.status === 'ARRIVED' || a.status === 'IN_PROGRESS');
  const shown = svc.filter((s) => !q.trim() || s.name.toLowerCase().includes(q.trim().toLowerCase()));

  return (
    <Screen title={t('Salon counter')} onBack={null} tabBarSpace={false} footer={lines.length + products.length > 0 ? (
      <Row gap={3}>
        <View style={{ flex: 1 }}><Text size="xs" tone="muted">{advance > 0 ? t('Advance {{a}} ke baad', { a: formatMoney(advance) }) : t('Total')}</Text><Amount value={due} size="xl" weight="bold" /></View>
        <Button size="lg" style={{ flex: 1 }} onPress={() => guard(() => setPay(true))}>{t('Payment')}</Button>
      </Row>) : undefined}>
      <View style={{ gap: th.space(3) }}>
        <OfflineNote feature="salonDesk" />
        {appt && (
          <Row gap={2} style={{ padding: th.space(3), borderRadius: th.radius('lg'), backgroundColor: th.colors.brand.soft }}>
            <Text weight="semibold" style={{ flex: 1 }}>{appt.appointmentNumber}{advance > 0 ? ` · ${t('Advance')} ${formatMoney(advance)}` : ''}</Text>
            <Button size="sm" variant="ghost" icon={X} onPress={reset}>{t('Hatayein')}</Button>
          </Row>
        )}
        {!appt && queue.length > 0 && (
          <Card title={t('Abhi chair par / intezar me')} flush>
            {queue.map((a, i) => <ListRow key={a.id} divider={i < queue.length - 1} icon={UserCheck} title={a.customer?.name ?? a.customerName ?? t('Walk-in customer')} subtitle={`${timeOf(a.scheduledStart)} · ${serviceLine(a.services)}`} chevron onPress={() => load(a)} />)}
          </Card>
        )}
        <CustomerField value={customer} onChange={setCustomer} optional />
        {perks.data?.membership && (
          <Switch value={member} onChange={setMember} label={t('{{plan}} membership — {{pct}}% Discount', { plan: perks.data.membership.planName, pct: perks.data.membership.discountPct })} />
        )}
        <Card title={t('Services')} flush>
          {lines.length === 0 && <View style={{ padding: th.space(4) }}><Text tone="muted" size="sm">{t('Neeche se service chunein')}</Text></View>}
          {lines.map((l, i) => {
            const s = svc.find((x) => x.id === l.serviceId);
            const pk = perks.data?.packages.filter((p) => p.serviceIds.length === 0 || p.serviceIds.includes(l.serviceId)) ?? [];
            const st = staff.data?.find((x) => x.id === l.staffProfileId);
            const list = listOf(l);
            const shownPrice = l.packagePurchaseId ? 0 : l.price ?? (memberPct > 0 ? Math.round(list * (100 - memberPct)) / 100 : list);
            return (
              <View key={l.key} style={{ padding: th.space(3), gap: th.space(2), borderTopWidth: i ? 0.5 : 0, borderColor: th.colors.border }}>
                <Row justify="between"><Text weight="semibold" style={{ flex: 1 }}>{s?.name}</Text><Amount value={shownPrice} weight="bold" /></Row>
                <Select value={l.staffProfileId || null} onChange={(v) => setLine(l.key, { staffProfileId: v })} placeholder={t('Stylist')} options={(staff.data ?? []).map((x) => ({ value: x.id, label: staffName(x) }))} />
                {st && st.commissionType !== 'NONE' && <Text size="2xs" tone="muted" ltr>{t('Commission')} {formatMoney(commissionOf(shownPrice, { type: st.commissionType, pct: st.commissionPct, fixed: st.commissionFixed }))}</Text>}
                <Input value={l.notes} onChangeText={(v) => setLine(l.key, { notes: v })} placeholder={t('Note (colour, shade)')} />
                {l.used.map((u) => (
                  <Row key={u.productId} gap={2}>
                    <Text size="sm" style={{ flex: 1 }} numberOfLines={1}>{u.name}</Text>
                    <QtyStepper value={u.quantity} onChange={(n) => setLine(l.key, { used: n > 0 ? l.used.map((x) => (x === u ? { ...x, quantity: n } : x)) : l.used.filter((x) => x !== u) })} />
                  </Row>
                ))}
                <Button size="sm" variant="ghost" icon={Package} onPress={() => setUsedFor(l.key)}>{t('Products used')}</Button>
                <Row gap={2}>
                  {pk.length > 0 && <Chip label={l.packagePurchaseId ? t('Package session') : t('Package se')} selected={!!l.packagePurchaseId} onPress={() => setLine(l.key, { packagePurchaseId: l.packagePurchaseId ? '' : pk[0].id })} />}
                  <View style={{ flex: 1 }}><MoneyInput value={l.price} onChangeValue={(v) => setLine(l.key, { price: v })} placeholder={t('Price badlein')} size="sm" /></View>
                  <Button size="sm" variant="ghost" icon={Trash2} onPress={() => setLines((ls) => ls.filter((x) => x.key !== l.key))}>{''}</Button>
                </Row>
              </View>
            );
          })}
          <Divider />
          <Button variant="soft" icon={Plus} style={{ margin: th.space(3) }} onPress={() => setPicker(true)}>{t('Service jorein')}</Button>
        </Card>
        <Card title={t('Products')} flush>
          {products.map((p, i) => (
            <View key={p.productId} style={{ padding: th.space(3), gap: th.space(2), borderTopWidth: i ? 0.5 : 0, borderColor: th.colors.border }}>
              <Row justify="between"><Text weight="semibold" style={{ flex: 1 }} numberOfLines={1}>{p.name}</Text><Amount value={p.price * p.quantity} weight="bold" /></Row>
              <Row gap={2}>
                <View style={{ flex: 1 }}><MoneyInput value={p.price} onChangeValue={(v) => setProducts((ps) => ps.map((x) => (x === p ? { ...x, price: v ?? 0 } : x)))} size="sm" /></View>
                <QtyStepper value={p.quantity} onChange={(n) => setProducts((ps) => (n > 0 ? ps.map((x) => (x === p ? { ...x, quantity: n } : x)) : ps.filter((x) => x !== p)))} />
              </Row>
            </View>
          ))}
          <Button variant="soft" icon={Plus} style={{ margin: th.space(3) }} onPress={() => setRetailOpen(true)}>{t('Product jorein')}</Button>
        </Card>
        {lines.length + products.length > 0 && (
          <Card title={t('Discount, tip, voucher')}>
            <View style={{ gap: th.space(2) }}>
              <Row gap={2}><View style={{ flex: 1 }}><MoneyInput label={t('Discount')} value={discount} onChangeValue={setDiscount} /></View><View style={{ flex: 1 }}><MoneyInput label={t('Tip')} value={tip} onChangeValue={setTip} /></View></Row>
              <Row gap={2}>
                <View style={{ flex: 1 }}><Input label={t('Gift voucher code')} icon={Gift} value={code} onChangeText={(s) => { setCode(s.toUpperCase()); setVoucher(null); }} autoCapitalize="characters" ltr /></View>
                <Button variant="secondary" icon={Ticket} onPress={() => void applyCode()} disabled={!code.trim()}>{t('Lagayein')}</Button>
              </Row>
              {voucher && !voucher.problem && <Badge tone="success">{t('Voucher: {{amount}} baqi', { amount: formatMoney(voucher.balance) })}</Badge>}
              {totals.memberSaved > 0 && <Row justify="between"><Text size="sm" tone="muted"><Crown size={12} /> {t('Membership bachat')}</Text><Text size="sm" ltr>{formatMoney(totals.memberSaved)}</Text></Row>}
              {voucherUsed > 0 && <Row justify="between"><Text size="sm" tone="muted">{t('Voucher')}</Text><Text size="sm" ltr>−{formatMoney(voucherUsed)}</Text></Row>}
            </View>
          </Card>
        )}
      </View>

      <Sheet open={picker} onClose={() => setPicker(false)} title={t('Services')} height={0.8}>
        <View style={{ gap: th.space(2) }}>
          <SearchBar value={q} onChangeText={setQ} placeholder={t('Service ka naam')} />
          {shown.length === 0 && <EmptyState title={t('Koi service nahi')} />}
          {shown.map((s) => <ListRow key={s.id} title={s.name} subtitle={`${s.durationMinutes} min`} trailing={<Amount value={s.discountPrice ?? s.price} weight="bold" />} divider onPress={() => { setLines((ls) => [...ls, { key: seq++, serviceId: s.id, staffProfileId: '', price: null, packagePurchaseId: '', notes: '', used: [] }]); setPicker(false); }} />)}
        </View>
      </Sheet>
      <SplitPaySheet open={pay} onClose={() => setPay(false)} title={t('Payment')} name={customer?.name ?? t('Walk-in customer')} due={due} cta={t('Bill banayein')}
        allowPart={!!customer} onConfirm={(p) => bill(p)} />
      <ProductPickerSheet open={retailOpen} onClose={() => setRetailOpen(false)}
        onPick={(p) => setProducts((ps) => (ps.some((x) => x.productId === p.id) ? ps.map((x) => (x.productId === p.id ? { ...x, quantity: x.quantity + 1 } : x)) : [...ps, { productId: p.id, name: p.name, listPrice: p.price, price: p.price, quantity: 1 }]))} />
      <ProductPickerSheet open={usedFor !== null} title={t('Products used')} onClose={() => setUsedFor(null)}
        onPick={(p) => setLines((ls) => ls.map((l) => (l.key === usedFor ? { ...l, used: l.used.some((u) => u.productId === p.id) ? l.used : [...l.used, { productId: p.id, name: p.name, quantity: 1 }] } : l)))} />
      <Sheet open={!!done} onClose={() => setDone(null)} title={t('Bill ban gaya')} description={done?.bill.saleNumber}
        footer={<Button fullWidth onPress={() => setDone(null)}>{t('Theek hai')}</Button>}>
        {done && (
          <View style={{ gap: 4 }}>
            <Row justify="between"><Text tone="muted">{t('Total')}</Text><Amount value={done.bill.total} weight="bold" /></Row>
            {done.bill.creditAmount > 0 && <Row justify="between"><Text tone="muted">{t('Khata me')}</Text><Amount value={done.bill.creditAmount} /></Row>}
            {done.appt?.services.map((s, i) => <Row key={i} justify="between"><Text size="sm" style={{ flex: 1 }}>{`${s.serviceName ?? ''}${s.staffName ? ` · ${s.staffName}` : ''}`}</Text><Text size="sm" tone="muted" ltr>{t('Commission')} {formatMoney(s.commissionAmount ?? 0)}</Text></Row>)}
          </View>
        )}
      </Sheet>
    </Screen>
  );
}
