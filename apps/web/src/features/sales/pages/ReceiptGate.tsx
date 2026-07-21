import { lazy, Suspense } from 'react';
import { useCurrentIndustry } from '@/features/industries/_shared/registry/useCurrentIndustry';
import ReceiptPage from './ReceiptPage';

const RestaurantReceiptPage = lazy(() => import('@/features/industries/restaurant/pages/RestaurantReceiptPage'));
const MobileReceiptPage = lazy(() => import('@/features/industries/mobile/pages/MobileReceiptPage'));
const CarpetReceiptPage = lazy(() => import('@/features/industries/carpet/pages/CarpetReceiptPage'));
const RetailReceiptPage = lazy(() => import('@/features/industries/retail/pages/RetailReceiptPage'));
const GarmentReceiptPage = lazy(() => import('@/features/industries/garments/pages/GarmentReceiptPage'));
const BakeryReceiptPage = lazy(() => import('@/features/industries/bakery/pages/BakeryReceiptPage'));
const GymReceiptPage = lazy(() => import('@/features/industries/gym/pages/GymReceiptPage'));
const ClinicReceiptPage = lazy(() => import('@/features/industries/clinic/pages/ClinicReceiptPage'));
const ServicesBizReceiptPage = lazy(() => import('@/features/industries/services-biz/pages/ServicesBizReceiptPage'));
const PharmacyReceiptPage = lazy(() => import('@/features/industries/pharmacy/pages/PharmacyReceiptPage'));
const JewelryReceiptPage = lazy(() => import('@/features/industries/jewelry/pages/JewelryReceiptPage'));
const HardwareReceiptPage = lazy(() => import('@/features/industries/hardware/pages/HardwareReceiptPage'));
const DairyReceiptPage = lazy(() => import('@/features/industries/dairy/pages/DairyReceiptPage'));
const MeatReceiptPage = lazy(() => import('@/features/industries/meat/pages/MeatReceiptPage'));
const AgriReceiptPage = lazy(() => import('@/features/industries/agri/pages/AgriReceiptPage'));
const AutoPartsReceiptPage = lazy(() => import('@/features/industries/autoparts/pages/AutoPartsReceiptPage'));
const BookstoreReceiptPage = lazy(() => import('@/features/industries/bookstore/pages/BookstoreReceiptPage'));
const SalonReceiptPage = lazy(() => import('@/features/industries/salon/pages/SalonReceiptPage'));
const HotelReceiptPage = lazy(() => import('@/features/industries/hotel/pages/HotelReceiptPage'));

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
  if (industry?.id === 'garments') return <Suspense fallback={<Loader />}><GarmentReceiptPage /></Suspense>;
  if (industry?.id === 'bakery') return <Suspense fallback={<Loader />}><BakeryReceiptPage /></Suspense>;
  if (industry?.id === 'gym') return <Suspense fallback={<Loader />}><GymReceiptPage /></Suspense>;
  if (industry?.id === 'clinic') return <Suspense fallback={<Loader />}><ClinicReceiptPage /></Suspense>;
  if (industry?.id === 'services-biz') return <Suspense fallback={<Loader />}><ServicesBizReceiptPage /></Suspense>;
  if (industry?.id === 'pharmacy') return <Suspense fallback={<Loader />}><PharmacyReceiptPage /></Suspense>;
  if (industry?.id === 'jewelry') return <Suspense fallback={<Loader />}><JewelryReceiptPage /></Suspense>;
  if (industry?.id === 'hardware') return <Suspense fallback={<Loader />}><HardwareReceiptPage /></Suspense>;
  if (industry?.id === 'dairy') return <Suspense fallback={<Loader />}><DairyReceiptPage /></Suspense>;
  if (industry?.id === 'meat') return <Suspense fallback={<Loader />}><MeatReceiptPage /></Suspense>;
  if (industry?.id === 'agri') return <Suspense fallback={<Loader />}><AgriReceiptPage /></Suspense>;
  if (industry?.id === 'autoparts') return <Suspense fallback={<Loader />}><AutoPartsReceiptPage /></Suspense>;
  if (industry?.id === 'bookstore') return <Suspense fallback={<Loader />}><BookstoreReceiptPage /></Suspense>;
  if (industry?.id === 'salon') return <Suspense fallback={<Loader />}><SalonReceiptPage /></Suspense>;
  if (industry?.id === 'hotel') return <Suspense fallback={<Loader />}><HotelReceiptPage /></Suspense>;

  return <ReceiptPage />;
}
