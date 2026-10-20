/**
 * richText (API-CONTRACT 4.9): Markdown rendered on the server (H2/H3,
 * lists, tables, links, `media:` images, code). Its headings feed the page
 * outline, so they use the page slugger.
 */
import { Container } from '@/components/ui/Container';
import { Prose } from '@/components/ui/Prose';
import { Markdown } from './rich-text/Markdown';
import type { BlockProps } from './types';

export function RichText({ block, ctx }: BlockProps<'richText'>) {
  return (
    <Container size="prose">
      <Prose>
        <Markdown text={block.markdown} opts={{ media: ctx.entry.media, slugger: ctx.slugger, locale: ctx.locale, idPrefix: block.id }} />
      </Prose>
    </Container>
  );
}
