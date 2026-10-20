/**
 * entryGrid (API-CONTRACT 4.17 + 1.1.0 status filter): an automatic list of
 * published entries by type, tag, group, featured, parent or feature status.
 * Layouts: cards, a compact list, or cards grouped by `data.group` in the
 * order of settings `industry-groups`. With no entries it renders nothing.
 * Hubs build their ItemList schema from the same cards.
 */
import { Container } from '@/components/ui/Container';
import { cx } from '@/components/ui/cx';
import type { EntryCard } from '@/lib/cms/contract/cms-contract';
import { BlockHeading } from './parts/BlockHeading';
import { EntryCardItem, EntryRow } from './parts/EntryCards';
import { humanizeKey } from './lib/format';
import { reveal } from './lib/reveal';
import type { BlockProps } from './types';

const GRID = 'grid gap-4 sm:grid-cols-2 lg:grid-cols-3';

export async function EntryGrid({ block, ctx }: BlockProps<'entryGrid'>) {
  const cards = await ctx.source.entries({
    type: block.entryType,
    locale: ctx.locale,
    tag: block.filter?.tagId,
    group: block.filter?.group,
    featured: block.filter?.featured,
    parentId: block.filter?.parentId,
    status: block.filter?.status,
    sort: block.sort,
    limit: block.limit,
  });
  const items = cards.filter((card) => card.id !== ctx.entry.id);
  if (!items.length) return null;

  const header = block.heading ? <BlockHeading id={ctx.headingId} title={block.heading} intro={block.intro} index={ctx.index} /> : null;

  if (block.layout === 'list') {
    return (
      <Container>
        <div className="grid gap-10 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-16">
          {header ?? <span />}
          <ul className="divide-y divide-line border-y border-line">
            {items.map((card) => (
              <li key={card.id}>
                <EntryRow card={card} locale={ctx.locale} />
              </li>
            ))}
          </ul>
        </div>
      </Container>
    );
  }

  if (block.layout === 'grouped') {
    const labels = await ctx.source.industryGroups(ctx.locale);
    const order = new Map(labels.map((group, i) => [group.key, { label: group.label, sort: group.sortOrder ?? i }]));
    const groups = new Map<string, EntryCard[]>();
    for (const card of items) {
      const key = card.group ?? '';
      groups.set(key, [...(groups.get(key) ?? []), card]);
    }
    const sorted = [...groups.entries()].sort(([a], [b]) => {
      const sa = order.get(a)?.sort ?? Number.MAX_SAFE_INTEGER;
      const sb = order.get(b)?.sort ?? Number.MAX_SAFE_INTEGER;
      return sa - sb || a.localeCompare(b);
    });
    return (
      <Container>
        {header}
        <div className={cx('space-y-14', header && 'mt-12')}>
          {sorted.map(([key, group]) => (
            <section key={key || 'other'} aria-labelledby={`${ctx.headingId}-${key || 'other'}`}>
              <h3 id={`${ctx.headingId}-${key || 'other'}`} className="flex items-center gap-3 text-eyebrow uppercase text-fg-subtle">
                {order.get(key)?.label ?? (key ? humanizeKey(key) : '')}
                <span aria-hidden className="h-px flex-1 bg-line" />
                <span className="tabular-nums">{group.length}</span>
              </h3>
              <ul className={cx(GRID, 'mt-5')} {...reveal(ctx.index, 'stagger')}>
                {group.map((card) => (
                  <li key={card.id}>
                    <EntryCardItem card={card} locale={ctx.locale} headingAs="h4" />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </Container>
    );
  }

  return (
    <Container>
      {header}
      <ul className={cx(GRID, header && 'mt-12')} {...reveal(ctx.index, 'stagger')}>
        {items.map((card) => (
          <li key={card.id}>
            <EntryCardItem card={card} locale={ctx.locale} />
          </li>
        ))}
      </ul>
    </Container>
  );
}
