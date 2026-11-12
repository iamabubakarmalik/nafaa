/**
 * URL handles (Shopify style): lowercase letters, digits and dashes.
 * A product without a saved handle gets `<name>-<first 8 of its id>`, so the
 * URL is stable and the product can be found again from the suffix alone.
 */

const MAX = 120;

export function slugify(raw: unknown, max = MAX): string {
  return String(raw ?? '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, max)
    .replace(/-+$/g, '');
}

/** A clean handle, or null when nothing usable is left. */
export function cleanHandle(raw: unknown): string | null {
  const s = slugify(raw);
  return s.length ? s : null;
}

export function defaultProductHandle(name: string, id: string): string {
  const base = slugify(name, 100) || 'product';
  return `${base}-${id.replace(/-/g, '').slice(0, 8).toLowerCase()}`;
}

/** The id prefix a default handle ends with (8 hex chars), else null. */
export function idPrefixOf(handle: string): string | null {
  const m = /-([0-9a-f]{8})$/.exec(handle);
  return m ? m[1] : null;
}

/** First free handle: base, base-2, base-3 … */
export function uniqueHandle(base: string, taken: Set<string>): string {
  const b = slugify(base) || 'item';
  if (!taken.has(b)) return b;
  for (let i = 2; i < 10_000; i++) {
    const c = `${b.slice(0, MAX - 6)}-${i}`;
    if (!taken.has(c)) return c;
  }
  return `${b.slice(0, MAX - 10)}-${Date.now().toString(36)}`;
}

const RESERVED = new Set([
  'www', 'api', 'app', 'admin', 'mail', 'shop', 'store', 'stores', 'nafaa', 'help', 'support', 'status', 'cdn', 'static',
  'assets', 'blog', 'docs', 'partner', 'partners', 'checkout', 'pay', 'account', 'login', 'test', 'demo', 'dev', 'staging',
]);

/** Store slug (the subdomain). */
export function cleanSlug(raw: unknown): string {
  return slugify(raw, 40);
}

export function slugProblem(slug: string): string | null {
  if (slug.length < 3) return 'Kam az kam 3 harf';
  if (slug.length > 40) return 'Zyada se zyada 40 harf';
  if (!/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(slug)) return 'Sirf angrezi harf, number aur dash (-)';
  if (RESERVED.has(slug)) return 'Ye naam nahi le sakte';
  return null;
}

/** Redirect source path: starts with '/', no host, lowercase, no trailing slash (except root), max 500. */
export function cleanPath(raw: unknown): string | null {
  let s = String(raw ?? '').trim();
  if (!s) return null;
  if (/^https?:\/\//i.test(s)) {
    try {
      const u = new URL(s);
      s = u.pathname + u.search;
    } catch {
      return null;
    }
  }
  if (!s.startsWith('/')) s = `/${s}`;
  const [p, q] = s.split('?');
  let path = p.replace(/\/{2,}/g, '/');
  if (path.length > 1) path = path.replace(/\/+$/, '');
  const out = path.toLowerCase() + (q ? `?${q}` : '');
  return out.length <= 500 && !/\s/.test(out) ? out : null;
}

/** Redirect target: a store path or an absolute https URL. */
export function cleanTarget(raw: unknown): string | null {
  const s = String(raw ?? '').trim();
  if (/^https:\/\/\S+$/i.test(s) && s.length <= 1000) return s;
  return cleanPath(s);
}
