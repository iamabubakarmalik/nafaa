/**
 * Hub template (PAGE hubs such as /product, /industries, /solutions,
 * /services, /integrations; BLOG_CATEGORY entries routed here too). ARCH 8:
 *
 *   hero → answerBox → entryGrid (grouped) → faq (optional)
 *
 * Rendered with the showcase kit, like the product and solution pages: the
 * stage hero (screenshot, diagram or, for the services hub, the build art),
 * a trust ribbon, `cards` entry grids as a bento of the hub's children and
 * the closing CTA band. Grouped and list grids keep the stock renderer.
 *
 * Title: the hub's own `{title}`. Schema: CollectionPage + ItemList of every
 * card the hub's entry grids show (the same queries the blocks run), and a
 * FAQPage when the hub shows FAQs.
 * Required links: every child (the grids) and the sibling hubs, which close
 * the page as a small "More of Nafaa" nav (published hubs only).
 */
import Link from 'next/link';
import type { Block, EntryCard, PublicEntry } from '@/lib/cms/contract/cms-contract';
import { blockHeadingId } from '@/components/blocks/BlockRenderer';
import { CmsIcon } from '@/lib/icons';
import { uiStrings } from '@/lib/i18n/ui';
import { liveLinks, loadCards } from '../core/data';
import { PageFrame, faqPageNode } from '../core/frame';
import { RelatedPages } from '../core/parts';
import { Arrow } from '../core/ui';
import { BuildArt } from '../showcase/BuildArt';
import { ShowcaseBody } from '../showcase/ShowcaseBody';
import { SectionTitle, ShowcaseSection, TrustRibbon } from '../showcase/kit';
import { HubCards } from './HubCards';

/** Sibling hubs with their icons; labels and notes come from the locale's strings. */
const HUBS: { path: string; icon: string }[] = [
  { path: '/product', icon: 'layout-grid' },
  { path: '/solutions', icon: 'network' },
  { path: '/industries', icon: 'store' },
  { path: '/services', icon: 'briefcase' },
  { path: '/integrations', icon: 'plug' },
  { path: '/marketplace', icon: 'shopping-basket' },
  { path: '/pricing', icon: 'tag' },
  { path: '/roadmap', icon: 'flag' },
];

type GridBlock = Extract<Block, { type: 'entryGrid' }>;

export async function HubTemplate({ entry }: { entry: PublicEntry }) {
  const ui = uiStrings(entry.locale);
  const t = ui.pages.hub;
  const grids = entry.blocks.filter((b): b is GridBlock => b.type === 'entryGrid' && b.hidden !== true);
  const [lists, links] = await Promise.all([
    Promise.all(
      grids.map((g) =>
        loadCards({
          type: g.entryType,
          locale: entry.locale,
          tag: g.filter?.tagId,
          group: g.filter?.group,
          featured: g.filter?.featured,
          parentId: g.filter?.parentId,
          status: g.filter?.status,
          sort: g.sort,
          limit: g.limit,
        }),
      ),
    ),
    liveLinks(HUBS.map((h) => h.path), entry.locale),
  ]);
  const cardsByGrid = new Map<string, EntryCard[]>(grids.map((g, i) => [g.id, (lists[i] ?? []).filter((c) => c.id !== entry.id)]));
  const items = lists.flat().map((card) => ({ name: card.title, url: card.url }));
  const ownPath = entry.path.replace(/^\/ur(?=\/|$)/, '') || '/';
  const siblings = HUBS.flatMap((h) => {
    const href = links.get(h.path);
    const [label, note] = t.hubs[h.path] ?? [h.path, ''];
    return href && h.path !== ownPath ? [{ ...h, href, label, note }] : [];
  });
  const hubOf = entry.data.type === 'PAGE' ? entry.data.hubOf : undefined;
  const words = (hubOf && t.kickers[hubOf]) || { grid: entry.title, features: t.highlights, pill: 'Nafaa' };

  const render = (block: Block) => {
    if (block.type !== 'entryGrid' || block.layout !== 'cards') return undefined;
    const cards = cardsByGrid.get(block.id) ?? [];
    if (!cards.length) return null;
    const headingId = blockHeadingId(block);
    return (
      <ShowcaseSection id={block.anchor} labelledBy={headingId} theme={block.theme ?? 'default'} spacing="snug">
        <HubCards cards={cards} headingId={headingId} heading={block.heading ?? entry.title} intro={block.intro} kicker={words.grid} />
      </ShowcaseSection>
    );
  };

  return (
    <PageFrame entry={entry} items={items} nodes={[faqPageNode(entry.url, entry.faqs)].filter((n): n is Record<string, unknown> => n !== null)}>
      <ShowcaseBody
        entry={entry}
        showUpdated={false}
        pill={words.pill}
        heroArt={hubOf === 'SERVICE' ? <BuildArt /> : undefined}
        afterHero={<TrustRibbon locale={entry.locale} className="mb-8" />}
        kickers={{ featuresGrid: words.features, steps: ui.howItWorks, screenshot: ui.insideTheApp }}
        render={render}
        beforeEnd={
          siblings.length ? (
            <ShowcaseSection labelledBy="hub-siblings" spacing="compact">
              <div className="mx-auto box-content max-w-container px-gutter">
                <SectionTitle id="hub-siblings" title={t.more} kicker={t.explore} />
                <ul className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {siblings.map((hub) => (
                    <li key={hub.path}>
                      <Link
                        href={hub.href}
                        prefetch={false}
                        className="group flex items-center gap-3.5 rounded-xl border border-line bg-surface px-4 py-3.5 shadow-e1 transition-[border-color,box-shadow,transform] duration-base hover:-translate-y-0.5 hover:border-line-strong hover:shadow-e2 ink:shadow-none"
                      >
                        <span aria-hidden className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-link ring-1 ring-inset ring-brand-100 ink:bg-brand-400/10 ink:ring-brand-400/20">
                          <CmsIcon name={hub.icon} size={18} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-small font-semibold text-fg-strong">{hub.label}</span>
                          <span className="block truncate text-xs text-fg-muted">{hub.note}</span>
                        </span>
                        <Arrow className="text-fg-subtle transition-transform duration-fast group-hover:translate-x-0.5" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </ShowcaseSection>
          ) : null
        }
      />
      <RelatedPages entry={entry} />
    </PageFrame>
  );
}
