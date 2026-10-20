/**
 * Body of a catch-all page. PAGE entries (about, contact, legal, marketplace,
 * ...) render with their S3 template by `data.template` (templates/core/
 * route.tsx), which also emits the page's JSON-LD. Anything else falls back
 * to the minimal view below: breadcrumbs, H1, summary and JSON-LD.
 */
import { Container } from '@/components/ui/Container';
import { Heading } from '@/components/ui/Heading';
import { Text } from '@/components/ui/Text';
import { PageBreadcrumbs } from '@/components/layout/Breadcrumbs';
import { JsonLd } from '@/components/seo/JsonLd';
import type { PublicEntry } from '@/lib/cms/contract/cms-contract';
import { getEntity, getLayout } from '@/lib/cms/client';
import { isProduction } from '@/lib/cms/env';
import { buildEntryGraph } from '@/lib/seo/graph';
import { TemplateView, hasCoreTemplate } from '@/templates/core/route';

export async function PageView({ entry }: { entry: PublicEntry }) {
  if (entry.type === 'PAGE' && hasCoreTemplate(entry)) return <TemplateView entry={entry} />;
  const [{ site }, entity] = await Promise.all([getLayout(entry.locale), getEntity(entry.locale)]);
  const hero = entry.blocks.find((block) => block.type === 'hero');
  const heading = (hero?.type === 'hero' && hero.heading) || entry.title;

  return (
    <>
      <JsonLd data={buildEntryGraph(entry, { site, entity })} />
      <Container className="pb-section pt-8">
        <PageBreadcrumbs crumbs={entry.breadcrumbs} />
        <Heading as="h1" className="mt-6">
          {heading}
        </Heading>
        {entry.summary ? (
          <Text size="lg" className="mt-4 max-w-measure">
            {entry.summary}
          </Text>
        ) : null}
        {/* S2/S3: replace from here with the block renderer or the PAGE template. */}
        {!isProduction && entry.blocks.length ? (
          <ul className="mt-10 space-y-1 rounded-md border border-dashed border-line-strong p-4 text-small text-fg-subtle">
            <li className="font-medium text-fg-muted">Blocks waiting for the S2 renderer:</li>
            {entry.blocks.map((block) => (
              <li key={block.id}>
                {block.type}
                {block.anchor ? ` #${block.anchor}` : ''}
              </li>
            ))}
          </ul>
        ) : null}
      </Container>
    </>
  );
}
