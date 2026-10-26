/**
 * Tax rates: whether sales carry tax, the rate, its name on the bill, the
 * store's tax number, and whether prices already include tax. A worked
 * example shows what the customer pays. Reporting bills to FBR / PRA / SRB /
 * KPRA lives on its own page; this one links to it.
 */

import { Calculator, Hash, Landmark, Percent, Tag } from 'lucide-react';
import { cn } from '@core/lib/cn';
import { ChoiceGroup, Field, NumberInput, PageLink, SectionCard, Toggle } from '../components/SettingsBlocks';
import { Badge, Card, Input } from '@/design-system/components';
import { useAutoSave } from '../hooks/useAutoSave';
import type { TenantSettings } from '../api/settings.api';
import { SaveStatusBar } from './_SaveStatus';

const QUICK_RATES = [5, 13, 15, 16, 17, 18];

export function TaxSection({ settings }: { settings: TenantSettings }) {
  const { draft, set, saving, dirty } = useAutoSave(settings);
  const rate = Number(draft.taxRate) || 0;
  const symbol = draft.currencySymbol || 'Rs';
  const money = (n: number) => `${symbol} ${n.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const base = 1000;
  const taxAmount = draft.enableTax ? (draft.taxInclusive ? (base * rate) / (100 + rate) : (base * rate) / 100) : 0;
  const net = draft.taxInclusive ? base - taxAmount : base;
  const pays = draft.taxInclusive ? base : base + taxAmount;

  return (
    <div className="space-y-4">
      <SaveStatusBar saving={saving} dirty={dirty} />

      <SectionCard title="Sale par tax" desc="GST ya sales tax har bill par lage ya nahi" icon={Percent} color="amber"
        badge={draft.enableTax ? <Badge size="xs" variant="success"><span className="opacity-70">Tax</span>{`${rate}%`}</Badge> : <Badge size="xs" variant="default"><span className="opacity-70">Tax</span>Band</Badge>}>
        <Toggle checked={draft.enableTax} onChange={(v) => set('enableTax', v)} icon={Percent}
          label="Sale par tax lagayein"
          desc={draft.enableTax ? 'Har bill par tax hisaab ho kar alag dikhta hai' : 'Band — bill par koi tax nahi lagta'} />
      </SectionCard>

      <div className={cn('grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]', !draft.enableTax && 'opacity-60')}>
        <SectionCard title="Tax rate" desc="Kitna tax aur bill par us ka naam" icon={Tag} color="blue">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Tax rate" required hint="Apne tax consultant se rate confirm karein.">
              <NumberInput value={draft.taxRate} onChange={(v) => set('taxRate', v)} min={0} max={100} step={0.5} suffix="%" disabled={!draft.enableTax} />
              <div className="mt-2 flex flex-wrap gap-1.5">
                {QUICK_RATES.map((r) => (
                  <button key={r} type="button" disabled={!draft.enableTax} onClick={() => set('taxRate', r)}
                    className={cn('rounded-full px-2.5 py-1 text-xs font-semibold ring-1 transition disabled:opacity-50',
                      rate === r ? 'bg-brand-600 text-brand-fg ring-brand-600' : 'bg-white text-slate-600 ring-slate-200 hover:ring-slate-300')}>
                    {r}%
                  </button>
                ))}
              </div>
            </Field>
            <Input label="Bill par tax ka naam" hint="Misaal: GST, VAT, Sales Tax"
              value={draft.taxLabel ?? ''} onChange={(e) => set('taxLabel', e.target.value)} placeholder="GST" maxLength={20} disabled={!draft.enableTax} />
            <Input label="Tax number (NTN)" hint="FBR ka National Tax Number — bill par chhapne ke liye Receipt me 'Tax number' chalu karein."
              value={draft.taxNumber ?? ''} onChange={(e) => set('taxNumber', e.target.value)} placeholder="1234567-8" maxLength={50} leftIcon={<Hash className="h-4 w-4" />} />
            <Field label="Tax ka hisaab" hint="Price me tax pehle se shamil hai ya upar se lagta hai">
              <ChoiceGroup value={String(draft.taxInclusive)} onChange={(v) => set('taxInclusive', v === 'true')}
                options={[
                  { value: 'false', label: 'Exclusive', desc: 'Price + tax' },
                  { value: 'true', label: 'Inclusive', desc: 'Price me tax shamil' },
                ]} />
            </Field>
          </div>
        </SectionCard>

        <Card data-setting-card="Misaal" className="self-start">
          <p className="flex items-center gap-1.5 text-[0.8125rem] font-semibold text-slate-700"><Calculator className="h-4 w-4" /> Misaal: {money(base)} ki Sale</p>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-slate-500">Asal price</dt><dd className="font-medium tabular-nums text-slate-900">{money(net)}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">{draft.taxLabel || 'Tax'} ({draft.enableTax ? rate : 0}%)</dt><dd className="font-medium tabular-nums text-amber-700">+ {money(taxAmount)}</dd></div>
            <div className="flex justify-between border-t border-slate-200 pt-2 text-base"><dt className="font-semibold text-slate-900">Customer deta hai</dt><dd className="font-bold tabular-nums text-success-700">{money(pays)}</dd></div>
          </dl>
          <p className="mt-3 text-xs text-slate-500">
            {draft.taxInclusive ? 'Inclusive: shelf ki price wahi rehti hai, tax us ke andar se nikalta hai.' : 'Exclusive: tax price ke upar alag se judta hai.'}
          </p>
        </Card>
      </div>

      <SectionCard title="FBR / PRA / SRB / KPRA" desc="Har bill authority ko bhejna aur fiscal number bill par — alag page par" icon={Landmark} color="slate">
        <PageLink to="/tax/settings" icon={Landmark} title="Tax authority se jorein" desc="POS ID, token, fiscal invoice aur mahine ki report" />
      </SectionCard>
    </div>
  );
}
