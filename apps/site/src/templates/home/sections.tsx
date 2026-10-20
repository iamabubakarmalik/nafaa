/**
 * Home sections: hero, short answer, "How it works" band and the closing
 * call to action. The middle of the page (platform, tour, solutions,
 * industries, services, AI) lives in showcase.tsx and Tour.tsx.
 *
 * Words come from the blocks, plans and settings. The only fixed strings are
 * the labels of decorative, aria-hidden illustrations (floating status cards
 * in the hero), which state no numbers, prices or customers.
 *
 * H-structure: the hero holds the only H1; every section opens with an H2.
 */
import Link from 'next/link';
import { CtaButton } from '@/components/blocks/parts/CtaButton';
import { InlineMarkdown } from '@/components/blocks/rich-text/Markdown';
import { formatPkr } from '@/components/blocks/lib/format';
import { Diagram } from '@/components/diagrams';
import { FrameFor } from '@/components/frames';
import { cx } from '@/components/ui/cx';
import type {
  AnswerBoxBlock,
  CtaBlock,
  DiagramBlock,
  HeroBlock,
  PublicEntry,
  PublicMedia,
  PublicPlan,
  ScreenshotBlock,
  SiteSettings,
} from '@/lib/cms/contract/cms-contract';
import { LOGO_BOWL, LOGO_DOT } from '@/lib/brand/logo';
import { CmsIcon } from '@/lib/icons';
import { CmsImage, mediaById } from '@/lib/media';
import { Arrow } from '../core/ui';
import { HeroVisual } from './HeroVisual';
import fx from './fx.module.css';

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

/**
 * A light capture with an optional dark one: the page shows the capture that
 * matches the resolved theme (`ink:` is the dark theme and dark bands).
 * Hidden images with loading="lazy" are not fetched, so only one downloads.
 */
export function ThemedShot({
  light,
  dark,
  sizes,
  priority,
  className,
}: {
  light: PublicMedia;
  dark?: PublicMedia | null;
  sizes: string;
  priority?: boolean;
  className?: string;
}) {
  if (!dark) return <CmsImage media={light} sizes={sizes} priority={priority} className={cx('block h-auto w-full', className)} />;
  // Wrappers carry the switch: frame CSS sets display on the <img> itself.
  return (
    <>
      <span className="block ink:hidden">
        <CmsImage media={light} sizes={sizes} priority={priority} className={cx('block h-auto w-full', className)} />
      </span>
      <span className="hidden ink:block">
        <CmsImage media={dark} sizes={sizes} className={cx('block h-auto w-full', className)} />
      </span>
    </>
  );
}

// ─── Hero ───

/** Splits the heading so its last words carry the brand emphasis. */
function emphasise(heading: string): [string, string] {
  const words = heading.trim().split(/\s+/);
  if (words.length < 5) return [heading, ''];
  return [words.slice(0, -3).join(' '), words.slice(-3).join(' ')];
}

/** Keyframes for an n-word rotator: each word holds for one slot of the cycle. */
function rotatorCss(n: number): string {
  const slot = 100 / n;
  const fade = Math.min(4, slot / 4);
  const p = (v: number) => `${Math.max(0, Math.min(100, v)).toFixed(2)}%`;
  return `@keyframes home-rotator-${n}{0%{opacity:0;transform:translateY(60%)}${p(fade)}{opacity:1;transform:none}${p(slot - fade)}{opacity:1;transform:none}${p(slot)}{opacity:0;transform:translateY(-60%)}100%{opacity:0;transform:translateY(-60%)}}`;
}

function Rotator({ words }: { words: string[] }) {
  const n = words.length;
  const step = 2.6;
  return (
    <p className="mt-7 flex justify-center">
      <style>{rotatorCss(n)}</style>
      <span className={cx('inline-flex items-center gap-2.5 rounded-full border border-line bg-surface/80 py-1.5 pl-2 pr-1.5 text-small shadow-e1 backdrop-blur ink:shadow-none')}>
        <span className="inline-flex items-center gap-1.5 pl-1.5 font-medium text-fg-subtle">
          <span aria-hidden className={cx(fx.liveDot, 'size-1.5 rounded-full bg-brand-500')} />
          Built for
        </span>
        <span className="sr-only">{words.join(', ')}</span>
        <span aria-hidden className={cx(fx.rotatorWords, 'grid rounded-full bg-surface-2 px-3 py-0.5 font-semibold text-fg-strong ring-1 ring-inset ring-line')} data-animate="once">
          {words.map((word, i) => (
            <span
              key={word}
              className={fx.rotatorWord}
              style={{ '--rot-name': `home-rotator-${n}`, '--rot-dur': `${n * step}s`, '--delay': `${i * step}s` }}
            >
              {word}
            </span>
          ))}
        </span>
      </span>
    </p>
  );
}

const FLOATS = [
  { icon: 'shopping-bag', title: 'New online order', note: 'From your website, added to the counter', tone: 'brand', pos: fx.floatA },
  { icon: 'wallet', title: 'Payment received', note: 'JazzCash, card or cash on one bill', tone: 'brand', pos: fx.floatB },
  { icon: 'message-circle', title: 'Khata reminder sent', note: 'On WhatsApp, in one tap', tone: 'brand', pos: fx.floatC },
  { icon: 'wifi-off', title: 'Internet is down', note: 'Bills are saved and sync later', tone: 'amber', pos: fx.floatD },
] as const;

export function HomeHero({
  block,
  entry,
  site,
  plans,
  phone,
  rotator,
}: {
  block: HeroBlock;
  entry: PublicEntry;
  site: SiteSettings;
  plans: PublicPlan[];
  phone?: ScreenshotBlock;
  rotator?: string[];
}) {
  const heading = block.heading?.trim() || entry.title;
  const [head, tail] = emphasise(heading);
  const [lead, ...badges] = (block.badges ?? []).filter(Boolean);
  const note = planNote(plans);
  const media = block.media;
  const shot = media && media.kind !== 'diagram' ? mediaById(entry.media, media.mediaId) : null;
  const shotDark = media?.kind === 'screenshot' ? mediaById(entry.media, media.darkMediaId) : null;
  const phoneShot = phone ? mediaById(entry.media, phone.mediaId) : null;
  const phoneDark = phone ? mediaById(entry.media, phone.darkMediaId) : null;
  const words = (rotator ?? []).filter(Boolean).slice(0, 8);

  return (
    <section aria-labelledby="home-hero" className="relative isolate overflow-hidden">
      <div aria-hidden className={fx.aurora}>
        <span />
        <span />
        <span />
      </div>
      <div aria-hidden className={cx('bg-grid pointer-events-none absolute inset-x-0 top-0 -z-10 h-[52rem]', fx.grid)} />

      <div className="mx-auto box-content max-w-wide px-gutter pt-12 text-center md:pt-20">
        {lead ? (
          <p className="flex justify-center">
            <span className="inline-flex max-w-full items-center gap-2 rounded-full border border-brand-600/20 bg-brand-50/80 py-1 pl-1 pr-3.5 text-small text-brand-900 backdrop-blur ink:border-brand-400/25 ink:bg-brand-400/10 ink:text-brand-200">
              <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-700 text-white">
                <CmsIcon name="shield-check" size={14} />
              </span>
              <span className="truncate font-medium">
                <InlineMarkdown text={lead} />
              </span>
            </span>
          </p>
        ) : null}
        <h1 id="home-hero" className={cx(fx.display, 'mx-auto mt-7 max-w-[16ch] text-fg-strong md:max-w-[19ch]')}>
          {head}
          {tail ? (
            <>
              {' '}
              <span className={fx.emphasis}>{tail}</span>
            </>
          ) : null}
        </h1>
        {words.length > 1 ? <Rotator words={words} /> : block.eyebrow ? <p className="mt-6 text-eyebrow uppercase text-link">{block.eyebrow}</p> : null}
        <p className="mx-auto mt-6 max-w-[46rem] text-body-lg text-fg-muted">
          <InlineMarkdown text={block.sub} />
        </p>
        <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
          <CtaButton cta={block.primaryCta} size="lg" fallbackVariant="primary" area="hero" className="shadow-[0_8px_24px_-8px_rgb(var(--brand-700)/0.6)]" />
          <CtaButton cta={block.secondaryCta} size="lg" fallbackVariant="secondary" area="hero" />
        </div>
        {note ? <p className="mt-4 text-small text-fg-subtle">{note}</p> : null}
        {badges.length ? (
          <ul className="mx-auto mt-7 flex max-w-3xl flex-wrap items-center justify-center gap-x-6 gap-y-2.5 text-small text-fg-muted">
            {badges.map((badge, i) => (
              <li key={i} className="inline-flex items-center gap-2">
                <CmsIcon name="circle-check" size={16} className="text-link" />
                <InlineMarkdown text={badge} />
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <div className="relative mx-auto mt-14 box-content max-w-[76rem] px-gutter pb-20 md:mt-20 md:pb-28">
        {shot ? (
          <div className={fx.stage} data-animate="once">
            <div aria-hidden className={fx.stageGlow} />
            {phoneShot ? (
              <div className="mx-auto w-[64%] max-w-[16rem] md:hidden">
                <FrameFor frame="phone">
                  <ThemedShot light={phoneShot} dark={phoneDark} sizes="260px" />
                </FrameFor>
              </div>
            ) : null}
            <div className={cx(fx.tilt, phoneShot && 'hidden md:block')}>
              <FrameFor frame={media?.kind === 'screenshot' ? media.frame : 'none'} url={media?.kind === 'screenshot' ? media.url : undefined} className={fx.mainFrame}>
                <ThemedShot light={shot} dark={shotDark} sizes="(min-width: 1280px) 1200px, 100vw" />
              </FrameFor>
            </div>
            {phoneShot ? (
              <div className={cx(fx.phone, 'hidden md:block')}>
                <FrameFor frame="phone">
                  <ThemedShot light={phoneShot} dark={phoneDark} sizes="220px" />
                </FrameFor>
              </div>
            ) : null}
            <ul aria-hidden className="hidden md:contents">
              {FLOATS.map((f, i) => (
                <li key={f.title} className={cx(fx.float, f.pos)} style={{ '--delay': `${i * -1.7}s` }}>
                  <span className={cx('inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-white shadow-e1', f.tone === 'amber' ? 'bg-amber-500' : 'bg-brand-600')}>
                    <CmsIcon name={f.icon} size={18} />
                  </span>
                  <span className="min-w-0 text-left">
                    <span className="block text-small font-semibold text-fg-strong">{f.title}</span>
                    <span className="block text-xs text-fg-muted">{f.note}</span>
                  </span>
                  {i === 0 ? <span className={cx(fx.ping, 'absolute -right-1 -top-1 size-3 rounded-full bg-brand-500')} /> : null}
                </li>
              ))}
            </ul>
          </div>
        ) : media?.kind === 'diagram' ? (
          <Diagram spec={media.diagram} caption={heading} showCaption={false} bare />
        ) : (
          <div className="mx-auto max-w-[44rem]">
            <HeroVisual appUrl={site.appUrl} />
          </div>
        )}
      </div>
      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-40 bg-gradient-to-b from-transparent to-canvas" />
    </section>
  );
}

// ─── Short answer (AEO: answer first) ───

export function HomeAnswer({ block, entry }: { block: AnswerBoxBlock; entry: PublicEntry }) {
  const answer = block.answer?.trim() || entry.summary;
  return (
    <section aria-labelledby="home-answer" className="py-16 md:py-24">
      <div className="mx-auto box-content max-w-wide px-gutter">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:gap-16" data-reveal>
          <div>
            <p className="text-eyebrow uppercase text-link">Short answer</p>
            <h2 id="home-answer" className="mt-3 text-h2 text-fg-strong">
              {block.heading?.trim() || `What is ${entry.title}?`}
            </h2>
            {answer ? (
              <p className="mt-5 text-body-lg text-fg">
                <InlineMarkdown text={answer} />
              </p>
            ) : null}
            {block.romanUrdu ? (
              <div className="mt-7 border-l-2 border-brand-500 pl-5">
                <p className="text-eyebrow uppercase text-fg-subtle">Roman Urdu mein</p>
                <p lang="ur-Latn" className="mt-1.5 text-body text-fg-muted">
                  {block.romanUrdu}
                </p>
              </div>
            ) : null}
          </div>
          <dl className="grid gap-px self-start overflow-hidden rounded-2xl border border-line bg-line shadow-e1 ink:shadow-none sm:grid-cols-2">
            {block.facts.map((fact) => (
              <div key={fact.label} className="bg-surface p-5 md:p-6">
                <dt className="text-eyebrow uppercase text-fg-subtle">{fact.label}</dt>
                <dd className="mt-2 text-body font-medium text-fg-strong">
                  <InlineMarkdown text={fact.value} />
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}

// ─── How it works (consecutive diagram blocks, one ink band) ───

const DIAGRAM_LINKS: Record<string, { href: string; label: string }[]> = {
  'offline-sync': [
    { href: '/product/offline-pos', label: 'How offline billing works' },
    { href: '/product/pos', label: 'See the POS' },
  ],
  'store-sync': [{ href: '/product/online-store', label: 'See online selling' }],
  'fbr-invoice': [{ href: '/product/fbr', label: 'See FBR & PRA invoicing' }],
  'khata-cycle': [{ href: '/product/khata', label: 'See the digital khata' }],
  'multi-branch': [{ href: '/product/multi-shop', label: 'Run more than one branch' }],
};

export function HomeHowItWorks({ blocks, live }: { blocks: DiagramBlock[]; live: Set<string> }) {
  if (!blocks.length) return null;
  return (
    <section aria-labelledby="home-how" className="theme-ink relative isolate overflow-hidden bg-canvas py-section text-fg">
      <div aria-hidden className={fx.inkGlow} />
      <div aria-hidden className="bg-grid pointer-events-none absolute inset-0 -z-10 opacity-50" />
      <div className="mx-auto box-content max-w-wide px-gutter">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-eyebrow uppercase text-link">How it works</p>
          <h2 id="home-how" className="mt-3 text-h2 text-fg-strong">
            Built for power cuts, tax rules and busy counters
          </h2>
        </div>
        <div className="mt-14 space-y-6 md:mt-16">
          {blocks.map((block, i) => {
            const link = (DIAGRAM_LINKS[block.diagram.kind] ?? []).find((l) => live.has(l.href));
            return (
              <div
                key={block.id}
                className={cx('grid items-center gap-8 rounded-2xl border border-white/10 bg-white/[0.03] p-6 md:p-10 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-14', i % 2 === 1 && 'lg:[&>*:first-child]:order-2')}
                data-reveal
              >
                <div>
                  <span className="inline-flex size-8 items-center justify-center rounded-full border border-brand-400/30 bg-brand-400/10 font-mono text-xs font-semibold text-brand-300">
                    0{i + 1}
                  </span>
                  {block.heading ? <h3 className="mt-5 text-h3 text-fg-strong">{block.heading}</h3> : null}
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

// ─── Closing call to action ───

export function Closing({ block }: { block: CtaBlock; entry: PublicEntry }) {
  return (
    <section aria-labelledby="home-closing" className="px-gutter pb-16 pt-8 md:pb-24">
      <div className="theme-ink relative isolate mx-auto max-w-wide overflow-hidden rounded-[28px] bg-canvas px-6 py-16 text-center text-fg md:px-12 md:py-24" data-reveal="scale">
        <div aria-hidden className={fx.closingAurora}>
          <span />
          <span />
        </div>
        <div aria-hidden className="bg-grid pointer-events-none absolute inset-0 -z-10 opacity-40" />
        <span aria-hidden className="mx-auto inline-flex size-16 items-center justify-center rounded-2xl border border-white/15 bg-white/[0.06] shadow-[0_10px_40px_-10px_rgb(34_197_94/0.6)]">
          <svg viewBox="112 112 288 288" className="size-10">
            <path d={LOGO_BOWL} className="nafaa-logo-bowl" />
            <path d={LOGO_DOT} className="nafaa-logo-dot" />
          </svg>
        </span>
        <h2 id="home-closing" className="mx-auto mt-8 max-w-3xl text-h1 text-fg-strong">
          {block.heading}
        </h2>
        {block.body ? (
          <p className="mx-auto mt-5 max-w-2xl text-body-lg text-fg-muted">
            <InlineMarkdown text={block.body} />
          </p>
        ) : null}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <CtaButton cta={block.primaryCta} size="lg" fallbackVariant="primary" onInk area="closing" />
          <CtaButton cta={block.secondaryCta} size="lg" fallbackVariant="secondary" area="closing" />
        </div>
      </div>
    </section>
  );
}
