/**
 * Route helpers for the S3 routes (home, pricing, roadmap, hubs and the
 * product, industry, solution, service and integration pages), and the
 * template dispatcher the catch-all can call for PAGE templates.
 *
 * A route file stays thin:
 *
 *   export const revalidate = 86400;
 *   export const dynamicParams = true;
 *   export const generateStaticParams = () => staticParams('INDUSTRY');
 *   export const generateMetadata = ({ params }) => typedMetadata('INDUSTRY', params);
 *   export default ({ params }) => typedPage('INDUSTRY', params);
 */
import type { Metadata } from 'next';
import { ENTRY_TYPE_META, templateFor, type PageTemplate, type PublicEntry } from '@/lib/cms/contract/cms-contract';
import { redirectOrNotFound } from '@/lib/cms/redirects';
import { buildEntryMetadata } from '@/lib/seo/metadata';
import { ContactTemplate } from '../contact/ContactTemplate';
import { DefaultTemplate } from '../default/DefaultTemplate';
import { HomeTemplate } from '../home/HomeTemplate';
import { HubTemplate } from '../hub/HubTemplate';
import { IndustryTemplate } from '../industry/IndustryTemplate';
import { LegalTemplate } from '../legal/LegalTemplate';
import { PricingTemplate } from '../pricing/PricingTemplate';
import { ProductTemplate } from '../product/ProductTemplate';
import { RoadmapTemplate } from '../roadmap/RoadmapTemplate';
import { ServiceTemplate } from '../service/ServiceTemplate';
import { SolutionTemplate } from '../solution/SolutionTemplate';
import { loadEntry, loadPaths } from './data';

/** Types served by the S3 `[slug]` routes, with their path prefix. */
export type CoreType = 'PRODUCT' | 'INDUSTRY' | 'SOLUTION' | 'SERVICE' | 'INTEGRATION';

/** True when a template folder in this set renders the entry. */
export function hasCoreTemplate(entry: Pick<PublicEntry, 'type' | 'data'>): boolean {
  const pageTemplate = entry.data.type === 'PAGE' ? (entry.data.template as PageTemplate) : undefined;
  return CORE_TEMPLATES.has(templateFor(entry.type, pageTemplate));
}

const CORE_TEMPLATES = new Set(['home', 'pricing', 'hub', 'default', 'legal', 'contact', 'roadmap', 'product', 'industry', 'solution', 'service']);

/** Renders an entry with its template (PAGE by `data.template`). */
export function TemplateView({ entry }: { entry: PublicEntry }) {
  const pageTemplate = entry.data.type === 'PAGE' ? (entry.data.template as PageTemplate) : undefined;
  switch (templateFor(entry.type, pageTemplate)) {
    case 'home':
      return <HomeTemplate entry={entry} />;
    case 'pricing':
      return <PricingTemplate entry={entry} />;
    case 'hub':
      return <HubTemplate entry={entry} />;
    case 'roadmap':
      return <RoadmapTemplate entry={entry} />;
    case 'legal':
      return <LegalTemplate entry={entry} />;
    case 'contact':
      return <ContactTemplate entry={entry} />;
    case 'product':
      return <ProductTemplate entry={entry} />;
    case 'industry':
      return <IndustryTemplate entry={entry} />;
    case 'solution':
      return <SolutionTemplate entry={entry} />;
    case 'service':
      return <ServiceTemplate entry={entry} />;
    default:
      return <DefaultTemplate entry={entry} />;
  }
}

function pathFor(type: CoreType, slug: string): string {
  return `/${ENTRY_TYPE_META[type].prefix}/${slug}`;
}

/** generateStaticParams for a typed route: every published slug of the type. */
export async function staticParams(type: CoreType): Promise<{ slug: string }[]> {
  const prefix = `/${ENTRY_TYPE_META[type].prefix}/`;
  const paths = await loadPaths(type);
  return paths.filter((p) => p.startsWith(prefix)).map((p) => ({ slug: p.slice(prefix.length) })).filter((p) => p.slug && !p.slug.includes('/'));
}

/** The entry at a typed path, or null when nothing (of that type) is published there. */
export async function typedEntry(type: CoreType, slug: string): Promise<PublicEntry | null> {
  const entry = await loadEntry(pathFor(type, slug));
  return entry && entry.type === type ? entry : null;
}

export async function typedMetadata(type: CoreType, params: Promise<{ slug: string }>): Promise<Metadata> {
  const { slug } = await params;
  const entry = await typedEntry(type, slug);
  return entry ? buildEntryMetadata(entry) : {};
}

export async function typedPage(type: CoreType, params: Promise<{ slug: string }>) {
  const { slug } = await params;
  const entry = await typedEntry(type, slug);
  if (!entry) return redirectOrNotFound(pathFor(type, slug));
  return <TemplateView entry={entry} />;
}

/** A PAGE entry at a fixed path (home, pricing, roadmap, hubs, faq). The editor's template decides the layout. */
export async function fixedEntry(path: string): Promise<PublicEntry | null> {
  const entry = await loadEntry(path);
  return entry && entry.type === 'PAGE' ? entry : null;
}

export async function fixedMetadata(path: string): Promise<Metadata> {
  const entry = await fixedEntry(path);
  return entry ? buildEntryMetadata(entry) : {};
}

export async function fixedPage(path: string) {
  const entry = await fixedEntry(path);
  if (!entry) return redirectOrNotFound(path);
  return <TemplateView entry={entry} />;
}

