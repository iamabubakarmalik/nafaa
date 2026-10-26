/**
 * CityHub template (ARCH 8) for CITY (/pos-software/{city}) and its pair
 * variant CITY_INDUSTRY (/pos-software/{city}/{industry}).
 *
 * Block order is the editor's (hero → answerBox → cityFacts tax → richText
 * business types → cityFacts markets + areas → cityFacts support →
 * testimonial → faq → relatedLinks nearby). Areas stay H3s inside the hub,
 * never URLs (PLAN 5). The template adds:
 * - breadcrumbs, the tax authority and the "Updated" date;
 * - a sticky jump bar after the hero;
 * - on a city hub, "Industry guides" linking only the pair pages that pass
 *   their quality gate (900 words + evidence, under the similarity limit);
 *   pairs below the gate stay live but noindex and are not linked from here;
 * - on a pair page, links back to the city hub and the national industry page;
 * - the entry's RELATED cards, and on a city hub up to six other cities (same
 *   province first), so every city page is linked from its neighbours.
 *
 * JSON-LD: WebPage `about` Place with the Wikidata sameAs, SoftwareApplication
 * `areaServed` with the paid plans as offers, FAQPage (lib/seo/graph). A pair page describes its parent
 * city's Place.
 */
import type { EntryCard, EntryData, PublicEntry } from '@/lib/cms/contract/cms-contract';
import { getLayout } from '@/lib/cms/client';
import { buildEntryGraph } from '@/lib/seo/graph';
import { Blocks as CoreBlocks } from '../core/Blocks';
import { loadPlans } from '../core/data';
import { ShowcaseBody } from '../showcase/ShowcaseBody';
import { TrustRibbon } from '../showcase/kit';
import { authorityName } from './common/authorities';
import { blockTargetId } from './common/blocks';
import { isFixture, loadEntity, loadEntries, loadEntriesFor, loadEntry } from './common/data';
import { insertJumpItem, jumpItemsFromBlocks } from './common/jump';
import { RelatedSection, otherCities } from './common/related';
import { stringsFor } from './common/strings';
import { CardGrid, CodePill, JumpNav, MetaBar, TemplateFrame, TemplateSection } from './common/ui';

type CityData = Extract<EntryData, { type: 'CITY' }>;

const PAIRS_ID = 'industry-guides';

/** A pair page is linked from its city hub only when it is indexable on its own merits. */
function pairIsListable(pair: PublicEntry): boolean {
  if (!pair.quality.passed) return false;
  if (isFixture(pair)) return true;
  return pair.seo.robots.index || pair.seo.robots.reason === 'site_not_indexable';
}

async function listablePairs(city: PublicEntry): Promise<EntryCard[]> {
  const { items } = await loadEntries({ type: 'CITY_INDUSTRY', parentId: city.id, locale: city.locale, sort: 'order' });
  if (items.length === 0) return [];
  const full = await loadEntriesFor(items);
  const ok = new Set(full.filter(pairIsListable).map((e) => e.id));
  return items.filter((card) => ok.has(card.id));
}

function cityDataOf(entry: PublicEntry | null): CityData | null {
  return entry && entry.data.type === 'CITY' ? entry.data : null;
}

export async function CityTemplate({ entry }: { entry: PublicEntry }) {
  const t = stringsFor(entry.locale);
  const isPair = entry.type === 'CITY_INDUSTRY';
  const [{ site }, entity, plans, parentCity] = await Promise.all([
    getLayout(entry.locale),
    loadEntity(entry.locale),
    loadPlans(),
    isPair && entry.parent ? loadEntry(entry.parent.path, entry.locale) : Promise.resolve(null),
  ]);
  const city = isPair ? cityDataOf(parentCity) : cityDataOf(entry);
  const cityName = city?.name ?? entry.parent?.title ?? entry.title;

  // The pair page is about its parent city's Place (name, Wikidata, geo).
  const graphEntry = isPair && city ? { ...entry, data: city } : entry;
  const graph = buildEntryGraph(graphEntry as PublicEntry, { site, entity, plans });

  const [pairs, nearby]: [EntryCard[], EntryCard[]] = isPair ? [[], []] : await Promise.all([listablePairs(entry), otherCities(entry, city?.province)]);
  const industry = entry.tags.INDUSTRY?.[0] ?? null;

  // Template sections go before the FAQ when there is one, else at the end.
  const faqBlock = entry.blocks.find((block) => block.type === 'faq');

  let jump = jumpItemsFromBlocks(entry.blocks, entry.locale);
  if (pairs.length) jump = insertJumpItem(jump, { id: PAIRS_ID, label: t.industryGuidesShort }, faqBlock ? blockTargetId(faqBlock) : undefined);

  const pairSection = pairs.length ? (
    <TemplateSection id={PAIRS_ID} title={t.industryGuides(cityName)} intro={t.industryGuidesIntro(cityName)}>
      <CardGrid cards={pairs} locale={entry.locale} fallbackIcon="store" />
    </TemplateSection>
  ) : null;

  const backLinks: EntryCard[] = isPair ? [entry.parent, industry].filter((card): card is EntryCard => Boolean(card)) : [];
  const backSection = backLinks.length ? (
    <TemplateSection id="keep-exploring" title={t.backToCity(cityName)} muted>
      <CardGrid
        cards={backLinks}
        locale={entry.locale}
        columns={2}
        meta={(card) => (card.type === 'CITY' ? t.allCities : t.nationalIndustry(card.shortName ?? card.title))}
      />
    </TemplateSection>
  ) : null;

  const authority = city ? (
    <li className="inline-flex items-center gap-2">
      <CodePill code={city.authority} title={authorityName(city.authority)} />
      <span>{city.province}</span>
    </li>
  ) : null;

  const citiesSection = nearby.length ? (
    <TemplateSection id="other-cities" title={t.otherCities} muted>
      <CardGrid cards={nearby} locale={entry.locale} fallbackIcon="map-pin" />
    </TemplateSection>
  ) : null;

  const templateSections = (
    <>
      {pairSection}
      {backSection}
      <RelatedSection entry={entry} exclude={[...backLinks, ...pairs, ...nearby]} />
      {citiesSection}
    </>
  );

  return (
    <TemplateFrame entry={entry} graph={graph}>
      <ShowcaseBody
        entry={entry}
        meta={<MetaBar entry={entry} extra={authority} />}
        pill={city?.authority}
        afterHero={
          <>
            {!isPair ? <TrustRibbon locale={entry.locale} className="mb-4" /> : null}
            <JumpNav items={jump} locale={entry.locale} />
          </>
        }
        beforeEnd={faqBlock ? undefined : templateSections}
        render={(block) =>
          block === faqBlock ? (
            <>
              {templateSections}
              <CoreBlocks entry={entry} blocks={[block]} />
            </>
          ) : undefined
        }
        kickers={{ featuresGrid: cityName, steps: t.cityKickerSteps, screenshot: t.cityKickerShot }}
      />
    </TemplateFrame>
  );
}
