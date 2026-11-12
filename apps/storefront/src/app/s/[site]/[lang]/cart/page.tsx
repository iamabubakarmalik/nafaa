import type { Metadata } from 'next';
import { t } from '@/lib/i18n';
import { meta } from '@/lib/seo';
import { site, templateSections, type SiteParams } from '@/lib/store';
import { Sections } from '@/components/sections/Sections';

type Props = { params: Promise<SiteParams> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const ctx = await site(params);
  return meta(ctx, { title: t(ctx.lang, 'cart.title'), path: '/cart', noindex: true });
}

export default async function CartPage({ params }: Props) {
  const ctx = await site(params);
  if (ctx.blocked) return null;
  return <Sections sections={templateSections(ctx, 'cart')} ctx={ctx} />;
}
