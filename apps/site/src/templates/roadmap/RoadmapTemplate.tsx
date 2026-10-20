/**
 * Roadmap template (PAGE `/roadmap`, data.template "roadmap"; contract
 * 1.1.0). Starter blocks: hero → answerBox → entryGrid PRODUCT (beta, coming)
 * → entryGrid INTEGRATION (beta, coming) → cta → faq.
 *
 * Each entryGrid becomes a board with a "Beta" and a "Coming soon" column
 * (badge text from FEATURE_STATUS_BADGES, English with the Roman Urdu line),
 * so nothing unbuilt ever reads as live. No dates are shown: the CMS has no
 * dated plan, and none is invented. Live entries are left off this page.
 *
 * The page itself renders with the showcase kit (stage hero, closing CTA
 * band); each entryGrid becomes a board.
 *
 * Schema: WebPage (graph.ts has no roadmap node, so the template adds it)
 * plus an ItemList of every roadmap item and the FAQPage of the visible FAQs.
 */
import { FEATURE_STATUS_BADGES, ENTRY_TYPE_META, type Block, type EntryCard, type FeatureStatus, type PublicEntry } from '@/lib/cms/contract/cms-contract';
import { markdownToPlain } from '@/lib/seo/text';
import { itemListNode } from '@/lib/seo/graph';
import { loadCards } from '../core/data';
import { PageFrame, faqPageNode, webPageNode } from '../core/frame';
import { ShowcaseBody } from '../showcase/ShowcaseBody';
import { EntryTile } from '../core/ui';

type GridBlock = Extract<Block, { type: 'entryGrid' }>;
const COLUMNS: Exclude<FeatureStatus, 'live'>[] = ['beta', 'coming'];

function Board({ block, cards }: { block: GridBlock; cards: EntryCard[] }) {
  const id = `roadmap-${block.id}`;
  const title = block.heading?.trim() || ENTRY_TYPE_META[block.entryType].labelPlural;
  // Only the columns that have items; an empty column adds nothing.
  const cols = COLUMNS.filter((status) => cards.some((c) => c.status === status));
  return (
    <section aria-labelledby={id} className="py-12 md:py-16" id={block.anchor}>
      <div className="mx-auto box-content max-w-container px-gutter">
        <h2 id={id} className="text-h2 text-fg-strong">
          {title}
        </h2>
        <div className={cols.length > 1 ? 'mt-8 grid gap-6 md:grid-cols-2' : 'mt-8 max-w-3xl'}>
          {cols.map((status) => {
            const list = cards.filter((c) => c.status === status);
            const badge = FEATURE_STATUS_BADGES[status];
            return (
              <div key={status} className="rounded-xl border border-line bg-surface-2 p-4 md:p-5">
                <h3 className="flex items-baseline justify-between gap-3 px-1 pb-4">
                  <span className="flex items-center gap-2 text-h4 text-fg-strong">
                    <span aria-hidden className={status === 'coming' ? 'size-2 rounded-full bg-amber-500' : 'size-2 rounded-full bg-sky-500'} />
                    {badge.en}
                  </span>
                  {badge.ur !== badge.en ? (
                    <span className="text-small text-fg-subtle" lang="ur-Latn">
                      {badge.ur}
                    </span>
                  ) : null}
                </h3>
                {list.length ? (
                  <ul className="space-y-3">
                    {list.map((card) => (
                      <li key={card.id}>
                        <EntryTile card={card} headingAs="h4" />
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="rounded-lg border border-dashed border-line-strong px-4 py-6 text-center text-small text-fg-subtle">Nothing here right now.</p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export async function RoadmapTemplate({ entry }: { entry: PublicEntry }) {
  const grids = entry.blocks.filter((b): b is GridBlock => b.type === 'entryGrid');
  const lists = await Promise.all(
    grids.map((g) =>
      loadCards({
        type: g.entryType,
        locale: entry.locale,
        status: g.filter?.status?.length ? g.filter.status : ['beta', 'coming'],
        tag: g.filter?.tagId,
        group: g.filter?.group,
        sort: g.sort,
        limit: g.limit,
      }).then((cards) => cards.filter((c) => c.status === 'beta' || c.status === 'coming')),
    ),
  );
  const byBlock = new Map(grids.map((g, i) => [g.id, lists[i] ?? []]));
  const all = lists.flat();

  const render = (block: Block) => {
    if (block.type !== 'entryGrid') return undefined;
    const cards = byBlock.get(block.id) ?? [];
    return cards.length ? <Board block={block} cards={cards} /> : null;
  };

  const list = itemListNode(
    `${entry.url}#roadmap`,
    all.map((c) => ({ name: `${c.title} (${c.status === 'coming' ? FEATURE_STATUS_BADGES.coming.en : FEATURE_STATUS_BADGES.beta.en})`, url: c.url })),
  );
  const nodes = [
    webPageNode(entry, 'WebPage', {
      ...(list ? { mainEntity: { '@id': `${entry.url}#roadmap` } } : {}),
      ...(entry.summary ? { abstract: markdownToPlain(entry.summary) } : {}),
    }),
    ...(list ? [list] : []),
    ...[faqPageNode(entry.url, entry.faqs)].filter((n): n is Record<string, unknown> => n !== null),
  ];

  return (
    <PageFrame entry={entry} nodes={nodes}>
      <ShowcaseBody entry={entry} showUpdated={false} pill="Roadmap" render={render} kickers={{ featuresGrid: 'Planned', steps: 'How it works' }} />
    </PageFrame>
  );
}

