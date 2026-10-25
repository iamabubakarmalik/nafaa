/**
 * Small server parts of the showcase kit: the section wrapper and title,
 * the trust ribbon, the industry marquee and the decorative SVG art.
 *
 * Everything here is static HTML and CSS (no client JavaScript). Claims in
 * the trust ribbon are owner-approved facts that the app backs (offline
 * queue in apps/web/src/core/lib/offline, FBR/PRA in apps/api/src/integrations/fbr
 * and tax-authority, the Plan table's trialDays).
 */
import Link from 'next/link';
import type { ReactNode } from 'react';
import { Container } from '@/components/ui/Container';
import { cx } from '@/components/ui/cx';
import type { EntryCard } from '@/lib/cms/contract/cms-contract';
import { CmsIcon } from '@/lib/icons';
import { uiStrings } from '@/lib/i18n/ui';
import { cardPath } from '../core/ui';
import styles from './showcase.module.css';

export { styles as showcaseStyles };

const SPACING = {
  default: 'py-section',
  compact: 'py-12 md:py-16',
  snug: 'py-12 md:py-20',
  tight: 'pt-4 pb-12 md:pb-16',
} as const;

/** A themed page section, like ui/Section, with the kit's spacing steps. */
export function ShowcaseSection({
  id,
  labelledBy,
  theme = 'default',
  spacing = 'default',
  className,
  children,
}: {
  id?: string;
  labelledBy?: string;
  theme?: 'default' | 'muted' | 'ink';
  spacing?: keyof typeof SPACING;
  className?: string;
  children: ReactNode;
}) {
  const themeClass =
    theme === 'ink' ? 'theme-ink bg-canvas text-fg' : theme === 'muted' ? 'theme-muted bg-canvas text-fg border-y border-line/70' : 'theme-default bg-canvas text-fg';
  return (
    <section id={id} aria-labelledby={labelledBy} className={cx('relative isolate overflow-x-clip', themeClass, SPACING[spacing], className)}>
      {children}
    </section>
  );
}

/** Eyebrow with a short gradient rule. */
export function Kicker({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p className={cx(styles.kicker, 'text-eyebrow uppercase text-link', className)}>
      <span aria-hidden className={styles.kickerLine} />
      {children}
    </p>
  );
}

/** Section title block (H2 + optional kicker and intro). */
export function SectionTitle({
  id,
  title,
  kicker,
  intro,
  align = 'start',
  className,
  children,
}: {
  id: string;
  title: ReactNode;
  kicker?: ReactNode;
  intro?: ReactNode;
  align?: 'start' | 'center';
  className?: string;
  children?: ReactNode;
}) {
  const centered = align === 'center';
  return (
    <div className={cx('max-w-[46rem]', centered && 'mx-auto text-center', className)}>
      {kicker ? <Kicker className={cx('mb-4', centered && 'justify-center')}>{kicker}</Kicker> : null}
      <h2 id={id} className="text-h2 text-fg-strong">
        {title}
      </h2>
      {intro ? <p className={cx('mt-4 text-body-lg text-fg-muted', centered && 'mx-auto max-w-[40rem]')}>{intro}</p> : null}
      {children}
    </div>
  );
}

export interface TrustItem {
  icon: string;
  label: string;
}

/**
 * Owner-approved facts shown under product, solution and pricing heroes.
 * Tax wording stays off this list on purpose (owner, 21 Oct): FBR and PRA are
 * named only on the tax pages.
 */
export function trustItems(locale?: string): TrustItem[] {
  const t = uiStrings(locale).trust;
  return [
    { icon: 'gift', label: t.trial },
    { icon: 'wifi-off', label: t.offline },
    { icon: 'message-circle', label: t.whatsapp },
    { icon: 'languages', label: t.languages },
    { icon: 'smartphone', label: t.devices },
  ];
}

/** The English trust facts (pages without a locale). */
export const DEFAULT_TRUST: TrustItem[] = trustItems('en');

/** A quiet row of facts with icons, separated by hairlines. */
export function TrustRibbon({ items: given, locale, className }: { items?: TrustItem[]; locale?: string; className?: string }) {
  const items = given ?? trustItems(locale);
  if (!items.length) return null;
  return (
    <Container className={className}>
      <ul className="flex flex-wrap items-center justify-center gap-x-2 gap-y-3 border-y border-line/80 py-5 text-small text-fg-muted">
        {items.map((item, i) => (
          <li key={item.label} className="flex items-center">
            {i > 0 ? <span aria-hidden className="mx-4 hidden h-4 w-px bg-line md:inline-block" /> : null}
            <span className="inline-flex items-center gap-2">
              <CmsIcon name={item.icon} size={16} className="text-link" />
              {item.label}
            </span>
          </li>
        ))}
      </ul>
    </Container>
  );
}

function hexChannels(hex: string | null | undefined): string | undefined {
  if (!hex || !/^#[0-9a-f]{6}$/i.test(hex)) return undefined;
  const n = parseInt(hex.slice(1), 16);
  return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`;
}

/**
 * Infinite marquee of industry chips (published INDUSTRY cards). The list is
 * rendered twice for a seamless loop; the copy is aria-hidden and dropped
 * under reduced motion, where the chips wrap instead.
 */
export function IndustryMarquee({ cards, title, link }: { cards: readonly EntryCard[]; title?: ReactNode; link?: { href: string; label: string } }) {
  if (cards.length < 4) return null;
  const chips = (hidden: boolean) => (
    <div className="flex shrink-0 gap-3" aria-hidden={hidden || undefined}>
      {cards.map((card) => (
        <Link
          key={card.id}
          href={cardPath(card)}
          prefetch={false}
          tabIndex={hidden ? -1 : undefined}
          className={styles.marqueeChip}
          style={{ '--chip': hexChannels(card.color) }}
        >
          <span className={styles.marqueeIcon}>
            <CmsIcon name={card.icon ?? 'store'} size={14} />
          </span>
          {card.shortName ?? card.title}
        </Link>
      ))}
    </div>
  );
  return (
    <div>
      {title || link ? (
        <Container className="mb-6 flex flex-wrap items-baseline justify-between gap-3">
          {title ? <p className="text-small font-medium text-fg-muted">{title}</p> : <span />}
          {link ? (
            <Link href={link.href} prefetch={false} className="text-small font-semibold text-link hover:underline">
              {link.label} →
            </Link>
          ) : null}
        </Container>
      ) : null}
      <div className={styles.marquee}>
        <div className={styles.marqueeTrack}>
          {chips(false)}
          {chips(true)}
        </div>
      </div>
    </div>
  );
}

/** Concentric rings with orbiting dots, used behind large bento cards. */
export function OrbitArt({ icon, className }: { icon?: string; className?: string }) {
  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 200 200" className={cx(styles.orbit, className)}>
      <g fill="none" stroke="currentColor">
        <circle cx="100" cy="100" r="96" strokeOpacity="0.12" />
        <circle cx="100" cy="100" r="70" strokeOpacity="0.18" />
        <circle cx="100" cy="100" r="44" strokeOpacity="0.26" />
      </g>
      <g className={styles.orbitSpin}>
        <circle cx="100" cy="4" r="3.5" fill="currentColor" fillOpacity="0.7" />
        <circle cx="170" cy="100" r="3" fill="currentColor" fillOpacity="0.5" />
        <circle cx="56" cy="100" r="2.5" fill="currentColor" fillOpacity="0.6" />
      </g>
      {icon ? (
        <foreignObject x="80" y="80" width="40" height="40">
          <span className="flex size-10 items-center justify-center">
            <CmsIcon name={icon} size={22} />
          </span>
        </foreignObject>
      ) : null}
    </svg>
  );
}

/** Thin concentric rings behind a phone screenshot. */
export function RingsArt() {
  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 400 400" className={styles.rings}>
      <g fill="none" stroke="currentColor">
        {[60, 100, 140, 180].map((r, i) => (
          <circle key={r} cx="200" cy="200" r={r} strokeOpacity={0.22 - i * 0.045} />
        ))}
      </g>
    </svg>
  );
}
