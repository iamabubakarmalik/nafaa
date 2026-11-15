/**
 * /tour: the click-through product tour (templates/tour). A code page with
 * no CMS entry; the Urdu twin is app/ur/tour.
 */
import type { Metadata } from 'next';
import { tourStrings } from '@/lib/i18n/tour';
import { buildPageMetadata } from '@/lib/seo/metadata';
import { TOUR_PATH, TourTemplate } from '@/templates/tour/TourTemplate';
import { pageAlternates } from '@/lib/site/alternates';

export const revalidate = 86400;

export async function generateMetadata(): Promise<Metadata> {
  const t = tourStrings('en');
  const base = buildPageMetadata({ title: t.metaTitle, description: t.metaDescription, path: TOUR_PATH, absoluteTitle: true });
  return { ...base, alternates: { ...base.alternates, languages: await pageAlternates(TOUR_PATH) } };
}

export default function Page() {
  return <TourTemplate locale="en" />;
}
