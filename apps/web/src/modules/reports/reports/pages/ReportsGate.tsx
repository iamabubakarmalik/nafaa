import { lazy, Suspense } from 'react';
import { useCurrentIndustry } from '@industries/_shared/registry/useCurrentIndustry';
import ReportsPage from './ReportsPage';

const RestaurantReportsV2 = lazy(() => import('@industries/restaurant/pages/RestaurantReportsV2'));
const MobileReportsV2 = lazy(() => import('@industries/mobile/pages/MobileReportsV2'));
const CarpetReportsV2 = lazy(() => import('@industries/carpet/pages/CarpetReportsV2'));
const RetailReportsV2 = lazy(() => import('@industries/retail/pages/RetailReportsV2'));
const GarmentReportsV2 = lazy(() => import('@industries/garments/pages/GarmentReportsV2'));
const BakeryReportsV2 = lazy(() => import('@industries/bakery/pages/BakeryReportsV2'));
const ClinicReportsV2 = lazy(() => import('@industries/clinic/pages/ClinicReportsV2'));
const ServicesBizReportsV2 = lazy(() => import('@industries/services-biz/pages/ServicesBizReportsV2'));
const PharmacyReportsV2 = lazy(() => import('@industries/pharmacy/pages/PharmacyReportsV2'));
const JewelryReportsV2 = lazy(() => import('@industries/jewelry/pages/JewelryReportsV2'));
const HardwareReportsV2 = lazy(() => import('@industries/hardware/pages/HardwareReportsV2'));
const DairyReportsV2 = lazy(() => import('@industries/dairy/pages/DairyReportsV2'));
const MeatReportsV2 = lazy(() => import('@industries/meat/pages/MeatReportsV2'));
const AgriReportsV2 = lazy(() => import('@industries/agri/pages/AgriReportsV2'));
const AutoPartsReportsV2 = lazy(() => import('@industries/autoparts/pages/AutoPartsReportsV2'));
const BookstoreReportsV2 = lazy(() => import('@industries/bookstore/pages/BookstoreReportsV2'));
const GymReports = lazy(() => import('@industries/gym/pages/GymReportsV2'));

function Loader() {
  return (
    <div className="flex items-center justify-center py-24">
      <div className="h-12 w-12 rounded-full border-4 border-violet-200 border-t-violet-600 animate-spin" />
    </div>
  );
}

export default function ReportsGate() {
  const industry = useCurrentIndustry();

  if (industry?.id === 'restaurant') return <Suspense fallback={<Loader />}><RestaurantReportsV2 /></Suspense>;
  if (industry?.id === 'mobile') return <Suspense fallback={<Loader />}><MobileReportsV2 /></Suspense>;
  if (industry?.id === 'carpet') return <Suspense fallback={<Loader />}><CarpetReportsV2 /></Suspense>;
  if (industry?.id === 'retail') return <Suspense fallback={<Loader />}><RetailReportsV2 /></Suspense>;
  if (industry?.id === 'garments') return <Suspense fallback={<Loader />}><GarmentReportsV2 /></Suspense>;
  if (industry?.id === 'bakery') return <Suspense fallback={<Loader />}><BakeryReportsV2 /></Suspense>;
  if (industry?.id === 'gym') return <Suspense fallback={<Loader />}><GymReports /></Suspense>;
  if (industry?.id === 'clinic') return <Suspense fallback={<Loader />}><ClinicReportsV2 /></Suspense>;
  if (industry?.id === 'services-biz') return <Suspense fallback={<Loader />}><ServicesBizReportsV2 /></Suspense>;
  if (industry?.id === 'pharmacy') return <Suspense fallback={<Loader />}><PharmacyReportsV2 /></Suspense>;
  if (industry?.id === 'jewelry') return <Suspense fallback={<Loader />}><JewelryReportsV2 /></Suspense>;
  if (industry?.id === 'hardware') return <Suspense fallback={<Loader />}><HardwareReportsV2 /></Suspense>;
  if (industry?.id === 'dairy') return <Suspense fallback={<Loader />}><DairyReportsV2 /></Suspense>;
  if (industry?.id === 'meat') return <Suspense fallback={<Loader />}><MeatReportsV2 /></Suspense>;
  if (industry?.id === 'agri') return <Suspense fallback={<Loader />}><AgriReportsV2 /></Suspense>;
  if (industry?.id === 'autoparts') return <Suspense fallback={<Loader />}><AutoPartsReportsV2 /></Suspense>;
  if (industry?.id === 'bookstore') return <Suspense fallback={<Loader />}><BookstoreReportsV2 /></Suspense>;

  return <ReportsPage />;
}
