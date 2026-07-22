import { Check } from 'lucide-react';

interface FeatureItem {
  key: string;
  label: string;
  desc: string;
  emoji: string;
  recommended?: boolean;
}

interface Props {
  features: Record<string, boolean>;
  onChange: (key: string, value: boolean) => void;
  items: FeatureItem[];
  color: string;
  borderColor: string;
}

export function FeatureToggle({ features, onChange, items, color, borderColor }: Props) {
  return (
    <div className="grid sm:grid-cols-2 gap-3">
      {items.map((item) => {
        const enabled = features[item.key] ?? false;
        return (
          <button
            key={item.key}
            type="button"
            onClick={() => onChange(item.key, !enabled)}
            className={`text-left p-4 rounded-2xl border-2 transition relative overflow-hidden ${
              enabled
                ? `${borderColor} bg-gradient-to-br from-white to-cyan-50 shadow-md`
                : 'border-slate-200 bg-white hover:border-slate-300'
            }`}
          >
            {item.recommended && !enabled && (
              <div className="absolute top-2 right-2 text-[9px] font-black px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200">
                RECOMMENDED
              </div>
            )}

            <div className="flex items-start gap-3">
              <div
                className={`text-2xl transition ${enabled ? 'scale-110' : 'grayscale opacity-60'}`}
              >
                {item.emoji}
              </div>
              <div className="flex-1 min-w-0">
                <div className={`font-black text-sm ${enabled ? color : 'text-slate-900'}`}>
                  {item.label}
                </div>
                <div className="text-xs text-slate-500 mt-0.5 leading-snug">{item.desc}</div>
              </div>
              <div
                className={`h-6 w-11 rounded-full p-0.5 transition shrink-0 ${
                  enabled ? `bg-gradient-to-r from-cyan-500 to-cyan-600` : 'bg-slate-200'
                }`}
              >
                <div
                  className={`h-5 w-5 bg-white rounded-full shadow-sm transition-transform ${
                    enabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                >
                  {enabled && <Check className="h-3 w-3 text-cyan-600 m-1" strokeWidth={4} />}
                </div>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
