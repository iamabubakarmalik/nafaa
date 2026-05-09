'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X, Sparkles, ChevronDown } from 'lucide-react';
import { useLocale } from '@/components/providers/LocaleProvider';
import { Button } from '@/components/ui/Button';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { LangSwitcher } from '@/components/ui/LangSwitcher';
import { cn } from '@/lib/cn';
import { Logo } from '@/components/brand/Logo';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:5173';

export function Header() {
  const { t, locale } = useLocale();
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 8);
    handler();
    window.addEventListener('scroll', handler);
    return () => window.removeEventListener('scroll', handler);
  }, []);

  useEffect(() => setMobileOpen(false), [pathname]);

  const links = [
    { href: '/features', label: t('nav.features') },
    { href: '/pricing', label: t('nav.pricing') },
    { href: '/industries', label: t('nav.industries') },
    { href: '/about', label: t('nav.about') },
    { href: '/blog', label: t('nav.blog') },
    { href: '/contact', label: t('nav.contact') },
  ];

  return (
    <>
      <header
        className={cn(
          'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
          scrolled
            ? 'glass shadow-lg shadow-slate-900/5'
            : 'bg-transparent',
        )}
      >
        <div className="container-custom">
          <div className="flex h-16 lg:h-18 items-center justify-between">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2.5 group">
              <Logo size={40} className="drop-shadow-lg" />

              <div className="hidden sm:block">
                <div className={cn('text-xl font-extrabold tracking-tight', locale === 'ur' && 'font-urdu')}>
                  {locale === 'ur' ? 'نفع' : 'Nafaa'}
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 -mt-1 font-medium">
                  Pakistan's #1 POS
                </div>
              </div>
            </Link>

            {/* Desktop nav */}
            <nav className="hidden lg:flex items-center gap-1">
              {links.map((l) => {
                const active = pathname === l.href;
                return (
                  <Link
                    key={l.href}
                    href={l.href}
                    className={cn(
                      'px-4 py-2 rounded-lg text-sm font-semibold transition-colors',
                      active
                        ? 'text-brand-700 dark:text-brand-400 bg-brand-50 dark:bg-brand-950/40'
                        : 'text-slate-700 dark:text-slate-300 hover:text-brand-700 dark:hover:text-brand-400 hover:bg-slate-50 dark:hover:bg-slate-800',
                      locale === 'ur' && 'font-urdu text-base',
                    )}
                  >
                    {l.label}
                  </Link>
                );
              })}
            </nav>

            {/* Right actions */}
            <div className="flex items-center gap-2">
              <div className="hidden sm:flex items-center gap-2">
                <LangSwitcher />
                <ThemeToggle />
              </div>

              <div className="hidden md:flex items-center gap-2">
                <Button variant="ghost" size="sm" href={`${APP_URL}/login`}>
                  {t('nav.login')}
                </Button>
                <Button size="sm" href={`${APP_URL}/register`}>
                  {t('nav.signup')}
                </Button>
              </div>

              <button
                onClick={() => setMobileOpen(true)}
                className="lg:hidden h-10 w-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center"
                aria-label="Open menu"
              >
                <Menu className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[60] lg:hidden">
          <div
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute right-0 top-0 bottom-0 w-[85%] max-w-sm bg-white dark:bg-slate-950 shadow-2xl flex flex-col">
            <div className="flex items-center justify-between px-5 h-16 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-brand-500 to-emerald-600 flex items-center justify-center">
                  <Sparkles className="h-4 w-4 text-white" />
                </div>
                <span className="font-bold">Nafaa</span>
              </div>
              <button
                onClick={() => setMobileOpen(false)}
                className="h-9 w-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto py-4">
              {links.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className={cn(
                    'block px-5 py-3 text-base font-semibold border-l-4',
                    pathname === l.href
                      ? 'border-brand-500 text-brand-700 dark:text-brand-400 bg-brand-50 dark:bg-brand-950/30'
                      : 'border-transparent text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900',
                    locale === 'ur' && 'font-urdu text-lg',
                  )}
                >
                  {l.label}
                </Link>
              ))}
            </nav>

            <div className="border-t border-slate-200 dark:border-slate-800 p-5 space-y-3">
              <div className="flex gap-2">
                <LangSwitcher />
                <ThemeToggle />
              </div>
              <Button variant="secondary" size="md" className="w-full" href={`${APP_URL}/login`}>
                {t('nav.login')}
              </Button>
              <Button size="md" className="w-full" href={`${APP_URL}/register`}>
                {t('nav.signup')}
              </Button>
            </div>
          </aside>
        </div>
      )}

      {/* Spacer */}
      <div className="h-16 lg:h-18" />
    </>
  );
}
