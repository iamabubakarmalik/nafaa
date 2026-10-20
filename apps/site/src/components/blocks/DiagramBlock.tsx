/**
 * diagram (API-CONTRACT 4.4): a code-drawn, animated SVG diagram (bespoke or
 * data-driven, components/diagrams) with its required caption. Motion is
 * paused until MotionObserver marks the figure in view, and off under
 * reduced motion.
 */
import { Container } from '@/components/ui/Container';
import { Diagram } from '@/components/diagrams';
import { BlockHeading } from './parts/BlockHeading';
import { reveal } from './lib/reveal';
import type { BlockProps } from './types';

export function DiagramBlock({ block, ctx }: BlockProps<'diagram'>) {
  return (
    <Container>
      {block.heading ? <BlockHeading id={ctx.headingId} title={block.heading} align="center" index={ctx.index} /> : null}
      <div className={block.heading ? 'mt-12' : undefined} {...reveal(ctx.index, 'fade')}>
        <Diagram spec={block.diagram} caption={block.caption} tone={ctx.theme} />
      </div>
    </Container>
  );
}
