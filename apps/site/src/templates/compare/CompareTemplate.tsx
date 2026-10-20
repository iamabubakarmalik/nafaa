/**
 * Compare template (ARCH 8) for COMPARE (/compare/{slug}) and its
 * alternative variant ALTERNATIVE (/alternatives/{slug}).
 *
 * Editor blocks: hero → answerBox verdict → comparisonTable → richText
 * "Where {X} is better" → richText "Where Nafaa is better" → steps
 * switching → faq. The template adds, right after the hero (or the answer
 * box when there is one):
 * - a head-to-head card: Nafaa's price from the Plan table against the
 *   competitor's price, shown only with its dated source, and both websites;
 *   the verdict (`data.verdict`) when no answer box already gives it;
 * - a disclosure that Nafaa wrote the page, with the latest check date of any
 *   competitor fact on it;
 * - byline, jump bar, and the other comparisons at the end.
 *
 * JSON-LD: Article + FAQPage (lib/seo/graph).
 */
import Link from 'next/link';
import type { ReactNode } from 'react';
import { InlineMarkdown } from '@/components/blocks/rich-text/Markdown';
import type { EntryData, PublicEntry } from '@/lib/cms/contract/cms-contract';
import { LOGO_BOWL, LOGO_DOT } from '@/lib/brand/logo';
import { getLayout } from '@/lib/cms/client';
import { CmsIcon } from '@/lib/icons';
import { buildEntryGraph } from '@/lib/seo/graph';
import { Animate } from '@/components/motion/Animate';
import { Blocks } from '../city/common/blocks';
import { loadEntity, loadEntries } from '../city/common/data';
import { formatDate, hostOf, isoDay, latestDate, outboundRel } from '../city/common/format';
import { jumpItemsFromBlocks } from '../city/common/jump';
import { loadPlans, summarisePlans, type NafaaPriceSummary } from '../city/common/plans';
import { stringsFor } from '../city/common/strings';
import { CardGrid, JumpNav, MetaBar, SourceNote, TemplateFrame, TemplateSection } from '../city/common/ui';
import styles from '../city/common/s4.module.css';

type CompareData = Extract<EntryData, { type: 'COMPARE' | 'ALTERNATIVE' }>;

const CARD_ID = 'head-to-head';

/** The latest date any competitor fact on the page was checked. */
function lastChecked(entry: PublicEntry, data: CompareData): string | null {
  const dates: (string | null | undefined)[] = [data.priceSource?.accessedAt, entry.factCheckedAt];
  for (const block of entry.blocks) {
    if (block.type === 'comparisonTable') {
      dates.push(block.checkedAt);
      block.sources?.forEach((s) => dates.push(s.accessedAt));
    }
    if (block.type === 'sources') block.items.forEach((s) => dates.push(s.accessedAt));
  }
  return latestDate(dates);
}

function NafaaMark() {
  return (
    <span className="grid size-12 place-items-center rounded-xl bg-brand-700 shadow-e1">
      <svg viewBox="112 112 288 288" width="30" height="30" aria-hidden focusable="false">
        <path d={LOGO_BOWL} className="fill-white" />
        <path d={LOGO_DOT} className="fill-amber-300" />
      </svg>
    </span>
  );
}

function Monogram({ name }: { name: string }) {
  return (
    <span aria-hidden className="grid size-12 place-items-center rounded-xl bg-surface-3 text-h4 font-semibold text-fg-strong ring-1 ring-inset ring-line-strong/60">
      {name.trim().charAt(0).toUpperCase()}
    </span>
  );
}

interface SideRow {
  label: string;
  value: ReactNode;
}

function Side({ title, mark, rows, highlight }: { title: string; mark: ReactNode; rows: SideRow[]; highlight?: boolean }) {
  return (
    <div className={highlight ? 'rounded-xl bg-brand-50/50 p-5 ring-1 ring-inset ring-brand-600/15 md:p-6 ink:bg-brand-400/5' : 'p-5 md:p-6'}>
      <div className="flex items-center gap-3">
        {mark}
        <h3 className="text-h4 text-fg-strong">{title}</h3>
      </div>
      <dl className="mt-5 space-y-4">
        {rows.map((row) => (
          <div key={row.label}>
            <dt className="text-small font-medium text-fg-subtle">{row.label}</dt>
            <dd className="mt-1 text-body text-fg">{row.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function HeadToHead({ entry, data, plans, showVerdict }: { entry: PublicEntry; data: CompareData; plans: NafaaPriceSummary; showVerdict: boolean }) {
  const t = stringsFor(entry.locale);
  const checked = lastChecked(entry, data);
  const competitorHost = hostOf(data.competitorUrl);
  const sameSite = competitorHost === hostOf(entry.url) || competitorHost === 'nafaa.pk';

  const nafaaRows: SideRow[] = [
    {
      label: t.pricing,
      value: (
        <>
          <span className="font-semibold text-fg-strong">{plans.minPaidMonthly ? t.nafaaPaidFrom(plans.minPaidMonthly) : t.seePricing}</span>{' '}
          <Link href="/pricing" className="text-small font-medium text-link hover:underline">
            {t.seePricing}
          </Link>
        </>
      ),
    },
  ];
  if (plans.trialLabel) nafaaRows.push({ label: t.freeTrial, value: plans.trialLabel });

  // A competitor price appears only with its dated source (the API refuses one without).
  const competitorRows: SideRow[] = [];
  if (data.competitorPrice && data.priceSource) {
    competitorRows.push({
      label: t.pricing,
      value: (
        <span className="flex flex-col gap-0.5">
          <span className="font-semibold text-fg-strong">{data.competitorPrice}</span>
          <SourceNote source={data.priceSource} locale={entry.locale} />
        </span>
      ),
    });
  }
  if (!sameSite) {
    competitorRows.push({
      label: t.website,
      value: (
        <a href={data.competitorUrl} rel={outboundRel(data.competitorUrl)} className="inline-flex items-center gap-1 text-link underline decoration-link/35 underline-offset-[3px] hover:decoration-current">
          {competitorHost}
          <CmsIcon name="arrow-up-right" size={14} />
        </a>
      ),
    });
  }

  return (
    <section id={CARD_ID} aria-labelledby={`${CARD_ID}-title`} className="theme-default bg-canvas pb-section pt-10 text-fg md:pt-14">
      <div className="mx-auto box-content max-w-container px-gutter">
        <div data-reveal="fade-up" className="rounded-2xl border border-line bg-surface p-2 shadow-e2 ink:shadow-none">
          <h2 id={`${CARD_ID}-title`} className="sr-only">
            {t.headToHead}
          </h2>
          {showVerdict ? (
            <div className="rounded-xl bg-surface-2 px-5 py-5 md:px-7 md:py-6">
              <p className="text-eyebrow uppercase text-link">{t.verdict}</p>
              <p className="mt-2 max-w-measure text-body-lg text-fg-strong">
                <InlineMarkdown text={data.verdict} opts={{ locale: entry.locale }} />
              </p>
            </div>
          ) : null}
          <div className="relative grid md:grid-cols-[1fr_auto_1fr]">
            <Side title="Nafaa" mark={<NafaaMark />} rows={nafaaRows} highlight />
            <Animate loops={false} className="relative hidden w-16 md:block">
              <svg aria-hidden className="absolute inset-0 h-full w-full text-line-strong" preserveAspectRatio="none" viewBox="0 0 2 100">
                <path d="M1 8 V92" pathLength={1} className={styles.connector} stroke="currentColor" strokeWidth="2" vectorEffect="non-scaling-stroke" fill="none" />
              </svg>
              <span className="absolute left-1/2 top-1/2 grid size-10 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-line bg-surface text-small font-semibold text-fg-subtle shadow-e1">
                {t.vs}
              </span>
            </Animate>
            <div className="flex items-center gap-3 px-5 md:hidden" aria-hidden>
              <span className="h-px flex-1 bg-line" />
              <span className="text-small font-semibold text-fg-subtle">{t.vs}</span>
              <span className="h-px flex-1 bg-line" />
            </div>
            <Side title={data.competitorName} mark={<Monogram name={data.competitorName} />} rows={competitorRows} />
          </div>
          <p className="flex gap-2.5 border-t border-line px-5 py-4 text-small text-fg-subtle md:px-7">
            <CmsIcon name="info" size={16} className="mt-0.5 shrink-0" />
            <span>
              {t.disclosureCompare}
              {checked ? (
                <>
                  {' '}
                  {t.lastChecked}: <time dateTime={isoDay(checked)}>{formatDate(checked, entry.locale)}</time>.
                </>
              ) : null}
            </span>
          </p>
        </div>
      </div>
    </section>
  );
}

export async function CompareTemplate({ entry }: { entry: PublicEntry }) {
  if (entry.data.type !== 'COMPARE' && entry.data.type !== 'ALTERNATIVE') return null;
  const data = entry.data;
  const t = stringsFor(entry.locale);
  const [{ site }, entity, planRows, compares, alternatives] = await Promise.all([
    getLayout(entry.locale),
    loadEntity(entry.locale),
    loadPlans(),
    loadEntries({ type: 'COMPARE', locale: entry.locale, sort: 'order', limit: 24 }),
    loadEntries({ type: 'ALTERNATIVE', locale: entry.locale, sort: 'order', limit: 24 }),
  ]);
  const graph = buildEntryGraph(entry, { site, entity });
  const plans = summarisePlans(planRows);

  const answer = entry.blocks.find((block) => block.type === 'answerBox');
  const card = <HeadToHead entry={entry} data={data} plans={plans} showVerdict={!answer} />;
  const relatedIds = new Set(entry.related.map((r) => r.id));
  const more = [...compares.items, ...alternatives.items].filter((c) => c.id !== entry.id && !relatedIds.has(c.id)).slice(0, 6);

  const jump = [{ id: CARD_ID, label: t.headToHead }, ...jumpItemsFromBlocks(entry.blocks)];
  if (more.length) jump.push({ id: 'more-comparisons', label: t.moreComparisons });

  return (
    <TemplateFrame entry={entry} graph={graph}>
      <MetaBar entry={entry} byline />
      <Blocks
        entry={entry}
        slots={{
          afterHero: (
            <>
              <JumpNav items={jump} locale={entry.locale} />
              {answer ? null : card}
            </>
          ),
          ...(answer ? { after: { [answer.id]: card } } : {}),
          end: more.length ? (
            <TemplateSection id="more-comparisons" title={t.moreComparisons} muted>
              <CardGrid
                cards={more}
                locale={entry.locale}
                fallbackIcon="arrow-left-right"
                meta={(c) => (c.type === 'ALTERNATIVE' ? t.alternativeEyebrow : t.compareEyebrow)}
              />
            </TemplateSection>
          ) : null,
        }}
      />
    </TemplateFrame>
  );
}
