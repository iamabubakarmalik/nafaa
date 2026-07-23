import { MessageCircle, Users, Radio, Gavel } from 'lucide-react';
import type { MarketplaceProfile } from '../api/marketplace-settings.api';

interface Props {
  s: MarketplaceProfile;
  set: <K extends keyof MarketplaceProfile>(key: K, value: MarketplaceProfile[K]) => void;
}

export default function FeaturesSection({ s, set }: Props) {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200 p-5">
        <div className="flex items-start gap-3">
          <div className="text-2xl">✨</div>
          <div>
            <h4 className="font-black text-purple-900">Advanced Features</h4>
            <p className="text-sm text-purple-700 font-medium mt-1">
              Ye features aap ki dukan ko competitor se aage karte hain. Enable karke naye customers attract karein!
            </p>
          </div>
        </div>
      </div>

      <FeatureCard
        icon={MessageCircle}
        gradient="from-purple-500 to-pink-600"
        title="💰 Bargain (Mol-Bhaav)"
        description="Customers offer bhej sakenge — aap accept, reject ya counter kar sakte hain. inDrive jaisi flexibility."
        checked={s.bargainEnabled ?? false}
        onChange={(v: boolean) => set('bargainEnabled', v)}
      >
        {s.bargainEnabled && (
          <div className="mt-4 pt-4 border-t-2 border-purple-200">
            <label className="text-xs font-black text-purple-900 mb-1.5 block">
              Minimum Bargain Percentage (%)
            </label>
            <input
              type="number"
              min={10}
              max={90}
              value={s.bargainMinPercent ?? 20}
              onChange={(e) => set('bargainMinPercent', Number(e.target.value))}
              className="w-32 h-11 px-3 rounded-xl border-2 border-purple-300 bg-white text-sm font-bold outline-none focus:border-purple-500"
            />
            <p className="text-xs text-purple-700 mt-1 font-medium">
              Original price ka minimum {s.bargainMinPercent ?? 20}% neechay offer manzoor nahi honge
            </p>
          </div>
        )}
      </FeatureCard>

      <FeatureCard
        icon={Users}
        gradient="from-orange-500 to-red-600"
        title="👥 Group Buy"
        description="Multiple customers milkar khareedain — minimum quantity puri hone pe sab ko discount milta hai. Pinduoduo-style."
        checked={s.groupBuyEnabled ?? false}
        onChange={(v: boolean) => set('groupBuyEnabled', v)}
      />

      <FeatureCard
        icon={Radio}
        gradient="from-rose-500 to-pink-600"
        title="📺 Live Shopping"
        description="Video streaming ke saath live shopping shows karein. Real-time chat aur reactions."
        checked={s.liveShopEnabled ?? false}
        onChange={(v: boolean) => set('liveShopEnabled', v)}
        badge="COMING SOON"
      />

      <FeatureCard
        icon={Gavel}
        gradient="from-red-500 to-rose-600"
        title="🔨 Auction"
        description="Products ki live nilami karein. Sab se ooncha bid dene wala jeet ta hai."
        checked={s.auctionEnabled ?? false}
        onChange={(v: boolean) => set('auctionEnabled', v)}
        badge="COMING SOON"
      />
    </div>
  );
}

function FeatureCard({ icon: Icon, gradient, title, description, checked, onChange, badge, children }: any) {
  return (
    <div className={`rounded-2xl border-2 overflow-hidden transition ${
      checked ? 'border-purple-400 bg-white shadow-md' : 'border-slate-200 bg-white'
    }`}>
      <div className="p-5 flex items-start gap-4">
        <div className={`h-14 w-14 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-md shrink-0`}>
          <Icon className="h-6 w-6 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="font-black text-slate-900">{title}</h4>
            {badge && (
              <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-[9px] font-black">
                {badge}
              </span>
            )}
          </div>
          <p className="text-sm text-slate-600 font-medium mt-1">{description}</p>
        </div>
        <label className="cursor-pointer shrink-0">
          <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="sr-only" />
          <div className={`h-7 w-12 rounded-full transition ${checked ? 'bg-emerald-500' : 'bg-slate-200'} relative`}>
            <div className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${
              checked ? 'translate-x-5' : 'translate-x-0.5'
            }`} />
          </div>
        </label>
      </div>
      {children && <div className="px-5 pb-5">{children}</div>}
    </div>
  );
}
