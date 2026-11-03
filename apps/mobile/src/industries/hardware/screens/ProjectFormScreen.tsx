/** New or edited contractor site (web ProjectFormModal): customer, site address, contacts, budget and dates. */

import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { t } from '@/core/i18n';
import { ChipGroup, DatePicker, EmptyState, FormSection, FormTemplate, Input, MoneyInput, Skeleton, TextArea, toast, useTheme } from '@/design';
import { NumberInput } from '@/modules/inventory/components/fields';
import { CustomerBox, dateToKey, emptyCustomer, errText, keyToDate, opt, useDeskOnline, type CustomerValue } from '../../_shared/trade/desk';
import { projectsApi } from '../api';
import { KEYS, PROJECT_TYPES, refreshHardware } from '../meta';

const loose = (v: string) => !v.trim() || /^[0-9+\-\s]{10,15}$/.test(v.trim());

export function ProjectFormScreen() {
  const th = useTheme();
  const { edit } = useLocalSearchParams<{ edit?: string }>();
  const { guard } = useDeskOnline('hardwareDesk');
  const q = useQuery({ queryKey: [KEYS.project, edit], queryFn: () => projectsApi.getOne(edit!), enabled: !!edit });
  const [customer, setCustomer] = useState<CustomerValue>(emptyCustomer);
  const [name, setName] = useState('');
  const [contractorName, setContractorName] = useState('');
  const [contractorPhone, setContractorPhone] = useState('');
  const [siteAddress, setSiteAddress] = useState('');
  const [city, setCity] = useState('');
  const [area, setArea] = useState('');
  const [siteContactPhone, setSiteContactPhone] = useState('');
  const [projectType, setProjectType] = useState('');
  const [floors, setFloors] = useState<number | null>(null);
  const [budget, setBudget] = useState<number | null>(null);
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [notes, setNotes] = useState('');
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [touched, setTouched] = useState(false);
  const mark = <T,>(set: (v: T) => void) => (v: T) => { setDirty(true); set(v); };
  const p = q.data;
  useEffect(() => {
    if (!p) return;
    setCustomer({ customerId: p.customerId ?? '', name: p.customerName, phone: p.customerPhone ?? '' }); setName(p.name); setContractorName(p.contractorName ?? ''); setContractorPhone(p.contractorPhone ?? '');
    setSiteAddress(p.siteAddress); setCity(p.city ?? ''); setArea(p.area ?? ''); setSiteContactPhone(p.siteContactPhone ?? ''); setProjectType(p.projectType ?? ''); setFloors(p.floors ?? null);
    setBudget(p.estimatedBudget ?? null); setStart(p.startDate?.slice(0, 10) ?? ''); setEnd(p.expectedEndDate?.slice(0, 10) ?? ''); setNotes(p.notes ?? ''); setDirty(false);
  }, [p]);
  const errors = {
    name: !name.trim() ? t('Site ka naam likhein (jaise: Ahmed sahib ka ghar, DHA)') : undefined, customer: !customer.name.trim() ? t('Malik ka naam likhein') : undefined, address: !siteAddress.trim() ? t('Site ka pata likhein') : undefined,
    phone: !loose(customer.phone) ? t('Phone theek likhein') : undefined, cphone: !loose(contractorPhone) ? t('Phone theek likhein') : undefined, budget: (budget ?? 0) < 0 ? t('Budget manfi nahi') : undefined,
    end: start && end && end < start ? t('Khatam hone ki tareekh shuru se pehle nahi') : undefined,
  };
  const first = Object.values(errors).find(Boolean);
  const e = (v?: string) => (touched ? v : undefined);
  const submit = () => guard(async () => {
    setTouched(true);
    if (first) { toast.error(first); return; }
    setSaving(true);
    try {
      const body = {
        customerId: customer.customerId || undefined, name: name.trim(), customerName: customer.name.trim(), customerPhone: opt(customer.phone), contractorName: opt(contractorName), contractorPhone: opt(contractorPhone),
        siteAddress: siteAddress.trim(), city: opt(city), area: opt(area), siteContactPhone: opt(siteContactPhone), projectType: opt(projectType), floors: floors || undefined, estimatedBudget: budget || undefined,
        startDate: start || undefined, expectedEndDate: end || undefined, notes: opt(notes),
      };
      const saved = edit ? await projectsApi.update(edit, body) : await projectsApi.create(body);
      setDirty(false);
      refreshHardware([KEYS.projects, KEYS.project]);
      toast.success(edit ? t('Site save ho gayi') : t('Site {{projectNumber}} ban gayi', { projectNumber: saved.projectNumber }));
      router.replace(`/hardware/projects/${saved.id}` as never);
    } catch (err) { toast.error(errText(err, t('Site save nahi hui'))); } finally { setSaving(false); }
  });
  if (edit && q.isLoading) return <FormTemplate title={t('Nayi site / project')} onSave={() => undefined}><Skeleton height={300} /></FormTemplate>;
  if (edit && !p) return <FormTemplate title={t('Nayi site / project')} onSave={() => undefined}><EmptyState title={t('Site nahi mili')} /></FormTemplate>;
  return (
    <FormTemplate title={p ? t('{{projectNumber}} badlein', { projectNumber: p.projectNumber }) : t('Nayi site / project')} subtitle={t('Construction site jahan maal jata hai — quotation, challan aur bill isi se jurte hain')} dirty={dirty} saving={saving} onSave={submit}>
      <View style={{ gap: th.space(4) }}>
        <FormSection title={t('Site')}>
          <Input label={t('Site ka naam')} value={name} onChangeText={mark(setName)} error={e(errors.name)} placeholder={t('Ahmed sahib ka ghar, Phase 6')} />
          <TextArea label={t('Site ka pata')} value={siteAddress} onChangeText={mark(setSiteAddress)} error={e(errors.address)} />
          <Input label={t('Area')} value={area} onChangeText={mark(setArea)} />
          <Input label={t('Shehar')} value={city} onChangeText={mark(setCity)} />
          <Input label={t('Site par rabta')} value={siteContactPhone} onChangeText={mark(setSiteContactPhone)} keyboardType="phone-pad" ltr hint={t('Munshi / mistri')} />
          <ChipGroup wrap value={projectType} onChange={mark(setProjectType)} options={PROJECT_TYPES.map((x) => ({ value: x, label: t(x) }))} />
          <NumberInput label={t('Manzilein')} integer value={floors} onChangeValue={mark(setFloors)} />
        </FormSection>
        <FormSection title={t('Malik (customer)')}>
          <CustomerBox value={customer} onChange={mark(setCustomer)} error={e(errors.customer)} phoneError={e(errors.phone)} />
          <Input label={t('Thekedar')} value={contractorName} onChangeText={mark(setContractorName)} />
          <Input label={t('Thekedar ka phone')} value={contractorPhone} onChangeText={mark(setContractorPhone)} keyboardType="phone-pad" ltr error={e(errors.cphone)} />
        </FormSection>
        <FormSection title={t('Budget aur waqt')}>
          <MoneyInput label={t('Andaza budget (Rs)')} value={budget} onChangeValue={mark(setBudget)} error={e(errors.budget)} />
          <DatePicker label={t('Shuru')} value={keyToDate(start)} onChange={(d) => { setDirty(true); setStart(dateToKey(d)); }} />
          <DatePicker label={t('Khatam (andaza)')} value={keyToDate(end)} onChange={(d) => { setDirty(true); setEnd(dateToKey(d)); }} error={e(errors.end)} />
          <TextArea label={t('Note')} value={notes} onChangeText={mark(setNotes)} />
        </FormSection>
      </View>
    </FormTemplate>
  );
}
