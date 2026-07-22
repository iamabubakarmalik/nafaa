import { lazy, Suspense } from 'react';
import { useCurrentIndustry } from '@industries/_shared/registry/useCurrentIndustry';
import ReceiptPage from './ReceiptPage';

const RestaurantReceiptPage = lazy(() => import('@industries/restaurant/pages/RestaurantReceiptPage'));
const MobileReceiptPage = lazy(() => import('@industries/mobile/pages/MobileReceiptPage'));
const CarpetReceiptPage = lazy(() => import('@industries/carpet/pages/CarpetReceiptPage'));
const RetailReceiptPage = lazy(() => import('@industries/retail/pages/RetailReceiptPage'));
const GarmentReceiptPage = lazy(() => import('@industries/garments/pages/GarmentReceiptPage'));
const BakeryReceiptPage = lazy(() => import('@industries/bakery/pages/BakeryReceiptPage'));
const GymReceiptPage = lazy(() => import('@industries/gym/pages/GymReceiptPage'));
const ClinicReceiptPage = lazy(() => import('@industries/clinic/pages/ClinicReceiptPage'));
const ServicesBizReceiptPage = lazy(() => import('@industries/services-biz/pages/ServicesBizReceiptPage'));
const PharmacyReceiptPage = lazy(() => import('@industries/pharmacy/pages/PharmacyReceiptPage'));
const JewelryReceiptPage = lazy(() => import('@industries/jewelry/pages/JewelryReceiptPage'));
const HardwareReceiptPage = lazy(() => import('@industries/hardware/pages/HardwareReceiptPage'));
const DairyReceiptPage = lazy(() => import('@industries/dairy/pages/DairyReceiptPage'));
const MeatReceiptPage = lazy(() => import('@industries/meat/pages/MeatReceiptPage'));
const AgriReceiptPage = lazy(() => import('@industries/agri/pages/AgriReceiptPage'));
const AutoPartsReceiptPage = lazy(() => import('@industries/autoparts/pages/AutoPartsReceiptPage'));
const BookstoreReceiptPage = lazy(() => import('@industries/bookstore/pages/BookstoreReceiptPage'));
const SalonReceiptPage = lazy(() => import('@industries/salon/pages/SalonReceiptPage'));
const HotelReceiptPage = lazy(() => import('@industries/hotel/pages/HotelReceiptPage'));

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
