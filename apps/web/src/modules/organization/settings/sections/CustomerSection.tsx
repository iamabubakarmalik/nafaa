/**
 * Credit and loyalty rules. Credit can be switched off for the whole store;
 * new customers start with the default limit, and going past a customer's
 * limit needs the owner's PIN. Loyalty: how points are earned, what they are
 * worth, how many can be used on one bill and when they lapse.
 */

import { Award, BookOpen, CreditCard, Hourglass, Sparkles, Users } from 'lucide-react';
import { formatPKR } from '@core/lib/format';
import { Divider, Field, NumberInput, PageLink, SectionCard, Toggle } from '../components/SettingsBlocks';
import { Alert, Badge } from '@/design-system/components';
import { useAutoSave } from '../hooks/useAutoSave';
import type { TenantSettings } from '../api/settings.api';
import { SaveStatusBar } from './_SaveStatus';
import { t } from '@core/i18n';

export function CustomerSection({ settings }: { settings: TenantSettings }) {
  const { draft, set, saving, dirty } = useAutoSave(settings);
  const perRupee = Number(draft.loyaltyPointsPerRupee) || 0;
  const rate = Number(draft.loyaltyRedemptionRate) || 0;
  const earned = Math.floor(1000 * perRupee);
  const onOff = (on: boolean) => <Badge size="xs" variant={on ? 'success' : 'default'}>{on ? t('Chalu') : t('Band')}</Badge>;
  const limit = Number(draft.defaultCreditLimit) || 0;

  return (
    <div className="space-y-4">
      <SaveStatusBar saving={saving} dirty={dirty} />

      <SectionCard title={t('Udhaar')} desc={t('Customer khata par bechna')} icon={BookOpen} color="amber" badge={onOff(draft.allowCredit)}>
        <Toggle checked={draft.allowCredit} onChange={(v) => set('allowCredit', v)} icon={CreditCard}
          label={t('Udhaar par bechna')}
          desc={draft.allowCredit ? t('Counter par poora ya thora udhaar chalta hai') : t('Band — har bill ka poora paisa lena hoga')} />
        {draft.allowCredit && (
          <>
            <Divider />
            <div className="grid gap-4 sm:grid-cols-[minmax(0,18rem)_minmax(0,1fr)] sm:items-start">
              <Field label={t('Naye customer ki credit limit')} hint={t('0 = koi had nahi. Har customer ki apni limit us ke profile me badal sakte hain.')}>
                <NumberInput value={draft.defaultCreditLimit} onChange={(v) => set('defaultCreditLimit', v)} min={0} step={500} prefix="Rs" />
              </Field>
              <Alert tone={limit > 0 ? 'info' : 'warning'}>
                {limit > 0
                  ? <>{t('Naya customer {{limit}} tak udhaar le sakta hai. Is se zyada sirf malik ke PIN se.', { limit: formatPKR(limit) })}</>
                  : <>{t('Naye customer par udhaar ki koi had nahi. Had rakhna behtar hai — paisa phansta nahi.')}</>}
              </Alert>
            </div>
          </>
        )}
      </SectionCard>

      <SectionCard title={t('Loyalty points')} desc={t('Khareedari par points, agle bill par Discount')} icon={Award} color="rose" badge={onOff(draft.enableLoyalty)}>
        <Toggle checked={draft.enableLoyalty} onChange={(v) => set('enableLoyalty', v)} icon={Sparkles}
          label={t('Loyalty points')} desc={t('Customer wale har bill par points jurte hain')} />
        {draft.enableLoyalty && (
          <>
            <Divider label={t('Kamana aur kharch')} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t('Har rupay par points')} hint={t('0.01 = har Rs 100 par 1 point')}>
                <NumberInput value={draft.loyaltyPointsPerRupee} onChange={(v) => set('loyaltyPointsPerRupee', v)} min={0} step={0.01} suffix="pts" />
              </Field>
              <Field label={t('1 point ki qeemat')} hint={t('Bill par kitne rupay ka Discount')}>
                <NumberInput value={draft.loyaltyRedemptionRate} onChange={(v) => set('loyaltyRedemptionRate', v)} min={0} step={0.5} prefix="Rs" />
              </Field>
              <Field label={t('Kam se kam points')} hint={t('Is se kam ek bill par istemal nahi honge (0 = koi bhi)')}>
                <NumberInput value={draft.loyaltyMinRedeem ?? 0} onChange={(v) => set('loyaltyMinRedeem', v)} min={0} suffix="pts" />
              </Field>
              <Field label={t('Bill ka zyada se zyada hissa')} hint={t('Points bill ka kitna hissa ada kar sakte hain')}>
                <NumberInput value={draft.loyaltyMaxRedeemPercent ?? 100} onChange={(v) => set('loyaltyMaxRedeemPercent', v)} min={1} max={100} suffix="%" />
              </Field>
            </div>
            <Divider label={t('Period')} />
            <div className="max-w-xs">
              <Field label={t('Points kab khatam hon')} hint={t('Kamane ke itne din baad purane points khatam (0 = kabhi nahi)')}>
                <NumberInput value={draft.loyaltyExpiryDays ?? 0} onChange={(v) => set('loyaltyExpiryDays', v)} min={0} max={3650} suffix="din" />
              </Field>
            </div>
            <Alert className="mt-4" tone="info" title={t('Misaal')} icon={<Hourglass className="h-4 w-4 text-blue-600" />}>
              {t('{{value}} ki khareedari par', { value: formatPKR(1000) })}{' '} <b>{t('{{earned}} points', { earned })}</b> {' '}{t('milenge, jin ki qeemat')}{' '} <b>{formatPKR(earned * rate)}</b> {' '}{t('hai{{value}}.', { value: (draft.loyaltyExpiryDays ?? 0) > 0 ? t(', aur {{loyaltyExpiryDays}} din me khatam ho jayenge', { loyaltyExpiryDays: draft.loyaltyExpiryDays }) : '' })}
            </Alert>
          </>
        )}
      </SectionCard>

      <SectionCard title={t('Customers ke pages')} desc={t('Khata aur loyalty members yahan dekhein')} icon={Users} color="slate">
        <div className="grid gap-2 sm:grid-cols-3">
          <PageLink to="/khata" icon={BookOpen} title={t('Khata (credit)')} desc={t('Kis ka kitna baqi hai')} />
          <PageLink to="/loyalty" icon={Award} title={t('Loyalty members')} desc={t('Points aur inaam')} />
          <PageLink to="/customers" icon={Users} title={t('Customers')} desc={t('Sab customers ki list')} />
        </div>
      </SectionCard>
    </div>
  );
}
