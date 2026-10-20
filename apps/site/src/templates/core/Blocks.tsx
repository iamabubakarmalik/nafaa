/**
 * The one place core templates hand blocks to S2's BlockRenderer, with the
 * template data source (development fixtures behind the real API).
 */
import type { ReactNode } from 'react';
import { BlockRenderer } from '@/components/blocks/BlockRenderer';
import type { Block, BlockType, PublicEntry } from '@/lib/cms/contract/cms-contract';
import { templateSource } from './source';

export function Blocks({ entry, blocks, exclude }: { entry: PublicEntry; blocks?: readonly Block[]; exclude?: readonly BlockType[] }) {
  const list = blocks ?? entry.blocks;
  if (!list.length) return null;
  return <BlockRenderer blocks={list} entry={entry} source={templateSource} exclude={exclude} />;
}

/**
 * Splits blocks into runs: blocks the template renders itself (`pick`
 * returns a node) and runs of everything else for the BlockRenderer, in the
 * entry's order.
 */
export type Segment = { kind: 'own'; key: string; node: ReactNode } | { kind: 'blocks'; key: string; blocks: Block[] };

export function segment(blocks: readonly Block[], pick: (block: Block, index: number) => ReactNode | undefined): Segment[] {
  const out: Segment[] = [];
  let run: Block[] = [];
  const flush = () => {
    if (run.length) out.push({ kind: 'blocks', key: `run-${run[0]?.id}`, blocks: run });
    run = [];
  };
  blocks.forEach((block, i) => {
    const node = pick(block, i);
    if (node === undefined) {
      run.push(block);
      return;
    }
    flush();
    if (node !== null) out.push({ kind: 'own', key: block.id, node });
  });
  flush();
  return out;
}

export function Segments({ entry, segments }: { entry: PublicEntry; segments: Segment[] }) {
  return (
    <>
      {segments.map((s) => (s.kind === 'own' ? <div key={s.key} className="contents">{s.node}</div> : <Blocks key={s.key} entry={entry} blocks={s.blocks} />))}
    </>
  );
}
