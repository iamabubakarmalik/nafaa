import type { Metadata } from 'next';
import { site, templateSections, type SiteParams } from '@/lib/store';
import { meta } from '@/lib/seo';
import { Sections } from '@/components/sections/Sections';
import { reader } from '@/lib/settings';
import type { Section } from '@/lib/api';
import type { SiteContext } from '@/lib/store';

/** Text tone of a leading hero or slideshow, for the see-through header; null when the page starts with something else. */
function heroTone(ctx: SiteContext, sections: Section[]): 'light' | 'dark' | null {
  const first = sections.find((x) => !x.hidden);
  if (first?.type === 'slideshow') return 'light';
  if (first?.type !== 'hero') return null;
  const r = reader(first, ctx.lang);
  return r.image('image') && r.pick('textColor', ['light', 'dark'] as const, 'light') === 'light' ? 'light' : 'dark';
}

type Props = { params: Promise<SiteParams> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const ctx = await site(params);
  const s = ctx.boot.settings;
  return { ...meta(ctx, { path: '/', description: s.seo.description }), title: { absolute: s.seo.title || (s.tagline ? `${ctx.boot.store.name} | ${s.tagline}` : ctx.boot.store.name) } };
}

export default async function Home({ params }: Props) {
  const ctx = await site(params);
  if (ctx.blocked) return null;
  const sections = templateSections(ctx, 'home');
  const tone = heroTone(ctx, sections);
  return (
    <>
      {tone && <span data-home-hero={tone} hidden />}
      <Sections sections={sections} ctx={ctx} />
    </>
  );
}
