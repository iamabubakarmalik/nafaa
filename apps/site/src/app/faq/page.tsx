/**
 * /faq: the FAQ hub. The PAGE entry at /faq supplies the hero and metadata;
 * the questions come from every published FAQ, grouped by topic
 * (templates/hub/FaqHub). 404 (or a redirect) when the page is not published.
 */
import { redirectOrNotFound } from '@/lib/cms/redirects';
import { FaqHub } from '@/templates/hub/FaqHub';
import { fixedEntry, fixedMetadata } from '@/templates/core/route';

export const revalidate = 86400;

export function generateMetadata() {
  return fixedMetadata('/faq');
}

export default async function Page() {
  const entry = await fixedEntry('/faq');
  if (!entry) return redirectOrNotFound('/faq');
  return <FaqHub entry={entry} />;
}
