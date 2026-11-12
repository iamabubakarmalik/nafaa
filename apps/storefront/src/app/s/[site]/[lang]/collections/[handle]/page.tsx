import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { api } from '@/lib/api';
import { stripHtml } from '@/lib/format';
import { t } from '@/lib/i18n';
import { meta } from '@/lib/seo';
import { site, templateSections, type SiteParams } from '@/lib/store';
import { toQuery } from '@/components/collection/query';
import { Sections } from '@/components/sections/Sections';

type Props = { params: Promise<SiteParams & { handle: string }>; searchParams: Promise<Record<string, string | undefined>> };

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const p = await params;
  const ctx = await site(p);
  if (ctx.blocked) return {};
  const sp = await searchParams;
  const filtered = Object.keys(sp).some((k) => k !== 'page');
  const c = await api.collection(ctx.storeId, p.handle, { limit: 1 }, ctx.opts);
  if (!c) return {};
  const title = p.handle === 'all' ? t(ctx.lang, 'collection.all') : c.collection.seo.title || c.collection.title;
  return meta(ctx, { title, description: c.collection.seo.description || stripHtml(c.collection.descriptionHtml), path: c.collection.url || `/collections/${p.handle}`, image: c.collection.image, noindex: filtered });
}

export default async function CollectionPage({ params, searchParams }: Props) {
  const p = await params;
  const ctx = await site(p);
  if (ctx.blocked) return null;
  const sp = await searchParams;
  const sections = templateSections(ctx, 'collection');
  const main = sections.find((s) => s.type === 'main_collection');
  const limit = Math.max(8, Math.min(48, Number(main?.settings?.perPage ?? main?.settings?.limit) || 24));
  const c = await api.collection(ctx.storeId, p.handle, toQuery(sp, limit), ctx.opts);
  if (!c) notFound();
  if (p.handle === 'all') c.collection.title = c.collection.title || t(ctx.lang, 'collection.all');
  return <Sections sections={sections} ctx={ctx} data={{ collection: c, query: sp }} />;
}
