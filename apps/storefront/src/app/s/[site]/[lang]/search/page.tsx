import type { Metadata } from 'next';
import { api } from '@/lib/api';
import { t } from '@/lib/i18n';
import { meta } from '@/lib/seo';
import { site, templateSections, type SiteParams } from '@/lib/store';
import { toQuery } from '@/components/collection/query';
import { Sections } from '@/components/sections/Sections';

type Props = { params: Promise<SiteParams>; searchParams: Promise<Record<string, string | undefined>> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const ctx = await site(params);
  return meta(ctx, { title: t(ctx.lang, 'search.title'), path: '/search', noindex: true });
}

export default async function SearchPage({ params, searchParams }: Props) {
  const ctx = await site(params);
  if (ctx.blocked) return null;
  const sp = await searchParams;
  const q = (sp.q ?? '').trim().slice(0, 80);
  const sections = templateSections(ctx, 'search');
  const perPage = Math.max(8, Math.min(48, Number(sections.find((s) => s.type === 'main_search')?.settings?.perPage) || 24));
  const products = q ? await api.products(ctx.storeId, toQuery(sp, perPage), ctx.opts) : null;
  return <Sections sections={sections} ctx={ctx} data={{ search: products ? { q, products } : { q, products: { items: [], total: 0, page: 1, pages: 0, limit: 24, facets: { brands: [], sizes: [], colors: [], categories: [], price: { min: 0, max: 0 } } } }, query: sp }} />;
}
