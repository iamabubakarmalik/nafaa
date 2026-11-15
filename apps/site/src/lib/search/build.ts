/**
 * Builds the compact site search index for one locale (server only): the
 * CMS search index (`/public/site/search-index`) plus the code pages (the
 * product tour), as short rows. Served as static JSON by
 * app/search-index/[file] and fetched by the search panel only when it opens.
 */
import { getSearchIndex } from '@/lib/cms/client';
import type { CmsEntryType } from '@/lib/cms/contract/cms-contract';
import { localizePath } from '@/lib/cms/locale';
import type { SiteLocale } from '@/lib/i18n/shell';
import { tourStrings } from '@/lib/i18n/tour';
import { SEARCH_GROUPS, type SearchGroup, type SearchIndexFile, type SearchRow } from './groups';

const SUMMARY_MAX = 120;

const TYPE_GROUP: Partial<Record<CmsEntryType, SearchGroup>> = {
  PRODUCT: 'product',
  SOLUTION: 'product',
  SERVICE: 'product',
  INTEGRATION: 'product',
  INDUSTRY: 'industry',
  CITY: 'city',
  CITY_INDUSTRY: 'city',
  DOC: 'help',
  BLOG_POST: 'learn',
  BLOG_CATEGORY: 'learn',
  GUIDE: 'learn',
  CASE_STUDY: 'learn',
  CHANGELOG: 'learn',
  TOOL: 'tools',
  TEMPLATE: 'tools',
  COMPARE: 'compare',
  ALTERNATIVE: 'compare',
  BEST_OF: 'compare',
  GLOSSARY_TERM: 'glossary',
};

function groupOf(type: CmsEntryType, path: string): SearchGroup {
  if (path === '/help' || path.startsWith('/help/')) return 'help';
  return TYPE_GROUP[type] ?? 'page';
}

/** Cuts a summary at a word boundary near SUMMARY_MAX characters. */
function shorten(text: string | undefined): string {
  const clean = (text ?? '').replace(/\s+/g, ' ').trim();
  if (clean.length <= SUMMARY_MAX) return clean;
  const cut = clean.slice(0, SUMMARY_MAX);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(' '), 80)).replace(/[,;:.\s]+$/, '')}…`;
}

export async function buildSearchIndex(locale: SiteLocale): Promise<SearchIndexFile> {
  const { items } = await getSearchIndex(locale);
  const tour = tourStrings(locale);
  const seen = new Set<string>();
  const rows: SearchRow[] = [];
  const add = (title: string, summary: string | undefined, path: string, group: SearchGroup) => {
    const href = localizePath(locale, path);
    if (seen.has(href) || !title.trim()) return;
    seen.add(href);
    rows.push([title.trim(), shorten(summary), href, SEARCH_GROUPS.indexOf(group)]);
  };
  add(tour.kicker, tour.metaDescription, '/tour', 'page');
  for (const item of items) add(item.title, item.summary, item.path, groupOf(item.type, item.path));
  return { v: 1, rows };
}
