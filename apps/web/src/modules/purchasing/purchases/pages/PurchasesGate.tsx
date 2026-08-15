import { lazy, Suspense } from 'react';
import { useCurrentIndustry } from '@industries/_shared/registry/useCurrentIndustry';
import PurchasesPage from './PurchasesPage';

const RestaurantPurchases = lazy(() => import('@industries/restaurant/pages/RestaurantPurchasesV2'));
const MobilePurchases = lazy(() => import('@industries/mobile/pages/MobilePurchasesV2'));
const CarpetPurchases = lazy(() => import('@industries/carpet/pages/CarpetPurchasesV2'));
const RetailPurchases = lazy(() => import('@/industries/retail/pages/RetailPurchases'));

function Loader() {
  return (
    <div className="flex items-center justify-center py-24">
      <div className="h-12 w-12 rounded-full border-4 border-orange-200 border-t-orange-600 animate-spin" />
    </div>
  );
}

/**
 * PurchasesGate — routes /purchases to industry-specific pages.
 *
 *   • Restaurant → RestaurantPurchasesV2 (ingredients, food supplies, kitchen inventory)
 *   • Mobile     → MobilePurchasesV2 (IMEI-tracked phones, accessories, batches)
 *   • Carpet     → CarpetPurchasesV2 (roll-first purchasing with auto-creation)
 *   • Retail     → RetailPurchasesV2 (bulk stocking, multi-unit, reorder suggestions)
 *   • Others     → generic PurchasesPage
 */
export default function PurchasesGate() {
  const industry = useCurrentIndustry();

  if (industry?.id === 'restaurant') {
    return <Suspense fallback={<Loader />}><RestaurantPurchases /></Suspense>;
  }
  if (industry?.id === 'mobile') {
    return <Suspense fallback={<Loader />}><MobilePurchases /></Suspense>;
  }
  if (industry?.id === 'carpet') {
    return <Suspense fallback={<Loader />}><CarpetPurchases /></Suspense>;
  }
  if (industry?.id === 'retail') {
    return <Suspense fallback={<Loader />}><RetailPurchases /></Suspense>;
  }
  return <PurchasesPage />;
}
