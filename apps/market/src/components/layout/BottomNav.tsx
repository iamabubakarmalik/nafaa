'use client';
/** Phone bottom navigation: Home, Search, Cart, Orders, Account. */
import { House, ReceiptText, Search, ShoppingCart, UserRound } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useApp } from '@/components/providers/AppProvider';
import { cn } from '@/components/ui';

export function BottomNav() {
  const { t, href, cartCount } = useApp();
  const path = (usePathname() || '/').replace(/^\/(ur|roman)(?=\/|$)/, '') || '/';
  const items = [
    { to: '/', label: t('nav.home'), Icon: House, on: path === '/' },
    { to: '/search', label: t('nav.search'), Icon: Search, on: path.startsWith('/search') },
    { to: '/cart', label: t('nav.cart'), Icon: ShoppingCart, on: path.startsWith('/cart') || path.startsWith('/checkout'), badge: cartCount },
    { to: '/orders', label: t('nav.orders'), Icon: ReceiptText, on: path.startsWith('/orders') },
    { to: '/account', label: t('nav.account'), Icon: UserRound, on: path.startsWith('/account') || path.startsWith('/login') },
  ];
  return (
    <nav aria-label={t('common.appName')} className="fixed inset-x-0 bottom-0 z-40 border-t border-shell-line bg-shell-bar/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
      <ul className="grid h-16 grid-cols-5">
        {items.map(({ to, label, Icon, on, badge }) => (
          <li key={to}>
            <Link href={href(to)} aria-current={on ? 'page' : undefined} className={cn('flex h-full flex-col items-center justify-center gap-0.5 text-2xs font-semibold', on ? 'text-brand-700' : 'text-gray-500')}>
              <span className="relative">
                <Icon className={cn('h-6 w-6', on && 'stroke-[2.4]')} aria-hidden />
                {!!badge && <span className="num absolute -end-2 -top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-brand-600 px-1 text-[10px] font-bold text-white">{badge}</span>}
              </span>
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
