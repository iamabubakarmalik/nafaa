/** New warranty claim (web NewClaimModal): what the shop spent on a warranty job and wants back from the company. */

import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { claimAmount } from '@nafaa/core/industries/appliances';
import { formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { ChipGroup, FormSection, FormTemplate, Input, MoneyInput, Text, TextArea, toast, useTheme } from '@/design';
import { errText, opt, useDeskOnline } from '../../_shared/trade/desk';
import { warrantyClaimsApi } from '../api';
import { SerialLookup } from '../components/kit';
import { KEYS, WARRANTY_KIND, refreshAppliances, warrantyKindLabel } from '../meta';

export function ClaimFormScreen() {
  const th = useTheme();
  const { guard } = useDeskOnline('appliancesDesk');
  const [serial, setSerial] = useState('');
  const [serialId, setSerialId] = useState<string | undefined>();
  const [productId, setProductId] = useState<string | undefined>();
  const [product, setProduct] = useState('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [customer, setCustomer] = useState('');
  const [phone, setPhone] = useState('');
  const [invoice, setInvoice] = useState('');
  const [issue, setIssue] = useState('');
  const [kind, setKind] = useState('MAIN');
  const [parts, setParts] = useState<number | null>(null);
  const [labor, setLabor] = useState<number | null>(null);
  const [other, setOther] = useState<number | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [touched, setTouched] = useState(false);
  const mark = <T,>(set: (v: T) => void) => (v: T) => { setDirty(true); set(v); };
  const errors = {
    product: product.trim().length < 2 ? t('Product ka naam likhein') : undefined, customer: customer.trim().length < 2 ? t('Customer ka naam likhein') : undefined,
    issue: issue.trim().length < 3 ? t('Kharabi likhein') : undefined,
  };
  const first = Object.values(errors).find(Boolean);
  const e = (v?: string) => (touched ? v : undefined);
  const total = claimAmount({ parts, labor, other });

  const submit = () => guard(async () => {
    setTouched(true);
    if (first) { toast.error(first); return; }
    setSaving(true);
    try {
      const c = await warrantyClaimsApi.create({
        serialTrackingId: serialId, serialNumber: opt(serial), productId, productName: product.trim(), brandName: opt(brand), modelNumber: opt(model), customerName: customer.trim(), customerPhone: opt(phone),
        invoiceNumber: opt(invoice), issue: issue.trim(), warrantyKind: kind, partsCost: parts ?? 0, laborCost: labor ?? 0, otherCost: other ?? 0,
      });
      setDirty(false);
      refreshAppliances([KEYS.claim]);
      toast.success(t('Claim {{claimNumber}} ban gaya', { claimNumber: c.claimNumber }));
      router.replace(`/appliances/warranty-claims/${c.id}` as never);
    } catch (err) { toast.error(errText(err, t('Claim nahi bana'))); } finally { setSaving(false); }
  });
  return (
    <FormTemplate title={t('Naya warranty claim')} subtitle={t('Jo kharcha dukaan ne warranty kaam par kiya, company se lein')} dirty={dirty} saving={saving} onSave={submit}>
      <View style={{ gap: th.space(4) }}>
        <FormSection title={t('Unit')}>
          <SerialLookup value={serial} onChange={mark((v: string) => { setSerial(v); setSerialId(undefined); })} onFound={(r) => {
            const s = r.serial!;
            setSerialId(s.id); setProductId(s.productId); setProduct(s.product?.name ?? product); setBrand(s.product?.brand ?? brand); setModel(s.modelNumber ?? s.product?.modelNumber ?? model);
            setCustomer(s.customerName ?? customer); setPhone(s.customerPhone ?? phone); setInvoice(s.invoiceNumber ?? invoice);
          }} />
          <Input label={t('Product')} value={product} onChangeText={mark(setProduct)} error={e(errors.product)} />
          <Input label={t('Brand / company')} value={brand} onChangeText={mark(setBrand)} placeholder={t('Haier')} />
          <Input label={t('Model')} value={model} onChangeText={mark(setModel)} />
        </FormSection>
        <FormSection title={t('Customer')}>
          <Input label={t('Customer')} value={customer} onChangeText={mark(setCustomer)} error={e(errors.customer)} />
          <Input label={t('Phone')} value={phone} onChangeText={mark(setPhone)} keyboardType="phone-pad" ltr />
          <Input label={t('Bill number')} value={invoice} onChangeText={mark(setInvoice)} ltr />
        </FormSection>
        <FormSection title={t('Kharabi')}>
          <TextArea value={issue} onChangeText={mark(setIssue)} placeholder={t('Compressor band ho gaya')} error={e(errors.issue)} />
          <Text size="sm" weight="semibold" tone="secondary">{t('Kaunsi warranty')}</Text>
          <ChipGroup wrap value={kind} onChange={mark(setKind)} options={Object.keys(WARRANTY_KIND).map((k) => ({ value: k, label: warrantyKindLabel(k) }))} />
        </FormSection>
        <FormSection title={t('Claim ki raqam')}>
          <MoneyInput label={t('Parts')} value={parts} onChangeValue={mark(setParts)} />
          <MoneyInput label={t('Mazdoori')} value={labor} onChangeValue={mark(setLabor)} />
          <MoneyInput label={t('Aur kharcha')} value={other} onChangeValue={mark(setOther)} hint={t('Gas, safar')} />
          <Text size="sm" weight="bold">{t('Claim: {{amount}}', { amount: formatMoney(total) })}</Text>
        </FormSection>
      </View>
    </FormTemplate>
  );
}
