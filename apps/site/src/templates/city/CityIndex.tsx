/**
 * /pos-software: the city hub index. The PAGE entry's blocks (W8 writes it)
 * come first; the directory groups every published city hub by province,
 * with the province's services-tax authority beside it. City pages below
 * their quality gate are still listed (they are real, live pages; only the
 * search index is kept away from them).
 */
import Link from 'next/link';
import { CmsIcon } from '@/lib/icons';
import type { EntryData, PublicEntry } from '@/lib/cms/contract/cms-contract';
import { PROVINCES } from '@/lib/cms/contract/cms-contract';
import { DEFAULT_LOCALE } from '@/lib/cms/locale';
import { authorityName } from './common/authorities';
import { loadEntries, loadEntriesFor } from './common/data';
import { HubView, type HubCopy } from './common/hub';
import { stringsFor } from './common/strings';
import { CodePill, TemplateSection } from './common/ui';

type CityData = Extract<EntryData, { type: 'CITY' }>;

export async function cityDirectory(locale: string) {
  const { items } = await loadEntries({ type: 'CITY', locale, sort: 'order', limit: 200 });
  const full = await loadEntriesFor(items);
  const dataById = new Map(full.map((e) => [e.id, e.data.type === 'CITY' ? (e.data as CityData) : null]));
  const groups = PROVINCES.map((province) => {
    const cards = items.filter((card) => dataById.get(card.id)?.province === province);
    const authority = cards.map((card) => dataById.get(card.id)?.authority).find(Boolean) ?? null;
    return { province, authority, cards };
  }).filter((group) => group.cards.length > 0);
  return { items, groups };
}

export async function CityIndex({ entry, copy }: { entry: PublicEntry | null; copy: HubCopy }) {
  const locale = entry?.locale ?? DEFAULT_LOCALE;
  const t = stringsFor(locale);
  const { items, groups } = await cityDirectory(locale);

  return (
    <HubView entry={entry} copy={copy} items={items.map((card) => ({ name: card.title, url: card.url }))}>
      <TemplateSection id="cities" title={t.allCities} intro={entry ? t.cityDirectoryIntro : undefined}>
        <div className="divide-y divide-line border-y border-line">
          {groups.map((group) => (
            <div key={group.province} data-reveal="fade-up" className="grid gap-4 py-7 md:grid-cols-[16rem_1fr] md:gap-10">
              <h3 className="flex flex-wrap items-center gap-2.5 text-h4 text-fg-strong md:pt-2">
                {group.province}
                {group.authority ? <CodePill code={group.authority} title={authorityName(group.authority)} /> : null}
              </h3>
              <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {group.cards.map((card) => (
                  <li key={card.id}>
                    <Link
                      href={new URL(card.url).pathname}
                      prefetch={false}
                      className="group/city flex items-center justify-between gap-3 rounded-lg border border-line bg-surface px-4 py-3 text-body font-medium text-fg-strong shadow-e1 transition-[border-color,box-shadow,transform] duration-base ease-out hover:-translate-y-0.5 hover:border-line-strong hover:shadow-e2 ink:shadow-none"
                    >
                      <span className="flex items-center gap-2.5">
                        <CmsIcon name="map-pin" size={17} className="text-link" />
                        {card.title}
                      </span>
                      <CmsIcon name="arrow-right" size={16} className="text-fg-subtle transition-transform duration-fast group-hover/city:translate-x-0.5" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </TemplateSection>
    </HubView>
  );
}
