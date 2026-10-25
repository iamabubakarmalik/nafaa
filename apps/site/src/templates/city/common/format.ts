/**
 * Formatting helpers shared by the S4 templates. Dates are shown in
 * Asia/Karachi (the server runs in UTC), links to official domains are
 * followed, everything else external gets rel="noopener".
 */
import { DEFAULT_OFFICIAL_DOMAINS } from '@/lib/cms/contract/cms-contract';
import { hreflangFor } from '@/lib/cms/locale';

const TIME_ZONE = 'Asia/Karachi';

/** "20 Oct 2026" for an ISO date or date-time; null for a missing or bad value. */
export function formatDate(value: string | null | undefined, locale = 'en'): string | null {
  if (!value) return null;
  // A bare date ("2026-10-20") is a calendar day, not an instant: pin it to noon UTC
  // so no time zone moves it to the previous or next day.
  const date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T12:00:00Z` : value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat(hreflangFor(locale), { day: 'numeric', month: locale === 'ur' ? 'long' : 'short', year: 'numeric', timeZone: TIME_ZONE, numberingSystem: 'latn' }).format(date);
}

/** Machine value for <time dateTime>. */
export function isoDay(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  return /^\d{4}-\d{2}-\d{2}/.test(value) ? value.slice(0, 10) : undefined;
}

/** The latest of several ISO dates (for "checked on" lines). */
export function latestDate(values: (string | null | undefined)[]): string | null {
  const valid = values.filter((v): v is string => Boolean(v) && !Number.isNaN(new Date(v as string).getTime()));
  if (valid.length === 0) return null;
  return valid.reduce((a, b) => (new Date(a) > new Date(b) ? a : b));
}

/** "tallysolutions.com" from a URL. */
export function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

/**
 * Official sources (ARCH 8 outbound links). The live list is settings
 * `seo.officialDomains`, served on the public layout (`layout.officialDomains`);
 * callers that do not pass it get the contract defaults.
 */
export function isOfficialUrl(url: string, domains: readonly string[] = DEFAULT_OFFICIAL_DOMAINS): boolean {
  const host = hostOf(url);
  return domains.some((domain) => host === domain || host.endsWith(`.${domain}`));
}

/** rel for an outbound link: followed for official sources, noopener otherwise. */
export function outboundRel(url: string): string | undefined {
  return isOfficialUrl(url) ? undefined : 'noopener';
}

/** URL-safe anchor from a label ("Hall Road" → "hall-road"). */
export function slugify(value: string): string {
  return (
    value
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'item'
  );
}

/** "Rs 1,500" from a PKR amount. */
export function formatPkr(amount: number): string {
  return `Rs ${new Intl.NumberFormat('en-PK', { maximumFractionDigits: 0 }).format(amount)}`;
}
