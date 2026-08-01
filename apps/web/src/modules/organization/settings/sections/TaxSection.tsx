import { Calculator, Percent, DollarSign } from 'lucide-react';
import { ChoiceGroup, Field, NumberInput, TextInput, Toggle, SectionCard } from '../components/UI';

export default function TaxSection({ s, set }: any) {
  return (
    <div className="space-y-5">
      <SectionCard title="Tax Settings" desc="GST, sales tax configuration" icon={Percent} color="amber">
        <Toggle checked={s.enableTax} onChange={(v: boolean) => set('enableTax', v)} label="Enable Tax" desc="Sales par tax automatically calculate ho" />
        {s.enableTax && (
          <>
            <div className="grid sm:grid-cols-2 gap-4 mt-4">
              <Field label="Tax Rate (%)" required><NumberInput value={s.taxRate} onChange={(v: number) => set('taxRate', v)} min={0} max={100} step={0.5} /></Field>
              <Field label="Tax Label" hint="Receipt pe display name"><TextInput value={s.taxLabel} onChange={(v: string) => set('taxLabel', v)} placeholder="GST" maxLength={20} /></Field>
              <Field label="Tax Number / NTN"><TextInput value={s.taxNumber} onChange={(v: string) => set('taxNumber', v)} placeholder="1234567-8" /></Field>
              <Field label="Tax Calculation">
                <ChoiceGroup value={String(s.taxInclusive)} onChange={(v: string) => set('taxInclusive', v === 'true')} options={[
                  { value: 'false', label: 'Exclusive', desc: 'Tax price ke upar add hoga', emoji: '➕' },
                  { value: 'true', label: 'Inclusive', desc: 'Price mein tax shamil hai', emoji: '📦' },
                ]} />
              </Field>
            </div>
          </>
        )}
      </SectionCard>

      <SectionCard title="Pricing Rules" desc="Default markup aur rounding" icon={DollarSign} color="amber">
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Default Markup (%)" hint="Cost ke upar default profit">
            <NumberInput value={s.defaultMarkup} onChange={(v: number) => set('defaultMarkup', v)} min={0} step={5} />
          </Field>
          <Field label="Round Prices To" hint="Nearest amount pe round">
            <ChoiceGroup value={String(s.roundPriceTo)} onChange={(v: number) => set('roundPriceTo', Number(v))} options={[
              { value: '1', label: 'Rs 1' }, { value: '5', label: 'Rs 5' }, { value: '10', label: 'Rs 10' },
            ]} />
          </Field>
        </div>
      </SectionCard>
    </div>
  );
}
