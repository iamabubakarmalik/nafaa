/**
 * The site key: which shop a request belongs to, carried in the first path
 * segment after middleware's rewrite (/s/<site>/<lang>/...). Encoding it in
 * the path, not reading cookies or headers while rendering, keeps every
 * shop page cacheable (ISR) on its own.
 *
 *   s.<slug>            shop by subdomain or ?store=<slug>
 *   h.<host>            shop by custom domain
 *   ...~p.<token>       theme editor draft preview (never cached)
 *   ...~a.<token>       password-mode access token (store not launched yet)
 */
export interface SiteKey {
  slug?: string;
  host?: string;
  preview?: string | null;
  access?: string | null;
}

const SAFE = /^[a-z0-9][a-z0-9.-]{0,252}$/;
const TOKEN = /^[A-Za-z0-9_.-]{8,800}$/;

export function encodeSite(k: SiteKey): string {
  let out = k.slug ? `s.${k.slug}` : `h.${k.host}`;
  if (k.preview) out += `~p.${k.preview}`;
  if (k.access) out += `~a.${k.access}`;
  return out;
}

export function decodeSite(segment: string): SiteKey | null {
  const [main = '', ...extra] = decodeURIComponent(segment).split('~');
  const kind = main.slice(0, 2);
  const value = main.slice(2).toLowerCase();
  if (!SAFE.test(value)) return null;
  const key: SiteKey = kind === 's.' ? { slug: value } : kind === 'h.' ? { host: value } : {};
  if (!key.slug && !key.host) return null;
  for (const x of extra) {
    const v = x.slice(2);
    if (!TOKEN.test(v)) continue;
    if (x.startsWith('p.')) key.preview = v;
    if (x.startsWith('a.')) key.access = v;
  }
  return key;
}

export const isValidPreviewToken = (t: string) => TOKEN.test(t);
export const isValidSlug = (s: string) => /^[a-z0-9][a-z0-9-]{0,62}$/.test(s);

/** Cookie holding the password-mode access token (per host, so per shop). */
export const ACCESS_COOKIE = 'nf_access';
