// apps/web/src/modules/inventory/transfers/pages/TransfersGate.tsx
import { useCurrentIndustry } from '@industries/_shared/registry/useCurrentIndustry';
import TransfersPage from './TransfersPage';
import RetailTransfersPage from '@industries/retail/pages/RetailTransfersPage';

/**
 * TransfersGate — routes stock transfers to the correct
 * industry-specific page.
 *
 * Global page (fallback) = carpet roll-level transfers,
 * TransferRollPicker, multi-industry — power users ke liye.
 *
 * Retail page = grocery-focused: simple fast product transfers,
 * no rolls/variants, quick purposes, live stock preview.
 */
export default function TransfersGate() {
  const industry = useCurrentIndustry();

  switch (industry?.id) {
    case 'retail':
      return <RetailTransfersPage />;

    default:
      // Generic fallback — sab industries (carpet, mobile, etc.)
      return <TransfersPage />;
  }
}
