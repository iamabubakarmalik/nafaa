import { MapPin, Star, Truck, CheckCircle2, Clock, Store, MessageCircle } from 'lucide-react';
import type { MarketplaceShopProfile } from '../../shared/types';
import type { MarketplaceIndustryTheme } from '../../shared/industry-themes';
import { VERIFICATION_META } from '../../shared/status-utils';

interface Props {
  s: MarketplaceShopProfile;
  theme: MarketplaceIndustryTheme;
}

export default function ShopPreviewCard({ s, theme }: Props) {
  const verify = VERIFICATION_META[s.verificationLevel] || VERIFICATION_META.UNVERIFIED;
  const displayName = s.publicName || 'Your Shop Name';
  const tagline = s.tagline || 'Add a catchy tagline...';
  const isMissing = !s.publicName || !s.city;

  return (
    <div className="rounded-2xl overflow-hidden border-2 border-slate-200 bg-white shadow-sm">
      {/* Cover image */}
      <div className={`relative h-24 bg-gradient-to-br ${theme.gradient}`}>
        {s.coverUrl ? (
          <img src={s.coverUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-4xl opacity-40">{theme.emoji}</div>
          </div>
        )}
        {s.verificationLevel && s.verificationLevel !== 'UNVERIFIED' && (
          <div className={`absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-black ${verify.bg} ${verify.color} border ${verify.border} flex items-center gap-1`}>
            {verify.emoji} {verify.label}
          </div>
        )}
      </div>

      {/* Logo overlap */}
      <div className="px-4 -mt-8 relative">
        <div className="h-16 w-16 rounded-2xl bg-white p-1 shadow-lg">
          {s.logoUrl ? (
            <img src={s.logoUrl} alt="" className="w-full h-full rounded-xl object-cover" />
          ) : (
            <div className={`w-full h-full rounded-xl bg-gradient-to-br ${theme.gradient} flex items-center justify-center text-2xl`}>
              {theme.emoji}
            </div>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="p-4 pt-2 space-y-2">
        <div>
          <div className="font-black text-slate-900 leading-tight">{displayName}</div>
          <div className="text-xs text-slate-500 font-medium mt-0.5 line-clamp-1">{tagline}</div>
        </div>

        {/* Rating + city */}
        <div className="flex items-center gap-3 text-xs">
          {s.ratingAverage && s.ratingAverage > 0 ? (
            <div className="flex items-center gap-1 font-black">
              <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
              {s.ratingAverage.toFixed(1)}
              <span className="text-slate-500 font-medium">({s.ratingCount})</span>
            </div>
          ) : (
            <div className="text-slate-400 font-medium">No ratings yet</div>
          )}
          {s.city && (
            <div className="flex items-center gap-1 text-slate-500 font-medium">
              <MapPin className="h-3 w-3" />
              {s.city}
            </div>
          )}
        </div>

        {/* Industry chip + delivery */}
        <div className="flex items-center gap-2 flex-wrap">
          <div
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black"
            style={{ backgroundColor: theme.accentHex + '20', color: theme.accentHex }}
          >
            <span>{theme.emoji}</span>
            {theme.label}
          </div>
          {s.offersDelivery && (
            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-700">
              <Truck className="h-2.5 w-2.5" />
              {s.estimatedDeliveryMinutes || 30} min
            </div>
          )}
        </div>

        {/* Price info */}
        {s.deliveryFee !== undefined && (
          <div className="pt-2 border-t border-slate-100 text-[11px] font-bold text-slate-600 space-y-0.5">
            {s.deliveryFee > 0 ? (
              <div>Delivery: Rs {s.deliveryFee}</div>
            ) : (
              <div className="text-emerald-700">🎉 Free delivery</div>
            )}
            {s.freeDeliveryAbove && (
              <div className="text-emerald-600">Free above Rs {s.freeDeliveryAbove}</div>
            )}
            {s.minOrderAmount && s.minOrderAmount > 0 && (
              <div className="text-slate-500">Min order: Rs {s.minOrderAmount}</div>
            )}
          </div>
        )}

        {/* Feature badges */}
        <div className="flex gap-1 flex-wrap pt-1">
          {s.bargainEnabled && (
            <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-purple-100 text-purple-700">💰 BARGAIN</span>
          )}
          {s.groupBuyEnabled && (
            <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-orange-100 text-orange-700">👥 GROUP</span>
          )}
          {s.liveShopEnabled && (
            <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-rose-100 text-rose-700">📺 LIVE</span>
          )}
          {s.auctionEnabled && (
            <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-red-100 text-red-700">🔨 AUCTION</span>
          )}
        </div>

        {/* Action buttons preview */}
        <div className="grid grid-cols-2 gap-2 pt-2">
          <button
            disabled
            className="h-8 rounded-lg text-white text-xs font-black inline-flex items-center justify-center gap-1"
            style={{ backgroundColor: theme.accentHex }}
          >
            <Store className="h-3 w-3" /> Visit
          </button>
          <button
            disabled
            className="h-8 rounded-lg bg-slate-100 text-slate-700 text-xs font-black inline-flex items-center justify-center gap-1"
          >
            <MessageCircle className="h-3 w-3" /> Message
          </button>
        </div>

        {isMissing && (
          <div className="mt-2 rounded-lg bg-amber-50 border border-amber-200 p-2 text-[10px] font-bold text-amber-800">
            ⚠️ Basic info missing — customers ko complete profile chahiye
          </div>
        )}
      </div>
    </div>
  );
}
