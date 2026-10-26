/**
 * Service template (SERVICE), with the worldwide variant. ARCH 8:
 *
 *   hero → richText "What we build" → diagram service-process → steps
 *   timeline → richText pricing model → entryGrid work examples (CASE_STUDY,
 *   if any) → faq → leadForm ("Quote lein")
 *
 * Title pattern: "{title} in Pakistan", or "{title} for Businesses
 * Worldwide" when data.areaServed is "worldwide" (`SERVICE:worldwide`).
 * Schema: WebPage + Service (provider = Organization, areaServed Pakistan or
 * Worldwide) + FAQPage.
 * Required links: solutions, /developers, integrations, contact.
 *
 * Under the hero: a facts strip from `data` (area served, pricing model,
 * timeline) and a jump link to the quote form when the page has one.
 */
import Link from 'next/link';
import type { CmsEntryType, EntryCard, PublicEntry } from '@/lib/cms/contract/cms-contract';
import { uiStrings } from '@/lib/i18n/ui';
import { CmsIcon } from '@/lib/icons';
import { liveLinks, loadCards } from '../core/data';
import { PageFrame } from '../core/frame';
import { LinkSections, NextSteps, relatedGroup, type LinkGroup } from '../core/parts';
import { BuildArt } from '../showcase/BuildArt';
import { ShowcaseBody } from '../showcase/ShowcaseBody';
import { Arrow } from '../core/ui';

function ServiceFacts({ entry }: { entry: PublicEntry }) {
  if (entry.data.type !== 'SERVICE') return null;
  const { areaServed, pricingModel, timeline } = entry.data;
  const t = uiStrings(entry.locale).pages.service;
  const form = entry.blocks.find((b) => b.type === 'leadForm');
  const formHref = form ? `#${form.anchor ?? `h-${form.id}`}` : null;
  const facts = [
    { icon: areaServed === 'worldwide' ? 'globe' : 'map-pin', label: t.areaServed, value: areaServed === 'worldwide' ? t.areaWorldwide : t.areaPakistan },
    pricingModel ? { icon: 'banknote', label: t.pricing, value: pricingModel } : null,
    timeline ? { icon: 'calendar-clock', label: t.timeline, value: timeline } : null,
  ].filter((f): f is { icon: string; label: string; value: string } => f !== null);

  return (
    <div className="mx-auto box-content max-w-container px-gutter">
      <div className="flex flex-col gap-4 rounded-xl border border-line bg-surface-2 p-5 md:flex-row md:items-center md:justify-between md:p-6">
        <dl className="grid gap-5 sm:grid-cols-3 md:flex md:flex-wrap md:gap-x-10">
          {facts.map((fact) => (
            <div key={fact.label} className="flex items-start gap-3">
              <CmsIcon name={fact.icon} size={18} className="mt-0.5 text-link" />
              <div>
                <dt className="text-eyebrow uppercase text-fg-subtle">{fact.label}</dt>
                <dd className="mt-1 text-small font-medium text-fg-strong">{fact.value}</dd>
              </div>
            </div>
          ))}
        </dl>
        {formHref ? (
          <Link href={formHref} className="group inline-flex shrink-0 items-center gap-1.5 text-small font-semibold text-link">
            {t.quote}
            <Arrow className="transition-transform duration-fast ease-out group-hover:translate-x-0.5" />
          </Link>
        ) : null}
      </div>
    </div>
  );
}

export async function ServiceTemplate({ entry }: { entry: PublicEntry }) {
  const ui = uiStrings(entry.locale);
  const t = ui.pages.service;
  const [links, siblings] = await Promise.all([
    liveLinks(['/services', '/solutions', '/integrations', '/developers', '/contact'], entry.locale),
    loadCards({ type: 'SERVICE', locale: entry.locale, limit: 6 }),
  ]);
  const link = (path: string, label: string) => {
    const href = links.get(path);
    return href ? { href, label } : undefined;
  };
  const byType = (type: CmsEntryType): EntryCard[] => [...(entry.tags[type] ?? []), ...entry.related.filter((c) => c.type === type)];

  const groups: LinkGroup[] = [
    { id: 'solutions', title: t.solutions, cards: byType('SOLUTION'), link: link('/solutions', t.allSolutions) },
    { id: 'integrations', title: t.integrations, cards: byType('INTEGRATION'), link: link('/integrations', t.allIntegrations) },
    { id: 'products', title: t.builtOn, cards: byType('PRODUCT') },
    { id: 'more-services', title: t.others, cards: siblings, link: link('/services', t.allServices) },
    relatedGroup(entry),
  ];

  return (
    <PageFrame entry={entry}>
      <ShowcaseBody
        entry={entry}
        afterHero={<ServiceFacts entry={entry} />}
        beforeEnd={<LinkSections groups={groups} exceptId={entry.id} />}
        kickers={{ featuresGrid: t.capabilities, steps: t.process, screenshot: t.inNafaa }}
        pill={entry.data.type === 'SERVICE' && entry.data.areaServed === 'worldwide' ? t.worldwidePill : t.pill}
        ctaFacts={[]}
        heroArt={entry.data.type === 'SERVICE' && entry.data.areaServed === 'worldwide' ? <BuildArt /> : undefined}
      />
      <NextSteps
        locale={entry.locale}
        links={[
          { path: '/contact', label: t.contact, icon: 'message-circle' },
          { path: '/developers', label: t.docs, icon: 'code-xml' },
          { path: '/services', label: t.allServices, icon: 'layout-grid' },
        ].flatMap(({ path, ...rest }) => {
          const href = links.get(path);
          return href ? [{ href, ...rest }] : [];
        })}
      />
    </PageFrame>
  );
}
