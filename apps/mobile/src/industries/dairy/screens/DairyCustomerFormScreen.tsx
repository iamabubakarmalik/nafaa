/** New or edit delivery customer (web DairyCustomerFormPage): who, address and route, daily litres and rate, advance money. */

import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { ChipGroup, DatePicker, EmptyState, FormSection, FormTemplate, Input, MoneyInput, Select, TextArea, toast } from '@/design';
import { NumberInput } from '@/modules/inventory/components/fields';
import { OfflineNote, dateToKey, errorText, keyToDate, todayKey, useDeskOnline } from '../../_shared/deskKit';
import { dairyCustomersApi, routesApi, type CustomerInput, type DairyCustomer, type DeliveryFrequency } from '../api';
import { DAIRY_KEYS, FREQUENCY, PAY_METHODS, cnicOk, opt, phoneOk, refreshDairy } from '../meta';

interface Draft {
  name: string; phone: string; cnic: string; containerType: string; address: string; area: string; landmark: string; routeId: string; deliveryFrequency: DeliveryFrequency;
  morningQuantity: number | null; eveningQuantity: number | null; customRate: number | null; startDate: string; advancePayment: number | null; advanceMethod: string; notes: string;
}
const blank = (): Draft => ({ name: '', phone: '', cnic: '', containerType: '', address: '', area: '', landmark: '', routeId: '', deliveryFrequency: 'DAILY', morningQuantity: null, eveningQuantity: null, customRate: null, startDate: todayKey(), advancePayment: null, advanceMethod: 'CASH', notes: '' });
const fromCustomer = (c: DairyCustomer): Draft => ({
  name: c.name, phone: c.phone ?? '', cnic: c.cnic ?? '', containerType: c.containerType ?? '', address: c.address ?? '', area: c.area ?? '', landmark: c.landmark ?? '', routeId: c.routeId ?? '', deliveryFrequency: c.deliveryFrequency,
  morningQuantity: c.morningQuantity || null, eveningQuantity: c.eveningQuantity || null, customRate: c.customRate ?? null, startDate: c.startDate.slice(0, 10), advancePayment: null, advanceMethod: 'CASH', notes: c.notes ?? '',
});

export function DairyCustomerFormScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const editing = !!id;
  const canKhata = usePermission()(P.KHATA_MANAGE);
  const { guard } = useDeskOnline('dairyDesk');
  const [d, setD] = useState<Draft>(blank);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [touched, setTouched] = useState(false);
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => { setDirty(true); setD((x) => ({ ...x, [k]: v })); };
  const q = useQuery({ queryKey: [DAIRY_KEYS.customer, id], queryFn: () => dairyCustomersApi.getOne(id!), enabled: editing });
  const routesQ = useQuery({ queryKey: [DAIRY_KEYS.routes, 'active'], queryFn: () => routesApi.all({ active: true }), staleTime: 5 * 60_000 });
  useEffect(() => { if (q.data) { setD(fromCustomer(q.data)); setDirty(false); } }, [q.data]);

  const errors: Record<string, string> = {};
  if (!d.name.trim()) errors.name = t('Naam likhein');
  if (!phoneOk(d.phone)) errors.phone = t('Phone 10 se 15 hindse');
  if (!cnicOk(d.cnic)) errors.cnic = t('CNIC 13 hindse (12345-1234567-1)');
  const m = d.morningQuantity ?? 0; const ev = d.eveningQuantity ?? 0;
  if (m > 500) errors.morning = t('0 se 500 liter'); if (ev > 500) errors.evening = t('0 se 500 liter');
  if (d.deliveryFrequency !== 'ON_DEMAND' && m <= 0 && ev <= 0) errors.morning = t('Subah ya shaam ki quantity likhein (ya "Jab maange" chunein)');
  const err = (k: string) => (touched ? errors[k] : undefined);

  const save = async () => {
    setTouched(true);
    const first = Object.values(errors)[0];
    if (first) { toast.error(first); return; }
    const body: Partial<CustomerInput> = {
      name: d.name.trim(), phone: opt(d.phone), cnic: opt(d.cnic), address: opt(d.address), area: opt(d.area), landmark: opt(d.landmark), routeId: d.routeId || undefined, deliveryFrequency: d.deliveryFrequency,
      morningQuantity: m, eveningQuantity: ev, containerType: opt(d.containerType), startDate: d.startDate || undefined, notes: opt(d.notes), customRate: d.customRate ?? (editing ? null : undefined),
      ...(!editing && d.advancePayment ? { advancePayment: d.advancePayment, advanceMethod: d.advanceMethod } : {}),
    };
    setSaving(true);
    try {
      const c = await dairyCustomersApi.save(id, body);
      refreshDairy([DAIRY_KEYS.customers, DAIRY_KEYS.customer, DAIRY_KEYS.routes], !editing && !!d.advancePayment);
      setDirty(false);
      toast.success(editing ? t('Customer save') : t('{{name}} jur gaye — {{customerNumber}}', { name: c.name, customerNumber: c.customerNumber }));
      router.replace(`/dairy/customers/${c.id}` as never);
    } catch (e) { toast.error(errorText(e, t('Save nahi hua'))); } finally { setSaving(false); }
  };

  if (editing && !q.data && !q.isLoading) return <FormTemplate title={t('Customer')} onSave={() => router.back()}><EmptyState title={t('Customer nahi mila')} /></FormTemplate>;
  return (
    <FormTemplate title={editing ? t('{{name}} badlein', { name: q.data?.name ?? '' }) : t('Naya customer')} dirty={dirty} saving={saving} onSave={() => guard(() => void save())}>
      <OfflineNote feature="dairyDesk" />
      <FormSection title={t('Customer')}>
        <Input label={t('Naam *')} value={d.name} onChangeText={(v) => set('name', v)} placeholder={t('Jaise: Aslam sahib')} error={err('name')} />
        <Input label={t('Phone')} keyboardType="phone-pad" ltr value={d.phone} onChangeText={(v) => set('phone', v)} placeholder="0300 1234567" hint={t('Isi phone ka khata pehle se ho to wahi jurta hai')} error={err('phone')} />
        <Input label={t('CNIC (marzi)')} ltr value={d.cnic} onChangeText={(v) => set('cnic', v)} error={err('cnic')} />
        <Input label={t('Bartan (marzi)')} value={d.containerType} onChangeText={(v) => set('containerType', v)} placeholder={t('Apna dabba, bottle, thaili')} />
      </FormSection>
      <FormSection title={t('Pata')}>
        <Input label={t('Pata')} value={d.address} onChangeText={(v) => set('address', v)} placeholder={t('Ghar number, gali')} />
        <Input label={t('Area / mohalla')} value={d.area} onChangeText={(v) => set('area', v)} />
        <Input label={t('Nishani')} value={d.landmark} onChangeText={(v) => set('landmark', v)} placeholder={t('Masjid ke saath')} />
        <Select label={t('Route')} value={d.routeId} onChange={(v) => set('routeId', v)} options={[{ value: '', label: t('Bina route') }, ...(routesQ.data ?? []).map((r) => ({ value: r.id, label: `${r.name}${r.areaName ? ` — ${r.areaName}` : ''}` }))]} />
      </FormSection>
      <FormSection title={t('Doodh')}>
        <NumberInput label={t('Subah (liter)')} value={d.morningQuantity} onChangeValue={(v) => set('morningQuantity', v)} error={err('morning')} />
        <NumberInput label={t('Shaam (liter)')} value={d.eveningQuantity} onChangeValue={(v) => set('eveningQuantity', v)} error={err('evening')} />
        <Select label={t('Kab')} value={d.deliveryFrequency} onChange={(v) => set('deliveryFrequency', v as DeliveryFrequency)} options={Object.entries(FREQUENCY).map(([value, f]) => ({ value, label: t(f.label), description: t(f.hint) }))} />
        <MoneyInput label={t('Rate (marzi)')} value={d.customRate} onChangeValue={(v) => set('customRate', v)} hint={t('Khali = dukaan ka delivery rate')} />
        <DatePicker label={t('Kab se')} value={keyToDate(d.startDate)} onChange={(x) => set('startDate', dateToKey(x))} />
      </FormSection>
      {!editing && (
        <FormSection title={t('Advance')} description={t('Pehle se paisa diya ho to likhein — khate me advance ban jata hai')}>
          <MoneyInput label={t('Amount (Rs)')} value={d.advancePayment} onChangeValue={(v) => set('advancePayment', v)} disabled={!canKhata} />
          <ChipGroup wrap value={d.advanceMethod} onChange={(v) => set('advanceMethod', v)} options={PAY_METHODS.map((m2) => ({ value: m2.value, label: t(m2.label) }))} />
        </FormSection>
      )}
      <FormSection title={t('Note')}><TextArea value={d.notes} onChangeText={(v) => set('notes', v)} /></FormSection>
    </FormTemplate>
  );
}
