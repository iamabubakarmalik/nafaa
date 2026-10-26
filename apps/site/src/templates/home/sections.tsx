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
import { dirFor } from '@/lib/cms/locale';
import { uiStrings } from '@/lib/i18n/ui';
import { Arrow } from '../core/ui';
import { HeroVisual } from './HeroVisual';
import { Backdrop } from './decor';
import fx from './fx.module.css';
import hub from './hub.module.css';

/** "7-day free trial · paid plans from Rs 1,500 a month", from the Plan table only. */
export function planNote(plans: readonly PublicPlan[], locale?: string): string | null {
  const t = uiStrings(locale).home;
  const trial = plans.find((p) => p.priceMonthly === 0 && p.trialDays > 0);
  const paid = plans.map((p) => p.priceMonthly).filter((n) => n > 0);
  const parts = [
    trial ? t.trialNote(trial.trialDays) : null,
    paid.length ? t.paidFrom(formatPkr(Math.min(...paid))) : null,
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
  visibleMedia,
  className,
}: {
  light: PublicMedia;
  dark?: PublicMedia | null;
  sizes: string;
  priority?: boolean;
  /** See CmsImage `visibleMedia`. */
  visibleMedia?: string;
  className?: string;
}) {
  if (!dark) return <CmsImage media={light} sizes={sizes} priority={priority} visibleMedia={visibleMedia} className={cx('block h-auto w-full', className)} />;
  // Wrappers carry the switch: frame CSS sets display on the <img> itself.
  return (
    <>
      <span className="block ink:hidden">
        <CmsImage media={light} sizes={sizes} priority={priority} visibleMedia={visibleMedia} className={cx('block h-auto w-full', className)} />
      </span>
      <span className="hidden ink:block">
        <CmsImage media={dark} sizes={sizes} visibleMedia={visibleMedia} className={cx('block h-auto w-full', className)} />
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

function Rotator({ words, label }: { words: string[]; label: string }) {
  const n = words.length;
  const step = 2.6;
  return (
    <p className="mt-7 flex justify-center">
      <style>{rotatorCss(n)}</style>
      <span className={cx('inline-flex items-center gap-2.5 rounded-full border border-line bg-surface/80 py-1.5 ps-2 pe-1.5 text-small shadow-e1 backdrop-blur ink:shadow-none')}>
        <span className="inline-flex items-center gap-1.5 ps-1.5 font-medium text-fg-subtle">
          <span aria-hidden className={cx(fx.liveDot, 'size-1.5 rounded-full bg-brand-500')} />
          {label}
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

/** Capability chip shown next to the lead pill (titles and icons come from the platform block). */
export interface HeroChip {
  title: string;
  icon: string;
}

function HeroChips({ lead, chips }: { lead?: string; chips: HeroChip[] }) {
  if (!lead && !chips.length) return null;
  const row = (hidden: boolean) => (
    <ul className={fx.chipRow} aria-hidden={hidden || undefined}>
      {chips.map((c, i) => (
        <li key={`${c.title}-${i}`} className={fx.chip} style={{ '--i': i, '--n': chips.length }}>
          <span className={fx.chipIcon}>
            <CmsIcon name={c.icon} size={13} />
          </span>
          {c.title}
        </li>
      ))}
    </ul>
  );
  return (
    <div className={fx.chipBar}>
      {lead ? (
        <p className="flex shrink-0 justify-center">
          <span className="inline-flex max-w-full items-center gap-2 rounded-full border border-brand-600/20 bg-surface py-1 ps-1 pe-3.5 text-small text-brand-900 shadow-e1 ink:border-brand-400/25 ink:bg-brand-400/10 ink:text-brand-200 ink:shadow-none">
            <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-700 text-white">
              <CmsIcon name="shield-check" size={14} />
            </span>
            <span className="truncate font-medium">
              <InlineMarkdown text={lead} />
            </span>
          </span>
        </p>
      ) : null}
      {chips.length ? (
        <div className={fx.chipTrackWrap} data-animate="">
          <div className={fx.chipTrack}>
            {row(false)}
            {row(true)}
          </div>
        </div>
      ) : null}
    </div>
  );
}

/** Corner brackets, a travelling beam on the frame edge and wires into the margins (decorative). */
function StageDecor() {
  return (
    <>
      <span aria-hidden className={cx(fx.corner, fx.cornerTL)} />
      <span aria-hidden className={cx(fx.corner, fx.cornerTR)} />
      <span aria-hidden className={cx(fx.corner, fx.cornerBL)} />
      <span aria-hidden className={cx(fx.corner, fx.cornerBR)} />
      <span aria-hidden className={cx(fx.wire, fx.wireL1)}>
        <span className={fx.wireSpark} />
      </span>
      <span aria-hidden className={cx(fx.wire, fx.wireL2)}>
        <span className={fx.wireSpark} />
      </span>
      <span aria-hidden className={cx(fx.wire, fx.wireR1)}>
        <span className={fx.wireSpark} />
      </span>
      <span aria-hidden className={cx(fx.wire, fx.wireR2)}>
        <span className={fx.wireSpark} />
      </span>
    </>
  );
}

/** A thin light that runs around the frame edge while the hero is in view. */
function Beam() {
  return (
    <svg aria-hidden className={fx.beam}>
      <rect pathLength={1} className={fx.beamTrack} />
      <rect pathLength={1} className={fx.beamLight} />
    </svg>
  );
}

/** Slow orbit rings behind the phone, each carrying one small node. */
function Orbits() {
  return (
    <span aria-hidden className={fx.orbits}>
      <span className={cx(fx.orbit, fx.orbitA)}>
        <span className={fx.orbitNode} />
      </span>
      <span className={cx(fx.orbit, fx.orbitB)}>
        <span className={cx(fx.orbitNode, fx.orbitNodeAmber)} />
      </span>
    </span>
  );
}

export function HomeHero({
  block,
  entry,
  site,
  plans,
  phone,
  rotator,
  chips = [],
  locale,
}: {
  block: HeroBlock;
  entry: PublicEntry;
  site: SiteSettings;
  plans: PublicPlan[];
  locale?: string;
  phone?: ScreenshotBlock;
  rotator?: string[];
  chips?: HeroChip[];
}) {
  const heading = block.heading?.trim() || entry.title;
  const [head, tail] = emphasise(heading);
  const [lead, ...badges] = (block.badges ?? []).filter(Boolean);
  const note = planNote(plans, locale);
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
      </div>
      <div aria-hidden className={cx('bg-grid pointer-events-none absolute inset-x-0 top-0 -z-10 h-[52rem]', fx.grid)} />

      <div className="mx-auto box-content max-w-wide px-gutter pt-12 text-center md:pt-24">
        <HeroChips lead={lead} chips={chips} />
        <h1 id="home-hero" className={cx(fx.display, 'mx-auto mt-7 max-w-[16ch] text-fg-strong md:max-w-[19ch]')}>
          {head}
          {tail ? (
            <>
              {' '}
              <span className={fx.emphasis}>{tail}</span>
            </>
          ) : null}
        </h1>
        {words.length > 1 ? <Rotator words={words} label={uiStrings(locale).home.builtFor} /> : block.eyebrow ? <p className="mt-6 text-eyebrow uppercase text-link">{block.eyebrow}</p> : null}
        <p className="mx-auto mt-6 max-w-[46rem] text-body-lg text-fg-muted">
          <InlineMarkdown text={block.sub} />
        </p>
        <div className="mx-auto mt-9 flex max-w-sm flex-col items-stretch justify-center gap-3 sm:max-w-none sm:flex-row sm:items-center">
          <CtaButton cta={block.primaryCta} size="lg" fallbackVariant="primary" area="hero" className="justify-center shadow-[0_8px_24px_-8px_rgb(var(--brand-700)/0.6)]" />
          <CtaButton cta={block.secondaryCta} size="lg" fallbackVariant="secondary" area="hero" className="justify-center" />
        </div>
        {note ? <p className="mt-4 text-small text-fg-subtle">{note}</p> : null}
        {badges.length ? (
          <ul className="mx-auto mt-6 flex max-w-3xl flex-wrap items-center justify-center gap-x-6 gap-y-2.5 text-small text-fg-muted">
            {badges.map((badge, i) => (
              <li key={i} className="inline-flex items-center gap-2">
                <CmsIcon name="circle-check" size={16} className="text-link" />
                <InlineMarkdown text={badge} />
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <div className="relative mx-auto mt-12 box-content max-w-wide px-gutter pb-20 md:mt-20 md:pb-28">
        {shot ? (
          <div className={cx(fx.stage, phoneShot && fx.stageDuo)} data-animate="">
            <div aria-hidden className={fx.stageGlow} />
            <StageDecor />
            <div className={cx(fx.tilt, fx.desk)}>
              <FrameFor frame={media?.kind === 'screenshot' ? media.frame : 'none'} url={media?.kind === 'screenshot' ? media.url : undefined} className={fx.mainFrame}>
                {/* With a phone capture, phones hide this one (fx.module.css), so they skip its download. */}
                <ThemedShot
                  light={shot}
                  dark={shotDark}
                  sizes="(min-width: 1280px) 1000px, (min-width: 768px) 78vw, 100vw"
                  priority
                  visibleMedia={phoneShot ? '(min-width: 48rem)' : undefined}
                />
              </FrameFor>
              <Beam />
            </div>
            {phoneShot ? (
              <div className={fx.phoneCol}>
                <Orbits />
                <div className={fx.phone}>
                  <FrameFor frame="phone">
                    <ThemedShot light={phoneShot} dark={phoneDark} sizes="(min-width: 768px) 240px, 300px" />
                  </FrameFor>
                </div>
              </div>
            ) : null}
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

/** Icon for a short-answer fact, picked from its label. */
function factIcon(label: string): string {
  const l = label.toLowerCase();
  if (/what/.test(l)) return 'layout-grid';
  if (/who/.test(l)) return 'users';
  if (/runs|device/.test(l)) return 'smartphone';
  if (/internet|offline/.test(l)) return 'wifi-off';
  if (/tax/.test(l)) return 'receipt-text';
  if (/price|cost|plan/.test(l)) return 'tag';
  // Urdu labels (the English patterns never match Urdu text).
  if (/کون|کس کے لیے/.test(l)) return 'users';
  if (/انٹرنیٹ|آف لائن/.test(l)) return 'wifi-off';
  if (/ٹیکس|FBR/i.test(l)) return 'receipt-text';
  if (/قیمت|پلان|خرچ/.test(l)) return 'tag';
  if (/فون|ڈیوائس|کمپیوٹر|چلتا/.test(l)) return 'smartphone';
  if (/کیا/.test(l)) return 'layout-grid';
  return 'circle-check';
}

function FactCard({ label, value, side, i, rtl }: { label: string; value: string; side: 'l' | 'r'; i: number; rtl?: boolean }) {
  return (
    <li className={cx(hub.fact, side === 'l' ? hub.factL : hub.factR)} style={{ '--i': i }}>
      <span aria-hidden className={hub.link}>
        <span className={hub.linkDot} />
      </span>
      <span aria-hidden className={hub.factIcon}>
        <CmsIcon name={factIcon(label)} size={18} />
      </span>
      <div className="min-w-0" dir={rtl ? 'rtl' : undefined}>
        <p className="text-eyebrow uppercase text-fg-subtle">{label}</p>
        <p className="mt-1.5 text-body font-medium leading-snug text-fg-strong">
          <InlineMarkdown text={value} />
        </p>
      </div>
    </li>
  );
}

export function HomeAnswer({ block, entry }: { block: AnswerBoxBlock; entry: PublicEntry }) {
  const t = uiStrings(entry.locale).home;
  // The hub drawing (cards wired to a core) keeps its left-to-right geometry; card text keeps the page direction.
  const rtl = dirFor(entry.locale) === 'rtl';
  const answer = block.answer?.trim() || entry.summary;
  const facts = block.facts;
  const half = Math.ceil(facts.length / 2);
  const left = facts.slice(0, half);
  const right = facts.slice(half);
  return (
    <section aria-labelledby="home-answer" className="relative isolate overflow-hidden py-section">
      <Backdrop pattern="dots" noon="right" />
      <div className="mx-auto box-content max-w-wide px-gutter">
        <div className="mx-auto max-w-[50rem] text-center" data-reveal>
          <p className="text-eyebrow uppercase text-link">{t.shortAnswer}</p>
          <h2 id="home-answer" className="mt-3 text-h2 text-fg-strong">
            {block.heading?.trim() || t.whatIs(entry.title)}
          </h2>
          {answer ? (
            <p className="mt-5 text-body-lg text-fg">
              <InlineMarkdown text={answer} />
            </p>
          ) : null}
        </div>

        <div className={hub.hub} data-animate="" dir={rtl ? 'ltr' : undefined}>
          <ul className={hub.col}>
            {left.map((f, i) => (
              <FactCard key={f.label} label={f.label} value={f.value} side="l" i={i} rtl={rtl} />
            ))}
          </ul>
          <div aria-hidden className={hub.core}>
            <span className={hub.coreGrid} />
            {[0, 1, 2].map((k) => (
              <span key={`pl${k}`} className={cx(hub.port, hub.portL, hub[`port${k}`])} />
            ))}
            {[0, 1, 2].map((k) => (
              <span key={`pr${k}`} className={cx(hub.port, hub.portR, hub[`port${k}`])} />
            ))}
            <span className={hub.orb}>
              <span className={hub.ring} />
              <span className={cx(hub.ring, hub.ring2)} />
              <svg viewBox="0 0 200 200" className={hub.orbit}>
                <circle cx="100" cy="100" r="96" />
              </svg>
              <span className={hub.mark}>
                <svg viewBox="112 112 288 288" className="size-[62%]">
                  <path d={LOGO_BOWL} fill="currentColor" />
                  <path d={LOGO_DOT} fill="#fbbf24" />
                </svg>
              </span>
            </span>
            <span className={hub.coreName}>Nafaa</span>
            <span className={hub.coreTag}>{t.coreTag}</span>
            <span className={hub.chips}>
              {t.coreChips.map((c) => (
                <span key={c} className={hub.chip}>
                  {c}
                </span>
              ))}
            </span>
          </div>
          <ul className={hub.col}>
            {right.map((f, i) => (
              <FactCard key={f.label} label={f.label} value={f.value} side="r" i={i + half} rtl={rtl} />
            ))}
          </ul>
        </div>

        {block.romanUrdu ? (
          <div className={hub.urdu} data-reveal>
            <span aria-hidden className={hub.urduIcon}>
              <CmsIcon name="languages" size={18} />
            </span>
            <div>
              <p className="text-eyebrow uppercase text-link">{t.romanUrdu}</p>
              <p lang="ur-Latn" className="mt-1.5 text-body text-fg-muted">
                {block.romanUrdu}
              </p>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}

// ─── How it works (consecutive diagram blocks, one light band) ───

type DiagramLinkKey = keyof ReturnType<typeof uiStrings>['home']['diagramLinks'];

const DIAGRAM_LINKS: Record<string, { href: string; label: DiagramLinkKey }[]> = {
  'offline-sync': [
    { href: '/product/offline-pos', label: 'offlineHow' },
    { href: '/product/pos', label: 'seePos' },
  ],
  'store-sync': [{ href: '/product/online-store', label: 'seeOnline' }],
  'fbr-invoice': [{ href: '/product/fbr', label: 'seeFbr' }],
  'khata-cycle': [{ href: '/product/khata', label: 'seeKhata' }],
  'multi-branch': [{ href: '/product/multi-shop', label: 'multiBranch' }],
};

/** `links` maps a CMS path to the site link for this page's locale (core/data liveLinks). */
export function HomeHowItWorks({ blocks, links, locale }: { blocks: DiagramBlock[]; links: Map<string, string>; locale?: string }) {
  if (!blocks.length) return null;
  const t = uiStrings(locale);
  return (
    <section aria-labelledby="home-how" className="relative isolate overflow-hidden py-section">
      <Backdrop tint="slate" pattern="grid" />
      <div className="mx-auto box-content max-w-wide px-gutter">
        <div className="mx-auto max-w-2xl text-center" data-reveal>
          <p className="text-eyebrow uppercase text-link">{t.howItWorks}</p>
          <h2 id="home-how" className="mt-3 text-h2 text-fg-strong">
            {t.home.howTitle}
          </h2>
        </div>
        <ol className={cx(fx.steps, 'mt-12 md:mt-16')}>
          {blocks.map((block, i) => {
            const known = (DIAGRAM_LINKS[block.diagram.kind] ?? []).find((l) => links.has(l.href));
            const link = known ? { href: links.get(known.href) as string, label: t.home.diagramLinks[known.label] } : undefined;
            return (
              <li key={block.id} className={cx(fx.step, 'grid items-center gap-8 lg:gap-14', i % 2 === 1 ? 'lg:grid-cols-[minmax(0,1.28fr)_minmax(0,0.72fr)] lg:[&>*:first-child]:order-2' : 'lg:grid-cols-[minmax(0,0.72fr)_minmax(0,1.28fr)]')}>
                <div data-reveal>
                  <span aria-hidden className={fx.stepNo}>
                    {String(i + 1).padStart(2, '0')}
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
                <div className={fx.stage2}>
                  <Diagram spec={block.diagram} caption={block.caption} showCaption={false} />
                </div>
              </li>
            );
          })}
        </ol>
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
