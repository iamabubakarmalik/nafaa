/**
 * Urdu pages: /ur and /ur/<cms path>. The entry is the `ur` entry at the
 * same CMS path; it renders with the template its English twin uses
 * (core templates, the city hub, the FAQ hub, and the tool, article,
 * glossary and content hub templates). Types without an Urdu-ready template
 * fall back to the catch-all's minimal view.
 *
 * Only while settings `site.locales` lists "ur"; before that every /ur path
 * goes to the redirect table and then 404, as any unknown path does.
 */
import type { Metadata } from 'next';
import { CmsError, getEntity, getEntry, getLayout, getPaths } from '@/lib/cms/client';
import type { PublicEntry } from '@/lib/cms/contract/cms-contract';
import { isProduction } from '@/lib/cms/env';
import { DEFAULT_LOCALE, localizePath } from '@/lib/cms/locale';
import { redirectOrNotFound } from '@/lib/cms/redirects';
import { buildEntryMetadata } from '@/lib/seo/metadata';
import { CityTemplate } from '@/templates/city/CityTemplate';
import { TemplateView, hasCoreTemplate } from '@/templates/core/route';
import { ArticleTemplate } from '@/templates/article/ArticleTemplate';
import { loadCards } from '@/templates/article/data';
import { BlogCategoryTemplate, BlogIndexTemplate, TemplatesHubTemplate, ToolsHubTemplate } from '@/templates/article/HubTemplates';
import { GlossaryIndexTemplate } from '@/templates/glossary/GlossaryIndexTemplate';
import { GlossaryTermTemplate } from '@/templates/glossary/GlossaryTermTemplate';
import { ToolTemplate } from '@/templates/tool/ToolTemplate';
import { FaqHub } from '@/templates/hub/FaqHub';
import { PageView } from '../../[...slug]/PageView';

export const revalidate = 86400;
export const dynamicParams = true;

const LOCALE = 'ur';

type Params = Promise<{ slug?: string[] }>;

async function urduLive(): Promise<boolean> {
  const { site } = await getLayout(DEFAULT_LOCALE);
  return site.locales.includes(LOCALE);
}

export async function generateStaticParams(): Promise<{ slug: string[] }[]> {
  try {
    if (!(await urduLive())) return [];
    const items = await getPaths(undefined, LOCALE);
    return items.map((item) => ({ slug: item.path.split('/').filter(Boolean) }));
  } catch (error) {
    // Production builds fail when the API is down (ARCH 7.1); local work renders on demand.
    if (isProduction) throw error;
    return [];
  }
}

async function resolve(params: Params): Promise<{ requestPath: string; entry: PublicEntry | null }> {
  const { slug = [] } = await params;
  const path = slug.length ? `/${slug.join('/')}` : '/';
  const requestPath = localizePath(LOCALE, path);
  if (!(await urduLive())) return { requestPath, entry: null };
  try {
    return { requestPath, entry: await getEntry(path, LOCALE) };
  } catch (error) {
    if (isProduction || !(error instanceof CmsError || error instanceof TypeError)) throw error;
    return { requestPath, entry: null };
  }
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { entry } = await resolve(params);
  return entry ? buildEntryMetadata(entry, { hasOgRoute: false }) : {};
}

/** Content pages (tools, templates, blog, glossary and their hubs) use the same templates as their English routes. */
const CONTENT_HUBS = new Set(['/tools', '/templates', '/blog', '/glossary']);
const CONTENT_TYPES = new Set<PublicEntry['type']>(['TOOL', 'TEMPLATE', 'BLOG_POST', 'BLOG_CATEGORY', 'GLOSSARY_TERM']);

async function ContentView({ entry }: { entry: PublicEntry }) {
  const [{ site }, entity] = await Promise.all([getLayout(entry.locale), getEntity(entry.locale)]);
  const page = { entry, site, entity };
  switch (entry.type) {
    case 'TOOL':
      return <ToolTemplate {...page} />;
    case 'TEMPLATE':
    case 'BLOG_POST':
      return <ArticleTemplate {...page} />;
    case 'BLOG_CATEGORY':
      return <BlogCategoryTemplate {...page} />;
    case 'GLOSSARY_TERM':
      return <GlossaryTermTemplate {...page} />;
    default:
      break;
  }
  if (entry.path === '/tools') return <ToolsHubTemplate {...page} />;
  if (entry.path === '/templates') return <TemplatesHubTemplate {...page} />;
  if (entry.path === '/blog') return <BlogIndexTemplate {...page} />;
  const terms = await loadCards({ type: 'GLOSSARY_TERM', locale: entry.locale, sort: 'title', limit: 200 });
  return <GlossaryIndexTemplate {...page} terms={terms} />;
}

function UrduView({ entry }: { entry: PublicEntry }) {
  if (CONTENT_TYPES.has(entry.type) || (entry.type === 'PAGE' && CONTENT_HUBS.has(entry.path))) return <ContentView entry={entry} />;
  if (entry.type === 'CITY') return <CityTemplate entry={entry} />;
  if (entry.type === 'PAGE' && entry.path === '/faq') return <FaqHub entry={entry} />;
  if (hasCoreTemplate(entry)) return <TemplateView entry={entry} />;
  return <PageView entry={entry} />;
}

export default async function UrduPage({ params }: { params: Params }) {
  const { requestPath, entry } = await resolve(params);
  if (!entry) return redirectOrNotFound(requestPath);
  return <UrduView entry={entry} />;
}
