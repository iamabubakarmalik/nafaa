// apps/web/src/modules/finance/profit-report/pages/ProfitReportGate.tsx
import { useCurrentIndustry } from '@industries/_shared/registry/useCurrentIndustry';
import ProfitReportPage from './ProfitReportPage';
import RetailProfitReportPage from '@industries/retail/pages/RetailProfitReportPage';
import MobileProfitReportPage from '@industries/mobile/pages/MobileProfitReportPage';
import ElectronicsProfitReportPage from '@industries/electronics/pages/ElectronicsProfitReportPage';

/**
 * ProfitReportGate — routes /profit-report to the correct
 * industry-specific profit analysis page.
 *
 * Retail = grocery-focused (category ranking, dead stock, margin
 * distribution). Baaki industries abhi generic report use karti
 * hain, unki custom pages baad mein add ki jayengi.
 */
export default function ProfitReportGate() {
  const industry = useCurrentIndustry();

  switch (industry?.id) {
    case 'retail':
      return <RetailProfitReportPage />;

    case 'mobile':
      return <MobileProfitReportPage />;

    case 'electronics':
      return <ElectronicsProfitReportPage />;

    // Future industry-specific reports here:
    // case 'carpet':   return <CarpetProfitReportPage />;
    // case 'pharmacy': return <PharmacyProfitReportPage />;

    default:
      return <ProfitReportPage />;
  }
}
