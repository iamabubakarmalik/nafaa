// apps/web/src/modules/inventory/stock-report/pages/StockReportGate.tsx
import { useCurrentIndustry } from '@industries/_shared/registry/useCurrentIndustry';
import StockReportPage from './StockReportPage';
import RetailStockReportPage from '@industries/retail/pages/RetailStockReportPage';
import MobileStockReportPage from '@industries/mobile/pages/MobileStockReportPage';
import ElectronicsStockReportPage from '@industries/electronics/pages/ElectronicsStockReportPage';
import AppliancesStockReportPage from '@industries/appliances/pages/AppliancesStockReportPage';
import BakeryStockReportPage from '@industries/bakery/pages/BakeryStockReportPage';

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
    /* Bakery me sirf bikne wala maal ginna aadhi tasveer hai —
       gudaam ka maida aur makkhan bhi utna hi paisa hai. */
    case 'bakery':
      return <BakeryStockReportPage />;

    case 'retail':
      return <RetailStockReportPage />;

    case 'mobile':
      return <MobileStockReportPage />;

    case 'electronics':
      return <ElectronicsStockReportPage />;
    case 'appliances':
      return <AppliancesStockReportPage />;

    // Future: alag industries ka custom report yahan add karo
    // case 'carpet':
    //   return <CarpetStockReportPage />;
    // case 'pharmacy':
    //   return <PharmacyStockReportPage />;

    default:
      // Generic fallback — sab industries jinki custom report nahi hai
      return <StockReportPage />;
  }
}
