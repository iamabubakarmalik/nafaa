'use client';

/**
 * The mobile menu sheet, loaded on demand by MobileNav (it is not in the
 * first-load bundle). Groups are native <details>, so they work by keyboard
 * and screen reader with no extra code. A group whose item has its own page
 * gets an "overview" link first. Portalled to <body>: the sticky header's
 * backdrop-filter would otherwise become the containing block of this fixed
 * sheet.
 */
import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { cx } from '@/components/ui/cx';
import { CloseGlyph } from './glyphs';
import { NavLink, StatusBadge } from './NavLink';
import { ThemeChoice } from './ThemeToggle';
import { children, type NavItem } from './nav';

export interface HeaderCta {
  label: string;
  href: string;
  variant: 'primary' | 'secondary' | 'ghost';
  track?: string;
}

function withOverview(item: NavItem): NavItem[] {
  const kids = children(item);
  if (!item.href || item.href === '#') return kids;
  return [{ ...item, id: `${item.id}-overview`, label: `${item.label} overview`, children: undefined }, ...kids];
}

function Items({ items, depth, close }: { items: NavItem[]; depth: number; close: () => void }) {
  return (
    <ul className={cx(depth > 0 && 'mb-2 ml-3 border-l border-line pl-3')}>
      {items.map((item) => {
        if (children(item).length === 0) {
          return (
            <li key={item.id}>
              <NavLink
                item={item}
                onNavigate={close}
                className={cx(
                  'flex min-h-11 items-center rounded-md px-2 text-fg-strong hover:bg-surface-2',
                  depth === 0 ? 'text-body font-medium' : 'text-small text-fg-muted',
                )}
              >
                {item.label}
                <StatusBadge status={item.status} />
              </NavLink>
            </li>
          );
        }
        return (
          <li key={item.id}>
            <details className="group/d">
              <summary
                className={cx(
                  'flex min-h-11 cursor-pointer list-none items-center justify-between rounded-md px-2 hover:bg-surface-2 [&::-webkit-details-marker]:hidden',
                  depth === 0 ? 'text-body font-medium text-fg-strong' : 'text-small font-medium text-fg-muted',
                )}
              >
                {item.label}
                <span aria-hidden className="text-fg-subtle transition-transform duration-fast group-open/d:rotate-45">
                  +
                </span>
              </summary>
              <Items items={withOverview(item)} depth={depth + 1} close={close} />
            </details>
          </li>
        );
      })}
    </ul>
  );
}

const CTA_CLASSES: Record<HeaderCta['variant'], string> = {
  primary: 'bg-brand-700 text-white hover:bg-brand-800',
  secondary: 'border border-line-strong bg-surface text-fg-strong hover:bg-surface-2',
  ghost: 'text-fg-strong hover:bg-surface-3',
};

export default function MobileNavSheet({
  id,
  items,
  ctas,
  onClose,
}: {
  id: string;
  items: NavItem[];
  ctas: HeaderCta[];
  onClose: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const root = document.documentElement;
    const previous = root.style.overflow;
    root.style.overflow = 'hidden';
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      root.style.overflow = previous;
      document.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  return createPortal(
    <div
      id={id}
      role="dialog"
      aria-modal="true"
      aria-label="Menu"
      className="fixed inset-0 z-[55] flex flex-col bg-canvas"
      data-track-area="mobile-nav"
    >
      <div className="flex h-[var(--header-h)] shrink-0 items-center justify-between border-b border-line px-gutter">
        <span className="text-h4 text-fg-strong">Menu</span>
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          className="inline-flex size-10 items-center justify-center rounded-md text-fg-strong hover:bg-surface-3"
        >
          <span className="sr-only">Close menu</span>
          <CloseGlyph size={22} />
        </button>
      </div>
      <nav aria-label="Main" className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-gutter py-4">
        <Items items={items} depth={0} close={onClose} />
      </nav>
      <div className="shrink-0 space-y-3 border-t border-line px-gutter py-4">
        <div className="grid gap-2">
          {ctas.map((cta) => (
            <a
              key={cta.href + cta.label}
              href={cta.href}
              data-track={cta.track}
              data-track-label={`Mobile nav: ${cta.label}`}
              className={cx('inline-flex h-11 items-center justify-center rounded-md px-5 font-medium', CTA_CLASSES[cta.variant])}
            >
              {cta.label}
            </a>
          ))}
        </div>
        <ThemeChoice />
      </div>
    </div>,
    document.body,
  );
}
