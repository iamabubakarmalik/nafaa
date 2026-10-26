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
import { uiStrings } from '@/lib/i18n/ui';
import { liveLinks, loadCards, loadPlans } from '../core/data';
import { PageFrame } from '../core/frame';
import { LinkSections, NextSteps, relatedGroup, type LinkGroup } from '../core/parts';
import { ShowcaseBody } from '../showcase/ShowcaseBody';
import { IndustryMarquee, TrustRibbon } from '../showcase/kit';

export async function SolutionTemplate({ entry }: { entry: PublicEntry }) {
  const ui = uiStrings(entry.locale);
  const t = ui.pages.solution;
  const [plans, links, siblings] = await Promise.all([
    loadPlans(),
    liveLinks(['/solutions', '/pricing', '/contact', '/services', '/industries'], entry.locale),
    loadCards({ type: 'SOLUTION', locale: entry.locale, limit: 6 }),
  ]);
  const industries = await loadCards({ type: 'INDUSTRY', locale: entry.locale, limit: 40 });
  const link = (path: string, label: string) => {
    const href = links.get(path);
    return href ? { href, label } : undefined;
  };
  const byType = (type: CmsEntryType): EntryCard[] => [...(entry.tags[type] ?? []), ...entry.related.filter((c) => c.type === type)];

  const groups: LinkGroup[] = [
    { id: 'products', title: t.products, cards: byType('PRODUCT') },
    { id: 'industries', title: t.industries, cards: byType('INDUSTRY'), columns: 4 },
    { id: 'integrations', title: t.integrations, cards: byType('INTEGRATION') },
    { id: 'services', title: t.services, cards: byType('SERVICE'), link: link('/services', t.allServices) },
    { id: 'more-solutions', title: t.others, cards: siblings, link: link('/solutions', t.allSolutions) },
    relatedGroup(entry),
  ];

  return (
    <PageFrame entry={entry} plans={plans}>
      <ShowcaseBody
        entry={entry}
        afterHero={
          <>
            <TrustRibbon locale={entry.locale} className="mb-12" />
            <IndustryMarquee cards={industries} title={t.runsKinds(industries.length)} link={link('/industries', ui.allIndustries)} />
          </>
        }
        beforeEnd={<LinkSections groups={groups} exceptId={entry.id} />}
        kickers={{ featuresGrid: t.capabilities, steps: t.howItRuns, screenshot: ui.insideTheApp }}
        pill={t.pill}
      />
      <NextSteps
        locale={entry.locale}
        links={[
          { path: '/pricing', label: ui.seePricing, icon: 'tag' },
          { path: '/contact', label: t.talk, icon: 'message-circle' },
          { path: '/solutions', label: t.allSolutions, icon: 'layout-grid' },
        ].flatMap(({ path, ...rest }) => {
          const href = links.get(path);
          return href ? [{ href, ...rest }] : [];
        })}
      />
    </PageFrame>
  );
}
