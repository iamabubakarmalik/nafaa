import { Sparkles, Package } from 'lucide-react';

interface Props {
  businessType: string;
  businessEmoji: string;
  onUse: () => void;
  isLoading?: boolean;
}

export function SampleDataBanner({ businessType, businessEmoji, onUse, isLoading }: Props) {
  return (
    <div className="rounded-3xl bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 border-2 border-amber-200 p-5 relative overflow-hidden">
      <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-amber-300/30 blur-2xl" />
      <div className="absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-rose-300/30 blur-2xl" />

      <div className="relative">
        <div className="flex items-center gap-2 mb-2">
          <div className="text-3xl">{businessEmoji}</div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-500 px-3 py-1 text-xs font-black text-white shadow">
            <Sparkles className="h-3 w-3" />
            SMART SUGGESTION
          </div>
        </div>

        <h3 className="text-lg font-black text-slate-900">
          {businessType} ke liye sample products load karein
        </h3>
        <p className="text-sm text-slate-700 mt-1">
          Hum aap ke business ke liye 5-10 realistic products & categories automatically add kar denge.
          Aap in ko baad mein edit / delete kar sakte hain.
        </p>

        <div className="flex flex-wrap gap-2 mt-3">
          <button
            onClick={onUse}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 h-11 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-black shadow-lg hover:shadow-xl transition disabled:opacity-60"
          >
            <Package className="h-4 w-4" />
            {isLoading ? 'Loading samples...' : 'Load Sample Products'}
          </button>
          <div className="text-xs text-amber-700 font-bold self-center">
            ✨ 30 seconds saved
          </div>
        </div>
      </div>
    </div>
  );
}
