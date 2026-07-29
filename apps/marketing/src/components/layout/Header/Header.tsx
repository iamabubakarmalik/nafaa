'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, ChevronDown } from 'lucide-react';
import { useLocale } from '@/components/providers/LocaleProvider';
import { LogoWordmark } from '@/components/brand/Logo';
import { Button } from '@/components/primitives/Button';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { LangSwitcher } from '@/components/ui/LangSwitcher';
import { MegaMenu } from './MegaMenu';
import { MobileNav } from './MobileNav';
import { TopBar } from './TopBar';
import { CommandPalette } from '@/components/features/CommandPalette';
import { VoiceSearch } from '@/components/features/VoiceSearch';
import { cn } from '@/lib/cn';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://app.nafaa.pk';

type MegaKey = 'product' | 'industries' | 'integrations' | 'resources' | null;

export function Header() {
  const { t, locale } = useLocale();
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeMega, setActiveMega] = useState<MegaKey>(null);
  const closeTimer = useRef<number | null>(null);
  const isUr = locale === 'ur';

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
    setActiveMega(null);
  }, [pathname]);

  const openMega = (k: MegaKey) => {
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    setActiveMega(k);
  };
  const scheduleClose = () => {
    closeTimer.current = window.setTimeout(() => setActiveMega(null), 150);
  };
  const closeMega = () => setActiveMega(null);

  const megaItems: Array<{ key: MegaKey; label: string }> = [
    { key: 'product', label: t('nav.product') },
    { key: 'industries', label: t('nav.industries') },
    { key: 'integrations', label: t('nav.integrations') },
    { key: 'resources', label: t('nav.resources') },
  ];

  const simpleItems = [
    { href: '/marketplace', label: t('nav.marketplace') },
    { href: '/pricing', label: t('nav.pricing') },
  ];

  return (
    <>
      <TopBar />

      <header
        className={cn(
          'sticky top-0 z-[60] transition-all duration-500 ease-out-expo',
          scrolled
            ? 'glass-strong shadow-sm border-b border-ink-100/50 dark:border-ink-700/40'
            : 'bg-transparent border-b border-transparent',
        )}
        onMouseLeave={scheduleClose}
      >
        <div className="container-page">
          <div className={cn('flex items-center justify-between transition-all duration-300', scrolled ? 'h-16' : 'h-18')}>
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2.5 shrink-0" onMouseEnter={closeMega}>
              <LogoWordmark size={scrolled ? 32 : 36} />
            </Link>

            {/* Desktop nav */}
            <nav className="hidden lg:flex items-center gap-1">
              {megaItems.map((item) => (
                <button
                  key={item.key}
                  onMouseEnter={() => openMega(item.key)}
                  onClick={() => setActiveMega(activeMega === item.key ? null : item.key)}
                  className={cn(
                    'inline-flex items-center gap-1 px-4 h-10 rounded-xl text-sm font-semibold',
                    'text-ink-700 dark:text-ink-200 hover:text-ink-900 dark:hover:text-white',
                    'hover:bg-ink-100/70 dark:hover:bg-ink-800/70',
                    'transition-all duration-300 ease-out-expo',
                    activeMega === item.key && 'bg-ink-100/70 dark:bg-ink-800/70 text-ink-900 dark:text-white',
                    isUr && 'font-urdu text-base',
                  )}
                >
                  {item.label}
                  <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', activeMega === item.key && 'rotate-180')} />
                </button>
              ))}
              {simpleItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onMouseEnter={closeMega}
                  className={cn(
                    'inline-flex items-center px-4 h-10 rounded-xl text-sm font-semibold',
                    'text-ink-700 dark:text-ink-200 hover:text-ink-900 dark:hover:text-white',
                    'hover:bg-ink-100/70 dark:hover:bg-ink-800/70 transition-colors',
                    pathname === item.href && 'text-brand-600 dark:text-brand-400',
                    isUr && 'font-urdu text-base',
                  )}
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            {/* Right actions */}
            <div className="flex items-center gap-2" onMouseEnter={closeMega}>
              <CommandPalette />
              <VoiceSearch />
              <div className="hidden sm:flex items-center gap-2">
                <LangSwitcher />
                <ThemeToggle />
              </div>
              <div className="hidden md:flex items-center gap-2 ml-1">
                <Button variant="ghost" size="sm" href={`${APP_URL}/login`}>
                  {t('nav.login')}
                </Button>
                <Button size="sm" href={`${APP_URL}/register`}>
                  {t('nav.signup')}
                </Button>
              </div>
              <button
                onClick={() => setMobileOpen(true)}
                className="lg:hidden h-10 w-10 rounded-xl bg-ink-100/70 dark:bg-ink-800/70 flex items-center justify-center"
                aria-label={t('common.openMenu')}
              >
                <Menu className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Mega menus */}
        <MegaMenu activeMenu={activeMega} onClose={closeMega} />
      </header>

      <MobileNav open={mobileOpen} onClose={() => setMobileOpen(false)} />
    </>
  );
}
