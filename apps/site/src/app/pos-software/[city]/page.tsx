/**
 * City hub: /pos-software/{city} (CITY, CityHub template).
 * Thin route: data and layout live in the template.
 */
import type { Metadata } from 'next';
import { redirectOrNotFound } from '@/lib/cms/redirects';
import { isSlug, staticParamsFor, typedEntry, typedMetadata } from '@/templates/city/common/route';
import { CityTemplate } from '@/templates/city/CityTemplate';

export const revalidate = 86400;
export const dynamicParams = true;

const TYPES = ['CITY'] as const;
type Params = Promise<{ city: string }>;

export function generateStaticParams() {
  return staticParamsFor(TYPES[0], (segments) => (segments.length === 2 ? { city: segments[1]! } : null));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { city } = await params;
  if (!(isSlug(city))) return {};
  return typedMetadata(`/pos-software/${city}`, TYPES);
}

export default async function Page({ params }: { params: Params }) {
  const { city } = await params;
  const path = `/pos-software/${city}`;
  const entry = isSlug(city) ? await typedEntry(path, TYPES) : null;
  if (!entry) return redirectOrNotFound(path);
  return <CityTemplate entry={entry} />;
}
