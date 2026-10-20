/**
 * /compare and /best hubs. The PAGE entry's blocks come first (W9/W10 write
 * them); the directory lists the published pages of the section: compare
 * and alternative pages on /compare, best-of pages on /best, each hub
 * linking the other.
 */
import type { CmsEntryType, PublicEntry } from '@/lib/cms/contract/cms-contract';
import { DEFAULT_LOCALE } from '@/lib/cms/locale';
import { loadEntries } from '../city/common/data';
import { HubView, type HubCopy } from '../city/common/hub';
import { stringsFor } from '../city/common/strings';
import { CardGrid, TemplateSection } from '../city/common/ui';

const SECTIONS: Record<'compare' | 'best', { types: CmsEntryType[]; sibling: CmsEntryType }> = {
  compare: { types: ['COMPARE', 'ALTERNATIVE'], sibling: 'BEST_OF' },
  best: { types: ['BEST_OF'], sibling: 'COMPARE' },
};

export async function CompareIndex({ entry, copy, section }: { entry: PublicEntry | null; copy: HubCopy; section: 'compare' | 'best' }) {
  const locale = entry?.locale ?? DEFAULT_LOCALE;
  const t = stringsFor(locale);
  const config = SECTIONS[section];
  const [lists, sibling] = await Promise.all([
    Promise.all(config.types.map((type) => loadEntries({ type, locale, sort: 'order', limit: 200 }))),
    loadEntries({ type: config.sibling, locale, sort: 'order', limit: 6 }),
  ]);
  const cards = lists.flatMap((list) => list.items);
  const metaFor = (type: CmsEntryType) => (type === 'ALTERNATIVE' ? t.alternativeEyebrow : type === 'BEST_OF' ? 'Best of' : t.compareEyebrow);

  return (
    <HubView entry={entry} copy={copy} items={cards.map((card) => ({ name: card.title, url: card.url }))}>
      <TemplateSection id="all" title={entry ? (section === 'compare' ? t.compareDirectoryTitle : t.bestDirectoryTitle) : t.allPages} intro={entry ? t.compareDirectoryIntro : undefined}>
        <CardGrid cards={cards} locale={locale} fallbackIcon={section === 'compare' ? 'arrow-left-right' : 'trophy'} meta={(card) => metaFor(card.type)} />
      </TemplateSection>
      {sibling.items.length ? (
        <TemplateSection id="see-also" title={section === 'compare' ? t.bestDirectoryTitle : t.moreComparisons} muted>
          <CardGrid cards={sibling.items} locale={locale} fallbackIcon={section === 'compare' ? 'trophy' : 'arrow-left-right'} meta={(card) => metaFor(card.type)} />
        </TemplateSection>
      ) : null}
    </HubView>
  );
}
