/**
 * Internal-link sections shared by the S4 templates (city, compare, best-of,
 * compliance).
 *
 * - RelatedSection: the entry's RELATED cards, so every relation the editor
 *   sets is a link on the page. Skipped when a relatedLinks block already
 *   renders them; cards the page shows elsewhere can be excluded.
 * - otherCities: up to six neighbouring city hubs, same province first, taken
 *   in directory order after the current city, so each city page is linked
 *   from several others rather than only from the hub.
 */
import type { EntryCard, PublicEntry } from '@/lib/cms/contract/cms-contract';
import { rendersRelatedBlock } from '../../core/parts';
import { cityDirectory } from '../CityIndex';
import { stringsFor } from './strings';
import { CardGrid, TemplateSection } from './ui';

export function relatedCards(entry: PublicEntry, exclude: readonly Pick<EntryCard, 'id'>[] = []): EntryCard[] {
  if (rendersRelatedBlock(entry)) return [];
  const seen = new Set<string>([entry.id, ...exclude.map((card) => card.id)]);
  return entry.related.filter((card) => (seen.has(card.id) ? false : (seen.add(card.id), true)));
}

export function RelatedSection({ entry, exclude, muted }: { entry: PublicEntry; exclude?: readonly Pick<EntryCard, 'id'>[]; muted?: boolean }) {
  const cards = relatedCards(entry, exclude);
  if (!cards.length) return null;
  return (
    <TemplateSection id="related-pages" title={stringsFor(entry.locale).related} muted={muted}>
      <CardGrid cards={cards} locale={entry.locale} />
    </TemplateSection>
  );
}

/** Items after `id` in `list`, wrapping round to the start (the item itself left out). */
function after<T extends { id: string }>(list: readonly T[], id: string): T[] {
  const i = list.findIndex((item) => item.id === id);
  return i < 0 ? [...list] : [...list.slice(i + 1), ...list.slice(0, i)];
}

export async function otherCities(entry: PublicEntry, province: string | undefined, limit = 6): Promise<EntryCard[]> {
  const { items, groups } = await cityDirectory(entry.locale);
  const same = after(groups.find((group) => group.province === province)?.cards ?? [], entry.id);
  const sameIds = new Set(same.map((card) => card.id));
  const rest = after(items, entry.id).filter((card) => !sameIds.has(card.id));
  return [...same, ...rest].slice(0, limit);
}
