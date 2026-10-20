/**
 * Default OG card for every route without its own opengraph-image.tsx.
 * Text comes from settings (site name, entity description); no claims.
 */
import { OG_CONTENT_TYPE, OG_SIZE, renderOgCard } from '@/lib/og';
import { getEntity, getLayout } from '@/lib/cms/client';
import { siteUrl } from '@/lib/cms/env';

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = 'Nafaa';
export const revalidate = 86400;

export default async function Image() {
  const [{ site }, entity] = await Promise.all([getLayout(), getEntity()]);
  return renderOgCard({
    title: entity?.brandName ?? site.name,
    summary: entity?.description ?? null,
    url: siteUrl(),
  });
}
