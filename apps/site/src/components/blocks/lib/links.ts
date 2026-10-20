/**
 * Link rules shared by blocks and the Markdown renderer (API-CONTRACT 3.2,
 * ARCH 8 "Outbound links").
 *
 * - Public responses arrive with `entry:` links and the CTA keywords
 *   (`signup`, `demo`, `whatsapp`) already resolved. Anything still in that
 *   form means the target is missing, so no link is rendered.
 * - Internal paths go through next/link with prefetch off (content pages hold
 *   many links; prefetching all of them costs mobile data).
 * - External links open in the same tab. Official sources (settings
 *   `seo.officialDomains`) are followed; other external links get
 *   rel="noopener". Nothing is nofollow unless an editor flags it (not in
 *   the contract yet).
 */
import { CTA_HREF_KEYWORDS, DEFAULT_OFFICIAL_DOMAINS, ENTRY_LINK_PATTERN, MEDIA_LINK_PATTERN } from '@/lib/cms/contract/cms-contract';

export type LinkKind = 'internal' | 'anchor' | 'external' | 'mail' | 'none';

const KEYWORDS: ReadonlySet<string> = new Set(CTA_HREF_KEYWORDS);

export function linkKind(href: string | null | undefined): LinkKind {
  if (!href) return 'none';
  const value = href.trim();
  if (!value || KEYWORDS.has(value) || ENTRY_LINK_PATTERN.test(value) || MEDIA_LINK_PATTERN.test(value)) return 'none';
  if (value.startsWith('#')) return 'anchor';
  if (value.startsWith('/') && !value.startsWith('//')) return 'internal';
  if (/^https?:\/\//i.test(value)) return 'external';
  if (/^(mailto|tel):/i.test(value)) return 'mail';
  return 'none';
}

/** True for the site's own absolute URLs, which are rendered as internal paths. */
export function toSitePath(href: string, siteBaseUrl?: string): string {
  if (!siteBaseUrl) return href;
  try {
    const base = new URL(siteBaseUrl);
    const url = new URL(href);
    if (url.host === base.host) return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    // Not a URL; leave it.
  }
  return href;
}

export function isOfficialUrl(href: string, domains: readonly string[] = DEFAULT_OFFICIAL_DOMAINS): boolean {
  try {
    const host = new URL(href).hostname.toLowerCase();
    return domains.some((domain) => host === domain || host.endsWith(`.${domain}`));
  } catch {
    return false;
  }
}

/** rel for an external link: none for official sources (followed), noopener otherwise. */
export function externalRel(href: string): string | undefined {
  return isOfficialUrl(href) ? undefined : 'noopener';
}

export function hostOf(href: string): string {
  try {
    return new URL(href).hostname.replace(/^www\./, '');
  } catch {
    return href;
  }
}

/** wa.me link from settings `site.whatsapp`. */
export function whatsappHref(whatsapp: { number: string; message: string } | null | undefined): string | null {
  if (!whatsapp?.number) return null;
  const text = whatsapp.message ? `?text=${encodeURIComponent(whatsapp.message)}` : '';
  return `https://wa.me/${whatsapp.number}${text}`;
}
