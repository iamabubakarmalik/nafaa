import { Globe, Clock, Calendar } from 'lucide-react';
import { ChoiceGroup, Field, Select, TextInput, SectionCard, SyncedBadge } from '../components/UI';

const DAYS = [
  { value: 'mon', label: 'Mon' }, { value: 'tue', label: 'Tue' }, { value: 'wed', label: 'Wed' },
  { value: 'thu', label: 'Thu' }, { value: 'fri', label: 'Fri' }, { value: 'sat', label: 'Sat' }, { value: 'sun', label: 'Sun' },
];

export default function LocalizationSection({ s, set }: any) {
  const toggleDay = (d: string) => {
    const list = s.workingDays || [];
    set('workingDays', list.includes(d) ? list.filter((x: string) => x !== d) : [...list, d]);
  };

  return (
    <div className="space-y-5">
      <SectionCard title="Language" desc="UI aur receipts ka default language" icon={Globe} color="blue">
        <Field label="Preferred Language" badge={<SyncedBadge />}>
          <ChoiceGroup
            value={s.language}
            onChange={(v: boolean) => set('language', v)}
            columns={3}
            options={[
              { value: 'roman_ur', label: 'Roman Urdu', desc: 'Aap kaisay hain', emoji: '🇵🇰' },
              { value: 'ur', label: 'اردو', desc: 'آپ کیسے ہیں', emoji: '📖' },
              { value: 'en', label: 'English', desc: 'How are you', emoji: '🌍' },
            ]}
          />
        </Field>
      </SectionCard>

      <SectionCard title="Currency & Format" desc="Prices aur dates ka format" icon={Globe} color="blue">
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Currency" badge={<SyncedBadge />}>
            <Select value={s.currency} onChange={(v: string) => set('currency', v)} options={[
              { value: 'PKR', label: '🇵🇰 PKR — Pakistani Rupee' },
              { value: 'USD', label: '🇺🇸 USD — US Dollar' },
              { value: 'AED', label: '🇦🇪 AED — UAE Dirham' },
              { value: 'SAR', label: '🇸🇦 SAR — Saudi Riyal' },
              { value: 'GBP', label: '🇬🇧 GBP — British Pound' },
              { value: 'EUR', label: '🇪🇺 EUR — Euro' },
            ]} />
          </Field>
          <Field label="Currency Symbol"><TextInput value={s.currencySymbol} onChange={(v: string) => set('currencySymbol', v)} placeholder="Rs" maxLength={5} /></Field>
          <Field label="Timezone">
            <Select value={s.timezone} onChange={(v: string) => set('timezone', v)} options={[
              { value: 'Asia/Karachi', label: 'Asia/Karachi (PKT)' },
              { value: 'Asia/Riyadh', label: 'Asia/Riyadh' },
              { value: 'Asia/Dubai', label: 'Asia/Dubai' },
              { value: 'Asia/Kolkata', label: 'Asia/Kolkata (IST)' },
              { value: 'UTC', label: 'UTC' },
            ]} />
          </Field>
          <Field label="Date Format">
            <Select value={s.dateFormat} onChange={(v: string) => set('dateFormat', v)} options={[
              { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY (20/07/2026)' },
              { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY (07/20/2026)' },
              { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD (2026-07-20)' },
              { value: 'DD MMM YYYY', label: 'DD MMM YYYY (20 Jul 2026)' },
            ]} />
          </Field>
        </div>
      </SectionCard>

      <SectionCard title="Working Hours" desc="Shop ka schedule" icon={Clock} color="blue">
        <div className="grid sm:grid-cols-2 gap-4 mb-4">
          <Field label="Open Time" badge={<SyncedBadge />}>
            <TextInput type="time" value={s.openTime} onChange={(v: string) => set('openTime', v)} />
          </Field>
          <Field label="Close Time" badge={<SyncedBadge />}>
            <TextInput type="time" value={s.closeTime} onChange={(v: string) => set('closeTime', v)} />
          </Field>
        </div>
        <Field label="Working Days" badge={<SyncedBadge />}>
          <div className="flex flex-wrap gap-2">
            {DAYS.map((d) => {
              const active = (s.workingDays || []).includes(d.value);
              return (
                <button
                  key={d.value}
                  type="button"
                  onClick={() => toggleDay(d.value)}
                  className={`h-11 px-4 rounded-xl border-2 text-sm font-black transition ${
                    active ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 border-emerald-600 text-white shadow' : 'border-slate-200 text-slate-700 hover:border-slate-300 bg-white'
                  }`}
                >
                  {d.label}
                </button>
              );
            })}
          </div>
        </Field>
      </SectionCard>
    </div>
  );
}
