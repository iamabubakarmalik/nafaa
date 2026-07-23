import { NavLink } from 'react-router-dom';
import { Star, Clock, MapPin, Sparkles, Zap } from 'lucide-react';
import { Badge } from '@shared/ui/Badge';

const VERIFY_CONFIG = {
  BRONZE:   { emoji: '🥉', label: 'Bronze',   bg: 'bg-amber-100 text-amber-800' },
  SILVER:   { emoji: '🥈', label: 'Silver',   bg: 'bg-slate-200 text-slate-700' },
  GOLD:     { emoji: '🥇', label: 'Gold',     bg: 'bg-yellow-100 text-yellow-800' },
  PLATINUM: { emoji: '💎', label: 'Platinum', bg: 'bg-cyan-100 text-cyan-800' },
};

export function ShopCard({ shop }: { shop: any }) {
  const verify = VERIFY_CONFIG[shop.verificationLevel as keyof typeof VERIFY_CONFIG];
  return (
    <NavLink
      to={`/market/shops/${shop.slug}`}
      className="group flex-shrink-0 w-64 rounded-2xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-soft hover:shadow-soft-lg hover:-translate-y-1 transition-all overflow-hidden"
    >
      {/* Cover */}
      <div className="relative h-32 bg-gradient-to-br from-brand-100 via-emerald-100 to-teal-100 dark:from-brand-900/30 dark:via-emerald-900/30 dark:to-teal-900/30 overflow-hidden">
        {shop.coverUrl ? (
          <img
            src={shop.coverUrl}
            alt=""
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-5xl opacity-30">
            🏪
          </div>
        )}
        {/* Verify badge */}
        {verify && (
          <span className={`absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-extrabold ${verify.bg} shadow`}>
            {verify.emoji} {verify.label}
          </span>
        )}
        {/* Distance */}
        {shop.distanceKm != null && (
          <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded-full bg-white/95 dark:bg-neutral-900/95 backdrop-blur text-[10px] font-extrabold text-slate-800 dark:text-white shadow flex items-center gap-1">
            <MapPin className="h-2.5 w-2.5" />
            {shop.distanceKm.toFixed(1)} km
          </span>
        )}
        {/* Special badges */}
        {(shop.bargainEnabled || shop.groupBuyEnabled) && (
          <div className="absolute bottom-2 right-2 flex gap-1">
            {shop.bargainEnabled && (
              <span className="px-1.5 py-0.5 rounded-md bg-purple-500 text-white text-[9px] font-extrabold shadow">
                💰 Bargain
              </span>
            )}
            {shop.groupBuyEnabled && (
              <span className="px-1.5 py-0.5 rounded-md bg-orange-500 text-white text-[9px] font-extrabold shadow">
                👥 Group
              </span>
            )}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3">
        <div className="flex items-start gap-2 mb-2">
          {shop.logoUrl && (
            <img
              src={shop.logoUrl}
              alt=""
              className="h-10 w-10 rounded-xl object-cover border-2 border-white dark:border-neutral-800 shadow-md -mt-6"
            />
          )}
          <div className="flex-1 min-w-0">
            <h3 className="font-extrabold text-slate-900 dark:text-white text-sm truncate leading-tight">
              {shop.publicName}
            </h3>
            {shop.tagline && (
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                {shop.tagline}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between text-[11px]">
          <div className="flex items-center gap-1">
            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
            <span className="font-extrabold text-slate-800 dark:text-white">
              {shop.ratingAverage?.toFixed(1) || '—'}
            </span>
            <span className="text-slate-500 dark:text-slate-400">
              ({shop.ratingCount || 0})
            </span>
          </div>
          {shop.estimatedDeliveryMinutes && (
            <div className="flex items-center gap-1 text-slate-600 dark:text-slate-400">
              <Clock className="h-3 w-3" />
              <span className="font-bold">{shop.estimatedDeliveryMinutes} min</span>
            </div>
          )}
        </div>

        {shop.deliveryFee != null && (
          <div className="mt-2 pt-2 border-t border-slate-100 dark:border-neutral-800 flex items-center justify-between text-[10px]">
            <span className="text-slate-500 dark:text-slate-400 font-bold">
              Delivery {shop.deliveryFee > 0 ? `PKR ${shop.deliveryFee}` : 'FREE'}
            </span>
            {shop.currentlyOpen === false && (
              <span className="text-rose-600 font-extrabold">🔒 Closed</span>
            )}
          </div>
        )}
      </div>
    </NavLink>
  );
}
