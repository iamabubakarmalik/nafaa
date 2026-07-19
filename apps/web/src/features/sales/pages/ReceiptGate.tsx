import { lazy, Suspense } from 'react';
import { useCurrentIndustry } from '@/features/industries/_shared/registry/useCurrentIndustry';
import ReceiptPage from './ReceiptPage';

const RestaurantReceiptPage = lazy(() => import('@/features/industries/restaurant/pages/RestaurantReceiptPage'));
const MobileReceiptPage = lazy(() => import('@/features/industries/mobile/pages/MobileReceiptPage'));
const CarpetReceiptPage = lazy(() => import('@/features/industries/carpet/pages/CarpetReceiptPage'));
const RetailReceiptPage = lazy(() => import('@/features/industries/retail/pages/RetailReceiptPage'));
const HardwareReceiptPage = lazy(() => import('@/features/industries/hardware/pages/HardwareReceiptPage'));

function Loader() {
  return (
    <div className="flex items-center justify-center py-24">
      <div className="h-12 w-12 rounded-full border-4 border-emerald-200 border-t-emerald-600 animate-spin" />
    </div>
  );
}

export default function ReceiptGate() {
  const industry = useCurrentIndustry();

  if (industry?.id === 'restaurant') return <Suspense fallback={<Loader />}><RestaurantReceiptPage /></Suspense>;
  if (industry?.id === 'mobile') return <Suspense fallback={<Loader />}><MobileReceiptPage /></Suspense>;
  if (industry?.id === 'carpet') return <Suspense fallback={<Loader />}><CarpetReceiptPage /></Suspense>;
  if (industry?.id === 'retail') return <Suspense fallback={<Loader />}><RetailReceiptPage /></Suspense>;
  if (industry?.id === 'hardware') return <Suspense fallback={<Loader />}><HardwareReceiptPage /></Suspense>;

  return <ReceiptPage />;
}
