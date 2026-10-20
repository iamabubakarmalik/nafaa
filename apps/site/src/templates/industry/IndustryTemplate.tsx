/**
 * Industry template (INDUSTRY). ARCH 8:
 *
 *   hero → answerBox (+ Roman Urdu) → featuresGrid "Problems it solves" →
 *   screenshot(s) of the real flow → steps "How a day works" → pricingTable →
 *   richText buyer checklist → comparisonTable → testimonial (if real) → faq
 *
 * Title pattern: "{title} Software in Pakistan: POS, Stock & Khata".
 * Schema: WebPage + SoftwareApplication (applicationSubCategory = title,
 * offers from Plan) + FAQPage.
 * Required links: industries hub, 4-6 products, 2 related industries, 1
 * solution, posts/guides, a best/compare page, the compliance page and city
 * hubs where tagged. They come from TAG and RELATED relations (published
 * only), plus same-group industries when fewer than two are related.
 *
 * The industry colour (data.color, ≥ 4.5:1 with white) is the page accent
 * (`--accent`), so icon tiles and diagrams pick it up.
 */
import { hexToChannels } from '@/components/blocks/lib/format';
import type { CmsEntryType, EntryCard, PublicEntry } from '@/lib/cms/contract/cms-contract';
import { livePaths, loadCards, loadPlans } from '../core/data';
import { PageFrame } from '../core/frame';
import { LinkSections, NextSteps, type LinkGroup } from '../core/parts';
import { ShowcaseBody } from '../showcase/ShowcaseBody';
import { TrustRibbon } from '../showcase/kit';

const TAG_GROUPS: { type: CmsEntryType; id: string; title: (noun: string) => string }[] = [
  { type: 'PRODUCT', id: 'products', title: (noun) => `Products ${noun} use` },
  { type: 'SOLUTION', id: 'solutions', title: () => 'Solutions' },
  { type: 'COMPLIANCE', id: 'compliance', title: () => 'Tax and compliance' },
  { type: 'CITY', id: 'cities', title: () => 'In your city' },
  { type: 'GUIDE', id: 'guides', title: () => 'Guides' },
  { type: 'BLOG_POST', id: 'posts', title: () => 'From the blog' },
  { type: 'COMPARE', id: 'compare', title: () => 'Compare' },
  { type: 'BEST_OF', id: 'best', title: () => 'Best software lists' },
];

export async function IndustryTemplate({ entry }: { entry: PublicEntry }) {
  const data = entry.data.type === 'INDUSTRY' ? entry.data : null;
  const noun = data?.shopNoun ?? 'shops';
  const relatedIndustries = entry.related.filter((c) => c.type === 'INDUSTRY');
  const [plans, live, sameGroup] = await Promise.all([
    loadPlans(),
    livePaths(['/industries', '/pricing', '/demo']),
    relatedIndustries.length < 2 && data?.group ? loadCards({ type: 'INDUSTRY', group: data.group, limit: 4 }) : Promise.resolve([] as EntryCard[]),
  ]);

  const byType = (type: CmsEntryType): EntryCard[] => [...(entry.tags[type] ?? []), ...entry.related.filter((c) => c.type === type)];
  const groups: LinkGroup[] = [
    ...TAG_GROUPS.map((g) => ({ id: g.id, title: g.title(noun), cards: byType(g.type), columns: (g.type === 'CITY' ? 4 : 3) as 3 | 4 })),
    {
      id: 'more-industries',
      title: 'Related industries',
      cards: [...relatedIndustries, ...sameGroup].slice(0, 3),
      link: live.has('/industries') ? { href: '/industries', label: 'All industries' } : undefined,
    },
  ];

  return (
    <PageFrame entry={entry} plans={plans}>
      <div style={{ '--accent': hexToChannels(data?.color) ?? undefined }}>
        <ShowcaseBody
          entry={entry}
          afterHero={<TrustRibbon className="mb-4" />}
          beforeEnd={<LinkSections groups={groups} exceptId={entry.id} />}
          kickers={{ featuresGrid: `For ${noun}`, steps: 'A day at the counter', screenshot: 'Inside the app' }}
          pill="Industry"
        />
        <NextSteps
          links={[
            { href: '/pricing', label: 'See pricing', icon: 'tag' },
            { href: '/demo', label: 'Book a demo', icon: 'calendar' },
            { href: '/industries', label: 'All industries', icon: 'layout-grid' },
          ].filter((link) => live.has(link.href))}
        />
      </div>
    </PageFrame>
  );
}
