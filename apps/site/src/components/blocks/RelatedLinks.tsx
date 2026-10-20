/**
 * relatedLinks (API-CONTRACT 4.18): the entry's RELATED relations (in
 * order), or its TAG relations (one type, or all types). Renders nothing
 * when there are none.
 */
import { Container } from '@/components/ui/Container';
import type { EntryCard } from '@/lib/cms/contract/cms-contract';
import { EntryCardItem } from './parts/EntryCards';
import { strings } from './lib/i18n';
import { reveal } from './lib/reveal';
import type { BlockProps } from './types';

export function RelatedLinks({ block, ctx }: BlockProps<'relatedLinks'>) {
  const t = strings(ctx.locale);
  let cards: EntryCard[];
  if (block.source === 'related') cards = ctx.entry.related;
  else if (block.tagType) cards = ctx.entry.tags[block.tagType] ?? [];
  else cards = Object.values(ctx.entry.tags).flatMap((list) => list ?? []);
  const seen = new Set<string>();
  cards = cards.filter((card) => card.id !== ctx.entry.id && !seen.has(card.id) && seen.add(card.id));
  if (block.limit) cards = cards.slice(0, block.limit);
  if (!cards.length) return null;
  const mixed = new Set(cards.map((card) => card.type)).size > 1;

  return (
    <Container>
      <h2 id={ctx.headingId} className="text-h3 text-fg-strong">
        {block.heading?.trim() || t.relatedHeading}
      </h2>
      <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3" {...reveal(ctx.index, 'stagger')}>
        {cards.map((card) => (
          <li key={card.id}>
            <EntryCardItem card={card} locale={ctx.locale} showType={mixed} />
          </li>
        ))}
      </ul>
    </Container>
  );
}
