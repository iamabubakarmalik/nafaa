/**
 * Page metadata helpers: canonical on market.nafaa.pk, hreflang for the three
 * languages (Roman Urdu as ur-Latn), Open Graph with the brand image, and
 * JSON-LD blocks.
 */
import type { Metadata } from 'next';
import { href, LANGS } from './i18n';
import { SITE_URL } from './site';
import type { Lang } from './types';

export const HREFLANG: Record<Lang, string> = { en: 'en', ur: 'ur', roman: 'ur-Latn' };
export const OG_IMAGE = '/brand/og-default.png';

export function alternates(path: string, lang: Lang): Metadata['alternates'] {
  return {
    canonical: `${SITE_URL}${href(lang, path)}`,
    languages: {
      ...Object.fromEntries(LANGS.map((l) => [HREFLANG[l], `${SITE_URL}${href(l, path)}`])),
      'x-default': `${SITE_URL}${href('en', path)}`,
    },
  };
}

export function pageMeta(o: { lang: Lang; path: string; title: string; description: string; image?: string | null; noindex?: boolean; type?: 'website' | 'article' }): Metadata {
  const image = o.image || OG_IMAGE;
  return {
    title: o.title,
    description: o.description.slice(0, 300),
    alternates: alternates(o.path, o.lang),
    openGraph: {
      title: o.title,
      description: o.description.slice(0, 300),
      url: `${SITE_URL}${href(o.lang, o.path)}`,
      siteName: 'Nafaa Market',
      locale: o.lang === 'en' ? 'en_PK' : 'ur_PK',
      type: o.type ?? 'website',
      images: [{ url: image, width: 1200, height: 630 }],
    },
    twitter: { card: 'summary_large_image', title: o.title, description: o.description.slice(0, 200), images: [image] },
    robots: o.noindex ? { index: false, follow: true } : undefined,
  };
}

export function JsonLd({ data }: { data: unknown }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }} />;
}
