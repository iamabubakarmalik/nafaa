/**
 * Credit and loyalty rules. Credit can be switched off for the whole shop; new
 * customers start with the default limit, and going past a customer's limit
 * needs the owner's PIN. Loyalty: how points are earned, what they are worth,
 * how many can be used on one bill and when they lapse.
 */

import { Link } from 'react-router-dom';
import { ArrowRight, Award, BookOpen, CreditCard, Hourglass, Sparkles } from 'lucide-react';
import { formatPKR } from '@core/lib/format';
import { Divider, Field, NumberInput, SectionCard, StatPill, Toggle } from '../components/UI';
import { useAutoSave } from '../hooks/useAutoSave';
import type { TenantSettings } from '../api/settings.api';
import { SaveStatusBar } from './_SaveStatus';

export function CustomerSection({ settings }: { settings: TenantSettings }) {
  const { draft, set, saving, dirty } = useAutoSave(settings);
  const perRupee = Number(draft.loyaltyPointsPerRupee) || 0;
  const rate = Number(draft.loyaltyRedemptionRate) || 0;
  const earned = Math.floor(1000 * perRupee);
  const onOff = (on: boolean) => <StatPill label="" value={on ? 'Chalu' : 'Band'} tone={on ? 'emerald' : 'slate'} />;

  return (
    <div className="space-y-4">
      <SaveStatusBar saving={saving} dirty={dirty} />

      <SectionCard title="Udhaar" desc="Customer khata par bechna" icon={BookOpen} color="amber" badge={onOff(draft.allowCredit)}>
        <Toggle checked={draft.allowCredit} onChange={(v) => set('allowCredit', v)} icon={CreditCard}
          label="Udhaar par bechna"
          desc={draft.allowCredit ? 'Counter par poora ya thora udhaar chalta hai' : 'Band — har bill ka poora paisa lena hoga'} />
        {draft.allowCredit && (
          <>
            <Divider />
            <Field label="Naye customer ki credit limit" hint="0 = koi had nahi. Har customer ki apni limit uske profile me badal sakte hain; had se zyada udhaar sirf malik ke PIN se.">
              <NumberInput value={draft.defaultCreditLimit} onChange={(v) => set('defaultCreditLimit', v)} min={0} step={500} prefix="Rs" />
            </Field>
          </>
        )}
      </SectionCard>

      <SectionCard title="Loyalty points" desc="Khareedari par points, agle bill par chhoot" icon={Award} color="rose" badge={onOff(draft.enableLoyalty)}
        action={<Link to="/loyalty" className="inline-flex items-center gap-1 text-[0.8125rem] font-medium text-brand-700 hover:underline">Members <ArrowRight className="h-3.5 w-3.5" /></Link>}>
        <Toggle checked={draft.enableLoyalty} onChange={(v) => set('enableLoyalty', v)} icon={Sparkles}
          label="Loyalty points" desc="Customer wale har bill par points jurte hain" />
        {draft.enableLoyalty && (
          <>
            <Divider label="Kamana aur kharch" />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Har rupay par points" hint="0.01 = har Rs 100 par 1 point">
                <NumberInput value={draft.loyaltyPointsPerRupee} onChange={(v) => set('loyaltyPointsPerRupee', v)} min={0} step={0.01} suffix="pts" />
              </Field>
              <Field label="1 point ki qeemat" hint="Bill par kitne rupay ki chhoot">
                <NumberInput value={draft.loyaltyRedemptionRate} onChange={(v) => set('loyaltyRedemptionRate', v)} min={0} step={0.5} prefix="Rs" />
              </Field>
              <Field label="Kam se kam points" hint="Is se kam ek bill par istemal nahi honge (0 = koi bhi)">
                <NumberInput value={draft.loyaltyMinRedeem ?? 0} onChange={(v) => set('loyaltyMinRedeem', v)} min={0} suffix="pts" />
              </Field>
              <Field label="Bill ka zyada se zyada hissa" hint="Points bill ka kitna hissa ada kar sakte hain">
                <NumberInput value={draft.loyaltyMaxRedeemPercent ?? 100} onChange={(v) => set('loyaltyMaxRedeemPercent', v)} min={1} max={100} suffix="%" />
              </Field>
            </div>
            <Divider label="Muddat" />
            <Field label="Points kab khatam hon" hint="Kamane ke itne din baad purane points khatam (0 = kabhi nahi)">
              <NumberInput value={draft.loyaltyExpiryDays ?? 0} onChange={(v) => set('loyaltyExpiryDays', v)} min={0} max={3650} suffix="din" />
            </Field>
            <div className="mt-4 flex items-start gap-2.5 rounded-xl bg-rose-50 p-3 text-xs leading-relaxed text-rose-900 ring-1 ring-rose-100">
              <Hourglass className="mt-0.5 h-4 w-4 shrink-0 opacity-70" />
              <p>
                {formatPKR(1000)} ki khareedari par <b>{earned} points</b> milenge, jin ki qeemat <b>{formatPKR(earned * rate)}</b> hai
                {(draft.loyaltyExpiryDays ?? 0) > 0 ? `, aur ${draft.loyaltyExpiryDays} din me khatam ho jayenge` : ''}.
              </p>
            </div>
          </>
        )}
      </SectionCard>
    </div>
  );
}
