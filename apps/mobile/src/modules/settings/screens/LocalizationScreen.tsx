/**
 * Settings → Bill language, currency and time: the shop's language for bills
 * and customer messages, currency and symbol, time zone, the hour the
 * business day starts, and opening hours and days (web LocalizationSection).
 * The app's own language is per person (Settings → Language & time).
 */

import { View } from 'react-native';
import { t } from '@/core/i18n';
import { LOCALES } from '@/core/i18n';
import { Chip, DatePicker, Input, Select, SettingsTemplate, Text, useTheme } from '@/design';
import { CURRENCIES, DAY_START_HOURS, DAYS, TIMEZONES, dateToTime, timeToDate } from '../lib/options';
import { useAutoSave, useSettings, useSettingsOnline } from '../hooks/useSettings';
import { ChoiceCards, Note, OfflineNote, SaveStatus, Section, ownerOnly } from '../components/SettingsParts';

const toServer = (id: string) => (id === 'roman' ? 'roman_ur' : id);
const fromServer = (v?: string) => (v === 'roman_ur' ? 'roman' : v === 'ur' || v === 'en' ? v : 'roman');

function Localization() {
  const th = useTheme();
  const q = useSettings();
  const online = useSettingsOnline();
  const { draft: d, set, saving, dirty, failed } = useAutoSave(q.data?.settings);
  const days = d?.workingDays ?? [];
  const start = Number(d?.businessDayStartHour ?? 0);
  const toggleDay = (v: string) => set('workingDays', days.includes(v) ? days.filter((x) => x !== v) : [...days, v], { now: true });

  return (
    <SettingsTemplate title={t('Bill language, currency & time')} description={t('Reports, dashboard aur rozana hisaab inhi par chalte hain')} loading={!d && q.isLoading} error={!d && q.error} onRetry={q.refetch}
      actions={<SaveStatus saving={saving} dirty={dirty} failed={failed} />}>
      {!online && <OfflineNote />}
      {d && (
        <>
          <Section title={t('Bill ki zaban')} description={t('Bill, receipt aur customer ko jane wale message kis zaban me hon')}>
            <ChoiceCards value={fromServer(d.language) as 'en'} disabled={!online} onChange={(v) => set('language', toServer(v), { now: true })}
              options={LOCALES.map((l) => ({ value: l.id as 'en', label: l.native, desc: l.sample }))} />
            <Text size="xs" tone="muted">{t('Poori dukaan ke liye ek. Har user ki screen ki zaban Language & time me alag chuni jati hai.')}</Text>
          </Section>

          <Section title={t('Currency')} description={t('Har Amount ke saath yahi nishani lagti hai')}>
            <Select label={t('Currency')} hint={t('Currency badalne se nishani khud badal jati hai.')} value={d.currency} disabled={!online}
              options={CURRENCIES.map(({ value, label }) => ({ value, label }))}
              onChange={(v) => { set('currency', v, { now: true }); const sym = CURRENCIES.find((c) => c.value === v)?.symbol; if (sym) set('currencySymbol', sym, { now: true }); }} />
            <Input label={t('Nishani (symbol)')} hint={t('Bill par Amount se pehle')} value={d.currencySymbol ?? ''} onChangeText={(v) => set('currencySymbol', v)} maxLength={5} disabled={!online} />
            <Note tone="muted">{`${t('Aisa dikhega')}: ${d.currencySymbol || 'Rs'} 1,234.50`}</Note>
          </Section>

          <Section title={t('Time zone aur din')} description={t('Aaj kab shuru hota hai aur reports kis waqt ke mutabiq banti hain')}>
            <Select label={t('Time zone')} hint={t('Pakistan me Asia/Karachi rakhein.')} value={d.timezone} options={TIMEZONES} searchable disabled={!online} onChange={(v) => set('timezone', v, { now: true })} />
            <Select label={t('Din kab shuru hota hai')} hint={t('Raat der tak khulne wale store ke liye: is ghante se pehle ki Sale pichhle din me ginti hai.')} value={String(start)} disabled={!online}
              options={DAY_START_HOURS.map((o) => ({ value: o.value, label: t(o.label) }))} onChange={(v) => set('businessDayStartHour', Number(v), { now: true })} />
            <Note>{start === 0 ? t('Aam hisaab — din raat 12 baje badalta hai.') : t('Store ka din {{start}}:00 se agle din {{start}}:00 tak chalta hai. Is waqt se pehle ki Sale pichhle din ki report me aati hai.', { start })}</Note>
          </Section>

          <Section title={t('Store ke ghante')} description={t('Store kab khulta aur band hota hai, aur kin dinon me')}>
            <DatePicker mode="time" label={t('Khulne ka waqt')} value={timeToDate(d.openTime)} onChange={(v) => set('openTime', dateToTime(v), { now: true })} disabled={!online} />
            <DatePicker mode="time" label={t('Band hone ka waqt')} hint={t('Raat 12 ke baad band hota hai to din ka aaghaz upar badlein.')} value={timeToDate(d.closeTime)} onChange={(v) => set('closeTime', dateToTime(v), { now: true })} disabled={!online} />
            <Text size="sm" weight="semibold" tone="secondary">{t('Kis din khulta hai')}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: th.space(2) }}>
              {DAYS.map((x) => <Chip key={x.value} label={t(x.label)} selected={days.includes(x.value)} disabled={!online} onPress={() => toggleDay(x.value)} />)}
            </View>
            <Text size="xs" tone="muted">{t('{{count}} din khula · jo din band hai us par dabayein.', { count: days.length })}</Text>
          </Section>
          <Note tone="muted">{t('Time zone ghalat ho to Sales reports aur rozana report ka waqt ghalat aata hai.')}</Note>
        </>
      )}
    </SettingsTemplate>
  );
}

export const LocalizationScreen = ownerOnly(Localization, 'Bill language, currency & time');
