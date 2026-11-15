'use client';
/**
 * Top bar: logo, location, search (desktop), language, theme, cart and
 * account. On phones the search sits under the bar on the home page and the
 * bottom navigation carries cart and account.
 */
import { Search, ShoppingCart, UserRound } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { useApp } from '@/components/providers/AppProvider';
import { LocationChip } from './LocationChip';
import { Logo } from './Logo';
import { LangMenu, ThemeToggle } from './Prefs';

export function SearchBox({ className, autoFocus, initial = '' }: { className?: string; autoFocus?: boolean; initial?: string }) {
  const { t, href } = useApp();
  const router = useRouter();
  const [q, setQ] = useState(initial);
  return (
    <form
      role="search"
      className={className}
      onSubmit={(e) => {
        e.preventDefault();
        const v = q.trim();
        router.push(v ? `${href('/search')}?q=${encodeURIComponent(v)}` : href('/search'));
      }}
    >
      <label className="flex h-11 items-center gap-2 rounded-full bg-gray-100 px-4 ring-brand-500 focus-within:bg-white focus-within:ring-2">
        <Search className="h-4 w-4 shrink-0 text-gray-500" aria-hidden />
        <input
          type="search"
          value={q}
          autoFocus={autoFocus}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t('common.searchPlaceholder')}
          aria-label={t('common.search')}
          className="h-full w-full bg-transparent text-sm text-gray-900 placeholder:text-gray-500 focus:outline-none"
        />
      </label>
    </form>
  );
}

export function Header() {
  const { t, href, cartCount, signedIn } = useApp();
  const path = usePathname() || '/';
  const isHome = /^\/(ur|roman)?\/?$/.test(path);
  return (
    <header className="sticky top-0 z-40 border-b border-shell-line bg-shell-bar/95 backdrop-blur supports-[backdrop-filter]:bg-shell-bar/80">
      <div className="container-page flex h-16 items-center gap-3">
        <Logo href={href('/')} label={t('common.appName')} />
        <LocationChip className="ms-1 max-w-[40vw] md:max-w-[220px]" />
        <SearchBox className="mx-auto hidden w-full max-w-md md:block" />
        <div className="ms-auto flex items-center gap-0.5 md:ms-0">
          <LangMenu />
          <ThemeToggle className="hidden sm:grid" />
          <Link href={href('/cart')} aria-label={t('nav.cart')} className="relative hidden h-10 w-10 place-items-center rounded-full text-gray-700 hover:bg-gray-100 md:grid">
            <ShoppingCart className="h-5 w-5" />
            {cartCount > 0 && <span className="num absolute -end-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-brand-600 px-1 text-2xs font-bold text-white">{cartCount}</span>}
          </Link>
          <Link href={href(signedIn ? '/account' : '/login')} aria-label={t('nav.account')} className="hidden h-10 items-center gap-1.5 whitespace-nowrap rounded-full px-3 text-sm font-semibold text-gray-700 hover:bg-gray-100 md:flex">
            <UserRound className="h-5 w-5" />
            {signedIn ? t('nav.account') : t('common.signIn')}
          </Link>
        </div>
      </div>
      {isHome && (
        <div className="container-page pb-3 md:hidden">
          <SearchBox />
        </div>
      )}
    </header>
  );
}
