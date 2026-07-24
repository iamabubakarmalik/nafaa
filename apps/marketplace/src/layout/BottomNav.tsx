import { NavLink } from 'react-router-dom';
import { Home, Search, ShoppingBag, User, Bot } from 'lucide-react';
import { useCartStore } from '@/stores/cart.store';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/cn';

export function BottomNav() {
  const { t } = useTranslation();
  const cartCount = useCartStore((s) => s.totalItems);

  const items = [
    { to: '/', icon: Home, label: t('nav.home'), end: true },
    { to: '/search', icon: Search, label: t('nav.search') },
    { to: '/ai-assistant', icon: Bot, label: 'AI', highlight: true },
    { to: '/cart', icon: ShoppingBag, label: t('nav.cart'), badge: cartCount },
    { to: '/profile', icon: User, label: t('nav.profile') },
  ];

  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 glass border-t border-border z-40 safe-bottom">
      <div className="max-w-md mx-auto grid grid-cols-5">
        {items.map(({ to, icon: Icon, label, end, badge, highlight }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center justify-center py-2.5 gap-1 relative transition-colors',
                isActive
                  ? 'text-brand-600 dark:text-brand-400'
                  : 'text-content-subtle hover:text-content',
              )
            }
          >
            {({ isActive }) => (
              <>
                <div className="relative">
                  {isActive && !highlight && (
                    <div className="absolute -inset-2 rounded-2xl bg-brand-100 dark:bg-brand-900/40 -z-0 animate-scale-in" />
                  )}
                  {highlight ? (
                    <div className="h-9 w-9 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg -mt-1">
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                  ) : (
                    <Icon className={cn('h-5 w-5 relative', isActive && 'fill-brand-100 dark:fill-brand-900/40')} />
                  )}
                  {badge != null && badge > 0 && (
                    <span className="absolute -top-2 -right-2 bg-danger text-white text-2xs font-black rounded-full h-4 min-w-4 px-1 flex items-center justify-center ring-2 ring-surface">
                      {badge > 99 ? '99+' : badge}
                    </span>
                  )}
                </div>
                <span className={cn('text-2xs font-black', highlight && 'text-purple-600 dark:text-purple-400')}>
                  {label}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
