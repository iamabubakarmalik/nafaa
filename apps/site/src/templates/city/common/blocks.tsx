/**
 * Block rendering for the S4 templates: the one place they touch S2's
 * BlockRenderer.
 *
 * Templates insert their own sections between blocks (best-of items after
 * the quick-pick table, the compare card after the answer box), so the block
 * list is cut at those points and each run is rendered by BlockRenderer.
 * Every block keeps its own ids (`h-<block id>`, its anchor), and the hero is
 * always in the first run, so the page still has exactly one H1.
 *
 * In development the blocks read through the fixture-aware loaders (a pair
 * page's cityFacts reads its parent city, which may be a fixture). Production
 * uses S2's `cmsSource` unchanged.
 */
import type { ReactNode } from 'react';
import { BlockRenderer, blockHeadingId } from '@/components/blocks/BlockRenderer';
import { cmsSource } from '@/components/blocks/lib/source';
import type { BlockDataSource } from '@/components/blocks/types';
import type { Block, PublicEntry } from '@/lib/cms/contract/cms-contract';
import { loadEntries, loadEntry } from './data';

export interface SlotMap {
  /** Rendered right after the block with this id. */
  after?: Record<string, ReactNode>;
  /** Rendered right after the hero (or before the first block when there is no hero). */
  afterHero?: ReactNode;
  /** Rendered after the last block. */
  end?: ReactNode;
}

const devSource: BlockDataSource = {
  ...cmsSource,
  entry: (path, locale) => loadEntry(path, locale),
  entries: async (query) => {
    const live = await cmsSource.entries(query);
    if (live.length) return live;
    // Fixture lists ignore the status filter (no S4 fixture has a feature status).
    return (await loadEntries({ type: query.type, locale: query.locale, tag: query.tag, group: query.group, featured: query.featured, parentId: query.parentId, sort: query.sort, limit: query.limit })).items;
  },
};

function sourceFor(): BlockDataSource {
  return process.env.NODE_ENV === 'production' ? cmsSource : devSource;
}

export function Blocks({ entry, blocks, slots = {} }: { entry: PublicEntry; blocks?: readonly Block[]; slots?: SlotMap }) {
  const list = (blocks ?? entry.blocks).filter((block) => block.hidden !== true);
  const source = sourceFor();
  const hasHero = list[0]?.type === 'hero';

  // Cut points: after the hero, and after every block that has a slot.
  const runs: { blocks: Block[]; after: ReactNode }[] = [];
  let current: Block[] = [];
  list.forEach((block, i) => {
    current.push(block);
    const heroSlot = i === 0 && hasHero ? slots.afterHero : null;
    const blockSlot = slots.after?.[block.id] ?? null;
    if (heroSlot || blockSlot) {
      runs.push({
        blocks: current,
        after: (
          <>
            {heroSlot}
            {blockSlot}
          </>
        ),
      });
      current = [];
    }
  });
  if (current.length) runs.push({ blocks: current, after: null });

  return (
    <>
      {!hasHero ? slots.afterHero : null}
      {runs.map((run) => (
        <RunWithSlot key={run.blocks[0]!.id} entry={entry} blocks={run.blocks} source={source} after={run.after} />
      ))}
      {slots.end}
    </>
  );
}

function RunWithSlot({ entry, blocks, source, after }: { entry: PublicEntry; blocks: Block[]; source: BlockDataSource; after: ReactNode }) {
  return (
    <>
      <BlockRenderer blocks={blocks} entry={entry} source={source} />
      {after}
    </>
  );
}

/** Id of a block's section title, the jump-bar target (BlockRenderer's `h-<block id>`). */
export function blockTargetId(block: Pick<Block, 'id'>): string {
  return blockHeadingId(block);
}
