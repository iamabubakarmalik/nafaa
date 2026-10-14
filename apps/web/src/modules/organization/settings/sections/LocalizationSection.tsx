/**
 * Language & time: the app's language, currency and its symbol, the time
 * zone and the hour the business day starts, and the store's opening hours
 * and days. Reports, the dashboard and the daily summary all follow these.
 */

import { Calendar, Clock, Coins, Globe2, Languages, MapPin, Sunrise } from 'lucide-react';
import { cn } from '@core/lib/cn';
import { Alert, ChoiceGroup, Field, SectionCard, Select, TextInput } from '../components/UI';
import { SyncedBadge } from '../components/SyncedBadge';
import { useAutoSave } from '../hooks/useAutoSave';
import type { TenantSettings } from '../api/settings.api';
import { SaveStatusBar } from './_SaveStatus';

/** 0 → "raat 12 baje", 14 → "dopahar 2 baje" */
function hourLabel(h: number) {
  const n = ((Math.trunc(h) % 24) + 24) % 24;
  const t12 = n % 12 === 0 ? 12 : n % 12;
  const part = n < 5 ? 'raat' : n < 12 ? 'subah' : n < 16 ? 'dopahar' : n < 19 ? 'shaam' : 'raat';
  return `${part} ${t12} baje`;
}

/* The hours at which stores actually change day: late-night dhabas pick 4
   or 6, a bakery that opens at 5 picks 5. Hours in between are left out. */
const DAY_START_HOURS = [
  { value: '0', label: 'Raat 12 baje — aam (default)' },
  { value: '1', label: 'Raat 1 baje' },
  { value: '2', label: 'Raat 2 baje' },
  { value: '3', label: 'Raat 3 baje' },
  { value: '4', label: 'Subah 4 baje' },
  { value: '5', label: 'Subah 5 baje' },
  { value: '6', label: 'Subah 6 baje' },
  { value: '7', label: 'Subah 7 baje' },
  { value: '8', label: 'Subah 8 baje' },
  { value: '9', label: 'Subah 9 baje' },
  { value: '10', label: 'Subah 10 baje' },
];

const DAYS = [
  { value: 'mon', label: 'Mon', full: 'Monday' },
  { value: 'tue', label: 'Tue', full: 'Tuesday' },
  { value: 'wed', label: 'Wed', full: 'Wednesday' },
  { value: 'thu', label: 'Thu', full: 'Thursday' },
  { value: 'fri', label: 'Fri', full: 'Friday' },
  { value: 'sat', label: 'Sat', full: 'Saturday' },
  { value: 'sun', label: 'Sun', full: 'Sunday' },
];

const CURRENCIES = [
  { value: 'PKR', label: 'PKR — Pakistani Rupee', symbol: 'Rs' },
  { value: 'USD', label: 'USD — US Dollar', symbol: '$' },
  { value: 'AED', label: 'AED — UAE Dirham', symbol: 'د.إ' },
  { value: 'SAR', label: 'SAR — Saudi Riyal', symbol: 'ر.س' },
  { value: 'GBP', label: 'GBP — British Pound', symbol: '£' },
  { value: 'EUR', label: 'EUR — Euro', symbol: '€' },
  { value: 'INR', label: 'INR — Indian Rupee', symbol: '₹' },
];

/* The whole day's accounting runs on the time zone: where "today" starts and
   which hour the dashboard shows as busy. The list covers the countries
   Nafaa now reaches, not only Pakistan. */
const TIMEZONES = [
  { value: 'Asia/Karachi', label: 'Asia/Karachi (Pakistan)' },
  { value: 'Asia/Dubai', label: 'Asia/Dubai' },
  { value: 'Asia/Riyadh', label: 'Asia/Riyadh' },
  { value: 'Asia/Tehran', label: 'Asia/Tehran' },
  { value: 'Asia/Kolkata', label: 'Asia/Kolkata (IST)' },
  { value: 'Asia/Dhaka', label: 'Asia/Dhaka' },
  { value: 'Asia/Kabul', label: 'Asia/Kabul' },
  { value: 'Europe/London', label: 'Europe/London' },
  { value: 'Europe/Stockholm', label: 'Europe/Stockholm' },
  { value: 'Europe/Berlin', label: 'Europe/Berlin' },
  { value: 'America/New_York', label: 'America/New_York' },
  { value: 'America/Toronto', label: 'America/Toronto' },
  { value: 'UTC', label: 'UTC' },
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

      <SectionCard title="Zubaan" desc="App aur receipts kis zubaan me hon" icon={Languages} color="violet">
        <Field label="Pasandeeda zubaan" badge={<SyncedBadge />} hint="Store ki default zubaan — app aur receipts isi me khulte hain.">
          <ChoiceGroup value={draft.language} onChange={(v) => set('language', v)} columns={3}
            options={[
              { value: 'roman_ur', label: 'Roman Urdu', desc: 'Aap kaise hain' },
              { value: 'ur', label: 'اردو', desc: 'آپ کیسے ہیں' },
              { value: 'en', label: 'English', desc: 'How are you' },
            ]} />
        </Field>
      </SectionCard>

      <SectionCard title="Currency" desc="Har Amount ke saath yahi nishani lagti hai" icon={Coins} color="amber">
        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_10rem_minmax(0,1fr)]">
          <Field label="Currency" badge={<SyncedBadge />} hint="Currency badalne se nishani khud badal jati hai.">
            <Select value={draft.currency} onChange={setCurrency} options={CURRENCIES.map(({ value, label }) => ({ value, label }))} />
          </Field>
          <Field label="Nishani (symbol)" hint="Bill par Amount se pehle">
            <TextInput value={draft.currencySymbol} onChange={(v) => set('currencySymbol', v)} placeholder="Rs" maxLength={5} />
          </Field>
          <Field label="Aisa dikhega" hint="Bill aur reports me">
            <div className="flex h-10 items-center rounded-xl bg-slate-50 px-3 text-sm font-semibold tabular-nums text-slate-900 ring-1 ring-slate-200">
              {draft.currencySymbol || 'Rs'} 1,234.50
            </div>
          </Field>
        </div>
      </SectionCard>

      <SectionCard title="Time zone aur din" desc="Aaj kab shuru hota hai aur reports kis waqt ke mutabiq banti hain" icon={Globe2} color="sky">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Time zone" hint={`Store ka waqt abhi: ${nowIn(draft.timezone)}. Pakistan me Asia/Karachi rakhein.`}>
            <Select value={draft.timezone} onChange={(v) => set('timezone', v)} options={TIMEZONES} />
          </Field>
          <Field label="Din kab shuru hota hai" hint="Raat der tak khulne wale store ke liye: is ghante se pehle ki Sale pichhle din me ginti hai.">
            <Select value={String(startHour)} onChange={(v) => set('businessDayStartHour', Number(v))} options={DAY_START_HOURS} />
          </Field>
        </div>
        <div className="mt-4 flex items-start gap-2.5 rounded-xl bg-sky-50 p-3 text-xs leading-relaxed text-sky-900 ring-1 ring-sky-100">
          <Sunrise className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            {startHour === 0
              ? 'Aam hisaab — din raat 12 baje badalta hai.'
              : `Store ka din ${hourLabel(startHour)} se agle din ${hourLabel(startHour)} tak chalta hai. Is waqt se pehle ki Sale pichhle din ki report me aati hai.`}
          </p>
        </div>
      </SectionCard>

      <SectionCard title="Store ke ghante" desc="Store kab khulta aur band hota hai, aur kin dinon me" icon={Clock} color="emerald">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Khulne ka waqt" badge={<SyncedBadge />} hint="Jis waqt store roz khulta hai">
            <TextInput type="time" value={draft.openTime} onChange={(v) => set('openTime', v)} prefix={<Clock className="h-4 w-4" />} />
          </Field>
          <Field label="Band hone ka waqt" badge={<SyncedBadge />} hint="Raat 12 ke baad band hota hai to din ka aaghaz upar badlein.">
            <TextInput type="time" value={draft.closeTime} onChange={(v) => set('closeTime', v)} prefix={<Clock className="h-4 w-4" />} />
          </Field>
        </div>
        <div className="mt-4">
          <Field label="Kis din khulta hai" badge={<SyncedBadge />} hint={`${days.length} din khula · jo din band hai us par dabayein.`}>
            <div className="flex flex-wrap gap-2">
              {DAYS.map((d) => {
                const on = days.includes(d.value);
                return (
                  <button key={d.value} type="button" onClick={() => toggleDay(d.value)} title={d.full} aria-pressed={on}
                    className={cn('h-10 min-w-[3.25rem] rounded-xl px-3 text-sm font-semibold ring-1 transition active:scale-95',
                      on ? 'bg-brand-600 text-brand-fg ring-brand-600' : 'bg-white text-slate-600 ring-slate-200 hover:ring-slate-300')}>
                    {d.label}
                  </button>
                );
              })}
            </div>
          </Field>
        </div>
      </SectionCard>

      <Alert tone="blue" icon={MapPin}>
        Time zone ghalat ho to Sales reports aur rozana report ka waqt ghalat aata hai. <Calendar className="inline h-3.5 w-3.5" /> Hafta kis din shuru hota hai, yeh "Reports & daily summary" me hai.
      </Alert>
    </div>
  );
}
