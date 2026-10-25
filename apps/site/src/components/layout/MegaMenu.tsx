/**
 * Desktop navigation with mega menu panels (server component).
 * The header's inner row is the positioning box, so panels centre on the page.
 *
 * Panel layouts follow the shape of the CMS `header` menu:
 * - columns: children that have their own children render as columns (group
 *   heading plus links). Links with a description get an icon tile and the
 *   description; groups whose links have no description (industry lists)
 *   render compact.
 * - rail: children without children that sit next to columns render in a
 *   side rail as highlighted cards (e.g. "FBR & PRA approved POS integrator").
 * - list: a panel with only leaf children renders them as a two-column list.
 * - The top-level item's own page becomes the "overview" link in the footer.
 *
 * Panels are positioned against the whole nav (the item is `static`), so a
 * wide panel stays centred under the header instead of under its trigger.
 * They open on hover and on keyboard focus with CSS only (theme.css);
 * MegaMenuController adds click/tap, Escape and outside-click handling.
 */
import { CmsIcon } from '@/lib/icons';
import { isAllowedIcon } from '@/lib/cms/contract/cms-contract';
import { cx } from '@/components/ui/cx';
import { ChevronDownGlyph } from './glyphs';
import { NavLink, StatusBadge } from './NavLink';
import { shellStrings } from '@/lib/i18n/shell';
import { children, hasHref, itemDescription, overviewLabel, type NavItem } from './nav';

function Tile({ icon, className }: { icon: string | undefined; className?: string }) {
  if (!icon || !isAllowedIcon(icon)) return null;
  return (
    <span
      aria-hidden
      className={cx(
        'mega-tile inline-flex shrink-0 items-center justify-center rounded-md bg-surface text-fg-muted ring-1 ring-inset ring-line-strong/70 transition-colors duration-fast',
        'group-hover/ml:bg-brand-700 group-hover/ml:text-white group-hover/ml:ring-brand-700 group-focus-visible/ml:bg-brand-700 group-focus-visible/ml:text-white',
        className,
      )}
    >
      <CmsIcon name={icon} size={16} />
    </span>
  );
}

function PanelLink({ item, locale }: { item: NavItem; locale?: string }) {
  const description = itemDescription(item);
  return (
    <NavLink
      item={item}
      className="group/ml flex items-start gap-3 rounded-lg p-2.5 outline-none transition-colors duration-fast hover:bg-surface-2 focus-visible:bg-surface-2"
    >
      <Tile icon={item.icon} className="size-9" />
      <span className="min-w-0 pt-px">
        <span className="flex items-center text-small font-medium text-fg-strong">
          {item.label}
          <StatusBadge item={item} locale={locale} />
        </span>
        {description ? <span className="mt-0.5 block text-[0.8125rem] leading-snug text-fg-subtle">{description}</span> : null}
      </span>
    </NavLink>
  );
}

function CompactLink({ item, locale }: { item: NavItem; locale?: string }) {
  return (
    <NavLink
      item={item}
      className="group/ml flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-small text-fg-muted outline-none transition-colors duration-fast hover:bg-surface-2 hover:text-fg-strong focus-visible:bg-surface-2"
    >
      {item.icon && isAllowedIcon(item.icon) ? (
        <CmsIcon name={item.icon} size={15} className="shrink-0 text-fg-subtle transition-colors group-hover/ml:text-link" />
      ) : null}
      <span className="truncate">{item.label}</span>
      <StatusBadge item={item} locale={locale} />
    </NavLink>
  );
}

function RailCard({ item, index, locale }: { item: NavItem; index: number; locale?: string }) {
  const description = itemDescription(item);
  return (
    <NavLink
      item={item}
      className={cx(
        'mega-rail group/ml relative isolate flex flex-col overflow-hidden rounded-lg border border-line p-4 outline-none transition-[border-color,transform] duration-base ease-out hover:-translate-y-px hover:border-brand-500/40 focus-visible:border-brand-500',
        index === 0 ? 'mega-rail-brand' : 'mega-rail-soft',
      )}
    >
      {item.icon && isAllowedIcon(item.icon) ? (
        <span aria-hidden className="inline-flex size-9 items-center justify-center rounded-md bg-brand-700 text-white shadow-e1">
          <CmsIcon name={item.icon} size={18} />
        </span>
      ) : null}
      <span className="mt-3 text-small font-semibold text-fg-strong">{item.label}</span>
      {description ? <span className="mt-1 text-[0.8125rem] leading-snug text-fg-muted">{description}</span> : null}
      <span aria-hidden className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-link">
        {shellStrings(locale).learnMore}
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" className="transition-transform duration-fast group-hover/ml:translate-x-0.5">
          <path d="M5 12h14M13 6l6 6-6 6" />
        </svg>
      </span>
    </NavLink>
  );
}

function Panel({ item, panelId, locale }: { item: NavItem; panelId: string; locale?: string }) {
  const kids = children(item);
  const groups = kids.filter((kid) => children(kid).length > 0);
  const rail = groups.length ? kids.filter((kid) => children(kid).length === 0) : [];
  const compact = groups.length > 0 && groups.every((g) => children(g).every((l) => !l.description));
  const columns = Math.min(groups.length, 3);

  const width = groups.length
    ? compact
      ? rail.length
        ? 'w-[min(64rem,calc(100vw-3rem))]'
        : 'w-[min(52rem,calc(100vw-3rem))]'
      : rail.length
        ? columns >= 3
          ? 'w-[min(68rem,calc(100vw-3rem))]'
          : 'w-[min(58rem,calc(100vw-3rem))]'
        : columns >= 3
          ? 'w-[min(60rem,calc(100vw-3rem))]'
          : 'w-[min(42rem,calc(100vw-3rem))]'
    : 'w-[min(38rem,calc(100vw-3rem))]';

  return (
    <div id={panelId} className="mega-panel absolute left-1/2 top-full z-40 pt-2.5">
      <div className={cx('mega-sheet overflow-hidden rounded-xl border border-line bg-surface shadow-e3', width)}>
        {groups.length ? (
          <div className={cx('grid', rail.length ? 'grid-cols-[minmax(0,1fr)_15.5rem]' : 'grid-cols-1')}>
            <div className={cx('grid gap-x-3 gap-y-5 p-4', columns === 3 ? 'grid-cols-3' : columns === 2 ? 'grid-cols-2' : 'grid-cols-1')}>
              {groups.map((group) => (
                <div key={group.id} className="min-w-0">
                  <p className="px-2.5 pb-1.5 text-eyebrow uppercase text-fg-subtle">
                    {hasHref(group) ? (
                      <NavLink item={group} className="hover:text-fg-strong">
                        {group.label}
                      </NavLink>
                    ) : (
                      group.label
                    )}
                  </p>
                  <ul className={compact ? 'space-y-px' : 'space-y-0.5'}>
                    {children(group).map((link) => (
                      <li key={link.id}>{compact ? <CompactLink item={link} locale={locale} /> : <PanelLink item={link} locale={locale} />}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            {rail.length ? (
              <div className="flex flex-col gap-3 border-s border-line bg-surface-2/70 p-4">
                {rail.map((link, i) => (
                  <RailCard key={link.id} item={link} index={i} locale={locale} />
                ))}
              </div>
            ) : null}
          </div>
        ) : (
          <ul className="grid grid-cols-2 gap-1 p-3">
            {kids.map((link) => (
              <li key={link.id}>
                <PanelLink item={link} locale={locale} />
              </li>
            ))}
          </ul>
        )}
        {hasHref(item) ? (
          <div className="flex items-center justify-between gap-4 border-t border-line bg-surface-2/60 px-5 py-3">
            <NavLink item={item} className="group/ov inline-flex items-center gap-1.5 text-small font-medium text-fg-strong hover:text-link">
              {overviewLabel(item.label, locale)}
              <svg aria-hidden width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transition-transform duration-fast group-hover/ov:translate-x-0.5">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </NavLink>
            {item.description ? <span className="truncate text-xs text-fg-subtle">{itemDescription(item)}</span> : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function MegaMenu({ items, locale }: { items: NavItem[]; locale?: string }) {
  if (items.length === 0) return null;
  return (
    <nav aria-label={shellStrings(locale).mainNav} className="hidden lg:block" data-mega-root>
      <ul className="flex items-center">
        {items.map((item) => {
          const kids = children(item);
          const trigger =
            'mega-trigger inline-flex h-9 items-center gap-0.5 rounded-md px-2 text-small font-medium text-fg-muted transition-colors duration-fast hover:text-fg-strong 2xl:px-2.5';
          if (kids.length === 0) {
            return (
              <li key={item.id}>
                <NavLink item={item} className={cx(trigger, 'hover:bg-surface-3')} prefetch>
                  {item.label}
                  <StatusBadge item={item} locale={locale} />
                </NavLink>
              </li>
            );
          }
          const panelId = `mega-${item.id}`;
          return (
            <li key={item.id} className="mega-item" data-mega-item>
              <button type="button" className={trigger} aria-expanded="false" aria-controls={panelId} data-mega-trigger>
                {item.label}
                <ChevronDownGlyph size={13} strokeWidth={2} className="mega-chevron text-fg-subtle transition-transform duration-base" />
              </button>
              <Panel item={item} panelId={panelId} locale={locale} />
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
