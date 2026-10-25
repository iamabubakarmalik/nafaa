/**
 * Site header (server component): skip link, logo, mega menu (desktop),
 * theme toggle, the three CTAs from settings `site` (log in → appUrl, demo →
 * demoPath, get started → signupUrl) and the mobile nav island. Sticky with
 * a translucent background (theme.css `.site-header`).
 *
 * `locale` picks the interface words (lib/i18n/shell); the Urdu layout
 * passes menus and links already moved under /ur. `paired` lists the pages
 * published in both languages, for the language link.
 */
import Link from 'next/link';
import type { SiteLayout } from '@/lib/cms/client';
import { LOGO_BOWL, LOGO_DOT, LOGO_LOCKUP, LOGO_WORDMARK } from '@/lib/brand/logo';
import { buttonClasses } from '@/components/ui/Button';
import { cx } from '@/components/ui/cx';
import { pathIn, shellStrings, type SiteLocale } from '@/lib/i18n/shell';
import { LanguageLink } from './LanguageSwitch';
import { MegaMenu } from './MegaMenu';
import { MegaMenuController } from './MegaMenuController';
import { MobileNav, type HeaderCta } from './MobileNav';
import { ThemeToggle } from './ThemeToggle';
import type { NavItem } from './nav';

/**
 * The horizontal Nafaa logo (brand/logo/svg/nafaa-logo.svg), inline so it
 * switches to the dark-background colours with the theme (theme.css).
 */
export function Logo({ name, className, locale = 'en' }: { name: string; className?: string; locale?: SiteLocale }) {
  return (
    <Link href={pathIn(locale, '/')} className={cx('inline-flex items-center rounded-md', className)} aria-label={shellStrings(locale).homeLabel(name)}>
      <svg
        viewBox={`0 0 ${LOGO_LOCKUP.width} ${LOGO_LOCKUP.height}`}
        width={113}
        height={36}
        className="h-9 w-auto"
        aria-hidden="true"
        focusable="false"
      >
        <g transform={LOGO_LOCKUP.markTransform}>
          <path d={LOGO_BOWL} className="nafaa-logo-bowl" />
          <path d={LOGO_DOT} className="nafaa-logo-dot" />
        </g>
        <path transform={LOGO_LOCKUP.wordTransform} d={LOGO_WORDMARK} className="nafaa-logo-word" />
      </svg>
    </Link>
  );
}

export function headerCtas(layout: SiteLayout, locale: SiteLocale = 'en'): HeaderCta[] {
  const { site } = layout;
  const t = shellStrings(locale);
  return [
    { label: t.getStarted, href: site.signupUrl, variant: 'primary' },
    { label: t.bookDemo, href: site.demoPath, variant: 'secondary', track: 'cta_click' },
    { label: t.logIn, href: site.appUrl, variant: 'ghost', track: 'cta_click' },
  ];
}

export function SiteHeader({ layout, locale = 'en', paired }: { layout: SiteLayout; locale?: SiteLocale; paired: readonly string[] }) {
  const { site, menus } = layout;
  const header = menus.header as NavItem[];
  const mobile = (menus.mobile.length ? menus.mobile : menus.header) as NavItem[];
  const ctas = headerCtas(layout, locale);
  const t = shellStrings(locale);

  return (
    <>
      <a
        href="#main"
        className="sr-only z-[60] rounded-md bg-surface px-4 py-2 text-fg-strong shadow-e2 focus:not-sr-only focus:fixed focus:start-3 focus:top-3"
      >
        {t.skipToContent}
      </a>
      <header className="site-header sticky top-0 z-40 border-b border-line/80" data-track-area="header">
        <div className="relative mx-auto box-content flex h-[var(--header-h)] max-w-wide items-center gap-3 px-gutter 2xl:gap-5">
          <Logo name={site.name} className="shrink-0" locale={locale} />
          <div className="flex min-w-0 flex-1 justify-center">
            <MegaMenu items={header} locale={locale} />
          </div>
          <div className="flex items-center gap-1.5">
            <LanguageLink paired={paired} />
            <ThemeToggle />
            <a
              href={site.appUrl}
              data-track="cta_click"
              data-track-label="Header: Log in"
              className={buttonClasses({ variant: 'ghost', size: 'sm', className: 'hidden xl:inline-flex' })}
            >
              {t.logIn}
            </a>
            <Link
              href={site.demoPath}
              data-track="cta_click"
              data-track-label="Header: Book a demo"
              className={buttonClasses({ variant: 'secondary', size: 'sm', className: 'hidden md:inline-flex lg:hidden xl:inline-flex' })}
            >
              {t.bookDemo}
            </Link>
            <a
              href={site.signupUrl}
              data-track-label="Header: Get started"
              className={buttonClasses({ variant: 'primary', size: 'sm', className: 'hidden sm:inline-flex' })}
            >
              {t.getStarted}
            </a>
            <MobileNav items={mobile} ctas={ctas} />
          </div>
        </div>
      </header>
      {header.length ? <MegaMenuController /> : null}
    </>
  );
}
