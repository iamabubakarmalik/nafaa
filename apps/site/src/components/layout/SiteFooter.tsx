/**
 * Site footer (server component). Content comes from the CMS:
 * - columns from the `footer` menu (each top-level item is a column);
 * - the `legal` menu in the bottom row;
 * - description and contact details from settings (tax compliance lives on /compliance only)
 *   `entity` (the exact wording the owner approved, e.g. "FBR & PRA approved
 *   POS integrator"; nothing is typed here);
 * - social links marked `verified` in settings `site`;
 * - WhatsApp from settings `site.whatsapp`, demo and sign-up links from `site`.
 *
 * Also holds the newsletter form (NewsletterForm island, existing public
 * endpoint), the language switch (LanguageSwitch: the same page in the
 * other language, or Urdu as "coming soon" until settings `site.locales`
 * lists it) and the theme choice (System/Light/Dark).
 *
 * `locale` picks the interface words (lib/i18n/shell); the Urdu layout
 * passes menus already translated and moved under /ur.
 */
import Link from 'next/link';
import type { PublicEntity } from '@/lib/cms/contract/cms-contract';
import type { SiteLayout } from '@/lib/cms/client';
import { LOGO_WORDMARK } from '@/lib/brand/logo';
import { CookieSettingsButton } from '@/components/islands/ConsentBanner';
import { cx } from '@/components/ui/cx';
import { CmsIcon } from '@/lib/icons';
import { shellStrings, type SiteLocale } from '@/lib/i18n/shell';
import { LanguageSwitch } from './LanguageSwitch';
import { NavLink, StatusBadge } from './NavLink';
import { NewsletterForm } from './NewsletterForm';
import { Logo } from './SiteHeader';
import { ThemeChoice } from './ThemeToggle';
import { children, whatsappHref, type NavItem } from './nav';

const SOCIAL_LABEL: Record<string, string> = {
  facebook: 'Facebook',
  instagram: 'Instagram',
  linkedin: 'LinkedIn',
  youtube: 'YouTube',
  x: 'X',
  tiktok: 'TikTok',
  playstore: 'Google Play',
  appstore: 'App Store',
  other: 'Profile',
};

const linkClass = 'text-small text-fg-muted transition-colors duration-fast hover:text-fg-strong';

/** WhatsApp glyph (simple-icons path, CC0), inline so the footer ships no JS for it. */
function WhatsAppGlyph({ size = 18 }: { size?: number }) {
  return (
    <svg aria-hidden width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48 0 1.46 1.07 2.88 1.21 3.08.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.63.71.23 1.36.2 1.87.12.57-.09 1.76-.72 2.01-1.41.25-.69.25-1.29.17-1.41-.07-.13-.27-.2-.57-.35M12.05 21.79h-.01a9.87 9.87 0 0 1-5.03-1.38l-.36-.21-3.74.98 1-3.65-.24-.37a9.86 9.86 0 0 1-1.51-5.26c0-5.45 4.44-9.88 9.89-9.88 2.64 0 5.12 1.03 6.99 2.9a9.82 9.82 0 0 1 2.89 6.99c0 5.45-4.44 9.88-9.88 9.88m8.41-18.3A11.81 11.81 0 0 0 12.05 0C5.5 0 .16 5.34.16 11.89c0 2.1.55 4.14 1.59 5.94L.06 24l6.3-1.65a11.88 11.88 0 0 0 5.68 1.45h.01c6.55 0 11.89-5.34 11.89-11.89 0-3.18-1.24-6.16-3.48-8.41" />
    </svg>
  );
}

export function SiteFooter({
  layout,
  entity,
  consentEnabled,
  locale = 'en',
  paired,
}: {
  layout: SiteLayout;
  entity: PublicEntity | null;
  consentEnabled: boolean;
  locale?: SiteLocale;
  paired: readonly string[];
}) {
  const t = shellStrings(locale);
  const { site, menus } = layout;
  const columns = menus.footer as NavItem[];
  const legal = menus.legal as NavItem[];
  const social = site.social.filter((s) => s.verified);
  const whatsapp = whatsappHref(site);
  const brand = entity?.legalName ?? entity?.brandName ?? site.name;
  const phone = entity?.contact.phone;
  const email = entity?.contact.email;

  return (
    <footer className="theme-muted relative isolate overflow-hidden border-t border-line bg-canvas text-fg" data-track-area="footer">
      <div className="mx-auto box-content max-w-wide px-gutter pt-16">
        {/* Newsletter and talk-to-us row */}
        <div className="grid gap-8 rounded-2xl border border-line bg-surface p-6 shadow-e1 ink:shadow-none md:p-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:gap-16">
          <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] md:items-center md:gap-8">
            <div>
              <p className="text-h4 text-fg-strong">{t.newsletterTitle}</p>
              <p className="mt-1 text-small text-fg-muted">{t.newsletterBody}</p>
            </div>
            <NewsletterForm />
          </div>
          <div className="flex flex-wrap gap-2.5">
            {whatsapp ? (
              <a
                href={whatsapp}
                rel="noopener"
                data-track="whatsapp_click"
                data-track-label="Footer: WhatsApp"
                className="inline-flex h-11 items-center gap-2 rounded-lg bg-[rgb(37_211_102)] px-4 text-small font-semibold text-emerald-950 transition-[filter] hover:brightness-95"
              >
                <WhatsAppGlyph />
                {t.whatsappUs}
              </a>
            ) : null}
            <Link
              href={site.demoPath}
              prefetch={false}
              data-track="cta_click"
              data-track-label="Footer: Book a demo"
              className="inline-flex h-11 items-center gap-2 rounded-lg border border-line-strong bg-surface px-4 text-small font-semibold text-fg-strong hover:bg-surface-2"
            >
              <CmsIcon name="calendar-check" size={17} />
              {t.bookDemo}
            </Link>
          </div>
        </div>

        <div className="mt-14 grid gap-12 xl:grid-cols-[17rem_minmax(0,1fr)] xl:gap-16">
          <div className="space-y-5">
            <Logo name={site.name} locale={locale} />
            {t.about ?? entity?.description ? <p className="max-w-sm text-small leading-relaxed text-fg-muted">{t.about ?? entity?.description}</p> : null}
            <ul className="space-y-2.5">
              {whatsapp ? (
                <li>
                  <a href={whatsapp} rel="noopener" className={cx(linkClass, 'inline-flex items-center gap-2.5')} data-track="whatsapp_click" data-track-label="Footer: WhatsApp line">
                    <span className="text-[rgb(37_211_102)]">
                      <WhatsAppGlyph size={16} />
                    </span>
                    WhatsApp
                  </a>
                </li>
              ) : null}
              {phone ? (
                <li>
                  <a href={`tel:${phone.replace(/\s+/g, '')}`} className={cx(linkClass, 'inline-flex items-center gap-2.5')}>
                    <CmsIcon name="phone" size={16} className="text-fg-subtle" />
                    {phone}
                  </a>
                </li>
              ) : null}
              {email ? (
                <li>
                  <a href={`mailto:${email}`} className={cx(linkClass, 'inline-flex items-center gap-2.5')}>
                    <CmsIcon name="mail" size={16} className="text-fg-subtle" />
                    {email}
                  </a>
                </li>
              ) : null}
            </ul>
            {social.length ? (
              <ul className="flex flex-wrap gap-2" aria-label={t.socialProfiles}>
                {social.map((s) => (
                  <li key={s.url}>
                    <a href={s.url} rel="noopener me" className="inline-flex h-8 items-center rounded-md border border-line px-2.5 text-xs font-medium text-fg-muted hover:border-line-strong hover:text-fg-strong">
                      {SOCIAL_LABEL[s.network] ?? s.network}
                    </a>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          {columns.length ? (
            <nav aria-label={t.footerNav} className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
              {columns.map((column) => {
                const links = children(column);
                return (
                  <div key={column.id} className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-[0.08em] text-fg-strong">{column.label}</p>
                    <ul className="mt-4 space-y-2.5">
                      {(links.length ? links : [column]).map((link) => (
                        <li key={link.id}>
                          <NavLink item={link} className={cx(linkClass, 'inline-flex flex-wrap items-center gap-y-1')}>
                            {link.label}
                            <StatusBadge item={link} locale={locale} />
                          </NavLink>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </nav>
          ) : null}
        </div>

        <div className="mt-14 flex flex-col gap-5 border-t border-line py-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <p className="text-small text-fg-subtle">
              © {new Date().getFullYear()} {brand}
            </p>
            {legal.map((link) => (
              <NavLink key={link.id} item={link} className={linkClass} />
            ))}
            {consentEnabled ? <CookieSettingsButton className={linkClass} /> : null}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <LanguageSwitch paired={paired} />
            <ThemeChoice />
          </div>
        </div>
        {site.footerNote ? <p className="pb-6 text-small text-fg-subtle">{site.footerNote}</p> : null}
      </div>
      <svg aria-hidden viewBox="-4 -72 240 76" className="pointer-events-none mx-auto -mb-[4%] block w-full max-w-wide select-none px-gutter opacity-[0.07] ink:opacity-[0.09]" preserveAspectRatio="xMidYMax meet">
        <path d={LOGO_WORDMARK} className="fill-fg-strong" />
      </svg>
    </footer>
  );
}
