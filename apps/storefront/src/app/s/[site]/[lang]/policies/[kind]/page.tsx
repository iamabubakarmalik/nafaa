import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import { api } from '@/lib/api';
import { formatDate, stripHtml } from '@/lib/format';
import { meta } from '@/lib/seo';
import { site, type SiteContext, type SiteParams } from '@/lib/store';
import { RichText } from '@/components/ui/RichText';

type Props = { params: Promise<SiteParams & { kind: string }> };
const load = cache((ctx: SiteContext, kind: string) => api.policy(ctx.storeId, kind, ctx.opts));

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await params;
  const ctx = await site(p);
  if (ctx.blocked) return {};
  const pol = await load(ctx, p.kind);
  return pol ? meta(ctx, { title: pol.title, description: stripHtml(pol.bodyHtml), path: `/policies/${p.kind}` }) : {};
}

export default async function PolicyPage({ params }: Props) {
  const p = await params;
  const ctx = await site(p);
  if (ctx.blocked) return null;
  const pol = await load(ctx, p.kind);
  if (!pol) notFound();
  return (
    <section className="pb-20 pt-10 md:pt-16">
      <div className="page max-w-3xl">
        <h1 className="h-display text-3xl font-semibold md:text-[2.6rem]">{pol.title}</h1>
        {pol.updatedAt && <p className="mt-2 text-[13px] text-muted">{formatDate(pol.updatedAt, ctx.lang)}</p>}
        <RichText html={pol.bodyHtml} className="mt-8 text-[16px]" />
      </div>
    </section>
  );
}

/** Rendered on first visit, then cached and refreshed by tag (ISR). */
export async function generateStaticParams() {
  return [];
}
