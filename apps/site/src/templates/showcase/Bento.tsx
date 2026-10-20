/**
 * Bento: a `featuresGrid` block as a bento grid. Card widths follow a fixed
 * rhythm on a 6-column grid (wide cards open and close each run), large cards
 * get orbit art, and every card lifts with an accent edge on hover. Titles,
 * bodies, links and feature-status badges are the block's own.
 */
import { FeatureBadge } from '@/components/blocks/parts/FeatureBadge';
import { SmartLink } from '@/components/blocks/parts/SmartLink';
import { InlineMarkdown } from '@/components/blocks/rich-text/Markdown';
import { linkKind } from '@/components/blocks/lib/links';
import { Container } from '@/components/ui/Container';
import { cx } from '@/components/ui/cx';
import type { Block } from '@/lib/cms/contract/cms-contract';
import { CmsIcon } from '@/lib/icons';
import { OrbitArt, SectionTitle } from './kit';
import styles from './showcase.module.css';

type FeaturesBlock = Extract<Block, { type: 'featuresGrid' }>;
type Span = 2 | 3 | 4 | 6;

/** Column spans (of 6) for n cards: wide cards open and close each run, every row sums to 6. */
const A: Span[] = [4, 2];
const B: Span[] = [2, 2, 2];
const C: Span[] = [2, 4];
const D: Span[] = [3, 3];
const SPANS: Record<number, Span[]> = {
  1: [6],
  2: D,
  3: B,
  4: [...A, ...C],
  5: [...A, ...B],
  6: [...A, ...C, ...D],
  7: [...A, ...B, ...C],
  8: [...A, ...B, ...B],
  9: [...A, ...B, ...C, ...D],
  10: [...A, ...B, ...C, ...B],
  11: [...A, ...B, ...C, ...D, ...A],
  12: [...A, ...B, ...C, ...B, ...C],
};

export function bentoSpans(n: number): Span[] {
  if (n > 12) return [...SPANS[12]!, ...bentoSpans(n - 12)];
  return SPANS[n] ?? [];
}

const SPAN_CLASS: Record<Span, string> = { 2: styles.s2!, 3: styles.s3!, 4: styles.s4!, 6: styles.s6! };

export function Bento({ block, headingId, locale, kicker }: { block: FeaturesBlock; headingId: string; locale: string; kicker?: string }) {
  const spans = bentoSpans(block.items.length);
  return (
    <Container>
      <SectionTitle id={headingId} title={block.heading} kicker={kicker} intro={block.intro ? <InlineMarkdown text={block.intro} /> : null} />
      <ul className={cx(styles.bento, 'mt-12')} data-reveal="stagger">
        {block.items.map((item, i) => {
          const span = spans[i] ?? 2;
          const large = span >= 4;
          const linked = linkKind(item.href) !== 'none';
          const inner = (
            <>
              {large ? <OrbitArt icon={item.icon} /> : null}
              <div className="flex items-start justify-between gap-3">
                <span aria-hidden className={styles.iconTile}>
                  <CmsIcon name={item.icon} size={20} strokeWidth={2} />
                </span>
                <FeatureBadge status={item.status} locale={locale} />
              </div>
              <h3 className={cx('text-fg-strong', large ? 'mt-auto pt-10 text-h3' : 'mt-6 text-h4')}>{item.title}</h3>
              <p className={cx('mt-2 text-fg-muted', large ? 'max-w-[30rem] text-body' : 'text-small')}>
                <InlineMarkdown text={item.body} opts={{ plainLinks: linked }} />
              </p>
              {linked ? (
                <span className="mt-4 inline-flex items-center gap-1.5 text-small font-semibold text-link">
                  Learn more
                  <span aria-hidden className="transition-transform duration-fast group-hover:translate-x-0.5">→</span>
                </span>
              ) : null}
            </>
          );
          return (
            <li key={i} className={cx(SPAN_CLASS[span], span === 4 || span === 6 ? styles.wide2 : undefined, 'flex')}>
              {linked && item.href ? (
                <SmartLink href={item.href} className={cx(styles.card, large && styles.cardLarge, 'group w-full')}>
                  {inner}
                </SmartLink>
              ) : (
                <div className={cx(styles.card, large && styles.cardLarge, 'w-full')}>{inner}</div>
              )}
            </li>
          );
        })}
      </ul>
    </Container>
  );
}
