import { Users, CreditCard, Award, UserPlus, TrendingUp } from 'lucide-react';
import { Field, NumberInput, Toggle, SectionCard, Alert, Divider, StatPill } from '../components/UI';
import { useAutoSave } from '../hooks/useAutoSave';
import type { TenantSettings } from '../api/settings.api';
import { SaveStatusBar } from './_SaveStatus';

export function CustomerSection({ settings }: { settings: TenantSettings }) {
  const { draft, set, saving, dirty } = useAutoSave(settings);

  return (
    <div className="space-y-4">
      <SaveStatusBar saving={saving} dirty={dirty} />

      {/* Credit / Udhaar */}
      <SectionCard
        title="Udhaar / Credit"
        desc="Customer khata management"
        icon={CreditCard}
        color="amber"
        badge={
          draft.allowCredit
            ? <StatPill label="Status" value="ON" tone="emerald" />
            : <StatPill label="Status" value="OFF" tone="slate" />
        }
      >
        <Toggle
          checked={draft.allowCredit}
          onChange={(v: boolean) => set('allowCredit', v)}
          label="Allow Credit Sales"
          desc="Customers ko udhaar pe cheezein bech sakte hain"
          icon={CreditCard}
        />

        {draft.allowCredit && (
          <>
            <Divider label="Credit Rules" />
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Default Credit Limit" hint="0 = koi limit nahi">
                <NumberInput
                  value={draft.defaultCreditLimit}
                  onChange={(v: number) => set('defaultCreditLimit', v)}
                  min={0}
                  step={1000}
                  prefix="Rs"
                />
              </Field>
              <Field label="Overdue Days" hint="Kitne din baad 'overdue' mark ho">
                <NumberInput
                  value={draft.creditOverdueDays}
                  onChange={(v: number) => set('creditOverdueDays', v)}
                  min={1}
                  max={365}
                  suffix="days"
                />
              </Field>
            </div>
            <Alert tone="amber" icon={CreditCard}>
              Individual customer ke limits isse override kar sakte hain. Overdue customers ko WhatsApp reminder khud jayega (Notifications me enable karo).
            </Alert>
          </>
        )}
      </SectionCard>

      {/* Loyalty */}
      <SectionCard
        title="Loyalty Program"
        desc="Points-based rewards — jaise Panda Rewards ya Cheetah Points"
        icon={Award}
        color="rose"
        badge={
          draft.enableLoyalty
            ? <StatPill label="Status" value="ON" tone="emerald" />
            : <StatPill label="Status" value="OFF" tone="slate" />
        }
      >
        <Toggle
          checked={draft.enableLoyalty}
          onChange={(v: boolean) => set('enableLoyalty', v)}
          label="Enable Loyalty Points"
          desc="Har sale par customers ko points milte hain, next purchase pe use kar sakte hain"
          icon={Award}
        />

        {draft.enableLoyalty && (
          <>
            <Divider label="Points Config" />
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Points per Rupee" hint="Example: 0.01 = Rs 100 pe 1 point">
                <NumberInput
                  value={draft.loyaltyPointsPerRupee}
                  onChange={(v: number) => set('loyaltyPointsPerRupee', v)}
                  min={0}
                  step={0.01}
                  suffix="pts"
                />
              </Field>
              <Field label="Redemption Rate" hint="1 point = kitne Rs discount">
                <NumberInput
                  value={draft.loyaltyRedemptionRate}
                  onChange={(v: number) => set('loyaltyRedemptionRate', v)}
                  min={0}
                  step={0.1}
                  prefix="Rs"
                />
              </Field>
            </div>

            {/* Live example */}
            <div className="mt-3 rounded-xl bg-gradient-to-br from-rose-50 to-pink-50 dark:from-rose-500/10 dark:to-pink-500/10 border-2 border-rose-200 dark:border-rose-500/30 p-3">
              <div className="text-[10px] uppercase tracking-widest font-extrabold text-rose-700 dark:text-rose-300 mb-1 flex items-center gap-1">
                <TrendingUp className="h-3 w-3" /> Live Example
              </div>
              <div className="text-xs font-semibold text-slate-700 dark:text-slate-200 leading-relaxed">
                Customer <strong className="text-slate-900 dark:text-white">Rs 1,000</strong> ki shopping karega →{' '}
                <strong className="text-rose-700 dark:text-rose-300">
                  {(1000 * (Number(draft.loyaltyPointsPerRupee) || 0)).toFixed(1)} points
                </strong>{' '}
                milenge → in ki value{' '}
                <strong className="text-emerald-700 dark:text-emerald-300">
                  Rs {(1000 * (Number(draft.loyaltyPointsPerRupee) || 0) * (Number(draft.loyaltyRedemptionRate) || 0)).toFixed(2)}
                </strong>
              </div>
            </div>
          </>
        )}
      </SectionCard>

      {/* Auto-create */}
      <SectionCard
        title="Auto-Create"
        desc="Customer records banane ke rules"
        icon={UserPlus}
        color="violet"
      >
        <Toggle
          checked={draft.autoCreateCustomer}
          onChange={(v: boolean) => set('autoCreateCustomer', v)}
          label="Auto-Create Customers"
          desc="Naya phone number POS me daaltay hi customer record khud ban jayega"
          icon={UserPlus}
        />
        <Divider />
        <Toggle
          checked={draft.requireCustomerForSale}
          onChange={(v: boolean) => set('requireCustomerForSale', v)}
          label="Require Customer for Every Sale"
          desc="Walk-in customer allowed nahi — har sale pe customer select karna hoga"
          icon={Users}
        />
      </SectionCard>
    </div>
  );
}
