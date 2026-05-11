import { ChoiceGroup, Field, Select, TextInput } from './_shared';

const DAYS = [
  { value: 'mon', label: 'Mon' },
  { value: 'tue', label: 'Tue' },
  { value: 'wed', label: 'Wed' },
  { value: 'thu', label: 'Thu' },
  { value: 'fri', label: 'Fri' },
  { value: 'sat', label: 'Sat' },
  { value: 'sun', label: 'Sun' },
];

export default function LocalizationSection({ s, set }: any) {
  const toggleDay = (d: string) => {
    const list = s.workingDays || [];
    set('workingDays', list.includes(d) ? list.filter((x: string) => x !== d) : [...list, d]);
  };

  return (
    <div className="space-y-5">
      <Field label="Language">
        <ChoiceGroup
          value={s.language}
          onChange={(v) => set('language', v)}
          options={[
            { value: 'roman_ur', label: 'Roman Urdu', desc: 'Aap kaisay hain' },
            { value: 'ur', label: 'اردو', desc: 'آپ کیسے ہیں' },
            { value: 'en', label: 'English', desc: 'How are you' },
          ]}
        />
      </Field>

      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Currency">
          <Select
            value={s.currency}
            onChange={(v) => set('currency', v)}
            options={[
              { value: 'PKR', label: 'PKR — Pakistani Rupee' },
              { value: 'USD', label: 'USD — US Dollar' },
              { value: 'SAR', label: 'SAR — Saudi Riyal' },
              { value: 'AED', label: 'AED — UAE Dirham' },
            ]}
          />
        </Field>
        <Field label="Currency Symbol">
          <TextInput value={s.currencySymbol} onChange={(v: string) => set('currencySymbol', v)} placeholder="Rs" />
        </Field>
        <Field label="Timezone">
          <Select
            value={s.timezone}
            onChange={(v) => set('timezone', v)}
            options={[
              { value: 'Asia/Karachi', label: 'Asia/Karachi (PKT)' },
              { value: 'Asia/Riyadh', label: 'Asia/Riyadh' },
              { value: 'Asia/Dubai', label: 'Asia/Dubai' },
            ]}
          />
        </Field>
        <Field label="Date Format">
          <Select
            value={s.dateFormat}
            onChange={(v) => set('dateFormat', v)}
            options={[
              { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY (31/12/2024)' },
              { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY (12/31/2024)' },
              { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD (2024-12-31)' },
            ]}
          />
        </Field>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Open Time">
          <TextInput type="time" value={s.openTime} onChange={(v: string) => set('openTime', v)} placeholder="09:00" />
        </Field>
        <Field label="Close Time">
          <TextInput type="time" value={s.closeTime} onChange={(v: string) => set('closeTime', v)} placeholder="22:00" />
        </Field>
      </div>

      <Field label="Working Days">
        <div className="flex flex-wrap gap-2">
          {DAYS.map((d) => {
            const active = (s.workingDays || []).includes(d.value);
            return (
              <button
                key={d.value}
                type="button"
                onClick={() => toggleDay(d.value)}
                className={`h-10 px-4 rounded-xl border-2 text-sm font-bold transition ${
                  active ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-slate-200 text-slate-700 hover:border-slate-300'
                }`}
              >
                {d.label}
              </button>
            );
          })}
        </div>
      </Field>
    </div>
  );
}
