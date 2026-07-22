import { lazy, Suspense } from 'react';
import { useCurrentIndustry } from '@industries/_shared/registry/useCurrentIndustry';
import SalesPage from './SalesPage';

const RestaurantSalesPage = lazy(() => import('@industries/restaurant/pages/RestaurantSalesPage'));
const MobileSalesPage = lazy(() => import('@industries/mobile/pages/MobileSalesPage'));
const CarpetSalesPage = lazy(() => import('@industries/carpet/pages/CarpetSalesPage'));
const RetailSalesPage = lazy(() => import('@industries/retail/pages/RetailSalesPage'));
const GarmentSalesPage = lazy(() => import('@industries/garments/pages/GarmentSalesPage'));
const BakerySalesPage = lazy(() => import('@industries/bakery/pages/BakerySalesPage'));
const GymSalesPage = lazy(() => import('@industries/gym/pages/GymSalesPage'));
const ClinicSalesPage = lazy(() => import('@industries/clinic/pages/ClinicSalesPage'));
const ServicesBizSalesPage = lazy(() => import('@industries/services-biz/pages/ServicesBizSalesPage'));
const PharmacySalesPage = lazy(() => import('@industries/pharmacy/pages/PharmacySalesPage'));
const JewelrySalesPage = lazy(() => import('@industries/jewelry/pages/JewelrySalesPage'));
const HardwareSalesPage = lazy(() => import('@industries/hardware/pages/HardwareSalesPage'));
const DairySalesPage = lazy(() => import('@industries/dairy/pages/DairySalesPage'));
const MeatSalesPage = lazy(() => import('@industries/meat/pages/MeatSalesPage'));
const AgriSalesPage = lazy(() => import('@industries/agri/pages/AgriSalesPage'));
const AutoPartsSalesPage = lazy(() => import('@industries/autoparts/pages/AutoPartsSalesPage'));
const BookstoreSalesPage = lazy(() => import('@industries/bookstore/pages/BookstoreSalesPage'));
const SalonSalesPage = lazy(() => import('@industries/salon/pages/SalonSalesPage'));
const HotelSalesPage = lazy(() => import('@industries/hotel/pages/HotelSalesPage'));

function Loader() {
  return (
    <div className="flex items-center justify-center py-24">
      <div className="h-12 w-12 rounded-full border-4 border-emerald-200 border-t-emerald-600 animate-spin" />
    </div>
  );
}

export default function SalesGate() {
  const industry = useCurrentIndustry();

  if (industry?.id === 'restaurant') return <Suspense fallback={<Loader />}><RestaurantSalesPage /></Suspense>;
  if (industry?.id === 'mobile') return <Suspense fallback={<Loader />}><MobileSalesPage /></Suspense>;
  if (industry?.id === 'carpet') return <Suspense fallback={<Loader />}><CarpetSalesPage /></Suspense>;
  if (industry?.id === 'retail') return <Suspense fallback={<Loader />}><RetailSalesPage /></Suspense>;
  if (industry?.id === 'garments') return <Suspense fallback={<Loader />}><GarmentSalesPage /></Suspense>;
  if (industry?.id === 'bakery') return <Suspense fallback={<Loader />}><BakerySalesPage /></Suspense>;
  if (industry?.id === 'gym') return <Suspense fallback={<Loader />}><GymSalesPage /></Suspense>;
  if (industry?.id === 'clinic') return <Suspense fallback={<Loader />}><ClinicSalesPage /></Suspense>;
  if (industry?.id === 'services-biz') return <Suspense fallback={<Loader />}><ServicesBizSalesPage /></Suspense>;
  if (industry?.id === 'pharmacy') return <Suspense fallback={<Loader />}><PharmacySalesPage /></Suspense>;
  if (industry?.id === 'jewelry') return <Suspense fallback={<Loader />}><JewelrySalesPage /></Suspense>;
  if (industry?.id === 'hardware') return <Suspense fallback={<Loader />}><HardwareSalesPage /></Suspense>;
  if (industry?.id === 'dairy') return <Suspense fallback={<Loader />}><DairySalesPage /></Suspense>;
  if (industry?.id === 'meat') return <Suspense fallback={<Loader />}><MeatSalesPage /></Suspense>;
  if (industry?.id === 'agri') return <Suspense fallback={<Loader />}><AgriSalesPage /></Suspense>;
  if (industry?.id === 'autoparts') return <Suspense fallback={<Loader />}><AutoPartsSalesPage /></Suspense>;
  if (industry?.id === 'bookstore') return <Suspense fallback={<Loader />}><BookstoreSalesPage /></Suspense>;
  if (industry?.id === 'salon') return <Suspense fallback={<Loader />}><SalonSalesPage /></Suspense>;
  if (industry?.id === 'hotel') return <Suspense fallback={<Loader />}><HotelSalesPage /></Suspense>;

  return <SalesPage />;
}
