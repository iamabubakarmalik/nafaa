/** Onboarding step 2: the main branch's address, hours, working days and NTN. */

import { Building2, Clock, FileText, MapPin } from 'lucide-react';
import { Badge, Input } from '@/design-system/components';
import type { OnboardingOptions } from '../api/onboarding.api';
import { Chip, StepSection } from '../components/WizardControls';
import { t } from '@core/i18n';

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

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

const DAY_LABELS: Record<string, string> = {
  mon: t('Pir'), tue: t('Mangal'), wed: t('Budh'), thu: t('Jumerat'), fri: t('Juma'), sat: t('Hafta'), sun: t('Itwar'),
};

export function validateBranch(f: BranchForm): BranchErrors {
  const e: BranchErrors = {};
  if (f.openTime && !TIME_RE.test(f.openTime)) e.openTime = t('Waqt sahi likhein (misaal 09:00)');
  if (f.closeTime && !TIME_RE.test(f.closeTime)) e.closeTime = t('Waqt sahi likhein (misaal 22:00)');
  if (f.workingDays.length === 0) e.workingDays = t('Kam se kam ek din chunein.');
  return e;
}

interface Props {
  value: BranchForm;
  onChange: (patch: Partial<BranchForm>) => void;
  errors: BranchErrors;
  options: OnboardingOptions;
  branchName: string;
}

export function BranchStep({ value, onChange, errors, options, branchName }: Props) {
  const days = options.workingDays?.length ? options.workingDays : Object.keys(DAY_LABELS).map((d) => ({ value: d, label: d, short: d }));
  const toggleDay = (d: string) =>
    onChange({ workingDays: value.workingDays.includes(d) ? value.workingDays.filter((x) => x !== d) : [...value.workingDays, d] });

  return (
    <div className="space-y-7">
      <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3.5">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-600 text-brand-fg">
          <Building2 className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-semibold text-slate-900">{branchName}</span>
            <Badge variant="brand">{t('Main branch')}</Badge>
          </div>
          <p className="text-xs text-slate-500">{t('Account bante hi ye branch ban gayi. Aur branches baad me Branches page se.')}</p>
        </div>
      </div>

      <StepSection title={t('Dukaan kahan hai?')} hint={t('Bill aur raseed par yahi pata chhapta hai.')}>
        <Input
          label={t('Pata')}
          placeholder={t('Shop 12, Main Bazaar')}
          autoComplete="street-address"
          leftIcon={<MapPin className="h-4 w-4" />}
          value={value.shopAddress}
          onChange={(e) => onChange({ shopAddress: e.target.value })}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label={t('Ilaqa')}
            placeholder={t('Misaal: Gulberg')}
            value={value.shopArea}
            onChange={(e) => onChange({ shopArea: e.target.value })}
          />
          <Input
            label={t('Nishani (zaroori nahi)')}
            placeholder={t('Misaal: Masjid ke saath')}
            value={value.shopLandmark}
            onChange={(e) => onChange({ shopLandmark: e.target.value })}
          />
        </div>
      </StepSection>

      <StepSection title={t('Dukaan kab khulti hai?')} hint={t('Ye dukaan ki maloomat me save hota hai. Baad me Settings se badal sakte hain.')}>
        <div className="grid grid-cols-2 gap-4">
          <Input
            label={t('Khulne ka waqt')}
            type="time"
            leftIcon={<Clock className="h-4 w-4" />}
            value={value.openTime}
            onChange={(e) => onChange({ openTime: e.target.value })}
            error={errors.openTime}
          />
          <Input
            label={t('Band hone ka waqt')}
            type="time"
            leftIcon={<Clock className="h-4 w-4" />}
            value={value.closeTime}
            onChange={(e) => onChange({ closeTime: e.target.value })}
            error={errors.closeTime}
          />
        </div>
        <div role="group" aria-label={t('Kaam ke din')} className="flex flex-wrap gap-2">
          {days.map((d) => (
            <Chip key={d.value} selected={value.workingDays.includes(d.value)} onToggle={() => toggleDay(d.value)}>
              {DAY_LABELS[d.value] ?? d.short}
            </Chip>
          ))}
        </div>
        {errors.workingDays && <p className="text-xs font-medium text-rose-600">{errors.workingDays}</p>}
      </StepSection>

      <Input
        label={<>{t('NTN / tax number')}{' '} <span className="font-normal text-slate-500">{t('(zaroori nahi)')}</span></>}
        placeholder="1234567-8"
        leftIcon={<FileText className="h-4 w-4" />}
        hint={t('FBR ya provincial tax me registered hain to likhein. Bill par bhi aa sakta hai.')}
        value={value.taxNumber}
        onChange={(e) => onChange({ taxNumber: e.target.value })}
      />
    </div>
  );
}
