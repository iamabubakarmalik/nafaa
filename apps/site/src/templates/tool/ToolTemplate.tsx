/**
 * Tool template (ARCH 8, TOOL): H1 and a one-line answer, the calculator
 * island straight away (above the fold on desktop), then "How it's
 * calculated" with sources, examples and FAQs from the body blocks, related
 * pages and a closing CTA. `data.toolKey` picks the island; a `tool` block
 * places it inside the body instead when the editor wants text first.
 * Schema: WebPage + WebApplication (free) + FAQPage (S1 graph), plus a
 * HowTo for each `steps` block marked `howTo` (added here as extra nodes).
 */
import type { PublicEntity, PublicEntry, SiteSettings } from '@/lib/cms/contract/cms-contract';
import { Container } from '@/components/ui/Container';
import { JsonLd } from '@/components/seo/JsonLd';
import { ToolIsland, toolLabel } from '@/components/islands/tools';
import { localizePath } from '@/lib/cms/locale';
import { uiStrings } from '@/lib/i18n/ui';
import { markdownToPlain } from '@/lib/seo/text';
import { Body, ClosingCta } from '../article/parts/Body';
import { CardGrid, ContentCard } from '../article/parts/Cards';
import { FixtureRibbon } from '../article/parts/FixtureRibbon';
import { formatDate, isoDate } from '../article/parts/format';
import { s5Graph } from '../article/parts/graph';
import { PageHeader } from '../article/parts/Headers';

/** HowTo nodes for the entry's "how to use" steps, mirroring the steps shown on the page. */
function howToNodes(entry: PublicEntry): Record<string, unknown>[] {
  return entry.blocks.flatMap((block, i) =>
    block.type === 'steps' && block.howTo === true && !block.hidden
      ? [
          {
            '@type': 'HowTo',
            '@id': `${entry.url}#howto-${i + 1}`,
            name: block.heading,
            tool: { '@id': `${entry.url}#app` },
            step: block.items.map((item, position) => ({ '@type': 'HowToStep', position: position + 1, name: item.title, text: markdownToPlain(item.body) })),
          },
        ]
      : [],
  );
}

export function ToolTemplate({ entry, site, entity }: { entry: PublicEntry; site: SiteSettings; entity: PublicEntity | null }) {
  if (entry.data.type !== 'TOOL') return null;
  const { toolKey } = entry.data;
  const placedInBody = entry.blocks.some((block) => block.type === 'tool' && !block.hidden);
  const graph = s5Graph({ entry, site, entity, extra: howToNodes(entry) });
  const ui = uiStrings(entry.locale);
  const t = ui.content;
  const locale = entry.locale;

  return (
    <>
      <JsonLd data={graph} />
      <FixtureRibbon entry={entry} />
      <PageHeader
        entry={entry}
        eyebrow={`${t.freeTool} · ${toolLabel(toolKey, locale)}`}
        eyebrowHref={localizePath(locale, '/tools')}
        className="border-b-0"
        meta={
          <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-small text-fg-subtle">
            <span className="inline-flex items-center gap-1.5">
              <span aria-hidden className="size-1.5 rounded-full bg-brand-600" />
              {t.freeNoSignup}
            </span>
            <span>{t.runsInBrowser}</span>
            {entry.dateModified ? (
              <span>
                {ui.updated} <time dateTime={isoDate(entry.dateModified)}>{formatDate(entry.dateModified, locale)}</time>
              </span>
            ) : null}
          </p>
        }
      />
      {!placedInBody ? (
        <Container className="-mt-4 pb-12">
          <ToolIsland toolKey={toolKey} locale={locale} />
        </Container>
      ) : null}

      <div className="pb-8">
        <Body entry={entry} variant="tool" withFaqs renderTool={(key) => <ToolIsland toolKey={key} locale={locale} />} />
      </div>

      {entry.related.length ? (
        <section aria-labelledby="related-pages" className="theme-muted border-t border-line/70 bg-canvas py-16 md:py-20">
          <Container>
            <h2 id="related-pages" className="text-h3 text-fg-strong">
              {t.related}
            </h2>
            <CardGrid className="mt-8">
              {entry.related.slice(0, 3).map((card) => (
                <ContentCard key={card.id} card={card} eyebrow={card.type === 'INDUSTRY' ? undefined : t.typeLabels[card.type]} date={null} icon={card.type === 'TOOL' ? card.icon : undefined} />
              ))}
            </CardGrid>
          </Container>
        </section>
      ) : null}
      <ClosingCta entry={entry} site={site} />
    </>
  );
}
