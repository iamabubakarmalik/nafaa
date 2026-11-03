/** New job (web NewJobPage): customer, service and problem, where the work is, the charges, who does it, and an advance. */

import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { jobTotal } from '@nafaa/core/industries/services-biz';
import { t } from '@/core/i18n';
import { Amount, DatePicker, FormSection, FormTemplate, Input, MoneyInput, Row, Select, Switch, Text, toast } from '@/design';
import { MethodChips, dateToKey, errorText } from '../../_shared/deskKit';
import { CustomerField, clean, type PickedCustomer } from '../../_shared/serviceKit';
import { servicesApi } from '../api';
import { LOCATIONS, PRIORITIES, SB_KEYS, opts, refreshServices } from '../meta';

export function JobFormScreen() {
  const catalog = useQuery({ queryKey: [SB_KEYS.catalog], queryFn: () => servicesApi.catalog.list() });
  const techs = useQuery({ queryKey: [SB_KEYS.techs], queryFn: () => servicesApi.technicians.list() });
  const [customer, setCustomer] = useState<PickedCustomer | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [problem, setProblem] = useState('');
  const [brand, setBrand] = useState('');
  const [priority, setPriority] = useState('NORMAL');
  const [location, setLocation] = useState('CUSTOMER_HOME');
  const [address, setAddress] = useState('');
  const [schedule, setSchedule] = useState(false);
  const [when, setWhen] = useState(new Date());
  const [visit, setVisit] = useState<number | null>(null);
  const [labour, setLabour] = useState<number | null>(null);
  const [discount, setDiscount] = useState<number | null>(null);
  const [tech, setTech] = useState('');
  const [advance, setAdvance] = useState<number | null>(null);
  const [method, setMethod] = useState('CASH');
  const [saving, setSaving] = useState(false);
  const svc = catalog.data?.find((s) => s.id === serviceId);
  const pick = (id: string) => { setServiceId(id); const s = catalog.data?.find((x) => x.id === id); if (s) { setVisit(s.visitCharge || null); setLabour(s.baseCharge || null); } };
  const total = jobTotal({ visitCharge: visit ?? 0, labourCharge: labour ?? 0, partsCharge: 0, transportCharge: 0, emergencyCharge: 0, taxAmount: 0, discountAmount: discount ?? 0 });
  const inShop = location === 'IN_SHOP';
  const save = async () => {
    if (!customer && !name.trim()) { toast.warning(t('Customer ya naam likhein')); return; }
    if (!svc && !problem.trim()) { toast.warning(t('Service chunein ya masla likhein')); return; }
    setSaving(true);
    try {
      const j = await servicesApi.jobs.create(clean({
        customerId: customer?.id, customerName: customer ? undefined : name.trim(), customerPhone: customer ? customer.phone || undefined : phone.trim(), serviceId: svc?.id, serviceName: svc?.name ?? problem.trim().slice(0, 60), category: svc?.category,
        priority, problemDescription: problem.trim() || svc?.name, brand: brand.trim(), locationType: location, serviceAddress: inShop ? undefined : address.trim(), scheduledStart: schedule ? new Date(`${dateToKey(when)}T${String(when.getHours()).padStart(2, '0')}:${String(when.getMinutes()).padStart(2, '0')}:00+05:00`).toISOString() : undefined,
        visitCharge: visit ?? 0, labourCharge: labour ?? 0, discountAmount: discount ?? 0, primaryTechnicianId: tech, advancePaid: advance || undefined, advanceMethod: advance ? method : undefined,
      }) as any);
      refreshServices(!!advance); toast.success(t('Job ban gayi'), { message: j.jobNumber }); router.replace(`/services-biz/jobs/${j.id}` as never);
    } catch (e) { toast.error(errorText(e, t('Save nahi hua'))); } finally { setSaving(false); }
  };
  return (
    <FormTemplate title={t('New job')} dirty={!!customer || !!name || !!problem} saving={saving} onSave={() => void save()}>
      <FormSection title={t('Customer')}>
        <CustomerField value={customer} onChange={setCustomer} optional />
        {!customer && <><Input label={t('Naam')} value={name} onChangeText={setName} /><Input label={t('Phone')} value={phone} onChangeText={setPhone} keyboardType="phone-pad" ltr /></>}
      </FormSection>
      <FormSection title={t('Kaam')}>
        <Select label={t('Service')} value={serviceId || null} onChange={pick} options={(catalog.data ?? []).filter((s) => s.isActive).map((s) => ({ value: s.id, label: s.name }))} />
        <Input label={t('Masla / kaam')} value={problem} onChangeText={setProblem} multiline />
        <Input label={t('Brand / model')} value={brand} onChangeText={setBrand} />
        <Select label={t('Zaroorat')} value={priority} onChange={setPriority} options={opts(PRIORITIES)} />
        <Select label={t('Kaam kahan')} value={location} onChange={setLocation} options={opts(LOCATIONS)} />
        {!inShop && <Input label={t('Pata')} value={address} onChangeText={setAddress} multiline />}
        <Switch label={t('Waqt tay karein')} value={schedule} onChange={setSchedule} />
        {schedule && <Row gap={2}><View style={{ flex: 1 }}><DatePicker label={t('Din')} value={when} onChange={(d) => setWhen(new Date(d.getFullYear(), d.getMonth(), d.getDate(), when.getHours(), when.getMinutes()))} minimumDate={new Date()} /></View><View style={{ flex: 1 }}><DatePicker mode="time" label={t('Waqt')} value={when} onChange={setWhen} /></View></Row>}
        <Select label={t('Technician')} value={tech || null} onChange={setTech} options={(techs.data ?? []).filter((x) => x.isActive).map((x) => ({ value: x.staffId, label: x.staff?.fullName ?? '—', description: x.primarySkill ?? undefined }))} />
      </FormSection>
      <FormSection title={t('Charges')}>
        <Row gap={2}><View style={{ flex: 1 }}><MoneyInput label={t('Visit')} value={visit} onChangeValue={setVisit} /></View><View style={{ flex: 1 }}><MoneyInput label={t('Mazdoori')} value={labour} onChangeValue={setLabour} /></View></Row>
        <MoneyInput label={t('Discount')} value={discount} onChangeValue={setDiscount} />
        <MoneyInput label={t('Advance')} value={advance} onChangeValue={setAdvance} />
        {!!advance && <MethodChips value={method} onChange={setMethod} />}
        <Row justify="between"><Text tone="muted">{t('Abhi tak ka total')}</Text><Amount value={total} weight="bold" /></Row>
        <Text size="xs" tone="muted">{t('Parts baad me job se jore jayenge.')}</Text>
      </FormSection>
    </FormTemplate>
  );
}
