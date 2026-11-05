/**
 * Header navigation model: turns the CMS `header` menu into the five
 * primary sections the header shows (Products, Solutions, Industries,
 * Resources, Pricing).
 *
 * The CMS menu may still carry the older top-level items (Marketplace,
 * Services, Developers). They are folded in by id so every destination
 * stays reachable:
 * - Services becomes a compact column in Solutions;
 * - Developers becomes the link strip under Products;
 * - Marketplace links already live in Products and Solutions, and any that
 *   do not are added to the Products strip.
 * Unknown top-level items an editor adds are kept as their own section.
 *
 * Links are de-duplicated by path, in the order the sections are built,
 * except featured cards, which may repeat a link on purpose.
 */
import type { NavItem } from '../nav';
import { children, hasHref, itemDescription, itemStatus, overviewLabel, statusLabel } from '../nav';
import { shellStrings, type SiteLocale } from '@/lib/i18n/shell';

export interface HeaderLink {
  label: string;
  href: string;
  description?: string;
  icon?: string;
  badge?: string;
  external?: boolean;
}

export interface HeaderColumn {
  key: string;
  label: string;
  href?: string;
  /** rich: icon, label and description; compact: label only; grid: icon tiles (industries). */
  kind: 'rich' | 'compact' | 'grid';
  links: HeaderLink[];
}

export interface HeaderPanel {
  key: string;
  label: string;
  columns: HeaderColumn[];
  /** Overview link in the panel footer (the section's own page). */
  overview?: HeaderLink;
  /** Secondary links in the panel footer. */
  strip?: { label: string; links: HeaderLink[] };
  featured?: HeaderLink & { image?: string };
}

export type HeaderEntry = { kind: 'link'; link: HeaderLink } | { kind: 'panel'; panel: HeaderPanel };

/** Industries shown first in the Industries panel (most used trades first). */
const TOP_TRADES = [
  'kiryana',
  'bakery',
  'pharmacy',
  'mobile-shop',
  'garments',
  'restaurant',
  'hardware',
  'cosmetics',
  'electronics',
  'autoparts',
  'salon',
  'jewelry',
];
const TOP_TRADE_COUNT = 12;

/** Panels that have a designed feature image in public/menu (`<key>-<locale>.webp`). */
const IMAGES = new Set(['products', 'solutions', 'industries', 'resources']);

const FOLDED = new Set(['marketplace', 'services', 'developers']);

function cmsPath(href: string): string {
  return href.replace(/^\/ur(?=\/|$)/, '') || '/';
}

class Builder {
  private used = new Set<string>();
  constructor(readonly locale: SiteLocale) {}

  /** A menu item as a header link, or null when it has no page or its path is already shown. */
  link(item: NavItem, { allowRepeat = false }: { allowRepeat?: boolean } = {}): HeaderLink | null {
    if (!hasHref(item)) return null;
    const key = cmsPath(item.href);
    if (!allowRepeat) {
      if (this.used.has(key)) return null;
      this.used.add(key);
    }
    const status = itemStatus(item);
    return {
      label: item.label,
      href: item.href,
      description: itemDescription(item),
      icon: item.icon,
      badge: status ? (statusLabel(status, this.locale) ?? undefined) : undefined,
      external: item.external === true || /^https?:\/\//.test(item.href) ? true : undefined,
    };
  }

  links(items: NavItem[]): HeaderLink[] {
    return items.map((item) => this.link(item)).filter((l): l is HeaderLink => l !== null);
  }

  /** Reserve a path without showing it (overview links shown in the panel footer). */
  claim(href: string) {
    this.used.add(cmsPath(href));
  }
}

function groupsOf(item: NavItem) {
  const kids = children(item);
  return {
    groups: kids.filter((kid) => children(kid).length > 0),
    rail: kids.filter((kid) => children(kid).length === 0),
  };
}

function image(key: string, locale: SiteLocale): string | undefined {
  return IMAGES.has(key) ? `/menu/${key}-${locale}.webp` : undefined;
}

function featuredFrom(b: Builder, item: NavItem | undefined, key: string): HeaderPanel['featured'] {
  if (!item) return undefined;
  const link = b.link(item, { allowRepeat: true });
  return link ? { ...link, image: image(key, b.locale) } : undefined;
}

function overviewOf(b: Builder, item: NavItem, label?: string): HeaderLink | undefined {
  if (!hasHref(item)) return undefined;
  b.claim(item.href);
  return { label: label ?? overviewLabel(item.label, b.locale), href: item.href };
}

/** A section whose groups become columns; its first rail item becomes the featured card. */
function columnsPanel(b: Builder, item: NavItem, key = item.id): { panel: HeaderPanel; extras: NavItem[] } {
  const { groups, rail } = groupsOf(item);
  const overview = overviewOf(b, item);
  if (!groups.length) {
    return { panel: { key, label: item.label, overview, columns: [{ key: `${key}-links`, label: '', kind: 'rich', links: b.links(rail) }] }, extras: [] };
  }
  const featured = featuredFrom(b, rail[0], key);
  const columns: HeaderColumn[] = groups.map((group) => ({
    key: group.id,
    label: group.label,
    href: hasHref(group) ? group.href : undefined,
    kind: children(group).some((l) => l.description) ? 'rich' : 'compact',
    links: b.links(children(group)),
  }));
  return { panel: { key, label: item.label, overview, columns, featured }, extras: rail.slice(1) };
}

/** Adds links to a panel's footer strip (skipping paths already shown). */
function addToStrip(b: Builder, panel: HeaderPanel, items: NavItem[], label = '') {
  const links = b.links(items);
  if (!links.length) return;
  panel.strip = { label: panel.strip?.label || label, links: [...(panel.strip?.links ?? []), ...links] };
}

function industriesPanel(b: Builder, item: NavItem): HeaderPanel {
  const t = shellStrings(b.locale);
  const { groups, rail } = groupsOf(item);
  const all = groups.flatMap((g) => children(g));
  const slug = (i: NavItem) => i.href.split('/').pop() ?? '';
  const rank = (i: NavItem) => {
    const at = TOP_TRADES.indexOf(slug(i));
    return at === -1 ? TOP_TRADES.length : at;
  };
  const top = [...all].sort((a, c) => rank(a) - rank(c)).slice(0, TOP_TRADE_COUNT);
  return {
    key: 'industries',
    label: item.label,
    overview: overviewOf(b, item, t.allIndustries),
    columns: [{ key: 'industries-top', label: t.topTrades, kind: 'grid', links: b.links(top) }],
    featured: featuredFrom(b, rail[0], 'industries'),
  };
}

/** The header sections, built from the CMS header menu (and the footer menu for links it lacks). */
export function headerModel(header: NavItem[], footer: NavItem[], locale: SiteLocale): HeaderEntry[] {
  const b = new Builder(locale);
  const t = shellStrings(locale);
  const byId = new Map(header.map((item) => [item.id, item]));
  const products = byId.get('products');
  const solutions = byId.get('solutions');
  const industries = byId.get('industries');
  const resources = byId.get('resources');
  const services = byId.get('services');
  const developers = byId.get('developers');
  const marketplace = byId.get('marketplace');

  const panels = new Map<string, HeaderPanel>();

  const extras = new Map<string, NavItem[]>();
  const add = (key: string, built: { panel: HeaderPanel; extras: NavItem[] }) => {
    panels.set(key, built.panel);
    extras.set(key, built.extras);
  };

  if (products) add('products', columnsPanel(b, products, 'products'));

  if (solutions) {
    const built = columnsPanel(b, solutions, 'solutions');
    const panel = built.panel;
    if (services) {
      const { groups, rail } = groupsOf(services);
      if (hasHref(services)) b.claim(services.href);
      const links = b.links([...groups.flatMap((g) => children(g)), ...rail]);
      if (links.length) {
        panel.columns.push({ key: 'services', label: services.label, href: hasHref(services) ? services.href : undefined, kind: 'compact', links });
      }
    }
    add('solutions', built);
  }

  if (industries) panels.set('industries', industriesPanel(b, industries));

  if (resources) {
    const built = columnsPanel(b, resources, 'resources');
    const panel = built.panel;
    // Roman Urdu guides sit in the footer menu only; the Learn column gets them too.
    const learn = panel.columns[0];
    const roman = footer.flatMap((g) => children(g)).find((i) => cmsPath(i.href) === '/hisaab-kitaab');
    if (learn && roman) {
      const link = b.link({ ...roman, icon: roman.icon ?? 'languages', description: roman.description ?? t.romanGuidesDescription });
      if (link) learn.links.push(link);
    }
    // Two columns of links; a third group (Company) moves to the footer strip.
    if (panel.columns.length > 2) {
      const rest = panel.columns.splice(2);
      panel.strip = { label: rest[0]!.label, links: rest.flatMap((c) => c.links) };
    }
    // Help center is the featured card (resources has no rail item of its own).
    if (!panel.featured) {
      const help = children(resources)
        .flatMap((g) => children(g))
        .find((i) => cmsPath(i.href) === '/help');
      panel.featured = featuredFrom(b, help, 'resources');
    }
    add('resources', built);
  }

  // Developers (and marketplace links not shown elsewhere) under Products.
  const productsPanel = panels.get('products');
  if (productsPanel) {
    const dev = developers ? [...children(developers), ...(hasHref(developers) ? [{ ...developers, children: undefined }] : [])] : [];
    const market = marketplace ? groupsOf(marketplace).groups.flatMap((g) => children(g)) : [];
    addToStrip(b, productsPanel, [...dev, ...market], t.developersStrip);
  }
  // Remaining rail cards (after each featured one) go to their panel's strip.
  for (const [key, items] of extras) {
    const panel = panels.get(key);
    if (panel) addToStrip(b, panel, items);
  }

  const out: HeaderEntry[] = [];
  for (const item of header) {
    if (FOLDED.has(item.id)) continue;
    const panel = panels.get(item.id);
    if (panel) {
      out.push({ kind: 'panel', panel });
    } else if (children(item).length) {
      const built = columnsPanel(b, item);
      addToStrip(b, built.panel, built.extras);
      out.push({ kind: 'panel', panel: built.panel });
    } else {
      const link = b.link(item, { allowRepeat: true });
      if (link) out.push({ kind: 'link', link });
    }
  }
  return out;
}
