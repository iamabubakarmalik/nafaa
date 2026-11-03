/** New or edited AMC (web AmcContractFormPage): customer and unit, plan, period, free visits and cover, price and money taken now. */

import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { AMC_MONTHS, AMC_PRESETS, addMonthsKey, amcProblems, type AmcType } from '@nafaa/core/industries/appliances';
import { formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { ChipGroup, DatePicker, EmptyState, FormSection, FormTemplate, Input, MoneyInput, Skeleton, Switch, Text, TextArea, toast, useTheme } from '@/design';
import { NumberInput } from '@/modules/inventory/components/fields';
import { CustomerBox, MethodChips, customerErrors, dateToKey, emptyCustomer, errText, keyToDate, opt, todayKey, useDeskOnline, type CustomerValue } from '../../_shared/trade/desk';
import { amcContractsApi } from '../api';
import { SerialLookup } from '../components/kit';
import { AMC_PLANS, KEYS, amcPlanLabel, dayOnly, refreshAppliances } from '../meta';

export function AmcFormScreen() {
  const th = useTheme();
  const { edit } = useLocalSearchParams<{ edit?: string }>();
  const editing = !!edit;
  const { guard } = useDeskOnline('appliancesDesk');
  const q = useQuery({ queryKey: [KEYS.amc, 'one', edit], queryFn: () => amcContractsApi.getOne(edit!), enabled: editing });
  const [customer, setCustomer] = useState<CustomerValue>(emptyCustomer);
  const [serial, setSerial] = useState('');
  const [serialId, setSerialId] = useState<string | undefined>();
  const [productId, setProductId] = useState<string | undefined>();
  const [product, setProduct] = useState('');
  const [plan, setPlan] = useState<AmcType>('STANDARD');
  const [start, setStart] = useState(todayKey());
  const [months, setMonths] = useState(12);
  const [visits, setVisits] = useState<number | null>(3);
  const [labor, setLabor] = useState(true);
  const [parts, setParts] = useState(false);
  const [gas, setGas] = useState(false);
  const [autoRenew, setAutoRenew] = useState(false);
  const [price, setPrice] = useState<number | null>(null);
  const [paid, setPaid] = useState<number | null>(null);
  const [method, setMethod] = useState('CASH');
  const [exclusions, setExclusions] = useState('');
  const [notes, setNotes] = useState('');
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [touched, setTouched] = useState(false);
  const mark = <T,>(set: (v: T) => void) => (v: T) => { setDirty(true); set(v); };
  const c = q.data;
  useEffect(() => {
    if (!c) return;
    setCustomer({ customerId: c.customerId ?? '', name: c.customerName, phone: c.customerPhone, address: c.customerAddress ?? '' });
    setSerial(c.serialNumber ?? ''); setSerialId(c.serialTrackingId); setProductId(c.productId); setProduct(c.productName ?? ''); setPlan(c.amcType); setStart(c.startDate.slice(0, 10));
    setMonths(c.durationMonths); setVisits(c.freeVisitsAllowed); setLabor(c.laborCovered); setParts(c.freePartsAllowed); setGas(c.gasRefillCovered); setAutoRenew(c.autoRenew);
    setPrice(Number(c.contractValue)); setPaid(Number(c.paidAmount)); setExclusions(c.exclusions ?? ''); setNotes(c.notes ?? ''); setDirty(false);
  }, [c]);

  const choosePlan = (p: AmcType) => { setDirty(true); setPlan(p); const x = AMC_PRESETS[p]; setVisits(x.visits); setLabor(x.labor); setParts(x.parts); setGas(x.gas); };
  const value = price ?? 0;
  const taken = paid ?? 0;
  const ce = customerErrors(customer, false);
  const problems = amcProblems({ product, value, paid: taken, visits: visits ?? 0 });
  const PROBLEM: Record<string, string> = { product: t('Kis cheez ka AMC — product likhein'), value: t('Contract ki qeemat likhein'), paid: t('Mila hua paisa qeemat se zyada nahi'), visits: t('Free visits likhein') };
  const first = Object.values(ce).find(Boolean) ?? (problems[0] ? PROBLEM[problems[0]] : '');
  const due = Math.max(value - taken, 0);
  const e = (v?: string) => (touched ? v : undefined);

  const submit = () => guard(async () => {
    setTouched(true);
    if (first) { toast.error(first); return; }
    setSaving(true);
    try {
      const body = {
        amcType: plan, customerId: customer.customerId || undefined, customerName: customer.name.trim(), customerPhone: customer.phone.trim(), customerAddress: opt(customer.address),
        productId, productName: product.trim(), serialNumber: opt(serial), serialTrackingId: serialId, startDate: start, durationMonths: months, contractValue: value, paidAmount: taken,
        freeVisitsAllowed: visits ?? 0, laborCovered: labor, freePartsAllowed: parts, gasRefillCovered: gas, autoRenew, exclusions: opt(exclusions), notes: opt(notes),
      };
      const x = editing ? await amcContractsApi.update(edit!, body) : await amcContractsApi.create({ ...body, paymentMethod: method });
      setDirty(false);
      refreshAppliances([KEYS.amc], true);
      toast.success(editing ? t('Contract update') : t('AMC {{contractNumber}} ban gaya — bill bhi', { contractNumber: x.contractNumber }));
      router.replace(`/appliances/amc-contracts/${x.id}` as never);
    } catch (err) { toast.error(errText(err, t('Save nahi hua'))); } finally { setSaving(false); }
  });

  if (editing && q.isLoading) return <FormTemplate title={t('Naya AMC contract')} onSave={() => undefined}><Skeleton height={300} /></FormTemplate>;
  if (editing && !c) return <FormTemplate title={t('Naya AMC contract')} onSave={() => undefined}><EmptyState title={t('Contract nahi mila')} /></FormTemplate>;
  return (
    <FormTemplate title={editing ? t('{{contractNumber}} — badlein', { contractNumber: c?.contractNumber }) : t('Naya AMC contract')} subtitle={t('Saal bhar ki service — free visits, mazdoori, gas aur parts jo cover hon')}
      dirty={dirty} saving={saving} onSave={submit} saveLabel={editing ? t('Save karein') : t('Contract banayein')}>
      <View style={{ gap: th.space(4) }}>
        <FormSection title={t('Customer aur unit')}>
          <SerialLookup value={serial} onChange={mark((v: string) => { setSerial(v); setSerialId(undefined); })} onFound={(r) => {
            const s = r.serial!;
            setSerialId(s.id); setProductId(s.productId); setProduct(s.product?.name ?? product);
            if (s.customerName && !customer.name) setCustomer({ ...customer, customerId: s.soldToCustomerId ?? '', name: s.customerName, phone: s.customerPhone ?? '', address: s.deliveryAddress ?? '' });
          }} />
          <Input label={t('Product')} value={product} onChangeText={mark((v: string) => { setProduct(v); setProductId(undefined); })} placeholder={t('Gree 1.5 ton inverter AC')} error={e(problems.includes('product') ? PROBLEM.product : undefined)} />
          <CustomerBox address value={customer} onChange={mark(setCustomer)} error={e(ce.name)} phoneError={e(ce.phone)} />
        </FormSection>
        <FormSection title={t('Plan')} description={t('Plan chunein — visits aur cover khud lag jate hain, phir badal sakte hain')}>
          <ChipGroup wrap value={plan} onChange={(p) => choosePlan(p as AmcType)} options={(Object.keys(AMC_PLANS) as AmcType[]).map((p) => ({ value: p, label: amcPlanLabel(p) }))} />
          <Text size="xs" tone="muted">{t(AMC_PLANS[plan].hint)}</Text>
          <DatePicker label={t('Shuru')} value={keyToDate(start)} onChange={(d) => { setDirty(true); setStart(dateToKey(d)); }} />
          <Text size="sm" weight="semibold" tone="secondary">{t('Muddat')}</Text>
          <ChipGroup value={String(months)} onChange={(v) => { setDirty(true); setMonths(Number(v)); }} options={AMC_MONTHS.map((m) => ({ value: String(m), label: t('{{n}} mahine', { n: m }) }))} />
          <NumberInput label={t('Free visits')} integer value={visits} onChangeValue={mark(setVisits)} hint={t('Khatam: {{date}}', { date: dayOnly(addMonthsKey(start || todayKey(), months)) })} />
          <Switch value={labor} onChange={mark(setLabor)} label={t('Mazdoori free')} />
          <Switch value={gas} onChange={mark(setGas)} label={t('Gas refill free')} />
          <Switch value={parts} onChange={mark(setParts)} label={t('Parts free')} />
          <Switch value={autoRenew} onChange={mark(setAutoRenew)} label={t('Khatam par renew yaad dilayein')} />
          <TextArea label={t('Kya cover nahi')} value={exclusions} onChangeText={mark(setExclusions)} placeholder={t('Compressor, PCB, tootna, paani ka nuqsan')} />
        </FormSection>
        <FormSection title={t('Paisa')} description={editing ? t('Bill ban chuka — baqi paisa contract khol kar "Paisa lein" se') : t('Save par bill banega; jo paisa nahi mila wo khata me jayega')}>
          <MoneyInput label={t('Contract ki qeemat')} value={price} onChangeValue={mark(setPrice)} placeholder="8000" disabled={editing} error={e(problems.includes('value') ? PROBLEM.value : undefined)} />
          <MoneyInput label={t('Abhi kitna mila')} value={paid} onChangeValue={mark(setPaid)} disabled={editing} error={e(problems.includes('paid') ? PROBLEM.paid : undefined)} />
          {!editing && taken > 0 && <MethodChips value={method} onChange={setMethod} />}
          {!editing && due > 0 && <Text size="sm" tone="warning">{t('{{due}} customer ke khata me jayega', { due: formatMoney(due) })}</Text>}
        </FormSection>
        <FormSection title={t('Note')}>
          <TextArea value={notes} onChangeText={mark(setNotes)} placeholder={t('Sirf dukaan ke liye')} />
        </FormSection>
      </View>
    </FormTemplate>
  );
}
