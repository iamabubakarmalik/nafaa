'use client';

/**
 * The mobile menu sheet, loaded on demand by MobileNav (it is not in the
 * first-load bundle). Top-level groups are native <details>, so they work by
 * keyboard and screen reader with no extra code. Inside, mega-menu columns
 * become headed lists with the same descriptions as the desktop panels (no
 * icons: the icon set would add its path data to this chunk), and an item with its own page gets an "Explore all" link first. Portalled to <body>: the sticky header's
 * backdrop-filter would otherwise become the containing block of this fixed
 * sheet.
 */
import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { cx } from '@/components/ui/cx';
import { ChevronDownGlyph, CloseGlyph } from './glyphs';
import { NavLink, StatusBadge } from './NavLink';
import { ThemeChoice } from './ThemeToggle';
import { children, hasHref, itemDescription, overviewLabel, type NavItem } from './nav';

export interface HeaderCta {
  label: string;
  href: string;
  variant: 'primary' | 'secondary' | 'ghost';
  track?: string;
}

function withOverview(item: NavItem): NavItem[] {
  const kids = children(item);
  if (!hasHref(item)) return kids;
  return [{ ...item, id: `${item.id}-overview`, label: overviewLabel(item.label), description: undefined, children: undefined }, ...kids];
}

function SubLink({ item, close }: { item: NavItem; close: () => void }) {
  const description = itemDescription(item);
  return (
    <NavLink item={item} onNavigate={close} className="flex min-h-11 items-start gap-3 rounded-lg px-2 py-2 hover:bg-surface-2">
      <span className="min-w-0">
        <span className="flex items-center text-small font-medium text-fg-strong">
          {item.label}
          <StatusBadge item={item} />
        </span>
        {description ? <span className="mt-0.5 block text-xs leading-snug text-fg-subtle">{description}</span> : null}
      </span>
    </NavLink>
  );
}

/** The inside of an open top-level item: column groups become headed lists. */
function Panel({ item, close }: { item: NavItem; close: () => void }) {
  return (
    <div className="mb-3 mt-1 space-y-4 rounded-xl border border-line bg-surface-2/60 p-2">
      {withOverview(item).map((kid) => {
        const links = children(kid);
        if (!links.length) return <SubLink key={kid.id} item={kid} close={close} />;
        return (
          <div key={kid.id}>
            <p className="px-2 pb-1 pt-2 text-eyebrow uppercase text-fg-subtle">{kid.label}</p>
            <ul className="grid gap-0.5 sm:grid-cols-2">
              {links.map((link) => (
                <li key={link.id}>
                  <SubLink item={link} close={close} />
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

function Items({ items, close }: { items: NavItem[]; close: () => void }) {
  return (
    <ul className="divide-y divide-line">
      {items.map((item) => {
        if (children(item).length === 0) {
          return (
            <li key={item.id}>
              <NavLink item={item} onNavigate={close} className="flex min-h-14 items-center px-1 text-body font-semibold text-fg-strong">
                {item.label}
                <StatusBadge item={item} />
              </NavLink>
            </li>
          );
        }
        return (
          <li key={item.id}>
            <details className="group/d">
              <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between px-1 text-body font-semibold text-fg-strong [&::-webkit-details-marker]:hidden">
                {item.label}
                <ChevronDownGlyph size={18} className="text-fg-subtle transition-transform duration-base group-open/d:rotate-180" />
              </summary>
              <Panel item={item} close={close} />
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
        <Items items={items} close={onClose} />
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
