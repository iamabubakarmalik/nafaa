/**
 * Table of contents. Zero JS:
 * - TocRail: a sticky list in its own right-hand column on wide screens
 *   (xl+), so it never overlaps a wide block.
 * - TocInline: a collapsible <details> above the text on smaller screens.
 */
import { cx } from '@/components/ui/cx';
import type { TocItem } from './outline';

function List({ items, className }: { items: TocItem[]; className?: string }) {
  return (
    <ol className={cx('space-y-1.5 text-small', className)}>
      {items.map((item) => (
        <li key={item.id} className={item.level === 3 ? 'pl-3.5' : undefined}>
          <a
            href={`#${item.id}`}
            className={cx(
              'block border-l border-line py-0.5 pl-3 leading-snug transition-colors duration-fast hover:border-fg-subtle hover:text-fg-strong',
              item.level === 3 ? 'text-fg-subtle' : 'text-fg-muted',
            )}
          >
            {item.text}
          </a>
        </li>
      ))}
    </ol>
  );
}

/** The right-hand column of ArticleLayout: a sticky list (xl+). */
export function TocRail({ items, label = 'On this page' }: { items: TocItem[]; label?: string }) {
  if (items.length < 2) return null;
  return (
    <nav aria-label={label} className="hidden xl:block">
      <div className="sticky top-[calc(var(--header-h)+2.5rem)] max-h-[calc(100vh-var(--header-h)-4rem)] overflow-y-auto py-12">
        <p className="mb-3 text-eyebrow uppercase text-fg-subtle">{label}</p>
        <List items={items} />
      </div>
    </nav>
  );
}

export function TocInline({ items, label = 'On this page', className }: { items: TocItem[]; label?: string; className?: string }) {
  if (items.length < 2) return null;
  return (
    <nav aria-label={label} className={cx('mx-auto box-content max-w-prose px-gutter', className)}>
      <details className="group rounded-lg border border-line bg-surface-2 px-4 py-3">
        <summary className="flex cursor-pointer list-none items-center justify-between text-small font-medium text-fg-strong [&::-webkit-details-marker]:hidden">
          {label}
          <svg aria-hidden width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-fg-subtle transition-transform duration-fast group-open:rotate-180">
            <path d="m6 9 6 6 6-6" />
          </svg>
        </summary>
        <List items={items} className="mt-3 pb-1" />
      </details>
    </nav>
  );
}
