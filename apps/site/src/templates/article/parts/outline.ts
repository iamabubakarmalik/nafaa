/**
 * Table of contents for article and docs pages. It walks exactly the blocks
 * Body passes to the renderer, through S2's `blockOutline`, so every link
 * matches a heading id on the page.
 */
import type { PublicEntry } from '@/lib/cms/contract/cms-contract';
import { blockHeadingId, blockOutline } from '@/components/blocks';
import { bodyBlocks, type BodyOptions } from './Body';

export interface TocItem {
  id: string;
  text: string;
  level: 2 | 3;
}

/** Call-to-action bands are not sections a reader jumps to. */
export function outline(entry: PublicEntry, options: BodyOptions = {}): TocItem[] {
  const blocks = bodyBlocks(entry, options);
  const ctaIds = new Set(blocks.filter((block) => block.type === 'cta').map((block) => blockHeadingId(block)));
  return blockOutline(blocks).filter((item) => !ctaIds.has(item.id));
}
