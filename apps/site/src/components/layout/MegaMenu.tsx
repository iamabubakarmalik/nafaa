/**
 * Desktop navigation with mega menu panels (server component).
 *
 * A top-level header item without children is a plain link. With children it
 * gets a panel:
 * - children that have their own children render as columns (group heading
 *   plus links);
 * - otherwise the children render as a two-column grid of links with icon and
 *   description.
 * The panel opens on hover and on keyboard focus with CSS only (theme.css);
 * MegaMenuController adds click/tap, Escape and outside-click handling.
 */
import { CmsIcon } from '@/lib/icons';
import { isAllowedIcon } from '@/lib/cms/contract/cms-contract';
import { cx } from '@/components/ui/cx';
import { ChevronDownGlyph } from './glyphs';
import { NavLink, StatusBadge } from './NavLink';
import { children, type NavItem } from './nav';

function hasHref(item: NavItem): boolean {
  return Boolean(item.href) && item.href !== '#';
}

function PanelLink({ item }: { item: NavItem }) {
  return (
    <NavLink
      item={item}
      className="group/ml flex gap-3 rounded-md p-2.5 transition-colors duration-fast hover:bg-surface-2 focus-visible:bg-surface-2"
    >
      {item.icon && isAllowedIcon(item.icon) ? (
        <span
          aria-hidden
          className="mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-md bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-600/15 ink:bg-brand-400/10 ink:text-brand-300 ink:ring-brand-400/20"
        >
          <CmsIcon name={item.icon} size={16} />
        </span>
      ) : null}
      <span className="min-w-0">
        <span className="flex items-center text-small font-medium text-fg-strong">
          {item.label}
          <StatusBadge status={item.status} />
        </span>
        {item.description ? <span className="mt-0.5 block text-small text-fg-subtle">{item.description}</span> : null}
      </span>
    </NavLink>
  );
}

function Panel({ item, panelId }: { item: NavItem; panelId: string }) {
  const kids = children(item);
  const grouped = kids.some((kid) => children(kid).length > 0);
  const columns = grouped ? Math.min(kids.length, 4) : 2;

  return (
    <div id={panelId} className="mega-panel absolute left-1/2 top-full z-40 -translate-x-1/2 pt-3">
      <div
        className={cx(
          'rounded-lg border border-line bg-surface p-3 shadow-e3',
          columns >= 3 ? 'w-[min(56rem,calc(100vw-4rem))]' : 'w-[min(36rem,calc(100vw-4rem))]',
        )}
      >
        {grouped ? (
          <div className={cx('grid gap-4', columns === 4 ? 'grid-cols-4' : columns === 3 ? 'grid-cols-3' : 'grid-cols-2')}>
            {kids.map((group) => (
              <div key={group.id} className="min-w-0">
                <p className="px-2.5 pb-1 pt-1.5 text-eyebrow uppercase text-fg-subtle">
                  {hasHref(group) ? (
                    <NavLink item={group} className="hover:text-fg-strong">
                      {group.label}
                    </NavLink>
                  ) : (
                    group.label
                  )}
                </p>
                <ul>
                  {children(group).map((link) => (
                    <li key={link.id}>
                      <PanelLink item={link} />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        ) : (
          <ul className="grid grid-cols-2 gap-1">
            {kids.map((link) => (
              <li key={link.id}>
                <PanelLink item={link} />
              </li>
            ))}
          </ul>
        )}
        {hasHref(item) ? (
          <div className="mt-2 border-t border-line px-2.5 pt-2.5">
            <NavLink item={item} className="text-small font-medium text-link hover:underline">
              {item.label} overview →
            </NavLink>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function MegaMenu({ items }: { items: NavItem[] }) {
  if (items.length === 0) return null;
  return (
    <nav aria-label="Main" className="hidden lg:block" data-mega-root>
      <ul className="flex items-center gap-0.5">
        {items.map((item) => {
          const kids = children(item);
          const trigger =
            'inline-flex h-9 items-center gap-1 rounded-md px-3 text-small font-medium text-fg-muted transition-colors duration-fast hover:bg-surface-3 hover:text-fg-strong';
          if (kids.length === 0) {
            return (
              <li key={item.id}>
                <NavLink item={item} className={trigger} prefetch>
                  {item.label}
                  <StatusBadge status={item.status} />
                </NavLink>
              </li>
            );
          }
          const panelId = `mega-${item.id}`;
          return (
            <li key={item.id} className="mega-item relative" data-mega-item>
              <button type="button" className={trigger} aria-expanded="false" aria-controls={panelId} data-mega-trigger>
                {item.label}
                <ChevronDownGlyph size={14} strokeWidth={2} className="mega-chevron transition-transform duration-fast" />
              </button>
              <Panel item={item} panelId={panelId} />
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
