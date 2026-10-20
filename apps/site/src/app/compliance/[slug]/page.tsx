/**
 * Compliance page: /compliance/{slug} (COMPLIANCE).
 * Thin route: data and layout live in the template.
 */
import type { Metadata } from 'next';
import { redirectOrNotFound } from '@/lib/cms/redirects';
import { isSlug, staticParamsFor, typedEntry, typedMetadata } from '@/templates/city/common/route';
import { ComplianceTemplate } from '@/templates/compliance/ComplianceTemplate';

export const revalidate = 86400;
export const dynamicParams = true;

const TYPES = ['COMPLIANCE'] as const;
type Params = Promise<{ slug: string }>;

export function generateStaticParams() {
  return staticParamsFor(TYPES[0], (segments) => (segments.length === 2 ? { slug: segments[1]! } : null));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  if (!(isSlug(slug))) return {};
  return typedMetadata(`/compliance/${slug}`, TYPES);
}

export default async function Page({ params }: { params: Params }) {
  const { slug } = await params;
  const path = `/compliance/${slug}`;
  const entry = isSlug(slug) ? await typedEntry(path, TYPES) : null;
  if (!entry) return redirectOrNotFound(path);
  return <ComplianceTemplate entry={entry} />;
}
