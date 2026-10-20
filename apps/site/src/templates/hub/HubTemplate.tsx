/**
 * Hub template (PAGE hubs such as /product, /industries, /solutions,
 * /services, /integrations; BLOG_CATEGORY uses it too). ARCH 8:
 *
 *   hero → answerBox → entryGrid (grouped) → faq (optional)
 *
 * Title: the hub's own `{title}`. Schema: CollectionPage + ItemList of every
 * card the hub's entry grids show (the same queries the blocks run), and a
 * FAQPage when the hub shows FAQs.
 * Required links: every child (the grids) and the sibling hubs, which close
 * the page as a small "More of Nafaa" nav (published hubs only).
 */
import Link from 'next/link';
import type { Block, PublicEntry } from '@/lib/cms/contract/cms-contract';
import { CmsIcon } from '@/lib/icons';
import { livePaths, loadCards } from '../core/data';
import { PageFrame, faqPageNode } from '../core/frame';
import { StandardBody } from '../core/Standard';
import { Arrow } from '../core/ui';

const HUBS: { path: string; label: string; icon: string }[] = [
  { path: '/product', label: 'Product', icon: 'layout-grid' },
  { path: '/industries', label: 'Industries', icon: 'store' },
  { path: '/solutions', label: 'Solutions', icon: 'network' },
  { path: '/services', label: 'Services', icon: 'briefcase' },
  { path: '/integrations', label: 'Integrations', icon: 'plug' },
  { path: '/compliance', label: 'Compliance', icon: 'shield-check' },
  { path: '/pricing', label: 'Pricing', icon: 'tag' },
  { path: '/roadmap', label: 'Roadmap', icon: 'flag' },
];

type GridBlock = Extract<Block, { type: 'entryGrid' }>;

export async function HubTemplate({ entry }: { entry: PublicEntry }) {
  const grids = entry.blocks.filter((b): b is GridBlock => b.type === 'entryGrid');
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
  const items = lists.flat().map((card) => ({ name: card.title, url: card.url }));
  const siblings = HUBS.filter((h) => h.path !== entry.path && live.has(h.path));

  return (
    <PageFrame entry={entry} items={items} nodes={[faqPageNode(entry.url, entry.faqs)].filter((n): n is Record<string, unknown> => n !== null)}>
      <StandardBody
        entry={entry}
        showUpdated={false}
        beforeEnd={
          siblings.length ? (
            <nav aria-labelledby="hub-siblings" className="py-12 md:py-16">
              <div className="mx-auto box-content max-w-container px-gutter">
                <h2 id="hub-siblings" className="text-h3 text-fg-strong">
                  More of Nafaa
                </h2>
                <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {siblings.map((hub) => (
                    <li key={hub.path}>
                      <Link
                        href={hub.path}
                        prefetch={false}
                        className="group flex items-center gap-3 rounded-lg border border-line bg-surface px-4 py-3 text-small font-medium text-fg-strong shadow-e1 transition-[border-color,box-shadow] duration-base hover:border-line-strong hover:shadow-e2 ink:shadow-none"
                      >
                        <CmsIcon name={hub.icon} size={18} className="text-link" />
                        <span className="flex-1">{hub.label}</span>
                        <Arrow className="text-fg-subtle transition-transform duration-fast group-hover:translate-x-0.5" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </nav>
          ) : null
        }
      />
    </PageFrame>
  );
}
