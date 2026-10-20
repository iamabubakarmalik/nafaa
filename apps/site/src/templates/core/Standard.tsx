/**
 * Body of the block-driven entry templates (product, industry, solution,
 * service, hub, default): the meta row, the status notice, the entry's blocks
 * in the editor's order, a template slot right after the hero, and the
 * template's internal-link sections placed before the closing CTA band (or at
 * the end when there is none).
 */
import type { ReactNode } from 'react';
import type { PublicEntry } from '@/lib/cms/contract/cms-contract';
import { Blocks, Segments, segment } from './Blocks';
import { MetaRow, StatusNotice } from './parts';

export interface StandardBodyProps {
  entry: PublicEntry;
  /** Rendered right after the hero block. */
  afterHero?: ReactNode;
  /** Internal links and other closing sections, before the last CTA band. */
  beforeEnd?: ReactNode;
  showUpdated?: boolean;
}

export function StandardBody({ entry, afterHero, beforeEnd, showUpdated = true }: StandardBodyProps) {
  const lastCta = [...entry.blocks].reverse().find((b) => b.type === 'cta');
  const segments = segment(entry.blocks, (block) => {
    if (block.type === 'hero' && afterHero) {
      return (
        <>
          <Blocks entry={entry} blocks={[block]} />
          {afterHero}
        </>
      );
    }
    if (block === lastCta && beforeEnd) {
      return (
        <>
          {beforeEnd}
          <Blocks entry={entry} blocks={[block]} />
        </>
      );
    }
    return undefined;
  });
  if (!lastCta && beforeEnd) segments.push({ kind: 'own', key: 'before-end', node: beforeEnd });

  return (
    <>
      <MetaRow entry={entry} showUpdated={showUpdated} />
      <StatusNotice entry={entry} />
      <Segments entry={entry} segments={segments} />
    </>
  );
}
