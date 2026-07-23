import { NavLink } from 'react-router-dom';
import { Home, Search, ShoppingBag, Package, User } from 'lucide-react';
import { useMarketplaceCartStore } from '@/stores/marketplaceCart.store';
import { cn } from '@lib/cn';

export function BottomNav() {
  const cartCount = useMarketplaceCartStore((s) => s.totalItems());

  const items = [
    { to: '/market', icon: Home, label: 'Home', end: true },
    { to: '/search', icon: Search, label: 'Search' },
    { to: '/cart', icon: ShoppingBag, label: 'Cart', badge: cartCount },
    { to: '/orders', icon: Package, label: 'Orders' },
    { to: '/profile', icon: User, label: 'Profile' },
  ];

  return (
    <nav className="fixed bottom-0 inset-x-0 bg-white/95 dark:bg-neutral-950/95 backdrop-blur-md border-t border-slate-200 dark:border-neutral-800 shadow-lg z-40 safe-bottom">
      <div className="max-w-6xl mx-auto grid grid-cols-5">
        {items.map(({ to, icon: Icon, label, end, badge }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center justify-center py-2.5 gap-1 relative transition-colors',
                isActive
                  ? 'text-brand-600 dark:text-brand-400'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200',
              )
            }
          >
            {({ isActive }) => (
              <>
                <div className="relative">
                  {isActive && (
                    <div className="absolute -inset-2 rounded-2xl bg-brand-100 dark:bg-brand-900/40 -z-0 animate-scale-in" />
                  )}
                  <Icon className={cn('h-5 w-5 relative', isActive && 'fill-brand-100 dark:fill-brand-900/40')} />
                  {badge && badge > 0 && (
                    <span className="absolute -top-2 -right-2 bg-rose-500 text-white text-[9px] font-extrabold rounded-full h-4 min-w-4 px-1 flex items-center justify-center ring-2 ring-white dark:ring-neutral-950">
                      {badge > 99 ? '99+' : badge}
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-extrabold">{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
