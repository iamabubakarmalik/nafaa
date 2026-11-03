/** Step 1: how the business sells, industry, size, city and WhatsApp number. */

import { Home, MapPin, MessageCircle, Network, Store, Warehouse } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { t, msg } from '@/core/i18n';
import type { BusinessModel } from '@/core/business-models';
import { Card, Chip, Input, Text, useTheme } from '@/design';
import { BusinessModelPicker } from '@/modules/auth/components/BusinessModelPicker';
import { IndustryPicker } from '@/modules/auth/components/IndustryPicker';
import { industryChoices } from '@/modules/auth/lib/industry-choices';
import type { OnboardingOptions } from '../lib/api';
import { ChoiceCard, StepSection } from '../components/ChoiceCard';

export interface BusinessForm {
  businessModels: BusinessModel[];
  businessType: string;
  businessSize: string;
  city: string;
  whatsappNumber: string;
}
export type BusinessErrors = Partial<Record<keyof BusinessForm, string>>;

const SIZES = [
  { value: 'MICRO', title: msg('Chhota kaam'), description: msg('Ghar se ya akele'), icon: Home },
  { value: 'SMALL', title: msg('Ek dukaan'), description: msg('1–3 log kaam karte hain'), icon: Store },
  { value: 'MEDIUM', title: msg('Barhi dukaan'), description: msg('4–15 log, 1–3 branches'), icon: Warehouse },
  { value: 'LARGE', title: msg('Kai branches'), description: msg('15 se zyada log'), icon: Network },
] as const;

export const cleanPhone = (v: string) => v.replace(/[\s-]/g, '');
const PHONE_RE = /^\+?[0-9]{10,15}$/;

export function validateBusiness(f: BusinessForm): BusinessErrors {
  const e: BusinessErrors = {};
  if (!f.businessType) e.businessType = t('Apna kaam chunein.');
  if (!f.businessSize) e.businessSize = t('Dukaan ka size chunein.');
  if (f.whatsappNumber && !PHONE_RE.test(cleanPhone(f.whatsappNumber))) e.whatsappNumber = t('Number sahi nahi. Misaal: 03001234567');
  return e;
}

export const readCities = (o: OnboardingOptions) =>
  (o.cities ?? []).map((c) => (typeof c === 'string' ? { name: c, province: '' } : { name: c.name, province: c.province ?? '' }));

export function BusinessStep({ value, onChange, errors, options, detectedCity }: { value: BusinessForm; onChange: (p: Partial<BusinessForm>) => void; errors: BusinessErrors; options: OnboardingOptions; detectedCity?: string | null }) {
  const th = useTheme();
  const [cityFocus, setCityFocus] = useState(false);
  const cities = useMemo(() => readCities(options), [options]);
  const choices = useMemo(() => {
    const allowed = new Set(options.businessTypes.map((b) => b.value));
    return industryChoices(value.businessModels).filter((c) => allowed.has(c.businessType));
  }, [options.businessTypes, value.businessModels]);
  const suggestions = useMemo(() => {
    const q = value.city.trim().toLowerCase();
    return (q ? cities.filter((c) => c.name.toLowerCase().startsWith(q) && c.name.toLowerCase() !== q) : cities).slice(0, 8);
  }, [cities, value.city]);

  return (
    <View style={{ gap: th.space(6) }}>
      <BusinessModelPicker value={value.businessModels} onChange={(businessModels) => onChange({ businessModels })} />
      <IndustryPicker label={t('Aap kya bechte hain / kya kaam hai?')} choices={choices} value={value.businessType} onChange={(businessType) => onChange({ businessType })} error={errors.businessType} />
      <StepSection title={t('Business kitna barha hai?')} hint={t('Is se staff aur branches wale hisse set hote hain.')}>
        <View style={{ gap: th.space(2) }} accessibilityRole="radiogroup">
          {SIZES.map((s) => (
            <ChoiceCard key={s.value} selected={value.businessSize === s.value} onSelect={() => onChange({ businessSize: s.value })} title={t(s.title)} description={t(s.description)} icon={s.icon} />
          ))}
        </View>
      </StepSection>
      <View style={{ gap: th.space(2) }}>
        <Input label={t('Shahar')} placeholder={t('Misaal: Lahore')} icon={MapPin} value={value.city} onChangeText={(city) => onChange({ city })} onFocus={() => setCityFocus(true)} onBlur={() => setTimeout(() => setCityFocus(false), 150)} autoComplete="postal-address-locality" error={errors.city} />
        {cityFocus && suggestions.length > 0 && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: th.space(2) }}>
            {suggestions.map((c) => <Chip key={c.name} label={c.name} onPress={() => onChange({ city: c.name })} />)}
          </View>
        )}
        {detectedCity && value.city !== detectedCity && (
          <Text size="sm" weight="semibold" tone="brand" onPress={() => onChange({ city: detectedCity })}>{t('Aap ki location se: {{detectedCity}} — yahi rakhein', { detectedCity })}</Text>
        )}
      </View>
      <Input label={t('WhatsApp number')} labelHint={t('(zaroori nahi)')} placeholder="03001234567" keyboardType="phone-pad" icon={MessageCircle} value={value.whatsappNumber} onChangeText={(whatsappNumber) => onChange({ whatsappNumber })} hint={t('Customers ko bill aur khata isi number se jayega.')} error={errors.whatsappNumber} />
      <Card tone="muted"><Text size="sm" tone="secondary">{t('Kaam badalna ho to baad me Settings → Business type se badal sakte hain. Wahin features bhi on/off hote hain.')}</Text></Card>
    </View>
  );
}
