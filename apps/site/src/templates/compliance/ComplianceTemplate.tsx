/**
 * Compliance template (ARCH 8) for COMPLIANCE (/compliance/{slug}).
 *
 * Editor blocks: hero → answerBox (who, deadline, penalty) → richText
 * sections → steps → richText costs → richText "How Nafaa handles it" →
 * faq → sources. The template adds:
 * - a byline with author, reviewer, fact-check stamp and "Updated" date
 *   (COMPLIANCE cannot publish without a fact-check and an official source);
 * - "At a glance": the rule's structured data (authority, effective date,
 *   SROs, penalty) with the first official source, after the answer box;
 * - the owner's exact compliance statement from settings `entity` on FBR and
 *   PRA pages only, never paraphrased;
 * - a sticky jump bar, city hubs under this authority and the other
 *   authorities' pages.
 *
 * JSON-LD: Article (author, reviewer, dateModified), HowTo for real steps,
 * FAQPage (lib/seo/graph).
 */
import type { ReactNode } from 'react';
import type { EntryCard, EntryData, PublicEntity, PublicEntry, Source } from '@/lib/cms/contract/cms-contract';
import { getLayout } from '@/lib/cms/client';
import { CmsIcon } from '@/lib/icons';
import { buildEntryGraph } from '@/lib/seo/graph';
import { authorityName } from '../city/common/authorities';
import { Blocks } from '../city/common/blocks';
import { loadEntity, loadEntries } from '../city/common/data';
import { formatDate, isoDay } from '../city/common/format';
import { jumpItemsFromBlocks, insertJumpItem } from '../city/common/jump';
import { RelatedSection } from '../city/common/related';
import { stringsFor } from '../city/common/strings';
import { CardGrid, CodePill, JumpNav, MetaBar, SourceNote, TemplateFrame, TemplateSection } from '../city/common/ui';

type ComplianceData = Extract<EntryData, { type: 'COMPLIANCE' }>;

const GLANCE_ID = 'at-a-glance';

/** The owner's statement applies to FBR and PRA only (settings `entity.compliance.fbrPra`). */
function complianceStatement(entity: PublicEntity | null, authority: ComplianceData['authority']): string | null {
  if (authority !== 'FBR' && authority !== 'PRA') return null;
  return entity?.compliance.fbrPra?.text ?? null;
}

function firstOfficialSource(entry: PublicEntry): Source | null {
  for (const block of entry.blocks) {
    if (block.type === 'sources' && block.items[0]) return block.items[0];
  }
  return null;
}

function AtAGlance({ entry, data, statement }: { entry: PublicEntry; data: ComplianceData; statement: string | null }) {
  const t = stringsFor(entry.locale);
  const effective = formatDate(data.effectiveDate, entry.locale);
  const source = firstOfficialSource(entry);
  const rows: { label: string; value: ReactNode }[] = [
    {
      label: t.authority,
      value: (
        <span className="inline-flex flex-wrap items-center gap-2">
          <CodePill code={data.authority} />
          <span className="text-fg-strong">{authorityName(data.authority)}</span>
        </span>
      ),
    },
  ];
  if (effective) rows.push({ label: t.effectiveFrom, value: <time dateTime={isoDay(data.effectiveDate)}>{effective}</time> });
  if (data.sroRefs.length) {
    rows.push({
      label: t.rules,
      value: (
        <ul className="space-y-1">
          {data.sroRefs.map((ref) => (
            <li key={ref} className="flex gap-2">
              <CmsIcon name="file-text" size={16} className="mt-0.5 shrink-0 text-fg-subtle" />
              <span>{ref}</span>
            </li>
          ))}
        </ul>
      ),
    });
  }
  if (data.penaltySummary) rows.push({ label: t.penalties, value: data.penaltySummary });

  return (
    <section id={GLANCE_ID} aria-labelledby={`${GLANCE_ID}-title`} className="theme-default bg-canvas pb-section pt-6 text-fg md:pt-8">
      <div className="mx-auto box-content max-w-container px-gutter">
        <div data-reveal="fade-up" className="overflow-hidden rounded-xl border border-line bg-surface shadow-e1 ink:shadow-none">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-surface-2 px-5 py-3.5 md:px-7">
            <h2 id={`${GLANCE_ID}-title`} className="text-eyebrow uppercase text-fg-muted">
              {t.atAGlance}
            </h2>
            {source ? <SourceNote source={source} locale={entry.locale} /> : null}
          </div>
          <dl className="divide-y divide-line">
            {rows.map((row) => (
              <div key={row.label} className="grid gap-1.5 px-5 py-4 md:grid-cols-[12rem_1fr] md:gap-6 md:px-7">
                <dt className="text-small font-medium text-fg-subtle">{row.label}</dt>
                <dd className="text-body text-fg">{row.value}</dd>
              </div>
            ))}
          </dl>
          {statement ? (
            <p className="flex items-center gap-2.5 border-t border-line bg-brand-50/60 px-5 py-3.5 text-small font-medium text-brand-800 md:px-7 ink:bg-brand-400/10 ink:text-brand-300">
              <CmsIcon name="shield-check" size={18} />
              Nafaa: {statement}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}

export async function ComplianceTemplate({ entry }: { entry: PublicEntry }) {
  if (entry.data.type !== 'COMPLIANCE') return null;
  const data = entry.data;
  const t = stringsFor(entry.locale);
  const [{ site }, entity, others] = await Promise.all([
    getLayout(entry.locale),
    loadEntity(entry.locale),
    loadEntries({ type: 'COMPLIANCE', locale: entry.locale, sort: 'order', limit: 24 }),
  ]);
  const graph = buildEntryGraph(entry, { site, entity });

  const cities: EntryCard[] = entry.tags.CITY ?? [];
  const otherPages = others.items.filter((card) => card.id !== entry.id);

  const answer = entry.blocks.find((block) => block.type === 'answerBox');
  const glance = <AtAGlance entry={entry} data={data} statement={complianceStatement(entity, data.authority)} />;

  let jump = jumpItemsFromBlocks(entry.blocks);
  jump = [{ id: GLANCE_ID, label: t.atAGlance }, ...jump];
  if (cities.length) jump = insertJumpItem(jump, { id: 'cities', label: 'Cities' });

  const end = (
    <>
      {cities.length ? (
        <TemplateSection id="cities" title={t.citiesUnder(data.authority)}>
          <CardGrid cards={cities} locale={entry.locale} columns={4} fallbackIcon="map-pin" />
        </TemplateSection>
      ) : null}
      {otherPages.length ? (
        <TemplateSection id="other-authorities" title={t.otherAuthorities} muted>
          <CardGrid cards={otherPages} locale={entry.locale} fallbackIcon="landmark" />
        </TemplateSection>
      ) : null}
      <RelatedSection entry={entry} exclude={[...cities, ...otherPages]} />
    </>
  );

  return (
    <TemplateFrame entry={entry} graph={graph}>
      <MetaBar entry={entry} byline extra={<li><CodePill code={data.authority} title={authorityName(data.authority)} /></li>} />
      <Blocks
        entry={entry}
        slots={{
          afterHero: (
            <>
              <JumpNav items={jump} locale={entry.locale} />
              {answer ? null : glance}
            </>
          ),
          ...(answer ? { after: { [answer.id]: glance } } : {}),
          end,
        }}
      />
    </TemplateFrame>
  );
}
