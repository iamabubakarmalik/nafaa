/**
 * Pricing template (PAGE `/pricing`, data.template "pricing"). ARCH 8:
 *
 *   hero → pricingTable → comparisonTable (plan features from Plan) →
 *   richText hardware costs → faq
 *
 * Prices only ever come from the Plan table: the pricing block, the
 * generated "Compare plans" table and the schema offers all read
 * /public/site/plans. The Rs 0 plan reads as the free trial.
 * Title pattern: "POS Software Price in Pakistan: Plans from {minPrice}".
 * Schema: WebPage + SoftwareApplication with one Offer per paid plan (PKR)
 * + FAQPage. Required links: product pages, /best/pos-software-pakistan,
 * /services/hardware and the demo page (published ones only).
 */
import type { PublicEntry } from '@/lib/cms/contract/cms-contract';
import { uiStrings } from '@/lib/i18n/ui';
import { Blocks } from '../core/Blocks';
import { liveLinks, loadCards, loadPlans, loadSite } from '../core/data';
import { PageFrame } from '../core/frame';
import { LinkSections, NextSteps, relatedGroup } from '../core/parts';
import { ShowcaseBody } from '../showcase/ShowcaseBody';
import { TrustRibbon } from '../showcase/kit';
import { loadPricingCatalog } from '@/lib/pricing/catalog';
import { PlanMatrix } from './PlanMatrix';
import { AddOnsSection, CalculatorSection, CatalogComparison } from './PricingV2';
import { missingFaqs } from './pricingV2Strings';

export async function PricingTemplate({ entry: cmsEntry }: { entry: PublicEntry }) {
  const catalog = await loadPricingCatalog();
  // One FAQ: the CMS questions plus the pricing v2 topics they do not cover (the FAQPage schema reads entry.faqs too).
  const entry: PublicEntry = {
    ...cmsEntry,
    faqs: [...cmsEntry.faqs, ...missingFaqs(cmsEntry.faqs, cmsEntry.locale, catalog?.trialDays ?? 7)],
  };
  const ui = uiStrings(entry.locale);
  const t = ui.pages.pricing;
  const [plans, products, links, site] = await Promise.all([
    loadPlans(),
    loadCards({ type: 'PRODUCT', locale: entry.locale, limit: 6, status: ['live', 'beta'] }),
    liveLinks(['/best/pos-software-pakistan', '/services/hardware', '/demo', '/product', '/contact'], entry.locale),
    loadSite(entry.locale),
  ]);
  const productHub = links.get('/product');
  const pricingBlock = entry.blocks.find((b) => b.type === 'pricingTable');
  const highlight = pricingBlock?.type === 'pricingTable' ? pricingBlock.highlightPlan : undefined;
  // Catalog (pricing v2) drives the grouped comparison, add-ons and calculator; without it the CMS plan table stays.
  const matrix = catalog ? (
    <>
      <CatalogComparison catalog={catalog} locale={entry.locale} highlight={highlight} />
      <AddOnsSection catalog={catalog} locale={entry.locale} />
      <CalculatorSection catalog={catalog} locale={entry.locale} signupUrl={site.signupUrl} highlight={highlight} />
    </>
  ) : (
    <PlanMatrix plans={plans} highlight={highlight} locale={entry.locale} />
  );

  return (
    <PageFrame entry={entry} plans={plans}>
      <ShowcaseBody
        entry={entry}
        showUpdated={false}
        pill={t.pill}
        afterHero={<TrustRibbon locale={entry.locale} className="mb-2" />}
        kickers={{ featuresGrid: t.included, steps: t.billing }}
        beforeEnd={
          <LinkSections
            exceptId={entry.id}
            groups={[
              {
                id: 'explore-product',
                title: t.explore,
                cards: products,
                link: productHub ? { href: productHub, label: t.allProducts } : undefined,
              },
              relatedGroup(entry),
            ]}
          />
        }
        render={(block) =>
          block === pricingBlock ? (
            <>
              <Blocks entry={entry} blocks={[block]} />
              {matrix}
            </>
          ) : undefined
        }
      />
      {pricingBlock ? null : matrix}
      <NextSteps
        locale={entry.locale}
        links={[
          { path: '/demo', label: ui.bookDemo, icon: 'calendar' },
          { path: '/best/pos-software-pakistan', label: t.bestPos, icon: 'trophy' },
          { path: '/services/hardware', label: t.hardware, icon: 'printer' },
          { path: '/contact', label: t.contactSales, icon: 'message-circle' },
        ].flatMap(({ path, ...rest }) => {
          const href = links.get(path);
          return href ? [{ href, ...rest }] : [];
        })}
      />
    </PageFrame>
  );
}
