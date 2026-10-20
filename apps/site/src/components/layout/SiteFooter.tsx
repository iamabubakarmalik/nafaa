/**
 * Site footer (server component). Everything comes from the CMS:
 * - columns from the `footer` menu (each top-level item is a column);
 * - the `legal` menu in the bottom row;
 * - compliance statements and contact details from settings `entity` (the
 *   exact wording the owner approved, e.g. "FBR & PRA approved POS
 *   integrator"; nothing is typed here);
 * - social links marked `verified` in settings `site`;
 * - WhatsApp from settings `site.whatsapp`.
 * Also holds the theme choice (System / Light / Dark).
 */
import type { PublicEntity } from '@/lib/cms/contract/cms-contract';
import type { SiteLayout } from '@/lib/cms/client';
import { CookieSettingsButton } from '@/components/islands/ConsentBanner';
import { NavLink, StatusBadge } from './NavLink';
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

export function SiteFooter({
  layout,
  entity,
  consentEnabled,
}: {
  layout: SiteLayout;
  entity: PublicEntity | null;
  consentEnabled: boolean;
}) {
  const { site, menus } = layout;
  const columns = menus.footer as NavItem[];
  const legal = menus.legal as NavItem[];
  const social = site.social.filter((s) => s.verified);
  const whatsapp = whatsappHref(site);
  const compliance = entity ? Object.values(entity.compliance).map((c) => c.text) : [];
  const brand = entity?.legalName ?? entity?.brandName ?? site.name;

  return (
    <footer className="theme-muted border-t border-line bg-canvas text-fg" data-track-area="footer">
      <div className="mx-auto box-content max-w-wide px-gutter py-14">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,20rem)_1fr]">
          <div className="space-y-4">
            <Logo name={site.name} />
            {entity?.disambiguatingDescription ? (
              <p className="max-w-xs text-small text-fg-muted">{entity.disambiguatingDescription}</p>
            ) : null}
            {compliance.length ? (
              <ul className="space-y-1.5">
                {compliance.map((text) => (
                  <li key={text} className="flex items-center gap-2 text-small font-medium text-fg-strong">
                    <span aria-hidden className="size-1.5 rounded-full bg-brand-500" />
                    {text}
                  </li>
                ))}
              </ul>
            ) : null}
            <ul className="space-y-1">
              {whatsapp ? (
                <li>
                  <a href={whatsapp} rel="noopener" className={linkClass} data-track-label="Footer: WhatsApp">
                    WhatsApp
                  </a>
                </li>
              ) : null}
              {entity?.contact.email ? (
                <li>
                  <a href={`mailto:${entity.contact.email}`} className={linkClass}>
                    {entity.contact.email}
                  </a>
                </li>
              ) : null}
              {entity?.contact.phone ? (
                <li>
                  <a href={`tel:${entity.contact.phone.replace(/\s+/g, '')}`} className={linkClass}>
                    {entity.contact.phone}
                  </a>
                </li>
              ) : null}
            </ul>
          </div>

          {columns.length ? (
            <nav aria-label="Footer" className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:grid-cols-4">
              {columns.map((column) => {
                const links = children(column);
                return (
                  <div key={column.id} className="min-w-0">
                    <p className="text-eyebrow uppercase text-fg-subtle">{column.label}</p>
                    <ul className="mt-3 space-y-2">
                      {(links.length ? links : [column]).map((link) => (
                        <li key={link.id}>
                          <NavLink item={link} className={linkClass}>
                            {link.label}
                            <StatusBadge status={link.status} />
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

        <div className="mt-12 flex flex-col gap-4 border-t border-line pt-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <p className="text-small text-fg-subtle">
              © {new Date().getFullYear()} {brand}
            </p>
            {legal.map((link) => (
              <NavLink key={link.id} item={link} className={linkClass} />
            ))}
            {consentEnabled ? <CookieSettingsButton className={linkClass} /> : null}
          </div>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
            {social.length ? (
              <ul className="flex flex-wrap gap-x-4 gap-y-1" aria-label="Social profiles">
                {social.map((s) => (
                  <li key={s.url}>
                    <a href={s.url} rel="noopener me" className={linkClass}>
                      {SOCIAL_LABEL[s.network] ?? s.network}
                    </a>
                  </li>
                ))}
              </ul>
            ) : null}
            <ThemeChoice />
          </div>
        </div>
        {site.footerNote ? <p className="mt-4 text-small text-fg-subtle">{site.footerNote}</p> : null}
      </div>
    </footer>
  );
}
