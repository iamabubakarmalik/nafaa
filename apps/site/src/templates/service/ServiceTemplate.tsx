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
import { CmsIcon } from '@/lib/icons';
import { livePaths, loadCards } from '../core/data';
import { PageFrame } from '../core/frame';
import { LinkSections, NextSteps, type LinkGroup } from '../core/parts';
import { StandardBody } from '../core/Standard';
import { Arrow } from '../core/ui';

function ServiceFacts({ entry }: { entry: PublicEntry }) {
  if (entry.data.type !== 'SERVICE') return null;
  const { areaServed, pricingModel, timeline } = entry.data;
  const form = entry.blocks.find((b) => b.type === 'leadForm');
  const formHref = form ? `#${form.anchor ?? `h-${form.id}`}` : null;
  const facts = [
    { icon: areaServed === 'worldwide' ? 'globe' : 'map-pin', label: 'Area served', value: areaServed === 'worldwide' ? 'Pakistan and worldwide' : 'Pakistan' },
    pricingModel ? { icon: 'banknote', label: 'Pricing', value: pricingModel } : null,
    timeline ? { icon: 'calendar-clock', label: 'Timeline', value: timeline } : null,
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
            Quote lein
            <Arrow className="transition-transform duration-fast ease-out group-hover:translate-x-0.5" />
          </Link>
        ) : null}
      </div>
    </div>
  );
}

export async function ServiceTemplate({ entry }: { entry: PublicEntry }) {
  const [live, siblings] = await Promise.all([
    livePaths(['/services', '/solutions', '/integrations', '/developers', '/contact']),
    loadCards({ type: 'SERVICE', limit: 6 }),
  ]);
  const byType = (type: CmsEntryType): EntryCard[] => [...(entry.tags[type] ?? []), ...entry.related.filter((c) => c.type === type)];

  const groups: LinkGroup[] = [
    { id: 'solutions', title: 'Solutions', cards: byType('SOLUTION'), link: live.has('/solutions') ? { href: '/solutions', label: 'All solutions' } : undefined },
    { id: 'integrations', title: 'Integrations', cards: byType('INTEGRATION'), link: live.has('/integrations') ? { href: '/integrations', label: 'All integrations' } : undefined },
    { id: 'products', title: 'Built on Nafaa', cards: byType('PRODUCT') },
    { id: 'more-services', title: 'Other services', cards: siblings, link: live.has('/services') ? { href: '/services', label: 'All services' } : undefined },
  ];

  return (
    <PageFrame entry={entry}>
      <StandardBody entry={entry} afterHero={<ServiceFacts entry={entry} />} beforeEnd={<LinkSections groups={groups} exceptId={entry.id} />} />
      <NextSteps
        links={[
          { href: '/contact', label: 'Contact the team', icon: 'message-circle' },
          { href: '/developers', label: 'Developer docs', icon: 'code-xml' },
          { href: '/services', label: 'All services', icon: 'layout-grid' },
        ].filter((link) => live.has(link.href))}
      />
    </PageFrame>
  );
}
