/**
 * Settings → Tax rates: whether sales carry tax, the rate, the name and NTN,
 * inclusive or exclusive, with a worked example (web TaxSection). The tax
 * authority connection (FBR / PRA / SRB / KPRA) is shown read only; it is set
 * up on the web.
 */

import { useQuery } from '@tanstack/react-query';
import { Landmark } from 'lucide-react-native';
import { View } from 'react-native';
import { t } from '@/core/i18n';
import { formatDateTime } from '@/core/format';
import { Chip, Icon, Input, ListRow, SettingSwitch, SettingsGroup, SettingsTemplate, StatusPill, Text, useTheme } from '@/design';
import { taxStatusApi } from '../api/tax';
import { useAutoSave, useSettings, useSettingsOnline } from '../hooks/useSettings';
import { ChoiceCards, NumberField, Note, OfflineNote, SaveStatus, Section, ownerOnly } from '../components/SettingsParts';

const QUICK_RATES = [5, 13, 15, 16, 17, 18];

function Tax() {
  const th = useTheme();
  const q = useSettings();
  const online = useSettingsOnline();
  const status = useQuery({ queryKey: ['tax-status'], queryFn: taxStatusApi.get, staleTime: 120_000 });
  const { draft: d, set, saving, dirty, failed } = useAutoSave(q.data?.settings);
  const rate = Number(d?.taxRate) || 0;
  const symbol = d?.currencySymbol || 'Rs';
  const money = (n: number) => `${symbol} ${n.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const base = 1000;
  const on = !!d?.enableTax;
  const taxAmount = on ? (d?.taxInclusive ? (base * rate) / (100 + rate) : (base * rate) / 100) : 0;
  const net = d?.taxInclusive ? base - taxAmount : base;
  const pays = d?.taxInclusive ? base : base + taxAmount;
  const profiles = status.data?.profiles ?? [];

  return (
    <SettingsTemplate title={t('Tax rates')} description={t('GST ya sales tax har bill par lage ya nahi')} loading={!d && q.isLoading} error={!d && q.error} onRetry={q.refetch}
      actions={<SaveStatus saving={saving} dirty={dirty} failed={failed} />}>
      {!online && <OfflineNote />}
      {d && (
        <>
          <SettingsGroup footnote={on ? t('Har bill par tax hisaab ho kar alag dikhta hai') : t('Band — bill par koi tax nahi lagta')}>
            <SettingSwitch label={t('Sale par tax lagayein')} value={on} onChange={(v) => set('enableTax', v, { now: true })} disabled={!online} />
          </SettingsGroup>
          {on && (
            <>
              <Section title={t('Tax rate')} description={t('Kitna tax aur bill par us ka naam')}>
                <NumberField label={t('Tax rate')} hint={t('Apne tax consultant se rate confirm karein.')} value={d.taxRate} onChange={(v) => set('taxRate', v)} min={0} max={100} decimals suffix="%" disabled={!online} />
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: th.space(2) }}>
                  {QUICK_RATES.map((r) => <Chip key={r} label={`${r}%`} selected={rate === r} disabled={!online} onPress={() => set('taxRate', r, { now: true })} />)}
                </View>
                <Input label={t('Bill par tax ka naam')} hint={t('Misaal: GST, VAT, Sales Tax')} value={d.taxLabel ?? ''} onChangeText={(v) => set('taxLabel', v)} placeholder={t('GST')} maxLength={20} disabled={!online} />
                <Input label={t('Tax number (NTN)')} hint={t('FBR ka National Tax Number — bill par chhapne ke liye Receipt me \'Tax number\' chalu karein.')} ltr value={d.taxNumber ?? ''} onChangeText={(v) => set('taxNumber', v)} placeholder="1234567-8" maxLength={50} disabled={!online} />
              </Section>
              <Section title={t('Tax ka hisaab')} description={t('Price me tax pehle se shamil hai ya upar se lagta hai')}>
                <ChoiceCards value={d.taxInclusive ? 'in' : 'ex'} onChange={(v) => set('taxInclusive', v === 'in', { now: true })} disabled={!online}
                  options={[{ value: 'ex', label: t('Exclusive'), desc: t('Price + tax') }, { value: 'in', label: t('Inclusive'), desc: t('Price me tax shamil') }]} />
              </Section>
              <Section title={t('Misaal: {{base}} ki Sale', { base: money(base) })}>
                {[[t('Asal price'), money(net)], [`${d.taxLabel || t('Tax')} (${rate}%)`, `+ ${money(taxAmount)}`], [t('Customer deta hai'), money(pays)]].map(([k, v], i) => (
                  <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
                    <Text size="sm" tone={i === 2 ? 'default' : 'muted'} weight={i === 2 ? 'bold' : 'regular'} style={{ flexShrink: 1 }}>{k}</Text>
                    <Text size="sm" ltr tabular weight={i === 2 ? 'bold' : 'semibold'}>{v}</Text>
                  </View>
                ))}
                <Text size="xs" tone="muted">{d.taxInclusive ? t('Inclusive: shelf ki price wahi rehti hai, tax us ke andar se nikalta hai.') : t('Exclusive: tax price ke upar alag se judta hai.')}</Text>
              </Section>
            </>
          )}
          <SettingsGroup title={t('FBR / PRA / SRB / KPRA')} footnote={t('Har bill authority ko bhejna aur fiscal number bill par — ye setup web par hota hai.')}>
            {profiles.length === 0 ? (
              <ListRow icon={Landmark} title={t('Koi tax authority jur nahi')} subtitle={status.isLoading ? t('Dekh rahe hain…') : t('Web par Tax settings me jorein')} />
            ) : profiles.map((p) => {
              const act = status.data?.activity?.[p.authority];
              return (
                <ListRow key={p.authority} leading={<Icon icon={Landmark} tone={p.enabled ? 'success' : 'muted'} />}
                  title={status.data?.authorities?.[p.authority]?.name ?? p.authority}
                  subtitle={act?.lastSentAt ? t('Aakhri bill {{when}}', { when: formatDateTime(act.lastSentAt) }) : p.businessName}
                  trailing={<StatusPill tone={p.enabled ? 'success' : 'neutral'}>{p.enabled ? t('Chalu') : t('Band')}</StatusPill>} />
              );
            })}
          </SettingsGroup>
        </>
      )}
      {d && !on && <Note tone="muted">{t('Tax band hai, is liye bill par tax nahi lagta.')}</Note>}
    </SettingsTemplate>
  );
}

export const TaxScreen = ownerOnly(Tax, 'Tax rates');
