/**
 * /product/[slug]: Product entries (PRODUCT), rendered by templates/core/route
 * (template, metadata, JSON-LD, redirect fallback). Static for every
 * published slug; new slugs render on demand (dynamicParams) and refresh on
 * publish through cache tags.
 */
import { staticParams, typedMetadata, typedPage } from '@/templates/core/route';

export const revalidate = 86400;
export const dynamicParams = true;

type Params = Promise<{ slug: string }>;

export function generateStaticParams() {
  return staticParams('PRODUCT');
}

export function generateMetadata({ params }: { params: Params }) {
  return typedMetadata('PRODUCT', params);
}

export default function Page({ params }: { params: Params }) {
  return typedPage('PRODUCT', params);
}
