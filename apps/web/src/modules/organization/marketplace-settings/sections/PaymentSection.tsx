import { Info } from 'lucide-react';
import type { MarketplaceProfile } from '../api/marketplace-settings.api';

interface Props {
  s: MarketplaceProfile;
  set: <K extends keyof MarketplaceProfile>(key: K, value: MarketplaceProfile[K]) => void;
}

const METHODS = [
  { key: 'acceptsCod',       emoji: '💵', label: 'Cash on Delivery',     desc: 'Ghar pe paise len' },
  { key: 'acceptsJazzcash',  emoji: '📱', label: 'JazzCash',              desc: 'Mobile wallet' },
  { key: 'acceptsEasypaisa', emoji: '💚', label: 'Easypaisa',             desc: 'Telenor mobile wallet' },
  { key: 'acceptsCard',      emoji: '💳', label: 'Debit / Credit Card',   desc: 'Visa, MasterCard' },
  { key: 'acceptsRaast',     emoji: '⚡', label: 'Raast',                 desc: 'State Bank instant' },
  { key: 'acceptsWallet',    emoji: '👛', label: 'Nafaa Wallet',          desc: 'In-app balance' },
] as const;

export default function PaymentSection({ s, set }: Props) {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-amber-50 border-2 border-amber-200 p-4 flex items-start gap-3">
        <Info className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="text-sm text-amber-800 font-medium">
          <strong className="font-black">Tip:</strong> Jitne zyada payment methods enable karenge, utne zyada customers milenge. COD ke bina Pakistan mein sales bohat kam ho sakti hain.
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        {METHODS.map((m) => {
          const checked = Boolean((s as any)[m.key]);
          return (
            <label
              key={m.key}
              className={`flex items-start gap-3 p-4 rounded-2xl border-2 cursor-pointer transition ${
                checked ? 'bg-emerald-50 border-emerald-500' : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={(e) => set(m.key as any, e.target.checked as any)}
                className="sr-only"
              />
              <div className="text-3xl shrink-0">{m.emoji}</div>
              <div className="flex-1 min-w-0">
                <div className="font-black text-sm text-slate-900">{m.label}</div>
                <div className="text-xs text-slate-500 font-medium mt-0.5">{m.desc}</div>
              </div>
              <div className={`h-6 w-11 rounded-full transition ${checked ? 'bg-emerald-500' : 'bg-slate-200'} relative shrink-0`}>
                <div className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                  checked ? 'translate-x-5' : 'translate-x-0.5'
                }`} />
              </div>
            </label>
          );
        })}
      </div>
    </div>
  );
}
