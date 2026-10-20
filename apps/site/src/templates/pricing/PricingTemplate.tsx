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
import { Blocks, Segments, segment } from '../core/Blocks';
import { livePaths, loadCards, loadPlans } from '../core/data';
import { PageFrame } from '../core/frame';
import { LinkSections, MetaRow, NextSteps } from '../core/parts';
import { PlanMatrix } from './PlanMatrix';

export async function PricingTemplate({ entry }: { entry: PublicEntry }) {
  const [plans, products, live] = await Promise.all([
    loadPlans(),
    loadCards({ type: 'PRODUCT', limit: 6, status: ['live', 'beta'] }),
    livePaths(['/best/pos-software-pakistan', '/services/hardware', '/demo', '/product', '/contact']),
  ]);
  const pricingBlock = entry.blocks.find((b) => b.type === 'pricingTable');
  const highlight = pricingBlock?.type === 'pricingTable' ? pricingBlock.highlightPlan : undefined;
  const matrix = <PlanMatrix plans={plans} highlight={highlight} />;

  const segments = segment(entry.blocks, (block) =>
    block === pricingBlock ? (
      <>
        <Blocks entry={entry} blocks={[block]} />
        {matrix}
      </>
    ) : undefined,
  );
  if (!pricingBlock) segments.push({ kind: 'own', key: 'matrix', node: matrix });

  return (
    <PageFrame entry={entry} plans={plans}>
      <MetaRow entry={entry} showUpdated={false} />
      <Segments entry={entry} segments={segments} />
      <LinkSections
        exceptId={entry.id}
        groups={[
          {
            id: 'explore-product',
            title: 'Explore the product',
            cards: products,
            link: live.has('/product') ? { href: '/product', label: 'All products' } : undefined,
          },
        ]}
      />
      <NextSteps
        links={[
          { href: '/demo', label: 'Book a demo', icon: 'calendar' },
          { href: '/best/pos-software-pakistan', label: 'Best POS software in Pakistan', icon: 'trophy' },
          { href: '/services/hardware', label: 'POS hardware', icon: 'printer' },
          { href: '/contact', label: 'Contact sales', icon: 'message-circle' },
        ].filter((link) => live.has(link.href))}
      />
    </PageFrame>
  );
}
