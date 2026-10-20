/**
 * Home template (PAGE `/`, data.template "home").
 *
 * The home page tells the whole story: one platform for every business. Its
 * blocks get home-only presentations, picked by block type and anchor, so
 * every word stays editable in the CMS (seed: content/pages/home.ts):
 *
 *   hero                       Hero (+ the `hero-phone` screenshot block)
 *   featuresGrid #works-with   WorksWith ticker
 *   answerBox                  HomeAnswer (answer first, for AEO)
 *   featuresGrid #platform     Platform bento with code-drawn visuals
 *   screenshot run             Tour (tabbed product tour, light/dark captures)
 *   featuresGrid #solutions    Solutions by business type
 *   entryGrid INDUSTRY         Industries ticker
 *   diagram run                HomeHowItWorks band
 *   featuresGrid #services     Services band; a following cta #quote joins it
 *   featuresGrid #ai           AiSoon (coming soon only)
 *   last cta                   Closing
 *
 * Any other block (pricingTable, faq, ...) renders through the block
 * renderer in the order the editor set. A featuresGrid with no known anchor
 * gets the Platform presentation the first time and the standard block after.
 *
 * Schema: WebPage + SoftwareApplication (offers from Plan, paid plans only)
 * + FAQPage, in one @graph (PageFrame).
 */
import type { Block, DiagramBlock, EntryCard, FeaturesGridBlock, PublicEntry, ScreenshotBlock } from '@/lib/cms/contract/cms-contract';
import { Segments, segment } from '../core/Blocks';
import { livePaths, loadCards, loadPlans, loadSite } from '../core/data';
import { PageFrame } from '../core/frame';
import { AiSoon, Industries, Platform, Services, Solutions, WorksWith } from './showcase';
import { Closing, HomeAnswer, HomeHero, HomeHowItWorks } from './sections';
import { Tour } from './Tour';

type Features = FeaturesGridBlock;

const DIAGRAM_LINKS = ['/product/offline-pos', '/product/pos', '/product/online-store', '/product/fbr', '/product/multi-shop', '/product/khata'];

export async function HomeTemplate({ entry }: { entry: PublicEntry }) {
  const blocks = entry.blocks;
  const gridBlock = blocks.find((b): b is Extract<Block, { type: 'entryGrid' }> => b.type === 'entryGrid' && b.entryType === 'INDUSTRY');
  const solutionsBlock = blocks.find((b): b is Features => b.type === 'featuresGrid' && b.anchor === 'solutions');

  const [site, plans, industryCards, live] = await Promise.all([
    loadSite(entry.locale),
    loadPlans(),
    gridBlock
      ? loadCards({ type: 'INDUSTRY', featured: gridBlock.filter?.featured, group: gridBlock.filter?.group, tag: gridBlock.filter?.tagId, sort: gridBlock.sort, limit: gridBlock.limit ?? 40 })
      : Promise.resolve([] as EntryCard[]),
    livePaths(['/industries', '/product', '/roadmap', '/services', '/solutions', '/integrations', ...DIAGRAM_LINKS]),
  ]);

  const phone = blocks.find((b): b is ScreenshotBlock => b.type === 'screenshot' && b.anchor === 'hero-phone');
  const quote = blocks.find((b): b is Extract<Block, { type: 'cta' }> => b.type === 'cta' && b.anchor === 'quote');
  const lastCta = [...blocks].reverse().find((b) => b.type === 'cta' && b !== quote);

  // Consecutive runs of one block type become one section (tour, how it works).
  const runs = new Map<string, Block[]>();
  const consumed = new Set<string>();
  blocks.forEach((block, i) => {
    if (consumed.has(block.id)) return;
    if (block.type !== 'diagram' && !(block.type === 'screenshot' && block !== phone)) return;
    const run: Block[] = [];
    for (let j = i; j < blocks.length; j++) {
      const b = blocks[j] as Block;
      if (b.type !== block.type || b === phone) break;
      run.push(b);
      consumed.add(b.id);
    }
    runs.set(block.id, run);
  });

  let platformDone = false;
  let answerDone = false;
  const segments = segment(blocks, (block) => {
    switch (block.type) {
      case 'hero':
        return <HomeHero block={block} entry={entry} site={site} plans={plans} phone={phone} rotator={solutionsBlock?.items.map((i) => i.title)} />;
      case 'answerBox':
        if (answerDone) return undefined;
        answerDone = true;
        return <HomeAnswer block={block} entry={entry} />;
      case 'featuresGrid':
        switch (block.anchor) {
          case 'works-with':
            return <WorksWith block={block} link={live.has('/integrations') ? '/integrations' : undefined} />;
          case 'solutions':
            return <Solutions block={block} hubLink={live.has('/solutions') ? '/solutions' : undefined} />;
          case 'services':
            return <Services block={block} quote={quote} entry={entry} hubLink={live.has('/services') ? '/services' : undefined} />;
          case 'ai':
            return <AiSoon block={block} roadmap={live.has('/roadmap') ? '/roadmap' : undefined} />;
          default:
            if (platformDone) return undefined;
            platformDone = true;
            return <Platform block={block} entry={entry} hubLink={live.has('/product') ? '/product' : undefined} />;
        }
      case 'screenshot': {
        if (block === phone) return null;
        const run = runs.get(block.id);
        if (!run) return null;
        return <Tour blocks={run as ScreenshotBlock[]} entry={entry} />;
      }
      case 'entryGrid':
        if (block !== gridBlock) return undefined;
        return <Industries heading={block.heading ?? 'Industries'} intro={block.intro} cards={industryCards} hubLink={live.has('/industries') ? '/industries' : undefined} />;
      case 'diagram': {
        const run = runs.get(block.id);
        return run ? <HomeHowItWorks blocks={run as DiagramBlock[]} live={live} /> : null;
      }
      case 'cta':
        if (block === quote) return null;
        if (block !== lastCta) return undefined;
        return <Closing block={block} entry={entry} />;
      default:
        return undefined;
    }
  });

  return (
    <PageFrame entry={entry} plans={plans}>
      <Segments entry={entry} segments={segments} />
    </PageFrame>
  );
}
