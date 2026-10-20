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
import { CmsIcon } from '@/lib/icons';
import { livePaths, loadCards, loadPlans } from '../core/data';
import { PageFrame } from '../core/frame';
import { LinkSections, NextSteps, type LinkGroup } from '../core/parts';
import { StandardBody } from '../core/Standard';
import { formatDate } from '@/components/blocks/lib/format';

function IntegrationFacts({ entry }: { entry: PublicEntry }) {
  if (entry.data.type !== 'INTEGRATION') return null;
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
          <dt className="text-eyebrow uppercase text-fg-subtle">Category</dt>
          <dd className="mt-1 font-medium text-fg-strong">{category}</dd>
        </div>
        {vendorUrl && vendorHost ? (
          <div>
            <dt className="text-eyebrow uppercase text-fg-subtle">Vendor</dt>
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
            <dt className="text-eyebrow uppercase text-fg-subtle">Checked</dt>
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
  const [plans, live, taggedIndustries, siblings] = await Promise.all([
    loadPlans(),
    livePaths(['/pricing', '/product', '/integrations', '/industries', '/roadmap']),
    hasIndustryGrid ? Promise.resolve([] as EntryCard[]) : loadCards({ type: 'INDUSTRY', tag: entry.id, limit: 6 }),
    loadCards({ type: entry.type, limit: 12 }),
  ]);

  const industries = [...(entry.tags.INDUSTRY ?? []), ...taggedIndustries].slice(0, 6);
  const relatedSame = entry.related.filter((c) => c.type === entry.type);
  const relatedOther = entry.related.filter((c) => c.type !== entry.type);
  const hub = isIntegration ? { href: '/integrations', label: 'All integrations' } : { href: '/product', label: 'All products' };

  const groups: LinkGroup[] = [
    { id: 'industries-using', title: isIntegration ? 'Industries it helps' : 'Industries using it', cards: industries, link: live.has('/industries') ? { href: '/industries', label: 'All industries' } : undefined },
    { id: 'related', title: 'Related', cards: relatedOther },
    {
      id: 'more',
      title: isIntegration ? 'More integrations' : 'More from Nafaa',
      cards: [...relatedSame, ...siblings].slice(0, 6),
      link: live.has(hub.href) ? hub : undefined,
    },
  ];

  return (
    <PageFrame entry={entry} plans={plans}>
      <StandardBody
        entry={entry}
        afterHero={isIntegration ? <IntegrationFacts entry={entry} /> : undefined}
        beforeEnd={<LinkSections groups={groups} exceptId={entry.id} />}
      />
      <NextSteps
        links={[
          { href: '/pricing', label: 'See pricing', icon: 'tag' },
          { href: hub.href, label: hub.label, icon: 'layout-grid' },
          { href: '/roadmap', label: 'Roadmap', icon: 'flag' },
        ].filter((link) => live.has(link.href))}
      />
    </PageFrame>
  );
}
