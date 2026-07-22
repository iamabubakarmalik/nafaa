import { Clock, MapPin } from 'lucide-react';
import { STEP_CONFIG } from '../constants/step-config';

interface Props {
  data: {
    shopAddress: string; shopArea: string; shopLandmark: string;
    openTime: string; closeTime: string; workingDays: string[]; taxNumber: string;
  };
  onChange: (data: any) => void;
  options: any;
}

export function Step3ShopDetails({ data, onChange, options }: Props) {
  const cfg = STEP_CONFIG[3];

  const toggleDay = (day: string) => {
    const next = data.workingDays.includes(day)
      ? data.workingDays.filter((d) => d !== day)
      : [...data.workingDays, day];
    onChange({ workingDays: next });
  };

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Address */}
      <section>
        <label className="text-sm font-black text-slate-800 mb-2 block">Shop ka Address</label>
        <div className={`rounded-2xl border-2 border-slate-200 focus-within:${cfg.borderColor} transition p-3`}>
          <div className="flex items-start gap-2">
            <MapPin className="h-4 w-4 text-slate-400 mt-1" />
            <textarea
              value={data.shopAddress}
              onChange={(e) => onChange({ shopAddress: e.target.value })}
              placeholder="Shop No, Street, Area / Sector..."
              rows={2}
              className="flex-1 bg-transparent outline-none text-sm resize-none font-medium"
            />
          </div>
        </div>
      </section>

      {/* Area + Landmark */}
      <section className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-black text-slate-700 uppercase mb-1.5 block">Area / Bazaar</label>
          <input
            value={data.shopArea}
            onChange={(e) => onChange({ shopArea: e.target.value })}
            placeholder="e.g. Anarkali, DHA Phase 5"
            className="w-full rounded-xl border-2 border-slate-200 px-3 h-11 text-sm font-medium outline-none focus:border-violet-500"
          />
        </div>
        <div>
          <label className="text-xs font-black text-slate-700 uppercase mb-1.5 block">Landmark</label>
          <input
            value={data.shopLandmark}
            onChange={(e) => onChange({ shopLandmark: e.target.value })}
            placeholder="Near XYZ mosque"
            className="w-full rounded-xl border-2 border-slate-200 px-3 h-11 text-sm font-medium outline-none focus:border-violet-500"
          />
        </div>
      </section>

      {/* Hours */}
      <section>
        <label className="text-sm font-black text-slate-800 mb-2 block">Working Hours</label>
        <div className="grid grid-cols-2 gap-3">
          {[
            { key: 'openTime', label: 'Open' },
            { key: 'closeTime', label: 'Close' },
          ].map((f) => (
            <div key={f.key}>
              <div className="text-[10px] font-black text-slate-500 uppercase mb-1 tracking-wider">
                {f.label}
              </div>
              <div className="flex items-center gap-2 rounded-2xl border-2 border-slate-200 px-4 h-12 focus-within:border-violet-500 transition">
                <Clock className="h-4 w-4 text-slate-400" />
                <input
                  type="time"
                  value={(data as any)[f.key]}
                  onChange={(e) => onChange({ [f.key]: e.target.value })}
                  className="flex-1 bg-transparent outline-none font-black text-slate-900"
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Working Days */}
      <section>
        <label className="text-sm font-black text-slate-800 mb-2 block">Working Days</label>
        <div className="grid grid-cols-7 gap-1.5">
          {options.workingDays.map((d: any) => {
            const active = data.workingDays.includes(d.value);
            return (
              <button
                key={d.value}
                type="button"
                onClick={() => toggleDay(d.value)}
                className={`h-14 rounded-2xl border-2 text-xs font-black transition flex flex-col items-center justify-center ${
                  active
                    ? `bg-gradient-to-br ${cfg.gradientFrom} ${cfg.gradientTo} ${cfg.borderColor} text-white shadow-md`
                    : 'border-slate-200 text-slate-700 bg-white hover:border-slate-300 hover:shadow-sm'
                }`}
              >
                <span>{d.short}</span>
                <span className={`text-[9px] opacity-70 mt-0.5 ${active ? 'text-white' : ''}`}>
                  {d.urdu}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Tax */}
      <section>
        <label className="text-sm font-black text-slate-800 mb-2 block">
          NTN / GST <span className="text-slate-400 font-medium">(Optional)</span>
        </label>
        <input
          value={data.taxNumber}
          onChange={(e) => onChange({ taxNumber: e.target.value })}
          placeholder="1234567-8"
          className="w-full rounded-2xl border-2 border-slate-200 px-4 h-12 text-sm font-medium outline-none focus:border-violet-500"
        />
      </section>
    </div>
  );
}
