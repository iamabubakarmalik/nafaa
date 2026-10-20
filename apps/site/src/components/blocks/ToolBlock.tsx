/**
 * tool (API-CONTRACT 4.22): a calculator island chosen by `toolKey`. The
 * Tool template (S5) owns the islands and passes `renderTool` through the
 * BlockRenderer; without it this block renders nothing, so a page never
 * shows an empty tool frame.
 */
import { Container } from '@/components/ui/Container';
import type { BlockProps } from './types';

export function ToolBlock({ block, ctx }: BlockProps<'tool'>) {
  const tool = ctx.renderTool?.(block.toolKey);
  if (!tool) return null;
  return (
    <Container>
      <div id={`tool-${block.toolKey}`}>{tool}</div>
    </Container>
  );
}
