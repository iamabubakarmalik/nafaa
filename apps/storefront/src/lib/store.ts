/**
 * Loads the shop for a request: site key → resolve → bootstrap → theme.
 * Wrapped in React cache() so the layout, page and metadata share one call
 * per request; the fetches themselves are cached by Next (lib/api.ts).
 *
 * Password mode: a store that is not LIVE needs the access token from
 * /api/sf/unlock; middleware carries it in the site key (lib/site.ts), so
 * rendering never reads cookies and live stores stay fully static.
 */
import { cache } from 'react';
import { notFound } from 'next/navigation';
import { api, ApiError, type Bootstrap, type Lang, type ReadOpts, type Section, type StoreRef, type TemplateKey } from './api';
import { decodeSite, type SiteKey } from './site';
import { resolveTheme, type ResolvedTheme } from './theme/tokens';
import { defaultTemplate } from './theme/defaults';

export interface SiteContext {
  key: SiteKey;
  ref: StoreRef;
  boot: Bootstrap;
  theme: ResolvedTheme;
  lang: Lang;
  /** Read options to pass to every catalog call (preview + access). */
  opts: ReadOpts;
  /** True when the password page must be shown instead of the store. */
  locked: boolean;
  /** Suspended by Nafaa: a neutral "unavailable" page instead of the store. */
  unavailable: boolean;
  /** locked || unavailable: pages skip catalog calls. */
  blocked: boolean;
  /** Canonical origin, no trailing slash. */
  origin: string;
  storeId: string;
}

export interface SiteParams {
  site: string;
  lang: string;
}


export const loadSite = cache(async (siteSeg: string, langSeg: string): Promise<SiteContext> => {
  const key = decodeSite(siteSeg);
  if (!key) notFound();
  const ref = await api.resolve({ slug: key.slug, host: key.host });
  if (!ref || ref.status === 'CLOSED') notFound();
  const preview = key.preview ?? null;
  if (ref.status === 'SUSPENDED') return unavailableSite(key, ref);
  const access = ref.status !== 'LIVE' && !preview ? key.access ?? null : null;
  const opts: ReadOpts = { preview, access };
  let boot: Bootstrap | null;
  try {
    boot = await api.bootstrap(ref.storeId, opts);
  } catch (e) {
    if (e instanceof ApiError && e.status === 410) return unavailableSite(key, ref);
    throw e;
  }
  if (!boot) notFound();
  boot = withDefaults(boot);
  const enabled = boot.settings.languages?.enabled?.length ? boot.settings.languages.enabled : ['en' as Lang];
  const wanted: Lang = langSeg === 'ur' ? 'ur' : 'en';
  const lang: Lang = enabled.includes(wanted) ? wanted : 'en';
  const origin = (boot.store.url || `https://${ref.primaryHost}`).replace(/\/+$/, '');
  return {
    key,
    ref,
    boot,
    theme: resolveTheme(boot.store.themeId, boot.theme),
    lang,
    opts,
    locked: boot.store.locked && !preview,
    unavailable: false,
    blocked: boot.store.locked && !preview,
    origin,
    storeId: ref.storeId,
  };
});

/** Layout defaults; a locked store's bootstrap only carries a few settings and no checkout data. */
const EMPTY_BOOT: Omit<Bootstrap, 'store'> = {
  settings: {
    logoUrl: null, faviconUrl: null, logoWidth: 140, tagline: null,
    contact: { phone: null, whatsapp: null, email: null, address: null, hours: null },
    social: {}, languages: { default: 'en', enabled: ['en'] }, currencyDisplay: { symbol: 'Rs', decimals: 0 },
    tracking: { metaPixelId: null, ga4Id: null, googleAdsId: null, googleAdsLabel: null, tiktokPixelId: null },
    whatsappButton: { enabled: false, number: null, message: null, position: 'right' },
    seo: { title: null, description: null, ogImageUrl: null, noindex: true }, password: { message: null },
    catalogMode: 'ALL', showOutOfStock: false, newsletter: { enabled: false, mode: 'email' },
  },
  theme: null, themeVersion: 0, menus: {}, policies: [],
  checkout: { loginMode: 'guest', fields: { email: 'hidden', postalCode: 'hidden', province: 'hidden', landmark: 'hidden' }, notes: false, marketingOptIn: false, codConfirmWhatsApp: false, minOrder: null, maxCodOrder: null, termsUrl: null },
  payments: [], shipping: { freeShippingThreshold: null, defaultEta: null, codAvailable: false }, reviews: { enabled: false, average: null, count: 0 },
};

/** Fills what a locked bootstrap leaves out, so the layout can always read every field. */
function withDefaults(boot: Bootstrap): Bootstrap {
  return {
    ...boot,
    settings: { ...EMPTY_BOOT.settings, ...boot.settings },
    menus: boot.menus ?? {},
    policies: boot.policies ?? [],
    checkout: boot.checkout ?? EMPTY_BOOT.checkout,
    payments: boot.payments ?? [],
    shipping: boot.shipping ?? EMPTY_BOOT.shipping,
    reviews: boot.reviews ?? EMPTY_BOOT.reviews,
  };
}

function unavailableSite(key: SiteKey, ref: StoreRef): SiteContext {
  const boot: Bootstrap = {
    store: { id: ref.storeId, slug: ref.slug, name: ref.slug, status: 'CLOSED', locked: true, url: `https://${ref.primaryHost}`, primaryHost: ref.primaryHost, themeId: 'fashion', updatedAt: new Date(0).toISOString() },
    ...EMPTY_BOOT,
  };
  return { key, ref, boot, theme: resolveTheme('fashion', null), lang: 'en', opts: {}, locked: false, unavailable: true, blocked: true, origin: `https://${ref.primaryHost}`, storeId: ref.storeId };
}

export const site = (p: SiteParams | Promise<SiteParams>) => Promise.resolve(p).then((x) => loadSite(x.site, x.lang));

/** Sections of a template from the shop's theme, or the theme's defaults when the doc has none. */
export function templateSections(ctx: SiteContext, key: TemplateKey): Section[] {
  const fromDoc = ctx.boot.theme?.templates?.[key]?.sections;
  return fromDoc && fromDoc.length ? fromDoc : defaultTemplate(ctx.theme.themeId, key);
}
