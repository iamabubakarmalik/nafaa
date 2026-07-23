import { NavLink } from 'react-router-dom';
import { Heart, Star, Zap } from 'lucide-react';

export function ProductCard({ product, onWishlist }: { product: any; onWishlist?: () => void }) {
  const discount = product.compareAtPrice
    ? Math.round(((product.compareAtPrice - product.publicPrice) / product.compareAtPrice) * 100)
    : 0;

  return (
    <NavLink
      to={`/market/products/${product.productId}`}
      className="group flex-shrink-0 w-40 rounded-2xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-soft hover:shadow-soft-lg hover:-translate-y-1 transition-all overflow-hidden"
    >
      {/* Image */}
      <div className="relative aspect-square bg-slate-100 dark:bg-neutral-800 overflow-hidden">
        {product.publicImages?.[0] ? (
          <img
            src={product.publicImages[0]}
            alt={product.publicName}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-3xl opacity-30">📦</div>
        )}

        {discount > 0 && (
          <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-extrabold shadow-md">
            -{discount}%
          </span>
        )}

        {product.bargainEnabled && (
          <span className="absolute bottom-2 left-2 px-1.5 py-0.5 rounded-md bg-purple-500/90 backdrop-blur text-white text-[9px] font-extrabold shadow">
            💰 Bargain
          </span>
        )}

        <button
          onClick={(e) => { e.preventDefault(); onWishlist?.(); }}
          className="absolute top-2 right-2 h-8 w-8 rounded-full bg-white/95 dark:bg-neutral-900/95 backdrop-blur hover:bg-white flex items-center justify-center shadow transition"
        >
          <Heart className={`h-4 w-4 ${product.isInWishlist ? 'fill-rose-500 text-rose-500' : 'text-slate-500'}`} />
        </button>
      </div>

      <div className="p-2.5">
        <h3 className="font-bold text-slate-900 dark:text-white text-xs line-clamp-2 leading-tight min-h-[2rem]">
          {product.publicName}
        </h3>
        <div className="mt-1.5 flex items-baseline gap-1.5">
          <span className="font-extrabold text-brand-700 dark:text-brand-400 text-sm">
            Rs {Number(product.publicPrice).toFixed(0)}
          </span>
          {product.compareAtPrice && (
            <span className="text-[10px] text-slate-400 line-through">
              Rs {Number(product.compareAtPrice).toFixed(0)}
            </span>
          )}
        </div>
        {product.ratingCount > 0 && (
          <div className="mt-1 flex items-center gap-1 text-[10px]">
            <Star className="h-2.5 w-2.5 fill-yellow-400 text-yellow-400" />
            <span className="font-bold text-slate-700 dark:text-slate-300">
              {product.ratingAverage?.toFixed(1)}
            </span>
            <span className="text-slate-400">({product.ratingCount})</span>
          </div>
        )}
      </div>
    </NavLink>
  );
}
