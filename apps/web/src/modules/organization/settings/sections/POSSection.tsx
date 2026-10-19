/**
 * Counter rules: the payment method checkout opens with, a customer on every
 * bill, hand discounts and their ceiling, which actions need the owner's PIN,
 * and the industry rules a counter needs (dine-in service charge for a
 * restaurant, exchange days for garments). The POS follows these and the
 * server checks them again on every bill.
 */

import { ArrowLeftRight, Ban, CreditCard, KeyRound, Monitor, Percent, Printer, Receipt, RotateCcw, ShieldCheck, Tag, Users, UtensilsCrossed } from 'lucide-react';
import { formatPKR } from '@core/lib/format';
import { useCurrentIndustry } from '@industries/_shared/registry/useCurrentIndustry';
import { Alert, ChoiceGroup, Divider, Field, NumberInput, PageLink, SectionCard, StatPill, Toggle } from '../components/UI';
import { SettingLink } from '../components/SettingsFrame';
import { useAutoSave } from '../hooks/useAutoSave';
import type { TenantSettings } from '../api/settings.api';
import { SaveStatusBar } from './_SaveStatus';

const QUICK_LIMITS = [5, 10, 15, 20, 25];

export function POSSection({ settings }: { settings: TenantSettings }) {
  const { draft, set, saving, dirty } = useAutoSave(settings);
  const hasPin = !!settings.hasManagerPin;
  const max = Number(draft.maxDiscountPercent) || 0;
  const industry = useCurrentIndustry()?.id;
  const service = Number(draft.serviceChargePct) || 0;
  const exchange = Number(draft.exchangeDays) || 0;

  return (
    <div className="space-y-4">
      <SaveStatusBar saving={saving} dirty={dirty} />

      <div className="grid gap-4 xl:grid-cols-2">
        <SectionCard title="Payment" desc="Checkout khulte hi yeh tareeqa chuna hota hai" icon={CreditCard} color="emerald">
          <Field label="Pehle se chuna payment" hint="Cashier har bill par badal sakta hai; yeh sirf shuru ka chunao hai.">
            <ChoiceGroup value={draft.defaultPaymentMethod} onChange={(v) => set('defaultPaymentMethod', v)} columns={3}
              options={[
                { value: 'CASH', label: 'Cash' },
                { value: 'CARD', label: 'Card' },
                { value: 'JAZZCASH', label: 'JazzCash' },
                { value: 'EASYPAISA', label: 'EasyPaisa' },
                { value: 'BANK_TRANSFER', label: 'Bank' },
                { value: 'RAAST', label: 'Raast' },
              ]} />
          </Field>
        </SectionCard>

        <SectionCard title="Bill" desc="Har bill par lagne wale usool" icon={Users} color="blue">
          <Toggle checked={draft.requireCustomerForSale} onChange={(v) => set('requireCustomerForSale', v)} icon={Users}
            label="Har bill par customer zaroori"
            desc="Bagair customer chune bill nahi banega. Walk-in ke liye ek 'Walk-in' customer bana lein." />
        </SectionCard>
      </div>

      <SectionCard title="Discount" desc="Cashier haath se kitna Discount de sakta hai (codes aur points ke apne usool hain)" icon={Percent} color="amber"
        badge={<StatPill label="Had" value={draft.allowDiscount ? `${max}%` : 'Band'} tone={draft.allowDiscount ? 'amber' : 'slate'} />}>
        <Toggle checked={draft.allowDiscount} onChange={(v) => set('allowDiscount', v)} icon={Tag}
          label="Haath se Discount"
          desc={draft.allowDiscount ? 'Cashier bill par Discount de sakta hai' : 'Band — counter par Discount ka button kaam nahi karega'} />
        {draft.allowDiscount && (
          <>
            <Divider />
            <div className="grid gap-4 sm:grid-cols-[minmax(0,16rem)_minmax(0,1fr)] sm:items-start">
              <Field label="Zyada se zyada Discount" hint={hasPin ? 'Is se zyada sirf malik ke PIN se' : 'Is se zyada bilkul nahi (malik ka PIN lagayein to PIN se ho sakega)'}>
                <NumberInput value={draft.maxDiscountPercent} onChange={(v) => set('maxDiscountPercent', v)} min={0} max={100} suffix="%" />
              </Field>
              <div>
                <p className="mb-1.5 text-[0.8125rem] font-semibold text-slate-800">Jaldi chunein</p>
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_LIMITS.map((p) => (
                    <button key={p} type="button" onClick={() => set('maxDiscountPercent', p)}
                      className={max === p ? 'rounded-full bg-brand-600 px-3 py-1.5 text-xs font-semibold text-brand-fg' : 'rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 ring-1 ring-slate-200 hover:ring-slate-300'}>
                      {p}%
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-xs text-slate-500">Misaal: {formatPKR(1000)} ke bill par {formatPKR((1000 * max) / 100)} tak Discount.</p>
              </div>
            </div>
          </>
        )}
      </SectionCard>

      {(industry === 'restaurant' || industry === 'garments') && (
        <div className="grid gap-4 xl:grid-cols-2">
          {industry === 'restaurant' && (
            <SectionCard title="Service charge" desc="Table par khane (dine-in) ke bill par lagta hai" icon={UtensilsCrossed} color="emerald"
              badge={<StatPill label="Ab" value={service ? `${service}%` : 'Nahi'} tone={service ? 'emerald' : 'slate'} />}>
              <Field label="Dine-in service charge" hint="Har naya dine-in order isi % se shuru hota hai; waiter ek order par badal sakta hai. 0 = koi service charge nahi.">
                <NumberInput value={draft.serviceChargePct} onChange={(v) => set('serviceChargePct', v)} min={0} max={100} step={0.5} suffix="%" />
              </Field>
              {service > 0 && <p className="mt-2 text-xs text-slate-500">Misaal: {formatPKR(1000)} ke khane par {formatPKR((1000 * service) / 100)} service charge.</p>}
            </SectionCard>
          )}
          {industry === 'garments' && (
            <SectionCard title="Exchange" desc="Bika hua maal kitne din tak badla ja sakta hai" icon={ArrowLeftRight} color="blue"
              badge={<StatPill label="Had" value={exchange ? `${exchange} din` : 'Nahi'} tone={exchange ? 'blue' : 'slate'} />}>
              <Field label="Exchange ke din" hint="Bill ke itne din baad tak maal badla ja sakta hai. 0 = koi had nahi.">
                <NumberInput value={draft.exchangeDays} onChange={(v) => set('exchangeDays', Math.round(v))} min={0} max={365} suffix="din" />
              </Field>
            </SectionCard>
          )}
        </div>
      )}

      <SectionCard title="Malik ka PIN kab maangein" desc="In kaamon se pehle counter par malik ka PIN maanga jayega" icon={ShieldCheck} color="violet"
        badge={<StatPill label="PIN" value={hasPin ? 'Laga hua' : 'Nahi laga'} tone={hasPin ? 'emerald' : 'rose'} />}>
        {!hasPin && (
          <Alert tone="amber" icon={KeyRound} title="Abhi PIN nahi laga">
            PIN ke bagair yeh usool kaam nahi karte (sirf Discount ki had band rehti hai).{' '}
            <SettingLink to="/settings/security" find="Malik ka PIN" className="font-semibold underline underline-offset-2">PIN lagayein</SettingLink>
          </Alert>
        )}
        <div className="mt-1">
          <Toggle checked={draft.requirePinForVoid} onChange={(v) => set('requirePinForVoid', v)} icon={Ban}
            label="Bill cancel par PIN" desc="Bana hua bill cancel karne se pehle" />
          <Toggle checked={draft.requirePinForRefund} onChange={(v) => set('requirePinForRefund', v)} icon={RotateCcw}
            label="Return par PIN" desc="Maal wapas le kar paise lautane se pehle" />
          <Toggle checked={draft.requirePinForDiscount} onChange={(v) => set('requirePinForDiscount', v)} icon={Percent}
            label="Har Discount par PIN" desc="Had ke andar bhi, har haath ke Discount par" />
        </div>
        <p className="mt-2 text-xs text-slate-500">Customer ki credit limit se zyada udhaar par bhi PIN maanga jata hai.</p>
      </SectionCard>

      <SectionCard title="Counter se jure pages" desc="Bill, printer aur har counter ki apni settings" icon={Monitor} color="slate">
        <div className="grid gap-2 sm:grid-cols-3">
          <PageLink to="/settings/receipt" icon={Receipt} title="Receipt" desc="Bill ka design aur kaghaz" />
          <PageLink to="/settings/printing" icon={Printer} title="Printing" desc="A4, thermal, colour" />
          <PageLink to="/settings/hardware" icon={Monitor} title="POS hardware" desc="Printer, drawer, tarazu" />
        </div>
        <p className="mt-3 text-xs text-slate-500">Tasveerein, auto-print aur shortcuts har counter ke liye alag hain — POS khol kar ⚙️ se badlein.</p>
      </SectionCard>
    </div>
  );
}
