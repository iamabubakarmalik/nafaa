/**
 * Templates hub: /templates (PAGE hub, ARCH 5.2). Thin route: the list, layout and
 * schema live in the template.
 */
import type { Metadata } from 'next';
import { TemplatesHubTemplate } from '@/templates/article/HubTemplates';
import { loadPage, pageMetadata } from '@/templates/article/route-helpers';

export const revalidate = 86400;

const PATH = '/templates';

export function generateMetadata(): Promise<Metadata> {
  return pageMetadata(PATH, ['PAGE']);
}

export default async function Page() {
  const page = await loadPage(PATH, ['PAGE']);
  return <TemplatesHubTemplate {...page} />;
}
