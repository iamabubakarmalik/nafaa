/**
 * The middle of the home page: the "works with" ticker, the platform bento,
 * solutions by business type, the industry ticker, the worldwide services
 * band and the AI assistant. Server components; every word
 * comes from the blocks or entry cards (see HomeTemplate for the mapping).
 */
import Link from 'next/link';
import { CtaButton } from '@/components/blocks/parts/CtaButton';
import { FeatureBadge } from '@/components/blocks/parts/FeatureBadge';
import { InlineMarkdown } from '@/components/blocks/rich-text/Markdown';
import { hexToChannels } from '@/components/blocks/lib/format';
import { cx } from '@/components/ui/cx';
import type { CtaBlock, EntryCard, FeaturesGridBlock, PublicEntry } from '@/lib/cms/contract/cms-contract';
import { CmsIcon } from '@/lib/icons';
import { uiStrings } from '@/lib/i18n/ui';
import { Arrow, cardPath } from '../core/ui';
import { AiChat } from './AiChat';
import { SolutionScene } from './solutionScenes';
import { SolutionsTabs } from './SolutionsTabs';
import { Backdrop } from './decor';
import { GlobeLazy as Globe } from './GlobeLazy';
import { PlatformVisual, hasPlatformVisual } from './visuals';
import fx from './fx.module.css';

/** Below md, card lists scroll sideways with snap points instead of stacking 8-12 tall cards. */
const RAIL_LIST = '-mx-gutter flex snap-x snap-mandatory scroll-px-gutter gap-3 overflow-x-auto px-gutter pb-2 [scrollbar-width:none] md:mx-0 md:grid md:snap-none md:overflow-visible md:px-0 md:pb-0 [&::-webkit-scrollbar]:hidden';
const RAIL_ITEM = 'w-[84%] max-w-[22rem] shrink-0 snap-start md:w-auto md:max-w-none';

/** Links in featuresGrid items may be CTA keywords; only site paths become card links. */
function cardHref(href: string | undefined): string | undefined {
  if (!href || /^(signup|demo|whatsapp|entry:)/.test(href)) return undefined;
  return href;
}

function SectionHead({
  id,
  eyebrow,
  title,
  intro,
  link,
  linkLabel,
  center,
}: {
  id: string;
  eyebrow: string;
  title: string;
  intro?: string;
  link?: string;
  linkLabel?: string;
  center?: boolean;
}) {
  return (
    <div className={cx('flex flex-col gap-6', center ? 'items-center text-center' : 'md:flex-row md:items-end md:justify-between')} data-reveal>
      <div className={cx('max-w-[44rem]', center && 'mx-auto')}>
        <p className="text-eyebrow uppercase text-link">{eyebrow}</p>
        <h2 id={id} className="mt-3 text-h2 text-fg-strong">
          {title}
        </h2>
        {intro ? (
          <p className="mt-4 text-body-lg text-fg-muted">
            <InlineMarkdown text={intro} />
          </p>
        ) : null}
      </div>
      {link && linkLabel ? (
        <Link href={link} prefetch={false} className="group inline-flex shrink-0 items-center gap-1.5 text-small font-medium text-link">
          {linkLabel}
          <Arrow className="transition-transform duration-fast ease-out group-hover:translate-x-0.5" />
        </Link>
      ) : null}
    </div>
  );
}

// ─── Works with (ticker) ───

export function WorksWith({ block, link }: { block: FeaturesGridBlock; link?: string }) {
  const items = block.items;
  const row = (hidden: boolean) => (
    <ul className={fx.tickerRow} aria-hidden={hidden || undefined}>
      {items.map((item, i) => (
        <li key={`${item.title}-${i}`} className="flex shrink-0 items-center gap-2.5 px-6 text-fg-muted" title={hidden ? undefined : item.body}>
          <CmsIcon name={item.icon} size={18} className="text-fg-subtle" />
          <span className="text-[1.0625rem] font-semibold tracking-tight">{item.title}</span>
        </li>
      ))}
    </ul>
  );
  return (
    <section aria-labelledby="home-works" className="border-y border-line/70 py-8">
      <div className="mx-auto box-content flex max-w-wide flex-col items-center gap-5 px-gutter lg:flex-row lg:gap-10">
        <h2 id="home-works" className="shrink-0 text-center text-small font-medium text-fg-subtle lg:max-w-[14rem] lg:text-start">
          {link ? (
            <Link href={link} prefetch={false} className="hover:text-fg-strong">
              {block.heading}
            </Link>
          ) : (
            block.heading
          )}
        </h2>
        <div className={cx(fx.ticker, 'w-full min-w-0 flex-1')} data-animate="once">
          <div className={fx.tickerTrack}>
            {row(false)}
            {row(true)}
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Platform bento ───

/** 12-column spans: rows of 7+5, 4+4+4, 5+7, 4+4+4, 6+6, then repeat. */
const PATTERN = [7, 5, 4, 4, 4, 5, 7, 4, 4, 4, 6, 6];
const SPAN: Record<number, string> = { 4: 'lg:col-span-4', 5: 'lg:col-span-5', 6: 'lg:col-span-6', 7: 'lg:col-span-7', 12: 'lg:col-span-12' };

function spans(count: number): number[] {
  const out: number[] = [];
  let row = 0;
  for (let i = 0; i < count; i++) {
    let span = PATTERN[i % PATTERN.length] as number;
    if (row + span > 12) span = 12 - row;
    out.push(span);
    row = (row + span) % 12;
  }
  if (row !== 0 && out.length) out[out.length - 1] = (out[out.length - 1] as number) + (12 - row);
  return out;
}

export function Platform({ block, entry, hubLink }: { block: FeaturesGridBlock; entry: PublicEntry; hubLink?: string }) {
  const locale = entry.locale;
  const t = uiStrings(locale);
  const layout = spans(block.items.length);
  return (
    <section aria-labelledby="home-platform" className="relative isolate py-section">
      <div aria-hidden className={fx.softWash} />
      <div className="mx-auto box-content max-w-wide px-gutter">
        <SectionHead id="home-platform" eyebrow={t.home.platformEyebrow} title={block.heading} intro={block.intro} link={hubLink} linkLabel={t.home.allProducts} />
        <ul className={cx(fx.bento, RAIL_LIST, 'mt-12 md:grid-cols-2 md:gap-4 lg:grid-cols-12')} data-animate="once">
          {block.items.map((item, i) => {
            const span = layout[i] ?? 4;
            const href = cardHref(item.href);
            const visual = hasPlatformVisual(item.icon);
            const body = (
              <>
                {visual ? (
                  <div aria-hidden dir="ltr" className={cx(fx.visual, 'relative h-44 overflow-hidden border-b border-line')}>
                    <PlatformVisual icon={item.icon} />
                  </div>
                ) : null}
                <div className="flex flex-1 flex-col p-6">
                  <div className="flex items-center gap-2.5">
                    <span className="inline-flex size-8 items-center justify-center rounded-md bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-600/15 ink:bg-brand-400/10 ink:text-brand-300">
                      <CmsIcon name={item.icon} size={16} />
                    </span>
                    <h3 className="text-h4 text-fg-strong">{item.title}</h3>
                    <FeatureBadge status={item.status} locale={locale} />
                  </div>
                  <p className="mt-3 text-body text-fg-muted">
                    <InlineMarkdown text={item.body} />
                  </p>
                  {href ? (
                    <span className="mt-auto inline-flex items-center gap-1.5 pt-5 text-small font-medium text-link">
                      {item.status === 'coming' ? t.seeRoadmap : t.learnMore}
                      <Arrow className="transition-transform duration-fast ease-out group-hover:translate-x-0.5" />
                    </span>
                  ) : null}
                </div>
              </>
            );
            const card = cx(
              fx.card,
              'group relative isolate flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-e1 ink:shadow-none',
              href && 'transition-[transform,box-shadow,border-color] duration-base ease-out hover:-translate-y-1 hover:border-brand-500/30 hover:shadow-e3',
            );
            return (
              <li key={`${item.title}-${i}`} className={cx(RAIL_ITEM, SPAN[span])} data-reveal>
                {href ? (
                  <Link href={href} prefetch={false} className={card}>
                    {body}
                  </Link>
                ) : (
                  <div className={card}>{body}</div>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

// ─── Solutions by business type ───

const SOLUTION_TONES = ['#059669', '#2563eb', '#7c3aed', '#ea580c', '#0891b2', '#475569', '#db2777', '#0f766e'];

/** The CMS path of a site link ("/ur/solutions/x" → "/solutions/x"), for keyed lookups. */
function cmsPath(href: string, locale: string): string {
  const prefix = `/${locale}/`;
  return locale !== 'en' && href.startsWith(prefix) ? href.slice(prefix.length - 1) : href;
}

export function Solutions({ block, hubLink, signupUrl, locale = 'en' }: { block: FeaturesGridBlock; hubLink?: string; signupUrl?: string; locale?: string }) {
  const t = uiStrings(locale).home;
  const tabs = block.items.map((item, i) => ({
    id: `sol-${i}`,
    label: item.title,
    icon: <CmsIcon name={item.icon} size={16} />,
    accent: hexToChannels(SOLUTION_TONES[i % SOLUTION_TONES.length]) ?? undefined,
  }));
  return (
    <section aria-labelledby="home-solutions" className="relative isolate overflow-hidden border-y border-line/70 py-section">
      <Backdrop tint="slate" pattern="dots" />
      <div className="mx-auto box-content max-w-wide px-gutter">
        <SectionHead id="home-solutions" eyebrow={t.solutionsEyebrow} title={block.heading} intro={block.intro} link={hubLink} linkLabel={t.allSolutions} center />
        <SolutionsTabs tabs={tabs} label={t.businessTypes}>
          {block.items.map((item, i) => {
            const href = cardHref(item.href);
            const points = (item.href && t.solutionPoints[cmsPath(item.href, locale)]) || [];
            return (
              <article key={`${item.title}-${i}`} className={fx.solPanel} style={{ '--accent': tabs[i]?.accent }}>
                <div className={fx.solText}>
                  <span className="inline-flex size-11 items-center justify-center rounded-2xl bg-accent text-white shadow-[0_10px_24px_-10px_rgb(var(--accent)/0.9)]">
                    <CmsIcon name={item.icon} size={21} />
                  </span>
                  <h3 className="mt-5 text-h3 text-fg-strong">
                    {item.title} <FeatureBadge status={item.status} locale={locale} />
                  </h3>
                  <p className="mt-3 text-body text-fg-muted">
                    <InlineMarkdown text={item.body} />
                  </p>
                  {points.length ? (
                    <ul className="mt-5 grid gap-2.5">
                      {points.map((pt, k) => (
                        <li key={pt} className={fx.solPoint} style={{ '--i': k }}>
                          <span aria-hidden className={fx.solTick}>
                            <CmsIcon name="check" size={12} />
                          </span>
                          {pt}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  <div className="mt-7 flex flex-wrap items-center gap-3">
                    {href ? (
                      <Link href={href} prefetch={false} className={fx.solCta}>
                        {t.explorePrefix}
                        {item.title}
                        {t.exploreSuffix}
                        <Arrow className="transition-transform duration-fast ease-out group-hover:translate-x-0.5" />
                      </Link>
                    ) : null}
                    {signupUrl ? (
                      <a href={signupUrl} data-track="cta_click" data-track-label={`Solutions: start trial (${item.title})`} className="text-small font-semibold text-fg-strong underline-offset-4 hover:underline">
                        {t.startTrial}
                      </a>
                    ) : null}
                  </div>
                </div>
                <div aria-hidden dir="ltr" className={fx.solScene} data-animate="">
                  <SolutionScene icon={item.icon} />
                </div>
              </article>
            );
          })}
        </SolutionsTabs>
      </div>
    </section>
  );
}

// ─── Industries ticker ───

function IndustryChip({ card, hidden }: { card: EntryCard; hidden?: boolean }) {
  return (
    <li className="shrink-0 px-1.5">
      <Link
        href={cardPath(card)}
        prefetch={false}
        tabIndex={hidden ? -1 : undefined}
        style={{ '--accent': hexToChannels(card.color) ?? undefined }}
        className="group flex items-center gap-3 rounded-full border border-line bg-surface py-2 ps-2 pe-5 shadow-e1 transition-[border-color,box-shadow,transform] duration-base hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-e2 ink:shadow-none"
      >
        <span aria-hidden className="inline-flex size-9 items-center justify-center rounded-full bg-accent text-white">
          <CmsIcon name={card.icon ?? 'store'} size={17} />
        </span>
        <span className="whitespace-nowrap text-small font-semibold text-fg-strong">{card.title}</span>
      </Link>
    </li>
  );
}

export function Industries({ heading, intro, cards, hubLink, locale }: { heading: string; intro?: string; cards: EntryCard[]; hubLink?: string; locale?: string }) {
  if (!cards.length) return null;
  const t = uiStrings(locale);
  const rows: EntryCard[][] = [[], [], []];
  cards.forEach((card, i) => rows[i % 3]?.push(card));
  return (
    <section aria-labelledby="home-industries" className="overflow-hidden py-section">
      <div className="mx-auto box-content max-w-wide px-gutter">
        <SectionHead id="home-industries" eyebrow={t.home.industriesCount(cards.length)} title={heading} intro={intro} link={hubLink} linkLabel={t.allIndustries} />
      </div>
      <div className="mt-12 space-y-3" data-animate="once">
        {rows
          .filter((r) => r.length)
          .map((row, r) => (
            <div key={r} className={cx(fx.ticker, fx.tickerWide)}>
              <div className={cx(fx.tickerTrack, r % 2 === 1 && fx.reverse, r === 2 && fx.slow)}>
                <ul className={fx.tickerRow}>
                  {row.map((card) => (
                    <IndustryChip key={card.id} card={card} />
                  ))}
                </ul>
                <ul className={fx.tickerRow} aria-hidden>
                  {row.map((card) => (
                    <IndustryChip key={card.id} card={card} hidden />
                  ))}
                </ul>
              </div>
            </div>
          ))}
      </div>
    </section>
  );
}

// ─── Services worldwide ───

export function Services({ block, quote, entry, hubLink }: { block: FeaturesGridBlock; quote?: CtaBlock; entry: PublicEntry; hubLink?: string }) {
  const t = uiStrings(entry.locale).home;
  return (
    <section aria-labelledby="home-services" className="relative isolate overflow-hidden py-section">
      <Backdrop pattern="dots" />
      <div className="mx-auto box-content grid max-w-wide items-center gap-12 px-gutter lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-16">
        <div>
          <SectionHead id="home-services" eyebrow={t.servicesEyebrow} title={block.heading} intro={block.intro} link={hubLink} linkLabel={t.allServices} />
          <ul className="mt-10 grid gap-3 sm:grid-cols-2" data-reveal="stagger">
            {block.items.map((item, i) => {
              const href = cardHref(item.href);
              const inner = (
                <>
                  <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-600/15 transition-colors duration-base group-hover:bg-brand-600 group-hover:text-white ink:bg-brand-400/10 ink:text-brand-300 ink:ring-brand-400/20">
                    <CmsIcon name={item.icon} size={19} />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-body font-semibold text-fg-strong">{item.title}</span>
                    <span className="mt-1 block text-small text-fg-muted">
                      <InlineMarkdown text={item.body} />
                    </span>
                  </span>
                </>
              );
              const cls =
                'group flex h-full gap-4 rounded-2xl border border-line bg-surface/90 p-4 shadow-e1 backdrop-blur transition-[transform,box-shadow,border-color] duration-base ease-out hover:-translate-y-0.5 hover:border-brand-500/30 hover:shadow-e2 ink:shadow-none';
              return (
                <li key={`${item.title}-${i}`}>
                  {href ? (
                    <Link href={href} prefetch={false} className={cls}>
                      {inner}
                    </Link>
                  ) : (
                    <div className={cls}>{inner}</div>
                  )}
                </li>
              );
            })}
          </ul>
          {quote ? (
            <div className="relative mt-10 flex flex-col gap-5 overflow-hidden rounded-2xl border border-brand-600/20 bg-gradient-to-br from-brand-50 to-surface p-6 shadow-e1 sm:flex-row sm:items-center sm:justify-between ink:border-brand-400/25 ink:from-brand-400/10 ink:to-transparent ink:shadow-none">
              <div>
                <p className="text-h4 text-fg-strong">{quote.heading}</p>
                {quote.body ? (
                  <p className="mt-1 text-small text-fg-muted">
                    <InlineMarkdown text={quote.body} />
                  </p>
                ) : null}
              </div>
              <div className="flex shrink-0 flex-wrap gap-2.5">
                <CtaButton cta={quote.primaryCta} fallbackVariant="primary" area="services" />
                <CtaButton cta={quote.secondaryCta} fallbackVariant="secondary" area="services" />
              </div>
            </div>
          ) : null}
        </div>
        <div className="relative mx-auto w-full max-w-[36rem]" aria-hidden>
          <Globe />
        </div>
      </div>
    </section>
  );
}

// ─── AI assistant ───

/** Products in the decorative answer (the demo shop's catalogue); bars carry no numbers. */
const AI_ANSWER = [
  { name: 'Basmati Rice 5kg', w: 92 },
  { name: 'Cooking Oil 5L', w: 74 },
  { name: 'Black Tea 950g', w: 58 },
];

export function AiAssistant({ block, link, locale }: { block: FeaturesGridBlock; link?: string; locale?: string }) {
  const t = uiStrings(locale);
  const question = block.items.find((it) => /[“"]/.test(it.body))?.body.replace(/[“”"]/g, '');
  return (
    <section aria-labelledby="home-ai" className="relative isolate overflow-hidden py-section">
      <Backdrop pattern="grid" noon="right" />
      <div className="mx-auto box-content grid max-w-wide items-center gap-12 px-gutter lg:grid-cols-2 lg:gap-20">
        <div data-reveal>
          <p className="inline-flex items-center gap-2 rounded-full border border-brand-600/20 bg-brand-50 py-1 ps-1 pe-3 text-xs font-semibold text-brand-800 ink:border-brand-400/25 ink:bg-brand-400/10 ink:text-brand-200">
            <span className="inline-flex items-center gap-1 rounded-full bg-brand-700 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-white">
              <CmsIcon name="sparkles" size={12} />
              {t.home.aiNew}
            </span>
            {t.home.aiAsk}
          </p>
          <h2 id="home-ai" className="mt-5 text-h2 text-fg-strong">
            {block.heading}
          </h2>
          {block.intro ? (
            <p className="mt-4 text-body-lg text-fg-muted">
              <InlineMarkdown text={block.intro} />
            </p>
          ) : null}
          <ul className="mt-8 space-y-4">
            {block.items.map((item, i) => (
              <li key={`${item.title}-${i}`} className="flex gap-4">
                <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-50 to-brand-100 text-brand-700 ring-1 ring-inset ring-brand-600/15 ink:from-brand-400/15 ink:to-brand-600/10 ink:text-brand-300 ink:ring-brand-400/20">
                  <CmsIcon name={item.icon} size={18} />
                </span>
                <span>
                  <span className="flex items-center gap-2 text-body font-semibold text-fg-strong">
                    {item.title}
                    <FeatureBadge status={item.status} locale={locale ?? 'en'} />
                  </span>
                  <span className="mt-0.5 block text-small text-fg-muted">
                    <InlineMarkdown text={item.body} />
                  </span>
                </span>
              </li>
            ))}
          </ul>
          {link ? (
            <Link href={link} prefetch={false} className="group mt-8 inline-flex items-center gap-1.5 text-small font-medium text-link">
              {t.home.seeAi}
              <Arrow className="transition-transform duration-fast ease-out group-hover:translate-x-0.5" />
            </Link>
          ) : null}
        </div>
        <AiChat
          question={question ?? 'Is hafte sab se zyada profit kis cheez par hua?'}
          answerText="Is hafte sab se zyada profit in par hua:"
          rows={AI_ANSWER}
          icons={{
            alert: <CmsIcon name="triangle-alert" size={11} />,
            list: <CmsIcon name="list-checks" size={13} />,
            sparkles: <CmsIcon name="sparkles" size={18} />,
            sparklesSmall: <CmsIcon name="sparkles" size={14} />,
            chart: <CmsIcon name="chart-column" size={12} />,
            send: <CmsIcon name="send" size={15} />,
          }}
        />
      </div>
    </section>
  );
}
