/**
 * stats (API-CONTRACT 4.11): numbers computed by the API only
 * (/public/site/stats); the block has no number field at all (ARCH D11).
 * A metric the API does not return, or that is zero, is left out, and with
 * nothing left the block renders nothing. `platform.*` metrics appear only
 * when settings allow them (the API enforces it).
 */
import { Container } from '@/components/ui/Container';
import { cx } from '@/components/ui/cx';
import { formatDate, isoDate } from './lib/format';
import { strings } from './lib/i18n';
import { reveal } from './lib/reveal';
import type { BlockProps } from './types';
import styles from './blocks.module.css';

export async function Stats({ block, ctx }: BlockProps<'stats'>) {
  const values = await ctx.source.stats(block.items.map((item) => item.metric));
  const items = block.items
    .map((item) => ({ ...item, stat: values[item.metric] }))
    .filter((item) => item.stat && item.stat.value > 0);
  if (!items.length) return null;
  const t = strings(ctx.locale);
  const asOf = items.map((item) => item.stat?.asOf).filter(Boolean).sort().pop();
  const cols =
    items.length >= 4
      ? 'sm:grid-cols-2 lg:grid-cols-4'
      : items.length === 3
        ? 'sm:grid-cols-3'
        : items.length === 2
          ? 'mx-auto max-w-[40rem] sm:grid-cols-2'
          : 'mx-auto max-w-[22rem]';

  return (
    <Container>
      {block.heading ? (
        <h2 id={ctx.headingId} className="mx-auto max-w-measure text-center text-h3 text-fg-strong">
          {block.heading}
        </h2>
      ) : null}
      <dl
        className={cx('grid divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface shadow-e1 ink:shadow-none sm:divide-y-0', cols, block.heading && 'mt-10', 'sm:[&>div+div]:border-s sm:[&>div+div]:border-line')}
        {...reveal(ctx.index, 'stagger')}
      >
        {items.map((item) => (
          <div key={item.metric} className="flex flex-col-reverse gap-2 px-6 py-8 text-center md:py-10">
            <dt className="text-small font-medium text-fg-muted">{item.label}</dt>
            <dd className={cx(styles.statValue, 'text-[clamp(2.25rem,1.8rem+1.6vw,3.25rem)] font-650 leading-none text-fg-strong')}>
              {item.stat?.formatted}
              {item.suffix ? <span className="ms-0.5 text-link">{item.suffix}</span> : null}
            </dd>
          </div>
        ))}
      </dl>
      {asOf ? (
        <p className="mt-4 text-center text-xs text-fg-subtle">
          {t.statsAsOf} <time dateTime={isoDate(asOf)}>{formatDate(asOf, ctx.locale)}</time>
        </p>
      ) : null}
    </Container>
  );
}
