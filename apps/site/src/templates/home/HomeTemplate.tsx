/**
 * Home template (PAGE `/`, data.template "home"). ARCH 8:
 *
 *   hero (H1) → answerBox → featuresGrid "What Nafaa does" → entryGrid
 *   industries → diagram(s) offline + FBR → pricingTable → testimonial /
 *   logoCloud (only if real) → faq   [+ cta]
 *
 * Schema: WebPage + SoftwareApplication (offers from Plan, paid plans only)
 * + FAQPage, in one @graph. Required internal links: every hub, the top 8
 * industries and products, pricing and the compliance hub (only those that
 * are published), via the blocks and the "Explore Nafaa" section.
 *
 * The hero, short answer, features, industries and diagram band have a
 * home-only presentation (sections.tsx); everything else goes through the
 * block renderer, in the order the editor set.
 */
import type { Block, DiagramBlock, EntryCard, PublicEntry } from '@/lib/cms/contract/cms-contract';
import { Segments, segment } from '../core/Blocks';
import { livePaths, loadCards, loadPlans, loadSite } from '../core/data';
import { PageFrame } from '../core/frame';
import { HomeAnswer, HomeExplore, HomeFeatures, HomeHero, HomeHowItWorks, HomeIndustries, type ExploreColumn } from './sections';

const HUBS: { path: string; label: string }[] = [
  { path: '/pricing', label: 'Pricing' },
  { path: '/product', label: 'All products' },
  { path: '/industries', label: 'All industries' },
  { path: '/solutions', label: 'Solutions' },
  { path: '/services', label: 'Services' },
  { path: '/integrations', label: 'Integrations' },
  { path: '/compliance', label: 'Tax compliance' },
  { path: '/roadmap', label: 'Roadmap' },
];
const COMPANY: { path: string; label: string }[] = [
  { path: '/faq', label: 'FAQ' },
  { path: '/about', label: 'About Nafaa' },
  { path: '/contact', label: 'Contact' },
  { path: '/demo', label: 'Book a demo' },
];

async function published(links: { path: string; label: string }[]): Promise<{ href: string; label: string }[]> {
  const live = await livePaths(links.map((l) => l.path));
  return links.filter((l) => live.has(l.path)).map((l) => ({ href: l.path, label: l.label }));
}

export async function HomeTemplate({ entry }: { entry: PublicEntry }) {
  const [site, plans] = await Promise.all([loadSite(entry.locale), loadPlans()]);
  const blocks = entry.blocks;

  // Data for the home-owned sections, fetched in parallel.
  const gridBlock = blocks.find((b): b is Extract<Block, { type: 'entryGrid' }> => b.type === 'entryGrid' && b.entryType === 'INDUSTRY');
  const [industryCards, products, topIndustries, hubs, company, live] = await Promise.all([
    gridBlock
      ? loadCards({ type: 'INDUSTRY', featured: gridBlock.filter?.featured, group: gridBlock.filter?.group, tag: gridBlock.filter?.tagId, sort: gridBlock.sort, limit: gridBlock.limit ?? 8 })
      : Promise.resolve([] as EntryCard[]),
    loadCards({ type: 'PRODUCT', limit: 8 }),
    loadCards({ type: 'INDUSTRY', featured: true, limit: 8 }),
    published(HUBS),
    published(COMPANY),
    livePaths(['/product', '/industries', '/product/pos', '/product/khata', '/product/multi-shop']),
  ]);

  const explore: ExploreColumn[] = [
    { title: 'Product', links: products.map((c) => ({ href: c.path, label: c.title, status: c.status })) },
    { title: 'Industries', links: topIndustries.map((c) => ({ href: c.path, label: c.title })) },
    { title: 'Nafaa', links: hubs },
    { title: 'Company', links: company },
  ];

  // Consecutive diagram blocks become one "How it works" band.
  const diagramRuns = new Map<string, DiagramBlock[]>();
  const consumed = new Set<string>();
  blocks.forEach((block, i) => {
    if (block.type !== 'diagram' || consumed.has(block.id)) return;
    const run: DiagramBlock[] = [];
    for (let j = i; j < blocks.length && blocks[j]?.type === 'diagram'; j++) {
      const b = blocks[j] as DiagramBlock;
      run.push(b);
      consumed.add(b.id);
    }
    diagramRuns.set(block.id, run);
  });

  let answerDone = false;
  let featuresDone = false;
  const lastCta = [...blocks].reverse().find((b) => b.type === 'cta');
  const segments = segment(blocks, (block) => {
    switch (block.type) {
      case 'hero':
        return <HomeHero block={block} entry={entry} site={site} plans={plans} />;
      case 'answerBox':
        if (answerDone) return undefined;
        answerDone = true;
        return <HomeAnswer block={block} entry={entry} />;
      case 'featuresGrid':
        if (featuresDone) return undefined;
        featuresDone = true;
        return <HomeFeatures block={block} hubLink={live.has('/product') ? { href: '/product', label: 'All products' } : undefined} />;
      case 'entryGrid':
        if (block !== gridBlock) return undefined;
        return <HomeIndustries heading={block.heading ?? 'Industries'} intro={block.intro} cards={industryCards} hubLink={live.has('/industries') ? { href: '/industries', label: 'All industries' } : undefined} />;
      case 'diagram': {
        const run = diagramRuns.get(block.id);
        return run ? <HomeHowItWorks blocks={run} live={live} /> : null;
      }
      case 'cta':
        if (block !== lastCta) return undefined;
        return (
          <>
            <HomeExplore columns={explore} />
            <Segments entry={entry} segments={[{ kind: 'blocks', key: `cta-${block.id}`, blocks: [block] }]} />
          </>
        );
      default:
        return undefined;
    }
  });
  if (!lastCta) segments.push({ kind: 'own', key: 'explore', node: <HomeExplore columns={explore} /> });

  return (
    <PageFrame entry={entry} plans={plans}>
      <Segments entry={entry} segments={segments} />
    </PageFrame>
  );
}
