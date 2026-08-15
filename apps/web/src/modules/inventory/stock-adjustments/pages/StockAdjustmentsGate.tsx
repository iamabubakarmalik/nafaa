// apps/web/src/modules/inventory/stock-adjustments/pages/StockAdjustmentsGate.tsx
import { useCurrentIndustry } from '@industries/_shared/registry/useCurrentIndustry';
import StockAdjustmentsPage from './StockAdjustmentsPage';
import RetailStockAdjustmentsPage from '@industries/retail/pages/RetailStockAdjustmentsPage';

/**
 * StockAdjustmentsGate — routes stock adjustments to the correct
 * industry-specific page.
 *
 * Global page (fallback) = 35+ industries: product/variant/roll/IMEI
 * picker — power users ke liye.
 *
 * Retail page = grocery-focused: fast In/Out/Damage flow, quick
 * reasons (expiry, sample, ginti), live stock preview, batch expiry
 * ke liye damage page redirect.
 */
export default function StockAdjustmentsGate() {
  const industry = useCurrentIndustry();

  switch (industry?.id) {
    case 'retail':
      return <RetailStockAdjustmentsPage />;

    default:
      // Generic fallback — sab industries (carpet, mobile, etc.)
      return <StockAdjustmentsPage />;
  }
}
