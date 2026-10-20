/**
 * The middle of the home page: the "works with" ticker, the platform bento,
 * solutions by business type, the industry ticker, the worldwide services
 * band and the AI assistant (coming soon). Server components; every word
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
import { Arrow } from '../core/ui';
import { Globe } from './Globe';
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
        <h2 id="home-works" className="shrink-0 text-center text-small font-medium text-fg-subtle lg:max-w-[14rem] lg:text-left">
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

export function Platform({ block, hubLink }: { block: FeaturesGridBlock; entry: PublicEntry; hubLink?: string }) {
  const layout = spans(block.items.length);
  return (
    <section aria-labelledby="home-platform" className="relative isolate py-section">
      <div aria-hidden className={fx.softWash} />
      <div className="mx-auto box-content max-w-wide px-gutter">
        <SectionHead id="home-platform" eyebrow="The platform" title={block.heading} intro={block.intro} link={hubLink} linkLabel="All products" />
        <ul className={cx(fx.bento, RAIL_LIST, 'mt-12 md:grid-cols-2 md:gap-4 lg:grid-cols-12')} data-animate="once">
          {block.items.map((item, i) => {
            const span = layout[i] ?? 4;
            const href = cardHref(item.href);
            const visual = hasPlatformVisual(item.icon);
            const body = (
              <>
                {visual ? (
                  <div aria-hidden className={cx(fx.visual, 'relative h-44 overflow-hidden border-b border-line')}>
                    <PlatformVisual icon={item.icon} />
                  </div>
                ) : null}
                <div className="flex flex-1 flex-col p-6">
                  <div className="flex items-center gap-2.5">
                    <span className="inline-flex size-8 items-center justify-center rounded-md bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-600/15 ink:bg-brand-400/10 ink:text-brand-300">
                      <CmsIcon name={item.icon} size={16} />
                    </span>
                    <h3 className="text-h4 text-fg-strong">{item.title}</h3>
                    <FeatureBadge status={item.status} locale="en" />
                  </div>
                  <p className="mt-3 text-body text-fg-muted">
                    <InlineMarkdown text={item.body} />
                  </p>
                  {href ? (
                    <span className="mt-auto inline-flex items-center gap-1.5 pt-5 text-small font-medium text-link">
                      {item.status === 'coming' ? 'See the roadmap' : 'Learn more'}
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

export function Solutions({ block, hubLink }: { block: FeaturesGridBlock; hubLink?: string }) {
  return (
    <section aria-labelledby="home-solutions" className="theme-muted relative isolate border-y border-line/70 bg-canvas py-section">
      <div className="mx-auto box-content max-w-wide px-gutter">
        <SectionHead id="home-solutions" eyebrow="Solutions" title={block.heading} intro={block.intro} link={hubLink} linkLabel="All solutions" />
        <ul className={cx(RAIL_LIST, 'mt-12 md:grid-cols-2 md:gap-4 lg:grid-cols-4')}>
          {block.items.map((item, i) => {
            const href = cardHref(item.href);
            const accent = hexToChannels(SOLUTION_TONES[i % SOLUTION_TONES.length]);
            const inner = (
              <>
                <span aria-hidden className={fx.solutionGlow} />
                <span className="flex items-center justify-between">
                  <span className="inline-flex size-11 items-center justify-center rounded-xl bg-accent text-white shadow-[0_8px_20px_-8px_rgb(var(--accent)/0.8)]">
                    <CmsIcon name={item.icon} size={22} />
                  </span>
                  <FeatureBadge status={item.status} locale="en" />
                </span>
                <h3 className="mt-6 text-h4 text-fg-strong">{item.title}</h3>
                <p className="mt-2 text-small leading-relaxed text-fg-muted">
                  <InlineMarkdown text={item.body} />
                </p>
                {href ? (
                  <span className="mt-auto inline-flex items-center gap-1.5 pt-6 text-small font-medium text-fg-strong">
                    Explore
                    <Arrow className="text-accent transition-transform duration-fast ease-out group-hover:translate-x-1" />
                  </span>
                ) : null}
              </>
            );
            const cls = cx(
              'group relative isolate flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-surface p-6 shadow-e1 ink:shadow-none',
              href && 'transition-[transform,box-shadow,border-color] duration-base ease-out hover:-translate-y-1 hover:border-accent/40 hover:shadow-e3',
            );
            return (
              <li key={`${item.title}-${i}`} className={RAIL_ITEM} style={{ '--accent': accent ?? undefined }} data-reveal>
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
      </div>
    </section>
  );
}

// ─── Industries ticker ───

function IndustryChip({ card, hidden }: { card: EntryCard; hidden?: boolean }) {
  return (
    <li className="shrink-0 px-1.5">
      <Link
        href={card.path}
        prefetch={false}
        tabIndex={hidden ? -1 : undefined}
        style={{ '--accent': hexToChannels(card.color) ?? undefined }}
        className="group flex items-center gap-3 rounded-full border border-line bg-surface py-2 pl-2 pr-5 shadow-e1 transition-[border-color,box-shadow,transform] duration-base hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-e2 ink:shadow-none"
      >
        <span aria-hidden className="inline-flex size-9 items-center justify-center rounded-full bg-accent text-white">
          <CmsIcon name={card.icon ?? 'store'} size={17} />
        </span>
        <span className="whitespace-nowrap text-small font-semibold text-fg-strong">{card.title}</span>
      </Link>
    </li>
  );
}

export function Industries({ heading, intro, cards, hubLink }: { heading: string; intro?: string; cards: EntryCard[]; hubLink?: string }) {
  if (!cards.length) return null;
  const rows: EntryCard[][] = [[], [], []];
  cards.forEach((card, i) => rows[i % 3]?.push(card));
  return (
    <section aria-labelledby="home-industries" className="overflow-hidden py-section">
      <div className="mx-auto box-content max-w-wide px-gutter">
        <SectionHead id="home-industries" eyebrow={`${cards.length} industries`} title={heading} intro={intro} link={hubLink} linkLabel="All industries" />
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

export function Services({ block, quote, hubLink }: { block: FeaturesGridBlock; quote?: CtaBlock; entry: PublicEntry; hubLink?: string }) {
  return (
    <section aria-labelledby="home-services" className="theme-ink relative isolate overflow-hidden bg-canvas py-section text-fg">
      <div aria-hidden className={fx.inkGlow} />
      <div className="mx-auto box-content grid max-w-wide items-center gap-14 px-gutter lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <div>
          <SectionHead id="home-services" eyebrow="Services · Worldwide" title={block.heading} intro={block.intro} link={hubLink} linkLabel="All services" />
          <ul className="mt-10 grid gap-3 sm:grid-cols-2" data-reveal="stagger">
            {block.items.map((item, i) => {
              const href = cardHref(item.href);
              const inner = (
                <>
                  <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg bg-white/[0.06] text-brand-300 ring-1 ring-inset ring-white/10 transition-colors group-hover:bg-brand-500 group-hover:text-white">
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
              const cls = 'group flex h-full gap-4 rounded-xl border border-white/10 bg-white/[0.03] p-4 transition-colors duration-base hover:border-brand-400/40 hover:bg-white/[0.06]';
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
            <div className="mt-10 flex flex-col gap-5 rounded-2xl border border-brand-400/25 bg-brand-400/[0.07] p-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-h4 text-fg-strong">{quote.heading}</p>
                {quote.body ? (
                  <p className="mt-1 text-small text-fg-muted">
                    <InlineMarkdown text={quote.body} />
                  </p>
                ) : null}
              </div>
              <div className="flex shrink-0 flex-wrap gap-2.5">
                <CtaButton cta={quote.primaryCta} fallbackVariant="primary" onInk area="services" />
                <CtaButton cta={quote.secondaryCta} fallbackVariant="secondary" area="services" />
              </div>
            </div>
          ) : null}
        </div>
        <div className="relative mx-auto w-full max-w-[34rem]" aria-hidden>
          <Globe />
        </div>
      </div>
    </section>
  );
}

// ─── AI assistant (coming soon) ───

export function AiSoon({ block, roadmap }: { block: FeaturesGridBlock; roadmap?: string }) {
  return (
    <section aria-labelledby="home-ai" className="relative isolate overflow-hidden py-section">
      <div aria-hidden className={fx.aiWash} />
      <div className="mx-auto box-content grid max-w-wide items-center gap-12 px-gutter lg:grid-cols-2 lg:gap-20">
        <div data-reveal>
          <p className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800 ink:bg-amber-400/10 ink:text-amber-300">
            <CmsIcon name="sparkles" size={14} />
            Coming soon · <span lang="ur-Latn">Jald aa raha hai</span>
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
                <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg border border-line bg-surface text-fg-strong shadow-e1 ink:shadow-none">
                  <CmsIcon name={item.icon} size={18} />
                </span>
                <span>
                  <span className="flex items-center gap-2 text-body font-semibold text-fg-strong">
                    {item.title}
                    <FeatureBadge status={item.status} locale="en" />
                  </span>
                  <span className="mt-0.5 block text-small text-fg-muted">
                    <InlineMarkdown text={item.body} />
                  </span>
                </span>
              </li>
            ))}
          </ul>
          {roadmap ? (
            <Link href={roadmap} prefetch={false} className="group mt-8 inline-flex items-center gap-1.5 text-small font-medium text-link">
              Follow it on the roadmap
              <Arrow className="transition-transform duration-fast ease-out group-hover:translate-x-0.5" />
            </Link>
          ) : null}
        </div>
        <div aria-hidden className={cx(fx.chat, 'relative mx-auto w-full max-w-[30rem] rounded-2xl border border-line bg-surface p-5 shadow-e3 ink:shadow-none')} data-animate="once">
          <div className="flex items-center gap-3 border-b border-line pb-4">
            <span className="inline-flex size-9 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-teal-600 text-white">
              <CmsIcon name="sparkles" size={17} />
            </span>
            <span>
              <span className="block text-small font-semibold text-fg-strong">Nafaa AI</span>
              <span className="block text-xs text-fg-subtle">Preview · not live yet</span>
            </span>
          </div>
          <div className="space-y-3 py-5">
            {block.items
              .filter((it) => /[“"]/.test(it.body))
              .slice(0, 1)
              .map((it) => (
                <p key={it.title} lang="ur-Latn" className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-md bg-brand-700 px-4 py-2.5 text-small text-white">
                  {it.body.replace(/[“”"]/g, '')}
                </p>
              ))}
            <div className="w-[78%] rounded-2xl rounded-bl-md border border-line bg-surface-2 p-4">
              <span className={cx(fx.shimmer, 'block h-2 w-11/12 rounded-full')} />
              <span className={cx(fx.shimmer, 'mt-2.5 block h-2 w-3/4 rounded-full')} />
              <span className={cx(fx.shimmer, 'mt-2.5 block h-2 w-5/6 rounded-full')} />
              <div className="mt-4 flex h-14 items-end gap-1.5">
                {[40, 65, 50, 85, 60].map((h, i) => (
                  <span key={i} className={cx('block h-[var(--h)] flex-1 rounded-t', i === 3 ? 'bg-brand-500' : 'bg-brand-500/30')} style={{ '--h': `${h}%` }} />
                ))}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-line bg-surface-2 px-3 py-2.5">
            <span className="flex-1 text-small text-fg-subtle">Apne karobar ke baare me poochhein…</span>
            <span className="inline-flex size-8 items-center justify-center rounded-lg bg-fg/10 text-fg-subtle">
              <CmsIcon name="send" size={15} />
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
