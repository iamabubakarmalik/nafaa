import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import { api } from '@/lib/api';
import { stripHtml } from '@/lib/format';
import { JsonLd, meta, pageUrl } from '@/lib/seo';
import { site, templateSections, type SiteContext, type SiteParams } from '@/lib/store';
import { Sections } from '@/components/sections/Sections';

type Props = { params: Promise<SiteParams & { blog: string; post: string }> };
const load = cache((ctx: SiteContext, blog: string, post: string) => api.article(ctx.storeId, blog, post, ctx.opts));

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await params;
  const ctx = await site(p);
  if (ctx.blocked) return {};
  const a = await load(ctx, p.blog, p.post);
  return a ? meta(ctx, { title: a.seo?.title || a.title, description: a.seo?.description || stripHtml(a.bodyHtml), path: `/blogs/${p.blog}/${p.post}`, image: a.image, type: 'article' }) : {};
}

export default async function ArticlePage({ params }: Props) {
  const p = await params;
  const ctx = await site(p);
  if (ctx.blocked) return null;
  const a = await load(ctx, p.blog, p.post);
  if (!a) notFound();
  return (
    <>
      <Sections sections={templateSections(ctx, 'article')} ctx={ctx} data={{ article: a }} />
      <JsonLd data={{ '@context': 'https://schema.org', '@type': 'BlogPosting', headline: a.title, image: a.image ?? undefined, datePublished: a.publishedAt, author: a.author ? { '@type': 'Person', name: a.author } : undefined, mainEntityOfPage: pageUrl(ctx, `/blogs/${p.blog}/${p.post}`) }} />
    </>
  );
}

/** Rendered on first visit, then cached and refreshed by tag (ISR). */
export async function generateStaticParams() {
  return [];
}
