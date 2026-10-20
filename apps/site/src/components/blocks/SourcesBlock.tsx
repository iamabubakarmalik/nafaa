/**
 * sources (API-CONTRACT 4.19): the page's outbound citations, numbered, with
 * publisher and the date each was accessed. Official domains are followed.
 */
import { Container } from '@/components/ui/Container';
import { SourceList } from './parts/Sources';
import { strings } from './lib/i18n';
import type { BlockProps } from './types';

export function SourcesBlock({ block, ctx }: BlockProps<'sources'>) {
  const t = strings(ctx.locale);
  return (
    <Container size="prose">
      <div className="border-t border-line pt-8">
        <h2 id={ctx.headingId} className="text-h4 text-fg-strong">
          {block.heading?.trim() || t.sources}
        </h2>
        <div className="mt-5 text-small text-fg-muted">
          <SourceList items={block.items} locale={ctx.locale} />
        </div>
      </div>
    </Container>
  );
}
