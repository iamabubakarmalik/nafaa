/**
 * /ur/tour: the product tour in Urdu. 404 until settings `site.locales`
 * lists "ur", like every other /ur page.
 */
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getLayout } from '@/lib/cms/client';
import { DEFAULT_LOCALE } from '@/lib/cms/locale';
import { tourStrings } from '@/lib/i18n/tour';
import { buildPageMetadata } from '@/lib/seo/metadata';
import { TOUR_PATH, TourTemplate } from '@/templates/tour/TourTemplate';
import { pageAlternates } from '@/lib/site/alternates';

export const revalidate = 86400;

async function urduLive(): Promise<boolean> {
  const { site } = await getLayout(DEFAULT_LOCALE);
  return site.locales.includes('ur');
}

export async function generateMetadata(): Promise<Metadata> {
  if (!(await urduLive())) return {};
  const t = tourStrings('ur');
  const base = buildPageMetadata({ title: t.metaTitle, description: t.metaDescription, path: TOUR_PATH, locale: 'ur', absoluteTitle: true });
  return { ...base, alternates: { ...base.alternates, languages: await pageAlternates(TOUR_PATH) } };
}

export default async function Page() {
  if (!(await urduLive())) notFound();
  return <TourTemplate locale="ur" />;
}
