import { ChoiceGroup, Field, NumberInput, TextInput, Toggle } from './_shared';

export default function TaxSection({ s, set }: any) {
  return (
    <div className="space-y-5">
      <Toggle
        checked={s.enableTax}
        onChange={(v) => set('enableTax', v)}
        label="Enable Tax"
        desc="Sales par tax automatically calculate ho"
      />

      {s.enableTax && (
        <>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Tax Rate (%)" required>
              <NumberInput value={s.taxRate} onChange={(v: number) => set('taxRate', v)} min={0} max={100} step={0.5} />
            </Field>
            <Field label="Tax Label">
              <TextInput value={s.taxLabel} onChange={(v: string) => set('taxLabel', v)} placeholder="GST" />
            </Field>
            <Field label="Tax Number / NTN">
              <TextInput value={s.taxNumber} onChange={(v: string) => set('taxNumber', v)} placeholder="1234567-8" />
            </Field>
          </div>

          <Field label="Tax Calculation">
            <ChoiceGroup
              value={String(s.taxInclusive)}
              onChange={(v) => set('taxInclusive', v === 'true')}
              options={[
                { value: 'false', label: 'Exclusive', desc: 'Tax price ke upar add hoga' },
                { value: 'true', label: 'Inclusive', desc: 'Price mein tax pehle se shamil hai' },
              ]}
            />
          </Field>
        </>
      )}

      <div className="border-t border-slate-100 pt-5">
        <h4 className="font-bold text-slate-800 mb-3">Pricing</h4>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Default Markup (%)" hint="Cost ke upar default profit %">
            <NumberInput value={s.defaultMarkup} onChange={(v: number) => set('defaultMarkup', v)} min={0} step={5} />
          </Field>
          <Field label="Round Prices To" hint="Nearest 1, 5, ya 10 Rs">
            <ChoiceGroup
              value={String(s.roundPriceTo)}
              onChange={(v) => set('roundPriceTo', Number(v))}
              options={[
                { value: '1', label: 'Rs 1' },
                { value: '5', label: 'Rs 5' },
                { value: '10', label: 'Rs 10' },
              ]}
            />
          </Field>
        </div>
      </div>
    </div>
  );
}
