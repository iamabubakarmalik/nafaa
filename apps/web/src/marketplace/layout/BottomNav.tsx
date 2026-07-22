import { NavLink } from 'react-router-dom';
import { Home, Search, ShoppingBag, Package, User } from 'lucide-react';
import { useMarketplaceCartStore } from '../_shared/stores/marketplaceCart.store';

export function BottomNav() {
  const cartCount = useMarketplaceCartStore((s) => s.totalItems());

  const items = [
    { to: '/market', icon: Home, label: 'Home', end: true },
    { to: '/market/search', icon: Search, label: 'Search' },
    { to: '/market/cart', icon: ShoppingBag, label: 'Cart', badge: cartCount },
    { to: '/market/orders', icon: Package, label: 'Orders' },
    { to: '/market/profile', icon: User, label: 'Profile' },
  ];

  return (
    <nav className="fixed bottom-0 inset-x-0 bg-white border-t border-slate-200 shadow-lg z-40">
      <div className="max-w-5xl mx-auto grid grid-cols-5">
        {items.map(({ to, icon: Icon, label, end, badge }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center py-2.5 gap-0.5 relative ${
                isActive ? 'text-emerald-600' : 'text-slate-500'
              }`
            }
          >
            <Icon className="h-5 w-5" />
            <span className="text-[10px] font-bold">{label}</span>
            {badge && badge > 0 ? (
              <span className="absolute top-1 right-1/4 bg-rose-600 text-white text-[9px] font-bold rounded-full h-4 min-w-4 px-1 flex items-center justify-center">
                {badge}
              </span>
            ) : null}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
