/**
 * Language & time: the app's language, currency and its symbol, the time
 * zone and the hour the business day starts, and the store's opening hours
 * and days. Reports, the dashboard and the daily summary all follow these.
 */

import { Calendar, Clock, Coins, Globe2, Languages, MapPin, Sunrise } from 'lucide-react';
import { cn } from '@core/lib/cn';
import { ChoiceGroup, Field, SectionCard } from '../components/SettingsBlocks';
import { Alert, Input, Select } from '@/design-system/components';
import { SyncedBadge } from '../components/SyncedBadge';
import { useAutoSave } from '../hooks/useAutoSave';
import type { TenantSettings } from '../api/settings.api';
import { SaveStatusBar } from './_SaveStatus';
import { LOCALES, t } from '@core/i18n';
import { LanguageCards } from '@core/i18n/components/LanguagePicker';

/** 0 → "raat 12 baje", 14 → "dopahar 2 baje" */
function hourLabel(h: number) {
  const n = ((Math.trunc(h) % 24) + 24) % 24;
  const t12 = n % 12 === 0 ? 12 : n % 12;
  if (n < 5 || n >= 19) return t('raat {{t12}} baje', { t12 });
  if (n < 12) return t('subah {{t12}} baje', { t12 });
  if (n < 16) return t('dopahar {{t12}} baje', { t12 });
  return t('shaam {{t12}} baje', { t12 });
}

/* The hours at which stores actually change day: late-night dhabas pick 4
   or 6, a bakery that opens at 5 picks 5. Hours in between are left out. */
const DAY_START_HOURS = [
  { value: '0', label: t('Raat 12 baje — aam (default)') },
  { value: '1', label: t('Raat 1 baje') },
  { value: '2', label: t('Raat 2 baje') },
  { value: '3', label: t('Raat 3 baje') },
  { value: '4', label: t('Subah 4 baje') },
  { value: '5', label: t('Subah 5 baje') },
  { value: '6', label: t('Subah 6 baje') },
  { value: '7', label: t('Subah 7 baje') },
  { value: '8', label: t('Subah 8 baje') },
  { value: '9', label: t('Subah 9 baje') },
  { value: '10', label: t('Subah 10 baje') },
];

const DAYS = [
  { value: 'mon', label: t('Mon'), full: t('Monday') },
  { value: 'tue', label: t('Tue'), full: t('Tuesday') },
  { value: 'wed', label: t('Wed'), full: t('Wednesday') },
  { value: 'thu', label: t('Thu'), full: t('Thursday') },
  { value: 'fri', label: t('Fri'), full: t('Friday') },
  { value: 'sat', label: t('Sat'), full: t('Saturday') },
  { value: 'sun', label: t('Sun'), full: t('Sunday') },
];

const CURRENCIES = [
  { value: 'PKR', label: t('PKR — Pakistani Rupee'), symbol: 'Rs' },
  { value: 'USD', label: t('USD — US Dollar'), symbol: '$' },
  { value: 'AED', label: t('AED — UAE Dirham'), symbol: 'د.إ' },
  { value: 'SAR', label: t('SAR — Saudi Riyal'), symbol: 'ر.س' },
  { value: 'GBP', label: t('GBP — British Pound'), symbol: '£' },
  { value: 'EUR', label: t('EUR — Euro'), symbol: '€' },
  { value: 'INR', label: t('INR — Indian Rupee'), symbol: '₹' },
];

/* The whole day's accounting runs on the time zone: where "today" starts and
   which hour the dashboard shows as busy. The list covers the countries
   Nafaa now reaches, not only Pakistan. */
const TIMEZONES = [
  { value: 'Asia/Karachi', label: t('Asia/Karachi (Pakistan)') },
  { value: 'Asia/Dubai', label: t('Asia/Dubai') },
  { value: 'Asia/Riyadh', label: t('Asia/Riyadh') },
  { value: 'Asia/Tehran', label: t('Asia/Tehran') },
  { value: 'Asia/Kolkata', label: t('Asia/Kolkata (IST)') },
  { value: 'Asia/Dhaka', label: t('Asia/Dhaka') },
  { value: 'Asia/Kabul', label: t('Asia/Kabul') },
  { value: 'Europe/London', label: t('Europe/London') },
  { value: 'Europe/Stockholm', label: t('Europe/Stockholm') },
  { value: 'Europe/Berlin', label: t('Europe/Berlin') },
  { value: 'America/New_York', label: t('America/New_York') },
  { value: 'America/Toronto', label: t('America/Toronto') },
  { value: 'UTC', label: t('UTC') },
];

/** Current time in a zone, e.g. "3:42 pm, Tue 14 Oct". */
function nowIn(zone: string) {
  try {
    return new Intl.DateTimeFormat('en-GB', { timeZone: zone, hour: 'numeric', minute: '2-digit', hour12: true, weekday: 'short', day: 'numeric', month: 'short' }).format(new Date());
  } catch {
    return '—';
  }
}

export function LocalizationSection({ settings }: { settings: TenantSettings }) {
  const { draft, set, saving, dirty } = useAutoSave(settings);
  const startHour = Number(draft.businessDayStartHour ?? 0);
  const days = draft.workingDays || [];

  const toggleDay = (d: string) => set('workingDays', days.includes(d) ? days.filter((x) => x !== d) : [...days, d]);

  const setCurrency = (v: string) => {
    set('currency', v);
    const symbol = CURRENCIES.find((c) => c.value === v)?.symbol;
    if (symbol) set('currencySymbol', symbol);
  };

  return (
    <div className="space-y-4">
      <SaveStatusBar saving={saving} dirty={dirty} />

      {/* i18n-ignore: shown the same in every language so anyone can find it. */}
      <SectionCard title="Language / Zaban / زبان" desc={t('Aap ki screen kis zaban me ho. Har user apni zaban khud chunta hai.')} icon={Languages} color="violet">
        <LanguageCards />
      </SectionCard>

      <SectionCard title={t('Bill ki zaban')} desc={t('Bill, receipt aur customer ko jane wale message kis zaban me hon')} icon={Languages} color="violet">
        <Field label={t('Dukaan ki zaban')} badge={<SyncedBadge />} hint={t('Poori dukaan ke liye ek. Har user ki screen ki zaban upar alag chuni jati hai.')}>
          <ChoiceGroup value={draft.language} onChange={(v) => set('language', v)} columns={3}
            options={LOCALES.map((l) => ({ value: l.id === 'roman' ? 'roman_ur' : l.id, label: l.native, desc: l.sample }))} />
        </Field>
      </SectionCard>

      <SectionCard title={t('Currency')} desc={t('Har Amount ke saath yahi nishani lagti hai')} icon={Coins} color="amber">
        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_10rem_minmax(0,1fr)]">
          <Select label={<span className="inline-flex items-center gap-1.5">{t('Currency')}<SyncedBadge /></span>} hint={t('Currency badalne se nishani khud badal jati hai.')} value={draft.currency ?? ''} onChange={(e) => setCurrency(e.target.value)} options={CURRENCIES.map(({ value, label }) => ({ value, label }))} />
          <Input label={t('Nishani (symbol)')} hint={t('Bill par Amount se pehle')} value={draft.currencySymbol ?? ''} onChange={(e) => set('currencySymbol', e.target.value)} placeholder="Rs" maxLength={5} />
          <Field label={t('Aisa dikhega')} hint={t('Bill aur reports me')}>
            <div className="flex h-10 items-center rounded-lg bg-slate-50 px-3 text-sm font-semibold tabular-nums text-slate-900 ring-1 ring-inset ring-slate-200">
              {draft.currencySymbol || 'Rs'} 1,234.50
            </div>
          </Field>
        </div>
      </SectionCard>

      <SectionCard title={t('Time zone aur din')} desc={t('Aaj kab shuru hota hai aur reports kis waqt ke mutabiq banti hain')} icon={Globe2} color="sky">
        <div className="grid gap-4 sm:grid-cols-2">
          <Select label={t('Time zone')} hint={t('Store ka waqt abhi: {{timezone}}. Pakistan me Asia/Karachi rakhein.', { timezone: nowIn(draft.timezone) })} value={draft.timezone ?? ''} onChange={(e) => set('timezone', e.target.value)} options={TIMEZONES} />
          <Select label={t('Din kab shuru hota hai')} hint={t('Raat der tak khulne wale store ke liye: is ghante se pehle ki Sale pichhle din me ginti hai.')} value={String(startHour)} onChange={(e) => set('businessDayStartHour', Number(e.target.value))} options={DAY_START_HOURS} />
        </div>
        <Alert className="mt-4" tone="info" icon={<Sunrise className="h-4 w-4 text-blue-600" />}>
          {startHour === 0
            ? t('Aam hisaab — din raat 12 baje badalta hai.')
            : t('Store ka din {{startHour}} se agle din {{startHour}} tak chalta hai. Is waqt se pehle ki Sale pichhle din ki report me aati hai.', { startHour: hourLabel(startHour) })}
        </Alert>
      </SectionCard>

      <SectionCard title={t('Store ke ghante')} desc={t('Store kab khulta aur band hota hai, aur kin dinon me')} icon={Clock} color="emerald">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label={<span className="inline-flex items-center gap-1.5">{t('Khulne ka waqt')}<SyncedBadge /></span>} hint={t('Jis waqt store roz khulta hai')} type="time" value={draft.openTime ?? ''} onChange={(e) => set('openTime', e.target.value)} leftIcon={<Clock className="h-4 w-4" />} />
          <Input label={<span className="inline-flex items-center gap-1.5">{t('Band hone ka waqt')}<SyncedBadge /></span>} hint={t('Raat 12 ke baad band hota hai to din ka aaghaz upar badlein.')} type="time" value={draft.closeTime ?? ''} onChange={(e) => set('closeTime', e.target.value)} leftIcon={<Clock className="h-4 w-4" />} />
        </div>
        <div className="mt-4">
          <Field label={t('Kis din khulta hai')} badge={<SyncedBadge />} hint={t('{{count}} din khula · jo din band hai us par dabayein.', { count: days.length })}>
            <div className="flex flex-wrap gap-2">
              {DAYS.map((d) => {
                const on = days.includes(d.value);
                return (
                  <button key={d.value} type="button" onClick={() => toggleDay(d.value)} title={d.full} aria-pressed={on}
                    className={cn('h-10 min-w-[3.25rem] rounded-lg px-3 text-sm font-semibold ring-1 ring-inset transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 active:scale-95',
                      on ? 'bg-brand-600 text-brand-fg ring-brand-600' : 'bg-white text-slate-600 ring-slate-200 hover:ring-slate-300')}>
                    {d.label}
                  </button>
                );
              })}
            </div>
          </Field>
        </div>
      </SectionCard>

      <Alert tone="info" icon={<MapPin className="h-4 w-4" />}>
        {t('Time zone ghalat ho to Sales reports aur rozana report ka waqt ghalat aata hai.')}{' '} <Calendar className="inline h-3.5 w-3.5" /> {' '}{t('Hafta kis din shuru hota hai, yeh "Reports & daily summary" me hai.')}
      </Alert>
    </div>
  );
}
