/** Step 4: receipt size, payment methods, tax and the low-stock alert, with a bill preview. */

import { FileText, Printer } from 'lucide-react-native';
import { View } from 'react-native';
import { t, msg } from '@/core/i18n';
import { ChipGroup, Input, Switch, Text, useTheme } from '@/design';
import type { OnboardingOptions } from '../lib/api';
import { ChoiceCard, StepSection } from '../components/ChoiceCard';

export interface ReceiptForm { receiptTemplate: string; paymentMethods: string[]; enableTax: boolean; taxRate: string; lowStockThreshold: string }
export type ReceiptErrors = Partial<Record<keyof ReceiptForm, string>>;

const SIZES = [
  { value: 'THERMAL_58MM', title: msg('Chhoti parchi (58mm)'), description: msg('Chhota thermal printer'), icon: Printer },
  { value: 'THERMAL_80MM', title: msg('Bari parchi (80mm)'), description: msg('Aam thermal printer'), icon: Printer },
  { value: 'A4_BASIC', title: msg('A4 saada'), description: msg('Aam printer, saada kaghaz'), icon: FileText },
  { value: 'A4_DETAILED', title: msg('A4 logo ke saath'), description: msg('Logo aur neeche ki likhai'), icon: FileText },
];

export function validateReceipt(f: ReceiptForm): ReceiptErrors {
  const e: ReceiptErrors = {};
  if (f.paymentMethods.length === 0) e.paymentMethods = t('Kam se kam ek tareeqa chunein (Cash).');
  if (f.enableTax) {
    const r = Number(f.taxRate);
    if (!(r > 0 && r <= 100)) e.taxRate = t('0 se 100 ke beech likhein');
  }
  const low = Number(f.lowStockThreshold);
  if (f.lowStockThreshold === '' || !Number.isInteger(low) || low < 0) e.lowStockThreshold = t('Poora number likhein (misaal 10)');
  return e;
}

function ReceiptPreview({ template, shopName, address, taxRate }: { template: string; shopName: string; address?: string; taxRate: number }) {
  const th = useTheme();
  const narrow = template === 'THERMAL_58MM';
  const a4 = template.startsWith('A4');
  const subtotal = 850;
  const tax = Math.round((subtotal * taxRate) / 100);
  const line = (l: string, r: string, bold?: boolean) => (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
      <Text size="xs" weight={bold ? 'bold' : 'regular'} color="#1e293b">{l}</Text>
      <Text size="xs" weight={bold ? 'bold' : 'regular'} color="#1e293b" ltr>{r}</Text>
    </View>
  );
  return (
    <View style={{ alignItems: 'center', padding: th.space(4), borderRadius: th.radius('xl'), backgroundColor: th.colors.surfaceMuted }}>
      <Text size="xs" weight="medium" tone="muted" style={{ marginBottom: th.space(2) }}>{t('Bill kuch aisa dikhega')}</Text>
      <View style={{ width: narrow ? 170 : a4 ? '100%' : 210, backgroundColor: '#ffffff', padding: th.space(3), borderRadius: 6, gap: 3, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 3 }}>
        <Text size="sm" weight="bold" color="#0f172a" align="center">{shopName || t('Aap ki dukaan')}</Text>
        {address ? <Text size="2xs" color="#475569" align="center" numberOfLines={1}>{address}</Text> : null}
        <View style={{ borderTopWidth: 1, borderStyle: 'dashed', borderColor: '#cbd5e1', marginVertical: 4 }} />
        {line(t('Item 1 × 2'), '500')}
        {line(t('Item 2 × 1'), '350')}
        <View style={{ borderTopWidth: 1, borderStyle: 'dashed', borderColor: '#cbd5e1', marginVertical: 4 }} />
        {tax > 0 && line(t('Tax {{taxRate}}%', { taxRate }), String(tax))}
        {line(t('Total'), `Rs ${subtotal + tax}`, true)}
        <Text size="2xs" color="#64748b" align="center" style={{ marginTop: 6 }}>{t('Shukriya!')}</Text>
        <Text size="2xs" color="#94a3b8" align="center">{t('Powered by Nafaa')}</Text>
      </View>
    </View>
  );
}

export function ReceiptStep({ value, onChange, errors, options, shopName, address }: { value: ReceiptForm; onChange: (p: Partial<ReceiptForm>) => void; errors: ReceiptErrors; options: OnboardingOptions; shopName: string; address?: string }) {
  const th = useTheme();
  const methods = options.paymentMethods ?? [];
  return (
    <View style={{ gap: th.space(6) }}>
      <StepSection title={t('Bill kis printer par niklega?')} hint={t('Thermal printer nahi hai to A4 chunein. Baad me Settings → Raseed se design badal sakte hain.')}>
        <View style={{ gap: th.space(2) }}>
          {SIZES.map((s) => <ChoiceCard key={s.value} selected={value.receiptTemplate === s.value} onSelect={() => onChange({ receiptTemplate: s.value })} icon={s.icon} title={t(s.title)} description={t(s.description)} />)}
        </View>
      </StepSection>
      <ReceiptPreview template={value.receiptTemplate} shopName={shopName} address={address} taxRate={value.enableTax ? Number(value.taxRate) || 0 : 0} />
      <StepSection title={t('Payment kaise lete hain?')} hint={t('Pehla chuna hua counter par pehle se laga hoga.')}>
        <ChipGroup multiple wrap value={value.paymentMethods} onChange={(paymentMethods) => onChange({ paymentMethods })} options={methods.map((m) => ({ value: m.value, label: m.label }))} />
        {errors.paymentMethods && <Text size="xs" weight="medium" tone="danger">{errors.paymentMethods}</Text>}
      </StepSection>
      <StepSection title={t('Tax')}>
        <Switch value={value.enableTax} onChange={(enableTax) => onChange({ enableTax })} label={t('Bill par sales tax lagayein')} description={t('Sirf tab on karein jab aap tax me registered hain.')} />
        {value.enableTax && <Input label={t('Tax rate')} value={value.taxRate} onChangeText={(taxRate) => onChange({ taxRate: taxRate.replace(/[^0-9.]/g, '') })} keyboardType="decimal-pad" placeholder={t('Misaal: 17')} trailing={<Text tone="muted" ltr>%</Text>} error={errors.taxRate} />}
      </StepSection>
      <Input label={t('Kam stock ki khabar kab dein?')} value={value.lowStockThreshold} onChangeText={(v) => onChange({ lowStockThreshold: v.replace(/\D/g, '') })} keyboardType="number-pad" hint={t('Jab kisi product ka stock is se kam ho jaye to alert aayega.')} error={errors.lowStockThreshold} />
    </View>
  );
}
