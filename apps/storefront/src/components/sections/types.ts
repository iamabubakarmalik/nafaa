import type { Article, BlogList, CollectionDetail, ProductDetail, ProductList, Section } from '@/lib/api';
import type { SiteContext } from '@/lib/store';

/** Data a page hands to its template's main sections. */
export interface PageData {
  product?: ProductDetail;
  collection?: { collection: CollectionDetail; products: ProductList };
  search?: { q: string; products: ProductList };
  query?: Record<string, string | undefined>;
  html?: { title: string; bodyHtml: string };
  blog?: BlogList;
  article?: Article;
}

export interface SectionProps {
  section: Section;
  ctx: SiteContext;
  index: number;
  data?: PageData;
}
