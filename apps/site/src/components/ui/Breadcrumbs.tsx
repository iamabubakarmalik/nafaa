/**
 * Breadcrumbs: the visible trail. The BreadcrumbList JSON-LD is built
 * separately (src/lib/seo/breadcrumbs.ts) from the same items.
 */
import { ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { cx } from './cx';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

/** `label` names the nav for screen readers (localized by the caller). */
export function Breadcrumbs({ items, className, label = 'Breadcrumb' }: { items: BreadcrumbItem[]; className?: string; label?: string }) {
  if (items.length === 0) return null;
  return (
    <nav aria-label={label} className={cx('text-small', className)}>
      <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-fg-subtle">
        {items.map((item, index) => {
          const last = index === items.length - 1;
          return (
            <li key={`${item.label}-${index}`} className="inline-flex items-center gap-1.5">
              {index > 0 ? (
                <ChevronRight aria-hidden size={14} strokeWidth={2} className="text-fg-subtle/60" />
              ) : null}
              {item.href && !last ? (
                <Link href={item.href} className="transition-colors duration-fast hover:text-fg-strong">
                  {item.label}
                </Link>
              ) : (
                <span aria-current={last ? 'page' : undefined} className={last ? 'text-fg-muted' : undefined}>
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
