/**
 * Person: /team/{slug} (PERSON). Thin route: data and layout live in
 * the template.
 */
import type { Metadata } from 'next';
import type { CmsEntryType } from '@/lib/cms/contract/cms-contract';
import { staticSlugs } from '@/templates/article/data';
import { loadPage, pageMetadata } from '@/templates/article/route-helpers';
import { PersonTemplate } from '@/templates/person/PersonTemplate';

export const revalidate = 86400;
export const dynamicParams = true;

const PREFIX = '/team';
const TYPES: readonly CmsEntryType[] = ['PERSON'];
type Params = Promise<{ slug: string }>;

export async function generateStaticParams(): Promise<{ slug: string }[]> {
  const slugs = await staticSlugs(TYPES[0]!, PREFIX);
  return slugs.filter((s) => s.length === 1).map(([slug]) => ({ slug: slug! }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  return pageMetadata(`${PREFIX}/${slug}`, TYPES);
}

export default async function Page({ params }: { params: Params }) {
  const { slug } = await params;
  const page = await loadPage(`${PREFIX}/${slug}`, TYPES);
  return <PersonTemplate {...page} />;
}
