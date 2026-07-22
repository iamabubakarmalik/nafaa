import { Phone, User as UserIcon } from 'lucide-react';
import { STEP_CONFIG } from '../constants/step-config';

interface Props {
  data: { whatsappNumber: string; cnic: string; preferredLanguage: string; gender: string; dateOfBirth: string };
  onChange: (data: any) => void;
  options: any;
}

export function Step2OwnerProfile({ data, onChange, options }: Props) {
  const cfg = STEP_CONFIG[2];

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Language — top priority */}
      <section>
        <label className="text-sm font-black text-slate-800 mb-3 block">Preferred Language</label>
        <div className="grid grid-cols-3 gap-2">
          {options.languages.map((lang: any) => {
            const active = data.preferredLanguage === lang.value;
            return (
              <button
                key={lang.value}
                type="button"
                onClick={() => onChange({ preferredLanguage: lang.value })}
                className={`p-4 rounded-2xl border-2 text-center transition ${
                  active
                    ? `${cfg.borderColor} ${cfg.bgLight} shadow-md scale-[1.02]`
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
                }`}
              >
                <div className={`font-black text-xl ${active ? cfg.textColor : 'text-slate-900'}`}>
                  {lang.label}
                </div>
                <div className="text-xs text-slate-500 mt-1 font-medium">{lang.english}</div>
              </button>
            );
          })}
        </div>
      </section>

      {/* WhatsApp */}
      <section>
        <label className="text-sm font-black text-slate-800 mb-2 block">WhatsApp Number</label>
        <div className={`flex items-center gap-2 rounded-2xl border-2 border-slate-200 px-4 h-12 focus-within:${cfg.borderColor} transition`}>
          <Phone className="h-4 w-4 text-slate-400" />
          <input
            type="tel"
            value={data.whatsappNumber}
            onChange={(e) => onChange({ whatsappNumber: e.target.value })}
            placeholder="+92 300 1234567"
            className="flex-1 bg-transparent outline-none text-sm font-medium"
          />
        </div>
        <p className="text-xs text-slate-500 mt-1.5 font-medium">📱 Customers ko WhatsApp par receipts bhejne ke liye</p>
      </section>

      {/* Gender */}
      <section>
        <label className="text-sm font-black text-slate-800 mb-2 block">Gender (optional)</label>
        <div className="grid grid-cols-3 gap-2">
          {[
            { v: 'MALE', l: 'Male', e: '👨' },
            { v: 'FEMALE', l: 'Female', e: '👩' },
            { v: 'OTHER', l: 'Prefer not to say', e: '👤' },
          ].map((g) => {
            const active = data.gender === g.v;
            return (
              <button
                key={g.v}
                type="button"
                onClick={() => onChange({ gender: active ? '' : g.v })}
                className={`p-3 rounded-xl border-2 text-center transition ${
                  active ? `${cfg.borderColor} ${cfg.bgLight}` : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="text-xl">{g.e}</div>
                <div className={`text-xs font-bold mt-1 ${active ? cfg.textColor : 'text-slate-700'}`}>{g.l}</div>
              </button>
            );
          })}
        </div>
      </section>

      {/* CNIC */}
      <section>
        <label className="text-sm font-black text-slate-800 mb-2 block">
          CNIC <span className="text-slate-400 font-medium">(Optional)</span>
        </label>
        <div className={`flex items-center gap-2 rounded-2xl border-2 border-slate-200 px-4 h-12 focus-within:${cfg.borderColor} transition`}>
          <UserIcon className="h-4 w-4 text-slate-400" />
          <input
            value={data.cnic}
            onChange={(e) => onChange({ cnic: e.target.value })}
            placeholder="42101-1234567-1"
            maxLength={15}
            className="flex-1 bg-transparent outline-none text-sm font-medium"
          />
        </div>
        <p className="text-xs text-slate-500 mt-1.5 font-medium">🔐 Sirf verification ke liye — secure hai</p>
      </section>
    </div>
  );
}
