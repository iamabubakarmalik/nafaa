/**
 * CMS read layer (ARCH 7.1, API-CONTRACT 2). Server-only: import it from
 * server components, route handlers and generateMetadata, never from an island.
 *
 * - Every fetch carries the cache tags and fallback `revalidate` from the
 *   contract (`publicFetchCache`), so the API's POST /api/revalidate refreshes
 *   exactly what changed. `all` is on every fetch.
 * - In draft mode (preview), `getEntry` reads the draft through the signed
 *   preview token with `cache: 'no-store'`; everything else stays published.
 * - The API wraps JSON in `{ success, data }` (global ResponseInterceptor);
 *   `unwrap` accepts both the wrapped and the bare shape.
 * - Errors: a 404 on an entry is `null` (the route then tries redirects and
 *   404s). Anything else throws `CmsError`, so a production build fails rather
 *   than shipping an empty site. In development the layout falls back to an
 *   empty shell (see getLayout) so the site renders before the API is ready.
 */
import { cookies, draftMode } from 'next/headers';
import { cache } from 'react';
import {
  DEFAULT_LOCALE,
  PREVIEW,
  PUBLIC_SITE_ENDPOINTS,
  publicFetchCache,
  type AnalyticsSettings,
  type CmsEntryType,
  type LlmsPayload,
  type MenuItemResolved,
  type PreviewValidation,
  type PublicEntity,
  type PublicEntriesResponse,
  type PublicEntry,
  type PublicFaqsResponse,
  type PublicLayout,
  type PublicPathsResponse,
  type PublicPlan,
  type PublicRedirectsResponse,
  type PublicSiteEndpoint,
  type PublicSitemapResponse,
  type PublicStatsResponse,
  type PublicCustomer,
  type PublicTestimonial,
  type SearchIndexResponse,
  type SitemapSection,
  type StatMetric,
} from './contract/cms-contract';
import { cmsApiUrl, isProduction } from './env';

export class CmsError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly endpoint: string,
  ) {
    super(message);
    this.name = 'CmsError';
  }
}

type QueryValue = string | number | boolean | null | undefined | readonly string[];
type Query = Record<string, QueryValue>;

function buildUrl(endpoint: PublicSiteEndpoint, query: Query): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === '') continue;
    if (Array.isArray(value)) {
      if (value.length) params.set(key, value.join(','));
    } else {
      params.set(key, String(value));
    }
  }
  const qs = params.toString();
  return `${cmsApiUrl()}${PUBLIC_SITE_ENDPOINTS[endpoint]}${qs ? `?${qs}` : ''}`;
}

function unwrap<T>(body: unknown): T {
  if (body && typeof body === 'object' && 'success' in body && 'data' in body) {
    return (body as { data: T }).data;
  }
  return body as T;
}

interface RequestOptions {
  /** Return null on 404 instead of throwing. */
  allow404?: boolean;
  /** Skip the data cache (preview). */
  noStore?: boolean;
  /** Tag params for publicFetchCache. */
  tagParams?: { locale?: string; path?: string; type?: CmsEntryType };
}

async function request<T>(endpoint: PublicSiteEndpoint, query: Query, options: RequestOptions = {}): Promise<T | null> {
  const url = buildUrl(endpoint, query);
  const policy = options.noStore ? null : publicFetchCache(endpoint, options.tagParams);
  const init: RequestInit = policy
    ? { next: { tags: policy.tags, revalidate: policy.revalidate } }
    : { cache: 'no-store' };

  let res: Response;
  try {
    res = await fetch(url, { ...init, headers: { accept: 'application/json' } });
  } catch (error) {
    throw new CmsError(`CMS API unreachable (${(error as Error).message})`, 0, endpoint);
  }
  if (res.status === 404 && options.allow404) return null;
  if (!res.ok) throw new CmsError(`CMS API ${endpoint} returned ${res.status}`, res.status, endpoint);
  return unwrap<T>(await res.json());
}

async function required<T>(endpoint: PublicSiteEndpoint, query: Query, options: RequestOptions = {}): Promise<T> {
  const value = await request<T>(endpoint, query, options);
  if (value === null) throw new CmsError(`CMS API ${endpoint} returned no data`, 404, endpoint);
  return value;
}

// ─── Preview ───

/** The preview token, only while draft mode is on (reading cookies is then fine: the request is dynamic anyway). */
export const getPreviewToken = cache(async (): Promise<string | null> => {
  const draft = await draftMode();
  if (!draft.isEnabled) return null;
  return (await cookies()).get(PREVIEW.cookieName)?.value ?? null;
});

/** Checks a preview token with the API. Null when it is invalid or expired. */
export async function validatePreviewToken(token: string): Promise<PreviewValidation | null> {
  try {
    return await request<PreviewValidation>('preview', { token }, { allow404: true, noStore: true });
  } catch (error) {
    if (error instanceof CmsError && (error.status === 401 || error.status === 400)) return null;
    throw error;
  }
}

// ─── Entries ───

/**
 * The published entry at a CMS path (no locale prefix), or the draft in
 * preview. Null when nothing is published there.
 */
export const getEntry = cache(async (path: string, locale: string = DEFAULT_LOCALE): Promise<PublicEntry | null> => {
  const token = await getPreviewToken();
  if (token) {
    try {
      // `locale` is not in the preview query schema yet; see the S1 report.
      const draft = await request<PublicEntry>('preview', { token, path, locale }, { allow404: true, noStore: true });
      if (draft) return draft;
    } catch (error) {
      // An expired token falls back to the published page.
      if (!(error instanceof CmsError && error.status === 401)) throw error;
    }
  }
  return request<PublicEntry>('entry', { path, locale }, { allow404: true, tagParams: { locale, path } });
});

export interface EntriesQuery {
  type: CmsEntryType;
  locale?: string;
  tag?: string;
  group?: string;
  featured?: boolean;
  parentId?: string;
  sort?: 'order' | 'recent' | 'title';
  limit?: number;
  cursor?: string;
}

export const getEntries = cache(async (query: EntriesQuery): Promise<PublicEntriesResponse> => {
  const locale = query.locale ?? DEFAULT_LOCALE;
  return required<PublicEntriesResponse>('entries', { ...query, locale }, { tagParams: { locale, type: query.type } });
});

/** Published paths for generateStaticParams. */
export const getPaths = cache(
  async (type?: CmsEntryType, locale?: string): Promise<PublicPathsResponse['items']> => {
    const res = await required<PublicPathsResponse>('paths', { type, locale });
    return res.items;
  },
);

// ─── Layout and settings ───

/**
 * Fields the shell needs that PublicLayout does not carry yet (proposed to A1
 * in the S1 report): analytics ids for the consent-gated loaders, the IndexNow
 * key, and a status badge on menu items. Read as optional until they land.
 */
export interface LayoutExtras {
  analytics?: Pick<AnalyticsSettings, 'gtmId' | 'clarityId' | 'claritySample'>;
  indexNowKey?: string;
}
export type MenuItemWithStatus = MenuItemResolved & { status?: 'live' | 'beta' | 'coming' };
export type SiteLayout = PublicLayout & LayoutExtras;

/** An empty layout for local work before the API serves /public/site/layout. Never used in production. */
function devFallbackLayout(locale: string): SiteLayout {
  return {
    locale,
    menus: { header: [], footer: [], legal: [], mobile: [] },
    site: {
      name: 'Nafaa',
      baseUrl: 'http://localhost:3100',
      appUrl: 'http://localhost:5173',
      signupUrl: 'http://localhost:5173',
      demoPath: '/demo',
      locales: [DEFAULT_LOCALE],
      whatsapp: null,
      social: [],
    },
    updatedAt: new Date(0).toISOString(),
  };
}

export const getLayout = cache(async (locale: string = DEFAULT_LOCALE): Promise<SiteLayout> => {
  try {
    return await required<SiteLayout>('layout', { locale }, { tagParams: { locale } });
  } catch (error) {
    if (isProduction) throw error;
    console.warn(`[cms] layout unavailable, using the empty dev shell: ${(error as Error).message}`);
    return devFallbackLayout(locale);
  }
});

/** Entity facts + counts + plan summary. Null only in development when the API lacks the endpoint. */
export const getEntity = cache(async (locale: string = DEFAULT_LOCALE): Promise<PublicEntity | null> => {
  try {
    return await required<PublicEntity>('entity', { locale });
  } catch (error) {
    if (isProduction) throw error;
    return null;
  }
});

export const getPlans = cache(async (): Promise<PublicPlan[]> => required<PublicPlan[]>('plans', {}));

export const getFaqs = cache(
  async (locale: string = DEFAULT_LOCALE, topic?: string): Promise<PublicFaqsResponse> =>
    required<PublicFaqsResponse>('faqs', { locale, topic }, { tagParams: { locale } }),
);

export interface ProofQuery {
  locale?: string;
  ids?: readonly string[];
  industry?: string;
  city?: string;
  limit?: number;
}

export const getTestimonials = cache(
  async (query: ProofQuery = {}): Promise<PublicTestimonial[]> =>
    required<PublicTestimonial[]>('testimonials', { ...query }),
);

export const getCustomers = cache(
  async (query: Omit<ProofQuery, 'locale'> = {}): Promise<PublicCustomer[]> =>
    required<PublicCustomer[]>('customers', { ...query }),
);

export const getStats = cache(
  async (metrics: readonly StatMetric[]): Promise<PublicStatsResponse> =>
    required<PublicStatsResponse>('stats', { metrics }),
);

// ─── Platform files ───

export const getRedirects = cache(async (): Promise<PublicRedirectsResponse> => {
  try {
    return await required<PublicRedirectsResponse>('redirects', {});
  } catch (error) {
    if (isProduction) throw error;
    return { rules: [], updatedAt: new Date(0).toISOString() };
  }
});

export async function getSitemap(section: SitemapSection, locale: string = DEFAULT_LOCALE): Promise<PublicSitemapResponse> {
  return required<PublicSitemapResponse>('sitemap', { section, locale }, { tagParams: { locale } });
}

export async function getLlms(locale: string = DEFAULT_LOCALE): Promise<LlmsPayload> {
  return required<LlmsPayload>('llms', { locale }, { tagParams: { locale } });
}

export async function getSearchIndex(locale: string = DEFAULT_LOCALE): Promise<SearchIndexResponse> {
  return required<SearchIndexResponse>('searchIndex', { locale }, { tagParams: { locale } });
}

/** Fire-and-forget redirect hit counter (call inside `after()`). */
export async function recordRedirectHit(id: string): Promise<void> {
  try {
    await fetch(`${cmsApiUrl()}${PUBLIC_SITE_ENDPOINTS.redirectHit}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id }),
      cache: 'no-store',
    });
  } catch {
    // Counting is best effort.
  }
}
