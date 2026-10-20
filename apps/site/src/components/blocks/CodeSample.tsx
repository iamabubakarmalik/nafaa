/**
 * codeSample (API-CONTRACT 4.15): 1-6 tabs of code, highlighted on the
 * server (rich-text/highlight.ts, no client JS). Tabs switch with CSS; only
 * the copy button is an island (islands/CodeCopy).
 */
import { Container } from '@/components/ui/Container';
import { CodePanel } from './parts/CodePanel';
import { strings } from './lib/i18n';
import { reveal } from './lib/reveal';
import type { BlockProps } from './types';

export function CodeSample({ block, ctx }: BlockProps<'codeSample'>) {
  const t = strings(ctx.locale);
  return (
    <Container size="prose">
      {block.heading ? (
        <h2 id={ctx.headingId} className="mb-6 text-h3 text-fg-strong">
          {block.heading}
        </h2>
      ) : null}
      <figure {...reveal(ctx.index)}>
        <CodePanel id={block.id} tabs={block.tabs} label={block.heading || t.code} copyLabel={t.copy} copiedLabel={t.copied} />
        {block.caption ? <figcaption className="mt-3 text-small text-fg-subtle">{block.caption}</figcaption> : null}
      </figure>
    </Container>
  );
}
