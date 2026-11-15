/**
 * Site search groups: the CMS entry types folded into the groups results
 * are shown under, in display order, with their labels. Shared by the index
 * builder (server) and the search panel (browser).
 */
import type { SiteLocale } from '@/lib/i18n/shell';

export const SEARCH_GROUPS = ['page', 'product', 'industry', 'help', 'learn', 'tools', 'compare', 'city', 'glossary'] as const;
export type SearchGroup = (typeof SEARCH_GROUPS)[number];

/** One index row: [title, summary, path, group index]. Paths already carry the locale prefix. */
export type SearchRow = [title: string, summary: string, path: string, group: number];

export interface SearchIndexFile {
  v: 1;
  rows: SearchRow[];
}

const LABELS: Record<SiteLocale, Record<SearchGroup, string>> = {
  en: {
    page: 'Pages',
    product: 'Products and solutions',
    industry: 'Industries',
    help: 'Help center',
    learn: 'Blog and guides',
    tools: 'Free tools and templates',
    compare: 'Comparisons',
    city: 'Cities',
    glossary: 'Glossary',
  },
  ur: {
    page: 'صفحے',
    product: 'پروڈکٹس اور سلوشنز',
    industry: 'کاروبار',
    help: 'ہیلپ سینٹر',
    learn: 'بلاگ اور گائیڈز',
    tools: 'مفت ٹولز اور ٹیمپلیٹس',
    compare: 'موازنے',
    city: 'شہر',
    glossary: 'اصطلاحات',
  },
};

export function searchGroupLabels(locale: SiteLocale): Record<SearchGroup, string> {
  return LABELS[locale];
}
