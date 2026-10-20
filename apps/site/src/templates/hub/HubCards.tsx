/**
 * HubCards: a hub's `cards` entry grid as a bento of its children (products,
 * solutions, services). Same rhythm and card styling as the showcase Bento,
 * with each child's icon, accent colour, feature-status badge, a clipped
 * summary and a link to its page. Wide cards carry the orbit art.
 */
import Link from 'next/link';
import { FeatureBadge } from '@/components/blocks/parts/FeatureBadge';
import { InlineMarkdown } from '@/components/blocks/rich-text/Markdown';
import { Container } from '@/components/ui/Container';
import { cx } from '@/components/ui/cx';
import type { EntryCard } from '@/lib/cms/contract/cms-contract';
import { CmsIcon } from '@/lib/icons';
import { hexToChannels } from '@/components/blocks/lib/format';
import { bentoSpans } from '../showcase/Bento';
import { OrbitArt, SectionTitle } from '../showcase/kit';
import styles from '../showcase/showcase.module.css';

const SPAN_CLASS = { 2: styles.s2, 3: styles.s3, 4: styles.s4, 6: styles.s6 } as const;

/** First sentence, or the first `max` characters cut at a word. */
function clip(text: string | null, max: number): string {
  if (!text) return '';
  const first = text.match(/^.+?[.!?](\s|$)/)?.[0]?.trim() ?? text;
  if (first.length <= max) return first;
  const cut = first.slice(0, max);
  return `${cut.slice(0, cut.lastIndexOf(' ')).replace(/[,;:]$/, '')}…`;
}

export function HubCards({ cards, headingId, heading, intro, kicker }: { cards: EntryCard[]; headingId: string; heading: string; intro?: string; kicker?: string }) {
  const spans = bentoSpans(cards.length);
  return (
    <Container>
      <SectionTitle id={headingId} title={heading} kicker={kicker} intro={intro ? <InlineMarkdown text={intro} /> : null} />
      <ul className={cx(styles.bento, 'mt-12')} data-reveal="stagger">
        {cards.map((card, i) => {
          const span = spans[i] ?? 2;
          const large = span >= 4;
          return (
            <li key={card.id} className={cx(SPAN_CLASS[span], large ? styles.wide2 : undefined, 'flex')}>
              <Link
                href={card.path}
                prefetch={false}
                style={{ '--accent': hexToChannels(card.color) ?? undefined }}
                className={cx(styles.card, large && styles.cardLarge, 'group w-full')}
              >
                {large ? <OrbitArt icon={card.icon} /> : null}
                <div className="flex items-start justify-between gap-3">
                  <span aria-hidden className={styles.iconTile}>
                    <CmsIcon name={card.icon ?? 'circle'} size={20} strokeWidth={2} />
                  </span>
                  <FeatureBadge status={card.status} locale={card.locale} />
                </div>
                <h3 className={cx('text-fg-strong', large ? 'mt-auto pt-10 text-h3' : 'mt-6 text-h4')}>{card.title}</h3>
                <p className={cx('mt-2 text-fg-muted', large ? 'max-w-[30rem] text-body' : 'text-small')}>{clip(card.summary, large ? 200 : 130)}</p>
                <span className={cx('inline-flex items-center gap-1.5 text-small font-semibold text-link', large ? 'mt-4' : 'mt-auto pt-5')}>
                  Explore {card.shortName ?? card.title}
                  <span aria-hidden className="transition-transform duration-fast group-hover:translate-x-0.5">
                    →
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </Container>
  );
}
