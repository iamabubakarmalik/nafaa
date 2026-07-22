import { Check } from 'lucide-react';
import { useMemo } from 'react';
import { STEP_CONFIG } from '../constants/step-config';

interface Props {
  data: {
    enabledCategories: string[]; paymentMethods: string[];
    receiptTemplate: string; lowStockThreshold: number;
    currency: string; enableTax: boolean; taxRate: number;
  };
  onChange: (data: any) => void;
  options: any;
  businessType: string;
}

export function Step4Preferences({ data, onChange, options, businessType }: Props) {
  const cfg = STEP_CONFIG[4];

  const suggestedCategories = useMemo(() => {
    return options?.businessTemplates?.[businessType]?.suggestedCategories || [];
  }, [options, businessType]);

  const toggle = (key: keyof typeof data, value: string) => {
    const arr = data[key] as string[];
    const next = arr.includes(value) ? arr.filter((x) => x !== value) : [...arr, value];
    onChange({ [key]: next });
  };

  return (
    <div className="space-y-8">
      {/* Categories */}
      {suggestedCategories.length > 0 && (
        <section>
          <label className="text-sm font-black text-slate-800 mb-1 block">
            Suggested Categories
          </label>
          <p className="text-xs text-slate-500 mb-3 font-medium">
            ✨ Aap ke business ke liye auto-suggested. Tap karke select karein.
          </p>
          <div className="flex flex-wrap gap-2">
            {suggestedCategories.map((cat: string) => {
              const active = data.enabledCategories.includes(cat);
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => toggle('enabledCategories', cat)}
                  className={`px-3 h-10 rounded-xl border-2 text-xs font-black transition ${
                    active
                      ? `bg-gradient-to-r ${cfg.gradientFrom} ${cfg.gradientTo} ${cfg.borderColor} text-white shadow`
                      : 'border-slate-200 text-slate-700 bg-white hover:border-slate-300'
                  }`}
                >
                  {active && '✓ '}{cat}
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* Payment Methods */}
      <section>
        <label className="text-sm font-black text-slate-800 mb-2 block">
          Payment Methods <span className="text-rose-600">*</span>
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {options.paymentMethods.map((pm: any) => {
            const active = data.paymentMethods.includes(pm.value);
            return (
              <button
                key={pm.value}
                type="button"
                onClick={() => toggle('paymentMethods', pm.value)}
                className={`flex items-center gap-2 p-3 rounded-2xl border-2 transition ${
                  active
                    ? `${cfg.borderColor} ${cfg.bgLight} shadow-md`
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <span className="text-xl">{pm.emoji}</span>
                <span className={`text-sm font-black flex-1 text-left ${active ? cfg.textColor : 'text-slate-700'}`}>
                  {pm.label}
                </span>
                {active && <Check className={`h-4 w-4 ${cfg.textColor}`} strokeWidth={3} />}
              </button>
            );
          })}
        </div>
      </section>

      {/* Currency */}
      <section>
        <label className="text-sm font-black text-slate-800 mb-2 block">Currency</label>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {options.currencies.map((c: any) => {
            const active = data.currency === c.value;
            return (
              <button
                key={c.value}
                type="button"
                onClick={() => onChange({ currency: c.value })}
                className={`p-3 rounded-xl border-2 text-center transition ${
                  active ? `${cfg.borderColor} ${cfg.bgLight} shadow-md` : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className={`text-xl font-black ${active ? cfg.textColor : 'text-slate-900'}`}>{c.symbol}</div>
                <div className="text-[10px] text-slate-500 font-bold uppercase mt-0.5">{c.value}</div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Receipt Template */}
      <section>
        <label className="text-sm font-black text-slate-800 mb-2 block">Receipt Type</label>
        <div className="grid sm:grid-cols-2 gap-2">
          {options.receiptTemplates.map((rt: any) => {
            const active = data.receiptTemplate === rt.value;
            return (
              <button
                key={rt.value}
                type="button"
                onClick={() => onChange({ receiptTemplate: rt.value })}
                className={`text-left p-3 rounded-2xl border-2 transition ${
                  active ? `${cfg.borderColor} ${cfg.bgLight} shadow-md` : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-xl">{rt.icon}</span>
                  <div>
                    <div className={`font-black ${active ? cfg.textColor : 'text-slate-900'}`}>{rt.label}</div>
                    <div className="text-xs text-slate-500 font-medium">{rt.desc}</div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Low stock + Tax */}
      <section className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-black text-slate-800 mb-2 block">Low Stock Alert</label>
          <input
            type="number"
            min={0}
            value={data.lowStockThreshold}
            onChange={(e) => onChange({ lowStockThreshold: Math.max(0, Number(e.target.value) || 0) })}
            className={`w-full rounded-2xl border-2 border-slate-200 px-4 h-12 text-sm font-black outline-none focus:${cfg.borderColor}`}
          />
        </div>
        <div>
          <label className="text-sm font-black text-slate-800 mb-2 block">Tax Rate (%)</label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onChange({ enableTax: !data.enableTax })}
              className={`h-12 px-4 rounded-2xl border-2 font-black text-xs transition ${
                data.enableTax ? `${cfg.borderColor} ${cfg.bgLight} ${cfg.textColor}` : 'border-slate-200 text-slate-500'
              }`}
            >
              {data.enableTax ? 'ON' : 'OFF'}
            </button>
            <input
              type="number"
              min={0}
              max={30}
              disabled={!data.enableTax}
              value={data.taxRate}
              onChange={(e) => onChange({ taxRate: Number(e.target.value) || 0 })}
              placeholder="17"
              className={`flex-1 rounded-2xl border-2 border-slate-200 px-4 h-12 text-sm font-black outline-none focus:${cfg.borderColor} disabled:bg-slate-50 disabled:text-slate-400`}
            />
          </div>
        </div>
      </section>
    </div>
  );
}
