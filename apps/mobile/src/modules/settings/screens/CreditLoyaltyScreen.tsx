/** Settings → Credit & loyalty: khata limit rules and loyalty points (web CustomerSection). */

import { router } from 'expo-router';
import { Award, BookOpen, Users } from 'lucide-react-native';
import { t } from '@/core/i18n';
import { formatPKR } from '@/core/format';
import { ListRow, SettingSwitch, SettingsGroup, SettingsTemplate } from '@/design';
import { useAutoSave, useSettings, useSettingsOnline } from '../hooks/useSettings';
import { NumberField, Note, OfflineNote, SaveStatus, Section, ownerOnly } from '../components/SettingsParts';

function CreditLoyalty() {
  const q = useSettings();
  const online = useSettingsOnline();
  const { draft: d, set, saving, dirty, failed } = useAutoSave(q.data?.settings);
  const perRupee = Number(d?.loyaltyPointsPerRupee) || 0;
  const rate = Number(d?.loyaltyRedemptionRate) || 0;
  const earned = Math.floor(1000 * perRupee);
  const limit = Number(d?.defaultCreditLimit) || 0;

  return (
    <SettingsTemplate title={t('Credit & loyalty')} description={t('Udhaar ki limit aur loyalty points')} loading={!d && q.isLoading} error={!d && q.error} onRetry={q.refetch}
      actions={<SaveStatus saving={saving} dirty={dirty} failed={failed} />}>
      {!online && <OfflineNote />}
      {d && (
        <>
          <SettingsGroup title={t('Udhaar')} footnote={d.allowCredit ? t('Counter par poora ya thora udhaar chalta hai') : t('Band — har bill ka poora paisa lena hoga')}>
            <SettingSwitch label={t('Udhaar par bechna')} description={t('Customer khata par bechna')} value={!!d.allowCredit} onChange={(v) => set('allowCredit', v, { now: true })} disabled={!online} />
          </SettingsGroup>
          {d.allowCredit && (
            <Section title={t('Naye customer ki credit limit')}>
              <NumberField label={t('Naye customer ki credit limit')} hint={t('0 = koi had nahi. Har customer ki apni limit us ke profile me badal sakte hain.')}
                value={d.defaultCreditLimit} onChange={(v) => set('defaultCreditLimit', v)} min={0} prefix="Rs" disabled={!online} />
              <Note tone={limit > 0 ? 'info' : 'warning'}>
                {limit > 0 ? t('Naya customer {{limit}} tak udhaar le sakta hai. Is se zyada sirf malik ke PIN se.', { limit: formatPKR(limit) }) : t('Naye customer par udhaar ki koi had nahi. Had rakhna behtar hai — paisa phansta nahi.')}
              </Note>
            </Section>
          )}
          <SettingsGroup title={t('Loyalty points')} footnote={t('Khareedari par points, agle bill par Discount')}>
            <SettingSwitch label={t('Loyalty points')} description={t('Customer wale har bill par points jurte hain')} value={!!d.enableLoyalty} onChange={(v) => set('enableLoyalty', v, { now: true })} disabled={!online} />
          </SettingsGroup>
          {d.enableLoyalty && (
            <>
              <Section title={t('Kamana aur kharch')}>
                <NumberField label={t('Har rupay par points')} hint={t('0.01 = har Rs 100 par 1 point')} value={d.loyaltyPointsPerRupee} onChange={(v) => set('loyaltyPointsPerRupee', v)} min={0} decimals suffix="pts" disabled={!online} />
                <NumberField label={t('1 point ki qeemat')} hint={t('Bill par kitne rupay ka Discount')} value={d.loyaltyRedemptionRate} onChange={(v) => set('loyaltyRedemptionRate', v)} min={0} decimals prefix="Rs" disabled={!online} />
                <NumberField label={t('Kam se kam points')} hint={t('Is se kam ek bill par istemal nahi honge (0 = koi bhi)')} value={d.loyaltyMinRedeem ?? 0} onChange={(v) => set('loyaltyMinRedeem', v)} min={0} suffix="pts" disabled={!online} />
                <NumberField label={t('Bill ka zyada se zyada hissa')} hint={t('Points bill ka kitna hissa ada kar sakte hain')} value={d.loyaltyMaxRedeemPercent ?? 100} onChange={(v) => set('loyaltyMaxRedeemPercent', v)} min={1} max={100} suffix="%" disabled={!online} />
              </Section>
              <Section title={t('Period')}>
                <NumberField label={t('Points kab khatam hon')} hint={t('Kamane ke itne din baad purane points khatam (0 = kabhi nahi)')} value={d.loyaltyExpiryDays ?? 0} onChange={(v) => set('loyaltyExpiryDays', v)} min={0} max={3650} suffix={t('din')} disabled={!online} />
              </Section>
              <Note>{t('{{value}} ki khareedari par {{earned}} points milenge, jin ki qeemat {{worth}} hai.', { value: formatPKR(1000), earned, worth: formatPKR(earned * rate) })}</Note>
            </>
          )}
          <SettingsGroup title={t('Customers ke pages')}>
            <ListRow icon={BookOpen} title={t('Khata (credit)')} subtitle={t('Kis ka kitna baqi hai')} chevron onPress={() => router.push('/khata' as never)} />
            <ListRow icon={Award} title={t('Loyalty members')} subtitle={t('Points aur inaam')} chevron onPress={() => router.push('/loyalty' as never)} />
            <ListRow icon={Users} title={t('Customers')} subtitle={t('Sab customers ki list')} chevron onPress={() => router.push('/customers' as never)} />
          </SettingsGroup>
        </>
      )}
    </SettingsTemplate>
  );
}

export const CreditLoyaltyScreen = ownerOnly(CreditLoyalty, 'Credit & loyalty');
