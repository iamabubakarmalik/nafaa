/**
 * Server entry point for the calculator islands (ARCH 4.3, contract
 * ToolKey). The Tool template, and the `tool` block through the template's
 * `renderTool`, render `<ToolIsland toolKey=... />`. `locale` ('ur' for the
 * Urdu pages) picks each island's on-screen language; the default is English.
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
const BreakEvenCalculator = dynamic(() => import('./BreakEvenCalculator'));
const DiscountCalculator = dynamic(() => import('./DiscountCalculator'));
const ReorderLevelCalculator = dynamic(() => import('./ReorderLevelCalculator'));
const KhataAgeingCalculator = dynamic(() => import('./KhataAgeingCalculator'));
const FoodCostCalculator = dynamic(() => import('./FoodCostCalculator'));
const BarcodeGenerator = dynamic(() => import('./BarcodeGenerator'));
const ZakatCalculator = dynamic(() => import('./ZakatCalculator'));
const ReceiptMaker = dynamic(() => import('./ReceiptMaker'));

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

export async function ToolIsland({ toolKey, locale = 'en' }: { toolKey: ToolKey; locale?: string }) {
  switch (toolKey) {
    case 'gst-calculator':
      return <GstCalculator locale={locale} />;
    case 'profit-margin-calculator':
      return <ProfitMarginCalculator locale={locale} />;
    case 'pos-cost-calculator':
      return <PosCostCalculator plans={await posPlans()} />;
    case 'invoice-generator':
      return <InvoiceGenerator />;
    case 'gold-rate-calculator':
      return <GoldRateCalculator />;
    case 'fbr-tier-1-checker':
      return <FbrTier1Checker />;
    case 'break-even-calculator':
      return <BreakEvenCalculator locale={locale} />;
    case 'discount-calculator':
      return <DiscountCalculator locale={locale} />;
    case 'reorder-level-calculator':
      return <ReorderLevelCalculator locale={locale} />;
    case 'khata-ageing-calculator':
      return <KhataAgeingCalculator locale={locale} />;
    case 'food-cost-calculator':
      return <FoodCostCalculator locale={locale} />;
    case 'barcode-generator':
      return <BarcodeGenerator locale={locale} />;
    case 'zakat-calculator':
      return <ZakatCalculator locale={locale} />;
    case 'receipt-maker':
      return <ReceiptMaker locale={locale} />;
    default:
      return null;
  }
}

export { TOOL_META, toolLabel } from './meta';
