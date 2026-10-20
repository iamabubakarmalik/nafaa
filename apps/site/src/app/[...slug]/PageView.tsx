/**
 * Body of a catch-all PAGE. Until the block renderer (S2) and the PAGE
 * templates (S3) land, this renders the breadcrumbs, the H1, the summary and
 * the page's JSON-LD; in development it also lists the blocks waiting for a
 * renderer. S2/S3 replace the marked part with
 * `<BlockRenderer blocks={entry.blocks} entry={entry} />` or the template.
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

export async function PageView({ entry }: { entry: PublicEntry }) {
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
