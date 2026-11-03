/** Sheets of one delivery (web DeliveriesPage modals): vehicle and date, delivered / fitted, and the bill of the charges. */

import { Star } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { apiErrorMessage } from '@/core/api/errors';
import { formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { Button, Card, ChipGroup, DatePicker, Input, MoneyInput, PressableScale, Row, Sheet, Switch, Text, toast, useTheme } from '@/design';
import { NumberInput } from '@/modules/inventory/components/fields';
import { dateToKey, keyToDate, todayKey } from '../../_shared/deskKit';
import { PAY_METHODS } from '../../_shared/trade/sheets';
import { deliveriesApi, type FurnitureDelivery } from '../api';
import { SLOTS, VEHICLES } from '../meta';

export function VehicleSheet({ d, open, onClose, onDone }: { d: FurnitureDelivery; open: boolean; onClose: () => void; onDone: () => void }) {
  const th = useTheme();
  const init = () => ({
    vehicleType: d.vehicleType ?? '', vehicleNumber: d.vehicleNumber ?? '', driverName: d.driverName ?? '', driverPhone: d.driverPhone ?? '',
    helpers: d.helpersCount ?? 2, date: d.scheduledDate ? d.scheduledDate.slice(0, 10) : todayKey(), slot: d.scheduledSlot ?? '',
  });
  const [v, setV] = useState(init);
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (open) setV(init()); }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  const set = (p: Partial<ReturnType<typeof init>>) => setV((x) => ({ ...x, ...p }));
  const save = async () => {
    setBusy(true);
    try {
      await deliveriesApi.assignVehicle(d.id, { vehicleType: v.vehicleType || undefined, vehicleNumber: v.vehicleNumber || undefined, driverName: v.driverName || undefined, driverPhone: v.driverPhone || undefined, helpersCount: Math.round(v.helpers), scheduledDate: v.date || undefined, scheduledSlot: v.slot || undefined });
      onDone();
    } catch (e) { toast.error(apiErrorMessage(e, t('Save nahi hua'))); } finally { setBusy(false); }
  };
  return (
    <Sheet open={open} onClose={onClose} title={t('Gaari aur date')} description={d.deliveryNumber} footer={<Button fullWidth size="lg" loading={busy} onPress={() => void save()}>{t('Save')}</Button>}>
      <View style={{ gap: th.space(3) }}>
        <DatePicker label={t('Date')} value={keyToDate(v.date)} onChange={(x) => set({ date: dateToKey(x) })} />
        <ChipGroup wrap value={v.slot} onChange={(x) => set({ slot: v.slot === x ? '' : x })} options={SLOTS.map((x) => ({ value: x, label: x }))} />
        <Input label={t('Gaari')} value={v.vehicleType} onChangeText={(x) => set({ vehicleType: x })} placeholder={t('Shehzore')} />
        <ChipGroup wrap value={v.vehicleType} onChange={(x) => set({ vehicleType: x })} options={VEHICLES.map((x) => ({ value: x, label: x }))} />
        <Input label={t('Gaari number')} value={v.vehicleNumber} onChangeText={(x) => set({ vehicleNumber: x.toUpperCase() })} placeholder={t('LES-1234')} ltr autoCapitalize="characters" />
        <Input label={t('Driver')} value={v.driverName} onChangeText={(x) => set({ driverName: x })} />
        <Input label={t('Driver phone')} keyboardType="phone-pad" ltr value={v.driverPhone} onChangeText={(x) => set({ driverPhone: x })} />
        <NumberInput label={t('Helper')} integer value={v.helpers} onChangeValue={(x) => set({ helpers: x ?? 0 })} />
      </View>
    </Sheet>
  );
}

export function ConfirmDeliverySheet({ d, open, onClose, onDone }: { d: FurnitureDelivery; open: boolean; onClose: () => void; onDone: (r: FurnitureDelivery) => void }) {
  const th = useTheme();
  const [v, setV] = useState({ name: d.customerName, cnic: '', rating: 5, feedback: '', assembled: d.requiresAssembly, minutes: null as number | null, notes: '' });
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (open) setV({ name: d.customerName, cnic: '', rating: 5, feedback: '', assembled: d.requiresAssembly, minutes: null, notes: '' }); }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  const set = (p: Partial<typeof v>) => setV((x) => ({ ...x, ...p }));
  const save = async () => {
    setBusy(true);
    try {
      onDone(await deliveriesApi.confirm(d.id, {
        receivedByName: v.name.trim() || undefined, receivedByCnic: v.cnic.trim() || undefined, customerRating: v.rating, customerFeedback: v.feedback.trim() || undefined,
        assembled: d.requiresAssembly ? v.assembled : false, assemblyTimeSpent: v.minutes ? Math.round(v.minutes) : undefined, assemblyNotes: v.notes.trim() || undefined,
      }));
    } catch (e) { toast.error(apiErrorMessage(e, t('Save nahi hua'))); } finally { setBusy(false); }
  };
  return (
    <Sheet open={open} onClose={onClose} title={t('Delivery ho gayi')} description={d.customOrderId ? t('Custom order ka bill abhi banega — advance kat kar baqi khate me') : d.deliveryNumber}
      footer={<Button fullWidth size="lg" variant="success" loading={busy} onPress={() => void save()}>{t('Save')}</Button>}>
      <View style={{ gap: th.space(3) }}>
        <Input label={t('Kis ne liya')} value={v.name} onChangeText={(x) => set({ name: x })} />
        <Input label={t('CNIC')} keyboardType="number-pad" ltr value={v.cnic} onChangeText={(x) => set({ cnic: x })} hint={t('Marzi hai')} />
        {d.requiresAssembly && <Switch value={v.assembled} onChange={(x) => set({ assembled: x })} label={t('Fitting bhi ho gayi')} />}
        {d.requiresAssembly && v.assembled && (
          <>
            <NumberInput label={t('Fitting me kitne minute')} integer value={v.minutes} onChangeValue={(x) => set({ minutes: x })} />
            <Input label={t('Fitting note')} value={v.notes} onChangeText={(x) => set({ notes: x })} />
          </>
        )}
        <Text size="sm" weight="medium" tone="secondary">{t('Customer khush?')}</Text>
        <Row gap={1}>
          {[1, 2, 3, 4, 5].map((n) => (
            <PressableScale key={n} onPress={() => set({ rating: n })} accessibilityLabel={`${n}`}><Star size={28} color={n <= v.rating ? '#f59e0b' : th.colors.textSubtle} fill={n <= v.rating ? '#f59e0b' : 'transparent'} /></PressableScale>
          ))}
        </Row>
        <Input label={t('Customer ne kya kaha')} value={v.feedback} onChangeText={(x) => set({ feedback: x })} multiline />
      </View>
    </Sheet>
  );
}

export function BillSheet({ d, total, open, onClose, onDone }: { d: FurnitureDelivery; total: number; open: boolean; onClose: () => void; onDone: (saleNumber: string) => void }) {
  const th = useTheme();
  const [paid, setPaid] = useState<number | null>(total);
  const [method, setMethod] = useState('CASH');
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (open) { setPaid(total); setMethod('CASH'); } }, [open, total]);
  const n = Math.min(paid ?? 0, total);
  const save = async () => {
    setBusy(true);
    try { onDone((await deliveriesApi.bill(d.id, { paidAmount: n, paymentMethod: method })).saleNumber); } catch (e) { toast.error(apiErrorMessage(e, t('Bill nahi bana'))); } finally { setBusy(false); }
  };
  return (
    <Sheet open={open} onClose={onClose} title={t('Delivery charges ka bill')} description={`${d.deliveryNumber} · ${d.customerName}`}
      footer={<Button fullWidth size="lg" variant="success" loading={busy} onPress={() => void save()}>{t('Bill banayein')}</Button>}>
      <View style={{ gap: th.space(3) }}>
        <Card tone="default"><Row justify="between"><Text size="sm">{t('Charges:')}</Text><Text weight="bold" ltr>{formatMoney(total)}</Text></Row></Card>
        <MoneyInput label={t('Abhi mila (Rs)')} value={paid} onChangeValue={setPaid} size="xl" hint={n < total ? t('{{value}} {{customerName}} ke khate me', { value: formatMoney(total - n), customerName: d.customerName }) : t('Poora mila')} />
        <ChipGroup wrap value={method} onChange={setMethod} options={PAY_METHODS.map((m) => ({ value: m.value, label: t(m.label) }))} />
        {method === 'CASH' ? <Text size="xs" tone="muted">{t('Cash drawer me jata hai')}</Text> : null}
      </View>
    </Sheet>
  );
}
