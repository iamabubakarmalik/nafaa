// apps/web/src/modules/purchasing/purchases/pages/PurchaseDetailGate.tsx
import { useCurrentIndustry } from '@industries/_shared/registry/useCurrentIndustry';
import PurchaseDetailPage from './PurchaseDetailPage';
import RetailPurchaseDetailPage from '@industries/retail/pages/RetailPurchaseDetailPage';

/**
 * PurchaseDetailGate — routes purchase detail to the correct
 * industry-specific page.
 *
 * Global page (fallback) = carpet rolls section, variant info —
 * 35+ industries ke liye.
 *
 * Retail page = grocery-focused: clean invoice style, no roll
 * clutter, supplier udhaar card, payment summary, print-ready.
 */
export default function PurchaseDetailGate() {
  const industry = useCurrentIndustry();

  switch (industry?.id) {
    case 'retail':
      return <RetailPurchaseDetailPage />;

    default:
      // Generic fallback — sab industries (carpet, mobile, etc.)
      return <PurchaseDetailPage />;
  }
}
