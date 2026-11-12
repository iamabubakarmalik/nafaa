import type { Metadata } from 'next';
import { site, templateSections, type SiteParams } from '@/lib/store';
import { meta } from '@/lib/seo';
import { Sections } from '@/components/sections/Sections';

type Props = { params: Promise<SiteParams> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const ctx = await site(params);
  const s = ctx.boot.settings;
  return { ...meta(ctx, { path: '/', description: s.seo.description }), title: { absolute: s.seo.title || (s.tagline ? `${ctx.boot.store.name} | ${s.tagline}` : ctx.boot.store.name) } };
}

export default async function Home({ params }: Props) {
  const ctx = await site(params);
  if (ctx.blocked) return null;
  return <Sections sections={templateSections(ctx, 'home')} ctx={ctx} />;
}
