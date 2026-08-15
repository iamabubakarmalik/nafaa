import { Calculator, Percent, DollarSign, Receipt, TrendingUp, Info } from 'lucide-react';
import { ChoiceGroup, Field, NumberInput, TextInput, Toggle, SectionCard, Alert, Divider, StatPill } from '../components/UI';
import { useAutoSave } from '../hooks/useAutoSave';
import type { TenantSettings } from '../api/settings.api';
import { SaveStatusBar } from './_SaveStatus';

export function TaxSection({ settings }: { settings: TenantSettings }) {
  const { draft, set, saving, dirty } = useAutoSave(settings);

  // Live example calculation
  const base = 1000;
  const taxAmount = draft.enableTax ? (draft.taxInclusive ? (base * draft.taxRate) / (100 + draft.taxRate) : (base * draft.taxRate) / 100) : 0;
  const finalAmount = draft.taxInclusive ? base : base + taxAmount;

  return (
    <div className="space-y-4">
      <SaveStatusBar saving={saving} dirty={dirty} />

      <SectionCard
        title="Tax Settings"
        desc="GST, sales tax, FBR configuration"
        icon={Percent}
        color="amber"
        badge={draft.enableTax
          ? <StatPill label="Tax" value={`${draft.taxRate}%`} tone="emerald" />
          : <StatPill label="Tax" value="OFF" tone="slate" />}
      >
        <Toggle
          checked={draft.enableTax}
          onChange={(v) => set('enableTax', v)}
          label="Enable Tax on Sales"
          desc="Sale pe automatically tax add/calculate ho"
          icon={Percent}
        />

        {draft.enableTax && (
          <>
            <Divider label="Tax Configuration" />
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Tax Rate" required>
                <NumberInput
                  value={draft.taxRate}
                  onChange={(v) => set('taxRate', v)}
                  min={0}
                  max={100}
                  step={0.5}
                  suffix="%"
                />
              </Field>
              <Field label="Tax Label" hint="Receipt pe dikhega — e.g. GST / VAT / Sales Tax">
                <TextInput
                  value={draft.taxLabel}
                  onChange={(v: string) => set('taxLabel', v)}
                  placeholder="GST"
                  maxLength={20}
                />
              </Field>
              <Field label="Tax Number / NTN" hint="FBR National Tax Number">
                <TextInput
                  value={draft.taxNumber}
                  onChange={(v: string) => set('taxNumber', v)}
                  placeholder="1234567-8"
                />
              </Field>
              <Field label="Tax Calculation">
                <ChoiceGroup
                  value={String(draft.taxInclusive)}
                  onChange={(v) => set('taxInclusive', v === 'true')}
                  options={[
                    { value: 'false', label: 'Exclusive', desc: 'Price + Tax', emoji: '➕' },
                    { value: 'true', label: 'Inclusive', desc: 'Price me tax shamil', emoji: '📦' },
                  ]}
                />
              </Field>
            </div>

            {/* Live example */}
            <div className="mt-4 rounded-2xl bg-gradient-to-br from-slate-950 to-amber-900 text-white p-4 shadow-lg">
              <div className="text-[10px] uppercase tracking-widest font-extrabold text-amber-300 mb-2 flex items-center gap-1">
                <Calculator className="h-3 w-3" /> Live Example (Rs 1,000 sale)
              </div>
              <div className="space-y-1 text-sm font-bold">
                <div className="flex justify-between">
                  <span className="text-white/70">Base Price</span>
                  <span className="tabular-nums">Rs {(draft.taxInclusive ? base - taxAmount : base).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-amber-300">
                  <span>{draft.taxLabel || 'Tax'} ({draft.taxRate}%)</span>
                  <span className="tabular-nums">+ Rs {taxAmount.toFixed(2)}</span>
                </div>
                <div className="h-px bg-white/20 my-1.5" />
                <div className="flex justify-between text-lg font-extrabold">
                  <span>Customer Pays</span>
                  <span className="tabular-nums text-emerald-300">Rs {finalAmount.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </>
        )}
      </SectionCard>

      <SectionCard title="Pricing Rules" desc="Default markup aur rounding" icon={DollarSign} color="emerald">
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Default Markup" hint="Cost price ke upar default profit %">
            <NumberInput
              value={draft.defaultMarkup}
              onChange={(v) => set('defaultMarkup', v)}
              min={0}
              step={5}
              suffix="%"
            />
          </Field>
          <Field label="Round Prices To" hint="Nearest amount pe automatically round">
            <ChoiceGroup
              value={String(draft.roundPriceTo)}
              onChange={(v) => set('roundPriceTo', Number(v))}
              columns={3}
              options={[
                { value: '1', label: 'Rs 1', emoji: '💵' },
                { value: '5', label: 'Rs 5', emoji: '💴' },
                { value: '10', label: 'Rs 10', emoji: '💶' },
              ]}
            />
          </Field>
        </div>

        {/* Markup example */}
        <div className="mt-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border-2 border-emerald-200 dark:border-emerald-500/30 p-3">
          <div className="text-[10px] uppercase tracking-widest font-extrabold text-emerald-700 dark:text-emerald-300 mb-1 flex items-center gap-1">
            <TrendingUp className="h-3 w-3" /> Markup Example
          </div>
          <div className="text-xs font-semibold text-slate-700 dark:text-slate-200">
            Cost <strong>Rs 100</strong> → Selling price <strong className="text-emerald-700 dark:text-emerald-300">Rs {(100 * (1 + draft.defaultMarkup / 100)).toFixed(0)}</strong> ({draft.defaultMarkup}% profit)
          </div>
        </div>
      </SectionCard>

      <Alert tone="amber" icon={Info}>
        Pakistan me standard GST <strong>17%</strong> hai. FBR PRAL integration ke liye <strong>Integrations</strong> section me FBR POS setup karo.
      </Alert>
    </div>
  );
}
