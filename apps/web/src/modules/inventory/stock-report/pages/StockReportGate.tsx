// apps/web/src/modules/inventory/stock-report/pages/StockReportGate.tsx
import { useCurrentIndustry } from '@industries/_shared/registry/useCurrentIndustry';
import StockReportPage from './StockReportPage';
import RetailStockReportPage from '@industries/retail/pages/RetailStockReportPage';

/**
 * StockReportGate — routes /stock-report to the correct
 * industry-specific report page.
 *
 * Har industry ki apni stock report ho sakti hai (jaise
 * Products form). Retail = grocery-focused (expiry, damage,
 * combos). Baaki industries abhi generic report use karti hain,
 * unki custom pages baad mein add ki jayengi jab zaroorat ho.
 */
export default function StockReportGate() {
  const industry = useCurrentIndustry();

  switch (industry?.id) {
    case 'retail':
      return <RetailStockReportPage />;

    // Future: alag industries ka custom report yahan add karo
    // case 'carpet':
    //   return <CarpetStockReportPage />;
    // case 'mobile':
    //   return <MobileStockReportPage />;
    // case 'pharmacy':
    //   return <PharmacyStockReportPage />;

    default:
      // Generic fallback — sab industries jinki custom report nahi hai
      return <StockReportPage />;
  }
}
