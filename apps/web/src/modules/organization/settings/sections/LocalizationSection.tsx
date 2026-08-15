import { Globe, Clock, Calendar, DollarSign, Languages, MapPin } from 'lucide-react';
import { ChoiceGroup, Field, Select, TextInput, SectionCard, Alert, Divider } from '../components/UI';
import { SyncedBadge } from '../components/SyncedBadge';
import { useAutoSave } from '../hooks/useAutoSave';
import type { TenantSettings } from '../api/settings.api';
import { SaveStatusBar } from './_SaveStatus';

const DAYS = [
  { value: 'mon', label: 'Mon', full: 'Monday' },
  { value: 'tue', label: 'Tue', full: 'Tuesday' },
  { value: 'wed', label: 'Wed', full: 'Wednesday' },
  { value: 'thu', label: 'Thu', full: 'Thursday' },
  { value: 'fri', label: 'Fri', full: 'Friday' },
  { value: 'sat', label: 'Sat', full: 'Saturday' },
  { value: 'sun', label: 'Sun', full: 'Sunday' },
];

const CURRENCY_MAP: Record<string, string> = {
  PKR: 'Rs', USD: '$', AED: 'د.إ', SAR: 'ر.س', GBP: '£', EUR: '€', INR: '₹',
};

export function LocalizationSection({ settings }: { settings: TenantSettings }) {
  const { draft, set, saving, dirty } = useAutoSave(settings);

  const toggleDay = (d: string) => {
    const list = draft.workingDays || [];
    set('workingDays', list.includes(d) ? list.filter((x) => x !== d) : [...list, d]);
  };

  const setCurrency = (v: string) => {
    set('currency', v);
    if (CURRENCY_MAP[v]) set('currencySymbol', CURRENCY_MAP[v]);
  };

  const now = new Date();
  const previewDate = (() => {
    const dd = String(now.getDate()).padStart(2, '0');
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const yyyy = now.getFullYear();
    const mmm = now.toLocaleString('en', { month: 'short' });
    switch (draft.dateFormat) {
      case 'MM/DD/YYYY': return `${mm}/${dd}/${yyyy}`;
      case 'YYYY-MM-DD': return `${yyyy}-${mm}-${dd}`;
      case 'DD MMM YYYY': return `${dd} ${mmm} ${yyyy}`;
      default: return `${dd}/${mm}/${yyyy}`;
    }
  })();

  return (
    <div className="space-y-4">
      <SaveStatusBar saving={saving} dirty={dirty} />

      <SectionCard title="Language" desc="UI aur receipts ka default language" icon={Languages} color="violet">
        <Field label="Preferred Language" badge={<SyncedBadge />}>
          <ChoiceGroup
            value={draft.language}
            onChange={(v) => set('language', v)}
            columns={3}
            options={[
              { value: 'roman_ur', label: 'Roman Urdu', desc: 'Aap kaisay hain', emoji: '🇵🇰' },
              { value: 'ur', label: 'اردو', desc: 'آپ کیسے ہیں', emoji: '📖' },
              { value: 'en', label: 'English', desc: 'How are you', emoji: '🌍' },
            ]}
          />
        </Field>
      </SectionCard>

      <SectionCard title="Currency & Format" desc="Prices, dates aur timezone" icon={DollarSign} color="amber">
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Currency" badge={<SyncedBadge />}>
            <Select
              value={draft.currency}
              onChange={setCurrency}
              options={[
                { value: 'PKR', label: '🇵🇰 PKR — Pakistani Rupee' },
                { value: 'USD', label: '🇺🇸 USD — US Dollar' },
                { value: 'AED', label: '🇦🇪 AED — UAE Dirham' },
                { value: 'SAR', label: '🇸🇦 SAR — Saudi Riyal' },
                { value: 'GBP', label: '🇬🇧 GBP — British Pound' },
                { value: 'EUR', label: '🇪🇺 EUR — Euro' },
                { value: 'INR', label: '🇮🇳 INR — Indian Rupee' },
              ]}
            />
          </Field>
          <Field label="Currency Symbol" hint="Receipt pe dikhega">
            <TextInput
              value={draft.currencySymbol}
              onChange={(v: string) => set('currencySymbol', v)}
              placeholder="Rs"
              maxLength={5}
            />
          </Field>
          <Field label="Timezone">
            <Select
              value={draft.timezone}
              onChange={(v) => set('timezone', v)}
              options={[
                { value: 'Asia/Karachi', label: '🇵🇰 Asia/Karachi (PKT)' },
                { value: 'Asia/Riyadh', label: '🇸🇦 Asia/Riyadh' },
                { value: 'Asia/Dubai', label: '🇦🇪 Asia/Dubai' },
                { value: 'Asia/Kolkata', label: '🇮🇳 Asia/Kolkata (IST)' },
                { value: 'Europe/London', label: '🇬🇧 Europe/London' },
                { value: 'UTC', label: 'UTC' },
              ]}
            />
          </Field>
          <Field label="Date Format" hint={`Preview: ${previewDate}`}>
            <Select
              value={draft.dateFormat}
              onChange={(v) => set('dateFormat', v)}
              options={[
                { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY (15/08/2026)' },
                { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY (08/15/2026)' },
                { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD (2026-08-15)' },
                { value: 'DD MMM YYYY', label: 'DD MMM YYYY (15 Aug 2026)' },
              ]}
            />
          </Field>
        </div>

        <div className="mt-4 rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-500/10 dark:to-orange-500/10 border-2 border-amber-200 dark:border-amber-500/30 p-3 flex items-center justify-between gap-3 flex-wrap">
          <div className="text-[10px] uppercase tracking-widest font-extrabold text-amber-700 dark:text-amber-300">Live Preview</div>
          <div className="text-sm font-extrabold text-slate-900 dark:text-white tabular-nums">
            {draft.currencySymbol} 1,234.50 <span className="opacity-40 mx-1">•</span> {previewDate}
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Working Hours" desc="Shop kab open rehti hai" icon={Clock} color="sky">
        <div className="grid sm:grid-cols-2 gap-4 mb-4">
          <Field label="Open Time" badge={<SyncedBadge />}>
            <TextInput
              type="time"
              value={draft.openTime}
              onChange={(v: string) => set('openTime', v)}
              prefix={<Clock className="h-4 w-4" />}
            />
          </Field>
          <Field label="Close Time" badge={<SyncedBadge />}>
            <TextInput
              type="time"
              value={draft.closeTime}
              onChange={(v: string) => set('closeTime', v)}
              prefix={<Clock className="h-4 w-4" />}
            />
          </Field>
        </div>

        <Divider label="Working Days" />

        <Field label="Kis din khulti hai?" badge={<SyncedBadge />}>
          <div className="flex flex-wrap gap-2">
            {DAYS.map((d) => {
              const active = (draft.workingDays || []).includes(d.value);
              return (
                <button
                  key={d.value}
                  type="button"
                  onClick={() => toggleDay(d.value)}
                  title={d.full}
                  className={[
                    'h-11 min-w-[52px] px-3 rounded-xl border-2 text-sm font-extrabold transition active:scale-95',
                    active
                      ? 'bg-gradient-to-r from-sky-500 to-cyan-600 border-sky-600 text-white shadow-md shadow-sky-500/30'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:border-sky-300',
                  ].join(' ')}
                >
                  {d.label}
                </button>
              );
            })}
          </div>
        </Field>

        <Field label="First Day of Week" hint="Calendar aur reports me kaunsa din pehla ho">
          <div className="mt-1">
            <Select
              value={draft.firstDayOfWeek}
              onChange={(v) => set('firstDayOfWeek', v)}
              options={[
                { value: 'mon', label: 'Monday' },
                { value: 'sun', label: 'Sunday' },
                { value: 'sat', label: 'Saturday' },
              ]}
            />
          </div>
        </Field>
      </SectionCard>

      <Alert tone="blue" icon={MapPin}>
        Timezone galat ho to sales reports aur daily summary time galat aayega. Pakistan me <strong>Asia/Karachi</strong> use karo.
      </Alert>
    </div>
  );
}
