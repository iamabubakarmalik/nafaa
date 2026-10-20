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
import { livePaths, loadCards } from '../core/data';
import { PageFrame, faqPageNode } from '../core/frame';
import { Arrow } from '../core/ui';
import { BuildArt } from '../showcase/BuildArt';
import { ShowcaseBody } from '../showcase/ShowcaseBody';
import { SectionTitle, ShowcaseSection, TrustRibbon } from '../showcase/kit';
import { HubCards } from './HubCards';

const HUBS: { path: string; label: string; icon: string; note: string }[] = [
  { path: '/product', label: 'Product', icon: 'layout-grid', note: 'Everything Nafaa does' },
  { path: '/solutions', label: 'Solutions', icon: 'network', note: 'Setups by how you sell' },
  { path: '/industries', label: 'Industries', icon: 'store', note: 'Screens for your trade' },
  { path: '/services', label: 'Services', icon: 'briefcase', note: 'We build it for you' },
  { path: '/integrations', label: 'Integrations', icon: 'plug', note: 'Connect your tools' },
  { path: '/marketplace', label: 'Nafaa Bazaar', icon: 'shopping-basket', note: 'Sell on the marketplace' },
  { path: '/pricing', label: 'Pricing', icon: 'tag', note: 'Plans in rupees' },
  { path: '/roadmap', label: 'Roadmap', icon: 'flag', note: 'What comes next' },
];

const KICKERS: Record<string, { grid: string; features: string; pill: string }> = {
  PRODUCT: { grid: 'The platform', features: 'Why Nafaa', pill: 'Platform' },
  SOLUTION: { grid: 'Solutions', features: 'Capabilities', pill: 'Every business' },
  SERVICE: { grid: 'Services', features: 'Why us', pill: 'Worldwide' },
  INDUSTRY: { grid: 'Industries', features: 'Every trade gets', pill: 'Every trade' },
  INTEGRATION: { grid: 'Integrations', features: 'Connections', pill: 'Connected' },
};

type GridBlock = Extract<Block, { type: 'entryGrid' }>;

export async function HubTemplate({ entry }: { entry: PublicEntry }) {
  const grids = entry.blocks.filter((b): b is GridBlock => b.type === 'entryGrid' && b.hidden !== true);
  const [lists, live] = await Promise.all([
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
    livePaths(HUBS.map((h) => h.path)),
  ]);
  const cardsByGrid = new Map<string, EntryCard[]>(grids.map((g, i) => [g.id, (lists[i] ?? []).filter((c) => c.id !== entry.id)]));
  const items = lists.flat().map((card) => ({ name: card.title, url: card.url }));
  const siblings = HUBS.filter((h) => h.path !== entry.path && live.has(h.path));
  const hubOf = entry.data.type === 'PAGE' ? entry.data.hubOf : undefined;
  const words = (hubOf && KICKERS[hubOf]) || { grid: entry.title, features: 'Highlights', pill: 'Nafaa' };

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
        afterHero={<TrustRibbon className="mb-8" />}
        kickers={{ featuresGrid: words.features, steps: 'How it works', screenshot: 'Inside the app' }}
        render={render}
        beforeEnd={
          siblings.length ? (
            <ShowcaseSection labelledBy="hub-siblings" spacing="compact">
              <div className="mx-auto box-content max-w-container px-gutter">
                <SectionTitle id="hub-siblings" title="More of Nafaa" kicker="Explore" />
                <ul className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {siblings.map((hub) => (
                    <li key={hub.path}>
                      <Link
                        href={hub.path}
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
    </PageFrame>
  );
}
