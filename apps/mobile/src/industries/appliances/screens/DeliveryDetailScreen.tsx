/** One delivery trip (web DeliveryCard): vehicle and driver, dispatch, arrival, hand-over with the receiver's name and CNIC, money at the door, cancel and failed trips. */

import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { CheckCircle2, MapPin, MessageCircle, Navigation, Truck, Wallet, XCircle } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useAuthStore } from '@/core/auth/store';
import { formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { Amount, Badge, Button, Card, DatePicker, DetailRow, DetailSection, DetailTemplate, IconButton, Input, MoneyInput, Row, Sheet, StatusPill, Text, toast, useTheme } from '@/design';
import { NumberInput } from '@/modules/inventory/components/fields';
import { Fact, MethodChips, PayMoneySheet, ReasonSheet, SlotChips, callPhone, cnicOk, dateToKey, errText, keyToDate, openMap, openWhatsApp, slotLabel, todayKey, useDeskOnline } from '../../_shared/trade/desk';
import { deliveriesApi, type ApplianceDelivery, type DeliveryDetail } from '../api';
import { KEYS, dateTime, dayOnly, deliveryStatus, refreshAppliances } from '../meta';
import { DELIVERY_OPEN } from '@nafaa/core/industries/appliances';

const refresh = (money = false) => refreshAppliances([KEYS.delivery, KEYS.install], money);

export function deliveryMessage(d: ApplianceDelivery, shop: string) {
  return [
    t('Assalam o alaikum {{name}},', { name: d.customerName }),
    `${shop}: ${t('aap ka saman ({{number}})', { number: d.deliveryNumber })}`,
    d.status === 'DELIVERED' ? t('pohancha diya gaya. Shukriya!') : d.scheduledDate ? t('{{when}} ko pohanchega.', { when: `${dayOnly(d.scheduledDate)} ${slotLabel(d.scheduledSlot)}`.trim() }) : t('jald pohanchega.'),
    d.driverName && d.status !== 'DELIVERED' ? t('Driver: {{name}}', { name: `${d.driverName}${d.driverPhone ? ` (${d.driverPhone})` : ''}${d.vehicleNumber ? ` · ${d.vehicleNumber}` : ''}` }) : '',
    (d.dueAmount ?? 0) > 0 ? t('Delivery charges baqi: {{amount}}', { amount: formatMoney(d.dueAmount ?? 0) }) : '',
  ].filter(Boolean).join('\n');
}

type Dialog = 'vehicle' | 'confirm' | 'pay' | 'cancel' | 'fail' | null;

export function DeliveryDetailScreen() {
  const th = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const manage = usePermission()(P.SERVICE_JOBS_MANAGE);
  const shop = useAuthStore((s) => s.tenant?.name) ?? '';
  const { guard } = useDeskOnline('appliancesDesk');
  const q = useQuery({ queryKey: [KEYS.delivery, 'one', id], queryFn: () => deliveriesApi.getOne(id!), enabled: !!id });
  const [dialog, setDialog] = useState<Dialog>(null);
  const [busy, setBusy] = useState(false);
  const d = q.data;
  const open = !!d && DELIVERY_OPEN.includes(d.status);
  const due = d?.dueAmount ?? 0;
  const st = deliveryStatus(d?.status);
  const close = () => setDialog(null);
  const run = (fn: () => Promise<unknown>, ok: string, money = false) => async () => { await fn(); refresh(money); toast.success(ok); void q.refetch(); };
  const quick = (fn: () => Promise<unknown>, ok: string) => () => guard(() => { setBusy(true); void run(fn, ok)().catch((e) => toast.error(errText(e, t('Nahi hua')))).finally(() => setBusy(false)); });

  return (
    <DetailTemplate title={d ? d.deliveryNumber : t('Delivery')} subtitle={d ? `${d.customerName} · ${d.customerPhone}` : undefined}
      loading={q.isLoading} error={q.error} onRetry={() => void q.refetch()} onRefresh={() => void q.refetch()} refreshing={q.isRefetching}
      actions={d ? <><IconButton icon={MapPin} label={t('Map')} onPress={() => openMap([d.deliveryAddress, d.area, d.city].filter(Boolean).join(', '))} /><IconButton icon={MessageCircle} label={t('WhatsApp')} onPress={() => openWhatsApp(d.customerPhone, deliveryMessage(d, shop))} /></> : undefined}
      bottomActions={d && manage ? (
        <>
          {due > 0 && d.status === 'DELIVERED' && <Button variant="secondary" icon={Wallet} style={{ flex: 1 }} onPress={() => setDialog('pay')}>{t('Baqi lein')}</Button>}
          {(d.status === 'PENDING' || d.status === 'SCHEDULED') && <Button variant="secondary" icon={Truck} style={{ flex: 1 }} onPress={() => setDialog('vehicle')}>{d.vehicleNumber ? t('Gaari badlein') : t('Gaari lagayein')}</Button>}
          {d.status === 'SCHEDULED' && <Button icon={Navigation} loading={busy} style={{ flex: 1 }} onPress={quick(() => deliveriesApi.updateStatus(d.id, { status: 'DISPATCHED' }), t('Halat badal gayi'))}>{t('Nikal gaya')}</Button>}
          {d.status === 'DISPATCHED' && <Button variant="secondary" loading={busy} style={{ flex: 1 }} onPress={quick(() => deliveriesApi.updateStatus(d.id, { status: 'ARRIVED' }), t('Halat badal gayi'))}>{t('Pohanch gaya')}</Button>}
          {(d.status === 'ARRIVED' || d.status === 'DISPATCHED') && <Button icon={CheckCircle2} style={{ flex: 1 }} onPress={() => setDialog('confirm')}>{t('De diya')}</Button>}
        </>
      ) : undefined}>
      {d && (
        <View style={{ gap: th.space(3) }}>
          <Row gap={1.5} wrap>
            <StatusPill tone={st.tone}>{st.label}</StatusPill>
            {d.requiresInstallation && <Badge tone="info">{t('Installation bhi')}</Badge>}
            {d.sale && <Badge>{t('Bill {{saleNumber}}', { saleNumber: d.sale.saleNumber })}</Badge>}
          </Row>
          <Card>
            <View style={{ gap: th.space(2) }}>
              <Fact k={t('Pata')} v={[d.deliveryAddress, d.area, d.city].filter(Boolean).join(', ')} />
              <Fact k={t('Date')} v={d.scheduledDate ? `${dayOnly(d.scheduledDate)} ${slotLabel(d.scheduledSlot)}`.trim() : t('Abhi tay nahi')} />
              <Fact k={t('Manzil')} v={d.floorNumber != null ? `${d.floorNumber}${d.hasLift ? t(' · lift hai') : t(' · lift nahi')}` : undefined} />
              <Fact k={t('Gaari')} v={d.vehicleNumber ? `${d.vehicleNumber} · ${d.driverName ?? ''}${d.driverPhone ? ` (${d.driverPhone})` : ''}${d.helperCount ? ` · ${t('{{n}} helper', { n: d.helperCount })}` : ''}` : undefined} />
              <Fact k={t('Nikla')} v={d.dispatchedAt ? dateTime(d.dispatchedAt) : undefined} />
              <Fact k={t('Diya')} v={d.deliveredAt ? `${dateTime(d.deliveredAt)}${d.receivedByName ? ` · ${d.receivedByName}` : ''}` : undefined} />
              <Fact k={t('Serial')} v={d.serials?.map((s) => s.serialNumber).join(', ')} />
              <Fact k={t('Installation')} v={d.installation ? `${d.installation.installationNumber} · ${d.installation.status}` : undefined} />
            </View>
          </Card>
          <DetailSection title={t('Charges')}>
            <DetailRow label={t('Gaari')} value={<Amount value={d.deliveryCharge} />} />
            <DetailRow label={t('Load / utarna')} value={<Amount value={Number(d.loadingCharge) + Number(d.unloadingCharge)} />} />
            <DetailRow label={t('Manzil')} value={<Amount value={d.floorCharge} />} />
            <DetailRow label={due > 0 ? t('Baqi') : t('Kul')} value={<Amount value={due > 0 ? due : d.totalCharge} weight="bold" color={due > 0 ? th.colors.warning.text : undefined} />} last />
          </DetailSection>
          {d.chargedAtCounter && <Text size="xs" tone="muted">{t('Delivery charges counter ke bill me liye gaye — alag bill nahi banega.')}</Text>}
          {d.requiresInstallation && d.status === 'DELIVERED' && !d.installation && (
            <Card tone="info"><Text size="sm">{t('Installation abhi book nahi hui.')}</Text><Button size="sm" variant="soft" onPress={() => router.push('/appliances/installations/new' as never)}>{t('Installation book karein')}</Button></Card>
          )}
          {manage && open && (
            <Row gap={2} wrap>
              {d.status !== 'PENDING' && d.status !== 'SCHEDULED' && <Button size="sm" variant="ghost" onPress={() => setDialog('fail')}>{t('Nahi de sake')}</Button>}
              <Button size="sm" variant="ghost" icon={XCircle} onPress={() => setDialog('cancel')}>{t('Cancel')}</Button>
            </Row>
          )}
          {d.driverPhone && <Button variant="ghost" onPress={() => callPhone(d.driverPhone)}>{t('Driver ko call')}</Button>}
          {d.notes ? <Card><Text size="sm" tone="secondary">{d.notes}</Text></Card> : null}
        </View>
      )}
      {d && (
        <>
          <VehicleSheet d={d} open={dialog === 'vehicle'} onClose={close} onConfirm={(v) => run(() => deliveriesApi.assignVehicle(d.id, v), t('Gaari lag gayi'))()} />
          <ConfirmSheet d={d} open={dialog === 'confirm'} onClose={close} />
          <PayMoneySheet open={dialog === 'pay'} onClose={close} title={t('Delivery charges — {{deliveryNumber}}', { deliveryNumber: d.deliveryNumber })} due={due}
            onConfirm={(v) => run(() => deliveriesApi.addPayment(d.id, v), t('Paisa mil gaya'), true)()} />
          <ReasonSheet open={dialog === 'cancel'} onClose={close} title={t('Delivery cancel')} confirm={t('Cancel karein')}
            presets={[t('Customer khud le gaya'), t('Bill wapas hua'), t('Customer ne mana kar diya')]}
            onConfirm={(reason) => run(() => deliveriesApi.updateStatus(d.id, { status: 'CANCELLED', notes: reason }), t('Halat badal gayi'))()} />
          <ReasonSheet open={dialog === 'fail'} onClose={close} title={t('Nahi de sake')} confirm={t('Darj karein')}
            presets={[t('Customer ghar par nahi'), t('Pata ghalat'), t('Saman upar nahi ja saka')]}
            onConfirm={(reason) => run(() => deliveriesApi.updateStatus(d.id, { status: 'FAILED', notes: reason }), t('Halat badal gayi'))()} />
        </>
      )}
    </DetailTemplate>
  );
}

function VehicleSheet({ d, open, onClose, onConfirm }: { d: ApplianceDelivery; open: boolean; onClose: () => void; onConfirm: (v: { vehicleNumber: string; driverName: string; driverPhone?: string; helperCount?: number; scheduledDate?: string; scheduledSlot?: string }) => Promise<unknown> }) {
  const th = useTheme();
  const [vehicle, setVehicle] = useState('');
  const [driver, setDriver] = useState('');
  const [phone, setPhone] = useState('');
  const [helpers, setHelpers] = useState<number | null>(null);
  const [date, setDate] = useState(todayKey());
  const [slot, setSlot] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!open) return;
    setVehicle(d.vehicleNumber ?? ''); setDriver(d.driverName ?? ''); setPhone(d.driverPhone ?? ''); setHelpers(d.helperCount ?? null); setDate(d.scheduledDate?.slice(0, 10) ?? todayKey()); setSlot(d.scheduledSlot ?? '');
  }, [open, d.id, d.vehicleNumber, d.driverName, d.driverPhone, d.helperCount, d.scheduledDate, d.scheduledSlot]);
  const ok = vehicle.trim().length >= 3 && driver.trim().length >= 2 && !(date && date < todayKey());
  const run = async () => {
    setBusy(true);
    try { await onConfirm({ vehicleNumber: vehicle.trim().toUpperCase(), driverName: driver.trim(), driverPhone: phone.trim() || undefined, helperCount: helpers ?? undefined, scheduledDate: date || undefined, scheduledSlot: slot || undefined }); onClose(); }
    catch (e) { toast.error(errText(e, t('Nahi hua'))); } finally { setBusy(false); }
  };
  return (
    <Sheet open={open} onClose={onClose} title={t('Gaari aur driver')} footer={<Button fullWidth size="lg" loading={busy} disabled={!ok} onPress={() => void run()}>{t('Laga dein')}</Button>}>
      <View style={{ gap: th.space(3) }}>
        <Input label={t('Gaari ka number')} value={vehicle} onChangeText={setVehicle} placeholder={t('LES-1234')} autoCapitalize="characters" ltr />
        <Input label={t('Driver')} value={driver} onChangeText={setDriver} placeholder={t('Aslam')} />
        <Input label={t('Driver ka phone')} value={phone} onChangeText={setPhone} keyboardType="phone-pad" ltr placeholder="0300-1234567" />
        <NumberInput label={t('Helper kitne')} integer value={helpers} onChangeValue={setHelpers} placeholder="2" />
        <DatePicker label={t('Date')} value={keyToDate(date)} minimumDate={new Date()} onChange={(x) => setDate(dateToKey(x))} />
        <SlotChips value={slot} onChange={setSlot} />
      </View>
    </Sheet>
  );
}

function ConfirmSheet({ d, open, onClose }: { d: DeliveryDetail; open: boolean; onClose: () => void }) {
  const th = useTheme();
  const due = d.dueAmount ?? Math.max(Number(d.totalCharge) - Number(d.paidAmount ?? 0), 0);
  const [name, setName] = useState('');
  const [cnic, setCnic] = useState('');
  const [amount, setAmount] = useState<number | null>(null);
  const [method, setMethod] = useState('CASH');
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (open) { setName(d.customerName); setCnic(''); setAmount(due > 0 ? due : null); setMethod('CASH'); } }, [open, d.id, d.customerName, due]);
  const n = amount ?? 0;
  const tooMuch = n > due + 0.01;
  const ok = name.trim().length >= 2 && cnicOk(cnic) && !tooMuch;
  const run = async () => {
    setBusy(true);
    try {
      await deliveriesApi.confirm(d.id, { receivedByName: name.trim(), receivedByCnic: cnic.trim() || undefined, paidAmount: n || undefined, paymentMethod: method });
      toast.success(t('{{deliveryNumber}} de diya', { deliveryNumber: d.deliveryNumber }));
      refresh(true);
      onClose();
    } catch (e) { toast.error(errText(e, t('Confirm nahi hua'))); } finally { setBusy(false); }
  };
  return (
    <Sheet open={open} onClose={onClose} title={t('Saman de diya — {{deliveryNumber}}', { deliveryNumber: d.deliveryNumber })}
      footer={<Button fullWidth size="lg" icon={CheckCircle2} loading={busy} disabled={!ok} onPress={() => void run()}>{t('De diya')}</Button>}>
      <View style={{ gap: th.space(3) }}>
        <Input label={t('Kis ne liya')} value={name} onChangeText={setName} />
        <Input label={t('Us ka CNIC')} value={cnic} onChangeText={setCnic} placeholder="35202-1234567-1" ltr error={!cnicOk(cnic) ? t('13 hindse likhein') : undefined} />
        {d.chargedAtCounter ? <Text size="sm" tone="muted">{t('Delivery charges counter ke bill me le liye gaye.')}</Text> : due > 0 ? (
          <>
            <MoneyInput label={t('Driver ne kitna liya')} value={amount} onChangeValue={setAmount} error={tooMuch ? t('Sirf {{due}} baqi', { due: formatMoney(due) }) : undefined} />
            {n > 0 && <MethodChips value={method} onChange={setMethod} />}
          </>
        ) : null}
      </View>
    </Sheet>
  );
}
