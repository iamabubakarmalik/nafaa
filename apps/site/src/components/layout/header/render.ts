/**
 * Server-side HTML for the desktop navigation (triggers and mega panels).
 *
 * The panels hold about a hundred links and every page carries them, so
 * they are written as one lean HTML string instead of React elements: the
 * string goes into the page once as HTML and once in the RSC payload, with
 * no per-element JSON. Attributes are unquoted where that is valid, links
 * carry no classes (header.css styles them by position), and icons are only
 * named (`data-i`). HeaderBehavior adds the icons from the sprite and the
 * feature images the first time the menu is used.
 *
 * All links stay in the server HTML, so crawlers and no-JS readers see them.
 */
import type { HeaderColumn, HeaderEntry, HeaderLink, HeaderPanel } from './model';

const TEXT = /[&<>]/g;
const TEXT_MAP: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;' };

function text(value: string): string {
  return value.replace(TEXT, (c) => TEXT_MAP[c]!);
}

/** An attribute value: bare when HTML allows it, quoted otherwise. */
function attr(value: string): string {
  if (/^[^\s"'=<>`&]+$/.test(value)) return value;
  return `"${value.replace(/&/g, '&amp;').replace(/"/g, '&quot;')}"`;
}

function anchor(link: HeaderLink, inner: string, extra = ''): string {
  const rel = link.external ? ' rel=noopener' : '';
  return `<a href=${attr(link.href)}${rel}${extra}>${inner}</a>`;
}

function badge(link: HeaderLink): string {
  return link.badge ? `<em>${text(link.badge)}</em>` : '';
}

function richLink(link: HeaderLink): string {
  const icon = link.icon ? ` data-i=${attr(link.icon)}` : '';
  const description = link.description ? `<span>${text(link.description)}</span>` : '';
  return anchor(link, `${text(link.label)}${badge(link)}${description}`, icon);
}

function compactLink(link: HeaderLink): string {
  return anchor(link, `${text(link.label)}${badge(link)}`);
}

function tileLink(link: HeaderLink): string {
  const icon = link.icon ? ` data-i=${attr(link.icon)}` : '';
  return anchor(link, text(link.label), icon);
}

function column(col: HeaderColumn): string {
  const heading = col.label ? `<p>${col.href ? anchor({ label: col.label, href: col.href }, text(col.label)) : text(col.label)}</p>` : '';
  const render = col.kind === 'rich' ? richLink : col.kind === 'grid' ? tileLink : compactLink;
  // A long list of described links spreads over two columns.
  const wide = col.kind === 'rich' && col.links.length > 5 ? ' data-w=2' : '';
  return `<div class=hg data-k=${col.kind}${wide}>${heading}${col.links.map(render).join('')}</div>`;
}

function featured(panel: HeaderPanel): string {
  const f = panel.featured;
  if (!f) return '';
  const img = f.image ? `<img alt="" width=640 height=400 decoding=async data-src=${attr(f.image)}>` : '';
  const description = f.description ? `<span>${text(f.description)}</span>` : '';
  return anchor(f, `${img}<b>${text(f.label)}</b>${description}`, ' class=hf');
}

function footer(panel: HeaderPanel): string {
  const overview = panel.overview ? anchor(panel.overview, text(panel.overview.label), ' class=ho') : '';
  const strip = panel.strip?.links.length
    ? `${panel.strip.label ? `<p>${text(panel.strip.label)}</p>` : '<p></p>'}${panel.strip.links.map(compactLink).join('')}`
    : '';
  return overview || strip ? `<div class=hx>${overview}${strip}</div>` : '';
}

function panelHtml(panel: HeaderPanel): string {
  const id = `hp-${panel.key}`;
  const span = panel.columns.reduce((n, c) => n + (c.kind === 'rich' && c.links.length > 5 ? 2 : 1), 0);
  return (
    `<li class=hi data-p=${attr(panel.key)}>` +
    `<button type=button class=ht aria-expanded=false aria-controls=${attr(id)}>${text(panel.label)}</button>` +
    `<div class=hp id=${attr(id)} data-k=${attr(panel.key)}><div class=hs>` +
    `<div class=hb${panel.featured ? '' : ' data-nf'}><div class=hc data-n=${span}>${panel.columns.map(column).join('')}</div>${featured(panel)}</div>` +
    `${footer(panel)}</div></div></li>`
  );
}

/** The desktop navigation list as HTML. */
export function navHtml(entries: HeaderEntry[]): string {
  const items = entries.map((entry) =>
    entry.kind === 'panel' ? panelHtml(entry.panel) : `<li class=hi>${anchor(entry.link, `${text(entry.link.label)}${badge(entry.link)}`, ' class=ht')}</li>`,
  );
  return `<ul class=hn>${items.join('')}</ul>`;
}
