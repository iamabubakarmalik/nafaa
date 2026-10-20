/** Onboarding step 1: industry, size, city and WhatsApp number. */

import { useId, useMemo } from 'react';
import { Home, MapPin, MessageCircle, Network, Store, Warehouse } from 'lucide-react';
import { Input } from '@/design-system/components';
import { IndustryPicker } from '@modules/auth/components/IndustryPicker';
import { industryChoices } from '@modules/auth/lib/industry-choices';
import type { OnboardingOptions } from '../api/onboarding.api';
import { ChoiceCard, StepSection } from '../components/WizardControls';

export interface BusinessForm {
  businessType: string;
  businessSize: string;
  city: string;
  whatsappNumber: string;
}

export type BusinessErrors = Partial<Record<keyof BusinessForm, string>>;

const SIZES = [
  { value: 'MICRO', title: 'Chhota kaam', description: 'Ghar se ya akele', icon: Home },
  { value: 'SMALL', title: 'Ek dukaan', description: '1–3 log kaam karte hain', icon: Store },
  { value: 'MEDIUM', title: 'Barhi dukaan', description: '4–15 log, 1–3 branches', icon: Warehouse },
  { value: 'LARGE', title: 'Kai branches', description: '15 se zyada log', icon: Network },
] as const;

export const cleanPhone = (v: string) => v.replace(/[\s-]/g, '');
const PHONE_RE = /^\+?[0-9]{10,15}$/;

export function validateBusiness(f: BusinessForm): BusinessErrors {
  const e: BusinessErrors = {};
  if (!f.businessType) e.businessType = 'Apna kaam chunein.';
  if (!f.businessSize) e.businessSize = 'Dukaan ka size chunein.';
  if (f.whatsappNumber && !PHONE_RE.test(cleanPhone(f.whatsappNumber))) e.whatsappNumber = 'Number sahi nahi. Misaal: 03001234567';
  return e;
}

interface CityOption { name: string; province: string }

/** The API sends either plain names (old) or city objects (new). */
export function readCities(options: OnboardingOptions): CityOption[] {
  return (options.cities ?? []).map((c: unknown) =>
    typeof c === 'string' ? { name: c, province: '' } : { name: (c as CityOption).name, province: (c as CityOption).province ?? '' });
}

interface Props {
  value: BusinessForm;
  onChange: (patch: Partial<BusinessForm>) => void;
  errors: BusinessErrors;
  options: OnboardingOptions;
  detectedCity?: string | null;
}

export function BusinessStep({ value, onChange, errors, options, detectedCity }: Props) {
  const listId = useId();
  const cities = useMemo(() => readCities(options), [options]);
  // Only offer industries the API accepts.
  const choices = useMemo(() => {
    const allowed = new Set(options.businessTypes.map((b) => b.value));
    return industryChoices().filter((c) => allowed.has(c.businessType));
  }, [options.businessTypes]);

  return (
    <div className="space-y-7">
      <IndustryPicker
        label="Aap kya bechte hain / kya kaam hai?"
        choices={choices}
        value={value.businessType}
        onChange={(businessType) => onChange({ businessType })}
        error={errors.businessType}
      />

      <StepSection title="Business kitna barha hai?" hint="Is se staff aur branches wale hisse set hote hain.">
        <div role="radiogroup" aria-label="Business size" className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {SIZES.map((s) => (
            <ChoiceCard
              key={s.value}
              selected={value.businessSize === s.value}
              onSelect={() => onChange({ businessSize: s.value })}
              title={s.title}
              description={s.description}
              icon={<s.icon className="h-4 w-4" />}
            />
          ))}
        </div>
        {errors.businessSize && <p className="text-xs font-medium text-rose-600">{errors.businessSize}</p>}
      </StepSection>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Input
            label="Shahar"
            placeholder="Misaal: Lahore"
            list={listId}
            autoComplete="address-level2"
            leftIcon={<MapPin className="h-4 w-4" />}
            value={value.city}
            onChange={(e) => onChange({ city: e.target.value })}
            error={errors.city}
          />
          <datalist id={listId}>
            {cities.map((c) => <option key={c.name} value={c.name} />)}
          </datalist>
          {detectedCity && value.city !== detectedCity && (
            <button
              type="button"
              onClick={() => onChange({ city: detectedCity })}
              className="mt-1.5 text-xs font-semibold text-brand-700 hover:underline"
            >
              Aap ki location se: {detectedCity} — yahi rakhein
            </button>
          )}
        </div>
        <Input
          label={<>WhatsApp number <span className="font-normal text-slate-500">(zaroori nahi)</span></>}
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="03001234567"
          leftIcon={<MessageCircle className="h-4 w-4" />}
          hint={errors.whatsappNumber ? undefined : 'Customers ko bill aur khata isi number se jayega.'}
          value={value.whatsappNumber}
          onChange={(e) => onChange({ whatsappNumber: e.target.value })}
          error={errors.whatsappNumber}
        />
      </div>

      <p className="rounded-lg bg-slate-100 px-3 py-2 text-xs text-slate-600">
        Kaam badalna ho to baad me <strong className="font-semibold">Settings → Business type</strong> se badal sakte hain. Wahin features bhi on/off hote hain.
      </p>
    </div>
  );
}
