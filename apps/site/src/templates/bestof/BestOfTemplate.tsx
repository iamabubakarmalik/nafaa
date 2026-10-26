/**
 * BestOf template (ARCH 8) for BEST_OF (/best/{slug}).
 *
 * Editor blocks: hero → richText methodology → comparisonTable quick pick →
 * richText how to choose → faq. The list itself comes from `data.items`
 * (one H2 per item), placed after the quick-pick table (or after the first
 * text block, or the hero). The template also adds:
 * - a disclosure whenever Nafaa is on the list, and the ranking method
 *   (`data.methodology`) right above the list;
 * - competitor prices only with their dated source; Nafaa's own price comes
 *   from the Plan table, never from the entry;
 * - byline (author, reviewer, fact-check, updated) and a jump bar.
 *
 * JSON-LD: Article + ItemList of the items in order, FAQPage (lib/seo/graph).
 */
import Link from 'next/link';
import { Markdown } from '@/components/blocks/rich-text/Markdown';
import { createSlugger } from '@/components/blocks/rich-text/slug';
import type { Block, EntryData, PublicEntry } from '@/lib/cms/contract/cms-contract';
import { getLayout } from '@/lib/cms/client';
import { CmsIcon } from '@/lib/icons';
import { buildEntryGraph } from '@/lib/seo/graph';
import { Blocks, blockTargetId } from '../city/common/blocks';
import { loadEntity } from '../city/common/data';
import { hostOf, outboundRel, slugify } from '../city/common/format';
import { jumpItemsFromBlocks } from '../city/common/jump';
import { loadPlans, summarisePlans, type NafaaPriceSummary } from '../city/common/plans';
import { stringsFor, type TemplateStrings } from '../city/common/strings';
import { JumpNav, MetaBar, SourceNote, TemplateFrame } from '../city/common/ui';
import { RelatedSection } from '../city/common/related';
import styles from '../city/common/s4.module.css';

type BestOfData = Extract<EntryData, { type: 'BEST_OF' }>;
type BestOfItem = BestOfData['items'][number];

const LIST_ID = 'the-list';

export function itemAnchor(item: BestOfItem, index: number): string {
  return `${String(index + 1).padStart(2, '0')}-${slugify(item.name)}`;
}

function insertionBlock(blocks: readonly Block[]): Block | undefined {
  return (
    blocks.find((block) => block.type === 'comparisonTable') ??
    blocks.find((block) => block.type === 'richText') ??
    (blocks[0]?.type === 'hero' ? blocks[0] : undefined)
  );
}

function PriceLine({ item, plans, t, locale }: { item: BestOfItem; plans: NafaaPriceSummary; t: TemplateStrings; locale: string }) {
  if (item.isNafaa) {
    return (
      <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="text-small font-medium text-fg-subtle">{t.startingPrice}</span>
        <span className="text-body font-semibold text-fg-strong">{plans.minPaidMonthly ? t.nafaaPaidFrom(plans.minPaidMonthly) : t.seePricing}</span>
        {plans.trialLabel ? <span className="text-small text-fg-muted">· {plans.trialLabel}</span> : null}
        <Link href="/pricing" className="text-small font-medium text-link hover:underline">
          {t.seePricing}
        </Link>
      </p>
    );
  }
  // A competitor price is shown only with its dated source (the API refuses one without).
  if (item.price && item.priceSource) {
    return (
      <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="text-small font-medium text-fg-subtle">{t.startingPrice}</span>
        <span className="text-body font-semibold text-fg-strong">{item.price}</span>
        <SourceNote source={item.priceSource} locale={locale} />
      </p>
    );
  }
  return null;
}

function ItemArticle({ item, index, plans, locale }: { item: BestOfItem; index: number; plans: NafaaPriceSummary; locale: string }) {
  const t = stringsFor(locale);
  const id = itemAnchor(item, index);
  const visit = item.isNafaa ? null : item.url;
  return (
    <li id={id} className="grid gap-x-10 gap-y-6 border-t border-line py-12 first:border-t-0 first:pt-2 md:grid-cols-[6rem_1fr] md:py-16">
      <div aria-hidden className={`${styles.rank} text-display leading-none text-fg-subtle/25 md:text-end`}>
        {String(index + 1).padStart(2, '0')}
      </div>
      <div data-reveal="fade-up" className="min-w-0">
        <div className="flex flex-wrap items-center gap-3">
          <h2 id={`${id}-title`} className="text-h2 text-fg-strong">
            <span className="sr-only">{index + 1}. </span>
            {item.name}
          </h2>
          {item.isNafaa ? (
            <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-800 ring-1 ring-inset ring-brand-600/20 ink:bg-brand-400/10 ink:text-brand-300">
              {t.ourProduct}
            </span>
          ) : null}
        </div>
        <p className="mt-3 max-w-measure text-body-lg text-fg-muted">
          <span className="font-medium text-fg-strong">{t.bestFor}:</span> {item.bestFor}
        </p>
        <div className="mt-5">
          <PriceLine item={item} plans={plans} t={t} locale={locale} />
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {item.strengths.length ? (
            <div className="rounded-lg border border-line bg-surface p-5 shadow-e1 ink:shadow-none">
              <h3 className="text-eyebrow uppercase text-fg-subtle">{t.strengths}</h3>
              <ul className="mt-3 space-y-2.5">
                {item.strengths.map((s) => (
                  <li key={s} className="flex gap-2.5 text-body text-fg">
                    <CmsIcon name="circle-check" size={18} className="mt-0.5 shrink-0 text-link" />
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {item.weaknesses.length ? (
            <div className="rounded-lg border border-line bg-surface p-5 shadow-e1 ink:shadow-none">
              <h3 className="text-eyebrow uppercase text-fg-subtle">{t.weaknesses}</h3>
              <ul className="mt-3 space-y-2.5">
                {item.weaknesses.map((w) => (
                  <li key={w} className="flex gap-2.5 text-body text-fg">
                    <CmsIcon name="circle-alert" size={18} className="mt-0.5 shrink-0 text-amber-700 ink:text-amber-300" />
                    {w}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>

        {visit ? (
          <p className="mt-6">
            <a
              href={visit}
              rel={outboundRel(visit)}
              className="inline-flex items-center gap-1.5 text-small font-medium text-link underline decoration-link/35 underline-offset-[3px] hover:decoration-current"
            >
              {t.visitSite}: {hostOf(visit)}
              <CmsIcon name="arrow-up-right" size={15} />
            </a>
          </p>
        ) : null}
      </div>
    </li>
  );
}

function TheList({ entry, data, plans }: { entry: PublicEntry; data: BestOfData; plans: NafaaPriceSummary }) {
  const t = stringsFor(entry.locale);
  const hasNafaa = data.items.some((item) => item.isNafaa);
  return (
    <section id={LIST_ID} aria-label={t.theList} className="theme-default bg-canvas pb-section pt-6 text-fg md:pt-10">
      <div className="mx-auto box-content max-w-container px-gutter">
        <div className="grid gap-4 md:grid-cols-[6rem_1fr] md:gap-x-10">
          <div className="hidden md:block" />
          <div className="space-y-3">
            {hasNafaa ? (
              <p role="note" className="flex gap-3 rounded-lg border border-line bg-surface-2 p-4 text-small text-fg-muted">
                <CmsIcon name="info" size={18} className="mt-0.5 shrink-0 text-fg-subtle" />
                {t.disclosureBestOf}
              </p>
            ) : null}
            <details className="group rounded-lg border border-line bg-surface p-4 open:shadow-e1">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-small font-medium text-fg-strong">
                {t.howWeRanked}
                <CmsIcon name="arrow-right" size={16} className="rotate-90 text-fg-subtle transition-transform duration-fast group-open:-rotate-90" />
              </summary>
              <div className="prose mt-3 max-w-none text-small">
                <Markdown text={data.methodology} opts={{ media: entry.media, slugger: createSlugger(), locale: entry.locale, idPrefix: 'method' }} />
              </div>
            </details>
          </div>
        </div>
        <ol className="mt-6">
          {data.items.map((item, index) => (
            <ItemArticle key={`${item.name}-${index}`} item={item} index={index} plans={plans} locale={entry.locale} />
          ))}
        </ol>
      </div>
    </section>
  );
}

export async function BestOfTemplate({ entry }: { entry: PublicEntry }) {
  if (entry.data.type !== 'BEST_OF') return null;
  const data = entry.data;
  const [{ site }, entity, planRows] = await Promise.all([getLayout(entry.locale), loadEntity(entry.locale), loadPlans()]);
  const plans = summarisePlans(planRows);
  const items = data.items.map((item, index) => ({
    name: item.name,
    url: item.isNafaa ? `${site.baseUrl.replace(/\/$/, '')}/` : (item.url ?? `${entry.url}#${itemAnchor(item, index)}`),
  }));
  const graph = buildEntryGraph(entry, { site, entity, items });

  const at = insertionBlock(entry.blocks);
  const list = <TheList entry={entry} data={data} plans={plans} />;

  const jumpBefore = jumpItemsFromBlocks(entry.blocks);
  const listJump = data.items.slice(0, 8).map((item, index) => ({ id: itemAnchor(item, index), label: `${index + 1}. ${item.name}` }));
  const atIndex = at ? jumpBefore.findIndex((j) => j.id === blockTargetId(at)) : -1;
  const jump = atIndex >= 0 ? [...jumpBefore.slice(0, atIndex + 1), ...listJump, ...jumpBefore.slice(atIndex + 1)] : [...listJump, ...jumpBefore];

  return (
    <TemplateFrame entry={entry} graph={graph}>
      <MetaBar entry={entry} byline />
      <Blocks
        entry={entry}
        slots={{
          afterHero: (
            <>
              <JumpNav items={jump} locale={entry.locale} />
              {at && at.type !== 'hero' ? null : list}
            </>
          ),
          ...(at && at.type !== 'hero' ? { after: { [at.id]: list } } : {}),
          end: <RelatedSection entry={entry} />,
        }}
      />
    </TemplateFrame>
  );
}

export type { BestOfItem };
