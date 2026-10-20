/**
 * City × industry page: /pos-software/{city}/{industry} (CITY_INDUSTRY, CityHub pair variant).
 * Gated by the API: it needs evidence to publish, and stays noindex below 900 words or over the similarity limit.
 * Thin route: data and layout live in the template.
 */
import type { Metadata } from 'next';
import { redirectOrNotFound } from '@/lib/cms/redirects';
import { isSlug, staticParamsFor, typedEntry, typedMetadata } from '@/templates/city/common/route';
import { CityTemplate } from '@/templates/city/CityTemplate';

export const revalidate = 86400;
export const dynamicParams = true;

const TYPES = ['CITY_INDUSTRY'] as const;
type Params = Promise<{ city: string; industry: string }>;

export function generateStaticParams() {
  return staticParamsFor(TYPES[0], (segments) => (segments.length === 3 ? { city: segments[1]!, industry: segments[2]! } : null));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { city, industry } = await params;
  if (!(isSlug(city) && isSlug(industry))) return {};
  return typedMetadata(`/pos-software/${city}/${industry}`, TYPES);
}

export default async function Page({ params }: { params: Params }) {
  const { city, industry } = await params;
  const path = `/pos-software/${city}/${industry}`;
  const entry = isSlug(city) && isSlug(industry) ? await typedEntry(path, TYPES) : null;
  if (!entry) return redirectOrNotFound(path);
  return <CityTemplate entry={entry} />;
}
