/**
 * Product template (PRODUCT, and INTEGRATION as its variant). ARCH 8:
 *
 *   hero → answerBox → steps "How it works" → featuresGrid → entryGrid
 *   industries tagged → comparisonTable → pricingTable (compact) → faq
 *
 * Title pattern: "{title} Software in Pakistan: {data.benefit}" (from the API).
 * Schema: WebPage + SoftwareApplication (featureList from the features grid,
 * offers from Plan) + HowTo when a steps block says so + FAQPage.
 * Required links: product hub, 6 industries, 2-3 related products, pricing
 * (glossary, guide and compare links arrive as RELATED cards when published).
 *
 * Integration variant: the status notice (beta / coming soon, never shown as
 * live), category and vendor link under the hero. `coming` entries are
 * always noindex (robots from the API snapshot).
 */
import type { EntryCard, PublicEntry } from '@/lib/cms/contract/cms-contract';
import { uiStrings } from '@/lib/i18n/ui';
import { CmsIcon } from '@/lib/icons';
import { liveLinks, loadCards, loadPlans } from '../core/data';
import { PageFrame } from '../core/frame';
import { LinkSections, NextSteps, relatedGroup, type LinkGroup } from '../core/parts';
import { ShowcaseBody } from '../showcase/ShowcaseBody';
import { TrustRibbon } from '../showcase/kit';
import { formatDate } from '@/components/blocks/lib/format';

function IntegrationFacts({ entry }: { entry: PublicEntry }) {
  if (entry.data.type !== 'INTEGRATION') return null;
  const t = uiStrings(entry.locale).pages.product;
  const { category, vendorUrl, verifiedAt } = entry.data;
  let vendorHost: string | null = null;
  try {
    vendorHost = vendorUrl ? new URL(vendorUrl).host.replace(/^www\./, '') : null;
  } catch {
    vendorHost = null;
  }
  return (
    <div className="mx-auto box-content max-w-container px-gutter">
      <dl className="flex flex-wrap gap-x-10 gap-y-4 rounded-lg border border-line bg-surface-2 px-5 py-4 text-small">
        <div>
          <dt className="text-eyebrow uppercase text-fg-subtle">{t.category}</dt>
          <dd className="mt-1 font-medium text-fg-strong">{category}</dd>
        </div>
        {vendorUrl && vendorHost ? (
          <div>
            <dt className="text-eyebrow uppercase text-fg-subtle">{t.vendor}</dt>
            <dd className="mt-1">
              <a href={vendorUrl} rel="noopener" className="inline-flex items-center gap-1 font-medium text-link underline decoration-link/30 underline-offset-2">
                {vendorHost}
                <CmsIcon name="arrow-up-right" size={14} />
              </a>
            </dd>
          </div>
        ) : null}
        {verifiedAt ? (
          <div>
            <dt className="text-eyebrow uppercase text-fg-subtle">{t.checked}</dt>
            <dd className="mt-1 font-medium text-fg-strong">{formatDate(verifiedAt)}</dd>
          </div>
        ) : null}
      </dl>
    </div>
  );
}

export async function ProductTemplate({ entry }: { entry: PublicEntry }) {
  const isIntegration = entry.type === 'INTEGRATION';
  const hasIndustryGrid = entry.blocks.some((b) => b.type === 'entryGrid' && b.entryType === 'INDUSTRY');
  const ui = uiStrings(entry.locale);
  const t = ui.pages.product;
  const [plans, links, taggedIndustries, siblings] = await Promise.all([
    loadPlans(),
    liveLinks(['/pricing', '/product', '/integrations', '/industries', '/roadmap'], entry.locale),
    hasIndustryGrid ? Promise.resolve([] as EntryCard[]) : loadCards({ type: 'INDUSTRY', locale: entry.locale, tag: entry.id, limit: 6 }),
    loadCards({ type: entry.type, locale: entry.locale, limit: 12 }),
  ]);
  const link = (path: string, label: string) => {
    const href = links.get(path);
    return href ? { href, label } : undefined;
  };

  const industries = [...(entry.tags.INDUSTRY ?? []), ...taggedIndustries].slice(0, 6);
  const relatedSame = entry.related.filter((c) => c.type === entry.type);
  const relatedOther = entry.related.filter((c) => c.type !== entry.type);
  const hubPath = isIntegration ? '/integrations' : '/product';
  const hubLabel = isIntegration ? t.allIntegrations : t.allProducts;

  const groups: LinkGroup[] = [
    { id: 'industries-using', title: isIntegration ? t.industriesHelps : t.industriesUsing, cards: industries, link: link('/industries', ui.allIndustries) },
    { id: 'related', title: t.related, cards: relatedOther },
    {
      id: 'more',
      title: isIntegration ? t.moreIntegrations : t.moreFrom,
      cards: [...relatedSame, ...siblings].slice(0, 6),
      link: link(hubPath, hubLabel),
    },
    relatedGroup(entry),
  ];

  return (
    <PageFrame entry={entry} plans={plans}>
      <ShowcaseBody
        entry={entry}
        afterHero={isIntegration ? <IntegrationFacts entry={entry} /> : <TrustRibbon locale={entry.locale} className="mb-4" />}
        beforeEnd={<LinkSections groups={groups} exceptId={entry.id} />}
        kickers={{ featuresGrid: t.features, steps: ui.howItWorks, screenshot: ui.insideTheApp }}
        pill={isIntegration ? t.integrationPill : t.pill}
      />
      <NextSteps
        locale={entry.locale}
        links={[
          { path: '/pricing', label: ui.seePricing, icon: 'tag' },
          { path: hubPath, label: hubLabel, icon: 'layout-grid' },
          { path: '/roadmap', label: t.roadmap, icon: 'flag' },
        ].flatMap(({ path, ...rest }) => {
          const href = links.get(path);
          return href ? [{ href, ...rest }] : [];
        })}
      />
    </PageFrame>
  );
}
