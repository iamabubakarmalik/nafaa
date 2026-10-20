/**
 * Glossary hub: /glossary (PAGE hub). Lists every published GLOSSARY_TERM
 * A-Z; the list refreshes with the `type:<locale>:GLOSSARY_TERM` tag.
 */
import type { Metadata } from 'next';
import { loadCards } from '@/templates/article/data';
import { loadPage, pageMetadata } from '@/templates/article/route-helpers';
import { GlossaryIndexTemplate } from '@/templates/glossary/GlossaryIndexTemplate';

export const revalidate = 86400;

const PATH = '/glossary';

export function generateMetadata(): Promise<Metadata> {
  return pageMetadata(PATH, ['PAGE']);
}

export default async function Page() {
  const page = await loadPage(PATH, ['PAGE']);
  const terms = await loadCards({ type: 'GLOSSARY_TERM', locale: page.entry.locale, sort: 'title', limit: 200 });
  return <GlossaryIndexTemplate {...page} terms={terms} />;
}
