/**
 * Host names: the store root domain (subdomain stores), custom domains,
 * and the apex/www pair a merchant usually wants together.
 */

export const rootDomain = () => (process.env.STORE_ROOT_DOMAIN || 'stores.nafaa.pk').toLowerCase().replace(/^\.+|\.+$/g, '');
/** Storefront base URL. Production falls back to the root domain, never to a local address. */
export const storefrontUrl = () =>
  (process.env.STOREFRONT_URL || (process.env.NODE_ENV === 'production' ? `https://${rootDomain()}` : 'http://localhost:3300')).replace(/\/+$/, '');

export function normalizeHost(raw: unknown): string {
  let s = String(raw ?? '').trim().toLowerCase();
  s = s.replace(/^https?:\/\//, '').split('/')[0].split('?')[0];
  s = s.replace(/:\d+$/, '').replace(/\.+$/, '');
  return s;
}

/** Second-level suffixes where the registrable name has three labels (shop.com.pk). */
const TWO_PART_SUFFIX = new Set([
  'com.pk', 'net.pk', 'org.pk', 'edu.pk', 'gov.pk', 'biz.pk', 'web.pk', 'fam.pk', 'gok.pk', 'gob.pk', 'gop.pk', 'gos.pk',
  'co.uk', 'org.uk', 'com.au', 'co.in', 'com.sa', 'co.ae', 'com.ae', 'com.bd', 'com.my', 'co.za',
]);

export type DomainKind = 'apex' | 'www' | 'sub';

export function domainKind(host: string): DomainKind {
  if (host.startsWith('www.')) return 'www';
  const labels = host.split('.');
  if (labels.length === 2) return 'apex';
  if (labels.length === 3 && TWO_PART_SUFFIX.has(labels.slice(1).join('.'))) return 'apex';
  return 'sub';
}

/** The other half of an apex/www pair, or null for a plain subdomain. */
export function pairOf(host: string): string | null {
  const k = domainKind(host);
  if (k === 'www') return host.slice(4);
  if (k === 'apex') return `www.${host}`;
  return null;
}

/** Problem with a custom host name, or null when it can be added. */
export function hostProblem(host: string): string | null {
  if (!host || host.length > 253) return 'Domain ka naam likhein (jaise www.apnidukaan.pk)';
  if (!/^(?=.{1,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z][a-z0-9-]{1,62}$/.test(host)) return 'Domain sahi nahi — jaise www.apnidukaan.pk';
  const root = rootDomain();
  if (host === root || host.endsWith(`.${root}`)) return 'Ye Nafaa ka apna address hai — apna domain likhein';
  if (/(^|\.)nafaa\.(pk|store|com)$/.test(host) || /(^|\.)vercel\.app$/.test(host) || /(^|\.)myshopify\.com$/.test(host)) return 'Ye domain nahi jor sakte';
  return null;
}

/** The DNS records the merchant adds at their registrar. */
export function dnsRecordsFor(host: string): Array<{ type: 'A' | 'CNAME'; name: string; value: string }> {
  const kind = domainKind(host);
  if (kind === 'apex') return [{ type: 'A', name: '@', value: '76.76.21.21' }];
  const name = kind === 'www' ? 'www' : host.split('.')[0];
  return [{ type: 'CNAME', name, value: 'cname.vercel-dns.com' }];
}

/** Store slug when the host is `<slug>.<root>` (or `<slug>.localhost` in dev). */
export function slugFromHost(host: string): string | null {
  const root = rootDomain();
  for (const base of [root, 'localhost']) {
    if (host.endsWith(`.${base}`)) {
      const sub = host.slice(0, -(base.length + 1));
      if (sub && !sub.includes('.')) return sub;
    }
  }
  return null;
}

export const subdomainHost = (slug: string) => `${slug}.${rootDomain()}`;

/**
 * A page on the store that a payment page may send the buyer back to: https
 * on one of the store's own hosts, or the local dev storefront origin when
 * one is given. Anything else is refused (null), so the payment page cannot
 * be used to send people to another site.
 */
export function storeReturnUrl(raw: unknown, hosts: string[], devOrigin: string | null = null): string | null {
  if (typeof raw !== 'string' || !raw || raw.length > 1500) return null;
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return null;
  }
  if (u.username || u.password) return null;
  if (devOrigin) {
    try {
      if (u.origin === new URL(devOrigin).origin) return u.toString();
    } catch {
      /* bad dev origin: ignore */
    }
  }
  if (u.protocol !== 'https:' || u.port) return null;
  const allowed = new Set(hosts.map(normalizeHost).filter(Boolean));
  return allowed.has(u.hostname.toLowerCase()) ? u.toString() : null;
}
