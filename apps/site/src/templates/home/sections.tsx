/**
 * Home sections (S3). The home page is the showpiece, so its key blocks get
 * a home-only presentation; every word still comes from the block props,
 * plans or settings, and any block not listed here renders through S2's
 * block renderer.
 *
 * H-structure: the hero holds the only H1; every section below opens with an
 * H2; cards inside use H3.
 */
import Link from 'next/link';
import { CtaButton } from '@/components/blocks/parts/CtaButton';
import { FeatureBadge } from '@/components/blocks/parts/FeatureBadge';
import { InlineMarkdown } from '@/components/blocks/rich-text/Markdown';
import { formatPkr, hexToChannels } from '@/components/blocks/lib/format';
import { Diagram } from '@/components/diagrams';
import { Screenshot } from '@/components/frames';
import { cx } from '@/components/ui/cx';
import type {
  AnswerBoxBlock,
  DiagramBlock,
  EntryCard,
  FeaturesGridBlock,
  HeroBlock,
  PublicEntry,
  PublicPlan,
  SiteSettings,
} from '@/lib/cms/contract/cms-contract';
import { CmsIcon } from '@/lib/icons';
import { CmsImage, mediaById } from '@/lib/media';
import { Arrow, SectionTitle } from '../core/ui';
import { HeroVisual } from './HeroVisual';
import styles from './home.module.css';

/** "7-day free trial · paid plans from Rs 1,500 a month", from the Plan table only. */
export function planNote(plans: readonly PublicPlan[]): string | null {
  const trial = plans.find((p) => p.priceMonthly === 0 && p.trialDays > 0);
  const paid = plans.map((p) => p.priceMonthly).filter((n) => n > 0);
  const parts = [
    trial ? `${trial.trialDays}-day free trial` : null,
    paid.length ? `paid plans from ${formatPkr(Math.min(...paid))} a month` : null,
  ].filter(Boolean) as string[];
  if (!parts.length) return null;
  const text = parts.join(' · ');
  return text.charAt(0).toUpperCase() + text.slice(1);
}

// ─── Hero ───

export function HomeHero({ block, entry, site, plans }: { block: HeroBlock; entry: PublicEntry; site: SiteSettings; plans: PublicPlan[] }) {
  const heading = block.heading?.trim() || entry.title;
  const [lead, ...badges] = (block.badges ?? []).filter(Boolean);
  const note = planNote(plans);
  const media = block.media;
  const shot = media && media.kind !== 'diagram' ? mediaById(entry.media, media.mediaId) : null;

  return (
    <section aria-labelledby="home-hero" className="relative isolate overflow-hidden pb-16 pt-10 md:pb-24 md:pt-16">
      <div aria-hidden className={styles.wash} />
      <div aria-hidden className="bg-grid pointer-events-none absolute inset-x-0 top-0 -z-10 h-[40rem]" />
      <div className="mx-auto box-content max-w-wide px-gutter">
        <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-10">
          <div className="max-w-[38rem]">
            {lead ? (
              <p className="mb-6 inline-flex max-w-full items-center gap-2 rounded-full border border-line bg-surface/80 py-1 pl-1.5 pr-3 text-small text-fg-muted shadow-e1 backdrop-blur ink:shadow-none">
                <span className="inline-flex size-6 items-center justify-center rounded-full bg-brand-700 text-white">
                  <CmsIcon name="shield-check" size={14} />
                </span>
                <span className="truncate font-medium text-fg-strong">
                  <InlineMarkdown text={lead} />
                </span>
              </p>
            ) : block.eyebrow ? (
              <p className="mb-5 text-eyebrow uppercase text-link">{block.eyebrow}</p>
            ) : null}
            <h1 id="home-hero" className="text-display text-fg-strong">
              {heading}
            </h1>
            <p className="mt-6 max-w-[34rem] text-body-lg text-fg-muted">
              <InlineMarkdown text={block.sub} />
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <CtaButton cta={block.primaryCta} size="lg" fallbackVariant="primary" area="hero" />
              <CtaButton cta={block.secondaryCta} size="lg" fallbackVariant="secondary" area="hero" />
            </div>
            {note ? <p className="mt-4 text-small text-fg-subtle">{note}</p> : null}
            {badges.length ? (
              <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-3 border-t border-line pt-6 text-small text-fg-muted">
                {badges.map((badge, i) => (
                  <li key={i} className="inline-flex items-center gap-2">
                    <CmsIcon name="circle-check" size={16} className="text-link" />
                    <InlineMarkdown text={badge} />
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
          <div className="relative mx-auto w-full max-w-[40rem] lg:max-w-none">
            {shot && media?.kind === 'screenshot' ? (
              <Screenshot frame={media.frame} url={media.url} animate={false}>
                <CmsImage media={shot} sizes="(min-width: 1280px) 640px, (min-width: 1024px) 50vw, 100vw" priority className="block h-auto w-full" />
              </Screenshot>
            ) : shot ? (
              <CmsImage media={shot} sizes="(min-width: 1280px) 640px, (min-width: 1024px) 50vw, 100vw" priority className="h-auto w-full rounded-xl" />
            ) : media?.kind === 'diagram' ? (
              <Diagram spec={media.diagram} caption={heading} showCaption={false} bare />
            ) : (
              <HeroVisual appUrl={site.appUrl} />
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Short answer (AEO: answer first) ───

export function HomeAnswer({ block, entry }: { block: AnswerBoxBlock; entry: PublicEntry }) {
  const answer = block.answer?.trim() || entry.summary;
  return (
    <section aria-labelledby="home-answer" className="pb-12 md:pb-16">
      <div className="mx-auto box-content max-w-container px-gutter">
        <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-e1 ink:shadow-none">
          <div className="grid lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
            <div className="p-7 md:p-10">
              <p className="text-eyebrow uppercase text-link">Short answer</p>
              <h2 id="home-answer" className="mt-3 text-h3 text-fg-strong">
                {block.heading?.trim() || `What is ${entry.title}?`}
              </h2>
              {answer ? (
                <p className="mt-4 text-body-lg text-fg">
                  <InlineMarkdown text={answer} />
                </p>
              ) : null}
              {block.romanUrdu ? (
                <div className="mt-6 rounded-lg border border-dashed border-line-strong bg-surface-2 p-4">
                  <p className="text-eyebrow uppercase text-fg-subtle">Roman Urdu mein</p>
                  <p lang="ur-Latn" className="mt-1.5 text-body text-fg-muted">
                    {block.romanUrdu}
                  </p>
                </div>
              ) : null}
            </div>
            <dl className="grid content-start border-t border-line bg-surface-2 sm:grid-cols-2 lg:border-l lg:border-t-0">
              {block.facts.map((fact) => (
                <div key={fact.label} className="border-b border-line p-5 sm:odd:border-r md:p-6">
                  <dt className="text-eyebrow uppercase text-fg-subtle">{fact.label}</dt>
                  <dd className="mt-1.5 text-body font-medium text-fg-strong">
                    <InlineMarkdown text={fact.value} />
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Bento features ───

/**
 * Column spans on a 6-column bento grid. Rows follow 4+2, 2+4, 3+3 and
 * repeat; the last item of a part-filled row stretches to close it. Items of
 * span 4 or more get the large treatment.
 */
const BENTO = [4, 2, 2, 4, 3, 3];
const SPAN_CLASS: Record<number, string> = { 2: 'lg:col-span-2', 3: 'lg:col-span-3', 4: 'lg:col-span-4', 5: 'lg:col-span-5', 6: 'lg:col-span-6' };

function bentoSpans(count: number): number[] {
  const out: number[] = [];
  let row = 0;
  for (let i = 0; i < count; i++) {
    let span = BENTO[i % BENTO.length] as number;
    if (row + span > 6) span = 6 - row;
    out.push(span);
    row = (row + span) % 6;
  }
  if (row !== 0 && out.length) out[out.length - 1] = (out[out.length - 1] as number) + (6 - row);
  return out;
}

export function HomeFeatures({ block, hubLink }: { block: FeaturesGridBlock; hubLink?: { href: string; label: string } }) {
  const layout = bentoSpans(block.items.length);
  return (
    <section aria-labelledby="home-features" className="py-section">
      <div className="mx-auto box-content max-w-container px-gutter">
        <SectionTitle id="home-features" eyebrow="Product" title={block.heading} intro={block.intro ? <InlineMarkdown text={block.intro} /> : undefined} link={hubLink} />
        <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-6" data-reveal="stagger">
          {block.items.map((item, i) => {
            const wide = (layout[i] ?? 2) >= 4;
            const body = (
              <>
                <span aria-hidden className={styles.bentoGlow} />
                <span className="flex items-start justify-between gap-3">
                  <span className={cx('inline-flex items-center justify-center rounded-md bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-600/15 ink:bg-brand-400/10 ink:text-brand-300', wide ? 'size-12' : 'size-10')}>
                    <CmsIcon name={item.icon} size={wide ? 24 : 20} />
                  </span>
                  <FeatureBadge status={item.status} locale="en" />
                </span>
                <h3 className={cx('mt-6 text-fg-strong', wide ? 'text-h3' : 'text-h4')}>{item.title}</h3>
                <p className="mt-2 text-body text-fg-muted">
                  <InlineMarkdown text={item.body} />
                </p>
                {item.href ? (
                  <span className="mt-auto inline-flex items-center gap-1.5 pt-6 text-small font-medium text-link">
                    Learn more <Arrow className="transition-transform duration-fast ease-out group-hover:translate-x-0.5" />
                  </span>
                ) : null}
              </>
            );
            const card = cx(
              'group relative isolate flex h-full flex-col overflow-hidden rounded-xl border border-line bg-surface shadow-e1 ink:shadow-none',
              wide ? 'p-7 md:p-8' : 'p-6',
              item.href && 'transition-[transform,box-shadow,border-color] duration-base ease-out hover:-translate-y-0.5 hover:border-line-strong hover:shadow-e2',
            );
            return (
              <li key={`${item.title}-${i}`} className={SPAN_CLASS[layout[i] ?? 2]}>
                {item.href && !/^(signup|demo|whatsapp|entry:)/.test(item.href) ? (
                  <Link href={item.href} prefetch={false} className={card}>
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

// ─── Industries ───

export function HomeIndustries({ heading, intro, cards, hubLink }: { heading: string; intro?: string; cards: EntryCard[]; hubLink?: { href: string; label: string } }) {
  if (!cards.length) return null;
  return (
    <section aria-labelledby="home-industries" className="theme-muted border-y border-line/70 bg-canvas py-section">
      <div className="mx-auto box-content max-w-container px-gutter">
        <SectionTitle id="home-industries" eyebrow="Industries" title={heading} intro={intro ? <InlineMarkdown text={intro} /> : undefined} link={hubLink} />
        <ul className="mt-12 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 md:gap-4" data-reveal="stagger">
          {cards.map((card) => (
            <li key={card.id}>
              <Link
                href={card.path}
                prefetch={false}
                style={{ '--accent': hexToChannels(card.color) ?? undefined }}
                className="group relative isolate flex h-full flex-col overflow-hidden rounded-lg border border-line bg-surface p-4 shadow-e1 transition-[transform,box-shadow,border-color] duration-base ease-out hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-e2 ink:shadow-none md:p-5"
              >
                <span aria-hidden className="absolute inset-x-0 top-0 h-0.5 origin-left scale-x-0 bg-accent transition-transform duration-slow ease-out group-hover:scale-x-100" />
                <span aria-hidden className="inline-flex size-10 items-center justify-center rounded-md bg-accent text-white shadow-e1">
                  <CmsIcon name={card.icon ?? 'store'} size={20} />
                </span>
                <h3 className="mt-4 text-h4 text-fg-strong">{card.title}</h3>
                {card.summary ? <p className="mt-1.5 hidden text-small text-fg-muted md:line-clamp-2">{card.summary}</p> : null}
                <span className="mt-auto inline-flex items-center gap-1 pt-4 text-small font-medium text-link">
                  <span className="sr-only">{card.title}: </span>See how it works
                  <Arrow className="transition-transform duration-fast ease-out group-hover:translate-x-0.5" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

// ─── How it works (consecutive diagram blocks, one ink band) ───

const DIAGRAM_LINKS: Record<string, { href: string; label: string }> = {
  'offline-sync': { href: '/product/pos', label: 'How offline billing works' },
  'khata-cycle': { href: '/product/khata', label: 'See the digital khata' },
  'multi-branch': { href: '/product/multi-shop', label: 'Run more than one shop' },
};

export function HomeHowItWorks({ blocks, live }: { blocks: DiagramBlock[]; live: Set<string> }) {
  if (!blocks.length) return null;
  return (
    <section aria-labelledby="home-how" className="theme-ink relative isolate overflow-hidden bg-canvas py-section text-fg">
      <div aria-hidden className="bg-glow pointer-events-none absolute inset-0 -z-10" />
      <div aria-hidden className="bg-grid pointer-events-none absolute inset-0 -z-10 opacity-60" />
      <div className="mx-auto box-content max-w-container px-gutter">
        <SectionTitle id="home-how" title="How it works" />
        <div className="mt-14 space-y-16 md:space-y-20">
          {blocks.map((block, i) => {
            const candidate = DIAGRAM_LINKS[block.diagram.kind];
            const link = candidate && live.has(candidate.href) ? candidate : undefined;
            return (
              <div key={block.id} className={cx('grid items-center gap-8 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-14', i % 2 === 1 && 'lg:[&>*:first-child]:order-2')} data-reveal="fade-up">
                <div>
                  <p className="text-eyebrow uppercase text-link">0{i + 1}</p>
                  {block.heading ? <h3 className="mt-3 text-h3 text-fg-strong">{block.heading}</h3> : null}
                  <p className="mt-3 text-body-lg text-fg-muted">{block.caption}</p>
                  {link ? (
                    <Link href={link.href} prefetch={false} className="group mt-6 inline-flex items-center gap-1.5 text-small font-medium text-link">
                      {link.label}
                      <Arrow className="transition-transform duration-fast ease-out group-hover:translate-x-0.5" />
                    </Link>
                  ) : null}
                </div>
                <Diagram spec={block.diagram} caption={block.caption} showCaption={false} tone="ink" />
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ─── Explore (internal links: hubs, top products, top industries) ───

export interface ExploreColumn {
  title: string;
  links: { href: string; label: string; status?: EntryCard['status'] }[];
}

export function HomeExplore({ columns }: { columns: ExploreColumn[] }) {
  const filled = columns.filter((c) => c.links.length);
  if (!filled.length) return null;
  return (
    <section aria-labelledby="home-explore" className="border-t border-line py-16 md:py-20">
      <div className="mx-auto box-content max-w-container px-gutter">
        <h2 id="home-explore" className="text-h3 text-fg-strong">
          Explore Nafaa
        </h2>
        <div className="mt-8 grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {filled.map((col) => (
            <nav key={col.title} aria-label={col.title}>
              <h3 className="text-eyebrow uppercase text-fg-subtle">{col.title}</h3>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((link) => (
                  <li key={link.href} className="flex items-center gap-2">
                    <Link href={link.href} prefetch={false} className="text-body text-fg-muted transition-colors duration-fast hover:text-fg-strong">
                      {link.label}
                    </Link>
                    <FeatureBadge status={link.status} locale="en" />
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
      </div>
    </section>
  );
}
