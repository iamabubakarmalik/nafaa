/** New installation booking (web NewInstallationModal): customer, unit, date, technician and the expected charges. */

import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { INSTALL_TYPES } from '@nafaa/core/industries/appliances';
import { t } from '@/core/i18n';
import { ChipGroup, DatePicker, FormSection, FormTemplate, Input, MoneyInput, Switch, Text, TextArea, toast, useTheme } from '@/design';
import { CustomerBox, SlotChips, customerErrors, dateToKey, emptyCustomer, errText, keyToDate, opt, todayKey, useDeskOnline, type CustomerValue } from '../../_shared/trade/desk';
import { installationsApi } from '../api';
import { SerialLookup, TechSelect } from '../components/kit';
import { KEYS, refreshAppliances, serviceTypeOf } from '../meta';

export function InstallationFormScreen() {
  const th = useTheme();
  const { guard } = useDeskOnline('appliancesDesk');
  const [customer, setCustomer] = useState<CustomerValue>(emptyCustomer);
  const [serial, setSerial] = useState('');
  const [serialId, setSerialId] = useState<string | undefined>();
  const [productId, setProductId] = useState<string | undefined>();
  const [product, setProduct] = useState('');
  const [type, setType] = useState('INSTALLATION');
  const [date, setDate] = useState(todayKey());
  const [slot, setSlot] = useState('');
  const [tech, setTech] = useState('');
  const [labor, setLabor] = useState<number | null>(null);
  const [visit, setVisit] = useState<number | null>(null);
  const [material, setMaterial] = useState<number | null>(null);
  const [free, setFree] = useState(false);
  const [notes, setNotes] = useState('');
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [touched, setTouched] = useState(false);
  const mark = <T,>(set: (v: T) => void) => (v: T) => { setDirty(true); set(v); };

  const ce = customerErrors(customer);
  const errors = { ...ce, product: product.trim().length < 2 ? t('Product ka naam likhein') : undefined, date: date && date < todayKey() ? t('Guzri hui date nahi') : undefined };
  const first = Object.values(errors).find(Boolean);

  const submit = () => guard(async () => {
    setTouched(true);
    if (first) { toast.error(first); return; }
    setSaving(true);
    try {
      const i = await installationsApi.create({
        customerId: customer.customerId || undefined, customerName: customer.name.trim(), customerPhone: customer.phone.trim(), customerAddress: (customer.address ?? '').trim(), area: opt(customer.area),
        productId, productName: product.trim(), serialNumber: opt(serial), serialTrackingId: serialId, serviceType: type, scheduledDate: date || undefined, scheduledTimeSlot: slot || undefined,
        technicianId: tech || undefined, laborCharge: labor ?? 0, visitCharge: visit ?? 0, materialsCharge: material ?? 0, covered_underWarranty: free, internalNotes: opt(notes),
      });
      setDirty(false);
      refreshAppliances([KEYS.install, KEYS.tech, KEYS.serial]);
      toast.success(t('{{installationNumber}} book ho gayi', { installationNumber: i.installationNumber }));
      router.replace(`/appliances/installations/${i.id}` as never);
    } catch (e) { toast.error(errText(e, t('Booking nahi hui'))); } finally { setSaving(false); }
  });

  const e = (v?: string) => (touched ? v : undefined);
  return (
    <FormTemplate title={t('Nayi installation')} subtitle={t('Customer, unit, date aur technician — booking ke baad parchi print karein')} dirty={dirty} saving={saving} onSave={submit} saveLabel={t('Book karein')}>
      <View style={{ gap: th.space(4) }}>
        <FormSection title={t('Unit')}>
          <SerialLookup value={serial} onChange={mark((v: string) => { setSerial(v); setSerialId(undefined); })} onFound={(r) => {
            const s = r.serial!;
            setSerialId(s.id); setProductId(s.productId); setProduct(s.product?.name ?? product);
            if (s.product?.installationCharge && labor == null) setLabor(Number(s.product.installationCharge));
            if (r.warranty?.isValid) setFree(true);
            if (s.customerName && !customer.name) setCustomer({ ...customer, customerId: s.soldToCustomerId ?? '', name: s.customerName, phone: s.customerPhone ?? customer.phone, address: s.deliveryAddress ?? customer.address });
          }} />
          <Input label={t('Product')} value={product} onChangeText={mark((v: string) => { setProduct(v); setProductId(undefined); })} placeholder={t('Haier 1.5 ton inverter AC')} error={e(errors.product)} />
          <Text size="sm" weight="semibold" tone="secondary">{t('Kaam')}</Text>
          <ChipGroup wrap value={type} onChange={mark(setType)} options={INSTALL_TYPES.map((x) => ({ value: x, label: serviceTypeOf(x) }))} />
        </FormSection>
        <FormSection title={t('Customer')}>
          <CustomerBox address value={customer} onChange={mark(setCustomer)} error={e(ce.name)} phoneError={e(ce.phone)} addressError={e(ce.address)} />
        </FormSection>
        <FormSection title={t('Date aur technician')}>
          <DatePicker label={t('Date')} value={keyToDate(date)} minimumDate={new Date()} onChange={(d) => { setDirty(true); setDate(dateToKey(d)); }} error={e(errors.date)} hint={t("Khali chhorein to 'date baqi' me rahegi")} />
          <TechSelect value={tech} onChange={mark(setTech)} />
          <SlotChips value={slot} onChange={mark(setSlot)} />
        </FormSection>
        <FormSection title={t('Andazan charges')} description={t('Kaam ke baad badal sakte hain. Bill kaam mukammal hone par banta hai.')}>
          <MoneyInput label={t('Mazdoori')} value={labor} onChangeValue={mark(setLabor)} placeholder="3000" />
          <MoneyInput label={t('Visit')} value={visit} onChangeValue={mark(setVisit)} placeholder="0" />
          <MoneyInput label={t('Saman (pipe, stand)')} value={material} onChangeValue={mark(setMaterial)} placeholder="0" />
          <Switch value={free} onChange={mark(setFree)} label={t('Free installation (company / dukaan ki taraf se)')} />
        </FormSection>
        <FormSection title={t('Note')}>
          <TextArea value={notes} onChangeText={mark(setNotes)} placeholder={t('Teesri manzil, lift nahi, outdoor chhat par')} />
          <Text size="xs" tone="muted">{t('Sirf dukaan ke liye')}</Text>
        </FormSection>
      </View>
    </FormTemplate>
  );
}
