/**
 * JSON-LD @graph builders (ARCH 8). One graph per page:
 *
 *   const graph = buildEntryGraph(entry, { site, entity, plans, items });
 *   <JsonLd data={graph} />
 *
 * Always: Organization, WebSite, the page node, BreadcrumbList, the editor's
 * `schemaExtra`. Then per template (ARCH 8 table). Rules kept here:
 * - never AggregateRating;
 * - never LocalBusiness (offices appear only as the Organization address);
 * - SoftwareApplication offers list paid plans only (prices from Plan), so no
 *   price-0 offer is published;
 * - FAQPage mirrors the visible FAQ items exactly (the entry's `faqs`).
 */
import {
  templateFor,
  type Block,
  type PageTemplate,
  type PublicEntity,
  type PublicEntry,
  type PublicPlan,
  type SiteSettings,
} from '@/lib/cms/contract/cms-contract';
import { absoluteUrl } from '@/lib/cms/env';
import { DEFAULT_LOCALE, hreflangFor } from '@/lib/cms/locale';
import { stableImageUrl } from '@/lib/media';
import { breadcrumbListNode } from './breadcrumbs';
import { markdownToPlain } from './text';

type Node = Record<string, unknown>;

export interface GraphContext {
  site: SiteSettings;
  entity: PublicEntity | null;
  /** Needed on templates that list offers (home, pricing, product, industry, solution). */
  plans?: PublicPlan[];
  /** Cards shown by the page (hubs, best-of), for ItemList. */
  items?: { name: string; url: string }[];
}

export const ids = {
  organization: () => absoluteUrl('/#organization'),
  website: () => absoluteUrl('/#website'),
  software: () => absoluteUrl('/#software'),
  page: (url: string) => `${url}#webpage`,
};

function compact(node: Node): Node {
  return Object.fromEntries(
    Object.entries(node).filter(([, v]) => v !== undefined && v !== null && !(Array.isArray(v) && v.length === 0)),
  );
}

function dataOf(entry: PublicEntry): Record<string, unknown> {
  return entry.data as unknown as Record<string, unknown>;
}

// ─── Site-wide nodes ───

export function organizationNode(ctx: GraphContext): Node {
  const { entity, site } = ctx;
  const verifiedSocial = site.social.filter((s) => s.verified).map((s) => s.url);
  const sameAs = [...new Set([...(entity?.sameAs ?? []), ...verifiedSocial])];
  const hq = entity?.offices.find((office) => office.isHq);
  return compact({
    '@type': 'Organization',
    '@id': ids.organization(),
    name: entity?.brandName ?? site.name,
    legalName: entity?.legalName,
    url: absoluteUrl('/'),
    logo: { '@type': 'ImageObject', url: absoluteUrl('/logo-512.png'), width: 512, height: 512 },
    description: entity?.description,
    disambiguatingDescription: entity?.disambiguatingDescription,
    foundingDate: entity?.foundingDate,
    sameAs,
    email: entity?.contact.email,
    telephone: entity?.contact.phone,
    contactPoint:
      entity?.contact.email || entity?.contact.phone
        ? compact({
            '@type': 'ContactPoint',
            contactType: 'customer support',
            email: entity.contact.email,
            telephone: entity.contact.phone,
            areaServed: 'PK',
            availableLanguage: entity.languages.length ? entity.languages : undefined,
          })
        : undefined,
    address: hq
      ? compact({
          '@type': 'PostalAddress',
          streetAddress: hq.street,
          addressLocality: hq.city,
          addressRegion: hq.region,
          postalCode: hq.postalCode,
          addressCountry: hq.country,
        })
      : undefined,
    identifier: entity?.wikidataId ? `https://www.wikidata.org/wiki/${entity.wikidataId}` : undefined,
  });
}

export function websiteNode(ctx: GraphContext): Node {
  return {
    '@type': 'WebSite',
    '@id': ids.website(),
    url: absoluteUrl('/'),
    name: ctx.entity?.brandName ?? ctx.site.name,
    publisher: { '@id': ids.organization() },
    inLanguage: ctx.site.locales.map(hreflangFor),
  };
}

// ─── Page nodes ───

function webPageNode(entry: PublicEntry, type: string, extra: Node = {}): Node {
  const image = entry.image ? stableImageUrl(entry.image) : undefined;
  return compact({
    '@type': type,
    '@id': ids.page(entry.url),
    url: entry.url,
    name: entry.seo.title,
    description: entry.seo.description,
    isPartOf: { '@id': ids.website() },
    inLanguage: hreflangFor(entry.locale),
    breadcrumb: entry.breadcrumbs.length > 1 ? { '@id': `${entry.url}#breadcrumb` } : undefined,
    datePublished: entry.datePublished,
    dateModified: entry.dateModified,
    primaryImageOfPage: image ? { '@type': 'ImageObject', url: image } : undefined,
    ...extra,
  });
}

function paidOffers(plans: PublicPlan[] | undefined): Node[] {
  return (plans ?? [])
    .filter((plan) => plan.priceMonthly > 0)
    .map((plan) => ({
      '@type': 'Offer',
      name: plan.name,
      price: plan.priceMonthly,
      priceCurrency: plan.currency,
      priceSpecification: {
        '@type': 'UnitPriceSpecification',
        price: plan.priceMonthly,
        priceCurrency: plan.currency,
        referenceQuantity: { '@type': 'QuantitativeValue', value: 1, unitCode: 'MON' },
      },
      url: absoluteUrl('/pricing'),
      availability: 'https://schema.org/InStock',
    }));
}

function softwareNode(entry: PublicEntry, ctx: GraphContext, extra: Node = {}): Node {
  return compact({
    '@type': 'SoftwareApplication',
    '@id': `${entry.url}#software`,
    name: entry.type === 'PAGE' ? (ctx.entity?.brandName ?? ctx.site.name) : entry.title,
    url: entry.url,
    applicationCategory: 'BusinessApplication',
    operatingSystem: ctx.entity?.platforms.length ? ctx.entity.platforms.join(', ') : undefined,
    description: entry.seo.description,
    publisher: { '@id': ids.organization() },
    offers: paidOffers(ctx.plans),
    ...extra,
  });
}

function faqNode(entry: PublicEntry): Node | null {
  if (entry.faqs.length === 0) return null;
  return {
    '@type': 'FAQPage',
    '@id': `${entry.url}#faq`,
    mainEntity: entry.faqs.map((faq) => ({
      '@type': 'Question',
      name: markdownToPlain(faq.question),
      acceptedAnswer: { '@type': 'Answer', text: markdownToPlain(faq.answer) },
    })),
  };
}

function personRef(person: PublicEntry['author']): Node | undefined {
  if (!person) return undefined;
  return compact({ '@type': 'Person', '@id': `${person.url}#person`, name: person.title, url: person.url, sameAs: person.sameAs });
}

/** Types whose route has an opengraph-image file, so `{url}/opengraph-image` is a real 1200x630 card. */
const OG_ROUTE_TYPES = new Set(['BLOG_POST', 'GUIDE', 'CASE_STUDY', 'TEMPLATE', 'CHANGELOG', 'COMPLIANCE', 'BEST_OF', 'COMPARE', 'ALTERNATIVE']);

/** Article image: the entry's own image, else its generated share card (Article rich results need one). */
function articleImage(entry: PublicEntry): string | undefined {
  if (entry.image) return stableImageUrl(entry.image);
  if (entry.locale === DEFAULT_LOCALE && OG_ROUTE_TYPES.has(entry.type)) return `${entry.url.replace(/\/+$/, '')}/opengraph-image`;
  return undefined;
}

function articleNode(entry: PublicEntry, type: string): Node {
  const image = articleImage(entry);
  return compact({
    '@type': type,
    '@id': `${entry.url}#article`,
    headline: entry.title,
    description: entry.seo.description,
    mainEntityOfPage: { '@id': ids.page(entry.url) },
    inLanguage: hreflangFor(entry.locale),
    datePublished: entry.datePublished,
    dateModified: entry.dateModified,
    image,
    author: personRef(entry.author) ?? { '@id': ids.organization() },
    reviewedBy: personRef(entry.reviewer),
    publisher: { '@id': ids.organization() },
  });
}

function howToNodes(entry: PublicEntry): Node[] {
  return entry.blocks
    .filter((block): block is Extract<Block, { type: 'steps' }> => block.type === 'steps' && block.howTo === true)
    .map((block, i) => ({
      '@type': 'HowTo',
      '@id': `${entry.url}#howto-${i + 1}`,
      name: block.heading,
      step: block.items.map((item, position) => ({
        '@type': 'HowToStep',
        position: position + 1,
        name: item.title,
        text: markdownToPlain(item.body),
      })),
    }));
}

export function itemListNode(id: string, items: { name: string; url: string }[]): Node | null {
  if (items.length === 0) return null;
  return {
    '@type': 'ItemList',
    '@id': id,
    numberOfItems: items.length,
    itemListElement: items.map((item, i) => ({ '@type': 'ListItem', position: i + 1, name: item.name, url: item.url })),
  };
}

function featureList(entry: PublicEntry): string[] {
  return entry.blocks.flatMap((block) => (block.type === 'featuresGrid' ? block.items.map((item) => item.title) : []));
}

// ─── Per template ───

function templateNodes(entry: PublicEntry, ctx: GraphContext): Node[] {
  const data = dataOf(entry);
  const pageTemplate = entry.type === 'PAGE' ? (data.template as PageTemplate | undefined) : undefined;
  const template = templateFor(entry.type, pageTemplate);
  const faq = faqNode(entry);
  const items = ctx.items ?? [];
  const nodes: (Node | null)[] = [];

  switch (template) {
    case 'home':
    case 'pricing':
      nodes.push(webPageNode(entry, 'WebPage'), softwareNode(entry, ctx), faq);
      break;
    case 'hub':
      nodes.push(
        webPageNode(entry, 'CollectionPage', items.length ? { mainEntity: { '@id': `${entry.url}#list` } } : {}),
        itemListNode(`${entry.url}#list`, items),
      );
      break;
    case 'product':
      nodes.push(webPageNode(entry, 'WebPage'), softwareNode(entry, ctx, { featureList: featureList(entry) }), ...howToNodes(entry), faq);
      break;
    case 'industry':
      nodes.push(webPageNode(entry, 'WebPage'), softwareNode(entry, ctx, { applicationSubCategory: entry.title }), faq);
      break;
    case 'solution':
      nodes.push(webPageNode(entry, 'WebPage'), softwareNode(entry, ctx), faq);
      break;
    case 'service':
      nodes.push(
        webPageNode(entry, 'WebPage'),
        compact({
          '@type': 'Service',
          '@id': `${entry.url}#service`,
          name: entry.title,
          description: entry.seo.description,
          url: entry.url,
          provider: { '@id': ids.organization() },
          areaServed: data.areaServed === 'worldwide' ? 'Worldwide' : { '@type': 'Country', name: 'Pakistan' },
        }),
        faq,
      );
      break;
    case 'city': {
      const place = compact({
        '@type': 'Place',
        name: (data.name as string | undefined) ?? entry.title,
        sameAs: data.wikidataId ? `https://www.wikidata.org/wiki/${data.wikidataId as string}` : undefined,
        geo: data.geo
          ? { '@type': 'GeoCoordinates', latitude: (data.geo as { lat: number }).lat, longitude: (data.geo as { lng: number }).lng }
          : undefined,
      });
      nodes.push(webPageNode(entry, 'WebPage', { about: place }), softwareNode(entry, ctx, { name: ctx.entity?.brandName ?? ctx.site.name, areaServed: place }), faq);
      break;
    }
    case 'compliance':
      nodes.push(webPageNode(entry, 'WebPage'), articleNode(entry, 'Article'), ...howToNodes(entry), faq);
      break;
    case 'bestof':
      nodes.push(webPageNode(entry, 'WebPage'), articleNode(entry, 'Article'), itemListNode(`${entry.url}#list`, items));
      break;
    case 'compare':
      nodes.push(webPageNode(entry, 'WebPage'), articleNode(entry, 'Article'), faq);
      break;
    case 'article':
      nodes.push(webPageNode(entry, 'WebPage'), articleNode(entry, entry.type === 'BLOG_POST' ? 'BlogPosting' : 'Article'), ...howToNodes(entry));
      break;
    case 'docs':
      nodes.push(webPageNode(entry, 'WebPage'), articleNode(entry, 'TechArticle'));
      break;
    case 'glossary':
      nodes.push(
        webPageNode(entry, 'WebPage', { mainEntity: { '@id': `${entry.url}#term` } }),
        compact({
          '@type': 'DefinedTerm',
          '@id': `${entry.url}#term`,
          name: (data.term as string | undefined) ?? entry.title,
          description: (data.definition as string | undefined) ?? entry.seo.description,
          url: entry.url,
          inDefinedTermSet: { '@type': 'DefinedTermSet', '@id': absoluteUrl('/glossary#set'), name: 'Nafaa glossary', url: absoluteUrl('/glossary') },
        }),
      );
      break;
    case 'tool':
      nodes.push(
        webPageNode(entry, 'WebPage'),
        {
          '@type': 'WebApplication',
          '@id': `${entry.url}#app`,
          name: entry.title,
          url: entry.url,
          applicationCategory: 'BusinessApplication',
          operatingSystem: 'Any',
          isAccessibleForFree: true,
          publisher: { '@id': ids.organization() },
        },
        faq,
      );
      break;
    case 'person':
      nodes.push(
        webPageNode(entry, 'ProfilePage', { mainEntity: { '@id': `${entry.url}#person` } }),
        compact({
          '@type': 'Person',
          '@id': `${entry.url}#person`,
          name: entry.title,
          url: entry.url,
          jobTitle: data.role as string | undefined,
          sameAs: data.sameAs as string[] | undefined,
          knowsAbout: data.knowsAbout as string[] | undefined,
          worksFor: { '@id': ids.organization() },
          image: entry.image ? stableImageUrl(entry.image) : undefined,
        }),
      );
      break;
    case 'contact':
      nodes.push(webPageNode(entry, 'ContactPage'), faq);
      break;
    case 'legal':
    case 'default':
      // HowTo only for steps marked `howTo` (help center articles).
      nodes.push(webPageNode(entry, entry.path === '/about' ? 'AboutPage' : 'WebPage'), ...howToNodes(entry), faq);
      break;
  }
  return nodes.filter((node): node is Node => node !== null);
}

/** The full JSON-LD document for an entry page. */
export function buildEntryGraph(entry: PublicEntry, ctx: GraphContext): Record<string, unknown> {
  const graph: Node[] = [
    organizationNode(ctx),
    websiteNode(ctx),
    ...templateNodes(entry, ctx),
    ...[breadcrumbListNode(entry.breadcrumbs, entry.url)].filter((node): node is Node => node !== null),
    ...(entry.seo.schemaExtra as Node[]),
  ];
  return { '@context': 'https://schema.org', '@graph': graph };
}

/** Organization + WebSite only, for pages without an entry. */
export function buildSiteGraph(ctx: GraphContext): Record<string, unknown> {
  return { '@context': 'https://schema.org', '@graph': [organizationNode(ctx), websiteNode(ctx)] };
}
