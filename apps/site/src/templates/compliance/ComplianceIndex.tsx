/**
 * /compliance: the compliance hub. The PAGE entry's blocks (W6 writes it)
 * come first; the directory lists every published compliance page with its
 * authority, federal (FBR) first and then the provinces in contract order.
 */
import { INDUSTRY_AUTHORITIES, type PublicEntry } from '@/lib/cms/contract/cms-contract';
import { DEFAULT_LOCALE } from '@/lib/cms/locale';
import { authorityName } from '../city/common/authorities';
import { loadEntries, loadEntriesFor } from '../city/common/data';
import { HubView, type HubCopy } from '../city/common/hub';
import { stringsFor } from '../city/common/strings';
import { CardGrid, TemplateSection } from '../city/common/ui';

export async function ComplianceIndex({ entry, copy }: { entry: PublicEntry | null; copy: HubCopy }) {
  const locale = entry?.locale ?? DEFAULT_LOCALE;
  const t = stringsFor(locale);
  const { items } = await loadEntries({ type: 'COMPLIANCE', locale, sort: 'order', limit: 200 });
  const full = await loadEntriesFor(items);
  const authorityById = new Map(full.map((e) => [e.id, e.data.type === 'COMPLIANCE' ? e.data.authority : null]));
  const rank = (id: string) => {
    const authority = authorityById.get(id);
    const at = authority ? (INDUSTRY_AUTHORITIES as readonly string[]).indexOf(authority) : -1;
    return at < 0 ? 99 : at;
  };
  const cards = [...items].sort((a, b) => rank(a.id) - rank(b.id));

  return (
    <HubView entry={entry} copy={copy} items={cards.map((card) => ({ name: card.title, url: card.url }))}>
      <TemplateSection id="authorities" title={entry ? t.complianceDirectoryTitle : t.allPages} intro={entry ? t.complianceDirectoryIntro : undefined}>
        <CardGrid
          cards={cards}
          locale={locale}
          fallbackIcon="landmark"
          meta={(card) => {
            const authority = authorityById.get(card.id);
            return authority ? `${authority} · ${authorityName(authority)}` : null;
          }}
        />
      </TemplateSection>
    </HubView>
  );
}
