/**
 * Template parts used by the entry templates (product, industry, solution,
 * service, hub): the breadcrumb + freshness row, the feature-status notice,
 * and the internal-link sections each template's SEO spec requires. Every
 * template ends its link sections with `relatedGroup`, so each RELATED
 * relation the editor sets is rendered as a link somewhere on the page.
 */
import Link from 'next/link';
import { PageBreadcrumbs } from '@/components/layout/Breadcrumbs';
import { cx } from '@/components/ui/cx';
import { FEATURE_STATUS_BADGES, featureStatusOf, type Breadcrumb, type EntryCard, type PublicEntry } from '@/lib/cms/contract/cms-contract';
import { DEFAULT_LOCALE } from '@/lib/cms/locale';
import { uiStrings } from '@/lib/i18n/ui';
import { CmsIcon } from '@/lib/icons';
import { statusBadge, strings as blockStrings } from '@/components/blocks/lib/i18n';
import { Arrow, TileSection, Updated, uniqueCards } from './ui';

/**
 * The visible trail in the page's language: on a non-English page the home
 * crumb the API names "Home" gets the localized word. English is unchanged.
 */
export function localCrumbs(entry: Pick<PublicEntry, 'breadcrumbs' | 'locale'>): readonly Breadcrumb[] {
  if (entry.locale === DEFAULT_LOCALE) return entry.breadcrumbs;
  const home = uiStrings(entry.locale).homeCrumb;
  return entry.breadcrumbs.map((crumb, i) => (i === 0 && crumb.name === 'Home' ? { ...crumb, name: home } : crumb));
}

/** Breadcrumbs at the start, "Updated {date}" at the end (not on PAGE entries other than legal). */
export function MetaRow({ entry, showUpdated = true }: { entry: PublicEntry; showUpdated?: boolean }) {
  if (entry.breadcrumbs.length < 2 && !showUpdated) return null;
  return (
    <div className="mx-auto box-content max-w-wide px-gutter pt-6">
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
        <PageBreadcrumbs crumbs={localCrumbs(entry)} />
        {showUpdated ? <Updated date={entry.dateModified} locale={entry.locale} /> : null}
      </div>
    </div>
  );
}

/** "Beta" / "Coming soon" notice under the breadcrumbs (owner rule: never shown as live). */
export function StatusNotice({ entry }: { entry: PublicEntry }) {
  const status = featureStatusOf(entry.type, entry.data);
  if (!status || status === 'live') return null;
  const coming = status === 'coming';
  const label = FEATURE_STATUS_BADGES[status];
  const t = uiStrings(entry.locale);
  const english = entry.locale === DEFAULT_LOCALE;
  return (
    <div className="mx-auto box-content max-w-wide px-gutter pt-4">
      <div
        role="note"
        className={cx(
          'flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border px-4 py-3 text-small',
          coming
            ? 'border-amber-300/60 bg-amber-50 text-amber-900 ink:border-amber-400/30 ink:bg-amber-400/10 ink:text-amber-200'
            : 'border-sky-300/60 bg-sky-50 text-sky-900 ink:border-sky-400/30 ink:bg-sky-400/10 ink:text-sky-200',
        )}
      >
        <CmsIcon name={coming ? 'hourglass' : 'flag'} size={16} />
        {english ? (
          <strong className="font-semibold">
            {label.en} <span className="font-normal opacity-80">· {label.ur}</span>
          </strong>
        ) : (
          <strong className="font-semibold">{statusBadge(status, entry.locale)}</strong>
        )}
        <span>{coming ? t.comingNote : t.betaNote}</span>
        <Link href="/roadmap" prefetch={false} className="ms-auto inline-flex items-center gap-1 font-medium underline decoration-current/30 underline-offset-2">
          {t.seeRoadmap} <Arrow />
        </Link>
      </div>
    </div>
  );
}

export interface LinkGroup {
  id: string;
  title: string;
  intro?: string;
  cards: readonly EntryCard[];
  link?: { href: string; label: string };
  columns?: 2 | 3 | 4;
}

/** The template's internal-link sections, in order; empty groups render nothing. */
export function LinkSections({ groups, exceptId }: { groups: LinkGroup[]; exceptId: string }) {
  const seen = new Set<string>([exceptId]);
  return (
    <>
      {groups.map((group) => {
        const cards = uniqueCards(group.cards).filter((c) => (seen.has(c.id) ? false : (seen.add(c.id), true)));
        return <TileSection key={group.id} id={group.id} title={group.title} intro={group.intro} cards={cards} link={group.link} columns={group.columns} />;
      })}
    </>
  );
}

/** True when the editor placed a relatedLinks block for the RELATED list; the block then renders those links. */
export function rendersRelatedBlock(entry: Pick<PublicEntry, 'blocks'>): boolean {
  return entry.blocks.some((block) => block.type === 'relatedLinks' && block.source === 'related');
}

/**
 * The entry's RELATED cards as the last link group. LinkSections skips cards
 * an earlier group already shows, so this renders only the relations the
 * template's typed groups leave out (glossary terms, posts, services, ...).
 */
export function relatedGroup(entry: PublicEntry): LinkGroup {
  return { id: 'related-pages', title: blockStrings(entry.locale).relatedHeading, cards: rendersRelatedBlock(entry) ? [] : entry.related };
}

/** "Related" tiles for templates without their own link groups (default, legal, contact, hub, roadmap). */
export function RelatedPages({ entry }: { entry: PublicEntry }) {
  return <LinkSections groups={[relatedGroup(entry)]} exceptId={entry.id} />;
}

/** A quiet row of next-step links (pricing, demo, hub) closing a page. */
export function NextSteps({ links, locale }: { links: { href: string; label: string; icon: string }[]; locale?: string }) {
  if (!links.length) return null;
  return (
    <nav aria-label={uiStrings(locale).nextSteps} className="border-t border-line">
      <div className="mx-auto box-content max-w-container px-gutter">
        <ul className="flex flex-wrap gap-x-8 gap-y-3 py-8">
          {links.map((link) => (
            <li key={link.href}>
              <Link href={link.href} prefetch={false} className="group inline-flex items-center gap-2 text-small font-medium text-fg-muted transition-colors duration-fast hover:text-fg-strong">
                <CmsIcon name={link.icon} size={16} className="text-link" />
                {link.label}
                <Arrow className="opacity-0 transition-[opacity,transform] duration-fast ease-out group-hover:translate-x-0.5 group-hover:opacity-100" />
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}

