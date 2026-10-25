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
import { uiStrings, type UiStrings } from '@/lib/i18n/ui';
import { liveLinks, loadCards, loadPlans } from '../core/data';
import { PageFrame } from '../core/frame';
import { LinkSections, NextSteps, type LinkGroup } from '../core/parts';
import { ShowcaseBody } from '../showcase/ShowcaseBody';
import { TrustRibbon } from '../showcase/kit';

type IndustryWords = UiStrings['industry'];

const TAG_GROUPS: { type: CmsEntryType; id: string; title: (t: IndustryWords, noun: string) => string }[] = [
  { type: 'PRODUCT', id: 'products', title: (t, noun) => t.productsFor(noun) },
  { type: 'SOLUTION', id: 'solutions', title: (t) => t.solutions },
  { type: 'COMPLIANCE', id: 'compliance', title: (t) => t.compliance },
  { type: 'CITY', id: 'cities', title: (t) => t.cities },
  { type: 'GUIDE', id: 'guides', title: (t) => t.guides },
  { type: 'BLOG_POST', id: 'posts', title: (t) => t.posts },
  { type: 'COMPARE', id: 'compare', title: (t) => t.compare },
  { type: 'BEST_OF', id: 'best', title: (t) => t.best },
];

export async function IndustryTemplate({ entry }: { entry: PublicEntry }) {
  const data = entry.data.type === 'INDUSTRY' ? entry.data : null;
  const ui = uiStrings(entry.locale);
  const t = ui.industry;
  const noun = data?.shopNoun ?? t.defaultNoun;
  const relatedIndustries = entry.related.filter((c) => c.type === 'INDUSTRY');
  const [plans, links, sameGroup] = await Promise.all([
    loadPlans(),
    liveLinks(['/industries', '/pricing', '/demo'], entry.locale),
    relatedIndustries.length < 2 && data?.group ? loadCards({ type: 'INDUSTRY', locale: entry.locale, group: data.group, limit: 4 }) : Promise.resolve([] as EntryCard[]),
  ]);
  const industriesHref = links.get('/industries');

  const byType = (type: CmsEntryType): EntryCard[] => [...(entry.tags[type] ?? []), ...entry.related.filter((c) => c.type === type)];
  const groups: LinkGroup[] = [
    ...TAG_GROUPS.map((g) => ({ id: g.id, title: g.title(t, noun), cards: byType(g.type), columns: (g.type === 'CITY' ? 4 : 3) as 3 | 4 })),
    {
      id: 'more-industries',
      title: t.related,
      cards: [...relatedIndustries, ...sameGroup].slice(0, 3),
      link: industriesHref ? { href: industriesHref, label: ui.allIndustries } : undefined,
    },
  ];

  return (
    <PageFrame entry={entry} plans={plans}>
      <div style={{ '--accent': hexToChannels(data?.color) ?? undefined }}>
        <ShowcaseBody
          entry={entry}
          afterHero={<TrustRibbon locale={entry.locale} className="mb-4" />}
          beforeEnd={<LinkSections groups={groups} exceptId={entry.id} />}
          kickers={{ featuresGrid: t.forNoun(noun), steps: t.dayAtCounter, screenshot: ui.insideTheApp }}
          pill={t.pill}
        />
        <NextSteps
          locale={entry.locale}
          links={[
            { path: '/pricing', label: ui.seePricing, icon: 'tag' },
            { path: '/demo', label: ui.bookDemo, icon: 'calendar' },
            { path: '/industries', label: ui.allIndustries, icon: 'layout-grid' },
          ].flatMap(({ path, ...link }) => {
            const href = links.get(path);
            return href ? [{ href, ...link }] : [];
          })}
        />
      </div>
    </PageFrame>
  );
}
