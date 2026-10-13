/** Onboarding step 4: receipt size, payment methods, tax and the low-stock alert. */

import { FileText, Percent, Printer } from 'lucide-react';
import { Input, Switch } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import type { OnboardingOptions } from '../api/onboarding.api';
import { Chip, ChoiceCard, StepSection } from '../components/WizardControls';

export interface ReceiptForm {
  receiptTemplate: string;
  paymentMethods: string[];
  enableTax: boolean;
  taxRate: string;
  lowStockThreshold: string;
}

export type ReceiptErrors = Partial<Record<keyof ReceiptForm, string>>;

const SIZES: Array<{ value: string; title: string; description: string; icon: typeof Printer }> = [
  { value: 'THERMAL_58MM', title: 'Chhoti parchi (58mm)', description: 'Chhota thermal printer', icon: Printer },
  { value: 'THERMAL_80MM', title: 'Bari parchi (80mm)', description: 'Aam thermal printer', icon: Printer },
  { value: 'A4_BASIC', title: 'A4 saada', description: 'Aam printer, saada kaghaz', icon: FileText },
  { value: 'A4_DETAILED', title: 'A4 logo ke saath', description: 'Logo aur neeche ki likhai', icon: FileText },
];

export function validateReceipt(f: ReceiptForm): ReceiptErrors {
  const e: ReceiptErrors = {};
  if (f.paymentMethods.length === 0) e.paymentMethods = 'Kam se kam ek tareeqa chunein (Cash).';
  if (f.enableTax) {
    const r = Number(f.taxRate);
    if (!(r > 0 && r <= 100)) e.taxRate = '0 se 100 ke beech likhein';
  }
  const low = Number(f.lowStockThreshold);
  if (f.lowStockThreshold === '' || !Number.isInteger(low) || low < 0) e.lowStockThreshold = 'Poora number likhein (misaal 10)';
  return e;
}

interface Props {
  value: ReceiptForm;
  onChange: (patch: Partial<ReceiptForm>) => void;
  errors: ReceiptErrors;
  options: OnboardingOptions;
  shopName: string;
  address?: string;
}

export function ReceiptStep({ value, onChange, errors, options, shopName, address }: Props) {
  const methods = options.paymentMethods ?? [];
  const toggleMethod = (m: string) =>
    onChange({ paymentMethods: value.paymentMethods.includes(m) ? value.paymentMethods.filter((x) => x !== m) : [...value.paymentMethods, m] });

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_14rem]">
      <div className="space-y-7">
        <StepSection title="Bill kis printer par niklega?" hint="Thermal printer nahi hai to A4 chunein. Baad me Settings → Raseed se design badal sakte hain.">
          <div role="radiogroup" aria-label="Raseed ka size" className="grid gap-2 sm:grid-cols-2">
            {SIZES.map((s) => (
              <ChoiceCard
                key={s.value}
                selected={value.receiptTemplate === s.value}
                onSelect={() => onChange({ receiptTemplate: s.value })}
                icon={<s.icon className="h-4 w-4" />}
                title={s.title}
                description={s.description}
              />
            ))}
          </div>
        </StepSection>

        <StepSection title="Payment kaise lete hain?" hint="Pehla chuna hua counter par pehle se laga hoga.">
          <div role="group" aria-label="Payment ke tareeqe" className="flex flex-wrap gap-2">
            {methods.map((m) => (
              <Chip key={m.value} selected={value.paymentMethods.includes(m.value)} onToggle={() => toggleMethod(m.value)}>
                {m.label}
              </Chip>
            ))}
          </div>
          {errors.paymentMethods && <p className="text-xs font-medium text-rose-600">{errors.paymentMethods}</p>}
        </StepSection>

        <StepSection title="Tax">
          <Switch
            checked={value.enableTax}
            onChange={(e) => onChange({ enableTax: e.target.checked })}
            label="Bill par sales tax lagayein"
            description="Sirf tab on karein jab aap tax me registered hain."
          />
          {value.enableTax && (
            <Input
              label="Tax rate"
              type="number"
              inputMode="decimal"
              min={0}
              max={100}
              step="0.5"
              placeholder="Misaal: 17"
              rightIcon={<Percent className="h-4 w-4" />}
              value={value.taxRate}
              onChange={(e) => onChange({ taxRate: e.target.value })}
              error={errors.taxRate}
              wrapperClassName="max-w-[12rem]"
            />
          )}
        </StepSection>

        <Input
          label="Kam stock ki khabar kab dein?"
          type="number"
          inputMode="numeric"
          min={0}
          hint="Jab kisi product ka stock is se kam ho jaye to alert aayega."
          value={value.lowStockThreshold}
          onChange={(e) => onChange({ lowStockThreshold: e.target.value })}
          error={errors.lowStockThreshold}
          wrapperClassName="max-w-[16rem]"
        />
      </div>

      <ReceiptPreview template={value.receiptTemplate} shopName={shopName} address={address} taxRate={value.enableTax ? Number(value.taxRate) || 0 : 0} />
    </div>
  );
}

/** Rough look of the printed bill; the real one comes from the receipt engine. */
function ReceiptPreview({ template, shopName, address, taxRate }: { template: string; shopName: string; address?: string; taxRate: number }) {
  const narrow = template === 'THERMAL_58MM';
  const a4 = template.startsWith('A4');
  const subtotal = 850;
  const tax = Math.round((subtotal * taxRate) / 100);
  return (
    <aside aria-label="Bill ka andaza" className="hidden lg:block">
      <p className="mb-2 text-xs font-medium text-slate-500">Bill kuch aisa dikhega</p>
      <div className={cn('mx-auto rounded-md bg-white p-3 font-mono text-[0.625rem] leading-relaxed text-slate-800 shadow-md ring-1 ring-slate-200', narrow ? 'w-40' : a4 ? 'w-full' : 'w-48')}>
        <div className="text-center">
          <div className="text-[0.75rem] font-bold">{shopName || 'Aap ki dukaan'}</div>
          {address && <div className="truncate">{address}</div>}
        </div>
        <div className="my-1.5 border-t border-dashed border-slate-300" />
        <div className="flex justify-between"><span>Item 1 × 2</span><span>500</span></div>
        <div className="flex justify-between"><span>Item 2 × 1</span><span>350</span></div>
        <div className="my-1.5 border-t border-dashed border-slate-300" />
        {tax > 0 && <div className="flex justify-between"><span>Tax {taxRate}%</span><span>{tax}</span></div>}
        <div className="flex justify-between font-bold"><span>Total</span><span>Rs {subtotal + tax}</span></div>
        <div className="mt-2 text-center text-slate-500">Shukriya!</div>
        <div className="text-center text-slate-400">Powered by Nafaa</div>
      </div>
    </aside>
  );
}
