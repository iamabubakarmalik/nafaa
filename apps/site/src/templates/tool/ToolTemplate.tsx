/**
 * Tool template (ARCH 8, TOOL): H1 and a one-line answer, the calculator
 * island straight away (above the fold on desktop), then "How it's
 * calculated" with sources, examples and FAQs from the body blocks, related
 * pages and a closing CTA. `data.toolKey` picks the island; a `tool` block
 * places it inside the body instead when the editor wants text first.
 * Schema: WebPage + WebApplication (free) + FAQPage (S1 graph).
 */
import type { PublicEntity, PublicEntry, SiteSettings } from '@/lib/cms/contract/cms-contract';
import { Container } from '@/components/ui/Container';
import { JsonLd } from '@/components/seo/JsonLd';
import { ToolIsland, TOOL_META } from '@/components/islands/tools';
import { Body, ClosingCta } from '../article/parts/Body';
import { CardGrid, ContentCard } from '../article/parts/Cards';
import { FixtureRibbon } from '../article/parts/FixtureRibbon';
import { formatDate, isoDate } from '../article/parts/format';
import { s5Graph } from '../article/parts/graph';
import { PageHeader } from '../article/parts/Headers';

const TYPE_LABEL: Partial<Record<string, string>> = { GUIDE: 'Guide', BLOG_POST: 'Article', TOOL: 'Free tool', GLOSSARY_TERM: 'Glossary', COMPLIANCE: 'Compliance', PRODUCT: 'Product' };

export function ToolTemplate({ entry, site, entity }: { entry: PublicEntry; site: SiteSettings; entity: PublicEntity | null }) {
  if (entry.data.type !== 'TOOL') return null;
  const { toolKey } = entry.data;
  const placedInBody = entry.blocks.some((block) => block.type === 'tool' && !block.hidden);
  const graph = s5Graph({ entry, site, entity });

  return (
    <>
      <JsonLd data={graph} />
      <FixtureRibbon entry={entry} />
      <PageHeader
        entry={entry}
        eyebrow={`Free tool · ${TOOL_META[toolKey].label}`}
        eyebrowHref="/tools"
        className="border-b-0"
        meta={
          <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-small text-fg-subtle">
            <span className="inline-flex items-center gap-1.5">
              <span aria-hidden className="size-1.5 rounded-full bg-brand-600" />
              Free, no sign-up
            </span>
            <span>Runs in your browser</span>
            {entry.dateModified ? (
              <span>
                Updated <time dateTime={isoDate(entry.dateModified)}>{formatDate(entry.dateModified)}</time>
              </span>
            ) : null}
          </p>
        }
      />
      {!placedInBody ? (
        <Container className="-mt-4 pb-12">
          <ToolIsland toolKey={toolKey} />
        </Container>
      ) : null}

      <div className="pb-8">
        <Body entry={entry} variant="tool" withFaqs renderTool={(key) => <ToolIsland toolKey={key} />} />
      </div>

      {entry.related.length ? (
        <section aria-labelledby="related-pages" className="theme-muted border-t border-line/70 bg-canvas py-16 md:py-20">
          <Container>
            <h2 id="related-pages" className="text-h3 text-fg-strong">
              Related
            </h2>
            <CardGrid className="mt-8">
              {entry.related.slice(0, 3).map((card) => (
                <ContentCard key={card.id} card={card} eyebrow={TYPE_LABEL[card.type]} date={null} icon={card.type === 'TOOL' ? card.icon : undefined} />
              ))}
            </CardGrid>
          </Container>
        </section>
      ) : null}
      <ClosingCta entry={entry} site={site} />
    </>
  );
}
