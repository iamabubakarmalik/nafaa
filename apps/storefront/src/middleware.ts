/**
 * Host → shop routing.
 *
 * Every page request is rewritten to /s/<site>/<lang>/<path> (see lib/site.ts):
 *   <slug>.<STORE_ROOT_DOMAIN>        → s.<slug>
 *   verified custom domain            → h.<host> (the API maps it to a shop)
 *   localhost, *.vercel.app           → ?store=<slug> (remembered in a cookie),
 *                                       <slug>.localhost, or STORE_DEV_DEFAULT
 * A leading /ur selects Urdu (307 to the English page when the shop has Urdu
 * off). ?preview=<token> (theme editor) is remembered in a cookie and makes
 * every page render the draft theme, uncached.
 *
 * /api/sf/* (browser → storefront calls) is not rewritten; it gets the same
 * site key in the x-nf-site request header.
 *
 * Old subdomains and non-primary custom hosts get a 308 to the primary
 * domain: the API's resolve answer says where (redirectTo), kept in memory
 * for 60 s per instance.
 */
import { NextResponse, type NextRequest } from 'next/server';
import { ACCESS_COOKIE, encodeSite, isValidPreviewToken, isValidSlug, type SiteKey } from './lib/site';

export const config = {
  matcher: ['/((?!_next/|_vercel/|_static/|favicon\\.ico|nafaa-stores).*)'],
};

const ROOT = (process.env.STORE_ROOT_DOMAIN || 'stores.nafaa.pk').toLowerCase();
const API = (process.env.NAFAA_API_URL || 'http://localhost:4000/api').replace(/\/+$/, '');
const MOCK = process.env.STOREFRONT_MOCK === '1';

const STORE_COOKIE = 'nf_store';
const PREVIEW_COOKIE = 'nf_preview';

type Resolved = { redirectTo: string | null; languages: string[] | null; at: number };
const resolveCache = new Map<string, Resolved>();

/** The API's resolve answer for this host (redirect + languages), cached 60 s. */
async function resolveFor(key: { slug?: string; host?: string }, host: string): Promise<Resolved | null> {
  if (MOCK) return null;
  const k = key.slug ? `s:${key.slug}` : `h:${key.host}`;
  const hit = resolveCache.get(k);
  if (hit && Date.now() - hit.at < 60_000) return hit;
  try {
    const u = new URLSearchParams(key.slug ? { slug: key.slug, host } : { host: key.host ?? host });
    const res = await fetch(`${API}/storefront/v1/resolve?${u}`, { headers: { Accept: 'application/json' } });
    const json = res.ok ? await res.json() : null;
    const data = json && typeof json === 'object' && 'data' in json ? json.data : json;
    const out: Resolved = {
      redirectTo: (data?.redirectTo as string | null) ?? null,
      languages: Array.isArray(data?.languages) ? (data.languages as string[]) : null,
      at: Date.now(),
    };
    resolveCache.set(k, out);
    if (resolveCache.size > 5000) resolveCache.clear();
    return out;
  } catch {
    return null;
  }
}

/** The API's redirect for this host (apex↔www, old subdomain → custom). */
async function redirectFor(key: { slug?: string; host?: string }, host: string): Promise<string | null> {
  return (await resolveFor(key, host))?.redirectTo ?? null;
}

function isDevHost(host: string): boolean {
  return (
    host === 'localhost' ||
    host.endsWith('.localhost') ||
    /^\d{1,3}(\.\d{1,3}){3}$/.test(host) ||
    host.endsWith('.vercel.app')
  );
}

export async function middleware(req: NextRequest) {
  const url = req.nextUrl;
  const host = (req.headers.get('x-forwarded-host') || req.headers.get('host') || '').split(':')[0]!.toLowerCase();
  const path = url.pathname;
  const secure = url.protocol === 'https:';
  if (path === '/api/revalidate') return NextResponse.next();

  // ── Which shop ──
  let key: SiteKey | null = null;
  let rememberSlug: string | null = null;
  if (host === ROOT || host === `www.${ROOT}`) {
    // The theme editor previews a draft here (?store=<slug>&preview=<token>) before
    // the shop's own subdomain is attached; plain visits get the Nafaa Stores page.
    const q = url.searchParams.get('store')?.toLowerCase();
    const hasPreview = !!url.searchParams.get('preview') || !!req.cookies.get(PREVIEW_COOKIE)?.value;
    const fromCookie = req.cookies.get(STORE_COOKIE)?.value;
    const slug = hasPreview ? ((q && isValidSlug(q) && q) || (fromCookie && isValidSlug(fromCookie) && fromCookie) || '') : '';
    if (!slug) return NextResponse.rewrite(new URL('/nafaa-stores', req.url));
    if (q && isValidSlug(q)) rememberSlug = q;
    key = { slug };
  } else if (host.endsWith(`.${ROOT}`)) {
    const sub = host.slice(0, -(ROOT.length + 1));
    if (isValidSlug(sub)) key = { slug: sub };
  } else if (isDevHost(host)) {
    const q = url.searchParams.get('store')?.toLowerCase();
    const sub = host.endsWith('.localhost') ? host.slice(0, -'.localhost'.length) : null;
    const fromCookie = req.cookies.get(STORE_COOKIE)?.value;
    const slug = (q && isValidSlug(q) && q) || (sub && isValidSlug(sub) && sub) || (fromCookie && isValidSlug(fromCookie) && fromCookie) || process.env.STORE_DEV_DEFAULT || '';
    if (q && isValidSlug(q)) rememberSlug = q;
    if (slug) key = { slug };
  } else if (host) {
    key = { host };
  }
  if (!key) return NextResponse.rewrite(new URL('/nafaa-stores', req.url));

  // ── Draft preview from the theme editor ──
  const qp = url.searchParams.get('preview');
  let setPreview: string | null | undefined;
  if (qp === '0') setPreview = null;
  else if (qp && isValidPreviewToken(qp)) setPreview = qp;
  const preview = setPreview !== undefined ? setPreview : req.cookies.get(PREVIEW_COOKIE)?.value ?? null;
  if (preview && isValidPreviewToken(preview)) key.preview = preview;
  const access = req.cookies.get(ACCESS_COOKIE)?.value;
  if (access && isValidPreviewToken(access)) key.access = access;

  const site = encodeSite(key);

  // ── Browser → storefront API calls ──
  if (path.startsWith('/api/')) {
    const headers = new Headers(req.headers);
    headers.set('x-nf-site', site);
    return NextResponse.next({ request: { headers } });
  }

  // ── Primary domain redirect (not during preview) ──
  if (!key.preview && !isDevHost(host)) {
    const to = await redirectFor(key, host);
    if (to) {
      const target = new URL(to);
      if (target.hostname !== host) {
        target.pathname = url.pathname;
        target.search = url.search;
        return NextResponse.redirect(target, 308);
      }
    }
  }

  // ── Language prefix ──
  let lang = 'en';
  let rest = path;
  if (path === '/ur' || path.startsWith('/ur/')) {
    // Urdu is switched off for this shop: send the visitor to the same page in English.
    const langs = (await resolveFor(key, host))?.languages;
    if (langs && !langs.includes('ur')) {
      const to = url.clone();
      to.pathname = path.slice(3) || '/';
      return NextResponse.redirect(to, 307);
    }
    lang = 'ur';
    rest = path.slice(3) || '/';
  }

  const target = url.clone();
  // Draft previews and password access must render fresh every time, so they use the
  // uncached copy of the shop routes (/d); everyone else gets the cached pages (/s).
  const tree = key.preview || key.access ? 'd' : 's';
  target.pathname = `/${tree}/${encodeURIComponent(site)}/${lang}${rest === '/' ? '' : rest}`;
  const res = NextResponse.rewrite(target);

  if (rememberSlug) res.cookies.set(STORE_COOKIE, rememberSlug, { path: '/', sameSite: 'lax' });
  if (setPreview !== undefined) {
    if (setPreview) {
      res.cookies.set(PREVIEW_COOKIE, setPreview, {
        path: '/',
        httpOnly: true,
        sameSite: secure ? 'none' : 'lax',
        secure,
        partitioned: secure,
        maxAge: 60 * 60 * 6,
      });
    } else {
      res.cookies.delete(PREVIEW_COOKIE);
    }
  }
  return res;
}
