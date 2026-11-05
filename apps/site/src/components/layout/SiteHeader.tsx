/**
 * Site header (server component): skip link, logo, the five primary
 * sections with their mega panels, the language and theme menu, Log in,
 * Book a demo and Start free trial, and the mobile menu button.
 *
 * - header/model.ts shapes the CMS `header` menu into the sections;
 *   header/render.ts writes the panels as lean server HTML (every link is
 *   crawlable); header/HeaderBehavior.tsx adds the behaviour.
 * - Sticky, with glass and a hairline once the page scrolls, hidden while
 *   scrolling down and back on the way up (transform only, no layout shift).
 * - `locale` picks the interface words (lib/i18n/shell); the Urdu layout
 *   passes menus and links already moved under /ur. `paired` lists the pages
 *   published in both languages, for the language menu.
 */
import Link from 'next/link';
import type { SiteLayout } from '@/lib/cms/client';
import { cx } from '@/components/ui/cx';
import { pathIn, shellStrings, type SiteLocale } from '@/lib/i18n/shell';
import { LOGO_SPRITE } from './header/assets';
import { HeaderBehavior, HeaderTools, MobileMenuButton } from './header/HeaderBehavior';
import { headerModel } from './header/model';
import { navHtml } from './header/render';
import { whatsappHref, type NavItem } from './nav';
import './header/header.css';

/**
 * The horizontal Nafaa logo from the cached logo sprite (public/menu/logo.svg).
 * Its colours come from CSS custom properties, so it follows the theme.
 */
export function Logo({ name, className, locale = 'en' }: { name: string; className?: string; locale?: SiteLocale }) {
  return (
    <Link href={pathIn(locale, '/')} className={cx('nafaa-logo', className)} aria-label={shellStrings(locale).homeLabel(name)}>
      <svg viewBox="0 0 377.6 120" width="94" height="30" aria-hidden="true" focusable="false">
        <use href={LOGO_SPRITE} />
      </svg>
    </Link>
  );
}

export function SiteHeader({ layout, locale = 'en', paired }: { layout: SiteLayout; locale?: SiteLocale; paired: readonly string[] }) {
  const { site, menus } = layout;
  const t = shellStrings(locale);
  const entries = headerModel(menus.header as NavItem[], menus.footer as NavItem[], locale);
  const wa = whatsappHref(site);

  return (
    <>
      <a href="#main" className="hdr-skip">
        {t.skipToContent}
      </a>
      <header className="hdr" data-site-header data-track-area="header">
        <div className="hdr-row">
          <Logo name={site.name} locale={locale} className="hdr-logo" />
          {entries.length ? <nav aria-label={t.mainNav} className="hdr-nav" data-mega-root dangerouslySetInnerHTML={{ __html: navHtml(entries) }} /> : null}
          <div className="hdr-end">
            <HeaderTools paired={paired} />
            <a href={site.appUrl} className="hdr-login" data-track="cta_click" data-track-label="Header: Log in">
              {t.logIn}
            </a>
            <Link href={site.demoPath} className="hdr-demo" data-track="cta_click" data-track-label="Header: Book a demo">
              {t.bookDemo}
            </Link>
            <a href={site.signupUrl} className="hdr-cta" data-track-label="Header: Start free trial">
              {t.startTrial}
            </a>
            <MobileMenuButton
              trial={{ label: t.startTrial, href: site.signupUrl }}
              demo={{ label: t.bookDemo, href: site.demoPath }}
              login={{ label: t.logIn, href: site.appUrl }}
              whatsapp={wa ? { label: t.whatsappUs, href: wa } : null}
              home={{ label: t.homeLabel(site.name), href: pathIn(locale, '/') }}
              paired={paired}
            />
          </div>
        </div>
        <HeaderBehavior />
      </header>
    </>
  );
}
