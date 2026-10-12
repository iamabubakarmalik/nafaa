/**
 * Counter rules: the payment method checkout opens with, a customer on every
 * bill, hand discounts and their ceiling, and which actions need the owner's
 * PIN. The POS follows these and the server checks them again on every bill.
 */

import { Ban, CreditCard, KeyRound, Monitor, Percent, RotateCcw, ShieldCheck, Tag, Users } from 'lucide-react';
import { formatPKR } from '@core/lib/format';
import { Alert, ChoiceGroup, Divider, Field, NumberInput, SectionCard, StatPill, Toggle } from '../components/UI';
import { useAutoSave } from '../hooks/useAutoSave';
import type { TenantSettings } from '../api/settings.api';
import { SaveStatusBar } from './_SaveStatus';

export function POSSection({ settings, onOpenSecurity }: { settings: TenantSettings; onOpenSecurity: () => void }) {
  const { draft, set, saving, dirty } = useAutoSave(settings);
  const hasPin = !!settings.hasManagerPin;
  const max = Number(draft.maxDiscountPercent) || 0;

  return (
    <div className="space-y-4">
      <SaveStatusBar saving={saving} dirty={dirty} />

      <SectionCard title="Payment" desc="Checkout khulte hi yeh tareeqa chuna hota hai" icon={CreditCard} color="emerald">
        <Field label="Pehle se chuna payment">
          <ChoiceGroup value={draft.defaultPaymentMethod} onChange={(v) => set('defaultPaymentMethod', v)} columns={3}
            options={[
              { value: 'CASH', label: 'Cash', emoji: '💵' },
              { value: 'CARD', label: 'Card', emoji: '💳' },
              { value: 'JAZZCASH', label: 'JazzCash', emoji: '📱' },
              { value: 'EASYPAISA', label: 'EasyPaisa', emoji: '💚' },
              { value: 'BANK_TRANSFER', label: 'Bank', emoji: '🏦' },
              { value: 'RAAST', label: 'Raast', emoji: '⚡' },
            ]} />
        </Field>
      </SectionCard>

      <SectionCard title="Bill" desc="Har bill par lagne wale usool" icon={Users} color="blue">
        <Toggle checked={draft.requireCustomerForSale} onChange={(v) => set('requireCustomerForSale', v)} icon={Users}
          label="Har bill par customer zaroori"
          desc="Bagair customer chune bill nahi banega. Walk-in ke liye ek 'Walk-in' customer bana lein." />
      </SectionCard>

      <SectionCard title="Chhoot" desc="Cashier haath se kitni chhoot de sakta hai (codes aur points ke apne usool hain)" icon={Percent} color="amber"
        badge={<StatPill label="Had" value={draft.allowDiscount ? `${max}%` : 'Band'} tone={draft.allowDiscount ? 'amber' : 'slate'} />}>
        <Toggle checked={draft.allowDiscount} onChange={(v) => set('allowDiscount', v)} icon={Tag}
          label="Haath se chhoot"
          desc={draft.allowDiscount ? 'Cashier bill par chhoot de sakta hai' : 'Band — counter par chhoot ka button kaam nahi karega'} />
        {draft.allowDiscount && (
          <>
            <Divider />
            <Field label="Zyada se zyada chhoot" hint={hasPin ? 'Is se zyada sirf malik ke PIN se' : 'Is se zyada bilkul nahi (malik ka PIN lagayein to PIN se ho sakegi)'}>
              <NumberInput value={draft.maxDiscountPercent} onChange={(v) => set('maxDiscountPercent', v)} min={0} max={100} suffix="%" />
            </Field>
            <p className="mt-2 text-xs text-slate-500">
              Misaal: {formatPKR(1000)} ke bill par {formatPKR((1000 * max) / 100)} tak chhoot.
            </p>
          </>
        )}
      </SectionCard>

      <SectionCard title="Malik ka PIN kab maangein" desc="In kaamon se pehle counter par malik ka PIN maanga jayega" icon={ShieldCheck} color="violet"
        badge={<StatPill label="PIN" value={hasPin ? 'Laga hua' : 'Nahi laga'} tone={hasPin ? 'emerald' : 'rose'} />}>
        {!hasPin && (
          <Alert tone="amber" icon={KeyRound} title="Abhi PIN nahi laga">
            PIN ke bagair yeh usool kaam nahi karte (sirf chhoot ki had band rehti hai).{' '}
            <button type="button" onClick={onOpenSecurity} className="font-semibold underline underline-offset-2">PIN lagayein</button>
          </Alert>
        )}
        <div className="mt-1">
          <Toggle checked={draft.requirePinForVoid} onChange={(v) => set('requirePinForVoid', v)} icon={Ban}
            label="Bill cancel par PIN" desc="Bana hua bill cancel karne se pehle" />
          <Toggle checked={draft.requirePinForRefund} onChange={(v) => set('requirePinForRefund', v)} icon={RotateCcw}
            label="Wapsi par PIN" desc="Maal wapas le kar paise lautane se pehle" />
          <Toggle checked={draft.requirePinForDiscount} onChange={(v) => set('requirePinForDiscount', v)} icon={Percent}
            label="Har chhoot par PIN" desc="Had ke andar bhi, har haath ki chhoot par" />
        </div>
        <p className="mt-2 text-xs text-slate-500">Customer ki credit limit se zyada udhaar par bhi PIN maanga jata hai.</p>
      </SectionCard>

      <Alert tone="blue" icon={Monitor} title="Counter ki shakal">
        Tasveerein, auto-print, printer ki chaudai aur shortcuts har counter ke liye alag hain — POS khol kar ⚙️ se badlein.
      </Alert>
    </div>
  );
}
