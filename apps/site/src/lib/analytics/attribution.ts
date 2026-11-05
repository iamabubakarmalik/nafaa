/**
 * Sign-up attribution (browser only).
 *
 * Every link to the web app's sign-up page leaves the site carrying:
 *
 *   utm_source=nafaa.pk  utm_medium=site
 *   utm_campaign=<page type>   (pricing, product, industry, blog, ...)
 *   utm_content=<page path>    ("/industries/bakery")
 *   cta=<CTA id>               (data-track-label or the nearest data-track-area)
 *
 * and, when the visitor arrived from a campaign, that first touch as
 * ft_source, ft_medium, ft_campaign, ft_term and ft_content. The first touch
 * is the UTM set on the first landing URL of the browser session, kept in
 * sessionStorage. Parameters already on a link are never overwritten, so a
 * CMS link with its own campaign tags keeps them. apps/web reads these on
 * /register and stores them on the new shop (see the conversion notes).
 */

const FIRST_TOUCH_KEY = 'nafaa_ft';
const UTM_KEYS = ['source', 'medium', 'campaign', 'term', 'content'] as const;
type UtmKey = (typeof UTM_KEYS)[number];
type Utm = Partial<Record<UtmKey, string>>;

/** First path segment → page type, for utm_campaign and the dataLayer events. */
const PAGE_TYPES: Record<string, string> = {
  pricing: 'pricing',
  product: 'product',
  industries: 'industry',
  solutions: 'solution',
  services: 'service',
  'pos-software': 'city',
  blog: 'blog',
  guides: 'guide',
  compare: 'compare',
  best: 'best',
  tools: 'tool',
  templates: 'template',
  glossary: 'glossary',
  help: 'help',
  developers: 'developers',
  integrations: 'integration',
  customers: 'customer',
  compliance: 'compliance',
  changelog: 'changelog',
  roadmap: 'roadmap',
  faq: 'faq',
  team: 'team',
  demo: 'demo',
  contact: 'contact',
};

/** "/industries/bakery" → "industry"; "/" → "home"; "/ur/pricing" → "pricing". Free CMS pages read "page". */
export function pageTypeOf(pathname: string): string {
  const segments = pathname.split('/').filter(Boolean);
  if (segments[0] === 'ur') segments.shift();
  if (!segments.length) return 'home';
  return PAGE_TYPES[segments[0]!] ?? 'page';
}

function clean(value: string | null | undefined): string | undefined {
  const v = value?.trim().slice(0, 150);
  return v ? v : undefined;
}

/** Stores the landing URL's UTM set once per browser session. Call on every pageview; only the first set sticks. */
export function rememberFirstTouch(search: string = window.location.search): void {
  try {
    if (window.sessionStorage.getItem(FIRST_TOUCH_KEY)) return;
    const q = new URLSearchParams(search);
    const utm: Utm = {};
    for (const key of UTM_KEYS) {
      const value = clean(q.get(`utm_${key}`));
      if (value) utm[key] = value;
    }
    if (Object.keys(utm).length) window.sessionStorage.setItem(FIRST_TOUCH_KEY, JSON.stringify(utm));
  } catch {
    // Storage blocked: the sign-up link still carries the site's own tags.
  }
}

function firstTouch(): Utm {
  try {
    const raw = window.sessionStorage.getItem(FIRST_TOUCH_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    if (!parsed || typeof parsed !== 'object') return {};
    const out: Utm = {};
    for (const key of UTM_KEYS) {
      const value = (parsed as Record<string, unknown>)[key];
      if (typeof value === 'string' && clean(value)) out[key] = clean(value);
    }
    return out;
  } catch {
    return {};
  }
}

/** True for links to the app's sign-up page: the configured signup URL, or /register and /signup on its host. */
export function isSignupHref(href: URL, signupUrl: string | undefined): boolean {
  if (!signupUrl) return false;
  try {
    const target = new URL(signupUrl);
    if (href.host !== target.host) return false;
    return href.pathname.startsWith(target.pathname) || /^\/(register|signup)(\/|$)/.test(href.pathname);
  } catch {
    return false;
  }
}

export interface SignupContext {
  pagePath: string;
  pageType: string;
  /** CTA id: data-track-label, else the nearest data-track-area. */
  cta?: string;
}

/** The signup URL with attribution added; parameters already present are kept. */
export function decorateSignupUrl(href: URL, context: SignupContext): string {
  const url = new URL(href.toString());
  const q = url.searchParams;
  const setIfMissing = (name: string, value: string | undefined) => {
    if (value && !q.has(name)) q.set(name, value);
  };
  setIfMissing('utm_source', 'nafaa.pk');
  setIfMissing('utm_medium', 'site');
  setIfMissing('utm_campaign', context.pageType);
  setIfMissing('utm_content', context.pagePath);
  setIfMissing('cta', clean(context.cta)?.slice(0, 80));
  const ft = firstTouch();
  for (const key of UTM_KEYS) setIfMissing(`ft_${key}`, ft[key]);
  return url.toString();
}
