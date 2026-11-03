/** New delivery trip (web NewDeliveryModal): address, floor, lift, date and the charges. */

import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { deliveryTotal } from '@nafaa/core/industries/appliances';
import { formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { DatePicker, FormSection, FormTemplate, MoneyInput, Switch, Text, TextArea, toast, useTheme } from '@/design';
import { NumberInput } from '@/modules/inventory/components/fields';
import { CustomerBox, SlotChips, customerErrors, dateToKey, emptyCustomer, errText, keyToDate, opt, todayKey, useDeskOnline, type CustomerValue } from '../../_shared/trade/desk';
import { deliveriesApi } from '../api';
import { KEYS, refreshAppliances } from '../meta';

export function DeliveryFormScreen() {
  const th = useTheme();
  const { guard } = useDeskOnline('appliancesDesk');
  const [customer, setCustomer] = useState<CustomerValue>(emptyCustomer);
  const [floor, setFloor] = useState<number | null>(null);
  const [lift, setLift] = useState(false);
  const [date, setDate] = useState(todayKey());
  const [slot, setSlot] = useState('');
  const [charge, setCharge] = useState<number | null>(null);
  const [loading, setLoading] = useState<number | null>(null);
  const [unloading, setUnloading] = useState<number | null>(null);
  const [floorCharge, setFloorCharge] = useState<number | null>(null);
  const [install, setInstall] = useState(false);
  const [notes, setNotes] = useState('');
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [touched, setTouched] = useState(false);
  const mark = <T,>(set: (v: T) => void) => (v: T) => { setDirty(true); set(v); };
  const ce = customerErrors(customer);
  const dateBad = !!date && date < todayKey();
  const total = deliveryTotal({ delivery: charge, loading, unloading, floor: floorCharge });

  const submit = () => guard(async () => {
    setTouched(true);
    const first = Object.values(ce).find(Boolean) ?? (dateBad ? t('Guzri hui date nahi') : '');
    if (first) { toast.error(first); return; }
    setSaving(true);
    try {
      const d = await deliveriesApi.create({
        customerId: customer.customerId || undefined, customerName: customer.name.trim(), customerPhone: customer.phone.trim(), deliveryAddress: (customer.address ?? '').trim(), area: opt(customer.area),
        floorNumber: floor ?? undefined, hasLift: lift, scheduledDate: date || undefined, scheduledSlot: slot || undefined,
        deliveryCharge: charge ?? 0, loadingCharge: loading ?? 0, unloadingCharge: unloading ?? 0, floorCharge: floorCharge ?? 0, requiresInstallation: install, notes: opt(notes),
      });
      setDirty(false);
      refreshAppliances([KEYS.delivery, KEYS.install]);
      toast.success(t('Delivery {{deliveryNumber}} book', { deliveryNumber: d.deliveryNumber }));
      router.replace(`/appliances/deliveries/${d.id}` as never);
    } catch (e) { toast.error(errText(e, t('Delivery book nahi hui'))); } finally { setSaving(false); }
  });
  const e = (v?: string) => (touched ? v : undefined);
  return (
    <FormTemplate title={t('Nayi delivery')} subtitle={t('Bill ke saath delivery POS par bhi book hoti hai — yahan alag trip likhein')} dirty={dirty} saving={saving} onSave={submit} saveLabel={t('Book karein')}>
      <View style={{ gap: th.space(4) }}>
        <FormSection title={t('Customer')}>
          <CustomerBox address value={customer} onChange={mark(setCustomer)} error={e(ce.name)} phoneError={e(ce.phone)} addressError={e(ce.address)} />
          <NumberInput label={t('Manzil (floor)')} integer value={floor} onChangeValue={mark(setFloor)} placeholder={t('0 = ground')} />
          <Switch value={lift} onChange={mark(setLift)} label={t('Lift hai')} description={t('Na ho to helper zyada lagenge')} />
        </FormSection>
        <FormSection title={t('Date')}>
          <DatePicker label={t('Date')} value={keyToDate(date)} minimumDate={new Date()} onChange={(d) => { setDirty(true); setDate(dateToKey(d)); }} error={e(dateBad ? t('Guzri hui date nahi') : undefined)} />
          <SlotChips value={slot} onChange={mark(setSlot)} />
        </FormSection>
        <FormSection title={t('Charges')} description={t('Free delivery ho to khali chhorein. Delivery hone par in ka bill banta hai.')}>
          <MoneyInput label={t('Gaari')} value={charge} onChangeValue={mark(setCharge)} placeholder="1500" />
          <MoneyInput label={t('Load')} value={loading} onChangeValue={mark(setLoading)} placeholder="0" />
          <MoneyInput label={t('Utarna')} value={unloading} onChangeValue={mark(setUnloading)} placeholder="0" />
          <MoneyInput label={t('Manzil')} value={floorCharge} onChangeValue={mark(setFloorCharge)} placeholder="0" />
          <Text size="sm" weight="semibold">{t('Charges: {{total}}', { total: formatMoney(total) })}</Text>
          <Switch value={install} onChange={mark(setInstall)} label={t('Installation bhi karni hai')} description={t('Saman pohanchne ke baad Installations me booking yaad dilayi jayegi')} />
        </FormSection>
        <FormSection title={t('Note')}>
          <TextArea value={notes} onChangeText={mark(setNotes)} placeholder={t('Gali tang hai, chhoti gaari bhejein')} />
          <Text size="xs" tone="muted">{t('Driver ke liye')}</Text>
        </FormSection>
      </View>
    </FormTemplate>
  );
}
