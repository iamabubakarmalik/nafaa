import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import { api } from '@/lib/api';
import { stripHtml } from '@/lib/format';
import { meta } from '@/lib/seo';
import { site, templateSections, type SiteContext, type SiteParams } from '@/lib/store';
import { Sections } from '@/components/sections/Sections';

type Props = { params: Promise<SiteParams & { handle: string }> };
const load = cache((ctx: SiteContext, handle: string) => api.page(ctx.storeId, handle, ctx.opts));

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await params;
  const ctx = await site(p);
  if (ctx.blocked) return {};
  const page = await load(ctx, p.handle);
  if (!page) return {};
  return meta(ctx, { title: page.seo?.title || page.title, description: page.seo?.description || stripHtml(page.bodyHtml), path: `/pages/${page.handle}` });
}

export default async function CustomPage({ params }: Props) {
  const p = await params;
  const ctx = await site(p);
  if (ctx.blocked) return null;
  const page = await load(ctx, p.handle);
  if (!page) notFound();
  return <Sections sections={templateSections(ctx, 'page')} ctx={ctx} data={{ html: { title: page.title, bodyHtml: page.bodyHtml } }} />;
}

/** Rendered on first visit, then cached and refreshed by tag (ISR). */
export async function generateStaticParams() {
  return [];
}
