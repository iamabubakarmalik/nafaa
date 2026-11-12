import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { api } from '@/lib/api';
import { meta } from '@/lib/seo';
import { site, templateSections, type SiteParams } from '@/lib/store';
import { Sections } from '@/components/sections/Sections';

type Props = { params: Promise<SiteParams & { blog: string }>; searchParams: Promise<{ page?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await params;
  const ctx = await site(p);
  if (ctx.blocked) return {};
  const b = await api.blog(ctx.storeId, p.blog, 1, ctx.opts);
  return b ? meta(ctx, { title: b.blog.title, path: `/blogs/${p.blog}` }) : {};
}

export default async function BlogPage({ params, searchParams }: Props) {
  const p = await params;
  const ctx = await site(p);
  if (ctx.blocked) return null;
  const page = Math.max(1, Number((await searchParams).page) || 1);
  const b = await api.blog(ctx.storeId, p.blog, page, ctx.opts);
  if (!b) notFound();
  return <Sections sections={templateSections(ctx, 'blog')} ctx={ctx} data={{ blog: b }} />;
}
