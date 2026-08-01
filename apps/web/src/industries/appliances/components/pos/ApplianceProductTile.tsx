import { Home, Zap, Shield, Star, HardHat, Truck } from 'lucide-react';
import { formatPKR } from '@core/lib/format';
import type { Product } from '@modules/inventory/products/api/products.api';

interface Props {
  product: Product;
  profile?: any;
  cart: any[];
  hidePrices: boolean;
  onClick: () => void;
}

export function ApplianceProductTile({ product: p, profile, cart, hidePrices, onClick }: Props) {
  const inCart = cart.filter((l: any) => l.productId === p.id);
  const cartQty = inCart.reduce((s: number, l: any) => s + l.quantity, 0);
  const out = p.stock <= 0;
  const low = !out && p.stock <= (p.lowStockAlert || 0);
  const img = p.images?.[0]?.url;

  return (
    <button onClick={onClick} disabled={out}
      className={['group relative text-left rounded-2xl border-4 overflow-hidden transition-all active:scale-95',
        out ? 'border-slate-200 bg-slate-100 opacity-50 cursor-not-allowed'
          : cartQty > 0 ? 'border-emerald-500 bg-emerald-50 shadow-xl ring-4 ring-emerald-200'
            : 'border-slate-200 bg-white hover:border-cyan-400 hover:shadow-xl hover:-translate-y-1'].join(' ')}>
      {cartQty > 0 && (
        <div className="absolute -top-2 -right-2 min-w-[32px] h-8 sm:min-w-[36px] sm:h-9 px-2 rounded-full bg-emerald-600 text-white text-sm sm:text-base font-extrabold flex items-center justify-center shadow-xl ring-4 ring-white z-10 tabular-nums">
          {cartQty}
        </div>
      )}
      <div className="aspect-square bg-slate-100 overflow-hidden relative">
        {img ? (
          <img src={img} alt={p.name} loading="lazy" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-cyan-50 to-teal-50">
            <Home className="h-12 w-12 text-cyan-300" />
          </div>
        )}
        {out && <div className="absolute inset-0 bg-slate-900/60 flex items-center justify-center"><span className="px-3 py-1 rounded-xl bg-rose-600 text-white text-xs sm:text-sm font-extrabold shadow-lg">OUT</span></div>}
        {low && !out && <div className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded-md bg-amber-500 text-white text-[10px] font-extrabold shadow-lg animate-pulse">LOW</div>}
        {p.isFeatured && !out && <div className="absolute top-1.5 left-1.5 h-7 w-7 rounded-full bg-amber-500 flex items-center justify-center shadow-lg"><Star className="h-3.5 w-3.5 fill-white text-white" /></div>}
        {profile?.isInverter && !out && (
          <div className="absolute bottom-1.5 left-1.5 h-6 px-1.5 rounded-md bg-blue-600 flex items-center gap-1 text-white text-[9px] font-extrabold shadow-lg">
            <Zap className="h-2.5 w-2.5" /> INVERTER
          </div>
        )}
        {profile?.requiresInstallation && !out && (
          <div className="absolute bottom-1.5 right-1.5 h-6 w-6 rounded-md bg-amber-600 flex items-center justify-center text-white shadow-lg">
            <HardHat className="h-3 w-3" />
          </div>
        )}
      </div>
      <div className="p-2 sm:p-3">
        <div className="font-extrabold text-slate-900 text-sm sm:text-base line-clamp-2 leading-tight min-h-[2.25rem] sm:min-h-[2.5rem]">{p.name}</div>
        {profile?.capacity && (
          <div className="text-[10px] font-mono text-cyan-700 font-extrabold truncate mt-0.5">{profile.capacity}</div>
        )}
        <div className="mt-1.5 sm:mt-2 flex items-end justify-between gap-1">
          <div>
            <div className="text-lg sm:text-2xl font-extrabold text-emerald-700 leading-none tabular-nums">{hidePrices ? '•••' : formatPKR(p.price)}</div>
            {profile?.warrantyMonths ? (
              <div className="text-[9px] font-extrabold text-cyan-700 mt-0.5 inline-flex items-center gap-0.5">
                <Shield className="h-2 w-2" /> {profile.warrantyMonths}m
              </div>
            ) : null}
          </div>
          <div className={['text-xs sm:text-sm font-extrabold tabular-nums shrink-0', out ? 'text-rose-700' : low ? 'text-amber-700' : 'text-slate-600'].join(' ')}>
            {p.stock}
          </div>
        </div>
        {profile?.freeDelivery && (
          <div className="mt-1 text-[9px] font-extrabold text-blue-700 inline-flex items-center gap-0.5">
            <Truck className="h-2.5 w-2.5" /> Free Delivery
          </div>
        )}
      </div>
    </button>
  );
}
