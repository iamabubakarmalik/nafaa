/**
 * Server-side HTML for the footer link columns.
 *
 * Every page carries about sixty footer links, so they are written as one
 * lean HTML string, like the header panels (header/render.ts): the links go
 * into the page once as HTML and once in the RSC payload as a single string,
 * with no per-link JSON, no next/link island to hydrate, and no repeated
 * utility classes (footer.css styles the links by position). The links are
 * plain anchors: all of them stay in the server HTML for crawlers and no-JS
 * readers.
 */
import { attr, text } from './header/render';
import { children, isExternalHref, itemStatus, statusLabel, type NavItem } from './nav';

/** The classes StatusBadge gives ui/Badge: base, tone ("info" or "warning"), then its own. */
const BADGE = 'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium leading-5 ring-1 ring-inset';
const BADGE_OWN = 'ms-1.5 !px-1.5 !py-0 text-[0.6875rem]';
const BADGE_TONE = {
  info: 'bg-sky-50 text-sky-800 ring-sky-600/20 ink:bg-sky-400/10 ink:text-sky-300 ink:ring-sky-400/25',
  warning: 'bg-amber-50 text-amber-800 ring-amber-600/25 ink:bg-amber-400/10 ink:text-amber-300 ink:ring-amber-400/25',
};

function badge(item: NavItem, locale: string): string {
  const status = itemStatus(item);
  const label = status ? statusLabel(status, locale) : null;
  if (!label) return '';
  return `<span class="${BADGE} ${status === 'coming' ? BADGE_TONE.warning : BADGE_TONE.info} ${BADGE_OWN}">${text(label)}</span>`;
}

function link(item: NavItem, locale: string): string {
  const rel = isExternalHref(item) ? ' rel=noopener' : '';
  return `<li><a href=${attr(item.href)}${rel}>${text(item.label)}${badge(item, locale)}</a></li>`;
}

/** The footer menu as columns: each top-level item is a column of its children (or of itself). */
export function footerNavHtml(columns: NavItem[], locale: string): string {
  return columns
    .map((column) => {
      const links = children(column);
      return `<div><p>${text(column.label)}</p><ul>${(links.length ? links : [column]).map((item) => link(item, locale)).join('')}</ul></div>`;
    })
    .join('');
}
