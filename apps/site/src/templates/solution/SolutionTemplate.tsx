/**
 * Solution template (SOLUTION). ARCH 8:
 *
 *   hero → answerBox → featuresGrid "What you get" → diagram "How it scales"
 *   → richText example → faq
 *
 * Title pattern: "{title} Software in Pakistan: {data.outcome}".
 * Schema: WebPage + SoftwareApplication (offers from Plan) + FAQPage.
 * Required links: products, matching industries, services, pricing and the
 * contact page (published ones only).
 */
import type { CmsEntryType, EntryCard, PublicEntry } from '@/lib/cms/contract/cms-contract';
import { livePaths, loadCards, loadPlans } from '../core/data';
import { PageFrame } from '../core/frame';
import { LinkSections, NextSteps, type LinkGroup } from '../core/parts';
import { ShowcaseBody } from '../showcase/ShowcaseBody';
import { IndustryMarquee, TrustRibbon } from '../showcase/kit';

export async function SolutionTemplate({ entry }: { entry: PublicEntry }) {
  const [plans, live, siblings] = await Promise.all([
    loadPlans(),
    livePaths(['/solutions', '/pricing', '/contact', '/services']),
    loadCards({ type: 'SOLUTION', limit: 6 }),
  ]);
  const industries = await loadCards({ type: 'INDUSTRY', limit: 40 });
  const byType = (type: CmsEntryType): EntryCard[] => [...(entry.tags[type] ?? []), ...entry.related.filter((c) => c.type === type)];

  const groups: LinkGroup[] = [
    { id: 'products', title: 'Products in this setup', cards: byType('PRODUCT') },
    { id: 'industries', title: 'Industries it fits', cards: byType('INDUSTRY'), columns: 4 },
    { id: 'integrations', title: 'Integrations', cards: byType('INTEGRATION') },
    { id: 'services', title: 'Services that help', cards: byType('SERVICE'), link: live.has('/services') ? { href: '/services', label: 'All services' } : undefined },
    { id: 'more-solutions', title: 'Other solutions', cards: siblings, link: live.has('/solutions') ? { href: '/solutions', label: 'All solutions' } : undefined },
  ];

  return (
    <PageFrame entry={entry} plans={plans}>
      <ShowcaseBody
        entry={entry}
        afterHero={
          <>
            <TrustRibbon className="mb-12" />
            <IndustryMarquee cards={industries} title={`Runs ${industries.length} kinds of business on one platform`} link={live.has('/industries') ? { href: '/industries', label: 'All industries' } : undefined} />
          </>
        }
        beforeEnd={<LinkSections groups={groups} exceptId={entry.id} />}
        kickers={{ featuresGrid: 'Capabilities', steps: 'How it runs', screenshot: 'Inside the app' }}
        pill="Solution"
      />
      <NextSteps
        links={[
          { href: '/pricing', label: 'See pricing', icon: 'tag' },
          { href: '/contact', label: 'Talk to the team', icon: 'message-circle' },
          { href: '/solutions', label: 'All solutions', icon: 'layout-grid' },
        ].filter((link) => live.has(link.href))}
      />
    </PageFrame>
  );
}
