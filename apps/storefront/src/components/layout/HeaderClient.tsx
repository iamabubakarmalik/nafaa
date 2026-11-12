'use client';

/** Interactive header parts: mobile menu drawer, search, account and cart buttons, language switch. */
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, Menu, Search, ShoppingBag, User, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { MenuItem } from '@/lib/api';
import { useStore } from '../providers/StoreProvider';

export function LangSwitch({ className = '' }: { className?: string }) {
  const { shop, t } = useStore();
  const path = usePathname() || '/';
  if (shop.langs.length < 2) return null;
  const toUr = shop.lang === 'en';
  const bare = path.replace(/^\/ur(?=\/|$)/, '') || '/';
  const target = toUr ? (bare === '/' ? '/ur' : `/ur${bare}`) : bare;
  return (
    <a href={target} className={`text-[13px] font-semibold ${toUr ? 'font-urdu' : ''} ${className}`} hrefLang={toUr ? 'ur' : 'en'}>
      {t('lang.switch')}
    </a>
  );
}

export function HeaderActions({ showSearch, showAccount }: { showSearch: boolean; showAccount: boolean }) {
  const { cart, setDrawer, setSearch, t, href } = useStore();
  const count = cart?.itemCount ?? 0;
  return (
    <div className="flex items-center gap-0.5">
      <LangSwitch className="me-2 hidden md:inline" />
      {showSearch && (
        <button type="button" className="icon-btn" aria-label={t('nav.search')} onClick={() => setSearch(true)}>
          <Search size={21} strokeWidth={1.8} />
        </button>
      )}
      {showAccount && (
        <Link href={href('/account')} className="icon-btn hidden sm:inline-flex" aria-label={t('nav.account')}>
          <User size={21} strokeWidth={1.8} />
        </Link>
      )}
      <button type="button" className="icon-btn relative" aria-label={t('nav.cart')} onClick={() => setDrawer(true)}>
        <ShoppingBag size={21} strokeWidth={1.8} />
        {count > 0 && (
          <span className="absolute end-0.5 top-0.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-primary px-1 text-[10.5px] font-bold text-primary-fg ring-2 ring-bg">
            {count > 99 ? '99+' : count}
          </span>
        )}
      </button>
    </div>
  );
}

export function MobileMenuButton({ menu }: { menu: MenuItem[] }) {
  const [open, setOpen] = useState(false);
  const [sub, setSub] = useState<MenuItem | null>(null);
  const { t, href, shop } = useStore();
  const path = usePathname();
  useEffect(() => {
    setOpen(false);
    setSub(null);
  }, [path]);
  useEffect(() => {
    document.documentElement.style.overflow = open ? 'hidden' : '';
  }, [open]);
  const items = sub?.children ?? menu;
  return (
    <>
      <button type="button" className="icon-btn -ms-2 lg:hidden" aria-label={t('nav.menu')} onClick={() => setOpen(true)}>
        <Menu size={22} strokeWidth={1.8} />
      </button>
      {open && (
        <div className="fixed inset-0 z-[60] lg:hidden" role="dialog" aria-modal="true">
          <button type="button" aria-label={t('nav.close')} className="absolute inset-0 animate-fade-in bg-black/40" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 start-0 flex w-[86%] max-w-sm animate-slide-in-left flex-col bg-bg text-fg shadow-pop rtl:animate-slide-in">
            <div className="flex h-16 items-center justify-between border-b border-line px-4">
              {sub ? (
                <button type="button" className="flex items-center gap-1 text-[15px] font-semibold" onClick={() => setSub(null)}>
                  <ChevronRight size={18} className="rotate-180 rtl:rotate-0" /> {sub.title}
                </button>
              ) : (
                <span className="font-heading text-lg font-semibold">{shop.name}</span>
              )}
              <button type="button" className="icon-btn" aria-label={t('nav.close')} onClick={() => setOpen(false)}>
                <X size={22} />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto px-2 py-2">
              {sub && (
                <Link href={href(sub.url)} className="flex items-center justify-between rounded-[10px] px-3 py-3.5 text-[16px] font-semibold">
                  {t('common.viewAll')}
                </Link>
              )}
              {items.map((m) =>
                m.children?.length ? (
                  <button key={m.id} type="button" onClick={() => setSub(m)} className="flex w-full items-center justify-between rounded-[10px] px-3 py-3.5 text-start text-[16px] font-medium hover:bg-surface">
                    {m.title}
                    <ChevronRight size={18} className="text-muted rtl:rotate-180" />
                  </button>
                ) : (
                  <Link key={m.id} href={href(m.url)} className="block rounded-[10px] px-3 py-3.5 text-[16px] font-medium hover:bg-surface">
                    {m.title}
                  </Link>
                ),
              )}
            </nav>
            <div className="flex items-center justify-between border-t border-line px-5 py-4">
              <Link href={href('/account')} className="flex items-center gap-2 text-[15px] font-medium">
                <User size={19} /> {t('nav.account')}
              </Link>
              <LangSwitch />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
