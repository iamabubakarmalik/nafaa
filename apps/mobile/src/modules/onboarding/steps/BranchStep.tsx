/** Step 2: the main branch's address, hours, working days and NTN. */

import { Building2, FileText, MapPin } from 'lucide-react-native';
import { View } from 'react-native';
import { t, msg } from '@/core/i18n';
import { Badge, ChipGroup, DatePicker, Icon, Input, Text, useTheme } from '@/design';
import type { OnboardingOptions } from '../lib/api';
import { StepSection } from '../components/ChoiceCard';

export interface BranchForm {
  shopAddress: string;
  shopArea: string;
  shopLandmark: string;
  openTime: string;
  closeTime: string;
  workingDays: string[];
  taxNumber: string;
}
export type BranchErrors = Partial<Record<keyof BranchForm, string>>;

const DAY_LABELS: Record<string, string> = {
  mon: msg('Pir'), tue: msg('Mangal'), wed: msg('Budh'), thu: msg('Jumerat'), fri: msg('Juma'), sat: msg('Hafta'), sun: msg('Itwar'),
};

export function validateBranch(f: BranchForm): BranchErrors {
  const e: BranchErrors = {};
  if (f.workingDays.length === 0) e.workingDays = t('Kam se kam ek din chunein.');
  return e;
}

/** "09:30" <-> Date on today (the picker works with Dates). */
const toDate = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  const d = new Date();
  d.setHours(h || 0, m || 0, 0, 0);
  return d;
};
const fromDate = (d: Date) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

export function BranchStep({ value, onChange, errors, options, branchName }: { value: BranchForm; onChange: (p: Partial<BranchForm>) => void; errors: BranchErrors; options: OnboardingOptions; branchName: string }) {
  const th = useTheme();
  const days = options.workingDays?.length ? options.workingDays.map((d) => d.value) : Object.keys(DAY_LABELS);
  return (
    <View style={{ gap: th.space(6) }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: th.space(3), padding: th.space(3.5), borderRadius: th.radius('xl'), backgroundColor: th.colors.surfaceMuted, borderWidth: 1, borderColor: th.colors.border }}>
        <View style={{ width: 42, height: 42, borderRadius: th.radius('md'), backgroundColor: th.colors.brand.solid, alignItems: 'center', justifyContent: 'center' }}>
          <Icon icon={Building2} size={21} color={th.colors.brand.onSolid} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: th.space(2) }}>
            <Text size="base" weight="bold" numberOfLines={1} style={{ flexShrink: 1 }}>{branchName}</Text>
            <Badge tone="brand">{t('Main branch')}</Badge>
          </View>
          <Text size="xs" tone="muted">{t('Account bante hi ye branch ban gayi. Aur branches baad me Branches page se.')}</Text>
        </View>
      </View>

      <StepSection title={t('Dukaan kahan hai?')} hint={t('Bill aur raseed par yahi pata chhapta hai.')}>
        <Input label={t('Pata')} placeholder={t('Shop 12, Main Bazaar')} icon={MapPin} value={value.shopAddress} onChangeText={(shopAddress) => onChange({ shopAddress })} autoComplete="street-address" />
        <Input label={t('Ilaqa')} placeholder={t('Misaal: Gulberg')} value={value.shopArea} onChangeText={(shopArea) => onChange({ shopArea })} />
        <Input label={t('Nishani (zaroori nahi)')} placeholder={t('Misaal: Masjid ke saath')} value={value.shopLandmark} onChangeText={(shopLandmark) => onChange({ shopLandmark })} />
      </StepSection>

      <StepSection title={t('Dukaan kab khulti hai?')} hint={t('Ye dukaan ki maloomat me save hota hai. Baad me Settings se badal sakte hain.')}>
        <View style={{ flexDirection: 'row', gap: th.space(3) }}>
          <View style={{ flex: 1 }}><DatePicker mode="time" label={t('Khulne ka waqt')} value={toDate(value.openTime)} onChange={(d) => onChange({ openTime: fromDate(d) })} /></View>
          <View style={{ flex: 1 }}><DatePicker mode="time" label={t('Band hone ka waqt')} value={toDate(value.closeTime)} onChange={(d) => onChange({ closeTime: fromDate(d) })} /></View>
        </View>
        <ChipGroup multiple wrap value={value.workingDays} onChange={(workingDays) => onChange({ workingDays })} options={days.map((d) => ({ value: d, label: t(DAY_LABELS[d] ?? d) }))} />
        {errors.workingDays && <Text size="xs" weight="medium" tone="danger">{errors.workingDays}</Text>}
      </StepSection>

      <Input label={t('NTN / tax number')} labelHint={t('(zaroori nahi)')} placeholder="1234567-8" icon={FileText} value={value.taxNumber} onChangeText={(taxNumber) => onChange({ taxNumber })} ltr hint={t('FBR ya provincial tax me registered hain to likhein. Bill par bhi aa sakta hai.')} />
    </View>
  );
}
