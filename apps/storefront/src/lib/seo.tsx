/**
 * Page metadata: canonical URL on the shop's primary host, en/ur alternates,
 * Open Graph and Twitter cards, and noindex while the store is not live,
 * in preview, or when the merchant turned indexing off.
 */
import type { Metadata } from 'next';
import type { SiteContext } from './store';

export function pageUrl(ctx: SiteContext, path: string, lang = ctx.lang): string {
  const p = path.startsWith('/') ? path : `/${path}`;
  const prefixed = lang === 'ur' ? (p === '/' ? '/ur' : `/ur${p}`) : p;
  return `${ctx.origin}${prefixed === '/' ? '' : prefixed}` || ctx.origin;
}

export function indexable(ctx: SiteContext): boolean {
  return ctx.boot.store.status === 'LIVE' && !ctx.boot.settings.seo.noindex && !ctx.opts.preview && !ctx.blocked;
}

export function meta(
  ctx: SiteContext,
  o: { title?: string | null; description?: string | null; path: string; image?: string | null; type?: 'website' | 'article'; noindex?: boolean },
): Metadata {
  const s = ctx.boot.settings;
  const description = (o.description || s.seo.description || s.tagline || '').slice(0, 300) || undefined;
  const image = o.image || s.seo.ogImageUrl || s.logoUrl || undefined;
  const url = pageUrl(ctx, o.path);
  const langs = s.languages.enabled;
  return {
    title: o.title || undefined,
    description,
    alternates: {
      canonical: url,
      languages: langs.length > 1 ? Object.fromEntries(langs.map((l) => [l === 'ur' ? 'ur-PK' : 'en-PK', pageUrl(ctx, o.path, l)])) : undefined,
    },
    openGraph: {
      type: o.type ?? 'website',
      url,
      siteName: ctx.boot.store.name,
      title: o.title || ctx.boot.store.name,
      description,
      images: image ? [{ url: image }] : undefined,
      locale: ctx.lang === 'ur' ? 'ur_PK' : 'en_PK',
    },
    twitter: { card: image ? 'summary_large_image' : 'summary', title: o.title || ctx.boot.store.name, description, images: image ? [image] : undefined },
    robots: indexable(ctx) && !o.noindex ? undefined : { index: false, follow: !o.noindex },
  };
}

export function JsonLd({ data }: { data: unknown }) {
  if (!data || (typeof data === 'object' && !Object.keys(data as object).length)) return null;
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }} />;
}
