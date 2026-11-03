/** New complaint or repair (web NewRepairModal): serial lookup checks warranty and AMC; customer, fault, visit date and technician. */

import { router } from 'expo-router';
import { ShieldCheck } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { REPAIR_TYPES } from '@nafaa/core/industries/appliances';
import { t } from '@/core/i18n';
import { Button, ChipGroup, DatePicker, FormSection, FormTemplate, Input, MoneyInput, Row, Switch, Text, TextArea, toast, useTheme } from '@/design';
import { CustomerBox, SlotChips, customerErrors, dateToKey, emptyCustomer, errText, keyToDate, opt, todayKey, useDeskOnline, type CustomerValue } from '../../_shared/trade/desk';
import { serviceRequestsApi } from '../api';
import { SerialLookup, TechSelect } from '../components/kit';
import { KEYS, PRIORITIES, issuesFor, priorityOf, refreshAppliances, serviceTypeOf } from '../meta';

export function RepairFormScreen() {
  const th = useTheme();
  const { guard } = useDeskOnline('appliancesDesk');
  const [customer, setCustomer] = useState<CustomerValue>(emptyCustomer);
  const [serial, setSerial] = useState('');
  const [serialId, setSerialId] = useState<string | undefined>();
  const [productId, setProductId] = useState<string | undefined>();
  const [category, setCategory] = useState<string | null>(null);
  const [product, setProduct] = useState('');
  const [type, setType] = useState('REPAIR');
  const [priority, setPriority] = useState('NORMAL');
  const [issue, setIssue] = useState('');
  const [date, setDate] = useState(todayKey());
  const [slot, setSlot] = useState('');
  const [tech, setTech] = useState('');
  const [visit, setVisit] = useState<number | null>(null);
  const [warranty, setWarranty] = useState(false);
  const [amc, setAmc] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [touched, setTouched] = useState(false);
  const mark = <T,>(set: (v: T) => void) => (v: T) => { setDirty(true); set(v); };

  const ce = customerErrors(customer);
  const errors = {
    ...ce, product: product.trim().length < 2 ? t('Product ka naam likhein') : undefined, issue: issue.trim().length < 3 ? t('Kharabi likhein') : undefined,
    date: date && date < todayKey() ? t('Guzri hui date nahi') : undefined,
  };
  const first = Object.values(errors).find(Boolean);
  const submit = () => guard(async () => {
    setTouched(true);
    if (first) { toast.error(first); return; }
    setSaving(true);
    try {
      const r = await serviceRequestsApi.create({
        customerId: customer.customerId || undefined, customerName: customer.name.trim(), customerPhone: customer.phone.trim(), customerAddress: (customer.address ?? '').trim(), area: opt(customer.area),
        productId, productName: product.trim(), serialNumber: opt(serial), serialTrackingId: serialId, serviceType: amc ? 'AMC_VISIT' : type, priority, reportedIssue: issue.trim(),
        scheduledDate: date || undefined, scheduledTimeSlot: slot || undefined, technicianId: tech || undefined, visitCharge: warranty || amc ? 0 : visit ?? 0,
        coveredUnderWarranty: warranty, coveredUnderAmc: !!amc, amcContractNumber: amc ?? undefined, internalNotes: opt(notes),
      });
      setDirty(false);
      refreshAppliances([KEYS.service, KEYS.tech, KEYS.serial, KEYS.amc, KEYS.claim]);
      toast.success(t('Shikayat {{requestNumber}} darj', { requestNumber: r.requestNumber }));
      router.replace(`/appliances/service-requests/${r.id}` as never);
    } catch (e) { toast.error(errText(e, t('Shikayat darj nahi hui'))); } finally { setSaving(false); }
  });
  const e = (v?: string) => (touched ? v : undefined);
  return (
    <FormTemplate title={t('Nayi shikayat / repair')} subtitle={t('Serial likhein — warranty aur AMC khud check ho jati hai')} dirty={dirty} saving={saving} onSave={submit} saveLabel={t('Darj karein')}>
      <View style={{ gap: th.space(4) }}>
        <FormSection title={t('Unit')}>
          <SerialLookup value={serial} onChange={mark((v: string) => { setSerial(v); setSerialId(undefined); setAmc(null); })} onFound={(r) => {
            const s = r.serial!;
            setSerialId(s.id); setProductId(s.productId); setProduct(s.product?.name ?? product); setCategory(s.product?.categoryType ?? null);
            setWarranty(!!r.warranty?.isValid);
            if (r.amc && r.amc.visitsLeft > 0) setAmc(r.amc.contractNumber);
            if (s.customerName && !customer.name) setCustomer({ ...customer, customerId: s.soldToCustomerId ?? '', name: s.customerName, phone: s.customerPhone ?? customer.phone, address: s.deliveryAddress ?? customer.address });
          }} />
          <Input label={t('Product')} value={product} onChangeText={mark((v: string) => { setProduct(v); setProductId(undefined); })} placeholder={t('Dawlance fridge 9175')} error={e(errors.product)} />
        </FormSection>
        <FormSection title={t('Kya kharabi hai')}>
          <TextArea value={issue} onChangeText={mark(setIssue)} placeholder={t('Cooling nahi kar raha')} error={e(errors.issue)} />
          <ChipGroup wrap value={issue} onChange={mark(setIssue)} options={issuesFor(category).map((x) => ({ value: x, label: x }))} />
          <Text size="sm" weight="semibold" tone="secondary">{t('Kaam')}</Text>
          <ChipGroup wrap value={type} onChange={mark(setType)} options={REPAIR_TYPES.slice(0, 5).map((x) => ({ value: x, label: serviceTypeOf(x) }))} />
          <Text size="sm" weight="semibold" tone="secondary">{t('Kitni jaldi')}</Text>
          <ChipGroup wrap value={priority} onChange={mark(setPriority)} options={PRIORITIES.map((p) => ({ value: p, label: priorityOf(p).label }))} />
        </FormSection>
        <FormSection title={t('Customer')}>
          <CustomerBox address value={customer} onChange={mark(setCustomer)} error={e(ce.name)} phoneError={e(ce.phone)} addressError={e(ce.address)} />
        </FormSection>
        <FormSection title={t('Visit')}>
          <DatePicker label={t('Visit ki date')} value={keyToDate(date)} minimumDate={new Date()} onChange={(d) => { setDirty(true); setDate(dateToKey(d)); }} error={e(errors.date)} />
          <TechSelect value={tech} onChange={mark(setTech)} />
          <SlotChips value={slot} onChange={mark(setSlot)} />
        </FormSection>
        <FormSection title={t('Paisa')}>
          <Switch value={warranty} onChange={mark(setWarranty)} label={t('Warranty me hai')} description={t('Customer se paisa nahi; baad me company se claim karein')} />
          {amc && (
            <Row gap={1.5}>
              <ShieldCheck size={16} color={th.colors.accent.text} />
              <Text size="sm" style={{ flex: 1 }} color={th.colors.accent.text}>{t('AMC {{amc}} ki free visit lagegi.', { amc })}</Text>
              <Button size="sm" variant="ghost" onPress={() => setAmc(null)}>{t('Hatayein')}</Button>
            </Row>
          )}
          {!warranty && !amc && <MoneyInput label={t('Visit charge')} value={visit} onChangeValue={mark(setVisit)} placeholder="1000" hint={t('Mazdoori aur parts ka hisaab kaam ke baad')} />}
        </FormSection>
        <FormSection title={t('Note')}>
          <TextArea value={notes} onChangeText={mark(setNotes)} placeholder={t('Gate code, customer sirf sham ko ghar')} />
          <Text size="xs" tone="muted">{t('Sirf dukaan ke liye')}</Text>
        </FormSection>
      </View>
    </FormTemplate>
  );
}
