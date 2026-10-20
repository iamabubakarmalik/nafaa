/**
 * Server entry point for the six calculator islands (ARCH 4.3, contract
 * ToolKey). The Tool template, and the `tool` block through the template's
 * `renderTool`, render `<ToolIsland toolKey=... />`.
 *
 * Each island is its own dynamic chunk, so a tool page ships only its own
 * calculator. Islands are server-rendered (their first state is real HTML)
 * and hydrate for input. The POS cost calculator gets plan prices from the
 * Plan table here, never from code.
 */
import dynamic from 'next/dynamic';
import type { ToolKey } from '@/lib/cms/contract/cms-contract';
import { getPlans } from '@/lib/cms/client';
import type { PosCostPlan } from './PosCostCalculator';

const GstCalculator = dynamic(() => import('./GstCalculator'));
const ProfitMarginCalculator = dynamic(() => import('./ProfitMarginCalculator'));
const PosCostCalculator = dynamic(() => import('./PosCostCalculator'));
const InvoiceGenerator = dynamic(() => import('./InvoiceGenerator'));
const GoldRateCalculator = dynamic(() => import('./GoldRateCalculator'));
const FbrTier1Checker = dynamic(() => import('./FbrTier1Checker'));

async function posPlans(): Promise<PosCostPlan[]> {
  try {
    const plans = await getPlans();
    return plans.map((p) => ({
      slug: p.slug,
      name: p.name,
      priceMonthly: p.priceMonthly,
      priceQuarterly: p.priceQuarterly,
      priceYearly: p.priceYearly,
      trialDays: p.trialDays,
      maxShops: p.limits.maxShops,
      tagline: p.display.tagline,
    }));
  } catch {
    // The island shows "plan prices are not available" rather than a wrong number.
    return [];
  }
}

export async function ToolIsland({ toolKey }: { toolKey: ToolKey }) {
  switch (toolKey) {
    case 'gst-calculator':
      return <GstCalculator />;
    case 'profit-margin-calculator':
      return <ProfitMarginCalculator />;
    case 'pos-cost-calculator':
      return <PosCostCalculator plans={await posPlans()} />;
    case 'invoice-generator':
      return <InvoiceGenerator />;
    case 'gold-rate-calculator':
      return <GoldRateCalculator />;
    case 'fbr-tier-1-checker':
      return <FbrTier1Checker />;
    default:
      return null;
  }
}

export { TOOL_META } from './meta';
