import { Users, CreditCard, Award } from 'lucide-react';
import { Field, NumberInput, Toggle, SectionCard } from '../components/UI';

export default function CustomerSection({ s, set }: any) {
  return (
    <div className="space-y-5">
      <SectionCard title="Udhaar / Credit" desc="Customer credit management" icon={CreditCard} color="rose">
        <Toggle checked={s.allowCredit} onChange={(v) => set('allowCredit', v)} label="Allow credit sales" desc="Customers ko udhaar de sakte hain" />
        {s.allowCredit && (
          <div className="grid sm:grid-cols-2 gap-4 mt-4">
            <Field label="Default Credit Limit (Rs)" hint="0 = no limit"><NumberInput value={s.defaultCreditLimit} onChange={(v: number) => set('defaultCreditLimit', v)} min={0} step={1000} /></Field>
            <Field label="Overdue Days" hint="Kitne din baad overdue"><NumberInput value={s.creditOverdueDays} onChange={(v: number) => set('creditOverdueDays', v)} min={1} /></Field>
          </div>
        )}
      </SectionCard>

      <SectionCard title="Loyalty Program" desc="Points-based rewards" icon={Award} color="rose">
        <Toggle checked={s.enableLoyalty} onChange={(v) => set('enableLoyalty', v)} label="Enable loyalty points" desc="Customers ko har sale par points dein" />
        {s.enableLoyalty && (
          <div className="grid sm:grid-cols-2 gap-4 mt-4">
            <Field label="Points Per Rupee" hint="e.g. 0.01 = 1 point per Rs 100"><NumberInput value={s.loyaltyPointsPerRupee} onChange={(v: number) => set('loyaltyPointsPerRupee', v)} min={0} step={0.01} /></Field>
            <Field label="Redemption Rate" hint="1 point = kitne Rs"><NumberInput value={s.loyaltyRedemptionRate} onChange={(v: number) => set('loyaltyRedemptionRate', v)} min={0} step={0.1} /></Field>
          </div>
        )}
      </SectionCard>

      <SectionCard title="Auto-Create" desc="Customer creation rules" icon={Users} color="rose">
        <Toggle checked={s.autoCreateCustomer} onChange={(v) => set('autoCreateCustomer', v)} label="Auto-create customers" desc="Phone number se naya customer automatically banaayen" />
      </SectionCard>
    </div>
  );
}
