/**
 * Metadata builder (ARCH 8 global rules). Every route's generateMetadata
 * returns `buildEntryMetadata(entry)` for CMS pages or `buildPageMetadata()`
 * for the few pages without an entry.
 *
 * - Title: the API sends the final title without the brand; the root layout's
 *   template adds "| Nafaa". Home and Compare patterns already hold the brand
 *   (`titleIncludesBrand`), so they use `absolute`.
 * - Canonical: from the snapshot (self unless the editor set one).
 * - Robots: the snapshot's value, forced to noindex when SITE_INDEXABLE is not
 *   true (staging).
 * - hreflang: only when a published translation exists (`alternates` has more
 *   than the page itself). x-default points at the English page.
 * - OG image: routes with an `opengraph-image.tsx` get their card from the
 *   file convention, which renders the editor's OG image when one is set.
 *   Routes without one pass `hasOgRoute: false`.
 */
import type { Metadata } from 'next';
import type { PublicEntry } from '@/lib/cms/contract/cms-contract';
import { absoluteUrl, siteIndexable } from '@/lib/cms/env';
import { DEFAULT_LOCALE, OG_LOCALE, hreflangFor, localizePath } from '@/lib/cms/locale';
import { ogImageUrl } from '@/lib/media';

const ARTICLE_TYPES = new Set(['BLOG_POST', 'GUIDE', 'CASE_STUDY', 'TEMPLATE', 'CHANGELOG', 'COMPLIANCE', 'BEST_OF', 'COMPARE', 'ALTERNATIVE']);

export function robotsFor(index: boolean, follow: boolean): NonNullable<Metadata['robots']> {
  const allowIndex = index && siteIndexable();
  const allowFollow = follow && siteIndexable();
  return {
    index: allowIndex,
    follow: allowFollow,
    googleBot: { index: allowIndex, follow: allowFollow, 'max-image-preview': 'large', 'max-snippet': -1 },
  };
}

/** hreflang map, or undefined when the page has no published translation. */
export function languageAlternates(alternates: PublicEntry['alternates']): Record<string, string> | undefined {
  if (alternates.length < 2) return undefined;
  const languages: Record<string, string> = {};
  for (const alt of alternates) languages[hreflangFor(alt.locale)] = alt.url;
  const fallback = alternates.find((alt) => alt.locale === DEFAULT_LOCALE);
  if (fallback) languages['x-default'] = fallback.url;
  return languages;
}

export interface EntryMetadataOptions {
  /** False when the route has no opengraph-image.tsx (the catch-all); the image is then set here. */
  hasOgRoute?: boolean;
}

export function buildEntryMetadata(entry: PublicEntry, options: EntryMetadataOptions = {}): Metadata {
  const { seo } = entry;
  const isArticle = ARTICLE_TYPES.has(entry.type);
  // A page-level openGraph object replaces the inherited one, so a route
  // without its own OG file names an image explicitly: the editor's, or the
  // root card.
  const images =
    options.hasOgRoute !== false
      ? undefined
      : seo.ogImage
        ? [{ url: ogImageUrl(seo.ogImage), width: 1200, height: 630, alt: seo.ogImage.alt || seo.title }]
        : [{ url: absoluteUrl('/opengraph-image'), width: 1200, height: 630, alt: seo.title }];
  const otherLocales = entry.alternates.filter((alt) => alt.locale !== entry.locale).map((alt) => OG_LOCALE[alt.locale] ?? alt.locale);

  return {
    title: seo.titleIncludesBrand ? { absolute: seo.title } : seo.title,
    description: seo.description,
    alternates: { canonical: seo.canonical, languages: languageAlternates(entry.alternates) },
    robots: robotsFor(seo.robots.index, seo.robots.follow),
    openGraph: {
      type: isArticle ? 'article' : 'website',
      url: entry.url,
      title: seo.title,
      description: seo.description,
      locale: OG_LOCALE[entry.locale] ?? entry.locale,
      ...(otherLocales.length ? { alternateLocale: otherLocales } : {}),
      ...(isArticle
        ? {
            publishedTime: entry.datePublished ?? undefined,
            modifiedTime: entry.dateModified ?? undefined,
          }
        : {}),
      ...(images ? { images } : {}),
    },
    twitter: { card: 'summary_large_image', title: seo.title, description: seo.description, ...(images ? { images } : {}) },
  };
}

export interface PageMetadataInput {
  title: string;
  description?: string;
  /** CMS path without locale prefix. */
  path: string;
  locale?: string;
  /** Include the brand already (skip the "| Nafaa" template). */
  absoluteTitle?: boolean;
  noindex?: boolean;
}

/** Metadata for a route without a CMS entry (404, generated hubs). */
export function buildPageMetadata(input: PageMetadataInput): Metadata {
  const url = absoluteUrl(localizePath(input.locale ?? DEFAULT_LOCALE, input.path));
  return {
    title: input.absoluteTitle ? { absolute: input.title } : input.title,
    description: input.description,
    alternates: { canonical: url },
    robots: robotsFor(!input.noindex, true),
    openGraph: { type: 'website', url, title: input.title, description: input.description },
    twitter: { card: 'summary_large_image', title: input.title, description: input.description },
  };
}
